(function (root) {
  'use strict';
  const O = root.Ontrack;
  const u = O.ui;
  const { escape, money, date, head, empty, select, field, optional, textarea, checkbox, checks, badge, button } = u;
  const levelRank = (state, level) => state.levels.indexOf(level);

  function offerCards(ctx, compact) {
    const { state } = ctx;
    const catchUp = state.offers.find(offer => offer.id === 'catch');
    const savings = offer => offer.id === 'exam' ? catchUp.price * 3 - offer.price : offer.id === 'stay' ? Math.round(catchUp.price / 90 * 60 * 4) - offer.price : 0;
    return `<div class="grid four offers">${state.offers.map(offer => {
      const saved = savings(offer);
      return `<article class="offer ${offer.id === 'exam' ? 'featured' : ''}"><span class="offer-label">${offer.credits > 1 ? 'FORFAIT' : 'SÉANCE PONCTUELLE'}</span><h3>${escape(offer.name)}</h3><div class="price">${money(offer.price)}</div><p><strong>${escape(u.offerFormat(offer))}</strong> · ${escape(offer.frequency)}</p>${compact ? '' : `<p>${escape(offer.content)}</p><p><small>Objectif : ${escape(offer.objective)}</small></p>`}${saved > 0 ? `<p class="saving">Économie : ${money(saved)} par rapport aux séances à l'unité</p>` : ''}<a class="button ${offer.id === 'exam' ? '' : 'secondary'}" href="#reserver" data-action="pick-offer" data-id="${offer.id}">Choisir ${escape(offer.name)}</a></article>`;
    }).join('')}</div>`;
  }
  function tutorCard(ctx, tutor) {
    const { state, store } = ctx;
    const next = store.freeSlots(tutor.id, 'quick').find(slot => !slot.issue);
    return `<article class="tutor-card"><div class="person">${u.avatar(tutor, 64)}<div><h3>${escape(tutor.name)}</h3><p>ENCG ${escape(tutor.encg)} · ${escape(tutor.level)}</p></div></div><p class="tags">${tutor.subjects.map(id => badge(u.subjectName(state, id))).join('')}</p><p class="bio">${escape(tutor.bio)}</p><p class="tags">${tutor.languages.map(language => badge(language, 'gray')).join('')}${tutor.modes.map(mode => badge(mode, 'gray')).join('')}</p><p>${u.rating(store, tutor.id)}</p><p><small>${next ? `Prochain créneau : ${escape(date(next.start))}` : 'Aucun créneau ouvert actuellement'}</small></p><div class="tutor-bottom"><a class="button small secondary" href="#profil/${escape(tutor.id)}">Voir le profil</a><a class="button small" href="#reserver/${escape(tutor.id)}">Réserver</a></div></article>`;
  }
  O.publicParts = { offerCards, tutorCard };

  O.action('pick-offer', (ctx, dataset) => { ctx.ui.wizard = { step: 1, offerId: dataset.id }; return { go: 'reserver', message: 'Offre présélectionnée : choisissez votre matière.' }; });
  O.action('pick-subject', (ctx, dataset) => {
    const subject = ctx.state.subjects.find(item => item.id === dataset.id);
    if (!subject || !subject.chapters.length || !ctx.state.tutors.some(tutor => tutor.status === 'approved' && tutor.subjects.includes(subject.id))) throw new Error('Aucun tuteur validé ni chapitre disponible pour cette matière.');
    ctx.ui.wizard = { step: 2, subjectId: dataset.id }; return { go: 'reserver', message: 'Matière présélectionnée : décrivez votre besoin.' }; });

  // 1. Accueil -------------------------------------------------------------
  O.route('accueil', {
    title: 'Tutorat universitaire pour les ENCG du Maroc',
    description: 'ONTRACK : tutorat individuel en ligne pour les étudiants des 12 ENCG du Maroc, suivi de progression et portail d\'orientation internationale. Your Study, Our Priority.',
    after: (ctx, main) => { if (ctx.params[0] === 'offres') { const target = main.querySelector('#offres'); if (target) target.scrollIntoView(); } },
    render: ctx => {
      const { state } = ctx;
      const approved = state.tutors.filter(tutor => tutor.status === 'approved');
      return `<section class="hero entrance"><div class="wrap"><div class="hero-copy"><p class="eyebrow">Le tutorat pensé pour les 12 ENCG du Maroc</p><h1>ONTRACK<span>.</span><br>Your Study, Our Priority<span>.</span></h1><p class="lead">Un chapitre qui bloque ? Un cours manqué ? Un examen qui approche ? Avancez avec un tuteur qui connaît votre programme.</p><div class="actions"><a class="button" href="#reserver">Find Your Tutor <span aria-hidden="true">↗</span></a><a class="button secondary" href="#inscription">Créer mon compte</a></div><div class="hero-proof"><div class="avatar-stack"><img src="assets/yassine.jpg" alt="" width="30" height="30"><img src="assets/lina.jpg" alt="" width="30" height="30"><img src="assets/adam.jpg" alt="" width="30" height="30"></div><span>Des tuteurs issus des ENCG, validés par l'équipe ONTRACK.</span></div></div></div><div class="hero-media"><img src="assets/campus.jpg" alt="Étudiants travaillant ensemble autour de leurs cours" width="1400" height="934"></div></section>
      <section class="wrap section" aria-labelledby="concept"><div class="section-heading"><div><p class="eyebrow">Le concept</p><h2 id="concept">Le soutien dont vous avez besoin, au moment où vous en avez besoin.</h2></div><p>ONTRACK met en relation les étudiants des ENCG avec des tuteurs maîtrisant les matières enseignées : séances individuelles, comptes rendus et suivi par chapitre.</p></div><div class="grid three"><div class="step"><span class="step-number">01 / DÉCRIRE</span><h3>Votre besoin précis</h3><p>Matière, chapitre, type de difficulté : le système vous propose les tuteurs adaptés.</p></div><div class="step"><span class="step-number">02 / RÉSERVER</span><h3>Le bon créneau</h3><p>Disponibilités réelles en heure marocaine, paiement en ligne, confirmation par e-mail.</p></div><div class="step"><span class="step-number">03 / PROGRESSER</span><h3>Un suivi concret</h3><p>Après chaque séance, un récapitulatif et votre progression par matière.</p></div></div></section>
      <section class="tint" id="offres" aria-labelledby="tarifs"><div class="wrap section"><div class="section-heading"><div><p class="eyebrow">Services et tarifs</p><h2 id="tarifs">Quatre façons d'avancer.</h2></div><p>Tarifs affichés toutes taxes comprises, sans reconduction automatique. Stay ONTRACK est un forfait de quatre séances par mois, pas un accès illimité.</p></div>${offerCards(ctx)}</div></section>
      <section class="wrap section" aria-labelledby="avantages"><div class="section-heading"><div><p class="eyebrow">Les avantages</p><h2 id="avantages">Pensé pour le parcours ENCG.</h2></div></div><div class="grid four"><div class="feature"><h3>Programmes ENCG</h3><p>Matières et chapitres alignés sur les enseignements des ENCG.</p></div><div class="feature"><h3>Tuteurs validés</h3><p>Chaque profil est vérifié par l'administration avant publication.</p></div><div class="feature"><h3>Flexible</h3><p>Séances en ligne de 30 à 90 minutes, du blocage ponctuel à l'accompagnement mensuel.</p></div><div class="feature"><h3>Transparent</h3><p>Prix, règles d'annulation et méthode de calcul de la progression affichés avant paiement.</p></div></div></section>
      <section class="tint" aria-labelledby="suivi"><div class="wrap section split"><div><p class="eyebrow">Suivi de progression</p><h2 id="suivi">Chaque chapitre compte.</h2><p>Après chaque séance, votre tuteur indique les chapitres travaillés et leur statut : à étudier, en cours d'apprentissage, révisé ou maîtrisé. Votre tableau de bord calcule la part des chapitres travaillés pour chaque matière.</p><a class="button secondary" href="#matieres">Voir les matières</a></div><div class="summary"><h3>Exemple de tableau</h3>${[['Mathématiques appliquées', 25], ['Comptabilité générale', 60], ['Microéconomie', 40]].map(([name, value]) => `<p class="progress-label"><span>${escape(name)}</span><strong>${value} %</strong></p>${u.progressBar(value, name)}`).join('')}<p><small>Indicateur de suivi pédagogique, pas une garantie de maîtrise.</small></p></div></div></section>
      <section class="wrap section" aria-labelledby="tuteurs"><div class="section-heading"><div><p class="eyebrow">Ils vous aident à garder le cap</p><h2 id="tuteurs">Des tuteurs issus des ENCG.</h2></div><a class="button secondary" href="#catalogue">Tous les tuteurs</a></div><div class="grid two">${approved.slice(0, 2).map(tutor => tutorCard(ctx, tutor)).join('')}</div><p class="muted"><small>Profils fictifs de démonstration. Photos illustratives publiées avec consentement simulé.</small></p></section>
      <section class="tint" aria-labelledby="orientation-apercu"><div class="wrap section split"><div><p class="eyebrow">Portail d'orientation</p><h2 id="orientation-apercu">Et après, quel sera votre cap ?</h2><p>Échanges universitaires et doubles diplômes : renseignez votre profil, découvrez les programmes potentiellement adaptés, leurs critères et leurs dates limites.</p><a class="button secondary" href="#orientation">Explorer l'orientation</a></div><div class="summary"><h3>${state.programs.filter(program => program.active).length} programmes illustratifs</h3><p>${[...new Set(state.programs.filter(program => program.active).map(program => program.country))].map(escape).join(' · ')}</p><p><small>Aucune recommandation ne garantit une admission.</small></p></div></div></section>
      <section class="wrap section split" aria-labelledby="pods-apercu"><div><img class="pods-image" src="assets/pods.jpg" alt="Espace de travail calme et lumineux" width="1400" height="934" loading="lazy"></div><div><span class="badge violet">Coming Soon</span><h2 id="pods-apercu">ONTRACK Study Pods</h2><p>De petits espaces privés près des campus pour retrouver votre tuteur dans un lieu adapté au travail. Ouverture prévue en phase 3.</p><a class="button secondary" href="#pods">Découvrir le concept</a></div></section>`;
    }
  });

  // 2. Présentation ---------------------------------------------------------
  O.route('presentation', {
    title: 'Présentation d\'ONTRACK',
    description: 'Concept, objectifs et fonctionnement d\'ONTRACK, plateforme de tutorat universitaire et d\'orientation académique des ENCG.',
    render: ctx => head('Présentation', 'Your Study, Our Priority.', 'Une plateforme dédiée exclusivement aux étudiants des 12 ENCG du Maroc.') + `<div class="wrap section prose"><h2>Pourquoi ONTRACK ?</h2><p>Chapitres incompris, cours manqués, accumulation de travail, manque de temps pour chercher de l'aide, préparation insuffisante aux examens : ONTRACK propose des séances individuelles adaptées à chaque étudiant, avec un suivi de progression par matière et par chapitre.</p><h2>Nos objectifs</h2><ul><li>Faciliter l'accès à un soutien adapté aux programmes des ENCG.</li><li>Mettre en relation les étudiants avec des tuteurs issus des différentes ENCG.</li><li>Proposer des séances flexibles, accessibles en ligne.</li><li>Permettre à chacun de suivre sa progression académique.</li><li>Proposer des formules adaptées à différents budgets.</li><li>Faciliter l'accès aux informations sur les échanges et la double diplomation.</li><li>Développer progressivement un réseau d'espaces d'étude physiques.</li></ul><h2>Trois profils, trois espaces</h2><p><strong>Étudiants</strong> : compte vérifié par l'adresse universitaire, recherche, réservation, paiement, historique, comptes rendus, progression, orientation. <strong>Tuteurs</strong> : profil validé par l'administration, disponibilités, réservations, comptes rendus, avis, rémunération. <strong>Administration</strong> : comptes, référentiel, tarifs, paiements, rémunérations, modération, orientation, Study Pods et statistiques.</p><h2>Programme pilote volontaire</h2><p>Au lancement, ONTRACK fonctionne avec un groupe limité de tuteurs volontaires (programme pilote d'environ 10 à 20 séances). Le caractère volontaire est explicite : la participation ne donne droit à aucune rémunération future garantie. La phase de rémunération par séance est activable par l'administration ; la grille appliquée figure dans les conditions d'utilisation.</p><h2>Feuille de route</h2><ol><li><strong>Phase 1 — MVP :</strong> inscription vérifiée, catalogue, réservation, paiement, comptes rendus, progression, administration.</li><li><strong>Phase 2 :</strong> portail d'orientation, recommandations, entretiens avec un conseiller.</li><li><strong>Phase 3 :</strong> Study Pods (lieux, réservations, QR codes) — Coming Soon.</li></ol><div class="actions"><a class="button" href="#reserver">Find Your Tutor</a><a class="button secondary" href="#inscription-tuteur">Devenir tuteur</a></div></div>`
  });

  // 3. Connexion, inscription, vérification -----------------------------------
  O.route('connexion', {
    title: 'Connexion',
    description: 'Connectez-vous à votre espace ONTRACK étudiant, tuteur ou administrateur.',
    private: true,
    render: ctx => {
      const accounts = ctx.data.demoAccounts;
      const current = ctx.user ? `<div class="notice">Connecté en tant que <strong>${escape(ctx.user.name)}</strong>. <a href="${ctx.spaces[ctx.user.role]}">Ouvrir mon espace</a> ou choisissez un autre compte ci-dessous.</div>` : '';
      return head('Connexion', 'Heureux de vous revoir.', 'Accédez à votre espace avec votre adresse e-mail et votre mot de passe.') + `<div class="wrap section split"><form data-form="login" class="form-stack" novalidate>${current}<h2>Se connecter</h2>${field('Adresse e-mail', 'email', ctx.ui.pendingEmail || '', 'email', 'autocomplete="username" maxlength="120"')}${field('Mot de passe', 'password', '', 'password', 'autocomplete="current-password" maxlength="72"')}<button class="button" type="submit">Se connecter</button><p><a href="#mot-de-passe-oublie">Mot de passe oublié ?</a> · <a href="#verification">Vérifier mon adresse</a></p><p>Pas encore de compte ? <a href="#inscription">Inscription étudiant</a> · <a href="#inscription-tuteur">Devenir tuteur</a></p><p class="muted"><small>Après ${ctx.state.config.policy.maxAttempts} échecs consécutifs, la connexion est bloquée ${ctx.state.config.policy.lockMinutes} minutes. Session fermée après ${ctx.state.config.policy.sessionHours} h d'inactivité.</small></p></form><aside class="summary"><h2>Connexion rapide · soutenance</h2><p>Comptes de démonstration (mots de passe hachés SHA-256 + sel, comme les comptes créés).</p><div class="quick-logins">${accounts.map((account, index) => `<button type="button" class="button small secondary" data-action="quick-login" data-id="${index}">${escape(account.label)}</button>`).join('')}</div><dl>${accounts.map(account => `<dt>${escape(account.label)}</dt><dd><code>${escape(account.email)}</code> · <code>${escape(account.password)}</code></dd>`).join('')}</dl></aside></div>`;
    }
  });
  function afterLogin(ctx, result) {
    const wanted = ctx.ui.returnTo && ctx.ui.returnTo !== '#connexion' ? ctx.ui.returnTo.slice(1) : '';
    const route = O.routes[wanted.split('/')[0]];
    const target = wanted && route && !O.access(route, { role: result.role }).redirect ? wanted : ctx.spaces[result.role].slice(1);
    ctx.ui.returnTo = '';
    return { go: target, message: `Bienvenue ${result.name}. Connexion réussie.` };
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

  function identityFields(ctx, values) {
    const v = values || {};
    return `${field('Nom et prénom', 'name', v.name || '', 'text', 'maxlength="80" autocomplete="name"')}${select('Votre ENCG', 'encg', ctx.state.encgs, v.encg, null, 'data-change="encg-hint"')}<p class="hint domain-hint" aria-live="polite">Domaine autorisé : ${escape((ctx.state.config.domains[v.encg || ctx.state.encgs[0]] || []).map(item => `@${item}`).join(', '))}</p>${field('Adresse e-mail officielle de votre ENCG', 'email', v.email || '', 'email', 'maxlength="120" autocomplete="email"')}${select('Niveau d\'études', 'level', ctx.state.levels, v.level)}`;
  }
  O.change('encg-hint', (ctx, element) => {
    const hint = element.form.querySelector('.domain-hint');
    if (hint) hint.textContent = `Domaine autorisé : ${(ctx.state.config.domains[element.value] || []).map(item => `@${item}`).join(', ')}`;
  });
  const passwordFields = () => `${field('Mot de passe', 'password', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}${field('Confirmer le mot de passe', 'confirm', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}<p class="hint">8 caractères minimum, avec au moins une lettre et un chiffre. N'utilisez jamais votre mot de passe universitaire ni votre numéro Apogée.</p>`;
  const consentField = () => `<label class="check"><input type="checkbox" name="consent" required> <span>J'accepte les <a href="#cgu">conditions d'utilisation</a> et la <a href="#confidentialite">politique de confidentialité</a>.</span></label>`;
  O.route('inscription', {
    title: 'Inscription étudiant',
    description: 'Créez votre compte ONTRACK avec l\'adresse e-mail officielle de votre ENCG.',
    render: ctx => head('Inscription étudiant', 'Votre parcours commence ici.', 'L\'accès est réservé aux étudiants des 12 ENCG : votre adresse universitaire sert de première vérification.') + `<div class="wrap section split"><form data-form="register" class="form-stack" novalidate><h2>Créer mon compte</h2>${identityFields(ctx, {})}${select('Filière ou spécialité', 'track', ctx.data.constants.tracks)}${passwordFields()}${consentField()}<button class="button" type="submit">Créer mon compte et recevoir le code</button><p>Vous êtes tuteur ? <a href="#inscription-tuteur">Créer un profil tuteur</a></p></form><aside class="summary"><h2>Comment ça marche ?</h2><ol><li>Sélectionnez votre ENCG.</li><li>Saisissez votre adresse e-mail universitaire.</li><li>Nous vérifions que son domaine est autorisé pour cette école.</li><li>Un code de vérification vous est envoyé.</li><li>Vous confirmez votre adresse.</li><li>Votre compte est activé.</li></ol><p class="notice">Démonstration : les e-mails arrivent dans la <a href="#boite-mail">boîte mail simulée</a>. Les domaines <code>etu.encg-&lt;ville&gt;.demo</code> sont fictifs et configurables par l'administration.</p></aside></div>`
  });
  function checkPasswords(values) { if (values.password !== values.confirm) throw new Error('Les deux mots de passe ne correspondent pas.'); }
  O.form('register', (ctx, values) => {
    checkPasswords(values);
    const result = ctx.store.register({ ...values, consent: values.consent === 'on' });
    ctx.ui.pendingEmail = result.email; ctx.ui.mailbox = result.email;
    return { go: 'verification', message: 'Compte créé : un code de vérification a été envoyé à votre adresse universitaire.' };
  });
  O.route('inscription-tuteur', {
    title: 'Devenir tuteur',
    description: 'Créez votre profil de tuteur ONTRACK : matières, chapitres maîtrisés, langues et types de séances. Profil publié après validation.',
    render: ctx => {
      const { state, data } = ctx;
      return head('Devenir tuteur', 'Partagez le savoir. Faites la différence.', 'Votre profil sera publié après vérification de votre adresse et validation par l\'administration.') + `<div class="wrap section"><form data-form="register-tutor" class="form-grid" novalidate><div class="form-stack"><h2>Identité et accès</h2>${identityFields(ctx, {})}${passwordFields()}</div><div class="form-stack"><h2>Profil public</h2>${textarea('Description personnelle', 'bio', '', 'minlength="10" maxlength="600" required')}${checks('Langues d\'enseignement', 'languages', data.constants.languages, ['Français'])}${checks('Modes de séance', 'modes', data.constants.modes, ['En ligne'])}${checks('Types de séances proposés', 'services', state.offers.map(offer => ({ value: offer.id, label: `${offer.name} (${u.offerFormat(offer)})` })), state.offers.map(offer => offer.id))}${checkbox('J\'autorise la publication de ma photo de profil', 'photoConsent', false)}<p class="hint">Démonstration : aucune photo n'est téléversée ni stockée ; des initiales s'affichent.</p>${optional('Âge', 'age', '', 'number', 'min="17" max="80"')}${checkbox('Afficher mon âge sur mon profil', 'showAge', false)}</div><div class="full form-stack"><h2>Matières et chapitres maîtrisés</h2>${state.subjects.map(subject => `<fieldset><legend>${escape(subject.name)} · ${escape(subject.level)}</legend><label class="check"><input type="checkbox" name="subjects" value="${escape(subject.id)}"> <span><strong>J'enseigne cette matière</strong></span></label><div class="check-grid">${subject.chapters.map(chapter => `<label class="check"><input type="checkbox" name="chapters" value="${escape(chapter.id)}"> <span>${escape(chapter.name)}</span></label>`).join('')}</div></fieldset>`).join('')}<p class="notice">Programme pilote : pendant la phase de lancement, le tutorat est volontaire. Il ne donne pas droit à une rémunération future garantie ; les éventuels frais convenus à l'avance sont remboursés.</p>${consentField()}<button class="button" type="submit">Soumettre mon profil</button></div></form></div>`;
    }
  });
  O.form('register-tutor', (ctx, values, form) => {
    checkPasswords(values);
    const data = new FormData(form);
    const result = ctx.store.registerTutor({ ...values, subjects: data.getAll('subjects'), chapters: data.getAll('chapters'), languages: data.getAll('languages'), modes: data.getAll('modes'), services: data.getAll('services'), photoConsent: values.photoConsent === 'on', showAge: values.showAge === 'on', consent: values.consent === 'on' });
    ctx.ui.pendingEmail = result.email; ctx.ui.mailbox = result.email;
    return { go: 'verification', message: 'Profil créé : vérifiez votre adresse avec le code reçu. Il sera ensuite soumis à validation.' };
  });
  O.route('verification', {
    title: 'Vérification de l\'adresse e-mail',
    description: 'Confirmez votre adresse e-mail universitaire avec le code reçu.',
    private: true,
    render: ctx => head('Vérification', 'Confirmez votre adresse universitaire.', 'Saisissez le code à 6 chiffres reçu par e-mail. Il expire dans 30 minutes.') + `<div class="wrap section split"><form data-form="verify" class="form-stack" novalidate>${field('Adresse e-mail', 'email', ctx.ui.pendingEmail || '', 'email', 'maxlength="120" autocomplete="email"')}${field('Code de vérification', 'code', '', 'text', 'inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code"')}<button class="button" type="submit">Vérifier et activer mon compte</button><button class="button secondary" type="button" data-action="resend-code">Renvoyer un code</button><p><a href="#boite-mail">Ouvrir la boîte mail simulée</a></p></form><aside class="summary"><h2>Ce que vérifie ONTRACK</h2><p>La vérification prouve que vous accédez à la boîte de réception de votre ENCG. Elle ne garantit pas à elle seule votre inscription actuelle dans l'établissement ; une intégration avec les systèmes universitaires pourra être étudiée avec leur autorisation.</p><p><strong>Aucun mot de passe universitaire ni numéro Apogée n'est demandé.</strong></p></aside></div>`
  });
  O.form('verify', (ctx, values) => {
    const result = ctx.store.verifyEmail(values.email, values.code);
    if (!result.ok) throw new Error(result.error);
    ctx.ui.pendingEmail = '';
    return { go: ctx.spaces[result.role].slice(1), message: result.role === 'tutor' ? 'Adresse vérifiée. Votre profil tuteur est en attente de validation par l\'administration.' : 'Adresse vérifiée : votre compte est activé. Bienvenue sur ONTRACK !' };
  });
  O.action('resend-code', (ctx, dataset, element) => {
    const email = element.form.elements.email.value;
    ctx.ui.pendingEmail = email.trim().toLowerCase();
    return ctx.store.resendCode(email).message;
  });
  O.route('mot-de-passe-oublie', {
    title: 'Mot de passe oublié',
    description: 'Réinitialisez votre mot de passe ONTRACK avec un code envoyé par e-mail.',
    private: true,
    render: ctx => head('Récupération du mot de passe', 'Un nouveau départ, en deux étapes.', 'Recevez un code par e-mail, puis choisissez un nouveau mot de passe.') + `<div class="wrap section split"><form data-form="reset-request" class="form-stack" novalidate><h2>1. Recevoir un code</h2>${field('Adresse e-mail du compte', 'email', ctx.ui.resetEmail || '', 'email', 'maxlength="120" autocomplete="email"')}<button class="button" type="submit">Envoyer le code</button><p class="hint">Par sécurité, le message affiché est identique que le compte existe ou non.</p></form><form data-form="reset-confirm" class="form-stack" novalidate><h2>2. Nouveau mot de passe</h2>${field('Adresse e-mail', 'email', ctx.ui.resetEmail || '', 'email', 'maxlength="120"')}${field('Code reçu', 'code', '', 'text', 'inputmode="numeric" maxlength="6" autocomplete="one-time-code"')}${passwordFields()}<button class="button" type="submit">Changer mon mot de passe</button></form></div>`
  });
  O.form('reset-request', (ctx, values) => { ctx.ui.resetEmail = String(values.email).trim().toLowerCase(); ctx.ui.mailbox = ctx.ui.resetEmail; return ctx.store.requestReset(values.email).message; });
  O.form('reset-confirm', (ctx, values) => {
    checkPasswords(values);
    const result = ctx.store.confirmReset(values.email, values.code, values.password);
    if (!result.ok) throw new Error(result.error);
    ctx.ui.pendingEmail = String(values.email).trim().toLowerCase();
    return { go: 'connexion', message: 'Mot de passe modifié. Toutes les sessions ont été fermées : connectez-vous.' };
  });

  // 5. Catalogue des matières ------------------------------------------------
  O.route('matieres', {
    title: ctx => ctx.params[0] ? u.subjectName(ctx.state, ctx.params[0]) : 'Catalogue des matières',
    description: 'Les matières, niveaux et chapitres couverts par les tuteurs ONTRACK dans les ENCG.',
    render: ctx => {
      const { state } = ctx;
      const tutorsFor = subjectId => state.tutors.filter(tutor => tutor.status === 'approved' && tutor.subjects.includes(subjectId));
      const subject = state.subjects.find(item => item.id === ctx.params[0]);
      if (subject) {
        const tutors = tutorsFor(subject.id);
        return head(`Matière · ${subject.level}`, subject.name, `${subject.chapters.length} chapitres · ${tutors.length} tuteur(s) disponible(s).`) + `<div class="wrap section split"><div><h2>Chapitres</h2><ol class="chapter-list">${subject.chapters.map(chapter => `<li><span>${escape(chapter.name)}</span><span>${tutors.filter(tutor => tutor.chapters.includes(chapter.id)).length} tuteur(s)</span></li>`).join('')}</ol><div class="actions">${tutors.length && subject.chapters.length ? `<button type="button" class="button" data-action="pick-subject" data-id="${escape(subject.id)}">Réserver dans cette matière</button>` : ''}<a class="button secondary" href="#matieres">Toutes les matières</a></div></div><div><h2>Tuteurs</h2>${tutors.map(tutor => O.publicParts.tutorCard(ctx, tutor)).join('') || empty('Aucun tuteur validé', 'Les profils en attente de validation n\'apparaissent pas encore.')}</div></div>`;
      }
      const filter = ctx.ui.subjectFilter || '';
      const list = state.subjects.filter(item => !filter || item.level === filter);
      return head('Catalogue des matières', 'Toutes les matières, chapitre par chapitre.', 'Le référentiel est géré par l\'administration ONTRACK.') + `<div class="wrap section"><form data-form="subject-filter" class="inline-form">${select('Niveau', 'level', state.levels, filter, 'Tous les niveaux')}<button class="button small" type="submit">Filtrer</button></form><div class="grid three">${list.map(item => `<article class="subject-card"><span class="badge gray">${escape(item.level)}</span><h2>${escape(item.name)}</h2><p>${item.chapters.map(chapter => escape(chapter.name)).join(' · ')}</p><p><small>${tutorsFor(item.id).length} tuteur(s) validé(s)</small></p><a class="button small secondary" href="#matieres/${escape(item.id)}">Voir la matière</a></article>`).join('') || empty('Aucune matière', 'Aucune matière pour ce niveau.')}</div></div>`;
    }
  });
  O.form('subject-filter', (ctx, values) => { ctx.ui.subjectFilter = values.level; return { go: 'matieres', message: 'Filtre appliqué.' }; });

  // 6. Catalogue et profils des tuteurs ---------------------------------------
  O.route('catalogue', {
    title: 'Catalogue des tuteurs',
    description: 'Trouvez un tuteur ONTRACK par matière, chapitre, ENCG, niveau, disponibilité, langue, note et mode de séance.',
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
      return head('Catalogue des tuteurs', 'Trouvez votre prochain déclic.', 'Profils validés par l\'administration. Horaires en heure marocaine (Africa/Casablanca).') + `<div class="wrap workspace"><aside class="filters"><h2>Affiner la recherche</h2><form data-form="filters" class="form-stack">${select('Matière', 'subject', state.subjects.map(subject => ({ value: subject.id, label: subject.name })), f.subject, 'Toutes les matières')}${select('Chapitre', 'chapter', chapterOptions, f.chapter, 'Tous les chapitres')}${select('ENCG', 'encg', state.encgs, f.encg, 'Toutes les ENCG')}${select('Niveau d\'études du tuteur (minimum)', 'level', state.levels, f.level, 'Tous les niveaux')}${select('Langue', 'language', data.constants.languages, f.language, 'Toutes les langues')}${select('Mode', 'mode', data.constants.modes, f.mode, 'Tous les modes')}${select('Note minimum', 'rating', [{ value: '4', label: '4 / 5 et plus' }, { value: '4.5', label: '4,5 / 5 et plus' }], f.rating, 'Toutes les notes')}<label>Disponible le (heure marocaine)<input type="date" name="availability" value="${escape(f.availability)}"></label><button type="submit" class="button">Rechercher</button>${button('Effacer les filtres', 'clear-filters', '')}</form></aside><section aria-label="Résultats"><div class="results-top"><strong>${matches.length} tuteur${matches.length > 1 ? 's' : ''}</strong><span class="muted">À partir de ${money(Math.min(...state.offers.map(offer => offer.price)))}</span></div><div class="catalogue-grid">${matches.map(tutor => tutorCard(ctx, tutor)).join('')}</div>${matches.length ? '' : empty('Aucun profil correspondant', 'Essayez une autre matière, une autre date ou moins de filtres.')}</section></div>`;
    }
  });
  O.form('filters', (ctx, values) => { ctx.ui.filters = values; return 'Résultats actualisés.'; });
  O.action('clear-filters', ctx => { ctx.ui.filters = {}; return 'Filtres effacés.'; });
  O.route('profil', {
    title: ctx => { const tutor = ctx.state.tutors.find(item => item.id === ctx.params[0] && item.status === 'approved'); return tutor ? `${tutor.name}, tuteur` : 'Profil indisponible'; },
    description: ctx => { const tutor = ctx.state.tutors.find(item => item.id === ctx.params[0]); return tutor ? `Profil de ${tutor.name}, tuteur ONTRACK (ENCG ${tutor.encg}) : matières, chapitres, disponibilités et avis.` : 'Profil de tuteur ONTRACK.'; },
    render: ctx => {
      const { state, store } = ctx;
      const tutor = state.tutors.find(item => item.id === ctx.params[0] && item.status === 'approved');
      if (!tutor) return head('Catalogue', 'Profil indisponible', 'Ce profil n\'est pas publié (en attente de validation, suspendu ou supprimé).') + '<div class="wrap section"><a class="button" href="#catalogue">Retour au catalogue</a></div>';
      const slots = store.freeSlots(tutor.id, 'quick').filter(slot => !slot.issue || slot.issue.includes('prioritaire')).slice(0, 9);
      const reviews = state.reviews.filter(review => review.tutorId === tutor.id && !review.hidden);
      return `<div class="wrap section"><p class="eyebrow">Tuteur · ENCG ${escape(tutor.encg)}</p><div class="profile-banner">${u.avatar(tutor, 100)}<div><h1>${escape(tutor.name)}</h1><p>${escape(tutor.level)}${tutor.showAge && tutor.age ? ` · ${tutor.age} ans` : ''} · ${u.rating(store, tutor.id)}</p></div></div><div class="split"><div><h2>Présentation</h2><p>${escape(tutor.bio)}</p><h3>Matières enseignées</h3><p class="tags">${tutor.subjects.map(id => badge(u.subjectName(state, id))).join('')}</p><h3>Chapitres maîtrisés</h3><ul class="columns">${tutor.chapters.map(id => `<li>${escape(u.chapterName(state, id))}</li>`).join('')}</ul><h3>Langues et modes</h3><p class="tags">${tutor.languages.map(language => badge(language, 'gray')).join('')}${tutor.modes.map(mode => badge(mode, 'gray')).join('')}</p><h3>Types de séances</h3><p class="tags">${tutor.services.map(id => { const offer = state.offers.find(item => item.id === id); return badge(`${offer.name} · ${money(offer.price)}`, 'violet'); }).join('')}</p><h3>Avis des étudiants (${reviews.length})</h3>${reviews.map(review => `<div class="review"><strong>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} ${review.rating} / 5</strong><p>${escape(review.text)}</p><small>${escape(date(review.created))} · séance vérifiée</small></div>`).join('') || '<p class="muted">Aucun avis publié pour le moment.</p>'}</div><aside class="summary"><h2>Disponibilités</h2>${slots.length ? `<ul class="slot-list">${slots.map(slot => `<li>${escape(date(slot.start))}${slot.priority ? ` ${badge('Prioritaire Stay', 'violet')}` : ''}</li>`).join('')}</ul>` : '<p>Aucun créneau ouvert actuellement.</p>'}<p><small>Heure marocaine. Créneaux « Prioritaire Stay » : réservés aux abonnés jusqu'à ${state.config.policy.priorityHours} h avant le début.</small></p><a class="button" href="#reserver/${escape(tutor.id)}">Réserver avec ${escape(tutor.name.split(' ')[0])}</a></aside></div></div>`;
    }
  });

  // 13. Orientation ---------------------------------------------------------------
  function programCard(ctx, program, recommendation) {
    const passed = Date.parse(ctx.data.moroccoInstant(program.deadline, 23, 59)) < ctx.store.now().getTime();
    return `<article class="program"><div class="booking-top"><h3>${escape(program.name)}</h3><span class="tags">${badge(program.mobility, 'violet')}${passed ? badge('Date limite dépassée', 'red') : ''}</span></div><p><strong>${escape(program.institution)}</strong> · ${escape(program.country)}</p><dl class="facts"><dt>Critères académiques</dt><dd>Niveau ${escape(program.level)} minimum · moyenne ≥ ${escape(String(program.minGrade).replace('.', ','))} / 20 · filières : ${program.tracks.map(escape).join(', ')}</dd><dt>Exigences linguistiques</dt><dd>${escape(program.languageReq.language)} ${escape(program.languageReq.level)}</dd><dt>Date limite</dt><dd>${escape(u.dateOnly(program.deadline))}</dd><dt>Documents</dt><dd>${program.documents.map(escape).join(', ')}</dd></dl>${recommendation ? `<ul class="criteria">${recommendation.criteria.map(item => `<li class="${item.ok ? 'ok' : 'ko'}"><span aria-hidden="true">${item.ok ? '✓' : '✕'}</span> ${escape(item.label)}<span class="sr-only">${item.ok ? ' : rempli' : ' : non rempli'}</span></li>`).join('')}</ul>` : ''}<p><a href="${escape(program.source)}" rel="noopener noreferrer" target="_blank">Source officielle (lien de démonstration)</a></p></article>`;
  }
  O.route('orientation', {
    title: 'Portail d\'orientation internationale',
    description: 'Échanges universitaires et doubles diplômes : recommandations de programmes selon votre profil ENCG, critères, langues et dates limites.',
    render: ctx => {
      const { state, store, user, data } = ctx;
      const active = state.programs.filter(program => program.active);
      const intro = head('Orientation internationale', 'Et après, quel sera votre cap ?', 'Découvrez les échanges universitaires et doubles diplômes potentiellement adaptés à votre profil.');
      const disclaimer = '<p class="notice warning">Programmes et établissements fictifs (démonstration). Les recommandations ne garantissent jamais une admission : vérifiez toujours les informations sur la source officielle de l\'établissement.</p>';
      if (!user || user.role !== 'student') {
        return intro + `<div class="wrap section">${disclaimer}<div class="notice">Connectez-vous avec un compte étudiant pour renseigner votre profil et obtenir des recommandations personnalisées. <a href="#connexion">Connexion</a></div><h2>Programmes référencés</h2><div class="grid two">${active.map(program => programCard(ctx, program)).join('')}</div></div>`;
      }
      const profile = state.orientationProfiles.find(item => item.studentId === user.id) || { encg: user.encg, level: user.level, track: user.track, average: '', validated: '', languages: [{ language: 'Français', level: 'B2' }], countries: [], programType: 'Indifférent' };
      const recommendations = store.recommendations(user.id);
      const byId = id => state.programs.find(program => program.id === id);
      const eligible = recommendations.filter(item => item.eligible);
      const partial = recommendations.filter(item => !item.eligible);
      const languageRow = index => { const item = profile.languages[index] || {}; return `<div class="form-grid">${select(`Langue ${index + 1}`, `language${index}`, data.constants.languages, item.language, index ? 'Aucune' : null)}${select('Niveau (CECRL)', `languageLevel${index}`, data.constants.cefr, item.level || 'B1')}</div>`; };
      const consultations = state.consultations.filter(item => item.studentId === user.id);
      return intro + `<div class="wrap section">${disclaimer}<div class="split"><form data-form="orientation-profile" class="form-stack"><h2>Mon profil d'orientation</h2><p class="hint">Seules les données nécessaires à l'orientation sont demandées.</p>${select('ENCG', 'encg', state.encgs, profile.encg)}${select('Niveau d\'études', 'level', state.levels, profile.level)}${select('Filière', 'track', data.constants.tracks, profile.track)}${field('Moyenne générale (/20)', 'average', profile.average, 'number', 'min="0" max="20" step="0.01"')}${textarea('Matières et semestres validés', 'validated', profile.validated, 'maxlength="300" placeholder="Ex. : S1 à S4 validés, comptabilité 15/20"')}${[0, 1, 2].map(languageRow).join('')}${checks('Préférences géographiques', 'countries', [...new Set(state.programs.map(program => program.country))], profile.countries)}${select('Type de programme recherché', 'programType', ['Indifférent', ...data.constants.mobilities], profile.programType)}<button class="button" type="submit">Enregistrer et voir mes recommandations</button></form><aside><h2>Mes recommandations</h2>${state.orientationProfiles.some(item => item.studentId === user.id) ? `<p>${eligible.length} programme(s) potentiellement adapté(s) : tous les critères affichés sont remplis.</p>${eligible.map(item => programCard(ctx, byId(item.programId), item)).join('') || empty('Aucun programme complet', 'Consultez les pistes à explorer ci-dessous.')}` : empty('Profil à compléter', 'Renseignez votre profil pour obtenir des recommandations.')}</aside></div>${partial.length ? `<h2>Pistes à explorer</h2><p class="muted">Programmes dont certains critères ne sont pas encore remplis.</p><div class="grid two">${partial.map(item => programCard(ctx, byId(item.programId), item)).join('')}</div>` : ''}<div class="split section"><form data-form="consultation" class="form-stack"><h2>Demander un entretien d'orientation</h2><p>Un enseignant ou conseiller autorisé vous aide à comprendre les critères, comparer les programmes et préparer votre dossier.</p>${checks('Programmes concernés', 'programIds', active.map(program => ({ value: program.id, label: program.name })), [])}${textarea('Votre demande', 'topic', '', 'minlength="10" maxlength="600" required')}${optional('Disponibilités', 'availability', '', 'text', 'maxlength="120"')}<button class="button" type="submit">Envoyer ma demande</button></form><div><h2>Mes demandes</h2>${consultations.map(item => `<div class="review"><strong>${escape(date(item.created))} · ${escape(item.status)}</strong><p>${escape(item.topic)}</p>${item.note ? `<small>${escape(item.note)}</small>` : ''}</div>`).join('') || '<p class="muted">Aucune demande pour le moment.</p>'}</div></div></div>`;
    }
  });
  O.form('orientation-profile', (ctx, values, form) => {
    const data = new FormData(form);
    const languages = [0, 1, 2].map(index => ({ language: values[`language${index}`], level: values[`languageLevel${index}`] })).filter(item => item.language);
    ctx.store.saveOrientationProfile({ ...values, languages, countries: data.getAll('countries') });
    return 'Profil d\'orientation enregistré : recommandations actualisées.';
  });
  O.form('consultation', (ctx, values, form) => { ctx.store.requestConsultation({ ...values, programIds: new FormData(form).getAll('programIds') }); return 'Demande envoyée : un e-mail de confirmation vous a été adressé.'; });

  // 14. Study Pods ----------------------------------------------------------------
  O.route('pods', {
    title: 'ONTRACK Study Pods — Coming Soon',
    description: 'ONTRACK Study Pods : petits espaces privés près des campus pour étudier avec son tuteur. Bientôt disponible.',
    render: ctx => head('ONTRACK Study Pods', 'Un lieu pour rester dans le rythme.', 'Coming Soon') + `<div class="wrap section split"><div><img class="pods-image" src="assets/pods.jpg" alt="Espace de travail calme, illustration du concept" width="1400" height="934"><h2>Les avantages</h2><ul><li>Un lieu professionnel et calme, à proximité des campus.</li><li>Rencontrer son tuteur sans recevoir quelqu'un chez soi.</li><li>Réservation de créneau et QR code d'accès à l'arrivée.</li><li>Informations pratiques sur chaque lieu.</li></ul><h2>Lieux à l'étude</h2><ul>${ctx.state.pods.locations.map(location => `<li><strong>${escape(location.name)}</strong> · ${escape(location.city)} — ${escape(location.status)}</li>`).join('')}</ul></div><div><span class="badge violet big">Coming Soon</span><h2>Le calme pour se concentrer. L'énergie pour avancer.</h2><p>Les Study Pods seront de petits espaces privés situés près des campus universitaires. Ils ouvriront en phase 3.</p><p class="notice warning">Aucune réservation n'est possible avant la mise en service effective des espaces.</p><form data-form="pods-news" class="form-stack"><h3>Recevoir les actualités du lancement</h3>${field('Adresse e-mail', 'email', ctx.user ? ctx.user.email : '', 'email', 'maxlength="120" autocomplete="email"')}${select('Ville souhaitée', 'city', ctx.state.encgs, '', 'Peu importe')}<button class="button" type="submit">Je veux être informé</button><p class="hint">Facultatif. Votre adresse sert uniquement à cette information.</p></form></div></div>`
  });
  O.form('pods-news', (ctx, values) => { ctx.store.subscribePods(values.email, values.city); ctx.ui.podsEmail = String(values.email).trim().toLowerCase(); ctx.ui.mailbox = ctx.ui.podsEmail; return 'Inscription enregistrée : vous recevrez les actualités du lancement.'; });

  // 15. Contact ----------------------------------------------------------------------
  O.route('contact', {
    title: 'Contact et assistance',
    description: 'Contactez l\'équipe ONTRACK : assistance, réservation, paiement, compte ou orientation.',
    render: ctx => head('Contact et assistance', 'Une question ? Nous sommes là.', 'Réponse sous 48 h ouvrées (engagement de démonstration).') + `<div class="wrap section split"><form data-form="contact" class="form-stack">${field('Nom', 'name', ctx.user ? ctx.user.name : '', 'text', 'maxlength="80" autocomplete="name"')}${optional('Adresse e-mail', 'email', ctx.user ? ctx.user.email : '', 'email', 'maxlength="120"')}${select('Sujet', 'subject', ['Assistance', 'Réservation', 'Paiement ou remboursement', 'Compte et données personnelles', 'Orientation', 'Devenir tuteur'])}${textarea('Message', 'text', '', 'minlength="5" maxlength="1000" required')}<button class="button" type="submit">Envoyer</button><p class="hint">N'indiquez ni coordonnées bancaires ni mot de passe.</p></form><aside class="summary"><h2>Coordonnées</h2><p>contact@ontrack.example.org (fictif)<br>Du lundi au vendredi, 9 h – 18 h (heure marocaine)</p><h3>Questions fréquentes</h3><details><summary>Comment annuler une séance ?</summary><p>Depuis Mon espace > Mes séances, jusqu'à ${ctx.state.config.policy.cancelHours} h avant le début.</p></details><details><summary>Mon paiement a échoué</summary><p>Aucune somme n'est débitée ; le créneau est libéré et un nouvel essai est possible.</p></details><details><summary>Comment supprimer mon compte ?</summary><p>Mon espace > Mon profil > Supprimer mon compte (mot de passe requis).</p></details></aside></div>`
  });
  O.form('contact', (ctx, values) => { ctx.store.message(values); return 'Message envoyé à l\'équipe ONTRACK (conservé dans l\'administration de la démonstration).'; });

  // 17. Pages légales -------------------------------------------------------------
  O.route('cgu', {
    title: 'Conditions d\'utilisation',
    description: 'Conditions générales d\'utilisation d\'ONTRACK : comptes, réservations, paiement, annulation, forfaits et avis.',
    render: ctx => head('Pages légales', 'Conditions d\'utilisation', 'Version de démonstration — à faire valider juridiquement avant tout lancement.') + `<div class="wrap section prose"><h2>1. Objet</h2><p>ONTRACK met en relation des étudiants des 12 ENCG du Maroc avec des tuteurs pour des séances de tutorat individuelles et propose un portail d'orientation.</p><h2>2. Accès et comptes</h2><p>Le service est réservé aux étudiants disposant d'une adresse e-mail officielle d'une ENCG participante. Chaque compte est personnel. Les profils tuteurs sont publiés après validation par l'administration.</p><h2>3. Services et tarifs</h2><ul>${ctx.state.offers.map(offer => `<li><strong>${escape(offer.name)}</strong> : ${money(offer.price)} — ${escape(u.offerFormat(offer))}.</li>`).join('')}</ul><p>Les tarifs peuvent être ajustés par l'administration ; le prix applicable est celui affiché au moment de la réservation.</p><h2>4. Réservation, paiement et confirmation</h2><p>Une réservation n'est confirmée qu'après validation du paiement par le prestataire. En cas d'échec, elle n'est pas considérée comme payée et le créneau est libéré.</p><h2>5. Annulation, modification et absences</h2>${u.policyList(ctx.state)}<h2>6. Avis</h2><p>Seul un étudiant ayant effectivement suivi une séance peut publier un avis sur celle-ci. Les avis abusifs peuvent être signalés et masqués par l'administration.</p><h2>7. Tuteurs</h2><p>Phase actuelle : <strong>${ctx.state.config.payout.phase === 'volunteer' ? 'programme pilote volontaire' : 'phase rémunérée'}</strong>. ${ctx.state.config.payout.phase === 'volunteer' ? 'Aucune rémunération par séance n\'est due ; la participation ne garantit aucune rémunération future.' : `Rémunération par séance terminée et vérifiée : ${ctx.state.offers.map(offer => `${escape(offer.name)} ${money(ctx.state.config.payout.rates[offer.id])}`).join(', ')}.`}</p><h2>8. Orientation</h2><p>Les recommandations sont indicatives et ne garantissent jamais une admission.</p><h2>9. Study Pods</h2><p>Fonctionnalité future : aucune réservation n'est possible avant l'ouverture effective.</p></div>`
  });
  O.route('confidentialite', {
    title: 'Politique de confidentialité',
    description: 'Données collectées par ONTRACK, finalités, durées de conservation, sécurité et droits (loi n° 09-08, CNDP).',
    render: ctx => head('Pages légales', 'Politique de confidentialité', 'Conforme dans son principe à la loi n° 09-08 ; déclaration CNDP à effectuer avant lancement.') + `<div class="wrap section prose"><h2>Responsable et cadre</h2><p>ONTRACK traite les données personnelles dans le respect de la loi marocaine n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel. Les traitements doivent être déclarés ou autorisés auprès de la CNDP avant la mise en production.</p><h2>Données collectées et finalités</h2><div class="table-wrap"><table><thead><tr><th scope="col">Données</th><th scope="col">Finalité</th><th scope="col">Conservation</th></tr></thead><tbody><tr><td>Nom, e-mail universitaire, ENCG, niveau, filière</td><td>Création du compte, vérification de l'accès</td><td>Durée du compte, supprimées à la suppression du compte</td></tr><tr><td>Mot de passe (haché SHA-256 avec sel)</td><td>Authentification</td><td>Durée du compte</td></tr><tr><td>Besoin décrit, métadonnées de pièce jointe</td><td>Préparation de la séance par le tuteur</td><td>Anonymisés à la suppression du compte</td></tr><tr><td>Réservations et transactions</td><td>Exécution du service, obligations comptables</td><td>10 ans sous forme anonymisée (à confirmer)</td></tr><tr><td>Comptes rendus et progression</td><td>Suivi pédagogique</td><td>Durée du compte</td></tr><tr><td>Profil d'orientation</td><td>Recommandations de programmes</td><td>Durée du compte</td></tr><tr><td>Journal des tentatives de connexion</td><td>Sécurité</td><td>Jusqu'à la connexion réussie ou au déblocage</td></tr></tbody></table></div><h2>Ce que nous ne collectons pas</h2><p>Aucun mot de passe universitaire, aucun numéro Apogée comme preuve d'identité, aucune donnée bancaire : le paiement est traité par le prestataire. Le contenu des pièces jointes n'est pas conservé par cette démonstration (seuls le nom, le type et la taille).</p><h2>Sécurité</h2><ul><li>HTTPS obligatoire en production.</li><li>Mots de passe hachés et salés, codes de vérification hachés.</li><li>Sessions expirant après ${ctx.state.config.policy.sessionHours} h d'inactivité, déconnexion explicite.</li><li>Blocage après ${ctx.state.config.policy.maxAttempts} échecs de connexion.</li><li>Accès aux données limité selon le rôle (étudiant, tuteur, administrateur).</li><li>Sauvegardes régulières et procédure de restauration (export/import administrateur).</li></ul><h2>Vos droits</h2><p>Accès, rectification, opposition et suppression : depuis votre profil ou via la page <a href="#contact">Contact</a>. La suppression du compte est disponible dans Mon espace > Mon profil.</p><h2>Indexation</h2><p>Les espaces personnels ne sont pas indexés par les moteurs de recherche (balise <code>noindex</code> et <code>robots.txt</code>).</p></div>`
  });
  O.route('mentions', {
    title: 'Mentions légales et démonstration',
    description: 'Mentions légales d\'ONTRACK et cadre de la démonstration académique.',
    render: ctx => head('Pages légales', 'Mentions légales', 'Démonstration académique — aucun service réel.') + `<div class="wrap section prose"><h2>Éditeur</h2><p>Projet académique ONTRACK (démonstration). Hébergement, nom de domaine et raison sociale à préciser avant lancement : voir la documentation technique.</p><h2>Cadre de la démonstration</h2><p>Personnes, comptes, notes, programmes, établissements, transactions et disponibilités sont fictifs. La mention d'une ENCG n'implique aucun partenariat. Paiements, e-mails, visioconférence et intégrations universitaires sont simulés. La passerelle CMI/Payzone est un écran de scénario : aucune donnée bancaire n'est saisie.</p><h2>Stockage local</h2><p>Les données sont conservées dans ce navigateur (localStorage, clé <code>ontrack-demo-v2</code>), avec repli en mémoire si le stockage est indisponible. Aucun serveur, aucun outil d'analyse, aucun partage entre appareils.</p><button type="button" class="button secondary" data-action="reset" data-confirm="Remplacer toutes les données locales par le scénario initial ?">Réinitialiser la démonstration</button><h2>Illustrations</h2><p>Photographies issues d'Unsplash, conservées localement ; elles ne représentent pas les identités fictives affichées.</p></div>`
  });

  // Boîte mail simulée ----------------------------------------------------------------
  O.route('boite-mail', {
    title: 'Boîte mail simulée',
    description: 'Simulateur de messagerie : e-mails envoyés par ONTRACK dans la démonstration.',
    private: true,
    render: ctx => {
      const { state } = ctx;
      const addresses = mailboxes(ctx);
      const address = addresses.includes(ctx.ui.mailbox) ? ctx.ui.mailbox : addresses[0] || '';
      const emails = address ? state.emails.filter(email => email.to === address) : [];
      return head('Outil de démonstration', 'Boîte mail simulée', 'Les e-mails automatiques d\'ONTRACK (§12) arrivent ici au lieu d\'être réellement envoyés.') + `<div class="wrap section"><p class="notice warning">Limite de simulation : cette boîte n'affiche que l'adresse du compte connecté et les adresses saisies dans cet onglet (inscription, vérification, mot de passe oublié, actualités Study Pods). Les codes y apparaissent en clair, comme dans une vraie boîte de réception ; en base, ils ne sont conservés que hachés.</p>${addresses.length > 1 ? `<form class="inline-form" data-form="mailbox"><label>Adresse consultée<select name="address" data-change="mailbox">${u.options(addresses, address)}</select></label></form>` : address ? `<p>Adresse consultée : <strong>${escape(address)}</strong></p>` : ''}${emails.length ? emails.map(email => `<article class="email${email.read ? '' : ' unread'}" aria-label="${escape(email.subject)}"><header class="email-head"><img src="assets/logo-ontrack.png" alt="ONTRACK" width="120" height="37"><div><h2>${escape(email.subject)}</h2><p><small>De : ONTRACK &lt;no-reply@ontrack.example.org&gt; · À : ${escape(email.to)} · ${escape(date(email.created))}</small></p></div></header><div class="email-body">${email.lines.map(line => `<p>${escape(line)}</p>`).join('')}</div><footer class="email-foot">ONTRACK — Your Study, Our Priority. · E-mail automatique simulé</footer>${email.read ? '' : button('Marquer comme lu', 'mail-read', email.id)}</article>`).join('') : empty('Boîte vide', address ? 'Aucun e-mail pour cette adresse.' : 'Connectez-vous ou saisissez votre adresse (inscription, vérification, mot de passe oublié) pour consulter vos e-mails.')}</div>`;
    }
  });
  function mailboxes(ctx) { return [...new Set([ctx.user ? ctx.user.email : '', ctx.ui.pendingEmail, ctx.ui.resetEmail, ctx.ui.podsEmail].filter(Boolean))]; }
  function chooseMailbox(ctx, address) { if (!mailboxes(ctx).includes(address)) throw new Error('Adresse non consultable depuis cet onglet.'); ctx.ui.mailbox = address; }
  O.mailboxes = mailboxes;
  O.change('mailbox', (ctx, element) => { chooseMailbox(ctx, element.value); return { message: `Boîte de ${element.value}` }; });
  O.form('mailbox', (ctx, values) => { chooseMailbox(ctx, values.address); return 'Boîte actualisée.'; });
  O.action('mail-read', (ctx, dataset) => {
    const email = ctx.state.emails.find(item => item.id === dataset.id);
    if (!email || !mailboxes(ctx).includes(email.to)) throw new Error('E-mail non consultable depuis cet onglet.');
    ctx.store.markEmailRead(dataset.id);
    return 'E-mail marqué comme lu.';
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
