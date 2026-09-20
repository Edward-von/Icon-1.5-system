/**
 * statuses.mjs — Status effect definitions, registration, and save automation.
 *
 * ICON status rules:
 *  • Regular statuses: save at end of own turn (d20 10+ clears)
 *  • Ongoing (+) statuses: cannot be saved against; require source removal
 *  • Bloodied / Immobile / Incapacitated are special states (not saveable)
 */

import { saveRoll } from "../dice/rolls.mjs";
import { escapeHTML } from "../helpers/enrich.mjs";
import { promptHatredTarget, applyHatred, endHatred } from "./marks.mjs";
import { askOwner, registerPromptResponder } from "./remote-prompt.mjs";

/* ================================================== */
/*  Status definitions                                 */
/* ================================================== */

const ICON_STATUSES_BASE = "systems/icon-system/assets/statuses";

/**
 * Full list of ICON status effects to register in CONFIG.statusEffects.
 * `canSave`  — clearable via end-of-turn save
 * `ongoing`  — if true, cannot be saved (until source removed)
 * `isBoon`   — positive effect
 * `isSpecial`— bloodied / incapacitated / immobile (not saved normally)
 */
export const ICON_STATUSES = [
  // ---- Negative ----
  { id: "slashed",       name: "Slashed",       img: `${ICON_STATUSES_BASE}/slashed.svg`,      canSave: true,  ongoing: false },
  { id: "blind",         name: "Blind",         img: `${ICON_STATUSES_BASE}/blind.svg`,        canSave: true,  ongoing: false },
  { id: "dazed",         name: "Dazed",         img: `${ICON_STATUSES_BASE}/dazed.svg`,        canSave: true,  ongoing: false },
  // Hatred is always "of X" (marks.mjs): it ends at the end of the actor's own
  // turn (p.104) instead of being saved against.
  { id: "hatred",        name: "Hatred",        img: `${ICON_STATUSES_BASE}/hatred.svg`,       canSave: false, ongoing: false },
  { id: "pacified",      name: "Pacified",      img: `${ICON_STATUSES_BASE}/pacified.svg`,     canSave: true,  ongoing: false },
  { id: "sealed",        name: "Sealed",        img: `${ICON_STATUSES_BASE}/sealed.svg`,       canSave: true,  ongoing: false },
  { id: "shattered",     name: "Shattered",     img: `${ICON_STATUSES_BASE}/shattered.svg`,    canSave: true,  ongoing: false },
  { id: "stunned",       name: "Stunned",       img: `${ICON_STATUSES_BASE}/stunned.svg`,      canSave: true,  ongoing: false },
  { id: "weakened",      name: "Weakened",      img: `${ICON_STATUSES_BASE}/weakened.svg`,     canSave: true,  ongoing: false },
  { id: "vulnerable",    name: "Vulnerable",    img: `${ICON_STATUSES_BASE}/vulnerable.svg`,   canSave: true,  ongoing: false },
  { id: "immobile",      name: "Immobile",      img: `${ICON_STATUSES_BASE}/immobile.svg`,     canSave: true,  ongoing: false },
  // Marked has no end-of-turn save: each mark ability defines its own removal
  // condition, so it stays until manually cleared. Stackable so multiple marks
  // from different sources show as Marked: 1/2/3.
  { id: "marked",        name: "Marked",        img: `${ICON_STATUSES_BASE}/marked.svg`,       canSave: false, ongoing: false },
  // ---- Positive ----
  { id: "counter",       name: "Counter",       img: `${ICON_STATUSES_BASE}/counter.svg`,      canSave: false, isBoon: true },
  { id: "defiance",      name: "Defiance",      img: `${ICON_STATUSES_BASE}/defiance.svg`,     canSave: false, isBoon: true },
  { id: "divine",        name: "Divine",        img: `${ICON_STATUSES_BASE}/divine.svg`,       canSave: false, isBoon: true },
  { id: "dodge",         name: "Dodge",         img: `${ICON_STATUSES_BASE}/dodge.svg`,        canSave: false, isBoon: true },
  { id: "evasion",       name: "Evasion",       img: `${ICON_STATUSES_BASE}/evasion.svg`,      canSave: false, isBoon: true },
  { id: "flying",        name: "Flying",        img: `${ICON_STATUSES_BASE}/flying.svg`,       canSave: false, isBoon: true },
  { id: "intangible",    name: "Intangible",    img: `${ICON_STATUSES_BASE}/intangible.svg`,   canSave: false, isBoon: true },
  { id: "phasing",       name: "Phasing",       img: `${ICON_STATUSES_BASE}/phasing.svg`,      canSave: false, isBoon: true },
  { id: "pierce",        name: "Pierce",        img: `${ICON_STATUSES_BASE}/pierce.svg`,       canSave: false, isBoon: true },
  { id: "rampart",       name: "Rampart",       img: `${ICON_STATUSES_BASE}/rampart.svg`,      canSave: false, isBoon: true },
  { id: "regeneration",  name: "Regeneration",  img: `${ICON_STATUSES_BASE}/regeneration.svg`, canSave: false, isBoon: true },
  { id: "skirmisher",    name: "Skirmisher",    img: `${ICON_STATUSES_BASE}/skirmisher.svg`,   canSave: false, isBoon: true },
  { id: "stealth",       name: "Stealth",       img: `${ICON_STATUSES_BASE}/stealth.svg`,      canSave: false, isBoon: true },
  { id: "sturdy",        name: "Sturdy",        img: `${ICON_STATUSES_BASE}/sturdy.svg`,       canSave: false, isBoon: true },
  { id: "true-strike",   name: "True Strike",   img: `${ICON_STATUSES_BASE}/true-strike.svg`,  canSave: false, isBoon: true },
  { id: "unerring",      name: "Unerring",      img: `${ICON_STATUSES_BASE}/unerring.svg`,     canSave: false, isBoon: true },
  { id: "unstoppable",   name: "Unstoppable",   img: `${ICON_STATUSES_BASE}/unstoppable.svg`,  canSave: false, isBoon: true },
  { id: "vigilance",     name: "Vigilance",     img: `${ICON_STATUSES_BASE}/vigilance.svg`,    canSave: false, isBoon: true },
  { id: "vigor",         name: "Vigor",         img: `${ICON_STATUSES_BASE}/vigor.svg`,        canSave: false, isBoon: true },
  { id: "blessed",       name: "Blessed",       img: `${ICON_STATUSES_BASE}/blessed.svg`,      canSave: false, isBoon: true },
  { id: "power-die",     name: "Power Die",     img: `${ICON_STATUSES_BASE}/power-die.svg`,    canSave: false, isBoon: true },
  { id: "bonus-damage",  name: "Bonus Damage",  img: `${ICON_STATUSES_BASE}/bonus-damage.svg`, canSave: false, isBoon: true },
  // ---- Special states ----
  { id: "bloodied",      name: "Bloodied",      img: `${ICON_STATUSES_BASE}/bloodied.svg`,     canSave: false, isSpecial: true },
  { id: "incapacitated", name: "Incapacitated", img: `${ICON_STATUSES_BASE}/incapacitated.svg`,canSave: false, isSpecial: true },
  { id: "cover",         name: "Cover",         img: `${ICON_STATUSES_BASE}/cover.svg`,        canSave: false, isSpecial: true },
  { id: "resistance",    name: "Resistance",    img: `${ICON_STATUSES_BASE}/resistance.svg`,   canSave: false, isSpecial: true },
  { id: "elevation",     name: "Elevation",     img: `${ICON_STATUSES_BASE}/elevation.svg`,    canSave: false, isSpecial: true },
];

