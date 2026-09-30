/**
 * FoeData — TypeDataModel for Foes (type: "foe").
 *
 * Stats follow the canonical "Glossary of Foes" table from the ICON 1.5
 * manual (p.298). Every foe has a CLASS (Heavy / Skirmisher / Leader /
 * Artillery / Mob) which determines its base stats — chapter only affects
 * which abilities are available, never base stats.
 *
 * ELITE is a template (p.299) that stacks on top of any non-mob foe:
 *   • The foe takes 2 turns per round
 *   • The foe has DOUBLE HP
 *   • Costs 2 encounter budget points
 *
 * The GM uses the FoeSheet builder to pick foeClass / isElite / faction,
 * then drags traits and actions from the "Foe Abilities" compendium.
 * Stat fields remain editable so individual foes can be tweaked.
 */
import { combatStatsSchema, prepareCombatStats } from "./common.mjs";

const {
  SchemaField, StringField, NumberField, BooleanField,
  ArrayField, HTMLField,
} = foundry.data.fields;

/* -------------------------------------------------- */
/*  Base stat tables (ICON 1.5 p.298)                  */
/* -------------------------------------------------- */

/**
 * Base stat block per foe class. HP is derived as VIT × 4 (Elite × 2).
 * Values copied from the "Glossary of Foes" page of the manual.
 *
 * Notes:
 *   • Skirmisher dashes its FULL speed (special trait), not half.
 *   • Heavy: the class trait Guard (p.298) "has Rampart, reduce all damage to
 *     self and allies in orthogonal spaces by 2, as if by armor" → armor 2.
 *     Foes whose entry says "lacks the Guard trait" (e.g. Atrophic Grave)
 *     keep armor 0 in the pack.
 *   • Mob: VIT/HP are placeholder; mobs don't track HP — they use the
 *     mob.members + mob.hitsRemaining tracker (1 hit per damage instance).
 */
export const FOE_BASE_STATS = {
  heavy:      { vit: 10, defense:  6, speed: 4, fray: 4, damagedie: "d6",  armor: 2 },
  skirmisher: { vit:  7, defense: 10, speed: 4, fray: 2, damagedie: "d10", armor: 0 },
  leader:     { vit: 10, defense:  8, speed: 4, fray: 3, damagedie: "d6",  armor: 0 },
  artillery:  { vit:  8, defense:  7, speed: 4, fray: 3, damagedie: "d8",  armor: 0 },
  // Mob defense/speed/fray/[D] from p.298. VIT/HP are unused (mob tracker).
  mob:        { vit:  1, defense:  8, speed: 4, fray: 3, damagedie: "d6",  armor: 0 },
};

/** Class display labels (used in the sheet dropdown). */
export const FOE_CLASS_LABELS = {
  heavy:      "Heavy",
  skirmisher: "Skirmisher",
  leader:     "Leader",
  artillery:  "Artillery",
  mob:        "Mob",
};

/**
 * Return the base stats for a given (foeClass, isElite) combination.
 * Elite doubles HP for non-mob classes (Elite template, p.299).
 * Falls back to "heavy" if the class is unknown.
 */
export function getFoeBaseStats(foeClass, isElite = false) {
  const base = FOE_BASE_STATS[foeClass] ?? FOE_BASE_STATS.heavy;
  let hpMax  = base.vit * 4;
  if (isElite && foeClass !== "mob") hpMax *= 2;
  return {
    vit:       base.vit,
    defense:   base.defense,
    speed:     base.speed,
    fray:      base.fray,
    damagedie: base.damagedie,
    armor:     base.armor,
    hp: { value: hpMax, max: hpMax },
  };
}

/**
 * What each class brings on top of its stats (Glossary of Foes, p.298): the
 * class traits, and the Diaga action of leaders. A foe that changes class
 * swaps these; its other traits and actions are its own.
 */
export const CLASS_BASELINE = {
  heavy:      { traits: ["Guard"],                actions: [] },
  skirmisher: { traits: ["Skirmisher", "Dodge"],  actions: [] },
  leader:     { traits: [],                       actions: ["Diaga"] },
  artillery:  { traits: ["Slip", "Aetherwall"],   actions: [] },
  mob:        { traits: ["Mob"],                  actions: [] },
};

/* ---------- sub-schemas ---------- */

export function traitSchema() {
  return new SchemaField({
    name:        new StringField({ required: true, initial: "" }),
    description: new HTMLField({ required: true, initial: "" }),
  });
}

export function actionSchema() {
  return new SchemaField({
    name:        new StringField({ required: true, initial: "" }),
    cost:        new StringField({ required: true, initial: "1action" }),
    tags:        new ArrayField(new StringField({ initial: "" }), { initial: [] }),
    hitEffect:   new HTMLField({ required: true, initial: "" }),
    missEffect:  new HTMLField({ required: true, initial: "" }),
    areaEffect:  new HTMLField({ required: true, initial: "" }),
    description: new HTMLField({ required: true, initial: "" }),
  });
}

export function interruptSchema() {
  return new SchemaField({
    name:        new StringField({ required: true, initial: "" }),
    limit:       new NumberField({ required: true, initial: 1, min: 0, integer: true }),
    trigger:     new StringField({ required: true, initial: "" }),
    effect:      new HTMLField({ required: true, initial: "" }),
    description: new HTMLField({ required: true, initial: "" }),
  });
}

