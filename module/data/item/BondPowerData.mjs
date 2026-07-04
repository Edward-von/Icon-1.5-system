/**
 * BondPowerData — TypeDataModel for Bond Power items (type: "bond-power").
 */
const {
  SchemaField, StringField, NumberField, BooleanField,
  ArrayField, HTMLField,
} = foundry.data.fields;

function chapterScalingEntrySchema() {
  return new SchemaField({
    chapter:     new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),
    description: new HTMLField({ required: true, initial: "" }),
  });
}

export class BondPowerData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      bondName:        new StringField({ required: true, initial: "" }),
      effortCost:      new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      limitPerSession: new NumberField({ required: true, initial: 0, min: 0, integer: true }),   // 0 = unlimited
      usedThisSession: new NumberField({ required: true, initial: 0, min: 0, integer: true }),   // per-instance session tracker
      isGambit:        new BooleanField({ required: true, initial: false }),

      // If the power scales with chapter, list one entry per chapter
      chapterScaling: new ArrayField(chapterScalingEntrySchema(), { initial: [] }),

      description: new HTMLField({ required: true, initial: "" }),
    };
  }
}
