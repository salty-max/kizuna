/**
 * The UI primitives.
 *
 * They all speak the same grammar, the player card's: hard corners, 2px
 * border, solid shadow with no blur, condensed italic capitals. Nothing here
 * knows the domain — no player, no rarity, no synergy: these components only
 * know what the app looks like.
 */

export { Button, IconButton, LinkButton, Tab } from "./Button";
export { Callout } from "./Callout";
export { Chip, CountBadge, FilterChip } from "./Chip";
export { DataList, DataRow } from "./DataRow";
export { Field, NumberInput, TextInput } from "./Field";
export { Select, type SelectOption } from "./Select";
export { Toggle } from "./Toggle";
export { Panel, PanelHint, PanelMeta } from "./Panel";
