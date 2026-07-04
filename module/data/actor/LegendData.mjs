/**
 * LegendData — TypeDataModel for Legend (Boss) actors (type: "legend").
 * Legends have multiple actions, enhanced interrupts, phases, and round actions.
 */
const {
  SchemaField, StringField, NumberField, BooleanField,
  ArrayField, HTMLField,
} = foundry.data.fields;

/* ---------- sub-schemas ---------- */

function traitSchema() {
  return new SchemaField({
    name:        new StringField({ required: true, initial: "" }),
    description: new HTMLField({ required: true, initial: "" }),
    // If set, this trait only activates from a given phase index
    phaseIndex:  new NumberField({ required: false, initial: null, nullable: true, integer: true }),
  });
}

function actionSchema() {
  return new SchemaField({
    name:        new StringField({ required: true, initial: "" }),
    cost:        new StringField({ required: true, initial: "1action" }),
    tags:        new ArrayField(new StringField({ initial: "" }), { initial: [] }),
    hitEffect:   new HTMLField({ required: true, initial: "" }),
    missEffect:  new HTMLField({ required: true, initial: "" }),
    areaEffect:  new HTMLField({ required: true, initial: "" }),
    description: new HTMLField({ required: true, initial: "" }),
    // If set, this action only activates from a given phase index
    phaseIndex:  new NumberField({ required: false, initial: null, nullable: true, integer: true }),
    // Explicit damage configuration — overrides text parsing when damageMode
    // is not "none". Modes:
    //   "none"     — action deals no damage (no button shown)
    //   "hit"      — deals damage only on hit
    //   "hit-miss" — deals separate damage on hit and miss
    damageMode:     new StringField({ required: true, initial: "none", choices: ["none", "hit", "hit-miss"] }),
    damageHitDice:  new NumberField({ required: true, initial: 0, min: 0, integer: true }),
    damageHitFray:  new BooleanField({ required: true, initial: false }),
    damageMissDice: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
    damageMissFray: new BooleanField({ required: true, initial: false }),
  });
}

function interruptSchema() {
  return new SchemaField({
    name:        new StringField({ required: true, initial: "" }),
    limit:       new NumberField({ required: true, initial: 2, min: 0, integer: true }),
    trigger:     new StringField({ required: true, initial: "" }),
    effect:      new HTMLField({ required: true, initial: "" }),
    description: new HTMLField({ required: true, initial: "" }),
  });
}

function roundActionSchema() {
  return new SchemaField({
    name:        new StringField({ required: true, initial: "" }),
    roundNumber: new NumberField({ required: true, initial: 1, min: 1, integer: true }),
    effect:      new HTMLField({ required: true, initial: "" }),
    description: new HTMLField({ required: true, initial: "" }),
  });
}

function phaseSchema() {
  return new SchemaField({
    label:        new StringField({ required: true, initial: "Phase" }),
    hpThreshold:  new NumberField({ required: true, initial: 0, min: 0, integer: true }),
    description:  new HTMLField({ required: true, initial: "" }),
    traitsAdded:  new ArrayField(new StringField({ initial: "" }), { initial: [] }),
    actionsAdded: new ArrayField(new StringField({ initial: "" }), { initial: [] }),
  });
}

/* ---------- main model ---------- */

export class LegendData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      faction: new StringField({ required: true, initial: "" }),
      chapter: new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),

      vit:      new NumberField({ required: true, initial: 10, min: 1, integer: true }),
      // Legend HP scales with PC count per p.298: "50 per player character
      // (minimum 100)". The 2-player baseline is therefore 100. `baseline`
      // stores that canonical 2-PC value; `hp.max` is the scaled value
      // actually used in play. `playerScale` (≥2) is the PC count the GM
      // dials in on the sheet.
      hp: new SchemaField({
        value:    new NumberField({ required: true, initial: 100, min: 0, integer: true }),
        max:      new NumberField({ required: true, initial: 100, min: 1, integer: true }),
        baseline: new NumberField({ required: true, initial: 0,   min: 0, integer: true }),
      }),
      playerScale: new NumberField({ required: true, initial: 2, min: 2, integer: true }),
      // Legends can gain Vigor from their own abilities (e.g. Apex's Steaming
      // Rage, Keeper's Light the Everforge). Capped at VIT; lost at end of
      // combat.
      vigor: new SchemaField({
        value: new NumberField({ required: true, initial: 0,  min: 0, integer: true }),
        max:   new NumberField({ required: true, initial: 10, min: 0, integer: true }),
      }),
      defense:   new NumberField({ required: true, initial: 8, min: 0, integer: true }),
      speed:     new NumberField({ required: true, initial: 4, min: 0, integer: true }),
      armor:     new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      damagedie: new StringField({ required: true, initial: "d8" }),
      fray:      new NumberField({ required: true, initial: 3, min: 0, integer: true }),
      size:      new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),

      phases:       new ArrayField(phaseSchema(),       { initial: [] }),
      currentPhase: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      // If set (≥0), forces currentPhase to this value and skips the
      // HP-threshold auto-calculation. -1 = auto (default).
      manualPhase:  new NumberField({ required: true, initial: -1, min: -1, integer: true }),

      traits:       new ArrayField(traitSchema(),       { initial: [] }),
      actions:      new ArrayField(actionSchema(),      { initial: [] }),
      interrupts:   new ArrayField(interruptSchema(),   { initial: [] }),
      roundActions: new ArrayField(roundActionSchema(), { initial: [] }),

      resolvePool: new NumberField({ required: true, initial: 0, min: 0, integer: true }),

      loot:        new HTMLField({ required: true, initial: "" }),
      tactics:     new HTMLField({ required: true, initial: "" }),
      description: new HTMLField({ required: true, initial: "" }),
      lore:        new HTMLField({ required: true, initial: "" }),
    };
  }

  prepareDerivedData() {
    // Cap hp.value to max
    this.hp.value = Math.min(this.hp.value, this.hp.max);

    // Vigor cap scales with VIT
    this.vigor.max   = this.vit;
    this.vigor.value = Math.min(this.vigor.value, this.vigor.max);

    // Update currentPhase. If manualPhase ≥ 0, the GM has overridden the
    // HP-based auto-calculation — clamp to the phase array length and use it.
    // Otherwise fall back to the HP threshold rule.
    if (this.phases.length > 0) {
      if (this.manualPhase >= 0) {
        this.currentPhase = Math.min(this.manualPhase, this.phases.length - 1);
      } else {
        let phase = 0;
        for (let i = 0; i < this.phases.length; i++) {
          if (this.hp.value <= this.phases[i].hpThreshold) {
            phase = i;
            break;
          }
        }
        this.currentPhase = phase;
      }
    }
  }
}
