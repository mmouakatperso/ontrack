# ONTRACK — Documentation technique

Version 3 de la démonstration (clé de stockage `ontrack-demo-v3`). Ce document répond aux §18.4, §19 et §22 du cahier des charges : technologies, données, sécurité, hébergement, services externes, maintenance et transfert. La démonstration simule les services externes ; les écarts avec une mise en production sont signalés dans chaque section.

## 1. Technologies et principes

| Élément | Choix de la démonstration | Cible de production (proposition) |
| --- | --- | --- |
| Interface | HTML, CSS et JavaScript natifs, scripts classiques (pas de modules ES), ouverture directe en `file:` | Même interface, servie en HTTPS |
| Données | JSON versionné dans `localStorage`, repli en mémoire | Base relationnelle (PostgreSQL) derrière une API |
| Authentification | Locale : SHA-256 + sel, session locale | Hachage lent (Argon2id ou bcrypt), sessions serveur en cookie `HttpOnly`, `Secure`, `SameSite` |
| Paiement | Écran de scénario CMI/Payzone, notification signée vérifiée localement | Passerelle CMI ou Payzone, notification serveur à serveur signée |
| E-mails | Boîte mail simulée (`#boite-mail`) | Service transactionnel (SMTP authentifié, SPF/DKIM/DMARC) |
| Tests | `node:test`, sans dépendance | Idem, plus tests d'API et de bout en bout |

Aucune dépendance, aucune compilation, aucun appel réseau. Node.js 22 sert uniquement aux tests.

## 2. Organisation du code

