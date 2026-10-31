---
title: 'ONTRACK - demonstration academique complete'
type: 'feature'
created: '2026-10-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '221fc4da9d3d7a3cdec287604b7dc5f5918d8a55'
context: []
---

<frozen-after-approval reason="intention validee par le porteur du projet">

## Intent

**Probleme :** Le cahier des charges decrit un service professionnel ; le groupe de marketing doit en demontrer tous les espaces sans infrastructure de production.

**Approche :** Construire un portail statique interactif en francais, couvrant accueil, etudiant, tuteur, administration et orientation. Les espaces partagent des donnees fictives locales ; un scenario traverse recherche, reservation, paiement simule, compte rendu et progression.

## Boundaries & Constraints

**Toujours :** HTML, CSS et JavaScript natifs, sans compilation ni serveur applicatif. Donnees JSON dans localStorage ; bouton de reinitialisation avec confirmation. Responsive, clavier, libelles accessibles. Identite ONTRACK et slogan conserves ; marine et bleu sur fond clair, violet ponctuel. Mention permanente de demonstration. Les roles sont des vues de simulation, pas une securite. La demonstration fonctionne sans connexion reseau.

**Jamais :** Paiement, e-mail, visioconference ou authentification reels ; mots de passe, cartes bancaires et documents personnels collectes ; promesse d'admission ; reservation de Study Pods. Aucune publication ni modification Git automatique. Le cahier source reste intact. Les donnees locales ne sont pas partagees entre appareils.

**Perimetre :** Accueil presentant concept, tarifs et acces ; presentation, contact et mentions adaptees au prototype. Inscription fictive avec ENCG, niveau, filiere et verification simulee sans domaine universitaire presume officiel. Catalogue avec profils, photos illustratives locales et filtres matiere, chapitre, ENCG, niveau, langue, disponibilite, note et mode. Reservation avec besoin, service, tuteur et creneaux en heure marocaine.

Les offres restent Quick Help 50 DH/30 min, Catch-up 150 DH/90 min, Exam Rescue 399 DH/3 x 90 min sur sept jours et Stay ONTRACK 349 DH/4 x 60 min sur un mois. Aucun renouvellement automatique ; credits expires non reportes. Annulation avant le debut : credit restitue ou remboursement simule ; ces regles sont propres a la demonstration.

Etudiant : seances, historique, forfaits, reprogrammation, comptes rendus, avis et suppression locale du profil. Tuteur : profil soumis a validation, disponibilites, reservations, compte rendu, avis et remuneration simulee. Administration : comptes, validation, catalogue, tarifs, transactions, remboursements, remunerations, moderation, programmes et statistiques derivees. Orientation : filtres de profil et criteres explicites sur programmes fictifs, sans partenariat invente. Study Pods : presentation et Coming Soon uniquement. Contact et notifications restent locaux.

## I/O & Edge-Case Matrix

| Cas | Entree | Resultat attendu | Erreur |
|---|---|---|---|
| Reservation | Creneau libre, paiement simule accepte | Reservation partagee, notification locale | Aucun debit reel |
| Echec | Paiement refuse ou abandonne | Aucune reservation confirmee ni credit consomme | Reessai possible |
| Conflit | Creneau occupe, passe ou incompatible | Confirmation refusee | Autre creneau propose |
| Forfait | Credit valide disponible | Debit unique ; seances restantes visibles | Expiration ou epuisement bloque |
| Compte rendu | Seance terminee | Chapitre et progression actualises | Avis unique reserve au participant |
| Stockage | JSON invalide ou stockage indisponible | Repli en memoire signale | Navigation utilisable |

</frozen-after-approval>

## Code Map

- `cahier_des_charges_ONTRACK.md` : reference fonctionnelle existante, ne pas modifier.
- Aucun code applicatif ni outil de test existant a reutiliser.
- `index.html` sera le point d'entree ; modules natifs non requis pour permettre une ouverture directe.

## Tasks & Acceptance

**Execution :**
- [x] `index.html`, `styles.css`, `assets/` : structure responsive, identite, images locales et navigation par fragment d'URL.
- [x] `data.js` : profils fictifs des trois roles, ENCG, chapitres, creneaux relatifs a la date du jour, offres et programmes illustratifs.
- [x] `store.js` : stockage versionne, validations, reservations, credits, avis, calculs, reset et repli memoire ; logique testable sans interface.
- [x] `app.js` : vues et formulaires de tous les espaces, rendu echappant les saisies utilisateur et gestion des etats vides/erreurs.
- [x] `tests/store.test.cjs` : tests natifs Node des cas de la matrice, annulation, changement de tarif et progression.
- [x] `README.md` : lancement direct, scenario de soutenance, simulations, limites et hebergement statique facultatif.

