# ONTRACK

**Your Study, Our Priority.**

Démonstration académique interactive en français, réalisée uniquement avec HTML, CSS et JavaScript natifs. Aucun serveur applicatif, aucune compilation, aucune dépendance a installer et aucune requete réseau au fonctionnement.

## Lancement

Ouvrir directement [index.html](index.html) dans un navigateur récent (Chrome, Edge ou Firefox). JavaScript doit être actif. Les scripts classiques et les images locales fonctionnent avec une URL `file:`. Il n'est pas nécessaire de démarrer un serveur.

Le stockage des pages `file:` depend du navigateur et de ses reglages. Un bandeau signalé le repli en mémoire si localStorage est indisponible, invalide ou sature. En mode mémoire, les données restent utilisables pendant la visite, mais sont perdues au rechargement. Utiliser le même navigateur, le même chemin et le même onglet pour la soutenance. Ne pas utiliser plusieurs onglets pour modifier simultanement les données ; un avertissement invite a recharger en cas de changement dans un autre onglet sur les origines qui le permettent.

Pour un hébergement statique facultatif, déposer ensemble les fichiers HTML, CSS, JS et le dossier assets sur un hébergeur statique. Aucun service distant ni variable d'environnement n'est requis. Le stockage reste propre a l'origine du site et ne migre pas depuis le fichier local.

## Scénario de soutenance

1. Choisir **Réinitialiser la démo** dans le pied de page et confirmer. Les créneaux initiaux sont générés relativement au jour de la remise à zéro, a 10 h, 14 h et 18 h, en heure marocaine. Les changements saisonniers du fuseau `Africa/Casablanca` sont pris en compte par `Intl`.
2. Depuis **Créer mon profil**, saisir un nom invente, une ENCG, un niveau et une filière, puis cocher la vérification fictive. Un profil exemple est déjà disponible au premier lancement. Aucun e-mail, mot de passe ou document n'est collecte.
3. Dans **Trouver un tuteur**, appliquer des filtres, ouvrir le profil de Yassine puis choisir un créneau. Decrire un besoin fictif. Choisir le résultat de paiement **Refusé** ou **Abandonné** : aucune réservation ni transaction n'est créée. Réessayer avec **Accepté**.
4. Retrouver la séance dans l'espace étudiant. Reprogrammer vers un autre créneau. Changer d'espace avec le selecteur d'en-tete : le tuteur et l'administration retrouvent la même réservation. Recharger pour constater sa persistance lorsque le stockage fonctionne.
5. Dans l'espace tuteur, choisir Yassine puis **Simuler la fin de séance** et confirmer. Cette action est uniquement un raccourci de soutenance, sans vidéo ni modification de l'horloge. Cocher un ou plusieurs chapitres, indiquer révisé ou maîtrisé et publier le compte rendu. Une séance reellement écoulée accepté aussi le compte rendu sans simulation. Une séance terminée ne peut plus être annulée ou reprogrammée.
6. Dans l'espace étudiant, lire le compte rendu, publier un avis unique et consulter la progression. Un chapitre distinct sur les six du catalogue donne 17 %, deux donnent 33 %. Le calcul utilisé les chapitres révisés ou maîtrisés des comptes rendus, sans doublons.
7. Réserver **Exam Rescue** : 399 DH simulés activent trois séances de 90 min sur sept jours, premiere séance incluse. Pour les suivantes, choisir le forfait existant dans **Règlement simulé** ; une seule transaction d'achat reste enregistrée. Un forfait épuisé, expiré ou incompatible avec la date choisie est bloqué. **Stay ONTRACK** comprend quatre séances de 60 min sur un mois calendaire, borne au dernier jour du mois si nécessaire.
8. Annuler une séance future et confirmer : restituer le crédit valide sans changer son expiration, ou demander un remboursement simulé sans restitution du crédit. Une annulation répétée est refusée. Sans forfait, l'annulation enregistré directement le remboursement simulé.
9. Dans l'administration, **Comptes & validation**, valider Adam. Son profil devient reservable dans le catalogue. Une nouvelle soumission de profil depuis l'espace tuteur remet la validation en attente. La suspension n'annulé pas les réservations déjà créées, mais bloqué les nouvelles réservations et reprogrammations vers ce profil.
10. Modifier le tarif Quick Help dans **Catalogue & tarifs**, puis effectuer une nouvelle réservation. Le nouveau tarif s'applique seulement au nouvel achat ; réservations, transactions et valeur des crédits déjà achetes restent inchanges. Consulter les statistiques dérivées, remboursements, rémunérations, modération et messages locaux.
11. Dans **Orientation**, comparer les programmes fictifs avec filière, niveau, pays, langue, moyenne et budget. Les critères sont affichés ; aucun résultat ne promet une admission. L'administration peut modifier les seuils, budgets et la visibilité des programmes. **Study Pods** ne proposé aucune réservation et reste **Coming Soon**.
12. Tester le contact local, puis la suppression du profil étudiant avec confirmation. Pour recommencer, confirmer la remise à zéro. Une confirmation annulée ne modifié rien.

## Offres initiales et règles

