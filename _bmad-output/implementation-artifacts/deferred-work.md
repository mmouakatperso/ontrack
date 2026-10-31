# Travaux différés

- source_spec: none
  summary: Pavé « Encadrement académique » présentant Dr Fatine Ouahtita sur #presentation, avec un rappel dans le pied de page (incrément B, sprint-change-proposal-2026-10-31.md §4.3).
  evidence: Séparé de l'incrément A au découpage multi-objectifs de bmad-build. Livrable indépendant, en attente de la relecture de l'intéressée.
- source_spec: none
  summary: Assistant ONTRACK à règles (assistant.js, bulle sur toutes les pages, 16 intentions FR/EN fondées sur les données du site) (incrément C, sprint-change-proposal-2026-10-31.md §4.4).
  evidence: Séparé de l'incrément A au découpage multi-objectifs. Module autonome ; il dépend des données de A pour les réponses sur les filières et l'orientation, donc à faire après A.
- source_spec: none
  summary: Discussions entre étudiants (salons par filière ou matière, messages privés, personas fictives, synchronisation entre onglets, modération admin) (incrément D, sprint-change-proposal-2026-10-31.md §4.5).
  evidence: Séparé de l'incrément A au découpage multi-objectifs. Il ajoute la collection chat à l'état v3 créé par A, donc à faire après A.
- source_spec: `_bmad-output/implementation-artifacts/spec-donnees-reelles-encg-filieres-destinations.md`
  summary: Le moteur i18n (`O.i18n.message`) essaie les motifs dans l'ordre d'insertion ; un motif générique (« {language} niveau {level} ») peut capturer un message plus précis.
  evidence: Constaté pendant l'implémentation : « Filière non proposée au niveau … » était mal traduit. Contourné en plaçant l'entrée avant le motif générique. Préférer le motif littéral le plus long ou le plus spécifique.
- source_spec: `_bmad-output/implementation-artifacts/spec-donnees-reelles-encg-filieres-destinations.md`
  summary: Aucun test ne vérifie l'ordre de tri des recommandations (éligibles d'abord, puis part de critères connus remplis).
  evidence: `store.test.cjs` trie les identifiants avant de comparer (l. 528) ; revenir à `b.met - a.met` ne ferait échouer aucun test. Seul l'ordre d'affichage est en jeu.
