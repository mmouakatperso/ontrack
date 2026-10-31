'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createStore, KEY, SESSION_KEY } = require('../store.js');
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

// --- Discussions entre étudiants : deux onglets (deux stores) partagent le même stockage, chacun sa session ---
function tabs(at) {
  let instant = new Date(at || '2026-10-23T08:00:00Z');
  const storage = memoryStorage();
  const clock = () => instant;
  const open = sessionStore => createStore(storage, clock, sessionStore || memoryStorage());
  const login = (store, email) => { const result = store.login(email, email === ADMIN ? 'Admin2026!' : PASSWORD); assert.ok(result.ok, result.error); return store; };
  const A = login(open(), SALMA);
  const B = login(open(), OMAR);
  const nadia = () => {
    const tab = open();
    tab.register({ name: 'Nadia Alaoui', email: 'nadia@etu.encg-agadir.demo', encg: 'Agadir', level: 'S2', track: 'Tronc commun', password: 'Motdepasse1', consent: true });
    const code = tab.get().emails.find(email => email.to === 'nadia@etu.encg-agadir.demo' && email.kind === 'verification').code;
    assert.equal(tab.verifyEmail('nadia@etu.encg-agadir.demo', code).ok, true);
    return tab;
  };
  return { storage, A, B, open, login, nadia, clock, now: () => instant, set: value => { instant = new Date(value); }, advance: ms => { instant = new Date(instant.getTime() + ms); } };
}
const lastMessage = store => store.get().chat.messages.at(-1);

test('session par onglet : connexion propre à l\'onglet, conservée au rechargement, absente de l\'état partagé', () => {
  const storage = memoryStorage();
  const tabA = memoryStorage();
  const clock = () => new Date('2026-10-23T08:00:00Z');
  const A = createStore(storage, clock, tabA);
  const B = createStore(storage, clock, memoryStorage());
  assert.equal(A.login(SALMA, PASSWORD).ok, true);
  B.tick();
  assert.equal(B.currentUser(), null, 'se connecter dans un onglet ne connecte pas les autres');
  assert.equal(B.login(OMAR, PASSWORD).ok, true);
  A.tick();
  assert.equal(A.currentUser().email, SALMA, 'l\'onglet A garde sa session après relecture de l\'état');
  assert.equal(JSON.parse(storage.getItem(KEY)).session, null, 'session exclue de l\'état partagé');
  assert.equal(JSON.parse(tabA.getItem(SESSION_KEY)).userId, 's1');
  assert.equal(createStore(storage, clock, tabA).currentUser().email, SALMA, 'recharger l\'onglet garde la session');
  A.logout();
  assert.equal(tabA.getItem(SESSION_KEY), null);
  B.tick();
  assert.equal(B.currentUser().email, OMAR);
  const snapshot = storage.getItem(KEY);
  B.tick();
  assert.equal(storage.getItem(KEY), snapshot, 'une simple navigation ne réécrit pas l\'état partagé');
});

