/**
 * TraitData — TypeDataModel for passive job/class traits (type: "trait").
 */
const {
  SchemaField, StringField, NumberField, BooleanField, HTMLField,
} = foundry.data.fields;

export class TraitData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      jobName:     new StringField({ required: true, initial: "" }),
      class:       new StringField({ required: true, initial: "stalwart", choices: ["stalwart","vagabond","mendicant","wright"] }),
      source:      new StringField({ required: true, initial: "job", choices: ["job","class"] }),
      passive:     new BooleanField({ required: true, initial: true }),
      chapter:     new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),
      description: new HTMLField({ required: true, initial: "" }),
    };
  }
}
