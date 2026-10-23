# ONTRACK
## CAHIER DES CHARGES FONCTIONNEL ET TECHNIQUE

**Slogan :** Your Study, Our Priority.  
**Version :** 2.0  
**Type de projet :** Plateforme web de tutorat universitaire et d'orientation académique  
**Pays de lancement :** Maroc  
**Public cible :** Étudiants des 12 Écoles Nationales de Commerce et de Gestion (ENCG) du Maroc.

---

# 1. Présentation du projet

## 1.1. Concept général

ONTRACK est une plateforme numérique dédiée exclusivement aux étudiants des 12 ENCG du Maroc. Elle a pour objectif de faciliter l'accès à un accompagnement universitaire personnalisé, en mettant en relation les étudiants ayant des difficultés académiques avec des tuteurs maîtrisant les matières enseignées dans les ENCG.

La plateforme répond à plusieurs problèmes rencontrés par les étudiants : difficultés à comprendre certains chapitres, cours manqués, accumulation de travail, manque de temps pour chercher de l'aide et préparation insuffisante aux examens.

ONTRACK proposera des séances de tutorat individuelles, adaptées aux besoins de chaque étudiant, ainsi qu'un système de suivi de progression permettant de visualiser les matières étudiées et les chapitres travaillés.

La plateforme sera développée progressivement, avec une première version centrée sur le tutorat en ligne. Les espaces physiques ONTRACK Study Pods et les fonctionnalités avancées d'orientation internationale seront intégrés dans les phases ultérieures.

## 1.2. Identité du projet

- **Nom :** ONTRACK
- **Slogan :** Your Study, Our Priority.
- **Domaine :** Éducation, tutorat universitaire et orientation académique.
- **Zone de lancement :** Maroc.
- **Langue principale de l'interface :** Français.
- **Langues supplémentaires envisageables :** Arabe et anglais.

## 1.3. Objectifs

- Faciliter l'accès à un soutien universitaire adapté aux programmes des ENCG.
- Mettre en relation les étudiants avec des tuteurs issus des différentes ENCG.
- Proposer des séances flexibles, accessibles en ligne.
- Permettre aux étudiants de suivre leur progression académique.
- Proposer des formules adaptées à différents budgets et besoins.
- Faciliter l'accès aux informations sur les échanges universitaires et la double diplomation.
- Développer progressivement un réseau d'espaces d'étude physiques.

# 2. Public cible et types d'utilisateurs

La plateforme comprendra trois catégories principales d'utilisateurs.

## 2.1. Étudiants

Les étudiants pourront :

- Créer un compte et vérifier leur adresse e-mail universitaire.
- Sélectionner leur ENCG, leur niveau et leur filière.
- Rechercher des tuteurs par matière et par compétence.
- Décrire précisément leurs difficultés.
- Réserver et payer des séances.
- Consulter leur historique de réservation.
- Accéder aux récapitulatifs de leurs séances.
- Suivre leur progression académique.
- Consulter le portail d'orientation internationale.

## 2.2. Tuteurs

Les tuteurs pourront :

- Créer leur profil.
- Indiquer leur ENCG, leur niveau d'études et leurs compétences.
- Définir leurs disponibilités.
- Consulter et gérer leurs réservations.
- Accéder aux informations nécessaires à chaque séance.
- Rédiger les comptes rendus des séances.
- Consulter les évaluations reçues.
- Accéder aux informations relatives à leur rémunération, lorsqu'ils seront rémunérés.

Les profils devront être validés par l'administrateur avant leur publication.

## 2.3. Administrateur

L'administrateur disposera d'un tableau de bord lui permettant de :

- Gérer les comptes étudiants et tuteurs.
- Valider les profils des tuteurs.
- Gérer les matières, les chapitres et les niveaux.
- Configurer les tarifs et les forfaits.
- Suivre les réservations et les paiements.
- Gérer les annulations et les remboursements.
- Modérer les avis.
- Mettre à jour les informations d'orientation internationale.
- Consulter les statistiques de la plateforme.
- Gérer les futures fonctionnalités Study Pods.

# 3. Identité visuelle et design

## 3.1. Palette de couleurs

