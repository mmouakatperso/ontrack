'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createStore, KEY } = require('../store.js');
const { sha256 } = require('../sha256.js');

const SALMA = 'salma.benali@etu.encg-casablanca.demo';
const OMAR = 'omar.tazi@etu.encg-settat.demo';
const YASSINE = 'yassine.amrani@etu.encg-casablanca.demo';
const ADAM = 'adam.idrissi@etu.encg-tanger.demo';
const ADMIN = 'admin@ontrack.demo';
const PASSWORD = 'Demo2026!';

function memoryStorage() {
  const saved = new Map();
  return { saved, getItem: key => (saved.has(key) ? saved.get(key) : null), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
}
function setup(at) {
  let instant = new Date(at || '2026-10-23T08:00:00Z');
  const storage = memoryStorage();
  const store = createStore(storage, () => instant);
  const need = { encg: 'Casablanca', level: 'S4', subjectId: 'compta-gen', chapterId: 'compta-gen-1', difficulty: 'Cours manqué', mode: 'En ligne', wishes: 'Après 17 h', text: 'Revoir le bilan', attachment: null };
  const slots = (index = 0) => store.get().tutors[index].slots;
  const input = { tutorId: 't1', offerId: 'quick', start: slots()[0], need, acceptPolicy: true };
  const as = email => { store.logout(); const result = store.login(email, email === ADMIN ? 'Admin2026!' : PASSWORD); assert.ok(result.ok, result.error); };
  const pay = (overrides, scenario) => {
    const booking = store.createBooking({ ...input, ...overrides });
    if (booking.status === 'pending') store.gateway(booking.id, scenario || 'accepted');
    return store.get().bookings.find(item => item.id === booking.id);
  };
  const advance = value => { instant = new Date(value); };
  const emails = (to, kind) => store.get().emails.filter(email => email.to === to && (!kind || email.kind === kind));
  as(SALMA);
  return { store, storage, need, slots, input, as, pay, advance, emails, now: () => instant };
}
const finish = (store, bookingId, chapters, extra) => {
  store.simulateEnd(bookingId);
  store.complete(bookingId, { subjectId: 'compta-gen', chapters: chapters || [{ id: 'compta-gen-1', status: 'revise' }], notions: 'Bilan', exercises: 'Exercice 1', difficulties: 'Équilibre', toReview: 'Amortissements', recommendations: 'Refaire l\'exercice', ...(extra || {}) });
};

test('SHA-256 synchrone conforme à Node crypto, y compris UTF-8 et frontières de blocs', () => {
  for (const value of ['', 'abc', 'Réservation confirmée — 你好', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'x'.repeat(1000)]) assert.equal(sha256(value), crypto.createHash('sha256').update(value, 'utf8').digest('hex'));
});

test('inscription : domaine conforme → compte non vérifié, code dans la boîte mail ; domaine refusé', () => {
  const { store, emails } = setup();
  store.logout();
  const base = { name: 'Nadia Alaoui', encg: 'Agadir', level: 'S2', track: 'Tronc commun', password: 'Motdepasse1', consent: true };
  assert.throws(() => store.register({ ...base, email: 'nadia@gmail.com' }), /Domaine non autorisé/);
  assert.throws(() => store.register({ ...base, email: 'nadia@etu.encg-settat.demo' }), /Domaine non autorisé/);
  assert.throws(() => store.register({ ...base, email: 'nadia@etu.encg-agadir.demo', password: 'court' }), /8 caractères/);
  store.register({ ...base, email: 'Nadia@etu.encg-agadir.demo' });
  const user = store.get().users.find(item => item.email === 'nadia@etu.encg-agadir.demo');
  assert.equal(user.verified, false);
  assert.notEqual(user.hash, 'Motdepasse1');
  assert.equal(user.hash, sha256(user.salt + 'Motdepasse1'));
  const code = emails('nadia@etu.encg-agadir.demo', 'verification')[0].code;
  assert.match(code, /^\d{6}$/);
  assert.equal(store.login('nadia@etu.encg-agadir.demo', 'Motdepasse1').unverified, true);
  assert.equal(store.verifyEmail('nadia@etu.encg-agadir.demo', '000000' === code ? '111111' : '000000').ok, false);
  assert.equal(store.verifyEmail('nadia@etu.encg-agadir.demo', code).ok, true);
  assert.equal(store.currentUser().email, 'nadia@etu.encg-agadir.demo');
  assert.equal(emails('nadia@etu.encg-agadir.demo', 'welcome').length, 1);
  assert.throws(() => store.register({ ...base, email: 'nadia@etu.encg-agadir.demo' }), /existe déjà/);
  assert.ok(!store.get().codes.some(item => JSON.stringify(item).includes(code)), 'le code n\'est stocké que haché');
});

test('connexion : 5 échecs consécutifs bloquent 15 min, sans révéler si l\'e-mail existe', () => {
  const { store, advance } = setup();
  store.logout();
  const unknown = [];
  const known = [];
  for (let attempt = 0; attempt < 5; attempt += 1) { known.push(store.login(SALMA, 'mauvais')); unknown.push(store.login('inconnu@etu.encg-fes.demo', 'mauvais')); }
  assert.deepEqual(known.map(item => item.error), unknown.map(item => item.error));
  assert.equal(known[4].locked, true);
  assert.match(known[4].error, /bloquée/);
  const blocked = store.login(SALMA, PASSWORD);
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /bloquée/);
  assert.equal(store.login('inconnu@etu.encg-fes.demo', 'x').error, blocked.error.replace(/\d{2}:\d{2}/, match => match));
  advance('2026-10-23T08:16:00Z');
  assert.equal(store.login(SALMA, PASSWORD).ok, true);
  assert.equal(store.get().throttle[SALMA], undefined);
});

test('session : expiration, déconnexion et contrôle des rôles', () => {
  const { store, input, as, advance } = setup();
  assert.equal(store.currentUser().role, 'student');
  assert.throws(() => store.setPolicy({}), /Accès refusé/);
  assert.throws(() => store.simulateEnd('x'), /Accès refusé/);
  as(YASSINE);
  assert.throws(() => store.createBooking(input), /Accès refusé/);
  store.logout();
  assert.equal(store.currentUser(), null);
  assert.throws(() => store.createBooking(input), /Accès refusé/);
  as(SALMA);
  advance('2026-10-23T10:01:00Z');
  assert.equal(store.currentUser(), null, 'session fermée après 2 h d\'inactivité');
});

