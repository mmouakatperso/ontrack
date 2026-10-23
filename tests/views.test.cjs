'use strict';
// Rendu de toutes les routes sans navigateur : chaque vue est une fonction pure (ctx) => HTML.
const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.OntrackSha256 = require('../sha256.js');
globalThis.OntrackData = require('../data.js');
const { createStore } = require('../store.js');
for (const file of ['ui.js', 'views-public.js', 'views-student.js', 'views-tutor.js', 'views-admin.js']) require(`../${file}`);
const O = globalThis.Ontrack;

const ACCOUNTS = { student: ['salma.benali@etu.encg-casablanca.demo', 'Demo2026!'], subscriber: ['omar.tazi@etu.encg-settat.demo', 'Demo2026!'], tutor: ['yassine.amrani@etu.encg-casablanca.demo', 'Demo2026!'], pending: ['adam.idrissi@etu.encg-tanger.demo', 'Demo2026!'], admin: ['admin@ontrack.demo', 'Admin2026!'] };
const ROUTES = {
  public: [['accueil'], ['accueil', 'offres'], ['presentation'], ['connexion'], ['inscription'], ['inscription-tuteur'], ['verification'], ['mot-de-passe-oublie'], ['matieres'], ['matieres', 'stats'], ['catalogue'], ['profil', 't1'], ['profil', 't3'], ['orientation'], ['pods'], ['contact'], ['cgu'], ['confidentialite'], ['mentions'], ['boite-mail']],
  student: [['reserver'], ['reserver', 't1'], ['paiement', 'inconnu'], ['confirmation', 'inconnu'], ...['apercu', 'seances', 'historique', 'forfaits', 'progression', 'comptes-rendus', 'notifications', 'profil'].map(tab => ['etudiant', tab]), ['orientation']],
  tutor: ['apercu', 'seances', 'profil', 'matieres', 'disponibilites', 'avis', 'historique', 'remuneration'].map(tab => ['tuteur', tab]),
  admin: ['apercu', 'etudiants', 'tuteurs', 'domaines', 'referentiel', 'tarifs', 'politique', 'reservations', 'paiements', 'remunerations', 'moderation', 'orientation', 'pods', 'messages', 'sauvegarde'].map(tab => ['admin', tab])
};
const APP_ACTIONS = new Set(['logout', 'reset']);

function contextFor(store, params, ui) {
  return { store, state: store.get(), user: store.currentUser(), ui: ui || { filters: {}, gateway: {}, wizard: null }, params, data: globalThis.OntrackData, spaces: { student: '#etudiant/apercu', tutor: '#tuteur/apercu', admin: '#admin/apercu' } };
}
function render(store, [name, ...params], ui) {
  const definition = O.routes[name];
  assert.ok(definition, `route ${name}`);
  const ctx = contextFor(store, params, ui);
  const html = definition.render(ctx);
  assert.equal(typeof html, 'string');
  assert.ok(html.length > 200, `${name} vide`);
  assert.match(html, /<h1/, `${name} sans h1`);
  const title = typeof definition.title === 'function' ? definition.title(ctx) : definition.title;
  const description = typeof definition.description === 'function' ? definition.description(ctx) : definition.description;
  assert.ok(title && description && description.length > 20, `${name} : titre et description`);
  for (const [, form] of html.matchAll(/data-form="([^"]+)"/g)) assert.ok(O.forms[form], `formulaire sans gestionnaire : ${form}`);
  for (const [, action] of html.matchAll(/data-action="([^"]+)"/g)) assert.ok(O.actions[action] || APP_ACTIONS.has(action), `action sans gestionnaire : ${action}`);
  for (const [, change] of html.matchAll(/data-change="([^"]+)"/g)) assert.ok(O.changes[change], `changement sans gestionnaire : ${change}`);
  assert.doesNotMatch(html, /undefined|\[object Object\]|NaN/, `${name}/${params.join('/')} contient une valeur non rendue`);
  return html;
}

test('toutes les routes publiques et privées se rendent pour leur rôle, avec gestionnaires branchés', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  for (const route of ROUTES.public) render(store, route);
  for (const [role, routes] of [['student', ROUTES.student], ['subscriber', ROUTES.student], ['tutor', ROUTES.tutor], ['pending', ROUTES.tutor], ['admin', ROUTES.admin]]) {
    store.logout();
    assert.equal(store.login(...ACCOUNTS[role]).ok, true);
    for (const route of routes) render(store, route);
    for (const route of ROUTES.public) render(store, route);
  }
});

