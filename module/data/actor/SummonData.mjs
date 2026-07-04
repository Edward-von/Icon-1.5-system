/**
 * SummonData — TypeDataModel for Summon tokens (type: "summon").
 * Summons are intangible by default: immune to foe damage/effects,
 * no obstruction/engagement, don't count as foes or allies.
 */
const {
  SchemaField, StringField, NumberField, BooleanField, HTMLField,
} = foundry.data.fields;

export class SummonData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      summonerActorId:  new StringField({ required: true, initial: "" }),
      sourceAbilityName: new StringField({ required: true, initial: "" }),
      intangible:       new BooleanField({ required: true, initial: true }),
      size:             new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),

      // Only relevant when not intangible
      hp: new SchemaField({
        value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max:   new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      }),
      defense: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      speed:   new NumberField({ required: true, initial: 4, min: 0, integer: true }),

      summonAction: new HTMLField({ required: true, initial: "" }),
      summonEffect: new HTMLField({ required: true, initial: "" }),
      notes:        new HTMLField({ required: true, initial: "" }),
    };
  }

  prepareDerivedData() {
    // Intangible summons don't track HP; ensure consistency.
    if (this.intangible) {
      this.hp.value = 0;
      this.hp.max   = 0;
    }
  }
}
