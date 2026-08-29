/**
 * IconData — TypeDataModel for Player Character (type: "icon").
 */
import { combatStatsSchema, prepareCombatStats } from "./common.mjs";

const {
  SchemaField, StringField, NumberField, BooleanField,
  ArrayField, ObjectField, HTMLField,
} = foundry.data.fields;

export class IconData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {

      /* -------------------------------------------------- */
      /*  Biography                                          */
      /* -------------------------------------------------- */
      biography: new SchemaField({
        kintype:  new StringField({ required: true, initial: "" }),
        culture:  new StringField({ required: true, initial: "" }),
        notes:    new HTMLField({ required: true, initial: "" }),
        ideals:   new ArrayField(new StringField({ initial: "" }), { initial: ["", "", ""] }),
      }),

      /* -------------------------------------------------- */
      /*  Narrative                                          */
      /* -------------------------------------------------- */
      narrative: new SchemaField({

        bond: new StringField({ required: true, initial: "" }),

        actions: new SchemaField({
          sneak:    new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          traverse: new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          sense:    new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          study:    new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          charm:    new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          command:  new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          tinker:   new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          excel:    new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          smash:    new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          endure:   new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
        }),

        effort: new SchemaField({
          value: new NumberField({ required: true, initial: 3, min: 0, integer: true }),
          max:   new NumberField({ required: true, initial: 3, min: 1, integer: true }),
        }),

        strain: new SchemaField({
          value: new NumberField({ required: true, initial: 0, min: 0, max: 5, integer: true }),
          max:   new NumberField({ required: true, initial: 5, min: 5, max: 5, integer: true }),
        }),

        // max 3 burdens; each: name, clock {value, max: 4|6|10}, affected actions
        burdens: new ArrayField(new SchemaField({
          name:    new StringField({ required: true, initial: "" }),
          clock:   new SchemaField({
            value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
            max:   new NumberField({ required: true, initial: 6, integer: true }),
          }),
          actions: new ArrayField(new StringField({ initial: "" }), { initial: ["", ""] }),
        }), { initial: [] }),

        // max 3 ambitions (one per size: 4/6/10)
        ambitions: new ArrayField(new SchemaField({
          name:  new StringField({ required: true, initial: "" }),
          clock: new SchemaField({
            value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
            max:   new NumberField({ required: true, initial: 6, integer: true }),
          }),
        }), { initial: [] }),

        xp: new SchemaField({
          value:               new NumberField({ required: true, initial: 0, min: 0, max: 15, integer: true }),
          max:                 new NumberField({ required: true, initial: 15, min: 15, max: 15, integer: true }),
          halfwayBonusClaimed: new BooleanField({ required: true, initial: false }),
        }),

        gearKit:   new StringField({ required: true, initial: "" }),
        looseGear: new ArrayField(new StringField({ initial: "" }), { initial: [] }),

        // Dust — magical essence used to infuse relics (rank/aspect upgrades)
        // and to pay for refocus. Manual p. 245 / p. 113.
        dust: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      }),