test('gardes de rôle : les espaces privés déclarent leur rôle et le noindex', () => {
  for (const [name, role] of [['etudiant', 'student'], ['reserver', 'student'], ['paiement', 'student'], ['confirmation', 'student'], ['tuteur', 'tutor'], ['admin', 'admin']]) {
    assert.equal(O.routes[name].role, role, name);
    assert.ok(O.routes[name].private || O.routes[name].role, name);
  }
  for (const name of ['accueil', 'presentation', 'matieres', 'catalogue', 'profil', 'orientation', 'pods', 'contact', 'cgu', 'confidentialite', 'mentions', 'inscription']) assert.ok(!O.routes[name].role && !O.routes[name].private, name);
  for (const name of ['connexion', 'verification', 'mot-de-passe-oublie', 'boite-mail']) assert.ok(O.routes[name].private, name);
  const pages = ['accueil', 'presentation', 'connexion', 'inscription', 'etudiant', 'matieres', 'catalogue', 'reserver', 'paiement', 'confirmation', 'tuteur', 'orientation', 'pods', 'contact', 'admin', 'cgu', 'confidentialite'];
  for (const name of pages) assert.ok(O.routes[name], `page §4 : ${name}`);
});

test('parcours §10.1 rendu étape par étape jusqu\'à la confirmation', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  store.login(...ACCOUNTS.student);
  const ui = { filters: {}, gateway: {}, wizard: null };
  const html1 = render(store, ['reserver'], ui);
  assert.match(html1, /§10\.1 étape 1/);
  ui.wizard = { step: 2, subjectId: 'compta-gen' };
  assert.match(render(store, ['reserver'], ui), /Décrivez précisément votre besoin/);
  ui.wizard = { step: 3, subjectId: 'compta-gen', need: { encg: 'Casablanca', level: 'S4', chapterId: 'compta-gen-1', difficulty: 'Cours manqué', mode: 'En ligne', wishes: '', text: 'Revoir le bilan', attachment: { name: 'td.pdf', size: 2048, type: 'application/pdf' } } };
  assert.match(render(store, ['reserver'], ui), /Quick Help/);
  ui.wizard = { ...ui.wizard, step: 4, offerId: 'quick' };
  assert.match(render(store, ['reserver'], ui), /Yassine Amrani/);
  ui.wizard = { ...ui.wizard, step: 5, tutorId: 't1' };
  const slotsHtml = render(store, ['reserver'], ui);
  assert.match(slotsHtml, /Prioritaire Stay/);
  const start = store.get().tutors[0].slots[0];
  ui.wizard = { ...ui.wizard, step: 6, start };
  const recap = render(store, ['reserver'], ui);
  assert.match(recap, /Procéder au paiement de 50 DH/);
  assert.match(recap, /Annulation/);
  const booking = store.createBooking({ tutorId: 't1', offerId: 'quick', start, need: { ...ui.wizard.need, subjectId: 'compta-gen' }, acceptPolicy: true });
  assert.match(render(store, ['paiement', booking.id], ui), /Payer 50 DH via CMI/);
  ui.gateway[booking.id] = true;
  assert.match(render(store, ['paiement', booking.id], ui), /Paiement accepté/);
  store.gateway(booking.id, 'accepted');
  const confirmation = render(store, ['confirmation', booking.id], ui);
  assert.match(confirmation, /Votre séance est confirmée/);
  assert.match(confirmation, /Paiement confirmé/);
  assert.match(render(store, ['etudiant', 'historique'], ui), /Payée/);
  assert.match(render(store, ['boite-mail'], { ...ui, mailbox: 'salma.benali@etu.encg-casablanca.demo' }), /Réservation confirmée/);
});

test('données saisies échappées dans les vues', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  store.message({ name: '<img src=x onerror=alert(1)>', text: '<script>alert(1)</script> bonjour' });
  store.login(...ACCOUNTS.admin);
  const html = render(store, ['admin', 'messages']);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});