| Fichier | Rôle |
| --- | --- |
| `index.html` | Point d'entrée, en-tête avec menu de compte, pied de page complet, chargement des scripts dans l'ordre |
| `styles.css` | Charte (§3.1) : marine `--navy`, bleu `--blue`, fond blanc cassé `--paper`, violet `--violet` pour les éléments interactifs, gris clair `--line`/`--gray` ; mise en page responsive (390 → 1440 px) |
| `sha256.js` | SHA-256 synchrone (UMD) ; utilisé par le navigateur et par Node |
| `data.js` | Jeu initial v3 (`seed(now)`, dont la collection `chat`), conversion heure marocaine (`moroccoInstant`, `moroccoDay`), constantes, comptes de démonstration, modèles de réponse des personas (`chatReplies`, `chatFallback`) |
| `store.js` | Toute la logique métier, sans DOM : `createStore(storage, clock, sessionStore)` ; état partagé dans `storage`, session de l'onglet dans `sessionStore` (facultatif), `refresh()` relit l'état écrit par un autre onglet |
| `i18n.js` | Langue de l'interface (français par défaut, anglais) : `t('Libellé {param}', { param })`, traduction des messages du store à l'affichage (`message`), choix mémorisé dans `localStorage` (clé `ontrack-lang`), formats de date et de nombre selon la langue |
| `i18n-en.js` | Dictionnaire anglais : clé = libellé français exact. Seuls les libellés de l'interface sont traduits, jamais les données |
| `ui.js` | Registre des routes et des gestionnaires (`Ontrack.route/form/action/change`) et aides de rendu (`escape`, `money`, `date`, `select`, `field`, `head`…) |
| `views-public.js` | Pages publiques, authentification, catalogue, orientation, Study Pods, pages légales, boîte mail |
| `views-student.js` | Assistant de réservation, paiement, confirmation, espace étudiant (dont l'onglet Discussions) |
| `views-tutor.js` | Espace tuteur |
| `views-admin.js` | Espace administrateur (dont « Messages signalés » des discussions), prototype QR |
| `assistant.js` | Assistant ONTRACK (UMD, sans DOM) : `answer(text, { state, user, t })` renvoie `{ intent, text, links, suggestions }` ; normalisation, table d'intentions pondérées, réponses calculées à partir de l'état (voir « Assistant ONTRACK » ci-dessous) |
| `app.js` | Création du store, routeur par fragment, gardes de rôle, titre/description/robots par page, délégation `submit`/`click`/`change`/`input` ; synchronisation entre onglets (événement `storage`) et minuterie des Discussions ; contrôleur de la bulle et du panneau de l'assistant |
| `robots.txt`, `sitemap.xml` | Référencement (§19) |
| `tests/store.test.cjs` | Tests métier (matrice de la spécification), dont les discussions sur deux stores partageant le même stockage avec deux sessions d'onglet distinctes |
| `tests/views.test.cjs` | Rendu de toutes les routes sans navigateur, gardes, échappement, branchement des gestionnaires |
| `tests/assistant.test.cjs` | Assistant : une phrase française et une phrase anglaise par intention, tarifs repris de l'état, personnalisation, visiteur sans donnée personnelle, effectifs jamais additionnés, repli, saisie invalide, liens internes, anglais sans clé manquante |
| `tests/i18n.test.cjs` | Moteur de traduction, intégrité du dictionnaire anglais, couverture des clés du code et des messages du store, rendu anglais de toutes les routes sans libellé manquant |

Ordre de chargement : `sha256.js → data.js → store.js → i18n.js → i18n-en.js → ui.js → views-*.js → assistant.js → app.js` (attribut `defer`).

### Langues de l'interface

Le sélecteur FR | EN du menu principal bascule toute l'interface (menus, libellés, messages, pages statiques, titres et descriptions) ; le choix est conservé sur l'appareil et synchronisé entre onglets. Les données (matières, chapitres, offres, profils, programmes, valeurs enregistrées, e-mails et notifications déjà émis) restent dans leur langue d'origine. Pour ajouter un libellé : l'écrire en français dans `t('…')` (guillemets simples, `{paramètres}` nommés) et ajouter sa traduction dans `i18n-en.js` ; `tests/i18n.test.cjs` échoue sinon.

### Flux d'une interaction

1. Un formulaire porte `data-form="nom"`, un bouton `data-action="nom"` (option `data-confirm`), un champ `data-change="nom"`.
2. `app.js` intercepte l'événement, construit un contexte `{ store, state, user, ui, params, data }` et appelle le gestionnaire enregistré.
3. Le gestionnaire appelle le store, qui valide, applique la mutation de façon atomique (copie, validation complète de l'état, sauvegarde ; restauration en cas d'erreur) et contrôle le rôle de la session.
4. Le gestionnaire renvoie un message ou `{ go, message }` ; l'application re-rend la page ou navigue.

Les vues sont des fonctions pures `(ctx) => HTML` ; toutes les valeurs affichées passent par `escape`.

### Assistant ONTRACK (`assistant.js`)

Extension hors cahier des charges : un chatbot **simulé**, sans réseau ni intelligence artificielle. Le libellé permanent du panneau l'indique : « Assistant simulé : réponses préprogrammées, sans intelligence artificielle ni envoi de données ».

- **Normalisation** (`normalize`) : minuscules, accents retirés (NFD), ponctuation remplacée par des espaces.
- **Intentions** (`INTENTS`) : 15 intentions et un repli, soit 16 cas (salutation, tarifs, réservation, annulation, paiement, forfaits, progression, orientation, filières, devenir tuteur, Study Pods, compte, données personnelles, contact, projet). Chacune déclare des mots-clés français et anglais pondérés : mot exact, expression, ou radical terminé par `*`. Le score est la somme des poids présents, plus un bonus quand la question cite une destination (nom, ville, pays) ou un sigle de filière. Le score le plus haut l'emporte ; à égalité, l'ordre de la table ; la salutation (et les remerciements) ne l'emporte que si aucune autre intention n'a de score ; à 0, le repli (« Je n'ai pas compris » et 4 suggestions).
- **Réponses** : calculées à chaque question à partir de l'état (`offers`, `config.policy`, `config.provider`, tuteurs `approved`, `subjects`, `programs` actifs et leurs `seats`, `constants.trackGroups`, `pods.locations`). Un tarif ou un délai modifié par l'administration est donc cité tel quel. Les effectifs d'une destination sont repris liste par liste, jamais additionnés ; un critère non communiqué n'est jamais inventé ; aucune admission n'est promise.
- **Personnalisation** : seules les données de l'utilisateur connecté sont lues (forfaits `active`, séances à venir, paiements non aboutis, comptes rendus, niveau et filière). Un visiteur est invité à se connecter, sans aucune donnée personnelle.
- **Langue** : `t` vaut par défaut un simple remplacement des `{paramètres}` (Node) ; le navigateur passe `O.i18n.t`. Les données (offres, établissements, filières, libellés de places) ne sont pas traduites. À chaque changement de langue, l'historique est recalculé dans la nouvelle langue.
- **Sécurité** : la saisie (1 à 300 caractères, `validate`) n'est jamais reprise dans la réponse ; l'interface échappe la question et la réponse. Les liens proviennent de la liste fixe `ROUTES` (routes internes uniquement).
- **Interface** (`index.html`, `app.js`, `styles.css`) : bulle fixe hors de `<main>`, panneau `role="dialog"` `aria-modal="false"` (Échap ferme et rend le focus au bouton), historique `role="log"` `aria-live="polite"`, puces de suggestions, formulaire traité hors du registre des vues. L'historique (`memory.assistant`, 40 échanges maximum) reste en mémoire d'onglet : ni enregistré ni envoyé, vidé à la déconnexion et à la réinitialisation (`O.clearMemory`) ainsi qu'à tout changement de compte dans l'onglet.
- **Évolution vers une vraie IA** : un modèle de langage exigerait un **backend** (clé d'API jamais exposée au navigateur), un appel réseau explicite et consenti, une politique de conservation des questions, des garde-fous (pas de promesse d'admission, réponses limitées aux données ONTRACK) et une mention dans la politique de confidentialité. Le module à règles pourrait alors servir de repli hors ligne et de jeu de tests de non-régression.

### Discussions entre étudiants (chat simulé)

Extension hors cahier des charges, **sans serveur ni réseau** : salons par filière et par matière, discussions privées entre étudiants (réels ou personas fictives), signalement et modération. La limite « pas de chat entre appareils » est affichée dans l'onglet.

- **Modèle** (`state.chat`) : `rooms[{ id, name, kind (track/subject), track?, subjectId? }]` (Tronc commun, Gestion, Commerce, Finance, Comptabilité générale, Statistiques) ; `personas[{ id, name, encg, track }]` (4 personas dont le nom porte « (fictive) ») ; `messages[{ id, roomId|null, threadId|null, fromId|null, fromName, text, created, reported, reportReason, reportedBy?, reportedAt?, hidden, moderatedAt? }]` ; `threads[{ id, members: [id, id], created }]` ; `pending[{ id, due, roomId|null, threadId|null, personaId, text, forUserId }]` (réponses simulées planifiées). Le jeu initial contient 2 messages d'amorce par salon.
- **API du store** : `chatPost({ roomId | threadId, text })` (étudiants seulement, 1 à 500 caractères ; renvoie `{ message, warning }`, `warning` non vide si le texte contient une adresse e-mail ou un numéro de 9 chiffres ou plus : le message est publié quand même) ; `chatStartThread(otherId)` (étudiant actif ou persona, sans doublon) ; `chatReport(messageId, reason)` (refus pour son propre message, un message non visible ou déjà signalé ; notifie l'administration) ; `chatHide(messageId, hidden)` (admin, messages signalés seulement) ; `chatView(conversationId)` (salons, fils de l'utilisateur, contacts, messages visibles, réponses attendues) ; `chatReported()` (admin : messages signalés uniquement).
- **Personas** : un message dans un salon, ou dans un fil avec une persona, planifie une réponse 2 à 6 s plus tard sur l'horloge du store (une seule réponse en attente par discussion). Le texte est choisi par mots-clés (texte sans accents) dans `data.chatReplies`, sinon dans `data.chatFallback`. `tick()` distribue les réponses arrivées à échéance et retire l'entrée `pending` ; un message privé reçu (d'un étudiant ou d'une persona) crée une notification locale.
- **Session par onglet** : dans le navigateur, `app.js` passe `sessionStorage` au store. La session est lue et écrite sous la clé `ontrack-session-v3` de l'onglet et n'est jamais écrite dans `localStorage` : se connecter dans un onglet ne connecte pas les autres, recharger l'onglet garde la session. Sans `sessionStore` (tests Node), la session reste dans l'état, comme avant. Conséquences : un lien ouvert dans un nouvel onglet démarre déconnecté ; un onglet dupliqué copie la session de l'onglet d'origine ; se déconnecter dans un onglet ne déconnecte pas les autres. Exception : la réinitialisation du mot de passe enregistre `user.sessionsRevokedAt` dans l'état partagé, et toute session ouverte avant cet instant (`session.created`) est refusée dans tous les onglets.
- **Synchronisation entre onglets** : chaque transaction (la plus externe) relit d'abord l'état partagé (`refresh()`) en gardant la session de l'onglet ; l'état n'est réécrit que s'il a changé (une simple navigation n'écrit rien et ne réveille pas les autres onglets). `app.js` écoute l'événement `storage` sur `ontrack-demo-v3` : il appelle `store.refresh()`, met à jour le compteur de notifications de l'en-tête et ne réaffiche que la vue `#etudiant/discussions` ; un formulaire en cours ailleurs (réservation, profil…) n'est jamais réinitialisé. Le brouillon (`memory.chatDraft`), le champ actif et la position du curseur sont conservés au réaffichage. Une minuterie d'une seconde, active seulement sur Discussions quand une réponse simulée est attendue, rappelle le rendu. Un état illisible écrit par un autre onglet n'est pas adopté et un avertissement demande de recharger la page.
- **Confidentialité** : une discussion privée n'est visible que par ses deux membres ; l'administration ne voit que les messages signalés (`chatReported`). La sauvegarde administrateur (`exportData`) exclut les discussions privées et les notifications « Nouveau message privé de … » (qui révéleraient qui écrit à qui) ; à la restauration, les discussions privées en cours et ces notifications sont conservées tant que leurs membres existent encore. En salon, les réponses des personas ne citent jamais le prénom de l'étudiant (il ne survit donc pas à la suppression du compte) ; en discussion privée, le prénom est inséré sans interprétation des caractères spéciaux (`$&`, `$'`…). À la suppression d'un compte, ses fils privés (et leurs messages) et les réponses planifiées pour lui sont supprimés ; ses messages de salon passent à « Compte supprimé ».
- **Migration** : un état v3 sans collection `chat` (enregistré avant cette évolution) reçoit le chat du jeu initial au chargement, à la relecture et à l'import, sans réinitialiser le reste.
- **Limites** : pas d'échange entre appareils ni entre navigateurs ; deux écritures exactement simultanées dans deux onglets restent théoriquement concurrentes (`localStorage` n'a pas de verrou) — la relecture avant chaque écriture rend ce cas négligeable en démonstration.
- **Évolution vers un vrai chat** : un service temps réel (WebSocket, par exemple Socket.IO, ou un service géré) adossé à l'API ; messages en base avec contrôle d'accès serveur par discussion, file de modération côté serveur, limitation de débit, conservation définie dans la politique de confidentialité et, le cas échéant, détection automatique des coordonnées avant publication. Les fonctions `chat*` du store donnent le contrat de cette API.

## 3. Modèle de données (v3)

| Collection | Contenu principal |
| --- | --- |
| `config` | `domains` (ENCG → domaines autorisés), `policy` (`cancelHours`, `rescheduleHours`, `holdMinutes`, `reminderHours`, `priorityHours`, `terminationRefund`, `sessionHours`, `lockMinutes`, `maxAttempts`), `payout` (`phase` volunteer/paid, `rates` par service), `feeRate`, `provider` (CMI/Payzone), `paymentSecret` |
| `encgs`, `levels` | 12 ENCG ; niveaux S1–S10 (modifiables) |
| `subjects` | `{ id, name, level, chapters: [{ id, name }] }` |
| `users` | `{ id, role (student/tutor/admin), name, email, salt, hash, verified, status (active/suspended), encg, level, track, failed, lockedUntil, lastLogin }` |
| `session` | `{ userId, expires, token }` (glissante, 2 h). Dans le navigateur : propre à l'onglet (`sessionStorage`, clé `ontrack-session-v3`), toujours `null` dans `localStorage` |
| `throttle` | Échecs de connexion par adresse, y compris inexistante : `{ failed, lockedUntil }` |
| `codes` | Codes de vérification et de réinitialisation **hachés**, expiration 30 min, 5 essais |
| `emails` | Boîte simulée : `{ to, kind, subject, lines, created, read, bookingId? }` |
| `tutors` | `{ id (= id du compte), name, encg, level, bio, subjects, chapters, languages, modes, services, slots, prioritySlots, blocked[{id,start,end,reason}], photo, photoConsent, age, showAge, status (pending/approved/suspended/deleted) }` |
| `offers` | 4 offres du §8 : prix, durée, crédits, validité, contenu, objectif, public |
| `bookings` | `{ id, studentId, studentName, tutorId, offerId, start, minutes, price, status (pending/confirmed/completed/cancelled/absent/failed), holdUntil, transactionId, packageId, need{encg, level, subjectId, chapterId, difficulty, mode, wishes, text, attachment{name,size,type}}, report, payout{amount, phase, payoutId}, reminded, cancellation }` |
| `transactions` | `{ id, orderId, kind (payment/refund), studentId, bookingId, offerId, amount, fee, status (pending/paid/failed/refunded), provider, failureReason }` |
| `packages` | `{ offerId, total, remaining, creditValues[], expires, status (active/expired/terminated) }` |
| `reviews` | `{ bookingId, rating, text, reported, reportReason, hidden, resolution }` |
| `payouts` | Versements aux tuteurs : `{ tutorId, amount, bookingIds, reference }` |
| `programs` | Destinations communiquées par l'ENCG : `{ id, name, institution, country, city, mobility, seats[{label, count}], level, tracks, minGrade, languageReq{language, level}, deadline, documents, source (https://…), sourceNote, active }`. Un critère non communiqué vaut `null` (ou `[]` pour `tracks` et `documents`) et s'affiche « À confirmer auprès de l'ENCG ». `seats` garde chaque liste séparément (jamais de total) |
| `orientationProfiles`, `consultations` | Profil d'orientation minimal ; demandes d'entretien |
| `pods` | `locations` (statut « en étude »), `subscribers`, `prototype` (jetons QR à usage unique, réservés à l'admin) |
| `messages`, `notifications` | Contact ; notifications in-app par `userId` |
| `chat` | Discussions entre étudiants : `rooms`, `personas`, `messages`, `threads`, `pending` (voir « Discussions entre étudiants ») |

Chaque mutation revalide tout l'état (`valid()`) : types, énumérations, unicité des identifiants et des adresses, références (tuteur, chapitres), photos limitées aux fichiers locaux, liens de programme limités à des URL `https://` valides (refus de `http://` et `javascript:`), places en nombres entiers positifs ou nuls. Un état local invalide n'est jamais écrasé : la session passe en mode mémoire avec un avertissement. Les anciens états v1 et v2 (`ontrack-demo-v1`, `ontrack-demo-v2`) sont ignorés et supprimés ; la v3 repart du jeu initial, sans migration. Deux exceptions additives, sans changer `VERSION` : un état v3 sans collection `chat` reçoit le chat du jeu initial ; un état v3 sans le tuteur `t4` (encadrante) reçoit la matière `anglais-com`, le compte et le profil `t4` du jeu initial, sauf si l'adresse ou un identifiant de chapitre est déjà pris (une matière supprimée ensuite n'est jamais réinsérée). Le reste est conservé. Un niveau hors de la liste `levels` (ex. « Professeure » pour `t4`) est toléré sur un profil tuteur : `setLevels` ne protège contre le retrait que les niveaux de la liste actuelle, et `updateTutorProfile` accepte de conserver le niveau hors liste déjà attribué, sans permettre d'en choisir un nouveau. `valid()` contrôle aussi le chat : salons, personas « (fictive) », fils à deux membres existants, messages de 1 à 500 caractères rattachés à un salon ou à un fil, réponses planifiées datées.

### Filières (`data.js`)

`constants.trackGroups` regroupe les filières réelles par cycle, d'après les plannings 2025-2026 de l'ENCG Casablanca : années préparatoires (S1–S4, Tronc commun), cycle du diplôme 1re année (S5–S6, Gestion et Commerce), cycle du diplôme 2e année et au-delà (S7–S10, Finance, CAC, MRH, PSCM, BA, MD, MAC, CI) et ancien régime (S9–S10, GFC, ACG, ML). `constants.tracks` en est la liste à plat ; `tracksFor(level)` et `trackGroupsFor(level)` donnent les filières d'un niveau. Un niveau absent des cycles (créé par l'administration) accepte toutes les filières. `register`, `updateProfile` et `saveOrientationProfile` refusent une filière incohérente avec le niveau. Les formulaires affichent un `<select>` à `<optgroup>` par cycle, reconstruit au changement de niveau (`O.change('level-tracks')`). Les intitulés développés des sigles restent à confirmer.

### Jeu initial

- Comptes (mot de passe `Demo2026!`, admin `Admin2026!`) : Salma (étudiante, sans historique), Omar (abonné Stay ONTRACK avec deux séances terminées, comptes rendus et avis), Yassine et Lina (tuteurs publiés), Adam (tuteur en attente de validation), administrateur.
- 30 créneaux par tuteur (J+1 à J+10, 10 h, 14 h, 18 h heure marocaine), créneaux prioritaires Stay, 6 matières et 27 chapitres, 9 destinations communiquées par l'ENCG (places et liens officiels, critères d'admission « à confirmer »), 3 lieux Study Pods « en étude », 6 salons de discussion avec 2 messages d'amorce chacun et 4 personas fictives. Salma est en S6, filière Gestion ; Omar en S3, Tronc commun.

## 4. Règles métier implémentées

- **Inscription (§5)** : domaine de l'adresse comparé aux domaines de l'ENCG choisie ; compte non vérifié ; code à 6 chiffres envoyé (haché en base, 30 min, 5 essais) ; vérification → compte activé, e-mail de bienvenue, session ouverte. Les tuteurs passent ensuite en validation.
- **Connexion (§5.4)** : 5 échecs consécutifs → blocage 15 min, avec le même message que l'adresse existe ou non ; session glissante de 2 h ; déconnexion explicite ; réinitialisation par code (message neutre) qui ferme les sessions ; suppression de compte avec mot de passe.
- **Réservation (§10)** : contrôle du créneau (`slotIssue`) : tuteur validé, créneau proposé et futur, hors période bloquée, sans chevauchement tuteur ni étudiant (réservations confirmées, terminées ou en attente non expirées), règle prioritaire Stay (non-abonnés seulement à moins de `priorityHours`), validité du forfait. Une réservation payante est créée `pending` avec une transaction `pending` et retient le créneau `holdMinutes` (15 min).
- **Paiement (§11)** : la passerelle simulée émet une notification `{ orderId, status, amount, signature }` avec `signature = sha256(secret + orderId + statut + montant à 2 décimales)`. `paymentNotification` ignore sans effet une commande inconnue, une signature invalide, un montant incohérent ou une transaction déjà finalisée (rejeu). Acceptée : transaction `paid` + frais, réservation `confirmed`, forfait créé le cas échéant, e-mails « Paiement confirmé » et « Réservation confirmée », notification et e-mail au tuteur. Refusée/abandonnée/expirée : `failed`, créneau libéré, e-mail d'échec, nouvel essai (`retryBooking`).
- **Tâches périodiques (`tick`)** : expiration des retenues, rappels avant séance (une fois, `reminderHours`), expiration des forfaits (e-mail d'information), distribution des réponses simulées des discussions arrivées à échéance. Exécutées à chaque rendu et avant chaque mutation.
- **Annulation (§10.3)** : étudiant jusqu'à `cancelHours` avant le début (sinon refus : séance due) ; tuteur et administrateur à tout moment avant le début. Séance de forfait encore valide → crédit restitué (expiration inchangée) ; sinon remboursement de la valeur historique. Modification jusqu'à `rescheduleHours`. Absence constatée par le tuteur → séance due.
- **Forfaits (§8.3–8.4)** : Exam Rescue 3 × 90 min sur `days` jours ; Stay ONTRACK 4 × 60 min sur un mois calendaire marocain (borné en fin de mois). Répartition au centime des crédits (`creditValues`). Planification depuis Mes forfaits ; résiliation (séances planifiées maintenues, non planifiées remboursées si `terminationRefund`).
- **Compte rendu (§13)** : réservé au tuteur de la séance, après sa fin ; six rubriques : 1) matière et chapitres avec leur statut, 2) notions abordées, 3) exercices travaillés, 4) difficultés identifiées, 5) points à réviser, 6) recommandations, toutes obligatoires ; statut par chapitre : à étudier, en cours d'apprentissage, révisé, maîtrisé.
- **Progression** : par matière, % = chapitres au statut ≠ « à étudier » / chapitres de la matière ; le statut d'un chapitre est celui du dernier compte rendu. Méthode affichée à côté du pourcentage.
- **Avis (§7.3)** : un avis par séance terminée, réservé au participant ; signalement par le tuteur → file de modération ; un avis masqué est exclu de la moyenne.
- **Rémunération (§9)** : phase volontaire → 0 DH ; phase rémunérée → tarif par séance (§9.2 : 30 / 90 / 75 / 50 DH) figé au compte rendu (ou à l'absence). Versements enregistrés par l'administrateur.
- **Suivi financier (§9.3)** : chiffre d'affaires, remboursements, frais, sommes dues et versées, recettes par service, montant conservé avant autres coûts (présenté comme non assimilable au bénéfice net).
- **Orientation (§14)** : six critères explicites par programme (filière, niveau, moyenne, langue CECRL, destination, type de mobilité). Un critère dont la donnée n'est pas communiquée (`null`) est marqué `unknown` : affiché « À confirmer auprès de l'ENCG » avec une icône « ? », ni rempli ni bloquant, exclu de `met` et `total`. « Potentiellement adapté » si tous les critères connus sont remplis et que la date limite, si elle existe, n'est pas dépassée, sinon « piste à explorer » ; jamais de garantie d'admission. Demande d'entretien avec e-mail de confirmation.
- **Study Pods (§15)** : présentation « Coming Soon » et formulaire d'actualités ; aucune réservation étudiante. Prototype QR administrateur : jeton aléatoire de 128 bits sans donnée personnelle, seul son hachage sert à la vérification, usage unique, expiration 2 h après le créneau. L'aperçu est un motif visuel dérivé du hachage, **non scannable**.

## 5. Sécurité et protection des données

| Exigence | Démonstration | Production |
| --- | --- | --- |
| HTTPS | Non applicable en `file:` | Obligatoire (TLS 1.2+, HSTS) |
| Mots de passe | SHA-256 + sel : aléatoire de 128 bits pour les comptes créés ; sels fixes (`seed-<id>`) pour les comptes de démonstration du jeu initial | Argon2id / bcrypt (SHA-256 seul est trop rapide face au cassage hors ligne) |
| Sessions | Objet local avec expiration, propre à chaque onglet (`sessionStorage`) | Cookie de session serveur, rotation à la connexion |
| Contrôles d'accès | Chaque fonction du store vérifie la session et le rôle ; le routeur redirige vers la connexion | Contrôle côté serveur sur chaque requête |
| Notifications de paiement | Signature SHA-256 vérifiée, idempotence | HMAC du prestataire, vérification serveur, journal |
| Documents transmis | Métadonnées seulement (PDF/JPG/PNG, 5 Mo) | Stockage objet privé, URL signées, antivirus |
| Données bancaires | Jamais saisies | Traitées uniquement par le prestataire (PCI DSS) |
| Indexation | `noindex` dynamique sur espaces privés, `robots.txt` | Idem + en-têtes `X-Robots-Tag` |
| Échappement | `escape()` sur toute valeur affichée (test dédié) | Idem + Content-Security-Policy |

**Codes de vérification** : hachés dans `state.codes` (SHA-256 + sel du compte), 30 min, 5 essais, 5 émissions par heure et par usage. Ils apparaissent en clair dans l'e-mail simulé (`#boite-mail`), comme dans une vraie boîte de réception. La boîte simulée est limitée à l'adresse du compte connecté et aux adresses saisies dans l'onglet ; faute de vraie boîte séparée, quelqu'un qui saisit l'adresse d'autrui dans « Mot de passe oublié » peut lire le code dans cet onglet. Cette limite disparaît avec un vrai service e-mail.

**Limite assumée** : toutes les données, y compris les hachages et le secret de signature, sont lisibles dans le navigateur de démonstration. La séparation client/serveur est indispensable en production.

### Conservation (loi n° 09-08, CNDP)

Profil, orientation, avis et notifications : durée du compte, supprimés à la suppression du compte. Réservations et transactions : conservées anonymisées (nom remplacé, besoin effacé) pour les obligations comptables, durée à confirmer (10 ans proposée). Journal des tentatives de connexion : jusqu'au succès ou au déblocage. Messages des discussions : conservés localement dans le navigateur ; à la suppression du compte, discussions privées effacées et messages de salon anonymisés. Déclaration CNDP à déposer avant mise en production.

## 6. Routage et référencement (§19)

Routes par fragment : `accueil`, `presentation`, `connexion`, `inscription`, `inscription-tuteur`, `verification`, `mot-de-passe-oublie`, `matieres[/id]`, `catalogue`, `profil/id`, `reserver[/tutorId]`, `paiement/bookingId`, `confirmation/bookingId`, `etudiant/{apercu,seances,historique,forfaits,progression,comptes-rendus,discussions[/salon ou fil],notifications,profil}`, `tuteur/{apercu,seances,profil,matieres,disponibilites,avis,historique,remuneration}`, `admin/{apercu,etudiants,tuteurs,domaines,referentiel,tarifs,politique,reservations,paiements,remunerations,moderation,orientation,pods,messages,sauvegarde}`, `orientation`, `pods`, `contact`, `cgu`, `confidentialite`, `mentions`, `boite-mail`.

- Chaque route définit un titre et une `meta description` ; les routes à rôle et les pages techniques reçoivent `robots: noindex, nofollow`.
- Structure sémantique : `header`, `nav`, `main`, `footer`, un seul `h1` par page (contrôlé), tableaux avec `th scope`.
- `sitemap.xml` liste les pages publiques sous forme de chemins lisibles (`https://ontrack.example.org/catalogue`) : en production, chaque route `#x` est servie au chemin `/x` (History API + réécriture serveur). Les moteurs ignorent les fragments, d'où cette correspondance documentée.
- Outils d'analyse : non intégrés (aucun appel réseau autorisé). Proposition : outil respectueux de la vie privée (Matomo auto-hébergé ou Plausible), sans cookie tiers, activé après consentement.
- Performances : aucune dépendance, images locales en `loading="lazy"` hors premier écran, CSS unique. En production : images WebP redimensionnées, cache HTTP, index de base sur `bookings(tutorId, start)` et `transactions(orderId)`, pagination des tableaux d'administration.

## 7. Services externes et coûts (à confirmer)

| Service | Usage | Coût indicatif | Statut |
| --- | --- | --- | --- |
| Paiement CMI | Cartes marocaines, passerelle 3-D Secure | Frais d'adhésion et commission par transaction selon contrat (souvent 1,5 à 3 %) | À confirmer |
| Paiement Payzone | Cartes, portefeuilles, paiement en agence | Commission par transaction selon contrat | À confirmer |
| E-mail transactionnel | Vérification, confirmations, rappels | Gratuit à ~25 € / mois selon volume | À choisir |
| Hébergement | Application + base PostgreSQL | 15 à 60 € / mois (VPS ou PaaS) | À choisir |
| Nom de domaine | `.ma` ou `.com` | ~150 à 300 DH / an | À réserver |
| Certificat TLS | HTTPS | Gratuit (Let's Encrypt) | — |
| Sauvegardes externes | Copie chiffrée hors site | ~5 € / mois | À choisir |
| Visioconférence | Lien de séance | Comptes gratuits ou ~15 € / mois / hôte | À choisir |

### Comparatif CMI / Payzone (« à confirmer »)

| Critère | CMI | Payzone | À vérifier |
| --- | --- | --- | --- |
| Frais | Adhésion + commission | Commission, offres packagées | Grille tarifaire écrite |
| Ouverture du compte marchand | Via banque partenaire, dossier société | Contrat direct | Délais, pièces exigées, statut juridique du porteur |
| Règlement | Virement bancaire périodique | Virement périodique | Délai de mise à disposition des fonds |
| Intégration | Page hébergée, notification serveur signée | API/page hébergée, notification | Environnement de test, documentation, signature |
| Remboursements | Via back-office | Via back-office/API | Remboursement partiel possible ? |
| Réglementation | Banque Al-Maghrib, 3-D Secure | Établissement de paiement agréé | Conformité de l'activité (contributions volontaires §9.1) |

Aucun prestataire n'est sélectionné : le choix (champ `provider`) est un paramètre administrateur de démonstration.

## 8. Hébergement, nom de domaine et mise en production

1. Réserver le domaine (proposition fictive : `ontrack.example.org`) et configurer DNS, TLS, SPF/DKIM/DMARC.
2. Déployer l'interface statique (CDN ou serveur web) et une API (Node.js) reprenant `store.js` côté serveur ; base PostgreSQL avec le modèle ci-dessus.
3. Remplacer la boîte simulée par le service e-mail, la passerelle simulée par le prestataire retenu (URL de notification serveur), la session locale par des cookies serveur.
4. Configurer les sauvegardes et la supervision.

La démonstration peut, en l'état, être déposée sur tout hébergeur statique (fichiers HTML, CSS, JS, `assets/`, `robots.txt`, `sitemap.xml`) ; les données restent propres à chaque navigateur.

## 9. Sauvegarde et restauration

- **Démonstration** : `#admin/sauvegarde` → « Exporter les données (JSON) » ; restauration par import d'un fichier JSON validé (refus d'un fichier illisible ou d'une version incompatible ; la session administrateur est conservée). L'export exclut les discussions privées ; la restauration conserve celles en cours dont les membres existent encore. Seules les sauvegardes v3 sont acceptées : un export v1 ou v2 est refusé (« Version locale incompatible »), sans migration. La réinitialisation recharge le jeu initial.
- **Production (proposition)** : sauvegarde quotidienne automatisée de la base (dump chiffré), conservation 30 jours, copie hors site hebdomadaire, test de restauration mensuel documenté, objectif de reprise 24 h.

## 10. Maintenance, propriété et transfert

- **Maintenance** : correctifs de sécurité sous 72 h, anomalies bloquantes sous 48 h ouvrées, évolutions sur devis ; mises à jour des dépendances serveur trimestrielles.
- **Propriété du code** : code source remis au porteur du projet à la livraison, selon les conditions contractuelles.
- **Transfert** : remise du dépôt Git, de cette documentation, des accès (registrar, hébergeur, prestataire de paiement, service e-mail) et des procédures de sauvegarde.
- **Accès** : administrateur fonctionnel (rôle `admin`), accès techniques nominatifs (hébergement, base, DNS), principe du moindre privilège, comptes révoqués à la fin de mission.

## 11. Tests

```sh
node --test tests/*.test.cjs
```

- `store.test.cjs` : SHA-256, inscription et domaines, blocage de connexion, sessions et rôles, réinitialisation, retenue de créneau et expiration, refus (pris, passé, bloqué, prioritaire, tuteur en attente, pièce jointe), créneau prioritaire Stay, notification signée (rejeu, signature, montant), échec et nouvel essai, annulation et absence, reprogrammation et chevauchements, compte rendu et progression, avis et modération, forfaits (centimes, épuisement, validité, résiliation, expiration), mois Stay, tarifs historiques, validation d'un tuteur nouvellement inscrit, rémunération et suivi financier, stockage et repli mémoire, persistance, suppression de compte, administration et export/import, rappels et e-mails du §12, orientation, Study Pods et QR, disponibilités, fichiers et SEO ; discussions sur deux stores partageant un même stockage avec deux sessions d'onglet : session par onglet (rechargement, absence dans l'état partagé, aucune écriture sur simple navigation), envoi en salon et réponse de persona planifiée entre 2 et 6 s puis distribuée par `tick`, rôles, longueur, coordonnées, discussion privée Salma → Omar (notification, invisible pour une tierce étudiante et pour l'admin, absente de la sauvegarde, conservée à la restauration), écritures alternées sans perte, état illisible d'un autre onglet, signalement, masquage et rétablissement, suppression de compte, migration d'un état v3 sans `chat`.
- `views.test.cjs` : rendu de chaque route pour chaque rôle, gestionnaires branchés pour chaque formulaire et action, absence de `undefined`/`NaN`, gardes et `noindex`, parcours §10.1 étape par étape, échappement des saisies ; onglet Discussions (rappel permanent, limite, salon de la filière, fil `aria-live`, brouillon, gestionnaires d'envoi, de discussion privée et de signalement, échappement) et section « Messages signalés » de la modération.
- `i18n.test.cjs` : traduction à la demande, messages composés du store, paramètres et balises identiques entre français et anglais, chaque clé `t('…')` et chaque message du store traduits, rendu anglais de chaque route et de chaque parcours sans libellé manquant, données non traduites.
- `assistant.test.cjs` : une phrase française et une phrase anglaise pour chacun des 16 cas (15 intentions et un repli), classement (salutation suivie d'une question, « stay » hors forfait, suppression d'une réservation, sigles de filières), normalisation (casse, accents), tarifs et délais repris de l'état (tarif modifié par l'admin), crédits Stay d'Omar, visiteur et tuteur sans donnée personnelle, effectifs jamais additionnés et critères non inventés, filières par niveau, repli et suggestions comprises, saisie vide ou de plus de 300 caractères, injection (l'échappement de l'interface est vérifié par lecture du source d'`app.js` et par contrôle manuel, pas par exécution d'`app.js`), liens limités à la liste fixe, libellés calculés présents dans le dictionnaire anglais, anglais sans clé manquante, module sans réseau ni stockage.
- Contrôles manuels complémentaires (non inclus dans le dépôt, à rejouer à la main ou avec un outil comme Chrome DevTools/Playwright ; réalisés une fois pendant le développement à 390 et 1440 px) : parcours §10.1 avec refus puis succès, blocage de connexion, inscription et vérification par la boîte mail, validation d'un tuteur, compte rendu et progression, absence de débordement à 390 et 1440 px sur toutes les routes, aucune erreur JavaScript. Discussions (contrôlé dans Chrome sans interface, piloté par le protocole DevTools) : deux onglets Salma et Omar, message privé reçu sans rechargement, brouillon et focus conservés, formulaire de réservation d'Omar intact quand Salma poste, réponse de persona dans un salon, signalement visible côté admin puis masquage, 390 px sans défilement horizontal.
