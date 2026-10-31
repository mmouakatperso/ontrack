---
title: 'ONTRACK - Discussions entre étudiants (chat simulé)'
type: 'feature'
created: '2026-10-31'
status: 'done'
baseline_commit: '26f04d752083747bc6ae8cf48c423ae87123be36'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-31.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** Le porteur du projet veut simuler des échanges entre étudiants pendant la soutenance (proposition §4.5, incrément D). Il n'existe ni messagerie entre étudiants, ni serveur.

**Approche :**
- Nouvel onglet `#etudiant/discussions` : salons par filière et par matière, discussions privées avec un étudiant réel ou une persona fictive, signalement des messages.
- Les personas répondent automatiquement, 2 à 6 s plus tard sur l'horloge du store.
- Deux onglets du même navigateur se parlent en direct grâce à l'événement `storage`. Pour cela, la session devient propre à chaque onglet.
- L'admin modère les messages signalés dans `#admin/moderation`.

## Boundaries & Constraints

**Toujours :**
- Aucun serveur ni réseau. La limite « pas de chat entre appareils » est affichée dans l'onglet et dans le README.
- Seuls les étudiants écrivent. Message de 1 à 500 caractères. Si le message contient un e-mail ou un numéro de téléphone, il est publié avec un avertissement.
- Le rappel « N'échangez ni coordonnées, ni documents, ni données personnelles » est permanent dans l'onglet.
- Les personas portent « (fictive) » dans leur nom.
- Un message privé reçu crée une notification locale.
- Les règles du chat et la conservation locale des messages figurent dans `#cgu` et `#confidentialite`.
- Toutes les nouvelles chaînes sont traduites en anglais.

**Jamais :**
- Exposer une discussion privée à un tiers autre que l'admin. L'admin ne voit que les messages signalés.
- Perdre en silence un message écrit dans un autre onglet.
- Modifier le cahier des charges.
- Pousser sur `main`.

**Décisions :**
- La session est conservée dans le `sessionStorage` de l'onglet (proposition §4.5) : se connecter dans un onglet ne connecte pas les autres, et recharger l'onglet garde la session.
- L'état partagé est relu avant chaque écriture. L'avertissement « Rechargez cette page » disparaît au profit d'un rechargement silencieux de l'état ; seule la vue Discussions se réaffiche automatiquement.
- Un état v3 sans collection `chat` reçoit le chat du seed, sans réinitialiser le reste.

## I/O & Edge-Case Matrix

| Cas | Entrée / État | Résultat | Erreur |
|---|---|---|---|
| Envoi en salon | Salma, salon Gestion, « Qui révise la compta ? » | Message ajouté, réponse de persona planifiée entre 2 et 6 s | — |
| Réponse planifiée | Horloge à l'échéance + `tick()` | Message de la persona distribué, entrée `pending` retirée | — |
| Rôle | Tuteur, admin ou visiteur qui poste | Refus | `Accès refusé : connectez-vous avec un compte autorisé.` |
| Longueur | `''` ou 501 caractères | Refus | `Message : 1 à 500 caractères.` |
| Coordonnées | « écris-moi à a@b.ma » | Publié, avertissement renvoyé | — |
| Privé | Salma → Omar | Fil créé ; Omar notifié ; le fil est invisible pour un tiers | — |
| Deux onglets | Salma (A) et Omar (B) | B voit le message sans rechargement manuel | — |
| Écriture concurrente | A et B écrivent à tour de rôle | Aucun message perdu | — |
| Signalement | Omar signale un message de Salma | Le message apparaît dans `#admin/moderation` | Son propre message : refus |
| Masquage | L'admin masque, puis rétablit | Le message est remplacé par « Message masqué par la modération », puis réapparaît | — |
| Suppression de compte | Salma supprime son compte | Ses messages passent à « Compte supprimé » ; ses fils privés et les réponses planifiées pour elle disparaissent | — |
| Ancien état v3 sans `chat` | `localStorage` issu de l'incrément A | Chat du seed ajouté, données conservées | — |

</frozen-after-approval>

## Code Map

- `data.js` (`seed`, l. 160) : collection `chat`, avec le modèle de la proposition §4.5 :
  - `rooms` : Tronc commun, Gestion, Commerce, Finance, plus deux salons de matière ;
  - 3 ou 4 `personas` ;
  - `messages`, `threads` et `pending`, avec 2 messages d'amorce par salon.
