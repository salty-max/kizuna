# Contributing to Kizuna

Thank you for wanting to improve Kizuna. The project deliberately separates game
facts, modelling assumptions and interface code, so that a plausible number is never
presented as a certainty.

## Setup

```bash
bun install
bun run data
bun run dev
```

Before proposing a change:

```bash
bun run check
bun run build
bun run test:e2e
```

The first browser-test run needs Chromium:

```bash
bunx playwright install chromium
```

`bun run data` rebuilds `public/data/` from `data/raw/`. The script fails on unknown
references or codes: do not work around those errors with a silent default.

## Contribution rules

- Add a primary source for any game rule you change. Prefer LEVEL-5's official release
  notes and competition pages.
- Keep rules and calculations in `src/domain/`, with a targeted test. Components
  translate and display the results; they must not reinvent the rules.
- Flag missing data or an assumption explicitly. Do not invent a buff value, a level
  curve or a condition the dump does not provide.
- Write code in English — identifiers, comments, log output and diagnostics alike. The
  only French that belongs in the tree is data: the `fr` locale catalogue and fixtures
  whose whole purpose is to exercise a locale-aware code path.
- Every new interface key must exist in French, English and Japanese in
  `src/i18n/messages/`.
- Preserve team-link compatibility. Changing the shared format requires a new version
  and a test that rejects the older, ambiguous structures.
- Do not add proprietary assets to the MIT perimeter. See `LICENSE` for the boundary
  between source code and the game's data and artwork.

## Data and error reporting

For a data error, state at minimum the game version, the character or item id, the
value observed in game, and the source. A screenshot helps, but an official textual
source or a dataminer line is preferable.

The areas that remain only partially observable are documented in
`data/raw/dataminer/HANDOFF.md` and in the README's "Data and modelling" section.
