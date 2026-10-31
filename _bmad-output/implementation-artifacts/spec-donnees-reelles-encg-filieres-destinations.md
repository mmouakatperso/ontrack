---
title: 'ONTRACK - filières et destinations réelles de l''ENCG'
type: 'feature'
created: '2026-10-31'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '64c757a9dbd0dcdb8c1fbc5e861c277083221c91'
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-31.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** Les filières (`constants.tracks`) et les 6 programmes d'orientation sont inventés. Or l'ENCG Casablanca a fourni ses plannings 2025-2026 et la liste de ses 9 destinations réelles (proposition §1.1 et §1.2).

**Approche :** Remplacer les filières par la liste réelle, organisée par cycle et cohérente avec le niveau. Remplacer les programmes par les 9 destinations réelles, avec les places communiquées et le lien officiel. Les critères non communiqués s'affichent « à confirmer » ; ils ne sont jamais inventés et ne bloquent pas la recommandation. Passer l'état local en v3.

## Boundaries & Constraints

**Toujours :**
- HTML, CSS et JS natifs, ouverture en `file:`, aucune requête réseau à l'exécution.
- Toute nouvelle chaîne d'interface est traduite en anglais (`i18n-en.js`) ; les données (noms de filières et d'établissements) restent non traduites.
- Les sigles restent visibles (« Marketing digital (MD) »).
- Une note indique : « Filières établies d'après les plannings 2025-2026 de l'ENCG Casablanca ; l'offre peut varier selon l'ENCG. »
- L'avertissement « aucune recommandation ne garantit une admission » est conservé.

**Jamais :**
- Inventer une moyenne, une langue, une date limite, des documents, un type de mobilité ou des filières éligibles pour une destination.
- Additionner listes principales et listes d'attente en un total de « places ».
- Modifier le cahier des charges.
- Pousser sur `main`.

**Décisions :**
- Le travail se fait sur la branche `feat/donnees-reelles-encg`.
- Le type de mobilité vaut `Échange` pour Shandong et Sherbrooke, et reste inconnu pour les autres.
- Si l'admin crée un niveau absent des cycles connus, toutes les filières y sont acceptées.
- L'accueil affiche le nombre de destinations, sans total de places.

## I/O & Edge-Case Matrix

| Cas | Entrée / État | Résultat | Erreur |
|---|---|---|---|
| Inscription cohérente | S6 + Commerce | Compte créé | — |
| Incohérence niveau / filière | S3 + Finance (inscription, profil ou orientation) | Refus | `Filière non proposée au niveau S3.` |
| Critère inconnu | Destination avec `minGrade: null` | Critère « À confirmer auprès de l'ENCG », ni rempli ni compté | — |
| Éligibilité | Tous les critères *connus* remplis, date non dépassée ou inconnue | « Potentiellement adapté » | — |
| Source | `https://www.hec.uliege.be` | Acceptée | `http://…` ou `javascript:` : refus |
| Places | Lignes « Liste principale : 20 » | `seats` = `[{label, count}]` | Nombre non entier ou négatif : refus |
| État v2 présent | `ontrack-demo-v2` dans `localStorage` | Seed v3 chargé, clé v2 supprimée | — |

</frozen-after-approval>

## Code Map

- `data.js`
  - `constants.tracks` (l. 12) devient `trackGroups` (cycle, niveaux, filières, voir proposition §4.1) ; `tracks` reste comme liste à plat dérivée, et l'on ajoute `tracksFor(level)`.
  - `constants.mobilities` devient `['Échange', 'Échange semestriel', 'Double diplôme']`.
  - `programs` (l. 103-111) est remplacé par les 9 destinations de la proposition §1.2, avec les liens de §4.2.
  - L'utilisatrice `s1` (Salma) passe de S4 à S6 (filière Gestion inchangée).
