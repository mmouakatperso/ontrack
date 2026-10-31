# ONTRACK — Matrice de couverture du cahier des charges

Ce document relie chaque exigence du [cahier des charges](../cahier_des_charges_ONTRACK.md) (§2, §4 à §19, §23) à un **écran** de la démonstration (route par fragment, ex. `#admin/tarifs`), à une **action** (fonction de `store.js` ou bouton de l'interface) et, lorsqu'il existe, à un **test** automatisé. Lorsqu'une exigence ne peut pas être réalisée dans un prototype statique, la **limite** est indiquée et justifiée.

Voir aussi : [README](../README.md) · [Documentation technique](DOCUMENTATION_TECHNIQUE.md) · [Guide utilisateur](GUIDE_UTILISATEUR.md).

## Comment lire ce document

| Symbole | Signification |
|---|---|
| ✅ | Couvert : fonctionnel dans la démonstration et vérifiable |
| 🟡 | Simulé : le comportement est reproduit, sans service externe réel (paiement, e-mail, visio…) |
| ⏳ | Limite justifiée : hors de portée d'un prototype statique, documentée pour la mise en production |

Les fonctions citées sont celles de l'objet retourné par `createStore()` dans `store.js`, sauf quelques fonctions internes explicitement nommées (`slotIssue`, `available`, `myTutor`, `mail` dans `store.js`, `policyList` dans `ui.js`). Les écrans sont des routes de `index.html#…` déclarées dans `views-public.js`, `views-student.js`, `views-tutor.js` et `views-admin.js`.

### Tests cités

Commande : `node --test tests/store.test.cjs tests/views.test.cjs tests/i18n.test.cjs`.

| Réf. | Fichier | Nom exact du test |
|---|---|---|
| S1 | store | SHA-256 synchrone conforme à Node crypto, y compris UTF-8 et frontières de blocs |
| S2 | store | inscription : domaine conforme → compte non vérifié, code dans la boîte mail ; domaine refusé |
| S3 | store | connexion : 5 échecs consécutifs bloquent 15 min, sans révéler si l'e-mail existe |
| S4 | store | session : expiration, déconnexion et contrôle des rôles |
| S5 | store | mot de passe oublié : message neutre, code par e-mail, ancien mot de passe invalidé |
| S6 | store | réservation pending : créneau bloqué 15 min puis libéré, e-mail d'échec |
| S7 | store | créneau pris, passé, incompatible, bloqué, prioritaire ou tuteur en attente : refus |
| S8 | store | créneau prioritaire Stay : abonné à tout moment, non-abonné seulement à moins de 24 h |
| S9 | store | paiement : notification signée acceptée → confirmée, transaction payée, 2 e-mails ; rejeu et signature invalide sans effet |
| S10 | store | échec : refus ou abandon → failed, créneau libéré, e-mail d'échec, nouvel essai possible |
| S11 | store | annulation : délai respecté → remboursement ou crédit ; hors délai refusée ; absence → séance due |
| S12 | store | reprogrammation dans le délai, chevauchements partiels refusés pour tuteur et étudiant |
| S13 | store | compte rendu : séance non terminée refusée ; 6 rubriques ; statuts de chapitre et progression par matière |
| S14 | store | avis : unique et réservé au participant ; signalement tuteur → modération ; masqué exclu de la moyenne |
| S15 | store | forfaits : débit unique, épuisement, expiration, validité, centimes et résiliation |
| S16 | store | Stay ONTRACK : mois calendaire marocain, borné en fin de mois |
| S17 | store | tarifs historiques : une modification ne change que les nouvelles réservations |
| S18 | store | tuteur nouvellement inscrit : vérifié, validé par l'admin, puis visible et réservable |
| S19 | store | rémunération : 0 DH en phase volontaire, tarif §9.2 figé au compte rendu, versements et suivi financier |
| S20 | store | stockage : clé v3, anciens états v1 et v2 remplacés par le seed v3, repli mémoire si indisponible ou corrompu |
| S21 | store | persistance entre instances et échec de sauvegarde signalé |
| S22 | store | suppression de compte : mot de passe requis, données personnelles effacées, comptabilité anonymisée |
| S23 | store | administration : domaines, référentiel, politique, comptes, export/import |
| S24 | store | rappels avant séance et e-mails du §12 tous présents dans la boîte simulée |
| S25 | store | orientation : recommandations explicables, jamais garanties, et demande d'entretien |
| S26 | store | Study Pods : aucune réservation étudiante, actualités, prototype QR admin à usage unique |
| S27 | store | disponibilités tuteur : date impossible, récurrence, blocage et créneau réservé non retirable |
| S28 | store | fichiers : UTF-8, ressources locales, SEO et scripts classiques |
| V1 | views | toutes les routes publiques et privées se rendent pour leur rôle, avec gestionnaires branchés |
| V2 | views | gardes de rôle : les espaces privés déclarent leur rôle et le noindex |
| V3 | views | parcours §10.1 rendu étape par étape jusqu'à la confirmation |
| V4 | views | données saisies échappées dans les vues |
| S29 | store | suppression avec forfait actif : crédits restants remboursés, abonnements et messages effacés |
| S30 | store | codes : 5 émissions maximum par heure et par usage |
| S31 | store | paiement accepté pour un tuteur suspendu entre-temps : échec sans confirmation |
| S32 | store | fin simulée d'une séance future : annulation, reprogrammation et remboursement admin refusés |
| S33 | store | matières du tuteur : ajout → revalidation, chapitres seuls → publié, retrait refusé si séance |
| S34 | store | session : la navigation (tick) prolonge une session valide |
| S35 | store | orientation : date limite dépassée (fin de journée au Maroc) jamais éligible |
| S36 | store | filières : cohérence niveau / filière à l'inscription, au profil et à l'orientation |
| V5 | views | garde d’accès pure (O.access) : redirections et robots par rôle |
| V6 | views | gestionnaires réels : assistant jusqu’au paiement, passerelle, compte rendu et progression |
| V7 | views | catalogue : tuteur en attente masqué, visible après validation |
| V8 | views | boîte mail simulée : limitée au compte connecté et aux adresses saisies dans l’onglet |
| V9 | views | orientation : 9 destinations réelles, effectifs tels que communiqués, critères inconnus « à confirmer » |
| V10 | views | orientation : moyenne vidée par l'admin → carte « À confirmer auprès de l'ENCG » ; places analysées |
| V11 | views | inscription : filières regroupées par cycle et filtrées selon le niveau choisi |
| V12 | views | administration : le gestionnaire admin-program analyse les places et vide les champs non communiqués |

Contrôles manuels complémentaires (non inclus dans le dépôt, à rejouer à la main ou avec un outil comme Chrome DevTools/Playwright ; réalisés une fois pendant le développement à 390 et 1440 px) : parcours §10.1 avec échec puis succès de paiement, blocage de connexion, inscription + vérification via la boîte mail, compte rendu et progression, validation d'un tuteur, absence de débordement et d'erreur JavaScript sur toutes les routes.

---

## §2 — Public cible et types d'utilisateurs

### §2.1 Étudiants

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| Créer un compte et vérifier l'adresse universitaire | `#inscription`, `#verification` · `register`, `verifyEmail`, `resendCode` | S2 | ✅ code envoyé dans la boîte simulée 🟡 |
| Sélectionner ENCG, niveau, filière | `#inscription` (champs ENCG, niveau, filière) · `updateProfile` (`#etudiant/profil`) | S2, S36, V11 | ✅ filières réelles (plannings 2025-2026 de l'ENCG Casablanca), regroupées par cycle et filtrées selon le niveau ; incohérence refusée (« Filière non proposée au niveau S3. ») ; ⏳ intitulés développés des sigles à confirmer |
| Rechercher des tuteurs par matière et compétence | `#catalogue` (filtres), `#reserver` étape 4 · `matchTutors` | S18, V3 | ✅ |
| Décrire précisément ses difficultés | `#reserver` étape 2 (besoin) | S7, V3 | ✅ |
| Réserver et payer des séances | `#reserver` → `#paiement/…` → `#confirmation/…` · `createBooking`, `gateway` | S9, V3 | ✅ paiement 🟡 |
| Consulter l'historique de réservation | `#etudiant/historique` | V3 | ✅ |
| Accéder aux récapitulatifs | `#etudiant/comptes-rendus` | S13, V1 | ✅ |
| Suivre sa progression | `#etudiant/progression` · `progress` | S13 | ✅ |
| Consulter le portail d'orientation | `#orientation` | S25, V1 | ✅ |

### §2.2 Tuteurs

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| Créer leur profil | `#inscription-tuteur` · `registerTutor` | S18 | ✅ |
| Indiquer ENCG, niveau, compétences | `#inscription-tuteur`, `#tuteur/profil`, `#tuteur/matieres` · `updateTutorProfile`, `updateTutorSubjects` | S18, V1 | ✅ |
| Définir leurs disponibilités | `#tuteur/disponibilites` · `addSlot`, `addRecurringSlots` | S27 | ✅ |
| Consulter et gérer leurs réservations | `#tuteur/seances` · `cancel`, `simulateEnd`, `markAbsent` | S11, V1 | ✅ |
| Accéder aux informations nécessaires à chaque séance | `#tuteur/seances` (besoin, niveau, chapitre, pièce jointe) | V1 | ✅ |
| Rédiger les comptes rendus | `#tuteur/seances` (formulaire 6 rubriques) · `complete` | S13 | ✅ |
| Consulter les évaluations | `#tuteur/avis` | S14 | ✅ |
| Accéder à leur rémunération | `#tuteur/remuneration` · `payoutSummary` | S19 | ✅ |
| Profils validés par l'administrateur avant publication | `#admin/tuteurs` · `setTutorStatus` | S18, S7 | ✅ |

### §2.3 Administrateur

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| Gérer les comptes étudiants et tuteurs | `#admin/etudiants`, `#admin/tuteurs` · `setUserStatus`, `unlockUser`, `adminDeleteUser` | S23 | ✅ |
| Valider les profils des tuteurs | `#admin/tuteurs` · `setTutorStatus` | S18 | ✅ |
| Gérer matières, chapitres, niveaux | `#admin/referentiel` · `saveSubject`, `saveChapter`, `removeChapter`, `removeSubject`, `setLevels` | S23 | ✅ |
| Configurer tarifs et forfaits | `#admin/tarifs` · `setOffer` | S17, S15 | ✅ |
| Suivre réservations et paiements | `#admin/reservations`, `#admin/paiements` | V1 | ✅ |
| Gérer annulations et remboursements | `#admin/reservations` · `adminRefund` ; `#admin/politique` · `setPolicy` | S11, S23 | ✅ remboursement 🟡 |
| Modérer les avis | `#admin/moderation` · `moderate` | S14 | ✅ |
| Mettre à jour l'orientation | `#admin/orientation` · `saveProgram`, `updateConsultation` | S25 | ✅ |
| Consulter les statistiques | `#admin/apercu` · `stats`, `finance` | S19 | ✅ |
| Gérer les futures fonctionnalités Study Pods | `#admin/pods` · `savePodLocation`, `podPrototypeCreate`, `podCheckIn` | S26 | ✅ |

## §4 — Architecture : les 17 pages

| # | Page (CDC) | Route(s) | Preuve | Statut |
|---|---|---|---|---|
| 1 | Page d'accueil | `#accueil` (`#accueil/offres` pour les tarifs) | V1 | ✅ |
| 2 | Présentation d'ONTRACK | `#presentation` | V1 | ✅ |
| 3 | Inscription et connexion | `#inscription`, `#inscription-tuteur`, `#connexion`, `#verification`, `#mot-de-passe-oublie` | S2, S3, S5, V1 | ✅ |
| 4 | Tableau de bord étudiant | `#etudiant/apercu` (+ onglets) | V1 | ✅ |
| 5 | Catalogue des matières | `#matieres`, `#matieres/<id>` | V1 | ✅ |
| 6 | Catalogue et profils des tuteurs | `#catalogue`, `#profil/<id>` | V1 | ✅ |
| 7 | Réservation | `#reserver`, `#reserver/<tutorId>` | V3 | ✅ |
| 8 | Paiement | `#paiement/<bookingId>` | V3 | 🟡 passerelle de scénario |
| 9 | Confirmation de réservation | `#confirmation/<bookingId>` | V3 | ✅ |
| 10 | Historique des séances | `#etudiant/historique` | V3 | ✅ |
| 11 | Suivi de progression | `#etudiant/progression` | S13 | ✅ |
| 12 | Tableau de bord tuteur | `#tuteur/apercu` (+ onglets) | V1 | ✅ |
| 13 | Portail d'orientation | `#orientation` | S25 | ✅ |
| 14 | Study Pods — Coming Soon | `#pods` | S26, V1 | ✅ |
| 15 | Contact et assistance | `#contact` · `message` | V4 | ✅ |
| 16 | Tableau de bord administrateur | `#admin/apercu` (+ 14 onglets) | V1 | ✅ |
| 17 | Pages légales et confidentialité | `#cgu`, `#confidentialite`, `#mentions` | V1 | ✅ |
| — | Outil de démonstration | `#boite-mail` (boîte mail simulée) | S24, V3 | 🟡 |

## §5 — Inscription et vérification des étudiants

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| §5.1 Accès réservé aux 12 ENCG | `#inscription` (liste des 12 ENCG) · `register` (contrôle du domaine) | S2 | ✅ |
| Nom et prénom, e-mail officiel, école, niveau, filière | `#inscription` | S2 | ✅ |
| §5.2 1. Sélection de l'ENCG | `#inscription` (aide « Domaine autorisé » mise à jour) | V1 | ✅ |
| 2. Saisie de l'adresse universitaire | `#inscription` | S2 | ✅ |
| 3. Vérification du domaine autorisé pour l'école | `register` → « Domaine non autorisé » | S2, S23 | ✅ |
| 4. Envoi d'un code de vérification | e-mail `verification` dans `#boite-mail` | S2 | 🟡 envoi simulé |
| 5. Confirmation de l'adresse | `#verification` · `verifyEmail` (code haché, 30 min, 5 essais) | S2 | ✅ |
| 6. Compte activé | e-mail `welcome`, session ouverte | S2 | ✅ |
| Liste des domaines autorisés configurable | `#admin/domaines` · `setDomains` | S23 | ✅ domaines fictifs `etu.encg-<ville>.demo` ⏳ liste officielle à confirmer (§24) |
| §5.3 L'e-mail ne prouve pas l'inscription | Texte de `#verification` | — | ✅ |
| Intégration future avec les systèmes universitaires | — | — | ⏳ aucune intégration réelle (exclue par la spec) |
| Ni numéro Apogée ni mot de passe universitaire | Formulaires sans ces champs ; avertissements sur `#inscription`, `#verification` | V1 | ✅ |
| §5.4 Vérification des adresses e-mail | `verifyEmail`, `resendCode` | S2, S30, V8 | 🟡 voir la limite ci-dessous |
| Récupération du mot de passe | `#mot-de-passe-oublie` · `requestReset`, `confirmReset` | S5 | ✅ |
| Stockage sécurisé des mots de passe | SHA-256 + sel (`sha256.js`) : sel aléatoire de 128 bits pour les comptes créés, sels fixes (`seed-<id>`) pour les comptes de démonstration | S1, S2 | ✅ ⏳ en production : algorithme lent (bcrypt/argon2) côté serveur |
| Gestion des sessions | `login`, `currentUser`, `tick`, expiration 2 h glissante (actions et navigation) | S4, S34 | ✅ ⏳ session en localStorage (pas de cookie serveur) |
| Protection contre les tentatives abusives | 5 échecs → blocage 15 min, message neutre | S3 | ✅ |
| Déconnexion sécurisée | bouton « Déconnexion » · `logout` | S4 | ✅ |
| Suppression de compte | `#etudiant/profil`, `#tuteur/profil` · `deleteAccount` | S22, S29 | ✅ |

> Limite de simulation : la boîte mail simulée (`#boite-mail`) affiche les codes en clair, comme une vraie boîte de réception ; en base (`state.codes`) ils ne sont conservés que hachés. Elle est restreinte à l'adresse du compte connecté et aux adresses saisies dans l'onglet (inscription, vérification, mot de passe oublié, actualités Study Pods). Comme il n'existe pas de vraie boîte de réception séparée, une personne qui saisit l'adresse d'autrui dans « Mot de passe oublié » peut lire le code dans cet onglet : la preuve de possession de la boîte n'est donc pas démontrée par la simulation. Émission limitée à 5 codes par heure et par usage (S30).

## §6 — Espace étudiant

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| §6.1 Message de bienvenue | `#etudiant/apercu` (« Bonjour, … ») | V1 | ✅ |
| Prochaines séances | `#etudiant/apercu`, `#etudiant/seances` | V1 | ✅ |
| Réservations en attente | idem (paiement en attente, lien « payer ») | S6 | ✅ |
| Historique des séances | `#etudiant/apercu`, `#etudiant/historique` | V3 | ✅ |
| Forfaits actifs et solde | `#etudiant/forfaits` | S15 | ✅ |
| Matières étudiées | `#etudiant/apercu` | S13 | ✅ |
| Progression par matière | `#etudiant/apercu`, `#etudiant/progression` | S13 | ✅ |
| Derniers comptes rendus | `#etudiant/apercu`, `#etudiant/comptes-rendus` | S13 | ✅ |
| Accès rapide à la réservation | bouton « Réserver une séance » | V1 | ✅ |
| §6.2 ENCG, niveau, matière, chapitre, difficulté, service, mode, disponibilités souhaitées | `#reserver` étapes 1 à 3 · `createBooking` (validation de `need`) | S7, V3 | ✅ |
| Zone de texte libre (exemple des élasticités en placeholder) | `#reserver` étape 2 | V3 | ✅ |
| Utiliser ces informations pour trouver un tuteur | `matchTutors` (chapitre maîtrisé, ENCG, mode, service, note) | S18, V3 | ✅ |
| Joindre un cours, PDF ou photo, limites de format et taille | `#reserver` étape 2 (PDF/JPG/PNG, 5 Mo) | S7 | 🟡 métadonnées seules, contenu jamais stocké |

## §7 — Catalogue des tuteurs

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| §7.1 Photo avec consentement | `#profil/<id>` (photo si `photoConsent`, sinon initiales) | V1 | ✅ téléversement de photo non simulé ⏳ |
| Nom, ENCG, niveau | `#profil/<id>`, `#catalogue` | V1 | ✅ |
| Matières, chapitres maîtrisés | `#profil/<id>` | V1 | ✅ |
| Description, langues, disponibilités, types de séances | `#profil/<id>` | V1 | ✅ |
| Note moyenne et avis | `#profil/<id>` · `tutorRating` | S14 | ✅ |
| Âge facultatif soumis au consentement | `#tuteur/profil` (`showAge`) | V1 | ✅ |
| §7.2 Filtres matière, chapitre, ENCG, niveau, disponibilité, langue, note, mode | `#catalogue` | V1 | ✅ |
| §7.3 Note et avis après séance terminée | `#etudiant/historique` · `review` | S14 | ✅ |
| Seuls les participants peuvent évaluer | `review` (contrôle du propriétaire, avis unique) | S14 | ✅ |
| Modération des avis signalés | `reportReview` (`#tuteur/avis`), `moderate` (`#admin/moderation`) | S14 | ✅ |

## §8 — Services et tarification

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| Tarifs affichés clairement, configurables par l'admin | `#accueil/offres`, `#cgu`, `#admin/tarifs` · `setOffer` (10 à 5 000 DH) | S17 | ✅ |
| §8.1 Catch-up 150 DH / 90 min | jeu initial `data.js` | V3 | ✅ |
| §8.2 Quick Help 50 DH / 30 min | idem | V3 | ✅ |
| §8.3 Exam Rescue 399 DH / 3 × 90 min / une semaine, économie 51 DH | idem ; économie calculée sur `#accueil` | S15 | ✅ |
| Réserver le forfait, planifier les 3 séances, suivre réalisées/restantes | `#etudiant/forfaits` (« Planifier une séance ») | S15 | ✅ |
| §8.4 Stay ONTRACK 349 DH / 4 × 60 min / mois, économie 51 DH | jeu initial ; `#accueil` | S16 | ✅ |
| Suivi par matière, récapitulatif après chaque séance | `#etudiant/progression`, `#etudiant/comptes-rendus` | S13 | ✅ |
| Accès prioritaire aux créneaux | créneaux prioritaires (`togglePriority`), règle 24 h | S8 | ✅ |
| Dates de validité, report/expiration, renouvellement, résiliation, annulation | `tick` (expiration), `terminatePackage`, `#cgu`, `#admin/politique` | S15, S16 | ✅ règles de démonstration, à valider (§24) |
| Présenté comme 4 séances / mois, non illimité | texte `#accueil/offres`, `#admin/tarifs` | — | ✅ |
| §8.5 Récapitulatif des tarifs, ajustables sans intervention technique | `#accueil/offres`, `#cgu`, `#admin/tarifs` | S17 | ✅ |

## §9 — Rémunération des tuteurs

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| §9.1 Phase volontaire, pilote limité | `#admin/remunerations` (phase), `#presentation`, `#inscription-tuteur` | S19 | ✅ |
| Avantages des volontaires, caractère volontaire explicite | `#tuteur/remuneration`, `#cgu` | V1 | ✅ |
| Transparence des recettes, règles à vérifier | `#admin/apercu` (suivi financier) | S19 | ⏳ vérification juridique hors prototype |
| §9.2 Grille 30 / 90 / 75 × 3 / 50 × 4 DH | `#admin/remunerations` · `setPayout` (défauts du §9.2) | S19 | ✅ |
| Paiement par séance terminée, après vérification | montant figé au compte rendu (`complete`), versement `recordPayout` | S19 | ✅ virement 🟡 |
| §9.3 Chiffre d'affaires, sommes dues, versées, frais, remboursements, recettes par service | `#admin/apercu` · `finance` | S19 | ✅ |
| Montant conservé ≠ bénéfice net | mention sous le tableau financier | — | ✅ |

## §10 — Réservation des séances

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| §10.1 Étapes 1 à 3 (matière, besoin, service) | `#reserver` étapes 1-3 | V3 | ✅ |
| Étapes 4-5 (profils correspondants, choix du tuteur) | `#reserver` étape 4 · `matchTutors` | V3 | ✅ |
| Étapes 6-7 (créneaux disponibles, choix) | `#reserver` étape 5 · `freeSlots`, `checkSlot` | V3, S7 | ✅ |
| Étape 8 (récapitulatif et prix) | `#reserver` étape 6 | V3 | ✅ |
| Étapes 9-10 (paiement, vérification, confirmation) | `#paiement/…` · `gateway` → `paymentNotification` | S9, V3 | 🟡 |
| Étape 11 (e-mail de confirmation) | e-mails `booking-confirmed`, `payment-confirmed` | S9, V3 | 🟡 |
| Empêcher les doubles réservations, mise à jour automatique | `createBooking` (`available`), retenue 15 min | S6, S7, S12 | ✅ |
| §10.2 Définir, modifier les créneaux | `#tuteur/disponibilites` · `addSlot`, `addRecurringSlots`, `removeSlot` | S27 | ✅ |
| Bloquer des périodes | `addBlocked`, `removeBlocked` | S7, S27 | ✅ |
| Consulter les réservations, notifications de nouvelles réservations | `#tuteur/seances`, `#tuteur/apercu` ; e-mail `tutor-booking` | S9 | ✅ |
| Fuseau horaire du Maroc | `Africa/Casablanca` partout (`moroccoInstant`) | S16 | ✅ |
| §10.3 Délais d'annulation, modifications, absences, remboursements, forfaits | `#admin/politique` · `setPolicy`, `cancel`, `reschedule`, `markAbsent`, `terminatePackage` | S11, S12, S15 | ✅ |
| Règles appliquées automatiquement et communiquées avant paiement | `policyList` sur `#reserver` (étape 6) et `#paiement/…` | S11, V3 | ✅ |

## §11 — Paiement en ligne

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| §11.1 Paiement sur le site, confirmation automatisée | `#paiement/…` | S9 | 🟡 aucun paiement réel |
| §11.2 Comparer CMI et Payzone, aucun choix définitif | `#admin/paiements` (prestataire « à confirmer ») ; comparatif dans la [documentation technique](DOCUMENTATION_TECHNIQUE.md) | — | ⏳ choix à confirmer (§24) |
| §11.3 1-3 Service, montant, confirmation | `#reserver` étape 6 | V3 | ✅ |
| 4-5 Parcours sécurisé, traitement par le prestataire | passerelle de scénario sur `#paiement/…` | V3 | 🟡 |
| 6-7 Vérification et confirmation | `paymentNotification` (signature `sha256(secret + commande + statut + montant)`) | S9 | ✅ |
| 8 E-mail de confirmation | e-mails dans `#boite-mail` | S9 | 🟡 |
| 9 Paiement dans l'historique | `#etudiant/historique` | V3 | ✅ |
| Échec : réservation non payée | `failPayment` (refus, abandon, expiration) | S10, S6 | ✅ |
| §11.4 HTTPS | — | — | ⏳ ouverture en `file:` ; HTTPS obligatoire à l'hébergement |
| Vérifier les notifications du prestataire | signature et montant vérifiés ; bouton « Notification mal signée » sur `#admin/paiements` | S9 | ✅ |
| Éviter les doubles transactions | rejeu ignoré (« notification rejouée ») ; bouton « Rejouer la notification » | S9 | ✅ |
| Enregistrer le statut des paiements | `transactions[].status` : pending / paid / failed / refunded | S9, S10 | ✅ |
| Gérer les remboursements autorisés | `cancel`, `adminRefund`, `terminatePackage` | S11, S15 | 🟡 |
| Pas de données bancaires stockées | aucun champ carte | V3 | ✅ |
| Historique des transactions pour l'administration | `#admin/paiements` | V1 | ✅ |
| §11.5 Pas de rémunération en phase volontaire ; sommes dues/versées en phase rémunérée | `#admin/remunerations`, `#tuteur/remuneration` | S19 | ✅ |
| Versements selon prestataire et cadre légal | `recordPayout` (référence `VIR-SIM-…`) | S19 | ⏳ virement réel hors prototype |

## §12 — Notifications et e-mails

Tous les e-mails sont générés par `store.js` (`mail`) et consultables sur `#boite-mail`, avec l'en-tête et le pied de page ONTRACK. Preuve globale : **S24**.

| E-mail (CDC) | Type | Déclencheur | Statut |
|---|---|---|---|
| Vérification de l'adresse | `verification` | `register`, `registerTutor`, `resendCode` | 🟡 |
| Confirmation de création du compte | `welcome` | `verifyEmail` | 🟡 |
| Réservation confirmée | `booking-confirmed` | paiement accepté ou crédit de forfait | 🟡 |
| Paiement confirmé | `payment-confirmed` | `paymentNotification` acceptée | 🟡 |
| Échec de paiement | `payment-failed` | refus, abandon, expiration de la retenue | 🟡 |
| Rappel avant la séance | `reminder` | `tick` (24 h avant, une seule fois) | 🟡 |
| Annulation ou modification | `booking-changed` | `cancel`, `reschedule`, `markAbsent` | 🟡 |
| Récapitulatif disponible | `report-available` | `complete` | 🟡 |
| Information sur un forfait actif | `package-info` | activation, expiration, résiliation | 🟡 |
| Confirmation d'une demande d'orientation | `orientation-confirmed` | `requestConsultation` | 🟡 |
| Identité visuelle, style clair | rendu de `#boite-mail` | — | ✅ |

Notifications internes complémentaires : `#etudiant/notifications`, `#tuteur/apercu`, `#admin/messages` (journal). Envoi réel (SMTP) : ⏳.

## §13 — Suivi de la progression académique

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| §13.1 Tableau de progression par matière | `#etudiant/progression` · `progress` | S13 | ✅ |
| Pourcentages calculés sur les chapitres enregistrés | % = chapitres ≠ « À étudier » / chapitres de la matière | S13 | ✅ |
| §13.2 Compte rendu : matière et chapitre, notions, exercices, difficultés, points à réviser, recommandations | formulaire de six rubriques : 1) matière et chapitres avec leur statut, 2) notions abordées, 3) exercices travaillés, 4) difficultés identifiées, 5) points à réviser, 6) recommandations, sur `#tuteur/seances` · `complete` | S13, V6 | ✅ |
| Consultation par l'étudiant | `#etudiant/comptes-rendus` | S13 | ✅ |
| §13.3 Statuts à étudier / en cours / révisé / maîtrisé | `data.js` `chapterStatuses` ; dernier compte rendu fait foi | S13 | ✅ |
| Méthode de calcul expliquée | encadré sur `#etudiant/progression` | V1 | ✅ |
| Indicateur, pas une garantie de maîtrise | même encadré | — | ✅ |

