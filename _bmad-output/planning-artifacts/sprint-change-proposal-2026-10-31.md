---
title: 'Sprint Change Proposal — données réelles ENCG, encadrante, chat étudiant et assistant'
date: '2026-10-31'
author: 'mmouakat (workflow Correct Course)'
mode: 'batch'
status: 'approuvée'
approved: '2026-10-31'
scope: 'Modéré'
references:
  - '{project-root}/cahier_des_charges_ONTRACK.md (tient lieu de PRD, non modifié)'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-portail-demo-ontrack.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-couverture-complete-cdc.md'
  - '{project-root}/planification_examen_Rattrapage_session_d''automne_2025_2026_v2.pdf'
  - '{project-root}/Planing_examen_printemps_2025_2026_Rat.pdf'
---

# Sprint Change Proposal — 31 octobre 2026

## 1. Résumé du problème

La démonstration ONTRACK est terminée : ses deux specs sont au statut `done`, elle couvre tout le cahier des charges et elle est publiée sur GitHub Pages. Elle repose toutefois sur des données inventées à des endroits où des données réelles existent désormais, et il lui manque des éléments de présentation et d'interaction demandés par le porteur du projet.

| # | Déclencheur | Constat | Preuve |
|---|---|---|---|
| 1 | Présenter l'encadrante, Dr Fatine Ouahtita | Le site ne mentionne pas l'encadrement académique du projet | `views-public.js`, route `presentation` |
| 2 | L'ENCG a communiqué ses 9 destinations réelles | Le portail affiche 6 programmes fictifs (`data.js`, `programs`). La spec précédente interdit tout établissement réel, et le code l'impose : `store.js:82` n'accepte que des sources `example.org` | Liste transmise par le porteur du projet |
| 3 | Les plannings d'examens donnent les filières réelles | `constants.tracks` contient 6 filières génériques (« Finance », « Audit et contrôle »…) qui ne correspondent pas à l'organisation réelle | Les deux PDF (ENCG Casablanca, UH2C) |
| 4 | Simuler un chat entre étudiants | Fonction absente. Le cahier des charges ne la prévoit pas | — |
| 5 | Simuler un chatbot | Fonction absente. Le cahier des charges ne la prévoit pas | — |

**Contexte :** ces demandes arrivent après la livraison, en vue de la soutenance. Les points 1 à 3 rendent la démonstration plus crédible avec des données réelles. Les points 4 et 5 ajoutent des fonctions hors cahier des charges.

### 1.1 Données extraites des plannings (ENCG Casablanca, 2025-2026)

| Cycle | Semestres concernés | Filières | Source |
|---|---|---|---|
| Années préparatoires (1re et 2e années) | S1 à S4 | Tronc commun | Automne p. 1, printemps p. 1 |
| Cycle du diplôme, 1re année | S1 et S2 du cycle (S5 et S6 dans la numérotation du site) | **Gestion**, **Commerce** (la séparation apparaît au S2) | Printemps p. 1 |
| Cycle du diplôme, 2e année | S3 et S4 du cycle (S7 et S8) | **Finance**, **CAC**, **MRH**, **PSCM**, **BA**, **MD**, **MAC**, **CI** | Automne p. 2, printemps p. 2 |
| 5e année, ancien régime | S9 | **GFC**, **ACG**, **CI**, **ML**, **MRH**, **MAC** | Automne p. 3 |

Les PDF ne donnent que les sigles. Les intitulés développés ci-dessous sont déduits des modules enseignés et doivent être **confirmés** :