- `store.js`
  - `createStore(storage, clock, sessionStore)` : la session est lue et écrite dans `sessionStore` (clé `ontrack-session-v3`) et exclue de l'état écrit dans `storage`.
  - Sans `sessionStore`, le comportement actuel est conservé (tests Node).
  - `refresh()` relit `storage` en gardant la session de l'onglet. Elle est appelée au début de `transaction` et exposée dans l'API.
  - `valid` (l. 68) : valide `chat`. Au chargement, un état sans `chat` reçoit celui du seed.
  - Nouvelles fonctions :
    - `chatPost({ roomId | threadId, text })` ;
    - `chatStartThread(otherId)` ;
    - `chatReport(messageId, reason)` ;
    - `chatHide(messageId, hidden)`, réservée à l'admin ;
    - `chatView()` : salons, fils de l'utilisateur, messages visibles.
  - `tick` (l. 505) distribue les réponses `pending` arrivées à échéance (réponses par mots-clés).
  - `removeAccount` (l. 1125) anonymise les messages de l'étudiant.
  - L'import (l. 1059-1065) conserve la session de l'onglet.
- `app.js`
  - L'écouteur `storage` : sur `KEY`, il appelle `store.refresh()` et ne réaffiche la vue que si la route est `etudiant/discussions`. Le brouillon de message est conservé dans `memory`.
  - Une minuterie d'une seconde, active seulement sur Discussions quand une réponse est attendue, rappelle `render()`.
  - Le store reçoit `sessionStorage`.
- `views-student.js` (`TABS`, l. 236) : onglet « Discussions ».
  - Liste des salons, avec celui de la filière mis en avant.
  - Fils privés et bouton « Écrire à… ».
  - Fil de messages en `aria-live`, formulaire d'envoi, bouton « Signaler », rappels et limites.
- `views-admin.js` (`moderation`, l. 80) : section « Messages signalés », avec les actions Masquer et Rétablir.
- `views-public.js` (`cgu` l. 288, `confidentialite` l. 297) : règles du chat et conservation locale.
- `i18n-en.js` : traductions, y compris les messages d'erreur du store (test i18n).
- Tests :
  - `tests/store.test.cjs` : tous les cas de la matrice, sur deux stores partageant le même `memoryStorage` (l. 17) avec deux `sessionStore` distincts.
  - `tests/views.test.cjs` : rendu, garde et échappement de `etudiant/discussions`, et section de modération.

## Tasks & Acceptance

**Exécution :**
- [x] `data.js`, `store.js` -- session par onglet, `refresh`, collection `chat`, API, `tick`, suppression, migration -- règles métier.
- [x] `app.js` -- `sessionStorage`, synchronisation entre onglets, minuterie -- temps réel.
- [x] `views-student.js`, `views-admin.js`, `views-public.js`, `styles.css` -- onglet Discussions, modération, CGU et confidentialité -- interface.
- [x] `i18n-en.js` -- traductions -- test i18n vert.
- [x] `tests/store.test.cjs`, `tests/views.test.cjs` -- couvrir la matrice -- non-régression.
- [x] Docs : `docs/COUVERTURE_CDC.md`, `docs/DOCUMENTATION_TECHNIQUE.md` (modèle `chat`, session par onglet, synchronisation, évolution WebSocket), `docs/GUIDE_UTILISATEUR.md` (Discussions, modération), `README.md` (deux onglets Salma et Omar dans le scénario, limites) -- traçabilité.

**Critères d'acceptation :**
- Étant donné deux onglets connectés, l'un en Salma et l'autre en Omar, quand Salma envoie un message privé, alors il apparaît chez Omar en quelques secondes, sans rechargement manuel.
- Étant donné Omar en train de remplir un formulaire de réservation dans un onglet, quand Salma poste dans un autre, alors son formulaire n'est pas réinitialisé.

## Verification

**Commandes :**
- `node --test tests/*.test.cjs` -- tous les tests passent, sauf les 2 échecs tzdata connus du Node local 22.23.1.
- `for f in *.js; do node --check "$f"; done` -- aucune erreur.

**Contrôles manuels :**
- Deux onglets de Chrome, Salma et Omar : message privé en direct, réponse de persona dans un salon, signalement visible côté admin. Vue Discussions à 390 px sans défilement horizontal.

## Implementation Notes

- 2026-10-31 : implémentation par un sous-agent, puis contrôle du diff et triage par l'orchestrateur ; correctifs de revue appliqués par le même sous-agent.
  - **Tests :** 83/85. Les deux échecs (« Stay ONTRACK : mois calendaire », « date limite dépassée ») sont ceux du Node local 22.23.1 (tzdata), déjà constatés sur la baseline.
  - **Syntaxe :** `node --check` est propre.
  - **Contrôle navigateur :** Chrome headless sur un serveur HTTP local, avec trois onglets (Salma, Omar, admin), 21/21 contrôles verts après les correctifs. Il n'a pas été rejoué en `file:`. Le script (`e2e.cjs`) reste hors dépôt.
  - **Hors spec :**
    - `save()` n'écrit que si l'état a changé, pour éviter que deux onglets se réaffichent en boucle.
    - L'export administrateur exclut les discussions privées et leurs notifications ; la restauration conserve les fils en cours.
    - Après une réinitialisation du mot de passe, les sessions de tous les onglets sont révoquées (`sessionsRevokedAt`).
    - Les réponses de persona dans les salons ne contiennent pas le prénom de l'étudiant.
  - **Effet visible :** la session passe de `localStorage` à `sessionStorage`. Les visiteurs du site publié seront déconnectés une fois, et un lien ouvert dans un nouvel onglet arrive déconnecté (documenté).