test('mot de passe oublié : message neutre, code par e-mail, ancien mot de passe invalidé', () => {
  const { store, emails } = setup();
  const neutral = store.requestReset('personne@etu.encg-fes.demo').message;
  assert.equal(store.requestReset(SALMA).message, neutral);
  assert.equal(emails('personne@etu.encg-fes.demo').length, 0);
  const code = emails(SALMA, 'password-reset')[0].code;
  assert.equal(store.confirmReset(SALMA, code, 'Nouveau2026').ok, true);
  assert.equal(store.currentUser(), null);
  assert.equal(store.login(SALMA, PASSWORD).ok, false);
  assert.equal(store.login(SALMA, 'Nouveau2026').ok, true);
  assert.equal(emails(SALMA, 'password-changed').length, 1);
  assert.equal(store.confirmReset(SALMA, code, 'Encore2026').ok, false, 'code à usage unique');
});

test('réservation pending : créneau bloqué 15 min puis libéré, e-mail d\'échec', () => {
  const { store, input, as, advance, emails } = setup();
  const booking = store.createBooking(input);
  assert.equal(booking.status, 'pending');
  assert.equal(store.get().transactions.find(tx => tx.bookingId === booking.id).status, 'pending');
  as(OMAR);
  assert.throws(() => store.createBooking({ ...input, need: { ...input.need, encg: 'Settat', level: 'S3' } }), /occupé/);
  advance('2026-10-23T08:16:00Z');
  store.tick();
  const expired = store.get().bookings.find(item => item.id === booking.id);
  assert.equal(expired.status, 'failed');
  assert.equal(store.get().transactions.find(tx => tx.bookingId === booking.id).status, 'failed');
  assert.equal(emails(SALMA, 'payment-failed').length, 1);
  assert.equal(store.createBooking({ ...input, need: { ...input.need, encg: 'Settat', level: 'S3' } }).status, 'pending');
});

test('créneau pris, passé, incompatible, bloqué, prioritaire ou tuteur en attente : refus', () => {
  const { store, input, slots, as, pay, advance } = setup();
  pay();
  assert.throws(() => store.createBooking(input), /occupé/);
  assert.throws(() => store.createBooking({ ...input, start: '2026-10-23T08:01:00.000Z' }), /incompatible/);
  assert.throws(() => store.createBooking({ ...input, tutorId: 't3', need: { ...input.need, subjectId: 'marketing', chapterId: 'marketing-1' } }), /non validé/);
  assert.throws(() => store.createBooking({ ...input, start: slots()[2] }), /prioritaire/);
  as(YASSINE);
  store.addBlocked(slots()[3], new Date(Date.parse(slots()[3]) + 3600000).toISOString(), 'Examen');
  as(SALMA);
  assert.throws(() => store.createBooking({ ...input, start: slots()[3] }), /bloqué/);
  assert.throws(() => store.createBooking({ ...input, acceptPolicy: false, start: slots()[4] }), /politique/);
  assert.throws(() => store.createBooking({ ...input, start: slots()[4], need: { ...input.need, attachment: { name: 'cours.exe', size: 10, type: 'application/x-msdownload' } } }), /Pièce jointe/);
  assert.throws(() => store.createBooking({ ...input, start: slots()[4], need: { ...input.need, attachment: { name: 'cours.pdf', size: 6 * 1024 * 1024, type: 'application/pdf' } } }), /5 Mo/);
  const withFile = store.createBooking({ ...input, start: slots()[4], need: { ...input.need, attachment: { name: 'cours.pdf', size: 1200, type: 'application/pdf', content: 'JVBERi0' } } });
  assert.deepEqual(withFile.need.attachment, { name: 'cours.pdf', size: 1200, type: 'application/pdf' }, 'seules les métadonnées sont stockées');
  const old = slots()[6];
  advance('2026-11-23T08:00:00Z');
  as(SALMA);
  assert.throws(() => store.createBooking({ ...input, start: old }), /passé/);
});

test('créneau prioritaire Stay : abonné à tout moment, non-abonné seulement à moins de 24 h', () => {
  const { store, input, slots, as, advance } = setup();
  const priority = slots()[2];
  assert.throws(() => store.createBooking({ ...input, start: priority }), /prioritaire/);
  as(OMAR);
  assert.equal(store.isSubscriber('s2'), true);
  const omar = store.createBooking({ ...input, start: priority, need: { ...input.need, encg: 'Settat', level: 'S3' } });
  store.cancel(omar.id);
  as(SALMA);
  advance(new Date(Date.parse(priority) - 23 * 3600000).toISOString());
  as(SALMA);
  assert.equal(store.createBooking({ ...input, start: priority }).status, 'pending');
});

test('paiement : notification signée acceptée → confirmée, transaction payée, 2 e-mails ; rejeu et signature invalide sans effet', () => {
  const { store, input, emails } = setup();
  const booking = store.createBooking(input);
  const tx = store.get().transactions.find(item => item.bookingId === booking.id);
  const forged = store.paymentNotification({ orderId: tx.orderId, status: 'accepted', amount: '50.00', signature: 'falsifiee' });
  assert.equal(forged.ok, false); assert.match(forged.error, /Signature invalide/);
  const tampered = store.paymentNotification({ orderId: tx.orderId, status: 'accepted', amount: '1.00', signature: sha256(`ontrack-demo-secret${tx.orderId}accepted1.00`) });
  assert.match(tampered.error, /Montant/);
  assert.equal(store.get().bookings.find(item => item.id === booking.id).status, 'pending');
  const signature = sha256(`ontrack-demo-secret${tx.orderId}accepted50.00`);
  assert.equal(store.sign(tx.orderId, 'accepted', 50), signature);
  const accepted = store.paymentNotification({ orderId: tx.orderId, status: 'accepted', amount: '50.00', signature });
  assert.equal(accepted.ok, true);
  const state = store.get();
  assert.equal(state.bookings.find(item => item.id === booking.id).status, 'confirmed');
  const paid = state.transactions.find(item => item.id === tx.id);
  assert.equal(paid.status, 'paid'); assert.equal(paid.fee, 1.25);
  assert.equal(emails(SALMA, 'payment-confirmed').length, 1);
  assert.equal(emails(SALMA, 'booking-confirmed').length, 1);
  assert.equal(emails(YASSINE, 'tutor-booking').length, 1);
  const before = store.get();
  const replay = store.paymentNotification({ orderId: tx.orderId, status: 'accepted', amount: '50.00', signature });
  assert.equal(replay.ok, false); assert.match(replay.error, /rejouée/);
  const refusedReplay = store.paymentNotification({ orderId: tx.orderId, status: 'refused', amount: '50.00', signature: store.sign(tx.orderId, 'refused', 50) });
  assert.equal(refusedReplay.ok, false);
  assert.deepEqual(store.get().transactions, before.transactions);
  assert.equal(store.get().emails.length, before.emails.length);
});

