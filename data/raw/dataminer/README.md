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
| `ievr.en.json` | 3.27 MB | 0.49 MB |
| `ievr.fr.json` | 3.36 MB | 0.51 MB |
| `ievr.ja.json` | 5.77 MB | 0.96 MB |

Each holds 5418 characters, 147 heroes, 72 basaras, 852 hissatsu, 152 aura hissatsu, 443 auras
and 1716 passives. `de`, `es`, `it`, `pt`, `zh_hans` and `zh_hant` are available from the same
generator if wanted.

```jsonc
{
  "lang": "fr",
  "game_version": "6.00.23.00",
  "legend": { "element": { "1": "wind", "2": "forest", "3": "fire", "4": "mountain" } },
  "characters": [{
    "id", "name", "name_original", "description", "series",
    "element", "main_position", "alt_position", "style",
    "stats_lv50": { "kick", "control", "technique", "pressure", "physical", "agility", "intelligence" },
    "stats_lv99": { … }
  }],
  "heroes": [ … ], "basaras": [ … ],
  "hissatsu": [{ "id", "name", "description", "power", "element", "category",
                 "growth_rate", "tp_consumption", "cooldown", "is_block", "is_longshot" }],
  "aura_hissatsu": [ … ],
  "auras": [{ "id", "name", "description", "skill_id", "element" }],
  "passives": [{ "id", "string_id", "name", "value", "category",
                 "tiers": [{ "family", "tier" }] }]
}
```

## What this does and does not close

It **adds** what the community dump has no equivalent for: passive magnitudes (`value`, the
number behind the `<VALUE>` placeholder in the text), passive rarity progressions (`tiers`),
technique descriptions, and the game's original-name field.

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
- **`main_position`, `alt_position`, `style` and `category` are raw game codes.** No verified
  label mapping exists, so none is invented here. Only `element` is documented, from the
  dataminer's own enum.
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