## Review Triage Log

Abréviations : BH = Blind Hunter, EC = Edge Case Hunter, VG = Verification Gap, OR = orchestrateur.

| Constat | Verdict | Preuve et traitement |
|---|---|---|
| OR : `mutate` et `tick` lancent `housekeeping()` sur l'état périmé, avant le `refresh()` de `transaction` | false | Infirmé : `housekeeping()` (`store.js:399`) ouvre sa propre `transaction`, qui relit l'état partagé d'abord ; le test ajouté passe aussi sur l'ancien code. Le `sync()` explicite en tête de `mutate` et `tick` est conservé comme garde d'ordre, sans effet sur le comportement. |
| BH1 et EC2 : une réinitialisation du mot de passe ne ferme plus les sessions des autres onglets | medium | `confirmReset` (`store.js:702`) ne vide que la session de l'onglet, alors que l'e-mail annonce « Toutes les sessions ont été fermées ». Patch : marque de révocation par utilisateur. |
| EC1 : `$'` dans un nom injecté dans les modèles de réponse | medium | Le nom est en texte libre (`validateIdentity`, 2 à 80 caractères) et le remplacement par chaîne interprète `$'` ; au-delà de 500 caractères, `valid()` échoue à chaque `tick`. Patch : fonction de remplacement. |
| BH2 et EC10 : le prénom d'un compte supprimé subsiste dans les réponses de persona et dans les notifications | low | Salons : patch, le prénom n'est plus inséré dans les réponses publiques. Notifications détenues par les destinataires : même comportement que les notifications existantes (réservations). Rejet. |
| BH3 : impossible de rejeter un signalement, et on ne peut signaler qu'une fois | low | Il faudrait une nouvelle action et un nouveau statut. Rejet. |
| BH4 : pas de plafond de conservation des messages | low | Démonstration locale, volume faible. Rejet. |
| BH5 et EC7 : le fil est ramené en bas à chaque réaffichage | low | Le `after` force `scrollTop`. Patch : seulement si le fil était déjà en bas. |
| BH5 : réannonce par les lecteurs d'écran | low | Uniquement pendant l'attente d'une réponse ou sur un événement d'un autre onglet. Rejet. |
| EC5 : le select « Écrire à… » est réinitialisé | low | Patch : `id` et `data-draft`. |
| EC6 : le focus est perdu sur les boutons sans `id` | low | Fenêtre de 2 à 6 s ; la correction demande des identifiants partout. Rejet. |
| EC8 : composition IME interrompue | low | Cas rare. Rejet. |
| BH6 : l'avertissement de coordonnées est affiché comme un succès et le focus quitte le message | low | Patch : `error: true`, sans déplacement du focus. |
| BH7 : mots-clés courts reconnus à l'intérieur des mots ; personas en français seulement | low | Patch : correspondance en début de mot. Les personas sont des étudiantes francophones (donnée non traduite) : rejet de la seconde partie. |
| BH8 : `CONTACT_RULE` ne détecte ni les pseudos ni les URL | low | Avertissement heuristique ; l'élargir multiplierait les faux positifs. Rejet. |
| BH9 : liste des étudiants visible ; ni blocage ni limite de débit | low | Patch : mention dans la politique de confidentialité. Blocage et limite de débit sortent du périmètre de la démonstration : rejet. |
| BH10 et EC11 : « Autre motif » sans texte libre ; brouillon de signalement jamais vidé | low | Patch : brouillon vidé. Le texte libre est une amélioration : rejet. |
| BH11 et VG3 : réponse de persona en privé jamais distribuée par un test | gap | Patch : S40 étendu (horloge, `tick`, notification). |
| VG2 : import d'une sauvegarde sans `chat` non testé | gap | Patch : test d'import. |
| VG1 : synchronisation entre onglets dans `app.js` non testée | gap | Aucun banc DOM. Defer. |
| BH12 : nouvel onglet déconnecté, onglet dupliqué, déconnexion locale non documentés | low | Patch : documentation. |
| BH13 : `validChat` incomplet (`forUserId`, `reportedBy`…) | low | Ne concerne qu'un import modifié à la main. Rejet. |
| EC3 : l'avertissement « illisible » n'est jamais effacé | low | Patch : effacé au prochain `refresh` réussi. |
| EC4 : recharger pendant que l'état partagé est illisible fait passer en mode mémoire | false | Un état illisible ne peut venir que d'une écriture invalide d'un autre onglet, alors que chaque onglet valide avant d'écrire (`transaction`). Rejet. |
| EC9 : l'export révèle qui a écrit à qui, par les notifications | low | Patch : ces notifications sont retirées de l'export. |