test('échec : refus ou abandon → failed, créneau libéré, e-mail d\'échec, nouvel essai possible', () => {
  const { store, input, emails } = setup();
  const refused = store.createBooking(input);
  store.gateway(refused.id, 'refused');
  assert.equal(store.get().bookings.find(item => item.id === refused.id).status, 'failed');
  assert.equal(store.get().transactions.find(item => item.bookingId === refused.id).status, 'failed');
  assert.equal(emails(SALMA, 'payment-failed').length, 1);
  assert.throws(() => store.gateway(refused.id, 'accepted'), /nouvel essai/);
  const retry = store.retryBooking(refused.id);
  assert.equal(retry.status, 'pending');
  assert.equal(store.cancel(retry.id), 'abandoned');
  const third = store.createBooking(input);
  store.gateway(third.id, 'cancelled');
  assert.equal(store.get().transactions.find(item => item.bookingId === third.id).failureReason, 'abandonné');
  assert.equal(store.finance().revenue, 499, 'seuls les paiements du jeu initial sont encaissés');
  assert.equal(store.get().bookings.filter(item => item.status === 'confirmed' && item.studentId === 's1').length, 0);
});

test('annulation : délai respecté → remboursement ou crédit ; hors délai refusée ; absence → séance due', () => {
  const { store, input, slots, as, pay, advance, emails } = setup();
  const single = pay({ start: slots()[3] });
  store.cancel(single.id);
  assert.equal(store.get().transactions.filter(tx => tx.kind === 'refund').at(-1).amount, -50);
  assert.equal(emails(SALMA, 'booking-changed').length, 1);
  const exam = pay({ offerId: 'exam', start: slots()[4] });
  store.cancel(exam.id);
  assert.equal(store.get().packages.find(pack => pack.id === exam.packageId).remaining, 3);
  assert.throws(() => store.cancel(exam.id));
  const late = pay({ start: slots()[0] });
  advance(new Date(Date.parse(slots()[0]) - 10 * 3600000).toISOString());
  as(SALMA);
  assert.throws(() => store.cancel(late.id), /hors délai/);
  assert.throws(() => store.reschedule(late.id, slots()[6]), /hors délai/);
  advance(new Date(Date.parse(slots()[0]) + 5 * 60000).toISOString());
  as(YASSINE);
  store.markAbsent(late.id);
  const absent = store.get().bookings.find(item => item.id === late.id);
  assert.equal(absent.status, 'absent');
  assert.equal(store.get().transactions.filter(tx => tx.bookingId === late.id && tx.kind === 'refund').length, 0);
  void input;
});

test('reprogrammation dans le délai, chevauchements partiels refusés pour tuteur et étudiant', () => {
  const { store, input, slots: list, as, pay } = setup();
  const original = list().slice();
  const slots = () => original;
  pay({ offerId: 'catch' });
  const overlapping = new Date(Date.parse(input.start) + 30 * 60000).toISOString();
  as(YASSINE); store.addSlot(overlapping);
  as('lina.elfassi@etu.encg-fes.demo'); store.addSlot(overlapping);
  as(SALMA);
  const later = pay({ start: slots()[3] });
  const before = store.get();
  assert.throws(() => store.createBooking({ ...input, start: overlapping }), /occupé/);
  assert.throws(() => store.createBooking({ ...input, tutorId: 't2', start: overlapping, need: { ...input.need, subjectId: 'stats', chapterId: 'stats-1' } }), /occupé/);
  assert.throws(() => store.reschedule(later.id, overlapping), /occupé/);
  assert.deepEqual(store.get().bookings, before.bookings);
  store.reschedule(later.id, slots()[6]);
  assert.equal(store.get().bookings.find(item => item.id === later.id).start, slots()[6]);
});

test('compte rendu : séance non terminée refusée ; 6 rubriques ; statuts de chapitre et progression par matière', () => {
  const { store, input, slots, as, pay, emails } = setup();
  const first = pay();
  as(YASSINE);
  assert.throws(() => store.complete(first.id, { subjectId: 'compta-gen', chapters: [{ id: 'compta-gen-1', status: 'revise' }], notions: 'a b c', exercises: 'a b c', difficulties: 'a b c', toReview: 'a b c', recommendations: 'a b c' }), /terminée/);
  store.simulateEnd(first.id);
  assert.throws(() => store.complete(first.id, { subjectId: 'compta-gen', chapters: [{ id: 'compta-gen-1', status: 'revise' }], notions: 'Bilan' }), /six rubriques/);
  assert.throws(() => store.complete(first.id, { subjectId: 'compta-gen', chapters: [{ id: 'stats-1', status: 'revise' }], notions: 'x x x', exercises: 'x x x', difficulties: 'x x x', toReview: 'x x x', recommendations: 'x x x' }), /chapitre/);
  store.complete(first.id, { subjectId: 'compta-gen', chapters: [{ id: 'compta-gen-1', status: 'revise' }, { id: 'compta-gen-3', status: 'en-cours' }, { id: 'compta-gen-4', status: 'a-etudier' }], notions: 'Bilan', exercises: 'Ex. 1', difficulties: 'Équilibre', toReview: 'Amortissements', recommendations: 'Refaire' });
  assert.equal(emails(SALMA, 'report-available').length, 1);
  let progress = store.progress('s1').find(item => item.subjectId === 'compta-gen');
  assert.equal(progress.worked, 2); assert.equal(progress.total, 5); assert.equal(progress.percent, 40);
  as(SALMA);
  const second = pay({ start: slots()[3] });
  as(YASSINE);
  finish(store, second.id, [{ id: 'compta-gen-1', status: 'maitrise' }, { id: 'compta-gen-3', status: 'a-etudier' }]);
  progress = store.progress('s1').find(item => item.subjectId === 'compta-gen');
  assert.equal(progress.chapters.find(item => item.id === 'compta-gen-1').status, 'maitrise');
  assert.equal(progress.chapters.find(item => item.id === 'compta-gen-3').status, 'a-etudier', 'le dernier compte rendu fait foi');
  assert.equal(progress.percent, 20);
  void input;
});

test('avis : unique et réservé au participant ; signalement tuteur → modération ; masqué exclu de la moyenne', () => {
  const { store, as, pay } = setup();
  const booking = pay();
  as(YASSINE); finish(store, booking.id);
  as(OMAR);
  assert.throws(() => store.review(booking.id, 1, 'Pas ma séance'), /participant/);
  as(SALMA);
  store.review(booking.id, 1, 'Commentaire abusif');
  assert.throws(() => store.review(booking.id, 5, 'Encore'), /unique/);
  assert.equal(store.tutorRating('t1').average, 2.5);
  as(YASSINE);
  const review = store.get().reviews.find(item => item.bookingId === booking.id);
  store.reportReview(review.id, 'Propos injurieux');
  assert.equal(store.stats().reportedReviews, 1);
  as(ADMIN);
  store.moderate(review.id, 'hide');
  assert.equal(store.tutorRating('t1').average, 4);
  assert.equal(store.stats().reportedReviews, 0);
});

