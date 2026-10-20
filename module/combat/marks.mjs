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
 *     at a time (marking again with another ability asks which one stays,
 *     "choosing which gets replaced", p.95); marks end when the marker is defeated or under the ability's
 *     own conditions. Any number of marks from different characters can sit
 *     on one character (p.108).
 *   Multimark — the tag the foe stat blocks put on marking abilities that keep
 *     several marks out at once (Fear, Ancient Hatred, Control Limbs, Sisyphus…).
 *     The mark rule is written as "each ability TYPICALLY places only one mark"
 *     (p.95): multimark is that exception, so only the one-mark-per-ability
 *     sweep is lifted. One mark per marker → target pair still holds.
 *   Tracker — not a mark: a reminder on a character an ability designates for
 *     a while without marking it (Grand Banishment p.193, "Until the end of
 *     that foe's next turn…"; The Tower p.203, "At the end of that foe's
 *     turn, gamble…"). Same effect and chips as a mark, flagged `tracked`,
 *     named "Tracked — …": it neither replaces nor is replaced by the
 *     marker's marks, and doesn't end when the marker is defeated.
 *   Stacking marks — a few foe marks say so in their text ("This mark can be
 *     placed more than once and stacks indefinitely", Royal Guard's Battalion
 *     of Limbs p.332; Malice, Vessel Knight). Placing such a mark again on the
 *     same character adds a stack to the existing mark instead of replacing
 *     it; the count is `mark.stacks` and shows in the mark's name and chips.
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
import { tagKey } from "./defenses.mjs";

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

/**
 * Is this a marking ability, and does it mark several characters at once?
 * `mark` and `multimark` both put the Mark button on an ability / foe action;
 * `multimark` additionally lets the ability hold more than one mark (p.95).
 * Accepts raw strings or the {raw,label} chips resolveAbilityTags returns.
 */
export function markFromTags(tags) {
  const keys = (Array.isArray(tags) ? tags : []).map(tagKey);
  const multi = keys.includes("multimark") || keys.includes("multi-mark");
  return { can: multi || keys.includes("mark"), multi };
}

/**
 * Does this ability designate a character something happens to later, so a
 * "Track target" reminder is worth having? Read from the text: "that foe's
 * (next) turn" / "that character's next turn" (Grand Banishment, The Tower,
 * Showdown, Assassinate, Great Giorgios, Pyroclast), or a delayed hit on the
 * target: "when they end their next turn, they…" / "at the end of their next
 * turn, they…" (Quaking Palm p.221, Sidhe p.171, Dark Sliver p.187). A bare
 * "until the end of their next turn" is just a duration and doesn't count.
 * Marking abilities already have their mark, so they get no tracker.
 */
export function abilityTracks(system, tags = []) {
  if (markFromTags(tags).can) return false;
  const text = Object.values(system ?? {}).filter(v => typeof v === "string").join(" ").replace(/<[^>]+>/g, " ");
  return /\bthat (?:foe|character|ally)['’]s (?:next )?turn\b/i.test(text)
      || /\b(?:when they (?:start|end)|at the (?:start|end) of) their next turn,? they\b/i.test(text);
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
export async function promptHatredTarget(actor, { closest = false, until = "" } = {}) {
  const tokens   = _sceneTokens({ excludeActorId: actor?.id });
  const targeted = new Set(Array.from(game.user?.targets ?? []).map(t => t.id));
  // "Hatred of the closest foe" (Spite, Dark Knight): the nearest hostile token comes first.
  const near     = closest ? _closestFoes(actor, tokens) : [];
  const sorted   = [...tokens].sort((a, b) => (near.includes(b) - near.includes(a)) || (targeted.has(b.id) - targeted.has(a.id)) || a.name.localeCompare(b.name));
  const preselect = near.length || targeted.size;
  const options  = sorted.map((t, i) => `<option value="${escapeHTML(t.id)}" ${i === 0 && preselect ? "selected" : ""}>${escapeHTML(t.name)}${near.includes(t) ? " (closest)" : ""}${targeted.has(t.id) ? " (targeted)" : ""}</option>`).join("");
  const content = `
    <p style="margin:0 0 6px"><strong>${escapeHTML(actor?.name ?? "")}</strong> gains <strong>Hatred of…</strong> (p.104: half damage against anyone else, ${until ? escapeHTML(until) : "ends at the end of their turn"}).${near.length > 1 ? " Several foes are equally close: you choose." : ""}</p>
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
 * The hostile tokens nearest to `actor`'s token (ties all returned: "if
 * multiple foes are equidistant, you can choose"). Hostile = the opposite
 * disposition; with no token on the map, nothing.
 */
function _closestFoes(actor, tokens) {
  const own = actor?.getActiveTokens?.()?.[0];
  if (!own || !canvas?.grid) return [];
  const foes = tokens.filter(t => t.document.disposition !== own.document.disposition && t.document.disposition !== 0);
  let best = Infinity, out = [];
  for (const t of foes) {
    const d = canvas.grid.measurePath([own.center, t.center]).distance;
    if (d < best - 1e-6) { best = d; out = [t]; }
    else if (Math.abs(d - best) < 1e-6) out.push(t);
  }
  return out;
}

/**
 * Give `actor` Hatred of `target` ({ name, tokenId?, actorUuid? }). Replaces
 * an existing Hatred (you hate one character at a time). `expiry` is the
 * countdown of status-expiry.mjs ("until the end of their next turn").
 */
export async function applyHatred(actor, target, { ongoing = false, silent = false, expiry = null } = {}) {
  if (!actor || !target?.name) return null;
  if (_needsRelay(actor)) { _relay({ method: "applyHatred", actorUuid: actor.uuid, target, ongoing, expiry }); return null; }
  const current = getHatred(actor);
  if (current) await current.effect.delete();
  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [{
    name:     `Hatred of ${target.name}`,
    img:      HATRED_IMG,
    statuses: ["hatred"],
    flags: {
      core: { statusId: "hatred" },
      [NS]: { isStatus: true, canSave: false, ongoing, isBoon: false, isSpecial: false,
              hatred: { name: target.name, tokenId: target.tokenId ?? null, actorUuid: target.actorUuid ?? null },
              ...(expiry ? { expiry } : {}) },
    },
  }]);
  _log(`${actor.name} gains Hatred of ${target.name}`);
  const until = expiry ? expiry.text : ongoing ? "until its source is lifted (ongoing — it doesn't end with the turn)" : "until the end of their turn";
  if (!silent) await _chat(actor, `<strong>${escapeHTML(actor.name)}</strong> gains <strong>Hatred${ongoing ? "+" : ""} of ${escapeHTML(target.name)}</strong> — half damage against anyone else ${until}.`);
  return effect;
}

/** Remove the actor's Hatred (end of turn, or the hated foe became untargetable). */
export async function endHatred(actor, reason = "end of turn") {
  const current = getHatred(actor);
  if (!current) return false;
  if (_needsRelay(actor)) { _relay({ method: "endHatred", actorUuid: actor.uuid, reason }); return true; }
  await current.effect.delete();
  const label = current.name && current.name !== "?" ? `Hatred of ${escapeHTML(current.name)}` : "Hatred";
  await _chat(actor, `<strong>${escapeHTML(actor.name)}</strong>'s <strong>${label}</strong> ends (${escapeHTML(reason)}).`);
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
  // A plain "Hatred" effect (core token HUD, old worlds) has no target recorded:
  // leave the choice to the player instead of guessing.
  if (!h.tokenId && !h.actorUuid && (!h.name || h.name === "?")) {
    return { active: true, halve: false, name: "someone", note: "Hatred (no target recorded — apply it from the Conditions tab to pick who): tick if this isn't your hated foe" };
  }
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
  return (actor?.effects ?? []).filter(e => e.getFlag(NS, "mark")).map(e => {
    const mark = e.getFlag(NS, "mark");
    return { id: e.id, uuid: e.uuid, name: e.name, img: e.img, ...mark, stacks: Math.max(1, Number(mark.stacks) || 1) };
  });
}

/** Does a mark's rules text say it stacks ("stacks indefinitely", "for each stack of the mark")? */
export function markStacks(text) {
  return /\bstacks?\s+indefinitely\b|\bfor each stack\b|\bstacks? of (?:the |this )?mark\b/i.test(String(text ?? ""));
}

/** Effect name of a mark, with its stack count when it has more than one. */
function _markName(abilityName, sourceName, stacks, tracked = false) {
  if (tracked) return `Tracked — ${abilityName} (${sourceName})`;
  return `Marked${stacks > 1 ? ` ×${stacks}` : ""} — ${abilityName} (${sourceName})`;
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
 * @param {boolean} [opts.multi]     `multimark` ability: it keeps its older marks
 * @param {string} [opts.stackText]  every text of the ability, read to tell whether the mark stacks
 *                                   (defaults to `text`)
 * @param {boolean} [opts.track]     a tracker, not a mark (see the header): no stacks, and it
 *                                   leaves the marker's marks on the target alone
 * @param {number} [opts.auraSize]   the "while marked" aura size the marker chose before a relay (follow-marks.mjs)
 */
export async function applyMark({ source, target, abilityKey, abilityName, text = "", multi = false, stackText = null, track = false, auraSize = null, replaceChecked = false, targetTokenUuid = null, replaceUuid = null }) {
  if (!source || !target) return null;
  // The token the marker targeted: a linked character with tokens on several scenes has its mark's space and aura
  // put on that one (follow-marks.mjs), not on the first token found.
  targetTokenUuid ??= Array.from(game.user?.targets ?? []).find(t => t.actor?.uuid === target.uuid)?.document?.uuid ?? null;
  // p.95 "a character can only mark another character with one mark at a time, choosing which gets replaced if
  // they mark that character again": the marker picks, on their own client (a relayed mark carries the answer).
  if (!track && !replaceChecked) {
    const chosen = await _replaceChosen(source, target, abilityKey, abilityName);
    if (chosen === null) return null;
    replaceUuid = chosen || null;
    replaceChecked = true;
  }
  if (_needsRelay(target)) {
    // The aura "while marked" (Fulminate p.226, Talent I "Aura 2 / 3") is chosen here, by the marker, not by the GM
    // who will create the mark: the size goes with the request (follow-marks.mjs).
    if (!track && game.users.activeGM) {
      const { whileMarkedAuraSize } = await import("../canvas/follow-marks.mjs");
      auraSize = await whileMarkedAuraSize(source, target, abilityKey);
    }
    _relay({ method: "applyMark", sourceUuid: source.uuid, targetUuid: target.uuid, abilityKey, abilityName, text, multi, stackText, track, auraSize, replaceChecked, targetTokenUuid, replaceUuid });
    ui.notifications.info(`${track ? "Tracker" : "Mark"} sent to the GM to place on "${target.name}".`);
    return null;
  }
  // A stacking mark placed again on the same character: one more stack.
  if (!track && markStacks(stackText ?? text)) {
    const same = marksOn(target).find(m => m.sourceActorId === source.id && m.abilityKey === abilityKey);
    const eff = same && await fromUuid(same.uuid);
    if (eff) {
      const stacks = same.stacks + 1;
      await eff.update({ name: _markName(abilityName, source.name, stacks), [`flags.${NS}.mark.stacks`]: stacks });
      _log(`${source.name} stacks ${abilityName} on ${target.name}: ${stacks}`);
      await _chat(source, `<strong><i class='fa-solid fa-crosshairs'></i> ${escapeHTML(source.name)}</strong> marks <strong>${escapeHTML(target.name)}</strong> again — <strong>${escapeHTML(abilityName)}</strong> now has <strong>${stacks} stacks</strong>.`);
      _refreshSheet(source);
      return eff;
    }
  }
  // One mark per ability: the ability's previous mark (anywhere on the scene)
  // ends — unless the ability is `multimark`, which is the tag for the foe
  // abilities that hold several marks at once.
  if (!multi) for (const m of marksBy(source.id, abilityKey)) {
    if (m.targetActor === target) continue;
    const eff = await fromUuid(m.uuid);
    if (eff) { await eff.delete(); _log(`mark of ${abilityName} moved from ${m.targetName}`); }
  }
  // The same tracker placed again on the same character (playtest 18 October,
  // P16): the sweep above skips the target, so the old one is replaced here.
  if (track) for (const m of marksOn(target).filter(m => m.sourceActorId === source.id && m.tracked && m.abilityKey === abilityKey)) {
    const eff = await fromUuid(m.uuid);
    if (eff) { await eff.delete(); _log(`${target.name}: tracker ${m.abilityName} from ${source.name} placed again`); }
  }
  // One mark from this character on the target: an older one from another ability
  // is replaced. Trackers aren't marks: they don't replace, and aren't replaced.
  // Gardener of Kin (p.184) stacks two: only the one picked in _replaceChosen goes.
  const limit = markLimit(source);
  if (!track) for (const m of marksOn(target).filter(m => m.sourceActorId === source.id && !m.tracked)) {
    if (limit > 1 && m.abilityKey !== abilityKey && m.uuid !== replaceUuid) continue;
    const eff = await fromUuid(m.uuid);
    if (eff) { await eff.delete(); _log(`${target.name}: mark ${m.abilityName} from ${source.name} replaced`); }
  }
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const [effect] = await target.createEmbeddedDocuments("ActiveEffect", [{
    name: _markName(abilityName, source.name, 1, track),
    img:  MARK_IMG,
    description: plain,
    flags: { [NS]: { isStatus: false, isMark: true, mark: {
      sourceActorId: source.id, sourceActorUuid: source.uuid, sourceName: source.name,
      abilityKey, abilityName, text: plain, stacks: 1, ...(track ? { tracked: true } : {}),
      ...(Number(auraSize) > 0 ? { auraSize: Number(auraSize) } : {}),
      ...(targetTokenUuid ? { targetTokenUuid } : {}),
    } } },
  }]);
  _log(`${source.name} ${track ? "tracks" : "marks"} ${target.name} with ${abilityName}`);
  if (track) await _chat(source, `<strong><i class='fa-solid fa-location-dot'></i> ${escapeHTML(source.name)}</strong> tracks <strong>${escapeHTML(target.name)}</strong> — <strong>${escapeHTML(abilityName)}</strong> <em>(a reminder, not a mark)</em>${plain ? `<div class="icon-chat-card__desc" style="margin-top:4px">${escapeHTML(plain)}</div>` : ""}`);
  else await _chat(source, `<strong><i class='fa-solid fa-crosshairs'></i> ${escapeHTML(source.name)}</strong> marks <strong>${escapeHTML(target.name)}</strong> — <strong>${escapeHTML(abilityName)}</strong>${plain ? `<div class="icon-chat-card__desc" style="margin-top:4px">${escapeHTML(plain)}</div>` : ""}`);
  _refreshSheet(source);   // the chip on the marker's panel lives on another actor's sheet
  return effect;
}

/**
 * How many marks `source` can keep on one character: 1 (p.95), 2 with the Harvester's Gardener of Kin ("You can
 * stack 2 marks on characters", p.184).
 * @param {Actor} source
 */
export function markLimit(source) {
  return source?.items?.some(i => i.type === "trait" && /^gardener of kin$/i.test(i.name ?? "")) ? 2 : 1;
}

/**
 * `source` marks `target` again with another ability while an older mark of theirs is on it (p.95): which stays?
 * Resolves "" when the new mark goes on with nothing to pick (no older mark, the same ability again, or room for one
 * more with Gardener of Kin), the uuid of the mark it replaces when there is a choice to make, or null to keep the
 * old one(s). With one mark allowed, applyMark replaces every older mark, as before.
 */
async function _replaceChosen(source, target, abilityKey, abilityName) {
  const older = marksOn(target).filter(m => m.sourceActorId === source.id && !m.tracked && m.abilityKey !== abilityKey);
  const limit = markLimit(source);
  if (older.length < limit) return "";
  if (limit > 1) {
    try {
      const pick = await foundry.applications.api.DialogV2.wait({
        window: { title: `Mark ${target.name} again — which goes?` },
        content: `<p><strong>${escapeHTML(target.name)}</strong> already has ${limit} marks of <strong>${escapeHTML(source.name)}</strong>, the most Gardener of Kin allows (p.184). Which one does <strong>${escapeHTML(abilityName)}</strong> replace?</p>`,
        buttons: [
          ...older.map((m, k) => ({ action: `r${k}`, label: `Replace ${m.abilityName ?? m.name}`, default: k === 0 })),
          { action: "old", label: "Keep them" },
        ],
        rejectClose: false,
      });
      const k = /^r(\d+)$/.exec(pick ?? "")?.[1];
      if (k == null) { ui.notifications.info(`${target.name} keeps its marks: ${abilityName} is not placed.`); return null; }
      return older[Number(k)].uuid;
    } catch { return null; }
  }
  const names = older.map(m => escapeHTML(m.abilityName ?? m.name)).join(", ");
  try {
    const pick = await foundry.applications.api.DialogV2.wait({
      window: { title: `Mark ${target.name} again — which stays?` },
      content: `<p><strong>${escapeHTML(target.name)}</strong> already has <strong>${escapeHTML(source.name)}</strong>'s mark <strong>${names}</strong>. A character can mark another with one mark at a time, choosing which gets replaced (p.95).</p>`,
      buttons: [
        { action: "new", label: `${abilityName} replaces it`, default: true },
        { action: "old", label: `Keep ${older.map(m => m.abilityName ?? m.name).join(", ")}` },
      ],
      rejectClose: false,
    });
    if (pick === "old") ui.notifications.info(`${target.name} keeps ${older.map(m => m.abilityName ?? m.name).join(", ")}: ${abilityName} is not placed.`);
    return pick === "new" ? "" : null;
  } catch { return null; }
}

/** Remove one mark by its effect uuid (works for the marker, the target's owner and the GM). */
export async function removeMark(effectUuid, { silent = false } = {}) {
  const effect = await fromUuid(effectUuid);
  if (!effect) return false;
  const target = effect.parent;
  if (_needsRelay(target)) { _relay({ method: "removeMark", effectUuid }); return true; }
  const mark = effect.getFlag(NS, "mark") ?? {};
  await effect.delete();
  if (!silent) await _chat(target, `The ${mark.tracked ? "tracker" : "mark"} <strong>${escapeHTML(mark.abilityName ?? effect.name)}</strong> on <strong>${escapeHTML(target?.name ?? "")}</strong> ends.`);
  if (mark.sourceActorUuid) _refreshSheet(await fromUuid(mark.sourceActorUuid));
  return true;
}

/** Re-render an actor's open sheet (marks placed by it are shown there as chips). */
function _refreshSheet(actor) {
  try { if (actor?.sheet?.rendered) actor.sheet.render(false); } catch { /* sheet gone */ }
}

/** All marks placed by an actor end (p.103: when the marker is defeated). Trackers aren't marks: they stay. */
export async function removeMarksBy(actorId, reason = "") {
  const marks = marksBy(actorId).filter(m => !m.tracked);
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
      if (actor) await applyHatred(actor, data.target, { ongoing: !!data.ongoing, expiry: data.expiry ?? null });
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
      if (source && target) await applyMark({ source, target, abilityKey: data.abilityKey, abilityName: data.abilityName, text: data.text, multi: !!data.multi, stackText: data.stackText ?? null, track: !!data.track, auraSize: data.auraSize ?? null, replaceChecked: !!data.replaceChecked, targetTokenUuid: data.targetTokenUuid ?? null, replaceUuid: data.replaceUuid ?? null });
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
  // A mark created/removed by another client (GM relay) must refresh the
  // marker's open sheet here too — the "target ✕" chips live on it.
  for (const hook of ["createActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(hook, async (effect) => {
      const mark = effect?.getFlag?.(NS, "mark");
      if (!mark?.sourceActorUuid) return;
      try { _refreshSheet(await fromUuid(mark.sourceActorUuid)); } catch { /* actor gone */ }
    });
  }
  Hooks.on("updateActor", async (actor, changes) => {
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    const hp = foundry.utils.getProperty(changes, "system.combat.hp.value") ?? foundry.utils.getProperty(changes, "system.hp.value");
    if (hp == null || hp > 0) return;
    try { await removeMarksBy(actor.id, `${actor.name} is defeated`); }
    catch (err) { console.warn("[ICON | Marks] could not clear marks of a defeated actor", err); }
  });
}
