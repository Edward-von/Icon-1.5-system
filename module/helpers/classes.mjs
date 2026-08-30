/**
 * classes.mjs — Class-level data for the 4 ICON classes.
 *
 * Each entry contains:
 *   - traits:  the class-level traits/passives that EVERY job of that class
 *              has on top of its job-specific traits. Embedded automatically
 *              on the actor when the primary job is set/changed, with
 *              source = "class" so the swap logic can find and remove them.
 *   - rules:   the manual's class summary (strengths, weaknesses, lore,
 *              special mechanic). Shown in a collapsible dropdown on the
 *              Combat tab as a quick reference.
 *
 * Sources: ICON 1.5 manual pp. 116 (Stalwart), 145 (Vagabond),
 *          172 (Mendicant), 204 (Wright).
 */

export const CLASS_INFO = {
  stalwart: {
    label: "Stalwart",
    basicAttackRange: 3,
    specialMechanic: {
      name: "Heroics",
      description:
        "Stalwarts can push themselves beyond their normal limits, performing heroics and activating " +
        "any heroic triggered effects of an ability. Each job has different ways of performing heroics.",
    },
    gambit:
      "Stalwart Gambit: If you take a Stalwart ability as a non-Stalwart class, you get Heroics, and " +
      "the ability to trigger a Heroic ability for free once a combat.",
    relevantRules: [
      {
        name: "Shove X",
        description:
          "Move a character involuntarily X spaces in a straight line away from you. If they would " +
          "move into another character's space, an object, or into a higher elevation space, they " +
          "Collide and stop moving.",
      },
      {
        name: "Collide",
        description:
          "A triggered effect that occurs on any character shoved into an obstruction by this ability.",
      },
      {
        name: "Aura X",
        description:
          "This ability is a continuous, ongoing effect that affects all characters specified within " +
          "range X of an origin point, usually a character. Characters are only affected by an aura " +
          "while inside.",
      },
      {
        name: "End turn",
        description:
          "This ability ends your turn. If multiple abilities or effects would end your turn at the " +
          "same time, you can only choose one.",
      },
      {
        name: "Hatred of X",
        description:
          "Deal half damage to all foes other than foe X. End this status at the end of your turn, " +
          "or if foe X becomes immune to damage or un-targetable.",
      },
      {
        name: "Mark",
        description:
          "Places a mark, an ongoing effect, on a specific character. Each ability can only place " +
          "one mark at a time, and a character can mark another character with one mark at a time. " +
          "If you place a new mark on a character with a mark from you, you can choose which to keep " +
          "or which to discard. Marks end when the character that placed the mark is defeated, or " +
          "under other listed conditions.",
      },
      {
        name: "Rebound",
        description:
          "An ability that is rebounded can be bounced off a character in range. The ability has no " +
          "effect, but is instead redirected from that character's space as the origin space, taking " +
          "into account cover, line of sight, and other similar effects from their space. Any effects " +
          "that apply to the original user of the ability still apply to them (such as sacrificing " +
          "hp, or moving). Rebound does not stack.",
      },
      {
        name: "Stance",
        description:
          "An ongoing, positive effect. A character can only have one stance active at a time and " +
          "can drop a stance by taking a new stance or as a free action at the start of their turn. " +
          "When a stance refreshes, regain its effects.",
      },
    ],
    traits: [
      {
        name: "Armor 2",
        description: "Reduce all damage taken by 2.",
      },
      {
        name: "Fortify",
        description:
          "Spaces adjacent to you have Rampart. Gain Vigilance +1 at the end of your turn.",
      },
      {
        name: "Rush X",
        description:
          "Stalwarts can rush as part of their abilities. When you rush, you move X spaces and are " +
          "unstoppable and immune to all damage during that move.",
      },
    ],
  },

  vagabond: {
    label: "Vagabond",
    basicAttackRange: 4,
    relevantRules: [],
    specialMechanic: {
      name: "Finishing Blow",
      description:
        "Abilities with Finishing Blow triggered effects gain additional, more powerful effects if " +
        "they target at least one bloodied foe. Effects depend on the action.",
    },
    gambit:
      "Vagabond Gambit: If you take a Vagabond Ability as a non-Vagabond class, your vagabond " +
      "abilities benefit from Finesse.",
    traits: [
      {
        name: "Skirmisher",
        description: "A character with this trait can move diagonally and dash at full speed.",
      },
      {
        name: "Dodge",
        description:
          "Immune to all damage from missed attacks, successful saves, and area effects.",
      },
      {
        name: "Prowl",
        description:
          "(1 action) Gain stealth. Becomes a free action if no foes are in range 2.",
      },
      {
        name: "Finesse",
        description: "You deal bonus damage to bloodied foes.",
      },
    ],
  },

  mendicant: {
    label: "Mendicant",
    basicAttackRange: 5,
    relevantRules: [],
    specialMechanic: {
      name: "Blessing",
      description:
        "Certain actions give characters a Blessing token. A character can spend a blessing when " +
        "making a save to gain +1 boon on that save. All Mendicant jobs also have different, " +
        "alternative ways to spend blessings tokens. All blessings are discarded at the end of combat.",
    },
    gambit:
      "Mendicant Gambit: If you take a Mendicant Ability as a non-Mendicant job, you gain this class' " +
      "Bless action.",
    traits: [
      {
        name: "Diaga",
        description:
          "(1 action) Cure a character in range 4. A character that's cured gains 4 vigor, or a vigor " +
          "surge if they are bloodied. Then, they can immediately save against all statuses, ending " +
          "them on a success.",
      },
      {
        name: "Bless",
        description: "(1 action) Grant a blessing token to a character in range 4.",
      },
      {
        name: "Succor",
        description:
          "Mendicants may use Rescue to bring up a defeated ally at range 4 instead of adjacent.",
      },
    ],
  },

  wright: {
    label: "Wright",
    basicAttackRange: 6,
    relevantRules: [],
    specialMechanic: {
      name: "Aether",
      description:
        "All Wrights gather Aether during combat, represented by a d6 power die. They passively gain " +
        "1 at the start of their turn, starting with 0. Many wright abilities have upgraded versions " +
        "that can only be cast by Infusing them with X Aether (Infuse X). All Aether disperses at the " +
        "end of combat.",
    },
    gambit:
      "Wright Gambit: If you take a Wright ability as a non-wright class, you get Aether and Chain Reaction.",
    traits: [
      {
        name: "Slip",
        description:
          "Wright's movement does not trigger and ignores interrupts, vigilance and rampart.",
      },
      {
        name: "Aetherwall",
        description:
          "Wrights gain resistance against all abilities from characters that are outside of range 2 from them.",
      },
      {
        name: "Chain Reaction",
        description:
          "1/round, if a wright damages two or more foes with an ability, they gain 1 Aether after the ability resolves.",
      },
    ],
  },
};

