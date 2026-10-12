/**
 * TrophyData — TypeDataModel for trophies (type: "trophy").
 *
 * Trophies (p.242): minor rewards scavenged from dungeons and foes. Each one
 * grants a trait or an ability and lasts a number of combats, of expeditions,
 * or of active uses; at 0 it crumbles. A character holds three at once.
 * General Dungeon Trophies are the d20 table on p.243; every faction and
 * every legend of the bestiary has its own.
 *
 * Nothing is automated (Maar, 12 Oct 2026): the sheet tracks what is left,
 * a "1/battle" marker and an "active" marker for the ones that last a whole
 * combat or expedition.
 */
const { SchemaField, StringField, NumberField, BooleanField, HTMLField } = foundry.data.fields;

/** What a trophy's uses count (the book's Uses column). */
export const TROPHY_UNITS = {
  uses:        { label: "Uses",        left: "uses left",        active: "" },
  combats:     { label: "Combats",     left: "combats left",     active: "In effect this combat" },
  expeditions: { label: "Expeditions", left: "expeditions left", active: "In effect this expedition" },
  // Scav Badge (p.386): "Unlimited" — nothing to count, it never crumbles.
  unlimited:   { label: "Unlimited",   left: "",                 active: "" },
};

/**
 * Read the book's Uses text ("3 combats", "1 expedition", "One expedition",
 * "5") into a number and a unit.
 * @param {string} text
 * @returns {{max: number, unit: string}}
 */
export function parseTrophyUses(text) {
  const t = String(text ?? "").trim().toLowerCase();
  if (/unlimited/.test(t)) return { max: 1, unit: "unlimited" };
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const m = t.match(/^(\d+|one|two|three|four|five|six)\b/);
  const max = m ? (words[m[1]] ?? Number(m[1])) : 1;
  const unit = /combat|battle/.test(t) ? "combats" : /expedition/.test(t) ? "expeditions" : "uses";
  return { max: Math.max(1, max || 1), unit };
}

export class TrophyData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      // Where it comes from: "General" (d20 table), a faction, or a legend.
      faction:     new StringField({ required: true, initial: "" }),
      legend:      new StringField({ required: true, initial: "" }),
      d20:         new NumberField({ required: true, initial: 0, min: 0, max: 20, integer: true }),
      page:        new NumberField({ required: true, initial: 0, min: 0, integer: true }),
      // p.242: "All Trophies grant you either a trait or an ability". The
      // book doesn't say which for each one, so "" = not stated (pack default).
      kind:        new StringField({ required: true, initial: "", choices: ["", "ability", "trait"] }),
      // The book's Uses column, verbatim, and what the tracker counts.
      usesText:    new StringField({ required: true, initial: "1" }),
      usesUnit:    new StringField({ required: true, initial: "uses", choices: Object.keys(TROPHY_UNITS) }),
      uses: new SchemaField({
        value: new NumberField({ required: true, initial: 1, min: 0, integer: true }),
        max:   new NumberField({ required: true, initial: 1, min: 1, integer: true }),
      }),
      // "only once per combat": a marker the player ticks when it's spent.
      perCombat:      new BooleanField({ required: true, initial: false }),
      usedThisCombat: new BooleanField({ required: true, initial: false }),
      // For trophies that last a combat or an expedition: switched on when
      // the player starts one, so the table can see it is running.
      active:      new BooleanField({ required: true, initial: false }),
      description: new HTMLField({ required: true, initial: "" }),
    };
  }

  /** Uses gone: the trophy has crumbled (p.242). */
  get broken() {
    if (this.usesUnit === "unlimited") return false;
    return (this.uses?.value ?? 0) <= 0;
  }

  /** "General d20 #5", "Relict — Vessel Knight", "Relict", "Custom". */
  get sourceLabel() {
    if (this.d20) return `General Dungeon Trophy (d20: ${this.d20})`;
    if (this.legend) return `${this.faction ? `${this.faction} — ` : ""}${this.legend}`;
    if (this.faction) return `${this.faction} trophy`;
    return "Custom trophy";
  }
}
