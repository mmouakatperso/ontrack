---
title: 'ONTRACK - couverture complète du cahier des charges en simulation'
type: 'feature'
created: '2026-10-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '45d16cf668f141a8f9728d5161c16da94ced59eb'
context:
  - '{project-root}/cahier_des_charges_ONTRACK.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-portail-demo-ontrack.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** La démonstration ne couvre qu'une partie du cahier des charges : il manque plusieurs des 17 pages du §4 (connexion, catalogue des matières, paiement, confirmation, CGU, confidentialité), des actions dans les trois espaces (§6, §7, §13, §16, §17), les e-mails (§12), la sécurité des comptes (§5.4), l'orientation complète (§14), les Study Pods (§15), le SEO (§19) et les livrables (§22).

**Approche :** Étendre la démonstration statique pour que chaque exigence du cahier ait un équivalent simulé et traçable : authentification locale avec comptes démo, boîte mail simulée, parcours réservation → paiement → confirmation, espaces complets par rôle, et une matrice de couverture qui renvoie chaque section du cahier vers son écran ou son test.

## Boundaries & Constraints

**Toujours :** HTML, CSS et JS natifs, ouverture directe en `file:`, sans dépendance ni réseau. Données dans localStorage avec repli mémoire. Bandeau permanent « Démonstration ». Interface en français, responsive, utilisable au clavier. Palette du §3.1, avec fond blanc cassé. Tarifs du §8 et grille de rémunération du §9.2 par défaut, tous deux configurables par l'admin. Les accès sont contrôlés par la session et le rôle. Mots de passe hachés (SHA-256 + sel). Chaque e-mail du §12 apparaît dans la boîte mail simulée.

