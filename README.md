# ONTRACK

**Your Study, Our Priority.**

Demonstration academique interactive en francais, realisee uniquement avec HTML, CSS et JavaScript natifs. Aucun serveur applicatif, aucune compilation, aucune dependance a installer et aucune requete reseau au fonctionnement.

## Lancement

Ouvrir directement [index.html](index.html) dans un navigateur recent (Chrome, Edge ou Firefox). JavaScript doit etre actif. Les scripts classiques et les images locales fonctionnent avec une URL `file:`. Il n'est pas necessaire de demarrer un serveur.

Le stockage des pages `file:` depend du navigateur et de ses reglages. Un bandeau signale le repli en memoire si localStorage est indisponible, invalide ou sature. En mode memoire, les donnees restent utilisables pendant la visite, mais sont perdues au rechargement. Utiliser le meme navigateur, le meme chemin et le meme onglet pour la soutenance. Ne pas utiliser plusieurs onglets pour modifier simultanement les donnees ; un avertissement invite a recharger en cas de changement dans un autre onglet sur les origines qui le permettent.

Pour un hebergement statique facultatif, deposer ensemble les fichiers HTML, CSS, JS et le dossier assets sur un hebergeur statique. Aucun service distant ni variable d'environnement n'est requis. Le stockage reste propre a l'origine du site et ne migre pas depuis le fichier local.

## Scenario de soutenance

1. Choisir **Reinitialiser la demo** dans le pied de page et confirmer. Les creneaux initiaux sont generes relativement au jour de la remise a zero, a 10 h, 14 h et 18 h, en heure marocaine. Les changements saisonniers du fuseau `Africa/Casablanca` sont pris en compte par `Intl`.
2. Depuis **Creer mon profil**, saisir un nom invente, une ENCG, un niveau et une filiere, puis cocher la verification fictive. Un profil exemple est deja disponible au premier lancement. Aucun e-mail, mot de passe ou document n'est collecte.
3. Dans **Trouver un tuteur**, appliquer des filtres, ouvrir le profil de Yassine puis choisir un creneau. Decrire un besoin fictif. Choisir le resultat de paiement **Refuse** ou **Abandonne** : aucune reservation ni transaction n'est creee. Reessayer avec **Accepte**.
4. Retrouver la seance dans l'espace etudiant. Reprogrammer vers un autre creneau. Changer d'espace avec le selecteur d'en-tete : le tuteur et l'administration retrouvent la meme reservation. Recharger pour constater sa persistance lorsque le stockage fonctionne.
5. Dans l'espace tuteur, choisir Yassine puis **Simuler la fin de seance** et confirmer. Cette action est uniquement un raccourci de soutenance, sans video ni modification de l'horloge. Cocher un ou plusieurs chapitres, indiquer revise ou maitrise et publier le compte rendu. Une seance reellement ecoulee accepte aussi le compte rendu sans simulation. Une seance terminee ne peut plus etre annulee ou reprogrammee.
6. Dans l'espace etudiant, lire le compte rendu, publier un avis unique et consulter la progression. Un chapitre distinct sur les six du catalogue donne 17 %, deux donnent 33 %. Le calcul utilise les chapitres revises ou maitrises des comptes rendus, sans doublons.
7. Reserver **Exam Rescue** : 399 DH simules activent trois seances de 90 min sur sept jours, premiere seance incluse. Pour les suivantes, choisir le forfait existant dans **Reglement simule** ; une seule transaction d'achat reste enregistree. Un forfait epuise, expire ou incompatible avec la date choisie est bloque. **Stay ONTRACK** comprend quatre seances de 60 min sur un mois calendaire, borne au dernier jour du mois si necessaire.
8. Annuler une seance future et confirmer : restituer le credit valide sans changer son expiration, ou demander un remboursement simule sans restitution du credit. Une annulation repetee est refusee. Sans forfait, l'annulation enregistre directement le remboursement simule.
9. Dans l'administration, **Comptes & validation**, valider Adam. Son profil devient reservable dans le catalogue. Une nouvelle soumission de profil depuis l'espace tuteur remet la validation en attente. La suspension n'annule pas les reservations deja creees, mais bloque les nouvelles reservations et reprogrammations vers ce profil.
10. Modifier le tarif Quick Help dans **Catalogue & tarifs**, puis effectuer une nouvelle reservation. Le nouveau tarif s'applique seulement au nouvel achat ; reservations, transactions et valeur des credits deja achetes restent inchanges. Consulter les statistiques derivees, remboursements, remunerations, moderation et messages locaux.
11. Dans **Orientation**, comparer les programmes fictifs avec filiere, niveau, pays, langue, moyenne et budget. Les criteres sont affiches ; aucun resultat ne promet une admission. L'administration peut modifier les seuils, budgets et la visibilite des programmes. **Study Pods** ne propose aucune reservation et reste **Coming Soon**.
12. Tester le contact local, puis la suppression du profil etudiant avec confirmation. Pour recommencer, confirmer la remise a zero. Une confirmation annulee ne modifie rien.

