/**
 * class-resources.mjs — Class resources that tick on their own during combat.
 *
 *   Stalwart  Fortify: "Gain Vigilance +1 at the end of your turn" (p.116),
 *             up to 6 charges (p.117).
 *   Wright    Aether: "They passively gain 1 at the start of their turn,
 *             starting with 0" (p.204), up to 6 (a d6 power die). The Wright
 *             Gambit gives Aether to a non-Wright too (p.204).
 *
 * Called by the active GM from the updateCombat hook (IconCombat.mjs), only
 * for player characters. The end-of-combat reset is in IconCombat#endCombat.
 */

const _log = (...a) => console.debug("[ICON | ClassResources]", ...a);

/** Class of the actor's primary job ("stalwart", "wright", ...), or "". */
function primaryClass(actor) {
  const jobs = actor?.system?.combat?.jobs ?? [];
  const primary = jobs.find(j => j.primary) ?? (jobs.length === 1 ? jobs[0] : null);
  return String(primary?.class ?? "").toLowerCase();
}

const hasTrait = (actor, re) => actor.items.some(i => i.type === "trait" && re.test(i.name ?? ""));

/** A Stalwart (or anyone with the Fortify trait). */
const hasFortify = (actor) => primaryClass(actor) === "stalwart" || hasTrait(actor, /^fortify$/i);

/** A Wright, or a character with the Wright Gambit (Aether and Chain Reaction, p.204). */
const gathersAether = (actor) => primaryClass(actor) === "wright" || hasTrait(actor, /^wright gambit$/i);

/** Start of a PC's turn: Wrights gain 1 Aether. */
export async function classTurnStart(actor) {
  if (actor?.type !== "icon" || !gathersAether(actor)) return;
  const cur = actor.system.combat?.classResources?.aether?.value ?? 0;
  const next = Math.min(CONFIG.ICON.rules.aetherMax, cur + 1);
  if (next === cur) return;
  _log(`${actor.name}: Aether ${cur} → ${next} (start of turn, p.204)`);
  await actor.update({ "system.combat.classResources.aether.value": next });
}

/** End of a PC's turn: Fortify gives 1 Vigilance. */
export async function classTurnEnd(actor) {
  if (actor?.type !== "icon" || !hasFortify(actor)) return;
  const vig = actor.system.combat?.classResources?.vigilance ?? {};
  const cur = vig.value ?? 0;
  const next = Math.min(vig.max ?? 6, cur + 1);
  if (next === cur) return;
  _log(`${actor.name}: Vigilance ${cur} → ${next} (Fortify, end of turn, p.116)`);
  await actor.update({ "system.combat.classResources.vigilance.value": next });
}
