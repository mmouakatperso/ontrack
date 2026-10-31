---
title: 'ONTRACK - Dr Fatine Ouahtita dans la liste des tuteurs'
type: 'feature'
created: '2026-10-31'
status: 'done'
baseline_commit: 'c6ca8ca839796047ec7935bba0faed96258c866f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-encadrement-academique.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** L'accueil (« Des tuteurs issus des ENCG. ») n'affiche que deux tuteurs validés : Yassine et Lina. Adam est en attente. Le porteur du projet veut ajouter son encadrante, Dr Fatine Ouahtita, à cette liste, qui passera ainsi à trois.

**Approche :** Ajouter au seed une matière « Anglais commercial » et un tuteur `t4` validé, avec un compte `tutor`, rattaché à l'ENCG Casablanca, sans photo (initiales « FO »). Afficher trois cartes à l'accueil au lieu de deux. Migrer les états locaux v3 existants pour qu'ils reçoivent la matière et la tutrice.

**Décisions (porteur du projet) :**
- Réservable comme les autres tuteurs, avec les créneaux de démonstration.
- Matières : Anglais commercial (nouvelle) et Marketing, tous les chapitres.
- Matière `anglais-com`, « Anglais commercial », semestre S1. Chapitres : Correspondance professionnelle ; Réunions et présentations ; Négociation commerciale ; Vocabulaire du commerce international.
- Elle fait aussi de l'orientation : seule sa bio le mentionne. La page Orientation ne change pas.
- Compte créé, mais absent de la liste des comptes de démonstration de la page de connexion.
- Choix par défaut de l'agent : langues Français et Anglais ; modes En ligne et Présentiel ; les 4 services ; niveau affiché « Professeure ». Bio : « Professeure à l'ENCG Casablanca. Anglais commercial et marketing ; accompagne aussi les étudiants dans leur orientation. Encadrante du projet ONTRACK. »

## Boundaries & Constraints

**Always :**
- Ne publier aucune photo, aucun téléphone ni aucune adresse réelle. L'adresse du compte est en `.demo`.
- La mention « Profils fictifs de démonstration » sous la liste doit distinguer les profils étudiants fictifs de l'encadrante, qui est réelle. La traduction anglaise est mise à jour.
- Le filtre « Niveau minimum » ne doit pas exclure l'encadrante : un niveau hors de la liste S1–S10 est classé au-dessus de S10.
- Toutes les nouvelles chaînes d'interface sont traduites en anglais.
- La validation par l'intéressée est requise avant toute fusion dans `main`. Rien n'est poussé.

**Never :**
- Ne pas modifier les tuteurs t1 à t3, les réservations ni les avis du seed. Ne pas lui inventer d'avis ni de séance passée.
- Ne pas changer `VERSION` : la migration est additive, sur le modèle de `chat`.
- Pas de rôle de conseiller d'orientation ni d'affectation des entretiens.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Résultat attendu | Erreurs |
|---|---|---|---|
| Nouvel état | seed neuf | `#accueil` affiche 3 cartes (Yassine, Lina, Dr Fatine Ouahtita) en `grid three` ; `#matieres/anglais-com` liste 1 tuteur | N/A |
| État v3 sans t4 | localStorage v3 sans `t4`, son compte ni `anglais-com` | la migration ajoute la matière, le compte et la tutrice du seed ; le reste est intact | e-mail ou identifiant de chapitre déjà pris → aucun ajout, état chargé tel quel |
| État v3 avec t4 | localStorage contenant déjà `t4` | aucune modification | N/A |
| Matière supprimée par l'admin | état v3 avec t4, sans `anglais-com` | aucune réinsertion | N/A |
| Filtre niveau | catalogue, niveau minimum S8 | l'encadrante reste listée | N/A |

</frozen-after-approval>

## Code Map

- `data.js:69-76` -- `subjects` du seed : ajouter `anglais-com`, dont les identifiants de chapitre sont générés par le `map` existant.
- `data.js:83-92` -- `users` et `tutors` : ajouter `t4` via `user()` et `tutor()`, `chaptersOf('anglais-com', 'marketing')`. Les `demoAccounts` (vers la ligne 223) ne changent pas.
- `store.js:80-83` -- `migrate()` : ajouter la matière, le compte et le tuteur s'ils sont absents (garde : `t4` absent, et ni l'e-mail ni les identifiants de chapitre ne sont pris). `valid()` (l. 119-125) accepte déjà `photo: ''` et un niveau libre.
- `views-public.js:44` -- accueil : `approved.slice(0, 2)` dans `grid two` passe à 3 et `grid three`. Mention « Profils fictifs… ».
- `views-public.js:6,202` -- `levelRank` et le filtre niveau du catalogue.
- `ui.js:58` -- `avatar()` : repli automatique sur les initiales sans photo. À réutiliser tel quel.
- `i18n-en.js:360` -- traduction de la mention.
- `tests/views.test.cjs`, `tests/store.test.cjs` -- cas de la matrice. `tests/assistant.test.cjs:181` calcule déjà le nombre de tuteurs.
- Ne pas toucher : l'empilement d'avatars du héros (`views-public.js:39`), la section « Encadrement académique » et la page Orientation.