L'identité visuelle devra être moderne, professionnelle et adaptée à un public universitaire.

La palette souhaitée comprend :

- **Bleu marine :** couleur principale, associée à la confiance et au sérieux.
- **Bleu :** couleur secondaire, associée à la clarté et à la progression.
- **Blanc cassé :** couleur de fond principale.
- **Violet :** couleur d'accent pour certains éléments interactifs.
- **Gris clair :** couleur complémentaire pour les séparateurs et les arrière-plans secondaires.

Le développeur pourra proposer des nuances précises et une charte graphique cohérente.

## 3.2. Style général

Le site devra être :

- Moderne et minimaliste.
- Professionnel et rassurant.
- Facile à utiliser.
- Adapté aux ordinateurs, tablettes et smartphones.
- Lisible et accessible.
- Rapide à charger.

Les tableaux de bord, les profils des tuteurs, les boutons de réservation et les indicateurs de progression devront être visuellement clairs.

## 3.3. Page d'accueil

La page d'accueil devra présenter :

- Le logo ONTRACK et son slogan.
- Un menu de navigation.
- Un bouton principal « Find Your Tutor ».
- Une présentation du concept.
- Les services et leurs tarifs.
- Les avantages de la plateforme.
- Le système de suivi de progression.
- Un aperçu du portail d'orientation.
- Une section ONTRACK Study Pods avec la mention « Coming Soon ».
- Un pied de page avec les coordonnées, les conditions d'utilisation et la politique de confidentialité.

# 4. Architecture générale du site

La plateforme devra comprendre les pages suivantes :

1. Page d'accueil.
2. Page de présentation d'ONTRACK.
3. Inscription et connexion.
4. Tableau de bord étudiant.
5. Catalogue des matières.
6. Catalogue et profils des tuteurs.
7. Page de réservation.
8. Page de paiement.
9. Confirmation de réservation.
10. Historique des séances.
11. Espace de suivi de progression.
12. Tableau de bord tuteur.
13. Portail d'orientation internationale.
14. Page ONTRACK Study Pods — Coming Soon.
15. Page de contact et d'assistance.
16. Tableau de bord administrateur.
17. Pages légales et politique de confidentialité.

# 5. Inscription et vérification des étudiants

## 5.1. Principe d'inscription

L'accès à ONTRACK sera réservé aux étudiants des 12 ENCG participantes.

Chaque étudiant devra créer un compte à partir des informations suivantes :

- Nom et prénom.
- Adresse e-mail officielle de son ENCG.
- École d'appartenance.
- Niveau d'études.
- Filière ou spécialité, si applicable.

## 5.2. Vérification par e-mail universitaire

Les étudiants des ENCG disposent d'adresses e-mail associées à leur établissement. La plateforme utilisera ces adresses comme première méthode de vérification.

Le processus devra fonctionner comme suit :

1. L'étudiant sélectionne son ENCG.
2. Il saisit son adresse e-mail universitaire.
3. Le système vérifie que le domaine de l'adresse correspond à un domaine autorisé pour cette école.
4. ONTRACK envoie un lien ou un code de vérification à cette adresse.
5. L'étudiant confirme son adresse e-mail.
6. Son compte est activé et il peut accéder à la plateforme.

Le développeur devra configurer une liste des domaines officiels autorisés, à confirmer pour chaque ENCG.

## 5.3. Vérification de l'inscription

La vérification de l'adresse e-mail confirme que l'utilisateur peut accéder à cette boîte de réception. Elle ne garantit pas à elle seule que l'étudiant est toujours inscrit dans l'établissement.

Dans une première version, la vérification par e-mail universitaire pourra constituer le mécanisme initial d'accès.

Une intégration future avec les systèmes universitaires pourra être étudiée si les établissements donnent leur autorisation et si un mécanisme technique officiel est disponible.

Le numéro Apogée ne devra pas être utilisé seul comme mot de passe ou comme preuve suffisante d'identité. Aucun mot de passe universitaire ne devra être demandé.

## 5.4. Sécurité des comptes

La plateforme devra intégrer :