/**
 * Build trait Item documents for a given class. Returns plain objects ready
 * for `createEmbeddedDocuments("Item", ...)`. Tagged with `source: "class"`
 * so the swap-primary logic can find and remove them.
 */
export function buildClassTraitDocs(cls) {
  const info = CLASS_INFO[cls];
  if (!info) return [];
  return info.traits.map(t => ({
    type: "trait",
    name: t.name,
    system: {
      jobName:     "",
      class:       cls,
      source:      "class",
      passive:     true,
      chapter:     1,
      description: t.description,
    },
  }));
}

/**
 * Build a single trait Item for a class's Gambit. Used when the PC takes a
 * secondary job of a different class — they gain that class's Gambit per the
 * manual (e.g. "If you take a Stalwart ability as a non-Stalwart class, you
 * get Heroics …"). Tagged with `source: "gambit"` so swap-primary cleanup
 * can find and prune it.
 */
export function buildClassGambitDoc(cls) {
  cls = String(cls ?? "").toLowerCase();
  const info = CLASS_INFO[cls];
  if (!info?.gambit) return null;
  return {
    type: "trait",
    name: `${info.label} Gambit`,
    system: {
      jobName:     "",
      class:       cls,
      source:      "gambit",
      passive:     true,
      chapter:     1,
      description: info.gambit,
    },
  };
}

/**
 * Make sure a PC owns the Gambit trait of every SECONDARY class (a job whose
 * class differs from the primary job's class). Returns the docs it created.
 * Idempotent — safe to call on sheet render, level-up, job drop, migration.
 * Class names are compared case-insensitively (legacy actors stored "Wright").
 */
export async function ensureClassGambits(actor) {
  if (actor?.type !== "icon" || !actor.isOwner) return [];
  const jobs = actor.system?.combat?.jobs ?? [];
  const norm = c => String(c ?? "").toLowerCase();
  const primaryCls = norm(jobs.find(j => j.primary)?.class);
  const wanted = new Set(jobs.filter(j => !j.primary && norm(j.class) && norm(j.class) !== primaryCls).map(j => norm(j.class)));
  const docs = [];
  for (const cls of wanted) {
    const has = actor.items.some(i => i.type === "trait" && i.system?.source === "gambit" && norm(i.system?.class) === cls);
    const doc = has ? null : buildClassGambitDoc(cls);
    if (doc) docs.push(doc);
  }
  if (docs.length) {
    console.debug(`[ICON | classes] ensureClassGambits — "${actor.name}": embedding ${docs.map(d => d.name).join(", ")}`);
    return actor.createEmbeddedDocuments("Item", docs);
  }
  return [];
}
