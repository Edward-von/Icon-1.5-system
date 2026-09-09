/**
 * power-die.mjs — Shared "power die" sub-schema for abilities and traits.
 *
 * Manual (glossary, "Power Die"): a die set out and ticked up or down
 * depending on certain conditions; each power die is unique to the ability
 * that granted it, typically gained at 1 tick, discarded when it ticks to 0.
 *
 *   faces  0 = this item has no power die; 4 / 6 / 8 = the die it uses
 *   start  ticks it is set out at ("starting at 3")
 *   value  current ticks; 0 = not set out. Never above `faces`.
 *
 * Wright power dice (class resource) stay on the actor; this one lives on
 * the item so the tracker sits next to the ability text (Maar, Sept 2026).
 */
const { SchemaField, NumberField } = foundry.data.fields;

export function powerDieSchema() {
  return new SchemaField({
    faces: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
    start: new NumberField({ required: true, initial: 1, min: 0, integer: true }),
    value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
  });
}

/**
 * Parse a free-text power-die spec ("d6 starting at 6", "d6 at 3", "d4/1",
 * "d8") into { faces, start }. `start` is null when the text gives none.
 * Returns null when no die size is found.
 * @param {string} spec
 * @returns {{faces:number, start:number|null}|null}
 */
export function parsePowerDieSpec(spec) {
  const m = String(spec ?? "").match(/d\s*(\d+)(?:\D+(\d+))?/i);
  if (!m) return null;
  const faces = Number(m[1]);
  if (![4, 6, 8, 10, 12].includes(faces)) return null;
  return { faces, start: m[2] != null ? Number(m[2]) : null };
}

/**
 * The die an ability currently uses: its own `powerDie` unless an unlocked
 * talent / mastery overrides it (AbilityData.talent1PowerDie etc.; mastery
 * wins over the talent). Returns { faces, start, source } — `source` names
 * the upgrade ("Talent I", "Mastery") or is "" for the base die.
 * @param {object} system  item system data
 */
export function effectivePowerDie(system) {
  const pd = system?.powerDie ?? {};
  let faces = Number(pd.faces ?? 0);
  let start = Number(pd.start ?? 1);
  let source = "";
  const selected = Number(system?.talentSelected ?? 0);
  const layers = [];
  if (selected === 1) layers.push(["Talent I",  system?.talent1PowerDie]);
  if (selected === 2) layers.push(["Talent II", system?.talent2PowerDie]);
  if (system?.masteryUnlocked) layers.push(["Mastery", system?.masteryPowerDie]);
  for (const [name, spec] of layers) {
    const o = parsePowerDieSpec(spec);
    if (!o) continue;
    faces = o.faces;
    if (o.start != null) start = o.start;
    source = name;
  }
  return { faces, start, source };
}

/**
 * Sheet/chat view of an item's power die, or null when the item has none.
 * Applies the talent / mastery override (see effectivePowerDie).
 * @param {object} system  item system data
 */
export function powerDieView(system) {
  const pd = system?.powerDie;
  const { faces, start, source } = effectivePowerDie(system);
  if (!faces) return null;
  const value = Math.min(faces, Math.max(0, Number(pd?.value ?? 0)));
  return { faces, start, value, active: value > 0, atMax: value >= faces, source };
}
