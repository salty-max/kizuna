# Handoff — datamined bundles

State of the extraction as of 2026-08-10, for whoever picks this up next. The bundles are
committed and described in [README.md](README.md); this file covers what is *not* in the repo:
where the extraction lives, how to redo it, and what is still open.

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
3. **Position / style / archetype codes.** Still raw integers. No verified mapping was found, and
   none was invented. Would need cross-referencing against the UI text files.
4. **`map_text_roma`** exists but the dataminer does not extract it — the original-name toggle
   covers place names too, if the wiki ever needs them.

## Wiring it into the app

`build-data.ts` does not read these bundles. Nothing in the app changes until it does. Two things
to decide first: whether the datamined stat lines replace or sit beside the community
`players.json` (ids differ — these are the game's CRC32 hashes, not the dump's sequential ids),
and whether `build-data.ts`'s abort-on-unknown rule should extend to this source too. Given that
rule exists to stop the engine going quietly wrong, it probably should.