- La vérification des adresses e-mail.
- La récupération du mot de passe.
- Le stockage sécurisé des mots de passe.
- La gestion des sessions.
- La protection contre les tentatives de connexion abusives.
- La déconnexion sécurisée.
- Une procédure de suppression de compte.

# 6. Espace étudiant

Chaque étudiant disposera d'un tableau de bord personnalisé.

## 6.1. Tableau de bord

Il affichera :

- Un message de bienvenue.
- Les prochaines séances.
- Les réservations en attente.
- L'historique des séances.
- Les forfaits actifs et leur solde de séances.
- Les matières étudiées.
- La progression par matière.
- Les derniers comptes rendus.
- Un accès rapide à la réservation.

## 6.2. Description des besoins

Lorsqu'un étudiant souhaite réserver une séance, il devra pouvoir préciser :

- Son ENCG.
- Son niveau d'études.
- La matière concernée.
- Le chapitre ou le sujet.
- Le type de difficulté rencontrée.
- Le type de service souhaité.
- Le mode de séance.
- Les disponibilités souhaitées.

Une zone de texte libre permettra à l'étudiant de décrire précisément son besoin.

**Exemple :** « J'ai des difficultés à comprendre les élasticités en microéconomie. J'aimerais revoir les formules et travailler des exercices d'application. »

Le système devra utiliser ces informations pour faciliter la recherche d'un tuteur adapté.

Une fonctionnalité permettant de joindre un cours, un PDF ou une photo d'exercice pourra être ajoutée, avec des limites de format et de taille.

# 7. Catalogue des tuteurs

## 7.1. Informations du profil

Chaque profil devra afficher :

- Photo de profil, avec consentement.
- Nom et prénom ou nom d'affichage.
- ENCG d'appartenance.
- Niveau d'études.
- Matières enseignées.
- Chapitres maîtrisés.
- Description personnelle.
- Langues d'enseignement.
- Disponibilités.
- Types de séances proposés.
- Note moyenne.
- Avis des étudiants.

L'affichage de l'âge sera facultatif et soumis au consentement du tuteur.

## 7.2. Recherche et filtres

L'étudiant devra pouvoir filtrer les tuteurs selon :

- La matière.
- Le chapitre.
- L'ENCG.
- Le niveau d'études.
- La disponibilité.
- La langue d'enseignement.
- La note moyenne.
- Le mode de séance.

## 7.3. Avis et évaluations

Après une séance terminée, l'étudiant pourra attribuer une note et rédiger un avis.

Seuls les étudiants ayant effectivement réservé une séance pourront publier une évaluation liée à cette réservation.

L'administrateur pourra modérer les avis signalés et traiter les contenus abusifs.

# 8. Services et tarification

Les tarifs devront être affichés clairement sur le site. Ils seront configurables depuis le tableau de bord administrateur.

## 8.1. Service 1 — 90-Minute Catch-up

**Prix : 150 DH par séance**

- Durée : 90 minutes.
- Fréquence : séance ponctuelle.
- Contenu : explication personnalisée d'un chapitre, rattrapage de cours manqués et exercices guidés.
- Objectif : aider l'étudiant à comprendre un sujet précis.
- Public cible : étudiants ayant besoin d'un accompagnement approfondi.

## 8.2. Service 2 — Quick Help

**Prix : 50 DH par séance**

- Durée : 30 minutes.
- Fréquence : séance ponctuelle.
- Contenu : explication rapide, clarification d'un concept ou aide sur un exercice.
- Objectif : résoudre une difficulté ciblée.
- Public cible : étudiants ayant une question urgente ou un blocage précis.

## 8.3. Service 3 — Exam Rescue

**Prix : 399 DH pour trois séances**

- Durée : trois séances de 90 minutes.
- Validité : une semaine.
- Contenu : révision du cours, exercices d'application, questions de type examen et identification des points faibles.
- Objectif : préparer les examens de manière structurée.

Prix des trois séances réservées individuellement : 450 DH.

**Économie pour l'étudiant : 51 DH.**

La plateforme devra permettre de réserver le forfait, de planifier les trois séances et de suivre les séances réalisées et restantes.

## 8.4. Service 4 — Stay ONTRACK

**Prix : 349 DH par mois**