## Tasks & Acceptance

**Exécution :**
- [x] `data.js` -- matière `anglais-com`, compte et tuteur `t4` -- source unique du seed.
- [x] `store.js` -- étendre `migrate()` -- les états v3 existants les reçoivent.
- [x] `views-public.js` -- 3 cartes en `grid three`, nouvelle mention, niveau hors liste traité comme maximal dans le filtre -- liste visible à trois.
- [x] `i18n-en.js` -- traductions des nouvelles chaînes.
- [x] `tests/views.test.cjs`, `tests/store.test.cjs` -- couvrir la matrice.
- [x] `docs/COUVERTURE_CDC.md`, `README.md` -- signaler l'encadrante tutrice parmi les extensions hors cahier des charges, à faire valider.

**Critères d'acceptation :**
- Étant donné un seed neuf, quand on ouvre `#profil/t4`, alors le profil s'affiche avec les initiales « FO », sans photo, avec Anglais commercial et Marketing.
- Étant donné l'administration, quand on ouvre l'onglet Tuteurs, alors l'encadrante apparaît comme publiée, avec son adresse `.demo`.
- Étant donné un étudiant connecté, quand il réserve en Anglais commercial, alors l'encadrante est proposée et ses créneaux sont réservables.
- Étant donné l'interface en anglais, quand on ouvre l'accueil, alors la mention traduite s'affiche.

## Implementation Notes

