'use strict';
// Assistant ONTRACK (assistant.js) : intentions FR et EN, réponses tirées de l'état, personnalisation,
// repli, saisie invalide, liens limités aux routes internes, bilinguisme sans clé manquante.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
globalThis.OntrackSha256 = require('../sha256.js');
globalThis.OntrackData = require('../data.js');
const { createStore } = require('../store.js');
for (const file of ['i18n.js', 'i18n-en.js', 'ui.js']) require(`../${file}`);
const assistant = require('../assistant.js');
const { i18n } = globalThis.Ontrack;

const INSTANT = new Date('2026-10-23T08:00:00Z');
const OMAR = ['omar.tazi@etu.encg-settat.demo', 'Demo2026!'];
const SALMA = ['salma.benali@etu.encg-casablanca.demo', 'Demo2026!'];
const ADMIN = ['admin@ontrack.demo', 'Admin2026!'];
const TUTOR = ['yassine.amrani@etu.encg-casablanca.demo', 'Demo2026!'];
const fresh = () => createStore(null, () => INSTANT);
const ask = (store, text, extra) => assistant.answer(text, { state: store.get(), user: store.currentUser(), now: store.now(), ...extra });
const as = (store, account) => { store.logout(); if (account) store.login(...account); return store; };
const inLanguage = (lang, run) => { const previous = i18n.get(); i18n.set(lang); try { return run(); } finally { i18n.set(previous); } };

// Une phrase française et une phrase anglaise par cas : 15 intentions et le repli (16 cas).
const PHRASES = {
  greeting: ['Bonjour, que sais-tu faire ?', 'Hello, what can you do?'],
  pricing: ['Combien coûte une séance ?', 'What is the price of a session?'],
  booking: ['Je veux réserver un tuteur', 'How do I book a tutor?'],
  cancel: ['Comment annuler ou reprogrammer une séance ?', 'Can I cancel or reschedule a session?'],
  payment: ['Mon paiement a échoué', 'My card payment failed'],
  packages: ['Combien de crédits Stay me reste-t-il ?', 'How many package credits do I have left?'],
  progress: ['Où voir ma progression et mes comptes rendus ?', 'Where can I see my progress and session reports?'],
  orientation: ['Quelles destinations pour une mobilité à l\'étranger ?', 'Which exchange destinations abroad?'],
  tracks: ['Quelles filières existent ?', 'Which tracks are available?'],
  becomeTutor: ['Comment devenir tuteur ?', 'How do I become a tutor?'],
  pods: ['C\'est quoi les Study Pods ?', 'What are Study Pods?'],
  account: ['J\'ai oublié mon mot de passe', 'I forgot my password'],
  privacy: ['Que faites-vous de mes données personnelles ?', 'What about my personal data and privacy?'],
  contact: ['Comment vous contacter ?', 'How can I contact you?'],
  project: ['Qui encadre le projet ?', 'Who supervises the project?'],
  fallback: ['météo demain', 'weather tomorrow']
};

test('15 intentions et un repli (16 cas) : une phrase française et une phrase anglaise reconnues', () => {
  assert.equal(assistant.INTENTS.length + 1, 16, '15 intentions et le repli');
  assert.deepEqual(Object.keys(PHRASES).sort(), [...assistant.INTENTS.map(intent => intent.id), 'fallback'].sort());
  const store = fresh();
  for (const [intent, phrases] of Object.entries(PHRASES)) {
    for (const phrase of phrases) {
      const result = ask(store, phrase);
      assert.equal(result.intent, intent, `« ${phrase} »`);
      assert.ok(result.text.trim(), `réponse vide : ${phrase}`);
      assert.ok(Array.isArray(result.links) && Array.isArray(result.suggestions));
    }
  }
});

test('normalisation : casse, accents et ponctuation neutralisés', () => {
  assert.equal(assistant.normalize('  RÉSERVER, un Tuteur !! '), 'reserver un tuteur');
  assert.equal(assistant.normalize('Mot-de-passe oublié ?'), 'mot de passe oublie');
  const store = fresh();
  for (const phrase of ['RÉSERVER un tuteur', 'reserver', 'Réservation']) assert.equal(ask(store, phrase).intent, 'booking', phrase);
});

test('classement : salutation + vraie question, « stay » hors forfait, suppression d\'une réservation, sigles', () => {
  const store = fresh();
  const cases = {
    'Bonjour, quel est le coût ?': 'pricing', 'Hello, how much?': 'pricing', 'Merci, comment annuler ?': 'cancel', 'Bonjour': 'greeting', 'Thanks!': 'greeting',
    'Can I stay abroad for a semester?': 'orientation', 'combien de crédits Stay ONTRACK ?': 'packages',
    'Comment supprimer ma réservation ?': 'cancel', 'How do I delete my booking?': 'cancel', 'Remove a session': 'cancel', 'supprimer mes données personnelles': 'privacy',
    'MRH': 'tracks', 'PSCM ?': 'tracks', 'BA': 'tracks', 'MD': 'tracks', 'celle-ci': 'fallback'
  };
  for (const [phrase, intent] of Object.entries(cases)) assert.equal(ask(store, phrase).intent, intent, phrase);
});