- Nombre de séances : quatre par mois.
- Durée : 60 minutes par séance.
- Fréquence recommandée : une séance par semaine.
- Contenu : tutorat régulier, suivi des difficultés, bilans de progression et récapitulatifs après les séances.
- Objectif : maintenir un accompagnement académique régulier pendant le semestre.

Le forfait comprendra :

- Quatre séances individuelles de 60 minutes.
- Un suivi de progression par matière.
- Un récapitulatif après chaque séance.
- Un accès prioritaire aux créneaux disponibles, selon les règles définies par la plateforme.

**Avantage tarifaire :** quatre séances de 60 minutes facturées au tarif horaire équivalent de l'offre Catch-up représenteraient 400 DH. L'abonnement à 349 DH permet donc une économie de 51 DH.

Les conditions suivantes devront être définies avant le lancement :

- Date de début et de fin de validité.
- Report ou expiration des séances non utilisées.
- Conditions de renouvellement.
- Conditions de résiliation.
- Règles d'annulation et de reprogrammation.

L'abonnement devra être présenté comme un forfait de quatre séances par mois, et non comme un accès illimité au tutorat.

## 8.5. Récapitulatif des tarifs

| Service | Durée | Prix |
|---|---|---:|
| Quick Help | 30 minutes | 50 DH |
| 90-Minute Catch-up | 90 minutes | 150 DH |
| Exam Rescue | 3 × 90 minutes | 399 DH |
| Stay ONTRACK | 4 × 60 minutes par mois | 349 DH |

Les tarifs pourront être ajustés par l'administrateur, sans intervention technique, dans les limites prévues par la politique commerciale.

# 9. Rémunération des tuteurs

Le modèle économique devra permettre à ONTRACK de rémunérer progressivement les tuteurs tout en conservant une marge suffisante pour financer le fonctionnement de la plateforme.

## 9.1. Phase initiale : programme de tutorat volontaire

Lors du lancement, ONTRACK pourra commencer avec un groupe limité de tuteurs volontaires.

L'objectif sera de tester le fonctionnement du service, de mesurer la demande et d'améliorer le parcours utilisateur avant de développer un réseau de tuteurs rémunérés.

Le programme pilote pourra être limité à environ 10 à 20 séances, avec une durée et des conditions de participation clairement définies.

Les tuteurs volontaires pourront bénéficier, selon les modalités prévues :

- D'un profil valorisant leurs compétences.
- D'un certificat de participation lorsque sa délivrance est légitime.
- D'une reconnaissance sur la plateforme, avec leur accord.
- D'une priorité pour de futures opportunités rémunérées.
- Du remboursement d'éventuels frais convenus à l'avance.

Le caractère volontaire du programme devra être explicite. La participation ne devra pas être présentée comme une obligation permettant d'accéder à une future rémunération garantie.

La collecte des paiements des étudiants et l'utilisation des recettes devront être transparentes. Les règles applicables à une activité commerciale utilisant des contributions volontaires devront être vérifiées avant le lancement.

## 9.2. Phase de rémunération

Lorsque le volume de réservations sera suffisamment régulier, ONTRACK pourra mettre en place une rémunération par séance terminée.

Les montants ci-dessous constituent des propositions de départ à valider avec les tuteurs.

| Service | Paiement proposé au tuteur | Montant conservé par ONTRACK avant autres coûts |
|---|---:|---:|
| Quick Help — 30 min | 30 DH | 20 DH |
| Catch-up — 90 min | 90 DH | 60 DH |
| Exam Rescue — 3 séances | 225 DH au total | 174 DH |
| Stay ONTRACK — 4 séances | 200 DH au total | 149 DH |

Pour Exam Rescue, la rémunération proposée est de 75 DH par séance de 90 minutes, soit 225 DH pour les trois séances.

Pour Stay ONTRACK, le tuteur recevra 50 DH par séance de 60 minutes, soit 200 DH pour les quatre séances.

Ces montants devront être évalués selon la disponibilité des tuteurs, le temps de préparation nécessaire, les frais de plateforme et la viabilité financière de chaque offre.

Les paiements aux tuteurs devront être effectués selon un calendrier défini et après vérification des séances réalisées.

