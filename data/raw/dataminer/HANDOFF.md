# Handoff — datamined bundles

State of the extraction as of 2026-08-17, for whoever picks this up next. The bundles are
committed and described in [README.md](README.md); this file covers what is *not* in the repo:
where the extraction lives now, what the data does and does not contain, and what is still open.

## Since the first pass

The bundles gained `tactics`, `synergies` and `equipment`, synergies gained their `members`,
every character now carries the moves they learn and at what level, and
`legend.hissatsu_category` is now filled in. Sprite art landed too, in
[`../icons/`](../icons/README.md) — 151 files, 2 MB. Team emblems were left out: 346 files at
512×512 weighed 48 MB on their own, and nothing uses them yet. They are cut and named alongside
the extraction if that changes.

The icons README carries the two findings worth not rediscovering: **a `.g4tx` carries its own
sprite-rectangle table**, so atlases should be cut from that rather than sliced on a guessed grid;
and **neither the grid index nor the sprite index encodes the game id**, so labelling an atlas
still means matching it against names obtained elsewhere. Read it before touching the synergy
icons.

## Regenerating the bundles

**The extraction lives in its own repo: [salty-max/ievr-extract](https://github.com/salty-max/ievr-extract).**
It used to sit in `tools/dataminer/` here; it was moved out because it is a pipeline over a game
install, not part of the app, and it has to survive a game patch on its own terms.

```powershell
.\run.ps1              # unpack, mine, enrich, verify -> out\ievr.{en,fr,ja}.json
.\run.ps1 -Stage clean # gives back ~1 GB of intermediates
```

Copy `out\*.json` over this directory and rebuild. That repo's README carries everything that used
to be in this section: the patch against `Telmo26/ievr_dataminer`, why the published release cannot
produce these bundles, the name-placeholder system, and — the part that matters after a game
update — that **column indices are pinned to build 6.00.23.00**, that a shifted one shows up as a
*silently empty table* because `main.rs` joins its threads with `let _ = handle.join()`, and that
the fastest way to find it again is the invariant that **every game id is the CRC32 of its string
id** (`ps10001` → 975948532, 1716/1716).

Adding a language costs nothing but bundle size: the `LANGUAGES` const in
`src/bin/export_json.rs`. `de`, `es`, `it`, `pt`, `zh_hans` and `zh_hant` all exist upstream.

## Character → hissatsu is closed

**How it resolves.** `chara_param` columns 11–28 hold `(skill id, level)` pairs:
six learn slots at levels 1/13/20/30/38/43, then a second branch of three at 30/38/43. The join is
`chara_param` col 1 → `chara_base` col 0 → `chara_base` col 2, which is the `id` the bundles use.
Which param row belongs to which bundle entry follows the split upstream already applies —
col 41 is the rarity: 0 with a full second branch is a character, 5–7 a hero, 8 a basara. All
55 000 skill references resolve; there are no unknown ids to tolerate.

## Character → passive is a dead end, and that is the answer

Not "unverified" any more. `ability_learning_config` rolls a player's passives from a nested
lottery — `INFO(6) → MAIN(24) → SUB(72) → GROWTH(144) → STYLE(432) → SKILL` — keyed on attributes
the character already carries, not on identity. The leaf list is 1710 entries for 40 distinct
passives, the repetition being the draw weights. Counting every pool in that config (front, back,
both lottery variants, supporter) gives 161 distinct passives out of 1716; all 161 resolve. The
remainder are the custom passives the player farms from Hero-tier matches and slots by hand.

Confirmed against how the game presents it: each player ships with five passives that scale with
rarity, plus a custom slot unlocked at level 50. So the most a tool can offer is the candidate
pool for a style and growth pattern. Stop looking for a per-character table.

## Open, in the order worth attacking

1. **`<VALUE>` for team passives.** Solved for the 1716 passives here, via the `REF_EFFECT` sub row
   that indexes into `PASSIVE_SKILL_EFFECT_LIST`. The 410 rarity-table ids that resolve to nothing
   were checked against all 60 247 `cfg.bin` files in the extraction and exist nowhere else — cut
   or unreleased, not a missing file.
2. **Passive icon id → picture.** The link *to* an icon is closed: every passive now carries
   `icon`, `icon_label` and `build`, taken from its effect in `soccer/passive_skill_effect_config`
   (1630/1716). What is left is which of the 53 `icon_teambuff` sprites each of the 25 ids is.
   Eight are certain from the pictogram alone; the rest are graded in
   [`../icons/passives/_passive_icons.csv`](../icons/passives/_passive_icons.csv). Do not expect
   to find it in the data — the ids are not sprite indices and the lookup is in the menu code.
3. **Synergy icons.** 41 in `icon_synergy`, 37 synergies, no link in any data file: the menu Lua
   is compiled bytecode and no config column predicts the sprite (all 17 of
   `SPECIAL_TACTICS_INFO` were tested against 70 known tactic cells; best was 3/81). The
   realistic route is an in-game screenshot of the synergy list, then pixel-matching. The icons
   are cut and numbered outside the repo, in `C:\Users\maxim\Downloads\icons_raw\synergy\` with a
   `_synergies.csv` listing all 37 with their members.
4. **`map_text_roma`** exists but the dataminer does not extract it — the original-name toggle
   covers place names too, if the wiki ever needs them.

## Wiring it into the app

**Done (2026-08-11, community dropped).** `scripts/build-data.ts` reads only these
bundles + Inazugle scrapes:

- Characters / Hero / Basara → `public/data/players.json` (game ids; share encoding v4)
- Equipment → `public/data/equipment.json` (game `string_id`)
- Passives → `public/data/passives.json` (text + value; **effects empty** until extracted)
- Hissatsu → `public/data/abilities.json`
- Synergies / tactics shipped for later UI
- Portraits from `player-images.json` (Inazugle scrape), not community
- Icons copied to `public/icons/`
- Position 1=GK, 2=FW, 3=MF, 4=DF; style 0–5 → breach/counter/bond/tension/roughPlay/justice

Still open: character → passive, passive effect structure from the game, synergy icon labels.
