/**
 * status-modifiers.mjs — Maps ICON status effects to their roll-time modifiers.
 *
 * Used by combatRoll and damageRoll prompts to pre-fill the boon/curse fields
 * and show a transparent breakdown ("Dazed: +1 curse on attacks").
 *
 * Sources: ICON 1.5 manual pp. 103–105.
 */

import { ICON_STATUSES } from "./statuses.mjs";

/**
 * Per-status modifier definitions. Only includes statuses that have a
 * mechanical effect on rolls or damage. Status effects that affect movement,
 * targeting, or interrupts (Blind = max range 2, Stunned = no interrupts,
 * Sealed = can't inflict statuses, etc.) are not in this table because they
 * don't change a die roll directly.
 *
 * Schema:
 *   attackCurses     — d6 curses added to attack rolls
 *   attackBoons      — d6 boons added to attack rolls
 *   damageBonus      — flat add/subtract on damage dealt
 *   damageMult       — multiplier on damage dealt (e.g. 0.5 = half)
 *   damageTakenBonus — flat add to damage taken
 *   note             — short human-readable label shown in the prompt
 */
export const STATUS_ROLL_MODIFIERS = {
  dazed:      { attackCurses: 1,   note: "Dazed: +1 curse on attacks" },
  weakened:   { damageBonus: -2,   note: "Weakened: −2 damage dealt" },
  pacified:   { damageMult:  0.5,  note: "Pacified: damage halved" },
  vulnerable: { damageTakenBonus: 1, note: "Vulnerable: +1 damage taken" },
};

/**
 * Read all active statuses on an actor and aggregate their roll modifiers.
 * Returns an object with totals plus a `notes` array of human-readable lines.
 */
export function getActorStatusMods(actor) {
  const out = {
    boons: 0,
    curses: 0,
    damageBonus: 0,
    damageMult: 1,
    damageTakenBonus: 0,
    notes: [],
  };
  if (!actor?.statuses) return out;

  for (const [id, mod] of Object.entries(STATUS_ROLL_MODIFIERS)) {
    if (!actor.statuses.has(id)) continue;
    if (mod.attackCurses)     out.curses           += mod.attackCurses;
    if (mod.attackBoons)      out.boons            += mod.attackBoons;
    if (mod.damageBonus)      out.damageBonus      += mod.damageBonus;
    if (mod.damageTakenBonus) out.damageTakenBonus += mod.damageTakenBonus;
    if (mod.damageMult != null) out.damageMult *= mod.damageMult;
    if (mod.note) out.notes.push(mod.note);
  }
  return out;
}

/**
 * Group all ICON statuses for the Conditions tab UI.
 * Returns three arrays: negative, positive, special.
 * Each entry: { id, name, img, hasModifier (bool — for the "auto" badge) }.
 */
export function groupStatusesForUI() {
  const groups = { negative: [], positive: [], special: [] };
  for (const s of ICON_STATUSES) {
    const entry = {
      id: s.id,
      name: s.name,
      img: s.img,
      hasModifier: !!STATUS_ROLL_MODIFIERS[s.id],
    };
    if (s.isSpecial)   groups.special.push(entry);
    else if (s.isBoon) groups.positive.push(entry);
    else               groups.negative.push(entry);
  }
  return groups;
}
