'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, KEY } = require('../store.js');
function setup() {
  let instant = new Date('2026-10-23T08:00:00Z');
  const saved = new Map();
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
  const store = createStore(storage, () => instant);
  const input = { tutorId: 't1', offerId: 'quick', start: store.get().tutors[0].slots[0], need: 'Revoir le bilan', payment: 'accepted' };
  return { store, storage, input, advance: date => { instant = new Date(date); } };
}
test('réservation partagée et persistante, notification et prix historiques', () => {
  const { store, storage, input } = setup();
  const booking = store.book(input);
  assert.equal(store.get().transactions[0].amount, 50);
  assert.equal(createStore(storage).get().bookings[0].id, booking.id);
  assert.equal(store.get().notifications.length, 1);
  store.price('quick', 75);
  store.book({ ...input, start: store.get().tutors[0].slots[1] });
  assert.deepEqual(store.get().transactions.map(item => item.amount), [50, 75]);
});
test('paiement refusé ou abandonné : aucune mutation, réessai possible', () => {
  const { store, input } = setup(); const before = store.get();
  for (const payment of ['refused', 'abandoned']) { assert.throws(() => store.book({ ...input, payment })); assert.deepEqual(store.get(), before); }
  assert.ok(store.book(input));
});
test('conflits, chevauchements, créneaux passés, incompatibles et tuteur en attente bloqués', () => {
  const { store, input, advance } = setup(); store.book(input);
  assert.throws(() => store.book(input), /occupe/);
  assert.throws(() => store.book({ ...input, tutorId: 't2' }), /occupe/);
  assert.throws(() => store.book({ ...input, start: '2026-10-23T08:01:00Z' }), /incompatible/);
  assert.throws(() => store.book({ ...input, tutorId: 't3' }), /validé/);
  advance('2026-11-23T08:00:00Z'); assert.throws(() => store.book({ ...input, start: store.get().tutors[0].slots[1] }), /passé/);
});
test('forfait : débit unique, épuisement, expiration et date limite', () => {
  const { store, input, advance } = setup();
  store.book({ ...input, offerId: 'exam' });
  const pack = store.get().packages[0];
  for (const slotIndex of [1, 2]) store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[slotIndex] });
  assert.equal(store.get().packages[0].remaining, 0); assert.equal(store.get().transactions.length, 1);
  assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[3] }), /épuisé/);
  advance('2026-10-31T08:00:00Z'); assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[25] }), /expiré/);
});
test('annulation restitue un crédit une seule fois ou rembourse sans réutilisation', () => {
  const { store, input } = setup(); const booking = store.book({ ...input, offerId: 'exam' });
  store.cancel(booking.id, false); assert.equal(store.get().packages[0].remaining, 3); assert.throws(() => store.cancel(booking.id, false));
  const next = store.book({ ...input, offerId: 'exam', packageId: booking.packageId }); store.cancel(next.id, true);
  assert.equal(store.get().packages[0].remaining, 2); assert.equal(store.get().transactions[1].amount, -133);
});
test('compte rendu terminé, progression dédupliquée, avis unique du participant', () => {
  const { store, input, advance } = setup(); const booking = store.book(input);
  const report = { text: 'Bilan compris', chapters: ['Bilan et résultat'], mastery: 'revise' };
  assert.throws(() => store.complete(booking.id, report, 't1'), /terminée/);
  advance(new Date(Date.parse(input.start) + 31 * 60000));
  assert.throws(() => store.complete(booking.id, report, 't2'));
  store.complete(booking.id, report, 't1'); assert.equal(store.progress().percent, 17); assert.equal(store.progress().count, 1);
  store.review(booking.id, 5, 'Très clair'); assert.throws(() => store.review(booking.id, 5, 'Encore'));
  assert.equal(store.earnings('t1'), 40);
});
test('stockage corrompu ou indisponible : repli mémoire utilisable', () => {
  for (const storage of [null, { getItem: () => '{', setItem() {} }, { getItem: () => JSON.stringify({ version: 1 }), setItem() {} }, { getItem: () => null, setItem() { throw Error('quota'); } }]) {
    const store = createStore(storage); assert.match(store.warning(), /mémoire/); assert.equal(store.get().tutors.length, 3); store.price('quick', 60); assert.equal(store.get().offers[0].price, 60);
  }
});
test('validation tuteur, reprogrammation, reset confirmé et suppression locale', () => {
  const { store, input, storage } = setup(); store.approve('t3'); assert.equal(store.get().tutors[2].approved, true);
  const booking = store.book(input); store.reschedule(booking.id, store.get().tutors[0].slots[1]); assert.equal(store.get().bookings[0].start, store.get().tutors[0].slots[1]);
  assert.throws(() => store.reset(false)); store.reset(true); assert.equal(store.get().bookings.length, 0); assert.equal(store.get().tutors[2].approved, false);
  store.deleteProfile(true); assert.equal(store.get().student, null); assert.equal(JSON.parse(storage.getItem(KEY)).student, null); assert.throws(() => store.book(input));
});
test('fin simulée : compte rendu possible, annulation et reprogrammation bloquées', () => {
  const { store, input } = setup(); const booking = store.book(input);
  store.simulateEnd(booking.id, 't1');
  assert.throws(() => store.cancel(booking.id, true));
  assert.throws(() => store.reschedule(booking.id, store.get().tutors[0].slots[1]));
  store.complete(booking.id, { text: 'Compris', chapters: ['Bilan et résultat'], mastery: 'maitrise' }, 't1');
  assert.equal(store.progress().count, 1);
});
test('données JSON structurellement invalides : repli sans plantage', () => {
  const { store } = setup();
  for (const mutate of [state => { state.student.name = null; }, state => { state.tutors[0].photo = 'https://example.com/photo.jpg'; }, state => { state.notifications.push({}); }, state => { state.programs.push(null); }]) {
    const state = store.get(); mutate(state);
    const restored = createStore({ getItem: () => JSON.stringify(state), setItem() {} });
    assert.match(restored.warning(), /mémoire/); assert.equal(restored.get().student.name, 'Salma Benali');
  }
});
test('expiration non épuisée, achat hors validité et fin de mois', () => {
  const { store, input, advance } = setup();
  const before = store.get();
  assert.throws(() => store.book({ ...input, offerId: 'exam', start: store.get().tutors[0].slots[27] }), /validité/);
  assert.deepEqual(store.get(), before);
  store.book({ ...input, offerId: 'exam' }); const pack = store.get().packages[0];
  assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[27] }), /validité/);
  advance('2026-10-31T08:00:00Z');
  assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[27] }), /expiré/);
  const monthly = createStore(null, () => new Date('2027-01-31T08:00:00Z'));
  monthly.book({ ...input, offerId: 'stay', start: monthly.get().tutors[0].slots[0] });
  assert.equal(monthly.get().packages[0].expires, '2027-02-28T09:00:00.000Z');
});
test('validité couvre toute la séance et mois calculé au Maroc', () => {
  const { store, input } = setup();
  const booking = store.book({ ...input, offerId: 'exam' });
  const pack = store.get().packages[0];
  const crossing = new Date(Date.parse(pack.expires) - 60000).toISOString();
  store.addSlot('t1', crossing);
  assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: crossing }), /validité/);
  assert.throws(() => store.reschedule(booking.id, crossing), /validité/);
  const fresh = setup(); fresh.store.addSlot('t1', crossing);
  assert.throws(() => fresh.store.book({ ...fresh.input, offerId: 'exam', start: crossing }), /validité/);
  const monthly = createStore(null, () => new Date('2026-10-30T23:30:00Z'));
  monthly.book({ ...input, offerId: 'stay', start: monthly.get().tutors[0].slots[0] });
  assert.equal(monthly.get().packages[0].expires, '2026-11-29T23:30:00.000Z');
});
test('suppression efface un historique rempli puis recharge sans données associées', () => {
  const { store, storage, input } = setup();
  const booking = store.book({ ...input, offerId: 'exam' });
  store.simulateEnd(booking.id, 't1');
  store.complete(booking.id, { text: 'Bilan révisé', chapters: ['Bilan et résultat'], mastery: 'revise' }, 't1');
  store.review(booking.id, 5, 'Très clair'); store.message('Profil fictif', 'Message fictif');
  for (const key of ['bookings', 'packages', 'transactions', 'reviews', 'messages', 'notifications']) assert.ok(store.get()[key].length);
  store.deleteProfile(true);
  const restored = createStore(storage).get();
  assert.equal(restored.student, null);
  for (const key of ['bookings', 'packages', 'transactions', 'reviews', 'messages', 'notifications']) assert.equal(restored[key].length, 0);
});
test('chevauchements de créneaux distincts refusés pour tuteur et étudiant', () => {
  const { store, input } = setup();
  store.book({ ...input, offerId: 'catch' });
  const overlapping = new Date(Date.parse(input.start) + 30 * 60000).toISOString();
  store.addSlot('t1', overlapping); store.addSlot('t2', overlapping);
  const later = store.book({ ...input, start: store.get().tutors[0].slots[2] });
  const before = store.get();
  for (const tutorId of ['t1', 't2']) assert.throws(() => store.book({ ...input, tutorId, start: overlapping }), /occupe/);
  assert.throws(() => store.reschedule(later.id, overlapping), /occupe/);
  assert.deepEqual(store.get(), before);
});
test('chapitre répété ne gonfle pas la progression et anciens crédits gardent leur valeur', () => {
  const { store, input } = setup();
  const first = store.book({ ...input, offerId: 'exam' });
  store.price('exam', 600);
  const second = store.book({ ...input, offerId: 'exam', packageId: first.packageId, start: store.get().tutors[0].slots[1] });
  assert.equal(second.price, 133);
  for (const booking of [first, second]) {
    store.simulateEnd(booking.id, 't1');
    store.complete(booking.id, { text: 'Bilan révisé', chapters: ['Bilan et résultat'], mastery: 'revise' }, 't1');
  }
  assert.equal(store.progress().percent, 17);
  assert.equal(store.earnings('t1'), 212.8);
  const third = store.book({ ...input, offerId: 'exam', packageId: first.packageId, start: store.get().tutors[0].slots[2] });
  store.cancel(third.id, true);
  assert.equal(store.get().transactions[1].amount, -133);
  const fourth = store.book({ ...input, start: store.get().tutors[0].slots[3] });
  store.simulateEnd(fourth.id, 't1');
  store.complete(fourth.id, { text: 'Analytique revisee', chapters: ['Comptabilité analytique'], mastery: 'maitrise' }, 't1');
  assert.equal(store.progress().percent, 33);
});
test('centimes des crédits, dates impossibles, catalogue ambigu et échec de suppression persistante', () => {
  const { store, input } = setup(); store.price('exam', 400);
  const first = store.book({ ...input, offerId: 'exam' });
  const second = store.book({ ...input, offerId: 'exam', packageId: first.packageId, start: store.get().tutors[0].slots[1] });
  const third = store.book({ ...input, offerId: 'exam', packageId: first.packageId, start: store.get().tutors[0].slots[2] });
  assert.deepEqual([first.price, second.price, third.price], [133.33, 133.34, 133.33]);
  for (const booking of [first, second, third]) store.cancel(booking.id, true);
  assert.equal(store.stats().revenue, 0);
  assert.throws(() => store.addSlot('t1', '2026-11-31T14:00:00+01:00'), /calendrier/);
  const invalid = store.get(); invalid.offers[1].id = 'quick';
  assert.match(createStore({ getItem: () => JSON.stringify(invalid), setItem() {} }).warning(), /mémoire/);
  const saved = new Map(); let broken = false;
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => { if (broken) throw Error('quota'); saved.set(key, value); } };
  const failing = createStore(storage); broken = true; failing.deleteProfile(true);
  assert.equal(failing.get().student, null);
  assert.match(failing.warning(), /ancienne sauvegarde peut subsister/);
});
test('édition administrative des enseignements conserve les chapitres historiques', () => {
  const { store, input } = setup(); const booking = store.book(input);
  store.simulateEnd(booking.id, 't1');
  store.complete(booking.id, { text: 'Bilan révisé', chapters: ['Bilan et résultat'], mastery: 'revise' }, 't1');
  store.catalogue('t1', { subject: 'Finance', level: 'S6', chapters: 'Actualisation; Rentabilite' });
  assert.equal(store.get().tutors[0].subject, 'Finance');
  assert.deepEqual(store.get().tutors[0].chapters, ['Actualisation', 'Rentabilite']);
  assert.ok(store.get().chapters.includes('Bilan et résultat'));
  assert.equal(store.progress().count, 1);
  assert.throws(() => store.catalogue('t1', { subject: '', level: 'S6', chapters: '' }));
});
test('anciens libellés migrés sans perdre les réservations ni modifier les saisies libres', () => {
  assert.equal(KEY, 'ontrack-demo-v1');
  const { store, input } = setup(); const booking = store.book(input);
  store.simulateEnd(booking.id, 't1');
  store.complete(booking.id, { text: 'Texte volontaire sans accent', chapters: ['Bilan et résultat'], mastery: 'revise' }, 't1');
  const saved = store.get();
  saved.student.encg = 'Kenitra';
  saved.encgs = saved.encgs.map(value => value === 'Kénitra' ? 'Kenitra' : value);
  saved.chapters[0] = 'Bilan et resultat';
  saved.tutors[0].subject = 'Comptabilite'; saved.tutors[0].language = 'Francais';
  saved.tutors[0].chapters[0] = 'Bilan et resultat';
  saved.bookings[0].report.chapters[0] = 'Bilan et resultat';
  let persisted;
  const restored = createStore({ getItem: key => key === 'ontrack-demo-v1' ? JSON.stringify(saved) : null, setItem: (key, value) => { assert.equal(key, 'ontrack-demo-v1'); persisted = value; } });
  assert.equal(restored.warning(), '');
  assert.equal(restored.get().student.encg, 'Kénitra');
  assert.equal(restored.get().tutors[0].subject, 'Comptabilité');
  assert.equal(restored.get().tutors[0].language, 'Français');
  assert.equal(restored.get().bookings[0].id, booking.id);
  assert.equal(restored.get().bookings[0].report.text, 'Texte volontaire sans accent');
  assert.equal(restored.progress().count, 1);
  assert.equal(JSON.parse(persisted).bookings[0].report.chapters[0], 'Bilan et résultat');
});
test('textes français en UTF-8 et logos locaux présents', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const files = ['index.html', 'app.js', 'data.js', 'store.js'];
  const contents = Object.fromEntries(files.map(filename => [filename, new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(path.join(__dirname, '..', filename)))]));
  assert.match(contents['index.html'], /charset="utf-8"/);
  assert.ok(contents['index.html'].includes('Démonstration académique'));
  for (const text of ['études', 'même', 'Français', 'créneau']) assert.ok(contents['app.js'].includes(text), text);
  assert.ok(contents['data.js'].includes('Étude de marché'));
  for (const filename of ['assets/logo-ontrack.png', 'assets/favicon.png']) {
    assert.ok(contents['index.html'].includes(filename));
    assert.ok(fs.existsSync(path.join(__dirname, '..', filename)));
  }
});