| Sigle | Intitulé proposé | Indice tiré des modules |
|---|---|---|
| CAC | Comptabilité, Audit et Contrôle | Consolidation IFRS, Risk management et contrôle interne, Audit opérationnel |
| MRH | Management des Ressources Humaines | GPEC, SIRH, Droit du travail |
| PSCM | Purchasing & Supply Chain Management | Lean Six Sigma, Retail Supply Management, Entrepôts |
| BA | Business Administration (enseignée en anglais) | Advanced accounting, Business intelligence, cours en anglais |
| MD | Marketing Digital | Community management et référencement, Analyse web |
| MAC | Marketing et Action Commerciale | Force de vente, Négociation commerciale, CRM |
| CI | Commerce International | Techniques du commerce international, Droit et arbitrage internationaux |
| GFC | Gestion Financière et Comptable | Gestion des risques financiers, Montage financier |
| ACG | Audit et Contrôle de Gestion | Contrôle de gestion approfondi, Audit fiscal |
| ML | Management Logistique | Systèmes d'information logistiques, Audit logistique |

### 1.2 Destinations communiquées par l'ENCG

| # | Établissement (orthographe corrigée) | Pays | Places communiquées | Type |
|---|---|---|---|---|
| 1 | HEC Liège | Belgique | Liste principale 20, liste d'attente 20 | À confirmer |
| 2 | Clermont School of Business (Clermont-Ferrand) | France | Liste principale 20, liste d'attente 20 | À confirmer |
| 3 | Rennes School of Business | France | Liste proposée 40 | À confirmer |
| 4 | Aix-Marseille Université | France | Candidats retenus 4 | À confirmer |
| 5 | Hochschule Ludwigshafen am Rhein | Allemagne | Candidats 22 | À confirmer |
| 6 | Centria University of Applied Sciences | Finlande | Candidats 7 | À confirmer |
| 7 | Shandong University | Chine | 2 | Échange |
| 8 | Université de Sherbrooke | Canada | 2 | Échange |
| 9 | UQAM — École des sciences de la gestion (ESG) | Canada | 3 | À confirmer |

Orthographes corrigées : « Clermant » devient « Clermont », « Hochshule Ludwigshafen am Phen » devient « Hochschule Ludwigshafen am Rhein ».

### 1.3 Ce que l'on sait publiquement de Dr Fatine Ouahtita

La recherche web du 31 octobre 2026 trouve peu de sources, et aucune n'est une page officielle de l'ENCG ou de l'UH2C. **Seuls les faits confirmés seront affichés :**

- Professeure à l'ENCG Casablanca (Université Hassan II de Casablanca). Source : support du 1st Maghrebian Finance & Economics Symposium, ENCG Casablanca, mai 2022 (prezi.com/p/0yqk_agcheuc).
- Rattachée au Laboratoire de recherche prospective en économie et gestion. Source : ijsrm.net/author/fatine-ouahtita.
- Domaines, déduits de ses publications : marketing digital, marketing d'influence, communication de marque, digitalisation et durabilité.
- Publications :
  - « Engagement Is Not Enough: Unlocking Purchase Intention Through Value and Trust in Social Media Influencers », *IJSRM*, vol. 14, n° 4, 2026 (co-autrice, DOI 10.18535/ijsrm/v14i04.em02) ;
  - « Unveiling the Eco-Digital Nexus: a systematic review », 2025 (co-autrice ; titre de la revue tronqué dans Google Scholar).
- Encadre des projets étudiants en marketing et des doctorants de l'ENCG Casablanca.

**Écartés parce que non vérifiables :** la prépublication SSRN (page inaccessible), le post LinkedIn (vu seulement en extrait), le grade, la thèse, le département et les responsabilités (aucune source). Aucune photo ne sera utilisée : un monogramme « FO » la remplace.

## 2. Analyse d'impact

### 2.1 Checklist

