/**
 * JobTemplateData — TypeDataModel for Job Template items (type: "job-template").
 *
 * A Job Template bundles a class, a specific job name, its base stat block,
 * weapon slots, embedded traits, and a limit break. When dropped on an Icon
 * PC sheet, the sheet prompts a confirm, then overwrites the actor's combat
 * stats, adds the job to `system.combat.jobs`, and creates embedded trait and
 * limit-break items on the actor.
 */
const {
  SchemaField, StringField, NumberField, HTMLField, ArrayField,
} = foundry.data.fields;

export class JobTemplateData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      class: new StringField({
        required: true, initial: "stalwart",
        choices: ["stalwart", "vagabond", "mendicant", "wright"],
      }),
      jobName: new StringField({ required: true, initial: "" }),

      baseStats: new SchemaField({
        vit:       new NumberField({ required: true, initial: 10, min: 1, integer: true }),
        defense:   new NumberField({ required: true, initial: 6,  min: 0, integer: true }),
        speed:     new NumberField({ required: true, initial: 4,  min: 1, integer: true }),
        fray:      new NumberField({ required: true, initial: 3,  min: 0, integer: true }),
        damagedie: new StringField({ required: true, initial: "d6", choices: ["d6", "d8", "d10"] }),
        armor:     new NumberField({ required: true, initial: 0,  min: 0, integer: true }),
      }),

      // Free-form list of allowed weapon types
      weaponSlots: new ArrayField(new StringField({ initial: "" }), { initial: [] }),

      // Embedded trait data — each becomes a separate trait Item on drop
      traits: new ArrayField(new SchemaField({
        name:        new StringField({ required: true, initial: "" }),
        description: new HTMLField({ required: true, initial: "" }),
        chapter:     new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),
      }), { initial: [] }),

      // Limit break details — becomes an embedded limit-break Item on drop
      limitBreak: new SchemaField({
        name:        new StringField({ required: true, initial: "" }),
        resolveCost: new NumberField({ required: true, initial: 2, min: 0, integer: true }),
        cost:        new StringField({ required: true, initial: "1action" }),
        effect:      new HTMLField({ required: true, initial: "" }),
        ultimate:    new HTMLField({ required: true, initial: "" }),
      }),

      description: new HTMLField({ required: true, initial: "" }),
    };
  }
}
