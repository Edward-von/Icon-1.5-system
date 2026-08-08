/**
 * BondData — TypeDataModel for Bond items (type: "bond").
 */
const {
  SchemaField, StringField, NumberField, ArrayField, HTMLField,
} = foundry.data.fields;

export class BondData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      // The 2 actions that get +2 bonus dots
      primaryActions: new ArrayField(new StringField({ initial: "" }), { initial: ["", ""] }),

      effortMax: new NumberField({ required: true, initial: 3, min: 1, integer: true }),
      strainMax: new NumberField({ required: true, initial: 5, min: 5, max: 5, integer: true }),

      secondWindTrigger: new StringField({ required: true, initial: "" }),
      specialAbility:    new HTMLField({ required: true, initial: "" }),
      ideals:            new ArrayField(new StringField({ initial: "" }), { initial: ["", "", ""] }),

      // "Take from another bond" gambit power (requires 4 bond powers owned)
      gambitPower:  new HTMLField({ required: true, initial: "" }),
      description:  new HTMLField({ required: true, initial: "" }),
    };
  }
}