## 9.3. Suivi financier

L'administrateur devra pouvoir consulter :

- Le chiffre d'affaires généré par les séances.
- Les sommes dues aux tuteurs.
- Les paiements déjà effectués.
- Les frais de paiement.
- Les remboursements.
- Les recettes par type de service.

Le montant conservé par ONTRACK ne devra pas être assimilé automatiquement au bénéfice net. Les dépenses d'hébergement, de marketing, de maintenance, de paiement et d'exploitation devront être prises en compte.

# 10. Réservation des séances

## 10.1. Parcours de réservation

Le parcours devra fonctionner selon les étapes suivantes :

1. L'étudiant sélectionne sa matière.
2. Il décrit son besoin.
3. Il choisit un service.
4. Il consulte les profils des tuteurs correspondants.
5. Il sélectionne un tuteur.
6. Il consulte les créneaux disponibles.
7. Il choisit un créneau.
8. Il vérifie le récapitulatif et le prix.
9. Il procède au paiement.
10. Le système vérifie le paiement et confirme la réservation.
11. Un e-mail de confirmation est envoyé à l'étudiant.

Le système devra empêcher les doubles réservations et mettre à jour les disponibilités automatiquement.

## 10.2. Disponibilités

Les tuteurs devront pouvoir :

- Définir leurs créneaux disponibles.
- Modifier leurs disponibilités.
- Bloquer des périodes d'indisponibilité.
- Consulter leurs réservations.
- Recevoir des notifications de nouvelles réservations.

Le fuseau horaire de référence sera celui du Maroc.

## 10.3. Annulation et reprogrammation

Une politique claire devra être établie concernant :

- Les délais d'annulation.
- Les modifications de créneau.
- Les absences.
- Les remboursements.
- Les séances non utilisées dans les forfaits.

Le système devra appliquer automatiquement les règles configurées et les communiquer à l'étudiant avant le paiement.

# 11. Paiement en ligne

## 11.1. Objectif

Les étudiants devront pouvoir payer directement sur le site au moyen d'une solution de paiement électronique adaptée au marché marocain.

Le paiement en ligne permettra d'automatiser la confirmation des réservations et de simplifier la gestion des transactions.

## 11.2. Prestataires à étudier

Le développeur devra comparer les solutions disponibles, notamment :

- **CMI :** solution de paiement électronique à étudier pour l'intégration du paiement par carte bancaire.
- **Payzone :** autre solution à étudier pour les paiements en ligne.

Le choix final dépendra des frais, des conditions d'ouverture du compte marchand, des modalités de règlement, des capacités d'intégration et des exigences réglementaires applicables.

Aucun prestataire ne devra être considéré comme définitivement sélectionné avant validation de ces éléments.

## 11.3. Parcours de paiement

Le parcours devra être le suivant :

1. L'étudiant choisit son service ou son forfait.
2. Le système affiche le montant total à payer.
3. L'étudiant confirme sa réservation.
4. Il est dirigé vers le parcours de paiement sécurisé.
5. Le prestataire traite la transaction.
6. ONTRACK vérifie la confirmation du paiement.
7. La réservation est confirmée.
8. Un e-mail de confirmation est envoyé.
9. Le paiement apparaît dans l'historique du compte étudiant.

En cas d'échec, la réservation ne devra pas être considérée comme payée.

## 11.4. Exigences de sécurité

Le système devra :

- Utiliser HTTPS.
- Vérifier les notifications de paiement provenant du prestataire.
- Éviter les doubles transactions.
- Enregistrer le statut des paiements.
- Gérer les remboursements autorisés.
- Ne pas stocker directement les données bancaires sensibles si elles sont traitées par le prestataire.
- Conserver un historique des transactions pour l'administration.

## 11.5. Paiement des tuteurs

Pendant la phase volontaire, aucune rémunération par séance ne sera due au titre du programme de bénévolat, sous réserve des règles et engagements convenus.

Pendant la phase rémunérée, ONTRACK devra enregistrer les sommes dues et les sommes versées aux tuteurs.