test('discussions : envoi en salon, réponse de persona planifiée entre 2 et 6 s puis distribuée par tick', () => {
  const { A, now, set, advance } = tabs();
  assert.equal(A.chatView().current.id, 'r-gestion', 'salon de la filière ouvert par défaut');
  assert.ok(A.chatView().rooms[0].mine);
  const sent = A.chatPost({ roomId: 'r-gestion', text: '  Qui révise la compta ?  ' });
  assert.equal(sent.warning, '');
  assert.deepEqual([sent.message.text, sent.message.fromId, sent.message.roomId, sent.message.threadId], ['Qui révise la compta ?', 's1', 'r-gestion', null]);
  const pending = A.get().chat.pending;
  assert.equal(pending.length, 1);
  const delay = Date.parse(pending[0].due) - now().getTime();
  assert.ok(delay >= 2000 && delay <= 6000, `délai ${delay} ms`);
  assert.equal(pending[0].roomId, 'r-gestion');
  assert.equal(pending[0].forUserId, 's1');
  assert.deepEqual(A.chatView('r-gestion').waiting, ['Yasmine (fictive)']);
  assert.equal(A.chatView().expecting, true);
  A.chatPost({ roomId: 'r-gestion', text: 'Et les amortissements ?' });
  assert.equal(A.get().chat.pending.length, 1, 'une seule réponse attendue par discussion');
  advance(1999);
  A.tick();
  assert.equal(A.get().chat.pending.length, 1, 'avant l\'échéance : rien n\'est distribué');
  set(pending[0].due);
  A.tick();
  const state = A.get();
  assert.equal(state.chat.pending.length, 0, 'entrée pending retirée');
  const reply = state.chat.messages.at(-1);
  assert.equal(reply.fromId, 'p-yasmine');
  assert.match(reply.fromName, /\(fictive\)/);
  assert.match(reply.text, /^Pour la compta, je refais/);
  assert.ok(!reply.text.includes('Salma'), 'aucun prénom dans une réponse publique');
  assert.equal(A.chatView('r-gestion').messages.at(-1).persona, true);
  assert.equal(A.chatView().expecting, false);
});

test('discussions : réservées aux étudiants, 1 à 500 caractères, coordonnées publiées avec un avertissement', () => {
  const { A, open, login } = tabs();
  for (const email of [YASSINE, ADMIN]) {
    const tab = login(open(), email);
    assert.throws(() => tab.chatPost({ roomId: 'r-tc', text: 'Bonjour' }), /^Error: Accès refusé : connectez-vous avec un compte autorisé\.$/);
    assert.throws(() => tab.chatView(), /Accès refusé/);
  }
  assert.throws(() => open().chatPost({ roomId: 'r-tc', text: 'Bonjour' }), /Accès refusé/, 'visiteur');
  for (const text of ['', '   ', 'a'.repeat(501), null]) assert.throws(() => A.chatPost({ roomId: 'r-tc', text }), /^Error: Message : 1 à 500 caractères\.$/);
  assert.equal(A.chatPost({ roomId: 'r-tc', text: 'a'.repeat(500) }).message.text.length, 500);
  assert.throws(() => A.chatPost({ roomId: 'inconnu', text: 'Bonjour' }), /Discussion introuvable/);
  assert.throws(() => A.chatPost({ roomId: 'r-tc', threadId: 'th-x', text: 'Bonjour' }), /Discussion introuvable/);
  for (const text of ['écris-moi à a@b.ma', 'Mon numéro : 06 12 34 56 78', 'Appelle le +212612345678']) {
    const result = A.chatPost({ roomId: 'r-tc', text });
    assert.match(result.warning, /adresse e-mail ou un numéro de téléphone/, text);
    assert.equal(lastMessage(A).text, text, 'message publié malgré l\'avertissement');
  }
  assert.equal(A.chatPost({ roomId: 'r-tc', text: 'Examen le 12/01/2026 en salle 204' }).warning, '');
});

