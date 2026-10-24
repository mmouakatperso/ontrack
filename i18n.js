(function (root) {
  'use strict';
  // Traduction de l'interface (français par défaut, anglais). Les clés sont les libellés français :
  // t('Libellé {param}', { param }) renvoie le libellé dans la langue active, paramètres insérés tels quels.
  // Les données (matières, profils, e-mails, notifications, valeurs enregistrées) ne sont jamais traduites.
  const O = root.Ontrack = root.Ontrack || {};
  const STORAGE_KEY = 'ontrack-lang';
  const LANGUAGES = { fr: { label: 'Français', short: 'FR', locale: 'fr-MA' }, en: { label: 'English', short: 'EN', locale: 'en-GB' } };
  const dictionaries = { en: {} };
  const patterns = { en: [] };
  const missing = new Set();
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const fill = (text, params) => params ? text.replace(/\{(\w+)\}/g, (match, name) => has(params, name) ? String(params[name]) : match) : text;
  const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let storage = null;
  try { storage = root.localStorage || null; } catch (error) { storage = null; }
  let current = 'fr';
  try { const saved = storage && storage.getItem(STORAGE_KEY); if (has(LANGUAGES, saved)) current = saved; } catch (error) { current = 'fr'; }

  // Une clé à paramètres sert aussi de modèle pour traduire un message déjà composé en français (erreurs du store).
  function add(lang, entries) {
    for (const [key, value] of Object.entries(entries)) {
      if (!has(dictionaries[lang], key) && /\{\w+\}/.test(key)) {
        const names = [];
        const source = key.split(/(\{\w+\})/).map(part => { const match = /^\{(\w+)\}$/.exec(part); if (!match) return escapeRegExp(part); names.push(match[1]); return '([\\s\\S]*?)'; }).join('');
        patterns[lang].push({ regex: new RegExp(`^${source}$`), names, key });
      }
      dictionaries[lang][key] = value;
    }
  }
  function t(key, params) {
    if (current === 'fr') return fill(key, params);
    const dictionary = dictionaries[current];
    if (has(dictionary, key)) return fill(dictionary[key], params);
    missing.add(key);
    return fill(key, params);
  }
  function message(text) {
    if (current === 'fr' || typeof text !== 'string' || !text) return text;
    const dictionary = dictionaries[current];
    if (has(dictionary, text)) return dictionary[text];
    for (const pattern of patterns[current]) {
      const match = pattern.regex.exec(text);
      if (match) return fill(dictionary[pattern.key], Object.fromEntries(pattern.names.map((name, index) => [name, match[index + 1]])));
    }
    return text;
  }
  function set(lang) {
    if (!has(LANGUAGES, lang)) return current;
    current = lang;
    try { if (storage) storage.setItem(STORAGE_KEY, lang); } catch (error) { storage = null; }
    return current;
  }
  O.i18n = { t, message, add, set, get: () => current, locale: () => LANGUAGES[current].locale, languages: LANGUAGES, dictionaries, missing, STORAGE_KEY };
}(typeof globalThis !== 'undefined' ? globalThis : this));