Le paiement direct des étudiants et le versement des rémunérations aux tuteurs devront être gérés selon les conditions du prestataire choisi, les obligations légales et le modèle contractuel retenu.

# 12. Notifications et e-mails

La plateforme devra envoyer automatiquement des e-mails pour les événements suivants :

- Vérification de l'adresse e-mail.
- Confirmation de création du compte.
- Réservation confirmée.
- Paiement confirmé.
- Échec de paiement.
- Rappel avant la séance.
- Annulation ou modification de réservation.
- Mise à disposition d'un récapitulatif.
- Information sur un forfait actif.
- Confirmation d'une demande d'orientation.

Les e-mails devront respecter l'identité visuelle d'ONTRACK et être rédigés dans un style clair et professionnel.

# 13. Suivi de la progression académique

## 13.1. Tableau de progression

Chaque étudiant devra pouvoir consulter un tableau de bord présentant la progression par matière.

Exemple :

- Mathématiques appliquées : 25 % des chapitres travaillés.
- Comptabilité générale : 60 % des chapitres travaillés.
- Microéconomie : 40 % des chapitres travaillés.

Ces pourcentages devront être calculés à partir des chapitres enregistrés dans le système.

## 13.2. Compte rendu des séances

Après chaque séance, le tuteur devra enregistrer un récapitulatif comprenant :

- La matière et le chapitre étudiés.
- Les notions abordées.
- Les exercices travaillés.
- Les difficultés identifiées.
- Les points à réviser.
- Les recommandations pour la prochaine séance.

L'étudiant pourra consulter ses récapitulatifs depuis son espace personnel.

## 13.3. Calcul de la progression

Les chapitres pourront avoir les statuts suivants :

- À étudier.
- En cours d'apprentissage.
- Révisé.
- Maîtrisé, selon les critères pédagogiques définis.

Le système devra expliquer la méthode de calcul utilisée.

La progression affichée représentera un indicateur de suivi pédagogique et ne constituera pas une garantie de maîtrise réelle d'une matière.

# 14. Portail d'orientation internationale

## 14.1. Objectif

Le portail d'orientation devra aider les étudiants à découvrir les opportunités d'échange universitaire et de double diplomation proposées dans le cadre des partenariats des ENCG participantes.

## 14.2. Informations collectées

L'étudiant pourra renseigner :

- Son ENCG.
- Son niveau d'études.
- Sa filière.
- Ses résultats académiques.
- Les matières et semestres validés.
- Les langues maîtrisées.
- Ses préférences géographiques.
- Le type de programme recherché.

Les informations demandées devront être limitées aux données nécessaires à l'orientation.

## 14.3. Recommandations personnalisées

La plateforme devra proposer les programmes potentiellement adaptés au profil de l'étudiant.

Chaque résultat devra afficher, lorsque ces informations sont disponibles :

- Le nom du programme.
- L'établissement partenaire.
- Le pays de destination.
- Le type de mobilité.
- Les critères académiques.
- Les exigences linguistiques.
- Les dates limites de candidature.
- Les documents nécessaires.
- Le lien vers la source officielle.

Les informations devront être gérées et actualisées par l'administrateur.

Les recommandations ne devront jamais garantir l'admission d'un étudiant.

## 14.4. Consultation d'un enseignant

Une fonctionnalité future pourra permettre de demander un entretien d'orientation avec un enseignant ou un conseiller autorisé.

Cette consultation pourra aider l'étudiant à comprendre les critères d'admission, comparer les programmes et préparer son dossier.

# 15. ONTRACK Study Pods — Coming Soon

## 15.1. Concept

Les Study Pods seront de petits espaces privés et professionnels situés à proximité des campus universitaires.

Ils permettront aux étudiants de rencontrer leurs tuteurs dans un lieu adapté au travail, sans avoir à recevoir quelqu'un chez eux.

## 15.2. Fonctionnalités futures

Lorsque le service sera opérationnel, les étudiants pourront :

- Consulter les emplacements disponibles.
- Choisir un Study Pod.
- Réserver un créneau.
- Consulter les informations pratiques du lieu.
- Recevoir une confirmation par e-mail.
- Présenter un QR code à leur arrivée.

## 15.3. QR code et validation de présence

