# Icons

PNG with alpha, extracted from the game's own `.g4tx` sprite atlases (build 6.00.23.00) and cut
out of them. Same provenance as `../dataminer/` — the game files, not the community scrape.

Vendored like the rest of `data/raw/`: **not served as-is**. `bun run data` copies every
folder into `public/icons/` (200 PNGs). The app consumes them via `src/lib/icons.ts` and
`src/components/GameIcon.tsx` — elements, positions, styles, staff, hissatsu categories,
plus path helpers for tactics, synergies and passive sprites.

## What is here

| Folder | Count | Named by | Joins to |
| --- | --- | --- | --- |
| `elements/` | 4 | element name | `legend.element` in the bundles |
| `styles/` | 6 | style name | `legend.style` |
| `hissatsu/` | 4 | category name | `legend.hissatsu_category` |
| `positions/` | 18 | position name | `legend.position` |
| `tactics/` | 71 | `wht*` string id, **from the atlas itself** | `tactics[].string_id` |
| `synergy/` | 35 | `sf*`/`sp*` string id, **from the atlas itself** | `synergies[].string_id` |
| `aura/` | 7 | aura type | `auras[].type` — **proposed, see below** |
| `gender/` | 2 | male / female | `characters[].gender` |
| `passives/` | 53 | the game's own sprite name | `passives[].icon` — **via `_passive_icons.csv`, see below** |

Team emblems are deliberately absent: 346 files at 512×512 came to 48 MB, against 2 MB for
everything above. They are cut and named by `em*` string id outside the repo, in
`C:\Users\maxim\Downloads\to_be_shared (do not delete)\emblems\`, and can be brought in — probably
downscaled — whenever the app has a use for them.

## Naming that needs reading twice

- **Positions come in two sets.** `icon_position_{fwd,mid,def,gk}.{en,fr,ja}.png` are the coloured
  text badges — the atlas they come from is localised, hence one file per language (`FW`/`ATT`,
  `MF`/`MIL`, `DF`/`DÉF`, `GK`/`GAR`). The `*_silhouette.png` files are the older plain-white
  pictograms, kept as an alternative. `coach` and `manager` are staff, not pitch positions.
- **`aura/` names are inferred, not read from the data.** The eight aura types are certain — they
  come from the string id prefixes, `wk*` keshin, `wa*` armed, `wmm*` mixi max, `ws*` totem,
  `wkt*` bond transform, `wap*` awakening power, `mode_change_*`, `awakening_change`. Which badge
  belongs to which is not in any file, so the filenames are a best reading, graded in
  `_aura_types.csv`. Three are well supported: the split face is mixi max (two players fused),
  and armed/keshin are the same creature armoured-in-a-diamond versus plain-in-a-square, with the
  purple matching the game's own "Armourfy!" banner. Green for bond transform and red for
  awakening power match their banners too. Totem and mode change are guesses. `awakening_change`
  has one aura and no badge left over.
- **`passives/` is half-mapped now.** See [Passive icons](#passive-icons): the bundles say which
  icon each passive uses and what that icon means, but not yet which of these pictures it is.
- **`synergy/` covers 35 of the 37 synergies.** `sf01000010` and `sf01000020` have no sprite in
  `icon_synergy` under any name.

## Passive icons

`passives/` is the `icon_teambuff` atlas: 45 pictograms plus the eight small position badges
(`MF` `DF` `GK` … `FW`) the game splices into passive text like "[GK] KP +N%". The files carry
**the names the game gives them**, read out of the atlas header — `icon_teambuff01` … `38`, `40`,
`51`–`56`, and `icon_teambuff_tgt01` … `08` for the badges.

Every passive in the bundles now carries `icon` (the game's icon id), `icon_label` (what that id
means) and `build` (which of the six team builds it belongs to). `legend.passive_icon` lists all
25 ids. That mapping is read from the game: a passive's icon comes from its effect, and every
passive sharing an id names the same stat — all 144 under id 11 say "Castle Wall DF".

The one hop still missing is **icon id → which of these 53 pictures**. There are 38 names for the
38 possible ids, which looks like the answer and is not: id 2 is "Shot AT" and `icon_teambuff02`
is the shooting comet, but id 0 is "AT" while the `AT` lettering is `icon_teambuff19`. No offset
fits, and no table in the extraction holds the values in either direction.
[`passives/_passive_icons.csv`](passives/_passive_icons.csv) grades what could be identified by
eye: eight are certain because the pictogram is unambiguous or is literally the text — `AT`,
`DF`, `T`, the intact and the breached castle wall, the two money bags, the shooting comet.

## Atlases label themselves

This is the thing to know, and it was found late: **every `.g4tx` names its own sprites.** The
header holds, in parallel, a table of sub-rectangles (`x y w h` as u16, 24 bytes per record,
from `0x94` to a zero u32) and a table of CRC32 hashes, then the names themselves as plain
ASCII. Picture and name are joined by position, and the join checks itself: the stored hash has
to be the CRC32 of the name it points at.

For content atlases the name **is** the game's string id. `icon_tactics` calls its sprites
`icon_wht10020`; `icon_synergy` calls its sprites `sf01001` and `sp09003`. So those
atlases need no matching by eye at all — you read the labels out of the file.

That settled two long-open things at once. The tactic names here were originally recovered by
hand and locked in by pixel-matching; the file agrees with all 70 of them and names the 71st, the
cell the manual pass had written off as unused — it is `wht20140`. And the synergy icons, which
no config column predicted, simply carry their synergy's id.

For UI atlases the name is a numbered artwork slot instead, and the number is **not** the enum
the data uses. `icon_build_l00…l05` happens to line up with `legend.style`; `icon_type01…04`
does not line up with `legend.element`; `icon_teambuff01…38` does not line up with the passive
icon ids. That last hop lives in the menu code, which ships as compiled Lua.

Two smaller notes. Cut by the rectangles, not by a grid: `icon_teambuff` packs eight 48×32
position badges into what looks like one 128×128 cell, and a grid pass merges them into three
garbled cells. And sprite order is the packer's insertion order — expanding L-shells, not
row-major — so there is nothing to read into it.