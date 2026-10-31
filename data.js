(function (root) {
  'use strict';
  const hashing = typeof module !== 'undefined' && module.exports ? require('./sha256.js') : root.OntrackSha256;

  const ENCGS = [
    ['Agadir', 'agadir'], ['Settat', 'settat'], ['Tanger', 'tanger'], ['Marrakech', 'marrakech'],
    ['Oujda', 'oujda'], ['Kénitra', 'kenitra'], ['El Jadida', 'el-jadida'], ['Fès', 'fes'],
    ['Casablanca', 'casablanca'], ['Dakhla', 'dakhla'], ['Béni Mellal', 'beni-mellal'], ['Meknès', 'meknes']
  ];
  // Filières établies d'après les plannings d'examens 2025-2026 de l'ENCG Casablanca, regroupées par cycle.
  // Un niveau peut relever de plusieurs cycles (S9 et S10 : nouveau cycle et ancien régime).
  const trackGroups = [
    { cycle: 'Années préparatoires', levels: ['S1', 'S2', 'S3', 'S4'], tracks: ['Tronc commun'] },
    { cycle: 'Cycle du diplôme — 1re année', levels: ['S5', 'S6'], tracks: ['Gestion', 'Commerce'] },
    { cycle: 'Cycle du diplôme — 2e année et au-delà', levels: ['S7', 'S8', 'S9', 'S10'], tracks: ['Finance', 'Comptabilité, audit et contrôle (CAC)', 'Management des ressources humaines (MRH)', 'Purchasing & Supply Chain Management (PSCM)', 'Business Administration (BA)', 'Marketing digital (MD)', 'Marketing et action commerciale (MAC)', 'Commerce international (CI)'] },
    { cycle: 'Ancien régime (5e année)', levels: ['S9', 'S10'], tracks: ['Gestion financière et comptable (GFC)', 'Audit et contrôle de gestion (ACG)', 'Management logistique (ML)'] }
  ];
  const constants = {
    levels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'],
    trackGroups,
    tracks: [...new Set(trackGroups.flatMap(group => group.tracks))],
    languages: ['Français', 'Arabe', 'Anglais', 'Espagnol'],
    modes: ['En ligne', 'Présentiel'],
    cefr: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    difficulties: ['Compréhension du cours', 'Exercices d\'application', 'Cours manqué', 'Préparation d\'examen', 'Méthodologie'],
    chapterStatuses: [
      { id: 'a-etudier', label: 'À étudier' },
      { id: 'en-cours', label: 'En cours d\'apprentissage' },
      { id: 'revise', label: 'Révisé' },
      { id: 'maitrise', label: 'Maîtrisé' }
    ],
    mobilities: ['Échange', 'Échange semestriel', 'Double diplôme']
  };
  // Cycles proposant un niveau ; un niveau hors des cycles connus (créé par l'administration) les accepte tous.
  function trackGroupsFor(level) {
    const groups = trackGroups.filter(group => group.levels.includes(level));
    return (groups.length ? groups : trackGroups).map(group => ({ cycle: group.cycle, levels: group.levels.slice(), tracks: group.tracks.slice() }));
  }
  function tracksFor(level) {
    return [...new Set(trackGroupsFor(level).flatMap(group => group.tracks))];
  }

  // Conversion d'une heure locale marocaine (Africa/Casablanca) en instant ISO,
  // avec deux passes de correction pour absorber les changements saisonniers.
  function moroccoInstant(day, hour, minute) {
    const target = `${day}T${String(hour).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}:00`;
    let instant = new Date(`${target}Z`);
    for (let pass = 0; pass < 2; pass += 1) {
      const shown = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(instant).replace(' ', 'T');
      instant = new Date(instant.getTime() + new Date(`${target}Z`).getTime() - new Date(`${shown}Z`).getTime());
    }
    return instant.toISOString();
  }
  function moroccoDay(value) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
    const part = type => parts.find(item => item.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function seed(now) {
    const date = now || new Date();
    const slots = [];
    for (let day = 1; day <= 10; day += 1) {
      const local = moroccoDay(date.getTime() + day * 86400000);
      for (const hour of [10, 14, 18]) slots.push(moroccoInstant(local, hour, 0));
    }
    const dayAt = (offset, hour) => moroccoInstant(moroccoDay(date.getTime() + offset * 86400000), hour, 0);
    const hash = (salt, password) => hashing.sha256(salt + password);
    const domains = Object.fromEntries(ENCGS.map(([name, slug]) => [name, [`etu.encg-${slug}.demo`]]));
    const subjects = [
      { id: 'compta-gen', name: 'Comptabilité générale', level: 'S1', chapters: ['Bilan et résultat', 'Opérations courantes', 'Amortissements', 'Provisions', 'Travaux d\'inventaire'] },
      { id: 'compta-ana', name: 'Comptabilité analytique', level: 'S3', chapters: ['Charges directes et indirectes', 'Coûts complets', 'Imputation rationnelle', 'Seuil de rentabilité'] },
      { id: 'maths', name: 'Mathématiques appliquées', level: 'S1', chapters: ['Fonctions', 'Dérivées', 'Optimisation', 'Matrices'] },
      { id: 'micro', name: 'Microéconomie', level: 'S2', chapters: ['Offre et demande', 'Élasticités', 'Comportement du consommateur', 'Théorie du producteur', 'Structures de marché'] },
      { id: 'stats', name: 'Statistiques', level: 'S3', chapters: ['Statistique descriptive', 'Probabilités', 'Lois usuelles', 'Échantillonnage', 'Régression'] },
      { id: 'marketing', name: 'Marketing', level: 'S4', chapters: ['Étude de marché', 'Segmentation et ciblage', 'Mix marketing', 'Stratégie marketing'] }
    ].map(subject => ({ ...subject, chapters: subject.chapters.map((name, index) => ({ id: `${subject.id}-${index + 1}`, name })) }));
    const chaptersOf = (...ids) => subjects.filter(subject => ids.includes(subject.id)).flatMap(subject => subject.chapters.map(chapter => chapter.id));
    const created = new Date(date.getTime() - 30 * 86400000).toISOString();
    const user = (id, role, name, email, password, extra) => ({ id, role, name, email, salt: `seed-${id}`, hash: hash(`seed-${id}`, password), verified: true, status: 'active', created, ...extra });
    const users = [
      user('s1', 'student', 'Salma Benali', 'salma.benali@etu.encg-casablanca.demo', 'Demo2026!', { encg: 'Casablanca', level: 'S6', track: 'Gestion' }),
      user('s2', 'student', 'Omar Tazi', 'omar.tazi@etu.encg-settat.demo', 'Demo2026!', { encg: 'Settat', level: 'S3', track: 'Tronc commun' }),
      user('t1', 'tutor', 'Yassine Amrani', 'yassine.amrani@etu.encg-casablanca.demo', 'Demo2026!', {}),
      user('t2', 'tutor', 'Lina El Fassi', 'lina.elfassi@etu.encg-fes.demo', 'Demo2026!', {}),
      user('t3', 'tutor', 'Adam Idrissi', 'adam.idrissi@etu.encg-tanger.demo', 'Demo2026!', {}),
      user('a1', 'admin', 'Administration ONTRACK', 'admin@ontrack.demo', 'Admin2026!', {})
    ];
    const tutor = (id, name, extra) => ({ id, name, slots: slots.slice(), prioritySlots: [], blocked: [], photoConsent: true, showAge: false, age: null, services: ['quick', 'catch', 'exam', 'stay'], created, ...extra });
    const tutors = [
      tutor('t1', 'Yassine Amrani', { encg: 'Casablanca', level: 'S8', subjects: ['compta-gen', 'compta-ana'], chapters: chaptersOf('compta-gen').concat(['compta-ana-1', 'compta-ana-2']), languages: ['Français', 'Arabe'], modes: ['En ligne', 'Présentiel'], bio: 'Des méthodes concrètes pour comprendre les chiffres, du bilan aux coûts complets.', photo: 'assets/yassine.jpg', age: 23, showAge: true, status: 'approved', prioritySlots: [slots[2], slots[5], slots[8]] }),
      tutor('t2', 'Lina El Fassi', { encg: 'Fès', level: 'S6', subjects: ['stats', 'maths'], chapters: chaptersOf('stats', 'maths'), languages: ['Français', 'Anglais'], modes: ['En ligne'], bio: 'Comprendre le raisonnement, puis pratiquer ensemble sur des exercices de type examen.', photo: 'assets/lina.jpg', age: 22, status: 'approved', prioritySlots: [slots[1], slots[4]] }),
      tutor('t3', 'Adam Idrissi', { encg: 'Tanger', level: 'S8', subjects: ['marketing', 'micro'], chapters: chaptersOf('marketing', 'micro'), languages: ['Français', 'Arabe', 'Anglais'], modes: ['En ligne', 'Présentiel'], services: ['quick', 'catch'], bio: 'Des cas pratiques pour relier le cours de marketing au terrain.', photo: 'assets/adam.jpg', status: 'pending' })
    ];
    const offers = [
      { id: 'quick', name: 'Quick Help', price: 50, minutes: 30, credits: 1, days: 7, frequency: 'Séance ponctuelle', content: 'Explication rapide, clarification d\'un concept ou aide sur un exercice.', objective: 'Résoudre une difficulté ciblée.', audience: 'Étudiants ayant une question urgente ou un blocage précis.' },
      { id: 'catch', name: '90-Minute Catch-up', price: 150, minutes: 90, credits: 1, days: 7, frequency: 'Séance ponctuelle', content: 'Explication personnalisée d\'un chapitre, rattrapage de cours manqués et exercices guidés.', objective: 'Aider l\'étudiant à comprendre un sujet précis.', audience: 'Étudiants ayant besoin d\'un accompagnement approfondi.' },
      { id: 'exam', name: 'Exam Rescue', price: 399, minutes: 90, credits: 3, days: 7, frequency: 'Trois séances sur une semaine', content: 'Révision du cours, exercices d\'application, questions de type examen et identification des points faibles.', objective: 'Préparer les examens de manière structurée.', audience: 'Étudiants en période d\'examens.' },
      { id: 'stay', name: 'Stay ONTRACK', price: 349, minutes: 60, credits: 4, days: 30, frequency: 'Une séance par semaine recommandée', content: 'Tutorat régulier, suivi des difficultés, bilans de progression et récapitulatifs après les séances.', objective: 'Maintenir un accompagnement académique régulier pendant le semestre.', audience: 'Étudiants souhaitant un suivi régulier.' }
    ];
    const iso = offset => new Date(date.getTime() + offset * 86400000).toISOString();
    const pastStats = dayAt(-3, 14);
    const pastCompta = dayAt(-2, 10);
    const transactions = [
      { id: 'tx-seed-1', orderId: 'OT-SEED-0001', kind: 'payment', studentId: 's2', bookingId: 'b-seed-1', offerId: 'stay', offerName: 'Stay ONTRACK', amount: 349, fee: 8.73, status: 'paid', provider: 'CMI', created: iso(-6), updated: iso(-6) },
      { id: 'tx-seed-2', orderId: 'OT-SEED-0002', kind: 'payment', studentId: 's2', bookingId: 'b-seed-2', offerId: 'catch', offerName: '90-Minute Catch-up', amount: 150, fee: 3.75, status: 'paid', provider: 'CMI', created: iso(-4), updated: iso(-4) }
    ];
    const need = (subjectId, chapterId, text) => ({ encg: 'Settat', level: 'S3', subjectId, chapterId, difficulty: 'Exercices d\'application', mode: 'En ligne', wishes: 'Fin d\'après-midi', text, attachment: null });
    const report = (subjectId, chapters, notions, createdAt) => ({ subjectId, chapters, notions, exercises: 'Exercices guidés puis exercice de type examen corrigé ensemble.', difficulties: 'Choix de la bonne méthode sous contrainte de temps.', toReview: 'Refaire les deux exercices de la fin de séance.', recommendations: 'Commencer la prochaine séance par un exercice chronométré.', created: createdAt });
    const bookings = [
      { id: 'b-seed-1', studentId: 's2', studentName: 'Omar Tazi', tutorId: 't2', offerId: 'stay', offerName: 'Stay ONTRACK', start: pastStats, minutes: 60, price: 87.25, transactionId: 'tx-seed-1', packageId: 'pk-seed-1', need: need('stats', 'stats-2', 'Je confonds les probabilités conditionnelles et l\'indépendance.'), status: 'completed', holdUntil: null, created: iso(-6), report: report('stats', [{ id: 'stats-1', status: 'maitrise' }, { id: 'stats-2', status: 'en-cours' }], 'Probabilités conditionnelles, indépendance, arbre de probabilités.', new Date(Date.parse(pastStats) + 3600000).toISOString()), payout: { amount: 0, phase: 'volunteer', payoutId: null }, reminded: true, simulatedEnded: false, cancellation: null },
      { id: 'b-seed-2', studentId: 's2', studentName: 'Omar Tazi', tutorId: 't1', offerId: 'catch', offerName: '90-Minute Catch-up', start: pastCompta, minutes: 90, price: 150, transactionId: 'tx-seed-2', packageId: null, need: need('compta-gen', 'compta-gen-1', 'Je n\'arrive pas à équilibrer le bilan après les écritures de fin d\'année.'), status: 'completed', holdUntil: null, created: iso(-4), report: report('compta-gen', [{ id: 'compta-gen-1', status: 'revise' }, { id: 'compta-gen-3', status: 'en-cours' }], 'Structure du bilan, résultat de l\'exercice, dotations aux amortissements.', new Date(Date.parse(pastCompta) + 5400000).toISOString()), payout: { amount: 0, phase: 'volunteer', payoutId: null }, reminded: true, simulatedEnded: false, cancellation: null },
      { id: 'b-seed-3', studentId: 's2', studentName: 'Omar Tazi', tutorId: 't2', offerId: 'stay', offerName: 'Stay ONTRACK', start: slots[7], minutes: 60, price: 87.25, transactionId: 'tx-seed-1', packageId: 'pk-seed-1', need: need('stats', 'stats-3', 'Revoir la loi normale et la loi binomiale.'), status: 'confirmed', holdUntil: null, created: iso(-1), report: null, payout: null, reminded: false, simulatedEnded: false, cancellation: null }
    ];
    const packages = [
      { id: 'pk-seed-1', studentId: 's2', offerId: 'stay', name: 'Stay ONTRACK', total: 4, remaining: 2, expires: iso(24), transactionId: 'tx-seed-1', unitPrice: 87.25, creditValues: [87.25, 87.25], status: 'active', created: iso(-6), infoSent: false }
    ];
    const reviews = [
      { id: 'r-seed-1', bookingId: 'b-seed-1', studentId: 's2', tutorId: 't2', rating: 5, text: 'Explications très claires, exercices bien choisis.', created: new Date(Date.parse(pastStats) + 3 * 3600000).toISOString(), reported: false, reportReason: '', hidden: false },
      { id: 'r-seed-2', bookingId: 'b-seed-2', studentId: 's2', tutorId: 't1', rating: 4, text: 'Séance utile, le bilan est enfin plus clair.', created: new Date(Date.parse(pastCompta) + 4 * 3600000).toISOString(), reported: false, reportReason: '', hidden: false }
    ];
    // Destinations communiquées par l'ENCG (liste 2025-2026). Un champ non communiqué vaut null (« à confirmer ») :
    // aucune moyenne, langue, date limite, pièce, filière ni type de mobilité n'est inventé.
    const SOURCE_NOTE = 'Liste communiquée par l\'ENCG, année 2025-2026';
    const program = (id, name, institution, country, city, mobility, seats, source) => ({ id, name, institution, country, city, mobility, seats: seats.map(([label, count]) => ({ label, count })), level: null, tracks: [], minGrade: null, languageReq: null, deadline: null, documents: [], source, sourceNote: SOURCE_NOTE, active: true });
    const programs = [
      program('hec-liege', 'Mobilité HEC Liège', 'HEC Liège — Université de Liège', 'Belgique', 'Liège', null, [['Liste principale', 20], ['Liste d\'attente', 20]], 'https://www.hec.uliege.be'),
      program('clermont-sb', 'Mobilité Clermont School of Business', 'Clermont School of Business', 'France', 'Clermont-Ferrand', null, [['Liste principale', 20], ['Liste d\'attente', 20]], 'https://www.clermont-sb.fr'),
      program('rennes-sb', 'Mobilité Rennes School of Business', 'Rennes School of Business', 'France', 'Rennes', null, [['Liste proposée', 40]], 'https://www.rennes-sb.com'),
      program('amu', 'Mobilité Aix-Marseille Université', 'Aix-Marseille Université', 'France', null, null, [['Candidats retenus', 4]], 'https://www.univ-amu.fr'),
      program('hs-ludwigshafen', 'Mobilité Hochschule Ludwigshafen am Rhein', 'Hochschule Ludwigshafen am Rhein', 'Allemagne', 'Ludwigshafen am Rhein', null, [['Candidats', 22]], 'https://www.hwg-lu.de'),
      program('centria', 'Mobilité Centria University of Applied Sciences', 'Centria University of Applied Sciences', 'Finlande', null, null, [['Candidats', 7]], 'https://net.centria.fi/en/'),
      program('shandong', 'Échange Shandong University', 'Shandong University', 'Chine', null, 'Échange', [['Places', 2]], 'https://en.sdu.edu.cn'),
      program('sherbrooke', 'Échange Université de Sherbrooke', 'Université de Sherbrooke', 'Canada', null, 'Échange', [['Places', 2]], 'https://www.usherbrooke.ca'),
      program('uqam-esg', 'Mobilité UQAM — ESG', 'UQAM — École des sciences de la gestion (ESG)', 'Canada', 'Montréal', null, [['Places', 3]], 'https://esg.uqam.ca')
    ];
    // Discussions entre étudiants : salons par filière et par matière, personas fictives qui répondent
    // automatiquement (réponses planifiées dans `pending`), deux messages d'amorce par salon.
    const ago = minutes => new Date(date.getTime() - minutes * 60000).toISOString();
    const personas = [
      { id: 'p-ines', name: 'Inès (fictive)', encg: 'Casablanca', track: 'Commerce' },
      { id: 'p-hiba', name: 'Hiba (fictive)', encg: 'Settat', track: 'Tronc commun' },
      { id: 'p-yasmine', name: 'Yasmine (fictive)', encg: 'Fès', track: 'Gestion' },
      { id: 'p-nour', name: 'Nour (fictive)', encg: 'Tanger', track: 'Finance' }
    ];
    const rooms = [
      { id: 'r-tc', name: 'Tronc commun', kind: 'track', track: 'Tronc commun' },
      { id: 'r-gestion', name: 'Gestion', kind: 'track', track: 'Gestion' },
      { id: 'r-commerce', name: 'Commerce', kind: 'track', track: 'Commerce' },
      { id: 'r-finance', name: 'Finance', kind: 'track', track: 'Finance' },
      { id: 'r-compta-gen', name: 'Comptabilité générale', kind: 'subject', subjectId: 'compta-gen' },
      { id: 'r-stats', name: 'Statistiques', kind: 'subject', subjectId: 'stats' }
    ];
    const opening = [
      ['r-tc', 'p-hiba', 'Bonjour à tous ! Quelqu\'un a une méthode pour réviser la microéconomie avant les partiels ?', 300],
      ['r-tc', 'p-ines', 'Je fais une fiche par chapitre, puis les exercices des anciens examens. Ça marche bien pour moi.', 280],
      ['r-gestion', 'p-yasmine', 'Salut ! Qui prépare le contrôle de comptabilité analytique de la semaine prochaine ?', 240],
      ['r-gestion', 'p-nour', 'Moi ! Le seuil de rentabilité me pose encore problème, on pourrait comparer nos exercices.', 220],
      ['r-commerce', 'p-ines', 'Bienvenue dans le salon Commerce : partagez vos astuces pour le cours de marketing.', 200],
      ['r-commerce', 'p-yasmine', 'Pour le mix marketing, je relie chaque « P » à un exemple de marque marocaine.', 180],
      ['r-finance', 'p-nour', 'Bonjour ! Des conseils pour s\'organiser entre les cours de finance et le stage ?', 160],
      ['r-finance', 'p-hiba', 'Je bloque deux créneaux fixes par semaine pour réviser, sinon tout glisse.', 140],
      ['r-compta-gen', 'p-yasmine', 'Petit rappel : un bilan est toujours équilibré, actif = passif. Vérifiez vos totaux !', 120],
      ['r-compta-gen', 'p-hiba', 'Merci ! Les amortissements dégressifs, quelqu\'un a compris le coefficient ?', 100],
      ['r-stats', 'p-nour', 'Qui veut s\'entraîner sur la loi normale ? Je bloque sur la lecture de la table.', 80],
      ['r-stats', 'p-ines', 'Pense à centrer et réduire avant de lire la table : (X − μ) / σ.', 60]
    ];
    const chat = {
      rooms,
      personas,
      messages: opening.map(([roomId, personaId, text, minutes], index) => ({ id: `cm-seed-${index + 1}`, roomId, threadId: null, fromId: personaId, fromName: personas.find(item => item.id === personaId).name, text, created: ago(minutes), reported: false, reportReason: '', hidden: false })),
      threads: [],
      pending: []
    };
    return {
      version: 3,
      config: {
        domains,
        policy: { cancelHours: 24, rescheduleHours: 12, holdMinutes: 15, reminderHours: 24, priorityHours: 24, terminationRefund: true, sessionHours: 2, lockMinutes: 15, maxAttempts: 5 },
        payout: { phase: 'volunteer', rates: { quick: 30, catch: 90, exam: 75, stay: 50 } },
        feeRate: 0.025,
        provider: 'CMI',
        paymentSecret: 'ontrack-demo-secret'
      },
      encgs: ENCGS.map(([name]) => name),
      levels: constants.levels.slice(),
      subjects, users, session: null, throttle: {}, codes: [], emails: [],
      tutors, offers, bookings, transactions, packages, reviews, payouts: [],
      programs, orientationProfiles: [], consultations: [],
      pods: {
        locations: [
          { id: 'pod-1', name: 'Pod Maârif', city: 'Casablanca', address: 'Quartier à proximité du campus (adresse non arrêtée)', capacity: 4, status: 'en étude' },
          { id: 'pod-2', name: 'Pod Centre', city: 'Settat', address: 'Centre-ville (adresse non arrêtée)', capacity: 3, status: 'en étude' },
          { id: 'pod-3', name: 'Pod Malabata', city: 'Tanger', address: 'Secteur Malabata (adresse non arrêtée)', capacity: 4, status: 'en étude' }
        ],
        subscribers: [],
        prototype: []
      },
      messages: [], notifications: [],
      chat
    };
  }
  // Réponses simulées des personas, choisies par mots-clés (début de mot, texte sans accents). {name} : prénom de
  // l'étudiant en discussion privée ; en salon, « , {name} » ou « {name} » est retiré (aucun prénom dans un message public).
  const chatReplies = [
    { keywords: ['compta', 'bilan', 'amortissement', 'provision', 'inventaire', 'actif', 'passif'], text: 'Pour la compta, {name}, je refais toujours un petit bilan à la main avant l\'examen. On pourrait comparer nos corrigés dans ce salon ?' },
    { keywords: ['stats', 'statisti', 'proba', 'loi normale', 'regression', 'echantillon'], text: 'En stats, ce qui m\'a aidée, c\'est de refaire les exercices de TD sans regarder la correction. Tu bloques sur quel chapitre, {name} ?' },
    { keywords: ['exam', 'partiel', 'revis', 'controle', 'rattrapage'], text: 'Je révise aussi ! Je fais des sessions de 45 minutes avec une pause. Un tuteur ONTRACK peut aussi t\'aider avec Exam Rescue.' },
    { keywords: ['marketing', 'mix', 'segmentation', 'commerce'], text: 'Pour le marketing, partir d\'un cas concret de marque aide beaucoup. Tu as un exemple en tête, {name} ?' },
    { keywords: ['finance', 'micro', 'macro', 'econom', 'math'], text: 'Bonne question {name}. Je te conseille de reprendre les définitions du cours avant d\'attaquer les exercices.' },
    { keywords: ['tuteur', 'seance', 'reserver', 'reservation'], text: 'J\'ai déjà réservé une séance sur ONTRACK : on choisit la matière, le chapitre, puis le créneau. Très pratique !' },
    { keywords: ['orientation', 'mobilite', 'echange', 'etranger', 'erasmus'], text: 'Le portail d\'orientation liste les destinations communiquées par l\'ENCG. Pense à vérifier les critères auprès des relations internationales.' },
    { keywords: ['bonjour', 'salut', 'hello', 'coucou', 'salam'], text: 'Salut {name} ! Bienvenue, n\'hésite pas à poser tes questions ici.' },
    { keywords: ['merci', 'thanks', 'top', 'super'], text: 'Avec plaisir {name} ! Bon courage pour la suite.' }
  ];
  const chatFallback = [
    'Intéressant ! Tu peux préciser un peu, {name} ?',
    'Je suis d\'accord. Quelqu\'un d\'autre a un avis ?',
    'Bonne idée {name}, je n\'y avais pas pensé.'
  ];
  const demoAccounts = [
    { label: 'Étudiante · Salma', email: 'salma.benali@etu.encg-casablanca.demo', password: 'Demo2026!', role: 'student' },
    { label: 'Étudiant abonné Stay · Omar', email: 'omar.tazi@etu.encg-settat.demo', password: 'Demo2026!', role: 'student' },
    { label: 'Tuteur · Yassine', email: 'yassine.amrani@etu.encg-casablanca.demo', password: 'Demo2026!', role: 'tutor' },
    { label: 'Tutrice · Lina', email: 'lina.elfassi@etu.encg-fes.demo', password: 'Demo2026!', role: 'tutor' },
    { label: 'Tuteur en attente · Adam', email: 'adam.idrissi@etu.encg-tanger.demo', password: 'Demo2026!', role: 'tutor' },
    { label: 'Administration', email: 'admin@ontrack.demo', password: 'Admin2026!', role: 'admin' }
  ];
  const api = { seed, moroccoInstant, moroccoDay, constants, trackGroupsFor, tracksFor, demoAccounts, chatReplies, chatFallback };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OntrackData = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
