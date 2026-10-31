(function (root) {
  'use strict';
  // Assistant ONTRACK : chatbot simulé à règles, sans réseau ni intelligence artificielle.
  // answer(text, { state, user, t }) choisit une intention par mots-clés pondérés (français et anglais),
  // puis compose une réponse à partir de l'état courant : un tarif modifié par l'administration est repris tel quel.
  // Seules les données de l'utilisateur connecté sont citées ; les liens proviennent de la liste fixe ROUTES.
  const isNode = typeof module !== 'undefined' && module.exports;
  const MAX_LENGTH = 300;
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const fill = (text, params) => params ? text.replace(/\{(\w+)\}/g, (match, name) => has(params, name) ? String(params[name]) : match) : text;
  // Sous Node, t remplace simplement les {paramètres} ; le navigateur passe O.i18n.t (langue active).
  const plainT = (key, params) => fill(key, params);

  // Routes internes autorisées dans les réponses : clé = href, valeur = libellé (clé de traduction).
  const ROUTES = {
    '#accueil/offres': 'Voir les tarifs',
    '#reserver': 'Réserver une séance',
    '#catalogue': 'Voir les tuteurs',
    '#orientation': 'Explorer l\'orientation',
    '#inscription': 'Créer mon compte',
    '#inscription-tuteur': 'Devenir tuteur',
    '#connexion': 'Se connecter',
    '#mot-de-passe-oublie': 'Mot de passe oublié',
    '#boite-mail': 'Boîte mail simulée',
    '#pods': 'Découvrir les Study Pods',
    '#confidentialite': 'Politique de confidentialité',
    '#cgu': 'Conditions d\'utilisation',
    '#contact': 'Contact et assistance',
    '#presentation': 'Présentation du projet',
    '#presentation/encadrement': 'Encadrement académique',
    '#etudiant/forfaits': 'Mes forfaits',
    '#etudiant/seances': 'Mes séances',
    '#etudiant/progression': 'Ma progression',
    '#etudiant/comptes-rendus': 'Mes comptes rendus',
    '#etudiant/profil': 'Mon profil',
    '#tuteur/apercu': 'Mon espace tuteur',
    '#tuteur/seances': 'Mes séances à animer'
  };

  // Minuscules, accents retirés (NFD), ponctuation et symboles remplacés par des espaces.
  function normalize(text) {
    return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  const tokensOf = text => normalize(text).split(' ').filter(Boolean);
  // Mot-clé : mot exact, expression de plusieurs mots, ou radical terminé par « * » (début de mot).
  function matches(key, query) {
    if (key.endsWith('*')) {
      const stem = key.slice(0, -1);
      return stem.includes(' ') ? query.padded.includes(` ${stem}`) : query.tokens.some(token => token.startsWith(stem));
    }
    return query.padded.includes(` ${key} `);
  }

  // Destinations citées dans la question (nom, ville ou identifiant de l'établissement, ou pays).
  const STOP = new Set(['universite', 'university', 'universitat', 'school', 'business', 'sciences', 'science', 'applied', 'ecole', 'gestion', 'management', 'des', 'les', 'and', 'the', 'mobilite', 'echange', 'international', 'internationale', 'institut', 'institute', 'college', 'faculte', 'faculty']);
  const COUNTRY_ALIASES = { belgium: 'belgique', germany: 'allemagne', finland: 'finlande', china: 'chine', spain: 'espagne', italy: 'italie' };
  function mentionedPrograms(state, query) {
    const programs = (state.programs || []).filter(program => program.active);
    const words = new Set(query.tokens.map(token => COUNTRY_ALIASES[token] || token));
    return programs.filter(program => {
      const names = tokensOf(`${program.institution} ${program.city || ''} ${String(program.id).replace(/-/g, ' ')}`).filter(token => token.length >= 3 && !STOP.has(token));
      const country = normalize(program.country);
      return names.some(token => words.has(token)) || Boolean(country && (words.has(country) || query.padded.includes(` ${country} `)));
    });
  }
  const mentionedLevel = (state, query, data) => {
    const levels = (state.levels && state.levels.length ? state.levels : data.constants.levels).map(level => level.toLowerCase());
    const token = query.tokens.find(item => /^s\d{1,2}$/.test(item) && levels.includes(item));
    return token ? token.toUpperCase() : null;
  };

  // Sigles de filières (entre parenthèses dans constants.trackGroups), en minuscules.
  // Exclus : « ci » (« celle-ci », « ci-dessous » donnent le mot « ci » après normalisation) et « ml » (millilitre) ;
  // ces filières restent reconnues par « filière » ou « track ».
  const AMBIGUOUS_ACRONYMS = new Set(['ci', 'ml']);
  const trackAcronyms = data => [...new Set(data.constants.trackGroups.flatMap(group => group.tracks)
    .map(track => (/\(([A-Z]{2,})\)\s*$/.exec(track) || [])[1]).filter(Boolean).map(acronym => acronym.toLowerCase())
    .filter(acronym => !AMBIGUOUS_ACRONYMS.has(acronym)))];

  // Mise en forme (locale fournie par le navigateur ; fr-MA par défaut).
  const time = value => value instanceof Date ? value.getTime() : (typeof value === 'number' ? value : Date.parse(value));
  const moneyFor = ctx => ctx.money || (value => `${new Intl.NumberFormat(ctx.locale || 'fr-MA', { maximumFractionDigits: 2 }).format(value)} DH`);
  const dayFor = ctx => ctx.formatDate || (value => new Intl.DateTimeFormat(ctx.locale || 'fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'long' }).format(new Date(value)));
  const firstName = user => String(user.name || '').split(/\s+/)[0];
  const seatsText = program => (program.seats || []).map(seat => `${seat.label} : ${seat.count}`).join(' · ');
  const student = ctx => ctx.user && ctx.user.role === 'student' ? ctx.user : null;

  // Suggestions proposées sous chaque réponse (questions types, dans la langue active).
  const SUGGESTIONS = {
    pricing: t => t('Combien coûte une séance ?'),
    booking: t => t('Comment réserver un tuteur ?'),
    cancel: t => t('Comment annuler une séance ?'),
    payment: t => t('Mon paiement a échoué, que faire ?'),
    packages: t => t('Combien de crédits me reste-t-il ?'),
    progress: t => t('Comment suivre ma progression ?'),
    orientation: t => t('Quelles destinations à l\'étranger ?'),
    tracks: t => t('Quelles filières existent ?'),
    becomeTutor: t => t('Comment devenir tuteur ?'),
    pods: t => t('Que sont les Study Pods ?'),
    account: t => t('J\'ai oublié mon mot de passe'),
    privacy: t => t('Que faites-vous de mes données personnelles ?'),
    contact: t => t('Comment vous contacter ?'),
    project: t => t('Qui encadre le projet ?')
  };
  const DEFAULT_SUGGESTIONS = ['pricing', 'booking', 'orientation', 'packages'];

  // Table des intentions : ordre = priorité en cas d'égalité de score. Poids : 3 = mot décisif, 1 = indice.
  const INTENTS = [
    {
      id: 'greeting',
      // Intention faible : salutations et remerciements ne l'emportent que si aucune autre intention n'a de score.
      weak: true,
      keys: { bonjour: 2, bonsoir: 2, salut: 2, salam: 2, coucou: 2, hello: 2, hi: 2, hey: 2, merci: 2, thanks: 2, 'thank you': 2, aide: 1, help: 1, 'que sais tu faire': 3, 'what can you do': 3, 'qui es tu': 3, 'who are you': 3 },
      suggestions: ['pricing', 'booking', 'orientation', 'project'],
      reply: ctx => {
        const { t, user } = ctx;
        return { lines: [user ? t('Bonjour {name} !', { name: firstName(user) }) : t('Bonjour !'), t('Je suis l\'assistant ONTRACK. Posez-moi une question sur les tarifs, la réservation, les forfaits, l\'orientation, les filières ou votre compte.'), t('Mes réponses sont préprogrammées et s\'appuient sur les données de la démonstration.')] };
      }
    },
    {
      id: 'pricing',
      keys: { tarif: 3, tarifs: 3, prix: 3, cout: 2, coute: 2, couts: 2, combien: 1, payer: 1, offre: 2, offres: 2, cher: 2, price: 3, prices: 3, pricing: 3, cost: 2, costs: 2, 'how much': 2, offer: 2, offers: 2, fee: 2, fees: 2 },
      suggestions: ['packages', 'booking', 'payment'],
      reply: ctx => {
        const { t, state } = ctx;
        const money = moneyFor(ctx);
        const offers = state.offers || [];
        if (!offers.length) return { lines: [t('Aucune offre n\'est publiée pour le moment.')], links: ['#accueil/offres'] };
        const lines = [t('Tarifs actuels, toutes taxes comprises :')];
        for (const offer of offers) {
          const detail = offer.credits > 1 ? t('{credits} séances de {minutes} min, valables {days} jours', { credits: offer.credits, minutes: offer.minutes, days: offer.days }) : t('une séance de {minutes} min', { minutes: offer.minutes });
          lines.push(t('• {name} : {price} ({detail})', { name: offer.name, price: money(offer.price), detail }));
        }
        lines.push(t('Aucune reconduction automatique.'));
        return { lines, links: ['#accueil/offres'] };
      }
    },
    {
      id: 'booking',
      keys: { 'reserv*': 3, 'besoin d aide': 2, rendez: 2, trouver: 1, tuteur: 1, tuteurs: 1, seance: 1, seances: 1, creneau: 2, creneaux: 2, 'book*': 3, tutor: 1, tutors: 1, session: 1, sessions: 1, slot: 2, slots: 2, appointment: 2, find: 1, 'need help': 2 },
      suggestions: ['pricing', 'cancel', 'becomeTutor'],
      reply: ctx => {
        const { t, state, user } = ctx;
        const approved = (state.tutors || []).filter(tutor => tutor.status === 'approved');
        const subjects = (state.subjects || []).filter(subject => approved.some(tutor => (tutor.subjects || []).includes(subject.id))).map(subject => subject.name);
        const lines = [];
        if (!approved.length) lines.push(t('Aucun tuteur validé n\'est disponible pour le moment.'));
        else lines.push(t('{count} tuteur(s) validé(s) couvrent actuellement : {subjects}.', { count: approved.length, subjects: subjects.join(', ') }));
        lines.push(t('Réservation : choisissez la matière, décrivez votre besoin, puis le service, le tuteur et le créneau ; vous payez ensuite ou utilisez un crédit de forfait.'));
        const links = user && user.role !== 'student' ? ['#catalogue'] : ['#reserver', '#catalogue'];
        if (!user) { lines.push(t('Un compte étudiant vérifié est nécessaire pour réserver.')); links.push('#connexion'); }
        else if (user.role !== 'student') lines.push(t('La réservation est réservée aux comptes étudiants.'));
        return { lines, links };
      }
    },
    {
      id: 'cancel',
      // « Supprimer / delete / remove » + un mot de réservation : annulation (devant « réserver », poids 3).
      boost: (ctx, query) => ['supprim*', 'retir*', 'effac*', 'delet*', 'remov*'].some(key => matches(key, query)) && ['reserv*', 'seance', 'seances', 'creneau', 'book*', 'session', 'sessions', 'slot'].some(key => matches(key, query)) ? 5 : 0,
      keys: { 'annul*': 3, 'reprogramm*': 3, 'deplac*': 2, 'decal*': 2, reporter: 2, modifier: 1, changer: 1, delai: 2, 'cancel*': 3, 'reschedul*': 3, 'move my': 2, change: 1, deadline: 1 },
      suggestions: ['payment', 'booking', 'packages'],
      reply: ctx => {
        const { t, state } = ctx;
        const policy = (state.config && state.config.policy) || {};
        const lines = [
          t('Annulation sans frais jusqu\'à {hours} h avant le début : séance à l\'unité remboursée, crédit de forfait restitué.', { hours: policy.cancelHours }),
          t('Changement de créneau possible jusqu\'à {hours} h avant le début, selon les disponibilités du tuteur.', { hours: policy.rescheduleHours }),
          t('Hors délai ou en cas d\'absence, la séance reste due.')
        ];
        const links = ['#cgu'];
        const me = student(ctx);
        if (me) {
          const now = ctx.now !== undefined ? time(ctx.now) : Date.now();
          const upcoming = (state.bookings || []).filter(booking => booking.studentId === me.id && ['pending', 'confirmed'].includes(booking.status) && time(booking.start) > now).length;
          lines.push(t('Vous avez {count} séance(s) à venir : gérez-les depuis « Mes séances ».', { count: upcoming }));
          links.unshift('#etudiant/seances');
        }
        return { lines, links };
      }
    },
    {
      id: 'payment',
      keys: { paiement: 3, paiements: 3, payer: 2, paye: 1, carte: 2, bancaire: 2, cmi: 3, echec: 2, 'echou*': 2, refuse: 1, 'rembours*': 2, debit: 2, debite: 2, payment: 3, payments: 3, pay: 2, paid: 2, card: 2, failed: 2, fail: 2, declined: 2, 'refund*': 2, charged: 2 },
      suggestions: ['cancel', 'pricing', 'contact'],
      reply: ctx => {
        const { t, state } = ctx;
        const config = state.config || {};
        const policy = config.policy || {};
        const lines = [
          t('Paiement par carte simulé via la passerelle {provider} : aucune donnée bancaire n\'est saisie ni conservée.', { provider: config.provider || 'CMI' }),
          t('Le créneau est retenu {minutes} minutes pendant le paiement ; sans confirmation, il est libéré.', { minutes: policy.holdMinutes }),
          t('En cas d\'échec, aucune somme n\'est débitée : faites un nouvel essai sur le même créneau ou choisissez-en un autre.')
        ];
        const links = [];
        const me = student(ctx);
        if (me) {
          const failed = (state.bookings || []).filter(booking => booking.studentId === me.id && booking.status === 'failed').length;
          if (failed) lines.push(t('Vous avez {count} paiement(s) non abouti(s) dans vos séances.', { count: failed }));
          links.push('#etudiant/seances');
        }
        return { lines, links };
      }
    },
    {
      id: 'packages',
      keys: { forfait: 3, forfaits: 3, 'credit*': 3, 'stay ontrack': 3, abonnement: 2, abonne: 2, restant: 2, restantes: 2, reste: 2, restent: 2, 'package*': 3, subscription: 2, remaining: 2, left: 1, 'exam rescue': 2 },
      suggestions: ['pricing', 'cancel', 'booking'],
      reply: ctx => {
        const { t, state, user } = ctx;
        const money = moneyFor(ctx);
        const day = dayFor(ctx);
        const lines = [];
        const links = [];
        const me = student(ctx);
        if (!user) { lines.push(t('Connectez-vous avec votre compte étudiant pour consulter vos crédits restants.')); links.push('#connexion'); }
        else if (!me) lines.push(t('Les forfaits et leurs crédits concernent uniquement les comptes étudiants.'));
        else {
          const active = (state.packages || []).filter(item => item.studentId === me.id && item.status === 'active');
          if (!active.length) lines.push(t('Vous n\'avez aucun forfait actif pour le moment.'));
          for (const item of active) lines.push(t('Il vous reste {count} séance(s) sur votre forfait {name} ({total} au total), valable jusqu\'au {date}.', { count: item.remaining, name: item.name, total: item.total, date: day(item.expires) }));
          links.push('#etudiant/forfaits');
        }
        const packs = (state.offers || []).filter(offer => offer.credits > 1);
        for (const offer of packs) lines.push(t('• {name} : {credits} séances de {minutes} min pour {price}, valables {days} jours.', { name: offer.name, credits: offer.credits, minutes: offer.minutes, price: money(offer.price), days: offer.days }));
        lines.push(t('Aucune reconduction automatique ; les séances non utilisées à l\'expiration ne sont pas reportées.'));
        links.push('#accueil/offres');
        return { lines, links };
      }
    },
    {
      id: 'progress',
      keys: { progression: 3, progres: 3, 'compte rendu': 3, 'comptes rendus': 3, recapitulatif: 3, bilan: 2, suivi: 2, chapitre: 2, chapitres: 2, 'tableau de bord': 2, 'progress*': 3, report: 2, reports: 2, summary: 2, chapter: 2, chapters: 2, dashboard: 2, 'track my': 2 },
      suggestions: ['booking', 'packages', 'tracks'],
      reply: ctx => {
        const { t, state, user, data } = ctx;
        const statuses = data.constants.chapterStatuses.map(item => t(item.label)).join(', ');
        const lines = [
          t('Après chaque séance, votre tuteur publie un compte rendu et indique le statut des chapitres travaillés : {statuses}.', { statuses }),
          t('La progression d\'une matière est la part de ses chapitres dont le statut n\'est plus « À étudier ».')
        ];
        const links = [];
        const me = student(ctx);
        if (!user) { lines.push(t('Connectez-vous avec votre compte étudiant pour voir votre progression.')); links.push('#connexion'); }
        else if (me) {
          const reports = (state.bookings || []).filter(booking => booking.studentId === me.id && booking.report).length;
          lines.push(t('Vous avez {count} compte(s) rendu(s) disponible(s).', { count: reports }));
          links.push('#etudiant/progression', '#etudiant/comptes-rendus');
        } else if (user.role === 'tutor') { lines.push(t('Tuteur : rédigez le compte rendu depuis vos séances, une fois la séance terminée.')); links.push('#tuteur/seances'); }
        return { lines, links };
      }
    },
    {
      id: 'orientation',
      keys: { orientation: 3, 'destination*': 3, 'mobilit*': 3, echange: 2, echanges: 2, etranger: 3, places: 2, partenaire: 2, partenaires: 2, admission: 2, 'admis*': 2, candidature: 1, international: 1, exchange: 3, abroad: 3, seats: 3, partner: 2, partners: 2, 'study abroad': 2, 'universit*': 1 },
      // Une destination citée par son nom ou son pays oriente vers cette intention.
      boost: (ctx, query) => mentionedPrograms(ctx.state, query).length ? 3 : 0,
      suggestions: ['tracks', 'project', 'contact'],
      reply: (ctx, query) => {
        const { t, state } = ctx;
        const active = (state.programs || []).filter(program => program.active);
        if (!active.length) return { lines: [t('Aucune destination n\'est publiée pour le moment.')], links: ['#orientation'] };
        const cited = mentionedPrograms(state, query);
        const shown = cited.length ? cited : active;
        const lines = [cited.length ? t('Destination(s) correspondant à votre question :') : t('{count} destinations communiquées par l\'ENCG :', { count: active.length })];
        for (const program of shown) {
          const seats = seatsText(program) || t('effectifs non communiqués');
          lines.push(t('• {institution} ({country}) — {seats}', { institution: program.institution, country: program.country, seats }));
        }
        if (cited.length) {
          for (const program of cited) {
            const known = [];
            if (program.minGrade !== null && program.minGrade !== undefined) known.push(t('moyenne minimale {grade}/20', { grade: program.minGrade }));
            if (program.level) known.push(t('niveau minimum {level}', { level: program.level }));
            if (program.tracks && program.tracks.length) known.push(t('filières éligibles : {tracks}', { tracks: program.tracks.join(', ') }));
            if (program.languageReq) known.push(`${program.languageReq.language} ${program.languageReq.level}`);
            if (program.deadline) known.push(t('date limite {date}', { date: dayFor(ctx)(`${program.deadline}T12:00:00Z`) }));
            lines.push(known.length ? t('{institution} : critères communiqués : {criteria}.', { institution: program.institution, criteria: known.join(', ') }) : t('{institution} : critères d\'admission non communiqués, à confirmer auprès du service des relations internationales de votre ENCG.', { institution: program.institution }));
          }
        } else lines.push(t('Critères d\'admission non communiqués : renseignez-vous auprès du service des relations internationales de votre ENCG.'));
        lines.push(t('Effectifs tels que communiqués par l\'ENCG ; les listes ne sont jamais additionnées. Aucune admission n\'est garantie.'));
        return { lines, links: ['#orientation'] };
      }
    },
    {
      id: 'tracks',
      keys: { 'filiere*': 3, specialite: 2, specialisation: 2, 'tronc commun': 3, cycle: 1, semestre: 1, niveau: 1, 'track*': 3, major: 2, majors: 2, specialization: 2, level: 1 },
      // Un niveau (S1 à S10) ou un sigle de filière cité oriente vers cette intention.
      boost: (ctx, query) => (mentionedLevel(ctx.state, query, ctx.data) ? 1 : 0) + (query.tokens.some(token => trackAcronyms(ctx.data).includes(token)) ? 3 : 0),
      suggestions: ['orientation', 'booking', 'project'],
      reply: (ctx, query) => {
        const { t, data } = ctx;
        const me = student(ctx);
        const level = mentionedLevel(ctx.state, query, data);
        const lines = [];
        if (me) lines.push(t('Votre profil : niveau {level}, filière {track}.', { level: me.level, track: me.track }));
        if (level) lines.push(t('Filières proposées au niveau {level} : {tracks}.', { level, tracks: data.tracksFor(level).join(', ') }));
        else for (const group of data.constants.trackGroups) lines.push(t('• {cycle} ({levels}) : {tracks}', { cycle: t(group.cycle), levels: `${group.levels[0]}–${group.levels[group.levels.length - 1]}`, tracks: group.tracks.join(', ') }));
        lines.push(t('Filières établies d\'après les plannings 2025-2026 de l\'ENCG Casablanca ; l\'offre peut varier selon l\'ENCG.'));
        return { lines, links: [] };
      }
    },
    {
      id: 'becomeTutor',
      keys: { devenir: 3, 'postul*': 2, 'recrut*': 2, enseigner: 2, 'donner des cours': 3, tuteur: 1, become: 3, 'apply*': 2, 'teach*': 2, hiring: 2, tutor: 1 },
      suggestions: ['booking', 'contact', 'project'],
      reply: ctx => {
        const { t, user } = ctx;
        const lines = [
          t('Les tuteurs sont des étudiants des ENCG : inscrivez-vous avec votre adresse ENCG officielle et indiquez vos matières, chapitres, services et disponibilités.'),
          t('Votre profil est publié après validation par l\'administration ONTRACK.')
        ];
        const links = ['#inscription-tuteur'];
        if (user && user.role === 'tutor') { lines.push(t('Vous avez déjà un compte tuteur : gérez votre profil depuis votre espace.')); links.unshift('#tuteur/apercu'); }
        return { lines, links };
      }
    },
    {
      id: 'pods',
      keys: { 'pod*': 3, 'study pod*': 2, espace: 1, espaces: 1, salle: 1, local: 1, 'space*': 1, room: 1, rooms: 1 },
      suggestions: ['booking', 'project', 'contact'],
      reply: ctx => {
        const { t, state } = ctx;
        const locations = (state.pods && state.pods.locations) || [];
        const cities = [...new Set(locations.map(item => item.city))];
        const lines = [t('ONTRACK Study Pods : de petits espaces de travail privés près des campus, pour retrouver votre tuteur. Ouverture prévue en phase 3.')];
        if (locations.length) lines.push(t('{count} emplacement(s) à l\'étude : {cities}.', { count: locations.length, cities: cities.join(', ') }));
        lines.push(t('Inscrivez-vous sur la page Study Pods pour être prévenu de l\'ouverture.'));
        return { lines, links: ['#pods'] };
      }
    },
    {
      id: 'account',
      keys: { compte: 2, 'mot de passe': 3, 'inscri*': 2, connexion: 2, connecter: 2, 'verif*': 2, code: 1, identifiant: 2, bloque: 2, account: 2, password: 3, login: 2, 'log in': 2, 'sign up': 2, 'sign in': 2, register: 2, verification: 2, verify: 2, locked: 2 },
      suggestions: ['privacy', 'contact', 'booking'],
      reply: ctx => {
        const { t, state, user } = ctx;
        const policy = (state.config && state.config.policy) || {};
        const lines = [
          t('Inscription avec votre adresse e-mail officielle d\'ENCG, puis saisie du code de vérification reçu dans la boîte mail simulée.'),
          t('Mot de passe oublié : demandez un code de réinitialisation, il arrive dans la boîte mail simulée.'),
          t('Après {attempts} tentatives de connexion échouées, la connexion est bloquée {minutes} minutes.', { attempts: policy.maxAttempts, minutes: policy.lockMinutes })
        ];
        const links = [];
        if (user) {
          lines.push(t('Vous êtes connecté(e) en tant que {name}.', { name: firstName(user) }));
          if (user.role === 'student') links.push('#etudiant/profil');
          else if (user.role === 'tutor') links.push('#tuteur/apercu');
        } else links.push('#connexion', '#inscription');
        links.push('#mot-de-passe-oublie', '#boite-mail');
        return { lines, links };
      }
    },
    {
      id: 'privacy',
      keys: { donnees: 2, personnelles: 2, confidentialite: 3, 'vie privee': 3, rgpd: 3, cndp: 3, cookie: 2, cookies: 2, 'supprim*': 2, privacy: 3, 'personal data': 4, data: 2, gdpr: 3, 'delet*': 2 },
      suggestions: ['account', 'contact', 'project'],
      reply: ctx => {
        const { t } = ctx;
        return {
          lines: [
            t('Démonstration : vos données restent dans le navigateur de cet appareil (stockage local), sans serveur.'),
            t('Cet assistant n\'enregistre ni n\'envoie vos questions : l\'historique disparaît à la fermeture ou au rechargement de l\'onglet.'),
            t('Compte étudiant : vous pouvez le supprimer depuis « Mon profil ».')
          ],
          links: ['#confidentialite']
        };
      }
    },
    {
      id: 'contact',
      keys: { 'contact*': 3, joindre: 2, ecrire: 2, telephone: 2, 'e mail': 1, email: 1, mail: 1, assistance: 2, support: 2, reach: 2, 'get in touch': 3, phone: 2 },
      suggestions: ['account', 'privacy', 'project'],
      reply: ctx => {
        const { t } = ctx;
        return {
          lines: [
            t('Écrivez-nous depuis le formulaire de contact : votre message est transmis à l\'administration ONTRACK (simulation).'),
            t('Adresse : contact@ontrack.example.org (fictive), du lundi au vendredi, de 9 h à 18 h.')
          ],
          links: ['#contact']
        };
      }
    },
    {
      id: 'project',
      keys: { projet: 2, 'encadr*': 3, ouahtita: 4, fatine: 3, soutenance: 2, professeure: 2, 'a propos': 2, presentation: 2, ontrack: 1, project: 2, 'supervis*': 3, professor: 2, about: 1 },
      suggestions: ['orientation', 'tracks', 'contact'],
      reply: ctx => {
        const { t } = ctx;
        return {
          lines: [
            t('ONTRACK est un projet académique de démonstration : tutorat universitaire et orientation pour les étudiants des 12 ENCG du Maroc.'),
            t('Il est encadré par Dr Fatine Ouahtita, professeure à l\'ENCG Casablanca (Université Hassan II de Casablanca).')
          ],
          links: ['#presentation', '#presentation/encadrement']
        };
      }
    }
  ];

  function classify(text, ctx) {
    const normalized = normalize(text);
    const query = { normalized, tokens: normalized.split(' ').filter(Boolean), padded: ` ${normalized} ` };
    let best = null;
    let bestScore = 0;
    let weak = null;
    let weakScore = 0;
    for (const intent of INTENTS) {
      let score = 0;
      for (const [key, weight] of Object.entries(intent.keys)) if (weight && matches(key, query)) score += weight;
      if (intent.boost) score += intent.boost(ctx, query);
      if (intent.weak) { if (score > weakScore) { weak = intent; weakScore = score; } }
      else if (score > bestScore) { best = intent; bestScore = score; }
    }
    return best ? { intent: best, score: bestScore, query } : { intent: weak, score: weakScore, query };
  }

  // Message d'erreur de saisie, ou chaîne vide si la question peut être envoyée.
  function validate(text, translate) {
    const t = translate || plainT;
    const value = typeof text === 'string' ? text.trim() : '';
    return value.length >= 1 && value.length <= MAX_LENGTH ? '' : t('Votre question doit compter entre 1 et {max} caractères.', { max: MAX_LENGTH });
  }
  function link(href, t) {
    if (!has(ROUTES, href)) throw new Error(`Route non autorisée : ${href}`);
    return { href, label: t(ROUTES[href]) };
  }
  function suggestions(ids, t) { return ids.map(id => SUGGESTIONS[id](t)); }
  function defaultSuggestions(t) { return suggestions(DEFAULT_SUGGESTIONS, t || plainT); }

  // Réponse : { intent, text, links: [{ href, label }], suggestions: [] }. Le texte est brut : l'interface l'échappe.
  function answer(text, options) {
    const input = options || {};
    const t = input.t || plainT;
    const ctx = { ...input, t, state: input.state || {}, user: input.user || null, data: input.data || (isNode ? require('./data.js') : root.OntrackData) };
    const problem = validate(text, t);
    if (problem) return { intent: 'invalid', error: true, text: problem, links: [], suggestions: [] };
    const { intent, query } = classify(text, ctx);
    if (!intent) {
      return { intent: 'fallback', text: t('Je n\'ai pas compris votre question. Essayez l\'une de ces suggestions :'), links: [], suggestions: defaultSuggestions(t) };
    }
    const result = intent.reply(ctx, query);
    const links = [...new Set(result.links || [])].map(href => link(href, t));
    return { intent: intent.id, text: result.lines.join('\n'), links, suggestions: suggestions(intent.suggestions, t) };
  }

  const api = { answer, normalize, validate, defaultSuggestions, INTENTS, ROUTES, SUGGESTIONS, MAX_LENGTH };
  if (isNode) module.exports = api;
  else root.OntrackAssistant = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
