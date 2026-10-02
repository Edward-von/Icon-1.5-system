/**
 * tracker-statuses.mjs — Statuses that the sheets now track themselves.
 *
 * A player character's Vigilance and power dice live in the combat tab
 * trackers (system.combat.classResources), so the matching statuses would
 * only be a second, disconnected count. Bonus Damage is entered in the
 * damage dialog for them. "Marked" is replaced for everyone by the marks
 * of marks.mjs, one per ability and source.
 *
 * Those statuses are therefore hidden from the pickers (token HUD palette,
 * Conditions tab) — for PCs, or for every actor in the case of Marked. Foes
 * and legends keep Vigilance, Power Die and Bonus Damage: they have no
 * tracker of their own.
 *
 * The token of a PC still shows Vigilance / Power Die: the status effect is
 * created and removed here to follow the tracker (flag `tracker`), and the
 * status panel reads the numbers from the sheet. A status still active from
 * before stays listed in the pickers so it can be cleared.
 */
import { applyStatus, removeStatus, hasStatus } from "./statuses.mjs";

const _log = (...a) => console.debug("[ICON | TrackerStatuses]", ...a);
const NS = "icon-system";

/** Hidden from every actor's pickers. */
const HIDDEN_ALWAYS = new Set(["marked"]);
/** Hidden from player characters' pickers (tracked on the sheet instead). */
const HIDDEN_FOR_PC = new Set(["vigilance", "power-die", "bonus-damage"]);
/** Statuses a PC's token mirrors from its trackers. */
export const MIRRORED_FOR_PC = new Set(["vigilance", "power-die"]);

const isPC = actor => actor?.type === "icon";

/** The status effect on `actor` for `statusId`, if any. */
function _effect(actor, statusId) {
  return actor?.effects?.find(e => e.statuses?.has(statusId) || e.getFlag("core", "statusId") === statusId) ?? null;
}

/**
 * Should `statusId` be left out of this actor's status pickers?
 * A status still applied the old way (not by the tracker) stays visible, so
 * it can be removed by hand.
 */
export function isHiddenStatus(actor, statusId) {
  const hidden = HIDDEN_ALWAYS.has(statusId) || (isPC(actor) && HIDDEN_FOR_PC.has(statusId));
  if (!hidden) return false;
  const effect = _effect(actor, statusId);
  return !effect || !!effect.getFlag(NS, "tracker");
}

/** Filter a list of status definitions ({ id, … }) for an actor's picker. */
export function visibleStatuses(actor, list) {
  return list.filter(s => !isHiddenStatus(actor, s.id));
}

/** What a PC's trackers say: { vigilance, dice[] }. */
export function pcTrackerValues(actor) {
  const cr = actor?.system?.combat?.classResources ?? {};
  return { vigilance: Number(cr.vigilance?.value ?? 0), dice: cr.powerDice ?? [] };
}

/**
 * Create or remove a PC's Vigilance / Power Die status so the token shows
 * what the trackers hold. Safe to call any time; no-op for other actors.
 */
export async function syncTrackerStatuses(actor) {
  if (!isPC(actor) || !actor.isOwner) return;
  const { vigilance, dice } = pcTrackerValues(actor);
  const want = { "vigilance": vigilance > 0, "power-die": dice.length > 0 };
  for (const [id, on] of Object.entries(want)) {
    const has = hasStatus(actor, id);
    if (on && !has) {
      await applyStatus(actor, id, false, { flags: { tracker: true } });
      _log(`"${actor.name}" — ${id} shown on the token (tracker)`);
    } else if (!on && has && _effect(actor, id)?.getFlag(NS, "tracker")) {
      await removeStatus(actor, id);
      _log(`"${actor.name}" — ${id} cleared from the token (tracker empty)`);
    }
  }
}

/**
 * "Gain vigilance" on a PC (ability card Gain button): +1 charge on the
 * Stalwart tracker instead of a separate status. Returns the new value.
 */
export async function gainPcVigilance(actor, amount = 1) {
  const v   = actor.system.combat.classResources.vigilance;
  const max = Number(v?.max ?? 6) || 6;
  const next = Math.min(max, Number(v?.value ?? 0) + amount);
  await actor.update({ "system.combat.classResources.vigilance.value": next });
  return next;
}

/** Hooks: follow tracker changes, hide the statuses from the token HUD palette. */
export function registerTrackerStatuses() {
  Hooks.on("updateActor", (actor, changes, _options, userId) => {
    if (userId !== game.user.id || !isPC(actor)) return;
    if (!foundry.utils.hasProperty(changes, "system.combat.classResources")) return;
    syncTrackerStatuses(actor).catch(err => console.warn("[ICON | TrackerStatuses] sync failed", err));
  });

  // Core token HUD: the status palette lists every CONFIG.statusEffects entry.
  Hooks.on("renderTokenHUD", (hud, html) => {
    const root  = html instanceof HTMLElement ? html : html?.[0];
    const actor = hud?.object?.actor;
    if (!root || !actor) return;
    for (const el of root.querySelectorAll("[data-status-id]")) {
      if (isHiddenStatus(actor, el.dataset.statusId)) el.remove();
    }
  });
}
