# ONTRACK

**Your Study, Our Priority.**

Démonstration interactive et complète du cahier des charges ONTRACK (plateforme de tutorat et d'orientation pour les 12 ENCG du Maroc). HTML, CSS et JavaScript natifs, sans dépendance, sans compilation, sans serveur et sans requête réseau. Chaque exigence du cahier a un équivalent simulé et traçable : voir [docs/COUVERTURE_CDC.md](docs/COUVERTURE_CDC.md).

## Lancement

Ouvrir directement [index.html](index.html) dans un navigateur récent (URL `file:` acceptée). JavaScript doit être activé. Les données sont conservées dans `localStorage` (clé `ontrack-demo-v3`) et la session de connexion dans le `sessionStorage` de chaque onglet (clé `ontrack-session-v3`) : se connecter dans un onglet ne connecte pas les autres ; si le stockage est indisponible ou corrompu, un bandeau signale le mode mémoire. Un ancien état v1 ou v2 est réinitialisé automatiquement.

Version en ligne : https://mmouakatperso.github.io/ontrack/. Chaque push sur `main` lance les tests puis publie le site via [.github/workflows/pages.yml](.github/workflows/pages.yml) ; seuls `index.html`, `styles.css`, les scripts, `assets/`, `robots.txt` et `sitemap.xml` sont publiés. Les données restent propres à chaque navigateur.

Comptes de démonstration (connexion rapide disponible sur la page **Connexion**) :

| Profil | Adresse | Mot de passe |
| --- | --- | --- |
| Étudiante | salma.benali@etu.encg-casablanca.demo | Demo2026! |
| Étudiant abonné Stay | omar.tazi@etu.encg-settat.demo | Demo2026! |
| Tuteur | yassine.amrani@etu.encg-casablanca.demo | Demo2026! |
| Tutrice | lina.elfassi@etu.encg-fes.demo | Demo2026! |
| Tuteur en attente | adam.idrissi@etu.encg-tanger.demo | Demo2026! |
| Administration | admin@ontrack.demo | Admin2026! |

## Scénario de soutenance (≈ 15 minutes)

1. **Réinitialiser la démo** (pied de page). Présenter l'accueil : logo et slogan, « Find Your Tutor », concept, tarifs, avantages, suivi de progression, orientation, Study Pods « Coming Soon », pied de page légal. Suivre le lien « Projet académique encadré par… » : la page **Présentation** expose le projet et son encadrement académique (Dr Fatine Ouahtita).
2. **Inscription** : choisir l'ENCG Fès et saisir `karim@gmail.com` → refus (domaine non autorisé). Saisir `karim@etu.encg-fes.demo` → compte non vérifié ; ouvrir la **Boîte mail simulée**, copier le code, le saisir sur **Vérifier mon adresse** → compte activé, e-mail de bienvenue.
3. **Sécurité** : se déconnecter, tenter 5 fois un mauvais mot de passe sur le compte d'Omar → blocage 15 minutes, même message qu'avec une adresse inconnue. Montrer **Mot de passe oublié** (message neutre, code par e-mail).
4. **Parcours §10.1** (connexion rapide Salma) : Find Your Tutor → matière → besoin (chapitre, difficulté, mode, description, pièce jointe facultative) → service (Catch-up) → tuteurs correspondants (raisons affichées) → créneau en heure marocaine (créneaux « Prioritaire Stay » verrouillés) → récapitulatif, prix et politique d'annulation → paiement.
5. **Passerelle CMI simulée** : choisir **Paiement refusé** → réservation non confirmée, créneau libéré, e-mail d'échec. **Nouvel essai** puis **Paiement accepté** → page de confirmation, transaction payée dans **Historique**, e-mails « Paiement confirmé » et « Réservation confirmée » dans la boîte mail.
6. **Tuteur** (connexion rapide Yassine) : notification de nouvelle réservation, informations de séance, **Simuler la fin de séance**, rédiger le compte rendu en six rubriques (matière et chapitres avec statut, notions, exercices, difficultés, points à réviser, recommandations). Retour Salma : **Progression** (pourcentage par matière avec la méthode de calcul) et **Comptes rendus** ; publier un avis.
7. **Forfaits** (Omar, abonné Stay) : Mes forfaits (séances réalisées, planifiées, restantes), **Planifier une séance** avec un crédit (aucun paiement), réservation d'un créneau prioritaire ; résiliation.
8. **Administration** : **Tuteurs** → valider Adam ; il apparaît au **catalogue** et ses créneaux deviennent réservables. **Tarifs** : modifier Quick Help (les achats passés gardent leur prix). **Politique**, **Domaines e-mail**, **Matières & niveaux**. **Paiements** : tester « Rejouer la notification » et « Notification mal signée » (sans effet). **Rémunérations** : passer en phase rémunérée, clôturer une séance, enregistrer un versement. **Modération** : un avis signalé par le tuteur est masqué et sort de la moyenne. **Vue d'ensemble** : suivi financier.
9. **Orientation** (Salma, S6 Gestion) : les 9 destinations communiquées par l'ENCG, avec leurs places et le lien officiel ; profil (filières filtrées selon le niveau), recommandations critère par critère, critères non communiqués marqués « ? » et « À confirmer auprès de l'ENCG », sans promesse d'admission ; demande d'entretien (e-mail de confirmation) ; l'administrateur la planifie et peut compléter une destination dans **Orientation**.
10. **Study Pods** : page Coming Soon, inscription aux actualités ; côté administration, prototype QR à usage unique (seconde validation refusée).
11. **Discussions entre étudiants** (deux onglets du même navigateur) : onglet 1 en Salma, onglet 2 en Omar (connexion rapide dans chacun). Salma ouvre **Mon espace → Discussions** : rappel permanent, salon « Gestion » de sa filière ; elle écrit « Qui révise la compta ? » et une persona « (fictive) » répond quelques secondes plus tard. **Écrire à… Omar Tazi** puis un message privé : il apparaît chez Omar sans rechargement (notification dans l'en-tête), y compris pendant qu'Omar remplit une réservation, qui n'est pas réinitialisée. Omar **signale** un message de Salma ; en administrateur, **Modération → Messages signalés** : **Masquer** puis **Rétablir**. Rappeler la limite : aucun échange entre appareils.
12. **Assistant ONTRACK** (bouton en bas à droite, ouvert au clavier) : en visiteur, demander « Combien coûte une séance ? » puis « places à HEC Liège » (listes citées telles que communiquées, jamais additionnées) ; l'administrateur passe Quick Help à 99 DH dans **Tarifs** et l'assistant cite aussitôt 99 DH ; connecté en Omar, « mes crédits Stay » → séances restantes de son forfait. Basculer en **EN** : l'historique est repris en anglais. Rappeler le libellé « Assistant simulé : réponses préprogrammées, sans intelligence artificielle ni envoi de données » ; **Échap** ferme le panneau.
13. **Sauvegarde** : export JSON (sans les discussions privées), import, puis suppression de compte depuis Mon profil (mot de passe requis). Seules les sauvegardes v3 s'importent : un fichier v1 ou v2 est refusé (« Version locale incompatible »).

## Vérification

```sh
node --test tests/*.test.cjs
for f in *.js; do node --check "$f"; done
```

Node.js 22.23.3 ou plus récent (base horaire tzdata 2026c : Maroc en UTC+0 permanent depuis le 20 septembre 2026), uniquement pour les tests. `store.test.cjs` couvre la matrice de la spécification (inscription, blocage, retenue de créneau, paiement signé et idempotent, échec, annulation, compte rendu, avis, rôles) ainsi que les cas historiques (forfaits, centimes, fin de mois, chevauchements, repli mémoire). `views.test.cjs` rend chaque route pour chaque rôle, vérifie gardes (`O.access`), `noindex`, échappement et branchement des formulaires, et pilote les vrais gestionnaires (assistant, passerelle, compte rendu). `views.test.cjs` couvre aussi l'onglet Discussions et la section « Messages signalés » ; `store.test.cjs` simule deux onglets (deux stores sur le même stockage, deux sessions) pour les discussions. `i18n.test.cjs` vérifie que toute l'interface existe en anglais. `assistant.test.cjs` vérifie les 15 intentions et le repli (16 cas) de l'assistant en français et en anglais, les réponses tirées de l'état, la personnalisation et les saisies invalides. Les contrôles navigateur (390/1440 px, clavier) sont manuels et ne font pas partie du dépôt.

## Organisation

- [index.html](index.html), [styles.css](styles.css) : structure, charte (§3.1, fond blanc cassé), responsive.
- [sha256.js](sha256.js), [data.js](data.js), [store.js](store.js) : hachage, jeu initial, logique métier testable sans DOM.
- [i18n.js](i18n.js), [i18n-en.js](i18n-en.js) : interface bilingue français / anglais (sélecteur FR | EN du menu) ; les données ne sont pas traduites.
- [ui.js](ui.js), [views-public.js](views-public.js), [views-student.js](views-student.js), [views-tutor.js](views-tutor.js), [views-admin.js](views-admin.js), [app.js](app.js) : vues, routeur et gardes.
- [assistant.js](assistant.js) : Assistant ONTRACK, chatbot à règles testable sans DOM (hors cahier des charges).
- [robots.txt](robots.txt), [sitemap.xml](sitemap.xml) : référencement (§19).
- [docs/COUVERTURE_CDC.md](docs/COUVERTURE_CDC.md) : traçabilité section par section.
- [docs/DOCUMENTATION_TECHNIQUE.md](docs/DOCUMENTATION_TECHNIQUE.md) : architecture, données, sécurité, services externes (comparatif CMI/Payzone « à confirmer »), hébergement, maintenance.
- [docs/GUIDE_UTILISATEUR.md](docs/GUIDE_UTILISATEUR.md) : procédures par profil, sauvegarde et restauration.

## Limites de la simulation

Aucun paiement, e-mail, visioconférence ou intégration universitaire réels ; aucune donnée bancaire saisie. Les domaines `etu.encg-<ville>.demo` et les personnes sont fictifs. Les destinations d'orientation proviennent de la liste communiquée par l'ENCG (2025-2026) ; les critères d'admission non communiqués sont affichés « à confirmer », jamais inventés, et aucune admission n'est promise. Les filières suivent les plannings 2025-2026 de l'ENCG Casablanca (l'offre peut varier selon l'ENCG ; intitulés développés des sigles à confirmer). Les pièces jointes ne sont jamais stockées, seules leurs métadonnées. Les Study Pods ne sont pas réservables par les étudiants. L'Assistant ONTRACK répond par mots-clés à une quinzaine de thèmes, sans intelligence artificielle ni réseau : une question hors de ces thèmes reçoit « Je n'ai pas compris » et des suggestions ; son historique n'est conservé que dans l'onglet. Les Discussions entre étudiants sont simulées, sans serveur : les messages restent dans le navigateur, deux onglets du même navigateur se parlent en direct, mais **aucun échange n'est possible entre appareils** ; les personas « (fictive) » répondent par mots-clés. La session est propre à chaque onglet : un lien ouvert dans un nouvel onglet démarre déconnecté, un onglet dupliqué copie la session, et se déconnecter dans un onglet ne déconnecte pas les autres (seule une réinitialisation du mot de passe ferme les sessions du compte dans tous les onglets). L'authentification est locale : hachages, session et secret de signature sont lisibles dans le navigateur, ce qui est acceptable pour une démonstration mais pas pour la production (voir la documentation technique). La boîte mail simulée affiche les codes de vérification en clair pour l'adresse du compte connecté et les adresses saisies dans l'onglet : elle ne prouve donc pas la possession réelle de la boîte. Les comptes de démonstration utilisent des sels fixes. Les données ne sont pas partagées entre appareils. Le cahier des charges source n'est pas modifié.

## Sources des illustrations

Photos Unsplash téléchargées dans `assets/`, sans dépendance réseau à l'exécution ; elles ne représentent pas les identités fictives affichées.

- Campus : https://unsplash.com/photos/9DaOYUYnOls (image `photo-1523240795612-9a054b0db644`).
- Portrait Yassine : https://images.unsplash.com/photo-1500648767791-00dcc994a43e.
- Portrait Lina : https://images.unsplash.com/photo-1580489944761-15a19d654956.
- Portrait Adam : https://images.unsplash.com/photo-1506794778202-cad84cf45f1d.
- Espace Study Pods illustratif : https://images.unsplash.com/photo-1497366754035-f200968a6e72.

Le logo de l'en-tête provient de [Logo-ontrack-1.jpeg](Logo-ontrack-1.jpeg) ; le monogramme de [Logo-ontrack-3.jpeg](Logo-ontrack-3.jpeg) sert de favicon. Les originaux restent intacts.