test('discussions privées : Salma → Omar d\'un onglet à l\'autre, notification, invisibles pour un tiers', () => {
  const { A, B, open, login, nadia, set } = tabs();
  const thread = A.chatStartThread('s2');
  assert.equal(A.chatStartThread('s2').id, thread.id, 'pas de doublon');
  assert.throws(() => A.chatStartThread('s1'), /vous-même/);
  assert.throws(() => A.chatStartThread('t1'), /Destinataire introuvable/);
  A.chatPost({ threadId: thread.id, text: 'Salut Omar, on révise ensemble ?' });
  assert.equal(A.get().chat.pending.length, 0, 'aucune réponse simulée entre deux vrais étudiants');
  assert.equal(B.refresh(), true, 'l\'onglet B relit l\'état sans rechargement');
  const view = B.chatView(thread.id);
  assert.equal(view.current.kind, 'thread');
  assert.equal(view.current.name, 'Salma Benali');
  assert.equal(view.messages.at(-1).text, 'Salut Omar, on révise ensemble ?');
  assert.ok(B.get().notifications.some(item => item.userId === 's2' && item.text === 'Nouveau message privé de Salma Benali.'), 'Omar notifié');
  const C = nadia();
  const intruder = C.chatView(thread.id);
  assert.equal(intruder.current.kind, 'room');
  assert.equal(intruder.threads.length, 0);
  assert.ok(!JSON.stringify(intruder).includes('on révise ensemble'));
  const privateId = B.chatView(thread.id).messages.at(-1).id;
  assert.throws(() => C.chatPost({ threadId: thread.id, text: 'Coucou' }), /Discussion introuvable/);
  assert.throws(() => C.chatReport(privateId, 'Propos inappropriés'), /Message introuvable/);
  const admin = login(open(), ADMIN);
  assert.deepEqual(admin.chatReported(), [], 'l\'administration ne voit pas les messages non signalés');
  const backup = admin.exportData();
  assert.ok(!backup.includes('on révise ensemble'), 'sauvegarde sans discussion privée');
  assert.ok(!backup.includes('Nouveau message privé'), 'sauvegarde sans notification révélant qui écrit à qui');
  admin.importData(backup, true);
  assert.equal(admin.currentUser().role, 'admin', 'import : session de l\'onglet conservée');
  B.refresh();
  assert.equal(B.chatView(thread.id).messages.at(-1).text, 'Salut Omar, on révise ensemble ?', 'import : discussions privées en cours conservées');
  assert.ok(B.get().notifications.some(item => item.userId === 's2' && item.text === 'Nouveau message privé de Salma Benali.'), 'import : notification conservée');
  // Discussion avec une persona : réponse automatique, puis notification à la distribution.
  const persona = A.chatStartThread('p-ines');
  A.chatPost({ threadId: persona.id, text: 'Bonjour Inès !' });
  const due = A.get().chat.pending.find(item => item.threadId === persona.id);
  assert.equal(due.personaId, 'p-ines');
  set(due.due);
  A.tick();
  const reply = A.chatView(persona.id).messages.at(-1);
  assert.deepEqual([reply.fromName, reply.persona], ['Inès (fictive)', true]);
  assert.match(reply.text, /^Salut Salma !/, 'en discussion privée, la persona cite le prénom');
  assert.ok(A.get().notifications.some(item => item.userId === 's1' && item.text === 'Nouveau message privé de Inès (fictive).'));
  assert.equal(A.get().chat.pending.length, 0);
});

test('deux onglets : écritures alternées sans perte de message, état relu avant chaque écriture', () => {
  const { storage, A, B } = tabs();
  const thread = A.chatStartThread('s2');
  for (let index = 0; index < 6; index += 1) (index % 2 ? B : A).chatPost({ threadId: thread.id, text: `Message ${index}` });
  A.chatPost({ roomId: 'r-tc', text: 'Salon depuis A' });
  B.chatPost({ roomId: 'r-tc', text: 'Salon depuis B' });
  A.refresh(); B.refresh();
  const expected = ['Message 0', 'Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5'];
  for (const tab of [A, B]) assert.deepEqual(tab.chatView(thread.id).messages.map(item => item.text), expected);
  const shared = JSON.parse(storage.getItem(KEY)).chat.messages.map(item => item.text);
  for (const text of [...expected, 'Salon depuis A', 'Salon depuis B']) assert.ok(shared.includes(text), text);
  assert.equal(A.currentUser().email, SALMA);
  assert.equal(B.currentUser().email, OMAR);
  // Données illisibles écrites par un autre onglet : rien n'est adopté et l'avertissement est affiché.
  const valid = storage.getItem(KEY);
  storage.setItem(KEY, '{');
  A.tick();
  assert.match(A.warning(), /autre onglet/);
  assert.equal(A.currentUser().email, SALMA);
  storage.setItem(KEY, valid.replace('Message 5', 'Message 5 relu'));
  A.tick();
  assert.equal(A.warning(), '', 'avertissement effacé après une relecture réussie');
  assert.equal(A.chatView(thread.id).messages.at(-1).text, 'Message 5 relu');
});

