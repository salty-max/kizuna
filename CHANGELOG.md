# Changelog

Les changements notables de Kizuna sont regroupés ici. Aucune version n'a encore été
publiée : tout ce qui suit constitue la première.

## Non publié

### Ajouté

#### Composition

- terrain, effectif, banc et staff avec les huit formations officielles de LEVEL-5 ;
- assistant de composition tactique : trois propositions par objectif, style de jeu et
  formation, chacune justifiée joueur par joueur ;
- profil de règles tournoi (niveau 50), deux titulaires Héros et un Basara maximum ;
- validation des postes primaires et secondaires, unicité des personnages et couverture
  de la réserve ;
- remplissage automatique des emplacements, équipements et passifs vides, avec le motif
  de chaque choix ;
- sélection automatique des formes Héros et Basara dans les limites du jeu ;
- budget de rareté, filtres par poste, genre, drop d'esprit et formes disponibles ;
- déplacement des cartes par glisser-déposer ou au clavier.

#### Calculs et données

- Build Ranks, synergies équipées, tactiques d'équipe et bonds de personnages ;
- effets de passifs structurés : pourcentages, bonus plats sur les stats de base,
  conditions de match et paliers liés aux rangs de charge ;
- distinction explicite entre effets garantis et effets dépendant de l'état du match ;
- passifs sans effet exploitable signalés comme tels plutôt que devinés ;
- mise à l'échelle des passifs par rareté et taux d'arrêt modélisé comme jauge.

#### Catalogue et wiki

- wiki des joueurs, techniques, équipements, passifs, tactiques et bonds, chargé
  catalogue par catalogue ;
- lieux d'obtention sur la fiche de chaque personnage : les batailles Chronicle et les
  signes de l'Univers du joueur qui donnent son esprit, séparés parce qu'une bataille
  se rejoue et qu'un signe se tire. Un personnage qu'aucune table ne donne le dit ;
- visionneuse de modèle de personnage : les huit vues pré-rendues d'Inazugle en
  tourniquet maison, poses buste et pied, rotation à la souris, au clavier ou au doigt,
  anneau préchargé en entier avant affichage ;
- interface française, anglaise et japonaise, avec noms de personnages, surnoms de
  terrain et noms de clubs localisés, et bascule vers les noms d'origine.

#### Partage, sauvegarde et diffusion

- partage compact versionné KZ1 et sauvegarde locale ;
- export de l'équipe en PNG ;
- authentification Discord et sauvegardes privées optionnelles via Supabase, l'outil
  restant entièrement utilisable sans compte ;
- pré-rendu, sitemap, URL canoniques et aperçu social ;
- configuration Vercel avec previews, en-têtes, caches et fallback SPA.

#### Qualité

- tests unitaires du domaine, parcours Playwright desktop et mobile, budgets de
  performance et vérification du build de production ;
- pipeline de données stricte : un code de jeu inconnu ou une référence cassée fait
  échouer la génération au lieu de produire une valeur plausible.

### Modifié

- découpe de `SlotEditor`, `SynergyPanel` et `PlayerPicker` en modules spécialisés ;
- format de transport joueur compact pour réduire le chargement initial ;
- chargement du catalogue selon la route, et détails joueurs par paquets ;
- navigation clavier, contrastes et ordre de lecture mobile renforcés ;
- barre d'outils du builder sur deux lignes et édition d'emplacement en panneau latéral ;
- le filtre « Drop d'esprit » du sélecteur et du wiki devient « Obtenable » et s'appuie
  sur les lieux d'obtention : il retenait 396 personnages là où 4856 sont réellement
  distribués, le drapeau ne couvrant que les coffres de victoire et récompenses fixes ;
- format de transport joueur : les identifiants de lieux sont internés et le chemin CDN
  du modèle est dérivé de son propre nom, ce qui absorbe le coût des lieux d'obtention ;
- runtimes des workflows GitHub Actions mis à jour.

### Corrigé

- le bouton d'ouverture du modèle était recouvert par le portrait du joueur et n'était
  cliquable que sur quelques pixels ;
- les emplacements d'entraîneur et de manager restaient vides quand tous les rôles du
  dump valaient « Player » ;
- termes de jeu japonais corrigés, les restes en alphabet latin ayant été remplacés ;
- contrôles responsives qui se chevauchaient sur les largeurs intermédiaires ;
- dialogue du modèle compacté, bouton de fermeture rendu visible et images Inazugle
  dotées d'un état de chargement au lieu d'une icône cassée.

### Connu

- l'éligibilité des joueurs saisonniers et les valeurs exactes des buffs de synergie
  sont absentes du dump : Kizuna signale ces manques plutôt que d'inventer des valeurs ;
- les icônes de synergies et de passifs ne sont pas encore rattachées à leur entrée ;
- trois noms de lieux en français (cinq en anglais) portent encore un substituant de nom
  de personnage non résolu : le dataminer les remplit désormais à l'export, mais la table
  des lieux n'est pas encore sur ce chemin. La génération de données les compte et les
  nomme à chaque exécution. Un match d'événement n'est nommé dans aucune des trois langues.
  Le détail est suivi dans [`data/raw/dataminer/HANDOFF.md`](data/raw/dataminer/HANDOFF.md).
