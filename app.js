(function () {
  'use strict';
  const O = window.Ontrack;
  const { escape, head, t, msg } = O.ui;
  let storage;
  let tabSession;
  try { storage = window.localStorage; } catch (error) { storage = null; }
  try { tabSession = window.sessionStorage; } catch (error) { tabSession = null; }
  // État partagé dans localStorage, session propre à l'onglet dans sessionStorage.
  const store = OntrackStore.createStore(storage, undefined, tabSession);
  const main = document.getElementById('main');
  const blankMemory = () => ({ filters: {}, subjectFilter: '', wizard: null, mailbox: '', pendingEmail: '', resetEmail: '', podsEmail: '', returnTo: '', gateway: {}, lastQr: null, notificationTest: '', adminStatus: '', assistant: [], assistantOwner: null, chatDraft: {}, chatReport: null, chatScroll: null, chatScrollEnd: false });
  const memory = blankMemory();
  // Efface toute la mémoire propre à l'onglet (déconnexion, réinitialisation, restauration).
  O.clearMemory = () => { for (const key of Object.keys(memory)) delete memory[key]; Object.assign(memory, blankMemory()); renderAssistant(); };
  const roleLabels = { student: 'étudiant', tutor: 'tuteur', admin: 'administrateur' };
  const spaces = { student: '#etudiant/apercu', tutor: '#tuteur/apercu', admin: '#admin/apercu' };
  let lastRoute = '';
  let feedbackRoute = location.hash;
  O.store = store;
  O.memory = memory;

  function context(params) {
    return { store, state: store.get(), user: store.currentUser(), ui: memory, params: params || [], data: OntrackData, spaces };
  }
  function feedback(message, error) {
    feedbackRoute = location.hash;
    const element = document.getElementById('feedback');
    element.textContent = msg(message) || '';
    element.className = error ? 'error' : '';
    if (message) element.focus();
  }
  function setMeta(name, content) {
    let element = document.querySelector(`meta[name="${name}"]`);
    if (!element) { element = document.createElement('meta'); element.setAttribute('name', name); document.head.appendChild(element); }
    element.setAttribute('content', content);
  }
  // Libellés statiques d'index.html : la clé française est relevée au premier passage.
  const originals = new WeakMap();
  function applyLanguage() {
    const lang = O.i18n.get();
    document.documentElement.lang = lang;
    for (const element of document.querySelectorAll('[data-i18n]')) {
      if (!element.dataset.i18n) element.dataset.i18n = element.textContent.trim();
      element.textContent = t(element.dataset.i18n);
    }
    for (const element of document.querySelectorAll('[data-i18n-attrs]')) {
      if (!originals.has(element)) originals.set(element, Object.fromEntries(element.dataset.i18nAttrs.split(/\s+/).map(name => [name, element.getAttribute(name)])));
      for (const [name, key] of Object.entries(originals.get(element))) element.setAttribute(name, t(key));
    }
    for (const button of document.querySelectorAll('[data-lang]')) button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    renderAssistant();
  }
  function account(user) {
    const box = document.getElementById('account');
    const unread = user ? store.get().notifications.filter(item => item.userId === user.id && !item.read).length : 0;
    box.innerHTML = user
      ? `<a class="account-link" href="${spaces[user.role]}"><span class="account-name">${escape(O.ui.firstName(user.name))}</span><span class="badge ${user.role === 'admin' ? 'violet' : ''}">${escape(t(roleLabels[user.role]))}</span>${unread ? `<span class="count" aria-label="${escape(t('{count} notification(s) non lue(s)', { count: unread }))}">${unread}</span>` : ''}</a><button type="button" class="button small secondary" data-action="logout">${escape(t('Déconnexion'))}</button>`
      : `<a class="button small secondary" href="#connexion">${escape(t('Connexion'))}</a><a class="button small" href="#inscription">${escape(t('Inscription'))}</a>`;
  }
  function render() {
    store.tick();
    const safeDecode = part => { try { return decodeURIComponent(part); } catch (error) { return part; } };
    const [page, ...params] = location.hash.slice(1).split('/').map(safeDecode);
    const name = page || 'accueil';
    const definition = O.routes[name];
    const user = store.currentUser();
    syncAssistantOwner(user);
    document.getElementById('storage-warning').textContent = msg(store.warning());
    account(user);
    const access = O.access(definition, user);
    if (access.redirect) {
      memory.returnTo = location.hash;
      location.replace('#connexion');
      feedback(access.message, true);
      return;
    }
    const ctx = context(params);
    // Position du fil de discussion avant un réaffichage de la même page (rétablie par la vue si l'utilisateur lisait plus haut).
    const log = document.getElementById('chat-log');
    memory.chatScroll = log && location.hash === lastRoute ? { top: log.scrollTop, atBottom: log.scrollHeight - log.scrollTop - log.clientHeight < 40 } : null;
    let html;
    if (definition) {
      try { html = definition.render(ctx); }
      catch (error) { html = head(t('Erreur'), t('Affichage impossible.'), msg(error.message)) + `<div class="wrap section"><a class="button" href="#accueil">${escape(t('Retour à l\'accueil'))}</a></div>`; console.error(error); }
    } else html = head(t('Navigation'), t('Cette page n\'existe pas.'), t('Retrouvez les espaces ONTRACK depuis le menu.')) + `<div class="wrap section"><a class="button" href="#accueil">${escape(t('Retour à l\'accueil'))}</a></div>`;
    main.innerHTML = html;
    const title = definition ? (typeof definition.title === 'function' ? definition.title(ctx) : definition.title) : t('Page introuvable');
    document.title = `${title} | ONTRACK`;
    setMeta('description', definition ? (typeof definition.description === 'function' ? definition.description(ctx) : definition.description) : t('Page introuvable.'));
    setMeta('robots', access.robots);
    const navKey = name === 'accueil' && params[0] === 'offres' ? 'tarifs' : name;
    for (const link of document.querySelectorAll('[data-nav]')) { if (link.dataset.nav === navKey) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
    if (location.hash !== lastRoute) { lastRoute = location.hash; main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    if (definition && definition.after) definition.after(ctx, main);
    scheduleChat(user);
  }
  // Discussions : seule cette vue se réaffiche d'elle-même (autre onglet, réponse attendue), en gardant
  // le brouillon (memory.chatDraft), le champ actif et la position du curseur.
  const onDiscussions = () => /^#etudiant\/discussions(\/|$)/.test(location.hash);
  let chatTimer = null;
  function rerenderChat() {
    const active = document.activeElement;
    const focusId = active && main.contains(active) && active.id ? active.id : '';
    const caret = focusId && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    render();
    const element = focusId ? document.getElementById(focusId) : null;
    if (!element) return;
    element.focus({ preventScroll: true });
    if (caret && typeof element.setSelectionRange === 'function') try { element.setSelectionRange(caret[0], caret[1]); } catch (error) { /* champ sans curseur */ }
  }
  // Minuterie d'une seconde, active seulement sur Discussions quand une réponse simulée est attendue.
  function scheduleChat(user) {
    clearTimeout(chatTimer);
    chatTimer = null;
    if (!onDiscussions() || !user || user.role !== 'student') return;
    if (store.chatView().expecting) chatTimer = setTimeout(rerenderChat, 1000);
  }
  function outcome(result) {
    if (result === false) return;
    const value = typeof result === 'string' ? { message: result } : (result || {});
    if (value.go !== undefined) {
      const target = `#${value.go}`;
      if (location.hash === target) { render(); feedback(value.message, value.error); }
      else { feedbackRoute = target; location.hash = target; const element = document.getElementById('feedback'); element.textContent = msg(value.message) || ''; element.className = value.error ? 'error' : ''; }
      return;
    }
    render();
    feedback(value.message || t('Modification enregistrée.'), value.error);
    const focus = value.focus ? document.getElementById(value.focus) : null;
    if (focus) focus.focus();
  }
  document.addEventListener('submit', event => {
    const form = event.target;
    const handler = O.forms[form.dataset.form];
    if (!handler) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try { outcome(handler(context(), values, form)); }
    catch (error) { feedback(error.message, true); }
  });
  document.addEventListener('click', event => {
    if (event.target.closest('.skip')) { event.preventDefault(); main.focus(); main.scrollIntoView(); return; }
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const handler = O.actions[target.dataset.action];
    if (!handler) return;
    if (target.dataset.confirm && !window.confirm(target.dataset.confirm)) return;
    try { outcome(handler(context(), target.dataset, target)); }
    catch (error) { feedback(error.message, true); }
  });
  // Brouillons des discussions (message en cours, motif de signalement) conservés en mémoire d'onglet.
  document.addEventListener('input', event => {
    const target = event.target.closest && event.target.closest('[data-draft]');
    if (target) memory.chatDraft[target.dataset.draft] = target.value;
  });
  document.addEventListener('change', event => {
    const target = event.target.closest('[data-change]');
    if (!target) return;
    const handler = O.changes[target.dataset.change];
    if (!handler) return;
    try { const result = handler(context(), target); if (result) outcome(result); }
    catch (error) { feedback(error.message, true); }
  });
  O.done = outcome;
  O.action('logout', () => { store.logout(); O.clearMemory(); return { go: 'accueil', message: t('Vous êtes déconnecté. La session a été fermée sur cet appareil.') }; });
  O.action('reset', () => {
    store.reset(true);
    O.clearMemory();
    return { go: 'accueil', message: t('Scénario initial restauré.') };
  });
  O.action('lang', (ctx, dataset) => { O.i18n.set(dataset.lang); applyLanguage(); return t('Site affiché en français.'); });
  window.addEventListener('hashchange', () => { if (location.hash !== feedbackRoute) feedback(''); render(); });
  window.addEventListener('storage', event => {
    // Autre onglet : état relu sans bruit ; seule la vue Discussions se réaffiche, les autres formulaires restent intacts.
    if (event.key === OntrackStore.KEY) {
      const changed = store.refresh();
      document.getElementById('storage-warning').textContent = msg(store.warning());
      if (changed && onDiscussions()) rerenderChat();
      else if (changed) account(store.currentUser());
    }
    if (event.key === O.i18n.STORAGE_KEY && event.newValue && event.newValue !== O.i18n.get()) { O.i18n.set(event.newValue); applyLanguage(); render(); }
  });
  // Assistant ONTRACK : bulle et panneau hors de <main>. L'historique (memory.assistant) reste en mémoire
  // d'onglet : ni enregistré ni envoyé, vidé par O.clearMemory. Tout texte est échappé ; les liens viennent
  // de la liste fixe OntrackAssistant.ROUTES. Formulaire et puces sont traités ici, hors du registre des vues.
  const assistant = {
    box: document.getElementById('assistant'),
    toggle: document.getElementById('assistant-toggle'),
    panel: document.getElementById('assistant-panel'),
    log: document.getElementById('assistant-log'),
    chips: document.getElementById('assistant-suggestions'),
    input: document.getElementById('assistant-input'),
    error: document.getElementById('assistant-error')
  };
  const ASSISTANT_HISTORY = 40;
  const assistantContext = () => { store.tick(); return { state: store.get(), user: store.currentUser(), t, locale: O.i18n.locale(), money: O.ui.money, now: store.now() }; };
  const assistantLinks = links => links.filter(item => Object.prototype.hasOwnProperty.call(OntrackAssistant.ROUTES, item.href)).map(item => `<a href="${escape(item.href)}">${escape(item.label)}</a>`).join('');
  const assistantExchange = entry => `<div class="assistant-msg user"><span class="sr-only">${escape(t('Vous'))} : </span><p>${escape(entry.question)}</p></div><div class="assistant-msg bot"><span class="sr-only">${escape(t('Assistant'))} : </span><p>${escape(entry.answer.text)}</p>${entry.answer.links.length ? `<p class="assistant-links">${assistantLinks(entry.answer.links)}</p>` : ''}</div>`;
  const assistantChips = list => list.map(text => `<button type="button" class="assistant-chip" data-suggestion="${escape(text)}">${escape(text)}</button>`).join('');
  function renderAssistant() {
    if (!assistant.box) return;
    const lang = O.i18n.get();
    // Les réponses déjà affichées sont recalculées dans la langue active.
    for (const entry of memory.assistant || []) if (entry.lang !== lang) { entry.answer = OntrackAssistant.answer(entry.question, assistantContext()); entry.lang = lang; }
    const history = memory.assistant || [];
    assistant.log.innerHTML = `<div class="assistant-msg bot"><p>${escape(t('Bonjour ! Je réponds aux questions fréquentes à partir des données de la démonstration. Posez votre question ou choisissez une suggestion.'))}</p></div>${history.map(assistantExchange).join('')}`;
    assistant.chips.innerHTML = assistantChips(history.length ? history[history.length - 1].answer.suggestions : OntrackAssistant.defaultSuggestions(t));
    assistantError('');
    assistant.log.scrollTop = assistant.log.scrollHeight;
  }
  // Message d'erreur de saisie, reflété par aria-invalid sur le champ.
  function assistantError(message) {
    assistant.error.textContent = message;
    if (message) assistant.input.setAttribute('aria-invalid', 'true'); else assistant.input.removeAttribute('aria-invalid');
  }
  function askAssistant(raw) {
    const problem = OntrackAssistant.validate(raw, t);
    if (problem) { assistantError(problem); assistant.input.focus(); return; }
    const question = raw.trim();
    const context = assistantContext();
    syncAssistantOwner(context.user);
    const entry = { question, lang: O.i18n.get(), answer: OntrackAssistant.answer(question, context) };
    memory.assistant.push(entry);
    if (memory.assistant.length > ASSISTANT_HISTORY) { memory.assistant.splice(0, memory.assistant.length - ASSISTANT_HISTORY); renderAssistant(); }
    else assistant.log.insertAdjacentHTML('beforeend', assistantExchange(entry));
    assistant.chips.innerHTML = assistantChips(entry.answer.suggestions);
    assistantError('');
    assistant.input.value = '';
    assistant.log.scrollTop = assistant.log.scrollHeight;
  }
  // L'historique appartient à un seul utilisateur : tout changement de compte (connexion rapide, expiration,
  // suppression) l'efface, pour qu'aucune réponse personnalisée ne reste visible à un autre utilisateur.
  function syncAssistantOwner(user) {
    const owner = user ? user.id : null;
    if (memory.assistantOwner === owner) return;
    memory.assistantOwner = owner;
    if (memory.assistant.length) { memory.assistant = []; renderAssistant(); }
  }
  function setAssistantOpen(open, returnFocus) {
    assistant.panel.hidden = !open;
    assistant.toggle.setAttribute('aria-expanded', String(open));
    assistant.box.classList.toggle('open', open);
    if (open) { assistant.log.scrollTop = assistant.log.scrollHeight; assistant.input.focus(); }
    else if (returnFocus) assistant.toggle.focus();
  }
  if (assistant.box) {
    assistant.toggle.addEventListener('click', () => setAssistantOpen(assistant.panel.hidden, true));
    assistant.panel.addEventListener('submit', event => { event.preventDefault(); askAssistant(assistant.input.value); });
    assistant.panel.addEventListener('click', event => {
      if (event.target.closest('[data-assistant="close"]')) { setAssistantOpen(false, true); return; }
      const chip = event.target.closest('[data-suggestion]');
      if (chip) { askAssistant(chip.dataset.suggestion); assistant.input.focus(); return; }
      const link = event.target.closest('a[href^="#"]');
      // Un lien suivi ferme le panneau ; le focus reste sur le bouton si la page ne change pas.
      if (link) setAssistantOpen(false, link.getAttribute('href') === location.hash);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !assistant.panel.hidden && assistant.box.contains(document.activeElement)) { event.preventDefault(); setAssistantOpen(false, true); }
    });
  }
  applyLanguage();
  render();
}());