test('signalement et modération : file admin, masquage puis rétablissement', () => {
  const { A, B, open, login } = tabs();
  const { message } = A.chatPost({ roomId: 'r-gestion', text: 'Message à signaler' });
  assert.throws(() => A.chatReport(message.id, 'Propos inappropriés ou harcèlement'), /^Error: Vous ne pouvez pas signaler votre propre message\.$/);
  assert.throws(() => B.chatReport(message.id, 'x'), /motif/);
  B.chatReport(message.id, 'Propos inappropriés ou harcèlement');
  assert.throws(() => B.chatReport(message.id, 'Propos inappropriés ou harcèlement'), /déjà signalé/);
  assert.equal(B.chatView('r-gestion').messages.find(item => item.id === message.id).reportedByMe, true);
  assert.throws(() => B.chatHide(message.id, true), /Accès refusé/);
  const admin = login(open(), ADMIN);
  const flagged = admin.chatReported();
  assert.equal(flagged.length, 1);
  assert.deepEqual([flagged[0].text, flagged[0].place, flagged[0].fromName, flagged[0].reportedBy, flagged[0].reason, flagged[0].hidden], ['Message à signaler', 'Gestion', 'Salma Benali', 'Omar Tazi', 'Propos inappropriés ou harcèlement', false]);
  assert.ok(admin.get().notifications.some(item => item.userId === 'a1' && /Message signalé/.test(item.text)));
  assert.throws(() => admin.chatHide('cm-seed-1', true), /Message introuvable/, 'seuls les messages signalés sont modérables');
  admin.chatHide(message.id, true);
  A.refresh();
  const hidden = A.chatView('r-gestion').messages.find(item => item.id === message.id);
  assert.deepEqual([hidden.hidden, hidden.text, hidden.canReport], [true, 'Message masqué par la modération', false]);
  assert.equal(admin.chatReported()[0].hidden, true, 'reste dans la file pour pouvoir être rétabli');
  admin.chatHide(message.id, false);
  A.refresh();
  assert.equal(A.chatView('r-gestion').messages.find(item => item.id === message.id).text, 'Message à signaler');
});

test('suppression de compte : messages anonymisés, fils privés et réponses planifiées supprimés', () => {
  const { storage, A, B, clock } = tabs();
  A.chatPost({ roomId: 'r-gestion', text: 'Message de Salma dans un salon' });
  const withOmar = A.chatStartThread('s2');
  A.chatPost({ threadId: withOmar.id, text: 'Privé pour Omar' });
  B.chatPost({ threadId: withOmar.id, text: 'Réponse d\'Omar' });
  const withPersona = A.chatStartThread('p-ines');
  A.chatPost({ threadId: withPersona.id, text: 'Bonjour Inès' });
  B.chatPost({ roomId: 'r-tc', text: 'Bonjour le Tronc commun' });
  A.refresh();
  assert.ok(A.get().chat.pending.some(item => item.forUserId === 's1'));
  A.deleteAccount(PASSWORD, true);
  B.refresh();
  const chat = B.get().chat;
  const room = chat.messages.find(item => item.text === 'Message de Salma dans un salon');
  assert.deepEqual([room.fromId, room.fromName], [null, 'Compte supprimé']);
  assert.equal(B.chatView('r-gestion').messages.find(item => item.id === room.id).deleted, true);
  assert.ok(!chat.threads.some(thread => thread.members.includes('s1')));
  assert.ok(!chat.messages.some(item => [withOmar.id, withPersona.id].includes(item.threadId)));
  assert.ok(!chat.pending.some(item => item.forUserId === 's1'), 'réponses planifiées pour Salma supprimées');
  assert.ok(chat.pending.some(item => item.forUserId === 's2'), 'celles d\'Omar sont conservées');
  assert.deepEqual(B.chatView().threads, []);
  assert.equal(createStore(storage, clock, memoryStorage()).warning(), '', 'état toujours valide après suppression');
});