**Criteres d'acceptation :**
- Etant donne un etudiant inscrit fictivement, quand il reserve puis change de role, alors tuteur et administrateur retrouvent la meme reservation, y compris apres rechargement si le stockage fonctionne.
- Etant donne un profil tuteur en attente, quand l'administrateur le valide, alors il devient reservable dans le catalogue.
- Etant donne une seance terminee, quand le tuteur renseigne les chapitres, alors la progression affiche la proportion de chapitres revises ou maitrises avec sa methode de calcul.
- Etant donne une modification de tarif, quand une nouvelle reservation est creee, alors seul son prix change ; les transactions anterieures restent intactes.
- Etant donne les espaces complets, quand on navigue au clavier sur mobile et ordinateur, alors les commandes sont accessibles et aucun contenu essentiel ne deborde.
- Etant donne des donnees modifiees, quand la remise a zero est confirmee, alors le scenario initial redevient reproductible.

## Implementation Notes

- 2026-10-23 : 11 tests Node passes, couvrant toutes les lignes de la matrice. Controle navigateur en ouverture directe : reservation apres refus, compte rendu, avis, progression a 17 %, administration et persistance apres rechargement verifies. Neuf vues controlees a 1440 et 390 pixels sans debordement ni erreur JavaScript ; images locales chargees. Accueil ajuste en photo pleine largeur. Les trois logos ajoutes a la racine n'ont pas ete modifies.
- Verification finale : 17 tests Node passes. Playwright a confirme selection Exam Rescue conservee, confirmation visible, validation tuteur, edition du catalogue et remise a zero. Les corrections de revue couvrent les bornes de forfait, le calendrier marocain, les centimes et les donnees locales invalides. Aucune publication, aucun staging ni commit ; une validation separee est requise pour ces operations Git.

## Spec Change Log

- 2026-10-31 : la clause « programmes fictifs, sans partenariat inventé » du périmètre Orientation est renégociée par le porteur du projet. Les 9 destinations réelles communiquées par l'ENCG remplacent les programmes fictifs. La règle « aucune promesse d'admission » est maintenue. Voir `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-31.md` et la spec d'évolution à venir `spec-evolutions-donnees-reelles-encg.md`.

## Review Triage Log

| Constat | Verdict | Preuve et traitement |
|---|---|---|
| B1 : fin de seance apres expiration | medium | Confirme dans book et reschedule ; comparaison de fin ajoutee, test passe. Patch. |
| B2 : mois UTC au lieu du Maroc | medium | Achat a 00:30 marocain reproduit ; calcul local avec Intl, test passe. Patch. |
| B3 : arrondis des credits | low | Tarif 400 DH reproduit ; repartition des centimes et total entier, test passe. Patch. |
| B4 : suppression non persistante | medium | Echec setItem reproduit ; avertissement explicite de sauvegarde residuelle ajoute et teste. Patch. |
| B5 : identifiants dupliques | low | Snapshot ambigu reproduit ; unicite et offres requises verifiees, test passe. Patch. |
| B6 : offre choisie perdue | medium | Liens et formulaire par defaut confirmaient la perte ; selection conservee, Playwright confirme exam. Patch. |
| B7 : confirmation effacee | low | hashchange effacait le statut ; message conserve sur sa route cible, controle navigateur passe. Patch. |
| B8 : dates incompatibles avec forfait | medium | Creneaux non filtres sur un forfait actif ; filtrage de fin selon expiration ajoute. Validation metier conservee. Patch. |
| B9 : date impossible normalisee | low | 31 novembre accepte ; controle du calendrier ajoute, test passe. Patch. |
| B10 : catalogue administratif consultatif | medium | Edition absente ; formulaire matiere, niveau et chapitres ajoute. Historique conserve, tests Node et navigateur passes. Patch. |
| E1 : fin apres expiration | medium | Meme defaut que B1 ; test de reservation et reprogrammation traversees passe. Patch commun. |
| E2 : mois marocain | medium | Meme defaut que B2 ; 31 octobre local expire le 30 novembre local. Patch commun. |
| E3 : biographie sans espaces | low | Le paragraphe pouvait deborder ; overflow-wrap ajoute aux textes libres. Patch. |
| V1 : formulaire non exerce | medium | Suite Node seulement ; scenario Playwright execute via vrais formulaires, choix d'offre, partage des roles et rechargement controles. Patch de verification. |
| V2 : suppression testee a vide | medium | Ancien test effacait apres reset ; fixture remplie et rechargement verifies dans la suite. Patch. |
| V3 : chevauchements partiels absents | medium | Seuls debuts identiques testes ; nouveaux creneaux distincts et reprogrammation refusent le conflit sans mutation. Patch. |
| V4 : deduplication non prouvee | medium | Un seul compte rendu initial ; deux comptes rendus identiques restent a 17 %, un second chapitre donne 33 %. Patch. |
| V5 : prix historiques de forfait non testes | medium | Achat puis hausse de tarif ; booking, remboursement et remuneration conservent les prix initiaux dans le test ajoute. Patch. |

Aucun constat differe. Les controles navigateur sont executes dans l'outil Playwright de l'editeur ; la suite autonome du depot reste celle de Node, sans dependance navigateur imposee.

## Verification

- `node --test tests/store.test.cjs` : tous les tests metier passent.
- Navigateur : scenario transversal, echec de paiement, forfait, validation tuteur, annulation, orientation et reset.
- Captures desktop/mobile : aucun chevauchement, images presentes, navigation et formulaires utilisables ; verifier aussi l'ouverture directe de `index.html`.