Après confirmation de la réservation, le système générera un QR code unique associé à celle-ci.

À l'arrivée, le code sera scanné afin de vérifier la validité de la réservation et d'enregistrer la présence.

Le QR code devra être conçu pour éviter les réutilisations non autorisées et ne devra pas exposer directement de données personnelles sensibles.

## 15.4. Présentation avant le lancement

Tant que les espaces ne seront pas opérationnels, la section affichera :

- Le concept des Study Pods.
- Leurs avantages.
- Une mention visible « Coming Soon ».
- Un formulaire facultatif permettant de recevoir les actualités du lancement.

Aucune réservation ne devra être possible avant la mise en service effective des espaces.

# 16. Tableau de bord tuteur

Le tableau de bord tuteur devra permettre de :

- Modifier les informations du profil.
- Ajouter ou modifier les matières enseignées.
- Gérer les disponibilités.
- Consulter les réservations.
- Accéder aux informations nécessaires aux séances.
- Rédiger les récapitulatifs.
- Consulter les évaluations.
- Consulter l'historique des séances.
- Consulter les rémunérations dues et versées, pendant la phase rémunérée.

Les autorisations devront être adaptées au statut du tuteur et à ses responsabilités.

# 17. Tableau de bord administrateur

L'administrateur devra pouvoir :

- Gérer les étudiants et les tuteurs.
- Vérifier les profils.
- Configurer les domaines e-mail autorisés.
- Gérer les matières, niveaux et chapitres.
- Configurer les prix et forfaits.
- Suivre les réservations.
- Consulter les paiements et remboursements.
- Suivre les rémunérations des tuteurs.
- Modérer les avis.
- Mettre à jour les informations d'orientation.
- Gérer la section Study Pods.
- Consulter les statistiques générales.

L'accès aux données devra être limité selon les rôles et les autorisations.

# 18. Exigences techniques et sécurité

## 18.1. Compatibilité

Le site devra fonctionner sur les navigateurs modernes et être entièrement responsive.

Les opérations essentielles devront être disponibles sur smartphone et ordinateur.

## 18.2. Performance

Le développeur devra optimiser :

- Les temps de chargement.
- Les images.
- Les requêtes à la base de données.
- Les tableaux de bord.
- La fluidité de navigation.

## 18.3. Protection des données

La plateforme devra intégrer :

- HTTPS.
- Un stockage sécurisé des mots de passe.
- Des contrôles d'accès.
- Des sauvegardes régulières.
- Une politique de conservation des données.
- Une procédure de suppression de compte.
- Une protection des documents transmis.
- Une politique de confidentialité claire.

Le projet devra respecter les règles marocaines applicables à la protection des données personnelles, notamment la loi n° 09-08 et les obligations pertinentes de la CNDP.

Le développeur devra préciser les données collectées, leur finalité, les durées de conservation et les mesures de sécurité retenues.

## 18.4. Propriété et maintenance

Le développeur devra préciser :

- Les technologies utilisées.
- L'hébergement.
- Le nom de domaine.
- Les coûts récurrents.
- Les modalités de maintenance.
- Les sauvegardes.
- La propriété du code source.
- Les conditions de transfert du projet.
- Les accès administrateur et techniques.

# 19. Référencement et visibilité

La plateforme devra être conçue pour faciliter sa découverte sur les moteurs de recherche.

Les exigences comprendront :

- Des URL lisibles.
- Des titres et descriptions adaptés.
- Une structure HTML sémantique.
- L'optimisation des performances.
- Un plan de site XML.
- La configuration des outils d'analyse nécessaires.

Les espaces personnels et les données privées ne devront pas être indexés publiquement.

# 20. Modèle économique

Le modèle économique reposera principalement sur :

1. Les séances Quick Help.
2. Les séances Catch-up.
3. Les forfaits Exam Rescue.
4. Les abonnements Stay ONTRACK.
5. Les futurs revenus générés par les Study Pods.

La phase pilote permettra d'évaluer la demande et d'améliorer le service avant d'élargir le réseau de tuteurs.

La viabilité financière devra tenir compte des paiements aux tuteurs, des frais de transaction, de l'hébergement, du marketing, de la maintenance et des remboursements.