test('migration : un état v3 sans collection chat reçoit le chat du seed, sans réinitialiser le reste', () => {
  const storage = memoryStorage();
  const clock = () => new Date('2026-10-23T08:00:00Z');
  const before = createStore(storage, clock);
  before.login(ADMIN, 'Admin2026!');
  before.setOffer('quick', { price: 77 });
  const saved = JSON.parse(storage.getItem(KEY));
  delete saved.chat;
  storage.setItem(KEY, JSON.stringify(saved));
  const migrated = createStore(storage, clock, memoryStorage());
  assert.equal(migrated.warning(), '');
  const state = migrated.get();
  assert.equal(state.offers.find(offer => offer.id === 'quick').price, 77, 'données conservées');
  assert.deepEqual(state.chat.rooms.map(room => room.name), ['Tronc commun', 'Gestion', 'Commerce', 'Finance', 'Comptabilité générale', 'Statistiques']);
  assert.ok(state.chat.personas.length >= 3 && state.chat.personas.length <= 4 && state.chat.personas.every(persona => persona.name.includes('(fictive)')));
  for (const room of state.chat.rooms) assert.equal(state.chat.messages.filter(message => message.roomId === room.id).length, 2, room.id);
  assert.ok(JSON.parse(storage.getItem(KEY)).chat, 'chat enregistré');
  const corruptions = [chat => { chat.personas[0].name = 'Inès'; }, chat => { chat.messages[0].text = 'x'.repeat(501); }, chat => { chat.threads.push({ id: 'th-1', members: ['s1', 'inconnu'], created: '2026-10-23T08:00:00Z' }); }, chat => { chat.pending.push({ id: 'cp-1', due: 'demain', roomId: 'r-tc', threadId: null, personaId: 'p-ines', text: 'x' }); }];
  for (const corrupt of corruptions) {
    const broken = migrated.get(); corrupt(broken.chat);
    assert.match(createStore({ getItem: () => JSON.stringify(broken), setItem() {} }).warning(), /mémoire/);
  }
  // Import d'une sauvegarde antérieure aux discussions : chat du seed ajouté, données conservées.
  migrated.login(ADMIN, 'Admin2026!');
  migrated.setOffer('quick', { price: 66 });
  const backup = JSON.parse(migrated.exportData());
  delete backup.chat;
  migrated.setOffer('quick', { price: 50 });
  migrated.importData(JSON.stringify(backup), true);
  const imported = migrated.get();
  assert.equal(imported.offers.find(offer => offer.id === 'quick').price, 66);
  assert.deepEqual(imported.chat.rooms.map(room => room.id), ['r-tc', 'r-gestion', 'r-commerce', 'r-finance', 'r-compta-gen', 'r-stats']);
});

test('réinitialisation du mot de passe : les sessions du compte sont fermées dans tous les onglets', () => {
  const { A, B, open, advance } = tabs();
  advance(60000);
  const C = open();
  C.requestReset(SALMA);
  const code = C.get().emails.find(email => email.to === SALMA && email.kind === 'password-reset').code;
  assert.equal(C.confirmReset(SALMA, code, 'Nouveau2026').ok, true);
  A.tick();
  assert.equal(A.currentUser(), null, 'session de l\'onglet A ouverte avant la réinitialisation : fermée');
  B.tick();
  assert.equal(B.currentUser().email, OMAR, 'les autres comptes ne sont pas touchés');
  assert.equal(A.login(SALMA, 'Nouveau2026').ok, true);
  A.tick();
  assert.equal(A.currentUser().email, SALMA, 'une session ouverte après la réinitialisation est valide');
  const broken = A.get();
  broken.users.find(user => user.id === 's1').sessionsRevokedAt = 'jamais';
  assert.match(createStore({ getItem: () => JSON.stringify(broken), setItem() {} }).warning(), /mémoire/);
});

