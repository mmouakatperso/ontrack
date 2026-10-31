'use strict';
// Rendu de toutes les routes sans navigateur : chaque vue est une fonction pure (ctx) => HTML.
const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.OntrackSha256 = require('../sha256.js');
globalThis.OntrackData = require('../data.js');
const { createStore } = require('../store.js');
for (const file of ['i18n.js', 'i18n-en.js', 'ui.js', 'views-public.js', 'views-student.js', 'views-tutor.js', 'views-admin.js']) require(`../${file}`);
const O = globalThis.Ontrack;

const ACCOUNTS = { student: ['salma.benali@etu.encg-casablanca.demo', 'Demo2026!'], subscriber: ['omar.tazi@etu.encg-settat.demo', 'Demo2026!'], tutor: ['yassine.amrani@etu.encg-casablanca.demo', 'Demo2026!'], pending: ['adam.idrissi@etu.encg-tanger.demo', 'Demo2026!'], admin: ['admin@ontrack.demo', 'Admin2026!'] };
const ROUTES = {
  public: [['accueil'], ['accueil', 'offres'], ['presentation'], ['connexion'], ['inscription'], ['inscription-tuteur'], ['verification'], ['mot-de-passe-oublie'], ['matieres'], ['matieres', 'stats'], ['catalogue'], ['profil', 't1'], ['profil', 't3'], ['orientation'], ['pods'], ['contact'], ['cgu'], ['confidentialite'], ['mentions'], ['boite-mail']],
  student: [['reserver'], ['reserver', 't1'], ['paiement', 'inconnu'], ['confirmation', 'inconnu'], ...['apercu', 'seances', 'historique', 'forfaits', 'progression', 'comptes-rendus', 'discussions', 'notifications', 'profil'].map(tab => ['etudiant', tab]), ['orientation']],
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

test('orientation : 9 destinations réelles, places telles que communiquées, critères inconnus « à confirmer »', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  const html = render(store, ['orientation']);
  for (const institution of ['HEC Liège — Université de Liège', 'Clermont School of Business', 'Rennes School of Business', 'Aix-Marseille Université', 'Hochschule Ludwigshafen am Rhein', 'Centria University of Applied Sciences', 'Shandong University', 'Université de Sherbrooke', 'UQAM — École des sciences de la gestion (ESG)']) assert.ok(html.includes(institution), institution);
  assert.equal((html.match(/<article class="program">/g) || []).length, 9);
  assert.doesNotMatch(html, /example\.org/);
  assert.match(html, /Liste principale : 20 · Liste d&#39;attente : 20/);
  assert.match(html, /Liste proposée : 40/);
  assert.equal((html.match(/: 40</g) || []).length, 1, 'seule Rennes annonce 40 : listes principales et d\'attente jamais additionnées');
  assert.match(html, /À confirmer auprès de l'ENCG/);
  assert.match(html, /Liste communiquée par l&#39;ENCG, année 2025-2026/);
  assert.match(html, /href="https:\/\/www\.hec\.uliege\.be" rel="noopener noreferrer" target="_blank">Site officiel de l'établissement/);
  assert.match(html, /Aucune recommandation ne garantit une admission/);
  const home = render(store, ['accueil']);
  assert.match(home, /9 destinations communiquées par l'ENCG/);
  assert.match(home, /Aucune recommandation ne garantit une admission/);
  assert.doesNotMatch(home, /\d+\s*places/i, 'aucun total de places à l\'accueil');
  store.login(...ACCOUNTS.student);
  store.saveOrientationProfile({ encg: 'Casablanca', level: 'S6', track: 'Gestion', average: 14, validated: '', languages: [{ language: 'Français', level: 'C1' }], countries: [], programType: 'Indifférent' });
  const student = render(store, ['orientation']);
  assert.match(student, /<li class="unknown"><span class="criterion-icon" aria-hidden="true">\?<\/span> Moyenne minimale : À confirmer auprès de l'ENCG/);
  assert.match(student, /9 destination\(s\) potentiellement adaptée\(s\)/);
  assert.match(student, /data-form="orientation-profile"[\s\S]*<select name="level" required data-change="level-tracks">/);
  assert.match(html, /<dt>Effectifs communiqués<\/dt><dd>Candidats : 22<\/dd>/);
  assert.match(student, /<select name="track" required><optgroup label="Cycle du diplôme — 1re année"><option value="Gestion" selected>Gestion<\/option><option value="Commerce">Commerce<\/option><\/optgroup><\/select>/);
});

test('orientation : moyenne vidée par l\'admin → carte « À confirmer auprès de l\'ENCG » ; places analysées', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  store.login(...ACCOUNTS.admin);
  const admin = render(store, ['admin', 'orientation']);
  assert.match(admin, /Destinations réelles : ne publier que des informations confirmées par l'ENCG/);
  assert.doesNotMatch(admin, /example\.org/);
  assert.match(admin, /<textarea name="seats"[^>]*>Liste principale : 20\nListe d&#39;attente : 20<\/textarea>/);
  assert.deepEqual(O.parseSeats('Liste principale : 20\r\nListe d\'attente : 20\n\n'), [{ label: 'Liste principale', count: 20 }, { label: 'Liste d\'attente', count: 20 }]);
  for (const line of ['Liste principale : -3', 'Liste principale : 2,5', 'Liste principale : vingt', 'Liste principale']) assert.throws(() => store.saveProgram({ ...store.get().programs[0], language: '', deadline: '', level: '', seats: O.parseSeats(line) }), /Places/, line);
  const program = { ...store.get().programs.find(item => item.id === 'hec-liege'), language: '', deadline: '', level: '' };
  store.saveProgram({ ...program, minGrade: '12.5', seats: O.parseSeats('Liste principale : 18\nListe d\'attente : 20') });
  const card = html => html.slice(html.indexOf('Mobilité HEC Liège'), html.indexOf('</article>', html.indexOf('Mobilité HEC Liège')));
  assert.match(card(render(store, ['orientation'])), /<dt>Moyenne minimale<\/dt><dd>≥ 12,5 \/ 20<\/dd>/);
  assert.match(card(render(store, ['orientation'])), /Liste principale : 18/);
  store.saveProgram({ ...program, minGrade: '', seats: O.parseSeats('Liste principale : 18\nListe d\'attente : 20') });
  assert.match(card(render(store, ['orientation'])), /<dt>Moyenne minimale<\/dt><dd><span class="unknown">À confirmer auprès de l'ENCG<\/span><\/dd>/);
  store.saveProgram({ ...program, name: '<img src=x onerror=alert(1)>', seats: [] });
  const escaped = render(store, ['orientation']);
  assert.ok(!escaped.includes('<img src=x onerror'));
  assert.match(escaped, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('inscription : filières regroupées par cycle et filtrées selon le niveau choisi', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  const html = render(store, ['inscription']);
  assert.match(html, /<select name="level" required data-change="level-tracks">/);
  assert.match(html, /<select name="track" required><optgroup label="Années préparatoires"><option value="Tronc commun">Tronc commun<\/option><\/optgroup><\/select>/);
  assert.match(html, /Filières établies d&#39;après les plannings 2025-2026 de l&#39;ENCG Casablanca ; l&#39;offre peut varier selon l&#39;ENCG\./);
  assert.doesNotMatch(render(store, ['inscription-tuteur']), /level-tracks/, 'côté tuteur : pas de filière');
  const track = { value: 'Tronc commun', innerHTML: '' };
  const change = level => { O.changes['level-tracks'](contextFor(store, []), { value: level, form: { elements: { track } } }); return track.innerHTML; };
  const placeholder = '<option value="" selected>Choisissez votre filière</option>';
  const s5 = change('S5');
  assert.equal(s5, `${placeholder}<optgroup label="Cycle du diplôme — 1re année"><option value="Gestion">Gestion</option><option value="Commerce">Commerce</option></optgroup>`, 'filière précédente non proposée : option vide sélectionnée, choix explicite imposé');
  track.value = 'Commerce';
  const s6 = change('S6');
  assert.match(s6, /<option value="Commerce" selected>/, 'choix conservé s\'il reste proposé');
  assert.ok(!s6.includes('Choisissez votre filière'), 'filière conservée : pas d\'option vide');
  const s9 = change('S9');
  assert.ok(s9.startsWith(placeholder), 'Commerce non proposé en S9 : option vide sélectionnée');
  assert.match(s9, /<optgroup label="Cycle du diplôme — 2e année et au-delà">.*Marketing digital \(MD\).*<\/optgroup><optgroup label="Ancien régime \(5e année\)">.*Audit et contrôle de gestion \(ACG\)/);
  assert.equal((change('Master 1').match(/<optgroup/g) || []).length, 4, 'niveau hors cycles connus : toutes les filières');
  store.login(...ACCOUNTS.student);
  assert.match(render(store, ['etudiant', 'profil']), /<select name="level" required data-change="level-tracks">[\s\S]*<select name="track" required><optgroup label="Cycle du diplôme — 1re année"><option value="Gestion" selected>/);
});

test('administration : le gestionnaire admin-program analyse les places et vide les champs non communiqués', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  store.login(...ACCOUNTS.admin);
  const program = store.get().programs.find(item => item.id === 'hec-liege');
  const values = { name: program.name, institution: program.institution, country: program.country, city: program.city, mobility: '', level: '', minGrade: '', language: '', languageLevel: 'B2', deadline: '', source: program.source, sourceNote: program.sourceNote, seats: 'Liste principale : 18\nListe d\'attente : 20', documents: '', active: 'on' };
  const form = { dataset: { id: 'hec-liege' }, all: { tracks: ['Gestion', 'Commerce'] } };
  const NativeFormData = globalThis.FormData;
  globalThis.FormData = class { constructor(element) { this.element = element; } getAll(name) { return this.element.all[name] || []; } };
  try { assert.equal(O.forms['admin-program'](contextFor(store, []), values, form), 'Programme mis à jour.'); }
  finally { globalThis.FormData = NativeFormData; }
  const saved = store.get().programs.find(item => item.id === 'hec-liege');
  assert.deepEqual(saved.seats, [{ label: 'Liste principale', count: 18 }, { label: 'Liste d\'attente', count: 20 }]);
  assert.equal(saved.minGrade, null);
  assert.deepEqual(saved.documents, []);
  assert.deepEqual(saved.tracks, ['Gestion', 'Commerce']);
  assert.equal(saved.active, true);
});

test('discussions : onglet étudiant (rappels, salons, fil aria-live), échappement, gestionnaires et modération admin', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  assert.equal(O.routes.etudiant.role, 'student');
  for (const role of ['tutor', 'admin']) assert.equal(O.access(O.routes.etudiant, { role }).redirect, true, `garde : ${role}`);
  store.login(...ACCOUNTS.student);
  const ui = { filters: {}, gateway: {}, wizard: null, chatDraft: { 'r-gestion': 'Brouillon <conservé>' }, chatReport: null };
  const ctx = params => contextFor(store, params || [], ui);
  const html = render(store, ['etudiant', 'discussions'], ui);
  assert.match(html, /N'échangez ni coordonnées, ni documents, ni données personnelles\./, 'rappel permanent');
  assert.match(html, /aucun échange entre appareils/, 'limite affichée');
  assert.match(html, /<a href="#etudiant\/discussions\/r-gestion" class="active" aria-current="true">Gestion<\/a> <span class="badge green">Votre filière<\/span>/);
  assert.match(html, /<h2 id="chat-title">Salon Gestion<\/h2>/);
  assert.match(html, /<ol class="chat-log" id="chat-log" role="log" aria-live="polite"/);
  assert.match(html, /Yasmine \(fictive\)/);
  assert.match(html, /<textarea name="text" id="chat-input" rows="3" maxlength="500" required data-draft="r-gestion"[^>]*>Brouillon &lt;conservé&gt;<\/textarea>/, 'brouillon conservé et échappé');
  assert.match(html, /data-form="chat-post" data-kind="room" data-id="r-gestion"/);
  assert.match(html, /<option value="s2">Omar Tazi · ENCG Settat · Tronc commun<\/option>/);
  assert.equal(O.forms['chat-post'](ctx(), { text: '<img src=x onerror=alert(1)>' }, { dataset: { kind: 'room', id: 'r-gestion' } }).message, 'Message envoyé.');
  assert.equal(ui.chatDraft['r-gestion'], undefined, 'brouillon vidé après envoi');
  const escaped = render(store, ['etudiant', 'discussions'], ui);
  assert.ok(!escaped.includes('<img src=x'));
  assert.match(escaped, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(escaped, /Yasmine \(fictive\) est en train d'écrire…/);
  const warned = O.forms['chat-post'](ctx(), { text: 'écris-moi à a@b.ma' }, { dataset: { kind: 'room', id: 'r-gestion' } });
  assert.match(warned.message, /n'échangez pas de coordonnées/);
  assert.equal(warned.error, true, 'avertissement visible');
  assert.equal(warned.focus, undefined, 'le focus reste sur l\'avertissement');
  assert.equal(O.forms['chat-post'](ctx(), { text: 'Merci !' }, { dataset: { kind: 'room', id: 'r-gestion' } }).focus, 'chat-input');
  // Fil : position conservée si l'utilisateur lisait plus haut, en bas sinon ou après son propre envoi.
  const log = { scrollTop: 0, scrollHeight: 900 };
  const fakeMain = { querySelector: () => log };
  ui.chatScroll = { top: 120, atBottom: false }; ui.chatScrollEnd = false;
  O.routes.etudiant.after(ctx(), fakeMain);
  assert.equal(log.scrollTop, 120);
  ui.chatScroll = { top: 120, atBottom: false }; ui.chatScrollEnd = true;
  O.routes.etudiant.after(ctx(), fakeMain);
  assert.equal(log.scrollTop, 900);
  assert.deepEqual([ui.chatScroll, ui.chatScrollEnd], [null, false]);
  // « Écrire à… » : choix conservé au réaffichage, puis oublié à l'ouverture de la discussion.
  ui.chatDraft.to = 's2';
  assert.match(render(store, ['etudiant', 'discussions'], ui), /<select name="to" id="chat-to" data-draft="to">[\s\S]*<option value="s2" selected>/);
  assert.throws(() => O.forms['chat-start'](ctx(), { to: '' }), /Choisissez un destinataire/);
  const opened = O.forms['chat-start'](ctx(), { to: 's2' });
  assert.equal(ui.chatDraft.to, undefined);
  const threadId = opened.go.split('/')[2];
  assert.match(opened.go, /^etudiant\/discussions\/th-/);
  O.forms['chat-post'](ctx(), { text: 'Salut Omar' }, { dataset: { kind: 'thread', id: threadId } });
  const thread = render(store, ['etudiant', 'discussions', threadId], ui);
  assert.match(thread, /Discussion privée avec Omar Tazi/);
  assert.match(thread, /Visible uniquement par vous deux/);
  assert.match(thread, /Salut Omar/);
  O.actions['chat-report-open'](ctx(), { id: 'cm-seed-3' });
  assert.match(render(store, ['etudiant', 'discussions', 'r-gestion'], ui), /data-form="chat-report" data-id="cm-seed-3"[\s\S]*<option value="Publicité ou spam">Publicité ou spam<\/option>/);
  ui.chatDraft.report = 'Autre motif';
  O.actions['chat-report-cancel'](ctx(), { id: 'cm-seed-3' });
  assert.equal(ui.chatDraft.report, undefined, 'motif oublié à l\'annulation');
  O.actions['chat-report-open'](ctx(), { id: 'cm-seed-3' });
  ui.chatDraft.report = 'Publicité ou spam';
  O.forms['chat-report'](ctx(), { reason: 'Publicité ou spam' }, { dataset: { id: 'cm-seed-3' } });
  assert.equal(ui.chatReport, null);
  assert.equal(ui.chatDraft.report, undefined, 'motif oublié après l\'envoi');
  assert.match(render(store, ['etudiant', 'discussions', 'r-gestion'], ui), /Vous avez signalé ce message\./);
  store.logout(); store.login(...ACCOUNTS.admin);
  const admin = render(store, ['admin', 'moderation']);
  assert.match(admin, /Messages signalés \(1\)/);
  assert.match(admin, /Salon Gestion · Yasmine \(fictive\)/);
  assert.match(admin, /signalé par Salma Benali le .* : Publicité ou spam/);
  assert.ok(!admin.includes('Salut Omar') && !admin.includes('onerror'), 'messages non signalés et discussions privées invisibles pour l\'admin');
  assert.equal(O.actions['admin-chat-hide'](contextFor(store, []), { id: 'cm-seed-3', hidden: 'true' }), 'Message masqué : il est remplacé par « Message masqué par la modération ».');
  assert.match(render(store, ['admin', 'moderation']), /<span class="badge gray">Masqué<\/span>[\s\S]*data-action="admin-chat-hide" data-id="cm-seed-3" data-hidden="false">Rétablir/);
  store.logout(); store.login(...ACCOUNTS.subscriber);
  assert.match(render(store, ['etudiant', 'discussions', 'r-gestion']), /<em>Message masqué par la modération<\/em>/);
  assert.match(render(store, ['cgu']), /10\. Discussions entre étudiants[\s\S]*Message masqué par la modération/);
  assert.match(render(store, ['confidentialite']), /Messages des discussions[\s\S]*sessionStorage[\s\S]*le nom, l'ENCG et la filière des autres étudiants inscrits/);
});

test('présentation : pavé de l\'encadrante limité aux faits confirmés, lien en pied de page', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  const html = render(store, ['presentation', 'encadrement']);
  const start = html.indexOf('<section class="supervisor"');
  assert.ok(start > html.indexOf('Nos objectifs') && start < html.indexOf('Trois profils, trois espaces'), 'entre « Nos objectifs » et « Trois profils »');
  const section = html.slice(start, html.indexOf('</section>', start));
  assert.match(section, /aria-labelledby="encadrement"/);
  assert.match(section, /<h2 id="encadrement">Encadrement académique<\/h2><h3>Dr Fatine Ouahtita<\/h3>/);
  assert.match(section, /aria-hidden="true">FO</);
  assert.match(section, /Laboratoire de recherche prospective en économie et gestion/);
  assert.match(section, /« Engagement Is Not Enough[^»]+», IJSRM, vol\. 14, n° 4, 2026 \(co-autrice\)/);
  assert.match(section, /Unveiling the Eco-Digital Nexus/);
  assert.doesNotMatch(section, /<img|@|mailto:|tel:|\+212|\d{2}[ .]?\d{2}[ .]?\d{2}[ .]?\d{2}[ .]?\d{2}/, 'ni photo ni coordonnées');
  O.i18n.set('en');
  let english;
  try { english = render(store, ['presentation']); } finally { O.i18n.set('fr'); }
  assert.match(english, /<h2 id="encadrement">Academic supervision<\/h2>/);
  assert.match(english, /"Engagement Is Not Enough[^"]+", IJSRM, vol\. 14, no\. 4, 2026 \(co-author\)/);
  const shell = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(shell, /<footer>[\s\S]*<a href="#presentation\/encadrement" data-i18n>Projet académique encadré par Dr Fatine Ouahtita — ENCG Casablanca<\/a>[\s\S]*<\/footer>/);
  assert.equal(O.i18n.dictionaries.en['Projet académique encadré par Dr Fatine Ouahtita — ENCG Casablanca'], 'Academic project supervised by Dr Fatine Ouahtita — ENCG Casablanca');
});

test('encadrante tutrice : trois cartes à l\'accueil, profil sans photo, matière, filtre niveau et administration', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  const home = render(store, ['accueil']);
  const start = home.indexOf('aria-labelledby="tuteurs"');
  const section = home.slice(start, home.indexOf('</section>', start));
  assert.match(section, /<div class="grid three">/);
  assert.equal((section.match(/<article class="tutor-card">/g) || []).length, 3);
  const names = [...section.matchAll(/<h3>([^<]+)<\/h3>/g)].map(match => match[1]);
  assert.deepEqual(names, ['Yassine Amrani', 'Lina El Fassi', 'Dr Fatine Ouahtita']);
  assert.match(section, /Profils étudiants fictifs de démonstration[^<]*Dr Fatine Ouahtita, encadrante du projet, est une personne réelle/);
  assert.doesNotMatch(section, /Profils fictifs de démonstration\./);
  O.i18n.set('en');
  let english;
  try { english = render(store, ['accueil']); } finally { O.i18n.set('fr'); }
  assert.match(english, /Student profiles are fictitious demo profiles[^<]*Dr Fatine Ouahtita, the project supervisor, is a real person/);

  const profile = render(store, ['profil', 't4']);
  const banner = profile.slice(profile.indexOf('<div class="profile-banner">'), profile.indexOf('<div class="split">'));
  assert.match(banner, /<span class="avatar initials"[^>]*>FO<\/span>/);
  assert.doesNotMatch(profile, /<img/, 'aucune photo');
  assert.match(profile, /Anglais commercial/);
  assert.match(profile, /Marketing/);
  for (const chapter of ['Correspondance professionnelle', 'Réunions et présentations', 'Négociation commerciale', 'Vocabulaire du commerce international', 'Étude de marché']) assert.ok(profile.includes(chapter), chapter);
  assert.match(banner, /★ 5\.0 \/ 5 <small>\(1 avis\)<\/small>/);
  assert.match(profile, /Avis des étudiants \(1\)[\s\S]*★★★★★ 5 \/ 5/);
  const languages = profile.slice(profile.indexOf('Langues et modes'), profile.indexOf('Types de séances'));
  assert.match(languages, />Anglais</);
  assert.doesNotMatch(languages, /Français/, 'le français n\'est plus proposé');

  const subject = render(store, ['matieres', 'anglais-com']);
  assert.match(subject, /1 tuteur\(s\) disponible\(s\)/);
  assert.ok(subject.includes('Dr Fatine Ouahtita'));

  const ui = { filters: { level: 'S8' }, gateway: {}, wizard: null };
  const filtered = render(store, ['catalogue'], ui);
  assert.ok(filtered.includes('Dr Fatine Ouahtita'), 'niveau hors liste classé au-dessus de S10');
  assert.ok(filtered.includes('Yassine Amrani') && !filtered.includes('Lina El Fassi'), 'filtre toujours actif pour les autres');
  ui.filters = { level: 'S10' };
  assert.ok(render(store, ['catalogue'], ui).includes('Dr Fatine Ouahtita'));

  assert.ok(!O.routes.connexion.render(contextFor(store, [])).includes('fatine'), 'absente de la connexion rapide');

  store.login(...ACCOUNTS.admin);
  const admin = render(store, ['admin', 'tuteurs']);
  const card = admin.slice(admin.indexOf('<h3>Dr Fatine Ouahtita</h3>'));
  assert.match(card.slice(0, 600), /fatine\.ouahtita@encg-casablanca\.demo/);
  assert.match(card.slice(0, 600), /<span class="badge green">Validé<\/span>/, 'publiée');
  store.setLevels(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'M1']);
  assert.ok(store.get().levels.includes('M1'), 'les niveaux restent modifiables');
  ui.filters = { level: 'Niveau retiré' };
  assert.ok(render(store, ['catalogue'], ui).includes('Lina El Fassi'), 'filtre de niveau hors liste ignoré');

  // Adam validé : la carte « FO » et la nouvelle mention restent à l'accueil.
  store.setTutorStatus('t3', 'approved');
  store.logout();
  const after = render(store, ['accueil']);
  const tutors = after.slice(after.indexOf('aria-labelledby="tuteurs"'));
  assert.equal((tutors.slice(0, tutors.indexOf('</section>')).match(/<article class="tutor-card">/g) || []).length, 3);
  assert.match(tutors, /<span class="avatar initials"[^>]*>FO<\/span>/);
  assert.match(tutors, /Dr Fatine Ouahtita, encadrante du projet, est une personne réelle/);
  assert.match(render(store, ['profil', 't4']), /Réserver avec Fatine</);

  // Espace tuteur de l'encadrante : niveau « Professeure » sélectionné, prénom sans titre.
  assert.equal(store.login('fatine.ouahtita@encg-casablanca.demo', 'Demo2026!').ok, true);
  const own = render(store, ['tuteur', 'profil']);
  assert.match(own, /<option value="Professeure" selected>Professeure<\/option>/);
  assert.match(own, /Bonjour, Fatine\./);

  // Encadrante suspendue : mention d'origine.
  store.logout();
  store.login(...ACCOUNTS.admin);
  store.setTutorStatus('t4', 'suspended');
  store.logout();
  const suspended = render(store, ['accueil']);
  assert.match(suspended, /Profils fictifs de démonstration\. Photos illustratives publiées avec consentement simulé\./);
  const suspendedTutors = suspended.slice(suspended.indexOf('aria-labelledby="tuteurs"'));
  assert.doesNotMatch(suspendedTutors.slice(0, suspendedTutors.indexOf('</section>')), /Dr Fatine Ouahtita/, 'carte retirée, l\'encadrement reste cité dans « Le projet »');
});

test('équipe du projet : sept étudiants sous le pavé de l\'encadrante, icône pour la responsable ; liens sociaux du pied de page', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  const html = render(store, ['presentation']);
  const supervisorEnd = html.indexOf('</section>', html.indexOf('<section class="supervisor"'));
  const start = html.indexOf('<section class="team"');
  assert.ok(start > supervisorEnd && start < html.indexOf('Trois profils, trois espaces'), 'juste après le pavé de l\'encadrante');
  const section = html.slice(start, html.indexOf('</section>', start));
  assert.match(section, /aria-labelledby="equipe"/);
  assert.match(section, /<h2 id="equipe">L'équipe du projet<\/h2>/);
  const names = [...section.matchAll(/<span class="team-name">([^<]+)<\/span>/g)].map(match => match[1]);
  assert.deepEqual(names, ['Yasmine Merzak', 'Aya Mouakat', 'Salma Lahmar', 'Mohamed Taha Mabrouk', 'Leïla Lagzouli', 'Mohamed Ali Naami', 'Anas Lyanboui']);
  assert.equal((section.match(/class="team-leader"/g) || []).length, 1, 'une seule icône');
  assert.match(section, /Yasmine Merzak<\/span><svg class="team-leader"[^>]*role="img" aria-label="Responsable de l&#39;équipe"/);
  assert.doesNotMatch(section, /Team Leader/);
  O.i18n.set('en');
  let english;
  try { english = render(store, ['presentation']); } finally { O.i18n.set('fr'); }
  assert.match(english, /<h2 id="equipe">The project team<\/h2>/);
  assert.match(english, /aria-label="Team leader"/);

  const shell = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const social = shell.slice(shell.indexOf('<ul class="social"'), shell.indexOf('</ul>', shell.indexOf('<ul class="social"')));
  assert.match(social, /aria-label="Réseaux sociaux"/);
  assert.match(social, /<a href="https:\/\/www\.instagram\.com\/stay_ontrack_\/" target="_blank" rel="noopener noreferrer">[\s\S]*?Instagram<\/a>/);
  assert.match(social, /<a href="https:\/\/www\.tiktok\.com\/@stay___ontrack" target="_blank" rel="noopener noreferrer">[\s\S]*?TikTok<\/a>/);
  assert.doesNotMatch(social, /xtok|_r=|_t=/, 'sans paramètres de suivi');
});

test('présentation accessible depuis le menu principal et l\'aperçu « Le projet » de l\'accueil', () => {
  const store = createStore(null, () => new Date('2026-10-23T08:00:00Z'));
  const shell = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const nav = shell.slice(shell.indexOf('<nav aria-label="Navigation principale"'), shell.indexOf('</nav>'));
  assert.match(nav, /<a href="#presentation" data-nav="presentation" data-i18n>Présentation<\/a>/);
  const home = render(store, ['accueil']);
  const start = home.indexOf('<section class="tint" aria-labelledby="projet-apercu">');
  assert.ok(start > home.indexOf('aria-labelledby="pods-apercu"'), 'en fin d\'accueil, après Study Pods');
  const section = home.slice(start, home.indexOf('</section>', start));
  assert.match(section, /une équipe de 7 étudiants, encadré par Dr Fatine Ouahtita/);
  assert.match(section, /<a class="button secondary" href="#presentation">Découvrir le projet<\/a>/);
  const names = [...section.matchAll(/<span class="team-name">([^<]+)<\/span>/g)].map(match => match[1]);
  assert.equal(names.length, 7);
  assert.equal((section.match(/class="team-leader"/g) || []).length, 1);
  O.i18n.set('en');
  let english;
  try { english = render(store, ['accueil']); } finally { O.i18n.set('fr'); }
  assert.match(english, /a team of 7 students, supervised by Dr Fatine Ouahtita/);
  assert.match(english, />Discover the project<\/a>/);
});