test('forfaits : débit unique, épuisement, expiration, validité, centimes et résiliation', () => {
  const { store, input, slots, as, pay, advance, emails } = setup();
  as(ADMIN); store.setOffer('exam', { price: 400 }); as(SALMA);
  const first = pay({ offerId: 'exam' });
  const pack = store.get().packages.find(item => item.id === first.packageId);
  assert.equal(pack.remaining, 2);
  assert.equal(emails(SALMA, 'package-info').length, 1);
  const second = pay({ offerId: 'exam', packageId: pack.id, start: slots()[1] });
  const third = pay({ offerId: 'exam', packageId: pack.id, start: slots()[3] });
  assert.deepEqual([first.price, second.price, third.price], [133.33, 133.34, 133.33]);
  assert.equal(store.get().transactions.filter(tx => tx.kind === 'payment' && tx.studentId === 's1').length, 1);
  assert.throws(() => store.createBooking({ ...input, offerId: 'exam', packageId: pack.id, start: slots()[4] }), /épuisé/);
  for (const booking of [first, second, third]) store.cancel(booking.id);
  assert.equal(store.get().packages.find(item => item.id === pack.id).remaining, 3);
  assert.throws(() => store.createBooking({ ...input, offerId: 'exam', packageId: pack.id, start: slots()[27] }), /validité/);
  const before = store.get();
  assert.throws(() => store.createBooking({ ...input, offerId: 'exam', start: slots()[27] }), /validité/);
  assert.deepEqual(store.get().bookings, before.bookings);
  const terminated = store.terminatePackage(pack.id);
  assert.equal(terminated.refunded, 400);
  assert.throws(() => store.createBooking({ ...input, offerId: 'exam', packageId: pack.id, start: slots()[6] }), /résilié/);
  const stay = pay({ offerId: 'stay', start: slots()[9] });
  advance('2026-12-01T08:00:00Z'); store.tick();
  assert.equal(store.get().packages.find(item => item.id === stay.packageId).status, 'expired');
  assert.ok(emails(SALMA, 'package-info').some(email => /expiré/.test(email.subject)));
});

test('Stay ONTRACK : mois calendaire marocain, borné en fin de mois', () => {
  // Maroc en UTC+0 permanent depuis le 2026-09-20 (tzdata 2026c, Node 22.23.3 ou plus récent).
  const { store, pay } = setup('2027-01-31T08:00:00Z');
  const booking = pay({ offerId: 'stay' });
  assert.equal(store.get().packages.find(item => item.id === booking.packageId).expires, '2027-02-28T08:00:00.000Z');
  const late = setup('2026-10-31T00:30:00Z');
  const second = late.pay({ offerId: 'stay' });
  assert.equal(late.store.get().packages.find(item => item.id === second.packageId).expires, '2026-11-30T00:30:00.000Z');
});

test('tarifs historiques : une modification ne change que les nouvelles réservations', () => {
  const { store, slots, as, pay } = setup();
  pay();
  as(ADMIN);
  assert.throws(() => store.setOffer('quick', { price: 5 }), /10 et 5 000/);
  store.setOffer('quick', { price: 75 });
  as(SALMA);
  pay({ start: slots()[1] });
  assert.deepEqual(store.get().transactions.filter(tx => tx.studentId === 's1').map(tx => tx.amount), [50, 75]);
});

test('tuteur nouvellement inscrit : vérifié, validé par l\'admin, puis visible et réservable', () => {
  const { store, input, as, emails, now } = setup();
  store.logout();
  store.registerTutor({ name: 'Rania Berrada', email: 'rania@etu.encg-oujda.demo', encg: 'Oujda', level: 'S8', password: 'Tuteur2026', consent: true, subjects: ['micro'], chapters: ['micro-1', 'micro-2'], languages: ['Français'], modes: ['En ligne'], services: ['quick', 'catch'], bio: 'Microéconomie expliquée simplement.', photoConsent: false, age: '', showAge: false });
  const code = emails('rania@etu.encg-oujda.demo', 'verification')[0].code;
  assert.equal(store.verifyEmail('rania@etu.encg-oujda.demo', code).role, 'tutor');
  const tutorId = store.currentUser().id;
  const slot = store.addSlot(new Date(now().getTime() + 3 * 86400000).toISOString());
  assert.equal(store.get().tutors.find(item => item.id === tutorId).status, 'pending');
  const microNeed = { ...input.need, subjectId: 'micro', chapterId: 'micro-2' };
  as(SALMA);
  assert.throws(() => store.createBooking({ ...input, tutorId, start: slot, need: microNeed }), /non validé/);
  assert.equal(store.matchTutors({ subjectId: 'micro' }).some(item => item.tutorId === tutorId), false);
  as(ADMIN);
  store.setTutorStatus(tutorId, 'approved');
  assert.equal(emails('rania@etu.encg-oujda.demo', 'tutor-approved').length, 1);
  as(SALMA);
  assert.equal(store.matchTutors({ subjectId: 'micro', chapterId: 'micro-2' })[0].tutorId, tutorId);
  assert.ok(store.freeSlots(tutorId, 'quick').some(item => item.start === slot && !item.issue));
  const booking = store.createBooking({ ...input, tutorId, start: slot, need: microNeed });
  store.gateway(booking.id, 'accepted');
  assert.equal(store.get().bookings.find(item => item.id === booking.id).status, 'confirmed');
});

test('rémunération : 0 DH en phase volontaire, tarif §9.2 figé au compte rendu, versements et suivi financier', () => {
  const { store, slots, as, pay } = setup();
  const volunteer = pay();
  as(YASSINE); finish(store, volunteer.id);
  assert.equal(store.get().bookings.find(item => item.id === volunteer.id).payout.amount, 0);
  as(ADMIN);
  store.setPayout({ phase: 'paid', rates: { quick: 30, catch: 90, exam: 75, stay: 50 } });
  as(SALMA);
  const paid = pay({ offerId: 'exam', start: slots()[3] });
  as(YASSINE); finish(store, paid.id);
  as(ADMIN);
  store.setPayout({ phase: 'paid', rates: { quick: 30, catch: 90, exam: 80, stay: 50 } });
  assert.equal(store.get().bookings.find(item => item.id === paid.id).payout.amount, 75);
  assert.equal(store.payoutSummary('t1').due, 75);
  const payout = store.recordPayout('t1');
  assert.equal(payout.amount, 75);
  assert.equal(store.payoutSummary('t1').due, 0);
  assert.throws(() => store.recordPayout('t1'), /Aucune somme/);
  const finance = store.finance();
  assert.equal(finance.revenue, 50 + 399 + 349 + 150);
  assert.equal(finance.tutorPaid, 75);
  assert.equal(finance.byService.exam, 399);
  assert.equal(finance.kept, Math.round((finance.revenue - finance.refunded - finance.fees - finance.tutorDue - finance.tutorPaid) * 100) / 100);
});

