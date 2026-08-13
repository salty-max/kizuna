# Kizuna

Team builder for **Inazuma Eleven: Victory Road**. Build a squad, kit it out, declare
each character's passives, and see what the combination actually does to your
numbers — with every percentage traceable back to the passive that produced it.

```bash
bun install
bun run data   # regenerate public/data/ from data/raw/
bun run dev
```

## i18n

UI chrome is localised for **fr / en / ja** — the same three languages the
dataminer ships and the position badge atlases use (`icon_position_*.{fr,en,ja}.png`).

- Catalogues live in [`src/i18n/messages/`](src/i18n/messages/); keys are typed.
- Locale is stored in `localStorage` (`kizuna.locale`), with a browser-language
  fallback on first visit. Switcher sits in the header.
- Domain code emits **stable codes** (violations, unresolved passive reasons,
  scope notes); the UI translates them. Never put a French sentence in
  `src/domain/`.
- Position badges follow the active locale via `PositionBadge` →
  `positionBadgePath(pos, locale)`.

**Content names** (players, equipment, hissatsu) still come from the build-time
dataminer language (`LANG` in `build-data.ts`, currently `fr`). Switching the
UI language does not yet swap those strings — that is the next step (locale
name packs loaded at runtime).

## Why the synergy engine is the point

Passives in the community dataset are not free text — they carry a structured
effect model:

```json
{
  "id": "passive_001",
  "buildType": null,
  "strongValue": 1.5,
  "weakValue": 1,
  "effects": [
    {
      "scope": "alliesSameElement",
      "stat": "shotAT",
      "mode": "percent",
      "direction": "increase",
      "conditions": []
    }
  ]
}
```

11 scopes, 20 stats, 24 typed conditions. That is enough to resolve a passive
against an actual squad rather than just print its description.

The key thing to understand: **passives do not modify the seven base stats.**
They modify the derived _power_ stats, which are what resolve duels:

| Power stat   | Formula                                |
| ------------ | -------------------------------------- |
| `shootAT`    | Kick + Control                         |
| `focusAT`    | Technique + Control + Kick×0.5         |
| `focusDF`    | Technique + Intelligence + Agility×0.5 |
| `wallDF`     | Pressure + Physical                    |
| `scrambleAT` | Intelligence + Physical                |
| `scrambleDF` | Intelligence + Pressure                |
| `kp`         | Pressure×2 + Physical×3 + Agility×4    |

Equipment goes the other way: it raises base stats, and power is derived after.

## Levels and rarity

The dataminer ships **real Common / Hero / Basara tables at level 50 and 99**.
Kizuna builds at **level 99** by default. Intermediate rarities (Rising →
Legendary) still have no dedicated table, so they scale the Common line with
the community's measured multipliers. Hero and Basara **prefer the real table**
when the character has one (73 Heroes, 72 Basaras in build 6.00.23.00); only
characters without a row fall back to a ratio estimate.

| Rarity | Common | Rising | Advanced | Top  | Legendary | Hero                    | Basara                  |
| ------ | ------ | ------ | -------- | ---- | --------- | ----------------------- | ----------------------- |
| Source | table  | ×1.1   | ×1.2     | ×1.3 | ×1.4      | **table** (else ×1.206) | **table** (else ×1.444) |

The intermediate multipliers are the community's _tested_ values against a
Common reference. Several guides instead state "+20% of Common per rank", which
would give 1.2/1.4/1.6/1.8 — measured wins. The Hero/Basara fallback ratios are
the mean of every stat on every character that _does_ have a real row
(stdev < 0.02); the UI flags the estimate when it is used.

The old 1.67× Hero figure applied to a _different_ (community-scrape) reference
line and is gone. Equipment is always flat on top of whatever line rarity
picked: `table + 10`, never `(table + 10) × mult`.

### Hero variants

Hero is not one tier but three, and the colour follows the build archetype:

| Variant     | Archetypes          |
| ----------- | ------------------- |
| Hero red    | Tension, Rough Play |
| Hero silver | Justice, Bond       |
| Hero pink   | Breach, Counter     |

So the variant is _derived_ from the archetype rather than asked for, which
makes an invalid Hero/archetype pairing unrepresentable.

### Archetype belongs to the drop, not the character

`buildType` in the dataset describes **one entry**, not a person. The data says
so plainly: 30 names appear across entries with conflicting archetypes — Steve
Grim exists as `justice` (id 7), `roughPlay` (1227) and `counter` (2653), and
Nathan Swift changes position along with his archetype. On top of that, Basara
rarity lets you re-pick the archetype outright.

