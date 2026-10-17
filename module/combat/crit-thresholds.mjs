/**
 * crit-thresholds.mjs — the total an attack roll needs to crit and to exceed.
 *
 * By default a crit is a total of 20+ and an exceed 15+ (p.94). Some effects
 * move those numbers:
 *
 *   • Soulfire (Enochian trait, p.208): "Comeback: Your threshold to critical
 *     hit becomes 18+, and your threshold to exceed becomes 13+. If you're at
 *     1 hp, these thresholds are reduced to 15+ and 10+." Comeback = bloodied.
 *   • Arenheir III (relic, p.252): "Your threshold for exceed and critical hits
 *     is decreased by 1, and decreases again by 1 at round 3 and 5."
 *   • Arenheir Aspected: "When you score a critical hit, reduce the threshold
 *     for critical hits by 1. This cannot reduce it lower than 15+." The crits
 *     scored in the current combat are counted on the relic item as the flag
 *     `icon-system.arenheirCrits = { combatId, count }`.
 *
 * Combination (the book doesn't spell it out; simplest reading): Soulfire sets
 * the starting value, Arenheir III subtracts from it, the Aspect then lowers
 * the crit threshold by its count but never below 15+ (when it's already 15 or
 * less, the Aspect adds nothing).
 *
 * The attack dialog shows the result and lets the player change it by hand.
 */

import { unlockedRelics, currentRound } from "./relic-reminders.mjs";

const _log = (...a) => console.debug("[ICON | crit-thresholds]", ...a);

export const BASE_CRIT   = 20;
export const BASE_EXCEED = 15;
const ASPECT_FLOOR = 15;
const FLAG = "arenheirCrits";

function _arenheir(actor) {
  return unlockedRelics(actor).find(r => r.key === "arenheir") ?? null;
}

function _combatId(actor) {
  return currentRound(actor) ? game.combat.id : null;
}

/** Crits scored in the current combat that count for the Arenheir Aspect. */
function _aspectCrits(relic, combatId) {
  if (!relic || !combatId) return 0;
  const f = relic.item.getFlag?.("icon-system", FLAG) ?? null;
  return f?.combatId === combatId ? Number(f.count) || 0 : 0;
}

/**
 * @param {Actor} actor  the attacker
 * @returns {{ crit:number, exceed:number, sources:string[] }}
 */
export function attackThresholds(actor) {
  let crit = BASE_CRIT, exceed = BASE_EXCEED;
  const sources = [];
  if (!actor || actor.type !== "icon") return { crit, exceed, sources };

  // Soulfire (Comeback = bloodied).
  const soulfire = actor.items.some(i => i.type === "trait" && String(i.name ?? "").trim().toLowerCase() === "soulfire");
  const hp = actor.system?.combat?.hp ?? {};
  const hpValue = Number(hp.value ?? 0);
  if (soulfire && hp.bloodied != null && hpValue <= Number(hp.bloodied)) {
    if (hpValue === 1) { crit = 15; exceed = 10; sources.push("Soulfire (1 hp): crit 15+, exceed 10+"); }
    else               { crit = 18; exceed = 13; sources.push("Soulfire (bloodied): crit 18+, exceed 13+"); }
  }

  const relic = _arenheir(actor);
  if (relic && relic.rank >= 3) {
    const round = currentRound(actor);
    const n = 1 + (round >= 3 ? 1 : 0) + (round >= 5 ? 1 : 0);
    crit -= n; exceed -= n;
    sources.push(`${relic.name} III${round ? ` (round ${round})` : ""}: −${n}`);
  }
  if (relic && relic.rank >= 4) {
    const count = _aspectCrits(relic, _combatId(actor));
    if (count > 0 && crit > ASPECT_FLOOR) {
      const lowered = Math.max(ASPECT_FLOOR, crit - count);
      sources.push(`${relic.name} Aspect (${count} crit${count > 1 ? "s" : ""} this combat): crit −${crit - lowered}, not below ${ASPECT_FLOOR}+`);
      crit = lowered;
    }
  }

  crit = Math.max(1, crit);
  exceed = Math.max(1, exceed);
  return { crit, exceed, sources };
}

/**
 * After a critical hit: the Arenheir Aspect lowers the crit threshold of the
 * next attacks by 1 (counted per combat on the relic item). No-op outside a
 * combat or without the unlocked Aspect.
 */
export async function noteCriticalHit(actor) {
  const relic = _arenheir(actor);
  if (!relic || relic.rank < 4) return;
  const combatId = _combatId(actor);
  if (!combatId) return;
  const count = _aspectCrits(relic, combatId) + 1;
  try {
    await relic.item.setFlag("icon-system", FLAG, { combatId, count });
    _log(`${actor.name}: Arenheir Aspect crits this combat = ${count}`);
  } catch (err) { console.warn("[ICON | crit-thresholds] could not count the crit", err); }
}