- `store.js`
  - `KEY` devient `v3` ; `LEGACY_KEYS` reçoit `v2` (l. 6-7).
  - La validation des programmes (l. 82) accepte les champs à `null`, `seats` et une source `https://`.
  - `recommendations` (l. 370-388) gère les critères inconnus.
  - Ajouter un contrôle de cohérence niveau / filière dans `register` (l. 480), `updateProfile` (l. 562) et `saveOrientationProfile` (l. 765). Il ne s'applique pas si le niveau est hors des cycles connus.
  - `saveProgram` (l. 954-971) : champs facultatifs, `seats`, `sourceNote`, regex `https`.
- `ui.js` : ajouter `groupedSelect` (`<optgroup>` par cycle) à côté de `select`, puis l'exporter dans `O.ui`.
- `views-public.js`
  - Utiliser `groupedSelect` et filtrer selon le niveau dans `register` (l. 105) et dans le formulaire d'orientation (l. 241).
  - Ajouter un `O.change('level-tracks')` qui reconstruit les options de filière. Le motif à suivre est `encg-hint` (l. 96).
  - Le select de niveau de `identityFields` (l. 93) reçoit l'attribut `data-change` uniquement côté étudiant.
  - `programCard` (l. 219-222) affiche les places, « À confirmer auprès de l'ENCG », la note de source et le lien « Site officiel de l'établissement » ; une icône « ? » marque les critères inconnus.
  - L'accueil (l. 45) affiche « {count} destinations communiquées par l'ENCG ».
- `views-student.js` (l. 232) : profil, même select groupé et filtré.
- `views-admin.js`
  - `programForm` (l. 85) : champs facultatifs, avec une option vide pour la mobilité, le niveau et la langue ; un textarea « Places » (une ligne `libellé : nombre`) ; un champ note de source.
  - L'avertissement « example.org » est remplacé.
  - Le gestionnaire `admin-program` (l. 133) analyse les places.
- `i18n-en.js` : traductions des nouvelles chaînes et des messages du store.
- `tests/store.test.cjs`
  - l. 401-407 : clé v3 et ancienne clé v2.
  - l. 416 : le cas de source corrompue devient `javascript:…`.
  - l. 528-530 : une source `https` réelle est acceptée ; le décompte passe à 10.
  - l. 668-670 : fixtures adaptées.
  - Vérifier les fixtures qui associent `level` et `track` (S4/S2 + Gestion, l. 51, 444, 467, 609) : les rendre cohérentes.
- `tests/views.test.cjs`, `tests/i18n.test.cjs` : à faire passer sans les affaiblir.
- `docs/COUVERTURE_CDC.md` (§14, l. 302-306), `docs/DOCUMENTATION_TECHNIQUE.md`, `docs/GUIDE_UTILISATEUR.md`, `README.md` (scénario, étape 9 ; section « Limites ») : remplacer « fictifs / example.org ».
- **À ne pas toucher :** `cahier_des_charges_ONTRACK.md`, `.github/workflows/pages.yml` (il copie déjà `*.js`).

## Tasks & Acceptance

**Exécution :**
- [x] `data.js` -- filières par cycle, `tracksFor`, mobilités, 9 destinations, Salma en S6 -- données réelles.
- [x] `store.js` -- clé v3, validation, cohérence niveau / filière, critères inconnus, `saveProgram` -- règles métier.
- [x] `ui.js`, `views-public.js`, `views-student.js`, `views-admin.js` -- select groupé et filtré, carte destination, accueil, formulaire admin -- affichage.
- [x] `i18n-en.js` -- chaînes anglaises -- le test i18n doit rester vert.
- [x] `tests/store.test.cjs`, `tests/views.test.cjs` -- couvrir la matrice ; adapter les fixtures -- non-régression.
- [x] Docs et README -- traçabilité et limites mises à jour.
- [x] Vérifier les 9 liens officiels (une requête par lien, au moment du développement) et corriger ceux qui ne répondent pas.

**Critères d'acceptation :**
- Étant donné le portail d'orientation, quand on liste les destinations, alors les 9 établissements réels apparaissent avec leurs places telles que communiquées, et aucun ne pointe vers `example.org`.
- Étant donné le formulaire d'inscription, quand l'étudiant choisit S5, alors seules les filières Gestion et Commerce sont proposées, regroupées sous leur cycle.
- Étant donné une destination, quand l'admin vide la moyenne minimale et enregistre, alors la carte affiche « À confirmer auprès de l'ENCG ».
- Étant donné l'anglais actif, quand on parcourt toutes les routes, alors aucune nouvelle chaîne française n'apparaît (test i18n).

