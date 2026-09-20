/**
 * LimitBreakData — TypeDataModel for Limit Break items (type: "limit-break").
 */
const {
  SchemaField, StringField, NumberField, BooleanField,
  ArrayField, HTMLField,
} = foundry.data.fields;

export class LimitBreakData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      jobName:      new StringField({ required: true, initial: "" }),
      class:        new StringField({ required: true, initial: "stalwart", choices: ["stalwart","vagabond","mendicant","wright"] }),
      resolveCost:  new NumberField({ required: true, initial: 1, min: 1, integer: true }),
      // "free" is a real limit-break cost: Death Sentence (Harvester), Elemental
      // (Stormbender) and High Prophecy (Seer) are Free Actions in the book
      // (pp.187, 200, 235). Leaving it out of the choices made the item fail
      // validation, so those three classes ended up with no limit break at all.
      cost:         new StringField({ required: true, initial: "1action", choices: ["1action","2actions","free"] }),
      tags:         new ArrayField(new StringField({ initial: "" }), { initial: [] }),
      effect:       new HTMLField({ required: true, initial: "" }),
      ultimate:     new HTMLField({ required: true, initial: "" }),   // Chapter 3 upgrade
      description:  new HTMLField({ required: true, initial: "" }),
    };
  }
}