| Section | Point | Statut | Note |
|---|---|---|---|
| 1. Déclencheur | Problème identifié et documenté | [x] | Cinq demandes du porteur du projet, avec leurs sources (§1) |
| 2. Epics | Epic en cours ou terminée affectée | [x] | Les deux specs `done` sont affectées ; une contrainte figée est renégociée (§2.2) |
| 2. Epics | Nouvelle epic nécessaire | [!] | Une nouvelle spec d'évolution (§5) |
| 3. Artefacts | Conflit avec le PRD (cahier des charges) | [x] | Aucun conflit : le cahier reste intact. Les points 4 et 5 sont des extensions hors cahier, documentées comme telles |
| 3. Artefacts | Architecture | [!] | Modèle de données v3, nouveau module `assistant.js`, écoute `storage` entre onglets |
| 3. Artefacts | UX | [!] | Nouvelle section « Encadrement », onglet « Discussions », bulle d'assistant, cartes de destinations |
| 3. Artefacts | Tests et documentation | [!] | Tests `store`, `views`, `i18n` et nouveaux tests `assistant` ; COUVERTURE, DOCUMENTATION_TECHNIQUE, GUIDE et README |
| 4. Voie à suivre | Ajustement direct | [x] | Retenu |
| 4. Voie à suivre | Retour en arrière (rollback) | [N/A] | Rien à annuler |
| 4. Voie à suivre | Revue du MVP | [N/A] | MVP inchangé |
| 5. Proposition | Composants | [x] | Ce document |
| 6. Validation | Approbation et transmission | [x] | Approuvée par mmouakat le 31 octobre 2026 ; transmise à l'agent Developer (§6) |

### 2.2 Impact sur les epics (specs)

- **`spec-couverture-complete-cdc.md`** : la contrainte figée « aucun établissement partenaire réel ; les liens “source officielle” pointent vers `example.org` » est **renégociée** par le porteur du projet. Elle sera notée dans le *Spec Change Log* de cette spec, hors du bloc figé, qui reste intact. La ligne « Jamais : […] aucune promesse d'admission » est **maintenue**.
- **`spec-portail-demo-ontrack.md`** : la mention « programmes fictifs, sans partenariat inventé » devient caduque pour les destinations réelles. Elle sera notée dans le *Spec Change Log*.
- **Nouvelle spec** `spec-evolutions-donnees-reelles-encg.md`, qui porte les cinq changements.

### 2.3 Conflits avec les artefacts

| Artefact | Impact |
|---|---|
| `cahier_des_charges_ONTRACK.md` | Aucune modification (la règle « le cahier source reste intact » est maintenue). Le §14 est mieux servi : le cahier parle de « partenariats des ENCG participantes », ce qui est désormais réel |
| `data.js` | Filières, programmes, profils de démonstration, salons de chat, personas fictives |
| `store.js` | Validation v3, recommandations avec critères « à confirmer », API de chat, clé de stockage v3 |
| `views-public.js` | Présentation (encadrante), orientation (places, critères inconnus), accueil (compteur) |
| `views-student.js`, `views-admin.js` | Onglet Discussions ; modération du chat ; formulaire des programmes |
| `index.html`, `ui.js`, `styles.css` | Bulle d'assistant, pied de page « Projet encadré par… », nouveaux scripts |
| `i18n-en.js` | Traduction anglaise de toutes les nouvelles chaînes (exigée par `tests/i18n.test.cjs`) |
| `docs/*`, `README.md` | Traçabilité hors cahier, modèle de données, scénario de soutenance, limites |

### 2.4 Impact technique

- **Clé de stockage `ontrack-demo-v2` → `ontrack-demo-v3`**, avec v2 ajoutée à `LEGACY_KEYS`. Sans cela, les visiteurs du site publié garderaient les anciennes données en `localStorage`.
- **Toujours sans serveur ni réseau.** Le chat passe en direct entre onglets d'un même navigateur, grâce à l'événement `storage`, mais pas entre appareils. L'assistant n'appelle aucune API.
- **Déploiement** : le workflow GitHub Pages actuel convient. Il faut ajouter `assistant.js` à la liste des fichiers publiés si cette liste est explicite dans `.github/workflows/pages.yml`.

## 3. Approche recommandée

**Ajustement direct** : une nouvelle spec d'évolution est livrée en quatre incréments indépendants, chacun testé puis committé séparément.

