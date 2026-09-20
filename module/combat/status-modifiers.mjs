/**
 * status-modifiers.mjs — Maps ICON status effects to their roll-time modifiers.
 *
 * Used by combatRoll and damageRoll prompts to pre-fill the boon/curse fields
 * and show a transparent breakdown ("Dazed: +1 curse on attacks").
 *
 * Two sources feed those fields: the statuses on the actor, and the boons an
 * ability carries in its own tag line (p.12: "many character abilities will
 * give boons built in" — Strafe Shot is "1 action, Attack, Range 3, +1 boon").
 *
 * Sources: ICON 1.5 manual pp. 103–105, boons/curses p.12.
 */

import { ICON_STATUSES } from "./statuses.mjs";
import { tagKey } from "./defenses.mjs";

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

/* -------------------------------------------------- */
/*  Boons / curses written into an ability's tags      */
/* -------------------------------------------------- */

// The packs spell them two ways: "+1-boon" on the job abilities, "boon-1" /
// "curse-2" on foes, legends and the foe-ability library.
const TAG_N_FIRST = /^\+?(\d+)-(boons?|curses?)$/;
const TAG_N_LAST  = /^(boons?|curses?)-(\d+)$/;

/**
 * Boons and curses an ability grants itself through its tags (p.12).
 * Accepts raw strings or the {raw,label} chips resolveAbilityTags returns, so
 * a talent that adds "+1 boon" is picked up once its tags are resolved.
 * @returns {{boons:number, curses:number, notes:string[]}}
 */
export function getTagRollMods(tags) {
  const out = { boons: 0, curses: 0, notes: [] };
  for (const tag of Array.isArray(tags) ? tags : []) {
    const key = tagKey(tag);
    const first = TAG_N_FIRST.exec(key);
    const last  = first ? null : TAG_N_LAST.exec(key);
    const kind  = first ? first[2] : last?.[1];
    const n     = Number(first ? first[1] : last?.[2]);
    if (!kind || !Number.isFinite(n) || n <= 0) continue;
    if (kind.startsWith("boon")) out.boons += n; else out.curses += n;
  }
  const label = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;
  if (out.boons)  out.notes.push(`This ability: +${label(out.boons, "boon")} (tag)`);
  if (out.curses) out.notes.push(`This ability: +${label(out.curses, "curse")} (tag)`);
  return out;
}
