/**
 * RelicData — TypeDataModel for Relic items (type: "relic").
 *
 * Default dust costs follow ICON 1.5 p. 245:
 *   - Rank II: 6 dust
 *   - Rank III: 6 dust
 *   - Aspect:  12 dust (or 4 if another PC already completed the quest)
 *
 * `currentRank` tracks the unlocked tier on a per-actor (embedded item) basis.
 * Compendium relics start at rank 1; upgrades happen on the actor's copy.
 */
const {
  SchemaField, StringField, NumberField, BooleanField, HTMLField,
} = foundry.data.fields;

function rankSchema(dustInitial) {
  return new SchemaField({
    description: new HTMLField({ required: true, initial: "" }),
    dustCost:    new NumberField({ required: true, initial: dustInitial, min: 0, integer: true }),
  });
}

export class RelicData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      rank1:  rankSchema(0),
      rank2:  rankSchema(6),
      rank3:  rankSchema(6),
      aspect: new SchemaField({
        description:      new HTMLField({ required: true, initial: "" }),
        dustCost:         new NumberField({ required: true, initial: 12, min: 0, integer: true }),
        questDescription: new HTMLField({ required: true, initial: "" }),
        questCompleted:   new BooleanField({ required: true, initial: false }),
      }),

      // Per-actor state: which tier is currently unlocked on this embedded
      // copy. Compendium copies stay at 1; the level-up handler mutates this
      // on the actor's embedded item only.
      currentRank: new NumberField({ required: true, initial: 1, min: 1, max: 4, integer: true }),

      // Per-actor state: dust gradually infused toward the NEXT rank (ICON
      // p.245 — you may put dust into a relic a little at a time, e.g. after
      // each combat). When investedDust reaches the next rank's cost the
      // upgrade unlocks; any leftover carries toward the following rank.
      investedDust: new NumberField({ required: true, initial: 0, min: 0, integer: true }),

      invokeType:      new StringField({ required: true, initial: "attack", choices: ["attack","gambit","round"] }),
      invokeCondition: new StringField({ required: true, initial: "" }),
      invokeEffect:    new HTMLField({ required: true, initial: "" }),
      suggestedForm:   new StringField({ required: true, initial: "" }),
    };
  }
}