| Incrément | Contenu | Effort | Risque |
|---|---|---|---|
| A | Filières réelles et destinations réelles (modèle v3) | Moyen | Moyen : la migration touche validation, tests et seed |
| B | Pavé de l'encadrante | Faible | Faible : contenu à faire valider par l'intéressée |
| C | Assistant ONTRACK à règles | Moyen | Faible : module pur, testable sous Node |
| D | Discussions entre étudiants | Élevé | Moyen : temps réel entre onglets, modération, nouveau stockage |

Les risques non techniques, et ce qui les réduit :

1. **Une personne réelle présentée sur un site public.** Faire relire et valider le pavé par Dr Ouahtita avant le push sur `main` (publication automatique).
2. **Des places réelles publiées.** Vérifier que l'ENCG accepte leur diffusion publique. Le cas échéant, afficher « places indicatives, liste 2025-2026 ».
3. **Les intitulés développés des sigles** : les faire confirmer. Les sigles restent toujours affichés.

**Calendrier :** aucune échéance n'est menacée. A et B passent en premier, car ce sont eux qui donnent de la crédibilité à la soutenance. C et D sont des bonus de démonstration.

## 4. Propositions de modification détaillées

### 4.1 Données — filières (incrément A)

**`data.js` — `constants.tracks`**

```
OLD:
tracks: ['Tronc commun', 'Gestion', 'Finance', 'Marketing', 'Commerce international', 'Audit et contrôle'],

NEW:
trackGroups: [
  { cycle: 'Années préparatoires', levels: ['S1','S2','S3','S4'], tracks: ['Tronc commun'] },
  { cycle: 'Cycle du diplôme — 1re année', levels: ['S5','S6'], tracks: ['Gestion', 'Commerce'] },
  { cycle: 'Cycle du diplôme — 2e année et au-delà', levels: ['S7','S8','S9','S10'],
    tracks: ['Finance', 'Comptabilité, audit et contrôle (CAC)', 'Management des ressources humaines (MRH)',
             'Purchasing & Supply Chain Management (PSCM)', 'Business Administration (BA)',
             'Marketing digital (MD)', 'Marketing et action commerciale (MAC)', 'Commerce international (CI)'] },
  { cycle: 'Ancien régime (5e année)', levels: ['S9','S10'],
    tracks: ['Gestion financière et comptable (GFC)', 'Audit et contrôle de gestion (ACG)', 'Management logistique (ML)'] }
],
tracks: /* liste à plat dérivée de trackGroups, utilisée par les validations existantes */
```

**Justification :** ce sont les filières réelles. La structure par cycle permet de proposer, pour chaque niveau, les seules filières possibles. MRH, MAC et CI existent aussi dans l'ancien régime : on ne les duplique pas. Une note visible précise : « Filières établies d'après les plannings 2025-2026 de l'ENCG Casablanca ; l'offre peut varier selon l'ENCG. »

**`store.js` — inscription, profil, orientation :** le contrôle `data.constants.tracks.includes(track)` est complété par un contrôle de cohérence avec le niveau, via `trackGroups`. Exemple de message : « Filière non proposée au niveau S3 : choisissez Tronc commun. »

**Formulaires** (`inscription`, `etudiant/profil`, `orientation`) : la liste des filières est filtrée selon le niveau choisi et regroupée par cycle avec des `<optgroup>`. Le helper `select` doit être étendu.

**Comptes de démonstration :** Salma passe de S4/Gestion, incohérent puisque Gestion relève du cycle, à **S6/Gestion**. Omar reste en S3/Tronc commun. Les fixtures de test sont adaptées de la même façon.

### 4.2 Données — destinations d'orientation (incrément A)

**`data.js` — `programs`** : les 6 programmes fictifs (p1 à p6) sont remplacés par les 9 destinations du §1.2. Nouveau modèle :

