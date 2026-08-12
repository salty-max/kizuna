# Handoff — datamined bundles

State of the extraction as of 2026-08-11, for whoever picks this up next. The bundles are
committed and described in [README.md](README.md); this file covers what is *not* in the repo:
where the extraction lives, how to redo it, and what is still open.

## Since the first pass

The bundles gained `tactics`, `synergies` and `equipment`, synergies gained their `members`,
every character now carries the moves they learn and at what level, and
`legend.hissatsu_category` is now filled in. Sprite art landed too, in
[`../icons/`](../icons/README.md) — 151 files, 2 MB. Team emblems were left out: 346 files at
512×512 weighed 48 MB on their own, and nothing uses them yet. They are cut and named alongside
the extraction if that changes.

The icons README carries the one finding worth not rediscovering: **atlas cell order does not
encode the game id**, and the way to label an atlas is to pixel-match it against an already-named
set. Read it before touching `passives/` or the synergy icons.

## Nothing in this repo regenerates the bundles

`bun run data:fetch` refreshes the community scrape only. The bundles beside it were produced
outside this repo and copied in. To rebuild them you need the extraction workspace:

```
C:\Users\maxim\Downloads\
  extracted\                     game files, 193 MB, only the 2 archives that matter
  output\
    json\ievr.{en,fr,ja}.json    what was copied here
    ievr.sqlite                  14.1 MB, all 9 languages, indexed
  ievr_build\
    mingw\                       msvcrt MinGW-w64, needed to build
    ievr_dataminer\              patched clone of Telmo26/ievr_dataminer
```

```bash
export PATH="$HOME/.cargo/bin:/c/Users/maxim/Downloads/ievr_build/mingw/mingw64/bin:$PATH"
cd /c/Users/maxim/Downloads/ievr_build/ievr_dataminer
cargo build --release
cd /c/Users/maxim/Downloads && ./ievr_build/ievr_dataminer/target/release/ievr_dataminer.exe
./ievr_build/ievr_dataminer/target/release/merge_db.exe   output
./ievr_build/ievr_dataminer/target/release/export_json.exe output
```

Add a language by editing the `LANGUAGES` const in `src/bin/export_json.rs`. `de`, `es`, `it`,
`pt`, `zh_hans` and `zh_hant` all exist upstream and cost nothing but bundle size.

## The published dataminer cannot produce this

Release 1.1 is from 2026-02-06 and skill parsing landed on `main` ten days later, so the release
binary writes an empty `skills.sqlite` and no passives at all. On top of that:

- its extractor download URL 404s (the toolbox asset was renamed to `ievr_toolbox-cli-win64.exe`)
  and the status is unchecked, so it prints "download complete" then panics;
- it calls the toolbox with the pre-1.2 flat CLI, which no longer exists — the failure surfaces
  only as `entity not found`;
- `data\cpk_list.cfg.bin` does not decrypt on build 6.00.23.00, so the rules filter is dead. The
  cipher is fine — every `.cpk` decrypts to a clean `CPK ` magic. Workaround was to scan each
  archive's TOC for plaintext filenames; only two archives matter,
  `672c0647c5ff4adf150dc88695184817.cpk` (gamedata) and `ef8937b0b455c4978123aab7acccdf13.cpk`
  (text). 193 MB instead of 56.7 GB.

Patches applied on top of `main`, all in the local clone:

| Where | Why |
| --- | --- |
| `skills/hissatsu.rs` | `recastTime` moved to column 18 in this build; 19 is now a Byte, which panicked |
| `skills/passive.rs` (new) | passives moved out of `m_skillInfoList` into `passive_skill_config` |
| `text/text_database.rs` | `write_skill` never wrote `description`; channel widened to carry `(name_id, desc_id)` |
| `common.rs` | `parse_number_value` — T2B stores round numbers as `Integer`, so numeric columns mix Float/Int |
| `bin/` | `export_json`, `merge_db`, plus `dump_schema` / `show_table` / `find_ids` / `dbstat` for analysis |

**Column indices are build-specific.** A game patch will shift them again and the failure is a
panic in `parse_*_value`, swallowed by `let _ = thread.join()` in `main.rs` — so a silent empty
table is the symptom. Useful invariant when re-checking: every game id is the CRC32 of its string
id, verified on 1716/1716 passives (`ps10001` → 975948532).

## Character → hissatsu is closed

**How it resolves.** `chara_param` columns 11–28 hold `(skill id, level)` pairs:
six learn slots at levels 1/13/20/30/38/43, then a second branch of three at 30/38/43. The join is
`chara_param` col 1 → `chara_base` col 0 → `chara_base` col 2, which is the `id` the bundles use.
Which param row belongs to which bundle entry follows the split upstream already applies —
col 41 is the rarity: 0 with a full second branch is a character, 5–7 a hero, 8 a basara. All
55 000 skill references resolve; there are no unknown ids to tolerate.

## Open, in the order worth attacking

1. **Character → passive.** The gap the root README names, still open. Lead: `ability_learning_config`
   in `gamedata/skill`. `ABILITY_LEARNING_BOARD_EFFECT_LIST` has 23 790 rows whose first column is
   *sometimes* a passive id (`-2085093640` → `swap_team_passive_01`) and sometimes not;
   `ABILITY_LEARNING_TABLE_INFO_LIST` has 580 entries against 5418 characters, so any mapping is
   per group or archetype. Unverified — do not assume it resolves per character.
2. **`<VALUE>` for team passives.** Solved for the 1716 passives here, via the `REF_EFFECT` sub row
   that indexes into `PASSIVE_SKILL_EFFECT_LIST`. The 410 rarity-table ids that resolve to nothing
   were checked against all 60 247 `cfg.bin` files in the extraction and exist nowhere else — cut
   or unreleased, not a missing file.
3. **Position / style codes.** Still raw integers. No verified mapping was found, and none was
   invented. `hissatsu.category` *is* now resolved (see README) — the same approach, checking
   codes against entries whose type is not in doubt, should crack these two as well.
4. **Synergy icons.** 41 in `icon_synergy`, 37 synergies, no link in any data file: no `.g4tp`
   descriptor ships for the icon atlases, the menu Lua is compiled bytecode, and no config column
   predicts the cell (all 17 of `SPECIAL_TACTICS_INFO` were tested against 70 known tactic cells;
   best was 3/81). The realistic route is an in-game screenshot of the synergy list, then
   pixel-matching. The icons are cut and numbered outside the repo, in
   `C:\Users\maxim\Downloads\icons_raw\synergy\` with a `_synergies.csv` listing all 37 with their
   members.
5. **`passives/` icons are unlabelled**, for the same reason. 49 files, numbered by atlas cell.
6. **`map_text_roma`** exists but the dataminer does not extract it — the original-name toggle
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
