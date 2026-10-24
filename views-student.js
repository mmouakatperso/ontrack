(function (root) {
  'use strict';
  const O = root.Ontrack;
  const u = O.ui;
  const { escape, money, date, head, empty, select, field, optional, textarea, badge, button, radios, t, msg } = u;
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
    return `<ol class="stepper" aria-label="${escape(t('Étapes de réservation'))}">${STEPS.map(([label, reference], index) => `<li class="${index + 1 === current ? 'current' : index + 1 < current ? 'done' : ''}"${index + 1 === current ? ' aria-current="step"' : ''}><span>${index + 1}</span>${escape(t(label))}<small>${t('§10.1 étape {n}', { n: reference })}</small></li>`).join('')}${[['Paiement', '9-10', 7], ['Confirmation', '11', 8]].map(([label, reference, index]) => `<li class="${index === current ? 'current' : index < current ? 'done' : ''}"${index === current ? ' aria-current="step"' : ''}><span>${index}</span>${t(label)}<small>${t('§10.1 étape {n}', { n: reference })}</small></li>`).join('')}</ol>`;
  }
  function needSummary(state, need) {
    return `<dl class="facts"><dt>${t('Matière')}</dt><dd>${escape(u.subjectName(state, need.subjectId))}</dd><dt>${t('Chapitre ou sujet')}</dt><dd>${escape(u.chapterName(state, need.chapterId))}</dd><dt>${t('Difficulté')}</dt><dd>${escape(need.difficulty)}</dd><dt>${t('ENCG · niveau')}</dt><dd>${escape(need.encg)} · ${escape(need.level)}</dd><dt>${t('Mode')}</dt><dd>${escape(need.mode)}</dd>${need.wishes ? `<dt>${t('Disponibilités souhaitées')}</dt><dd>${escape(need.wishes)}</dd>` : ''}<dt>${t('Description')}</dt><dd>${escape(need.text)}</dd>${need.attachment ? `<dt>${t('Pièce jointe')}</dt><dd>${t('{name} ({type}, {size}) — métadonnées uniquement', { name: escape(need.attachment.name), type: escape(ATTACHMENT_TYPES[need.attachment.type] || need.attachment.type), size: escape(u.size(need.attachment.size)) })}</dd>` : ''}</dl>`;
  }
  function activePacks(ctx) {
    return ctx.state.packages.filter(pack => pack.studentId === ctx.user.id && pack.status === 'active' && pack.remaining > 0 && Date.parse(pack.expires) > ctx.store.now().getTime());
  }

  // 7. Réservation (assistant §10.1) --------------------------------------------
  O.route('reserver', {
    role: 'student',
    title: () => t('Réserver une séance'),
    description: () => t('Réservez une séance de tutorat : matière, besoin, service, tuteur, créneau et récapitulatif avant paiement.'),
    render: ctx => {
      const { state, store, user, data } = ctx;
      const wizard = wizardState(ctx);
      const locked = wizard.lockedTutor ? state.tutors.find(tutor => tutor.id === wizard.lockedTutor && tutor.status === 'approved') : null;
      const nav = `<div class="actions">${wizard.step > 1 ? button(t('← Étape précédente'), 'wizard-back', '') : ''}${button(t('Recommencer'), 'wizard-reset', '')}</div>`;
      let body = '';
      if (wizard.step === 1) {
        const subjects = state.subjects.filter(subject => subject.chapters.length && (!locked || locked.subjects.includes(subject.id)) && state.tutors.some(tutor => tutor.status === 'approved' && tutor.subjects.includes(subject.id)));
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="1"><h2>${t('Quelle matière souhaitez-vous travailler ?')}</h2>${locked ? `<p class="notice">${t('Réservation avec <strong>{name}</strong> : seules ses matières sont proposées.', { name: escape(locked.name) })} ${button(t('Choisir un autre tuteur'), 'wizard-unlock', '')}</p>` : ''}${radios(t('Matière'), 'subjectId', subjects.map(subject => ({ value: subject.id, label: t('{name} · {level} · {count} chapitres', { name: subject.name, level: subject.level, count: subject.chapters.length }) })), wizard.subjectId, 'required')}<button class="button" type="submit">${t('Continuer')}</button></form>`;
      } else if (wizard.step === 2) {
        const subject = state.subjects.find(item => item.id === wizard.subjectId);
        const need = wizard.need || { encg: user.encg, level: user.level, mode: (locked && locked.modes[0]) || 'En ligne' };
        body = `<form data-form="wizard" class="form-grid"><input type="hidden" name="step" value="2"><h2 class="full">${t('Décrivez votre besoin · {subject}', { subject: escape(subject.name) })}</h2>${select(t('Votre ENCG'), 'encg', state.encgs, need.encg)}${select(t('Votre niveau d\'études'), 'level', state.levels, need.level)}${select(t('Chapitre ou sujet'), 'chapterId', subject.chapters.map(chapter => ({ value: chapter.id, label: chapter.name })), need.chapterId)}${select(t('Type de difficulté'), 'difficulty', data.constants.difficulties, need.difficulty)}${select(t('Mode de séance'), 'mode', locked ? locked.modes : data.constants.modes, need.mode)}${optional(t('Disponibilités souhaitées'), 'wishes', need.wishes || '', 'text', `maxlength="200" placeholder="${escape(t('Ex. : en semaine après 17 h'))}"`)}<div class="full">${textarea(t('Décrivez précisément votre besoin'), 'text', need.text || '', `minlength="3" maxlength="1000" required placeholder="${escape(t('Ex. : J\'ai des difficultés à comprendre les élasticités en microéconomie. J\'aimerais revoir les formules et travailler des exercices d\'application.'))}"`)}</div><div class="full"><label>${t('Joindre un cours, un PDF ou une photo d\'exercice <span class="muted">(facultatif · PDF, JPG ou PNG · 5 Mo max)</span>')}<input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></label>${need.attachment ? `<p class="hint">${t('Fichier retenu : {name} ({size}).', { name: escape(need.attachment.name), size: escape(u.size(need.attachment.size)) })} ${button(t('Retirer'), 'wizard-detach', '')}</p>` : ''}<p class="hint">${t('Démonstration : seul le nom, le type et la taille du fichier sont conservés ; son contenu n\'est jamais stocké.')}</p></div><div class="full"><button class="button" type="submit">${t('Continuer')}</button></div></form>`;
      } else if (wizard.step === 3) {
        const offers = state.offers.filter(offer => !locked || locked.services.includes(offer.id));
        const packs = activePacks(ctx).filter(pack => offers.some(offer => offer.id === pack.offerId));
        const choices = [...packs.map(pack => ({ value: `pack:${pack.id}`, html: t('<strong>Utiliser mon forfait {name}</strong> — {count} séance(s) restante(s), valable jusqu\'au {date} · aucun paiement', { name: escape(pack.name), count: pack.remaining, date: escape(date(pack.expires)) }) })), ...offers.map(offer => ({ value: `offer:${offer.id}`, html: `<strong>${escape(offer.name)} — ${money(offer.price)}</strong> · ${escape(u.offerFormat(offer))}<br><small>${escape(offer.content)}</small>` }))];
        const selected = wizard.packageId ? `pack:${wizard.packageId}` : wizard.offerId ? `offer:${wizard.offerId}` : '';
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="3"><h2>${t('Choisissez un service')}</h2>${radios(t('Service ou forfait'), 'service', choices, selected, 'required')}<p class="hint">${t('Forfaits : la première séance est réservée maintenant ; les suivantes se planifient depuis Mon espace > Mes forfaits.')}</p><button class="button" type="submit">${t('Voir les tuteurs correspondants')}</button></form>`;
      } else if (wizard.step === 4) {
        const matches = store.matchTutors({ ...wizard.need, subjectId: wizard.subjectId }, wizard.offerId).filter(match => !locked || match.tutorId === locked.id);
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="4"><h2>${t('Tuteurs correspondant à votre besoin')}</h2><p class="muted">${t('Classement : chapitre maîtrisé, même ENCG, puis note moyenne. Tous enseignent la matière et proposent le service et le mode choisis.')}</p>${matches.length ? `<fieldset class="choice-list"><legend>${t('Sélectionnez un tuteur')}</legend>${matches.map(match => { const tutor = state.tutors.find(item => item.id === match.tutorId); return `<label class="choice tutor-choice"><input type="radio" name="tutorId" value="${escape(tutor.id)}"${wizard.tutorId === tutor.id ? ' checked' : ''} required><span class="person">${u.avatar(tutor, 48)}<span><strong>${escape(tutor.name)}</strong> · ENCG ${escape(tutor.encg)} · ${escape(tutor.level)}<br>${u.rating(store, tutor.id)}<br><small>${match.reasons.map(reason => escape(msg(reason))).join(' · ')}</small><br><a href="#profil/${escape(tutor.id)}">${t('Consulter le profil complet')}</a></span></span></label>`; }).join('')}</fieldset><button class="button" type="submit">${t('Voir les créneaux')}</button>` : empty(t('Aucun tuteur disponible'), t('Aucun tuteur validé ne correspond à cette combinaison matière / service / mode. Modifiez votre besoin ou le service.'))}</form>`;
      } else if (wizard.step === 5) {
        const tutor = state.tutors.find(item => item.id === wizard.tutorId);
        const slots = store.freeSlots(wizard.tutorId, wizard.offerId, { packageId: wizard.packageId }).filter(slot => !slot.issue || /prioritaire|validité/.test(slot.issue));
        const days = {};
        for (const slot of slots) (days[ctx.data.moroccoDay(slot.start)] = days[ctx.data.moroccoDay(slot.start)] || []).push(slot);
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="5"><h2>${t('Créneaux disponibles · {name}', { name: escape(tutor.name) })}</h2><p class="muted">${t('Heure marocaine (Africa/Casablanca). Les créneaux déjà réservés, passés ou bloqués ne sont pas affichés.')}</p>${slots.length ? Object.entries(days).map(([key, list]) => `<fieldset class="slot-day"><legend>${escape(u.day(list[0].start))}</legend>${list.map(slot => `<label class="slot${slot.issue ? ' disabled' : ''}"><input type="radio" name="start" value="${escape(slot.start)}"${slot.start === wizard.start ? ' checked' : ''}${slot.issue ? ' disabled' : ''} required><span>${escape(u.hour(slot.start))}${slot.priority ? ` · ${t('Prioritaire Stay')}` : ''}</span>${slot.issue ? `<small>${escape(msg(slot.issue))}</small>` : ''}</label>`).join('')}</fieldset>`).join('') + `<button class="button" type="submit">${t('Vérifier le récapitulatif')}</button>` : empty(t('Aucun créneau compatible'), t('Ce tuteur n\'a plus de créneau libre compatible avec ce service. Revenez à l\'étape précédente pour choisir un autre tuteur.'))}</form>`;
      } else {
        const tutor = state.tutors.find(item => item.id === wizard.tutorId);
        const offer = state.offers.find(item => item.id === wizard.offerId);
        const pack = wizard.packageId ? state.packages.find(item => item.id === wizard.packageId) : null;
        body = `<form data-form="wizard" class="form-stack"><input type="hidden" name="step" value="6"><h2>${t('Récapitulatif et prix')}</h2><div class="split"><div>${needSummary(state, { ...wizard.need, subjectId: wizard.subjectId })}</div><div class="summary"><div class="person">${u.avatar(tutor, 56)}<div><strong>${escape(tutor.name)}</strong><br><small>ENCG ${escape(tutor.encg)}</small></div></div><dl><dt>${t('Service')}</dt><dd>${escape(offer.name)} · ${escape(u.offerFormat(offer))}</dd><dt>${t('Date (heure marocaine)')}</dt><dd>${escape(date(wizard.start))} · ${offer.minutes} min</dd><dt>${t('Montant total à payer')}</dt><dd class="price">${pack ? '0 DH' : money(offer.price)}</dd></dl>${pack ? `<p class="notice">${t('Réglé avec un crédit de votre forfait {name} ({count} restant(s) avant cette réservation).', { name: escape(pack.name), count: pack.remaining })}</p>` : offer.credits > 1 ? `<p class="notice">${t('Forfait de {credits} séances : cette séance est la première ; {others} autre(s) à planifier avant l\'expiration.', { credits: offer.credits, others: offer.credits - 1 })}</p>` : ''}</div></div><h3>${t('Politique d\'annulation et de reprogrammation')}</h3>${u.policyList(state)}<label class="check"><input type="checkbox" name="acceptPolicy" required> <span>${t('J\'ai pris connaissance de ces règles et des <a href="#cgu">conditions d\'utilisation</a>.')}</span></label><button class="button" type="submit">${pack ? t('Confirmer avec mon crédit') : t('Procéder au paiement de {amount}', { amount: money(offer.price) })}</button></form>`;
      }
      return head(t('Réservation'), t('Réserver une séance'), t('Un parcours guidé, du besoin au paiement. Horaires en heure marocaine.')) + `<div class="wrap section">${stepper(wizard.step)}${nav}${body}</div>`;
    }
  });
  O.form('wizard', (ctx, values, form) => {
    const wizard = ctx.ui.wizard || (ctx.ui.wizard = { step: 1 });
    const step = Number(values.step);
    if (step === 1) {
      if (!values.subjectId) throw new Error(t('Choisissez une matière.'));
      if (wizard.subjectId !== values.subjectId) { wizard.need = null; if (!wizard.lockedTutor) wizard.tutorId = null; wizard.start = null; }
      wizard.subjectId = values.subjectId; wizard.step = 2;
    } else if (step === 2) {
      const file = form.elements.attachment && form.elements.attachment.files && form.elements.attachment.files[0];
      let attachment = wizard.need ? wizard.need.attachment : null;
      if (file) {
        if (!ATTACHMENT_TYPES[file.type]) throw new Error(t('Pièce jointe refusée : formats PDF, JPG ou PNG uniquement.'));
        if (file.size > 5 * 1024 * 1024) throw new Error(t('Pièce jointe refusée : 5 Mo maximum.'));
        attachment = { name: file.name.slice(0, 120), size: file.size, type: file.type };
      }
      if (!values.text || values.text.trim().length < 3) throw new Error(t('Décrivez votre besoin (3 caractères minimum).'));
      wizard.need = { encg: values.encg, level: values.level, chapterId: values.chapterId, difficulty: values.difficulty, mode: values.mode, wishes: values.wishes || '', text: values.text, attachment };
      wizard.step = 3;
    } else if (step === 3) {
      if (!values.service) throw new Error(t('Choisissez un service.'));
      const [kind, id] = values.service.split(':');
      if (kind === 'pack') { const pack = ctx.state.packages.find(item => item.id === id); wizard.packageId = id; wizard.offerId = pack.offerId; }
      else { wizard.packageId = null; wizard.offerId = id; }
      wizard.start = null; wizard.step = 4;
    } else if (step === 4) {
      if (!values.tutorId) throw new Error(t('Sélectionnez un tuteur.'));
      if (wizard.tutorId !== values.tutorId) wizard.start = null;
      wizard.tutorId = values.tutorId; wizard.step = 5;
    } else if (step === 5) {
      if (!values.start) throw new Error(t('Choisissez un créneau.'));
      const issue = wizard.packageId ? null : ctx.store.checkSlot(wizard.tutorId, values.start, wizard.offerId);
      if (issue) throw new Error(issue);
      wizard.start = values.start; wizard.step = 6;
    } else {
      const booking = ctx.store.createBooking({ tutorId: wizard.tutorId, offerId: wizard.offerId, start: wizard.start, packageId: wizard.packageId || null, need: { ...wizard.need, subjectId: wizard.subjectId }, acceptPolicy: values.acceptPolicy === 'on' });
      ctx.ui.wizard = null;
      if (booking.status === 'pending') return { go: `paiement/${booking.id}`, message: t('Créneau retenu {minutes} minutes : procédez au paiement.', { minutes: ctx.state.config.policy.holdMinutes }) };
      return { go: `confirmation/${booking.id}`, message: t('Séance confirmée avec votre crédit de forfait.') };
    }
    return t('Étape enregistrée.');
  });
  O.action('wizard-back', ctx => { if (ctx.ui.wizard && ctx.ui.wizard.step > 1) ctx.ui.wizard.step -= 1; return t('Étape précédente.'); });
  O.action('wizard-reset', ctx => { ctx.ui.wizard = { step: 1 }; return { go: 'reserver', message: t('Réservation recommencée.') }; });
  O.action('wizard-unlock', ctx => { ctx.ui.wizard = { step: 1 }; return { go: 'reserver', message: t('Tous les tuteurs sont de nouveau proposés.') }; });
  O.action('wizard-detach', ctx => { if (ctx.ui.wizard && ctx.ui.wizard.need) ctx.ui.wizard.need.attachment = null; return t('Pièce jointe retirée.'); });

  // 8. Paiement ----------------------------------------------------------------
  function ownBooking(ctx) { return ctx.state.bookings.find(booking => booking.id === ctx.params[0] && booking.studentId === ctx.user.id); }
  O.route('paiement', {
    role: 'student',
    title: () => t('Paiement sécurisé'),
    description: () => t('Paiement en ligne de votre réservation ONTRACK.'),
    render: ctx => {
      const { state } = ctx;
      const booking = ownBooking(ctx);
      if (!booking) return head(t('Paiement'), t('Réservation introuvable.'), '') + `<div class="wrap section"><a class="button" href="#etudiant/seances">${t('Mes séances')}</a></div>`;
      const tx = state.transactions.find(item => item.id === booking.transactionId);
      const tutor = state.tutors.find(item => item.id === booking.tutorId);
      const recap = `<aside class="summary"><h2>${t('Votre commande')}</h2><dl><dt>${t('Commande')}</dt><dd><code>${escape(tx.orderId)}</code></dd><dt>${t('Service')}</dt><dd>${escape(booking.offerName)}</dd><dt>${t('Tuteur')}</dt><dd>${escape(tutor.name)}</dd><dt>${t('Séance')}</dt><dd>${escape(date(booking.start))} · ${booking.minutes} min</dd><dt>${t('Montant total')}</dt><dd class="price">${tx.bookingId === booking.id ? money(tx.amount) : t('Crédit de forfait ({amount})', { amount: money(booking.price) })}</dd><dt>${t('Statut')}</dt><dd>${u.statusBadge(booking.status)}</dd></dl></aside>`;
      let content;
      if (booking.status === 'confirmed' || booking.status === 'completed') content = `<div class="notice">${t('Paiement validé : la réservation est confirmée.')}</div><a class="button" href="#confirmation/${escape(booking.id)}">${t('Voir la confirmation')}</a>`;
      else if (booking.status === 'failed') content = `<div class="notice warning">${t('<strong>Paiement non abouti ({reason}).</strong> Aucune somme n\'a été débitée et la réservation n\'est pas considérée comme payée. Le créneau a été libéré.', { reason: escape(tx.failureReason || t('échec')) })}</div><div class="actions">${button(t('Nouvel essai sur le même créneau'), 'retry-booking', booking.id, '', 'primary')}<a class="button secondary" href="#reserver">${t('Choisir un autre créneau')}</a></div>`;
      else if (booking.status !== 'pending') content = `<p>${t('Cette réservation n\'attend pas de paiement.')}</p>`;
      else if (!ctx.ui.gateway[booking.id]) content = `<h2>${t('Paiement en ligne sécurisé')}</h2><p>${t('Créneau retenu jusqu\'à <strong>{time}</strong> ({minutes} minutes). Sans paiement confirmé, il sera libéré.', { time: escape(u.hour(booking.holdUntil)), minutes: state.config.policy.holdMinutes })}</p><h3>${t('Avant de payer')}</h3>${u.policyList(state)}<p>${t('Vous allez être redirigé vers la page sécurisée du prestataire <strong>{provider}</strong> (prestataire à confirmer : CMI ou Payzone). ONTRACK ne reçoit ni ne stocke vos données bancaires ; la réservation est confirmée uniquement après vérification de la notification signée du prestataire.', { provider: escape(tx.provider) })}</p><div class="actions">${button(t('Payer {amount} via {provider}', { amount: money(tx.amount), provider: tx.provider }), 'open-gateway', booking.id, '', 'primary')}${button(t('Annuler cette réservation'), 'cancel-booking', booking.id, `data-confirm="${escape(t('Abandonner cette réservation en attente ? Le créneau sera libéré.'))}"`)}</div>`;
      else content = `<section class="gateway" aria-labelledby="gateway-title"><div class="gateway-head"><span aria-hidden="true">🔒</span><div><h2 id="gateway-title">${t('Passerelle {provider} · simulation', { provider: escape(tx.provider) })}</h2><small>${t('{url} (écran de scénario)', { url: `https://paiement.${escape(tx.provider.toLowerCase())}.example.org` })}</small></div></div><dl><dt>${t('Marchand')}</dt><dd>ONTRACK</dd><dt>${t('Commande')}</dt><dd><code>${escape(tx.orderId)}</code></dd><dt>${t('Montant')}</dt><dd class="price">${money(tx.amount)}</dd></dl><p class="notice warning">${t('Démonstration : aucun numéro de carte n\'est saisi. Choisissez le scénario renvoyé par le prestataire ; la notification est signée (SHA-256) puis vérifiée par ONTRACK.')}</p><div class="actions">${button(t('Paiement accepté'), 'gateway', booking.id, 'data-scenario="accepted"', 'primary')}${button(t('Paiement refusé'), 'gateway', booking.id, 'data-scenario="refused"')}${button(t('Abandonner le paiement'), 'gateway', booking.id, 'data-scenario="cancelled"')}</div></section>`;
      return head(t('Paiement · étape 9'), t('Paiement de votre réservation'), t('Paiement simulé — aucune transaction réelle.')) + `<div class="wrap section">${stepper(7)}<div class="split"><div>${content}</div>${recap}</div></div>`;
    }
  });
  O.action('open-gateway', (ctx, dataset) => { ctx.ui.gateway[dataset.id] = true; return t('Redirection vers la passerelle sécurisée (simulation).'); });
  O.action('gateway', (ctx, dataset) => {
    const result = ctx.store.gateway(dataset.id, dataset.scenario);
    delete ctx.ui.gateway[dataset.id];
    if (!result.ok) throw new Error(result.error);
    if (result.status === 'paid') { ctx.ui.mailbox = ctx.user.email; return { go: `confirmation/${dataset.id}`, message: t('Paiement vérifié : réservation confirmée.') }; }
    return { message: dataset.scenario === 'refused' ? t('Paiement refusé par le prestataire : réservation non confirmée, créneau libéré.') : t('Paiement abandonné : réservation non confirmée, créneau libéré.'), error: true };
  });
  O.action('retry-booking', (ctx, dataset) => { const booking = ctx.store.retryBooking(dataset.id); return { go: `paiement/${booking.id}`, message: t('Nouvel essai : créneau de nouveau retenu.') }; });

  // 9. Confirmation ---------------------------------------------------------------
  O.route('confirmation', {
    role: 'student',
    title: () => t('Réservation confirmée'),
    description: () => t('Confirmation de votre réservation ONTRACK.'),
    render: ctx => {
      const { state } = ctx;
      const booking = ownBooking(ctx);
      if (!booking || !['confirmed', 'completed'].includes(booking.status)) return head(t('Confirmation'), t('Aucune réservation confirmée.'), t('La réservation n\'est confirmée qu\'après validation du paiement.')) + `<div class="wrap section">${booking ? `<a class="button" href="#paiement/${escape(booking.id)}">${t('Retour au paiement')}</a>` : `<a class="button" href="#etudiant/seances">${t('Mes séances')}</a>`}</div>`;
      const tutor = state.tutors.find(item => item.id === booking.tutorId);
      const tx = state.transactions.find(item => item.id === booking.transactionId);
      const pack = state.packages.find(item => item.id === booking.packageId);
      const mails = state.emails.filter(email => email.to === ctx.user.email && email.bookingId === booking.id);
      ctx.ui.mailbox = ctx.user.email;
      return head(t('Confirmation · étapes 10-11'), t('Votre séance est confirmée !'), t('Paiement vérifié, créneau réservé, e-mail de confirmation envoyé.')) + `<div class="wrap section">${stepper(8)}<div class="split"><div><div class="confirm-card"><span class="hero-badge" aria-hidden="true">✓</span><div><h2>${t('{offer} avec {tutor}', { offer: escape(booking.offerName), tutor: escape(tutor.name) })}</h2><p><strong>${escape(date(booking.start))}</strong> · ${booking.minutes} min · ${escape(booking.need.mode)}</p></div></div>${needSummary(state, booking.need)}<div class="actions"><a class="button" href="#etudiant/seances">${t('Mes séances')}</a><a class="button secondary" href="#etudiant/historique">${t('Historique des paiements')}</a><a class="button secondary" href="#boite-mail">${t('Voir l\'e-mail de confirmation')}</a></div></div><aside class="summary"><h2>${t('Paiement')}</h2><dl><dt>${t('Commande')}</dt><dd><code>${escape(tx ? tx.orderId : '—')}</code></dd><dt>${t('Montant')}</dt><dd>${pack && tx && tx.bookingId !== booking.id ? t('Crédit de forfait ({amount})', { amount: money(booking.price) }) : money(tx ? tx.amount : booking.price)}</dd><dt>${t('Statut')}</dt><dd>${tx ? u.txBadge(tx.status) : ''}</dd><dt>${t('Prestataire')}</dt><dd>${t('{provider} (simulation)', { provider: escape(tx ? tx.provider : '') })}</dd>${pack ? `<dt>${t('Forfait')}</dt><dd>${t('{name} : {count} séance(s) à planifier, jusqu\'au {date}', { name: escape(pack.name), count: pack.remaining, date: escape(date(pack.expires)) })}</dd>` : ''}</dl><h3>${t('E-mails envoyés')}</h3><ul>${mails.map(email => `<li>${escape(email.subject)}</li>`).join('') || `<li>${t('Aucun')}</li>`}</ul></aside></div></div>`;
    }
  });

  // 4, 10, 11. Espace étudiant -------------------------------------------------------
  const TABS = [['apercu', 'Tableau de bord'], ['seances', 'Mes séances'], ['historique', 'Historique'], ['forfaits', 'Mes forfaits'], ['progression', 'Progression'], ['comptes-rendus', 'Comptes rendus'], ['notifications', 'Notifications'], ['profil', 'Mon profil']];
  function reportView(state, booking) {
    const report = booking.report;
    return `<div class="report-view"><h4>${t('Compte rendu · {subject}', { subject: escape(u.subjectName(state, report.subjectId)) })}</h4><dl class="facts"><dt>${t('Matière et chapitres')}</dt><dd>${report.chapters.map(item => `${escape(u.chapterName(state, item.id))} (${escape(u.chapterStatus(item.status))})`).join(' · ')}</dd><dt>${t('Notions abordées')}</dt><dd>${escape(report.notions)}</dd><dt>${t('Exercices travaillés')}</dt><dd>${escape(report.exercises)}</dd><dt>${t('Difficultés identifiées')}</dt><dd>${escape(report.difficulties)}</dd><dt>${t('Points à réviser')}</dt><dd>${escape(report.toReview)}</dd><dt>${t('Recommandations')}</dt><dd>${escape(report.recommendations)}</dd></dl></div>`;
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
    if (booking.status === 'pending') actions = `<div class="actions"><a class="button small" href="#paiement/${escape(booking.id)}">${t('Payer maintenant')}</a>${button(t('Annuler'), 'cancel-booking', booking.id, `data-confirm="${escape(t('Abandonner cette réservation en attente ?'))}"`)}</div>`;
    if (booking.status === 'failed' && options && options.retry) actions = `<div class="actions">${button(t('Nouvel essai'), 'retry-booking', booking.id)}</div>`;
    if (booking.status === 'confirmed' && delay > 0 && !booking.simulatedEnded) {
      const slots = ctx.store.freeSlots(booking.tutorId, booking.offerId, { except: booking.id, packageId: booking.packageId }).filter(slot => !slot.issue);
      actions = `<div class="actions">${delay >= policy.cancelHours * 3600000 ? button(creditBack ? t('Annuler · crédit restitué') : t('Annuler · remboursement'), 'cancel-booking', booking.id, `data-confirm="${escape(creditBack ? t('Annuler cette séance ? Le crédit sera restitué à votre forfait.') : t('Annuler cette séance ? Remboursement de {amount}.', { amount: money(booking.price) }))}"`) : `<span class="muted"><small>${t('Annulation impossible à moins de {hours} h : la séance reste due.', { hours: policy.cancelHours })}</small></span>`}</div>${delay >= policy.rescheduleHours * 3600000 && slots.length ? `<form data-form="reschedule" data-id="${escape(booking.id)}" class="inline-form">${select(t('Déplacer vers (heure marocaine)'), 'start', slots.map(slot => ({ value: slot.start, label: date(slot.start) })))}<button class="button small secondary" type="submit">${t('Reprogrammer')}</button></form>` : ''}`;
    }
    if (booking.status === 'completed' && !state.reviews.some(review => review.bookingId === booking.id) && options && options.review) actions += `<form data-form="review" data-id="${escape(booking.id)}" class="inline-form">${select(t('Votre note'), 'rating', [5, 4, 3, 2, 1].map(value => ({ value: String(value), label: `${value} / 5` })))}${field(t('Votre avis'), 'text', '', 'text', 'minlength="3" maxlength="500"')}<button class="button small secondary" type="submit">${t('Publier mon avis')}</button></form>`;
    const review = state.reviews.find(item => item.bookingId === booking.id);
    return `<article class="booking"><div class="booking-top"><h3>${escape(booking.offerName)} · ${escape(tutor.name)}</h3>${u.statusBadge(booking.status)}</div><p><strong>${escape(date(booking.start))}</strong> · ${booking.minutes} min · ${escape(booking.need.mode)} · ${money(booking.price)}${booking.packageId ? ` ${t('(crédit de forfait)')}` : ''}</p><p><small>${escape(u.subjectName(state, booking.need.subjectId))} — ${escape(u.chapterName(state, booking.need.chapterId))} · ${escape(booking.need.difficulty)}</small></p>${booking.status === 'confirmed' ? `<p><small>${t('Lien de visioconférence communiqué par le tuteur avant la séance (non généré dans la démonstration).')}</small></p>` : ''}${booking.cancellation ? `<p><small>${t('Annulée le {date} · {outcome}', { date: escape(date(booking.cancellation.at)), outcome: booking.cancellation.outcome === 'credit' ? t('crédit restitué') : t('remboursement enregistré') })}</small></p>` : ''}${options && options.report && booking.report ? reportView(state, booking) : ''}${review ? `<p><small>${t('Votre avis : {rating} / 5 — {text}', { rating: review.rating, text: escape(review.text) })}${review.hidden ? ` ${t('(masqué par la modération)')}` : ''}</small></p>` : ''}${actions}</article>`;
  }
  O.route('etudiant', {
    role: 'student',
    private: true,
    title: ctx => t('Espace étudiant · {tab}', { tab: t((TABS.find(([key]) => key === (ctx.params[0] || 'apercu')) || TABS[0])[1]) }),
    description: () => t('Votre tableau de bord ONTRACK : séances, forfaits, progression et comptes rendus.'),
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
      const progressBlock = list => list.length ? list.map(item => `<div class="progress-row"><p class="progress-label"><a href="#etudiant/progression">${escape(item.name)}</a><strong>${item.percent} %</strong></p>${u.progressBar(item.percent, t('Progression en {subject}', { subject: item.name }))}<small>${t('{worked} / {total} chapitres travaillés', { worked: item.worked, total: item.total })}</small></div>`).join('') : `<p class="muted">${t('Aucune matière étudiée pour le moment.')}</p>`;
      let content;
      if (tab === 'seances') {
        const failed = mine.filter(booking => booking.status === 'failed').slice(-3);
        content = `<div class="section-heading"><h2>${t('Prochaines séances')}</h2><a class="button small" href="#reserver">${t('Réserver une séance')}</a></div>${upcoming.map(booking => studentBooking(ctx, booking)).join('') || empty(t('Aucune séance à venir'), t('Réservez une séance en quelques étapes.'), '<a class="button" href="#reserver">Find Your Tutor</a>')}${pending.length ? `<h2>${t('Réservations en attente de paiement')}</h2>${pending.map(booking => studentBooking(ctx, booking)).join('')}` : ''}${failed.length ? `<h2>${t('Paiements non aboutis')}</h2>${failed.map(booking => studentBooking(ctx, booking, { retry: true })).join('')}` : ''}<h3>${t('Règles applicables')}</h3>${u.policyList(state)}`;
      } else if (tab === 'historique') {
        const payments = state.transactions.filter(tx => tx.studentId === user.id).sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
        content = `<h2>${t('Historique des séances')}</h2>${past.map(booking => studentBooking(ctx, booking, { review: true })).join('') || empty(t('Historique vide'), t('Vos séances passées apparaîtront ici.'))}<h2>${t('Historique des paiements')}</h2>${u.table([t('Date'), t('Commande'), t('Service'), t('Montant'), t('Statut'), t('Prestataire')], payments.map(tx => [escape(date(tx.created)), `<code>${escape(tx.orderId)}</code>`, escape(tx.offerName), money(tx.amount), u.txBadge(tx.status) + (tx.failureReason ? ` <small>${escape(tx.failureReason)}</small>` : ''), escape(tx.provider)])) || `<p class="muted">${t('Aucun paiement.')}</p>`}`;
      } else if (tab === 'forfaits') {
        content = `<h2>${t('Mes forfaits')}</h2>${packs.map(pack => {
          const sessions = mine.filter(booking => booking.packageId === pack.id && !['cancelled', 'failed'].includes(booking.status));
          const done = sessions.filter(booking => ['completed', 'absent'].includes(booking.status)).length;
          const planned = sessions.length - done;
          const live = pack.status === 'active' && Date.parse(pack.expires) > ctx.store.now().getTime();
          return `<article class="booking"><div class="booking-top"><h3>${escape(pack.name)}</h3>${badge(pack.status === 'active' ? t('Actif') : pack.status === 'expired' ? t('Expiré') : t('Résilié'), pack.status === 'active' ? 'green' : 'gray')}</div><div class="grid three metrics"><div class="metric"><strong>${done}</strong><span>${t('Séances réalisées')}</span></div><div class="metric"><strong>${planned}</strong><span>${t('Séances planifiées')}</span></div><div class="metric"><strong>${pack.remaining}</strong><span>${t('Séances restantes à planifier')}</span></div></div><p>${t('Validité : jusqu\'au <strong>{date}</strong> · {total} séances au total.', { date: escape(date(pack.expires)), total: pack.total })}</p><ul>${sessions.map(booking => `<li>${escape(date(booking.start))} · ${escape(u.tutorName(state, booking.tutorId))} · ${u.statusBadge(booking.status)}</li>`).join('')}</ul>${live ? `<div class="actions">${pack.remaining ? button(t('Planifier une séance'), 'plan-package', pack.id, '', 'primary') : ''}${button(t('Résilier le forfait'), 'terminate-package', pack.id, `data-confirm="${escape(state.config.policy.terminationRefund ? t('Résilier ce forfait ? Les séances planifiées sont maintenues et les séances non planifiées sont remboursées.') : t('Résilier ce forfait ? Les séances planifiées sont maintenues.'))}"`)}</div>` : ''}<p><small>${t('Sans reconduction automatique. Séances non utilisées à l\'expiration non reportées.')}</small></p></article>`;
        }).join('') || empty(t('Aucun forfait'), t('Exam Rescue et Stay ONTRACK s\'activent au paiement de la première séance.'), `<a class="button" href="#reserver">${t('Choisir un forfait')}</a>`)}`;
      } else if (tab === 'progression') {
        content = `<h2>${t('Ma progression par matière')}</h2><p class="notice">${t('<strong>Méthode de calcul :</strong> pour chaque matière, % = nombre de chapitres dont le statut est différent de « À étudier » ÷ nombre total de chapitres de la matière × 100, arrondi à l\'entier. Le statut d\'un chapitre est celui indiqué dans le dernier compte rendu qui le mentionne. Cet indicateur de suivi pédagogique ne constitue pas une garantie de maîtrise réelle.')}</p>${progress.map(item => `<section class="block"><div class="booking-top"><h3>${escape(item.name)}</h3><strong>${item.percent} %</strong></div>${u.progressBar(item.percent, t('Progression en {subject}', { subject: item.name }))}<p><small>${t('{worked} / {total} chapitres travaillés', { worked: item.worked, total: item.total })}${item.updated ? ` · ${t('mis à jour le {date}', { date: escape(date(item.updated)) })}` : ''}</small></p><ul class="chapter-list">${item.chapters.map(chapter => `<li><span>${escape(chapter.name)}</span>${badge(u.chapterStatus(chapter.status), { 'a-etudier': 'gray', 'en-cours': 'violet', revise: '', maitrise: 'green' }[chapter.status])}</li>`).join('')}</ul></section>`).join('') || empty(t('Pas encore de progression'), t('Votre progression apparaît après le premier compte rendu de séance.'))}<p><small>${t('Statuts possibles : {list}.', { list: data.constants.chapterStatuses.map(item => escape(u.chapterStatus(item.id))).join(', ') })}</small></p>`;
      } else if (tab === 'comptes-rendus') {
        content = `<h2>${t('Mes comptes rendus')}</h2>${reports.map(booking => `<article class="booking"><div class="booking-top"><h3>${escape(booking.offerName)} · ${escape(u.tutorName(state, booking.tutorId))}</h3><small>${escape(date(booking.start))}</small></div>${reportView(state, booking)}</article>`).join('') || empty(t('Aucun compte rendu'), t('Votre tuteur publie un récapitulatif après chaque séance.'))}`;
      } else if (tab === 'notifications') {
        const list = state.notifications.filter(item => item.userId === user.id);
        content = `<div class="section-heading"><h2>${t('Notifications')}</h2>${list.some(item => !item.read) ? button(t('Tout marquer comme lu'), 'notifications-read', '') : ''}</div>${list.map(item => `<div class="notification${item.read ? '' : ' unread'}">${escape(item.text)}<time>${escape(date(item.created))}</time></div>`).join('') || empty(t('Tout est calme.'), t('Les prochaines actions apparaîtront ici.'))}<p><a href="#boite-mail">${t('Consulter les e-mails reçus (boîte simulée)')}</a></p>`;
      } else if (tab === 'profil') {
        content = `<div class="split"><form data-form="student-profile" class="form-stack"><h2>${t('Mon profil')}</h2><p>${escape(user.email)} ${badge(t('Adresse vérifiée'), 'green')}<br>ENCG ${escape(user.encg)} <small>${t('(liée à l\'adresse universitaire)')}</small></p>${field(t('Nom et prénom'), 'name', user.name, 'text', 'maxlength="80"')}${select(t('Niveau d\'études'), 'level', state.levels, user.level)}${select(t('Filière'), 'track', data.constants.tracks, user.track)}<button class="button" type="submit">${t('Enregistrer')}</button><p><a href="#orientation">${t('Mon profil d\'orientation')}</a></p></form><form data-form="change-password" class="form-stack"><h2>${t('Mot de passe')}</h2>${field(t('Mot de passe actuel'), 'current', '', 'password', 'autocomplete="current-password"')}${field(t('Nouveau mot de passe'), 'password', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}${field(t('Confirmer'), 'confirm', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}<button class="button secondary" type="submit">${t('Modifier le mot de passe')}</button></form></div>${deleteForm()}`;
      } else {
        content = `<div class="grid four metrics"><div class="metric"><strong>${upcoming.length}</strong><span>${t('Prochaines séances')}</span></div><div class="metric"><strong>${pending.length}</strong><span>${t('En attente de paiement')}</span></div><div class="metric"><strong>${active.reduce((total, pack) => total + pack.remaining, 0)}</strong><span>${t('Séances de forfait restantes')}</span></div><div class="metric"><strong>${progress.length}</strong><span>${t('Matières étudiées')}</span></div></div><div class="actions"><a class="button" href="#reserver">${t('Réserver une séance')} <span aria-hidden="true">↗</span></a></div><div class="grid two dash"><section><h2>${t('Prochaines séances')}</h2>${upcoming.slice(0, 3).map(booking => `<p><strong>${escape(date(booking.start))}</strong> · ${t('{offer} avec {tutor}', { offer: escape(booking.offerName), tutor: escape(u.tutorName(state, booking.tutorId)) })}</p>`).join('') || `<p class="muted">${t('Aucune séance prévue.')}</p>`}<h2>${t('Réservations en attente')}</h2>${pending.map(booking => `<p>${escape(booking.offerName)} · ${escape(date(booking.start))} — <a href="#paiement/${escape(booking.id)}">${t('payer')}</a></p>`).join('') || `<p class="muted">${t('Aucune.')}</p>`}<h2>${t('Forfaits actifs')}</h2>${active.map(pack => `<p>${t('{name} : <strong>{remaining} / {total}</strong> séance(s) à planifier · jusqu\'au {date}', { name: escape(pack.name), remaining: pack.remaining, total: pack.total, date: escape(date(pack.expires)) })}</p>`).join('') || `<p class="muted">${t('Aucun forfait actif.')}</p>`}<h2>${t('Historique récent')}</h2>${past.slice(0, 3).map(booking => `<p>${escape(date(booking.start))} · ${escape(booking.offerName)} ${u.statusBadge(booking.status)}</p>`).join('') || `<p class="muted">${t('Aucune séance passée.')}</p>`}<a href="#etudiant/historique">${t('Tout l\'historique')}</a></section><section><h2>${t('Matières étudiées et progression')}</h2>${progressBlock(progress)}<h2>${t('Derniers comptes rendus')}</h2>${reports.slice(0, 2).map(booking => `<div class="review"><strong>${escape(u.subjectName(state, booking.report.subjectId))}</strong> · ${escape(date(booking.start))}<p>${escape(booking.report.recommendations)}</p></div>`).join('') || `<p class="muted">${t('Aucun compte rendu.')}</p>`}<a href="#etudiant/comptes-rendus">${t('Tous les comptes rendus')}</a></section></div>`;
      }
      return head(t('Espace étudiant'), t('Bonjour, {name}.', { name: user.name.split(' ')[0] }), `ENCG ${user.encg} · ${user.level} · ${user.track}`) + `<div class="wrap">${u.tabs('etudiant', TABS.map(([key, label]) => [key, t(label)]), tab, t('Espace étudiant'))}<div class="section">${content}</div></div>`;
    }
  });
  function deleteForm() {
    return `<form data-form="delete-account" class="form-stack danger-zone"><h2>${t('Supprimer mon compte')}</h2><p>${t('Vos données personnelles (profil, avis, orientation, notifications) sont supprimées. Les séances futures sont annulées et remboursées. Les réservations et paiements passés sont conservés sous forme anonymisée pour les obligations comptables.')}</p>${field(t('Mot de passe'), 'password', '', 'password', 'autocomplete="current-password"')}<label class="check"><input type="checkbox" name="confirm" required> <span>${t('Je confirme la suppression définitive de mon compte.')}</span></label><button class="button danger" type="submit">${t('Supprimer définitivement')}</button></form>`;
  }
  O.deleteForm = deleteForm;
  O.form('delete-account', (ctx, values) => { ctx.store.deleteAccount(values.password, values.confirm === 'on'); ctx.ui.wizard = null; return { go: 'accueil', message: t('Compte supprimé. Un e-mail de confirmation a été envoyé.') }; });
  O.form('student-profile', (ctx, values) => { ctx.store.updateProfile(values); return t('Profil mis à jour.'); });
  O.form('change-password', (ctx, values) => { if (values.password !== values.confirm) throw new Error(t('Les deux mots de passe ne correspondent pas.')); ctx.store.changePassword(values.current, values.password); return t('Mot de passe modifié.'); });
  O.form('reschedule', (ctx, values, form) => { ctx.store.reschedule(form.dataset.id, values.start); return t('Séance reprogrammée : un e-mail de modification a été envoyé.'); });
  O.form('review', (ctx, values, form) => { ctx.store.review(form.dataset.id, Number(values.rating), values.text); return t('Avis publié. Merci !'); });
  O.action('cancel-booking', (ctx, dataset) => {
    const result = ctx.store.cancel(dataset.id);
    return result === 'abandoned' ? { go: 'etudiant/seances', message: t('Réservation abandonnée : créneau libéré.') } : result === 'credit' ? t('Séance annulée : crédit restitué à votre forfait.') : t('Séance annulée : remboursement enregistré.');
  });
  O.action('plan-package', (ctx, dataset) => {
    const pack = ctx.state.packages.find(item => item.id === dataset.id);
    ctx.ui.wizard = { step: 1, offerId: pack.offerId, packageId: pack.id };
    return { go: 'reserver', message: t('Planification d\'une séance de votre forfait {name} : choisissez la matière.', { name: pack.name }) };
  });
  O.action('terminate-package', (ctx, dataset) => { const result = ctx.store.terminatePackage(dataset.id); return result.refunded ? t('Forfait résilié : {amount} remboursés.', { amount: money(result.refunded) }) : t('Forfait résilié.'); });
  O.action('notifications-read', ctx => { ctx.store.markNotificationsRead(); return t('Notifications marquées comme lues.'); });
}(typeof globalThis !== 'undefined' ? globalThis : this));