| Offre | Tarif simulé | Format |
| --- | --- | --- |
| Quick Help | 50 DH | 1 × 30 min |
| Catch-up | 150 DH | 1 × 90 min |
| Exam Rescue | 399 DH | 3 × 90 min sur sept jours |
| Stay ONTRACK | 349 DH | 4 × 60 min sur un mois |

Les forfaits commencent au paiement simulé et chaque séance doit se terminer avant l'expiration. Le mois Stay ONTRACK est calculé en heure marocaine, y compris lors des changements saisonniers. Aucun renouvellement automatique ; crédits expirés non reportés. L'annulation n'est permise qu'avant le début ou la fin simulée. Le remboursement d'un crédit utilisé vaut sa part historique d'achat ; les centimes sont répartis entre les crédits pour conserver exactement le total du forfait. Les rémunérations sont simulées à 80 % du prix historique des séances terminées avec compte rendu ; aucun versement n'a lieu. Les règles sont propres à ce prototype.

## Vérification

Node.js 22 ou plus récent, uniquement pour les tests :

```sh
node --test tests/store.test.cjs
node --check app.js
```

Les tests natifs couvrent réservation et persistance, refus/abandon atomiques, conflits et chevauchements, créneaux passés/incompatibles, validation tuteur, débit des crédits, expiration/épuisement, annulation et remboursement, reprogrammation, tarifs historiques, compte rendu, progression, avis unique, rémunération, stockage corrompu/indisponible, reset, suppression et fin de mois.

Contrôles navigateur : ouverture directe sans serveur, scénario transversal, formulaires de paiement, forfaits, annulation, validation tuteur, orientation et reset. Vérifier les images locales, le clavier et l'absence de débordement du document en mobile et ordinateur ; les tables et onglets disposent de leur propre défilement horizontal lorsque nécessaire.

## Organisation

- [index.html](index.html) : entrée statique, navigation, bandeau permanent de démonstration.
- [styles.css](styles.css) : identité marine/bleue sur fond clair, violet ponctuel, mise en page responsive et focus clavier.
- [data.js](data.js) : jeu initial fictif et generation des créneaux marocains.
- [store.js](store.js) : stockage JSON versionne, validation, mutations atomiques et calculs, sans DOM. Export CommonJS pour les tests et global pour le navigateur.
- [app.js](app.js) : vues, fragments d'URL, formulaires et echappement des valeurs affichées.
- [tests/store.test.cjs](tests/store.test.cjs) : tests natifs Node.

Le cahier des charges source n'a pas été modifié. Aucune publication, branche, opération de staging ou commit n'est effectuée par l'application.

## Limites et confidentialite

Ce prototype ne convient pas à la production. Tous les rôles sont accessibles sans sécurité ; les données ne constituent pas une preuve d'identité, un dossier scolaire ou un paiement. Les profils, avis initiaux, programmes et disponibilités sont fictifs. La mention d'une ENCG n'implique aucun partenariat ni validation officielle. Aucune promesse d'admission.

La clé locale est `ontrack-demo-v1`. La suppression du profil retire ses réservations, forfaits, transactions, avis et les messages et notifications locaux ; les profils tuteurs et reglages de catalogue subsistent jusqu'au reset. En cas de données invalides, la sauvegarde existante n'est pas écrasée et la session passe en mémoire. La remise à zéro reste alors valable seulement pour la session ; effacer les données du site dans le navigateur permet de rétablir un stockage sain.

Aucun paiement, e-mail, appel vidéo ni authentification réels. Aucun document, carte bancaire ou mot de passe n'est demandé. Ne saisir que des identités et messages inventés. Le stockage n'est pas synchronisé entre appareils et les onglets concurrents ne sont pas gérés comme une base transactionnelle partagée. Si tous les créneaux initiaux sont passés, ajouter des disponibilités dans l'espace tuteur ou réinitialiser.

## Sources des illustrations

Photos Unsplash téléchargées dans assets, sans dépendance réseau a l'exécution. Leur présence n'implique aucun soutien au projet. Les portraits ne correspondent pas aux identités fictives affichées.

- Campus : https://unsplash.com/photos/9DaOYUYnOls (image `photo-1523240795612-9a054b0db644`).
- Portrait Yassine : https://images.unsplash.com/photo-1500648767791-00dcc994a43e.
- Portrait Lina : https://images.unsplash.com/photo-1580489944761-15a19d654956.
- Portrait Adam : https://images.unsplash.com/photo-1506794778202-cad84cf45f1d.
- Espace Study Pods illustratif : https://images.unsplash.com/photo-1497366754035-f200968a6e72.

Le logo horizontal intégré à l'en-tête et au pied de page provient de [Logo-ontrack-1.jpeg](Logo-ontrack-1.jpeg). Son dessin sobre est plus lisible dans une barre de navigation que les ornements du [Logo-ontrack-2.jpeg](Logo-ontrack-2.jpeg). Le monogramme du [Logo-ontrack-3.jpeg](Logo-ontrack-3.jpeg) est utilisé comme favicon. Les PNG dérivés sont recadrés ; les trois originaux restent intacts.

Les textes sont enregistrés en UTF-8 avec les accents français. Les anciens libellés du stockage local sont migrés sans effacer les réservations ni modifier les saisies libres. La clé technique reste `ontrack-demo-v1`. Les polices utilisent les ressources locales du système, sans service distant.