# 21. Phases de développement

## Phase 1 — MVP : lancement initial

La première version devra inclure :

- Identité visuelle et page d'accueil.
- Inscription et vérification par e-mail universitaire.
- Connexion sécurisée.
- Profils étudiants et tuteurs.
- Catalogue des matières et tuteurs.
- Recherche et filtres.
- Description personnalisée des besoins.
- Réservation des séances en ligne.
- Gestion des disponibilités.
- Tarifs et forfaits.
- Paiement en ligne.
- Confirmation par e-mail.
- Historique des réservations.
- Comptes rendus des séances.
- Suivi de progression.
- Tableau de bord administrateur.

## Phase 2 — Orientation et amélioration

Cette phase comprendra :

- Portail d'orientation internationale.
- Recommandations de programmes.
- Consultation avec un enseignant ou un conseiller.
- Statistiques pédagogiques avancées.
- Amélioration des notifications.

## Phase 3 — Study Pods

Cette phase comprendra :

- Gestion des lieux.
- Réservation des espaces.
- Gestion des créneaux.
- QR codes.
- Validation des présences.
- Gestion administrative des espaces.

Les Study Pods resteront en mode « Coming Soon » jusqu'à leur ouverture effective.

# 22. Livrables attendus

Le développeur devra fournir :

1. Le site web fonctionnel et responsive.
2. Le code source conformément aux conditions contractuelles.
3. La base de données et sa documentation.
4. Le tableau de bord administrateur.
5. Les accès techniques convenus.
6. La documentation utilisateur.
7. La documentation technique.
8. Les configurations d'hébergement et de nom de domaine.
9. Les tests des fonctionnalités principales.
10. Les procédures de sauvegarde et de restauration.
11. La liste des services externes et de leurs coûts.
12. Les conditions de maintenance et de correction des anomalies.

# 23. Critères de validation

La première version sera considérée comme fonctionnelle lorsque :

- Un étudiant pourra créer un compte et vérifier son e-mail universitaire.
- Un tuteur pourra créer un profil soumis à validation.
- L'étudiant pourra rechercher un tuteur selon ses besoins.
- Les disponibilités correspondront aux créneaux réellement réservables.
- Le système empêchera les doubles réservations.
- Les prix seront correctement affichés.
- Le paiement en ligne pourra être effectué et confirmé.
- Les réservations seront confirmées uniquement après validation du paiement.
- Les e-mails de confirmation seront envoyés.
- Les forfaits permettront de suivre les séances utilisées et restantes.
- Les tuteurs pourront rédiger les comptes rendus.
- La progression sera calculée à partir des données enregistrées.
- L'administrateur pourra gérer les comptes, les réservations et les paiements.
- Les données personnelles seront protégées.
- Les pages principales fonctionneront sur mobile et ordinateur.
- Les Study Pods seront clairement présentés comme une fonctionnalité future.

# 24. Points à confirmer avant le développement

Avant la signature du devis définitif, les éléments suivants devront être précisés :

- La liste exacte des domaines e-mail officiels des 12 ENCG.
- Le prestataire de paiement retenu.
- Les conditions de remboursement et d'annulation.
- Le calendrier et les conditions du programme pilote volontaire.
- Les règles de rémunération des tuteurs.
- Les matières disponibles au lancement.
- Les modalités de validation des profils.
- Les programmes internationaux à intégrer.
- Le budget initial.
- Les coûts d'hébergement et de maintenance.
- Le calendrier de réalisation.
- Le périmètre précis de chaque phase.

# Conclusion

ONTRACK ambitionne de devenir une plateforme de référence pour le soutien et l'accompagnement des étudiants des 12 ENCG du Maroc.

Sa valeur repose sur un tutorat spécialisé, des séances personnalisées, un suivi de progression, des paiements simplifiés et un accès facilité aux opportunités académiques internationales.

Le développement devra privilégier une première version fiable, sécurisée et facile à utiliser, tout en préparant une architecture évolutive permettant d'intégrer les Study Pods et les fonctionnalités avancées d'orientation.

**ONTRACK — Your Study, Our Priority.**
