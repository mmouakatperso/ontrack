(function (root) {
  'use strict';
  const O = root.Ontrack;
  const u = O.ui;
  const { t, msg, escape, money, date, head, empty, select, field, optional, textarea, checkbox, checks, badge, button } = u;
  const levelRank = (state, level) => state.levels.indexOf(level);
  const decimal = value => O.i18n.get() === 'fr' ? String(value).replace('.', ',') : String(value);

  function offerCards(ctx, compact) {
    const { state } = ctx;
    const catchUp = state.offers.find(offer => offer.id === 'catch');
    const savings = offer => offer.id === 'exam' ? catchUp.price * 3 - offer.price : offer.id === 'stay' ? Math.round(catchUp.price / 90 * 60 * 4) - offer.price : 0;
    return `<div class="grid four offers">${state.offers.map(offer => {
      const saved = savings(offer);
      return `<article class="offer ${offer.id === 'exam' ? 'featured' : ''}"><span class="offer-label">${offer.credits > 1 ? t('FORFAIT') : t('SÉANCE PONCTUELLE')}</span><h3>${escape(offer.name)}</h3><div class="price">${money(offer.price)}</div><p><strong>${escape(u.offerFormat(offer))}</strong> · ${escape(offer.frequency)}</p>${compact ? '' : `<p>${escape(offer.content)}</p><p><small>${t('Objectif : {objective}', { objective: escape(offer.objective) })}</small></p>`}${saved > 0 ? `<p class="saving">${t('Économie : {amount} par rapport aux séances à l\'unité', { amount: money(saved) })}</p>` : ''}<a class="button ${offer.id === 'exam' ? '' : 'secondary'}" href="#reserver" data-action="pick-offer" data-id="${offer.id}">${t('Choisir {name}', { name: escape(offer.name) })}</a></article>`;
    }).join('')}</div>`;
  }
  function tutorCard(ctx, tutor) {
    const { state, store } = ctx;
    const next = store.freeSlots(tutor.id, 'quick').find(slot => !slot.issue);
    return `<article class="tutor-card"><div class="person">${u.avatar(tutor, 64)}<div><h3>${escape(tutor.name)}</h3><p>ENCG ${escape(tutor.encg)} · ${escape(tutor.level)}</p></div></div><p class="tags">${tutor.subjects.map(id => badge(u.subjectName(state, id))).join('')}</p><p class="bio">${escape(tutor.bio)}</p><p class="tags">${tutor.languages.map(language => badge(language, 'gray')).join('')}${tutor.modes.map(mode => badge(mode, 'gray')).join('')}</p><p>${u.rating(store, tutor.id)}</p><p><small>${next ? t('Prochain créneau : {date}', { date: escape(date(next.start)) }) : t('Aucun créneau ouvert actuellement')}</small></p><div class="tutor-bottom"><a class="button small secondary" href="#profil/${escape(tutor.id)}">${t('Voir le profil')}</a><a class="button small" href="#reserver/${escape(tutor.id)}">${t('Réserver')}</a></div></article>`;
  }
  O.publicParts = { offerCards, tutorCard };

  O.action('pick-offer', (ctx, dataset) => { ctx.ui.wizard = { step: 1, offerId: dataset.id }; return { go: 'reserver', message: t('Offre présélectionnée : choisissez votre matière.') }; });
  O.action('pick-subject', (ctx, dataset) => {
    const subject = ctx.state.subjects.find(item => item.id === dataset.id);
    if (!subject || !subject.chapters.length || !ctx.state.tutors.some(tutor => tutor.status === 'approved' && tutor.subjects.includes(subject.id))) throw new Error(t('Aucun tuteur validé ni chapitre disponible pour cette matière.'));
    ctx.ui.wizard = { step: 2, subjectId: dataset.id }; return { go: 'reserver', message: t('Matière présélectionnée : décrivez votre besoin.') }; });

  // 1. Accueil -------------------------------------------------------------
  O.route('accueil', {
    title: () => t('Tutorat universitaire pour les ENCG du Maroc'),
    description: () => t('ONTRACK : tutorat individuel en ligne pour les étudiants des 12 ENCG du Maroc, suivi de progression et portail d\'orientation internationale. Your Study, Our Priority.'),
    after: (ctx, main) => { if (ctx.params[0] === 'offres') { const target = main.querySelector('#offres'); if (target) target.scrollIntoView(); } },
    render: ctx => {
      const { state } = ctx;
      const approved = state.tutors.filter(tutor => tutor.status === 'approved');
      return `<section class="hero entrance"><div class="wrap"><div class="hero-copy"><p class="eyebrow">${t('Le tutorat pensé pour les 12 ENCG du Maroc')}</p><h1>ONTRACK<span>.</span><br>Your Study, Our Priority<span>.</span></h1><p class="lead">${t('Un chapitre qui bloque ? Un cours manqué ? Un examen qui approche ? Avancez avec un tuteur qui connaît votre programme.')}</p><div class="actions"><a class="button" href="#reserver">Find Your Tutor <span aria-hidden="true">↗</span></a><a class="button secondary" href="#inscription">${t('Créer mon compte')}</a></div><div class="hero-proof"><div class="avatar-stack"><img src="assets/yassine.jpg" alt="" width="30" height="30"><img src="assets/lina.jpg" alt="" width="30" height="30"><img src="assets/adam.jpg" alt="" width="30" height="30"></div><span>${t('Des tuteurs issus des ENCG, validés par l\'équipe ONTRACK.')}</span></div></div></div><div class="hero-media"><img src="assets/campus.jpg" alt="${escape(t('Étudiants travaillant ensemble autour de leurs cours'))}" width="1400" height="934"></div></section>
      <section class="wrap section" aria-labelledby="concept"><div class="section-heading"><div><p class="eyebrow">${t('Le concept')}</p><h2 id="concept">${t('Le soutien dont vous avez besoin, au moment où vous en avez besoin.')}</h2></div><p>${t('ONTRACK met en relation les étudiants des ENCG avec des tuteurs maîtrisant les matières enseignées : séances individuelles, comptes rendus et suivi par chapitre.')}</p></div><div class="grid three"><div class="step"><span class="step-number">${t('01 / DÉCRIRE')}</span><h3>${t('Votre besoin précis')}</h3><p>${t('Matière, chapitre, type de difficulté : le système vous propose les tuteurs adaptés.')}</p></div><div class="step"><span class="step-number">${t('02 / RÉSERVER')}</span><h3>${t('Le bon créneau')}</h3><p>${t('Disponibilités réelles en heure marocaine, paiement en ligne, confirmation par e-mail.')}</p></div><div class="step"><span class="step-number">${t('03 / PROGRESSER')}</span><h3>${t('Un suivi concret')}</h3><p>${t('Après chaque séance, un récapitulatif et votre progression par matière.')}</p></div></div></section>
      <section class="tint" id="offres" aria-labelledby="tarifs"><div class="wrap section"><div class="section-heading"><div><p class="eyebrow">${t('Services et tarifs')}</p><h2 id="tarifs">${t('Quatre façons d\'avancer.')}</h2></div><p>${t('Tarifs affichés toutes taxes comprises, sans reconduction automatique. Stay ONTRACK est un forfait de quatre séances par mois, pas un accès illimité.')}</p></div>${offerCards(ctx)}</div></section>
      <section class="wrap section" aria-labelledby="avantages"><div class="section-heading"><div><p class="eyebrow">${t('Les avantages')}</p><h2 id="avantages">${t('Pensé pour le parcours ENCG.')}</h2></div></div><div class="grid four"><div class="feature"><h3>${t('Programmes ENCG')}</h3><p>${t('Matières et chapitres alignés sur les enseignements des ENCG.')}</p></div><div class="feature"><h3>${t('Tuteurs validés')}</h3><p>${t('Chaque profil est vérifié par l\'administration avant publication.')}</p></div><div class="feature"><h3>${t('Flexible')}</h3><p>${t('Séances en ligne de 30 à 90 minutes, du blocage ponctuel à l\'accompagnement mensuel.')}</p></div><div class="feature"><h3>${t('Transparent')}</h3><p>${t('Prix, règles d\'annulation et méthode de calcul de la progression affichés avant paiement.')}</p></div></div></section>
      <section class="tint" aria-labelledby="suivi"><div class="wrap section split"><div><p class="eyebrow">${t('Suivi de progression')}</p><h2 id="suivi">${t('Chaque chapitre compte.')}</h2><p>${t('Après chaque séance, votre tuteur indique les chapitres travaillés et leur statut : à étudier, en cours d\'apprentissage, révisé ou maîtrisé. Votre tableau de bord calcule la part des chapitres travaillés pour chaque matière.')}</p><a class="button secondary" href="#matieres">${t('Voir les matières')}</a></div><div class="summary"><h3>${t('Exemple de tableau')}</h3>${[['Mathématiques appliquées', 25], ['Comptabilité générale', 60], ['Microéconomie', 40]].map(([name, value]) => `<p class="progress-label"><span>${escape(name)}</span><strong>${t('{value} %', { value })}</strong></p>${u.progressBar(value, name)}`).join('')}<p><small>${t('Indicateur de suivi pédagogique, pas une garantie de maîtrise.')}</small></p></div></div></section>
      <section class="wrap section" aria-labelledby="tuteurs"><div class="section-heading"><div><p class="eyebrow">${t('Ils vous aident à garder le cap')}</p><h2 id="tuteurs">${t('Des tuteurs issus des ENCG.')}</h2></div><a class="button secondary" href="#catalogue">${t('Tous les tuteurs')}</a></div><div class="grid two">${approved.slice(0, 2).map(tutor => tutorCard(ctx, tutor)).join('')}</div><p class="muted"><small>${t('Profils fictifs de démonstration. Photos illustratives publiées avec consentement simulé.')}</small></p></section>
      <section class="tint" aria-labelledby="orientation-apercu"><div class="wrap section split"><div><p class="eyebrow">${t('Portail d\'orientation')}</p><h2 id="orientation-apercu">${t('Et après, quel sera votre cap ?')}</h2><p>${t('Destinations d\'échange communiquées par l\'ENCG : renseignez votre profil, découvrez les destinations potentiellement adaptées et les effectifs communiqués ; les critères d\'admission sont à confirmer auprès de l\'ENCG.')}</p><a class="button secondary" href="#orientation">${t('Explorer l\'orientation')}</a></div><div class="summary"><h3>${t('{count} destinations communiquées par l\'ENCG', { count: state.programs.filter(program => program.active).length })}</h3><p>${[...new Set(state.programs.filter(program => program.active).map(program => program.country))].map(escape).join(' · ')}</p><p><small>${t('Aucune recommandation ne garantit une admission.')}</small></p></div></div></section>
      <section class="wrap section split" aria-labelledby="pods-apercu"><div><img class="pods-image" src="assets/pods.jpg" alt="${escape(t('Espace de travail calme et lumineux'))}" width="1400" height="934" loading="lazy"></div><div><span class="badge violet">Coming Soon</span><h2 id="pods-apercu">ONTRACK Study Pods</h2><p>${t('De petits espaces privés près des campus pour retrouver votre tuteur dans un lieu adapté au travail. Ouverture prévue en phase 3.')}</p><a class="button secondary" href="#pods">${t('Découvrir le concept')}</a></div></section>`;
    }
  });

  // 2. Présentation ---------------------------------------------------------
  O.route('presentation', {
    title: () => t('Présentation d\'ONTRACK'),
    description: () => t('Concept, objectifs, fonctionnement et encadrement académique d\'ONTRACK, plateforme de tutorat universitaire et d\'orientation académique des ENCG.'),
    after: (ctx, main) => { if (ctx.params[0] === 'encadrement') { const target = main.querySelector('#encadrement'); if (target) target.scrollIntoView(); } },
    render: ctx => head(t('Présentation'), 'Your Study, Our Priority.', t('Une plateforme dédiée exclusivement aux étudiants des 12 ENCG du Maroc.')) + `<div class="wrap section prose"><h2>${t('Pourquoi ONTRACK ?')}</h2><p>${t('Chapitres incompris, cours manqués, accumulation de travail, manque de temps pour chercher de l\'aide, préparation insuffisante aux examens : ONTRACK propose des séances individuelles adaptées à chaque étudiant, avec un suivi de progression par matière et par chapitre.')}</p><h2>${t('Nos objectifs')}</h2><ul><li>${t('Faciliter l\'accès à un soutien adapté aux programmes des ENCG.')}</li><li>${t('Mettre en relation les étudiants avec des tuteurs issus des différentes ENCG.')}</li><li>${t('Proposer des séances flexibles, accessibles en ligne.')}</li><li>${t('Permettre à chacun de suivre sa progression académique.')}</li><li>${t('Proposer des formules adaptées à différents budgets.')}</li><li>${t('Faciliter l\'accès aux informations sur les échanges et la double diplomation.')}</li><li>${t('Développer progressivement un réseau d\'espaces d\'étude physiques.')}</li></ul><section class="supervisor" aria-labelledby="encadrement"><div class="monogram" aria-hidden="true">FO</div><div><h2 id="encadrement">${t('Encadrement académique')}</h2><h3>Dr Fatine Ouahtita</h3><p>${t('Professeure à l\'École Nationale de Commerce et de Gestion de Casablanca (Université Hassan II de Casablanca), rattachée au Laboratoire de recherche prospective en économie et gestion.')}</p><p>${t('<strong>Domaines :</strong> marketing digital, marketing d\'influence, communication de marque, digitalisation et durabilité.')}</p><p>${t('<strong>Publications récentes :</strong>')}</p><ul><li>${t('« {title} », {journal}, vol. {volume}, n° {issue}, {year} (co-autrice).', { title: 'Engagement Is Not Enough: Unlocking Purchase Intention Through Value and Trust in Social Media Influencers', journal: 'IJSRM', volume: 14, issue: 4, year: 2026 })}</li><li>${t('« {title} », {year} (co-autrice).', { title: 'Unveiling the Eco-Digital Nexus: a systematic review', year: 2025 })}</li></ul><p>${t('Elle encadre le projet ONTRACK, ainsi que d\'autres projets étudiants en marketing et des travaux doctoraux à l\'ENCG Casablanca.')}</p></div></section><h2>${t('Trois profils, trois espaces')}</h2><p>${t('<strong>Étudiants</strong> : compte vérifié par l\'adresse universitaire, recherche, réservation, paiement, historique, comptes rendus, progression, orientation.')} ${t('<strong>Tuteurs</strong> : profil validé par l\'administration, disponibilités, réservations, comptes rendus, avis, rémunération.')} ${t('<strong>Administration</strong> : comptes, référentiel, tarifs, paiements, rémunérations, modération, orientation, Study Pods et statistiques.')}</p><h2>${t('Programme pilote volontaire')}</h2><p>${t('Au lancement, ONTRACK fonctionne avec un groupe limité de tuteurs volontaires (programme pilote d\'environ 10 à 20 séances). Le caractère volontaire est explicite : la participation ne donne droit à aucune rémunération future garantie. La phase de rémunération par séance est activable par l\'administration ; la grille appliquée figure dans les conditions d\'utilisation.')}</p><h2>${t('Feuille de route')}</h2><ol><li>${t('<strong>Phase 1 — MVP :</strong> inscription vérifiée, catalogue, réservation, paiement, comptes rendus, progression, administration.')}</li><li>${t('<strong>Phase 2 :</strong> portail d\'orientation, recommandations, entretiens avec un conseiller.')}</li><li>${t('<strong>Phase 3 :</strong> Study Pods (lieux, réservations, QR codes) — Coming Soon.')}</li></ol><div class="actions"><a class="button" href="#reserver">Find Your Tutor</a><a class="button secondary" href="#inscription-tuteur">${t('Devenir tuteur')}</a></div></div>`
  });

  // 3. Connexion, inscription, vérification -----------------------------------
  O.route('connexion', {
    title: () => t('Connexion'),
    description: () => t('Connectez-vous à votre espace ONTRACK étudiant, tuteur ou administrateur.'),
    private: true,
    render: ctx => {
      const accounts = ctx.data.demoAccounts;
      const policy = ctx.state.config.policy;
      const current = ctx.user ? `<div class="notice">${t('Connecté en tant que <strong>{name}</strong>. <a href="{href}">Ouvrir mon espace</a> ou choisissez un autre compte ci-dessous.', { name: escape(ctx.user.name), href: ctx.spaces[ctx.user.role] })}</div>` : '';
      return head(t('Connexion'), t('Heureux de vous revoir.'), t('Accédez à votre espace avec votre adresse e-mail et votre mot de passe.')) + `<div class="wrap section split"><form data-form="login" class="form-stack" novalidate>${current}<h2>${t('Se connecter')}</h2>${field(t('Adresse e-mail'), 'email', ctx.ui.pendingEmail || '', 'email', 'autocomplete="username" maxlength="120"')}${field(t('Mot de passe'), 'password', '', 'password', 'autocomplete="current-password" maxlength="72"')}<button class="button" type="submit">${t('Se connecter')}</button><p>${t('<a href="#mot-de-passe-oublie">Mot de passe oublié ?</a> · <a href="#verification">Vérifier mon adresse</a>')}</p><p>${t('Pas encore de compte ? <a href="#inscription">Inscription étudiant</a> · <a href="#inscription-tuteur">Devenir tuteur</a>')}</p><p class="muted"><small>${t('Après {attempts} échecs consécutifs, la connexion est bloquée {minutes} minutes. Session fermée après {hours} h d\'inactivité.', { attempts: policy.maxAttempts, minutes: policy.lockMinutes, hours: policy.sessionHours })}</small></p></form><aside class="summary"><h2>${t('Connexion rapide · soutenance')}</h2><p>${t('Comptes de démonstration (mots de passe hachés SHA-256 + sel, comme les comptes créés).')}</p><div class="quick-logins">${accounts.map((account, index) => `<button type="button" class="button small secondary" data-action="quick-login" data-id="${index}">${escape(t(account.label))}</button>`).join('')}</div><dl>${accounts.map(account => `<dt>${escape(t(account.label))}</dt><dd><code>${escape(account.email)}</code> · <code>${escape(account.password)}</code></dd>`).join('')}</dl></aside></div>`;
    }
  });
  function afterLogin(ctx, result) {
    const wanted = ctx.ui.returnTo && ctx.ui.returnTo !== '#connexion' ? ctx.ui.returnTo.slice(1) : '';
    const route = O.routes[wanted.split('/')[0]];
    const target = wanted && route && !O.access(route, { role: result.role }).redirect ? wanted : ctx.spaces[result.role].slice(1);
    ctx.ui.returnTo = '';
    return { go: target, message: t('Bienvenue {name}. Connexion réussie.', { name: result.name }) };
  }
  function login(ctx, email, password) {
    const result = ctx.store.login(email, password);
    if (!result.ok) {
      if (result.unverified) { ctx.ui.pendingEmail = String(email).trim().toLowerCase(); return { go: 'verification', message: result.error, error: true }; }
      throw new Error(result.error);
    }
    return afterLogin(ctx, result);
  }
  O.form('login', (ctx, values) => login(ctx, values.email, values.password));
  O.action('quick-login', (ctx, dataset) => {
    const account = ctx.data.demoAccounts[Number(dataset.id)];
    if (ctx.user) ctx.store.logout();
    return login(ctx, account.email, account.password);
  });

  const domainHint = (ctx, encg) => (ctx.state.config.domains[encg] || []).map(item => `@${item}`).join(', ');
  function identityFields(ctx, values, student) {
    const v = values || {};
    return `${field(t('Nom et prénom'), 'name', v.name || '', 'text', 'maxlength="80" autocomplete="name"')}${select(t('Votre ENCG'), 'encg', ctx.state.encgs, v.encg, null, 'data-change="encg-hint"')}<p class="hint domain-hint" aria-live="polite">${t('Domaine autorisé : {domains}', { domains: escape(domainHint(ctx, v.encg || ctx.state.encgs[0])) })}</p>${field(t('Adresse e-mail officielle de votre ENCG'), 'email', v.email || '', 'email', 'maxlength="120" autocomplete="email"')}${select(t('Niveau d\'études'), 'level', ctx.state.levels, v.level, null, student ? 'data-change="level-tracks"' : '')}`;
  }
  O.change('encg-hint', (ctx, element) => {
    const hint = element.form.querySelector('.domain-hint');
    if (hint) hint.textContent = t('Domaine autorisé : {domains}', { domains: domainHint(ctx, element.value) });
  });
  // Reconstruit la liste des filières selon le niveau choisi (inscription, profil, orientation).
  O.change('level-tracks', (ctx, element) => {
    const track = element.form && element.form.elements.track;
    if (!track) return;
    const groups = u.trackGroups(element.value);
    const previous = groups.some(group => group.values.includes(track.value)) ? track.value : '';
    // Filière précédente non proposée : option vide sélectionnée, le select requis impose un choix explicite.
    track.innerHTML = (previous ? '' : `<option value="" selected>${u.escape(t('Choisissez votre filière'))}</option>`) + u.groupOptions(groups, previous);
  });
  const passwordFields = () => `${field(t('Mot de passe'), 'password', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}${field(t('Confirmer le mot de passe'), 'confirm', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}<p class="hint">${t('8 caractères minimum, avec au moins une lettre et un chiffre. N\'utilisez jamais votre mot de passe universitaire ni votre numéro Apogée.')}</p>`;
  const consentField = () => `<label class="check"><input type="checkbox" name="consent" required> <span>${t('J\'accepte les <a href="#cgu">conditions d\'utilisation</a> et la <a href="#confidentialite">politique de confidentialité</a>.')}</span></label>`;
  O.route('inscription', {
    title: () => t('Inscription étudiant'),
    description: () => t('Créez votre compte ONTRACK avec l\'adresse e-mail officielle de votre ENCG.'),
    render: ctx => head(t('Inscription étudiant'), t('Votre parcours commence ici.'), t('L\'accès est réservé aux étudiants des 12 ENCG : votre adresse universitaire sert de première vérification.')) + `<div class="wrap section split"><form data-form="register" class="form-stack" novalidate><h2>${t('Créer mon compte')}</h2>${identityFields(ctx, {}, true)}${u.groupedSelect(t('Filière ou spécialité'), 'track', u.trackGroups(ctx.state.levels[0]))}${u.trackNote()}${passwordFields()}${consentField()}<button class="button" type="submit">${t('Créer mon compte et recevoir le code')}</button><p>${t('Vous êtes tuteur ? <a href="#inscription-tuteur">Créer un profil tuteur</a>')}</p></form><aside class="summary"><h2>${t('Comment ça marche ?')}</h2><ol><li>${t('Sélectionnez votre ENCG.')}</li><li>${t('Saisissez votre adresse e-mail universitaire.')}</li><li>${t('Nous vérifions que son domaine est autorisé pour cette école.')}</li><li>${t('Un code de vérification vous est envoyé.')}</li><li>${t('Vous confirmez votre adresse.')}</li><li>${t('Votre compte est activé.')}</li></ol><p class="notice">${t('Démonstration : les e-mails arrivent dans la <a href="#boite-mail">boîte mail simulée</a>. Les domaines <code>etu.encg-&lt;ville&gt;.demo</code> sont fictifs et configurables par l\'administration.')}</p></aside></div>`
  });
  function checkPasswords(values) { if (values.password !== values.confirm) throw new Error(t('Les deux mots de passe ne correspondent pas.')); }
  O.form('register', (ctx, values) => {
    checkPasswords(values);
    const result = ctx.store.register({ ...values, consent: values.consent === 'on' });
    ctx.ui.pendingEmail = result.email; ctx.ui.mailbox = result.email;
    return { go: 'verification', message: t('Compte créé : un code de vérification a été envoyé à votre adresse universitaire.') };
  });
  O.route('inscription-tuteur', {
    title: () => t('Devenir tuteur'),
    description: () => t('Créez votre profil de tuteur ONTRACK : matières, chapitres maîtrisés, langues et types de séances. Profil publié après validation.'),
    render: ctx => {
      const { state, data } = ctx;
      return head(t('Devenir tuteur'), t('Partagez le savoir. Faites la différence.'), t('Votre profil sera publié après vérification de votre adresse et validation par l\'administration.')) + `<div class="wrap section"><form data-form="register-tutor" class="form-grid" novalidate><div class="form-stack"><h2>${t('Identité et accès')}</h2>${identityFields(ctx, {})}${passwordFields()}</div><div class="form-stack"><h2>${t('Profil public')}</h2>${textarea(t('Description personnelle'), 'bio', '', 'minlength="10" maxlength="600" required')}${checks(t('Langues d\'enseignement'), 'languages', data.constants.languages, ['Français'])}${checks(t('Modes de séance'), 'modes', data.constants.modes, ['En ligne'])}${checks(t('Types de séances proposés'), 'services', state.offers.map(offer => ({ value: offer.id, label: `${offer.name} (${u.offerFormat(offer)})` })), state.offers.map(offer => offer.id))}${checkbox(t('J\'autorise la publication de ma photo de profil'), 'photoConsent', false)}<p class="hint">${t('Démonstration : aucune photo n\'est téléversée ni stockée ; des initiales s\'affichent.')}</p>${optional(t('Âge'), 'age', '', 'number', 'min="17" max="80"')}${checkbox(t('Afficher mon âge sur mon profil'), 'showAge', false)}</div><div class="full form-stack"><h2>${t('Matières et chapitres maîtrisés')}</h2>${state.subjects.map(subject => `<fieldset><legend>${escape(subject.name)} · ${escape(subject.level)}</legend><label class="check"><input type="checkbox" name="subjects" value="${escape(subject.id)}"> <span><strong>${t('J\'enseigne cette matière')}</strong></span></label><div class="check-grid">${subject.chapters.map(chapter => `<label class="check"><input type="checkbox" name="chapters" value="${escape(chapter.id)}"> <span>${escape(chapter.name)}</span></label>`).join('')}</div></fieldset>`).join('')}<p class="notice">${t('Programme pilote : pendant la phase de lancement, le tutorat est volontaire. Il ne donne pas droit à une rémunération future garantie ; les éventuels frais convenus à l\'avance sont remboursés.')}</p>${consentField()}<button class="button" type="submit">${t('Soumettre mon profil')}</button></div></form></div>`;
    }
  });
  O.form('register-tutor', (ctx, values, form) => {
    checkPasswords(values);
    const data = new FormData(form);
    const result = ctx.store.registerTutor({ ...values, subjects: data.getAll('subjects'), chapters: data.getAll('chapters'), languages: data.getAll('languages'), modes: data.getAll('modes'), services: data.getAll('services'), photoConsent: values.photoConsent === 'on', showAge: values.showAge === 'on', consent: values.consent === 'on' });
    ctx.ui.pendingEmail = result.email; ctx.ui.mailbox = result.email;
    return { go: 'verification', message: t('Profil créé : vérifiez votre adresse avec le code reçu. Il sera ensuite soumis à validation.') };
  });
  O.route('verification', {
    title: () => t('Vérification de l\'adresse e-mail'),
    description: () => t('Confirmez votre adresse e-mail universitaire avec le code reçu.'),
    private: true,
    render: ctx => head(t('Vérification'), t('Confirmez votre adresse universitaire.'), t('Saisissez le code à 6 chiffres reçu par e-mail. Il expire dans 30 minutes.')) + `<div class="wrap section split"><form data-form="verify" class="form-stack" novalidate>${field(t('Adresse e-mail'), 'email', ctx.ui.pendingEmail || '', 'email', 'maxlength="120" autocomplete="email"')}${field(t('Code de vérification'), 'code', '', 'text', 'inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code"')}<button class="button" type="submit">${t('Vérifier et activer mon compte')}</button><button class="button secondary" type="button" data-action="resend-code">${t('Renvoyer un code')}</button><p><a href="#boite-mail">${t('Ouvrir la boîte mail simulée')}</a></p></form><aside class="summary"><h2>${t('Ce que vérifie ONTRACK')}</h2><p>${t('La vérification prouve que vous accédez à la boîte de réception de votre ENCG. Elle ne garantit pas à elle seule votre inscription actuelle dans l\'établissement ; une intégration avec les systèmes universitaires pourra être étudiée avec leur autorisation.')}</p><p><strong>${t('Aucun mot de passe universitaire ni numéro Apogée n\'est demandé.')}</strong></p></aside></div>`
  });
  O.form('verify', (ctx, values) => {
    const result = ctx.store.verifyEmail(values.email, values.code);
    if (!result.ok) throw new Error(result.error);
    ctx.ui.pendingEmail = '';
    return { go: ctx.spaces[result.role].slice(1), message: result.role === 'tutor' ? t('Adresse vérifiée. Votre profil tuteur est en attente de validation par l\'administration.') : t('Adresse vérifiée : votre compte est activé. Bienvenue sur ONTRACK !') };
  });
  O.action('resend-code', (ctx, dataset, element) => {
    const email = element.form.elements.email.value;
    ctx.ui.pendingEmail = email.trim().toLowerCase();
    return ctx.store.resendCode(email).message;
  });
  O.route('mot-de-passe-oublie', {
    title: () => t('Mot de passe oublié'),
    description: () => t('Réinitialisez votre mot de passe ONTRACK avec un code envoyé par e-mail.'),
    private: true,
    render: ctx => head(t('Récupération du mot de passe'), t('Un nouveau départ, en deux étapes.'), t('Recevez un code par e-mail, puis choisissez un nouveau mot de passe.')) + `<div class="wrap section split"><form data-form="reset-request" class="form-stack" novalidate><h2>${t('1. Recevoir un code')}</h2>${field(t('Adresse e-mail du compte'), 'email', ctx.ui.resetEmail || '', 'email', 'maxlength="120" autocomplete="email"')}<button class="button" type="submit">${t('Envoyer le code')}</button><p class="hint">${t('Par sécurité, le message affiché est identique que le compte existe ou non.')}</p></form><form data-form="reset-confirm" class="form-stack" novalidate><h2>${t('2. Nouveau mot de passe')}</h2>${field(t('Adresse e-mail'), 'email', ctx.ui.resetEmail || '', 'email', 'maxlength="120"')}${field(t('Code reçu'), 'code', '', 'text', 'inputmode="numeric" maxlength="6" autocomplete="one-time-code"')}${passwordFields()}<button class="button" type="submit">${t('Changer mon mot de passe')}</button></form></div>`
  });
  O.form('reset-request', (ctx, values) => { ctx.ui.resetEmail = String(values.email).trim().toLowerCase(); ctx.ui.mailbox = ctx.ui.resetEmail; return ctx.store.requestReset(values.email).message; });
  O.form('reset-confirm', (ctx, values) => {
    checkPasswords(values);
    const result = ctx.store.confirmReset(values.email, values.code, values.password);
    if (!result.ok) throw new Error(result.error);
    ctx.ui.pendingEmail = String(values.email).trim().toLowerCase();
    return { go: 'connexion', message: t('Mot de passe modifié. Toutes les sessions ont été fermées : connectez-vous.') };
  });

  // 5. Catalogue des matières ------------------------------------------------
  O.route('matieres', {
    title: ctx => ctx.params[0] ? u.subjectName(ctx.state, ctx.params[0]) : t('Catalogue des matières'),
    description: () => t('Les matières, niveaux et chapitres couverts par les tuteurs ONTRACK dans les ENCG.'),
    render: ctx => {
      const { state } = ctx;
      const tutorsFor = subjectId => state.tutors.filter(tutor => tutor.status === 'approved' && tutor.subjects.includes(subjectId));
      const subject = state.subjects.find(item => item.id === ctx.params[0]);
      if (subject) {
        const tutors = tutorsFor(subject.id);
        return head(t('Matière · {level}', { level: subject.level }), subject.name, t('{chapters} chapitres · {tutors} tuteur(s) disponible(s).', { chapters: subject.chapters.length, tutors: tutors.length })) + `<div class="wrap section split"><div><h2>${t('Chapitres')}</h2><ol class="chapter-list">${subject.chapters.map(chapter => `<li><span>${escape(chapter.name)}</span><span>${t('{count} tuteur(s)', { count: tutors.filter(tutor => tutor.chapters.includes(chapter.id)).length })}</span></li>`).join('')}</ol><div class="actions">${tutors.length && subject.chapters.length ? `<button type="button" class="button" data-action="pick-subject" data-id="${escape(subject.id)}">${t('Réserver dans cette matière')}</button>` : ''}<a class="button secondary" href="#matieres">${t('Toutes les matières')}</a></div></div><div><h2>${t('Tuteurs')}</h2>${tutors.map(tutor => O.publicParts.tutorCard(ctx, tutor)).join('') || empty(t('Aucun tuteur validé'), t('Les profils en attente de validation n\'apparaissent pas encore.'))}</div></div>`;
      }
      const filter = ctx.ui.subjectFilter || '';
      const list = state.subjects.filter(item => !filter || item.level === filter);
      return head(t('Catalogue des matières'), t('Toutes les matières, chapitre par chapitre.'), t('Le référentiel est géré par l\'administration ONTRACK.')) + `<div class="wrap section"><form data-form="subject-filter" class="inline-form">${select(t('Niveau'), 'level', state.levels, filter, t('Tous les niveaux'))}<button class="button small" type="submit">${t('Filtrer')}</button></form><div class="grid three">${list.map(item => `<article class="subject-card"><span class="badge gray">${escape(item.level)}</span><h2>${escape(item.name)}</h2><p>${item.chapters.map(chapter => escape(chapter.name)).join(' · ')}</p><p><small>${t('{count} tuteur(s) validé(s)', { count: tutorsFor(item.id).length })}</small></p><a class="button small secondary" href="#matieres/${escape(item.id)}">${t('Voir la matière')}</a></article>`).join('') || empty(t('Aucune matière'), t('Aucune matière pour ce niveau.'))}</div></div>`;
    }
  });
  O.form('subject-filter', (ctx, values) => { ctx.ui.subjectFilter = values.level; return { go: 'matieres', message: t('Filtre appliqué.') }; });

  // 6. Catalogue et profils des tuteurs ---------------------------------------
  O.route('catalogue', {
    title: () => t('Catalogue des tuteurs'),
    description: () => t('Trouvez un tuteur ONTRACK par matière, chapitre, ENCG, niveau, disponibilité, langue, note et mode de séance.'),
    render: ctx => {
      const { state, store, data } = ctx;
      const f = ctx.ui.filters;
      const approved = state.tutors.filter(tutor => tutor.status === 'approved');
      const matches = approved.filter(tutor => {
        if (f.subject && !tutor.subjects.includes(f.subject)) return false;
        if (f.chapter && !tutor.chapters.includes(f.chapter)) return false;
        if (f.encg && tutor.encg !== f.encg) return false;
        if (f.level && levelRank(state, tutor.level) < levelRank(state, f.level)) return false;
        if (f.language && !tutor.languages.includes(f.language)) return false;
        if (f.mode && !tutor.modes.includes(f.mode)) return false;
        if (f.rating) { const value = store.tutorRating(tutor.id).average; if (!value || value < Number(f.rating)) return false; }
        if (f.availability && !store.freeSlots(tutor.id, 'quick').some(slot => !slot.issue && ctx.data.moroccoDay(slot.start) === f.availability)) return false;
        return true;
      });
      const chapterOptions = state.subjects.filter(subject => !f.subject || subject.id === f.subject).flatMap(subject => subject.chapters.map(chapter => ({ value: chapter.id, label: `${subject.name} — ${chapter.name}` })));
      return head(t('Catalogue des tuteurs'), t('Trouvez votre prochain déclic.'), t('Profils validés par l\'administration. Horaires en heure marocaine (Africa/Casablanca).')) + `<div class="wrap workspace"><aside class="filters"><h2>${t('Affiner la recherche')}</h2><form data-form="filters" class="form-stack">${select(t('Matière'), 'subject', state.subjects.map(subject => ({ value: subject.id, label: subject.name })), f.subject, t('Toutes les matières'))}${select(t('Chapitre'), 'chapter', chapterOptions, f.chapter, t('Tous les chapitres'))}${select('ENCG', 'encg', state.encgs, f.encg, t('Toutes les ENCG'))}${select(t('Niveau d\'études du tuteur (minimum)'), 'level', state.levels, f.level, t('Tous les niveaux'))}${select(t('Langue'), 'language', data.constants.languages, f.language, t('Toutes les langues'))}${select(t('Mode'), 'mode', data.constants.modes, f.mode, t('Tous les modes'))}${select(t('Note minimum'), 'rating', [{ value: '4', label: t('4 / 5 et plus') }, { value: '4.5', label: t('4,5 / 5 et plus') }], f.rating, t('Toutes les notes'))}<label>${t('Disponible le (heure marocaine)')}<input type="date" name="availability" value="${escape(f.availability)}"></label><button type="submit" class="button">${t('Rechercher')}</button>${button(t('Effacer les filtres'), 'clear-filters', '')}</form></aside><section aria-label="${escape(t('Résultats'))}"><div class="results-top"><strong>${matches.length > 1 ? t('{count} tuteurs', { count: matches.length }) : t('{count} tuteur', { count: matches.length })}</strong><span class="muted">${t('À partir de {price}', { price: money(Math.min(...state.offers.map(offer => offer.price))) })}</span></div><div class="catalogue-grid">${matches.map(tutor => tutorCard(ctx, tutor)).join('')}</div>${matches.length ? '' : empty(t('Aucun profil correspondant'), t('Essayez une autre matière, une autre date ou moins de filtres.'))}</section></div>`;
    }
  });
  O.form('filters', (ctx, values) => { ctx.ui.filters = values; return t('Résultats actualisés.'); });
  O.action('clear-filters', ctx => { ctx.ui.filters = {}; return t('Filtres effacés.'); });
  O.route('profil', {
    title: ctx => { const tutor = ctx.state.tutors.find(item => item.id === ctx.params[0] && item.status === 'approved'); return tutor ? t('{name}, tuteur', { name: tutor.name }) : t('Profil indisponible'); },
    description: ctx => { const tutor = ctx.state.tutors.find(item => item.id === ctx.params[0]); return tutor ? t('Profil de {name}, tuteur ONTRACK (ENCG {encg}) : matières, chapitres, disponibilités et avis.', { name: tutor.name, encg: tutor.encg }) : t('Profil de tuteur ONTRACK.'); },
    render: ctx => {
      const { state, store } = ctx;
      const tutor = state.tutors.find(item => item.id === ctx.params[0] && item.status === 'approved');
      if (!tutor) return head(t('Catalogue'), t('Profil indisponible'), t('Ce profil n\'est pas publié (en attente de validation, suspendu ou supprimé).')) + `<div class="wrap section"><a class="button" href="#catalogue">${t('Retour au catalogue')}</a></div>`;
      const slots = store.freeSlots(tutor.id, 'quick').filter(slot => !slot.issue || slot.issue.includes('prioritaire')).slice(0, 9);
      const reviews = state.reviews.filter(review => review.tutorId === tutor.id && !review.hidden);
      return `<div class="wrap section"><p class="eyebrow">${t('Tuteur · ENCG {encg}', { encg: escape(tutor.encg) })}</p><div class="profile-banner">${u.avatar(tutor, 100)}<div><h1>${escape(tutor.name)}</h1><p>${escape(tutor.level)}${tutor.showAge && tutor.age ? ` · ${t('{age} ans', { age: tutor.age })}` : ''} · ${u.rating(store, tutor.id)}</p></div></div><div class="split"><div><h2>${t('Présentation')}</h2><p>${escape(tutor.bio)}</p><h3>${t('Matières enseignées')}</h3><p class="tags">${tutor.subjects.map(id => badge(u.subjectName(state, id))).join('')}</p><h3>${t('Chapitres maîtrisés')}</h3><ul class="columns">${tutor.chapters.map(id => `<li>${escape(u.chapterName(state, id))}</li>`).join('')}</ul><h3>${t('Langues et modes')}</h3><p class="tags">${tutor.languages.map(language => badge(language, 'gray')).join('')}${tutor.modes.map(mode => badge(mode, 'gray')).join('')}</p><h3>${t('Types de séances')}</h3><p class="tags">${tutor.services.map(id => { const offer = state.offers.find(item => item.id === id); return badge(`${offer.name} · ${money(offer.price)}`, 'violet'); }).join('')}</p><h3>${t('Avis des étudiants ({count})', { count: reviews.length })}</h3>${reviews.map(review => `<div class="review"><strong>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} ${review.rating} / 5</strong><p>${escape(review.text)}</p><small>${t('{date} · séance vérifiée', { date: escape(date(review.created)) })}</small></div>`).join('') || `<p class="muted">${t('Aucun avis publié pour le moment.')}</p>`}</div><aside class="summary"><h2>${t('Disponibilités')}</h2>${slots.length ? `<ul class="slot-list">${slots.map(slot => `<li>${escape(date(slot.start))}${slot.priority ? ` ${badge(t('Prioritaire Stay'), 'violet')}` : ''}</li>`).join('')}</ul>` : `<p>${t('Aucun créneau ouvert actuellement.')}</p>`}<p><small>${t('Heure marocaine. Créneaux « Prioritaire Stay » : réservés aux abonnés jusqu\'à {hours} h avant le début.', { hours: state.config.policy.priorityHours })}</small></p><a class="button" href="#reserver/${escape(tutor.id)}">${t('Réserver avec {name}', { name: escape(tutor.name.split(' ')[0]) })}</a></aside></div></div>`;
    }
  });

  // 13. Orientation ---------------------------------------------------------------
  // Carte destination : les critères non communiqués s'affichent « À confirmer auprès de l'ENCG », jamais inventés.
  function programCard(ctx, program, recommendation) {
    const passed = program.deadline ? Date.parse(ctx.data.moroccoInstant(program.deadline, 23, 59)) < ctx.store.now().getTime() : false;
    const unknown = `<span class="unknown">${t('À confirmer auprès de l\'ENCG')}</span>`;
    const known = (condition, html) => condition ? html : unknown;
    const colon = O.i18n.get() === 'fr' ? ' : ' : ': ';
    const seats = (program.seats || []).map(seat => `${escape(seat.label)}${colon}${escape(seat.count)}`).join(' · ');
    const place = [program.city, program.country].filter(Boolean).map(escape).join(', ');
    const criterion = item => item.unknown
      ? `<li class="unknown"><span class="criterion-icon" aria-hidden="true">?</span> ${escape(msg(item.label))}${colon}${t('À confirmer auprès de l\'ENCG')}<span class="sr-only">${t(' : critère non communiqué')}</span></li>`
      : `<li class="${item.ok ? 'ok' : 'ko'}"><span aria-hidden="true">${item.ok ? '✓' : '✕'}</span> ${escape(msg(item.label))}<span class="sr-only">${item.ok ? t(' : rempli') : t(' : non rempli')}</span></li>`;
    return `<article class="program"><div class="booking-top"><h3>${escape(program.name)}</h3><span class="tags">${program.mobility ? badge(program.mobility, 'violet') : ''}${passed ? badge(t('Date limite dépassée'), 'red') : ''}</span></div><p><strong>${escape(program.institution)}</strong> · ${place}</p><dl class="facts"><dt>${t('Effectifs communiqués')}</dt><dd>${known(seats, seats)}</dd><dt>${t('Type de mobilité')}</dt><dd>${known(program.mobility, escape(program.mobility))}</dd><dt>${t('Niveau minimum')}</dt><dd>${known(program.level, escape(program.level))}</dd><dt>${t('Moyenne minimale')}</dt><dd>${known(program.minGrade !== null, t('≥ {grade} / 20', { grade: escape(decimal(program.minGrade)) }))}</dd><dt>${t('Filières éligibles')}</dt><dd>${known(program.tracks.length, program.tracks.map(escape).join(', '))}</dd><dt>${t('Exigences linguistiques')}</dt><dd>${known(program.languageReq, program.languageReq ? `${escape(program.languageReq.language)} ${escape(program.languageReq.level)}` : '')}</dd><dt>${t('Date limite')}</dt><dd>${known(program.deadline, program.deadline ? escape(u.dateOnly(program.deadline)) : '')}</dd><dt>${t('Documents')}</dt><dd>${known(program.documents.length, program.documents.map(escape).join(', '))}</dd></dl>${recommendation ? `<ul class="criteria">${recommendation.criteria.map(criterion).join('')}</ul>` : ''}${program.sourceNote ? `<p class="muted"><small>${escape(program.sourceNote)}</small></p>` : ''}<p><a href="${escape(program.source)}" rel="noopener noreferrer" target="_blank">${t('Site officiel de l\'établissement')}</a></p></article>`;
  }
  O.route('orientation', {
    title: () => t('Portail d\'orientation internationale'),
    description: () => t('Destinations d\'échange communiquées par l\'ENCG : effectifs communiqués, recommandations selon votre profil ENCG et critères d\'admission à confirmer auprès de l\'ENCG.'),
    render: ctx => {
      const { state, store, user, data } = ctx;
      const active = state.programs.filter(program => program.active);
      const intro = head(t('Orientation internationale'), t('Et après, quel sera votre cap ?'), t('Découvrez les échanges universitaires et doubles diplômes potentiellement adaptés à votre profil.'));
      const disclaimer = `<p class="notice warning">${t('Destinations communiquées par l\'ENCG (liste 2025-2026), effectifs indiqués tels que communiqués. Aucune recommandation ne garantit une admission : vérifiez toujours les informations sur le site officiel de l\'établissement.')}</p><p class="notice">${t('Critères d\'admission non communiqués : renseignez-vous auprès du service des relations internationales de votre ENCG.')}</p>`;
      if (!user || user.role !== 'student') {
        return intro + `<div class="wrap section">${disclaimer}<div class="notice">${t('Connectez-vous avec un compte étudiant pour renseigner votre profil et obtenir des recommandations personnalisées. <a href="#connexion">Connexion</a>')}</div><h2>${t('Programmes référencés')}</h2><div class="grid two">${active.map(program => programCard(ctx, program)).join('')}</div></div>`;
      }
      const profile = state.orientationProfiles.find(item => item.studentId === user.id) || { encg: user.encg, level: user.level, track: user.track, average: '', validated: '', languages: [{ language: 'Français', level: 'B2' }], countries: [], programType: 'Indifférent' };
      const recommendations = store.recommendations(user.id);
      const byId = id => state.programs.find(program => program.id === id);
      const eligible = recommendations.filter(item => item.eligible);
      const partial = recommendations.filter(item => !item.eligible);
      const languageRow = index => { const item = profile.languages[index] || {}; return `<div class="form-grid">${select(t('Langue {number}', { number: index + 1 }), `language${index}`, data.constants.languages, item.language, index ? t('Aucune') : null)}${select(t('Niveau (CECRL)'), `languageLevel${index}`, data.constants.cefr, item.level || 'B1')}</div>`; };
      const consultations = state.consultations.filter(item => item.studentId === user.id);
      return intro + `<div class="wrap section">${disclaimer}<div class="split"><form data-form="orientation-profile" class="form-stack"><h2>${t('Mon profil d\'orientation')}</h2><p class="hint">${t('Seules les données nécessaires à l\'orientation sont demandées.')}</p>${select('ENCG', 'encg', state.encgs, profile.encg)}${select(t('Niveau d\'études'), 'level', state.levels, profile.level, null, 'data-change="level-tracks"')}${u.groupedSelect(t('Filière'), 'track', u.trackGroups(profile.level), profile.track)}${u.trackNote()}${field(t('Moyenne générale (/20)'), 'average', profile.average, 'number', 'min="0" max="20" step="0.01"')}${textarea(t('Matières et semestres validés'), 'validated', profile.validated, `maxlength="300" placeholder="${escape(t('Ex. : S1 à S4 validés, comptabilité 15/20'))}"`)}${[0, 1, 2].map(languageRow).join('')}${checks(t('Préférences géographiques'), 'countries', [...new Set(state.programs.map(program => program.country))], profile.countries)}${select(t('Type de programme recherché'), 'programType', [{ value: 'Indifférent', label: t('Indifférent') }, ...data.constants.mobilities], profile.programType)}<button class="button" type="submit">${t('Enregistrer et voir mes recommandations')}</button></form><aside><h2>${t('Mes recommandations')}</h2>${state.orientationProfiles.some(item => item.studentId === user.id) ? `<p>${t('{count} destination(s) potentiellement adaptée(s) : tous les critères communiqués sont remplis ; les critères « ? » restent à confirmer auprès de l\'ENCG.', { count: eligible.length })}</p>${eligible.map(item => programCard(ctx, byId(item.programId), item)).join('') || empty(t('Aucun programme complet'), t('Consultez les pistes à explorer ci-dessous.'))}` : empty(t('Profil à compléter'), t('Renseignez votre profil pour obtenir des recommandations.'))}</aside></div>${partial.length ? `<h2>${t('Pistes à explorer')}</h2><p class="muted">${t('Programmes dont certains critères ne sont pas encore remplis.')}</p><div class="grid two">${partial.map(item => programCard(ctx, byId(item.programId), item)).join('')}</div>` : ''}<div class="split section"><form data-form="consultation" class="form-stack"><h2>${t('Demander un entretien d\'orientation')}</h2><p>${t('Un enseignant ou conseiller autorisé vous aide à comprendre les critères, comparer les programmes et préparer votre dossier.')}</p>${checks(t('Programmes concernés'), 'programIds', active.map(program => ({ value: program.id, label: program.name })), [])}${textarea(t('Votre demande'), 'topic', '', 'minlength="10" maxlength="600" required')}${optional(t('Disponibilités'), 'availability', '', 'text', 'maxlength="120"')}<button class="button" type="submit">${t('Envoyer ma demande')}</button></form><div><h2>${t('Mes demandes')}</h2>${consultations.map(item => `<div class="review"><strong>${escape(date(item.created))} · ${escape(item.status)}</strong><p>${escape(item.topic)}</p>${item.note ? `<small>${escape(item.note)}</small>` : ''}</div>`).join('') || `<p class="muted">${t('Aucune demande pour le moment.')}</p>`}</div></div></div>`;
    }
  });
  O.form('orientation-profile', (ctx, values, form) => {
    const data = new FormData(form);
    const languages = [0, 1, 2].map(index => ({ language: values[`language${index}`], level: values[`languageLevel${index}`] })).filter(item => item.language);
    ctx.store.saveOrientationProfile({ ...values, languages, countries: data.getAll('countries') });
    return t('Profil d\'orientation enregistré : recommandations actualisées.');
  });
  O.form('consultation', (ctx, values, form) => { ctx.store.requestConsultation({ ...values, programIds: new FormData(form).getAll('programIds') }); return t('Demande envoyée : un e-mail de confirmation vous a été adressé.'); });

  // 14. Study Pods ----------------------------------------------------------------
  O.route('pods', {
    title: 'ONTRACK Study Pods — Coming Soon',
    description: () => t('ONTRACK Study Pods : petits espaces privés près des campus pour étudier avec son tuteur. Bientôt disponible.'),
    render: ctx => head('ONTRACK Study Pods', t('Un lieu pour rester dans le rythme.'), 'Coming Soon') + `<div class="wrap section split"><div><img class="pods-image" src="assets/pods.jpg" alt="${escape(t('Espace de travail calme, illustration du concept'))}" width="1400" height="934"><h2>${t('Les avantages')}</h2><ul><li>${t('Un lieu professionnel et calme, à proximité des campus.')}</li><li>${t('Rencontrer son tuteur sans recevoir quelqu\'un chez soi.')}</li><li>${t('Réservation de créneau et QR code d\'accès à l\'arrivée.')}</li><li>${t('Informations pratiques sur chaque lieu.')}</li></ul><h2>${t('Lieux à l\'étude')}</h2><ul>${ctx.state.pods.locations.map(location => `<li><strong>${escape(location.name)}</strong> · ${escape(location.city)} — ${escape(location.status)}</li>`).join('')}</ul></div><div><span class="badge violet big">Coming Soon</span><h2>${t('Le calme pour se concentrer. L\'énergie pour avancer.')}</h2><p>${t('Les Study Pods seront de petits espaces privés situés près des campus universitaires. Ils ouvriront en phase 3.')}</p><p class="notice warning">${t('Aucune réservation n\'est possible avant la mise en service effective des espaces.')}</p><form data-form="pods-news" class="form-stack"><h3>${t('Recevoir les actualités du lancement')}</h3>${field(t('Adresse e-mail'), 'email', ctx.user ? ctx.user.email : '', 'email', 'maxlength="120" autocomplete="email"')}${select(t('Ville souhaitée'), 'city', ctx.state.encgs, '', t('Peu importe'))}<button class="button" type="submit">${t('Je veux être informé')}</button><p class="hint">${t('Facultatif. Votre adresse sert uniquement à cette information.')}</p></form></div></div>`
  });
  O.form('pods-news', (ctx, values) => { ctx.store.subscribePods(values.email, values.city); ctx.ui.podsEmail = String(values.email).trim().toLowerCase(); ctx.ui.mailbox = ctx.ui.podsEmail; return t('Inscription enregistrée : vous recevrez les actualités du lancement.'); });

  // 15. Contact ----------------------------------------------------------------------
  O.route('contact', {
    title: () => t('Contact et assistance'),
    description: () => t('Contactez l\'équipe ONTRACK : assistance, réservation, paiement, compte ou orientation.'),
    render: ctx => head(t('Contact et assistance'), t('Une question ? Nous sommes là.'), t('Réponse sous 48 h ouvrées (engagement de démonstration).')) + `<div class="wrap section split"><form data-form="contact" class="form-stack">${field(t('Nom'), 'name', ctx.user ? ctx.user.name : '', 'text', 'maxlength="80" autocomplete="name"')}${optional(t('Adresse e-mail'), 'email', ctx.user ? ctx.user.email : '', 'email', 'maxlength="120"')}${select(t('Sujet'), 'subject', [{ value: 'Assistance', label: t('Assistance') }, { value: 'Réservation', label: t('Réservation') }, { value: 'Paiement ou remboursement', label: t('Paiement ou remboursement') }, { value: 'Compte et données personnelles', label: t('Compte et données personnelles') }, { value: 'Orientation', label: t('Orientation') }, { value: 'Devenir tuteur', label: t('Devenir tuteur') }])}${textarea(t('Message'), 'text', '', 'minlength="5" maxlength="1000" required')}<button class="button" type="submit">${t('Envoyer')}</button><p class="hint">${t('N\'indiquez ni coordonnées bancaires ni mot de passe.')}</p></form><aside class="summary"><h2>${t('Coordonnées')}</h2><p>${t('contact@ontrack.example.org (fictif)<br>Du lundi au vendredi, 9 h – 18 h (heure marocaine)')}</p><h3>${t('Questions fréquentes')}</h3><details><summary>${t('Comment annuler une séance ?')}</summary><p>${t('Depuis Mon espace > Mes séances, jusqu\'à {hours} h avant le début.', { hours: ctx.state.config.policy.cancelHours })}</p></details><details><summary>${t('Mon paiement a échoué')}</summary><p>${t('Aucune somme n\'est débitée ; le créneau est libéré et un nouvel essai est possible.')}</p></details><details><summary>${t('Comment supprimer mon compte ?')}</summary><p>${t('Mon espace > Mon profil > Supprimer mon compte (mot de passe requis).')}</p></details></aside></div>`
  });
  O.form('contact', (ctx, values) => { ctx.store.message(values); return t('Message envoyé à l\'équipe ONTRACK (conservé dans l\'administration de la démonstration).'); });

  // 17. Pages légales -------------------------------------------------------------
  O.route('cgu', {
    title: () => t('Conditions d\'utilisation'),
    description: () => t('Conditions générales d\'utilisation d\'ONTRACK : comptes, réservations, paiement, annulation, forfaits et avis.'),
    render: ctx => {
      const volunteer = ctx.state.config.payout.phase === 'volunteer';
      const rates = ctx.state.offers.map(offer => `${escape(offer.name)} ${money(ctx.state.config.payout.rates[offer.id])}`).join(', ');
      return head(t('Pages légales'), t('Conditions d\'utilisation'), t('Version de démonstration — à faire valider juridiquement avant tout lancement.')) + `<div class="wrap section prose"><h2>${t('1. Objet')}</h2><p>${t('ONTRACK met en relation des étudiants des 12 ENCG du Maroc avec des tuteurs pour des séances de tutorat individuelles et propose un portail d\'orientation.')}</p><h2>${t('2. Accès et comptes')}</h2><p>${t('Le service est réservé aux étudiants disposant d\'une adresse e-mail officielle d\'une ENCG participante. Chaque compte est personnel. Les profils tuteurs sont publiés après validation par l\'administration.')}</p><h2>${t('3. Services et tarifs')}</h2><ul>${ctx.state.offers.map(offer => `<li>${t('<strong>{name}</strong> : {price} — {format}.', { name: escape(offer.name), price: money(offer.price), format: escape(u.offerFormat(offer)) })}</li>`).join('')}</ul><p>${t('Les tarifs peuvent être ajustés par l\'administration ; le prix applicable est celui affiché au moment de la réservation.')}</p><h2>${t('4. Réservation, paiement et confirmation')}</h2><p>${t('Une réservation n\'est confirmée qu\'après validation du paiement par le prestataire. En cas d\'échec, elle n\'est pas considérée comme payée et le créneau est libéré.')}</p><h2>${t('5. Annulation, modification et absences')}</h2>${u.policyList(ctx.state)}<h2>${t('6. Avis')}</h2><p>${t('Seul un étudiant ayant effectivement suivi une séance peut publier un avis sur celle-ci. Les avis abusifs peuvent être signalés et masqués par l\'administration.')}</p><h2>${t('7. Tuteurs')}</h2><p>${t('Phase actuelle : <strong>{phase}</strong>.', { phase: volunteer ? t('programme pilote volontaire') : t('phase rémunérée') })} ${volunteer ? t('Aucune rémunération par séance n\'est due ; la participation ne garantit aucune rémunération future.') : t('Rémunération par séance terminée et vérifiée : {rates}.', { rates })}</p><h2>${t('8. Orientation')}</h2><p>${t('Les recommandations sont indicatives et ne garantissent jamais une admission.')}</p><h2>${t('9. Study Pods')}</h2><p>${t('Fonctionnalité future : aucune réservation n\'est possible avant l\'ouverture effective.')}</p><h2 id="discussions">${t('10. Discussions entre étudiants')}</h2><ul><li>${t('Les salons (par filière et par matière) et les discussions privées sont réservés aux étudiants connectés. Un message compte de 1 à 500 caractères.')}</li><li>${t('N\'échangez ni coordonnées, ni documents, ni données personnelles. Un message contenant une adresse e-mail ou un numéro de téléphone est publié avec un avertissement.')}</li><li>${t('Restez courtois : propos inappropriés, harcèlement et publicité sont interdits.')}</li><li>${t('Tout étudiant peut signaler un message d\'un autre participant. L\'administration examine les messages signalés, et eux seuls, et peut les masquer : ils sont alors remplacés par « Message masqué par la modération ».')}</li><li>${t('Les personas dont le nom porte « (fictive) » ne sont pas de vrais étudiants : leurs réponses sont préprogrammées et arrivent automatiquement.')}</li><li>${t('Démonstration : les messages restent dans ce navigateur. Deux onglets du même navigateur se parlent en direct ; aucun échange n\'est possible entre appareils.')}</li></ul></div>`;
    }
  });
  O.route('confidentialite', {
    title: () => t('Politique de confidentialité'),
    description: () => t('Données collectées par ONTRACK, finalités, durées de conservation, sécurité et droits (loi n° 09-08, CNDP).'),
    render: ctx => {
      const rows = [
        [t('Nom, e-mail universitaire, ENCG, niveau, filière'), t('Création du compte, vérification de l\'accès'), t('Durée du compte, supprimées à la suppression du compte')],
        [t('Mot de passe (haché SHA-256 avec sel)'), t('Authentification'), t('Durée du compte')],
        [t('Besoin décrit, métadonnées de pièce jointe'), t('Préparation de la séance par le tuteur'), t('Anonymisés à la suppression du compte')],
        [t('Réservations et transactions'), t('Exécution du service, obligations comptables'), t('10 ans sous forme anonymisée (à confirmer)')],
        [t('Comptes rendus et progression'), t('Suivi pédagogique'), t('Durée du compte')],
        [t('Profil d\'orientation'), t('Recommandations de programmes'), t('Durée du compte')],
        [t('Journal des tentatives de connexion'), t('Sécurité'), t('Jusqu\'à la connexion réussie ou au déblocage')],
        [t('Messages des discussions (salons et discussions privées), signalements'), t('Échanges entre étudiants, modération des messages signalés'), t('Conservés localement dans ce navigateur ; à la suppression du compte, discussions privées effacées et messages de salon anonymisés (« Compte supprimé »)')]
      ];
      return head(t('Pages légales'), t('Politique de confidentialité'), t('Conforme dans son principe à la loi n° 09-08 ; déclaration CNDP à effectuer avant lancement.')) + `<div class="wrap section prose"><h2>${t('Responsable et cadre')}</h2><p>${t('ONTRACK traite les données personnelles dans le respect de la loi marocaine n° 09-08 relative à la protection des personnes physiques à l\'égard du traitement des données à caractère personnel. Les traitements doivent être déclarés ou autorisés auprès de la CNDP avant la mise en production.')}</p><h2>${t('Données collectées et finalités')}</h2><div class="table-wrap"><table><thead><tr><th scope="col">${t('Données')}</th><th scope="col">${t('Finalité')}</th><th scope="col">${t('Conservation')}</th></tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div><h2>${t('Ce que nous ne collectons pas')}</h2><p>${t('Aucun mot de passe universitaire, aucun numéro Apogée comme preuve d\'identité, aucune donnée bancaire : le paiement est traité par le prestataire. Le contenu des pièces jointes n\'est pas conservé par cette démonstration (seuls le nom, le type et la taille).')}</p><p>${t('Assistant ONTRACK : assistant simulé dont les réponses sont calculées localement, dans votre navigateur. Son historique est conservé en mémoire de l\'onglet seulement : il n\'est jamais enregistré ni envoyé.')}</p><p>${t('Discussions entre étudiants : les messages sont conservés localement, dans le stockage de ce navigateur (localStorage), sans serveur ni envoi. Une discussion privée n\'est visible que par ses deux participants ; l\'administration ne voit que les messages signalés, et la sauvegarde administrateur exclut les discussions privées. La session de connexion est propre à chaque onglet (sessionStorage).')}</p><p>${t('Les étudiants connectés voient, dans la liste « Écrire à… » des Discussions, le nom, l\'ENCG et la filière des autres étudiants inscrits, afin de pouvoir leur écrire.')}</p><h2>${t('Sécurité')}</h2><ul><li>${t('HTTPS obligatoire en production.')}</li><li>${t('Mots de passe hachés et salés, codes de vérification hachés.')}</li><li>${t('Sessions expirant après {hours} h d\'inactivité, déconnexion explicite.', { hours: ctx.state.config.policy.sessionHours })}</li><li>${t('Blocage après {count} échecs de connexion.', { count: ctx.state.config.policy.maxAttempts })}</li><li>${t('Accès aux données limité selon le rôle (étudiant, tuteur, administrateur).')}</li><li>${t('Sauvegardes régulières et procédure de restauration (export/import administrateur).')}</li></ul><h2>${t('Vos droits')}</h2><p>${t('Accès, rectification, opposition et suppression : depuis votre profil ou via la page <a href="#contact">Contact</a>. La suppression du compte est disponible dans Mon espace > Mon profil.')}</p><h2>${t('Indexation')}</h2><p>${t('Les espaces personnels ne sont pas indexés par les moteurs de recherche (balise <code>noindex</code> et <code>robots.txt</code>).')}</p></div>`;
    }
  });
  O.route('mentions', {
    title: () => t('Mentions légales et démonstration'),
    description: () => t('Mentions légales d\'ONTRACK et cadre de la démonstration académique.'),
    render: ctx => head(t('Pages légales'), t('Mentions légales'), t('Démonstration académique — aucun service réel.')) + `<div class="wrap section prose"><h2>${t('Éditeur')}</h2><p>${t('Projet académique ONTRACK (démonstration). Hébergement, nom de domaine et raison sociale à préciser avant lancement : voir la documentation technique.')}</p><h2>${t('Cadre de la démonstration')}</h2><p>${t('Personnes, comptes, notes, transactions et disponibilités sont fictifs. Les destinations d\'orientation reprennent la liste communiquée par l\'ENCG (2025-2026) ; leur mention, comme celle d\'une ENCG, n\'implique aucun partenariat avec ONTRACK. Paiements, e-mails, visioconférence et intégrations universitaires sont simulés. La passerelle CMI/Payzone est un écran de scénario : aucune donnée bancaire n\'est saisie.')}</p><h2>${t('Stockage local')}</h2><p>${t('Les données sont conservées dans ce navigateur (localStorage, clé <code>ontrack-demo-v3</code>), avec repli en mémoire si le stockage est indisponible. Aucun serveur, aucun outil d\'analyse, aucun partage entre appareils.')}</p><button type="button" class="button secondary" data-action="reset" data-confirm="${escape(t('Remplacer toutes les données locales par le scénario initial ?'))}">${t('Réinitialiser la démonstration')}</button><h2>${t('Illustrations')}</h2><p>${t('Photographies issues d\'Unsplash, conservées localement ; elles ne représentent pas les identités fictives affichées.')}</p></div>`
  });

  // Boîte mail simulée ----------------------------------------------------------------
  O.route('boite-mail', {
    title: () => t('Boîte mail simulée'),
    description: () => t('Simulateur de messagerie : e-mails envoyés par ONTRACK dans la démonstration.'),
    private: true,
    render: ctx => {
      const { state } = ctx;
      const addresses = mailboxes(ctx);
      const address = addresses.includes(ctx.ui.mailbox) ? ctx.ui.mailbox : addresses[0] || '';
      const emails = address ? state.emails.filter(email => email.to === address) : [];
      return head(t('Outil de démonstration'), t('Boîte mail simulée'), t('Les e-mails automatiques d\'ONTRACK (§12) arrivent ici au lieu d\'être réellement envoyés.')) + `<div class="wrap section"><p class="notice warning">${t('Limite de simulation : cette boîte n\'affiche que l\'adresse du compte connecté et les adresses saisies dans cet onglet (inscription, vérification, mot de passe oublié, actualités Study Pods). Les codes y apparaissent en clair, comme dans une vraie boîte de réception ; en base, ils ne sont conservés que hachés.')}</p>${addresses.length > 1 ? `<form class="inline-form" data-form="mailbox"><label>${t('Adresse consultée')}<select name="address" data-change="mailbox">${u.options(addresses, address)}</select></label></form>` : address ? `<p>${t('Adresse consultée : <strong>{address}</strong>', { address: escape(address) })}</p>` : ''}${emails.length ? emails.map(email => `<article class="email${email.read ? '' : ' unread'}" aria-label="${escape(email.subject)}"><header class="email-head"><img src="assets/logo-ontrack.png" alt="ONTRACK" width="120" height="37"><div><h2>${escape(email.subject)}</h2><p><small>${t('De : ONTRACK &lt;no-reply@ontrack.example.org&gt; · À : {to} · {date}', { to: escape(email.to), date: escape(date(email.created)) })}</small></p></div></header><div class="email-body">${email.lines.map(line => `<p>${escape(line)}</p>`).join('')}</div><footer class="email-foot">${t('ONTRACK — Your Study, Our Priority. · E-mail automatique simulé')}</footer>${email.read ? '' : button(t('Marquer comme lu'), 'mail-read', email.id)}</article>`).join('') : empty(t('Boîte vide'), address ? t('Aucun e-mail pour cette adresse.') : t('Connectez-vous ou saisissez votre adresse (inscription, vérification, mot de passe oublié) pour consulter vos e-mails.'))}</div>`;
    }
  });
  function mailboxes(ctx) { return [...new Set([ctx.user ? ctx.user.email : '', ctx.ui.pendingEmail, ctx.ui.resetEmail, ctx.ui.podsEmail].filter(Boolean))]; }
  function chooseMailbox(ctx, address) { if (!mailboxes(ctx).includes(address)) throw new Error(t('Adresse non consultable depuis cet onglet.')); ctx.ui.mailbox = address; }
  O.mailboxes = mailboxes;
  O.change('mailbox', (ctx, element) => { chooseMailbox(ctx, element.value); return { message: t('Boîte de {address}', { address: element.value }) }; });
  O.form('mailbox', (ctx, values) => { chooseMailbox(ctx, values.address); return t('Boîte actualisée.'); });
  O.action('mail-read', (ctx, dataset) => {
    const email = ctx.state.emails.find(item => item.id === dataset.id);
    if (!email || !mailboxes(ctx).includes(email.to)) throw new Error(t('E-mail non consultable depuis cet onglet.'));
    ctx.store.markEmailRead(dataset.id);
    return t('E-mail marqué comme lu.');
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
