(function (root) {
  'use strict';
  const O = root.Ontrack;
  const u = O.ui;
  const { escape, money, date, head, empty, select, field, optional, textarea, checkbox, checks, badge, button } = u;
  const TABS = [['apercu', 'Tableau de bord'], ['seances', 'Réservations'], ['historique', 'Historique'], ['profil', 'Mon profil'], ['matieres', 'Matières'], ['disponibilites', 'Disponibilités'], ['avis', 'Évaluations'], ['remuneration', 'Rémunération']];
  const STATUS = { pending: ['En attente de validation', 'violet'], approved: ['Profil publié', 'green'], suspended: ['Profil suspendu', 'red'] };
  const times = () => { const list = []; for (let hour = 7; hour <= 22; hour += 1) for (const minute of [0, 30]) list.push(`${String(hour).padStart(2, '0')}:${minute ? '30' : '00'}`); return list; };
  const ended = (ctx, booking) => booking.simulatedEnded || Date.parse(booking.start) + booking.minutes * 60000 <= ctx.store.now().getTime();

  function sessionInfo(state, booking) {
    const need = booking.need;
    return `<dl class="facts"><dt>Étudiant</dt><dd>${escape(booking.studentName)} · ENCG ${escape(need.encg)} · ${escape(need.level)}</dd><dt>Matière · chapitre</dt><dd>${escape(u.subjectName(state, need.subjectId))} — ${escape(u.chapterName(state, need.chapterId))}</dd><dt>Difficulté</dt><dd>${escape(need.difficulty)}</dd><dt>Mode</dt><dd>${escape(need.mode)}</dd>${need.wishes ? `<dt>Disponibilités souhaitées</dt><dd>${escape(need.wishes)}</dd>` : ''}<dt>Besoin décrit</dt><dd>${escape(need.text)}</dd>${need.attachment ? `<dt>Pièce jointe</dt><dd>${escape(need.attachment.name)} (${escape(u.size(need.attachment.size))}) — contenu non conservé dans la démonstration</dd>` : ''}</dl>`;
  }
  function reportForm(state, booking) {
    const subject = state.subjects.find(item => item.id === booking.need.subjectId);
    const statuses = state ? O.ui.constants().chapterStatuses : [];
    return `<form data-form="report" data-id="${escape(booking.id)}" class="form-stack report-form"><h4>Compte rendu de séance</h4><input type="hidden" name="subjectId" value="${escape(subject.id)}"><fieldset><legend>1. Matière et chapitres étudiés · ${escape(subject.name)}</legend>${subject.chapters.map(chapter => `<label class="chapter-row"><span>${escape(chapter.name)}</span><select name="chapter:${escape(chapter.id)}">${u.options([{ value: '', label: '— Non abordé' }, ...statuses.map(item => ({ value: item.id, label: item.label }))], chapter.id === booking.need.chapterId ? 'en-cours' : '')}</select></label>`).join('')}</fieldset>${textarea('2. Notions abordées', 'notions', '', 'minlength="3" maxlength="1000" required')}${textarea('3. Exercices travaillés', 'exercises', '', 'minlength="3" maxlength="1000" required')}${textarea('4. Difficultés identifiées', 'difficulties', '', 'minlength="3" maxlength="1000" required')}${textarea('5. Points à réviser', 'toReview', '', 'minlength="3" maxlength="1000" required')}${textarea('6. Recommandations pour la prochaine séance', 'recommendations', '', 'minlength="3" maxlength="1000" required')}<button class="button" type="submit">Publier le compte rendu</button></form>`;
  }
  function tutorBooking(ctx, booking, tutor) {
    const { state } = ctx;
    let actions = '';
    if (booking.status === 'confirmed') {
      if (!ended(ctx, booking)) { if (tutor.status !== 'suspended') actions = `<div class="actions">${button('Simuler la fin de séance (soutenance)', 'tutor-finish', booking.id, 'data-confirm="Simuler la fin de cette séance pour saisir le compte rendu ?"')}${button('Annuler (étudiant remboursé)', 'tutor-cancel', booking.id, 'data-confirm="Annuler cette séance ? L\'étudiant est intégralement remboursé ou recrédité."')}</div>`; }
      else actions = `${reportForm(state, booking)}<div class="actions">${button('Signaler une absence de l\'étudiant', 'tutor-absent', booking.id, 'data-confirm="Constater l\'absence ? La séance reste due par l\'étudiant."')}</div>`;
    }
    return `<article class="booking"><div class="booking-top"><h3>${escape(booking.offerName)} · ${escape(booking.studentName)}</h3>${u.statusBadge(booking.status)}</div><p><strong>${escape(date(booking.start))}</strong> · ${booking.minutes} min${booking.status === 'confirmed' && !ended(ctx, booking) ? ' · lien de visioconférence à communiquer (non généré)' : ''}</p>${sessionInfo(state, booking)}${booking.report ? O.reportView(state, booking) : ''}${booking.payout ? `<p><small>Rémunération : ${money(booking.payout.amount)} (${booking.payout.phase === 'paid' ? 'phase rémunérée' : 'phase volontaire'})${booking.payout.payoutId ? ' · versée' : booking.payout.amount ? ' · à verser' : ''}</small></p>` : ''}${actions}</article>`;
  }

  O.route('tuteur', {
    role: 'tutor',
    private: true,
    title: ctx => `Espace tuteur · ${(TABS.find(([key]) => key === (ctx.params[0] || 'apercu')) || TABS[0])[1]}`,
    description: 'Tableau de bord tuteur ONTRACK : réservations, disponibilités, comptes rendus, évaluations et rémunération.',
    render: ctx => {
      const { state, store, user, data } = ctx;
      const tutor = state.tutors.find(item => item.id === user.id);
      const tab = TABS.some(([key]) => key === ctx.params[0]) ? ctx.params[0] : 'apercu';
      const mine = state.bookings.filter(booking => booking.tutorId === tutor.id);
      const upcoming = mine.filter(booking => booking.status === 'confirmed').sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
      const toReport = upcoming.filter(booking => ended(ctx, booking));
      const history = mine.filter(booking => ['completed', 'absent', 'cancelled'].includes(booking.status)).sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
      const reviews = state.reviews.filter(review => review.tutorId === tutor.id);
      const summary = store.payoutSummary(tutor.id);
      const rating = store.tutorRating(tutor.id);
      const statusNotice = tutor.status === 'pending' ? '<p class="notice">Votre profil est <strong>en attente de validation</strong> par l\'administration. Vous pouvez compléter votre profil, vos matières et vos disponibilités : ils seront publiés dès la validation.</p>' : tutor.status === 'suspended' ? '<p class="notice warning">Votre profil est <strong>suspendu</strong> : il n\'apparaît plus dans le catalogue et les modifications sont désactivées. Contactez l\'administration.</p>' : '';
      let content;
      if (tab === 'seances') {
        const pending = mine.filter(booking => booking.status === 'pending');
        content = `<h2>Réservations à venir et à clôturer</h2>${upcoming.map(booking => tutorBooking(ctx, booking, tutor)).join('') || empty('Aucune réservation', tutor.status === 'approved' ? 'Les nouvelles réservations apparaissent ici et vous sont notifiées.' : 'Votre profil doit être validé pour recevoir des réservations.')}${pending.length ? `<h3>En attente de paiement</h3>${pending.map(booking => `<p>${escape(booking.studentName)} · ${escape(booking.offerName)} · ${escape(date(booking.start))} — créneau retenu jusqu'à ${escape(u.hour(booking.holdUntil))}</p>`).join('')}` : ''}`;
      } else if (tab === 'historique') {
        content = `<h2>Historique des séances</h2>${history.map(booking => tutorBooking(ctx, booking, tutor)).join('') || empty('Historique vide', 'Vos séances terminées apparaîtront ici.')}`;
      } else if (tab === 'profil') {
        content = `${statusNotice}<div class="split"><form data-form="tutor-profile" class="form-stack"><h2>Informations du profil</h2><p>${escape(tutor.name)} · ENCG ${escape(tutor.encg)} · ${escape(user.email)}</p>${select('Niveau d\'études', 'level', state.levels, tutor.level)}${textarea('Description personnelle', 'bio', tutor.bio, 'minlength="10" maxlength="600" required')}${checks('Langues d\'enseignement', 'languages', data.constants.languages, tutor.languages)}${checks('Modes de séance', 'modes', data.constants.modes, tutor.modes)}${checks('Types de séances proposés', 'services', state.offers.map(offer => ({ value: offer.id, label: offer.name })), tutor.services)}${checkbox('J\'autorise la publication de ma photo de profil', 'photoConsent', tutor.photoConsent)}${optional('Âge', 'age', tutor.age || '', 'number', 'min="17" max="80"')}${checkbox('Afficher mon âge sur mon profil', 'showAge', tutor.showAge)}<button class="button" type="submit">Enregistrer le profil</button></form><div><div class="summary"><h3>Aperçu public</h3><div class="person">${u.avatar(tutor, 64)}<div><strong>${escape(tutor.name)}</strong><br><small>${tutor.photoConsent ? 'Photo publiée avec votre consentement' : 'Initiales affichées (photo non publiée)'}</small></div></div>${tutor.status === 'approved' ? `<p><a href="#profil/${escape(tutor.id)}">Voir mon profil public</a></p>` : ''}</div><form data-form="change-password" class="form-stack"><h2>Mot de passe</h2>${field('Mot de passe actuel', 'current', '', 'password', 'autocomplete="current-password"')}${field('Nouveau mot de passe', 'password', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}${field('Confirmer', 'confirm', '', 'password', 'minlength="8" maxlength="72" autocomplete="new-password"')}<button class="button secondary" type="submit">Modifier</button></form></div></div>${O.deleteForm()}`;
      } else if (tab === 'matieres') {
        content = `${statusNotice}<form data-form="tutor-subjects" class="form-stack"><h2>Matières enseignées et chapitres maîtrisés</h2><p class="notice">L'ajout d'une nouvelle matière à un profil publié le repasse en validation. Les chapitres d'une matière déjà validée se modifient librement.</p>${state.subjects.map(subject => `<fieldset><legend>${escape(subject.name)} · ${escape(subject.level)}</legend><label class="check"><input type="checkbox" name="subjects" value="${escape(subject.id)}"${tutor.subjects.includes(subject.id) ? ' checked' : ''}> <span><strong>J'enseigne cette matière</strong></span></label><div class="check-grid">${subject.chapters.map(chapter => `<label class="check"><input type="checkbox" name="chapters" value="${escape(chapter.id)}"${tutor.chapters.includes(chapter.id) ? ' checked' : ''}> <span>${escape(chapter.name)}</span></label>`).join('')}</div></fieldset>`).join('')}<button class="button" type="submit">Enregistrer mes matières</button></form>`;
      } else if (tab === 'disponibilites') {
        const reserved = new Set(mine.filter(booking => ['confirmed', 'pending'].includes(booking.status)).map(booking => booking.start));
        const future = tutor.slots.filter(slot => Date.parse(slot) > ctx.store.now().getTime());
        const days = {};
        for (const slot of future) (days[ctx.data.moroccoDay(slot)] = days[ctx.data.moroccoDay(slot)] || []).push(slot);
        content = `${statusNotice}<div class="split"><form data-form="slot" class="form-stack"><h2>Ajouter un créneau</h2><label>Date (Maroc)<input type="date" name="day" required></label>${select('Heure de début (heure marocaine)', 'time', times(), '14:00')}${select('Répéter chaque semaine', 'weeks', [1, 2, 3, 4, 6, 8].map(value => ({ value: String(value), label: value === 1 ? 'Non, une seule fois' : `Pendant ${value} semaines` })), '1')}${checkbox('Créneau prioritaire Stay ONTRACK', 'priority', false)}<p class="hint">Un créneau prioritaire n'est réservable par les non-abonnés que ${state.config.policy.priorityHours} h avant son début.</p><button class="button" type="submit">Ajouter</button></form><form data-form="blocked" class="form-stack"><h2>Bloquer une période d'indisponibilité</h2><div class="form-grid"><label>Du<input type="date" name="startDay" required></label>${select('à', 'startTime', times(), '07:00')}<label>Au<input type="date" name="endDay" required></label>${select('à', 'endTime', times(), '22:00')}</div>${optional('Motif', 'reason', '', 'text', 'maxlength="120"')}<button class="button secondary" type="submit">Bloquer la période</button>${tutor.blocked.length ? `<ul>${tutor.blocked.map(period => `<li>${escape(date(period.start))} → ${escape(date(period.end))}${period.reason ? ` · ${escape(period.reason)}` : ''} ${button('Débloquer', 'unblock', period.id)}</li>`).join('')}</ul>` : '<p class="muted">Aucune période bloquée.</p>'}</form></div><h2>Mes créneaux à venir (${future.length})</h2>${Object.entries(days).map(([key, list]) => `<div class="slot-admin"><h3>${escape(u.day(list[0]))}</h3>${list.map(slot => `<div class="booking-top"><span>${escape(u.hour(slot))} ${reserved.has(slot) ? badge('Réservé', 'green') : ''}${tutor.prioritySlots.includes(slot) ? badge('Prioritaire Stay', 'violet') : ''}${tutor.blocked.some(period => Date.parse(period.start) <= Date.parse(slot) && Date.parse(slot) < Date.parse(period.end)) ? badge('Bloqué', 'gray') : ''}</span><span class="actions">${button(tutor.prioritySlots.includes(slot) ? 'Retirer la priorité' : 'Rendre prioritaire', 'toggle-priority', slot)}${reserved.has(slot) ? '' : button('Retirer', 'remove-slot', slot)}</span></div>`).join('')}</div>`).join('') || empty('Aucune disponibilité', 'Ajoutez vos premiers créneaux (heure marocaine).')}`;
      } else if (tab === 'avis') {
        content = `<h2>Évaluations reçues</h2><p>Note moyenne : <strong>${rating.average ? `${rating.average.toFixed(1)} / 5` : '—'}</strong> (${rating.count} avis visible(s) ; les avis masqués par la modération sont exclus).</p>${reviews.map(review => `<article class="review"><strong>${review.rating} / 5</strong> ${review.hidden ? badge('Masqué', 'gray') : ''}${review.reported ? badge('Signalé · en modération', 'violet') : ''}<p>${escape(review.text)}</p><small>${escape(date(review.created))}</small>${!review.reported && !review.hidden ? `<form data-form="report-review" data-id="${escape(review.id)}" class="inline-form">${field('Motif du signalement', 'reason', '', 'text', 'minlength="3" maxlength="300"')}<button class="button small secondary" type="submit">Signaler cet avis</button></form>` : ''}</article>`).join('') || empty('Aucun avis', 'Les étudiants peuvent noter une séance après sa clôture.')}`;
      } else if (tab === 'remuneration') {
        const paidSessions = mine.filter(booking => booking.payout);
        content = `<h2>Rémunération</h2>${summary.phase === 'volunteer' ? '<p class="notice">Phase actuelle : <strong>programme pilote volontaire</strong>. Aucune rémunération par séance n\'est due au titre du bénévolat. Avantages : profil valorisé, certificat de participation lorsque sa délivrance est légitime, reconnaissance sur la plateforme avec votre accord, priorité pour les futures opportunités rémunérées, remboursement des frais convenus à l\'avance.</p>' : '<p class="notice">Phase actuelle : <strong>rémunération par séance terminée</strong>, versée selon le calendrier défini après vérification des séances.</p>'}<div class="grid three metrics"><div class="metric"><strong>${money(summary.due)}</strong><span>Sommes dues</span></div><div class="metric"><strong>${money(summary.paid)}</strong><span>Sommes versées</span></div><div class="metric"><strong>${summary.sessions}</strong><span>Séances clôturées</span></div></div><h3>Grille en vigueur (par séance)</h3>${u.table(['Service', 'Rémunération par séance'], state.offers.map(offer => [escape(offer.name), money(state.config.payout.rates[offer.id])]))}<h3>Détail par séance</h3>${u.table(['Séance', 'Service', 'Phase', 'Montant', 'État'], paidSessions.map(booking => [escape(date(booking.start)), escape(booking.offerName), booking.payout.phase === 'paid' ? 'Rémunérée' : 'Volontaire', money(booking.payout.amount), booking.payout.payoutId ? 'Versée' : booking.payout.amount ? 'À verser' : '—'])) || '<p class="muted">Aucune séance clôturée.</p>'}<h3>Versements</h3>${u.table(['Date', 'Référence', 'Montant'], summary.payouts.map(payout => [escape(date(payout.created)), escape(payout.reference), money(payout.amount)])) || '<p class="muted">Aucun versement enregistré.</p>'}`;
      } else {
        const notifications = state.notifications.filter(item => item.userId === user.id).slice(0, 6);
        content = `${statusNotice}<div class="grid four metrics"><div class="metric"><strong>${upcoming.filter(booking => !ended(ctx, booking)).length}</strong><span>Séances à venir</span></div><div class="metric"><strong>${toReport.length}</strong><span>Comptes rendus à rédiger</span></div><div class="metric"><strong>${rating.average ? rating.average.toFixed(1) : '—'}</strong><span>Note moyenne</span></div><div class="metric"><strong>${money(summary.due)}</strong><span>Rémunération due</span></div></div><div class="grid two dash"><section><h2>Prochaines séances</h2>${upcoming.filter(booking => !ended(ctx, booking)).slice(0, 4).map(booking => `<p><strong>${escape(date(booking.start))}</strong> · ${escape(booking.offerName)} · ${escape(booking.studentName)}</p>`).join('') || '<p class="muted">Aucune séance prévue.</p>'}<h2>À clôturer</h2>${toReport.map(booking => `<p>${escape(booking.studentName)} · ${escape(date(booking.start))} — <a href="#tuteur/seances">rédiger le compte rendu</a></p>`).join('') || '<p class="muted">Rien à clôturer.</p>'}</section><section><div class="section-heading"><h2>Notifications</h2>${notifications.some(item => !item.read) ? button('Tout marquer comme lu', 'notifications-read', '') : ''}</div>${notifications.map(item => `<div class="notification${item.read ? '' : ' unread'}">${escape(item.text)}<time>${escape(date(item.created))}</time></div>`).join('') || '<p class="muted">Aucune notification.</p>'}</section></div>`;
      }
      const status = STATUS[tutor.status] || ['Profil', 'gray'];
      return head('Espace tuteur', `Bonjour, ${user.name.split(' ')[0]}.`, 'Partagez le savoir. Faites la différence.') + `<div class="wrap"><p class="tags status-line">${badge(status[0], status[1])} ${badge(summary.phase === 'paid' ? 'Phase rémunérée' : 'Programme volontaire', 'gray')}</p>${u.tabs('tuteur', TABS, tab, 'Espace tuteur')}<div class="section">${content}</div></div>`;
    }
  });
  O.form('report', (ctx, values, form) => {
    const chapters = Object.entries(values).filter(([key, value]) => key.startsWith('chapter:') && value).map(([key, value]) => ({ id: key.slice(8), status: value }));
    ctx.store.complete(form.dataset.id, { subjectId: values.subjectId, chapters, notions: values.notions, exercises: values.exercises, difficulties: values.difficulties, toReview: values.toReview, recommendations: values.recommendations });
    return 'Compte rendu publié : l\'étudiant est notifié et sa progression est mise à jour.';
  });
  O.action('tutor-finish', (ctx, dataset) => { ctx.store.simulateEnd(dataset.id); return 'Fin de séance simulée : rédigez le compte rendu.'; });
  O.action('tutor-absent', (ctx, dataset) => { ctx.store.markAbsent(dataset.id); return 'Absence enregistrée : la séance reste due.'; });
  O.action('tutor-cancel', (ctx, dataset) => { ctx.store.cancel(dataset.id); return 'Séance annulée : l\'étudiant a été prévenu par e-mail.'; });
  O.form('tutor-profile', (ctx, values, form) => {
    const data = new FormData(form);
    ctx.store.updateTutorProfile({ ...values, languages: data.getAll('languages'), modes: data.getAll('modes'), services: data.getAll('services'), photoConsent: values.photoConsent === 'on', showAge: values.showAge === 'on' });
    return 'Profil enregistré.';
  });
  O.form('tutor-subjects', (ctx, values, form) => {
    const data = new FormData(form);
    const result = ctx.store.updateTutorSubjects({ subjects: data.getAll('subjects'), chapters: data.getAll('chapters') });
    return result.revalidation ? 'Matières enregistrées : nouvelle matière soumise à validation, profil temporairement retiré du catalogue.' : 'Matières et chapitres enregistrés.';
  });
  O.form('slot', (ctx, values) => {
    const [hour, minute] = values.time.split(':').map(Number);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.day || '')) throw new Error('Choisissez une date.');
    const weeks = Number(values.weeks || 1);
    if (weeks > 1) { const added = ctx.store.addRecurringSlots(values.day, hour, minute, weeks, values.priority === 'on'); return `${added.length} créneau(x) ajouté(s).`; }
    ctx.store.addSlot(ctx.data.moroccoInstant(values.day, hour, minute), { priority: values.priority === 'on' });
    return 'Créneau ajouté (heure marocaine).';
  });
  O.form('blocked', (ctx, values) => {
    const [startHour, startMinute] = values.startTime.split(':').map(Number);
    const [endHour, endMinute] = values.endTime.split(':').map(Number);
    if (!values.startDay || !values.endDay) throw new Error('Indiquez le début et la fin de la période.');
    ctx.store.addBlocked(ctx.data.moroccoInstant(values.startDay, startHour, startMinute), ctx.data.moroccoInstant(values.endDay, endHour, endMinute), values.reason);
    return 'Période bloquée : les créneaux concernés ne sont plus réservables.';
  });
  O.action('unblock', (ctx, dataset) => { ctx.store.removeBlocked(dataset.id); return 'Période débloquée.'; });
  O.action('toggle-priority', (ctx, dataset) => { ctx.store.togglePriority(dataset.id); return 'Priorité du créneau modifiée.'; });
  O.action('remove-slot', (ctx, dataset) => { ctx.store.removeSlot(dataset.id); return 'Créneau retiré.'; });
  O.form('report-review', (ctx, values, form) => { ctx.store.reportReview(form.dataset.id, values.reason); return 'Avis signalé : il est transmis à la modération.'; });
}(typeof globalThis !== 'undefined' ? globalThis : this));