**Jamais :** Paiement, e-mail, visioconférence ou intégration universitaire réels. Pas de données bancaires saisies : la passerelle CMI/Payzone est un écran de scénario. Le contenu des pièces jointes n'est jamais stocké, seulement leurs métadonnées. Aucune promesse d'admission, aucun établissement partenaire réel ; les liens « source officielle » pointent vers `example.org`. Aucune réservation Study Pods accessible aux étudiants (le prototype QR de la phase 3 est réservé à l'admin). Le cahier source reste intact. Aucun commit automatique.

**Décisions :** Une seule passe pour tout le cahier. Authentification simulée locale : comptes démo et connexion rapide pour la soutenance. Domaines e-mail fictifs `etu.encg-<ville>.demo`, modifiables par l'admin. Le travail se fait sur `main`, sans commit.

## I/O & Edge-Case Matrix

| Cas | Entrée / État | Résultat | Erreur |
|---|---|---|---|
| Inscription | Domaine conforme à l'ENCG | Compte non vérifié, code envoyé dans la boîte mail | Domaine non autorisé : refus |
| Connexion | 5 échecs consécutifs | Compte bloqué 15 min | Message de blocage, sans indiquer si l'e-mail existe |
| Réservation | Créneau libre | Réservation `pending` bloquant le créneau 15 min | Créneau pris, passé, bloqué ou prioritaire : refus |
| Paiement | Notification signée « acceptée » | Réservation confirmée, transaction payée, 2 e-mails | Signature invalide ou notification rejouée : sans effet |
| Échec | Paiement refusé, abandonné ou expiré | Réservation `failed`, créneau libéré, e-mail d'échec | Nouvel essai possible |
| Annulation | Délai ≥ délai configuré | Crédit restitué ou remboursement | Hors délai : refus ; absence : séance due |
| Compte rendu | Séance terminée, 6 rubriques remplies | Statuts de chapitre et progression par matière mis à jour | Séance non terminée : refus |
| Avis | Avis signalé par le tuteur | Visible dans la file de modération admin | Masqué : exclu de la note moyenne |
| Rôles | Route d'un autre rôle | Redirection vers la connexion | — |

</frozen-after-approval>

## Code Map

- `data.js` -- `seed(now)` : remplacer par un jeu v2. Conserver la génération des créneaux en `Africa/Casablanca` (lignes 7-21).
- `store.js` -- conserver `createStore(storage, clock)`, `mutate`/`valid`/`save`, le repli mémoire, `available()` et le calcul d'expiration Stay (l. 114-131), ainsi que la répartition des centimes des crédits (l. 135). Nouvelle clé `ontrack-demo-v2` : un ancien état v1 est réinitialisé, sans migration des libellés.
- `app.js` -- conserver `escape`, `money`, `date`, `select`, `field`, `head`, la délégation `submit`/`click`/`change` et le routeur par fragment. Découper en `ui.js` et `views-*.js` (scripts classiques), sans modules ES.
- `index.html` -- remplacer le sélecteur de rôle par un menu de compte. Ajouter les liens nav/pied de page et les scripts.
- `styles.css` -- variables `:root` à réutiliser ; fond `--paper` blanc cassé.
- `tests/store.test.cjs` -- à réécrire pour la v2 en reprenant les cas existants (forfaits, centimes, fin de mois, chevauchements, repli mémoire).
- `assets/` -- photos et logos existants, sans ajout.

## Tasks & Acceptance

**Exécution :**
- [x] `sha256.js` -- SHA-256 synchrone UMD -- hachage sans API asynchrone, utilisable aussi par les tests Node.
- [x] `data.js` -- seed v2 : config (domaines, politique, rémunération, frais, prestataire), référentiel matières/chapitres/niveaux, comptes démo (2 étudiants, 3 tuteurs dont 1 en attente, 1 admin), offres détaillées, créneaux prioritaires, programmes fictifs complets, pods « en étude ».
- [x] `store.js` -- auth (inscription, code, connexion, blocage, session, reset, déconnexion, suppression), réservation pending → paiement signé idempotent → confirmation, tick (rappels, expiration des retenues), politique d'annulation/absence, forfaits (planification, résiliation), compte rendu 6 rubriques, progression par matière, avis/signalement, rémunération par phase et versements, orientation (profil, recommandations, entretiens), pods (inscriptions, prototype QR), messages, export/import, stats financières, e-mails.
- [x] `ui.js`, `views-public.js`, `views-student.js`, `views-tutor.js`, `views-admin.js`, `app.js` -- les 17 pages du §4, plus la boîte mail, la vérification et le mot de passe oublié. Gardes de rôle, titre et `meta description` par page, `noindex` sur les espaces privés.
- [x] `index.html`, `styles.css` -- en-tête de compte, pied de page complet, assistant de réservation, passerelle, tableaux de progression, aperçu QR.
- [x] `robots.txt`, `sitemap.xml` -- §19.
- [x] `tests/store.test.cjs` -- couvrir la matrice ci-dessus et les cas existants.
- [x] `docs/COUVERTURE_CDC.md`, `docs/DOCUMENTATION_TECHNIQUE.md`, `docs/GUIDE_UTILISATEUR.md`, `README.md` -- traçabilité section par section, technique et données, procédures de sauvegarde, services externes (comparatif CMI/Payzone « à confirmer »), scénario de soutenance.

**Critères d'acceptation :**
- Étant donné chaque ligne des §2, §4 à §19 et §23, quand on consulte `docs/COUVERTURE_CDC.md`, alors elle renvoie vers un écran, une action ou un test existant, ou vers une limite de simulation justifiée.
- Étant donné un étudiant connecté, quand il suit les 11 étapes du §10.1, alors il passe par la page de paiement puis la page de confirmation, et l'e-mail ainsi que la transaction apparaissent dans son historique.
- Étant donné un tuteur nouvellement inscrit, quand l'admin le valide, alors il apparaît dans le catalogue et ses créneaux sont réservables.
- Étant donné les vues à 390 px et 1440 px, quand on navigue au clavier, alors aucun débordement de page ni erreur JS n'apparaît.

## Design Notes

Signature de paiement simulée : `sha256(secret + orderId + statut + montant)`. Le webhook vérifie la signature et ignore une transaction déjà finalisée.

Progression par matière : % = chapitres au statut ≠ « à étudier » / chapitres de la matière. Le statut d'un chapitre est celui du dernier compte rendu. La méthode de calcul est affichée à côté du pourcentage.

Routes (fragment) : `accueil`, `presentation`, `connexion`, `inscription`, `inscription-tuteur`, `verification`, `mot-de-passe-oublie`, `matieres[/id]`, `catalogue`, `profil/id`, `reserver[/tutorId]`, `paiement/bookingId`, `confirmation/bookingId`, `etudiant/{apercu,seances,historique,forfaits,progression,comptes-rendus,notifications,profil}`, `tuteur/{apercu,seances,profil,matieres,disponibilites,avis,historique,remuneration}`, `admin/{apercu,etudiants,tuteurs,domaines,referentiel,tarifs,politique,reservations,paiements,remunerations,moderation,orientation,pods,messages,sauvegarde}`, `orientation`, `pods`, `contact`, `cgu`, `confidentialite`, `mentions`, `boite-mail`.

Modèle v2 (indicatif) : `config{domains, policy{cancelHours, rescheduleHours}, payout{phase, rates}, feeRate, provider}`, `subjects[{id,name,level,chapters[]}]`, `users[{id,role,email,salt,hash,verified,status,failed,lockedUntil,…profil}]`, `session{userId,expires}`, `codes[]`, `emails[]`, `tutors[{…, subjects, chapters, languages[], modes[], services[], slots, prioritySlots, blocked[], photoConsent, age, showAge, status}]`, `bookings[{…, status: pending|confirmed|completed|cancelled|absent|failed, need{subjectId,chapter,difficulty,mode,wishes,text,attachment}, report, payout}]`, `transactions[{…, status: pending|paid|failed|refunded, provider, fee}]`, `packages`, `reviews[{…, reported, hidden}]`, `payouts[]`, `programs[{name,institution,country,mobility,level,tracks,minGrade,languageReq,deadline,documents,source,active}]`, `orientationProfiles`, `consultations`, `pods{locations, subscribers, prototype}`, `messages`, `notifications[{userId,…}]`. Créneau prioritaire Stay : réservable par les non-abonnés seulement à moins de 24 h du début. Rémunération : 0 DH en phase volontaire, sinon le tarif par séance du §9.2 est figé au compte rendu.

## Verification

**Commandes :**
- `node --test tests/store.test.cjs` -- tous les tests passent.
- `node --check` sur chaque `.js` -- aucune erreur de syntaxe.

**Contrôles manuels :**
- Playwright ou navigateur : parcours §10.1 complet, échec de paiement, blocage de connexion, validation d'un tuteur, compte rendu, progression, captures à 390 et 1440 px.

## Implementation Notes

- 2026-10-23 : première implémentation par sous-agent. 32 tests Node passent, `node --check` est propre. Contrôle Chrome headless (script hors dépôt) : toutes les routes à 390 et 1440 px. Choix non dictés par la spec : un tuteur publié qui ajoute une matière repasse en validation ; la résiliation de forfait rembourse les séances non planifiées (désactivable) ; la suppression de compte étudiant conserve l'historique comptable anonymisé.

- 2026-10-23 : correctifs de revue appliqués (25 entrées patch). Vérification : 43/43 tests Node (`store` + `views`), `node --check` propre. Contrôle Chrome headless relancé après correctifs : toutes les routes sans débordement à 390 et 1440 px, gardes de rôle, blocage de connexion, inscription et vérification, parcours §10.1 (refus, nouvel essai, acceptation), compte rendu 40 %, validation d'Adam, aucune erreur JS. Les créneaux sont des radios natifs focalisables (sélection au clavier par les flèches).

## Spec Change Log

- 2026-10-31 : le porteur du projet renégocie la contrainte figée « aucun établissement partenaire réel ; les liens “source officielle” pointent vers `example.org` ». Les destinations réelles de l'ENCG, avec leurs liens officiels en `https`, la remplacent. Les critères non communiqués sont affichés « à confirmer » et ne sont jamais inventés. La règle « aucune promesse d'admission » est maintenue. Le bloc figé ci-dessus reste intact pour la traçabilité. Voir `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-31.md`.

## Review Triage Log

| Constat | Verdict | Preuve et traitement |
|---|---|---|
| BH1 : la boîte mail publique permet de lire le code de réinitialisation de n'importe quel compte, admin compris | medium | `views-public.js:144,290` : l'adresse est libre. Patch : boîte limitée au compte connecté et aux adresses saisies dans l'onglet, sans liste globale ; limite documentée. |
| BH2/EC2/EC16 : supprimer un compte avec un forfait actif perd les crédits malgré la promesse « remboursées » | medium | `store.js:1077-1081` : le crédit est rendu au forfait, puis le forfait est résilié sans remboursement. Patch. |
| BH3 : la suppression laisse l'inscription Pods et les messages envoyés sans session sous la même adresse | low | `removeAccount` filtre par `userId` uniquement. Correction directe. Patch. |
| BH4/EC1/EC17 : un fragment mal encodé fait planter `render` (URIError) | low | `app.js:41`. Correction directe. Patch. |
| BH5 : les vues utilisent `Date.now()` au lieu de l'horloge du store | medium | `views-student.js:26,178,199,205,219`, `views-tutor.js:9,59` : les branches temporelles ne sont pas testées. Patch : `store.now()`. |
| BH6/VG1 : la garde de rôle et `noindex` ne sont pas testés ; `returnTo` d'un autre rôle renvoie vers la connexion | medium | `app.js:47-64`, `views-public.js:65`. Patch : helper pur testé et `returnTo` filtré. |
| BH7/EC14 : déconnexion, reset et import ne vident pas la mémoire d'onglet | medium | `app.js:109,112`. Patch. |
| BH8/EC3 : aucune limite d'émission des codes, donc la limite de 5 essais est contournable | medium | `store.js:485,529`. Patch : plafond horaire. |
| BH9 : un tuteur suspendu ne peut clôturer ses séances passées ; un paiement est confirmé malgré un tuteur suspendu | medium | `views-tutor.js:23` ; `processNotification`. Patch. |
| BH10 : avis du seed datés avant leur séance ; expiration du forfait seed codée en dur | low | Dates des avis corrigées directement (patch). Rejet de l'expiration codée en dur (cosmétique). |
| BH11 : contrôles Chrome cités comme preuve sans script dans le dépôt | low | Patch : présentés comme contrôles manuels dans les docs. |
| BH12 : docs contradictoires (sels du seed, 6 contre 5 rubriques, commande de la spec) | low | Patch pour les docs. Rejet de la partie spec (correction de la spec de ce build). |
| BH13/EC15 : le lien Tarifs n'est jamais `aria-current` ; `aria-label` sans rôle | low | `index.html:30,34`. Correction directe. Patch. |
| VG2 : les gestionnaires du §10.1 (wizard, gateway, report) ne sont pas testés | gap | Lacune déjà vérifiée. Patch : tests via `O.forms`/`O.actions`. |
| VG3 : annulation, reprogrammation et remboursement admin après une fin simulée ne sont plus testés | gap | Lacune déjà vérifiée. Patch : test. |
| VG4 : le filtrage catalogue/profil des tuteurs non validés n'est pas testé | gap | Lacune déjà vérifiée. Patch : test. |
| VG5 : la revalidation après ajout d'une matière n'est pas testée | gap | Lacune déjà vérifiée. Patch : test. |
| VG6/EC9 : la session glissante n'est pas prolongée par la navigation et n'est pas testée | medium | `touchSession` n'est appelé que dans `mutate`. Patch : prolonger dans `tick` et tester. |
| EC4 : QR accepté avant son créneau | low | `store.js:998-1006`. Une assertion. Patch. |
| EC5 : `deadlinePassed` calculé mais jamais affiché | medium | Absent des vues (grep). Patch. |
| EC6 : `setLevels` ignore les niveaux des profils d'orientation et des besoins | low | `store.js:884`. Correction directe. Patch. |
| EC7 : retirer une matière ayant des séances confirmées bloque les comptes rendus | medium | `complete` exige `tutor.subjects`. Patch : refus du retrait. |
| EC8 : un blocage chevauchant une séance terminée est refusé | low | `blocking()` inclut `completed`/`absent`. Correction directe. Patch. |
| EC10 : le libellé d'annulation promet un crédit pour un forfait résilié | low | `views-student.js:184`. Correction directe. Patch. |
| EC11 : la reprogrammation Stay d'un forfait résilié propose des créneaux prioritaires | low | `store.js:360`. Correction directe. Patch. |
| EC12 : une matière sans chapitre bloque l'étape 2 de l'assistant | low | Filtre corrigé directement. Patch. |
| EC13 : la page de paiement d'une séance réglée par crédit affiche le prix du forfait | low | `views-student.js:129`. Correction directe. Patch. |