test('tarifs : offres de l\'état avec prix et lien vers les tarifs', () => {
  const store = fresh();
  for (const phrase of ['combien coûte une séance ?', 'price']) {
    const result = ask(store, phrase);
    assert.equal(result.intent, 'pricing');
    for (const offer of store.get().offers) { assert.ok(result.text.includes(offer.name), offer.name); assert.match(result.text, new RegExp(`${offer.name} : ${offer.price} DH`)); }
    assert.deepEqual(result.links.map(item => item.href), ['#accueil/offres']);
  }
});

test('donnée modifiée par l\'admin : le nouveau tarif est cité tel quel', () => {
  const store = as(fresh(), ADMIN);
  store.setOffer('quick', { price: 99 });
  as(store, null);
  const result = ask(store, 'combien coûte une séance ?');
  assert.match(result.text, /Quick Help : 99 DH/);
  assert.doesNotMatch(result.text, /Quick Help : 50 DH/);
});

test('personnalisé : Omar voit ses crédits Stay restants, d\'après ses forfaits actifs', () => {
  const store = as(fresh(), OMAR);
  const pack = store.get().packages.find(item => item.studentId === 's2' && item.status === 'active');
  const result = ask(store, 'mes crédits Stay');
  assert.equal(result.intent, 'packages');
  assert.match(result.text, new RegExp(`Il vous reste ${pack.remaining} séance\\(s\\) sur votre forfait Stay ONTRACK`));
  assert.ok(result.links.some(item => item.href === '#etudiant/forfaits'));
  // Salma n'a aucun forfait : rien sur ceux d'Omar.
  as(store, SALMA);
  const other = ask(store, 'mes crédits Stay');
  assert.match(other.text, /aucun forfait actif/);
  assert.doesNotMatch(other.text, /Il vous reste/);
});

test('visiteur : invité à se connecter, sans aucune donnée personnelle', () => {
  const store = fresh();
  const result = ask(store, 'Combien de crédits me reste-t-il ?');
  assert.equal(result.intent, 'packages');
  assert.match(result.text, /Connectez-vous avec votre compte étudiant/);
  assert.doesNotMatch(result.text, /Il vous reste|Omar|Salma|forfait actif/);
  assert.ok(result.links.some(item => item.href === '#connexion'));
  // Aucune intention ne cite un utilisateur de la démonstration à un visiteur.
  const names = store.get().users.filter(user => user.role === 'student').flatMap(user => [user.name, user.email]);
  for (const phrases of Object.values(PHRASES)) for (const phrase of phrases) for (const name of names) assert.ok(!ask(store, phrase).text.includes(name), `${phrase} : ${name}`);
  // Un tuteur n'a pas de forfait et ne voit pas ceux des étudiants.
  as(store, TUTOR);
  const tutor = ask(store, 'mes crédits');
  assert.match(tutor.text, /uniquement les comptes étudiants/);
  assert.doesNotMatch(tutor.text, /Il vous reste/);
});

