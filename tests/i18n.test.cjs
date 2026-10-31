'use strict';
// Interface bilingue : moteur de traduction, intégrité du dictionnaire anglais et couverture de toutes les vues.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
globalThis.OntrackSha256 = require('../sha256.js');
globalThis.OntrackData = require('../data.js');
const { createStore } = require('../store.js');
for (const file of ['i18n.js', 'i18n-en.js', 'ui.js', 'views-public.js', 'views-student.js', 'views-tutor.js', 'views-admin.js']) require(`../${file}`);
const O = globalThis.Ontrack;
const { i18n } = O;
const dictionary = i18n.dictionaries.en;
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const unescapeJs = text => text.replace(/\\(.)/g, (match, character) => ({ n: '\n', t: '\t' }[character] || character));
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',');
const inLanguage = (lang, run) => { const previous = i18n.get(); i18n.set(lang); try { return run(); } finally { i18n.set(previous); } };

test('moteur : français par défaut, anglais à la demande, paramètres insérés', () => {
  assert.equal(i18n.get(), 'fr');
  assert.equal(i18n.t('Connexion'), 'Connexion');
  assert.equal(i18n.t('{days} jours', { days: 7 }), '7 jours');
  inLanguage('en', () => {
    assert.equal(i18n.t('Connexion'), 'Log in');
    assert.equal(i18n.t('{days} jours', { days: 7 }), '7 days');
    assert.equal(i18n.locale(), 'en-GB');
    assert.equal(O.ui.money(1234.5), '1,234.5 DH');
  });
  assert.equal(i18n.set('de'), 'fr', 'langue inconnue ignorée');
  assert.equal(i18n.locale(), 'fr-MA');
});

test('messages du store traduits à l\'affichage, y compris composés', () => {
  inLanguage('en', () => {
    assert.equal(i18n.message('Réservation introuvable.'), 'Booking not found.');
    assert.equal(i18n.message('Annulation hors délai : moins de 24 h avant le début. La séance reste due.'), 'Too late to cancel: less than 24 h before the start. The session remains payable.');
    assert.equal(i18n.message('Domaine non autorisé pour l\'ENCG Fès. Utilisez votre adresse officielle (@etu.encg-fes.demo).'), 'Domain not allowed for ENCG Fès. Use your official address (@etu.encg-fes.demo).');
    assert.equal(i18n.message('Filière non proposée au niveau S3.'), 'Track not offered at level S3.');
    assert.equal(i18n.message('Moyenne minimale'), 'Minimum average');
    assert.equal(i18n.message('Already English.'), 'Already English.');
    assert.equal(i18n.message(''), '');
  });
  assert.equal(i18n.message('Réservation introuvable.'), 'Réservation introuvable.');
});

test('dictionnaire : traductions non vides et paramètres identiques', () => {
  assert.ok(Object.keys(dictionary).length > 500);
  for (const [key, value] of Object.entries(dictionary)) {
    assert.equal(typeof value, 'string', key);
    assert.ok(value.trim(), `traduction vide : ${key}`);
    assert.equal(placeholders(value), placeholders(key), `paramètres différents : ${key}`);
    assert.equal((value.match(/</g) || []).length, (key.match(/</g) || []).length, `balises différentes : ${key}`);
  }
});

