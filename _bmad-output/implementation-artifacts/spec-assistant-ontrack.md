---
title: 'ONTRACK - Assistant ONTRACK à règles (chatbot simulé)'
type: 'feature'
created: '2026-10-31'
status: 'done'
baseline_commit: '96cec463e2bd4aae1440040a08d664f4e95d76db'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-31.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** Le porteur du projet veut montrer un chatbot pendant la soutenance (proposition §4.4, incrément C). Le site n'en a pas, et il doit rester sans serveur ni réseau.

**Approche :**
- Un module pur `assistant.js` répond par règles (mots-clés FR et EN pondérés) à 16 intentions.
- Ses réponses sont calculées à partir de l'état courant (tarifs, tuteurs, destinations, filières, politique) et personnalisées pour l'utilisateur connecté.
- Une bulle « Assistant », présente sur toutes les pages, ouvre un panneau accessible au clavier.

## Boundaries & Constraints

**Toujours :**
- Aucun appel réseau, aucune IA. Un libellé permanent l'affiche : « Assistant simulé : réponses préprogrammées, sans intelligence artificielle ni envoi de données ».
- La réponse suit la langue active (FR | EN) ; les données (noms d'offres, d'établissements, de filières) ne sont pas traduites.
- Chaque chiffre cité provient de l'état : un tarif modifié par l'admin est repris tel quel.
- La saisie est toujours échappée à l'affichage ; les liens proviennent d'une liste fixe de routes internes.
- L'historique reste en mémoire d'onglet. Il n'est ni enregistré ni envoyé.

**Jamais :**
- Promettre une admission ou un résultat.
- Inventer un critère de destination non communiqué.
- Exposer des données d'un autre utilisateur.
- Modifier le cahier des charges.
- Pousser sur `main`.

## I/O & Edge-Case Matrix

| Cas | Entrée / État | Résultat | Erreur |
|---|---|---|---|
| Tarifs | « combien coûte une séance ? » / « price » | Offres de `state.offers` avec prix ; lien `#accueil/offres` | — |
| Donnée modifiée | Admin passe Quick Help à 99 DH | La réponse cite 99 DH | — |
| Personnalisé | Omar connecté : « mes crédits Stay » | « Il vous reste {n} séances… » d'après ses forfaits actifs | — |
| Orientation | « places à HEC Liège » | Effectifs tels que communiqués, jamais additionnés ; lien `#orientation` | — |
| Accents et casse | « RÉSERVER un tuteur » / « reserver » | Intention « réserver » | — |
| Incompris | « météo demain » | « Je n'ai pas compris » et 4 suggestions | — |
| Saisie vide ou > 300 caractères | `''`, 301 caractères | Rien n'est envoyé ; message de longueur | — |
| Injection | `<img src=x onerror=alert(1)>` | Affiché littéralement | — |

</frozen-after-approval>

## Code Map

- `assistant.js` (nouveau, UMD comme `store.js`)
  - `answer(text, { state, user, t })` renvoie `{ intent, text, links: [{ href, label }], suggestions: [] }`.
  - `normalize` : minuscules, accents retirés (NFD), ponctuation neutralisée.
  - Une table `INTENTS` : identifiant, mots-clés FR et EN pondérés, fonction de réponse. Les 16 intentions sont celles du tableau de la proposition §4.4, repli compris.
  - `t` vaut par défaut un remplacement de `{param}` (pour Node) ; le navigateur passe `O.i18n.t`.
- Données utiles :
  - `state.offers` : id, name, price, credits, minutes.
  - `state.config.policy` : cancelHours, rescheduleHours.
  - `state.tutors` filtrés sur `status === 'approved'`.
  - `state.subjects`, `state.programs` (seats, active), `OntrackData.constants.trackGroups`.
  - `state.packages` : `studentId`, `status === 'active'`, `remaining`, `name`.
- `index.html`
  - `<script defer src="assistant.js">` avant `app.js`.
  - Conteneur `<div id="assistant">` hors de `<main>` : bouton flottant et panneau `role="dialog"` `aria-modal="false"`.
- `app.js` : contrôleur DOM.
  - Ouverture et fermeture : Échap ferme le panneau et rend le focus au bouton.
  - Historique `memory.assistant` (vidé par `O.clearMemory`) rendu en `aria-live="polite"`.
  - Puces de suggestions et formulaire `data-form` distinct du registre des vues.
  - Nouveau rendu à chaque changement de langue.
