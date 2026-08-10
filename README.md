# Kizuna

Team builder for **Inazuma Eleven: Victory Road**. Build a squad, kit it out, declare
each character's passives, and see what the combination actually does to your
numbers — with every percentage traceable back to the passive that produced it.

```bash
bun install
bun run data   # regenerate public/data/ from data/raw/
bun run dev
```

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
    { "scope": "alliesSameElement", "stat": "shotAT",
      "mode": "percent", "direction": "increase", "conditions": [] }
  ]
}
```

11 scopes, 20 stats, 24 typed conditions. That is enough to resolve a passive
against an actual squad rather than just print its description.

The key thing to understand: **passives do not modify the seven base stats.**
They modify the derived *power* stats, which are what resolve duels:

| Power stat | Formula |
| --- | --- |
| `shootAT` | Kick + Control |
| `focusAT` | Technique + Control + Kick×0.5 |
| `focusDF` | Technique + Intelligence + Agility×0.5 |
| `wallDF` | Pressure + Physical |
| `scrambleAT` | Intelligence + Physical |
| `scrambleDF` | Intelligence + Pressure |
| `kp` | Pressure×2 + Physical×3 + Agility×4 |

Equipment goes the other way: it raises base stats, and power is derived after.

## Levels and rarity

The dataset holds **one stat line per character and no level or rarity field**.
Totals cluster hard — 4617 of 4840 characters sit between 600 and 649, with
617/619/620 alone covering half the roster — so that line is a *Common-rarity
reference*, not what any particular player has on the pitch.

In game, a displayed stat is that reference put through, in order: rarity,
level (1–99), the Abilearn board from level 15, training beans, and equipment.

Kizuna models **rarity and equipment**, because both have usable numbers:

| Rarity | Common | Rising | Advanced | Top | Legendary | Hero | Basara |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Multiplier | 1.0 | 1.1 | 1.2 | 1.3 | 1.4 | 1.67 | 1.67 **+5/stat** |

The first six are the community's *measured* values. Several guides instead
state "+20% of Common per rank", which would give 1.2/1.4/1.6/1.8 — the two
disagree and measured wins, but the claim is out there.

**Basara is an estimate and the UI says so.** No tested multiplier exists; what
is reported is that a Basara lands 30–40 total points above the Hero version of
the same character, so it is modelled as Hero plus a flat +5 per stat (7 × 5 =
+35). Revise `RARITY_SCALES` when better figures turn up.

Hero is approximate too — the real formula reportedly reshuffles the stat spread
toward the character's position rather than scaling flat.

Order matters and is tested: rarity multiplies the character, then equipment is
added flat on top. `100 × 1.4 + 10 = 150`, never `(100 + 10) × 1.4 = 154`.

### Hero variants

Hero is not one tier but three, and the colour follows the build archetype:

| Variant | Archetypes |
| --- | --- |
| Hero red | Tension, Rough Play |
| Hero silver | Justice, Bond |
| Hero pink | Breach, Counter |

So the variant is *derived* from the archetype rather than asked for, which
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

| | |
| --- | --- |
| 4-4-2 Diamond · 4-4-2 Box | 3-5-2 Freedom |
| 4-3-3 Triangle · 4-3-3 Delta | 4-5-1 Balanced |
| 3-6-1 Hexa | 5-4-1 Double Volante |

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
  inset by half a card, so `x = 0` puts a card's *edge* on the boundary rather
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

The direction is the *hissatsu cut-in* — the special-move screen — with one
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

## What the data cannot tell you

`players.json` has **no link to hissatsu or to passives**. `abilities.json` is a
standalone catalogue of 427 techniques with no player association, and no source
lists which passive a given character carries. So passives are entered by hand,
six slots per player (five presets + one custom), and the value is yours to set
— `strongValue`/`weakValue` are only the game's bounds, since the real number
depends on the passive's level.

Closing that gap means extracting from the game yourself with
[`Telmo26/ievr_dataminer`](https://github.com/Telmo26/ievr_dataminer).

## Layout

```
data/raw/            vendored upstream dump — never read at runtime
scripts/
  fetch-raw.ts             refresh data/raw/ from upstream (manual, then diff)
  fetch-equipment-images.ts  scrape item icons from Inazugle (manual)
  build-data.ts            raw → public/data/, with hard validation
public/data/         what the app fetches: index + 22 lazy detail buckets
src/domain/          stats, types, formations, team model, synergy engine
src/lib/             share encoding, localStorage, UI helpers
src/components/      pitch, picker, slot editor, synergy panel
```

`build-data.ts` **aborts** on any value it does not recognise — a new element or
passive scope from upstream must fail the build, not get silently dropped and
leave the engine quietly wrong. It also strips the ~560 placeholder rows
(`Name: "???"`) that would otherwise pollute every filter, leaving 4840
characters.

## Persistence

Teams are encoded into the URL hash by [share.ts](src/lib/share.ts) — a filled
4-4-2 with equipment and passives fits in ~400 characters. localStorage stores
the same encoding, so the saved format and the link format cannot drift apart.
The `2~` version prefix is load-bearing: bump it when the layout changes so old
links fail cleanly instead of decoding into a wrong squad. It has already earned
its keep — adding rarity shifted every slot field by one, and a v1 link decoded
under v2 rules would have silently mis-assigned all the equipment.

The archetype override that came later needed *no* bump, because it was appended
to the end of the slot's fields rather than inserted: older payloads still
decode correctly and simply inherit the dataset's archetype. Append when you
can, bump when you must.

## Data provenance

Character data comes from the community dump
[`lluni/inazuma-eleven-vr-wiki`](https://github.com/lluni/inazuma-eleven-vr-wiki),
which itself scrapes the official [Inazugle](https://zukan.inazuma.jp/en/)
database. **That repo carries no license**, so none of its code is reused here —
this is an independent implementation. The game formulas above are gameplay
facts, not authored work.

Portraits are hotlinked from the dataset's CDN through
[images.weserv.nl](https://images.weserv.nl) for resizing (37 KB PNG → ~4 KB
WebP, which matters across 4840 thumbnails). If this ever becomes more than a
personal project, rehost them.

**Element icons do not exist to fetch.** Inazugle renders the four elements as
plain text — they are checkbox labels in its filter and nothing more — with no
artwork in its markup, its CSS, or its character sheets, and the dump has none
either.

So elements are shown as their kanji: **風林火山**, Fūrinkazan, the way the games
write them. Drawn SVG glyphs were the first attempt and lost — a single dense
character stays legible in a 17px badge where a line drawing turns to mush, it
needs no artwork, and it is what the source material actually uses. The only
cost is a CJK font stack (`.kanji` in [styles.css](src/styles.css)), since the
Latin UI stack has no glyphs for them.

**Equipment icons** are not in the dump at all — the upstream wiki renders gear
without art. `bun run data:images` scrapes them from Inazugle's `item/equip`
pages, where each item's name sits in the `alt` attribute. Name is the only
join key the two sources share, matched case- and punctuation-insensitively,
which lands **246 of 281 items**. The rest are naming drift between the sources
("Little Gigants" in the dump vs "Little Giants" on the codex) and fall back to
a slot glyph. The scraper paces itself at one page per 700 ms — it is someone
else's server and the whole job is a few dozen requests.

Fan project, unaffiliated with Level-5.

## Checks

```bash
bun test          # synergy engine + share encoding
bun run typecheck
bun run lint
bun run build     # regenerates data, typechecks, then builds
```
