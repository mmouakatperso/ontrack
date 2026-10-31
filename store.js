(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const data = isNode ? require('./data.js') : root.OntrackData;
  const { sha256 } = isNode ? require('./sha256.js') : root.OntrackSha256;
  const KEY = 'ontrack-demo-v3';
  const SESSION_KEY = 'ontrack-session-v3';
  const LEGACY_KEYS = ['ontrack-demo-v1', 'ontrack-demo-v2'];
  const VERSION = 3;
  // Encadrante tutrice ajoutée au seed après la v3 (migration additive, voir migrate()).
  const SUPERVISOR_ID = 't4';
  const SUPERVISOR_SUBJECT = 'anglais-com';
  const MINUTE = 60000;
  const HOUR = 60 * MINUTE;
  const copy = value => JSON.parse(JSON.stringify(value));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const round2 = value => Math.round(value * 100) / 100;
  const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.length <= max;
  const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'absent', 'failed'];
  const TX_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
  const TUTOR_STATUSES = ['pending', 'approved', 'suspended', 'deleted'];
  const CHAPTER_STATUSES = data.constants.chapterStatuses.map(item => item.id);
  const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  const ATTACHMENT_MAX = 5 * 1024 * 1024;
  const CODE_LIMIT = 5;
  const PASSWORD_RULE = /^(?=.*[A-Za-zÀ-ÿ])(?=.*\d).{8,72}$/;
  const EMAIL_RULE = /^[^\s@]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/;
  const DOMAIN_RULE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
  // Lien officiel d'un établissement : https uniquement, nom d'hôte complet, sans espace ni guillemet.
  const SOURCE_RULE = /^https:\/\/([a-z0-9-]+\.)+[a-z]{2,}(:\d{2,5})?([/?#][^\s"'<>`]*)?$/i;
  const DATE_RULE = /^\d{4}-\d{2}-\d{2}$/;
  const validDay = value => typeof value === 'string' && DATE_RULE.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
  const validSeats = seats => Array.isArray(seats) && seats.length <= 10 && seats.every(seat => seat && typeof seat === 'object' && text(seat.label, 1, 60) && Number.isInteger(seat.count) && seat.count >= 0 && seat.count <= 10000);
  // Validation d'une destination : tout critère non communiqué vaut null (« à confirmer »), jamais inventé.
  function validProgram(program, levels) {
    if (!program || typeof program !== 'object') return false;
    const strings = ['id', 'name', 'institution', 'country', 'source'].every(key => typeof program[key] === 'string' && program[key].trim());
    const optional = key => program[key] === null || program[key] === undefined || typeof program[key] === 'string';
    const language = program.languageReq;
    return strings && optional('city') && optional('sourceNote')
      && (program.mobility === null || data.constants.mobilities.includes(program.mobility))
      && (program.level === null || levels.includes(program.level))
      && Array.isArray(program.tracks) && program.tracks.every(track => data.constants.tracks.includes(track))
      && Array.isArray(program.documents) && program.documents.every(item => typeof item === 'string')
      && (program.minGrade === null || (Number.isFinite(program.minGrade) && program.minGrade >= 0 && program.minGrade <= 20))
      && (language === null || (language && data.constants.languages.includes(language.language) && data.constants.cefr.includes(language.level)))
      && (program.deadline === null || validDay(program.deadline))
      && validSeats(program.seats)
      && typeof program.active === 'boolean'
      && program.source.length <= 200 && SOURCE_RULE.test(program.source);
  }
  const EMAIL_KINDS = ['verification', 'welcome', 'booking-confirmed', 'payment-confirmed', 'payment-failed', 'reminder', 'booking-changed', 'report-available', 'package-info', 'orientation-confirmed', 'password-reset', 'password-changed', 'tutor-approved', 'tutor-booking', 'pods-news', 'account-deleted'];
  const formatDate = value => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
  const formatMoney = value => `${new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} DH`;
  function randomHex(bytes) {
    const array = new Uint8Array(bytes);
    const source = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (source && typeof source.getRandomValues === 'function') source.getRandomValues(array);
    else for (let index = 0; index < bytes; index += 1) array[index] = Math.floor(Math.random() * 256);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  const normalizeEmail = value => String(value || '').trim().toLowerCase();

  // Coordonnées repérées dans un message de discussion : adresse e-mail ou numéro de 9 chiffres ou plus.
  const CONTACT_RULE = /[^\s@]+@[^\s@]+\.[a-z]{2,}|(?:\+|00)?(?:\d[\s.-]?){8,}\d/i;
  const CHAT_MAX = 500;
  const UNREADABLE = 'Données modifiées dans un autre onglet illisibles : rechargez la page avant de poursuivre.';
  // Notification de message privé (exclue de la sauvegarde, comme les discussions privées).
  const PRIVATE_NOTICE = 'Nouveau message privé de ';

  // storage : état partagé (localStorage). sessionStore (facultatif) : session propre à l'onglet (sessionStorage),
  // exclue de l'état partagé ; sans lui, la session reste dans l'état (comportement historique, tests Node).
  function createStore(storage, clock, sessionStore) {
    const now = clock || (() => new Date());
    const time = () => now().getTime();
    const stamp = () => now().toISOString();
    let state = data.seed(now());
    let warning = '';
    let lastSaved = null;
    let depth = 0;
    const id = prefix => `${prefix}-${time().toString(36)}-${randomHex(4)}`;
    // Un état v3 antérieur aux discussions reçoit le chat du seed, sans réinitialiser le reste.
    // Un état v3 antérieur à l'encadrante tutrice (t4) reçoit sa matière, son compte et son profil du seed,
    // sauf si l'e-mail ou un identifiant de chapitre est déjà pris. Matière supprimée par l'admin : rien n'est réinséré.
    function migrate(candidate) {
      if (!candidate || typeof candidate !== 'object' || candidate.version !== VERSION) return candidate;
      const needsChat = candidate.chat === undefined;
      const needsSupervisor = lacksSupervisor(candidate);
      if (!needsChat && !needsSupervisor) return candidate;
      const seeded = data.seed(now());
      if (needsChat) candidate.chat = seeded.chat;
      if (needsSupervisor) addSupervisor(candidate, seeded);
      return candidate;
    }
    // Ajout une seule fois : un état qui contient déjà t4 n'est pas touché (même si sa matière a été supprimée).
    const lacksSupervisor = candidate => Array.isArray(candidate.tutors) && Array.isArray(candidate.users) && Array.isArray(candidate.subjects) && !candidate.tutors.some(item => item && item.id === SUPERVISOR_ID);
    function addSupervisor(candidate, seeded) {
      const subject = seeded.subjects.find(item => item.id === SUPERVISOR_SUBJECT);
      const user = seeded.users.find(item => item.id === SUPERVISOR_ID);
      const tutor = seeded.tutors.find(item => item.id === SUPERVISOR_ID);
      if (!subject || !user || !tutor) return;
      const subjects = candidate.subjects;
      if (subjects.some(item => item && item.id === subject.id)) return;
      const taken = new Set(subjects.flatMap(item => (item && Array.isArray(item.chapters) ? item.chapters : []).map(chapter => chapter && chapter.id)));
      if (subject.chapters.some(chapter => taken.has(chapter.id))) return;
      if (candidate.users.some(item => item && (item.id === user.id || normalizeEmail(item.email) === user.email))) return;
      subjects.push(subject);
      // Marketing ou certains de ses chapitres supprimés par l'administration : on ne garde que ce qui existe.
      const subjectIds = new Set(subjects.map(item => item && item.id));
      const chapterIds = new Set([...taken, ...subject.chapters.map(chapter => chapter.id)]);
      candidate.users.push(user);
      candidate.tutors.push({ ...tutor, subjects: tutor.subjects.filter(id => subjectIds.has(id)), chapters: tutor.chapters.filter(id => chapterIds.has(id)) });
    }
    const persisted = () => JSON.stringify(sessionStore ? { ...state, session: null } : state);
    function readSession(candidate) {
      try {
        const raw = sessionStore.getItem(SESSION_KEY);
        const session = raw ? JSON.parse(raw) : null;
        return session && typeof session.userId === 'string' && typeof session.expires === 'string' && candidate.users.some(user => user.id === session.userId) ? session : null;
      } catch (error) { return null; }
    }
    function writeSession() {
      if (!sessionStore) return;
      try { if (state.session) sessionStore.setItem(SESSION_KEY, JSON.stringify(state.session)); else sessionStore.removeItem(SESSION_KEY); }
      catch (error) { /* session conservée en mémoire seulement */ }
    }

    function valid(candidate) {
      assert(candidate && candidate.version === VERSION, 'Version locale incompatible.');
      const arrays = ['encgs', 'levels', 'subjects', 'users', 'codes', 'emails', 'tutors', 'offers', 'bookings', 'transactions', 'packages', 'reviews', 'payouts', 'programs', 'orientationProfiles', 'consultations', 'messages', 'notifications'];
      for (const key of arrays) assert(Array.isArray(candidate[key]), 'Données locales invalides.');
      const strings = (item, keys) => item && typeof item === 'object' && keys.every(key => typeof item[key] === 'string');
      const unique = key => assert(new Set(candidate[key].map(item => item && item.id)).size === candidate[key].length, 'Identifiants locaux dupliqués.');
      for (const key of ['subjects', 'users', 'tutors', 'offers', 'bookings', 'transactions', 'packages', 'reviews', 'programs']) unique(key);
      const config = candidate.config;
      assert(config && config.domains && typeof config.domains === 'object' && config.policy && config.payout && config.payout.rates && ['volunteer', 'paid'].includes(config.payout.phase) && Number.isFinite(config.feeRate) && ['CMI', 'Payzone'].includes(config.provider) && typeof config.paymentSecret === 'string', 'Configuration invalide.');
      for (const key of ['cancelHours', 'rescheduleHours', 'holdMinutes', 'reminderHours', 'priorityHours', 'sessionHours', 'lockMinutes', 'maxAttempts']) assert(Number.isFinite(config.policy[key]) && config.policy[key] >= 0, 'Politique invalide.');
      assert(candidate.encgs.length > 0 && candidate.encgs.every(name => typeof name === 'string' && Array.isArray(config.domains[name]) && config.domains[name].every(domain => DOMAIN_RULE.test(domain))), 'Domaines invalides.');
      assert(candidate.levels.length > 0 && candidate.levels.every(level => typeof level === 'string' && level.trim()), 'Niveaux invalides.');
      for (const subject of candidate.subjects) assert(strings(subject, ['id', 'name', 'level']) && Array.isArray(subject.chapters) && subject.chapters.every(chapter => strings(chapter, ['id', 'name'])), 'Matière invalide.');
      const chapterIds = new Set(candidate.subjects.flatMap(subject => subject.chapters.map(chapter => chapter.id)));
      assert(chapterIds.size === candidate.subjects.reduce((total, subject) => total + subject.chapters.length, 0), 'Chapitres dupliqués.');
      const subjectIds = new Set(candidate.subjects.map(subject => subject.id));
      for (const user of candidate.users) assert(strings(user, ['id', 'role', 'name', 'email', 'salt', 'hash', 'status']) && ['student', 'tutor', 'admin'].includes(user.role) && typeof user.verified === 'boolean' && ['active', 'suspended'].includes(user.status) && (user.sessionsRevokedAt === undefined || Number.isFinite(Date.parse(user.sessionsRevokedAt))), 'Compte invalide.');
      assert(new Set(candidate.users.map(user => user.email)).size === candidate.users.length, 'Adresses dupliquées.');
      assert(candidate.users.some(user => user.role === 'admin'), 'Administrateur manquant.');
      assert(candidate.session === null || (strings(candidate.session, ['userId', 'expires']) && candidate.users.some(user => user.id === candidate.session.userId)), 'Session invalide.');
      assert(candidate.throttle && typeof candidate.throttle === 'object' && !Array.isArray(candidate.throttle), 'Journal de connexion invalide.');
      for (const tutor of candidate.tutors) {
        assert(strings(tutor, ['id', 'name', 'encg', 'level', 'bio', 'status']) && TUTOR_STATUSES.includes(tutor.status) && typeof tutor.photoConsent === 'boolean' && typeof tutor.showAge === 'boolean', 'Tuteur invalide.');
        assert(typeof tutor.photo === 'string' && (tutor.photo === '' || /^assets\/(yassine|lina|adam)\.jpg$/.test(tutor.photo)), 'Photo de tuteur invalide.');
        for (const key of ['subjects', 'chapters', 'languages', 'modes', 'services', 'slots', 'prioritySlots', 'blocked']) assert(Array.isArray(tutor[key]), 'Tuteur invalide.');
        assert(tutor.subjects.every(item => subjectIds.has(item)) && tutor.chapters.every(item => chapterIds.has(item)) && tutor.slots.every(slot => Number.isFinite(Date.parse(slot))) && tutor.prioritySlots.every(slot => tutor.slots.includes(slot)), 'Enseignements ou créneaux invalides.');
        assert(tutor.blocked.every(period => strings(period, ['id', 'start', 'end']) && Date.parse(period.end) > Date.parse(period.start)), 'Indisponibilité invalide.');
      }
      assert(['quick', 'catch', 'exam', 'stay'].every(offerId => candidate.offers.some(offer => offer && offer.id === offerId)) && candidate.offers.length === 4, 'Offres locales incomplètes.');
      for (const offer of candidate.offers) assert(strings(offer, ['id', 'name']) && Number.isFinite(offer.price) && offer.price > 0 && Number.isInteger(offer.credits) && offer.credits > 0 && offer.minutes > 0 && offer.days > 0, 'Offre invalide.');
      const tutorIds = new Set(candidate.tutors.map(tutor => tutor.id));
      for (const booking of candidate.bookings) {
        assert(strings(booking, ['id', 'studentId', 'studentName', 'tutorId', 'offerId', 'offerName', 'start', 'status']) && tutorIds.has(booking.tutorId) && BOOKING_STATUSES.includes(booking.status) && Number.isFinite(Date.parse(booking.start)) && Number.isFinite(booking.price) && booking.minutes > 0 && booking.need && typeof booking.need === 'object', 'Réservation invalide.');
        assert(booking.report === null || (strings(booking.report, ['subjectId', 'notions', 'exercises', 'difficulties', 'toReview', 'recommendations']) && Array.isArray(booking.report.chapters) && booking.report.chapters.every(item => item && chapterIds.has(item.id) && CHAPTER_STATUSES.includes(item.status))), 'Compte rendu invalide.');
      }
      for (const transaction of candidate.transactions) assert(strings(transaction, ['id', 'orderId', 'kind', 'studentId', 'offerName', 'status', 'created']) && TX_STATUSES.includes(transaction.status) && Number.isFinite(transaction.amount) && Number.isFinite(transaction.fee), 'Transaction invalide.');
      for (const pack of candidate.packages) assert(strings(pack, ['id', 'studentId', 'offerId', 'name', 'transactionId', 'status']) && Number.isInteger(pack.remaining) && pack.remaining >= 0 && pack.remaining <= pack.total && Number.isFinite(Date.parse(pack.expires)) && ['active', 'expired', 'terminated'].includes(pack.status), 'Forfait invalide.');
      for (const review of candidate.reviews) assert(strings(review, ['id', 'bookingId', 'studentId', 'tutorId', 'text']) && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 && typeof review.hidden === 'boolean' && typeof review.reported === 'boolean', 'Avis invalide.');
      for (const program of candidate.programs) assert(validProgram(program, candidate.levels), 'Programme invalide.');
      for (const email of candidate.emails) assert(strings(email, ['id', 'to', 'kind', 'subject', 'created']) && Array.isArray(email.lines), 'E-mail invalide.');
      for (const notification of candidate.notifications) assert(strings(notification, ['id', 'userId', 'text', 'created']), 'Notification invalide.');
      for (const message of candidate.messages) assert(strings(message, ['id', 'name', 'text', 'created']), 'Message invalide.');
      assert(candidate.pods && Array.isArray(candidate.pods.locations) && Array.isArray(candidate.pods.subscribers) && Array.isArray(candidate.pods.prototype), 'Study Pods invalides.');
      validChat(candidate);
      return candidate;
    }
    function validChat(candidate) {
      const chat = candidate.chat;
      const lists = ['rooms', 'personas', 'messages', 'threads', 'pending'];
      assert(chat && typeof chat === 'object' && lists.every(key => Array.isArray(chat[key])), 'Discussions invalides.');
      for (const key of lists) assert(new Set(chat[key].map(item => item && item.id)).size === chat[key].length, 'Identifiants locaux dupliqués.');
      const strings = (item, keys) => item && typeof item === 'object' && keys.every(key => typeof item[key] === 'string');
      for (const room of chat.rooms) assert(strings(room, ['id', 'name', 'kind']) && ['track', 'subject'].includes(room.kind), 'Salon invalide.');
      const userIds = new Set(candidate.users.map(user => user.id));
      for (const persona of chat.personas) assert(strings(persona, ['id', 'name']) && persona.name.includes('(fictive)') && !userIds.has(persona.id), 'Persona invalide.');
      const people = new Set([...userIds, ...chat.personas.map(persona => persona.id)]);
      for (const thread of chat.threads) assert(strings(thread, ['id', 'created']) && Array.isArray(thread.members) && thread.members.length === 2 && thread.members[0] !== thread.members[1] && thread.members.every(member => people.has(member)), 'Discussion privée invalide.');
      const roomIds = new Set(chat.rooms.map(room => room.id));
      const threadIds = new Set(chat.threads.map(thread => thread.id));
      const target = item => (typeof item.roomId === 'string' && roomIds.has(item.roomId) && !item.threadId) || (typeof item.threadId === 'string' && threadIds.has(item.threadId) && !item.roomId);
      for (const message of chat.messages) assert(strings(message, ['id', 'fromName', 'text', 'created', 'reportReason']) && target(message) && (message.fromId === null || typeof message.fromId === 'string') && message.text.length >= 1 && message.text.length <= CHAT_MAX && typeof message.reported === 'boolean' && typeof message.hidden === 'boolean', 'Message de discussion invalide.');
      for (const item of chat.pending) assert(strings(item, ['id', 'due', 'personaId', 'text']) && Number.isFinite(Date.parse(item.due)) && chat.personas.some(persona => persona.id === item.personaId) && target(item), 'Réponse planifiée invalide.');
    }

    try {
      assert(storage, 'Stockage indisponible.');
      const saved = storage.getItem(KEY);
      if (saved) state = valid(migrate(JSON.parse(saved)));
      if (sessionStore) state.session = readSession(state);
      lastSaved = persisted();
      storage.setItem(KEY, lastSaved);
      for (const legacy of LEGACY_KEYS) if (typeof storage.removeItem === 'function' && storage.getItem(legacy) !== null && storage.getItem(legacy) !== undefined) storage.removeItem(legacy);
    } catch (error) {
      warning = 'Stockage indisponible ou invalide : mode mémoire actif. Les changements seront perdus au rechargement.';
      storage = null;
      if (sessionStore) state.session = readSession(state);
    }
    // N'écrit l'état partagé que s'il a changé : une simple navigation (session prolongée dans l'onglet)
    // ne déclenche donc aucun événement `storage` dans les autres onglets.
    function save() {
      writeSession();
      if (!storage) return;
      const serialized = persisted();
      if (serialized === lastSaved) return;
      try { storage.setItem(KEY, serialized); lastSaved = serialized; } catch (error) { storage = null; warning = 'Échec de sauvegarde : mode mémoire actif. Une ancienne sauvegarde peut subsister, y compris après suppression du compte. Effacez les données du site dans le navigateur.'; }
    }
    // Relit l'état partagé écrit par un autre onglet, en gardant la session de cet onglet.
    function refresh() {
      if (!storage) return false;
      let saved;
      try { saved = storage.getItem(KEY); } catch (error) { return false; }
      if (!saved || saved === lastSaved) return false;
      try {
        const candidate = migrate(JSON.parse(saved));
        const session = state.session;
        candidate.session = session && Array.isArray(candidate.users) && candidate.users.some(user => user.id === session.userId) ? session : null;
        state = valid(candidate);
        lastSaved = saved;
        if (warning === UNREADABLE) warning = '';
        return true;
      } catch (error) {
        warning = UNREADABLE;
        return false;
      }
    }
    // L'état partagé est relu avant chaque écriture (transaction la plus externe seulement).
    function transaction(action) {
      if (depth === 0) refresh();
      depth += 1;
      const before = copy(state);
      try { const result = action(); valid(state); save(); return copy(result === undefined ? null : result); }
      catch (error) { state = before; throw error; }
      finally { depth -= 1; }
    }
    const sync = () => { if (depth === 0) refresh(); };
    function mutate(action) {
      sync();
      housekeeping();
      return transaction(() => { const result = action(); touchSession(); return result; });
    }

    // --- Outils internes -------------------------------------------------
    const policy = () => state.config.policy;
    const findUser = userId => state.users.find(user => user.id === userId);
    const userByEmail = email => state.users.find(user => user.email === normalizeEmail(email));
    const findTutor = tutorId => state.tutors.find(tutor => tutor.id === tutorId);
    const findSubject = subjectId => state.subjects.find(subject => subject.id === subjectId);
    const findOffer = offerId => state.offers.find(offer => offer.id === offerId);
    const findBooking = bookingId => state.bookings.find(booking => booking.id === bookingId);
    const chapterName = chapterId => { for (const subject of state.subjects) { const chapter = subject.chapters.find(item => item.id === chapterId); if (chapter) return chapter.name; } return chapterId; };
    const admins = () => state.users.filter(user => user.role === 'admin');
    const hashPassword = (salt, password) => sha256(`${salt}${password}`);
    function mail(to, kind, subject, lines, extra) {
      assert(EMAIL_KINDS.includes(kind), 'Type d\'e-mail inconnu.');
      state.emails.unshift({ id: id('mail'), to: normalizeEmail(to), kind, subject, lines, created: stamp(), read: false, ...(extra || {}) });
    }
    function notify(userId, message) { if (userId) state.notifications.unshift({ id: id('notif'), userId, text: message, created: stamp(), read: false }); }
    function notifyAdmins(message) { for (const admin of admins()) notify(admin.id, message); }
    function sessionUser() {
      const session = state.session;
      if (!session || Date.parse(session.expires) <= time()) return null;
      const user = findUser(session.userId);
      const revoked = user && user.sessionsRevokedAt && !(Date.parse(session.created) >= Date.parse(user.sessionsRevokedAt));
      return user && user.verified && user.status === 'active' && !revoked ? user : null;
    }
    function touchSession() { const user = sessionUser(); if (user) state.session.expires = new Date(time() + policy().sessionHours * HOUR).toISOString(); }
    function me(...roles) {
      const user = sessionUser();
      assert(user && (!roles.length || roles.includes(user.role)), 'Accès refusé : connectez-vous avec un compte autorisé.');
      return user;
    }
    function myTutor(editing) {
      const user = me('tutor');
      const tutor = findTutor(user.id);
      assert(tutor && tutor.status !== 'deleted', 'Profil tuteur introuvable.');
      if (editing) assert(tutor.status !== 'suspended', 'Profil suspendu : modifications désactivées. Contactez l\'administration.');
      return tutor;
    }
    function issueCode(user, purpose) {
      const recent = state.codes.filter(code => code.userId === user.id && code.purpose === purpose && Date.parse(code.created) > time() - HOUR).length;
      if (recent >= CODE_LIMIT) return false;
      for (const code of state.codes) if (code.userId === user.id && code.purpose === purpose) code.used = true;
      const value = String(parseInt(randomHex(4), 16) % 1000000).padStart(6, '0');
      state.codes.push({ id: id('code'), userId: user.id, purpose, hash: sha256(`${user.salt}${value}`), expires: new Date(time() + 30 * MINUTE).toISOString(), created: stamp(), attempts: 0, used: false });
      if (purpose === 'verify') mail(user.email, 'verification', 'Votre code de vérification ONTRACK', [`Bonjour ${user.name},`, `Votre code de vérification est : ${value}`, 'Saisissez-le sur la page « Vérifier mon adresse ». Il expire dans 30 minutes.', 'Si vous n\'êtes pas à l\'origine de cette inscription, ignorez ce message.'], { code: value });
      else mail(user.email, 'password-reset', 'Réinitialisation de votre mot de passe', [`Bonjour ${user.name},`, `Votre code de réinitialisation est : ${value}`, 'Il expire dans 30 minutes. Si vous n\'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.'], { code: value });
      return true;
    }
    function checkCode(user, purpose, value) {
      const code = state.codes.find(item => item.userId === user.id && item.purpose === purpose && !item.used && Date.parse(item.expires) > time());
      if (!code) return false;
      if (code.hash !== sha256(`${user.salt}${String(value || '').trim()}`)) {
        code.attempts += 1;
        if (code.attempts >= 5) code.used = true;
        return false;
      }
      code.used = true;
      return true;
    }
    function blocking(booking) {
      if (['cancelled', 'failed'].includes(booking.status)) return false;
      return booking.status !== 'pending' || Date.parse(booking.holdUntil) > time();
    }
    function isSubscriber(studentId) {
      return state.packages.some(pack => pack.studentId === studentId && pack.offerId === 'stay' && pack.status === 'active' && Date.parse(pack.expires) > time());
    }
    function slotIssue(tutor, start, minutes, options) {
      const opts = options || {};
      if (!tutor || tutor.status !== 'approved') return 'Tuteur non validé.';
      if (!tutor.slots.includes(start) || Date.parse(start) <= time()) return 'Créneau passé ou incompatible.';
      const begin = Date.parse(start);
      const end = begin + minutes * MINUTE;
      if (tutor.blocked.some(period => Date.parse(period.start) < end && begin < Date.parse(period.end))) return 'Créneau bloqué par le tuteur (période d\'indisponibilité).';
      if (state.bookings.some(booking => booking.id !== opts.except && blocking(booking) && (booking.tutorId === tutor.id || (opts.studentId && booking.studentId === opts.studentId)) && Date.parse(booking.start) < end && begin < Date.parse(booking.start) + booking.minutes * MINUTE)) return 'Créneau occupé. Choisissez un autre horaire.';
      if (tutor.prioritySlots.includes(start) && !opts.subscriber && begin - time() >= policy().priorityHours * HOUR) return `Créneau prioritaire Stay ONTRACK : ouvert aux non-abonnés seulement ${policy().priorityHours} h avant le début.`;
      if (opts.limit && end > opts.limit) return 'Créneau hors de la validité du forfait.';
      return null;
    }
    function available(tutor, start, minutes, options) {
      const issue = slotIssue(tutor, start, minutes, options);
      assert(!issue, issue);
    }
    function stayExpiry(from) {
      const expires = new Date(from);
      const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
      const parts = value => Object.fromEntries(formatter.formatToParts(value).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
      const local = parts(expires);
      const lastDay = new Date(Date.UTC(local.year, local.month + 1, 0)).getUTCDate();
      const target = Date.UTC(local.year, local.month, Math.min(local.day, lastDay), local.hour, local.minute, local.second, expires.getUTCMilliseconds());
      expires.setTime(target);
      for (let pass = 0; pass < 2; pass += 1) {
        const shown = parts(expires);
        expires.setTime(expires.getTime() + target - Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second, expires.getUTCMilliseconds()));
      }
      return expires.getTime();
    }
    const packageExpiry = (offer, from) => offer.id === 'stay' ? stayExpiry(from) : from + offer.days * 86400000;
    const splitCredits = (amount, total) => Array.from({ length: total }, (_, index) => (Math.round((index + 1) * amount * 100 / total) - Math.round(index * amount * 100 / total)) / 100);
    const sign = (orderId, status, amount) => sha256(`${state.config.paymentSecret}${orderId}${status}${Number(amount).toFixed(2)}`);
    const sessionLabel = booking => `${booking.offerName} avec ${findTutor(booking.tutorId)?.name || 'votre tuteur'}, le ${formatDate(booking.start)} (heure marocaine)`;
    function payoutFor(booking) {
      const phase = state.config.payout.phase;
      return { amount: phase === 'paid' ? round2(Number(state.config.payout.rates[booking.offerId]) || 0) : 0, phase, payoutId: null };
    }
    function confirmPayment(tx, booking) {
      const offer = findOffer(booking.offerId);
      const student = findUser(booking.studentId);
      tx.status = 'paid'; tx.fee = round2(tx.amount * state.config.feeRate); tx.updated = stamp(); tx.verifiedAt = stamp();
      if (tx.credits > 1) {
        const expires = new Date(packageExpiry(offer, time())).toISOString();
        const pack = { id: id('pack'), studentId: booking.studentId, offerId: booking.offerId, name: booking.offerName, total: tx.credits, remaining: tx.credits - 1, expires, transactionId: tx.id, unitPrice: tx.amount / tx.credits, creditValues: splitCredits(tx.amount, tx.credits), status: 'active', created: stamp(), infoSent: true };
        booking.price = pack.creditValues.shift();
        booking.packageId = pack.id;
        state.packages.push(pack);
        if (student) mail(student.email, 'package-info', `Votre forfait ${pack.name} est actif`, [`Bonjour ${student.name},`, `Votre forfait ${pack.name} comprend ${pack.total} séances de ${offer.minutes} minutes. Une séance est déjà planifiée ; il vous reste ${pack.remaining} séance(s) à planifier.`, `Validité : jusqu'au ${formatDate(expires)}. Aucune reconduction automatique ; les séances non utilisées à l'échéance ne sont pas reportées.`, 'Planifiez vos séances depuis Mon espace > Mes forfaits.'], { bookingId: booking.id });
      }
      booking.status = 'confirmed'; booking.holdUntil = null;
      if (student) {
        mail(student.email, 'payment-confirmed', 'Paiement confirmé', [`Bonjour ${student.name},`, `Nous confirmons la réception de votre paiement de ${formatMoney(tx.amount)} (commande ${tx.orderId}, ${tx.provider}, simulation).`, 'Le paiement figure dans votre historique : Mon espace > Historique.'], { bookingId: booking.id });
        mail(student.email, 'booking-confirmed', 'Réservation confirmée', [`Bonjour ${student.name},`, `Votre séance ${sessionLabel(booking)} est confirmée.`, `Annulation sans frais jusqu'à ${policy().cancelHours} h avant le début ; modification jusqu'à ${policy().rescheduleHours} h avant.`, 'Le lien de visioconférence sera communiqué par le tuteur (aucun lien réel dans cette démonstration).'], { bookingId: booking.id });
        notify(student.id, `Réservation confirmée : ${sessionLabel(booking)}.`);
      }
      tutorBookingNotice(booking);
    }
    function tutorBookingNotice(booking) {
      const tutorUser = findUser(booking.tutorId);
      notify(booking.tutorId, `Nouvelle réservation : ${booking.offerName} avec ${booking.studentName}, ${formatDate(booking.start)}.`);
      if (tutorUser) mail(tutorUser.email, 'tutor-booking', 'Nouvelle réservation', [`Bonjour ${tutorUser.name},`, `${booking.studentName} a réservé ${booking.offerName} le ${formatDate(booking.start)} (heure marocaine).`, 'Consultez le besoin décrit par l\'étudiant dans votre tableau de bord > Réservations.']);
    }
    function failPayment(tx, booking, reason) {
      tx.status = 'failed'; tx.failureReason = reason; tx.updated = stamp();
      booking.status = 'failed'; booking.holdUntil = null;
      const student = findUser(booking.studentId);
      if (student) {
        mail(student.email, 'payment-failed', 'Échec de paiement', [`Bonjour ${student.name},`, `Le paiement de ${formatMoney(tx.amount)} pour ${booking.offerName} n'a pas abouti (${reason}). Aucune somme n'a été débitée et votre réservation n'est pas confirmée.`, 'Le créneau a été libéré. Vous pouvez faire un nouvel essai depuis Mon espace > Mes séances.'], { bookingId: booking.id });
        notify(student.id, `Paiement ${reason} : réservation non confirmée, créneau libéré.`);
      }
    }
    function processNotification(notification) {
      const n = notification || {};
      const tx = state.transactions.find(item => item.kind === 'payment' && item.orderId === n.orderId);
      if (!tx) return { ok: false, error: 'Commande inconnue : notification ignorée.' };
      if (typeof n.signature !== 'string' || !['accepted', 'refused', 'cancelled'].includes(n.status) || n.signature !== sign(n.orderId, n.status, n.amount)) return { ok: false, error: 'Signature invalide : notification ignorée.' };
      if (Math.round(Number(n.amount) * 100) !== Math.round(tx.amount * 100)) return { ok: false, error: 'Montant incohérent : notification ignorée.' };
      if (tx.status !== 'pending') return { ok: false, error: 'Transaction déjà finalisée : notification rejouée ignorée.' };
      const booking = findBooking(tx.bookingId);
      if (!booking || booking.status !== 'pending') return { ok: false, error: 'Réservation introuvable : notification ignorée.' };
      const tutor = findTutor(booking.tutorId);
      if (n.status === 'accepted' && (!tutor || tutor.status !== 'approved')) failPayment(tx, booking, 'tuteur indisponible');
      else if (n.status === 'accepted') confirmPayment(tx, booking);
      else failPayment(tx, booking, n.status === 'refused' ? 'refusé' : 'abandonné');
      return { ok: true, status: tx.status, bookingId: booking.id };
    }
    function refund(booking, amount, reason) {
      const tx = state.transactions.find(item => item.id === booking.transactionId);
      const record = { id: id('tx'), orderId: `${tx ? tx.orderId : 'OT'}-R${state.transactions.filter(item => item.kind === 'refund').length + 1}`, kind: 'refund', studentId: booking.studentId, bookingId: booking.id, offerId: booking.offerId, offerName: booking.offerName, amount: -round2(amount), fee: 0, status: 'refunded', provider: tx ? tx.provider : state.config.provider, created: stamp(), updated: stamp(), reason };
      state.transactions.push(record);
      return record;
    }
    function settleCancellation(booking, by) {
      booking.status = 'cancelled';
      const pack = state.packages.find(item => item.id === booking.packageId);
      let outcome;
      if (pack && pack.status === 'active' && Date.parse(pack.expires) > time()) {
        pack.remaining += 1;
        if (pack.creditValues) pack.creditValues.unshift(booking.price);
        outcome = 'credit';
      } else {
        refund(booking, booking.price, `Annulation (${by})`);
        outcome = 'refund';
      }
      booking.cancellation = { at: stamp(), by, outcome };
      const student = findUser(booking.studentId);
      const detail = outcome === 'credit' ? 'Le crédit de séance a été restitué à votre forfait (date d\'expiration inchangée).' : `Un remboursement de ${formatMoney(booking.price)} a été enregistré (simulation).`;
      if (student) {
        mail(student.email, 'booking-changed', 'Annulation de votre séance', [`Bonjour ${student.name},`, `Votre séance ${sessionLabel(booking)} est annulée (${by === 'student' ? 'à votre demande' : by === 'tutor' ? 'par le tuteur' : 'par l\'administration'}).`, detail], { bookingId: booking.id });
        notify(student.id, `Séance annulée. ${detail}`);
      }
      notify(booking.tutorId, `Séance annulée : ${booking.studentName}, ${formatDate(booking.start)}.`);
      return outcome;
    }
    function housekeeping() {
      transaction(() => {
        if (state.session && Date.parse(state.session.expires) <= time()) state.session = null;
        for (const booking of state.bookings) {
          if (booking.status === 'pending' && Date.parse(booking.holdUntil) <= time()) {
            const tx = state.transactions.find(item => item.id === booking.transactionId && item.status === 'pending');
            if (tx) failPayment(tx, booking, 'expiré');
            else { booking.status = 'failed'; booking.holdUntil = null; }
          }
          const delay = Date.parse(booking.start) - time();
          if (booking.status === 'confirmed' && !booking.reminded && delay > 0 && delay <= policy().reminderHours * HOUR) {
            booking.reminded = true;
            const student = findUser(booking.studentId);
            if (student) {
              mail(student.email, 'reminder', 'Rappel : votre séance approche', [`Bonjour ${student.name},`, `Rappel : ${sessionLabel(booking)}.`, `Besoin exprimé : ${booking.need.text || '—'}`, 'Préparez vos questions et vos supports de cours.'], { bookingId: booking.id });
              notify(student.id, `Rappel : séance ${formatDate(booking.start)}.`);
            }
            notify(booking.tutorId, `Rappel : séance avec ${booking.studentName}, ${formatDate(booking.start)}.`);
          }
        }
        for (const pack of state.packages) {
          if (pack.status === 'active' && Date.parse(pack.expires) <= time()) {
            pack.status = 'expired';
            const student = findUser(pack.studentId);
            if (student) mail(student.email, 'package-info', `Votre forfait ${pack.name} a expiré`, [`Bonjour ${student.name},`, `Votre forfait ${pack.name} est arrivé à échéance le ${formatDate(pack.expires)}.`, `${pack.remaining} séance(s) non utilisée(s) : non reportée(s), conformément à la politique affichée avant l'achat.`, 'Aucun renouvellement automatique n\'a été effectué.']);
          }
        }
        deliverChat();
      });
    }

    // --- Discussions entre étudiants ------------------------------------------
    const findPersona = personaId => state.chat.personas.find(persona => persona.id === personaId);
    const chatName = personId => (findPersona(personId) || findUser(personId) || { name: 'Compte supprimé' }).name;
    const firstName = name => String(name).split(' ')[0];
    const chatMessage = (fields, author) => ({ id: id('cm'), roomId: null, threadId: null, ...fields, fromId: author.id, fromName: author.name, created: stamp(), reported: false, reportReason: '', hidden: false });
    function conversation(user, roomId, threadId) {
      if (roomId && !threadId) {
        const room = state.chat.rooms.find(item => item.id === roomId);
        assert(room, 'Discussion introuvable.');
        return { room, thread: null };
      }
      const thread = !roomId && state.chat.threads.find(item => item.id === threadId);
      assert(thread && thread.members.includes(user.id), 'Discussion introuvable.');
      return { room: null, thread };
    }
    const canSee = (user, message) => Boolean(message.roomId) || state.chat.threads.some(thread => thread.id === message.threadId && thread.members.includes(user.id));
    // Persona qui répond dans un salon : de préférence de la filière du salon, à tour de rôle.
    function roomPersona(room) {
      const same = state.chat.personas.filter(persona => room.kind === 'track' && persona.track === room.track);
      const pool = same.length ? same : state.chat.personas;
      return pool.length ? pool[state.chat.messages.filter(message => message.roomId === room.id).length % pool.length] : null;
    }
    // Réponse simulée par mots-clés (texte sans accents), sinon réponse générique. Un mot-clé (lettres et espaces
    // seulement) est reconnu en début de mot : « inactif » ne déclenche pas « actif ». En salon, aucun prénom n'est inséré.
    function personaReply(body, user, inRoom) {
      const normalized = body.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const words = ` ${normalized.replace(/[^a-z0-9]+/g, ' ')}`;
      const match = data.chatReplies.find(reply => reply.keywords.some(keyword => words.includes(` ${keyword}`)));
      const template = match ? match.text : data.chatFallback[normalized.length % data.chatFallback.length];
      return inRoom ? template.replace(/,? \{name\}/g, '') : template.replace(/\{name\}/g, () => firstName(user.name));
    }
    // Distribue les réponses planifiées arrivées à échéance ; un message privé reçu crée une notification.
    function deliverChat() {
      const due = state.chat.pending.filter(item => Date.parse(item.due) <= time());
      if (!due.length) return;
      state.chat.pending = state.chat.pending.filter(item => !due.includes(item));
      for (const item of due) {
        const persona = findPersona(item.personaId);
        const thread = item.threadId ? state.chat.threads.find(entry => entry.id === item.threadId) : null;
        if (!persona || (item.threadId ? !thread : !state.chat.rooms.some(room => room.id === item.roomId))) continue;
        state.chat.messages.push(chatMessage({ roomId: item.roomId || null, threadId: item.threadId || null, text: item.text }, persona));
        if (thread) for (const member of thread.members) if (findUser(member)) notify(member, `${PRIVATE_NOTICE}${persona.name}.`);
      }
    }

    // --- Lecture ------------------------------------------------------------
    function tutorRating(tutorId) {
      const reviews = state.reviews.filter(review => review.tutorId === tutorId && !review.hidden);
      return { average: reviews.length ? round2(reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) : null, count: reviews.length };
    }
    function progress(studentId) {
      const student = studentId || sessionUser()?.id;
      const bookings = state.bookings.filter(booking => booking.studentId === student && ['confirmed', 'completed', 'absent'].includes(booking.status));
      const subjectIds = [...new Set(bookings.flatMap(booking => [booking.need.subjectId, booking.report?.subjectId]).filter(Boolean))];
      const statuses = {};
      const lastReport = {};
      bookings.filter(booking => booking.status === 'completed' && booking.report).sort((first, second) => Date.parse(first.report.created) - Date.parse(second.report.created)).forEach(booking => {
        for (const chapter of booking.report.chapters) statuses[chapter.id] = chapter.status;
        lastReport[booking.report.subjectId] = booking.report.created;
      });
      return subjectIds.map(findSubject).filter(Boolean).map(subject => {
        const chapters = subject.chapters.map(chapter => ({ id: chapter.id, name: chapter.name, status: statuses[chapter.id] || 'a-etudier' }));
        const worked = chapters.filter(chapter => chapter.status !== 'a-etudier').length;
        return { subjectId: subject.id, name: subject.name, total: chapters.length, worked, percent: chapters.length ? Math.round(worked / chapters.length * 100) : 0, chapters, updated: lastReport[subject.id] || null };
      });
    }
    function matchTutors(need, offerId) {
      const wanted = need || {};
      return state.tutors.filter(tutor => tutor.status === 'approved' && (!wanted.subjectId || tutor.subjects.includes(wanted.subjectId)) && (!offerId || tutor.services.includes(offerId)) && (!wanted.mode || tutor.modes.includes(wanted.mode))).map(tutor => {
        const reasons = [];
        let score = 0;
        if (wanted.subjectId) { reasons.push('Enseigne la matière'); score += 2; }
        if (wanted.chapterId && tutor.chapters.includes(wanted.chapterId)) { reasons.push('Maîtrise le chapitre demandé'); score += 3; }
        if (wanted.mode) reasons.push(`Propose le mode ${wanted.mode.toLowerCase()}`);
        if (wanted.encg && tutor.encg === wanted.encg) { reasons.push('Même ENCG'); score += 1; }
        const rating = tutorRating(tutor.id);
        if (rating.average) score += rating.average / 5;
        return { tutorId: tutor.id, score: round2(score), reasons };
      }).sort((first, second) => second.score - first.score);
    }
    function freeSlots(tutorId, offerId, options) {
      const opts = options || {};
      const tutor = findTutor(tutorId);
      const offer = findOffer(offerId);
      if (!tutor || !offer) return [];
      const studentId = opts.studentId || sessionUser()?.id;
      let limit = null;
      if (opts.packageId) { const pack = state.packages.find(item => item.id === opts.packageId); if (pack) limit = Date.parse(pack.expires); }
      else if (offer.credits > 1) limit = packageExpiry(offer, time());
      const subscriber = (offerId === 'stay' && !opts.except) || isSubscriber(studentId);
      return tutor.slots.filter(start => Date.parse(start) > time()).map(start => ({ start, priority: tutor.prioritySlots.includes(start), issue: slotIssue(tutor, start, opts.minutes || offer.minutes, { studentId, subscriber, limit, except: opts.except }) }));
    }
    function recommendations(studentId) {
      const profile = state.orientationProfiles.find(item => item.studentId === (studentId || sessionUser()?.id));
      if (!profile) return [];
      const rank = level => state.levels.indexOf(level);
      const cefr = level => data.constants.cefr.indexOf(level);
      // Critère non communiqué : affiché « à confirmer », ni rempli ni bloquant, exclu de met / total.
      const unknown = label => ({ label, ok: false, unknown: true });
      return state.programs.filter(program => program.active).map(program => {
        const language = program.languageReq;
        const spoken = language ? profile.languages.find(item => item.language === language.language) : null;
        const criteria = [
          program.tracks.length ? { label: `Filière compatible (${program.tracks.join(', ')})`, ok: program.tracks.includes(profile.track) } : unknown('Filières éligibles'),
          program.level ? { label: `Niveau minimum ${program.level}`, ok: rank(profile.level) >= rank(program.level) } : unknown('Niveau minimum'),
          program.minGrade !== null ? { label: `Moyenne minimale ${program.minGrade} / 20`, ok: Number(profile.average) >= program.minGrade } : unknown('Moyenne minimale'),
          language ? { label: `${language.language} niveau ${language.level}`, ok: Boolean(spoken) && cefr(spoken.level) >= cefr(language.level) } : unknown('Exigence linguistique'),
          { label: profile.countries.length ? `Destination souhaitée (${program.country})` : 'Destination : aucune préférence', ok: !profile.countries.length || profile.countries.includes(program.country) },
          profile.programType === 'Indifférent' ? { label: 'Type de mobilité : indifférent', ok: true } : program.mobility ? { label: `Type recherché : ${profile.programType}`, ok: profile.programType === program.mobility } : unknown('Type de mobilité')
        ];
        const known = criteria.filter(item => !item.unknown);
        const met = known.filter(item => item.ok).length;
        const deadlinePassed = program.deadline ? Date.parse(data.moroccoInstant(program.deadline, 23, 59)) < time() : false;
        return { programId: program.id, criteria, met, total: known.length, unknown: criteria.length - known.length, eligible: met === known.length && !deadlinePassed, deadlinePassed };
      }).sort((first, second) => Number(second.eligible) - Number(first.eligible) || (second.total ? second.met / second.total : 0) - (first.total ? first.met / first.total : 0));
    }
    function payoutSummary(tutorId) {
      const sessions = state.bookings.filter(booking => booking.tutorId === tutorId && booking.payout && ['completed', 'absent'].includes(booking.status));
      const due = round2(sessions.filter(booking => !booking.payout.payoutId).reduce((total, booking) => total + booking.payout.amount, 0));
      const paid = round2(state.payouts.filter(payout => payout.tutorId === tutorId).reduce((total, payout) => total + payout.amount, 0));
      return { phase: state.config.payout.phase, due, paid, sessions: sessions.length, payouts: state.payouts.filter(payout => payout.tutorId === tutorId) };
    }
    function finance() {
      const payments = state.transactions.filter(tx => tx.kind === 'payment' && tx.status === 'paid');
      const refunds = state.transactions.filter(tx => tx.kind === 'refund');
      const revenue = round2(payments.reduce((total, tx) => total + tx.amount, 0));
      const refunded = round2(refunds.reduce((total, tx) => total - tx.amount, 0));
      const fees = round2(payments.reduce((total, tx) => total + tx.fee, 0));
      const tutorDue = round2(state.tutors.reduce((total, tutor) => total + payoutSummary(tutor.id).due, 0));
      const tutorPaid = round2(state.payouts.reduce((total, payout) => total + payout.amount, 0));
      const byService = Object.fromEntries(state.offers.map(offer => [offer.id, round2(payments.filter(tx => tx.offerId === offer.id).reduce((total, tx) => total + tx.amount, 0) + refunds.filter(tx => tx.offerId === offer.id).reduce((total, tx) => total + tx.amount, 0))]));
      return { revenue, refunded, fees, net: round2(revenue - refunded), tutorDue, tutorPaid, kept: round2(revenue - refunded - fees - tutorDue - tutorPaid), byService, failed: state.transactions.filter(tx => tx.status === 'failed').length, pending: state.transactions.filter(tx => tx.status === 'pending').length };
    }
    function stats() {
      const count = status => state.bookings.filter(booking => booking.status === status).length;
      return {
        students: state.users.filter(user => user.role === 'student').length,
        tutorsApproved: state.tutors.filter(tutor => tutor.status === 'approved').length,
        tutorsPending: state.tutors.filter(tutor => tutor.status === 'pending').length,
        bookings: { pending: count('pending'), confirmed: count('confirmed'), completed: count('completed'), cancelled: count('cancelled'), absent: count('absent'), failed: count('failed') },
        reportedReviews: state.reviews.filter(review => review.reported).length,
        newMessages: state.messages.filter(message => message.status === 'nouveau').length,
        openConsultations: state.consultations.filter(item => item.status !== 'clos').length,
        podSubscribers: state.pods.subscribers.length,
        activePackages: state.packages.filter(pack => pack.status === 'active').length,
        revenue: finance().net
      };
    }

    // --- Authentification -----------------------------------------------
    function validateDomain(email, encg) {
      const domain = email.split('@')[1];
      const allowed = state.config.domains[encg] || [];
      assert(allowed.includes(domain), `Domaine non autorisé pour l'ENCG ${encg}. Utilisez votre adresse officielle (${allowed.map(item => `@${item}`).join(', ') || 'aucun domaine configuré'}).`);
    }
    function validateIdentity(input) {
      const email = normalizeEmail(input.email);
      assert(text(input.name, 2, 80), 'Indiquez votre nom et prénom (2 à 80 caractères).');
      assert(EMAIL_RULE.test(email), 'Adresse e-mail invalide.');
      assert(state.encgs.includes(input.encg), 'Choisissez votre ENCG.');
      validateDomain(email, input.encg);
      assert(state.levels.includes(input.level), 'Choisissez votre niveau d\'études.');
      assert(typeof input.password === 'string' && PASSWORD_RULE.test(input.password), 'Mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.');
      assert(input.consent === true, 'Acceptez les conditions d\'utilisation et la politique de confidentialité.');
      assert(!userByEmail(email), 'Un compte existe déjà avec cette adresse. Connectez-vous ou réinitialisez votre mot de passe.');
      return email;
    }
    // Cohérence niveau / filière (trackGroups) ; un niveau hors des cycles connus accepte toutes les filières.
    function checkTrackLevel(level, track) {
      assert(data.tracksFor(level).includes(track), `Filière non proposée au niveau ${level}.`);
    }
    function createUser(role, input, email, extra) {
      const salt = randomHex(16);
      const user = { id: id(role === 'student' ? 'stu' : 'tut'), role, name: input.name.trim(), email, salt, hash: hashPassword(salt, input.password), verified: false, status: 'active', created: stamp(), ...extra };
      state.users.push(user);
      issueCode(user, 'verify');
      return user;
    }
    function validateTutorTeaching(input) {
      const subjects = [...new Set(input.subjects || [])];
      assert(subjects.length > 0 && subjects.every(subjectId => findSubject(subjectId)), 'Choisissez au moins une matière enseignée.');
      const allowedChapters = new Set(subjects.flatMap(subjectId => findSubject(subjectId).chapters.map(chapter => chapter.id)));
      const chapters = [...new Set(input.chapters || [])];
      assert(chapters.length > 0 && chapters.every(chapterId => allowedChapters.has(chapterId)), 'Choisissez au moins un chapitre maîtrisé parmi vos matières.');
      return { subjects, chapters };
    }
    function validateTutorProfile(input) {
      const languages = [...new Set(input.languages || [])];
      const modes = [...new Set(input.modes || [])];
      const services = [...new Set(input.services || [])];
      assert(text(input.bio, 10, 600), 'Présentation : 10 à 600 caractères.');
      assert(languages.length > 0 && languages.every(language => data.constants.languages.includes(language)), 'Choisissez au moins une langue d\'enseignement.');
      assert(modes.length > 0 && modes.every(mode => data.constants.modes.includes(mode)), 'Choisissez au moins un mode de séance.');
      assert(services.length > 0 && services.every(service => findOffer(service)), 'Choisissez au moins un type de séance.');
      const age = input.age === '' || input.age === null || input.age === undefined ? null : Number(input.age);
      assert(age === null || (Number.isInteger(age) && age >= 17 && age <= 80), 'Âge invalide (17 à 80 ans) ou laissez vide.');
      return { bio: input.bio.trim(), languages, modes, services, photoConsent: input.photoConsent === true, showAge: input.showAge === true && age !== null, age };
    }

    const api = {
      KEY,
      get: () => copy(state),
      warning: () => warning,
      now: () => now(),
      refresh: () => refresh(),
      tick: () => { sync(); housekeeping(); if (sessionUser()) transaction(touchSession); },
      reset: confirmed => { assert(confirmed === true, 'Confirmation requise.'); state = data.seed(now()); save(); },
      currentUser: () => { const user = sessionUser(); return user ? copy(user) : null; },
      sign,

      register: input => mutate(() => {
        const email = validateIdentity(input);
        assert(data.constants.tracks.includes(input.track), 'Choisissez votre filière.');
        checkTrackLevel(input.level, input.track);
        createUser('student', input, email, { encg: input.encg, level: input.level, track: input.track });
        return { email };
      }),
      registerTutor: input => mutate(() => {
        const email = validateIdentity(input);
        const teaching = validateTutorTeaching(input);
        const profile = validateTutorProfile(input);
        const user = createUser('tutor', input, email, {});
        state.tutors.push({ id: user.id, name: user.name, encg: input.encg, level: input.level, ...teaching, ...profile, slots: [], prioritySlots: [], blocked: [], photo: '', status: 'pending', created: stamp() });
        return { email };
      }),
      resendCode: email => mutate(() => {
        const user = userByEmail(email);
        if (user && !user.verified) issueCode(user, 'verify');
        return { message: 'Si un compte non vérifié correspond à cette adresse, un nouveau code a été envoyé (5 codes maximum par heure).' };
      }),
      verifyEmail: (email, code) => transaction(() => {
        housekeeping();
        const user = userByEmail(email);
        if (!user || user.verified || !checkCode(user, 'verify', code)) return { ok: false, error: 'Code incorrect ou expiré. Demandez un nouveau code.' };
        user.verified = true;
        mail(user.email, 'welcome', 'Bienvenue sur ONTRACK : compte activé', [`Bonjour ${user.name},`, 'Votre adresse universitaire est vérifiée et votre compte ONTRACK est activé.', user.role === 'tutor' ? 'Votre profil tuteur est maintenant soumis à la validation de l\'administration. Vous serez informé dès sa publication.' : 'Vous pouvez dès maintenant rechercher un tuteur et réserver une séance.', 'Your Study, Our Priority.']);
        if (user.role === 'tutor') notifyAdmins(`Nouveau profil tuteur à valider : ${user.name}.`);
        state.session = { userId: user.id, expires: new Date(time() + policy().sessionHours * HOUR).toISOString(), token: randomHex(16), created: stamp() };
        return { ok: true, role: user.role };
      }),
      login: (email, password) => transaction(() => {
        housekeeping();
        const key = normalizeEmail(email);
        const entry = state.throttle[key] || { failed: 0, lockedUntil: null };
        const lockMessage = until => `Trop de tentatives : connexion bloquée jusqu'à ${new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', timeStyle: 'short' }).format(new Date(until))} (${policy().lockMinutes} min).`;
        if (entry.lockedUntil && Date.parse(entry.lockedUntil) > time()) return { ok: false, locked: true, error: lockMessage(entry.lockedUntil) };
        const user = userByEmail(key);
        if (!user || user.hash !== hashPassword(user.salt, String(password || ''))) {
          entry.failed += 1;
          entry.lockedUntil = null;
          let result = { ok: false, error: 'Adresse e-mail ou mot de passe incorrect.' };
          if (entry.failed >= policy().maxAttempts) {
            entry.failed = 0;
            entry.lockedUntil = new Date(time() + policy().lockMinutes * MINUTE).toISOString();
            result = { ok: false, locked: true, error: lockMessage(entry.lockedUntil) };
          }
          state.throttle[key] = entry;
          if (user) { user.failed = entry.failed; user.lockedUntil = entry.lockedUntil; }
          return result;
        }
        delete state.throttle[key];
        user.failed = 0; user.lockedUntil = null;
        if (!user.verified) return { ok: false, unverified: true, error: 'Adresse non vérifiée : saisissez le code reçu par e-mail.' };
        if (user.status !== 'active') return { ok: false, error: 'Compte suspendu. Contactez l\'assistance ONTRACK.' };
        state.session = { userId: user.id, expires: new Date(time() + policy().sessionHours * HOUR).toISOString(), token: randomHex(16), created: stamp() };
        user.lastLogin = stamp();
        return { ok: true, role: user.role, name: user.name };
      }),
      logout: () => transaction(() => { state.session = null; }),
      requestReset: email => mutate(() => {
        const user = userByEmail(email);
        if (user && user.verified) issueCode(user, 'reset');
        return { message: 'Si un compte correspond à cette adresse, un code de réinitialisation a été envoyé (5 codes maximum par heure).' };
      }),
      confirmReset: (email, code, password) => transaction(() => {
        housekeeping();
        if (typeof password !== 'string' || !PASSWORD_RULE.test(password)) return { ok: false, error: 'Mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.' };
        const user = userByEmail(email);
        if (!user || !checkCode(user, 'reset', code)) return { ok: false, error: 'Code incorrect ou expiré.' };
        user.salt = randomHex(16); user.hash = hashPassword(user.salt, password);
        delete state.throttle[user.email]; user.failed = 0; user.lockedUntil = null;
        user.sessionsRevokedAt = stamp();
        if (state.session && state.session.userId === user.id) state.session = null;
        mail(user.email, 'password-changed', 'Votre mot de passe a été modifié', [`Bonjour ${user.name},`, 'Le mot de passe de votre compte ONTRACK vient d\'être modifié. Toutes les sessions ont été fermées.', 'Si vous n\'êtes pas à l\'origine de cette modification, contactez immédiatement l\'assistance.']);
        return { ok: true };
      }),
      changePassword: (current, next) => mutate(() => {
        const user = me();
        assert(user.hash === hashPassword(user.salt, String(current || '')), 'Mot de passe actuel incorrect.');
        assert(typeof next === 'string' && PASSWORD_RULE.test(next), 'Nouveau mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.');
        user.salt = randomHex(16); user.hash = hashPassword(user.salt, next);
        mail(user.email, 'password-changed', 'Votre mot de passe a été modifié', [`Bonjour ${user.name},`, 'Le mot de passe de votre compte ONTRACK vient d\'être modifié depuis votre espace.']);
      }),
      updateProfile: input => mutate(() => {
        const user = me('student');
        assert(text(input.name, 2, 80), 'Nom invalide.');
        assert(state.levels.includes(input.level) && data.constants.tracks.includes(input.track), 'Niveau ou filière invalide.');
        checkTrackLevel(input.level, input.track);
        user.name = input.name.trim(); user.level = input.level; user.track = input.track;
      }),
      deleteAccount: (password, confirmed) => mutate(() => {
        const user = me('student', 'tutor');
        assert(confirmed === true, 'Confirmation requise.');
        assert(user.hash === hashPassword(user.salt, String(password || '')), 'Mot de passe incorrect : suppression annulée.');
        removeAccount(user);
      }),

      // --- Réservation et paiement --------------------------------------
      createBooking: input => mutate(() => createBookingInternal(me('student'), input || {})),
      retryBooking: bookingId => mutate(() => {
        const student = me('student');
        const previous = findBooking(bookingId);
        assert(previous && previous.studentId === student.id && previous.status === 'failed', 'Nouvel essai impossible pour cette réservation.');
        return createBookingInternal(student, { tutorId: previous.tutorId, offerId: previous.offerId, start: previous.start, need: previous.need, packageId: null, acceptPolicy: true });
      }),
      gateway: (bookingId, scenario) => transaction(() => {
        housekeeping();
        const student = me('student');
        const booking = findBooking(bookingId);
        assert(booking && booking.studentId === student.id, 'Réservation introuvable.');
        assert(booking.status === 'pending', booking.status === 'failed' ? 'Le délai de paiement est dépassé ou le paiement a échoué : faites un nouvel essai.' : 'Cette réservation n\'attend pas de paiement.');
        assert(['accepted', 'refused', 'cancelled'].includes(scenario), 'Scénario de paiement inconnu.');
        const tx = state.transactions.find(item => item.id === booking.transactionId);
        const result = processNotification({ orderId: tx.orderId, status: scenario, amount: tx.amount.toFixed(2), signature: sign(tx.orderId, scenario, tx.amount) });
        touchSession();
        return result;
      }),
      paymentNotification: notification => transaction(() => { housekeeping(); return processNotification(notification); }),
      reschedule: (bookingId, start) => mutate(() => {
        const student = me('student');
        const booking = findBooking(bookingId);
        assert(booking && booking.studentId === student.id && booking.status === 'confirmed' && !booking.simulatedEnded && Date.parse(booking.start) > time(), 'Reprogrammation indisponible.');
        assert(Date.parse(booking.start) - time() >= policy().rescheduleHours * HOUR, `Modification hors délai : possible jusqu'à ${policy().rescheduleHours} h avant le début.`);
        const pack = state.packages.find(item => item.id === booking.packageId);
        assert(!pack || Date.parse(start) + booking.minutes * MINUTE <= Date.parse(pack.expires), 'Créneau hors validité du forfait.');
        available(findTutor(booking.tutorId), start, booking.minutes, { except: booking.id, studentId: student.id, subscriber: isSubscriber(student.id) });
        const previous = booking.start;
        booking.start = start; booking.reminded = false;
        mail(student.email, 'booking-changed', 'Modification de votre réservation', [`Bonjour ${student.name},`, `Votre séance initialement prévue le ${formatDate(previous)} est déplacée.`, `Nouvel horaire : ${sessionLabel(booking)}.`], { bookingId: booking.id });
        notify(booking.tutorId, `Séance déplacée par ${booking.studentName} : ${formatDate(start)}.`);
      }),
      cancel: bookingId => mutate(() => {
        const user = me('student', 'tutor', 'admin');
        const booking = findBooking(bookingId);
        assert(booking, 'Réservation introuvable.');
        if (user.role === 'student') {
          assert(booking.studentId === user.id, 'Réservation introuvable.');
          if (booking.status === 'pending') {
            failPayment(state.transactions.find(item => item.id === booking.transactionId), booking, 'abandonné');
            return 'abandoned';
          }
        }
        if (user.role === 'tutor') assert(booking.tutorId === user.id, 'Réservation introuvable.');
        assert(booking.status === 'confirmed' && !booking.simulatedEnded && Date.parse(booking.start) > time(), 'Annulation possible uniquement avant le début d\'une séance confirmée.');
        if (user.role === 'student') assert(Date.parse(booking.start) - time() >= policy().cancelHours * HOUR, `Annulation hors délai : moins de ${policy().cancelHours} h avant le début. La séance reste due.`);
        return settleCancellation(booking, user.role);
      }),
      simulateEnd: bookingId => mutate(() => {
        const tutor = myTutor();
        const booking = findBooking(bookingId);
        assert(booking && booking.tutorId === tutor.id && booking.status === 'confirmed', 'Séance indisponible.');
        booking.simulatedEnded = true;
      }),
      markAbsent: bookingId => mutate(() => {
        const tutor = myTutor();
        const booking = findBooking(bookingId);
        assert(booking && booking.tutorId === tutor.id && booking.status === 'confirmed' && (booking.simulatedEnded || Date.parse(booking.start) <= time()), 'Absence constatable seulement après l\'heure de début.');
        booking.status = 'absent'; booking.payout = payoutFor(booking);
        const student = findUser(booking.studentId);
        if (student) {
          mail(student.email, 'booking-changed', 'Absence constatée', [`Bonjour ${student.name},`, `Le tuteur a constaté votre absence à la séance ${sessionLabel(booking)}.`, 'Conformément à la politique d\'annulation, la séance reste due (aucun remboursement ni crédit restitué).']);
          notify(student.id, 'Absence constatée : la séance reste due.');
        }
      }),
      complete: (bookingId, report) => mutate(() => {
        const tutor = myTutor();
        const booking = findBooking(bookingId);
        assert(booking && booking.tutorId === tutor.id && booking.status === 'confirmed' && (booking.simulatedEnded || Date.parse(booking.start) + booking.minutes * MINUTE <= time()), 'La séance doit être terminée avant le compte rendu.');
        const input = report || {};
        const subject = findSubject(input.subjectId);
        assert(subject && tutor.subjects.includes(subject.id), 'Choisissez la matière étudiée.');
        const chapters = Array.isArray(input.chapters) ? input.chapters : [];
        assert(chapters.length > 0 && new Set(chapters.map(item => item.id)).size === chapters.length && chapters.every(item => subject.chapters.some(chapter => chapter.id === item.id) && CHAPTER_STATUSES.includes(item.status)), 'Indiquez au moins un chapitre étudié et son statut.');
        for (const key of ['notions', 'exercises', 'difficulties', 'toReview', 'recommendations']) assert(text(input[key], 3, 1000), 'Renseignez les six rubriques du compte rendu (3 à 1000 caractères chacune).');
        booking.report = { subjectId: subject.id, chapters: chapters.map(item => ({ id: item.id, status: item.status })), notions: input.notions.trim(), exercises: input.exercises.trim(), difficulties: input.difficulties.trim(), toReview: input.toReview.trim(), recommendations: input.recommendations.trim(), created: stamp() };
        booking.status = 'completed'; booking.payout = payoutFor(booking);
        const student = findUser(booking.studentId);
        if (student) {
          mail(student.email, 'report-available', 'Votre récapitulatif de séance est disponible', [`Bonjour ${student.name},`, `${tutor.name} a publié le récapitulatif de votre séance ${booking.offerName} (${subject.name}).`, `Chapitres : ${booking.report.chapters.map(item => chapterName(item.id)).join(', ')}.`, 'Retrouvez-le dans Mon espace > Comptes rendus ; votre progression a été mise à jour.'], { bookingId: booking.id });
          notify(student.id, `Compte rendu disponible : ${subject.name}.`);
        }
      }),
      review: (bookingId, rating, reviewText) => mutate(() => {
        const student = me('student');
        const booking = findBooking(bookingId);
        assert(booking && booking.studentId === student.id && booking.status === 'completed' && !state.reviews.some(item => item.bookingId === bookingId), 'Un avis unique est réservé au participant après la séance.');
        assert(Number.isInteger(rating) && rating >= 1 && rating <= 5 && text(reviewText, 3, 500), 'Avis invalide : note de 1 à 5 et commentaire de 3 à 500 caractères.');
        state.reviews.push({ id: id('rev'), bookingId, tutorId: booking.tutorId, studentId: student.id, rating, text: reviewText.trim(), created: stamp(), reported: false, reportReason: '', hidden: false });
        notify(booking.tutorId, `Nouvel avis reçu : ${rating} / 5.`);
      }),
      reportReview: (reviewId, reason) => mutate(() => {
        const tutor = myTutor();
        const review = state.reviews.find(item => item.id === reviewId);
        assert(review && review.tutorId === tutor.id, 'Avis introuvable.');
        assert(text(reason, 3, 300), 'Précisez le motif du signalement (3 à 300 caractères).');
        assert(!review.reported, 'Avis déjà signalé.');
        review.reported = true; review.reportReason = reason.trim(); review.reportedAt = stamp();
        notifyAdmins(`Avis signalé par ${tutor.name} : à modérer.`);
      }),
      terminatePackage: packageId => mutate(() => {
        const student = me('student');
        const pack = state.packages.find(item => item.id === packageId && item.studentId === student.id);
        assert(pack && pack.status === 'active' && Date.parse(pack.expires) > time(), 'Forfait non résiliable.');
        const unused = pack.remaining;
        const refunded = closePack(pack, policy().terminationRefund, 'Résiliation du forfait');
        mail(student.email, 'package-info', `Résiliation de votre forfait ${pack.name}`, [`Bonjour ${student.name},`, `Votre forfait ${pack.name} est résilié. Séances déjà planifiées : maintenues.`, refunded ? `${unused} séance(s) non planifiée(s) remboursée(s) : ${formatMoney(refunded)} (simulation).` : 'Aucune séance non planifiée à rembourser.']);
        return { refunded };
      }),

      // --- Lectures ------------------------------------------------------
      tutorRating, progress, matchTutors, freeSlots, recommendations, payoutSummary, finance, stats,
      isSubscriber: studentId => isSubscriber(studentId),
      checkSlot: (tutorId, start, offerId) => slotIssue(findTutor(tutorId), start, findOffer(offerId)?.minutes || 30, { studentId: sessionUser()?.id, subscriber: offerId === 'stay' || isSubscriber(sessionUser()?.id) }),

      // --- Espace tuteur -------------------------------------------------
      updateTutorProfile: input => mutate(() => {
        const tutor = myTutor(true);
        const profile = validateTutorProfile(input || {});
        // Un niveau hors liste déjà attribué (ex. « Professeure ») peut être conservé, pas choisi.
        assert(state.levels.includes(input.level) || input.level === tutor.level, 'Niveau d\'études invalide.');
        Object.assign(tutor, profile, { level: input.level });
      }),
      updateTutorSubjects: input => mutate(() => {
        const tutor = myTutor(true);
        const teaching = validateTutorTeaching(input || {});
        const newSubjects = teaching.subjects.filter(subjectId => !tutor.subjects.includes(subjectId));
        const removed = tutor.subjects.filter(subjectId => !teaching.subjects.includes(subjectId));
        assert(!state.bookings.some(booking => booking.tutorId === tutor.id && removed.includes(booking.need.subjectId) && (booking.status === 'confirmed' || (booking.status === 'pending' && blocking(booking)))), 'Des séances en attente ou confirmées concernent cette matière : elle ne peut pas être retirée.');
        Object.assign(tutor, teaching);
        if (newSubjects.length && tutor.status === 'approved') {
          tutor.status = 'pending';
          notifyAdmins(`${tutor.name} a ajouté une matière : profil à revalider.`);
          return { revalidation: true };
        }
        return { revalidation: false };
      }),
      addSlot: (start, options) => mutate(() => {
        const tutor = myTutor(true);
        assert(typeof start === 'string' && Number.isFinite(Date.parse(start)) && Date.parse(start) > time(), 'Disponibilité invalide ou passée.');
        const calendar = /^(\d{4})-(\d{2})-(\d{2})T/.exec(start);
        assert(calendar && Number(calendar[2]) >= 1 && Number(calendar[2]) <= 12 && new Date(Date.UTC(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3]))).getUTCDate() === Number(calendar[3]), 'Date du calendrier invalide.');
        const iso = new Date(start).toISOString();
        assert(!tutor.slots.includes(iso), 'Créneau déjà proposé.');
        tutor.slots.push(iso); tutor.slots.sort();
        if (options && options.priority) tutor.prioritySlots.push(iso);
        return iso;
      }),
      addRecurringSlots: (day, hour, minute, weeks, priority) => mutate(() => {
        const tutor = myTutor(true);
        assert(/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isInteger(hour) && hour >= 7 && hour <= 22 && [0, 30].includes(minute) && Number.isInteger(weeks) && weeks >= 1 && weeks <= 8, 'Récurrence invalide (1 à 8 semaines, de 7 h à 22 h).');
        const added = [];
        for (let week = 0; week < weeks; week += 1) {
          const base = Date.parse(`${day}T12:00:00Z`) + week * 7 * 86400000;
          const iso = data.moroccoInstant(new Date(base).toISOString().slice(0, 10), hour, minute);
          if (Date.parse(iso) <= time() || tutor.slots.includes(iso)) continue;
          tutor.slots.push(iso); added.push(iso);
          if (priority) tutor.prioritySlots.push(iso);
        }
        assert(added.length, 'Aucun nouveau créneau futur à ajouter.');
        tutor.slots.sort();
        return added;
      }),
      removeSlot: start => mutate(() => {
        const tutor = myTutor(true);
        assert(!state.bookings.some(booking => booking.tutorId === tutor.id && booking.start === start && blocking(booking)), 'Créneau réservé : il ne peut pas être retiré.');
        tutor.slots = tutor.slots.filter(slot => slot !== start);
        tutor.prioritySlots = tutor.prioritySlots.filter(slot => slot !== start);
      }),
      togglePriority: start => mutate(() => {
        const tutor = myTutor(true);
        assert(tutor.slots.includes(start), 'Créneau introuvable.');
        tutor.prioritySlots = tutor.prioritySlots.includes(start) ? tutor.prioritySlots.filter(slot => slot !== start) : [...tutor.prioritySlots, start];
      }),
      addBlocked: (start, end, reason) => mutate(() => {
        const tutor = myTutor(true);
        const begin = Date.parse(start);
        const finish = Date.parse(end);
        assert(Number.isFinite(begin) && Number.isFinite(finish) && finish > begin && finish > time() && finish - begin <= 60 * 86400000, 'Période d\'indisponibilité invalide (60 jours maximum).');
        assert(!state.bookings.some(booking => booking.tutorId === tutor.id && ['pending', 'confirmed'].includes(booking.status) && blocking(booking) && Date.parse(booking.start) < finish && begin < Date.parse(booking.start) + booking.minutes * MINUTE), 'Une réservation existe sur cette période : annulez-la avant de bloquer.');
        assert(reason === undefined || reason === '' || text(reason, 1, 120), 'Motif trop long.');
        tutor.blocked.push({ id: id('blk'), start: new Date(begin).toISOString(), end: new Date(finish).toISOString(), reason: (reason || '').trim() });
      }),
      removeBlocked: blockedId => mutate(() => {
        const tutor = myTutor(true);
        tutor.blocked = tutor.blocked.filter(period => period.id !== blockedId);
      }),

      // --- Orientation, Study Pods, contact -------------------------------
      saveOrientationProfile: input => mutate(() => {
        const student = me('student');
        const average = Number(input.average);
        assert(state.encgs.includes(input.encg) && state.levels.includes(input.level) && data.constants.tracks.includes(input.track), 'ENCG, niveau ou filière invalide.');
        checkTrackLevel(input.level, input.track);
        assert(Number.isFinite(average) && average >= 0 && average <= 20, 'Moyenne sur 20 invalide.');
        assert(typeof input.validated === 'string' && input.validated.length <= 300, 'Matières et semestres validés : 300 caractères maximum.');
        const languages = (input.languages || []).filter(item => item && item.language);
        assert(languages.length > 0 && languages.every(item => data.constants.languages.includes(item.language) && data.constants.cefr.includes(item.level)), 'Indiquez au moins une langue maîtrisée et son niveau.');
        const countries = [...new Set(input.countries || [])];
        assert(['Indifférent', ...data.constants.mobilities].includes(input.programType), 'Type de programme invalide.');
        const profile = { studentId: student.id, encg: input.encg, level: input.level, track: input.track, average: round2(average), validated: input.validated.trim(), languages, countries, programType: input.programType, updated: stamp() };
        state.orientationProfiles = state.orientationProfiles.filter(item => item.studentId !== student.id).concat(profile);
      }),
      requestConsultation: input => mutate(() => {
        const student = me('student');
        assert(state.orientationProfiles.some(item => item.studentId === student.id), 'Complétez d\'abord votre profil d\'orientation.');
        const programIds = [...new Set(input.programIds || [])];
        assert(programIds.every(programId => state.programs.some(program => program.id === programId)), 'Programme inconnu.');
        assert(text(input.topic, 10, 600), 'Décrivez votre demande (10 à 600 caractères).');
        assert(typeof input.availability === 'string' && input.availability.length <= 120, 'Disponibilités : 120 caractères maximum.');
        const request = { id: id('cons'), studentId: student.id, studentName: student.name, programIds, topic: input.topic.trim(), availability: input.availability.trim(), status: 'demandé', note: '', created: stamp() };
        state.consultations.push(request);
        mail(student.email, 'orientation-confirmed', 'Demande d\'entretien d\'orientation reçue', [`Bonjour ${student.name},`, 'Votre demande d\'entretien d\'orientation a bien été enregistrée. Un conseiller autorisé vous proposera un créneau.', `Programmes concernés : ${programIds.map(programId => state.programs.find(program => program.id === programId).name).join(', ') || 'non précisés'}.`, 'Rappel : les recommandations ONTRACK ne garantissent jamais une admission.']);
        notifyAdmins(`Nouvelle demande d'orientation : ${student.name}.`);
        return request;
      }),
      subscribePods: (email, city) => mutate(() => {
        const address = normalizeEmail(email);
        assert(EMAIL_RULE.test(address), 'Adresse e-mail invalide.');
        assert(city === '' || state.encgs.includes(city), 'Ville invalide.');
        if (!state.pods.subscribers.some(item => item.email === address)) {
          state.pods.subscribers.push({ email: address, city, created: stamp() });
          mail(address, 'pods-news', 'Inscription aux actualités Study Pods', ['Bonjour,', 'Vous recevrez les actualités du lancement des ONTRACK Study Pods. Aucune réservation n\'est possible avant l\'ouverture effective des espaces.', 'Désinscription possible à tout moment depuis la page Contact.']);
        }
      }),
      message: input => mutate(() => {
        const value = input || {};
        assert(text(value.name, 2, 80) && text(value.text, 5, 1000), 'Message invalide : nom et message (5 à 1000 caractères) requis.');
        assert(!value.email || EMAIL_RULE.test(normalizeEmail(value.email)), 'Adresse e-mail invalide.');
        const user = sessionUser();
        state.messages.push({ id: id('msg'), name: value.name.trim(), email: normalizeEmail(value.email || user?.email || ''), subject: String(value.subject || 'Assistance').slice(0, 80), text: value.text.trim(), created: stamp(), status: 'nouveau', userId: user ? user.id : null });
        notifyAdmins(`Nouveau message de contact : ${value.name.trim()}.`);
      }),
      markNotificationsRead: () => mutate(() => { const user = me(); for (const item of state.notifications) if (item.userId === user.id) item.read = true; }),
      markEmailRead: emailId => transaction(() => { const email = state.emails.find(item => item.id === emailId); if (email) email.read = true; }),

      // --- Discussions entre étudiants (simulées, sans serveur) ---------------
      chatPost: input => mutate(() => {
        const user = me('student');
        const value = input || {};
        const body = typeof value.text === 'string' ? value.text.trim() : '';
        assert(body.length >= 1 && body.length <= CHAT_MAX, 'Message : 1 à 500 caractères.');
        const { room, thread } = conversation(user, value.roomId, value.threadId);
        const message = chatMessage({ roomId: room ? room.id : null, threadId: thread ? thread.id : null, text: body }, user);
        state.chat.messages.push(message);
        const otherId = thread ? thread.members.find(member => member !== user.id) : null;
        if (otherId && findUser(otherId)) notify(otherId, `${PRIVATE_NOTICE}${user.name}.`);
        const persona = room ? roomPersona(room) : findPersona(otherId);
        const waiting = state.chat.pending.some(item => (room ? item.roomId === room.id : item.threadId === thread.id));
        if (persona && !waiting) state.chat.pending.push({ id: id('cp'), due: new Date(time() + 2000 + parseInt(randomHex(2), 16) % 4001).toISOString(), roomId: message.roomId, threadId: message.threadId, personaId: persona.id, text: personaReply(body, user, Boolean(room)), forUserId: user.id });
        return { message, warning: CONTACT_RULE.test(body) ? 'Message publié, mais il semble contenir une adresse e-mail ou un numéro de téléphone : n\'échangez pas de coordonnées.' : '' };
      }),
      chatStartThread: otherId => mutate(() => {
        const user = me('student');
        assert(otherId !== user.id, 'Vous ne pouvez pas vous écrire à vous-même.');
        const other = findPersona(otherId) || state.users.find(item => item.id === otherId && item.role === 'student' && item.verified && item.status === 'active');
        assert(other, 'Destinataire introuvable.');
        let thread = state.chat.threads.find(item => item.members.includes(user.id) && item.members.includes(otherId));
        if (!thread) { thread = { id: id('th'), members: [user.id, otherId], created: stamp() }; state.chat.threads.push(thread); }
        return thread;
      }),
      chatReport: (messageId, reason) => mutate(() => {
        const user = me('student');
        const message = state.chat.messages.find(item => item.id === messageId);
        assert(message && canSee(user, message), 'Message introuvable.');
        assert(message.fromId !== user.id, 'Vous ne pouvez pas signaler votre propre message.');
        assert(text(reason, 3, 300), 'Précisez le motif du signalement (3 à 300 caractères).');
        assert(!message.reported, 'Message déjà signalé.');
        Object.assign(message, { reported: true, reportReason: reason.trim(), reportedBy: user.id, reportedAt: stamp() });
        notifyAdmins('Message signalé dans les discussions : à modérer.');
      }),
      // Vue d'un étudiant : salons, ses fils privés, contacts et messages de la discussion ouverte.
      chatView: conversationId => {
        const user = me('student');
        const chat = state.chat;
        const lastAt = (filter, fallback) => { const list = chat.messages.filter(filter); return list.length ? list[list.length - 1].created : fallback; };
        const rooms = chat.rooms.map(room => ({ id: room.id, name: room.name, kind: room.kind, mine: room.kind === 'track' && room.track === user.track, count: chat.messages.filter(message => message.roomId === room.id).length })).sort((first, second) => Number(second.mine) - Number(first.mine));
        const threads = chat.threads.filter(thread => thread.members.includes(user.id)).map(thread => {
          const otherId = thread.members.find(member => member !== user.id);
          return { id: thread.id, otherId, name: chatName(otherId), persona: Boolean(findPersona(otherId)), last: lastAt(message => message.threadId === thread.id, thread.created) };
        }).sort((first, second) => Date.parse(second.last) - Date.parse(first.last));
        const contacts = [...chat.personas.map(persona => ({ id: persona.id, name: persona.name, encg: persona.encg, track: persona.track, persona: true })), ...state.users.filter(item => item.role === 'student' && item.id !== user.id && item.verified && item.status === 'active').map(item => ({ id: item.id, name: item.name, encg: item.encg, track: item.track, persona: false }))];
        const thread = threads.find(item => item.id === conversationId) || null;
        const room = thread ? null : rooms.find(item => item.id === conversationId) || rooms.find(item => item.mine) || rooms[0] || null;
        const current = thread ? { kind: 'thread', id: thread.id, name: thread.name, persona: thread.persona } : room ? { kind: 'room', id: room.id, name: room.name, persona: false } : null;
        const inCurrent = item => current && (thread ? item.threadId === thread.id : item.roomId === room.id);
        const messages = chat.messages.filter(inCurrent).map(message => ({ id: message.id, fromName: message.fromName, deleted: message.fromId === null, persona: Boolean(findPersona(message.fromId)), mine: message.fromId === user.id, hidden: message.hidden, text: message.hidden ? 'Message masqué par la modération' : message.text, created: message.created, canReport: message.fromId !== user.id && !message.reported && !message.hidden, reportedByMe: message.reported && message.reportedBy === user.id }));
        const waiting = chat.pending.filter(inCurrent).map(item => chatName(item.personaId));
        return copy({ rooms, threads, contacts, current, messages, waiting, expecting: chat.pending.some(item => item.forUserId === user.id) });
      },
      // Modération : l'administration ne voit que les messages signalés.
      chatReported: () => {
        me('admin');
        return copy(state.chat.messages.filter(message => message.reported).map(message => {
          const room = message.roomId ? state.chat.rooms.find(item => item.id === message.roomId) : null;
          return { id: message.id, place: room ? room.name : null, fromName: message.fromName, text: message.text, created: message.created, reason: message.reportReason, reportedBy: message.reportedBy ? chatName(message.reportedBy) : 'Compte supprimé', reportedAt: message.reportedAt || message.created, hidden: message.hidden };
        }).reverse());
      },
      chatHide: (messageId, hidden) => mutate(() => {
        me('admin');
        const message = state.chat.messages.find(item => item.id === messageId);
        assert(message && message.reported && typeof hidden === 'boolean', 'Message introuvable.');
        message.hidden = hidden; message.moderatedAt = stamp();
      }),

      // --- Administration ------------------------------------------------
      setUserStatus: (userId, status) => mutate(() => {
        const admin = me('admin');
        const user = findUser(userId);
        assert(user && user.id !== admin.id && user.role !== 'admin' && ['active', 'suspended'].includes(status), 'Compte introuvable ou non modifiable.');
        user.status = status;
      }),
      unlockUser: userId => mutate(() => {
        me('admin');
        const user = findUser(userId);
        assert(user, 'Compte introuvable.');
        delete state.throttle[user.email]; user.failed = 0; user.lockedUntil = null;
      }),
      adminDeleteUser: userId => mutate(() => {
        const admin = me('admin');
        const user = findUser(userId);
        assert(user && user.id !== admin.id && user.role !== 'admin', 'Compte non supprimable.');
        removeAccount(user);
      }),
      setTutorStatus: (tutorId, status) => mutate(() => {
        me('admin');
        const tutor = findTutor(tutorId);
        const user = findUser(tutorId);
        assert(tutor && tutor.status !== 'deleted' && ['approved', 'suspended', 'pending'].includes(status), 'Tuteur introuvable.');
        if (status === 'approved') assert(user && user.verified, 'Adresse e-mail du tuteur non vérifiée : validation impossible.');
        tutor.status = status;
        if (status === 'approved' && user) {
          mail(user.email, 'tutor-approved', 'Votre profil tuteur est publié', [`Bonjour ${user.name},`, 'L\'administration ONTRACK a validé votre profil. Il apparaît désormais dans le catalogue et vos créneaux sont réservables.', state.config.payout.phase === 'volunteer' ? 'Rappel : pendant la phase pilote, la participation est volontaire et ne garantit aucune rémunération future.' : 'Vos séances terminées donnent lieu à rémunération selon la grille en vigueur.']);
          notify(user.id, 'Profil validé et publié dans le catalogue.');
        } else if (user) notify(user.id, status === 'suspended' ? 'Profil suspendu par l\'administration.' : 'Profil repassé en attente de validation.');
      }),
      setDomains: (encg, domains) => mutate(() => {
        me('admin');
        assert(state.encgs.includes(encg), 'ENCG inconnue.');
        const list = [...new Set((domains || []).map(item => String(item).trim().toLowerCase().replace(/^@/, '')).filter(Boolean))];
        assert(list.length > 0 && list.length <= 5 && list.every(domain => DOMAIN_RULE.test(domain) && domain.length <= 80), 'Indiquez 1 à 5 domaines valides (ex. etu.encg-ville.demo).');
        state.config.domains[encg] = list;
      }),
      saveSubject: input => mutate(() => {
        me('admin');
        assert(text(input.name, 2, 80) && state.levels.includes(input.level), 'Nom de matière (2 à 80 caractères) et niveau requis.');
        if (input.id) {
          const subject = findSubject(input.id); assert(subject, 'Matière introuvable.');
          subject.name = input.name.trim(); subject.level = input.level; return subject.id;
        }
        assert(!state.subjects.some(subject => subject.name.toLowerCase() === input.name.trim().toLowerCase()), 'Cette matière existe déjà.');
        const subject = { id: id('sub'), name: input.name.trim(), level: input.level, chapters: [] };
        state.subjects.push(subject);
        return subject.id;
      }),
      removeSubject: subjectId => mutate(() => {
        me('admin');
        const used = state.tutors.some(tutor => tutor.subjects.includes(subjectId)) || state.bookings.some(booking => booking.need.subjectId === subjectId);
        assert(!used, 'Matière utilisée par un tuteur ou une réservation : renommez-la plutôt.');
        state.subjects = state.subjects.filter(subject => subject.id !== subjectId);
      }),
      saveChapter: (subjectId, chapterId, name) => mutate(() => {
        me('admin');
        const subject = findSubject(subjectId);
        assert(subject && text(name, 2, 80), 'Nom de chapitre requis (2 à 80 caractères).');
        if (chapterId) { const chapter = subject.chapters.find(item => item.id === chapterId); assert(chapter, 'Chapitre introuvable.'); chapter.name = name.trim(); return chapter.id; }
        assert(subject.chapters.length < 20, '20 chapitres maximum par matière.');
        const chapter = { id: id('chap'), name: name.trim() };
        subject.chapters.push(chapter);
        return chapter.id;
      }),
      removeChapter: (subjectId, chapterId) => mutate(() => {
        me('admin');
        const subject = findSubject(subjectId);
        assert(subject, 'Matière introuvable.');
        const used = state.tutors.some(tutor => tutor.chapters.includes(chapterId)) || state.bookings.some(booking => booking.need.chapterId === chapterId || (booking.report && booking.report.chapters.some(item => item.id === chapterId)));
        assert(!used, 'Chapitre utilisé (tuteur, réservation ou compte rendu) : renommez-le plutôt pour conserver l\'historique.');
        subject.chapters = subject.chapters.filter(chapter => chapter.id !== chapterId);
      }),
      setLevels: levels => mutate(() => {
        me('admin');
        const list = [...new Set((levels || []).map(item => String(item).trim()).filter(Boolean))];
        assert(list.length > 0 && list.length <= 15 && list.every(level => level.length <= 12), 'Indiquez 1 à 15 niveaux.');
        const used = new Set([...state.users.map(user => user.level), ...state.tutors.map(tutor => tutor.level), ...state.subjects.map(subject => subject.level), ...state.programs.map(program => program.level), ...state.orientationProfiles.map(profile => profile.level), ...state.bookings.map(booking => booking.need && booking.need.level)].filter(Boolean));
        // Seuls les niveaux de la liste actuelle sont protégés : un niveau libre (ex. « Professeure ») n'y figure pas.
        assert([...used].every(level => list.includes(level) || !state.levels.includes(level)), 'Un niveau utilisé par un compte, une matière ou un programme ne peut pas être retiré.');
        state.levels = list;
      }),
      setOffer: (offerId, input) => mutate(() => {
        me('admin');
        const offer = findOffer(offerId);
        const price = Number(input.price);
        assert(offer && Number.isFinite(price) && price >= 10 && price <= 5000, 'Tarif invalide : entre 10 et 5 000 DH (politique commerciale).');
        offer.price = round2(price);
        if (offer.id === 'exam' && input.days !== undefined) {
          const days = Number(input.days);
          assert(Number.isInteger(days) && days >= 1 && days <= 60, 'Validité invalide (1 à 60 jours).');
          offer.days = days;
        }
      }),
      setPolicy: input => mutate(() => {
        me('admin');
        const bounds = { cancelHours: [0, 168], rescheduleHours: [0, 168], holdMinutes: [5, 60], reminderHours: [1, 72], priorityHours: [0, 168] };
        for (const [key, [min, max]] of Object.entries(bounds)) {
          const value = Number(input[key]);
          assert(Number.isInteger(value) && value >= min && value <= max, `Valeur invalide pour ${key} (${min} à ${max}).`);
          state.config.policy[key] = value;
        }
        state.config.policy.terminationRefund = input.terminationRefund === true;
      }),
      setPayout: input => mutate(() => {
        me('admin');
        assert(['volunteer', 'paid'].includes(input.phase), 'Phase inconnue.');
        const rates = {};
        for (const offer of state.offers) {
          const value = Number(input.rates?.[offer.id]);
          assert(Number.isFinite(value) && value >= 0 && value <= 1000, 'Grille de rémunération invalide.');
          rates[offer.id] = round2(value);
        }
        state.config.payout = { phase: input.phase, rates };
      }),
      setPaymentConfig: input => mutate(() => {
        me('admin');
        const feeRate = Number(input.feeRate);
        assert(['CMI', 'Payzone'].includes(input.provider) && Number.isFinite(feeRate) && feeRate >= 0 && feeRate <= 0.1, 'Prestataire ou taux de frais invalide (0 à 10 %).');
        state.config.provider = input.provider; state.config.feeRate = feeRate;
      }),
      adminRefund: bookingId => mutate(() => {
        me('admin');
        const booking = findBooking(bookingId);
        assert(booking && booking.status === 'confirmed' && !booking.simulatedEnded && Date.parse(booking.start) > time(), 'Seule une séance confirmée et future peut être annulée.');
        return settleCancellation(booking, 'admin');
      }),
      recordPayout: tutorId => mutate(() => {
        me('admin');
        const bookings = state.bookings.filter(booking => booking.tutorId === tutorId && booking.payout && !booking.payout.payoutId && booking.payout.amount > 0 && ['completed', 'absent'].includes(booking.status));
        const amount = round2(bookings.reduce((total, booking) => total + booking.payout.amount, 0));
        assert(amount > 0, 'Aucune somme due à verser pour ce tuteur.');
        const payout = { id: id('pay'), tutorId, amount, bookingIds: bookings.map(booking => booking.id), created: stamp(), reference: `VIR-SIM-${String(state.payouts.length + 1).padStart(4, '0')}` };
        state.payouts.push(payout);
        for (const booking of bookings) booking.payout.payoutId = payout.id;
        notify(tutorId, `Versement enregistré : ${formatMoney(amount)} (${payout.reference}, simulation).`);
        return payout;
      }),
      moderate: (reviewId, action) => mutate(() => {
        me('admin');
        const review = state.reviews.find(item => item.id === reviewId);
        assert(review && ['hide', 'keep', 'restore'].includes(action), 'Avis introuvable.');
        if (action === 'hide') { review.hidden = true; review.reported = false; review.resolution = 'masqué'; }
        if (action === 'keep') { review.reported = false; review.resolution = 'signalement rejeté'; }
        if (action === 'restore') { review.hidden = false; review.resolution = 'rétabli'; }
      }),
      saveProgram: input => mutate(() => {
        me('admin');
        const value = input || {};
        // Champs facultatifs : vides = non communiqués (null), affichés « à confirmer auprès de l'ENCG ».
        const blank = item => item === undefined || item === null || String(item).trim() === '';
        const minGrade = blank(value.minGrade) ? null : Number(value.minGrade);
        const tracks = [...new Set(value.tracks || [])];
        const documents = (value.documents || []).map(item => String(item).trim()).filter(Boolean);
        const source = typeof value.source === 'string' ? value.source.trim() : '';
        const seats = (Array.isArray(value.seats) ? value.seats : []).map(seat => ({ label: typeof seat?.label === 'string' ? seat.label.trim() : '', count: seat?.count }));
        assert(text(value.name, 3, 120) && text(value.institution, 3, 120) && text(value.country, 2, 60), 'Nom, établissement et pays requis.');
        assert(blank(value.city) || text(value.city, 2, 60), 'Ville : 2 à 60 caractères ou laissez vide.');
        assert((blank(value.mobility) || data.constants.mobilities.includes(value.mobility)) && (blank(value.level) || state.levels.includes(value.level)), 'Type de mobilité ou niveau invalide.');
        assert(tracks.every(track => data.constants.tracks.includes(track)), 'Filière inconnue.');
        assert(minGrade === null || (Number.isFinite(minGrade) && minGrade >= 0 && minGrade <= 20), 'Moyenne minimale invalide.');
        assert(blank(value.language) || (data.constants.languages.includes(value.language) && data.constants.cefr.includes(value.languageLevel)), 'Exigence linguistique invalide.');
        assert(blank(value.deadline) || validDay(value.deadline), 'Date limite invalide.');
        assert(validSeats(seats), 'Places : une ligne « libellé : nombre » par liste, avec un nombre entier positif ou nul.');
        assert(blank(value.sourceNote) || text(value.sourceNote, 1, 200), 'Note de source : 200 caractères maximum.');
        assert(source.length <= 200 && SOURCE_RULE.test(source), 'Site officiel : lien https:// valide requis.');
        const fields = { name: value.name.trim(), institution: value.institution.trim(), country: value.country.trim(), city: blank(value.city) ? null : value.city.trim(), mobility: blank(value.mobility) ? null : value.mobility, seats, level: blank(value.level) ? null : value.level, tracks, minGrade: minGrade === null ? null : round2(minGrade), languageReq: blank(value.language) ? null : { language: value.language, level: value.languageLevel }, deadline: blank(value.deadline) ? null : value.deadline, documents, source, sourceNote: blank(value.sourceNote) ? '' : value.sourceNote.trim(), active: value.active === true };
        if (value.id) { const program = state.programs.find(item => item.id === value.id); assert(program, 'Programme introuvable.'); Object.assign(program, fields); return program.id; }
        const program = { id: id('prog'), ...fields };
        state.programs.push(program);
        return program.id;
      }),
      updateConsultation: (consultationId, status, note) => mutate(() => {
        me('admin');
        const request = state.consultations.find(item => item.id === consultationId);
        assert(request && ['demandé', 'planifié', 'clos'].includes(status) && typeof note === 'string' && note.length <= 300, 'Demande introuvable ou statut invalide.');
        request.status = status; request.note = note.trim();
        notify(request.studentId, `Entretien d'orientation : ${status}${request.note ? ` — ${request.note}` : ''}.`);
      }),
      savePodLocation: input => mutate(() => {
        me('admin');
        const value = input || {};
        const capacity = Number(value.capacity);
        assert(text(value.name, 2, 60) && state.encgs.includes(value.city) && text(value.address, 3, 120) && Number.isInteger(capacity) && capacity >= 1 && capacity <= 20 && ['en étude', 'en préparation'].includes(value.status), 'Lieu invalide (statuts autorisés : en étude, en préparation).');
        const fields = { name: value.name.trim(), city: value.city, address: value.address.trim(), capacity, status: value.status };
        if (value.id) { const location = state.pods.locations.find(item => item.id === value.id); assert(location, 'Lieu introuvable.'); Object.assign(location, fields); return location.id; }
        const location = { id: id('pod'), ...fields };
        state.pods.locations.push(location);
        return location.id;
      }),
      podPrototypeCreate: (locationId, start) => mutate(() => {
        me('admin');
        assert(state.pods.locations.some(location => location.id === locationId), 'Lieu introuvable.');
        assert(Number.isFinite(Date.parse(start)) && Date.parse(start) > time(), 'Horaire de test invalide.');
        const token = randomHex(16);
        const entry = { id: id('qr'), locationId, start: new Date(start).toISOString(), token, tokenHash: sha256(token), used: false, checkedInAt: null, created: stamp() };
        state.pods.prototype.push(entry);
        return entry;
      }),
      podCheckIn: token => mutate(() => {
        me('admin');
        const entry = state.pods.prototype.find(item => item.tokenHash === sha256(String(token || '').trim()));
        assert(entry, 'QR code inconnu : accès refusé.');
        assert(!entry.used, 'QR code déjà utilisé : réutilisation refusée.');
        assert(time() >= Date.parse(entry.start) - 30 * MINUTE, 'QR code pas encore valide : accès possible 30 minutes avant le créneau.');
        assert(time() <= Date.parse(entry.start) + 2 * HOUR, 'QR code expiré.');
        entry.used = true; entry.checkedInAt = stamp();
        return entry;
      }),
      setMessageStatus: (messageId, status) => mutate(() => {
        me('admin');
        const message = state.messages.find(item => item.id === messageId);
        assert(message && ['nouveau', 'traité'].includes(status), 'Message introuvable.');
        message.status = status;
      }),
      // Les discussions privées ne figurent pas dans la sauvegarde : l'administration ne voit que les messages signalés.
      exportData: () => {
        me('admin');
        const snapshot = copy(state);
        snapshot.chat.threads = [];
        snapshot.chat.messages = snapshot.chat.messages.filter(message => !message.threadId);
        snapshot.chat.pending = snapshot.chat.pending.filter(item => !item.threadId);
        snapshot.notifications = snapshot.notifications.filter(item => !item.text.startsWith(PRIVATE_NOTICE));
        return JSON.stringify(snapshot, null, 2);
      },
      importData: (json, confirmed) => mutate(() => {
        const admin = me('admin');
        assert(confirmed === true, 'Confirmation requise.');
        let parsed;
        try { parsed = JSON.parse(json); } catch (error) { throw new Error('Fichier de sauvegarde illisible (JSON invalide).'); }
        valid(migrate(parsed));
        // Les discussions privées en cours, absentes de la sauvegarde, sont conservées si leurs membres existent encore.
        const people = new Set([...parsed.users.map(user => user.id), ...parsed.chat.personas.map(persona => persona.id)]);
        const kept = state.chat.threads.filter(thread => thread.members.every(member => people.has(member)) && !parsed.chat.threads.some(item => item.id === thread.id));
        const keptIds = new Set(kept.map(thread => thread.id));
        parsed.chat.threads.push(...kept);
        parsed.chat.messages.push(...state.chat.messages.filter(message => keptIds.has(message.threadId)));
        parsed.chat.pending.push(...state.chat.pending.filter(item => keptIds.has(item.threadId) && parsed.chat.personas.some(persona => persona.id === item.personaId)));
        const userIds = new Set(parsed.users.map(user => user.id));
        parsed.notifications.push(...state.notifications.filter(item => item.text.startsWith(PRIVATE_NOTICE) && userIds.has(item.userId) && !parsed.notifications.some(other => other.id === item.id)));
        parsed.session = parsed.users.some(user => user.id === admin.id && user.role === 'admin') ? state.session : null;
        state = parsed;
      })
    };

    function createBookingInternal(student, input) {
      const offer = findOffer(input.offerId);
      assert(offer, 'Service inconnu.');
      const tutor = findTutor(input.tutorId);
      assert(tutor && tutor.status === 'approved', 'Tuteur non validé.');
      const need = input.need || {};
      const subject = findSubject(need.subjectId);
      assert(subject, 'Choisissez une matière.');
      assert(subject.chapters.some(chapter => chapter.id === need.chapterId), 'Choisissez un chapitre de la matière.');
      assert(state.encgs.includes(need.encg) && state.levels.includes(need.level), 'Précisez votre ENCG et votre niveau.');
      assert(data.constants.difficulties.includes(need.difficulty), 'Précisez le type de difficulté.');
      assert(data.constants.modes.includes(need.mode), 'Précisez le mode de séance.');
      assert(text(need.text, 3, 1000), 'Décrivez votre besoin (3 à 1000 caractères).');
      assert(need.wishes === undefined || need.wishes === '' || text(need.wishes, 1, 200), 'Disponibilités souhaitées : 200 caractères maximum.');
      const attachment = need.attachment || null;
      assert(attachment === null || (text(attachment.name, 1, 120) && Number.isInteger(attachment.size) && attachment.size > 0 && attachment.size <= ATTACHMENT_MAX && ATTACHMENT_TYPES.includes(attachment.type)), 'Pièce jointe : PDF, JPG ou PNG, 5 Mo maximum.');
      assert(tutor.subjects.includes(subject.id), 'Ce tuteur n\'enseigne pas cette matière.');
      assert(tutor.services.includes(offer.id), 'Service non proposé par ce tuteur.');
      assert(tutor.modes.includes(need.mode), 'Mode de séance non proposé par ce tuteur.');
      assert(input.acceptPolicy === true, 'Prenez connaissance de la politique d\'annulation avant de confirmer.');
      const cleanNeed = { encg: need.encg, level: need.level, subjectId: subject.id, chapterId: need.chapterId, difficulty: need.difficulty, mode: need.mode, wishes: (need.wishes || '').trim(), text: need.text.trim(), attachment: attachment ? { name: attachment.name.trim(), size: attachment.size, type: attachment.type } : null };
      const base = { id: id('bk'), studentId: student.id, studentName: student.name, tutorId: tutor.id, offerId: offer.id, offerName: offer.name, start: input.start, minutes: offer.minutes, need: cleanNeed, report: null, payout: null, reminded: false, simulatedEnded: false, cancellation: null, created: stamp() };
      if (input.packageId) {
        const pack = state.packages.find(item => item.id === input.packageId && item.studentId === student.id && item.offerId === offer.id);
        assert(pack && pack.status === 'active' && pack.remaining > 0 && Date.parse(pack.expires) > time(), 'Crédit épuisé, expiré ou forfait résilié.');
        available(tutor, input.start, offer.minutes, { studentId: student.id, subscriber: isSubscriber(student.id), limit: Date.parse(pack.expires) });
        pack.remaining -= 1;
        if (!pack.creditValues) pack.creditValues = Array.from({ length: pack.remaining + 1 }, () => round2(pack.unitPrice));
        const booking = { ...base, price: pack.creditValues.shift(), transactionId: pack.transactionId, packageId: pack.id, status: 'confirmed', holdUntil: null };
        state.bookings.push(booking);
        mail(student.email, 'booking-confirmed', 'Réservation confirmée', [`Bonjour ${student.name},`, `Votre séance ${sessionLabel(booking)} est confirmée et réglée avec un crédit de votre forfait ${pack.name}.`, `Séances restantes : ${pack.remaining} / ${pack.total}, à utiliser avant le ${formatDate(pack.expires)}.`, `Annulation jusqu'à ${policy().cancelHours} h avant le début : le crédit est restitué.`], { bookingId: booking.id });
        notify(student.id, `Séance planifiée avec votre forfait : ${sessionLabel(booking)}.`);
        tutorBookingNotice(booking);
        return booking;
      }
      const limit = offer.credits > 1 ? packageExpiry(offer, time()) : null;
      available(tutor, input.start, offer.minutes, { studentId: student.id, subscriber: offer.id === 'stay' || isSubscriber(student.id), limit });
      const orderId = `OT-${now().toISOString().slice(0, 10).replace(/-/g, '')}-${randomHex(3).toUpperCase()}`;
      const tx = { id: id('tx'), orderId, kind: 'payment', studentId: student.id, bookingId: base.id, offerId: offer.id, offerName: offer.name, amount: offer.price, credits: offer.credits, fee: 0, status: 'pending', provider: state.config.provider, created: stamp(), updated: stamp() };
      state.transactions.push(tx);
      const booking = { ...base, price: offer.credits > 1 ? splitCredits(offer.price, offer.credits)[0] : offer.price, transactionId: tx.id, packageId: null, status: 'pending', holdUntil: new Date(time() + policy().holdMinutes * MINUTE).toISOString() };
      state.bookings.push(booking);
      return booking;
    }
    function closePack(pack, refundRemainder, reason) {
      pack.status = 'terminated'; pack.terminatedAt = stamp();
      let refunded = 0;
      if (refundRemainder && pack.remaining > 0) {
        refunded = round2((pack.creditValues || []).slice(0, pack.remaining).reduce((total, value) => total + value, 0));
        const tx = state.transactions.find(item => item.id === pack.transactionId);
        state.transactions.push({ id: id('tx'), orderId: `${tx ? tx.orderId : 'OT'}-RES`, kind: 'refund', studentId: pack.studentId, bookingId: tx ? tx.bookingId : '', offerId: pack.offerId, offerName: pack.name, amount: -refunded, fee: 0, status: 'refunded', provider: tx ? tx.provider : state.config.provider, created: stamp(), updated: stamp(), reason });
      }
      pack.remaining = 0; pack.creditValues = [];
      return refunded;
    }
    function removeAccount(user) {
      if (user.role === 'tutor') {
        const tutor = findTutor(user.id);
        assert(!state.bookings.some(booking => booking.tutorId === user.id && blocking(booking) && Date.parse(booking.start) > time()), 'Des séances futures sont réservées : elles doivent être annulées avant la suppression.');
        if (tutor) Object.assign(tutor, { name: 'Tuteur supprimé', bio: 'Profil supprimé.', photo: '', photoConsent: false, age: null, showAge: false, slots: [], prioritySlots: [], blocked: [], status: 'deleted' });
      } else {
        for (const booking of state.bookings.filter(item => item.studentId === user.id)) {
          if (booking.status === 'pending') failPayment(state.transactions.find(item => item.id === booking.transactionId), booking, 'abandonné');
          if (booking.status === 'confirmed' && Date.parse(booking.start) > time()) settleCancellation(booking, 'admin');
          booking.studentName = 'Compte supprimé';
          booking.need = { ...booking.need, text: '[supprimé]', wishes: '', attachment: null };
        }
        for (const pack of state.packages) if (pack.studentId === user.id && pack.status === 'active') closePack(pack, Date.parse(pack.expires) > time(), 'Suppression du compte');
        state.reviews = state.reviews.filter(review => review.studentId !== user.id);
        state.orientationProfiles = state.orientationProfiles.filter(item => item.studentId !== user.id);
        state.consultations = state.consultations.filter(item => item.studentId !== user.id);
      }
      // Discussions : fils privés et réponses planifiées pour ce compte supprimés, messages de salon anonymisés.
      const threads = new Set(state.chat.threads.filter(thread => thread.members.includes(user.id)).map(thread => thread.id));
      state.chat.threads = state.chat.threads.filter(thread => !threads.has(thread.id));
      state.chat.messages = state.chat.messages.filter(message => !threads.has(message.threadId));
      state.chat.pending = state.chat.pending.filter(item => !threads.has(item.threadId) && item.forUserId !== user.id);
      for (const message of state.chat.messages) {
        if (message.fromId === user.id) { message.fromId = null; message.fromName = 'Compte supprimé'; }
        if (message.reportedBy === user.id) message.reportedBy = null;
      }
      state.notifications = state.notifications.filter(item => item.userId !== user.id);
      state.codes = state.codes.filter(item => item.userId !== user.id);
      state.messages = state.messages.filter(item => item.userId !== user.id && item.email !== user.email);
      state.pods.subscribers = state.pods.subscribers.filter(item => item.email !== user.email);
      state.emails = state.emails.filter(item => item.to !== user.email);
      delete state.throttle[user.email];
      state.users = state.users.filter(item => item.id !== user.id);
      if (state.session && state.session.userId === user.id) state.session = null;
      mail(user.email, 'account-deleted', 'Suppression de votre compte ONTRACK', [`Bonjour ${user.name},`, 'Votre compte et vos données personnelles ont été supprimés. Les réservations et paiements passés sont conservés sous forme anonymisée pour les obligations comptables.', 'Merci d\'avoir utilisé ONTRACK.']);
    }
    return api;
  }
  const api = { createStore, KEY, SESSION_KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OntrackStore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
