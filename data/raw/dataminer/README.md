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
| `ievr.en.json` | 5.43 MB | 0.79 MB |
| `ievr.fr.json` | 5.55 MB | 0.82 MB |
| `ievr.ja.json` | 8.37 MB | 1.35 MB |

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
                 "icon", "icon_label", "build", "droppable", "drop_pools",
                 "tiers": [{ "family", "tier" }] }],
  "passive_drop_pools": [ [ passiveId, … ] ],      // 129 pools of 5, one per opponent
  "tactics": [{ "id", "string_id", "name", "description", "tp_cost" }],
  "synergies": [{ "id", "string_id", "name", "description", "order", "listed",
                  "members": [ characterId ], "member_names": [ "…" ] }],
  "currencies": [{ "id", "string_id", "name" }],   // what shop prices are quoted in
  // hissatsu, aura_hissatsu, auras, equipment and synergies also carry:
  //   "shops": [{ "shop", "price": [{ "currency", "currency_id", "amount" }],
  //                       "spirits": [{ "character", "count" }] }]
  "equipment": [{ "id", "string_id", "name", "description", "slot",
                  "stats": { "kick", … } }],
  "locations": [{ "string_id", "name", "kind" }]   // targets of characters[].found_in
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

The other half of that story is now in the data too: **the custom passive is farmed from matches,
and `character/team_passive_lot_table_config` says which ones can drop.** 132 pools, 653 rows,
114 distinct passives — all base ids, never the `_NN` rarity variants, which fits, since the match
drops the passive and its tier follows the match's rarity. Three of the pools are samples (the
only ones carrying real weights and rarity gates); the 129 that remain are flat, five passives
each at weight 1, and between them they cover **109 of the 1716 passives**. Those carry
`droppable: true` and `drop_pools`, the number of pools they appear in — the closest thing to how
easy one is to farm, from 1 up to 26.

What is *not* in the data is which opponent uses which pool. The 132 pool ids appear in exactly
one file in the whole extraction, their own — checked as raw `u32` across all 5863 configs — and
no string anywhere in gamedata hashes to any of them. `passive_drop_pools` therefore ships the
129 pools unlabelled, which still answers "what else drops alongside this one".

It also **closes passive → icon**, which had looked like it was not in the files at all. A
passive's icon comes from its effect, not from the passive row: 1630 of 1716 resolve, and
`icon_label` names what the icon stands for — `castle_wall_df`, `shot_at`, `drop_rate_rare` and
22 others, listed in `legend.passive_icon`. Nothing here is inferred: every passive sharing an
icon id names the same stat in its own text, all 144 under id 11 saying "Castle Wall DF". The
same source gives `build`, which of the six team builds a passive belongs to, in the same order
as `legend.style`. What is *not* resolved is which drawing each id is; see
[`../icons/README.md`](../icons/README.md).

## Reading the fields

- **Name placeholders are resolved at export**, so no `<FUL:ENDO>` survives into the bundles —
  the count is 0 in all three. The game fills them at runtime and only Japanese and the two
  Chinese locales ship the literal text, which is why fr/en used to read "La forteresse de !".
  Two config tables do it, both keyed by the **CRC32 of the ASCII key**:
  `gamedata/character/chara_name_tag_*` → `m_charaNameTagConfigList` for the nine character
  prefixes, and `gamedata/map/map_name_tag_*` → `m_mapNameTagConfigList` for `MNT`, which is
  literally *map name tag* and covers clubs and places. The prefix picks a `chara_text` sub
  entry: `FUL`/`FFC`/`LFC` the full name, `LST`/`FLC`/`FLA` the family name, `FST`/`FFS`/`LAF`
  the given name. That grouping was measured against Japanese **and** Simplified Chinese over
  ~700 placeholders, not assumed; within a group the prefixes differ only in Japanese ruby
  typography, which no other locale renders. A key that does not resolve aborts the run with
  the key and the line — see `src/text/name_tags.rs`.
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
- **`found_in` says where a character's spirit can be had**, as string ids into the top-level
  `locations` array, which carries the localised name and a `kind`. **4889 of the 5418
  characters** have at least one, across 70 locations, 69 of them named.
  - `kind: "match"` — 40 Chronicle battles, from `SOCCER_GAME_INFO` → `REF_DIFFICULTY` →
    `SOCCER_GAME_DIFFICULTY` column 29 (44 on a few rows) → `m_spiritCharaTableList` →
    `m_spiritTableDataList` → a **`chara_base`** row.
  - `kind: "universe"` — the 30 Player Universe star signs, from `m_starSignInfoList` →
    `m_starSignCharaSetDataList` → `m_starSignRarityRateInfoList` → `m_starSignCharaInfoList`,
    whose ids are **`chara_param`** rows, not `chara_base` ones. That difference is the whole
    trick; joining them the same way silently yields nothing.

  Checked against the Inazugle scrape, which listed acquisition in prose: Mark Evans came out as
  Handora, Diamantis and Instructus Notara, and the Terracotta Warriors as Genii — the same names,
  from a source that was never consulted while building the join.

  This supersedes `spirit_drop` as the answer to "can I get this player": that flag only ever
  covered the match tables, which is why it read 396.
- **There is no equivalent for techniques or tactics**, and it is not for want of looking. The
  item side of the match drop config, `m_itemDropDataList`, holds only `(rarity, rate)` pairs — it
  never names an item — and the 113 entries in `win_treasure_lot_table_config` resolve to neither
  `tactics` nor `equipment`. Nothing in the files says which match yields a given move or tactic.
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
- **Shop prices are on the thing being sold, in `shops`.** An entry can be sold in several shops,
  so it is a list of offers; each offer has either a `price` in currencies or, at the two trade
  counters (`market_05`, `market_06`), `spirits` — copies of a character handed over instead.
  Coverage: hissatsu 751/852, equipment 458/468, synergies 35/37 (the 35 listed ones), auras
  178/443, aura hissatsu 19/152. **Tactics and passives are sold nowhere**, which fits: passives
  are rolled, never bought. 19 of the 366 spirit lines ask for an NPC and carry `character: null`,
  because NPCs have no id in these bundles.
- **Shop names are the texture stem** — `market_01`, `story_06` — because the shops' name ids
  resolve in no text file that ships. One shop has no texture either and comes out `unnamed_01`.
- **Two of the 37 synergies are not in the game's list**, `sf01000010` (Snow Prince) and
  `sf01000020` (Temporal Sentinel). They carry `listed: false` and `order: null`; the other 35
  are ranked 1–35, the sp\* family then the sf\*. The test is the game's own: `item_config`
  column 4 holds 7601–7635 for the listed ones, in exactly that order, and 0 for these two. They
  are leftovers from the launch id scheme — the long form the first characters use
  (`c01000010`) — and they are exactly the two with no icon in any of the game's 43 atlases.
  **Filter on `listed` before rendering a synergy list.**
- **Passive `icon` is present on 1630 of 1716**, and `build` on 816. The same 16 effectless
  passives account for part of the gap; the other 70 have an effect the game gives no icon.
  `buff_icon` is a *different* field kept from upstream — a per-passive override used by 108 rows
  that does not track the stat. Read `icon`, not `buff_icon`.
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
