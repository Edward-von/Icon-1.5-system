/**
 * GearKitData — TypeDataModel for Gear Kit items (type: "gear-kit").
 */
const {
  SchemaField, StringField, BooleanField, ArrayField, HTMLField,
} = foundry.data.fields;

export class GearKitData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      bondName:          new StringField({ required: true, initial: "" }),
      kitName:           new StringField({ required: true, initial: "" }),
      items:             new ArrayField(new StringField({ initial: "" }), { initial: [] }),
      isAdventurersKit:  new BooleanField({ required: true, initial: false }),
      description:       new HTMLField({ required: true, initial: "" }),
    };
  }
}
