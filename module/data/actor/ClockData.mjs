/**
 * ClockData.mjs — a board of campaign clocks (actor type "clock").
 *
 * ICON uses clocks for anything that fills up over time: a quest's progress,
 * a threat closing in, a project in a camp (pp.140-145 — "You can set up
 * multiple clocks to represent…"). The PC sheet already has them for burdens
 * and ambitions; this actor holds the ones that belong to the table rather
 * than to a character, which is what a GM needs on screen during a session.
 *
 * One actor = one board with as many clocks as you like, so a campaign needs
 * a single "Clocks" actor instead of one per clock. Each clock keeps its own
 * name, size, progress, colour and note.
 */
const { SchemaField, StringField, NumberField, BooleanField, ArrayField, HTMLField } = foundry.data.fields;

/** Clock sizes the book uses (p.140: "The longer the clock…"). */
export const CLOCK_SIZES = [4, 6, 8, 10, 12];

export class ClockData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      clocks: new ArrayField(new SchemaField({
        name:  new StringField({ required: true, initial: "New clock" }),
        value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max:   new NumberField({ required: true, initial: 6, min: 1, max: 24, integer: true }),
        color: new StringField({ required: true, initial: "#c8961c" }),
        note:  new StringField({ required: true, initial: "" }),
        // A clock the players can see on their own copy of the sheet. The GM
        // decides; hidden ones are simply not rendered for a non-GM.
        secret: new BooleanField({ required: true, initial: false }),
      }), { initial: [] }),
      notes: new HTMLField({ required: true, initial: "" }),
    };
  }

  /** Clocks that are full — the ones that have something to say. */
  get completed() {
    return (this.clocks ?? []).filter(c => c.max > 0 && c.value >= c.max);
  }
}
