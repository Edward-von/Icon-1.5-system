/**
 * marks.mjs — Hatred "of X" and ability-specific Marks.
 *
 * Rules (ICON 1.5):
 *   Hatred of X (p.104) — "Deal half damage to all foes other than foe X. End
 *     this status at the end of your turn, or if foe X becomes immune to
 *     damage or un-targetable." Hatred doesn't apply to / can't be gained of
 *     an un-targetable or immune character (p.108).
 *   Mark (p.103) — an ongoing effect on a specific character. Each ability
 *     places one mark at a time; a character can mark another with one mark
 *     at a time (a new one replaces the old — the book lets you choose which
 *     to keep); marks end when the marker is defeated or under the ability's
 *     own conditions. Any number of marks from different characters can sit
 *     on one character (p.108).
 *
 * Both are ActiveEffects on the affected actor:
 *   Hatred  — the normal "hatred" status effect, named "Hatred of <X>" with the
 *             hated token in `flags.icon-system.hatred`. Ends at the end of the
 *             actor's turn (statuses.mjs) instead of being saved against.
 *   Mark    — one effect per mark, `flags.icon-system.mark` = { sourceActorId,
 *             sourceName, abilityKey, abilityName, text }. Not a status (no
 *             saves, no "Marked" charge), so it never collides with the generic
 *             stackable "Marked" counter of the Conditions tab.
 *
 * Players who don't own the target relay the change to the active GM over
 * the system socket (handled by handleMarkSocket, called from IconCombat).
 */
import { escapeHTML } from "../helpers/enrich.mjs";

const _log = (...a) => console.debug("[ICON | Marks]", ...a);
const NS         = "icon-system";
const SOCKET     = "system.icon-system";
const MARK_IMG   = "systems/icon-system/assets/statuses/marked.svg";
const HATRED_IMG = "systems/icon-system/assets/statuses/hatred.svg";

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

/** Tokens on the current scene that have an actor (optionally excluding one actor). */
function _sceneTokens({ excludeActorId } = {}) {
  return (canvas?.tokens?.placeables ?? []).filter(t => t.actor && t.actor.id !== excludeActorId);
}

/** Distinct actors represented by tokens on the current scene. */
function _sceneActors() {
  const seen = new Map();
  for (const t of _sceneTokens()) if (!seen.has(t.actor.uuid)) seen.set(t.actor.uuid, t.actor);
  return [...seen.values()];
}

/** Can this client write effects on `actor` directly? Otherwise relay to the GM. */
function _needsRelay(actor) {
  return !(actor?.isOwner || game.user.isGM);
}

function _relay(payload) {
  if (!game.users.activeGM) {
    ui.notifications.warn("No GM is connected — can't do that right now.");
    return false;
  }
  game.socket.emit(SOCKET, { type: "markEffect", ...payload });
  return true;
}

