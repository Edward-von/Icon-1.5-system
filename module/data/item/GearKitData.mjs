/**
 * GearKitData — TypeDataModel for Gear Kit items (type: "gear-kit").
 *
 * On a PC the kits are embedded items (Session D, Oct 2026): the base kit
 * (Adventurer's, the Elder's Weathered one, the Outsider's) is always with the
 * character; of the bond's kits they carry one per expedition (p.35), two for
 * the Highborn. Items used up or lost are marked and come back at the start of
 * the next expedition ("we can reasonably assume you can restock", p.35).
 */
const {
  StringField, BooleanField, ArrayField, HTMLField, SchemaField, NumberField,
} = foundry.data.fields;

export class GearKitData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      bondName:          new StringField({ required: true, initial: "" }),
      kitName:           new StringField({ required: true, initial: "" }),
      items:             new ArrayField(new StringField({ initial: "" }), { initial: [] }),
      isAdventurersKit:  new BooleanField({ required: true, initial: false }),
      description:       new HTMLField({ required: true, initial: "" }),
      // On a character: the kit is always with them (base kit), not picked.
      always:            new BooleanField({ required: true, initial: false }),
      // On a character: the bond kit picked for this expedition.
      carried:           new BooleanField({ required: true, initial: false }),
      // A custom kit: items picked from the bond's kits (p.35).
      custom:            new BooleanField({ required: true, initial: false }),
      // Items used up or lost this expedition (by name).
      used:              new ArrayField(new StringField({ initial: "" }), { initial: [] }),
      // Uses counted per item (Edoardo, 13 Oct 2026): "5 fire stones" has 5
      // uses; any item can be given a quantity by hand. `spent` resets on a
      // new expedition, `max` (when set by hand) stays. Items not listed here
      // count 1 use, or the number their name starts with (gear.mjs).
      counts:            new ArrayField(new SchemaField({
        name:  new StringField({ required: true, initial: "" }),
        spent: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max:   new NumberField({ required: true, initial: 0, min: 0, integer: true }),   // 0 = from the name
      }), { initial: [] }),
    };
  }
}
