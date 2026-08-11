# Icons

PNG with alpha, extracted from the game's own `.g4tx` sprite atlases (build 6.00.23.00) and cut
out of them. Same provenance as `../dataminer/` — the game files, not the community scrape.

Vendored like the rest of `data/raw/`: **not served as-is**. `public/` is regenerated, so
whatever pipeline needs these has to copy or import them; nothing does yet.

## What is here

| Folder | Count | Named by | Joins to |
| --- | --- | --- | --- |
| `elements/` | 4 | element name | `legend.element` in the bundles |
| `styles/` | 6 | style name | nothing yet — `style` is still a raw code |
| `hissatsu/` | 4 | category name | `legend.hissatsu_category` |
| `positions/` | 18 | position name | nothing yet — `main_position` is a raw code |
| `tactics/` | 70 | `wht*` string id | `tactics[].string_id` |
| `passives/` | 49 | **sequential index only** | nothing |

Team emblems are deliberately absent: 346 files at 512×512 came to 48 MB, against 2 MB for
everything above. They are cut and named by `em*` string id outside the repo, in
`C:\Users\maxim\Downloads\to_be_shared (do not delete)\emblems\`, and can be brought in — probably
downscaled — whenever the app has a use for them.

## Naming that needs reading twice

- **Positions come in two sets.** `icon_position_{fwd,mid,def,gk}.{en,fr,ja}.png` are the coloured
  text badges — the atlas they come from is localised, hence one file per language (`FW`/`ATT`,
  `MF`/`MIL`, `DF`/`DÉF`, `GK`/`GAR`). The `*_silhouette.png` files are the older plain-white
  pictograms, kept as an alternative. `coach` and `manager` are staff, not pitch positions.
- **`passives/` is unmapped.** The files are numbered by their position in the atlas, and that
  position does **not** encode the passive id — see below. Treat them as unlabelled art.
- **`tactics/icon_tactic_wht20020.png`** (Keyman Ignition) was identified from its atlas cell
  rather than by hand like the other 69; it is the flaming-player glyph sitting directly under
  Keyman Lockdown in the same column.

## Atlas order is not data order

Worth stating plainly, because it looks like it should be. The atlases are regular grids — slice
them by detecting fully transparent gutter rows and columns, never by connected components, which
fragments icons and shuffles the order. But the **cell index does not encode the game id**:

- cell 0 is `wht10020`, which is second in the data;
- cell 20 is `wht10010`, which is first.

Some columns *are* sequential (the atlases grew patch by patch, newest ids on the right), which is
what makes the false pattern convincing. All 17 columns of `SPECIAL_TACTICS_INFO` were tested
against the 70 known cells; the best scored 3/81. The index lives in the UI layout or the
executable, not in the data files.

The tactic names above were recovered by hand and then locked in by pixel-matching the named files
against freshly grid-sliced cells — 69/69 at distance 0. That is the technique to reuse for any
atlas that still needs labelling, including `passives/` and the synergy icons.

## Synergy icons are absent on purpose

41 icons exist in `icon_synergy` for 37 synergies, and nothing in the game files links them. No
sprite descriptor (`.g4tp`) ships for the icon atlases, the menu Lua is compiled bytecode with no
icon table, and no config column predicts the cell. The synergies themselves are in the bundles
with their `members`, which is what the app actually needs; the art can wait for someone to match
it against an in-game screenshot.