## Implementation Notes

- 2026-10-31 : implémentation par un sous-agent, puis contrôle du diff par l'orchestrateur.
  - **Tests :** 52/54 passent. Les deux échecs (« Stay ONTRACK : mois calendaire », « date limite dépassée ») se reproduisent à l'identique sur la baseline `64c757a` (worktree temporaire) : ils viennent du Node local 22.23.1 (tzdata 2026a), alors que le README exige 22.23.3+. Ce n'est pas une régression.
  - **Syntaxe :** `node --check` est propre.
- **Choix hors spec :**
  - Lien Centria : `https://net.centria.fi/en/`, car `www.centria.fi` refuse les connexions. Les 8 autres liens répondent 200 (Sherbrooke seulement avec un user-agent de navigateur).
  - Les recommandations sont triées : destinations éligibles d'abord, puis par part de critères connus remplis.
  - Ville renseignée seulement quand le nom de l'établissement la donne.
  - Le bandeau de démonstration (`index.html` et `i18n-en.js`) indique désormais « Comptes et séances fictifs, destinations réelles ». Correction faite par l'orchestrateur, car l'ancien « Données fictives » contredisait la spec.
- **Piège i18n :** le motif anglais `{language} niveau {level}` capturait le nouveau message « Filière non proposée au niveau … ». Une entrée a été placée avant lui et testée. Le moteur traite les motifs dans l'ordre d'insertion.
- **Contrôle navigateur :** Chrome headless à 390 et 1440 px (accueil, inscription, orientation, profil, admin orientation), sans erreur JS ni défilement horizontal. Contrôle manuel, hors dépôt.

## Spec Change Log

## Review Triage Log

Abréviations : BH = Blind Hunter, EC = Edge Case Hunter, VG = Verification Gap.