test('personas : nom avec « $\' » inséré tel quel en privé, jamais en salon ; mots-clés en début de mot', () => {
  const { A, set } = tabs();
  const name = '$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\'$\' Test';
  A.updateProfile({ name, level: 'S6', track: 'Gestion' });
  const thread = A.chatStartThread('p-ines');
  A.chatPost({ threadId: thread.id, text: 'Une question de compta' });
  A.chatPost({ roomId: 'r-gestion', text: 'Une question de compta' });
  const due = A.get().chat.pending;
  assert.match(due.find(item => item.threadId === thread.id).text, /^Pour la compta, \$'\$'/);
  assert.equal(due.find(item => item.roomId === 'r-gestion').text.includes('$'), false, 'aucun prénom en salon');
  set(due.map(item => item.due).sort().at(-1));
  A.tick();
  A.tick();
  const reply = A.chatView(thread.id).messages.at(-1);
  assert.equal(reply.text, `Pour la compta, ${name.split(' ')[0]}, je refais toujours un petit bilan à la main avant l'examen. On pourrait comparer nos corrigés dans ce salon ?`);
  assert.ok(reply.text.length <= 500);
  assert.equal(A.warning(), '');
  for (const [roomId, text, forbidden] of [['r-tc', 'Quel est le statut de ma demande ?', /stats/], ['r-commerce', 'Je suis inactif depuis lundi', /compta/], ['r-finance', 'Stop, je reviens plus tard', /Avec plaisir/]]) {
    A.chatPost({ roomId, text });
    const pending = A.get().chat.pending.find(item => item.roomId === roomId);
    assert.doesNotMatch(pending.text, forbidden, text);
  }
});

test('deux onglets : l\'état est relu avant les tâches périodiques, dont l\'effet n\'est pas perdu', () => {
  const { storage, A, advance, now } = tabs();
  const need = { encg: 'Casablanca', level: 'S6', subjectId: 'compta-gen', chapterId: 'compta-gen-1', difficulty: 'Cours manqué', mode: 'En ligne', wishes: '', text: 'Revoir le bilan', attachment: null };
  const input = { tutorId: 't1', offerId: 'quick', start: A.get().tutors[0].slots[0], need, acceptPolicy: true };
  const first = A.createBooking(input);
  advance(16 * 60000);
  // Un autre onglet écrit l'état (sans exécuter les tâches périodiques) avant la prochaine action de A.
  const shared = JSON.parse(storage.getItem(KEY));
  shared.chat.messages.push({ id: 'cm-autre-onglet', roomId: 'r-tc', threadId: null, fromId: 's2', fromName: 'Omar Tazi', text: 'Écrit dans un autre onglet', created: now().toISOString(), reported: false, reportReason: '', hidden: false });
  storage.setItem(KEY, JSON.stringify(shared));
  const second = A.createBooking(input);
  assert.equal(second.status, 'pending', 'créneau libéré par l\'expiration de la retenue, puis réservé de nouveau');
  const state = JSON.parse(storage.getItem(KEY));
  assert.equal(state.bookings.find(item => item.id === first.id).status, 'failed');
  assert.ok(state.chat.messages.some(item => item.id === 'cm-autre-onglet'), 'écriture de l\'autre onglet conservée');
});