So archetype is a **per-slot override** that defaults to the dataset's value,
exactly like rarity. Change it and the Hero variant recolours with it. 1035
characters have no archetype recorded at all; for those the field starts blank
and the UI asks rather than guessing.

### Formations

All eight are the game's own, and so are their shapes.
[formations.ts](src/domain/formations.ts) is generated from the position markers
on [Level-5's formations page](https://zukan.inazuma.jp/en/soccer_formation/),
where every slot is a literal `left: x%; top: y%` — not redrawn by eye.

|                              |                      |
| ---------------------------- | -------------------- |
| 4-4-2 Diamond · 4-4-2 Box    | 3-5-2 Freedom        |
| 4-3-3 Triangle · 4-3-3 Delta | 4-5-1 Balanced       |
| 3-6-1 Hexa                   | 5-4-1 Double Volante |

Two transformations happen at generation: the vertical axis is flipped so `y = 0`
is your own goal, and `y` is renormalised over 0–100 because the official page
only uses the bottom half of its pitch and leaves 40% empty above. Each slot's
`position` is derived from the formation's name (4-4-2 → 4 DF, 4 MF, 2 FW),
since the markers carry no role of their own.
[formations.test.ts](src/domain/formations.test.ts) guards the transcription:
eleven slots each, one keeper at `y = 0`, the breakdown matching the name, and
the full height in use.

### Squad limits

The game caps **2 Hero on the pitch** and **1 Basara in the squad**. Both are
checked and flagged — the counts deliberately run over different populations
(Hero counts starters, Basara counts the whole squad), so a benched Hero is
fine while a benched Basara still trips the limit.

**Level itself is not modelled** — no reliable public formula maps level to
stats, and inventing a curve would produce numbers that look authoritative and
are not. Build at a rarity, compare squads on equal footing.

## Modelling decisions

These are judgement calls the data does not settle. Each lives in exactly one
place so it can be revised when the game proves it wrong.

- **Allies include the carrier.** "Shot AT +% for players of the same element"
  is read as covering its holder. `ALLY_SCOPES_INCLUDE_SELF` in
  [synergy.ts](src/domain/synergy.ts).
- **Percentages stack additively.** Two +10% passives give +20%.
- **Guaranteed vs conditional are never merged.** An effect gated on
  `tensionAt100` is a ceiling, not a number you have. The UI shows both.
- **`nearbyAllies` is never guaranteed** — it depends on live positioning a
  static builder cannot know, so it always lands in the conditional bucket.
- **`subbedOnPlayer` is reported, not dropped.** Anything the engine cannot
  resolve surfaces in a "non calculable" list rather than silently vanishing.
- **Gauges count once per team.** `breachRate`, `tension`, `foulRate` and the
  rest have no per-player equivalent, so a team-scope gauge passive is not
  multiplied by the eleven players it nominally reaches.
- **Bench passives do not apply.** Manager and coordinator passives do.
- **Position is advisory.** Victory Road lets you field anyone anywhere, so an
  out-of-position player is flagged, never refused.
- **There is no pitch.** A green rectangle with chalk lines said nothing the
  cards did not, and it trapped them in a fixed aspect ratio where the wide
  slots hung over the edges. The squad is drawn as cards alone, inside a box
  inset by half a card, so `x = 0` puts a card's _edge_ on the boundary rather
  than its centre. The board scrolls itself on narrow screens; the page never
  scrolls sideways.
- **Rarity scales the character, not their gear** — see above.
- **Colour is spent on rarity, not position.** A position is two letters and
  needs no hue; rarity is the thing you actually scan a squad for. The Hero
  colours are the game's own rather than invented.
- **A squad card carries rarity in its border and its shadow, never in text and
  never as a ring.** The layout follows the game's own: portrait large on the
  right, element and position stacked top-left, name along the bottom-left.
  Bench and staff use the identical card — a squad should read the same
  wherever you look at it.

## The visual direction: Hissatsu

The palette is not invented. It is **extracted from Level-5's own stylesheet**
on zukan.inazuma.jp — the electric yellow, the vermilion, and the rarity ribbon
gradients (`#ED6700 → #FFF100`, `#EB0000 → #FF8200`) are the game's, lifted from
the CSS rather than eyeballed from a screenshot.

The direction is the _hissatsu cut-in_ — the special-move screen — with one
deliberate subtraction: **no background**. The first pass had converging speed
lines and a radial burst; they looked right for three seconds and became
unbearable over an hour. Removing them was the single best decision in the
charter, because it forced the energy into the structure:

- **Shear.** Cards, empty slots and their contents lean at −9° (`.shear`), with
  every child counter-sheared (`.shear-flat`) so only the frame tilts. Panels
  and tables stay square — the shear is spent on what you point at.
- **Hard shadows.** `5px 6px 0`, no blur. A manga panel, not a material card.
  The shadow colour is the rarity, which is why the pitch can be scanned
  without reading a single label.
- **Condensed italic caps** for every title, button and name (`--font-display`).
- **Vermilion title bars** flush to the panel edge.
- **One accent.** Electric yellow is the only thing that means "act here";
  vermilion is structural. Nothing else competes.

Ground is near-black with a red bias (`#0F0B0D`) rather than a neutral grey, so
it sits under the vermilion instead of fighting it. Text is warm white
(`#FFF4E6`). The app commits to a single dark theme on purpose.

### The primitives

[`src/components/ui/`](src/components/ui/) holds the whole vocabulary — `Panel`,
`Button`, `IconButton`, `LinkButton`, `Tab`, `Chip`, `FilterChip`, `Callout`,
`Field`, `Select`, `NumberInput`, `DataRow`. **None of them know the domain**:
no player, no rarity, no synergy. They only know what the app looks like.

They exist because the app had 27 hand-written panels, each improvising its own
body padding — `p-3` here, `px-3 pt-3 pb-2` there, `panel-body` on two of
eleven — and two competing treatments for the same explanatory line. That drift
is invisible in any single file and obvious across the app.

**No native form controls.** `<select>` and `<input type="checkbox">` cannot
join a design system: their height, chevron, dropdown and checkbox glyph come
from the OS, and no CSS reaches them. On a toolbar where everything else is
exactly `--control-h`, they were the only things that would not line up. So
[`Select`](src/components/ui/Select.tsx) is a real listbox — `role="combobox"`
trigger, portalled `role="listbox"`, arrow keys, Home/End, typeahead, Escape,
click-outside, active option scrolled into view — and
[`Toggle`](src/components/ui/Toggle.tsx) is a `role="switch"` with a square
knob. Button, select, text field, toggle and tab now all measure 34px.

The listbox is portalled to `document.body` with `position: fixed` for a
specific reason: `Panel` carries `overflow-hidden` to keep its title bar flush
to the border, and the right rail scrolls. An absolutely-positioned menu would
be clipped by the first and carried away by the second. It repositions on
scroll rather than closing, because you scroll the rail while browsing 224
pairs of boots.

**Long lists get `searchable`; short ones don't.** Equipment (224 items) and
passives (60 per preset) turn the trigger into a filter field. Rarity,
archetype, formation and locale stay plain — a text cursor on seven options is
noise. Filtering matters because typeahead only ever matches a _prefix_: there
is no way to reach "Crampons Étrangers de Zanark" by typing _zanark_. Search
is substring and **accent-folded**, so _etrangers_ finds _Étrangers_ — on a
French catalogue, an accent-sensitive search is a trap rather than a feature.

Escape clears the query before it closes the list. Losing 224 options to fix
one typo is the kind of small cruelty that makes people stop using a filter.

Three rules make the whole thing cohere:

- **Structure, depth and tint are separate.** `.btn` describes shape and voice
  and nothing else; `.pressable` owns the shadow and the press; a tone utility
  says what colour that shadow is. A player card and a button therefore depress
  identically — same 3px travel, same shadow collapse — without sharing a line
  of code. A card just injects its rarity as the tint.
- **Interactive things look interactive, static things don't.** `Chip` is a
  `<span>` with no hover; `FilterChip` is a `<button>` with `aria-pressed`.
  Making them one component would have left half the app's pills pretending to
  be clickable.
- **The scale has no holes.** `--color-ink-*` runs 100→950 with nothing missing.
  A gap is worse than it sounds: a missing shade is silently dropped inside a
  `class` attribute and a hard build error inside `@apply`.

One CSS trap is worth knowing, because it cost a real debugging pass: a custom
property declared on `:root` resolves its inner `var()` **on the root**. So
`--shadow-hard: 5px 6px 0 var(--shadow-hard-color)` inherits down as an
already-black string, and overriding the tint on a card changes nothing. The
geometry is written where the shadow is set, and the colour is the only thing
that varies.

## Moves

Every character carries the moves they learn: six on the main branch at levels
1/13/20/30/38/43, and a second branch of three that **replaces** the tail at
30/38/43 — not three extra slots. That branch is the only real build choice on
moves; the rest is learnt outright.

Three findings drove the implementation, each verified rather than assumed:

- **The catalogue is three tables, not one.** A slot may point at `hissatsu`,
  `aura_hissatsu` or `auras`. Reading only `hissatsu` silently loses **a third**
  of all slots (auras alone are 22%), and it touches 5416 of 5418 characters —
  so it fails everywhere at once, quietly. Ids do not collide, so one merged
  Map resolves all 50 292 references with zero unknowns, and `build-data`
  aborts if that ever stops being true.
- **Moves depend on rarity, exactly like stats.** Of the 72 characters present
  in both `characters` and `heroes`, all 72 have different move lists. So Hero
  and Basara carry their own sets rather than inheriting the base one.
- **Hero has no second branch** — 147 of 147. The branch tabs therefore appear
  per _form_, not per character: switch a slot to Hero and the choice
  disappears, because the game does not offer it.

Auras carry a mechanic (`keshin`, `armed`, `mixi_max`, `totem`,
`bond_transform`, `awakening_power`, `mode_change`, `awakening_change`) read
from their string-id prefix — those eight are certain. **Which badge belongs to
which is inferred**, graded in
[`_aura_types.csv`](data/raw/icons/aura/_aura_types.csv): strong for mixi max /
armed / keshin, weak for totem and mode change. `awakening_change` has one aura
and no badge left over, so it renders none rather than borrowing another
mechanic's glyph. The badges are decoration — a wrong one misleads the eye, not
the maths.

## What the data cannot tell you

Still open after the dataminer pass (see [`data/raw/dataminer/HANDOFF.md`](data/raw/dataminer/HANDOFF.md)):

- **Character → passive.** No file yet says which passives a given character can
  carry. Hand entry stays (six slots: five presets + one custom lottery/custom
  pools — not per-character tables).
- **Structured passive effects.** Best-effort parse from English passive text
  covers nearly the whole catalogue. Charge-rank loops are conditional (one
  rank of magnitude). Flat base-stat rows (`Kick +7`) apply in resolveTeam
  before power is derived. A handful of empty/id-only rows stay text-only.
- **Level 1–98 curve, Abilearn, beans.** Only lv50 and lv99 tables are extracted.
  The builder targets lv99.

## Layout

```
data/raw/
  dataminer/           game bundles (ievr.{en,fr,ja}.json)
  icons/               game UI icons extracted from .g4tx atlases
  player-images.json   Inazugle portrait index (`bun run data:player-images`)
  equipment-images.json Inazugle gear icons (`bun run data:images`)
scripts/
  fetch-player-images.ts   scrape portraits from Inazugle
  fetch-equipment-images.ts scrape item icons from Inazugle
  build-data.ts            raw → public/data/ + public/icons/
public/data/         what the app fetches
public/icons/        element / style / hissatsu / position / tactic glyphs
src/domain/          stats, types, formations, team model, synergy engine
src/lib/             share encoding, localStorage, UI helpers
src/components/      pitch, picker, slot editor, synergy panel
```

`build-data.ts` **aborts** on any value it does not recognise — a new element or
passive scope must fail the build, not get silently dropped and leave the engine
quietly wrong. Position and style codes are mapped with mappings verified
against known characters and the community dump (~99% majority agreement); see
the comments in the script.

## Persistence

Teams are encoded into the URL hash by [share.ts](src/lib/share.ts) — a filled
4-4-2 with equipment and passives fits in ~400 characters. localStorage stores
the same encoding, so the saved format and the link format cannot drift apart.
The version prefix is load-bearing:

| Version | Why                                                        |
| ------- | ---------------------------------------------------------- |
| `1~`    | pre-rarity slot layout                                     |
| `2~`    | community sequential player ids, `slot:rawId` equipment    |
| `3~`    | dataminer player ids, game equipment string ids (`eq_sh…`) |
| `4~`    | dataminer passive `string_id`s (no community passive_###)  |

Old links fail cleanly instead of decoding into a wrong squad. Append new
optional fields at the end of a slot when you can; bump when you must.

## Data provenance

**Primary:** datamined game files (build 6.00.23.00) under
[`data/raw/dataminer/`](data/raw/dataminer/README.md) — characters, Hero/Basara
tables, equipment, hissatsu, passives, synergies, tactics, UI icons.

**Portraits & gear icons:** scraped from the official
[Inazugle](https://zukan.inazuma.jp/en/) codex (`bun run data:player-images` /
`bun run data:images`), hotlinked from the Level-5 CDN via
[images.weserv.nl](https://images.weserv.nl) for resize. No community dump.

**Passives:** magnitudes and text from the dataminer. The structured
scope/stat/condition model the synergy engine needs is **not** in the dump yet
— effects ship empty until that is extracted from the game. Character → passive
is still open; passives are entered by hand in the UI.

Fan project, unaffiliated with Level-5.

## Checks

```bash
bun test          # synergy engine + share encoding
bun run typecheck
bun run lint
bun run build     # regenerates data, typechecks, then builds
```
