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

/**
 * AP a character has already spent: one per ability they know, one more for
 * each ability whose talent is unlocked. The same sum the Notes tab shows as
 * "Spent N / M", used by the level-up dialog to know what is still banked.
 * @param {Actor} actor
 * @returns {{ abilities: number, talents: number, spent: number, total: number, free: number }}
 */
export function apBudget(actor) {
  const abilities = (actor?.items ?? []).filter(i => i.type === "ability");
  const talents   = abilities.filter(a => (a.system?.talentSelected ?? 0) > 0).length;
  const spent     = abilities.length + talents;
  const total     = actor?.system?.combat?.apTotal ?? 0;
  return { abilities: abilities.length, talents, spent, total, free: Math.max(0, total - spent) };
}

/**
 * The AP total this system has granted a character by the time they reached
 * their current level, rebuilt from the things that grant AP:
 *   2   the character creation wizard's pair, which pre-pays the two starting
 *       abilities of level 0 (p.241) — the sheet charges 1 AP per ability known
 *   +   the advancement table on p.241 (LEVEL_BENEFITS): +2 at level 1,
 *       +1 at level 5, +1 at level 11
 *   +   2 for every extra job, i.e. each level 4 / 8 fork where the player took
 *       "a new job and two bonus ap" rather than the mastery point
 *   +   the halfway ability point of every level already completed (levels
 *       1..L-1), plus the current level's once it has been claimed. The book
 *       gives it "at level 1 and higher" (p.112), so level 0 contributes none.
 *
 * It is a reconstruction, not a record: a character whose level was set by
 * hand, or who was handed AP as a reward, will legitimately not match. Use it
 * to spot a total that is off, never to overwrite one silently.
 * @param {Actor} actor
 * @returns {number}
 */
export function expectedApTotal(actor) {
  const c = actor?.system?.combat ?? {};
  const level = c.level ?? 0;
  let ap = 2;
  for (let l = 1; l <= level; l++) ap += LEVEL_BENEFITS[l]?.combat?.ap ?? 0;
  ap += 2 * Math.max(0, (c.jobs ?? []).length - 1);
  ap += Math.max(0, level - 1);
  if (actor?.system?.narrative?.xp?.halfwayBonusClaimed ?? false) ap += 1;
  return ap;
}

/** Action dots every character starts with: the bond's +2 and the 4 to spread (p.46, p.241). */
export const STARTING_ACTION_DOTS = 6;

/**
 * Action improvements the advancement table has granted a character by their
 * current level — the level-up half of the Skill Rank pool, without the six
 * of character creation.
 *
 * Levels 4 and 8 offer "a Bond power OR improve two actions" (p.241), so the
 * count is not fixed by level alone. The choice leaves a trace: a bond power
 * taken at the fork is an extra `bond-power` item on the sheet, over the one
 * from creation (p.46) and the ones the table hands out outright. Counting
 * those tells us which way each fork went; anything that does not add up is
 * read as "the fork went to actions", which is the larger pool and so never
 * accuses the player of overspending on our own guess.
 * @param {Actor} actor
 * @returns {number}
 */
export function expectedSkillRanksFromLevels(actor) {
  const level = actor?.system?.combat?.level ?? 0;
  let improvements = 0, bondPowers = 0, forks = 0;
  for (let l = 1; l <= level; l++) {
    const n = LEVEL_BENEFITS[l]?.narrative ?? {};
    improvements += n.actionImprovements ?? 0;
    bondPowers   += n.bondPowers ?? 0;
    if (n.bondPowerOrActions) forks += 1;
  }
  const owned = (actor?.items ?? []).filter(i => i.type === "bond-power").length;
  const extra = owned - 1 - bondPowers;             // -1: the one from creation
  const forksAsBondPower = Math.min(Math.max(extra, 0), forks);
  return improvements + 2 * (forks - forksAsBondPower);
}

/**
 * Build a plain-text summary of the gear kits belonging to a bond (plus the
 * shared Adventurer's Kit) from the gear-kits compendium. Used by the bond
 * drop handler and the character-creation wizard to list a new character's
 * baseline equipment options in the Notes tab. Returns "" when the pack is
 * missing or has no kits for that bond.
 */
export async function buildBondKitsNote(bondName) {
  const pack = game.packs.get("icon-system.gear-kits");
  if (!pack) return "";
  let docs;
  try { docs = await pack.getDocuments(); } catch { return ""; }
  const forBond = docs.filter(d =>
    (d.system?.bondName ?? "").toLowerCase() === String(bondName ?? "").toLowerCase() ||
    d.system?.isAdventurersKit);
  if (!forBond.length) return "";
  const lines = forBond.map(d => {
    const items = Array.isArray(d.system?.items) ? d.system.items.filter(Boolean) : [];
    return `• ${d.name}${items.length ? `: ${items.join(", ")}` : ""}`;
  });
  return `Kits (${bondName}) — drop one on the sheet to equip it:\n${lines.join("\n")}`;
}