export function roundActionSchema() {
  return new SchemaField({
    name:        new StringField({ required: true, initial: "" }),
    roundNumber: new NumberField({ required: true, initial: 1, min: 1, integer: true }),
    effect:      new HTMLField({ required: true, initial: "" }),
    description: new HTMLField({ required: true, initial: "" }),
  });
}

/**
 * A summon or object a foe / legend puts on the battlefield (the boxed
 * "Summon" / "Object" entries of the Book of Foes: Soul Spark, Temple Bell,
 * Crony…). Kept on the actor that creates it; the sheet's chip drags it onto
 * the map as a Summon actor (module/actor/foe-summons.mjs). Shared with
 * LegendData.
 */
export function summonSchema() {
  return new SchemaField({
    name:       new StringField({ required: true, initial: "" }),
    kind:       new StringField({ required: true, initial: "summon", choices: ["summon", "object"] }),
    descriptor: new StringField({ required: true, initial: "" }),   // "Summon, size 1, intangible"
    size:       new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),
    intangible: new BooleanField({ required: true, initial: false }),
    flying:     new BooleanField({ required: true, initial: false }),
    immobile:   new BooleanField({ required: true, initial: false }),
    hp:         new NumberField({ required: true, initial: 0, min: 0, integer: true }),
    defense:    new NumberField({ required: true, initial: 0, min: 0, integer: true }),
    action:     new HTMLField({ required: true, initial: "" }),     // "Summon Action:" text, if any
    rules:      new HTMLField({ required: true, initial: "" }),     // the whole rules text
    source:     new StringField({ required: true, initial: "" }),   // "p.329"
  });
}

/* ---------- main model ---------- */

export class FoeData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    // Start with the Heavy baseline — creation uses these defaults, and the
    // Builder rewrites them when foeClass / isElite changes.
    const base = FOE_BASE_STATS.heavy;
    const hpMax = base.vit * 4;
    return {
      // Canonical foe class (Heavy/Skirmisher/Leader/Artillery/Mob) per p.298.
      foeClass: new StringField({
        required: true,
        initial:  "heavy",
        choices:  ["heavy","skirmisher","leader","artillery","mob"],
      }),
      // Elite template (p.299): 2 turns + double HP. Mutually exclusive with
      // foeClass === "mob".
      isElite: new BooleanField({ required: true, initial: false }),
      faction: new StringField({ required: true, initial: "" }),
      // Chapter is metadata only (filters which abilities are available); it
      // no longer affects base stats per p.298 ("stats are the same for every
      // foe of the same class").
      chapter: new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),

      // Mob-specific tracking (used when foeClass === "mob"):
      //   members:  total member count (usually 2 per player character per p.298)
      //   hitsRemaining: total remaining "hits" across all members (2 per live member)
      // Damage routing: each damage INSTANCE removes exactly 1 hit, regardless
      // of amount (per manual p.291). When hitsRemaining reaches 0, mob defeated.
      mob: new SchemaField({
        members:       new NumberField({ required: true, initial: 6,  min: 0, integer: true }),
        hitsRemaining: new NumberField({ required: true, initial: 12, min: 0, integer: true }),
      }),

      // Shared combat stats (vigor cap = VIT, lost at end of combat — foes can
      // gain Vigor from their own abilities, e.g. Knuckle's Bulk Up).
      ...combatStatsSchema({
        vit:       base.vit,
        defense:   base.defense,
        speed:     base.speed,
        armor:     base.armor,
        damagedie: base.damagedie,
        fray:      base.fray,
      }),
      hp: new SchemaField({
        value:   new NumberField({ required: true, initial: hpMax, min: 0, integer: true }),
        max:     new NumberField({ required: true, initial: hpMax, min: 1, integer: true }),
      }),
      size:      new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),

      traits:       new ArrayField(traitSchema(),       { initial: [] }),
      actions:      new ArrayField(actionSchema(),      { initial: [] }),
      interrupts:   new ArrayField(interruptSchema(),   { initial: [] }),
      roundActions: new ArrayField(roundActionSchema(), { initial: [] }),
      summons:      new ArrayField(summonSchema(),      { initial: [] }),

      // Foe templates applied from the "Foe Templates" compendium
      // (module/actor/foe-templates.mjs). Each entry remembers what it added
      // and what it overwrote, so it can be taken off again. `slot` is what
      // makes two templates exclusive ("faction", "culture", "job", or
      // "special:<name>" for the ones that stack, like Imperial Officer).
      // Never rendered as form inputs, so the whole-array submit trap doesn't reach it.
      templates: new ArrayField(new SchemaField({
        slot:    new StringField({ required: true, initial: "" }),
        kind:    new StringField({ required: true, initial: "" }),
        name:    new StringField({ required: true, initial: "" }),
        uuid:    new StringField({ required: true, initial: "" }),
        added:   new foundry.data.fields.ObjectField(),   // { traits: [names], actions: [...], interrupts: [...], roundActions: [...] }
        removed: new foundry.data.fields.ObjectField(),   // { traits: [blocks], actions: [blocks] } — old class baseline
        prev:    new foundry.data.fields.ObjectField(),   // system fields as they were before
      }), { initial: [] }),

      defeat:     new HTMLField({ required: true, initial: "" }),
      loot:        new HTMLField({ required: true, initial: "" }),
      tactics:     new HTMLField({ required: true, initial: "" }),
      description: new HTMLField({ required: true, initial: "" }),
    };
  }

  prepareDerivedData() {
    prepareCombatStats(this);
  }
}
