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
test('reservation partagee et persistante, notification et prix historiques', () => {
  const { store, storage, input } = setup();
  const booking = store.book(input);
  assert.equal(store.get().transactions[0].amount, 50);
  assert.equal(createStore(storage).get().bookings[0].id, booking.id);
  assert.equal(store.get().notifications.length, 1);
  store.price('quick', 75);
  store.book({ ...input, start: store.get().tutors[0].slots[1] });
  assert.deepEqual(store.get().transactions.map(item => item.amount), [50, 75]);
});
test('paiement refuse ou abandonne : aucune mutation, reessai possible', () => {
  const { store, input } = setup(); const before = store.get();
  for (const payment of ['refused', 'abandoned']) { assert.throws(() => store.book({ ...input, payment })); assert.deepEqual(store.get(), before); }
  assert.ok(store.book(input));
});
test('conflits, chevauchements, creneaux passes, incompatibles et tuteur en attente bloques', () => {
  const { store, input, advance } = setup(); store.book(input);
  assert.throws(() => store.book(input), /occupe/);
  assert.throws(() => store.book({ ...input, tutorId: 't2' }), /occupe/);
  assert.throws(() => store.book({ ...input, start: '2026-10-23T08:01:00Z' }), /incompatible/);
  assert.throws(() => store.book({ ...input, tutorId: 't3' }), /valide/);
  advance('2026-11-23T08:00:00Z'); assert.throws(() => store.book({ ...input, start: store.get().tutors[0].slots[1] }), /passe/);
});
test('forfait : debit unique, epuisement, expiration et date limite', () => {
  const { store, input, advance } = setup();
  store.book({ ...input, offerId: 'exam' });
  const pack = store.get().packages[0];
  for (const slotIndex of [1, 2]) store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[slotIndex] });
  assert.equal(store.get().packages[0].remaining, 0); assert.equal(store.get().transactions.length, 1);
  assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[3] }), /epuise/);
  advance('2026-10-31T08:00:00Z'); assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[25] }), /expire/);
});
test('annulation restitue un credit une seule fois ou rembourse sans reutilisation', () => {
  const { store, input } = setup(); const booking = store.book({ ...input, offerId: 'exam' });
  store.cancel(booking.id, false); assert.equal(store.get().packages[0].remaining, 3); assert.throws(() => store.cancel(booking.id, false));
  const next = store.book({ ...input, offerId: 'exam', packageId: booking.packageId }); store.cancel(next.id, true);
  assert.equal(store.get().packages[0].remaining, 2); assert.equal(store.get().transactions[1].amount, -133);
});
test('compte rendu termine, progression dedupliquee, avis unique du participant', () => {
  const { store, input, advance } = setup(); const booking = store.book(input);
  const report = { text: 'Bilan compris', chapters: ['Bilan et resultat'], mastery: 'revise' };
  assert.throws(() => store.complete(booking.id, report, 't1'), /terminee/);
  advance(new Date(Date.parse(input.start) + 31 * 60000));
  assert.throws(() => store.complete(booking.id, report, 't2'));
  store.complete(booking.id, report, 't1'); assert.equal(store.progress().percent, 17); assert.equal(store.progress().count, 1);
  store.review(booking.id, 5, 'Tres clair'); assert.throws(() => store.review(booking.id, 5, 'Encore'));
  assert.equal(store.earnings('t1'), 40);
});
test('stockage corrompu ou indisponible : repli memoire utilisable', () => {
  for (const storage of [null, { getItem: () => '{', setItem() {} }, { getItem: () => JSON.stringify({ version: 1 }), setItem() {} }, { getItem: () => null, setItem() { throw Error('quota'); } }]) {
    const store = createStore(storage); assert.match(store.warning(), /memoire/); assert.equal(store.get().tutors.length, 3); store.price('quick', 60); assert.equal(store.get().offers[0].price, 60);
  }
});
test('validation tuteur, reprogrammation, reset confirme et suppression locale', () => {
  const { store, input, storage } = setup(); store.approve('t3'); assert.equal(store.get().tutors[2].approved, true);
  const booking = store.book(input); store.reschedule(booking.id, store.get().tutors[0].slots[1]); assert.equal(store.get().bookings[0].start, store.get().tutors[0].slots[1]);
  assert.throws(() => store.reset(false)); store.reset(true); assert.equal(store.get().bookings.length, 0); assert.equal(store.get().tutors[2].approved, false);
  store.deleteProfile(true); assert.equal(store.get().student, null); assert.equal(JSON.parse(storage.getItem(KEY)).student, null); assert.throws(() => store.book(input));
});
test('fin simulee : compte rendu possible, annulation et reprogrammation bloquees', () => {
  const { store, input } = setup(); const booking = store.book(input);
  store.simulateEnd(booking.id, 't1');
  assert.throws(() => store.cancel(booking.id, true));
  assert.throws(() => store.reschedule(booking.id, store.get().tutors[0].slots[1]));
  store.complete(booking.id, { text: 'Compris', chapters: ['Bilan et resultat'], mastery: 'maitrise' }, 't1');
  assert.equal(store.progress().count, 1);
});
test('donnees JSON structurellement invalides : repli sans plantage', () => {
  const { store } = setup();
  for (const mutate of [state => { state.student.name = null; }, state => { state.tutors[0].photo = 'https://example.com/photo.jpg'; }, state => { state.notifications.push({}); }, state => { state.programs.push(null); }]) {
    const state = store.get(); mutate(state);
    const restored = createStore({ getItem: () => JSON.stringify(state), setItem() {} });
    assert.match(restored.warning(), /memoire/); assert.equal(restored.get().student.name, 'Salma Benali');
  }
});
test('expiration non epuisee, achat hors validite et fin de mois', () => {
  const { store, input, advance } = setup();
  const before = store.get();
  assert.throws(() => store.book({ ...input, offerId: 'exam', start: store.get().tutors[0].slots[27] }), /validite/);
  assert.deepEqual(store.get(), before);
  store.book({ ...input, offerId: 'exam' }); const pack = store.get().packages[0];
  assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[27] }), /validite/);
  advance('2026-10-31T08:00:00Z');
  assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: store.get().tutors[0].slots[27] }), /expire/);
  const monthly = createStore(null, () => new Date('2027-01-31T08:00:00Z'));
  monthly.book({ ...input, offerId: 'stay', start: monthly.get().tutors[0].slots[0] });
  assert.equal(monthly.get().packages[0].expires, '2027-02-28T09:00:00.000Z');
});
test('validite couvre toute la seance et mois calcule au Maroc', () => {
  const { store, input } = setup();
  const booking = store.book({ ...input, offerId: 'exam' });
  const pack = store.get().packages[0];
  const crossing = new Date(Date.parse(pack.expires) - 60000).toISOString();
  store.addSlot('t1', crossing);
  assert.throws(() => store.book({ ...input, offerId: 'exam', packageId: pack.id, start: crossing }), /validite/);
  assert.throws(() => store.reschedule(booking.id, crossing), /validite/);
  const fresh = setup(); fresh.store.addSlot('t1', crossing);
  assert.throws(() => fresh.store.book({ ...fresh.input, offerId: 'exam', start: crossing }), /validite/);
  const monthly = createStore(null, () => new Date('2026-10-30T23:30:00Z'));
  monthly.book({ ...input, offerId: 'stay', start: monthly.get().tutors[0].slots[0] });
  assert.equal(monthly.get().packages[0].expires, '2026-11-29T23:30:00.000Z');
});
test('suppression efface un historique rempli puis recharge sans donnees associees', () => {
  const { store, storage, input } = setup();
  const booking = store.book({ ...input, offerId: 'exam' });
  store.simulateEnd(booking.id, 't1');
  store.complete(booking.id, { text: 'Bilan revise', chapters: ['Bilan et resultat'], mastery: 'revise' }, 't1');
  store.review(booking.id, 5, 'Tres clair'); store.message('Profil fictif', 'Message fictif');
  for (const key of ['bookings', 'packages', 'transactions', 'reviews', 'messages', 'notifications']) assert.ok(store.get()[key].length);
  store.deleteProfile(true);
  const restored = createStore(storage).get();
  assert.equal(restored.student, null);
  for (const key of ['bookings', 'packages', 'transactions', 'reviews', 'messages', 'notifications']) assert.equal(restored[key].length, 0);
});
test('chevauchements de creneaux distincts refuses pour tuteur et etudiant', () => {
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
test('chapitre repete ne gonfle pas la progression et anciens credits gardent leur valeur', () => {
  const { store, input } = setup();
  const first = store.book({ ...input, offerId: 'exam' });
  store.price('exam', 600);
  const second = store.book({ ...input, offerId: 'exam', packageId: first.packageId, start: store.get().tutors[0].slots[1] });
  assert.equal(second.price, 133);
  for (const booking of [first, second]) {
    store.simulateEnd(booking.id, 't1');
    store.complete(booking.id, { text: 'Bilan revise', chapters: ['Bilan et resultat'], mastery: 'revise' }, 't1');
  }
  assert.equal(store.progress().percent, 17);
  assert.equal(store.earnings('t1'), 212.8);
  const third = store.book({ ...input, offerId: 'exam', packageId: first.packageId, start: store.get().tutors[0].slots[2] });
  store.cancel(third.id, true);
  assert.equal(store.get().transactions[1].amount, -133);
  const fourth = store.book({ ...input, start: store.get().tutors[0].slots[3] });
  store.simulateEnd(fourth.id, 't1');
  store.complete(fourth.id, { text: 'Analytique revisee', chapters: ['Comptabilite analytique'], mastery: 'maitrise' }, 't1');
  assert.equal(store.progress().percent, 33);
});
test('centimes des credits, dates impossibles, catalogue ambigu et echec de suppression persistante', () => {
  const { store, input } = setup(); store.price('exam', 400);
  const first = store.book({ ...input, offerId: 'exam' });
  const second = store.book({ ...input, offerId: 'exam', packageId: first.packageId, start: store.get().tutors[0].slots[1] });
  const third = store.book({ ...input, offerId: 'exam', packageId: first.packageId, start: store.get().tutors[0].slots[2] });
  assert.deepEqual([first.price, second.price, third.price], [133.33, 133.34, 133.33]);
  for (const booking of [first, second, third]) store.cancel(booking.id, true);
  assert.equal(store.stats().revenue, 0);
  assert.throws(() => store.addSlot('t1', '2026-11-31T14:00:00+01:00'), /calendrier/);
  const invalid = store.get(); invalid.offers[1].id = 'quick';
  assert.match(createStore({ getItem: () => JSON.stringify(invalid), setItem() {} }).warning(), /memoire/);
  const saved = new Map(); let broken = false;
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => { if (broken) throw Error('quota'); saved.set(key, value); } };
  const failing = createStore(storage); broken = true; failing.deleteProfile(true);
  assert.equal(failing.get().student, null);
  assert.match(failing.warning(), /ancienne sauvegarde peut subsister/);
});
test('edition administrative des enseignements conserve les chapitres historiques', () => {
  const { store, input } = setup(); const booking = store.book(input);
  store.simulateEnd(booking.id, 't1');
  store.complete(booking.id, { text: 'Bilan revise', chapters: ['Bilan et resultat'], mastery: 'revise' }, 't1');
  store.catalogue('t1', { subject: 'Finance', level: 'S6', chapters: 'Actualisation; Rentabilite' });
  assert.equal(store.get().tutors[0].subject, 'Finance');
  assert.deepEqual(store.get().tutors[0].chapters, ['Actualisation', 'Rentabilite']);
  assert.ok(store.get().chapters.includes('Bilan et resultat'));
  assert.equal(store.progress().count, 1);
  assert.throws(() => store.catalogue('t1', { subject: '', level: 'S6', chapters: '' }));
});