/**
 * form-arrays.mjs — protect partially-rendered ArrayFields on form submit.
 *
 * With `submitOnChange: true`, every change re-serialises the whole form.
 * Any `ArrayField` of objects (foe/legend actions, traits, interrupts, PC
 * jobs, burdens, ambitions…) is rebuilt WHOLESALE from the form: element
 * fields that have no `<input name=…>` (action `tags` are chips, burden
 * `clock.value` is clickable segments, `jobs[].primary` is a button…) are
 * missing from the submission, and the ArrayField clean step in
 * DocumentSheetV2._prepareSubmitData fills them with their schema INITIAL —
 * `tags: []`, `clock.value: 0`, `primary: false`. Symptom reported by Maar:
 * editing a foe's HP/name/size wiped the tags of every equipped ability.
 *
 * Kept free of client-only globals so it can be exercised from Node.
 */

/**
 * Walk `schema` alongside the submitted (`sub`) and live source (`live`)
 * data. For every ArrayField whose element is a SchemaField, overlay each
 * submitted element onto a clone of the live element with the same index,
 * so unrendered fields carry their current value through the clean step.
 * Elements the form sends beyond the live length are left untouched
 * (adds/removes go through explicit action handlers with direct updates,
 * so during a form submit the lengths match). Mutates `sub` in place.
 *
 * @param {SchemaField} schema  The data model schema (e.g. `actor.system.schema`).
 * @param {object} sub          Submitted data for that schema (expanded, pre-clean).
 * @param {object} live         Live SOURCE data for that schema (`toObject()`).
 * @param {string} [path]       Path prefix for the returned log entries.
 * @returns {string[]}          Paths of the merged elements (for logging).
 */
export function mergeLiveArrayElements(schema, sub, live, path = "system") {
  const { SchemaField, ArrayField } = foundry.data.fields;
  const merged = [];
  for (const [key, field] of Object.entries(schema.fields)) {
    const value = sub?.[key];
    if (value === undefined || value === null) continue;

    if (field instanceof SchemaField) {
      merged.push(...mergeLiveArrayElements(field, value, live?.[key], `${path}.${key}`));
      continue;
    }

    if (!(field instanceof ArrayField) || !(field.element instanceof SchemaField)) continue;
    // expandObject() yields `{0: {...}, 1: {...}}` (object with numeric keys)
    // — ArrayField casts it to a real array later. Handle both shapes.
    if (foundry.utils.getType(value) !== "Object" && !Array.isArray(value)) continue;
    const liveArr = Array.isArray(live?.[key]) ? live[key] : [];

    for (const [k, el] of Object.entries(value)) {
      const base = liveArr[Number(k)];
      if (!base || foundry.utils.getType(el) !== "Object") continue;
      value[k] = foundry.utils.mergeObject(foundry.utils.deepClone(base), el, { inplace: false });
      merged.push(`${path}.${key}.${k}`);
    }
  }
  return merged;
}