test('chaque clé littérale t(\'…\') du code a sa traduction anglaise', () => {
  for (const file of ['app.js', 'ui.js', 'views-public.js', 'views-student.js', 'views-tutor.js', 'views-admin.js']) {
    const source = read(file);
    assert.doesNotMatch(source, /\bt\(\s*["`](?!un compte )/, `${file} : clés en guillemets simples uniquement`);
    for (const [, raw] of source.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) assert.ok(Object.hasOwn(dictionary, unescapeJs(raw)), `${file} : clé non traduite « ${unescapeJs(raw)} »`);
  }
  const shell = read('index.html');
  for (const [, text] of shell.matchAll(/data-i18n>([^<]+)</g)) assert.ok(Object.hasOwn(dictionary, text.trim()), `index.html : « ${text.trim()} »`);
  for (const [, value] of shell.matchAll(/(?:aria-label|data-confirm)="([^"]+)"[^>]*data-i18n-attrs/g)) assert.ok(Object.hasOwn(dictionary, value), `index.html : « ${value} »`);
});

test('chaque message d\'erreur du store a sa traduction anglaise', () => {
  const source = read('store.js');
  const messages = new Set();
  for (const [, raw] of source.matchAll(/assert\([^;]*?, '((?:[^'\\]|\\.)*)'\)/g)) messages.add(unescapeJs(raw));
  for (const [, raw] of source.matchAll(/(?:error|message): '((?:[^'\\]|\\.)*)'/g)) messages.add(unescapeJs(raw));
  for (const [, raw] of source.matchAll(/return '((?:[^'\\]|\\.)*\.)';/g)) messages.add(unescapeJs(raw));
  assert.ok(messages.size > 150, `${messages.size} messages relevés`);
  inLanguage('en', () => { for (const text of messages) assert.notEqual(i18n.message(text), text, `message du store non traduit : ${text}`); });
});

test('toutes les routes et tous les parcours se rendent en anglais sans libellé manquant', () => {
  const ACCOUNTS = { student: ['salma.benali@etu.encg-casablanca.demo', 'Demo2026!'], subscriber: ['omar.tazi@etu.encg-settat.demo', 'Demo2026!'], tutor: ['yassine.amrani@etu.encg-casablanca.demo', 'Demo2026!'], pending: ['adam.idrissi@etu.encg-tanger.demo', 'Demo2026!'], admin: ['admin@ontrack.demo', 'Admin2026!'] };
  const PUBLIC = [['accueil'], ['accueil', 'offres'], ['presentation'], ['connexion'], ['inscription'], ['inscription-tuteur'], ['verification'], ['mot-de-passe-oublie'], ['matieres'], ['matieres', 'stats'], ['catalogue'], ['profil', 't1'], ['profil', 't3'], ['orientation'], ['pods'], ['contact'], ['cgu'], ['confidentialite'], ['mentions'], ['boite-mail']];
  const STUDENT = [['reserver'], ['reserver', 't1'], ['paiement', 'inconnu'], ['confirmation', 'inconnu'], ...['apercu', 'seances', 'historique', 'forfaits', 'progression', 'comptes-rendus', 'notifications', 'profil'].map(tab => ['etudiant', tab]), ['orientation']];
  const TUTOR = ['apercu', 'seances', 'profil', 'matieres', 'disponibilites', 'avis', 'historique', 'remuneration'].map(tab => ['tuteur', tab]);
  const ADMIN = ['apercu', 'etudiants', 'tuteurs', 'domaines', 'referentiel', 'tarifs', 'politique', 'reservations', 'paiements', 'remunerations', 'moderation', 'orientation', 'pods', 'messages', 'sauvegarde'].map(tab => ['admin', tab]);
  const spaces = { student: '#etudiant/apercu', tutor: '#tuteur/apercu', admin: '#admin/apercu' };
  const blank = () => ({ filters: {}, gateway: {}, wizard: null, lastQr: null, adminStatus: '' });
  let instant = new Date('2026-10-23T08:00:00Z');
  const store = createStore(null, () => instant);
  const render = ([name, ...params], ui) => {
    const definition = O.routes[name];
    const ctx = { store, state: store.get(), user: store.currentUser(), ui: ui || blank(), params, data: globalThis.OntrackData, spaces };
    const html = definition.render(ctx);
    if (typeof definition.title === 'function') definition.title(ctx);
    if (typeof definition.description === 'function') definition.description(ctx);
    assert.doesNotMatch(html, /undefined|\[object Object\]|NaN|\{[a-zA-Z]\w*\}/, `${name}/${params.join('/')}`);
    return html;
  };
  const as = role => { store.logout(); store.login(...ACCOUNTS[role]); };
  i18n.missing.clear();
  inLanguage('en', () => {
    for (const route of PUBLIC) render(route);
    for (const [role, routes] of [['student', STUDENT], ['subscriber', STUDENT], ['tutor', TUTOR], ['pending', TUTOR], ['admin', ADMIN]]) { as(role); for (const route of [...routes, ...PUBLIC]) render(route); }
    // Assistant de réservation (forfait et paiement), passerelle, échec, nouvel essai et confirmation.
    as('subscriber');
    const need = { encg: 'Settat', level: 'S3', chapterId: 'stats-1', difficulty: 'Cours manqué', mode: 'En ligne', wishes: 'Soir', text: 'Revoir', attachment: { name: 'td.pdf', size: 2048, type: 'application/pdf' } };
    const pack = store.get().packages[0];
    const slot = store.get().tutors[1].slots[3];
    for (const wizard of [{ step: 2, subjectId: 'stats' }, { step: 3, subjectId: 'stats', need }, { step: 4, subjectId: 'stats', need, offerId: 'quick' }, { step: 5, subjectId: 'stats', need, offerId: 'quick', tutorId: 't2' }, { step: 6, subjectId: 'stats', need, offerId: 'stay', packageId: pack.id, tutorId: 't2', start: slot }, { step: 6, subjectId: 'stats', need, offerId: 'exam', tutorId: 't2', start: slot }]) render(['reserver'], { ...blank(), wizard });
    const booking = store.createBooking({ tutorId: 't2', offerId: 'exam', start: store.get().tutors[1].slots[9], need: { ...need, subjectId: 'stats' }, acceptPolicy: true });
    render(['paiement', booking.id]);
    assert.match(render(['paiement', booking.id], { ...blank(), gateway: { [booking.id]: true } }), /Payment accepted|accepted/i);
    store.gateway(booking.id, 'refused');
    for (const route of [['paiement', booking.id], ['etudiant', 'seances'], ['etudiant', 'historique']]) render(route);
    const retried = store.retryBooking(booking.id);
    store.gateway(retried.id, 'accepted');
    for (const route of [['confirmation', retried.id], ['etudiant', 'forfaits'], ['etudiant', 'apercu']]) render(route);
    store.saveOrientationProfile({ encg: 'Settat', level: 'S7', track: 'Finance', average: '13', validated: '', languages: [{ language: 'Français', level: 'C1' }], countries: ['France'], programType: 'Indifférent' });
    store.requestConsultation({ programIds: ['hec-liege'], topic: 'Aide pour mon dossier', availability: '' });
    render(['orientation']);
    // Tuteur après la fin d'une séance (compte rendu), période bloquée, avis signalé.
    instant = new Date(Date.parse(store.get().bookings.find(item => item.id === 'b-seed-3').start) + 2 * 3600000);
    as('tutor');
    store.addBlocked(new Date(instant.getTime() + 20 * 86400000).toISOString(), new Date(instant.getTime() + 21 * 86400000).toISOString(), 'Examens');
    store.reportReview('r-seed-2', 'Avis hors sujet');
    for (const route of TUTOR) render(route);
    // Administration en phase rémunérée, avec message, demande d'entretien et QR de test.
    as('admin');
    store.setPayout({ phase: 'paid', rates: { quick: 30, catch: 90, exam: 75, stay: 50 } });
    store.message({ name: 'Test', email: '', subject: 'Assistance', text: 'Bonjour, une question.' });
    const lastQr = store.podPrototypeCreate(store.get().pods.locations[0].id, new Date(instant.getTime() + 3 * 86400000).toISOString());
    for (const route of ADMIN) render(route, { ...blank(), lastQr });
    store.logout();
    for (const route of [['cgu'], ['accueil']]) render(route);
    assert.equal(O.access(O.routes.admin, null).message, 'Log in with an administrator account to access this page.');
  });
  assert.deepEqual([...i18n.missing], [], 'libellés sans traduction anglaise');
});

test('les données ne sont pas traduites', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  const html = inLanguage('en', () => O.routes.matieres.render({ store, state: store.get(), user: null, ui: { filters: {}, gateway: {} }, params: ['compta-gen'], data: globalThis.OntrackData, spaces: {} }));
  assert.match(html, /Comptabilité générale/);
  assert.match(html, /Bilan et résultat/);
});
