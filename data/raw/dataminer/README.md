# Dataminer dump

Extracted directly from the game — **build 6.00.23.00**, 2026-08-10 — with
[`Telmo26/ievr_dataminer`](https://github.com/Telmo26/ievr_dataminer), the route the root
README names for closing the passive gap. Vendored like the rest of `data/raw/`: never read at
runtime, and `build-data.ts` does not consume it yet.

This is a **different provenance** from the files beside it. Those come from the community
scrape of Inazugle; these come from the game's own `.cpk` archives. Where the two disagree, this
one is the game. `scripts/fetch-raw.ts` writes fixed filenames and will not touch this folder.

## Files

One self-contained bundle per language, joins already resolved.

| | Raw | gzip |
| --- | --- | --- |
| `ievr.en.json` | 4.77 MB | 0.71 MB |
| `ievr.fr.json` | 4.89 MB | 0.74 MB |
| `ievr.ja.json` | 7.53 MB | 1.23 MB |

Each holds 5418 characters, 147 heroes, 72 basaras, 852 hissatsu, 152 aura hissatsu, 443 auras,
1716 passives, 86 tactics, 37 synergies and 468 pieces of equipment. `de`, `es`, `it`, `pt`,
`zh_hans` and `zh_hant` are available from the same generator if wanted.

Icons for most of this live in [`../icons/`](../icons/README.md).

```jsonc
{
  "lang": "fr",
  "game_version": "6.00.23.00",
  "legend": { "element": { "1": "wind", "2": "forest", "3": "fire", "4": "mountain" } },
  "characters": [{
    "id", "name", "name_original", "description", "series",
    "element", "main_position", "alt_position", "style",
    "stats_lv50": { "kick", "control", "technique", "pressure", "physical", "agility", "intelligence" },
    "stats_lv99": { … },
    "skills":     [ [level, skillId], … ],   // six, learnt at 1 / 13 / 20 / 30 / 38 / 43
    "skills_alt": [ [level, skillId], … ]    // three, the second branch at 30 / 38 / 43
  }],
  "heroes": [ … ], "basaras": [ … ],
  "hissatsu": [{ "id", "name", "description", "power", "element", "category",
                 "growth_rate", "tp_consumption", "cooldown", "is_block", "is_longshot" }],
  "aura_hissatsu": [ … ],
  "auras": [{ "id", "name", "description", "skill_id", "element" }],
  "passives": [{ "id", "string_id", "name", "value", "category",
                 "tiers": [{ "family", "tier" }] }],
  "tactics": [{ "id", "string_id", "name", "description", "tp_cost" }],
  "synergies": [{ "id", "string_id", "name", "description",
                  "members": [ characterId ], "member_names": [ "…" ] }],
  "equipment": [{ "id", "string_id", "name", "description", "slot",
                  "stats": { "kick", … } }]
}
```

## What this does and does not close

It **adds** what the community dump has no equivalent for: passive magnitudes (`value`, the
number behind the `<VALUE>` placeholder in the text), passive rarity progressions (`tiers`),
technique descriptions, and the game's original-name field.

It **closes the character → hissatsu link**. `chara_param` columns 11–28 are `(skill id, level)`
pairs; all 5418 characters, 147 heroes and 72 basaras carry a full set, and every one of the ids
resolves against `hissatsu`, `aura_hissatsu` or `auras` — 0 unknowns out of 55 000 references.

It **does not** close the character → passive link. Nothing here says which passives a given
character can carry, so hand entry in the UI stays. The lead, if anyone picks it up: the Abilearn
board in `gamedata/skill/ability_learning_config`. `ABILITY_LEARNING_BOARD_EFFECT_LIST` holds
23 790 rows whose first column is sometimes a passive id from `passives` here
(`-2085093640` → `swap_team_passive_01`) and sometimes not, and
`ABILITY_LEARNING_TABLE_INFO_LIST` has 580 entries — far fewer than the 5418 characters, so any
mapping is per group or per archetype, not per character. Unverified.

## Reading the fields

- **`name` vs `name_original`** is the game's own "show original Japanese player names" toggle,
  and it applies to **players only** — the game offers no equivalent for techniques, so do not
  build one. In `en`/`fr` that is `Mark Evans` ↔ `Endo Mamoru`; in `ja` and Chinese the two are
  identical, because the native name already is the original.
- **Furigana.** Japanese text marks readings as `[漢字/かな]`. The markup is preserved in `name`,
  and a `name_plain` (likewise `description_plain`, `series_plain`) is added **only when markup
  is present** — 4128 of 5418 characters. Consumers need a `name_plain ?? name` fallback.
  To render ruby instead: `s.replace(/\[([^\/\]]+)\/([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>')`.
  Apply it to every language, not just `ja`: entry `-661571557` is an untranslated row that
  leaked into all nine locales, furigana included.
- **`main_position`, `alt_position` and `style` are raw game codes.** No verified label mapping
  exists, so none is invented here.
- **`hissatsu.category` is now documented** in `legend.hissatsu_category`: 1 shoot, 2 dribble,
  3 block, 4 catch. Checked against moves whose type is not in doubt — Fire Tornado is 1, Killer
  Slide and The Tower are 3, Mugen The Hand is 4. Catch is goalkeeper-only.
- **Synergy `members` are character ids**, joinable against `characters[].id`. They come from
  `SYNERGY_FLAG_EXEC_COND`, whose target is a `chara_base` row id; the bundles expose that row's
  column 2, so the join is direct. `member_names` is the same list resolved in the bundle's own
  language, for display and sanity-checking.
- **Tactics carry `_st` variants.** 86 rows for 70 distinct tactics: ids like `wht20010_st0301`
  are situational reskins sharing the base's name and description. Group on the id up to `_st`
  if you want one row per tactic. One row is a `test_` placeholder.
- **`skills` mixes three kinds.** A slot's id may be a `hissatsu`, an `aura_hissatsu` or an
  `auras` entry — Mark Evans starts on Strong Punch, an aura hissatsu, and ends on Keeper's Grit,
  an aura. Ids do not collide across the three arrays, so resolving is a single lookup, but a
  consumer that only searches `hissatsu` will silently lose roughly one slot in six.
- **`skills_alt` is the second branch**, not extra slots: the same levels 30/38/43 as the tail of
  `skills`, with different moves. Every character has one; heroes mostly do not.
- **Heroes repeat their `id`.** 147 hero entries cover 73 characters, one per rarity tier, and the
  tiers differ in stats only — the skill sets were checked and are identical across all 73. So
  grouping heroes by `id` is safe for skills and wrong for stats.
- **Some `description` fields are permanently null**, and it is not a gap in the extraction. All
  37 synergies and 418 of the 468 equipment pieces carry `description_id = 0` in the game's own
  item config — there is no text to fetch. `item_text` holds 545 descriptions in total against
  2265 names, which is the whole budget. Tactics and techniques are complete, 86/86 and 852/852.
  For synergies the in-game panel is assembled from structured data instead: the member list,
  which the bundles now carry, and an effect id with a magnitude. Those 29 effect ids appear in
  none of the 4068 text files, so there is no label for them either — do not go looking.
- **`value` is an f32**, hence `0.699999988079071`. Round at display time.
- **Passive `value` is present on 1700 of 1716.** The 16 without carry no effect at all.
- **22 passives have no name** in any language — 7 name ids have no text entry upstream.
- **`tiers` may be empty or hold several entries**; 292 passives belong to more than one rarity
  family. 410 ids referenced by the rarity table exist nowhere in the game files — cut or
  unreleased content — so they are absent from `passives` and any join must tolerate misses.

## Reproducing

The published dataminer release (1.1) **cannot produce this**: skill parsing landed after it was
cut, its extractor download URL is stale, and it calls the toolbox with a CLI that no longer
exists. Passive extraction, skill descriptions and the build-6.00.23.00 column shifts were
patched locally on top of `main`. See the toolchain notes kept alongside the extraction, not this
repo.
