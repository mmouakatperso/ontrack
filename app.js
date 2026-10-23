(function () {
  'use strict';
  const O = window.Ontrack;
  const { escape, head } = O.ui;
  let storage;
  try { storage = window.localStorage; } catch (error) { storage = null; }
  const store = OntrackStore.createStore(storage);
  const main = document.getElementById('main');
  const blankMemory = () => ({ filters: {}, subjectFilter: '', wizard: null, mailbox: '', pendingEmail: '', resetEmail: '', podsEmail: '', returnTo: '', gateway: {}, lastQr: null, notificationTest: '', adminStatus: '' });
  const memory = blankMemory();
  // Efface toute la mémoire propre à l'onglet (déconnexion, réinitialisation, restauration).
  O.clearMemory = () => { for (const key of Object.keys(memory)) delete memory[key]; Object.assign(memory, blankMemory()); };
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
    element.textContent = message || '';
    element.className = error ? 'error' : '';
    if (message) element.focus();
  }
  function setMeta(name, content) {
    let element = document.querySelector(`meta[name="${name}"]`);
    if (!element) { element = document.createElement('meta'); element.setAttribute('name', name); document.head.appendChild(element); }
    element.setAttribute('content', content);
  }
  function account(user) {
    const box = document.getElementById('account');
    const unread = user ? store.get().notifications.filter(item => item.userId === user.id && !item.read).length : 0;
    box.innerHTML = user
      ? `<a class="account-link" href="${spaces[user.role]}"><span class="account-name">${escape(user.name.split(' ')[0])}</span><span class="badge ${user.role === 'admin' ? 'violet' : ''}">${escape(roleLabels[user.role])}</span>${unread ? `<span class="count" aria-label="${unread} notification(s) non lue(s)">${unread}</span>` : ''}</a><button type="button" class="button small secondary" data-action="logout">Déconnexion</button>`
      : '<a class="button small secondary" href="#connexion">Connexion</a><a class="button small" href="#inscription">Inscription</a>';
  }
  function render() {
    store.tick();
    const safeDecode = part => { try { return decodeURIComponent(part); } catch (error) { return part; } };
    const [page, ...params] = location.hash.slice(1).split('/').map(safeDecode);
    const name = page || 'accueil';
    const definition = O.routes[name];
    const user = store.currentUser();
    document.getElementById('storage-warning').textContent = store.warning();
    account(user);
    const access = O.access(definition, user);
    if (access.redirect) {
      memory.returnTo = location.hash;
      location.replace('#connexion');
      feedback(access.message, true);
      return;
    }
    const ctx = context(params);
    let html;
    if (definition) {
      try { html = definition.render(ctx); }
      catch (error) { html = head('Erreur', 'Affichage impossible.', error.message) + '<div class="wrap section"><a class="button" href="#accueil">Retour à l\'accueil</a></div>'; console.error(error); }
    } else html = head('Navigation', 'Cette page n\'existe pas.', 'Retrouvez les espaces ONTRACK depuis le menu.') + '<div class="wrap section"><a class="button" href="#accueil">Retour à l\'accueil</a></div>';
    main.innerHTML = html;
    const title = definition ? (typeof definition.title === 'function' ? definition.title(ctx) : definition.title) : 'Page introuvable';
    document.title = `${title} | ONTRACK`;
    setMeta('description', definition ? (typeof definition.description === 'function' ? definition.description(ctx) : definition.description) : 'Page introuvable.');
    setMeta('robots', access.robots);
    const navKey = name === 'accueil' && params[0] === 'offres' ? 'tarifs' : name;
    for (const link of document.querySelectorAll('[data-nav]')) { if (link.dataset.nav === navKey) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
    if (location.hash !== lastRoute) { lastRoute = location.hash; main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    if (definition && definition.after) definition.after(ctx, main);
  }
  function outcome(result) {
    if (result === false) return;
    const value = typeof result === 'string' ? { message: result } : (result || {});
    if (value.go !== undefined) {
      const target = `#${value.go}`;
      if (location.hash === target) { render(); feedback(value.message, value.error); }
      else { feedbackRoute = target; location.hash = target; const element = document.getElementById('feedback'); element.textContent = value.message || ''; element.className = value.error ? 'error' : ''; }
      return;
    }
    render();
    feedback(value.message || 'Modification enregistrée.', value.error);
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
  document.addEventListener('change', event => {
    const target = event.target.closest('[data-change]');
    if (!target) return;
    const handler = O.changes[target.dataset.change];
    if (!handler) return;
    try { const result = handler(context(), target); if (result) outcome(result); }
    catch (error) { feedback(error.message, true); }
  });
  O.done = outcome;
  O.action('logout', () => { store.logout(); O.clearMemory(); return { go: 'accueil', message: 'Vous êtes déconnecté. La session a été fermée sur cet appareil.' }; });
  O.action('reset', () => {
    store.reset(true);
    O.clearMemory();
    return { go: 'accueil', message: 'Scénario initial restauré.' };
  });
  window.addEventListener('hashchange', () => { if (location.hash !== feedbackRoute) feedback(''); render(); });
  window.addEventListener('storage', event => { if (event.key === OntrackStore.KEY) feedback('Les données ont changé dans un autre onglet. Rechargez cette page avant de poursuivre.', true); });
  render();
}());