test('stockage : clé v3, anciens états v1 et v2 remplacés par le seed v3, repli mémoire si indisponible ou corrompu', () => {
  assert.equal(KEY, 'ontrack-demo-v3');
  const legacy = memoryStorage();
  legacy.setItem('ontrack-demo-v1', JSON.stringify({ version: 1, student: { name: 'Ancien' } }));
  legacy.setItem('ontrack-demo-v2', JSON.stringify({ version: 2, programs: [{ id: 'p1', source: 'https://example.org/programmes/p1' }] }));
  const fresh = createStore(legacy);
  assert.equal(fresh.warning(), '');
  assert.equal(fresh.get().version, 3);
  assert.equal(fresh.get().programs.length, 9, 'seed v3 chargé');
  assert.equal(JSON.parse(legacy.getItem('ontrack-demo-v3')).version, 3);
  assert.equal(legacy.getItem('ontrack-demo-v1'), null);
  assert.equal(legacy.getItem('ontrack-demo-v2'), null, 'clé v2 supprimée');
  for (const storage of [null, { getItem: () => '{', setItem() {} }, { getItem: () => JSON.stringify({ version: 1 }), setItem() {} }, { getItem: () => JSON.stringify({ version: 2 }), setItem() {} }, { getItem: () => null, setItem() { throw Error('quota'); } }]) {
    const store = createStore(storage);
    assert.match(store.warning(), /mémoire/);
    assert.equal(store.login(ADMIN, 'Admin2026!').ok, true);
    store.setOffer('quick', { price: 60 });
    assert.equal(store.get().offers[0].price, 60);
  }
  const { store } = setup();
  for (const corrupt of [state => { state.users[0].role = 'root'; }, state => { state.tutors[0].photo = 'https://example.com/x.jpg'; }, state => { state.notifications.push({}); }, state => { state.programs[0].source = 'javascript:alert(1)'; }, state => { state.programs[0].source = 'http://www.hec.uliege.be'; }, state => { state.programs[0].seats = [{ label: 'Liste principale', count: -1 }]; }, state => { state.programs[0].minGrade = 'inconnue'; }, state => { state.offers[1].id = 'quick'; }]) {
    const state = store.get(); corrupt(state);
    const restored = createStore({ getItem: () => JSON.stringify(state), setItem() {} });
    assert.match(restored.warning(), /mémoire/);
    assert.equal(restored.get().users[0].role, 'student');
  }
});

test('persistance entre instances et échec de sauvegarde signalé', () => {
  const { store, storage, pay } = setup();
  const booking = pay();
  const reloaded = createStore(storage, () => new Date('2026-10-23T08:01:00Z'));
  assert.equal(reloaded.get().bookings.find(item => item.id === booking.id).status, 'confirmed');
  let broken = false;
  const failing = { getItem: () => null, setItem: () => { if (broken) throw Error('quota'); } };
  const other = createStore(failing);
  broken = true;
  other.login(SALMA, PASSWORD);
  assert.match(other.warning(), /ancienne sauvegarde peut subsister/);
  void store;
});

test('suppression de compte : mot de passe requis, données personnelles effacées, comptabilité anonymisée', () => {
  const { store, storage, slots, as, pay, emails } = setup();
  const past = pay();
  as(YASSINE); finish(store, past.id);
  as(SALMA);
  store.review(past.id, 5, 'Très clair');
  store.saveOrientationProfile({ encg: 'Casablanca', level: 'S6', track: 'Gestion', average: 14, validated: 'S1-S3', languages: [{ language: 'Français', level: 'C1' }], countries: [], programType: 'Indifférent' });
  const future = pay({ start: slots()[6] });
  assert.throws(() => store.deleteAccount('mauvais', true), /incorrect/);
  assert.throws(() => store.deleteAccount(PASSWORD, false), /Confirmation/);
  store.deleteAccount(PASSWORD, true);
  const state = createStore(storage).get();
  assert.equal(state.users.some(user => user.email === SALMA), false);
  assert.equal(state.session, null);
  assert.equal(state.reviews.some(review => review.studentId === 's1'), false);
  assert.equal(state.orientationProfiles.length, 0);
  assert.equal(state.bookings.find(item => item.id === future.id).status, 'cancelled');
  assert.ok(state.bookings.filter(item => item.studentId === 's1').every(item => item.studentName === 'Compte supprimé' && item.need.text === '[supprimé]'));
  assert.ok(state.transactions.some(tx => tx.studentId === 's1' && tx.kind === 'payment'), 'transactions conservées pour la comptabilité');
  assert.deepEqual(emails(SALMA).map(email => email.kind), ['account-deleted']);
  assert.equal(store.login(SALMA, PASSWORD).ok, false);
});

test('administration : domaines, référentiel, politique, comptes, export/import', () => {
  const { store, as, pay } = setup();
  as(ADMIN);
  assert.throws(() => store.setDomains('Agadir', ['pas un domaine']), /domaines valides/);
  store.setDomains('Agadir', ['uiz-encg.demo']);
  store.logout();
  assert.throws(() => store.register({ name: 'Test', email: 'x@etu.encg-agadir.demo', encg: 'Agadir', level: 'S1', track: 'Tronc commun', password: 'Motdepasse1', consent: true }), /Domaine non autorisé/);
  store.register({ name: 'Test', email: 'x@uiz-encg.demo', encg: 'Agadir', level: 'S1', track: 'Tronc commun', password: 'Motdepasse1', consent: true });
  as(ADMIN);
  assert.throws(() => store.removeChapter('compta-gen', 'compta-gen-1'), /utilisé/);
  const subjectId = store.saveSubject({ name: 'Fiscalité', level: 'S6' });
  const chapterId = store.saveChapter(subjectId, null, 'TVA');
  store.saveChapter(subjectId, chapterId, 'TVA et IS');
  assert.equal(store.get().subjects.find(item => item.id === subjectId).chapters[0].name, 'TVA et IS');
  store.removeChapter(subjectId, chapterId);
  store.removeSubject(subjectId);
  assert.throws(() => store.setLevels(['S1']), /utilisé/);
  store.setPolicy({ cancelHours: 48, rescheduleHours: 24, holdMinutes: 10, reminderHours: 12, priorityHours: 24, terminationRefund: false });
  assert.equal(store.get().config.policy.holdMinutes, 10);
  store.setUserStatus('s2', 'suspended');
  assert.equal(store.login(OMAR, PASSWORD).ok, false);
  as(ADMIN);
  store.setUserStatus('s2', 'active');
  const backup = store.exportData();
  store.setOffer('quick', { price: 99 });
  assert.throws(() => store.importData('{ invalide', true), /illisible/);
  assert.throws(() => store.importData(JSON.stringify({ version: 1 }), true), /Version/);
  store.importData(backup, true);
  assert.equal(store.get().offers[0].price, 50);
  assert.equal(store.currentUser().role, 'admin');
  as(SALMA);
  assert.throws(() => store.exportData(), /Accès refusé/);
  void pay;
});

