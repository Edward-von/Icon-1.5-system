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
 * Sheet/chat view of an item's power die, or null when the item has none.
 * @param {object} system  item system data
 */
export function powerDieView(system) {
  const pd = system?.powerDie;
  const faces = Number(pd?.faces ?? 0);
  if (!faces) return null;
  const value = Math.min(faces, Math.max(0, Number(pd.value ?? 0)));
  return { faces, start: Number(pd.start ?? 1), value, active: value > 0, atMax: value >= faces };
}
