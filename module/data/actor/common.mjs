/**
 * common.mjs — Shared schema fragments and derived-data helpers for the
 * actor data models.
 *
 * IconData (under system.combat), FoeData and LegendData (top level) all
 * carry the same combat-stat block; only the defaults and the HP shape
 * differ (PCs add hp.bloodied + wounds, legends add hp.baseline). The HP
 * field therefore stays in each model; everything else comes from here.
 *
 * IMPORTANT: field names/types must stay identical to the pre-refactor
 * schemas — this factory is a deduplication, not a schema change, so no
 * data migration is needed.
 */
const { SchemaField, StringField, NumberField } = foundry.data.fields;

/**
 * Shared combat-stat fields: vit, defense, speed, armor, damagedie, fray,
 * vigor {value,max}. Spread the result into defineSchema().
 *
 * @param {object} d                 Per-type defaults.
 * @param {number} d.vit
 * @param {number} d.defense
 * @param {number} d.speed
 * @param {number} d.armor
 * @param {string} d.damagedie
 * @param {number} d.fray
 * @param {string[]|null} [d.damagedieChoices=null]  Restrict die values (PCs).
 * @param {number} [d.minSpeed=0]                    PCs use min 1.
 */
export function combatStatsSchema({
  vit, defense, speed, armor, damagedie, fray,
  damagedieChoices = null,
  minSpeed = 0,
} = {}) {
  return {
    vit:       new NumberField({ required: true, initial: vit, min: 1, integer: true }),
    defense:   new NumberField({ required: true, initial: defense, min: 0, integer: true }),
    speed:     new NumberField({ required: true, initial: speed, min: minSpeed, integer: true }),
    armor:     new NumberField({ required: true, initial: armor, min: 0, integer: true }),
    damagedie: new StringField({ required: true, initial: damagedie,
                                 ...(damagedieChoices ? { choices: damagedieChoices } : {}) }),
    fray:      new NumberField({ required: true, initial: fray, min: 0, integer: true }),
    vigor: new SchemaField({
      value: new NumberField({ required: true, initial: 0,   min: 0, integer: true }),
      max:   new NumberField({ required: true, initial: vit, min: 0, integer: true }),
    }),
  };
}

/**
 * Shared derived-data for any object carrying the combat-stat block plus hp:
 * cap hp.value to hp.max, tie vigor.max to VIT, cap vigor.value.
 * For PCs pass system.combat (AFTER deriving hp.max from wounds); for
 * foes/legends pass the system object itself.
 */
export function prepareCombatStats(stats) {
  stats.hp.value    = Math.min(stats.hp.value, stats.hp.max);
  stats.vigor.max   = stats.vit;
  stats.vigor.value = Math.min(stats.vigor.value, stats.vigor.max);
}
