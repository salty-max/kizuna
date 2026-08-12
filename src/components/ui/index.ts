/**
 * Les primitives de l'UI.
 *
 * Elles parlent toutes la même grammaire, celle de la carte joueur : coins
 * durs, bordure 2 px, ombre pleine sans flou, capitales condensées italiques.
 * Rien ici ne connaît le domaine — pas de joueur, pas de rareté, pas de
 * synergie : ces composants savent seulement à quoi ressemble l'app.
 */

export { Button, IconButton, LinkButton, Tab } from "./Button";
export { Callout } from "./Callout";
export { Chip, CountBadge, FilterChip } from "./Chip";
export { DataList, DataRow } from "./DataRow";
export { Field, NumberInput, TextInput } from "./Field";
export { Select, type SelectOption } from "./Select";
export { Toggle } from "./Toggle";
export { Panel, PanelHint, PanelMeta } from "./Panel";