async function _chat(actor, html) {
  try {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="icon-chat-card icon-chat-card--mark">${html}</div>` });
  } catch (err) { console.warn("[ICON | Marks] chat failed", err); }
}

/* -------------------------------------------------- */
/*  Hatred of X                                        */
/* -------------------------------------------------- */

/** The actor's Hatred effect + target, or null. */
export function getHatred(actor) {
  const effect = actor?.effects?.find(e => e.getFlag(NS, "hatred") || e.statuses?.has("hatred"));
  if (!effect) return null;
  return { effect, ...(effect.getFlag(NS, "hatred") ?? { name: "?", tokenId: null, actorUuid: null }) };
}

/**
 * Ask who the hatred is of. Lists the tokens on the scene (the user's current
 * targets first) plus a free-text fallback. Resolves { name, tokenId,
 * actorUuid } or null when cancelled.
 */
export async function promptHatredTarget(actor) {
  const tokens   = _sceneTokens({ excludeActorId: actor?.id });
  const targeted = new Set(Array.from(game.user?.targets ?? []).map(t => t.id));
  const sorted   = [...tokens].sort((a, b) => (targeted.has(b.id) - targeted.has(a.id)) || a.name.localeCompare(b.name));
  const options  = sorted.map((t, i) => `<option value="${escapeHTML(t.id)}" ${i === 0 && targeted.size ? "selected" : ""}>${escapeHTML(t.name)}${targeted.has(t.id) ? " 🎯" : ""}</option>`).join("");
  const content = `
    <p style="margin:0 0 6px"><strong>${escapeHTML(actor?.name ?? "")}</strong> gains <strong>Hatred of…</strong> (p.104: half damage against anyone else, ends at the end of their turn).</p>
    ${sorted.length ? `<label style="display:block;margin-bottom:6px">Character on the map:
      <select name="token" style="width:100%">${options}<option value="">— other (type below) —</option></select></label>` : ""}
    <label style="display:block">Name: <input type="text" name="name" placeholder="e.g. the demon" style="width:100%"></label>`;
  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title: `Hatred of… — ${actor?.name ?? ""}` },
      content,
      ok: {
        label: "Apply Hatred",
        callback: (_e, button) => {
          const form  = button.form;
          const tokId = form?.elements?.token?.value ?? "";
          const typed = String(form?.elements?.name?.value ?? "").trim();
          const tok   = tokId ? canvas.tokens.get(tokId) : null;
          if (tok) return { name: tok.name, tokenId: tok.id, actorUuid: tok.actor?.uuid ?? null };
          if (typed) return { name: typed, tokenId: null, actorUuid: null };
          return null;
        },
      },
      rejectClose: false,
    });
  } catch { return null; }
}

/**
 * Give `actor` Hatred of `target` ({ name, tokenId?, actorUuid? }). Replaces
 * an existing Hatred (you hate one character at a time).
 */
export async function applyHatred(actor, target, { ongoing = false, silent = false } = {}) {
  if (!actor || !target?.name) return null;
  if (_needsRelay(actor)) { _relay({ method: "applyHatred", actorUuid: actor.uuid, target, ongoing }); return null; }
  const current = getHatred(actor);
  if (current) await current.effect.delete();
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
    name:     `Hatred of ${target.name}`,
    img:      HATRED_IMG,
    statuses: ["hatred"],
    flags: {
      core: { statusId: "hatred" },
      [NS]: { isStatus: true, canSave: false, ongoing, isBoon: false, isSpecial: false,
              hatred: { name: target.name, tokenId: target.tokenId ?? null, actorUuid: target.actorUuid ?? null } },
    },
  }]);
  _log(`${actor.name} gains Hatred of ${target.name}`);
  if (!silent) await _chat(actor, `<strong>${escapeHTML(actor.name)}</strong> gains <strong>Hatred of ${escapeHTML(target.name)}</strong> — half damage against anyone else until the end of their turn.`);
  return effect;
}

/** Remove the actor's Hatred (end of turn, or the hated foe became untargetable). */
export async function endHatred(actor, reason = "end of turn") {
  const current = getHatred(actor);
  if (!current) return false;
  if (_needsRelay(actor)) { _relay({ method: "endHatred", actorUuid: actor.uuid, reason }); return true; }
  await current.effect.delete();
  await _chat(actor, `<strong>${escapeHTML(actor.name)}</strong>'s <strong>Hatred of ${escapeHTML(current.name)}</strong> ends (${escapeHTML(reason)}).`);
  return true;
}

/**
 * Does the attacker's Hatred halve damage against the user's current
 * targets? Returns { active, name, halve, note }.
 *   halve = true when at least one target is not the hated character
 *   (or when there are no targets: the dialog then leaves the choice to the player).
 */
export function hatredDamageHint(actor) {
  const h = getHatred(actor);
  if (!h) return { active: false, halve: false, name: "", note: "" };
  const targets = Array.from(game.user?.targets ?? []);
  const other = targets.filter(t => t.id !== h.tokenId && (!h.actorUuid || t.actor?.uuid !== h.actorUuid));
  const halve = targets.length > 0 && other.length > 0;
  const note = targets.length
    ? (halve ? `Hatred of ${h.name}: ${other.map(t => t.name).join(", ")} is not your hated foe → half damage` : `Hatred of ${h.name}: attacking ${h.name} → full damage`)
    : `Hatred of ${h.name}: half damage against anyone else (tick if this isn't ${h.name})`;
  return { active: true, halve, name: h.name, note };
}

/* -------------------------------------------------- */
/*  Marks                                              */
/* -------------------------------------------------- */

/** Marks currently on `actor` (effects carrying flags.icon-system.mark). */
export function marksOn(actor) {
  return (actor?.effects ?? []).filter(e => e.getFlag(NS, "mark")).map(e => ({
    id: e.id, uuid: e.uuid, name: e.name, img: e.img, ...e.getFlag(NS, "mark"),
  }));
}

/**
 * Marks placed by `actorId` on the actors of the current scene, optionally
 * only for one ability. Each entry adds `targetName` / `targetActor`.
 */
export function marksBy(actorId, abilityKey = null) {
  const out = [];
  for (const a of _sceneActors()) {
    for (const m of marksOn(a)) {
      if (m.sourceActorId !== actorId) continue;
      if (abilityKey && m.abilityKey !== abilityKey) continue;
      out.push({ ...m, targetName: a.name, targetActor: a });
    }
  }
  return out;
}

/**
 * Place a mark from `source` on `target`.
 * @param {object} opts
 * @param {Actor}  opts.source       the marking character
 * @param {Actor}  opts.target       the marked character
 * @param {string} opts.abilityKey   item id / action name — one mark per ability
 * @param {string} opts.abilityName
 * @param {string} [opts.text]       the mark's rules text (shown on hover / in chat)
 */
export async function applyMark({ source, target, abilityKey, abilityName, text = "" }) {
  if (!source || !target) return null;
  if (_needsRelay(target)) {
    _relay({ method: "applyMark", sourceUuid: source.uuid, targetUuid: target.uuid, abilityKey, abilityName, text });
    ui.notifications.info(`Mark sent to the GM to place on "${target.name}".`);
    return null;
  }
  // One mark per ability: the ability's previous mark (anywhere on the scene) ends.
  for (const m of marksBy(source.id, abilityKey)) {
    if (m.targetActor === target) continue;
    const eff = await fromUuid(m.uuid);
    if (eff) { await eff.delete(); _log(`mark of ${abilityName} moved from ${m.targetName}`); }
  }
  // One mark from this character on the target: an older one from another ability is replaced.
  for (const m of marksOn(target).filter(m => m.sourceActorId === source.id)) {
    const eff = await fromUuid(m.uuid);
    if (eff) { await eff.delete(); _log(`${target.name}: mark ${m.abilityName} from ${source.name} replaced`); }
  }
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const [effect] = await target.createEmbeddedDocuments("ActiveEffect", [{
    name: `Marked — ${abilityName} (${source.name})`,
    img:  MARK_IMG,
    description: plain,
    flags: { [NS]: { isStatus: false, isMark: true, mark: {
      sourceActorId: source.id, sourceActorUuid: source.uuid, sourceName: source.name,
      abilityKey, abilityName, text: plain,
    } } },
  }]);
  _log(`${source.name} marks ${target.name} with ${abilityName}`);
  await _chat(source, `<strong>🎯 ${escapeHTML(source.name)}</strong> marks <strong>${escapeHTML(target.name)}</strong> — <strong>${escapeHTML(abilityName)}</strong>${plain ? `<div class="icon-chat-card__desc" style="margin-top:4px">${escapeHTML(plain)}</div>` : ""}`);
  _refreshSheet(source);   // the chip on the marker's panel lives on another actor's sheet
  return effect;
}

/** Remove one mark by its effect uuid (works for the marker, the target's owner and the GM). */
export async function removeMark(effectUuid, { silent = false } = {}) {
  const effect = await fromUuid(effectUuid);
  if (!effect) return false;
  const target = effect.parent;
  if (_needsRelay(target)) { _relay({ method: "removeMark", effectUuid }); return true; }
  const mark = effect.getFlag(NS, "mark") ?? {};
  await effect.delete();
  if (!silent) await _chat(target, `The mark <strong>${escapeHTML(mark.abilityName ?? effect.name)}</strong> on <strong>${escapeHTML(target?.name ?? "")}</strong> ends.`);
  if (mark.sourceActorUuid) _refreshSheet(await fromUuid(mark.sourceActorUuid));
  return true;
}

/** Re-render an actor's open sheet (marks placed by it are shown there as chips). */
function _refreshSheet(actor) {
  try { if (actor?.sheet?.rendered) actor.sheet.render(false); } catch { /* sheet gone */ }
}

/** All marks placed by an actor end (p.103: when the marker is defeated). */
export async function removeMarksBy(actorId, reason = "") {
  const marks = marksBy(actorId);
  for (const m of marks) {
    const eff = await fromUuid(m.uuid);
    if (eff) await eff.delete();
  }
  if (marks.length) {
    const src = marks[0].sourceName;
    await _chat(null, `${marks.length} mark${marks.length > 1 ? "s" : ""} from <strong>${escapeHTML(src)}</strong> end${reason ? ` (${escapeHTML(reason)})` : ""}: ${marks.map(m => `${escapeHTML(m.abilityName)} on ${escapeHTML(m.targetName)}`).join(", ")}.`);
  }
  return marks.length;
}

/** End-of-combat: hatred and marks don't outlive the encounter. */
export async function clearCombatEffects(actor) {
  const ids = (actor?.effects ?? []).filter(e => e.getFlag(NS, "mark") || e.getFlag(NS, "hatred")).map(e => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  return ids.length;
}

/* -------------------------------------------------- */
/*  Hooks + socket                                     */
/* -------------------------------------------------- */

/** Handle a relayed mark/hatred request on the active GM's client. */
export async function handleMarkSocket(data) {
  if (data?.type !== "markEffect") return;
  switch (data.method) {
    case "applyHatred": {
      const actor = await fromUuid(data.actorUuid ?? "");
      if (actor) await applyHatred(actor, data.target, { ongoing: !!data.ongoing });
      break;
    }
    case "endHatred": {
      const actor = await fromUuid(data.actorUuid ?? "");
      if (actor) await endHatred(actor, data.reason ?? "end of turn");
      break;
    }
    case "applyMark": {
      const source = await fromUuid(data.sourceUuid ?? "");
      const target = await fromUuid(data.targetUuid ?? "");
      if (source && target) await applyMark({ source, target, abilityKey: data.abilityKey, abilityName: data.abilityName, text: data.text });
      break;
    }
    case "removeMark":
      await removeMark(data.effectUuid);
      break;
  }
}

/**
 * Register the automation hooks (call once at init):
 *   • a marker that drops to 0 HP loses all their marks (p.103)
 */
export function registerMarkHooks() {
  Hooks.on("updateActor", async (actor, changes) => {
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    const hp = foundry.utils.getProperty(changes, "system.combat.hp.value") ?? foundry.utils.getProperty(changes, "system.hp.value");
    if (hp == null || hp > 0) return;
    try { await removeMarksBy(actor.id, `${actor.name} is defeated`); }
    catch (err) { console.warn("[ICON | Marks] could not clear marks of a defeated actor", err); }
  });
}
