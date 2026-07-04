/**
 * FoeAbilityData — TypeDataModel for foe actions/interrupts/traits/round-actions (type: "foe-ability").
 */
const {
  SchemaField, StringField, NumberField, ArrayField, HTMLField,
} = foundry.data.fields;

export class FoeAbilityData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      abilityType:     new StringField({ required: true, initial: "action", choices: ["action","interrupt","trait","round-action"] }),
      cost:            new StringField({ required: true, initial: "1action" }),

      // interrupt-specific
      interruptLimit:  new NumberField({ required: true, initial: 1, min: 0, integer: true }),
      trigger:         new StringField({ required: true, initial: "" }),

      // round-action-specific
      roundNumber:     new NumberField({ required: true, initial: 1, min: 1, integer: true }),

      // Source metadata — which foe + faction this ability came from, so the
      // compendium can group by origin and the GM knows where it's canonical.
      sourceFoe:       new StringField({ required: true, initial: "" }),
      faction:         new StringField({ required: true, initial: "" }),

      tags:        new ArrayField(new StringField({ initial: "" }), { initial: [] }),
      hitEffect:   new HTMLField({ required: true, initial: "" }),
      missEffect:  new HTMLField({ required: true, initial: "" }),
      areaEffect:  new HTMLField({ required: true, initial: "" }),
      description: new HTMLField({ required: true, initial: "" }),
    };
  }
}
