# Contribuer à Kizuna

Merci de vouloir améliorer Kizuna. Le projet sépare volontairement les faits du jeu,
les hypothèses de modélisation et le code d’interface afin qu’un chiffre plausible ne
soit jamais présenté comme une certitude.

## Installation

```bash
bun install
bun run data
bun run dev
```

Avant une proposition de changement :

```bash
bun run check
bun run build
bun run test:e2e
```

Le premier lancement des tests navigateur nécessite Chromium :

```bash
bunx playwright install chromium
```

`bun run data` reconstruit `public/data/` à partir de `data/raw/`. Le script échoue
sur les références ou codes inconnus : ne contournez pas ces erreurs avec une valeur
par défaut silencieuse.

## Règles de contribution

- Ajoutez une source primaire pour toute règle de jeu modifiée. Préférez les notes de
  version et pages de compétition officielles de LEVEL-5.
- Gardez les règles et calculs dans `src/domain/`, avec un test ciblé. Les composants
  traduisent et affichent les résultats, ils ne doivent pas réinventer les règles.
- Signalez explicitement une donnée absente ou une hypothèse. N’inventez pas une
  valeur de buff, une courbe de niveau ou une condition que le dump ne fournit pas.
- Toute nouvelle clé d’interface doit exister en français, anglais et japonais dans
  `src/i18n/messages/`.
- Préservez la compatibilité des liens d’équipe. Une modification du format partagé
  exige une nouvelle version et un test de rejet des anciennes structures ambiguës.
- N’ajoutez pas d’assets propriétaires au périmètre MIT. Consultez `LICENSE` pour la
  distinction entre le code source et les données/illustrations du jeu.

## Données et signalement d’erreur

Pour une erreur de données, indiquez au minimum la version du jeu, l’identifiant du
personnage ou de l’objet, la valeur observée en jeu et la source. Une capture aide,
mais une source textuelle officielle ou une ligne du dataminer reste préférable.

Les domaines encore partiellement observables sont documentés dans
`data/raw/dataminer/HANDOFF.md` et dans la section « What the data cannot tell you »
du README.
