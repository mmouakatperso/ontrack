# ONTRACK — Documentation technique

Version 2 de la démonstration (clé de stockage `ontrack-demo-v2`). Ce document répond aux §18.4, §19 et §22 du cahier des charges : technologies, données, sécurité, hébergement, services externes, maintenance et transfert. La démonstration simule les services externes ; les écarts avec une mise en production sont signalés dans chaque section.

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
| `data.js` | Jeu initial v2 (`seed(now)`), conversion heure marocaine (`moroccoInstant`, `moroccoDay`), constantes, comptes de démonstration |
| `store.js` | Toute la logique métier, sans DOM : `createStore(storage, clock)` |
| `i18n.js` | Langue de l'interface (français par défaut, anglais) : `t('Libellé {param}', { param })`, traduction des messages du store à l'affichage (`message`), choix mémorisé dans `localStorage` (clé `ontrack-lang`), formats de date et de nombre selon la langue |
| `i18n-en.js` | Dictionnaire anglais : clé = libellé français exact. Seuls les libellés de l'interface sont traduits, jamais les données |
| `ui.js` | Registre des routes et des gestionnaires (`Ontrack.route/form/action/change`) et aides de rendu (`escape`, `money`, `date`, `select`, `field`, `head`…) |
| `views-public.js` | Pages publiques, authentification, catalogue, orientation, Study Pods, pages légales, boîte mail |
| `views-student.js` | Assistant de réservation, paiement, confirmation, espace étudiant |
| `views-tutor.js` | Espace tuteur |
| `views-admin.js` | Espace administrateur, prototype QR |
| `app.js` | Création du store, routeur par fragment, gardes de rôle, titre/description/robots par page, délégation `submit`/`click`/`change` |
| `robots.txt`, `sitemap.xml` | Référencement (§19) |
| `tests/store.test.cjs` | Tests métier (matrice de la spécification) |
| `tests/views.test.cjs` | Rendu de toutes les routes sans navigateur, gardes, échappement, branchement des gestionnaires |
| `tests/i18n.test.cjs` | Moteur de traduction, intégrité du dictionnaire anglais, couverture des clés du code et des messages du store, rendu anglais de toutes les routes sans libellé manquant |

Ordre de chargement : `sha256.js → data.js → store.js → i18n.js → i18n-en.js → ui.js → views-*.js → app.js` (attribut `defer`).

### Langues de l'interface

Le sélecteur FR | EN du menu principal bascule toute l'interface (menus, libellés, messages, pages statiques, titres et descriptions) ; le choix est conservé sur l'appareil et synchronisé entre onglets. Les données (matières, chapitres, offres, profils, programmes, valeurs enregistrées, e-mails et notifications déjà émis) restent dans leur langue d'origine. Pour ajouter un libellé : l'écrire en français dans `t('…')` (guillemets simples, `{paramètres}` nommés) et ajouter sa traduction dans `i18n-en.js` ; `tests/i18n.test.cjs` échoue sinon.

### Flux d'une interaction

1. Un formulaire porte `data-form="nom"`, un bouton `data-action="nom"` (option `data-confirm`), un champ `data-change="nom"`.
2. `app.js` intercepte l'événement, construit un contexte `{ store, state, user, ui, params, data }` et appelle le gestionnaire enregistré.
3. Le gestionnaire appelle le store, qui valide, applique la mutation de façon atomique (copie, validation complète de l'état, sauvegarde ; restauration en cas d'erreur) et contrôle le rôle de la session.
4. Le gestionnaire renvoie un message ou `{ go, message }` ; l'application re-rend la page ou navigue.

Les vues sont des fonctions pures `(ctx) => HTML` ; toutes les valeurs affichées passent par `escape`.

## 3. Modèle de données (v2)

