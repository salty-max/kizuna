# Changelog

Notable changes to Kizuna are collected here. No version has been released yet:
everything below makes up the first.

## Unreleased

### Added

#### Squad building

- pitch, roster, bench and staff across LEVEL-5's eight official formations;
- tactical composition wizard: three proposals by objective, playstyle and formation,
  each justified player by player;
- tournament rule profile (level 50), two Hero starters and one Basara maximum;
- primary and secondary position validation, unique characters and reserve coverage;
- automatic filling of empty slots, equipment and passives, with the reason behind
  every choice;
- automatic selection of Hero and Basara forms within the game's limits;
- rarity budget, filters by position, gender, obtainability and available forms;
- gender shown beside the name on the player sheet and in the slot editor, spelled
  out for the characters the game draws no glyph for;
- moving cards by drag-and-drop or from the keyboard.

#### Calculations and data

- Build Ranks, equipped synergies, team tactics and character bonds;
- structured passive effects: percentages, flat bonuses on base stats, match
  conditions and tiers tied to charge ranks;
- guaranteed effects kept explicitly apart from effects that depend on match state;
- passives with no usable effect flagged as such rather than guessed;
- passive scaling by rarity, and save rate modelled as a gauge.

#### Catalogue and wiki

- wiki of players, moves, equipment, passives, tactics and bonds, loaded one
  catalogue at a time;
- character model viewer: Inazugle's eight pre-rendered views as an in-house
  turntable, bust and full-body poses, rotation by mouse, keyboard or touch, with the
  whole ring prefetched before anything is shown;
- drop locations on every character's sheet: the Chronicle battles and the Player
  Universe star signs that hand out their spirit, kept apart because a battle is
  replayed and a star sign is rolled. A character no table covers says so;
- the same data read the other way: a locations catalogue ranked by how many
  players each place hands out, and a sheet per location naming them. Both
  directions link to each other, so "where do I get them" and "who does this
  battle drop" are one click apart;
- a light theme alongside the dark one, following the system by default with a
  three-way switch that keeps `system` reachable, remembered like the language;
- French, English and Japanese interface, with localized character names, pitch
  nicknames and club names, plus a toggle back to the original names.

#### Sharing, saving and delivery

- compact versioned KZ1 sharing and local saves;
- team export as PNG;
- optional Discord authentication and private Supabase cloud saves, the tool
  remaining fully usable without an account;
- prerendering, sitemap, canonical URLs and social preview;
- Vercel configuration with previews, headers, caches and SPA fallback.

#### Quality

- domain unit tests, desktop and mobile Playwright journeys, performance budgets and
  production build verification;
- strict data pipeline: an unknown game code or a broken reference fails generation
  instead of producing a plausible value.

### Changed

- `SlotEditor`, `SynergyPanel` and `PlayerPicker` split into focused modules;
- compact player transport format to reduce the initial load;
- catalogue loading driven by the route, and player details fetched in buckets;
- keyboard navigation, contrast and mobile reading order strengthened;
- builder toolbar on two rows and slot editing moved into a side sheet;
- the picker's and wiki's "Spirit drop" filter becomes "Obtainable" and reads from the
  drop locations: it retained 396 characters where 4856 are actually distributed, the
  flag covering only victory boxes and fixed rewards;
- player transport format: location ids are interned and the model's CDN path is
  derived from its own name, which absorbs the cost of carrying drop locations;
- code, comments included, is written in English throughout;
- GitHub Actions workflow runtimes updated.

### Fixed

- the model viewer's open button was covered by the player portrait and clickable on
  a few pixels only;
- coach and manager slots stayed empty when every role in the dump read "Player";
- Japanese game terms corrected, the leftovers in Latin script having been replaced;
- responsive controls that overlapped at intermediate widths;
- model dialog made compact, close button made visible, and Inazugle images given a
  loading state instead of a broken icon;
- the model viewer opened at roughly a third of the frame, because Inazugle's
  renders carry wide empty margins; it now opens framed on the character and
  carries zoom controls;
- button sizes made consistent: sign-in is primary and no longer shorter than the
  toolbar beside it, the slot editor's actions match the rest of the app, and the
  model viewer's controls share one height and one icon-only style;
- the hard shadow removed from the primary button, where it read as a second
  border rather than depth;
- a secondary position now reads as a position badge, like the primary one, instead
  of a bare letter code in small grey text;
- the slot editor's header stopped repeating the name, position and club shown
  immediately below it, and carries the change and clear actions instead, which
  used to scroll out of reach in a sheet several panels tall;
- element badges aligned on the style badges: the two sat side by side on every
  player and read as two unrelated kinds of fact;
- Inazuma Japan blue replaces the vermilion as the structural colour, and the ink
  ramp took a blue bias to match;
- no control carries a drop shadow any more. Surfaces keep it, so the shadow now
  separates a thing you press from a thing you look at;
- border weight carries the hierarchy: 2px says surface, 1px says control on it.
  Everything wore 2px, which left the eye nothing to sort by.

### Known gaps

- seasonal-player eligibility and exact synergy buff values are absent from the dump:
  Kizuna reports those gaps rather than inventing values;
- synergy and passive icons are not yet matched to their entries;
- three location names in French (five in English) still carry an unresolved character
  name placeholder: the dataminer now fills these at export, but the locations table is
  not on that path yet. Data generation counts and names them on every run. One event
  match is named in none of the three languages.
  The detail is tracked in [`data/raw/dataminer/HANDOFF.md`](data/raw/dataminer/HANDOFF.md).
