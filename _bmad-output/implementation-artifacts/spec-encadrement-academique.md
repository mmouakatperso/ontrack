---
title: 'ONTRACK - pavé « Encadrement académique » (Dr Fatine Ouahtita)'
type: 'feature'
created: '2026-10-31'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-31.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** Le site ne mentionne pas l'encadrement académique du projet. Le porteur du projet veut présenter son encadrante, Dr Fatine Ouahtita (proposition §1.3 et §4.3, incrément B).

**Approche :**
- Insérer sur `#presentation`, après « Nos objectifs », une section « Encadrement académique » avec un monogramme « FO ». Elle ne contient que les faits confirmés du §1.3 : poste, laboratoire, domaines, deux publications et l'encadrement de projets étudiants et de doctorants. Pas de photo, pas de coordonnées.
- Ajouter dans le pied de page le lien « Projet académique encadré par Dr Fatine Ouahtita — ENCG Casablanca » vers `#presentation`.
- Traduire en anglais toutes les nouvelles chaînes. Les titres de publications restent tels quels.
- Documenter la section comme une extension hors cahier des charges.
- Le pavé doit être validé par l'intéressée avant toute fusion dans `main`. Rien n'est poussé.

</frozen-after-approval>

## Implementation Notes

- 2026-10-31 : implémentation directe par l'orchestrateur.
  - **Fichiers :**
    - `views-public.js` : section `supervisor` après « Nos objectifs » ; sous-route `#presentation/encadrement` avec défilement, sur le modèle de `#accueil/offres` ; description de la route.
    - `index.html` : lien en pied de page.
    - `styles.css` : `.supervisor` et `.monogram`, en colonne sous 700 px.
    - `i18n-en.js` : traductions.
    - `tests/views.test.cjs` : V13.
    - `docs/COUVERTURE_CDC.md` : section « Extensions hors cahier des charges ».
    - `README.md` : étape 1 du scénario.
  - **Écarts avec l'exemple du §4.3 :**
    - « Encadrement académique » devient le `h2` (repère de la section) et le nom passe en `h3`, au lieu de l'eyebrow et du `h2`.
    - Le nom complet de l'université est employé (« Université Hassan II de Casablanca »).
    - La classe `card` du §4.3 n'existe pas dans `styles.css` : le cadre est défini par `.supervisor`.
  - **Non fait :** la ligne facultative de l'accueil (§4.3). Le pied de page, présent sur toutes les pages, suffit.
  - **Tests :** 54/56. Les deux échecs (Stay mois calendaire, date limite dépassée) sont ceux, connus, du Node local 22.23.1 (tzdata), déjà constatés sur la baseline à l'incrément A.
  - **Syntaxe :** `node --check` est propre.
  - **Contrôle visuel :** Chrome headless à 1440 px (section et pied de page). La capture à 390 px est tronquée par la largeur minimale de la fenêtre headless, en-tête existant compris : contrôle à refaire dans les outils de développement.

## Review Triage Log

| Constat (Blind Hunter) | Verdict | Preuve et traitement |
|---|---|---|
| Le titre « Dr » n'est pas un fait confirmé | false | Le titre figure dans l'intention approuvée et dans toute la proposition validée par le porteur du projet ; seuls la thèse et le grade détaillé sont écartés. Rejet. |
| « Professor » en anglais suggère un grade | false | Il traduit fidèlement « Professeure », qui est confirmé par la source du §1.3. Rejet. |
| « Elle encadre le projet ONTRACK » n'a pas de source | false | C'est la déclaration du porteur du projet, reprise dans l'intention figée. Rejet. |
| Aucun verrou avant publication ; la ligne COUVERTURE est ✅ | low | Rien n'est poussé, et la validation est une étape de processus (proposition §5). Patch : la ligne passe à 🟡 « à faire valider avant toute fusion dans `main` ». |
| Le lien du pied de page arrive en haut de page | low | Patch : `#presentation/encadrement` avec `after` et `scrollIntoView`, comme `#accueil/offres`. |
| « n° 4 » non traduit en anglais | low | Patch : la clé est paramétrée (`{journal}`, `{volume}`, `{issue}`) ; l'anglais affiche « no. 4 ». |
| Pas de lien DOI | low | Amélioration hors de l'exemple approuvé (§4.3), pas un défaut. Rejet. |
| Nom accessible et plan des titres | low | `aria-labelledby` pointait sur le nom de la personne. Patch : `h2` « Encadrement académique » et `h3` pour le nom. |
| Lacunes du test (anglais, borne « Trois profils », `indexOf` à -1, téléphone) | low | Patch : V13 vérifie le rendu anglais, les deux bornes de position et l'absence de numéro de téléphone. |
| Spec non suivie, `in-progress`, nom différent de la proposition | false | Elle est finalisée et committée à cette étape. Le découpage par incrément a été décidé lors de l'incrément A. Rejet. |
| Documentation technique et guide non mis à jour ; description de la route ; ligne d'accueil | low | Le §4.6 n'assigne pas ces documents à B. Patch : description de la route mise à jour. Ligne d'accueil facultative non faite, voir les notes. |