```
OLD (extrait):
program('p1', 'Semestre d\'échange en gestion', 'Institut Atlantique de Gestion (fictif)', 'France',
        'Échange semestriel', 'S5', ['Gestion','Finance','Marketing'], 12, 'Français', 'B2', 120, [...])
  → source: 'https://example.org/programmes/p1'

NEW (exemple):
{ id: 'hec-liege', name: 'Mobilité HEC Liège', institution: 'HEC Liège — Université de Liège',
  country: 'Belgique', city: 'Liège', mobility: null,            // null = « à confirmer »
  seats: [{ label: 'Liste principale', count: 20 }, { label: 'Liste d\'attente', count: 20 }],
  level: null, tracks: [], minGrade: null, languageReq: null, deadline: null, documents: [],
  source: 'https://www.hec.uliege.be', sourceNote: 'Liste communiquée par l\'ENCG, année 2025-2026',
  active: true }
```

Liens officiels proposés, à vérifier un par un au moment de l'implémentation :

| Établissement | Lien |
|---|---|
| HEC Liège | `hec.uliege.be` |
| Clermont School of Business | `clermont-sb.fr` |
| Rennes School of Business | `rennes-sb.com` |
| Aix-Marseille Université | `univ-amu.fr` |
| Hochschule Ludwigshafen am Rhein | `hwg-lu.de` |
| Centria University of Applied Sciences | `centria.fi` |
| Shandong University | `en.sdu.edu.cn` |
| Université de Sherbrooke | `usherbrooke.ca` |
| UQAM — ESG | `esg.uqam.ca` |

Le type de mobilité vaut `Échange` pour Shandong et Sherbrooke. Pour les autres destinations, il vaut `null` (à confirmer).

**Justification :** on n'affiche que des données réelles. Les champs non communiqués ne sont jamais inventés.

**`store.js` — validation (l. 82) :**

```
OLD: … Number.isFinite(program.minGrade) … && /^https:\/\/example\.org\//.test(program.source)
NEW: minGrade ∈ null ∪ [0;20] ; level ∈ null ∪ levels ; languageReq null ou {language, level} ;
     deadline null ou date valide ; mobility null ou ∈ mobilities ;
     seats = tableau de {label: chaîne, count: entier ≥ 0} ; source = URL https:// valide
```

**`store.js` — `recommendations()` :** un critère dont la donnée est `null` est affiché « À confirmer auprès de l'ENCG ». Il n'est **ni rempli ni bloquant** et sort du décompte `met / total`. Un programme est « potentiellement adapté » quand tous ses critères *connus* sont remplis. Une ligne permanente l'explique : « Critères d'admission non communiqués : renseignez-vous auprès du service des relations internationales de votre ENCG. » Les cas `deadline === null` et `deadlinePassed` sont traités.

**`data.js` — `constants.mobilities` :** devient `['Échange', 'Double diplôme', 'Échange semestriel']`. Le profil garde « Indifférent ».

**Vues :**