test('encadrante tutrice : réservable en Anglais commercial avec les créneaux de démonstration, niveau conservé', () => {
  const { store, need, pay, as } = setup();
  const state = store.get();
  const subject = state.subjects.find(item => item.id === 'anglais-com');
  assert.deepEqual({ name: subject.name, level: subject.level, chapters: subject.chapters.map(chapter => chapter.id) }, { name: 'Anglais commercial', level: 'S1', chapters: ['anglais-com-1', 'anglais-com-2', 'anglais-com-3', 'anglais-com-4'] });
  const tutor = state.tutors.find(item => item.id === 't4');
  assert.equal(tutor.status, 'approved');
  assert.equal(tutor.photo, '');
  assert.deepEqual(tutor.subjects, ['anglais-com', 'marketing']);
  assert.equal(tutor.chapters.length, 8);
  assert.equal(tutor.slots.length, state.tutors[0].slots.length);
  assert.ok(!state.reviews.some(review => review.tutorId === 't4') && !state.bookings.some(booking => booking.tutorId === 't4'), 'ni avis ni séance inventés');
  assert.equal(state.users.find(user => user.id === 't4').email, 'fatine.ouahtita@encg-casablanca.demo');
  const matches = store.matchTutors({ subjectId: 'anglais-com', chapterId: 'anglais-com-3' }, 'quick');
  assert.deepEqual(matches.map(item => item.tutorId), ['t4']);
  const slot = store.freeSlots('t4', 'quick').find(item => !item.issue);
  assert.ok(slot, 'au moins un créneau réservable');
  const booking = pay({ tutorId: 't4', start: slot.start, need: { ...need, subjectId: 'anglais-com', chapterId: 'anglais-com-3' } });
  assert.equal(booking.status, 'confirmed');
  as('fatine.ouahtita@encg-casablanca.demo');
  const profile = store.get().tutors.find(item => item.id === 't4');
  store.updateTutorProfile({ level: 'Professeure', bio: profile.bio, languages: profile.languages, modes: profile.modes, services: profile.services, photoConsent: false, showAge: false, age: '' });
  assert.equal(store.get().tutors.find(item => item.id === 't4').level, 'Professeure', 'niveau hors liste conservé');
  assert.throws(() => store.updateTutorProfile({ level: 'Doyenne', bio: profile.bio, languages: profile.languages, modes: profile.modes, services: profile.services }), /Niveau d'études invalide/);
});

test('migration : un état v3 sans l\'encadrante reçoit sa matière, son compte et son profil, une seule fois', () => {
  const clock = () => new Date('2026-10-23T08:00:00Z');
  const withoutSupervisor = mutate => {
    const storage = memoryStorage();
    const before = createStore(storage, clock);
    before.login(ADMIN, 'Admin2026!');
    before.setOffer('quick', { price: 77 });
    const saved = JSON.parse(storage.getItem(KEY));
    saved.subjects = saved.subjects.filter(subject => subject.id !== 'anglais-com');
    saved.users = saved.users.filter(user => user.id !== 't4');
    saved.tutors = saved.tutors.filter(tutor => tutor.id !== 't4');
    if (mutate) mutate(saved);
    storage.setItem(KEY, JSON.stringify(saved));
    return { storage, saved };
  };
  // Nouvel ajout : matière, compte et tutrice du seed ; le reste est intact.
  const { storage, saved } = withoutSupervisor();
  const migrated = createStore(storage, clock, memoryStorage());
  assert.equal(migrated.warning(), '');
  const state = migrated.get();
  assert.equal(state.offers.find(offer => offer.id === 'quick').price, 77, 'données conservées');
  assert.ok(state.subjects.some(subject => subject.id === 'anglais-com'));
  assert.ok(state.users.some(user => user.id === 't4' && user.role === 'tutor'));
  assert.equal(state.tutors.find(tutor => tutor.id === 't4').status, 'approved');
  for (const key of ['bookings', 'reviews', 'transactions']) assert.deepEqual(state[key], saved[key], key);
  assert.deepEqual(state.tutors.filter(tutor => tutor.id !== 't4'), saved.tutors);
  const persisted = JSON.parse(storage.getItem(KEY));
  assert.ok(persisted.tutors.some(tutor => tutor.id === 't4'), 'migration enregistrée');
  // État contenant déjà t4 : aucune modification.
  const snapshot = storage.getItem(KEY);
  assert.equal(createStore(storage, clock, memoryStorage()).warning(), '');
  assert.equal(storage.getItem(KEY), snapshot);
  // Matière supprimée par l'administration alors que t4 existe : pas de réinsertion.
  const removed = JSON.parse(snapshot);
  removed.subjects = removed.subjects.filter(subject => subject.id !== 'anglais-com');
  const t4 = removed.tutors.find(tutor => tutor.id === 't4');
  t4.subjects = ['marketing']; t4.chapters = t4.chapters.filter(id => id.startsWith('marketing-'));
  storage.setItem(KEY, JSON.stringify(removed));
  const afterRemoval = createStore(storage, clock, memoryStorage());
  assert.equal(afterRemoval.warning(), '');
  assert.ok(!afterRemoval.get().subjects.some(subject => subject.id === 'anglais-com'), 'pas de réinsertion');
  // E-mail ou identifiant de chapitre déjà pris : aucun ajout, état chargé tel quel.
  const collisions = [
    state => { state.users.push({ ...state.users.find(user => user.id === 't1'), id: 'stu-x', role: 'student', email: 'fatine.ouahtita@encg-casablanca.demo', encg: 'Casablanca', level: 'S1', track: 'Tronc commun' }); },
    state => { state.subjects.find(subject => subject.id === 'marketing').chapters.push({ id: 'anglais-com-2', name: 'Chapitre ajouté' }); }
  ];
  for (const collide of collisions) {
    const { storage: other } = withoutSupervisor(collide);
    const loaded = createStore(other, clock, memoryStorage());
    assert.equal(loaded.warning(), '', 'état chargé');
    assert.ok(!loaded.get().tutors.some(tutor => tutor.id === 't4') && !loaded.get().subjects.some(subject => subject.id === 'anglais-com'), 'aucun ajout');
  }
  // Marketing supprimé par l'administration : la tutrice est ajoutée avec l'Anglais commercial seul.
  const { storage: noMarketing } = withoutSupervisor(state => { state.subjects = state.subjects.filter(subject => subject.id !== 'marketing'); state.tutors.find(tutor => tutor.id === 't3').subjects = ['micro']; state.tutors.find(tutor => tutor.id === 't3').chapters = state.tutors.find(tutor => tutor.id === 't3').chapters.filter(id => id.startsWith('micro-')); });
  const partial = createStore(noMarketing, clock, memoryStorage());
  assert.equal(partial.warning(), '');
  const added = partial.get().tutors.find(tutor => tutor.id === 't4');
  assert.deepEqual(added.subjects, ['anglais-com']);
  assert.ok(added.chapters.every(id => id.startsWith('anglais-com-')));
  // État v3 sans chat ni encadrante : les deux migrations s'appliquent ensemble.
  const { storage: bare, saved: bareSaved } = withoutSupervisor(state => { delete state.chat; });
  const both = createStore(bare, clock, memoryStorage());
  assert.equal(both.warning(), '');
  const combined = both.get();
  assert.deepEqual(combined.chat.rooms.map(room => room.id), ['r-tc', 'r-gestion', 'r-commerce', 'r-finance', 'r-compta-gen', 'r-stats']);
  assert.ok(combined.tutors.some(tutor => tutor.id === 't4') && combined.users.some(user => user.id === 't4') && combined.subjects.some(subject => subject.id === 'anglais-com'));
  assert.equal(combined.offers.find(offer => offer.id === 'quick').price, 77, 'données conservées');
  for (const key of ['bookings', 'reviews', 'transactions']) assert.deepEqual(combined[key], bareSaved[key], key);
});