test('rappels avant séance et e-mails du §12 tous présents dans la boîte simulée', () => {
  const { store, slots, as, pay, advance, emails } = setup();
  const booking = pay({ start: slots()[3] });
  as(SALMA); pay({ start: slots()[6] }, 'refused');
  store.reschedule(booking.id, slots()[4]);
  store.saveOrientationProfile({ encg: 'Casablanca', level: 'S6', track: 'Gestion', average: 15, validated: 'S1-S5', languages: [{ language: 'Français', level: 'C1' }], countries: [], programType: 'Indifférent' });
  store.requestConsultation({ programIds: ['hec-liege'], topic: 'Comparer les échanges en France', availability: 'Mercredi' });
  pay({ offerId: 'exam', start: slots()[9] });
  advance(new Date(Date.parse(slots()[4]) - 20 * 3600000).toISOString());
  as(SALMA);
  store.tick();
  assert.equal(emails(SALMA, 'reminder').length, 1);
  store.tick();
  assert.equal(emails(SALMA, 'reminder').length, 1, 'un seul rappel');
  advance(new Date(Date.parse(slots()[4]) + 3600000).toISOString());
  as(YASSINE); finish(store, booking.id);
  store.logout();
  store.register({ name: 'Imane', email: 'imane@etu.encg-fes.demo', encg: 'Fès', level: 'S1', track: 'Tronc commun', password: 'Motdepasse1', consent: true });
  store.verifyEmail('imane@etu.encg-fes.demo', emails('imane@etu.encg-fes.demo', 'verification')[0].code);
  const kinds = new Set(store.get().emails.map(email => email.kind));
  for (const kind of ['verification', 'welcome', 'booking-confirmed', 'payment-confirmed', 'payment-failed', 'reminder', 'booking-changed', 'report-available', 'package-info', 'orientation-confirmed']) assert.ok(kinds.has(kind), kind);
});

test('orientation : recommandations explicables, jamais garanties, et demande d\'entretien', () => {
  const { store, as } = setup();
  store.saveOrientationProfile({ encg: 'Casablanca', level: 'S6', track: 'Gestion', average: 13, validated: 'S1 à S5', languages: [{ language: 'Français', level: 'B2' }, { language: 'Anglais', level: 'B1' }], countries: ['France', 'Italie'], programType: 'Échange semestriel' });
  const recommendations = store.recommendations('s1');
  const eligible = recommendations.filter(item => item.eligible).map(item => item.programId);
  assert.deepEqual(eligible.sort(), ['amu', 'clermont-sb', 'rennes-sb'], 'critères connus remplis ; critères inconnus non bloquants');
  assert.ok(recommendations.every(item => item.criteria.length === 6));
  const clermont = recommendations.find(item => item.programId === 'clermont-sb');
  assert.deepEqual(clermont.criteria.filter(item => item.unknown).map(item => item.label), ['Filières éligibles', 'Niveau minimum', 'Moyenne minimale', 'Exigence linguistique', 'Type de mobilité']);
  assert.ok(clermont.criteria.filter(item => item.unknown).every(item => item.ok === false), 'un critère inconnu n\'est jamais rempli');
  assert.deepEqual([clermont.met, clermont.total, clermont.unknown], [1, 1, 5], 'les critères inconnus sortent du décompte');
  assert.equal(clermont.deadlinePassed, false, 'date limite inconnue : non dépassée');
  const shandong = recommendations.find(item => item.programId === 'shandong');
  assert.equal(shandong.eligible, false);
  assert.equal(shandong.criteria.find(item => /Type recherché/.test(item.label)).ok, false, 'type de mobilité connu (Échange) comparé');
  store.saveOrientationProfile({ encg: 'Casablanca', level: 'S6', track: 'Gestion', average: 13, validated: '', languages: [{ language: 'Français', level: 'B2' }], countries: ['Canada'], programType: 'Échange' });
  assert.deepEqual(store.recommendations('s1').filter(item => item.eligible).map(item => item.programId).sort(), ['sherbrooke', 'uqam-esg']);
  assert.throws(() => store.saveOrientationProfile({ encg: 'Casablanca', level: 'S6', track: 'Gestion', average: 25, validated: '', languages: [{ language: 'Français', level: 'B2' }], countries: [], programType: 'Indifférent' }), /Moyenne/);
  as(ADMIN);
  const base = { name: 'Programme réel', institution: 'Université X', country: 'France', mobility: '', level: '', tracks: [], minGrade: '', language: '', languageLevel: 'B2', deadline: '', documents: [], seats: [{ label: 'Liste principale', count: 20 }], source: 'https://www.hec.uliege.be', active: true };
  for (const source of ['http://www.hec.uliege.be', 'javascript:alert(1)', 'https://', 'https://exemple', 'https://www.hec.uliege.be/" onmouseover="x']) assert.throws(() => store.saveProgram({ ...base, source }), /https:\/\/ valide/, source);
  for (const seats of [[{ label: 'Liste principale', count: -1 }], [{ label: 'Liste principale', count: 2.5 }], [{ label: 'Liste principale', count: NaN }], [{ label: '', count: 3 }]]) assert.throws(() => store.saveProgram({ ...base, seats }), /Places/);
  const id = store.saveProgram(base);
  const created = store.get().programs.find(item => item.id === id);
  assert.deepEqual({ mobility: created.mobility, level: created.level, minGrade: created.minGrade, languageReq: created.languageReq, deadline: created.deadline, seats: created.seats, source: created.source }, { mobility: null, level: null, minGrade: null, languageReq: null, deadline: null, seats: [{ label: 'Liste principale', count: 20 }], source: 'https://www.hec.uliege.be' });
  assert.equal(store.get().programs.length, 10);
  for (const source of ['https://site.ma?lang=fr', 'https://site.ma#x']) {
    store.saveProgram({ ...base, id, source });
    assert.equal(store.get().programs.find(item => item.id === id).source, source, `${source} accepté`);
  }
  const sherbrooke = store.get().programs.find(item => item.id === 'sherbrooke');
  const edit = { ...sherbrooke, language: '', languageLevel: 'B2', deadline: '', level: '' };
  store.saveProgram({ ...edit, minGrade: 14 });
  as(SALMA);
  assert.equal(store.recommendations('s1').find(item => item.programId === 'sherbrooke').eligible, false, 'moyenne connue non atteinte');
  as(ADMIN);
  store.saveProgram({ ...edit, minGrade: '' });
  assert.equal(store.get().programs.find(item => item.id === 'sherbrooke').minGrade, null, 'moyenne vidée : de nouveau inconnue');
  assert.deepEqual(store.get().programs.find(item => item.id === 'sherbrooke').seats, [{ label: 'Places', count: 2 }]);
  as(SALMA);
  assert.equal(store.recommendations('s1').find(item => item.programId === 'sherbrooke').eligible, true);
});