test('orientation : effectifs tels que communiqués, jamais additionnés, sans critère inventé', () => {
  const store = fresh();
  const result = ask(store, 'places à HEC Liège');
  assert.equal(result.intent, 'orientation');
  assert.match(result.text, /HEC Liège — Université de Liège \(Belgique\) — Liste principale : 20 · Liste d'attente : 20/);
  assert.doesNotMatch(result.text, /\b40\b/, 'listes jamais additionnées');
  assert.match(result.text, /critères d'admission non communiqués/);
  assert.match(result.text, /Aucune admission n'est garantie/);
  assert.doesNotMatch(result.text, /moyenne minimale|niveau minimum|date limite/);
  assert.deepEqual(result.links.map(item => item.href), ['#orientation']);
  const all = ask(store, 'Quelles destinations ?');
  assert.match(all.text, /9 destinations communiquées par l'ENCG/);
  for (const program of store.get().programs) assert.ok(all.text.includes(program.institution), program.institution);
  assert.match(ask(store, 'Quelles places en Allemagne ?').text, /Hochschule Ludwigshafen am Rhein \(Allemagne\) — Candidats : 22/);
  assert.match(ask(store, 'Any seats in Germany?').text, /Hochschule Ludwigshafen/);
  // Un critère renseigné par l'administration est cité, et seulement lui.
  const state = store.get();
  state.programs.find(item => item.id === 'rennes-sb').minGrade = 12;
  const rennes = assistant.answer('Rennes ?', { state, user: null });
  assert.equal(rennes.intent, 'orientation');
  assert.match(rennes.text, /critères communiqués : moyenne minimale 12\/20\./);
  // Seules les filières sont communiquées : elles sont citées comme critère connu.
  state.programs.find(item => item.id === 'centria').tracks = ['Finance', 'Business Administration (BA)'];
  const centria = assistant.answer('Centria ?', { state, user: null });
  assert.match(centria.text, /Centria University of Applied Sciences : critères communiqués : filières éligibles : Finance, Business Administration \(BA\)\./);
  assert.doesNotMatch(centria.text, /Centria University of Applied Sciences : critères d'admission non communiqués/);
  // Une destination désactivée n'est plus proposée.
  state.programs.find(item => item.id === 'rennes-sb').active = false;
  assert.doesNotMatch(assistant.answer('Quelles destinations ?', { state, user: null }).text, /Rennes/);
});

test('filières : groupes par cycle et filtrage par niveau', () => {
  const store = fresh();
  const all = ask(store, 'Quelles filières existent ?');
  for (const group of globalThis.OntrackData.constants.trackGroups) assert.ok(all.text.includes(group.cycle), group.cycle);
  const s6 = ask(store, 'Quelles filières en S6 ?');
  assert.equal(s6.intent, 'tracks');
  assert.match(s6.text, /Filières proposées au niveau S6 : Gestion, Commerce\./);
  as(store, SALMA);
  assert.match(ask(store, 'Quelles filières ?').text, /Votre profil : niveau S6, filière Gestion\./);
});

test('politique, paiement, pods et compte : chiffres repris de l\'état', () => {
  const store = fresh();
  const state = store.get();
  state.config.policy.cancelHours = 48;
  state.config.policy.rescheduleHours = 6;
  const cancel = assistant.answer('Comment annuler une séance ?', { state, user: null });
  assert.match(cancel.text, /jusqu'à 48 h avant/);
  assert.match(cancel.text, /jusqu'à 6 h avant/);
  assert.match(assistant.answer('paiement', { state, user: null }).text, new RegExp(`retenu ${state.config.policy.holdMinutes} minutes`));
  assert.match(assistant.answer('Study Pods ?', { state, user: null }).text, new RegExp(`${state.pods.locations.length} emplacement\\(s\\) à l'étude`));
  assert.match(assistant.answer('mot de passe', { state, user: null }).text, new RegExp(`Après ${state.config.policy.maxAttempts} tentatives`));
  const booking = ask(store, 'réserver');
  assert.match(booking.text, new RegExp(`^${state.tutors.filter(tutor => tutor.status === 'approved').length} tuteur\\(s\\) validé\\(s\\)`));
  assert.ok(!booking.text.includes('Adam Idrissi'), 'tuteur non validé absent');
  assert.ok(booking.links.some(item => item.href === '#reserver'));
  // Tuteur ou admin : réservation réservée aux étudiants, donc pas de lien vers #reserver.
  for (const account of [TUTOR, ADMIN]) {
    const other = ask(as(store, account), 'réserver un tuteur');
    assert.match(other.text, /réservée aux comptes étudiants/);
    assert.ok(!other.links.some(item => item.href === '#reserver'));
  }
  as(store, null);
});

test('repli : « Je n\'ai pas compris » et 4 suggestions', () => {
  const store = fresh();
  const result = ask(store, 'météo demain');
  assert.equal(result.intent, 'fallback');
  assert.match(result.text, /^Je n'ai pas compris/);
  assert.equal(result.suggestions.length, 4);
  assert.deepEqual(result.links, []);
  // Chaque suggestion proposée est elle-même comprise.
  for (const suggestion of result.suggestions) assert.notEqual(ask(store, suggestion).intent, 'fallback', suggestion);
});

test('saisie vide ou trop longue : rien n\'est envoyé, message de longueur', () => {
  const store = fresh();
  for (const text of ['', '   ', 'x'.repeat(301), null, undefined]) {
    const result = ask(store, text);
    assert.equal(result.intent, 'invalid');
    assert.equal(result.error, true);
    assert.equal(result.text, 'Votre question doit compter entre 1 et 300 caractères.');
    assert.equal(assistant.validate(text), result.text);
  }
  assert.equal(assistant.validate('x'.repeat(300)), '');
  assert.notEqual(ask(store, `réserver ${'x'.repeat(290)}`).intent, 'invalid');
});

test('injection : la saisie n\'est jamais reprise dans la réponse, l\'interface l\'échappe', () => {
  const store = fresh();
  const payload = '<img src=x onerror=alert(1)>';
  const result = ask(store, payload);
  assert.ok(!result.text.includes('<img'));
  assert.equal(globalThis.Ontrack.ui.escape(payload), '&lt;img src=x onerror=alert(1)&gt;');
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(app, /escape\(entry\.question\)/, 'question échappée');
  assert.match(app, /escape\(entry\.answer\.text\)/, 'réponse échappée');
  assert.match(app, /escape\(item\.href\)/);
});

test('liens : uniquement des routes internes de la liste fixe', () => {
  for (const href of Object.keys(assistant.ROUTES)) assert.match(href, /^#[a-z-]+(\/[a-z-]+)?$/);
  const views = {};
  for (const file of ['views-public.js', 'views-student.js', 'views-tutor.js', 'views-admin.js']) require(`../${file}`);
  Object.assign(views, globalThis.Ontrack.routes);
  for (const href of Object.keys(assistant.ROUTES)) assert.ok(views[href.slice(1).split('/')[0]], `route inexistante : ${href}`);
  for (const account of [null, OMAR, SALMA, TUTOR, ADMIN]) {
    const store = as(fresh(), account);
    for (const phrases of Object.values(PHRASES)) for (const phrase of phrases) for (const item of ask(store, phrase).links) {
      assert.ok(Object.hasOwn(assistant.ROUTES, item.href), item.href);
      assert.ok(item.label);
    }
  }
});

test('libellés calculés (liens ROUTES, suggestions) présents dans le dictionnaire anglais', () => {
  // Ces clés passent par t(variable) : le scan des t('…') littéraux de i18n.test.cjs ne les voit pas.
  const dictionary = i18n.dictionaries.en;
  for (const label of Object.values(assistant.ROUTES)) assert.ok(Object.hasOwn(dictionary, label), `lien : ${label}`);
  for (const suggestion of assistant.defaultSuggestions()) assert.ok(Object.hasOwn(dictionary, suggestion), `suggestion : ${suggestion}`);
  for (const make of Object.values(assistant.SUGGESTIONS)) assert.ok(Object.hasOwn(dictionary, make(key => key)), `suggestion : ${make(key => key)}`);
});

test('anglais actif : réponses en anglais, données non traduites, aucune clé manquante', () => {
  i18n.missing.clear();
  inLanguage('en', () => {
    const t = i18n.t;
    const locale = i18n.locale();
    for (const account of [null, OMAR, SALMA, TUTOR, ADMIN]) {
      const store = as(fresh(), account);
      for (const phrases of Object.values(PHRASES)) for (const phrase of phrases) {
        const result = ask(store, phrase, { t, locale });
        assert.doesNotMatch(result.text, /undefined|NaN|\[object Object\]|\{[a-zA-Z]\w*\}/, phrase);
      }
      for (const text of ['', 'places à HEC Liège', 'Quelles filières en S7 ?', 'Rennes ?']) ask(store, text, { t, locale });
    }
    const store = as(fresh(), OMAR);
    const pricing = ask(store, 'price', { t, locale });
    assert.match(pricing.text, /^Current prices, all taxes included:/);
    assert.match(pricing.text, /Quick Help: 50 DH \(one 30-min session\)/);
    assert.deepEqual(pricing.links, [{ href: '#accueil/offres', label: 'See pricing' }]);
    assert.match(ask(store, 'my credits', { t, locale }).text, /You have 2 session\(s\) left on your Stay ONTRACK package/);
    const hec = ask(store, 'seats at HEC Liège', { t, locale });
    assert.match(hec.text, /Liste principale : 20 · Liste d'attente : 20/, 'données non traduites');
    assert.match(hec.text, /No admission is guaranteed/);
    assert.match(ask(store, 'weather', { t, locale }).text, /^I did not understand/);
    assert.equal(ask(store, '', { t, locale }).text, 'Your question must be between 1 and 300 characters long.');
    assert.deepEqual(assistant.defaultSuggestions(t), ['How much does a session cost?', 'How do I book a tutor?', 'Which destinations abroad?', 'How many credits do I have left?']);
    // Les suggestions anglaises sont comprises comme les françaises.
    for (const suggestion of assistant.defaultSuggestions(t)) assert.notEqual(ask(store, suggestion, { t }).intent, 'fallback', suggestion);
  });
  assert.deepEqual([...i18n.missing], [], 'libellés de l\'assistant sans traduction anglaise');
});

test('aucun appel réseau ni stockage dans le module', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assistant.js'), 'utf8');
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|import\s/);
  const shell = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(shell.indexOf('src="assistant.js"') < shell.indexOf('src="app.js"'), 'assistant.js chargé avant app.js');
  assert.match(shell, /role="dialog" aria-modal="false"/);
  assert.match(shell, /data-i18n>Assistant simulé : réponses préprogrammées, sans intelligence artificielle ni envoi de données</);
  const main = shell.slice(shell.indexOf('<main'), shell.indexOf('</main>'));
  assert.ok(!main.includes('assistant'), 'conteneur hors de <main>');
});