test('garde d’accès pure (O.access) : redirections et robots par rôle', () => {
  const users = { anonyme: null, student: { role: 'student' }, tutor: { role: 'tutor' }, admin: { role: 'admin' } };
  const expected = { etudiant: 'student', tuteur: 'tutor', admin: 'admin', reserver: 'student', accueil: null };
  for (const [route, role] of Object.entries(expected)) {
    for (const [label, user] of Object.entries(users)) {
      const access = O.access(O.routes[route], user);
      assert.equal(access.redirect, Boolean(role) && (!user || user.role !== role), `${label} → ${route}`);
      assert.equal(access.robots, role ? 'noindex, nofollow' : 'index, follow', route);
      if (access.redirect) assert.match(access.message, user ? /réservé/ : /Connectez-vous/);
    }
  }
  assert.equal(O.access(undefined, null).redirect, false);
});

test('gestionnaires réels : assistant jusqu’au paiement, passerelle, compte rendu et progression', () => {
  let instant = new Date('2026-10-23T08:00:00Z');
  const store = createStore(null, () => instant);
  store.login(...ACCOUNTS.student);
  const ui = { filters: {}, gateway: {}, wizard: null };
  const ctx = () => contextFor(store, [], ui);
  const noFile = { elements: {} };
  O.forms.wizard(ctx(), { step: '1', subjectId: 'compta-gen' }, noFile);
  O.forms.wizard(ctx(), { step: '2', encg: 'Casablanca', level: 'S4', chapterId: 'compta-gen-2', difficulty: 'Cours manqué', mode: 'En ligne', wishes: '', text: 'Opérations courantes' }, noFile);
  O.forms.wizard(ctx(), { step: '3', service: 'offer:quick' }, noFile);
  O.forms.wizard(ctx(), { step: '4', tutorId: 't1' }, noFile);
  const start = store.get().tutors[0].slots[0];
  O.forms.wizard(ctx(), { step: '5', start }, noFile);
  assert.equal(ui.wizard.step, 6);
  const toPayment = O.forms.wizard(ctx(), { step: '6', acceptPolicy: 'on' }, noFile);
  assert.match(toPayment.go, /^paiement\//);
  const bookingId = toPayment.go.split('/')[1];
  const toConfirmation = O.actions.gateway(ctx(), { id: bookingId, scenario: 'accepted' });
  assert.equal(toConfirmation.go, `confirmation/${bookingId}`);
  store.logout(); store.login(...ACCOUNTS.tutor);
  O.actions['tutor-finish'](ctx(), { id: bookingId });
  O.forms.report(ctx(), { subjectId: 'compta-gen', 'chapter:compta-gen-2': 'maitrise', 'chapter:compta-gen-4': 'en-cours', 'chapter:compta-gen-5': '', notions: 'Écritures', exercises: 'Journal', difficulties: 'TVA', toReview: 'Factures', recommendations: 'Exercices' }, { dataset: { id: bookingId } });
  const progress = store.progress('s1').find(item => item.subjectId === 'compta-gen');
  assert.equal(progress.worked, 2);
  assert.equal(progress.chapters.find(item => item.id === 'compta-gen-2').status, 'maitrise');
});

test('catalogue : tuteur en attente masqué, visible après validation', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  assert.ok(!render(store, ['catalogue']).includes('Adam Idrissi'));
  assert.match(render(store, ['profil', 't3']), /Profil indisponible/);
  store.login(...ACCOUNTS.admin);
  store.setTutorStatus('t3', 'approved');
  store.logout();
  assert.ok(render(store, ['catalogue']).includes('Adam Idrissi'));
  assert.doesNotMatch(render(store, ['profil', 't3']), /Profil indisponible/);
});

test('boîte mail simulée : limitée au compte connecté et aux adresses saisies dans l’onglet', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  store.requestReset('admin@ontrack.demo');
  const anonymous = render(store, ['boite-mail'], { filters: {}, gateway: {}, mailbox: 'admin@ontrack.demo' });
  assert.ok(!anonymous.includes('Réinitialisation de votre mot de passe'));
  assert.ok(!anonymous.includes('admin@ontrack.demo'));
  store.login(...ACCOUNTS.student);
  const own = render(store, ['boite-mail'], { filters: {}, gateway: {} });
  assert.ok(!own.includes('admin@ontrack.demo'));
  assert.throws(() => O.changes.mailbox(contextFor(store, [], { filters: {}, gateway: {} }), { value: 'admin@ontrack.demo' }), /non consultable/);
});