| Constat | Verdict | Preuve et traitement |
|---|---|---|
| BH1a : la source des destinations est attribuée à « l'ENCG Casablanca » sans preuve | low | Diff de `#mentions` et des docs : le porteur du projet a seulement écrit « communiqués par l'ENCG ». Patch : écrire « l'ENCG » partout pour les destinations ; Casablanca reste cité pour les filières, qui viennent des PDF. |
| BH1b : les destinations s'affichent pour les étudiants des 12 ENCG | low | Conforme à l'intention approuvée : la proposition §4.2 (modèle sans champ `encg`) et l'intention figée « remplacer les programmes ». Rejet ; à signaler au porteur du projet comme décision produit possible. |
| BH2 : « potentiellement adaptée » s'applique à presque toutes les destinations | false | C'est la règle figée de la matrice : « tous les critères *connus* remplis ». La corriger reviendrait à modifier la spec. Rejet. |
| BH3 : « Échange » et « Échange semestriel » se recouvrent | low | Liste imposée par la spec ; un échange de durée inconnue ne prouve pas un échange semestriel. Rejet. |
| BH4 : des nombres de candidats apparaissent sous « Places communiquées » | low | `views-public.js:237` : Ludwigshafen et Centria indiquent « Candidats ». Patch : renommer le titre en « Effectifs communiqués » (FR, EN et guide). |
| BH5 : la diffusion publique n'est pas autorisée | false | Ce n'est pas un défaut de code. La validation externe est déjà exigée avant toute fusion (proposition §5), et rien n'est poussé. Rejet. |
| BH6 : l'accueil promet des critères et des dates limites | low | `views-public.js:45` : « leurs critères et leurs dates limites », alors qu'aucune destination n'en a. Patch : reformuler le texte de l'accueil et la description de la route orientation. |
| BH7 : COUVERTURE affiche ✅ sur des critères non renseignés ; la ligne S36 est mal placée | low | Docs : les lignes §14.3 restent ✅ alors que les critères sont « à confirmer ». Patch : passer à 🟡 avec une note ; replacer S36. |
| BH8 : les filières sont codées en dur, communes à toutes les ENCG | false | Décision du porteur du projet : « Liste unique par cycle ». Rejet. |
| BH9 et EC1 : changer de niveau choisit en silence une autre filière | low | `level-tracks` : si l'ancienne filière n'est plus proposée, le navigateur sélectionne la première option. Patch : option vide « Choisissez votre filière » qui force le choix ; test V11 étendu. |
| BH10 : la traduction anglaise dépend de l'ordre du dictionnaire | medium | Moteur i18n antérieur à ce changement (correspondance des motifs dans l'ordre d'insertion). Defer. |
| BH11 et EC6 : `validProgram` et `saveProgram` appliquent des règles différentes ; `''` et `null` coexistent | low | Seul un JSON fabriqué à la main peut déclencher le cas ; la correction ajouterait des gardes. Rejet. |
| BH12 et EC7 : une sauvegarde v2 n'est plus importable, et ce n'est pas documenté | low | Le comportement suit la matrice figée (v2 → seed v3). En revanche, `DOCUMENTATION_TECHNIQUE.md` l. 25 et 55 parle encore de « v2 ». Patch : docs en v3 et mention de l'incompatibilité des sauvegardes v2. |
| BH13 et EC8 : l'interface anglaise affiche des données en français | false | Contrainte de la spec : « les données restent non traduites ». Rejet. |
| BH14 : les titres de programmes ont été inventés | low | Titres repris de l'exemple de la proposition approuvée (§4.2) ; ce sont des intitulés descriptifs, pas des critères. Rejet. |
| BH15a : le test `doesNotMatch(home, /places/i)` est fragile | low | Il casserait au premier ajout du mot « places » à l'accueil. Patch : cibler un total chiffré. |
| BH15b : la vérification `/: 40</` est fragile ; tests manquants sur les erreurs de ville et de note de source | maybe-false | Il faudrait vérifier que l'assertion vise bien la carte HEC et non celle de Rennes (40 réel). Gain faible. Rejet. |
| VG1 : le gestionnaire `admin-program` n'est jamais exécuté par un test | gap | Constat déjà vérifié par la couche VG. Patch : test via `O.forms['admin-program']` avec des places en texte brut. |
| VG2 : `level-tracks` n'est pas vérifié sur le formulaire `#orientation` | gap | Constat déjà vérifié par la couche VG. Patch : étendre V9. |
| VG3 : le tri des recommandations n'est pas vérifié | gap | Seul l'ordre d'affichage est concerné. Defer, conformément à la disposition déposée. |
| EC2 : un état v3 importé peut contenir une filière incohérente avec le niveau | low | Cas d'import fabriqué ; la correction ajouterait une garde. Rejet. |
| EC3 : l'admin peut saisir un niveau et des filières incompatibles | low | Erreur de saisie rare ; la correction ajouterait une garde. Rejet. |
| EC4 : message d'erreur peu clair au-delà de 10 lignes ; libellés de places en double acceptés | low | Cas rare ; la correction ajouterait des gardes. Rejet. |
| EC5 : `SOURCE_RULE` refuse `https://hote?query` et `https://hote#ancre` | low | Regex `(\/…)?` à `store.js:431`. Correction directe. Patch : accepter `/`, `?` ou `#` après l'hôte, avec test. |

## Design Notes

Critère inconnu, à l'image de `criteria` :

```js
{ label: 'Moyenne minimale', ok: false, unknown: true }  // exclu de met et de total
eligible = known.every(c => c.ok) && !deadlinePassed      // deadline null ⇒ non dépassée
```

## Verification

**Commandes :**
- `node --test tests/store.test.cjs tests/views.test.cjs tests/i18n.test.cjs` -- tous les tests passent.
- `for f in *.js; do node --check "$f"; done` -- aucune erreur de syntaxe.

**Contrôles manuels :**
- Navigateur à 390 et 1440 px : inscription (filtrage des filières), `#orientation` (cartes, critères « ? »), `#admin/orientation` (édition des places), accueil ; aucune erreur JS.