/**
 * Register all ICON statuses in CONFIG.statusEffects.
 *
 * REPLACES the default Foundry statusEffects array entirely — the core
 * D&D-style defaults (bleeding, frightened, prone, poisoned, …) don't map
 * to ICON mechanics and would clutter the token effect picker. Only ICON's
 * canonical effects remain.
 *
 * We also remap `CONFIG.specialStatusEffects` so Foundry's internal hooks
 * (auto-apply on 0 HP, visibility test, etc.) still resolve to valid IDs.
 */
export function registerStatuses() {
  CONFIG.statusEffects = ICON_STATUSES.map(s => ({
    id:   s.id,
    name: s.name,
    img:  s.img,
    flags: {
      "icon-system": {
        isStatus:  true,
        canSave:   s.canSave   ?? false,
        ongoing:   s.ongoing   ?? false,
        isBoon:    s.isBoon    ?? false,
        isSpecial: s.isSpecial ?? false,
      },
    },
  }));

  // Remap Foundry's "special" status keys to ICON equivalents so core code
  // paths that look up DEFEATED / BLIND / INVISIBLE by key still resolve.
  // Anything we don't have an ICON analogue for is cleared to null so core
  // doesn't try to apply a non-existent status.
  CONFIG.specialStatusEffects = {
    ...(CONFIG.specialStatusEffects ?? {}),
    DEFEATED:  "incapacitated",   // 0 HP → incapacitated (ICON equivalent)
    BLIND:     "blind",
    INVISIBLE: "stealth",         // closest ICON match
    BURROW:    null,
    FLY:       "flying",
    HOVER:     "flying",
    BURNING:   null,
    FROZEN:    null,
    SLEEP:     "stunned",
    PARALYSIS: "stunned",
    SILENCE:   "sealed",
    RESTRAIN:  "immobile",
  };
}