## §14 — Portail d'orientation internationale

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| §14.1 Échanges et doubles diplômes | `#orientation` (9 destinations communiquées par l'ENCG) | V1, V9 | ✅ destinations réelles, effectifs tels que communiqués (listes principales et d'attente jamais additionnées) ; ⏳ diffusion publique des places à confirmer avec l'ENCG |
| §14.2 ENCG, niveau, filière, résultats, matières/semestres validés, langues, préférences géographiques, type de programme | formulaire `#orientation` · `saveOrientationProfile` | S25 | ✅ |
| Données limitées au nécessaire | mention sur le formulaire, `#confidentialite` | — | ✅ |
| §14.3 Programmes potentiellement adaptés | `recommendations` (6 critères affichés ; un critère non communiqué est « à confirmer », ni rempli ni bloquant, exclu du décompte) | S25, V9 | 🟡 mécanisme fonctionnel, mais aucune destination n'a encore de critère communiqué : seules la destination et le type de mobilité (Shandong, Sherbrooke) sont réellement comparés |
| Nom, établissement, pays, mobilité, critères, langues, date limite, documents, source officielle | carte destination sur `#orientation` (places, note de source, lien « Site officiel de l'établissement ») | V1, V9, V10 | 🟡 nom, établissement, pays, effectifs et liens officiels (`https://` uniquement) réels ; critères, langues, date limite et documents « À confirmer auprès de l'ENCG » pour toutes les destinations (champs prêts, à renseigner par l'administration) |
| Informations gérées par l'administrateur | `#admin/orientation` · `saveProgram` (champs facultatifs, places, note de source) | S25, V10, V12 | ✅ |
| Jamais de garantie d'admission | avertissements `#orientation`, e-mail, `#cgu` | S25 | ✅ |
| §14.4 Entretien avec un enseignant ou conseiller | formulaire `#orientation` · `requestConsultation` ; suivi `#admin/orientation` · `updateConsultation` | S25 | 🟡 pas de visio réelle |

## §15 — Study Pods (Coming Soon)

| Exigence (CDC) | Écran / action | Preuve | Statut / remarque |
|---|---|---|---|
| §15.1 Concept | `#pods`, section d'accueil | V1 | ✅ |
| §15.2 Emplacements, choix, réservation, infos pratiques, e-mail, QR (futur) | lieux « en étude » listés ; aucune réservation étudiante | S26 | ⏳ fonctionnalités futures (phase 3) |
| §15.3 QR unique, scan, présence, non réutilisable, sans donnée personnelle | `#admin/pods` · `podPrototypeCreate`, `podCheckIn` (jeton aléatoire, hachage, usage unique) | S26 | 🟡 prototype admin ; aperçu QR non scannable ⏳ |
| §15.4 Concept, avantages, « Coming Soon », formulaire d'actualités | `#pods` · `subscribePods` (e-mail `pods-news`) | S26 | ✅ |
| Aucune réservation avant la mise en service | aucune API étudiante (`bookPod` absent) | S26 | ✅ |

## §16 — Tableau de bord tuteur

| Exigence (CDC) | Écran / action | Preuve | Statut |
|---|---|---|---|
| Modifier les informations du profil | `#tuteur/profil` · `updateTutorProfile` | V1 | ✅ |
| Ajouter ou modifier les matières | `#tuteur/matieres` · `updateTutorSubjects` (nouvelle matière → revalidation) | V1 | ✅ |
| Gérer les disponibilités | `#tuteur/disponibilites` | S27 | ✅ |
| Consulter les réservations | `#tuteur/seances`, `#tuteur/apercu` | V1 | ✅ |
| Informations nécessaires aux séances | `#tuteur/seances` | V1 | ✅ |
| Rédiger les récapitulatifs | `#tuteur/seances` · `complete` | S13 | ✅ |
| Consulter les évaluations | `#tuteur/avis` | S14 | ✅ |
| Historique des séances | `#tuteur/historique` | V1 | ✅ |
| Rémunérations dues et versées | `#tuteur/remuneration` | S19 | ✅ |
| Autorisations adaptées au statut | profil en attente : édition seule ; suspendu : lecture seule (`myTutor(true)`) | V1 | ✅ |

## §17 — Tableau de bord administrateur

| Exigence (CDC) | Écran | Preuve | Statut |
|---|---|---|---|
| Gérer étudiants et tuteurs | `#admin/etudiants`, `#admin/tuteurs` | S23 | ✅ |
| Vérifier les profils | `#admin/tuteurs` | S18 | ✅ |
| Configurer les domaines e-mail | `#admin/domaines` | S23 | ✅ |
| Matières, niveaux, chapitres | `#admin/referentiel` | S23 | ✅ |
| Prix et forfaits | `#admin/tarifs`, `#admin/politique` | S17, S23 | ✅ |
| Suivre les réservations | `#admin/reservations` | V1 | ✅ |
| Paiements et remboursements | `#admin/paiements` | S9 | ✅ |
| Rémunérations des tuteurs | `#admin/remunerations` | S19 | ✅ |
| Modérer les avis | `#admin/moderation` | S14 | ✅ |
| Informations d'orientation | `#admin/orientation` | S25 | ✅ |
| Section Study Pods | `#admin/pods` | S26 | ✅ |
| Statistiques générales | `#admin/apercu` | S19 | ✅ |
| Accès limité selon les rôles | garde de route (`app.js`) + contrôle `me(role)` dans chaque fonction du store | S4, V2 | ✅ |
| (complément) Sauvegarde / restauration | `#admin/sauvegarde` · `exportData`, `importData` | S23 | ✅ |

## §18 — Exigences techniques et sécurité

| Exigence (CDC) | Réalisation | Preuve | Statut / remarque |
|---|---|---|---|
| §18.1 Navigateurs modernes, responsive | HTML/CSS/JS natifs ; contrôles à 390 et 1440 px sans débordement | V1 (+ contrôle manuel, hors dépôt) | ✅ |
| Opérations essentielles sur smartphone et ordinateur | parcours §10.1 testé à 390 px | V3 | ✅ |
| §18.2 Temps de chargement, images | aucune dépendance, images locales, `loading="lazy"` | S28 | ✅ |
| Requêtes base de données | — | — | ⏳ pas de base serveur (localStorage) |
| Tableaux de bord, fluidité | rendu par fragment, sans rechargement | V1 | ✅ |
| §18.3 HTTPS | — | — | ⏳ à l'hébergement |
| Stockage sécurisé des mots de passe | SHA-256 + sel | S1, S2 | ✅ (renforcer en production) |
| Contrôles d'accès | session + rôle | S4, V2 | ✅ ⏳ côté client uniquement : à reproduire côté serveur |
| Sauvegardes régulières | export/import JSON | S23 | ✅ planification ⏳ |
| Politique de conservation | `#confidentialite` (tableau des durées) | — | ✅ durées à confirmer |
| Suppression de compte | `deleteAccount`, `adminDeleteUser` | S22 | ✅ |
| Protection des documents transmis | contenu des pièces jointes jamais stocké | S7 | 🟡 |
| Politique de confidentialité claire | `#confidentialite` | V1 | ✅ |
| Loi 09-08, CNDP | `#confidentialite` | — | ⏳ déclaration CNDP à effectuer |
| Données, finalités, durées, mesures | `#confidentialite`, documentation technique | — | ✅ |
| Échappement des saisies (XSS) | `escape` dans `ui.js` | V4 | ✅ |
| Données locales corrompues / stockage indisponible | repli mémoire signalé | S20, S21 | ✅ données propres à un seul appareil ⏳ |
| §18.4 Technologies, hébergement, domaine, coûts, maintenance, sauvegardes, propriété, transfert, accès | [Documentation technique](DOCUMENTATION_TECHNIQUE.md) | — | ✅ documenté ; hébergement et domaine ⏳ |

## §19 — Référencement et visibilité

| Exigence (CDC) | Réalisation | Preuve | Statut / remarque |
|---|---|---|---|
| URL lisibles | routes en français (`#matieres/stats`, `#profil/t1`) | V1 | 🟡 fragments en démo ; chemins propres en production (cf. `sitemap.xml`) |
| Titres et descriptions adaptés | `title` et `meta description` par route (`app.js`) | V1 | ✅ |
| HTML sémantique | `header`, `nav`, `main`, `footer`, un `h1` par page | V1 | ✅ |
| Optimisation des performances | statique, sans dépendance | S28 | ✅ |
| Plan de site XML | `sitemap.xml` (pages publiques) | S28 | ✅ |
| Outils d'analyse | — | — | ⏳ aucun outil réseau dans la démo ; à configurer avec bannière de consentement |
| Espaces personnels non indexés | `noindex` sur routes privées, `robots.txt` | V2, S28 | ✅ |

## §23 — Critères de validation

| Critère (CDC) | Preuve | Statut |
|---|---|---|
| Créer un compte et vérifier l'e-mail universitaire | S2, S30, V8 ; `#inscription` → `#verification` | 🟡 vérification simulée : codes lisibles dans la boîte mail simulée de l'onglet (voir §5.4) |
| Tuteur : profil soumis à validation | S18 | ✅ |
| Recherche d'un tuteur selon ses besoins | S18, V3 | ✅ |
| Disponibilités = créneaux réellement réservables | S7, S27 (`freeSlots` et `available` partagent `slotIssue`) | ✅ |
| Empêcher les doubles réservations | S6, S7, S12 | ✅ |
| Prix correctement affichés | S17, V3 | ✅ |
| Paiement en ligne effectué et confirmé | S9, V3 | 🟡 |
| Confirmation uniquement après paiement validé | S9, S10 | ✅ |
| E-mails de confirmation envoyés | S24 | 🟡 |
| Forfaits : séances utilisées et restantes | S15 | ✅ |
| Comptes rendus par les tuteurs | S13 | ✅ |
| Progression calculée sur les données enregistrées | S13 | ✅ |
| Admin : comptes, réservations, paiements | S23, V1 | ✅ |
| Données personnelles protégées | S1, S3, S22, V2, V4 | ✅ (limites §18) |
| Pages principales sur mobile et ordinateur | V1 + contrôle manuel 390/1440 px (non automatisé dans le dépôt) | ✅ |
| Study Pods présentés comme fonctionnalité future | S26 | ✅ |

---

## Sections résumées

**§3 Identité visuelle.** Palette dans `styles.css` (`:root`) : bleu marine `--navy`, bleu `--blue`, fond blanc cassé `--paper:#f8f6f1`, violet `--violet` pour le focus et les accents, gris clair `--line`/`--gray`. Page d'accueil (§3.3) : logo et slogan, menu, bouton « Find Your Tutor », concept, services et tarifs, avantages, suivi de progression, aperçu de l'orientation, Study Pods « Coming Soon », pied de page avec coordonnées, CGU et confidentialité. Vérifié par S28 et V1.

**§20 Modèle économique.** Recettes par service sur `#admin/apercu` (`finance().byService`) ; Study Pods sans revenu (phase 3).

**§21 Phases.** Phase 1 complète en simulation ; phase 2 (orientation, recommandations, entretien) couverte ; phase 3 limitée à la présentation et au prototype QR admin.

**§22 Livrables.**

| Livrable | Emplacement |
|---|---|
| 1. Site fonctionnel et responsive | `index.html`, `styles.css`, `app.js`, `ui.js`, `views-*.js`, `assets/` |
| 2. Code source | dépôt (sans dépendance ni compilation) |
| 3. Base de données et documentation | `data.js` (jeu initial), `store.js` (modèle v3), [documentation technique](DOCUMENTATION_TECHNIQUE.md) |
| 4. Tableau de bord administrateur | `#admin/*` (`views-admin.js`) |
| 5. Accès techniques | comptes de démonstration sur `#connexion` (voir README) |
| 6. Documentation utilisateur | [GUIDE_UTILISATEUR.md](GUIDE_UTILISATEUR.md) |
| 7. Documentation technique | [DOCUMENTATION_TECHNIQUE.md](DOCUMENTATION_TECHNIQUE.md) |
| 8. Hébergement et domaine | `robots.txt`, `sitemap.xml` ; configuration ⏳ à fournir |
| 9. Tests | `tests/store.test.cjs`, `tests/views.test.cjs` |
| 10. Sauvegarde et restauration | `#admin/sauvegarde` ; procédure dans le guide utilisateur |
| 11. Services externes et coûts | documentation technique (comparatif CMI / Payzone « à confirmer ») |
| 12. Maintenance et anomalies | documentation technique |

**§24 Points à confirmer (ouverts).** Domaines e-mail officiels des 12 ENCG · prestataire de paiement (CMI ou Payzone) · conditions de remboursement et d'annulation (valeurs actuelles : réglages de démonstration) · calendrier du programme pilote volontaire · règles de rémunération · matières disponibles au lancement · modalités de validation des profils · programmes internationaux réels · budget, hébergement et maintenance · calendrier et périmètre de chaque phase.

## Limites de simulation (récapitulatif)

- Aucun paiement réel : passerelle CMI/Payzone simulée, aucune donnée bancaire saisie ; secret de signature présent côté client.
- Aucun e-mail réel : boîte mail simulée (`#boite-mail`), accessible à tous les visiteurs de la démo.
- Aucune visioconférence, aucune intégration universitaire. Les destinations d'orientation proviennent de la liste communiquée par l'ENCG (2025-2026) ; leurs critères d'admission non communiqués sont affichés « à confirmer », jamais inventés.
- Pas de HTTPS en `file:` ; pas de serveur ni de base de données : sessions et données dans `localStorage` (clé `ontrack-demo-v3`), propres à un seul navigateur, avec repli mémoire.
- Contrôles d'accès appliqués dans le navigateur uniquement ; à reproduire côté serveur en production.
- Pièces jointes : métadonnées seulement (nom, type, taille).
- QR Study Pods : aperçu visuel non scannable, prototype réservé à l'administration.
- Routage par fragment (`#…`) ; le plan de site décrit les chemins propres prévus en production.
- Aucun outil d'analyse d'audience ; optimisation des requêtes base de données non applicable.
- Déclaration CNDP, hébergement et nom de domaine à réaliser avant lancement.