- **`views-public.js`, carte programme :** elle affiche les places (« Liste principale : 20 · Liste d'attente : 20 »), la note de source et le lien « Site officiel de l'établissement », qui s'ouvre dans un nouvel onglet avec `rel="noopener"`.
- **Accueil :**

  ```
  OLD: « {count} programmes illustratifs »
  NEW: « {count} destinations communiquées par l'ENCG · {seats} places »
  ```

- **`#admin/orientation` :** le formulaire permet d'éditer les places (lignes libellé/nombre) et de laisser vides les champs inconnus. L'avertissement « Établissements fictifs ; liens limités à example.org » devient « Destinations réelles : ne publier que des informations confirmées par l'ENCG. Aucun programme ne doit promettre une admission. »

**Tests (`store.test.cjs`, l. 416, 528-530, 668) :** le test « source réelle refusée » est inversé : une URL `https` est acceptée, une URL `http` ou `javascript:` est refusée. Le compte passe de 7 à 10 après un ajout. De nouveaux cas couvrent un critère inconnu (ni bloquant ni compté) et l'affichage des places.

### 4.3 Encadrante — pavé de présentation (incrément B)

**`views-public.js` — route `presentation`** : une section est insérée après « Nos objectifs ».

```
NEW:
<section class="supervisor card" aria-labelledby="encadrement">
  <div class="monogram" aria-hidden="true">FO</div>
  <div>
    <p class="eyebrow">Encadrement académique</p>
    <h2 id="encadrement">Dr Fatine Ouahtita</h2>
    <p>Professeure à l'École Nationale de Commerce et de Gestion de Casablanca (Université Hassan II),
       rattachée au Laboratoire de recherche prospective en économie et gestion.</p>
    <p><strong>Domaines :</strong> marketing digital, marketing d'influence, communication de marque,
       digitalisation et durabilité.</p>
    <p><strong>Publications récentes :</strong></p>
    <ul>
      <li>« Engagement Is Not Enough: Unlocking Purchase Intention Through Value and Trust in Social
          Media Influencers », IJSRM, vol. 14, n° 4, 2026 (co-autrice).</li>
      <li>« Unveiling the Eco-Digital Nexus: a systematic review », 2025 (co-autrice).</li>
    </ul>
    <p>Elle encadre ce projet ONTRACK, ainsi que d'autres projets étudiants en marketing et
       des travaux doctoraux à l'ENCG Casablanca.</p>
  </div>
</section>
```

**Pied de page** (`index.html` ou le rendu du footer) : on ajoute « Projet académique encadré par Dr Fatine Ouahtita — ENCG Casablanca », avec un lien vers `#presentation`.

**Accueil (facultatif) :** une ligne discrète renvoie vers le pavé.

**Justification :** le pavé ne contient que des informations professionnelles publiques et confirmées (§1.3), sans photo ni coordonnées. Il doit être validé par l'intéressée avant publication.

### 4.4 Assistant ONTRACK — chatbot simulé (incrément C)

**Nouveau fichier `assistant.js`** (script classique UMD, comme `store.js`) : une fonction pure `answer(text, ctx)` renvoie `{ text, links[], suggestions[] }`.

- **Normalisation :** casse, accents et ponctuation sont neutralisés, puis le texte est comparé à des mots-clés français et anglais pondérés.
- **Intentions** (chaque réponse est calculée à partir de `state`) :

| Intention | Contenu de la réponse | Lien proposé |
|---|---|---|
| Salutation, aide | Présentation de l'assistant | — |
| Tarifs, offres | `state.offers` | `#accueil` (tarifs) |
| Réserver, trouver un tuteur | Matières et nombre de tuteurs validés | `#reserver`, `#catalogue` |
| Annuler, reprogrammer | `config.policy` | — |
| Paiement, échec | Explication | — |
| Forfaits, Stay | Explication | — |
| Progression, comptes rendus | Explication | — |
| Orientation, destinations, places | `programs` et `seats` | `#orientation` |
| Filières | `trackGroups` | — |
| Devenir tuteur | Explication | `#inscription-tuteur` |
| Study Pods | Explication | `#pods` |
| Compte, mot de passe, vérification | Explication | — |
| Données personnelles | Explication | `#confidentialite` |
| Contact | Explication | `#contact` |
| Projet, encadrante | Résumé et pavé | `#presentation` |
| Repli | « Je n'ai pas compris » et 4 suggestions | — |

- **Contexte :** si un utilisateur est connecté, l'assistant personnalise la réponse (par exemple « Vous avez 2 crédits Stay restants »).

**Interface (`ui.js`, `index.html`, `styles.css`) :**

- un bouton flottant « Assistant », présent sur toutes les pages et accessible au clavier (Échap ferme) ;
- un panneau `role="dialog"` avec historique en `aria-live="polite"`, puces de suggestions et champ de saisie ;
- un historique conservé en mémoire d'onglet seulement ;
- un libellé permanent « Assistant simulé : réponses préprogrammées, sans intelligence artificielle ni envoi de données ».
- La réponse suit la langue active (FR | EN).

**Tests :** nouveau fichier `tests/assistant.test.cjs`. Une phrase type par intention en français et en anglais ; données reflétées (un tarif modifié est repris dans la réponse) ; repli ; échappement des saisies.

**Justification :** l'option à règles fonctionne hors ligne, est déterministe et testable, et respecte la contrainte « sans réseau ». Un vrai modèle d'IA exigerait un backend pour protéger la clé d'API ; cette piste est notée en évolution future dans la documentation technique.

### 4.5 Discussions entre étudiants — chat simulé (incrément D)

**Modèle (`data.js` seed v3) :**

```
NEW:
chat: {
  rooms: [ { id:'r-tc', name:'Tronc commun', kind:'track' }, { id:'r-gestion', name:'Gestion', kind:'track' },
           { id:'r-commerce', … }, { id:'r-compta-gen', name:'Comptabilité générale', kind:'subject' }, … ],
  personas: [ { id:'p-ines', name:'Inès (fictive)', encg:'Casablanca', track:'Commerce' }, … 3 à 4 ],
  messages: [ { id, roomId|null, threadId|null, fromId, fromName, text, created, reported, reportReason, hidden } ],
  threads:  [ { id, members:[userId|personaId, …], created } ],
  pending:  [ { id, due, roomId|threadId, personaId, text } ]   // réponses simulées planifiées
}
```

Le seed contient quelques messages d'amorce par salon, pour que la démonstration ne commence pas sur des salons vides.

**`store.js` — API :**

| Fonction | Rôle |
|---|---|
| `chatPost({roomId\|threadId, text})` | Réservée aux étudiants. 1 à 500 caractères. Avertissement si le message contient un e-mail ou un numéro de téléphone |
| `chatStartThread(otherId)` | Démarre une discussion privée avec un étudiant réel ou une persona |
| `chatReport(messageId, reason)` | Signale un message |
| `chatHide(messageId)` | Réservée à l'admin |
| Dans `tick()` | Distribue les réponses `pending` arrivées à échéance |

Les réponses simulées sont choisies par mots-clés parmi des modèles locaux. Elles arrivent 2 à 6 s plus tard sur l'horloge du store, ce qui les rend testables.

**Temps réel entre onglets :** `app.js` écoute `window.addEventListener('storage', …)` sur la clé v3, recharge l'état et réaffiche la vue *Discussions* si elle est ouverte. Deux étudiants connectés dans deux onglets se répondent donc en direct. La session reste propre à chaque onglet, sinon la démonstration est impossible ; c'est à vérifier dans `store.js` lors de l'implémentation.

**Vues :**

- **`views-student.js`, nouvel onglet `etudiant/discussions` :** liste des salons (celui de la filière de l'étudiant est mis en avant), discussions privées, fil de messages avec bouton « Signaler », formulaire d'envoi, et rappel : « N'échangez ni coordonnées, ni documents, ni données personnelles. »
- **`views-admin.js`, `admin/moderation` :** nouvelle section « Messages signalés », avec les actions Masquer et Rétablir.
- **Notifications :** une notification locale est créée à la réception d'un message privé.
- **`views-public.js`, `cgu` et `confidentialite` :** les règles du chat sont ajoutées, avec la conservation locale des messages.

**Tests :**

- **`store.test.cjs` :** envoi ; refus pour un tuteur ou un visiteur ; longueur ; réponse planifiée distribuée par `tick` à la bonne échéance ; signalement ; masquage ; suppression de compte (anonymisation des messages).
- **`views.test.cjs` :** rendu et garde de la route `etudiant/discussions`, puis échappement.

**Justification :** cette option couvre la demande (salons et messages privés) sans serveur. La limite « pas de chat entre appareils » est affichée dans l'onglet et dans le README.

### 4.6 Documentation (tous incréments)

- **`docs/COUVERTURE_CDC.md`**
  - §14 : les « 6 programmes fictifs » deviennent « 9 destinations communiquées par l'ENCG ». La note « liens example.org uniquement » devient « liens officiels ; critères non communiqués signalés ».
  - Une nouvelle section « Extensions hors cahier des charges » liste l'encadrement, les Discussions et l'Assistant, avec leurs écrans et leurs tests.
- **`docs/DOCUMENTATION_TECHNIQUE.md`** : modèle v3 (`trackGroups`, `programs.seats`, `chat`), `assistant.js`, synchronisation entre onglets, et l'évolution future (IA réelle via un backend, chat via WebSocket ou un service temps réel).
- **`docs/GUIDE_UTILISATEUR.md`** : procédures Discussions, Assistant et modération du chat.
- **`README.md`**
  - Le scénario de soutenance gagne trois étapes : présentation et encadrante ; deux onglets Salma et Omar en discussion privée ; questions à l'assistant.
  - Dans les « Limites », la phrase « les établissements partenaires et les programmes sont fictifs (example.org) » devient « les destinations proviennent de la liste communiquée par l'ENCG ; critères d'admission non communiqués ».
- **Specs précédentes :** une entrée est ajoutée dans leur *Spec Change Log* pour signaler la renégociation (§2.2).

## 5. Transmission pour l'implémentation

**Périmètre : Modéré.** Il faut une nouvelle spec, mais pas de refonte (ni du PRD ni de l'architecture).

| Destinataire | Responsabilité |
|---|---|
| Porteur du projet (mmouakat) | Faire valider le pavé par Dr Ouahtita ; confirmer avec l'ENCG les intitulés des sigles et la diffusion publique des places |
| Agent Developer (`bmad-build`) | Rédiger `spec-evolutions-donnees-reelles-encg.md` à partir de ce document, puis implémenter les incréments A → B → C → D, un commit par incrément sur une branche dédiée (pas directement sur `main`, car le push publie le site) |
| Revue (`bmad-code-review`) | Revue de chaque incrément avant fusion |

**Critères de succès :**

1. `node --test tests/*.test.cjs` passe en entier, y compris le nouveau `assistant.test.cjs`. `node --check` passe sur chaque `.js`.
2. Aucune donnée fictive ne subsiste dans `programs` ni dans `constants.tracks`. Un champ non communiqué n'est jamais inventé ; il est affiché « à confirmer ».
3. Un état v2 existant dans le navigateur est remplacé proprement par le seed v3.
4. Le pavé « Encadrement académique » est visible sur `#presentation`, avec le lien du pied de page. Il ne contient que les faits du §1.3.
5. Deux onglets connectés en Salma et Omar échangent un message privé sans rechargement manuel. Une persona répond dans un salon. Un message signalé apparaît dans `#admin/moderation`.
6. L'assistant répond correctement aux 16 intentions en français et en anglais, avec des données à jour. Il est utilisable au clavier et ne déborde pas à 390 px.
7. Toutes les nouvelles chaînes existent en anglais (test `i18n` vert).

## 6. Journal d'exécution

- **31 octobre 2026 :** analyse d'impact menée en mode batch. Quatre décisions ont été prises avec le porteur du projet :
  - orientation : remplacer les programmes fictifs et utiliser les liens officiels ;
  - filières : une liste unique, organisée par cycle ;
  - chat : des salons et des messages privés ;
  - chatbot : un assistant local à règles.
- **31 octobre 2026 :** proposition approuvée par mmouakat. Périmètre **modéré**. La renégociation de contrainte est notée dans le *Spec Change Log* des deux specs précédentes.
- **Transmission :**
  - **Agent Developer (`bmad-build`) :** il rédige `spec-evolutions-donnees-reelles-encg.md` à partir de ce document, puis implémente les incréments A → B → C → D sur une branche dédiée.
  - **Porteur du projet :** trois validations externes (§5) doivent être faites avant toute fusion dans `main`.