test('filières : cohérence niveau / filière à l\'inscription, au profil et à l\'orientation', () => {
  const { store, as, emails } = setup();
  const profile = { encg: 'Casablanca', average: 14, validated: '', languages: [{ language: 'Français', level: 'B2' }], countries: [], programType: 'Indifférent' };
  assert.throws(() => store.saveOrientationProfile({ ...profile, level: 'S3', track: 'Finance' }), /^Error: Filière non proposée au niveau S3\.$/);
  assert.throws(() => store.updateProfile({ name: 'Salma Benali', level: 'S3', track: 'Finance' }), /^Error: Filière non proposée au niveau S3\.$/);
  assert.throws(() => store.updateProfile({ name: 'Salma Benali', level: 'S7', track: 'Gestion' }), /Filière non proposée au niveau S7\./);
  store.updateProfile({ name: 'Salma Benali', level: 'S9', track: 'Audit et contrôle de gestion (ACG)' });
  store.updateProfile({ name: 'Salma Benali', level: 'S9', track: 'Marketing digital (MD)' });
  store.saveOrientationProfile({ ...profile, level: 'S6', track: 'Commerce' });
  store.logout();
  const base = { name: 'Nadia Alaoui', email: 'nadia@etu.encg-agadir.demo', encg: 'Agadir', password: 'Motdepasse1', consent: true };
  assert.throws(() => store.register({ ...base, level: 'S3', track: 'Finance' }), /^Error: Filière non proposée au niveau S3\.$/);
  assert.throws(() => store.register({ ...base, level: 'S5', track: 'Marketing' }), /Choisissez votre filière/, 'ancienne filière fictive refusée');
  store.register({ ...base, level: 'S6', track: 'Commerce' });
  assert.equal(emails('nadia@etu.encg-agadir.demo', 'verification').length, 1);
  as(ADMIN);
  store.setLevels(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'Master 1']);
  store.logout();
  store.register({ ...base, email: 'imane@etu.encg-agadir.demo', level: 'Master 1', track: 'Finance' });
  assert.equal(store.get().users.find(item => item.email === 'imane@etu.encg-agadir.demo').track, 'Finance', 'niveau hors cycles connus : toutes les filières acceptées');
});

test('Study Pods : aucune réservation étudiante, actualités, prototype QR admin à usage unique', () => {
  const { store, as, emails, advance } = setup();
  assert.equal(typeof store.bookPod, 'undefined');
  assert.throws(() => store.podPrototypeCreate('pod-1', '2026-10-24T13:00:00Z'), /Accès refusé/);
  store.subscribePods('salma.benali@etu.encg-casablanca.demo', 'Casablanca');
  store.subscribePods('salma.benali@etu.encg-casablanca.demo', 'Casablanca');
  assert.equal(store.get().pods.subscribers.length, 1);
  assert.equal(emails(SALMA, 'pods-news').length, 1);
  as(ADMIN);
  const entry = store.podPrototypeCreate('pod-1', '2026-10-24T13:00:00Z');
  assert.match(entry.token, /^[0-9a-f]{32}$/);
  assert.equal(entry.tokenHash, sha256(entry.token));
  assert.throws(() => store.podCheckIn('jeton-inconnu'), /inconnu/);
  assert.throws(() => store.podCheckIn(entry.token), /pas encore valide/);
  advance('2026-10-24T12:40:00Z');
  as(ADMIN);
  store.podCheckIn(entry.token);
  assert.throws(() => store.podCheckIn(entry.token), /déjà utilisé/);
});

test('disponibilités tuteur : date impossible, récurrence, blocage et créneau réservé non retirable', () => {
  const { store, as, pay, slots } = setup();
  const booking = pay();
  as(YASSINE);
  assert.throws(() => store.addSlot('2026-11-31T14:00:00+01:00'), /calendrier/);
  const added = store.addRecurringSlots('2026-11-02', 15, 30, 3, true);
  assert.equal(added.length, 3);
  assert.ok(added.every(slot => store.get().tutors[0].prioritySlots.includes(slot)));
  assert.throws(() => store.removeSlot(booking.start), /réservé/);
  assert.throws(() => store.addBlocked(slots()[0], new Date(Date.parse(slots()[0]) + 3600000).toISOString()), /réservation existe/);
});