## Offres initiales et regles

| Offre | Tarif simule | Format |
| --- | --- | --- |
| Quick Help | 50 DH | 1 × 30 min |
| Catch-up | 150 DH | 1 × 90 min |
| Exam Rescue | 399 DH | 3 × 90 min sur sept jours |
| Stay ONTRACK | 349 DH | 4 × 60 min sur un mois |

Les forfaits commencent au paiement simule et chaque seance doit se terminer avant l'expiration. Le mois Stay ONTRACK est calcule en heure marocaine, y compris lors des changements saisonniers. Aucun renouvellement automatique ; credits expires non reportes. L'annulation n'est permise qu'avant le debut ou la fin simulee. Le remboursement d'un credit utilise vaut sa part historique d'achat ; les centimes sont repartis entre les credits pour conserver exactement le total du forfait. Les remunerations sont simulees a 80 % du prix historique des seances terminees avec compte rendu ; aucun versement n'a lieu. Les regles sont propres a ce prototype.

## Verification

Node.js 22 ou plus recent, uniquement pour les tests :

```sh
node --test tests/store.test.cjs
node --check app.js
```

Les tests natifs couvrent reservation et persistance, refus/abandon atomiques, conflits et chevauchements, creneaux passes/incompatibles, validation tuteur, debit des credits, expiration/epuisement, annulation et remboursement, reprogrammation, tarifs historiques, compte rendu, progression, avis unique, remuneration, stockage corrompu/indisponible, reset, suppression et fin de mois.

Controles navigateur : ouverture directe sans serveur, scenario transversal, formulaires de paiement, forfaits, annulation, validation tuteur, orientation et reset. Verifier les images locales, le clavier et l'absence de debordement du document en mobile et ordinateur ; les tables et onglets disposent de leur propre defilement horizontal lorsque necessaire.

## Organisation

- [index.html](index.html) : entree statique, navigation, bandeau permanent de demonstration.
- [styles.css](styles.css) : identite marine/bleue sur fond clair, violet ponctuel, mise en page responsive et focus clavier.
- [data.js](data.js) : jeu initial fictif et generation des creneaux marocains.
- [store.js](store.js) : stockage JSON versionne, validation, mutations atomiques et calculs, sans DOM. Export CommonJS pour les tests et global pour le navigateur.
- [app.js](app.js) : vues, fragments d'URL, formulaires et echappement des valeurs affichees.
- [tests/store.test.cjs](tests/store.test.cjs) : tests natifs Node.

Le cahier des charges source n'a pas ete modifie. Aucune publication, branche, operation de staging ou commit n'est effectuee par l'application.

## Limites et confidentialite

Ce prototype ne convient pas a la production. Tous les roles sont accessibles sans securite ; les donnees ne constituent pas une preuve d'identite, un dossier scolaire ou un paiement. Les profils, avis initiaux, programmes et disponibilites sont fictifs. La mention d'une ENCG n'implique aucun partenariat ni validation officielle. Aucune promesse d'admission.

La cle locale est `ontrack-demo-v1`. La suppression du profil retire ses reservations, forfaits, transactions, avis et les messages et notifications locaux ; les profils tuteurs et reglages de catalogue subsistent jusqu'au reset. En cas de donnees invalides, la sauvegarde existante n'est pas ecrasee et la session passe en memoire. La remise a zero reste alors valable seulement pour la session ; effacer les donnees du site dans le navigateur permet de retablir un stockage sain.

Aucun paiement, e-mail, appel video ni authentification reels. Aucun document, carte bancaire ou mot de passe n'est demande. Ne saisir que des identites et messages inventes. Le stockage n'est pas synchronise entre appareils et les onglets concurrents ne sont pas geres comme une base transactionnelle partagee. Si tous les creneaux initiaux sont passes, ajouter des disponibilites dans l'espace tuteur ou reinitialiser.

## Sources des illustrations

Photos Unsplash telechargees dans assets, sans dependance reseau a l'execution. Leur presence n'implique aucun soutien au projet. Les portraits ne correspondent pas aux identites fictives affichees.

- Campus : https://unsplash.com/photos/9DaOYUYnOls (image `photo-1523240795612-9a054b0db644`).
- Portrait Yassine : https://images.unsplash.com/photo-1500648767791-00dcc994a43e.
- Portrait Lina : https://images.unsplash.com/photo-1580489944761-15a19d654956.
- Portrait Adam : https://images.unsplash.com/photo-1506794778202-cad84cf45f1d.
- Espace Study Pods illustratif : https://images.unsplash.com/photo-1497366754035-f200968a6e72.

Le pictogramme du favicon est un dessin geometrique local. Les polices utilisent les ressources locales du systeme, sans service distant.