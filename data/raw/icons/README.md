# Icons

PNG with alpha, extracted from the game's own `.g4tx` sprite atlases (build 6.00.23.00) and cut
out of them. Same provenance as `../dataminer/` — the game files, not the community scrape.

Vendored like the rest of `data/raw/`: **not served as-is**. `bun run data` copies every
folder into `public/icons/` (151 PNGs). The app consumes them via `src/lib/icons.ts` and
`src/components/GameIcon.tsx` — elements, positions, styles, staff, hissatsu categories,
plus path helpers for tactics and (unlabelled) passive cells.

## What is here

| Folder | Count | Named by | Joins to |
| --- | --- | --- | --- |
| `elements/` | 4 | element name | `legend.element` in the bundles |
| `styles/` | 6 | style name | `legend.style` |
| `hissatsu/` | 4 | category name | `legend.hissatsu_category` |
| `positions/` | 18 | position name | `legend.position` |
| `tactics/` | 70 | `wht*` string id | `tactics[].string_id` |
| `aura/` | 7 | aura type | `auras[].type` — **proposed, see below** |
| `gender/` | 2 | male / female | `characters[].gender` |
| `passives/` | 53 | sprite index | `passives[].icon` — **via `_passive_icons.csv`, see below** |

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
- **`tactics/icon_tactic_wht20020.png`** (Keyman Ignition) was identified from its atlas cell
  rather than by hand like the other 69; it is the flaming-player glyph sitting directly under
  Keyman Lockdown in the same column.

## Passive icons

`passives/` is the `icon_teambuff` atlas: 45 pictograms plus the eight small position badges
(`MF` `DF` `GK` … `FW`) the game splices into passive text like "[GK] KP +N%". The files were
renumbered — they used to be grid cells, they are now **sprite indices read from the atlas's own
header**, which is the only numbering that separates those eight badges instead of merging them
into three garbled cells.

Every passive in the bundles now carries `icon` (the game's icon id), `icon_label` (what that id
means) and `build` (which of the six team builds it belongs to). `legend.passive_icon` lists all
25 ids. That mapping is read from the game: a passive's icon comes from its effect, and every
passive sharing an id names the same stat — all 144 under id 11 say "Castle Wall DF".

The one hop still missing is **icon id → which of these 53 pictures**. The ids are not sprite
indices, and the lookup lives in the menu code rather than in any data file.
[`passives/_passive_icons.csv`](passives/_passive_icons.csv) grades what could be identified by
eye: eight are certain because the pictogram is unambiguous or is literally the text — `AT`,
`DF`, `T`, the intact and the breached castle wall, the two money bags, the shooting comet.

## Atlas order is not data order

Worth stating plainly, because it looks like it should be. **A `.g4tx` carries its own sprite
table** — sub-rectangles as `x y w h` u16, 24 bytes per record, from `0x94` to the `DDS ` magic —
so cut by that and not by guessing a grid. The sprites come out in the packer's insertion order,
expanding L-shells rather than row-major. But **neither index encodes the game id**:

- cell 0 is `wht10020`, which is second in the data;
- cell 20 is `wht10010`, which is first.

Some columns *are* sequential (the atlases grew patch by patch, newest ids on the right), which is
what makes the false pattern convincing. Now that the sprite table is readable the same thing can
be said of it precisely: across the 71 tactic icons the sprite order follows ascending `wht*` id
for the original set and then appends every later-patched tactic at the end, so it is correlated
with the data and equal to it nowhere. All 17 columns of `SPECIAL_TACTICS_INFO` were also tested
against the cells; the best scored 3/81. The index lives in the menu code, which ships as
compiled Lua.

The tactic names above were recovered by hand and then locked in by pixel-matching the named files
against freshly sliced cells — 69/69 at distance 0. That is the technique to reuse for any
atlas that still needs labelling, including the synergy icons.

## Synergy icons are absent on purpose

41 icons exist in `icon_synergy` for 37 synergies, and nothing in the game files links them. No
sprite descriptor (`.g4tp`) ships for the icon atlases, the menu Lua is compiled bytecode with no
icon table, and no config column predicts the cell. The synergies themselves are in the bundles
with their `members`, which is what the app actually needs; the art can wait for someone to match
it against an in-game screenshot.
