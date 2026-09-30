/**
 * FoeTemplateData — TypeDataModel for Foe Template items (type: "foe-template").
 *
 * The Book of Foes builds most foes by stacking templates on a basic foe
 * (p.289: "Factions all have a template you can apply to a basic foe to make
 * it part of that faction"; p.315: "To make a Folk foe, use basic foes and
 * apply the Kin template and Great Culture trait of your choice"). A foe
 * template is one of those, ready to drop on a Foe sheet:
 *
 *   faction  — the faction template + special mechanic (Relict, Jotunn…)
 *   culture  — a Folk Great Culture (Chronicler, Guilder…)
 *   job      — a faction job or variant as a whole (Wight, Arc Spectre…):
 *              class, stats and every trait / action of the job
 *   special  — templates that stack with the others (Imperial Officer,
 *              Titan Armament)
 *
 * Applying and removing lives in module/actor/foe-templates.mjs; this is the
 * data only. Stat fields left null leave the foe's value alone.
 */
import { traitSchema, actionSchema, interruptSchema, roundActionSchema } from "../actor/FoeData.mjs";

const { SchemaField, StringField, NumberField, BooleanField, ArrayField, HTMLField } = foundry.data.fields;

const nullableInt = (opts = {}) => new NumberField({ required: false, nullable: true, initial: null, integer: true, ...opts });

export class FoeTemplateData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      kind: new StringField({ required: true, initial: "faction", choices: ["faction", "culture", "job", "special"] }),
      // Written onto the foe when set ("Relict", "Folk"…, same spelling as the Foes compendium).
      faction: new StringField({ required: true, initial: "" }),
      // Job templates only: the class the foe becomes ("" = keep the foe's class).
      foeClass: new StringField({ required: true, initial: "", choices: ["", "heavy", "skirmisher", "leader", "artillery", "mob"] }),
      // Job templates: the job's own statline. Null = keep the foe's.
      stats: new SchemaField({
        vit:       nullableInt({ min: 0 }),
        hp:        nullableInt({ min: 1 }),
        defense:   nullableInt({ min: 0 }),
        speed:     nullableInt({ min: 0 }),
        fray:      nullableInt({ min: 0 }),
        armor:     nullableInt({ min: 0 }),
        size:      nullableInt({ min: 1, max: 3 }),
        chapter:   nullableInt({ min: 1, max: 3 }),
        damagedie: new StringField({ required: true, initial: "" }),
        isElite:   new BooleanField({ required: false, nullable: true, initial: null }),
      }),
      // Faction / special effects on an existing foe (Legacy of the Titans, p.448;
      // Titan Armament): become Elite (doubling HP), grow to at least this size,
      // multiply HP.
      makeElite:    new BooleanField({ required: true, initial: false }),
      minSize:      nullableInt({ min: 1, max: 3 }),
      hpMultiplier: new NumberField({ required: true, initial: 1, min: 0.5, max: 3 }),

      traits:       new ArrayField(traitSchema(),       { initial: [] }),
      actions:      new ArrayField(actionSchema(),      { initial: [] }),
      interrupts:   new ArrayField(interruptSchema(),   { initial: [] }),
      roundActions: new ArrayField(roundActionSchema(), { initial: [] }),

      source:      new StringField({ required: true, initial: "" }),   // "p.324"
      description: new HTMLField({ required: true, initial: "" }),
    };
  }
}