      /* -------------------------------------------------- */
      /*  Combat                                             */
      /* -------------------------------------------------- */
      combat: new SchemaField({

        level:   new NumberField({ required: true, initial: 0, min: 0, max: 12, integer: true }),
        chapter: new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),

        jobs: new ArrayField(new SchemaField({
          name:         new StringField({ required: true, initial: "" }),
          class:        new StringField({ required: true, initial: "stalwart", choices: ["stalwart","vagabond","mendicant","wright"] }),
          primary:      new BooleanField({ required: true, initial: false }),
          // UUID of the source Job Template in the Jobs compendium. Used by
          // "Set as Primary" to look up the template and copy its base stats,
          // traits, and limit break. Optional — legacy actors may not have it
          // and the sheet falls back to searching the compendium by jobName.
          templateUuid: new StringField({ required: true, initial: "" }),
        }), { initial: [] }),

        apTotal:         new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        masteries:       new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        skillRanksTotal: new NumberField({ required: true, initial: 0, min: 0, integer: true }),

        // Base combat stats (set from primary job). vit/defense/speed/armor/
        // damagedie/fray/vigor come from the shared factory; hp keeps its
        // PC-specific bloodied field and wounds is PC-only.
        ...combatStatsSchema({
          vit: 10, defense: 6, speed: 4, armor: 0, damagedie: "d6", fray: 4,
          damagedieChoices: ["d6", "d8", "d10"],
          minSpeed: 1,
        }),
        hp: new SchemaField({
          value:    new NumberField({ required: true, initial: 40, min: 0, integer: true }),
          max:      new NumberField({ required: true, initial: 40, min: 1, integer: true }),
          bloodied: new NumberField({ required: true, initial: 20, min: 0, integer: true }),
        }),
        wounds: new SchemaField({
          value: new NumberField({ required: true, initial: 0, min: 0, max: 4, integer: true }),
          max:   new NumberField({ required: true, initial: 4, min: 4, max: 4, integer: true }),
        }),

        resolve: new SchemaField({
          personal: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
          party:    new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        }),

        // Currently active stance (ICON: one stance at a time). Free text — the
        // name of the stance the character is in; empty = none. A token marker
        // effect is synced to this in IconActor._onUpdate.
        stance: new StringField({ required: true, initial: "" }),

        equippedAbilities:  new ArrayField(new StringField({ initial: "" }), { initial: [] }),
        equippedLimitBreak: new StringField({ required: true, initial: "" }),

        /* -------------------------------------------------- */
        /*  Class Resources — per-class trackers               */
        /* -------------------------------------------------- */
        // Populated conditionally in the Combat tab based on the primary
        // job's class. All fields are kept in the schema so switching class
        // at runtime doesn't lose or corrupt data.
        classResources: new SchemaField({
          // Stalwart — Vigilance: up to 6 charges
          vigilance: new SchemaField({
            value: new NumberField({ required: true, initial: 0, min: 0, max: 6, integer: true }),
            max:   new NumberField({ required: true, initial: 6, min: 0, max: 6, integer: true }),
          }),
          // Vagabond — single-bit combo token (0 or 1)
          comboToken: new SchemaField({
            value: new NumberField({ required: true, initial: 0, min: 0, max: 1, integer: true }),
            max:   new NumberField({ required: true, initial: 1, min: 1, max: 1, integer: true }),
          }),
          // Mendicant — pool of Blessing tokens (handed out to allies)
          blessingTokens: new SchemaField({
            value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
            max:   new NumberField({ required: true, initial: 10, min: 1, integer: true }),
          }),
          // Wright — Aether pool (persists across combats)
          aether: new SchemaField({
            value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
            max:   new NumberField({ required: true, initial: 10, min: 1, integer: true }),
          }),
          // Fool (Vagabond job) — Stacked Dice held (Stack Dice trait: max 1;
          // Death's Apprentice raises it to 2). Lost at end of combat.
          stackedDice: new SchemaField({
            value: new NumberField({ required: true, initial: 0, min: 0, max: 2, integer: true }),
            max:   new NumberField({ required: true, initial: 1, min: 1, max: 2, integer: true }),
          }),
          // Wright — array of power dice: { id, ticks }
          powerDice: new ArrayField(new SchemaField({
            id:    new StringField({ required: true, initial: "" }),
            ticks: new NumberField({ required: true, initial: 1, min: 1, integer: true }),
          }), { initial: [] }),
        }),
      }),

      /* -------------------------------------------------- */
      /*  Relics                                             */
      /* -------------------------------------------------- */
      relics: new ArrayField(new SchemaField({
        name: new StringField({ required: true, initial: "" }),
        rank: new NumberField({ required: true, initial: 1, min: 1, max: 4, integer: true }),
        dust: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      }), { initial: [] }),
    };
  }

  /* -------------------------------------------------- */
  /*  Derived Data                                       */
  /* -------------------------------------------------- */

  prepareDerivedData() {
    const combat = this.combat;

    // hp.max derives from vit and wounds:
    // hp.max = (vit * 4) - (wounds.value * vit)
    const baseMax = combat.vit * 4;
    const woundPenalty = combat.wounds.value * combat.vit;
    combat.hp.max = Math.max(combat.vit, baseMax - woundPenalty);

    // bloodied = 50% of the BASE max (4 × VIT), NOT of the wound-reduced max:
    // wounds eat the bar from the right, the bloodied line stays put (p. 15
    // bar diagram — a wound removes the rightmost quarter, the middle marker
    // doesn't move). So with VIT 7 + 1 wound (max 21) you're bloodied at 14.
    combat.hp.baseMax  = baseMax;
    combat.hp.bloodied = Math.ceil(baseMax / 2);

    // Shared caps: hp.value to max, vigor.max = vit, vigor.value to max.
    prepareCombatStats(combat);

    // Narrative: cap effort.value to max
    const effort = this.narrative.effort;
    effort.value = Math.min(effort.value, effort.max);
  }
}