- `styles.css` : bulle fixe en bas à droite. Le panneau fait au plus 380 px de large et occupe toute la largeur sous 420 px, sans défilement horizontal à 390 px.
- `i18n-en.js` : toutes les chaînes de l'assistant (clés françaises). Les motifs à paramètres sont placés avant les motifs génériques (piège noté dans `deferred-work.md`).
- `tests/i18n.test.cjs` : ajouter `assistant.js` à la liste des fichiers scannés pour les clés `t('…')`.
- `.github/workflows/pages.yml` : ne pas y toucher, il copie déjà `*.js`.

## Tasks & Acceptance

**Exécution :**
- [x] `assistant.js` -- normalisation, table d'intentions, réponses fondées sur l'état, personnalisation -- cœur testable sous Node.
- [x] `index.html`, `app.js`, `styles.css` -- bulle, panneau, clavier, historique en mémoire -- interface.
- [x] `i18n-en.js`, `tests/i18n.test.cjs` -- traductions et scan de `assistant.js` -- bilinguisme.
- [x] `tests/assistant.test.cjs` -- une phrase FR et une phrase EN par intention, plus les cas de la matrice -- non-régression.
- [x] `docs/COUVERTURE_CDC.md` (extensions hors cahier), `docs/DOCUMENTATION_TECHNIQUE.md` (module, évolution vers une vraie IA via un backend), `docs/GUIDE_UTILISATEUR.md`, `README.md` (étape du scénario, limites) -- traçabilité.

**Critères d'acceptation :**
- Étant donné n'importe quelle page, quand on ouvre l'assistant au clavier puis qu'on presse Échap, alors le panneau se ferme et le focus revient sur le bouton.
- Étant donné l'anglais actif, quand on pose une question, alors la réponse est en anglais et aucune clé manquante n'apparaît dans `i18n.missing`.
- Étant donné un visiteur non connecté, quand il demande ses crédits, alors l'assistant l'invite à se connecter sans citer aucune donnée personnelle.

## Design Notes

```js
// Intention retenue : score = somme des poids des mots-clés présents ; égalité → ordre de la table ; score 0 → repli.
{ id: 'pricing', keys: { tarif: 3, prix: 3, cout: 2, combien: 1, price: 3, cost: 2 }, reply: (ctx) => ({ text, links: [{ href: '#accueil/offres', label: t('Voir les tarifs') }] }) }
```

## Verification

**Commandes :**
- `node --test tests/*.test.cjs` -- tous les tests passent, sauf les 2 échecs tzdata connus du Node local 22.23.1.
- `for f in *.js; do node --check "$f"; done` -- aucune erreur.

**Contrôles manuels :**
- Chrome à 390 et 1440 px : ouvrir la bulle, poser 3 questions, changer de langue, fermer avec Échap. Aucune erreur JS ni défilement horizontal.

## Implementation Notes

- 2026-10-31 : implémentation par un sous-agent, puis contrôle du diff et triage par l'orchestrateur ; correctifs de revue appliqués par le même sous-agent.
  - **Tests :** 71/73. Les deux échecs (« Stay ONTRACK : mois calendaire », « date limite dépassée ») sont ceux du Node local 22.23.1 (tzdata), déjà constatés sur la baseline à l'incrément A.
  - **Syntaxe :** `node --check` est propre.
  - **Hors spec :** l'historique est vidé à chaque changement de compte dans l'onglet (connexion rapide, expiration), pour qu'aucune réponse personnalisée ne reste visible au compte suivant.
  - **Revue :** l'étape Tests de `.github/workflows/pages.yml` lance désormais `tests/*.test.cjs`, alors que la Code Map disait de ne pas toucher au workflow ; cette consigne ne visait que la copie des fichiers.
  - **Contrôle navigateur :** Chrome headless à 390 et 1440 px (ouverture au clavier, Échap, changement de langue, injection affichée littéralement), sans erreur JS ni défilement horizontal. Contrôle manuel, hors dépôt.

## Review Triage Log

Abréviations : BH = Blind Hunter, EC = Edge Case Hunter, VG = Verification Gap.

