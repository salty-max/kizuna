# Dataminer dump

Extracted directly from the latest public client (7.1.2) on 2026-08-10. The dump’s
internal content marker is **6.00.23.00**; it is not the public client version. Extracted with
[`Telmo26/ievr_dataminer`](https://github.com/Telmo26/ievr_dataminer). Vendored like the rest of
`data/raw/`: never read at runtime. `scripts/build-data.ts` consumes these bundles as the
**only** character/passive/equipment source (display language: `fr`; English used to join
Inazugle portraits by name).

## Files

One self-contained bundle per language, joins already resolved.

| | Raw | gzip |
| --- | --- | --- |
| `ievr.en.json` | 4.79 MB | 0.72 MB |
| `ievr.fr.json` | 4.91 MB | 0.74 MB |
| `ievr.ja.json` | 7.55 MB | 1.24 MB |

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
    "id", "name", "name_original", "nickname", "surname", "given_name",
    "description", "series", "gender",
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
  "auras": [{ "id", "string_id", "name", "description", "skill_id", "element", "type" }],
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

There is **no character → passive link to close**, and that is a finding rather than a gap. A
player's passives are not authored per player: `ability_learning_config` rolls them from a
lottery, nested `INFO(6) → MAIN(24) → SUB(72) → GROWTH(144) → STYLE(432) → SKILL`, keyed on
attributes the character already has. The leaf list holds 1710 entries for **40 distinct
passives** — the same id repeated to weight the draw. Across every pool in that config, front,
back, their lottery variants and the supporter set, only **161 of the 1716 passives** appear at
all; the rest are the custom ones farmed from Hero-tier matches and assigned by hand in game.

So a build tool can offer the candidate pool for a given style and growth pattern, but nothing
can tell you a specific player's passives, because the game does not know either until the copy
is rolled.

## Reading the fields

- **`name` vs `name_original`** is the game's own "show original Japanese player names" toggle,
  and it applies to **players only** — the game offers no equivalent for techniques, so do not
  build one. In `en`/`fr` that is `Mark Evans` ↔ `Endo Mamoru`; in `ja` and Chinese the two are
  identical, because the native name already is the original.
- **`nickname` is the short name the game prints on the pitch**, and it is not always the family
  name. `chara_base` column 4 points at a name entry of its own: Mark Evans gets `Evans`, but
  Byron Love gets **`Aphrody`** and Ray Mannings `Jiangshi` — `Macchabée` in French, so it is
  properly localised, not a romanisation. 5417 of 5418 characters have one. Column 5 holds the
  same string uppercased for the shirt, which is why it is not exported.
- **`surname` and `given_name` are the game's own split**, localised like the full name.
  `chara_text` keys every name by `(id, sub-index)`: 0 is the full name, 11 the family name,
  12 the given name. Only 515 characters and 151 heroes/basaras carry the split — the main cast —
  so the field is absent on the rest rather than guessed by splitting on a space, which would be
  wrong for `G'ob` and every mononym. This is the field the Inazugle scrape called `Nickname`.
- **Furigana.** Japanese text marks readings as `[漢字/かな]`. The markup is preserved in `name`,
  and a `name_plain` (likewise `description_plain`, `series_plain`, `nickname_plain`,
  `surname_plain`, `given_name_plain`) is added **only when markup is present** — 4128 of 5418
  characters. Consumers need a `name_plain ?? name` fallback.
  To render ruby instead: `s.replace(/\[([^\/\]]+)\/([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>')`.
  Apply it to every language, not just `ja`: entry `-661571557` is an untranslated row that
  leaked into all nine locales, furigana included.
- **`main_position`, `alt_position` and `style` are now decoded** in `legend.position` and
  `legend.style`, by joining this roster against the Inazugle scrape beside it on player name.
  Position lands at 99.2–99.7% agreement per code (1 GK, 2 FW, 3 MF, 4 DF); style at 83–85%
  (0 breach, 1 counter, 2 bond, 3 tension, 4 rough_play, 5 justice). The looser style figure is
  homonym noise — 5418 characters share only 5153 distinct names, so a name join lands on the
  wrong variant sometimes — not competing labels: each code has one dominant label and the six
  are disjoint. The same join reproduces the already-known `element` mapping at 99.5%, which is
  what makes the other two trustworthy.
- **`spirit_drop` says the game's drop tables hand you this character's spirit**: 396 of the 5418
  characters, 92 of 147 heroes, 46 of 72 basaras. It is the union of `m_spiritTableDataList` in
  `soccer_drop_config` with the fixed-reward and victory-box tables. It is **not** the same as
  "recruitable" — press coverage says the whole 5400 roster can be recruited, spirits being won
  in matches *or* summoned with Bond Stars, and no table for that second route exists in the
  files, so it is probably not gated by a list. Read the flag as "drops from a match", which is
  what it literally is. Worth knowing: the Terracotta Warriors are absent from it.
- **`gender` is `"male"`, `"female"` or `"other"`**, resolved rather than left as a code, from
  `chara_base` column 11. Every character, hero and basara has one — 4369 male, 1009 female and
  40 other among the characters. `other` is the game's own third value, used for things like the
  Terracotta Warriors; the unset value only appears on props, mannequins and event assets, none
  of which reach the bundles.
- **`hissatsu.category` is now documented** in `legend.hissatsu_category`: 1 shoot, 2 dribble,
  3 block, 4 catch. Checked against moves whose type is not in doubt — Fire Tornado is 1, Killer
  Slide and The Tower are 3, Mugen The Hand is 4. Catch is goalkeeper-only.
- **`auras.type` splits the 443 auras across the game's mechanics**, and it is what makes them
  usable: 189 `armed`, 103 `keshin`, 69 `mixi_max`, 56 `totem`, 12 `mode_change`,
  10 `awakening_power`, 3 `bond_transform`, 1 `awakening_change`. The names are not guessed — the
  string id prefixes separate them cleanly (`wkd`/`wkk`/`wko`/`wks` keshin, `wad`/`wak`/`wao`/`was`
  armed, `wmm` mixi max, `wsd`/`wsk`/`wso`/`wss` totem, `wkt` and `kizuna_trans`, `wap`,
  `mode_change_*`, `awakening_change`), and the game ships a localised banner per mechanic that
  names them: "Armourfy!", キズナトランス, ミキシマックス, 覚醒パワー.
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
