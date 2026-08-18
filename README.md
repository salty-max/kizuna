# Kizuna

Kizuna is a team builder and analysis tool for **Inazuma Eleven: Victory Road**.
It combines the game's datamined catalogue with explicit squad rules so players can
compose, compare, save and share teams without hiding how the numbers are calculated.

Production: [kizuna-green.vercel.app](https://kizuna-green.vercel.app)

## Features

- responsive builder for the starting eleven, bench and staff;
- drag-and-drop and keyboard movement of complete player builds;
- guided generation of three tactical proposals by objective, playstyle and formation;
- primary and secondary position validation, unique characters and reserve coverage;
- tournament profile with level-50 stats, two Hero starters and one Basara maximum;
- equipment, techniques, passives, Team Builds, Build Ranks, tactics and synergies;
- traceable guaranteed and conditional power calculations;
- compact versioned team links and PNG exports;
- local saves, plus optional Discord authentication and private Supabase cloud saves;
- player, equipment, technique, passive, tactic and bond catalogues;
- where each character's spirit drops, and who each battle or star sign hands out;
- French, English and Japanese interface, in a dark or light theme.

Seasonal-player eligibility and exact synergy buff values are not available in the
current dump. Kizuna reports those gaps instead of inventing values.

## Local development

Kizuna uses [Bun](https://bun.sh/) and Vite.

```bash
bun install
bun run data
bun run dev
```

`bun run data` regenerates `public/data/` and `public/icons/` from `data/raw/`.
Generated catalogues are ignored by Git.

Useful commands:

```bash
bun run check        # format, lint, TypeScript, dead code and unit tests
bun run build        # data generation, production build and static prerender
bun run test:e2e     # Playwright desktop and mobile scenarios
bun run perf:budget  # compressed production asset budgets
```

Chromium is required for the first end-to-end run:

```bash
bunx playwright install chromium
```

## Project structure

```text
data/raw/             source dumps and extracted game assets
scripts/              data generation and production verification
src/backend/          optional Supabase authentication and cloud saves
src/components/       builder and catalogue UI
src/data/             route-aware catalogue loading and codecs
src/domain/           game rules, team model and calculations
src/i18n/             interface messages and localized labels
src/lib/              sharing, storage, metadata and export helpers
supabase/migrations/  database schema and Row Level Security policies
e2e/                  Playwright user journeys
```

The domain layer emits stable codes and calculated results. React components translate
and present them; they should not duplicate game rules.

## Data and modelling

The dataminer provides Common, Hero and Basara stat tables at levels 50 and 99.
Standard teams use level 99; the tournament profile uses level 50. Rising through
Legendary use measured multipliers because dedicated tables are absent. Hero and
Basara use their real tables when the character has those forms.

Equipment modifies base stats before power is derived. Passives modify derived power
or team gauges. Guaranteed effects and effects that depend on match state remain
separate in the UI.

The eight formations come from LEVEL-5's official formation data. A generated team
never places a starter outside their primary or secondary position. Manual teams may
still do so, but Kizuna displays a warning.

The data pipeline is intentionally strict: an unknown game code or broken reference
fails the build rather than silently producing a plausible but incorrect value.
Open extraction gaps are tracked in
[`data/raw/dataminer/HANDOFF.md`](data/raw/dataminer/HANDOFF.md).

## Optional cloud saves

The application works fully without an account. When Supabase variables are present,
Discord OAuth enables private cloud saves while local saves remain available.

Copy `.env.example` to `.env.local` and provide the browser-safe Supabase URL and
publishable key. Never expose a service-role key or an OAuth client secret through a
`VITE_*` variable.

Setup and security details are documented in [`docs/BACKEND.md`](docs/BACKEND.md).

## Deployment

Vercel builds the static Vite application from `vercel.json`. The production build
also creates route metadata, static catalogue landing pages, `robots.txt`, a sitemap
and the social card.

```bash
bunx vercel deploy       # preview
bunx vercel deploy --prod
```

See [`docs/RELEASE.md`](docs/RELEASE.md) for environment configuration, verification
and rollback instructions.

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before changing a game rule or generated
dataset. Security issues should follow [`SECURITY.md`](SECURITY.md).

Source code is MIT-licensed. Game data and artwork are excluded from that grant; see
[`LICENSE`](LICENSE) for the exact boundary and attribution.

Kizuna is a fan project and is not affiliated with LEVEL-5.