/* ================================================== */
/*  Save automation hook handler                       */
/* ================================================== */

/**
 * Called at the end of a combatant's turn.
 * Rolls saves for all clearable (non-ongoing) status effects.
 *
 * @param {Combatant} combatant  The combatant who just ended their turn
 */
/** The "spend a Blessed charge?" dialog, shown on whichever client asks. */
function blessingDialog({ actorName, statusLabel, blessings }) {
  return foundry.applications.api.DialogV2.confirm({
    window:  { title: `Save vs ${statusLabel}` },
    content: `<p><strong>${escapeHTML(actorName)}</strong> is rolling a save vs <strong>${escapeHTML(statusLabel)}</strong>.</p>
              <p>Spend a Blessed charge for <strong>+1 boon</strong>? You have <strong>${blessings}</strong>.</p>`,
    modal: true,
    rejectClose: false,
  });
}

/** The owner's answer to "spend a Blessed charge?", or our own when they can't. */
async function askBlessing(actor, statusLabel, blessings) {
  const payload = { actorName: actor.name, statusLabel, blessings };
  const remote = await askOwner(actor, {
    kind: "blessing", payload,
    waitingNote: `${actor.name} saves vs ${statusLabel} — waiting for their player to answer about the Blessed charge…`,
  });
  if (remote.answered) return !!remote.result;
  try { return !!(await blessingDialog(payload)); }
  catch { return false; }                       // dismissed → no blessing
}

// The player's side of the question above.
registerPromptResponder("blessing", async (payload) => {
  try { return !!(await blessingDialog(payload)); }
  catch { return false; }
});

/**
 * The active statuses a character can still save against (p.94): negative,
 * flagged saveable, and not the ongoing "+" version — those hold until their
 * source is gone. Shared by the end-of-turn saves and the save buttons on the
 * Conditions tab of every sheet.
 * @param {Actor} actor
 * @returns {ActiveEffect[]}
 */
export function saveableStatusEffects(actor) {
  return (actor?.effects ?? []).filter(effect => {
    const f = effect.flags?.["icon-system"];
    return !!f?.isStatus && !f.isBoon && !f.isSpecial && !!f.canSave && !f.ongoing;
  });
}

export async function rollEndOfTurnSaves(combatant) {
  const actor = combatant.actor;
  if (!actor) return;

  // Hatred of X ends at the end of the hater's turn (p.104) — no save.
  try { await endHatred(actor, "end of turn"); }
  catch (err) { console.warn("[ICON | statuses] could not end Hatred", err); }

  // Saves apply ONLY to negative statuses. Positive effects (isBoon — Defiance,
  // Regeneration, Dodge, …) and special states (isSpecial — Bloodied, Cover,
  // Resistance, …) are never saved against, so they're excluded outright.
  const isNegativeStatus = (iconFlags) =>
    iconFlags?.isStatus && !iconFlags.isBoon && !iconFlags.isSpecial;

  // Collect active negative status effects that are saveable
  const saveableEffects = saveableStatusEffects(actor);

  // Also log ongoing+ negative statuses so players know they can't save
  const ongoingEffects = actor.effects.filter(effect => {
    const iconFlags = effect.flags?.["icon-system"];
    return isNegativeStatus(iconFlags) && iconFlags.ongoing;
  });

  for (const effect of ongoingEffects) {
    const statusLabel = effect.name;
    await saveRoll({ statusLabel, ongoing: true, actor });
  }

  for (const effect of saveableEffects) {
    const statusLabel = effect.name;
    // If the actor has Blessed charges, prompt before each save: spend one
    // for +1 boon? Re-read the count each loop because a previous save may
    // have already consumed some.
    let boons = 0;
    let boonNote = "";
    const blessings = getStatusCharges(actor, "blessed");
    if (blessings > 0) {
      // These saves are resolved on the GM's client (the combat hook is
      // GM-only), but the Blessed charge belongs to the character: ask their
      // player first and only fall back to a local dialog when nobody owns
      // them, they're offline, or they don't answer.
      const useBlessing = await askBlessing(actor, statusLabel, blessings);
      if (useBlessing) {
        boons = 1;
        boonNote = "blessing";
        // Consume one charge — auto-removes the Blessed effect at 0
        await adjustStatusCharges(actor, "blessed", -1);
      }
    }

    const { success } = await saveRoll({ statusLabel, ongoing: false, boons, boonNote, actor });
    if (success) {
      await effect.delete();
    }
  }
}