- 2026-10-31 : implémentation par l'agent de développement.
  - **Fichiers :** `data.js` (matière `anglais-com` en fin de liste, compte et tuteur `t4` : `fatine.ouahtita@encg-casablanca.demo`, `photo: ''`, `photoConsent: false`, sans créneau prioritaire), `store.js` (`migrate()` + `addSupervisor()`), `views-public.js`, `i18n-en.js`, `tests/views.test.cjs` (V15), `tests/store.test.cjs` (S45, S46), `docs/COUVERTURE_CDC.md`, `README.md`.
  - **Écarts avec le Code Map, nécessaires :**
    - `ui.js` : `initials()` ignore un titre en tête (« Dr », « Pr ») ; sinon « Dr Fatine Ouahtita » donnait « DF », contraire au critère « FO ». `avatar()` est inchangé.
    - `store.js` `setLevels` : seuls les niveaux de la liste actuelle sont protégés contre le retrait ; sinon « Professeure » (utilisé, hors liste) bloquait tout enregistrement des niveaux par l'admin (régression détectée par le test existant S36).
    - `store.js` `updateTutorProfile` et `views-tutor.js` : un niveau hors liste déjà attribué peut être conservé (option ajoutée au sélecteur) ; sinon l'encadrante, en éditant son profil, passait silencieusement en S1.
    - `docs/DOCUMENTATION_TECHNIQUE.md` : la phrase « Seule exception » sur la migration v3 est mise à jour.
  - **Migration :** `t4` absent → ajout de la matière, du compte et du profil du seed, sauf si `anglais-com` existe déjà, si un identifiant de chapitre ou l'e-mail (ou l'identifiant `t4`) est pris. Si l'admin a supprimé Marketing ou certains de ses chapitres, ils sont retirés du profil ajouté (sinon `valid()` rejetterait l'état). Appliquée aussi à l'import de sauvegarde (même chemin que `chat`). `VERSION` inchangé.
  - **Données non traduites :** niveau « Professeure », bio et noms de matières restent en français (règle de `i18n-en.js` : « Les données ne sont pas traduites »). Seule la mention de l'accueil est une nouvelle chaîne d'interface.
  - **Corrections après revue :** l'accueil affiche toujours `t4` (si publiée) à côté des deux premiers autres tuteurs validés ; mention d'origine rétablie quand sa carte n'est pas affichée ; `O.ui.firstName()` (titre ignoré) pour « Réserver avec », « Bonjour, » et le lien de compte de l'en-tête ; filtre de niveau hors liste ignoré ; V15 et S46 complétés (espace tuteur de `t4`, Adam validé, encadrante suspendue, migration combinée chat + `t4`).
  - **Tests :** 86/88. Les deux échecs (Stay mois calendaire, date limite dépassée) sont les échecs tzdata connus du Node local 22.23.1, présents sur la baseline (83/85).
  - **Syntaxe :** `node --check` propre sur tous les fichiers modifiés.
  - **Contrôle visuel :** Chrome headless, section des tuteurs isolée : trois cartes à 1440 px ; une colonne à 390 px (capture tronquée à droite par la largeur minimale de la fenêtre headless, comme à l'incrément B : à revérifier dans les outils de développement).

## Spec Change Log

## Review Triage Log

| Constat (couche) | Verdict | Preuve et traitement |
|---|---|---|
| Accueil : `approved.slice(0, 3)` suit l'ordre du tableau ; dès qu'Adam est validé (README, étape 8) ou qu'un état migré compte d'autres tuteurs validés, l'encadrante disparaît (VG, BH, ECH ×2) | medium | Vérifié : t4 est en dernière position dans le seed comme après la migration. Contraire à l'intention, où la liste comprend l'encadrante. Patch : sa carte est toujours affichée quand elle est validée, avec les deux premiers autres tuteurs validés. |
| La mention de l'accueil la cite même quand sa carte n'est pas affichée (suspendue, supprimée, migration écartée) (VG, ECH) | low | Vérifié. Patch : la mention dépend de sa présence, sinon l'ancienne mention s'affiche (sa traduction anglaise est rétablie). |
| « Réserver avec Dr », « Bonjour, Dr. », « Dr » dans l'en-tête (BH, ECH) | low | Vérifié : `split(' ')[0]` à `views-public.js:225`, `views-tutor.js:73` et `app.js:58`. Correction directe. Patch : un utilitaire de prénom qui ignore le titre, sur le modèle de `initials()`. |
| Filtre de niveau resté sur un niveau retiré : tous les tuteurs exclus (ECH) | low | Vérifié : `levelRank(f.level)` vaut `levels.length` et dépasse tous les rangs. Correction directe d'une condition. Patch : un filtre hors liste est ignoré. |
| Formulaire `#tuteur/profil` de t4 jamais rendu par un test (VG) | low | Écart de vérification reçu tel quel. Patch : test V15. |
| Migration combinée (chat et t4 absents) non testée (VG) | low | Écart de vérification reçu tel quel. Patch : 3e cas de S46. |
| Règles de niveau hors liste (`setLevels`, `updateTutorProfile`) absentes de la documentation technique (BH) | low | Vérifié. Ajout d'une phrase. Patch. |
| Bio et matières non confirmées par les sources (BH) | false | Données fournies par le porteur du projet ; elles figurent parmi les décisions de l'intention figée. Rejet. |
| Des étudiants de démo peuvent noter une personne réelle (BH) | low | Conséquence de la décision « réservable comme les autres ». Les avis restent dans le navigateur. Le correctif ajouterait des gardes. Rejet. |
| Assistant : « Les tuteurs sont des étudiants des ENCG » (BH) | false | La phrase décrit les conditions d'inscription d'un candidat tuteur, qui restent exactes. Rejet. |
| « Tuteur » au masculin, libellé « Niveau d'études », « Professeure » non traduit (BH) | low | Libellés communs à tous les tuteurs. L'application ne traduit pas les données (règle de `i18n-en.js`). Le correctif exigerait un champ genre ou un titre distinct. Rejet. |
| `level` détourné ; retour impossible à « Professeure » après un choix S1–S10 (BH) | low | Cas improbable : le compte n'est pas proposé à la connexion. Un champ séparé représenterait un remaniement. Rejet. |
| Migration aussi à l'import et à l'actualisation entre onglets (BH) | false | C'est le comportement voulu : même chemin que la migration `chat`, et la matrice demande que tout état v3 sans t4 la reçoive. Rejet. |
| Compte non documenté, domaine hors motif, bio modifiable par qui lit `data.js` (BH) | false | Compte caché par décision. Le seed ne passe pas par la règle de domaine. Les données sont locales au navigateur. Rejet. |
| Aucun drapeau qui bloque la fusion dans `main` (BH) | false | Étape de processus. Rien n'est poussé, même traitement qu'à l'incrément B. Rejet. |
| Tests fragiles (`slice(0, 600)`, collisions sans comparaison d'état, `initials()` sans test unitaire) (BH) | low | Fragilité cosmétique, sans défaut constaté. Rejet. |
| Collision levée plus tard : t4 apparaît plus tard ; seed recalculé à chaque chargement (ECH) | low | Cas rare. Le coût du seed est négligeable. Le correctif ajouterait un état de migration. Rejet. |
| Niveau S1 retiré avant la migration (ECH) | false | `setLevels` interdit de retirer un niveau utilisé, et S1 sert à Comptabilité générale et à Mathématiques appliquées. Rejet. |

## Verification

**Commandes :**
- `node --test tests/` -- attendu : tout passe, sauf les deux échecs tzdata connus du Node local.
- `node --check data.js store.js views-public.js i18n-en.js` -- attendu : aucune erreur.

**Contrôle manuel :**
- Accueil à 1440 px et à 390 px : trois cartes, puis une colonne.
