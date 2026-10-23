(function (root) {
  'use strict';
  const data = typeof module !== 'undefined' && module.exports ? require('./data.js') : root.OntrackData;
  const KEY = 'ontrack-demo-v1';
  const copy = value => JSON.parse(JSON.stringify(value));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  function createStore(storage, clock) {
    const now = clock || (() => new Date());
    let state = data.seed(now());
    let warning = '';
    const id = () => `${now().getTime()}-${Math.random().toString(36).slice(2, 10)}`;
    function valid(candidate) {
      assert(candidate && candidate.version === 1, 'Version locale incompatible.');
      for (const key of ['encgs', 'chapters', 'tutors', 'offers', 'programs', 'bookings', 'packages', 'transactions', 'reviews', 'notifications', 'messages']) assert(Array.isArray(candidate[key]), 'Donnees locales invalides.');
      const strings = (item, keys) => item && keys.every(key => typeof item[key] === 'string');
      assert(candidate.encgs.every(item => typeof item === 'string') && candidate.chapters.length > 0 && candidate.chapters.every(item => typeof item === 'string'), 'Catalogue invalide.');
      assert(candidate.student === null || (strings(candidate.student, ['id', 'name', 'encg', 'level', 'track']) && candidate.student.name.trim() && typeof candidate.student.verified === 'boolean'), 'Profil invalide.');
      assert(candidate.tutors.length > 0 && candidate.offers.length === 4, 'Catalogue incomplet.');
      for (const key of ['tutors', 'offers', 'programs']) assert(new Set(candidate[key].map(item => item?.id)).size === candidate[key].length, 'Identifiants locaux dupliques.');
      assert(['quick', 'catch', 'exam', 'stay'].every(offerId => candidate.offers.some(offer => offer?.id === offerId)), 'Offres locales incompletes.');
      for (const tutor of candidate.tutors) assert(strings(tutor, ['id', 'name', 'subject', 'encg', 'level', 'language', 'mode', 'bio', 'photo']) && /^assets\/(yassine|lina|adam)\.jpg$/.test(tutor.photo) && Number.isFinite(tutor.rating) && typeof tutor.approved === 'boolean' && Array.isArray(tutor.slots) && tutor.slots.every(slot => Number.isFinite(Date.parse(slot))) && Array.isArray(tutor.chapters) && tutor.chapters.every(chapter => candidate.chapters.includes(chapter)), 'Tuteur invalide.');
      for (const offer of candidate.offers) assert(strings(offer, ['id', 'name']) && Number.isFinite(offer.price) && offer.price > 0 && Number.isInteger(offer.credits) && offer.credits > 0 && Number.isFinite(offer.minutes) && offer.minutes > 0 && offer.days > 0, 'Offre invalide.');
      for (const booking of candidate.bookings) {
        assert(strings(booking, ['id', 'studentId', 'studentName', 'tutorId', 'offerId', 'offerName', 'need']) && candidate.tutors.some(tutor => tutor.id === booking.tutorId) && Number.isFinite(Date.parse(booking.start)) && ['confirmed', 'completed', 'cancelled'].includes(booking.status) && Number.isFinite(booking.price) && Number.isFinite(booking.minutes) && booking.minutes > 0, 'Reservation invalide.');
        assert(booking.report === null || (strings(booking.report, ['text', 'mastery']) && Array.isArray(booking.report.chapters) && booking.report.chapters.every(chapter => candidate.chapters.includes(chapter))), 'Compte rendu invalide.');
      }
      for (const pack of candidate.packages) assert(strings(pack, ['id', 'studentId', 'offerId', 'name', 'transactionId']) && Number.isInteger(pack.remaining) && pack.remaining >= 0 && pack.remaining <= pack.total && Number.isFinite(pack.unitPrice) && Number.isFinite(Date.parse(pack.expires)), 'Forfait invalide.');
      for (const transaction of candidate.transactions) assert(strings(transaction, ['id', 'studentId', 'offerName', 'status']) && Number.isFinite(transaction.amount) && Number.isFinite(Date.parse(transaction.created)), 'Transaction invalide.');
      for (const review of candidate.reviews) assert(strings(review, ['id', 'bookingId', 'studentId', 'tutorId', 'text']) && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 && typeof review.hidden === 'boolean', 'Avis invalide.');
      for (const notification of candidate.notifications) assert(strings(notification, ['id', 'text']) && Number.isFinite(Date.parse(notification.created)), 'Notification invalide.');
      for (const message of candidate.messages) assert(strings(message, ['id', 'name', 'text']) && Number.isFinite(Date.parse(message.created)), 'Message invalide.');
      for (const program of candidate.programs) assert(strings(program, ['id', 'name', 'country', 'track', 'level', 'language']) && Number.isFinite(program.minGrade) && program.minGrade >= 0 && program.minGrade <= 20 && Number.isFinite(program.budget) && program.budget >= 0 && typeof program.active === 'boolean', 'Programme invalide.');
      return candidate;
    }
    try {
      assert(storage, 'Stockage indisponible.');
      const saved = storage.getItem(KEY);
      if (saved) state = valid(JSON.parse(saved));
      storage.setItem(KEY, JSON.stringify(state));
    } catch (error) { warning = 'Stockage indisponible ou invalide : mode memoire actif. Les changements seront perdus au rechargement.'; storage = null; }
    function save() {
      if (storage) try { storage.setItem(KEY, JSON.stringify(state)); } catch (error) { storage = null; warning = 'Echec de sauvegarde : mode memoire actif. Une ancienne sauvegarde peut subsister, y compris apres suppression du profil. Effacez les donnees du site dans le navigateur.'; }
    }
    function notify(text) { state.notifications.unshift({ id: id(), text, created: now().toISOString() }); }
    function mutate(action) {
      const before = copy(state);
      try { const result = action(); valid(state); save(); return copy(result === undefined ? null : result); }
      catch (error) { state = before; throw error; }
    }
    function student() { assert(state.student && state.student.verified, 'Inscrivez un profil fictif verifie.'); return state.student; }
    function available(tutor, start, minutes, except) {
      assert(tutor && tutor.approved, 'Tuteur non valide.');
      assert(tutor.slots.includes(start) && new Date(start) > now(), 'Creneau passe ou incompatible.');
      const end = Date.parse(start) + minutes * 60000;
      assert(!state.bookings.some(booking => booking.id !== except && booking.status !== 'cancelled' && (booking.tutorId === tutor.id || booking.studentId === state.student?.id) && Date.parse(booking.start) < end && Date.parse(start) < Date.parse(booking.start) + booking.minutes * 60000), 'Creneau occupe. Choisissez un autre horaire.');
    }
    const api = {
      get: () => copy(state), warning: () => warning,
      reset: confirmed => { assert(confirmed === true, 'Confirmation requise.'); state = data.seed(now()); save(); },
      register: profile => mutate(() => {
        assert(profile.name?.trim() && profile.name.length <= 80 && state.encgs.includes(profile.encg) && ['S2', 'S4', 'S6', 'S8', 'S10'].includes(profile.level) && ['Gestion', 'Finance', 'Marketing'].includes(profile.track) && profile.verified === true, 'Profil fictif incomplet ou verification manquante.');
        state.student = { id: state.student?.id || id(), name: profile.name.trim(), encg: profile.encg, level: profile.level, track: profile.track, verified: true };
        notify('Inscription fictive verifiee.');
      }),
      book: input => mutate(() => {
        const participant = student();
        const offer = state.offers.find(item => item.id === input.offerId);
        assert(offer, 'Service inconnu.');
        assert(typeof input.need === 'string' && input.need.trim().length >= 3 && input.need.length <= 500, 'Precisez votre besoin (3 a 500 caracteres).');
        const tutor = state.tutors.find(item => item.id === input.tutorId);
        available(tutor, input.start, offer.minutes);
        let pack;
        let transaction;
        if (input.packageId) {
          pack = state.packages.find(item => item.id === input.packageId && item.studentId === participant.id && item.offerId === offer.id);
          assert(pack && pack.remaining > 0 && new Date(pack.expires) > now() && Date.parse(input.start) + offer.minutes * 60000 <= Date.parse(pack.expires), 'Credit epuise, expire ou hors validite.');
          pack.remaining -= 1;
        } else {
          assert(input.payment === 'accepted', input.payment === 'abandoned' ? 'Paiement abandonne. Aucune reservation.' : 'Paiement refuse. Reessayez.');
          transaction = { id: id(), studentId: participant.id, amount: offer.price, offerName: offer.name, created: now().toISOString(), status: 'paid' };
          state.transactions.push(transaction);
          if (offer.credits > 1) {
            const expires = new Date(now());
            if (offer.id === 'stay') {
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
            }
            else expires.setTime(expires.getTime() + offer.days * 86400000);
            assert(Date.parse(input.start) + offer.minutes * 60000 <= expires.getTime(), 'Creneau hors de la validite du forfait.');
            pack = { id: id(), studentId: participant.id, offerId: offer.id, name: offer.name, remaining: offer.credits - 1, total: offer.credits, expires: expires.toISOString(), transactionId: transaction.id, unitPrice: offer.price / offer.credits };
            state.packages.push(pack);
          }
        }
        if (pack && !pack.creditValues) {
          pack.creditValues = transaction ? Array.from({ length: pack.total }, (_, index) => (Math.round((index + 1) * transaction.amount * 100 / pack.total) - Math.round(index * transaction.amount * 100 / pack.total)) / 100) : Array.from({ length: pack.remaining + 1 }, () => Math.round(pack.unitPrice * 100) / 100);
        }
        const booking = { id: id(), studentId: participant.id, studentName: participant.name, tutorId: tutor.id, offerId: offer.id, offerName: offer.name, start: input.start, minutes: offer.minutes, price: pack ? pack.creditValues.shift() : offer.price, transactionId: pack ? pack.transactionId : transaction.id, packageId: pack?.id || null, need: input.need.trim(), status: 'confirmed', report: null, cancellationSettled: false };
        state.bookings.push(booking); notify(`Reservation confirmee avec ${tutor.name}. Paiement simule uniquement.`); return booking;
      }),
      reschedule: (bookingId, start) => mutate(() => {
        const booking = state.bookings.find(item => item.id === bookingId && item.studentId === student().id);
        assert(booking && booking.status === 'confirmed' && !booking.simulatedEnded && new Date(booking.start) > now(), 'Reprogrammation indisponible.');
        const pack = state.packages.find(item => item.id === booking.packageId);
        assert(!pack || Date.parse(start) + booking.minutes * 60000 <= Date.parse(pack.expires), 'Creneau hors validite.');
        available(state.tutors.find(item => item.id === booking.tutorId), start, booking.minutes, booking.id);
        booking.start = start; notify('Seance reprogrammee.');
      }),
      cancel: (bookingId, refund) => mutate(() => {
        const booking = state.bookings.find(item => item.id === bookingId);
        assert(booking && booking.status === 'confirmed' && !booking.simulatedEnded && new Date(booking.start) > now(), 'Annulation possible uniquement avant le debut.');
        booking.status = 'cancelled'; booking.cancellationSettled = true;
        const pack = state.packages.find(item => item.id === booking.packageId);
        if (pack && !refund && new Date(pack.expires) > now()) { pack.remaining += 1; if (pack.creditValues) pack.creditValues.unshift(booking.price); }
        else state.transactions.push({ id: id(), studentId: booking.studentId, amount: -booking.price, offerName: booking.offerName, created: now().toISOString(), status: 'refunded', bookingId: booking.id });
        notify(pack && !refund && new Date(pack.expires) > now() ? 'Annulation : credit restitue, expiration inchangee.' : 'Annulation : remboursement simule enregistre.');
      }),
      simulateEnd: (bookingId, tutorId) => mutate(() => {
        const booking = state.bookings.find(item => item.id === bookingId && item.tutorId === tutorId);
        assert(booking && booking.status === 'confirmed', 'Seance indisponible.');
        booking.simulatedEnded = true; notify('Fin de seance simulee pour la demonstration.');
      }),
      complete: (bookingId, report, tutorId) => mutate(() => {
        const booking = state.bookings.find(item => item.id === bookingId && item.tutorId === tutorId);
        assert(booking && booking.status === 'confirmed' && (booking.simulatedEnded || Date.parse(booking.start) + booking.minutes * 60000 <= now().getTime()), 'La seance doit etre terminee.');
        const tutor = state.tutors.find(item => item.id === tutorId);
        assert(report.text?.trim() && report.text.length <= 1000 && Array.isArray(report.chapters) && report.chapters.length > 0 && report.chapters.every(chapter => tutor.chapters.includes(chapter)) && ['revise', 'maitrise'].includes(report.mastery), 'Compte rendu ou chapitres invalides.');
        booking.report = { text: report.text.trim(), chapters: [...new Set(report.chapters)], mastery: report.mastery }; booking.status = 'completed'; notify('Compte rendu publie et progression actualisee.');
      }),
      review: (bookingId, rating, text) => mutate(() => {
        const booking = state.bookings.find(item => item.id === bookingId && item.studentId === student().id);
        assert(booking?.status === 'completed' && !state.reviews.some(item => item.bookingId === bookingId), 'Un avis unique est reserve au participant apres la seance.');
        assert(Number.isInteger(rating) && rating >= 1 && rating <= 5 && text?.trim() && text.length <= 500, 'Avis invalide.');
        state.reviews.push({ id: id(), bookingId, tutorId: booking.tutorId, studentId: booking.studentId, rating, text: text.trim(), hidden: false });
      }),
      progress: () => {
        const revised = new Set(state.bookings.filter(item => item.studentId === state.student?.id && item.status === 'completed').flatMap(item => item.report?.chapters || []));
        return { count: revised.size, total: state.chapters.length, percent: Math.round(revised.size / state.chapters.length * 100), chapters: [...revised] };
      },
      updateTutor: (tutorId, input) => mutate(() => {
        const tutor = state.tutors.find(item => item.id === tutorId); assert(tutor, 'Tuteur introuvable.');
        assert(input.bio?.trim() && input.bio.length <= 500 && ['Francais', 'Arabe', 'Anglais'].includes(input.language) && ['En ligne', 'Presentiel'].includes(input.mode), 'Profil tuteur invalide.');
        Object.assign(tutor, { bio: input.bio.trim(), language: input.language, mode: input.mode, approved: false }); notify('Profil tuteur soumis a validation.');
      }),
      approve: tutorId => mutate(() => { const tutor = state.tutors.find(item => item.id === tutorId); assert(tutor, 'Tuteur introuvable.'); tutor.approved = !tutor.approved; notify('Statut du tuteur actualise.'); }),
      catalogue: (tutorId, input) => mutate(() => {
        const tutor = state.tutors.find(item => item.id === tutorId);
        const chapters = [...new Set(String(input.chapters || '').split(';').map(chapter => chapter.trim()).filter(Boolean))];
        assert(tutor && typeof input.subject === 'string' && input.subject.trim().length > 0 && input.subject.length <= 80 && ['S2', 'S4', 'S6', 'S8', 'S10'].includes(input.level) && chapters.length > 0 && chapters.length <= 12 && chapters.every(chapter => chapter.length <= 80), 'Catalogue incomplet ou chapitre trop long.');
        tutor.subject = input.subject.trim(); tutor.level = input.level; tutor.chapters = chapters;
        state.chapters = [...new Set([...state.chapters, ...chapters])];
        notify('Matiere, niveau et chapitres actualises. Chapitres historiques conserves.');
      }),
      addSlot: (tutorId, start) => mutate(() => {
        const tutor = state.tutors.find(item => item.id === tutorId); assert(tutor && Number.isFinite(Date.parse(start)) && new Date(start) > now(), 'Disponibilite invalide.');
        const calendar = /^(\d{4})-(\d{2})-(\d{2})T/.exec(start);
        assert(calendar && new Date(Date.UTC(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3]))).getUTCDate() === Number(calendar[3]) && Number(calendar[2]) >= 1 && Number(calendar[2]) <= 12, 'Date du calendrier invalide.');
        const iso = new Date(start).toISOString(); assert(!tutor.slots.includes(iso), 'Creneau deja propose.'); tutor.slots.push(iso); tutor.slots.sort();
      }),
      removeSlot: (tutorId, start) => mutate(() => { const tutor = state.tutors.find(item => item.id === tutorId); assert(tutor, 'Tuteur introuvable.'); assert(!state.bookings.some(item => item.tutorId === tutorId && item.start === start && item.status === 'confirmed'), 'Creneau reserve.'); tutor.slots = tutor.slots.filter(slot => slot !== start); }),
      price: (offerId, amount) => mutate(() => { const offer = state.offers.find(item => item.id === offerId); assert(offer && Number.isFinite(amount) && amount > 0 && amount <= 10000, 'Tarif invalide.'); offer.price = Math.round(amount * 100) / 100; }),
      moderate: reviewId => mutate(() => { const review = state.reviews.find(item => item.id === reviewId); assert(review, 'Avis introuvable.'); review.hidden = !review.hidden; }),
      program: input => mutate(() => {
        const existing = state.programs.find(item => item.id === input.id); assert(existing, 'Programme introuvable.');
        assert(Number.isFinite(input.minGrade) && input.minGrade >= 0 && input.minGrade <= 20 && Number.isFinite(input.budget) && input.budget >= 0, 'Criteres invalides.'); Object.assign(existing, { minGrade: input.minGrade, budget: input.budget, active: input.active === true });
      }),
      message: (name, text) => mutate(() => { assert(name?.trim() && name.length <= 80 && text?.trim() && text.length <= 1000, 'Message invalide.'); state.messages.push({ id: id(), name: name.trim(), text: text.trim(), created: now().toISOString() }); notify('Message conserve localement, aucun envoi.'); }),
      deleteProfile: confirmed => mutate(() => {
        assert(confirmed === true, 'Confirmation requise.'); const participant = student();
        for (const key of ['bookings', 'packages', 'transactions', 'reviews']) state[key] = state[key].filter(item => item.studentId !== participant.id);
        state.student = null; state.notifications = []; state.messages = [];
      }),
      stats: () => ({ bookings: state.bookings.filter(item => item.status !== 'cancelled').length, revenue: state.transactions.reduce((total, item) => total + Math.round(item.amount * 100), 0) / 100, completed: state.bookings.filter(item => item.status === 'completed').length, students: state.student ? 1 : 0 }),
      earnings: tutorId => Math.round(state.bookings.filter(item => item.tutorId === tutorId && item.status === 'completed').reduce((total, item) => total + item.price * 0.8, 0) * 100) / 100
    };
    return api;
  }
  const api = { createStore, KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OntrackStore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));