/**
 * TraitData — TypeDataModel for passive job/class traits (type: "trait").
 */
const {
  SchemaField, StringField, NumberField, BooleanField, HTMLField,
} = foundry.data.fields;

import { powerDieSchema } from "./power-die.mjs";

export class TraitData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      jobName:     new StringField({ required: true, initial: "" }),
      class:       new StringField({ required: true, initial: "stalwart", choices: ["stalwart","vagabond","mendicant","wright"] }),
      // "gambit": the class Gambit granted by a SECONDARY job of another
      // class (buildClassGambitDoc). Was missing from choices until 2026-08-29,
      // so every secondary-job gambit failed validation and was never embedded.
      source:      new StringField({ required: true, initial: "job", choices: ["job","class","gambit"] }),
      passive:     new BooleanField({ required: true, initial: true }),
      chapter:     new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),
      description: new HTMLField({ required: true, initial: "" }),
      // Optional power die tracked on the trait itself (Sealer's Godly Smite mantra die).
      powerDie: powerDieSchema(),
    };
  }
}
