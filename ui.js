(function (root) {
  'use strict';
  // Registre partagé des vues (scripts classiques, sans modules ES) et aides de rendu.
  const O = root.Ontrack = root.Ontrack || {};
  O.routes = O.routes || {};
  O.forms = O.forms || {};
  O.actions = O.actions || {};
  O.changes = O.changes || {};
  O.route = (name, definition) => { O.routes[name] = definition; };
  O.form = (name, handler) => { O.forms[name] = handler; };
  O.action = (name, handler) => { O.actions[name] = handler; };
  O.change = (name, handler) => { O.changes[name] = handler; };
  const constants = () => root.OntrackData.constants;
  const ROLE_LABELS = { student: 'étudiant', tutor: 'tuteur', admin: 'administrateur' };
  // Décision pure de garde d'accès et d'indexation pour une route.
  O.access = (definition, user) => {
    const robots = definition && !definition.private && !definition.role ? 'index, follow' : 'noindex, nofollow';
    if (!definition || !definition.role) return { redirect: false, robots, message: '' };
    const allowed = Boolean(user) && (definition.role === 'any' || user.role === definition.role);
    if (allowed) return { redirect: false, robots, message: '' };
    const needed = definition.role === 'any' ? 'votre compte' : `un compte ${ROLE_LABELS[definition.role]}`;
    return { redirect: true, robots, message: user ? `Cet espace est réservé à ${needed}. Connectez-vous avec le compte adapté.` : `Connectez-vous avec ${needed} pour accéder à cette page.` };
  };

  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const money = value => new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(value) + ' DH';
  const date = value => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const day = value => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(value));
  const hour = value => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', timeStyle: 'short' }).format(new Date(value));
  const dateOnly = value => new Intl.DateTimeFormat('fr-MA', { timeZone: 'UTC', dateStyle: 'long' }).format(new Date(`${value}T12:00:00Z`));
  const percent = value => `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(value * 100)} %`;
  const size = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  const attrs = extra => extra ? ` ${extra}` : '';
  const normalize = value => typeof value === 'object' && value !== null ? value : { value, label: value };
  const options = (values, selected, placeholder) => (placeholder ? `<option value="">${escape(placeholder)}</option>` : '') + values.map(value => { const item = normalize(value); return `<option value="${escape(item.value)}"${String(item.value) === String(selected ?? '') ? ' selected' : ''}>${escape(item.label)}</option>`; }).join('');
  const select = (label, name, values, selected, placeholder, extra) => `<label>${escape(label)}<select name="${name}"${placeholder ? '' : ' required'}${attrs(extra)}>${options(values, selected, placeholder)}</select></label>`;
  const field = (label, name, value, type, extra) => `<label>${escape(label)}<input name="${name}" type="${type || 'text'}" value="${escape(value)}"${attrs(extra)} required></label>`;
  const optional = (label, name, value, type, extra) => `<label>${escape(label)} <span class="muted">(facultatif)</span><input name="${name}" type="${type || 'text'}" value="${escape(value)}"${attrs(extra)}></label>`;
  const textarea = (label, name, value, extra) => `<label>${escape(label)}<textarea name="${name}"${attrs(extra)}>${escape(value)}</textarea></label>`;
  const checkbox = (label, name, checked, extra) => `<label class="check"><input type="checkbox" name="${name}"${checked ? ' checked' : ''}${attrs(extra)}> <span>${escape(label)}</span></label>`;
  const checks = (legend, name, values, selected) => `<fieldset><legend>${escape(legend)}</legend><div class="check-grid">${values.map(value => { const item = normalize(value); return `<label class="check"><input type="checkbox" name="${name}" value="${escape(item.value)}"${(selected || []).includes(item.value) ? ' checked' : ''}> <span>${escape(item.label)}</span></label>`; }).join('')}</div></fieldset>`;
  const radios = (legend, name, values, selected, extra) => `<fieldset class="choice-list"><legend>${escape(legend)}</legend>${values.map(value => { const item = normalize(value); return `<label class="choice${item.disabled ? ' disabled' : ''}"><input type="radio" name="${name}" value="${escape(item.value)}"${String(item.value) === String(selected ?? '') ? ' checked' : ''}${item.disabled ? ' disabled' : ''}${attrs(extra)}><span>${item.html || escape(item.label)}</span></label>`; }).join('')}</fieldset>`;
  const head = (eyebrow, title, description) => `<div class="page-head"><div class="wrap"><p class="eyebrow">${escape(eyebrow)}</p><h1>${escape(title)}</h1>${description ? `<p>${escape(description)}</p>` : ''}</div></div>`;
  const empty = (title, text, link) => `<div class="empty"><h3>${escape(title)}</h3><p>${escape(text)}</p>${link || ''}</div>`;
  const button = (label, action, id, extra, variant) => `<button type="button" class="button small ${variant || 'secondary'}" data-action="${action}" data-id="${escape(id)}"${attrs(extra)}>${escape(label)}</button>`;
  const badge = (label, tone) => `<span class="badge ${tone || ''}">${escape(label)}</span>`;
  const tabs = (base, items, active, label) => `<nav class="tabs" aria-label="${escape(label)}">${items.map(([key, text]) => `<a href="#${base}/${key}" class="${key === active ? 'active' : ''}"${key === active ? ' aria-current="page"' : ''}>${escape(text)}</a>`).join('')}</nav>`;
  const table = (headers, rows, caption) => rows.length ? `<div class="table-wrap"><table>${caption ? `<caption>${escape(caption)}</caption>` : ''}<thead><tr>${headers.map(item => `<th scope="col">${escape(item)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const avatar = (tutor, pixels) => tutor && tutor.photoConsent && tutor.photo ? `<img class="avatar" src="${escape(tutor.photo)}" alt="Photo de ${escape(tutor.name)} (publiée avec consentement)" width="${pixels || 64}" height="${pixels || 64}">` : `<span class="avatar initials" style="width:${pixels || 64}px;height:${pixels || 64}px" aria-hidden="true">${escape(initials(tutor && tutor.name))}</span>`;
  const progressBar = (value, label) => `<div class="progress-track" role="progressbar" aria-label="${escape(label)}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.max(0, Math.min(100, value))}%"></span></div>`;
  const bookingStatus = { pending: ['En attente de paiement', 'violet'], confirmed: ['Confirmée', 'green'], completed: ['Terminée', 'green'], cancelled: ['Annulée', 'gray'], absent: ['Absence constatée', 'gray'], failed: ['Paiement non abouti', 'red'] };
  const txStatus = { pending: ['En attente', 'violet'], paid: ['Payée', 'green'], failed: ['Échouée', 'red'], refunded: ['Remboursée', 'gray'] };
  const statusBadge = status => badge(...(bookingStatus[status] || [status, 'gray']));
  const txBadge = status => badge(...(txStatus[status] || [status, 'gray']));
  const chapterStatus = id => (constants().chapterStatuses.find(item => item.id === id) || { label: id }).label;
  const subjectName = (state, id) => (state.subjects.find(subject => subject.id === id) || { name: 'Matière archivée' }).name;
  const chapterName = (state, id) => { for (const subject of state.subjects) { const chapter = subject.chapters.find(item => item.id === id); if (chapter) return chapter.name; } return 'Chapitre archivé'; };
  const tutorName = (state, id) => (state.tutors.find(tutor => tutor.id === id) || { name: 'Tuteur' }).name;
  const offerFormat = (offer) => offer.credits > 1 ? `${offer.credits} × ${offer.minutes} min · ${offer.id === 'stay' ? 'un mois' : `${offer.days} jours`}` : `${offer.minutes} minutes`;
  const rating = (store, tutorId) => { const value = store.tutorRating(tutorId); return value.average ? `<span class="rating">★ ${escape(value.average.toFixed(1))} / 5 <small>(${value.count} avis)</small></span>` : '<span class="rating muted">Nouveau profil · aucun avis</span>'; };
  const policyList = state => {
    const policy = state.config.policy;
    return `<ul class="policy"><li><strong>Annulation :</strong> sans frais jusqu'à ${policy.cancelHours} h avant le début. Séance à l'unité : remboursement ; séance d'un forfait : crédit restitué (date d'expiration inchangée).</li><li><strong>Modification de créneau :</strong> possible jusqu'à ${policy.rescheduleHours} h avant le début, selon les disponibilités du tuteur.</li><li><strong>Hors délai ou absence :</strong> la séance reste due, sans remboursement.</li><li><strong>Forfaits :</strong> aucune reconduction automatique ; les séances non utilisées à l'expiration ne sont pas reportées. Résiliation possible à tout moment${policy.terminationRefund ? ' : séances non planifiées remboursées à leur valeur d\'achat' : ''}.</li><li><strong>Paiement :</strong> le créneau est retenu ${policy.holdMinutes} minutes pendant le paiement ; sans confirmation, il est libéré.</li></ul>`;
  };
  O.ui = { escape, money, date, day, hour, dateOnly, percent, size, options, select, field, optional, textarea, checkbox, checks, radios, head, empty, button, badge, tabs, table, avatar, initials, progressBar, statusBadge, txBadge, bookingStatus, chapterStatus, subjectName, chapterName, tutorName, offerFormat, rating, policyList, constants };
}(typeof globalThis !== 'undefined' ? globalThis : this));