test('fichiers : UTF-8, ressources locales, SEO et scripts classiques', () => {
  const root = path.join(__dirname, '..');
  const read = name => new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(path.join(root, name)));
  const html = read('index.html');
  assert.match(html, /charset="utf-8"/);
  assert.ok(html.includes('Démonstration'));
  for (const script of ['sha256.js', 'data.js', 'store.js', 'ui.js', 'views-public.js', 'views-student.js', 'views-tutor.js', 'views-admin.js', 'app.js']) {
    assert.ok(html.includes(`src="${script}"`), script);
    assert.doesNotMatch(read(script), /^\s*(import|export)\s/m, `${script} sans module ES`);
  }
  assert.ok(!/type="module"/.test(html));
  for (const asset of ['assets/logo-ontrack.png', 'assets/favicon.png']) { assert.ok(html.includes(asset)); assert.ok(fs.existsSync(path.join(root, asset))); }
  assert.match(read('robots.txt'), /Disallow: \/etudiant\//);
  assert.match(read('sitemap.xml'), /<urlset/);
  assert.doesNotMatch(read('sitemap.xml'), /etudiant|tuteur\/|admin/);
  assert.match(read('styles.css'), /--paper:#f8f6f1/);
});

test('suppression avec forfait actif : crédits restants remboursés, abonnements et messages effacés', () => {
  const { store, slots, pay } = setup();
  const first = pay({ offerId: 'exam' });
  const planned = pay({ offerId: 'exam', packageId: first.packageId, start: slots()[3] });
  store.subscribePods(SALMA, 'Casablanca');
  store.message({ name: 'Salma', email: SALMA, text: 'Question sur mon forfait' });
  store.deleteAccount(PASSWORD, true);
  const state = store.get();
  assert.equal(state.bookings.find(item => item.id === planned.id).status, 'cancelled');
  const pack = state.packages.find(item => item.id === first.packageId);
  assert.equal(pack.status, 'terminated');
  assert.equal(pack.remaining, 0);
  const refunds = state.transactions.filter(tx => tx.studentId === 's1' && tx.kind === 'refund').reduce((total, tx) => total - tx.amount, 0);
  assert.equal(Math.round(refunds * 100) / 100, 399, 'deux séances futures annulées et un crédit non planifié : tout est remboursé');
  assert.equal(state.pods.subscribers.some(item => item.email === SALMA), false);
  assert.equal(state.messages.some(item => item.email === SALMA), false);
});

test('codes : 5 émissions maximum par heure et par usage', () => {
  const { store, emails, advance } = setup();
  store.logout();
  for (let index = 0; index < 7; index += 1) store.requestReset(SALMA);
  assert.equal(emails(SALMA, 'password-reset').length, 5);
  advance('2026-10-23T09:01:00Z');
  store.requestReset(SALMA);
  assert.equal(emails(SALMA, 'password-reset').length, 6);
  store.register({ name: 'Nadia', email: 'nadia@etu.encg-agadir.demo', encg: 'Agadir', level: 'S2', track: 'Tronc commun', password: 'Motdepasse1', consent: true });
  for (let index = 0; index < 6; index += 1) store.resendCode('nadia@etu.encg-agadir.demo');
  assert.equal(emails('nadia@etu.encg-agadir.demo', 'verification').length, 5);
});

test('paiement accepté pour un tuteur suspendu entre-temps : échec sans confirmation', () => {
  const { store, input, as, emails } = setup();
  const booking = store.createBooking(input);
  as(ADMIN);
  store.setTutorStatus('t1', 'suspended');
  const tx = store.get().transactions.find(item => item.bookingId === booking.id);
  const result = store.paymentNotification({ orderId: tx.orderId, status: 'accepted', amount: '50.00', signature: store.sign(tx.orderId, 'accepted', 50) });
  assert.equal(result.status, 'failed');
  const state = store.get();
  assert.equal(state.bookings.find(item => item.id === booking.id).status, 'failed');
  assert.equal(state.transactions.find(item => item.id === tx.id).failureReason, 'tuteur indisponible');
  assert.equal(state.transactions.some(item => item.kind === 'refund' && item.bookingId === booking.id), false);
  assert.equal(emails(SALMA, 'payment-failed').length, 1);
});

test("fin simulée d'une séance future : annulation, reprogrammation et remboursement admin refusés", () => {
  const { store, slots, as, pay } = setup();
  const booking = pay({ start: slots()[6] });
  as(YASSINE); store.simulateEnd(booking.id);
  as(SALMA);
  assert.throws(() => store.cancel(booking.id));
  assert.throws(() => store.reschedule(booking.id, slots()[9]));
  as(ADMIN);
  assert.throws(() => store.adminRefund(booking.id));
  assert.equal(store.get().transactions.filter(tx => tx.kind === 'refund' && tx.bookingId === booking.id).length, 0);
});

test('matières du tuteur : ajout → revalidation, chapitres seuls → publié, retrait refusé si séance', () => {
  const { store, as, pay } = setup();
  as(YASSINE);
  const chapters = store.get().tutors[0].chapters;
  assert.equal(store.updateTutorSubjects({ subjects: ['compta-gen', 'compta-ana'], chapters: chapters.slice(1) }).revalidation, false);
  assert.equal(store.get().tutors[0].status, 'approved');
  as(SALMA); pay();
  as(YASSINE);
  assert.throws(() => store.updateTutorSubjects({ subjects: ['compta-ana'], chapters: ['compta-ana-1'] }), /ne peut pas être retirée/);
  assert.equal(store.updateTutorSubjects({ subjects: ['compta-gen', 'compta-ana', 'micro'], chapters: [...chapters, 'micro-1'] }).revalidation, true);
  assert.equal(store.get().tutors[0].status, 'pending');
  assert.equal(store.matchTutors({ subjectId: 'compta-gen' }).some(item => item.tutorId === 't1'), false);
});

test('session : la navigation (tick) prolonge une session valide', () => {
  const { store, advance } = setup();
  advance('2026-10-23T09:30:00Z');
  store.tick();
  advance('2026-10-23T10:30:00Z');
  assert.ok(store.currentUser(), 'toujours connecté à 10:30');
  advance('2026-10-23T11:31:00Z');
  assert.equal(store.currentUser(), null);
});

test('orientation : date limite dépassée (fin de journée au Maroc) jamais éligible', () => {
  const { store, as, advance } = setup();
  as(ADMIN);
  store.saveProgram({ id: 'hec-liege', name: 'Mobilité HEC Liège', institution: 'HEC Liège — Université de Liège', country: 'Belgique', city: 'Liège', mobility: '', level: 'S5', tracks: ['Gestion'], minGrade: 12, language: 'Français', languageLevel: 'B2', deadline: '2026-10-24', documents: ['Relevés'], seats: [{ label: 'Liste principale', count: 20 }, { label: 'Liste d\'attente', count: 20 }], source: 'https://www.hec.uliege.be', sourceNote: 'Liste communiquée par l\'ENCG, année 2025-2026', active: true });
  as(SALMA);
  store.saveOrientationProfile({ encg: 'Casablanca', level: 'S6', track: 'Gestion', average: 15, validated: '', languages: [{ language: 'Français', level: 'C1' }], countries: [], programType: 'Indifférent' });
  assert.equal(store.recommendations('s1').find(item => item.programId === 'hec-liege').eligible, true);
  advance('2026-10-24T23:30:00Z');
  assert.equal(store.recommendations('s1').find(item => item.programId === 'hec-liege').eligible, true, '23:30 au Maroc : encore ouvert');
  advance('2026-10-25T00:30:00Z');
  const late = store.recommendations('s1').find(item => item.programId === 'hec-liege');
  assert.equal(late.deadlinePassed, true);
  assert.equal(late.eligible, false);
});