/* ================================================== */
/*  Regeneration hook handler                          */
/* ================================================== */

/**
 * Called at the END of a combatant's turn (alongside the status saves).
 * ICON rule (Regeneration): "if Bloodied, gain 4 Vigor at the end of your turn."
 * Works for EVERY actor type — PCs keep HP at system.combat.hp; foes, legends
 * and summons keep it at system.hp. (Previously this only handled PCs, and ran
 * at the start of the turn instead of the end.)
 */
export async function applyEndOfTurnEffects(combatant) {
  const actor = combatant?.actor;
  if (!actor) return;
  if (!hasStatus(actor, "regeneration")) return;

  // HP lives at system.combat.hp (PCs) or system.hp (foes/legends/summons).
  const hp = actor.system?.combat?.hp ?? actor.system?.hp;
  if (!hp || hp.value == null) return;   // no HP track (e.g. intangible summon)

  const threshold = hp.bloodied ?? Math.ceil((hp.max ?? 0) / 2);
  if (hp.value > threshold) return;      // not bloodied → no regeneration

  // import dynamically to avoid circular dep. addVigor caps at the actor's VIT
  // and no-ops for actors without a vigor track.
  const { addVigor } = await import("./damage.mjs");
  const regen = CONFIG.ICON?.rules?.regenerationVigor ?? 4;
  await addVigor(actor, regen);
  const speaker = ChatMessage.getSpeaker({ actor });
  await ChatMessage.create({
    speaker,
    content: `<div class="icon-chat-card"><strong>${escapeHTML(actor.name)}</strong> regenerates ${regen} Vigor (bloodied).</div>`,
  });
}

/* ================================================== */
/*  Utility: check status on actor                     */
/* ================================================== */

export function hasStatus(actor, statusId) {
  return actor.statuses?.has(statusId)
    ?? actor.effects.some(e =>
      e.statuses?.has(statusId) || e.getFlag("core", "statusId") === statusId
    );
}

/* --------------------------------------------------
 * Per-actor mutation lock.
 *
 * Status mutations read state (hasStatus / charge flags) and then write it
 * in a separate await. Two rapid calls — double-click, or two automation
 * hooks firing in the same tick — both pass the read before either write
 * lands, producing duplicate effects or lost charge increments. Serialize
 * every status mutation per actor so read+write is atomic.
 * -------------------------------------------------- */
const _statusLocks = new Map();

function _withStatusLock(actor, fn) {
  const key  = actor?.uuid ?? actor?.id ?? "unknown";
  const prev = _statusLocks.get(key) ?? Promise.resolve();
  const run  = prev.then(fn);
  const tail = run.catch(() => {});      // keep the chain alive after failures
  _statusLocks.set(key, tail);
  tail.then(() => { if (_statusLocks.get(key) === tail) _statusLocks.delete(key); });
  return run;
}

/**
 * Apply an ICON status to an actor.
 * @param {Actor}   actor
 * @param {string}  statusId
 * @param {boolean} [ongoing=false]  Mark as ongoing+ (can't save)
 */
export function applyStatus(actor, statusId, ongoing = false, opts = {}) {
  // Hatred asks "of whom?" first — outside the lock, so an open dialog never
  // blocks other status changes on the same actor.
  if (statusId === "hatred" && !opts?.target && !hasStatus(actor, statusId)) {
    return promptHatredTarget(actor).then(target =>
      target ? _withStatusLock(actor, () => _applyStatus(actor, statusId, ongoing, { ...opts, target })) : null);
  }
  return _withStatusLock(actor, () => _applyStatus(actor, statusId, ongoing, opts));
}