| Collection | Contenu principal |
| --- | --- |
| `config` | `domains` (ENCG → domaines autorisés), `policy` (`cancelHours`, `rescheduleHours`, `holdMinutes`, `reminderHours`, `priorityHours`, `terminationRefund`, `sessionHours`, `lockMinutes`, `maxAttempts`), `payout` (`phase` volunteer/paid, `rates` par service), `feeRate`, `provider` (CMI/Payzone), `paymentSecret` |
| `encgs`, `levels` | 12 ENCG ; niveaux S1–S10 (modifiables) |
| `subjects` | `{ id, name, level, chapters: [{ id, name }] }` |
| `users` | `{ id, role (student/tutor/admin), name, email, salt, hash, verified, status (active/suspended), encg, level, track, failed, lockedUntil, lastLogin }` |
| `session` | `{ userId, expires, token }` (glissante, 2 h) |
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
| `programs` | `{ name, institution, country, mobility, level, tracks, minGrade, languageReq{language, level}, deadline, documents, source (https://example.org/…), active }` |
| `orientationProfiles`, `consultations` | Profil d'orientation minimal ; demandes d'entretien |
| `pods` | `locations` (statut « en étude »), `subscribers`, `prototype` (jetons QR à usage unique, réservés à l'admin) |
| `messages`, `notifications` | Contact ; notifications in-app par `userId` |

Chaque mutation revalide tout l'état (`valid()`) : types, énumérations, unicité des identifiants et des adresses, références (tuteur, chapitres), photos limitées aux fichiers locaux, liens de programme limités à `example.org`. Un état local invalide n'est jamais écrasé : la session passe en mode mémoire avec un avertissement. Un ancien état v1 (`ontrack-demo-v1`) est ignoré et supprimé ; la v2 repart du jeu initial, sans migration.

### Jeu initial

- Comptes (mot de passe `Demo2026!`, admin `Admin2026!`) : Salma (étudiante, sans historique), Omar (abonné Stay ONTRACK avec deux séances terminées, comptes rendus et avis), Yassine et Lina (tuteurs publiés), Adam (tuteur en attente de validation), administrateur.
- 30 créneaux par tuteur (J+1 à J+10, 10 h, 14 h, 18 h heure marocaine), créneaux prioritaires Stay, 6 matières et 27 chapitres, 6 programmes fictifs, 3 lieux Study Pods « en étude ».

## 4. Règles métier implémentées

- **Inscription (§5)** : domaine de l'adresse comparé aux domaines de l'ENCG choisie ; compte non vérifié ; code à 6 chiffres envoyé (haché en base, 30 min, 5 essais) ; vérification → compte activé, e-mail de bienvenue, session ouverte. Les tuteurs passent ensuite en validation.
- **Connexion (§5.4)** : 5 échecs consécutifs → blocage 15 min, avec le même message que l'adresse existe ou non ; session glissante de 2 h ; déconnexion explicite ; réinitialisation par code (message neutre) qui ferme les sessions ; suppression de compte avec mot de passe.
- **Réservation (§10)** : contrôle du créneau (`slotIssue`) : tuteur validé, créneau proposé et futur, hors période bloquée, sans chevauchement tuteur ni étudiant (réservations confirmées, terminées ou en attente non expirées), règle prioritaire Stay (non-abonnés seulement à moins de `priorityHours`), validité du forfait. Une réservation payante est créée `pending` avec une transaction `pending` et retient le créneau `holdMinutes` (15 min).
- **Paiement (§11)** : la passerelle simulée émet une notification `{ orderId, status, amount, signature }` avec `signature = sha256(secret + orderId + statut + montant à 2 décimales)`. `paymentNotification` ignore sans effet une commande inconnue, une signature invalide, un montant incohérent ou une transaction déjà finalisée (rejeu). Acceptée : transaction `paid` + frais, réservation `confirmed`, forfait créé le cas échéant, e-mails « Paiement confirmé » et « Réservation confirmée », notification et e-mail au tuteur. Refusée/abandonnée/expirée : `failed`, créneau libéré, e-mail d'échec, nouvel essai (`retryBooking`).
- **Tâches périodiques (`tick`)** : expiration des retenues, rappels avant séance (une fois, `reminderHours`), expiration des forfaits (e-mail d'information). Exécutées à chaque rendu et avant chaque mutation.
- **Annulation (§10.3)** : étudiant jusqu'à `cancelHours` avant le début (sinon refus : séance due) ; tuteur et administrateur à tout moment avant le début. Séance de forfait encore valide → crédit restitué (expiration inchangée) ; sinon remboursement de la valeur historique. Modification jusqu'à `rescheduleHours`. Absence constatée par le tuteur → séance due.
- **Forfaits (§8.3–8.4)** : Exam Rescue 3 × 90 min sur `days` jours ; Stay ONTRACK 4 × 60 min sur un mois calendaire marocain (borné en fin de mois). Répartition au centime des crédits (`creditValues`). Planification depuis Mes forfaits ; résiliation (séances planifiées maintenues, non planifiées remboursées si `terminationRefund`).
- **Compte rendu (§13)** : réservé au tuteur de la séance, après sa fin ; six rubriques : 1) matière et chapitres avec leur statut, 2) notions abordées, 3) exercices travaillés, 4) difficultés identifiées, 5) points à réviser, 6) recommandations, toutes obligatoires ; statut par chapitre : à étudier, en cours d'apprentissage, révisé, maîtrisé.
- **Progression** : par matière, % = chapitres au statut ≠ « à étudier » / chapitres de la matière ; le statut d'un chapitre est celui du dernier compte rendu. Méthode affichée à côté du pourcentage.
- **Avis (§7.3)** : un avis par séance terminée, réservé au participant ; signalement par le tuteur → file de modération ; un avis masqué est exclu de la moyenne.
- **Rémunération (§9)** : phase volontaire → 0 DH ; phase rémunérée → tarif par séance (§9.2 : 30 / 90 / 75 / 50 DH) figé au compte rendu (ou à l'absence). Versements enregistrés par l'administrateur.
- **Suivi financier (§9.3)** : chiffre d'affaires, remboursements, frais, sommes dues et versées, recettes par service, montant conservé avant autres coûts (présenté comme non assimilable au bénéfice net).
- **Orientation (§14)** : six critères explicites par programme (filière, niveau, moyenne, langue CECRL, destination, type de mobilité) ; « potentiellement adapté » si tous sont remplis, sinon « piste à explorer » ; jamais de garantie d'admission. Demande d'entretien avec e-mail de confirmation.
- **Study Pods (§15)** : présentation « Coming Soon » et formulaire d'actualités ; aucune réservation étudiante. Prototype QR administrateur : jeton aléatoire de 128 bits sans donnée personnelle, seul son hachage sert à la vérification, usage unique, expiration 2 h après le créneau. L'aperçu est un motif visuel dérivé du hachage, **non scannable**.

## 5. Sécurité et protection des données

| Exigence | Démonstration | Production |
| --- | --- | --- |
| HTTPS | Non applicable en `file:` | Obligatoire (TLS 1.2+, HSTS) |
| Mots de passe | SHA-256 + sel : aléatoire de 128 bits pour les comptes créés ; sels fixes (`seed-<id>`) pour les comptes de démonstration du jeu initial | Argon2id / bcrypt (SHA-256 seul est trop rapide face au cassage hors ligne) |
| Sessions | Objet local avec expiration | Cookie de session serveur, rotation à la connexion |
| Contrôles d'accès | Chaque fonction du store vérifie la session et le rôle ; le routeur redirige vers la connexion | Contrôle côté serveur sur chaque requête |
| Notifications de paiement | Signature SHA-256 vérifiée, idempotence | HMAC du prestataire, vérification serveur, journal |
| Documents transmis | Métadonnées seulement (PDF/JPG/PNG, 5 Mo) | Stockage objet privé, URL signées, antivirus |
| Données bancaires | Jamais saisies | Traitées uniquement par le prestataire (PCI DSS) |
| Indexation | `noindex` dynamique sur espaces privés, `robots.txt` | Idem + en-têtes `X-Robots-Tag` |
| Échappement | `escape()` sur toute valeur affichée (test dédié) | Idem + Content-Security-Policy |

**Codes de vérification** : hachés dans `state.codes` (SHA-256 + sel du compte), 30 min, 5 essais, 5 émissions par heure et par usage. Ils apparaissent en clair dans l'e-mail simulé (`#boite-mail`), comme dans une vraie boîte de réception. La boîte simulée est limitée à l'adresse du compte connecté et aux adresses saisies dans l'onglet ; faute de vraie boîte séparée, quelqu'un qui saisit l'adresse d'autrui dans « Mot de passe oublié » peut lire le code dans cet onglet. Cette limite disparaît avec un vrai service e-mail.

**Limite assumée** : toutes les données, y compris les hachages et le secret de signature, sont lisibles dans le navigateur de démonstration. La séparation client/serveur est indispensable en production.

### Conservation (loi n° 09-08, CNDP)

Profil, orientation, avis et notifications : durée du compte, supprimés à la suppression du compte. Réservations et transactions : conservées anonymisées (nom remplacé, besoin effacé) pour les obligations comptables, durée à confirmer (10 ans proposée). Journal des tentatives de connexion : jusqu'au succès ou au déblocage. Déclaration CNDP à déposer avant mise en production.

## 6. Routage et référencement (§19)

Routes par fragment : `accueil`, `presentation`, `connexion`, `inscription`, `inscription-tuteur`, `verification`, `mot-de-passe-oublie`, `matieres[/id]`, `catalogue`, `profil/id`, `reserver[/tutorId]`, `paiement/bookingId`, `confirmation/bookingId`, `etudiant/{apercu,seances,historique,forfaits,progression,comptes-rendus,notifications,profil}`, `tuteur/{apercu,seances,profil,matieres,disponibilites,avis,historique,remuneration}`, `admin/{apercu,etudiants,tuteurs,domaines,referentiel,tarifs,politique,reservations,paiements,remunerations,moderation,orientation,pods,messages,sauvegarde}`, `orientation`, `pods`, `contact`, `cgu`, `confidentialite`, `mentions`, `boite-mail`.

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

- **Démonstration** : `#admin/sauvegarde` → « Exporter les données (JSON) » ; restauration par import d'un fichier JSON validé (refus d'un fichier illisible ou d'une version incompatible ; la session administrateur est conservée). La réinitialisation recharge le jeu initial.
- **Production (proposition)** : sauvegarde quotidienne automatisée de la base (dump chiffré), conservation 30 jours, copie hors site hebdomadaire, test de restauration mensuel documenté, objectif de reprise 24 h.

## 10. Maintenance, propriété et transfert

- **Maintenance** : correctifs de sécurité sous 72 h, anomalies bloquantes sous 48 h ouvrées, évolutions sur devis ; mises à jour des dépendances serveur trimestrielles.
- **Propriété du code** : code source remis au porteur du projet à la livraison, selon les conditions contractuelles.
- **Transfert** : remise du dépôt Git, de cette documentation, des accès (registrar, hébergeur, prestataire de paiement, service e-mail) et des procédures de sauvegarde.
- **Accès** : administrateur fonctionnel (rôle `admin`), accès techniques nominatifs (hébergement, base, DNS), principe du moindre privilège, comptes révoqués à la fin de mission.

## 11. Tests

```sh
node --test tests/store.test.cjs tests/views.test.cjs tests/i18n.test.cjs
```

- `store.test.cjs` : SHA-256, inscription et domaines, blocage de connexion, sessions et rôles, réinitialisation, retenue de créneau et expiration, refus (pris, passé, bloqué, prioritaire, tuteur en attente, pièce jointe), créneau prioritaire Stay, notification signée (rejeu, signature, montant), échec et nouvel essai, annulation et absence, reprogrammation et chevauchements, compte rendu et progression, avis et modération, forfaits (centimes, épuisement, validité, résiliation, expiration), mois Stay, tarifs historiques, validation d'un tuteur nouvellement inscrit, rémunération et suivi financier, stockage et repli mémoire, persistance, suppression de compte, administration et export/import, rappels et e-mails du §12, orientation, Study Pods et QR, disponibilités, fichiers et SEO.
- `views.test.cjs` : rendu de chaque route pour chaque rôle, gestionnaires branchés pour chaque formulaire et action, absence de `undefined`/`NaN`, gardes et `noindex`, parcours §10.1 étape par étape, échappement des saisies.
- `i18n.test.cjs` : traduction à la demande, messages composés du store, paramètres et balises identiques entre français et anglais, chaque clé `t('…')` et chaque message du store traduits, rendu anglais de chaque route et de chaque parcours sans libellé manquant, données non traduites.
- Contrôles manuels complémentaires (non inclus dans le dépôt, à rejouer à la main ou avec un outil comme Chrome DevTools/Playwright ; réalisés une fois pendant le développement à 390 et 1440 px) : parcours §10.1 avec refus puis succès, blocage de connexion, inscription et vérification par la boîte mail, validation d'un tuteur, compte rendu et progression, absence de débordement à 390 et 1440 px sur toutes les routes, aucune erreur JavaScript.
