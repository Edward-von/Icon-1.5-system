/**
 * advancement.mjs — Level progression table for ICON PCs.
 * Source: ICON 1.5 rulebook p. 241 — Character Advancement table.
 *
 * Keys = the level you're leveling UP TO (so LEVEL_BENEFITS[1] = benefits gained
 * when going from 0 → 1).
 *
 * Per-level benefit schema:
 *   combat: {
 *     ap?:           number,   // AP gained
 *     masteryPoint?: number,   // mastery points gained
 *     limitBreak?:   boolean,  // unlock limit break
 *     relic?:        boolean,  // gain a relic slot
 *     relicNumber?:  1|2|3,    // which relic (for display)
 *     jobChoice?:    boolean,  // L4 / L8: new job (+2 AP) OR mastery point
 *   }
 *   narrative: {
 *     bondPowers?:         number,   // how many bond powers to pick
 *     actionImprovements?: number,   // how many +1 action dots to spend
 *     bondPowerOrActions?: boolean,  // L4 / L8: 1 bond power OR +1 to 2 actions
 *   }
 */
export const LEVEL_BENEFITS = {
  1:  { combat: { ap: 2, limitBreak: true },                 narrative: { bondPowers: 1, actionImprovements: 1 } },
  2:  { combat: { relic: true, relicNumber: 1 },             narrative: { bondPowers: 1, actionImprovements: 1 } },
  3:  { combat: { masteryPoint: 1 },                         narrative: { bondPowers: 1 } },
  4:  { combat: { jobChoice: true },                         narrative: { bondPowerOrActions: true } },
  5:  { combat: { ap: 1 },                                   narrative: { actionImprovements: 1 } },
  6:  { combat: { relic: true, relicNumber: 2 },             narrative: { bondPowers: 1 } },
  7:  { combat: { masteryPoint: 1 },                         narrative: { actionImprovements: 1 } },
  8:  { combat: { jobChoice: true },                         narrative: { bondPowerOrActions: true } },
  9:  { combat: { relic: true, relicNumber: 3 },             narrative: { bondPowers: 1 } },
  10: { combat: { masteryPoint: 1 },                         narrative: { actionImprovements: 1 } },
  11: { combat: { ap: 1 },                                   narrative: { actionImprovements: 1 } },
  12: { combat: { masteryPoint: 1 },                         narrative: { bondPowers: 1 } },
};

/** Chapter 1 = L1-4, Chapter 2 = L5-8, Chapter 3 = L9-12. */
export function chapterForLevel(level) {
  if (level <= 4) return 1;
  if (level <= 8) return 2;
  return 3;
}

/** Highest level allowed within a chapter (4, 8, or 12). */
export function chapterCap(chapter) {
  if (chapter <= 1) return 4;
  if (chapter === 2) return 8;
  return 12;
}

/** Max equipped abilities per expedition. */
export const MAX_EQUIPPED_ABILITIES = 6;

/** Number of xp ticks required to bank a level-up. */
export const XP_PER_LEVEL = 15;
