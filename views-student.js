(function (root) {
  'use strict';
  const O = root.Ontrack;
  const u = O.ui;
  const { escape, money, date, head, empty, select, field, optional, textarea, badge, button, radios } = u;
  const ATTACHMENT_TYPES = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' };
  const STEPS = [['Matière', '1'], ['Besoin', '2'], ['Service', '3'], ['Tuteur', '4-5'], ['Créneau', '6-7'], ['Récapitulatif', '8']];

  function wizardState(ctx) {
    const tutorId = ctx.params[0];
    let wizard = ctx.ui.wizard;
    if (!wizard) wizard = ctx.ui.wizard = { step: 1 };
    if (tutorId && wizard.lockedTutor !== tutorId) wizard = ctx.ui.wizard = { step: 1, tutorId, lockedTutor: tutorId, offerId: wizard.offerId, packageId: wizard.packageId };
    const required = [['subjectId', 2], ['need', 3], ['offerId', 4], ['tutorId', 5], ['start', 6]];
    for (const [key, step] of required) if (wizard.step >= step && !wizard[key]) wizard.step = step - 1;
    if (!wizard.step) wizard.step = 1;
    return wizard;
  }
  function stepper(current) {
    return `<ol class="stepper" aria-label="Étapes de réservation">${STEPS.map(([label, reference], index) => `<li class="${index + 1 === current ? 'current' : index + 1 < current ? 'done' : ''}"${index + 1 === current ? ' aria-current="step"' : ''}><span>${index + 1}</span>${escape(label)}<small>§10.1 étape ${reference}</small></li>`).join('')}${[['Paiement', '9-10', 7], ['Confirmation', '11', 8]].map(([label, reference, index]) => `<li class="${index === current ? 'current' : index < current ? 'done' : ''}"${index === current ? ' aria-current="step"' : ''}><span>${index}</span>${label}<small>§10.1 étape ${reference}</small></li>`).join('')}</ol>`;
  }
  function needSummary(state, need) {
    return `<dl class="facts"><dt>Matière</dt><dd>${escape(u.subjectName(state, need.subjectId))}</dd><dt>Chapitre ou sujet</dt><dd>${escape(u.chapterName(state, need.chapterId))}</dd><dt>Difficulté</dt><dd>${escape(need.difficulty)}</dd><dt>ENCG · niveau</dt><dd>${escape(need.encg)} · ${escape(need.level)}</dd><dt>Mode</dt><dd>${escape(need.mode)}</dd>${need.wishes ? `<dt>Disponibilités souhaitées</dt><dd>${escape(need.wishes)}</dd>` : ''}<dt>Description</dt><dd>${escape(need.text)}</dd>${need.attachment ? `<dt>Pièce jointe</dt><dd>${escape(need.attachment.name)} (${escape(ATTACHMENT_TYPES[need.attachment.type] || need.attachment.type)}, ${escape(u.size(need.attachment.size))}) — métadonnées uniquement</dd>` : ''}</dl>`;
  }
  function activePacks(ctx) {
    return ctx.state.packages.filter(pack => pack.studentId === ctx.user.id && pack.status === 'active' && pack.remaining > 0 && Date.parse(pack.expires) > ctx.store.now().getTime());
  }

  // 7. Réservation (assistant §10.1) --------------------------------------------
  O.route('reserver', {
    role: 'student',
    title: 'Réserver une séance',
    description: 'Réservez une séance de tutorat : matière, besoin, service, tuteur, créneau et récapitulatif avant paiement.',
    render: ctx => {
      const { state, store, user, data } = ctx;
      const wizard = wizardState(ctx);
      const locked = wizard.lockedTutor ? state.tutors.find(tutor => tutor.id === wizard.lockedTutor && tutor.status === 'approved') : null;
      const nav = `<div class="actions">${wizard.step > 1 ? button('← Étape précédente', 'wizard-back', '') : ''}${button('Recommencer', 'wizard-reset', '')}</div>`;
      let body = '';
      if (wizard.step === 1) {
        const subjects = state.subjects.filter(subject => subject.chapters.length && (!locked || locked.subjects.includes(subject.id)) && state.tutors.some(tutor => tutor.status === 'approved' && tutor.subjects.includes(subject.id)));
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="1"><h2>Quelle matière souhaitez-vous travailler ?</h2>${locked ? `<p class="notice">Réservation avec <strong>${escape(locked.name)}</strong> : seules ses matières sont proposées. ${button('Choisir un autre tuteur', 'wizard-unlock', '')}</p>` : ''}${radios('Matière', 'subjectId', subjects.map(subject => ({ value: subject.id, label: `${subject.name} · ${subject.level} · ${subject.chapters.length} chapitres` })), wizard.subjectId, 'required')}<button class="button" type="submit">Continuer</button></form>`;
      } else if (wizard.step === 2) {
        const subject = state.subjects.find(item => item.id === wizard.subjectId);
        const need = wizard.need || { encg: user.encg, level: user.level, mode: (locked && locked.modes[0]) || 'En ligne' };
        body = `<form data-form="wizard" class="form-grid"><input type="hidden" name="step" value="2"><h2 class="full">Décrivez votre besoin · ${escape(subject.name)}</h2>${select('Votre ENCG', 'encg', state.encgs, need.encg)}${select('Votre niveau d\'études', 'level', state.levels, need.level)}${select('Chapitre ou sujet', 'chapterId', subject.chapters.map(chapter => ({ value: chapter.id, label: chapter.name })), need.chapterId)}${select('Type de difficulté', 'difficulty', data.constants.difficulties, need.difficulty)}${select('Mode de séance', 'mode', locked ? locked.modes : data.constants.modes, need.mode)}${optional('Disponibilités souhaitées', 'wishes', need.wishes || '', 'text', 'maxlength="200" placeholder="Ex. : en semaine après 17 h"')}<div class="full">${textarea('Décrivez précisément votre besoin', 'text', need.text || '', 'minlength="3" maxlength="1000" required placeholder="Ex. : J\'ai des difficultés à comprendre les élasticités en microéconomie. J\'aimerais revoir les formules et travailler des exercices d\'application."')}</div><div class="full"><label>Joindre un cours, un PDF ou une photo d'exercice <span class="muted">(facultatif · PDF, JPG ou PNG · 5 Mo max)</span><input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></label>${need.attachment ? `<p class="hint">Fichier retenu : ${escape(need.attachment.name)} (${escape(u.size(need.attachment.size))}). ${button('Retirer', 'wizard-detach', '')}</p>` : ''}<p class="hint">Démonstration : seul le nom, le type et la taille du fichier sont conservés ; son contenu n'est jamais stocké.</p></div><div class="full"><button class="button" type="submit">Continuer</button></div></form>`;
      } else if (wizard.step === 3) {
        const offers = state.offers.filter(offer => !locked || locked.services.includes(offer.id));
        const packs = activePacks(ctx).filter(pack => offers.some(offer => offer.id === pack.offerId));
        const choices = [...packs.map(pack => ({ value: `pack:${pack.id}`, html: `<strong>Utiliser mon forfait ${escape(pack.name)}</strong> — ${pack.remaining} séance(s) restante(s), valable jusqu'au ${escape(date(pack.expires))} · aucun paiement` })), ...offers.map(offer => ({ value: `offer:${offer.id}`, html: `<strong>${escape(offer.name)} — ${money(offer.price)}</strong> · ${escape(u.offerFormat(offer))}<br><small>${escape(offer.content)}</small>` }))];
        const selected = wizard.packageId ? `pack:${wizard.packageId}` : wizard.offerId ? `offer:${wizard.offerId}` : '';
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="3"><h2>Choisissez un service</h2>${radios('Service ou forfait', 'service', choices, selected, 'required')}<p class="hint">Forfaits : la première séance est réservée maintenant ; les suivantes se planifient depuis Mon espace > Mes forfaits.</p><button class="button" type="submit">Voir les tuteurs correspondants</button></form>`;
      } else if (wizard.step === 4) {
        const matches = store.matchTutors({ ...wizard.need, subjectId: wizard.subjectId }, wizard.offerId).filter(match => !locked || match.tutorId === locked.id);
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="4"><h2>Tuteurs correspondant à votre besoin</h2><p class="muted">Classement : chapitre maîtrisé, même ENCG, puis note moyenne. Tous enseignent la matière et proposent le service et le mode choisis.</p>${matches.length ? `<fieldset class="choice-list"><legend>Sélectionnez un tuteur</legend>${matches.map(match => { const tutor = state.tutors.find(item => item.id === match.tutorId); return `<label class="choice tutor-choice"><input type="radio" name="tutorId" value="${escape(tutor.id)}"${wizard.tutorId === tutor.id ? ' checked' : ''} required><span class="person">${u.avatar(tutor, 48)}<span><strong>${escape(tutor.name)}</strong> · ENCG ${escape(tutor.encg)} · ${escape(tutor.level)}<br>${u.rating(store, tutor.id)}<br><small>${match.reasons.map(escape).join(' · ')}</small><br><a href="#profil/${escape(tutor.id)}">Consulter le profil complet</a></span></span></label>`; }).join('')}</fieldset><button class="button" type="submit">Voir les créneaux</button>` : empty('Aucun tuteur disponible', 'Aucun tuteur validé ne correspond à cette combinaison matière / service / mode. Modifiez votre besoin ou le service.')}</form>`;
      } else if (wizard.step === 5) {
        const tutor = state.tutors.find(item => item.id === wizard.tutorId);
        const slots = store.freeSlots(wizard.tutorId, wizard.offerId, { packageId: wizard.packageId }).filter(slot => !slot.issue || /prioritaire|validité/.test(slot.issue));
        const days = {};
        for (const slot of slots) (days[ctx.data.moroccoDay(slot.start)] = days[ctx.data.moroccoDay(slot.start)] || []).push(slot);
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="5"><h2>Créneaux disponibles · ${escape(tutor.name)}</h2><p class="muted">Heure marocaine (Africa/Casablanca). Les créneaux déjà réservés, passés ou bloqués ne sont pas affichés.</p>${slots.length ? Object.entries(days).map(([key, list]) => `<fieldset class="slot-day"><legend>${escape(u.day(list[0].start))}</legend>${list.map(slot => `<label class="slot${slot.issue ? ' disabled' : ''}"><input type="radio" name="start" value="${escape(slot.start)}"${slot.start === wizard.start ? ' checked' : ''}${slot.issue ? ' disabled' : ''} required><span>${escape(u.hour(slot.start))}${slot.priority ? ' · Prioritaire Stay' : ''}</span>${slot.issue ? `<small>${escape(slot.issue)}</small>` : ''}</label>`).join('')}</fieldset>`).join('') + '<button class="button" type="submit">Vérifier le récapitulatif</button>' : empty('Aucun créneau compatible', 'Ce tuteur n\'a plus de créneau libre compatible avec ce service. Revenez à l\'étape précédente pour choisir un autre tuteur.')}</form>`;
      } else {
        const tutor = state.tutors.find(item => item.id === wizard.tutorId);
        const offer = state.offers.find(item => item.id === wizard.offerId);
        const pack = wizard.packageId ? state.packages.find(item => item.id === wizard.packageId) : null;
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="6"><h2>Récapitulatif et prix</h2><div class="split"><div>${needSummary(state, { ...wizard.need, subjectId: wizard.subjectId })}</div><div class="summary"><div class="person">${u.avatar(tutor, 56)}<div><strong>${escape(tutor.name)}</strong><br><small>ENCG ${escape(tutor.encg)}</small></div></div><dl><dt>Service</dt><dd>${escape(offer.name)} · ${escape(u.offerFormat(offer))}</dd><dt>Date (heure marocaine)</dt><dd>${escape(date(wizard.start))} · ${offer.minutes} min</dd><dt>Montant total à payer</dt><dd class="price">${pack ? '0 DH' : money(offer.price)}</dd></dl>${pack ? `<p class="notice">Réglé avec un crédit de votre forfait ${escape(pack.name)} (${pack.remaining} restant(s) avant cette réservation).</p>` : offer.credits > 1 ? `<p class="notice">Forfait de ${offer.credits} séances : cette séance est la première ; ${offer.credits - 1} autre(s) à planifier avant l'expiration.</p>` : ''}</div></div><h3>Politique d'annulation et de reprogrammation</h3>${u.policyList(state)}<label class="check"><input type="checkbox" name="acceptPolicy" required> <span>J'ai pris connaissance de ces règles et des <a href="#cgu">conditions d'utilisation</a>.</span></label><button class="button" type="submit">${pack ? 'Confirmer avec mon crédit' : `Procéder au paiement de ${money(offer.price)}`}</button></form>`;
      }
      return head('Réservation', 'Réserver une séance', 'Un parcours guidé, du besoin au paiement. Horaires en heure marocaine.') + `<div class="wrap section">${stepper(wizard.step)}${nav}${body}</div>`;
    }
  });
  O.form('wizard', (ctx, values, form) => {
    const wizard = ctx.ui.wizard || (ctx.ui.wizard = { step: 1 });
    const step = Number(values.step);
    if (step === 1) {
      if (!values.subjectId) throw new Error('Choisissez une matière.');
      if (wizard.subjectId !== values.subjectId) { wizard.need = null; if (!wizard.lockedTutor) wizard.tutorId = null; wizard.start = null; }
      wizard.subjectId = values.subjectId; wizard.step = 2;
    } else if (step === 2) {
      const file = form.elements.attachment && form.elements.attachment.files && form.elements.attachment.files[0];
      let attachment = wizard.need ? wizard.need.attachment : null;
      if (file) {
        if (!ATTACHMENT_TYPES[file.type]) throw new Error('Pièce jointe refusée : formats PDF, JPG ou PNG uniquement.');
        if (file.size > 5 * 1024 * 1024) throw new Error('Pièce jointe refusée : 5 Mo maximum.');
        attachment = { name: file.name.slice(0, 120), size: file.size, type: file.type };
      }
      if (!values.text || values.text.trim().length < 3) throw new Error('Décrivez votre besoin (3 caractères minimum).');
      wizard.need = { encg: values.encg, level: values.level, chapterId: values.chapterId, difficulty: values.difficulty, mode: values.mode, wishes: values.wishes || '', text: values.text, attachment };
      wizard.step = 3;
    } else if (step === 3) {
      if (!values.service) throw new Error('Choisissez un service.');
      const [kind, id] = values.service.split(':');
      if (kind === 'pack') { const pack = ctx.state.packages.find(item => item.id === id); wizard.packageId = id; wizard.offerId = pack.offerId; }
      else { wizard.packageId = null; wizard.offerId = id; }
      wizard.start = null; wizard.step = 4;
    } else if (step === 4) {
      if (!values.tutorId) throw new Error('Sélectionnez un tuteur.');
      if (wizard.tutorId !== values.tutorId) wizard.start = null;
      wizard.tutorId = values.tutorId; wizard.step = 5;
    } else if (step === 5) {
      if (!values.start) throw new Error('Choisissez un créneau.');
      const issue = wizard.packageId ? null : ctx.store.checkSlot(wizard.tutorId, values.start, wizard.offerId);
      if (issue) throw new Error(issue);
      wizard.start = values.start; wizard.step = 6;
    } else {
      const booking = ctx.store.createBooking({ tutorId: wizard.tutorId, offerId: wizard.offerId, start: wizard.start, packageId: wizard.packageId || null, need: { ...wizard.need, subjectId: wizard.subjectId }, acceptPolicy: values.acceptPolicy === 'on' });
      ctx.ui.wizard = null;
      if (booking.status === 'pending') return { go: `paiement/${booking.id}`, message: `Créneau retenu ${ctx.state.config.policy.holdMinutes} minutes : procédez au paiement.` };
      return { go: `confirmation/${booking.id}`, message: 'Séance confirmée avec votre crédit de forfait.' };
    }
    return 'Étape enregistrée.';
  });
  O.action('wizard-back', ctx => { if (ctx.ui.wizard && ctx.ui.wizard.step > 1) ctx.ui.wizard.step -= 1; return 'Étape précédente.'; });
  O.action('wizard-reset', ctx => { ctx.ui.wizard = { step: 1 }; return { go: 'reserver', message: 'Réservation recommencée.' }; });
  O.action('wizard-unlock', ctx => { ctx.ui.wizard = { step: 1 }; return { go: 'reserver', message: 'Tous les tuteurs sont de nouveau proposés.' }; });
  O.action('wizard-detach', ctx => { if (ctx.ui.wizard && ctx.ui.wizard.need) ctx.ui.wizard.need.attachment = null; return 'Pièce jointe retirée.'; });

  // 8. Paiement ----------------------------------------------------------------
  function ownBooking(ctx) { return ctx.state.bookings.find(booking => booking.id === ctx.params[0] && booking.studentId === ctx.user.id); }
  O.route('paiement', {
    role: 'student',
    title: 'Paiement sécurisé',
    description: 'Paiement en ligne de votre réservation ONTRACK.',
    render: ctx => {
      const { state } = ctx;
      const booking = ownBooking(ctx);
      if (!booking) return head('Paiement', 'Réservation introuvable.', '') + '<div class="wrap section"><a class="button" href="#etudiant/seances">Mes séances</a></div>';
      const tx = state.transactions.find(item => item.id === booking.transactionId);
      const tutor = state.tutors.find(item => item.id === booking.tutorId);
      const recap = `<aside class="summary"><h2>Votre commande</h2><dl><dt>Commande</dt><dd><code>${escape(tx.orderId)}</code></dd><dt>Service</dt><dd>${escape(booking.offerName)}</dd><dt>Tuteur</dt><dd>${escape(tutor.name)}</dd><dt>Séance</dt><dd>${escape(date(booking.start))} · ${booking.minutes} min</dd><dt>Montant total</dt><dd class="price">${tx.bookingId === booking.id ? money(tx.amount) : `Crédit de forfait (${money(booking.price)})`}</dd><dt>Statut</dt><dd>${u.statusBadge(booking.status)}</dd></dl></aside>`;
      let content;
      if (booking.status === 'confirmed' || booking.status === 'completed') content = `<div class="notice">Paiement validé : la réservation est confirmée.</div><a class="button" href="#confirmation/${escape(booking.id)}">Voir la confirmation</a>`;
      else if (booking.status === 'failed') content = `<div class="notice warning"><strong>Paiement non abouti (${escape(tx.failureReason || 'échec')}).</strong> Aucune somme n'a été débitée et la réservation n'est pas considérée comme payée. Le créneau a été libéré.</div><div class="actions">${button('Nouvel essai sur le même créneau', 'retry-booking', booking.id, '', 'primary')}<a class="button secondary" href="#reserver">Choisir un autre créneau</a></div>`;
      else if (booking.status !== 'pending') content = '<p>Cette réservation n\'attend pas de paiement.</p>';
      else if (!ctx.ui.gateway[booking.id]) content = `<h2>Paiement en ligne sécurisé</h2><p>Créneau retenu jusqu'à <strong>${escape(u.hour(booking.holdUntil))}</strong> (${state.config.policy.holdMinutes} minutes). Sans paiement confirmé, il sera libéré.</p><h3>Avant de payer</h3>${u.policyList(state)}<p>Vous allez être redirigé vers la page sécurisée du prestataire <strong>${escape(tx.provider)}</strong> (prestataire à confirmer : CMI ou Payzone). ONTRACK ne reçoit ni ne stocke vos données bancaires ; la réservation est confirmée uniquement après vérification de la notification signée du prestataire.</p><div class="actions">${button(`Payer ${money(tx.amount)} via ${tx.provider}`, 'open-gateway', booking.id, '', 'primary')}${button('Annuler cette réservation', 'cancel-booking', booking.id, 'data-confirm="Abandonner cette réservation en attente ? Le créneau sera libéré."')}</div>`;
      else content = `<section class="gateway" aria-labelledby="gateway-title"><div class="gateway-head"><span aria-hidden="true">🔒</span><div><h2 id="gateway-title">Passerelle ${escape(tx.provider)} · simulation</h2><small>https://paiement.${escape(tx.provider.toLowerCase())}.example.org (écran de scénario)</small></div></div><dl><dt>Marchand</dt><dd>ONTRACK</dd><dt>Commande</dt><dd><code>${escape(tx.orderId)}</code></dd><dt>Montant</dt><dd class="price">${money(tx.amount)}</dd></dl><p class="notice warning">Démonstration : aucun numéro de carte n'est saisi. Choisissez le scénario renvoyé par le prestataire ; la notification est signée (SHA-256) puis vérifiée par ONTRACK.</p><div class="actions">${button('Paiement accepté', 'gateway', booking.id, 'data-scenario="accepted"', 'primary')}${button('Paiement refusé', 'gateway', booking.id, 'data-scenario="refused"')}${button('Abandonner le paiement', 'gateway', booking.id, 'data-scenario="cancelled"')}</div></section>`;
      return head('Paiement · étape 9', 'Paiement de votre réservation', 'Paiement simulé — aucune transaction réelle.') + `<div class="wrap section">${stepper(7)}<div class="split"><div>${content}</div>${recap}</div></div>`;
    }
  });
  O.action('open-gateway', (ctx, dataset) => { ctx.ui.gateway[dataset.id] = true; return 'Redirection vers la passerelle sécurisée (simulation).'; });
  O.action('gateway', (ctx, dataset) => {
    const result = ctx.store.gateway(dataset.id, dataset.scenario);
    delete ctx.ui.gateway[dataset.id];
    if (!result.ok) throw new Error(result.error);
    if (result.status === 'paid') { ctx.ui.mailbox = ctx.user.email; return { go: `confirmation/${dataset.id}`, message: 'Paiement vérifié : réservation confirmée.' }; }
    return { message: dataset.scenario === 'refused' ? 'Paiement refusé par le prestataire : réservation non confirmée, créneau libéré.' : 'Paiement abandonné : réservation non confirmée, créneau libéré.', error: true };
  });
  O.action('retry-booking', (ctx, dataset) => { const booking = ctx.store.retryBooking(dataset.id); return { go: `paiement/${booking.id}`, message: 'Nouvel essai : créneau de nouveau retenu.' }; });

  // 9. Confirmation ---------------------------------------------------------------
  O.route('confirmation', {
    role: 'student',
    title: 'Réservation confirmée',
    description: 'Confirmation de votre réservation ONTRACK.',
    render: ctx => {
      const { state } = ctx;
      const booking = ownBooking(ctx);
      if (!booking || !['confirmed', 'completed'].includes(booking.status)) return head('Confirmation', 'Aucune réservation confirmée.', 'La réservation n\'est confirmée qu\'après validation du paiement.') + `<div class="wrap section">${booking ? `<a class="button" href="#paiement/${escape(booking.id)}">Retour au paiement</a>` : '<a class="button" href="#etudiant/seances">Mes séances</a>'}</div>`;
      const tutor = state.tutors.find(item => item.id === booking.tutorId);
      const tx = state.transactions.find(item => item.id === booking.transactionId);
      const pack = state.packages.find(item => item.id === booking.packageId);
      const mails = state.emails.filter(email => email.to === ctx.user.email && email.bookingId === booking.id);
      ctx.ui.mailbox = ctx.user.email;
      return head('Confirmation · étapes 10-11', 'Votre séance est confirmée !', 'Paiement vérifié, créneau réservé, e-mail de confirmation envoyé.') + `<div class="wrap section">${stepper(8)}<div class="split"><div><div class="confirm-card"><span class="hero-badge" aria-hidden="true">✓</span><div><h2>${escape(booking.offerName)} avec ${escape(tutor.name)}</h2><p><strong>${escape(date(booking.start))}</strong> · ${booking.minutes} min · ${escape(booking.need.mode)}</p></div></div>${needSummary(state, booking.need)}<div class="actions"><a class="button" href="#etudiant/seances">Mes séances</a><a class="button secondary" href="#etudiant/historique">Historique des paiements</a><a class="button secondary" href="#boite-mail">Voir l'e-mail de confirmation</a></div></div><aside class="summary"><h2>Paiement</h2><dl><dt>Commande</dt><dd><code>${escape(tx ? tx.orderId : '—')}</code></dd><dt>Montant</dt><dd>${pack && tx && tx.bookingId !== booking.id ? `Crédit de forfait (${money(booking.price)})` : money(tx ? tx.amount : booking.price)}</dd><dt>Statut</dt><dd>${tx ? u.txBadge(tx.status) : ''}</dd><dt>Prestataire</dt><dd>${escape(tx ? tx.provider : '')} (simulation)</dd>${pack ? `<dt>Forfait</dt><dd>${escape(pack.name)} : ${pack.remaining} séance(s) à planifier, jusqu'au ${escape(date(pack.expires))}</dd>` : ''}</dl><h3>E-mails envoyés</h3><ul>${mails.map(email => `<li>${escape(email.subject)}</li>`).join('') || '<li>Aucun</li>'}</ul></aside></div></div>`;
    }
  });

  // 4, 10, 11. Espace étudiant -------------------------------------------------------
  const TABS = [['apercu', 'Tableau de bord'], ['seances', 'Mes séances'], ['historique', 'Historique'], ['forfaits', 'Mes forfaits'], ['progression', 'Progression'], ['comptes-rendus', 'Comptes rendus'], ['notifications', 'Notifications'], ['profil', 'Mon profil']];
  function reportView(state, booking) {
    const report = booking.report;
    return `<div class="report-view"><h4>Compte rendu · ${escape(u.subjectName(state, report.subjectId))}</h4><dl class="facts"><dt>Matière et chapitres</dt><dd>${report.chapters.map(item => `${escape(u.chapterName(state, item.id))} (${escape(u.chapterStatus(item.status))})`).join(' · ')}</dd><dt>Notions abordées</dt><dd>${escape(report.notions)}</dd><dt>Exercices travaillés</dt><dd>${escape(report.exercises)}</dd><dt>Difficultés identifiées</dt><dd>${escape(report.difficulties)}</dd><dt>Points à réviser</dt><dd>${escape(report.toReview)}</dd><dt>Recommandations</dt><dd>${escape(report.recommendations)}</dd></dl></div>`;
  }
  O.reportView = reportView;
  function studentBooking(ctx, booking, options) {
    const { state } = ctx;
    const tutor = state.tutors.find(item => item.id === booking.tutorId);
    const policy = state.config.policy;
    const delay = Date.parse(booking.start) - ctx.store.now().getTime();
    const bookingPack = booking.packageId ? state.packages.find(item => item.id === booking.packageId) : null;
    const creditBack = Boolean(bookingPack && bookingPack.status === 'active' && Date.parse(bookingPack.expires) > ctx.store.now().getTime());
    let actions = '';
    if (booking.status === 'pending') actions = `<div class="actions"><a class="button small" href="#paiement/${escape(booking.id)}">Payer maintenant</a>${button('Annuler', 'cancel-booking', booking.id, 'data-confirm="Abandonner cette réservation en attente ?"')}</div>`;
    if (booking.status === 'failed' && options && options.retry) actions = `<div class="actions">${button('Nouvel essai', 'retry-booking', booking.id)}</div>`;
    if (booking.status === 'confirmed' && delay > 0 && !booking.simulatedEnded) {
      const slots = ctx.store.freeSlots(booking.tutorId, booking.offerId, { except: booking.id, packageId: booking.packageId }).filter(slot => !slot.issue);
      actions = `<div class="actions">${delay >= policy.cancelHours * 3600000 ? button(creditBack ? 'Annuler · crédit restitué' : 'Annuler · remboursement', 'cancel-booking', booking.id, `data-confirm="Annuler cette séance ? ${creditBack ? 'Le crédit sera restitué à votre forfait.' : `Remboursement de ${money(booking.price)}.`}"`) : `<span class="muted"><small>Annulation impossible à moins de ${policy.cancelHours} h : la séance reste due.</small></span>`}</div>${delay >= policy.rescheduleHours * 3600000 && slots.length ? `<form data-form="reschedule" data-id="${escape(booking.id)}" class="inline-form">${select('Déplacer vers (heure marocaine)', 'start', slots.map(slot => ({ value: slot.start, label: date(slot.start) })))}<button class="button small secondary" type="submit">Reprogrammer</button></form>` : ''}`;
    }
    if (booking.status === 'completed' && !state.reviews.some(review => review.bookingId === booking.id) && options && options.review) actions += `<form data-form="review" data-id="${escape(booking.id)}" class="inline-form">${select('Votre note', 'rating', [5, 4, 3, 2, 1].map(value => ({ value: String(value), label: `${value} / 5` })))}${field('Votre avis', 'text', '', 'text', 'minlength="3" maxlength="500"')}<button class="button small secondary" type="submit">Publier mon avis</button></form>`;
    const review = state.reviews.find(item => item.bookingId === booking.id);
    return `<article class="booking"><div class="booking-top"><h3>${escape(booking.offerName)} · ${escape(tutor.name)}</h3>${u.statusBadge(booking.status)}</div><p><strong>${escape(date(booking.start))}</strong> · ${booking.minutes} min · ${escape(booking.need.mode)} · ${money(booking.price)}${booking.packageId ? ' (crédit de forfait)' : ''}</p><p><small>${escape(u.subjectName(state, booking.need.subjectId))} — ${escape(u.chapterName(state, booking.need.chapterId))} · ${escape(booking.need.difficulty)}</small></p>${booking.status === 'confirmed' ? '<p><small>Lien de visioconférence communiqué par le tuteur avant la séance (non généré dans la démonstration).</small></p>' : ''}${booking.cancellation ? `<p><small>Annulée le ${escape(date(booking.cancellation.at))} · ${booking.cancellation.outcome === 'credit' ? 'crédit restitué' : 'remboursement enregistré'}</small></p>` : ''}${options && options.report && booking.report ? reportView(state, booking) : ''}${review ? `<p><small>Votre avis : ${review.rating} / 5 — ${escape(review.text)}${review.hidden ? ' (masqué par la modération)' : ''}</small></p>` : ''}${actions}</article>`;
  }
  O.route('etudiant', {
    role: 'student',
    private: true,
    title: ctx => `Espace étudiant · ${(TABS.find(([key]) => key === (ctx.params[0] || 'apercu')) || TABS[0])[1]}`,
    description: 'Votre tableau de bord ONTRACK : séances, forfaits, progression et comptes rendus.',
    render: ctx => {
      const { state, store, user, data } = ctx;
      const tab = TABS.some(([key]) => key === ctx.params[0]) ? ctx.params[0] : 'apercu';
      const mine = state.bookings.filter(booking => booking.studentId === user.id);
      const upcoming = mine.filter(booking => booking.status === 'confirmed' && Date.parse(booking.start) > ctx.store.now().getTime()).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
      const pending = mine.filter(booking => booking.status === 'pending');
      const packs = state.packages.filter(pack => pack.studentId === user.id);
      const active = packs.filter(pack => pack.status === 'active');
      const progress = store.progress(user.id);
      const reports = mine.filter(booking => booking.report).sort((a, b) => Date.parse(b.report.created) - Date.parse(a.report.created));
      const past = mine.filter(booking => !['pending'].includes(booking.status) && (Date.parse(booking.start) <= ctx.store.now().getTime() || ['completed', 'cancelled', 'absent', 'failed'].includes(booking.status))).sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
      const progressBlock = list => list.length ? list.map(item => `<div class="progress-row"><p class="progress-label"><a href="#etudiant/progression">${escape(item.name)}</a><strong>${item.percent} %</strong></p>${u.progressBar(item.percent, `Progression en ${item.name}`)}<small>${item.worked} / ${item.total} chapitres travaillés</small></div>`).join('') : '<p class="muted">Aucune matière étudiée pour le moment.</p>';
      let content;
      if (tab === 'seances') {
        const failed = mine.filter(booking => booking.status === 'failed').slice(-3);
        content = `<div class="section-heading"><h2>Prochaines séances</h2><a class="button small" href="#reserver">Réserver une séance</a></div>${upcoming.map(booking => studentBooking(ctx, booking)).join('') || empty('Aucune séance à venir', 'Réservez une séance en quelques étapes.', '<a class="button" href="#reserver">Find Your Tutor</a>')}${pending.length ? `<h2>Réservations en attente de paiement</h2>${pending.map(booking => studentBooking(ctx, booking)).join('')}` : ''}${failed.length ? `<h2>Paiements non aboutis</h2>${failed.map(booking => studentBooking(ctx, booking, { retry: true })).join('')}` : ''}<h3>Règles applicables</h3>${u.policyList(state)}`;
      } else if (tab === 'historique') {
        const payments = state.transactions.filter(tx => tx.studentId === user.id).sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
        content = `<h2>Historique des séances</h2>${past.map(booking => studentBooking(ctx, booking, { review: true })).join('') || empty('Historique vide', 'Vos séances passées apparaîtront ici.')}<h2>Historique des paiements</h2>${u.table(['Date', 'Commande', 'Service', 'Montant', 'Statut', 'Prestataire'], payments.map(tx => [escape(date(tx.created)), `<code>${escape(tx.orderId)}</code>`, escape(tx.offerName), money(tx.amount), u.txBadge(tx.status) + (tx.failureReason ? ` <small>${escape(tx.failureReason)}</small>` : ''), escape(tx.provider)])) || '<p class="muted">Aucun paiement.</p>'}`;
      } else if (tab === 'forfaits') {
        content = `<h2>Mes forfaits</h2>${packs.map(pack => {
          const sessions = mine.filter(booking => booking.packageId === pack.id && !['cancelled', 'failed'].includes(booking.status));
          const done = sessions.filter(booking => ['completed', 'absent'].includes(booking.status)).length;
          const planned = sessions.length - done;
          const live = pack.status === 'active' && Date.parse(pack.expires) > ctx.store.now().getTime();
          return `<article class="booking"><div class="booking-top"><h3>${escape(pack.name)}</h3>${badge(pack.status === 'active' ? 'Actif' : pack.status === 'expired' ? 'Expiré' : 'Résilié', pack.status === 'active' ? 'green' : 'gray')}</div><div class="grid three metrics"><div class="metric"><strong>${done}</strong><span>Séances réalisées</span></div><div class="metric"><strong>${planned}</strong><span>Séances planifiées</span></div><div class="metric"><strong>${pack.remaining}</strong><span>Séances restantes à planifier</span></div></div><p>Validité : jusqu'au <strong>${escape(date(pack.expires))}</strong> · ${pack.total} séances au total.</p><ul>${sessions.map(booking => `<li>${escape(date(booking.start))} · ${escape(u.tutorName(state, booking.tutorId))} · ${u.statusBadge(booking.status)}</li>`).join('')}</ul>${live ? `<div class="actions">${pack.remaining ? button('Planifier une séance', 'plan-package', pack.id, '', 'primary') : ''}${button('Résilier le forfait', 'terminate-package', pack.id, `data-confirm="Résilier ce forfait ? Les séances planifiées sont maintenues${state.config.policy.terminationRefund ? ' et les séances non planifiées sont remboursées' : ''}."`)}</div>` : ''}<p><small>Sans reconduction automatique. Séances non utilisées à l'expiration non reportées.</small></p></article>`;
        }).join('') || empty('Aucun forfait', 'Exam Rescue et Stay ONTRACK s\'activent au paiement de la première séance.', '<a class="button" href="#reserver">Choisir un forfait</a>')}`;
      } else if (tab === 'progression') {
        content = `<h2>Ma progression par matière</h2><p class="notice"><strong>Méthode de calcul :</strong> pour chaque matière, % = nombre de chapitres dont le statut est différent de « À étudier » ÷ nombre total de chapitres de la matière × 100, arrondi à l'entier. Le statut d'un chapitre est celui indiqué dans le dernier compte rendu qui le mentionne. Cet indicateur de suivi pédagogique ne constitue pas une garantie de maîtrise réelle.</p>${progress.map(item => `<section class="block"><div class="booking-top"><h3>${escape(item.name)}</h3><strong>${item.percent} %</strong></div>${u.progressBar(item.percent, `Progression en ${item.name}`)}<p><small>${item.worked} / ${item.total} chapitres travaillés${item.updated ? ` · mis à jour le ${escape(date(item.updated))}` : ''}</small></p><ul class="chapter-list">${item.chapters.map(chapter => `<li><span>${escape(chapter.name)}</span>${badge(u.chapterStatus(chapter.status), { 'a-etudier': 'gray', 'en-cours': 'violet', revise: '', maitrise: 'green' }[chapter.status])}</li>`).join('')}</ul></section>`).join('') || empty('Pas encore de progression', 'Votre progression apparaît après le premier compte rendu de séance.')}<p><small>Statuts possibles : ${data.constants.chapterStatuses.map(item => escape(item.label)).join(', ')}.</small></p>`;
      } else if (tab === 'comptes-rendus') {
        content = `<h2>Mes comptes rendus</h2>${reports.map(booking => `<article class="booking"><div class="booking-top"><h3>${escape(booking.offerName)} · ${escape(u.tutorName(state, booking.tutorId))}</h3><small>${escape(date(booking.start))}</small></div>${reportView(state, booking)}</article>`).join('') || empty('Aucun compte rendu', 'Votre tuteur publie un récapitulatif après chaque séance.')}`;
      } else if (tab === 'notifications') {
        const list = state.notifications.filter(item => item.userId === user.id);
        content = `<div class="section-heading"><h2>Notifications</h2>${list.some(item => !item.read) ? button('Tout marquer comme lu', 'notifications-read', '') : ''}</div>${list.map(item => `<div class="notification${item.read ? '' : ' unread'}">${escape(item.text)}<time>${escape(date(item.created))}</time></div>`).join('') || empty('Tout est calme.', 'Les prochaines actions apparaîtront ici.')}<p><a href="#boite-mail">Consulter les e-mails reçus (boîte simulée)</a></p>`;
      } else if (tab === 'profil') {
        content = `<div class="split"><form data-form="student-profile" class="form-stack"><h2>Mon profil</h2><p>${escape(user.email)} ${badge('Adresse vérifiée', 'green')}<br>ENCG ${escape(user.encg)} <small>(liée à l'adresse universitaire)</small></p>${field('Nom et prénom', 'name', user.name, 'text', 'maxlength="80"')}${select('Niveau d\'études', 'level', state.levels, user.level)}${select('Filière', 'track', data.constants.tracks, user.track)}<button class="button" type="submit">Enregistrer</button><p><a href="#orientation">Mon profil d'orientation</a></p></form><form data-form="change-password" class="form-stack"><h2>Mot de passe</h2>${field('Mot de passe actuel', 'current', '', 'password', 'autocomplete="current-password"')}${field('Nouveau mot de passe', 'password', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}${field('Confirmer', 'confirm', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}<button class="button secondary" type="submit">Modifier le mot de passe</button></form></div>${deleteForm()}`;
      } else {
        content = `<div class="grid four metrics"><div class="metric"><strong>${upcoming.length}</strong><span>Prochaines séances</span></div><div class="metric"><strong>${pending.length}</strong><span>En attente de paiement</span></div><div class="metric"><strong>${active.reduce((total, pack) => total + pack.remaining, 0)}</strong><span>Séances de forfait restantes</span></div><div class="metric"><strong>${progress.length}</strong><span>Matières étudiées</span></div></div><div class="actions"><a class="button" href="#reserver">Réserver une séance <span aria-hidden="true">↗</span></a></div><div class="grid two dash"><section><h2>Prochaines séances</h2>${upcoming.slice(0, 3).map(booking => `<p><strong>${escape(date(booking.start))}</strong> · ${escape(booking.offerName)} avec ${escape(u.tutorName(state, booking.tutorId))}</p>`).join('') || '<p class="muted">Aucune séance prévue.</p>'}<h2>Réservations en attente</h2>${pending.map(booking => `<p>${escape(booking.offerName)} · ${escape(date(booking.start))} — <a href="#paiement/${escape(booking.id)}">payer</a></p>`).join('') || '<p class="muted">Aucune.</p>'}<h2>Forfaits actifs</h2>${active.map(pack => `<p>${escape(pack.name)} : <strong>${pack.remaining} / ${pack.total}</strong> séance(s) à planifier · jusqu'au ${escape(date(pack.expires))}</p>`).join('') || '<p class="muted">Aucun forfait actif.</p>'}<h2>Historique récent</h2>${past.slice(0, 3).map(booking => `<p>${escape(date(booking.start))} · ${escape(booking.offerName)} ${u.statusBadge(booking.status)}</p>`).join('') || '<p class="muted">Aucune séance passée.</p>'}<a href="#etudiant/historique">Tout l'historique</a></section><section><h2>Matières étudiées et progression</h2>${progressBlock(progress)}<h2>Derniers comptes rendus</h2>${reports.slice(0, 2).map(booking => `<div class="review"><strong>${escape(u.subjectName(state, booking.report.subjectId))}</strong> · ${escape(date(booking.start))}<p>${escape(booking.report.recommendations)}</p></div>`).join('') || '<p class="muted">Aucun compte rendu.</p>'}<a href="#etudiant/comptes-rendus">Tous les comptes rendus</a></section></div>`;
      }
      return head('Espace étudiant', `Bonjour, ${user.name.split(' ')[0]}.`, `ENCG ${user.encg} · ${user.level} · ${user.track}`) + `<div class="wrap">${u.tabs('etudiant', TABS, tab, 'Espace étudiant')}<div class="section">${content}</div></div>`;
    }
  });
  function deleteForm() {
    return `<form data-form="delete-account" class="form-stack danger-zone"><h2>Supprimer mon compte</h2><p>Vos données personnelles (profil, avis, orientation, notifications) sont supprimées. Les séances futures sont annulées et remboursées. Les réservations et paiements passés sont conservés sous forme anonymisée pour les obligations comptables.</p>${field('Mot de passe', 'password', '', 'password', 'autocomplete="current-password"')}<label class="check"><input type="checkbox" name="confirm" required> <span>Je confirme la suppression définitive de mon compte.</span></label><button class="button danger" type="submit">Supprimer définitivement</button></form>`;
  }
  O.deleteForm = deleteForm;
  O.form('delete-account', (ctx, values) => { ctx.store.deleteAccount(values.password, values.confirm === 'on'); ctx.ui.wizard = null; return { go: 'accueil', message: 'Compte supprimé. Un e-mail de confirmation a été envoyé.' }; });
  O.form('student-profile', (ctx, values) => { ctx.store.updateProfile(values); return 'Profil mis à jour.'; });
  O.form('change-password', (ctx, values) => { if (values.password !== values.confirm) throw new Error('Les deux mots de passe ne correspondent pas.'); ctx.store.changePassword(values.current, values.password); return 'Mot de passe modifié.'; });
  O.form('reschedule', (ctx, values, form) => { ctx.store.reschedule(form.dataset.id, values.start); return 'Séance reprogrammée : un e-mail de modification a été envoyé.'; });
  O.form('review', (ctx, values, form) => { ctx.store.review(form.dataset.id, Number(values.rating), values.text); return 'Avis publié. Merci !'; });
  O.action('cancel-booking', (ctx, dataset) => {
    const result = ctx.store.cancel(dataset.id);
    return result === 'abandoned' ? { go: 'etudiant/seances', message: 'Réservation abandonnée : créneau libéré.' } : result === 'credit' ? 'Séance annulée : crédit restitué à votre forfait.' : 'Séance annulée : remboursement enregistré.';
  });
  O.action('plan-package', (ctx, dataset) => {
    const pack = ctx.state.packages.find(item => item.id === dataset.id);
    ctx.ui.wizard = { step: 1, offerId: pack.offerId, packageId: pack.id };
    return { go: 'reserver', message: `Planification d'une séance de votre forfait ${pack.name} : choisissez la matière.` };
  });
  O.action('terminate-package', (ctx, dataset) => { const result = ctx.store.terminatePackage(dataset.id); return result.refunded ? `Forfait résilié : ${money(result.refunded)} remboursés.` : 'Forfait résilié.'; });
  O.action('notifications-read', ctx => { ctx.store.markNotificationsRead(); return 'Notifications marquées comme lues.'; });
}(typeof globalThis !== 'undefined' ? globalThis : this));