async function _applyStatus(actor, statusId, ongoing = false, opts = {}) {
  const def = ICON_STATUSES.find(s => s.id === statusId);
  if (!def) return ui.notifications.warn(`Unknown status: ${statusId}`);

  // Don't duplicate
  if (hasStatus(actor, statusId)) return;

  // Hatred is always of someone (p.104): ask who (or take opts.target), then
  // create the "Hatred of X" effect through marks.mjs.
  if (statusId === "hatred") {
    const target = opts?.target ?? await promptHatredTarget(actor);
    if (!target) return;
    return applyHatred(actor, target, { ongoing });
  }

  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name:     def.name,
    img:      def.img,
    statuses: [statusId],
    flags: {
      core: { statusId },
      "icon-system": {
        isStatus:  true,
        canSave:   def.canSave  && !ongoing,  // ongoing overrides canSave
        ongoing:   ongoing || (def.ongoing ?? false),
        isBoon:    def.isBoon   ?? false,
        isSpecial: def.isSpecial ?? false,
      },
    },
  }]);
}

/** Remove an ICON status from an actor. */
export function removeStatus(actor, statusId) {
  return _withStatusLock(actor, () => _removeStatus(actor, statusId));
}

async function _removeStatus(actor, statusId) {
  const effect = actor.effects.find(e =>
    e.statuses?.has(statusId) || e.getFlag("core", "statusId") === statusId
  );
  if (effect) await effect.delete();
}

/* ================================================== */
/*  Stackable status charges                            */
/* ================================================== */

/**
 * Statuses that can stack multiple charges (visible as a count badge in the
 * Conditions tab, with left/right-click to add/remove a charge). The
 * underlying ActiveEffect is auto-applied when count > 0.
 */
export const STACKABLE_STATUSES = new Set(["blessed", "power-die", "vigilance", "bonus-damage", "marked"]);

/** Read the charge count of a stackable status from the actor's flag. */
export function getStatusCharges(actor, statusId) {
  return actor?.getFlag?.("icon-system", "statusCharges")?.[statusId] ?? 0;
}

/**
 * Set the charge count for a stackable status. Manages the underlying
 * ActiveEffect: created when count goes 0 → 1+, removed when 1+ → 0.
 * Negative counts are clamped to 0.
 */
export function setStatusCharges(actor, statusId, count) {
  return _withStatusLock(actor, () => _setStatusCharges(actor, statusId, count));
}

async function _setStatusCharges(actor, statusId, count) {
  const next = Math.max(0, count);
  const charges = foundry.utils.deepClone(actor.getFlag("icon-system", "statusCharges") ?? {});
  charges[statusId] = next;
  await actor.setFlag("icon-system", "statusCharges", charges);

  if (next > 0 && !hasStatus(actor, statusId)) {
    await _applyStatus(actor, statusId);
  } else if (next === 0 && hasStatus(actor, statusId)) {
    await _removeStatus(actor, statusId);
  }
  return next;
}

/**
 * Adjust charges by ±delta. Returns the new count.
 * The current count is read inside the per-actor lock, so concurrent
 * adjustments can't read the same base value and lose an increment.
 */
export function adjustStatusCharges(actor, statusId, delta) {
  return _withStatusLock(actor, () =>
    _setStatusCharges(actor, statusId, getStatusCharges(actor, statusId) + delta));
}

/**
 * Right-click cycle for the "+" (ongoing) version of a status, which cannot be
 * saved against at end of turn (manual: ongoing+ debuffs need source removal).
 * Cycle: not present → apply as ongoing+ → (right-click again) remove.
 * If a NORMAL version is already present, upgrade it to ongoing+.
 * @returns {Promise<"applied-ongoing"|"upgraded-ongoing"|"removed">}
 */
export function cycleOngoingStatus(actor, statusId) {
  return _withStatusLock(actor, () => _cycleOngoingStatus(actor, statusId));
}

async function _cycleOngoingStatus(actor, statusId) {
  const effect = actor.effects.find(e =>
    e.statuses?.has(statusId) || e.getFlag("core", "statusId") === statusId
  );
  if (!effect) {
    await _applyStatus(actor, statusId, true);
    return "applied-ongoing";
  }
  const ongoing = effect.getFlag("icon-system", "ongoing") ?? false;
  if (ongoing) {
    await effect.delete();
    return "removed";
  }
  await toggleOngoing(effect);
  return "upgraded-ongoing";
}

/** Toggle ongoing flag on an existing status effect (GM can mark/unmark). */
export async function toggleOngoing(effect) {
  const current = effect.getFlag("icon-system", "ongoing") ?? false;
  await effect.setFlag("icon-system", "ongoing", !current);
  // Also update canSave: if now ongoing, canSave = false
  if (!current) {
    await effect.setFlag("icon-system", "canSave", false);
  } else {
    // Restore canSave from definition
    const def = ICON_STATUSES.find(s => s.id === effect.getFlag("core", "statusId"));
    await effect.setFlag("icon-system", "canSave", def?.canSave ?? false);
  }
}