| Constat | Verdict | Preuve et traitement |
|---|---|---|
| VG1 et BH1 : la CI ne lance pas `tests/assistant.test.cjs` | medium | `pages.yml:31` liste trois fichiers. Patch : `node --test tests/*.test.cjs`. La note de la spec visait la copie des fichiers, pas les tests. |
| VG2 et BH10 : le contrôleur `app.js` n'est exécuté par aucun test | gap | Disposition de VG retenue : aucun banc DOM n'existe. Defer. Patch documentaire : A7 précise que la vérification se fait par lecture du source et par contrôle manuel. |
| BH2 : commande de test incohérente entre les documents | low | Correction directe. Patch. |
| BH3 : « 16 intentions » ou « 15 + repli » selon l'endroit | low | Correction directe. Patch : « 15 intentions et un repli (16 cas) ». |
| BH4 : la salutation gagne les égalités | medium | Reproduit : « Bonjour, quel est le coût ? » donne `greeting`. Cas courant à l'oral pendant la soutenance. Patch. |
| BH5 : « stay » (verbe anglais) classé en forfaits | low | Reproduit : « Can I stay abroad… » donne `packages`. Patch simple. |
| BH6 : « supprimer ma réservation » classé en réservation | low | Reproduit. Patch : clés d'annulation complétées. |
| BH7 : sigles des filières codés en dur et incomplets | low | La liste ne contient ni BA, ni MD, ni CI, ni ML. Patch : sigles dérivés de `trackGroups`. |
| BH8 et EC3 : le changement de langue recalcule les anciennes réponses à partir des données actuelles | low | Réel, mais il faut un changement admin puis un changement de langue. La correction (figer les paramètres) ajoute de la complexité. Rejet. |
| BH9 et EC4 : aucune gestion d'erreur si `answer` lève une exception | false | L'état est validé par `valid()` (`store.js:68` : `deadline` via `validDay`, politique numérique) ; ni date invalide ni politique incomplète ne peuvent l'atteindre. Rejet. |
| BH11 : pas de `maxlength`, pas d'`aria-invalid` | low | `maxlength` tronquerait en silence un collage, ce qui contredit la ligne « 301 caractères → message » de la matrice : rejet. Patch : `aria-invalid`. |
| BH12 : le test des liens ne vérifie que le premier segment | low | Concerne seulement les développeurs, et la correction ajoute de la logique de test. Rejet. |
| BH13 : libellés de liens et suggestions hors du scan i18n | low | Clés calculées dans `t(ROUTES[href])`. Patch : test de présence dans le dictionnaire. |
| BH14 : la politique de confidentialité ne mentionne pas l'assistant | low | La réponse « données personnelles » y renvoie. Patch : une phrase FR et EN. |
| BH15 et EC5 : réannonce de tout le fil par les lecteurs d'écran ; bouton placé après `<main>` | low | Seulement au changement de langue ou au plafond de 40 échanges ; la bulle flottante est un choix de conception. Rejet. |
| BH16 : contact, « 12 ENCG » et phase 3 codés en dur | false | Aucune de ces données n'existe dans l'état : elles sont statiques dans la page, donc rien d'autre ne pouvait être calculé. Rejet. |
| BH17 : lien `#reserver` proposé à un tuteur ou un admin | low | Patch : lien limité aux étudiants. |
| BH18 : valeurs de test codées en dur (`s2`, « 2 session(s) ») | low | Seed figé ; le problème ne touche que les développeurs. Rejet. |
| BH19 : la bulle masque du contenu à 390 px ; `100vh` | low | Il suffit de faire défiler ; contournement trivial. Rejet. |
| EC1 : Échap vole le focus hors du panneau | low | Patch : n'agir que si le focus est dans le panneau. |
| EC2 : Ctrl-clic sur un lien ferme le panneau | low | Cas rare. Rejet. |
| EC6 et EC11 : réservations pending expirées et forfaits expirés comptés sans `tick` | low | `assistantContext` lit `store.get()` sans `housekeeping`. Patch : `store.tick()`. |
| EC7 : paiements échoués comptés même après un nouvel essai réussi | low | L'échec reste historiquement exact, et la correction ajoute une logique d'appariement. Rejet. |
| EC8 : filières communiquées non citées comme critère | low | Patch : filières ajoutées aux critères connus. |
| EC9 : jetons génériques d'un établissement ajouté par l'admin | low | Hypothétique, et la correction ajoute des gardes. Rejet. |
| EC10 : niveau S11 ajouté par l'admin, toutes les filières proposées | false | C'est la règle décidée à l'incrément A : un niveau hors des cycles connus accepte toutes les filières. Rejet. |
