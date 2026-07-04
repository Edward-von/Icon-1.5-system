/**
 * legend-data.mjs — canonical Legend definitions extracted from ICON 1.5
 * manual (pp. 310+). Used by tools/populate-pack.mjs to seed the system's
 * `icon-system.legends` compendium with descriptive text, traits, actions,
 * interrupts, round actions and phases.
 *
 * Each entry is keyed by the canonical legend name (case-insensitive lookup
 * by the migration script).
 *
 * Schema reference: see module/data/actor/LegendData.mjs.
 */

export const LEGEND_DATA = {

  /* ============================================================
     DEMOLISHER (manual p. 310)
     ============================================================ */
  "Demolisher": {
    description: "The Demolisher is pure strength and rage personified. It can be used to represent particularly colossal warriors, giants, or huge armored beasts.",
    tactics: "The Demolisher is a relatively straightforward fight. Characters will want to avoid colliding from its abilities, and finish it off quickly in phase II, where it becomes much stronger.",
    size: 2,
    traits: [
      // Always-on
      { name: "Size 2",   phaseIndex: null, description: "Occupies a 2x2 area." },
      { name: "Sturdy",   phaseIndex: null, description: "Resistant to forced movement." },
      { name: "Legend",   phaseIndex: null, description: "Takes 1 turn for each player character." },
      // Phase II only
      { name: "Frothing Mad", phaseIndex: 1, description: "Attacks gain +1 boon and can critically hit (+[D])." },
      { name: "Enrage",       phaseIndex: 1, description: "+1 action." },
    ],
    phases: [
      { label: "Phase I",  hpThreshold: 0, description: "Demolisher starts here. Lumbering Charge triggers ONCE per round." },
      { label: "Phase II", hpThreshold: 50, description: "Triggered when bloodied. As Phase I, but Lumbering Charge triggers TWICE per round, gains Frothing Mad and Enrage, and unlocks Great Lash." },
    ],
    roundActions: [
      {
        name: "Juggernaut",
        roundNumber: 1,
        effect:  "At the start of the round, this character may clear a status or mark.",
        description: "All Legends share this round action.",
      },
      {
        name: "Lumbering Charge",
        roundNumber: 1,
        effect:  "At the end of the round, the Demolisher may Rush 1 up to four times. Before each space of this rush, it shoves all adjacent foes 1 space and deals 1 damage to them. (In Phase II this triggers twice per round.)",
        description: "",
      },
    ],
    actions: [
      // Always-available
      {
        name: "Pound",
        cost: "1action",
        tags: ["true-strike", "attack", "range-2", "combo"],
        phaseIndex: null,
        hitEffect:  "[D]+fray. Deals bonus damage for each: target is weakened, slashed, or stunned.",
        missEffect: "fray damage.",
        areaEffect: "",
        description: "A heavy melee strike. Combos into Battle Roar or Quake Strike.",
      },
      {
        name: "Battle Roar",
        cost: "1action",
        tags: ["end-turn", "combo"],
        phaseIndex: null,
        hitEffect:  "",
        missEffect: "",
        areaEffect: "Foes in range 2 take 2 piercing damage. Bloodied foes are slashed.",
        description: "Combo finisher. Ends the Demolisher's turn.",
      },
      {
        name: "Quake Strike",
        cost: "2actions",
        tags: ["attack", "range-2", "burst-1", "combo"],
        phaseIndex: null,
        hitEffect:  "3[D]+fray. Effect: Create a pit under the attack target.",
        missEffect: "[D]+fray.",
        areaEffect: "[D]+fray.",
        description: "Combo finisher. Devastating burst attack that creates a pit on hit.",
      },
      {
        name: "Hurl Boulder",
        cost: "1action",
        tags: ["range-4"],
        phaseIndex: null,
        hitEffect:  "",
        missEffect: "",
        areaEffect: "",
        description: "Effect: A foe in range takes 2 damage and is shoved 1, then create a height 1 boulder object next to them.",
      },
      {
        name: "Lash",
        cost: "1action",
        tags: ["range-4"],
        phaseIndex: null,
        hitEffect:  "",
        missEffect: "",
        areaEffect: "",
        description: "The Demolisher whips a chain, hook, or weapon around a foe in range, shoving them 2 spaces towards the Demolisher. Collide: Foe is weakened. Weakened foes take fray damage.",
      },
      {
        name: "Heavy Vault",
        cost: "1action",
        tags: ["per-round-1"],
        phaseIndex: null,
        hitEffect:  "",
        missEffect: "",
        areaEffect: "",
        description: "The Demolisher removes itself from the battlefield, then places itself in range 3. Characters under it when it's placed take 2 damage and are removed and placed in any adjacent space as they are tossed around.",
      },
      // Phase II only
      {
        name: "Great Lash",
        cost: "1action",
        tags: ["range-4", "per-round-1"],
        phaseIndex: 1,
        hitEffect:  "",
        missEffect: "",
        areaEffect: "The Demolisher whips a chain or hook around all foes in range. They are shoved 2 spaces towards the Demolisher. Collide: Foes are weakened. Weakened foes take fray damage.",
        description: "Phase II only. AoE version of Lash that hits every foe in range.",
      },
    ],
    interrupts: [],
  },

  // Add more legends here in subsequent turns. Every key must match the
  // exact name of the legend document in the icon-system.legends pack
  // (case-insensitive).
};
