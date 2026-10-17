/**
 * waterspout.mjs — the Waterspout that sucks characters in and spits them out (Stormbender, p.235).
 *
 *   "When summoned, or at the start of your turn, you may have the waterspout suck in any characters of your choice
 *   in range 2 of it. Foes can pass a save to avoid this effect, and allies can always choose to avoid it. When a
 *   character is sucked in, they are removed from the battlefield. At the end of your turn, the waterspout spits out
 *   all characters it sucked in, in any order, placing them in any other free space in range 2 outside of the spout."
 *   Talent I: "After characters are spit out, they are shoved 1 away from the waterspout."
 *   p.88: "While a character is removed from the battlefield, they don't take turns until they return"; characters
 *   placed on the battlefield "do not count as moving".
 *
 * "Removed from the battlefield" on the map: the token stays where it is, hidden from the players, with
 * `flags.icon-system.suckedIn` = { templateId, creatorId } pointing to the spout (a one-space terrain mark,
 * terrain-spaces.mjs). Cards with buttons, nothing happens without a click:
 *   suck in   after the spout is placed and at the start of the creator's turn: the characters in range, an ally
 *             with "Suck in", a foe with "Save, then suck in" (sucked in on a failed save);
 *   spit out  at the end of the creator's turn (and when the spout is removed with characters inside): one button
 *             per character, a click on a free space in range outside the spout places them and shows them again;
 *             with Talent I, a button that shoves the ones spat out 1 away from the spout;
 *   turns     at the start of a sucked-in character's turn, a reminder that they don't take turns until they return.
 * Tokens the clicking player doesn't own go through the active GM (system socket), as for the objects (map-objects.mjs).
 */
import { terrainFlag, pickSpaces, TERRAIN_COLORS } from "./terrain-spaces.mjs";
import { activeAreaTexts } from "../helpers/area-terrain.mjs";

const _log = (...a) => console.debug("[ICON | Waterspout]", ...a);
const NS = "icon-system";
const SOCKET = "system.icon-system";
const FLAG = "suckedIn";
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const cellKey = (c) => `${c.i},${c.j}`;
const cheb = (a, b) => Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));
const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const isHostile = (td) => td?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE || ["foe", "legend"].includes(td?.actor?.type);
const isMapObject = (td) => !!td?.flags?.[NS]?.mapObject;
const suckedIn = (td) => td?.flags?.[NS]?.[FLAG] ?? null;
const PLACE_RULE = "Characters that are picked up or placed on the battlefield do not count as moving (p.88).";
const TURN_RULE = "While a character is removed from the battlefield, they don't take turns until they return (p.88).";

/** The sentence of `t` that holds index `at`. */
function sentenceOf(t, at) {
  let a = at; while (a > 0 && !/[.;]/.test(t[a - 1])) a--;
  let b = at; while (b < t.length && !/[.;]/.test(t[b])) b++;
  return t.slice(a, b + 1).trim();
}

/**
 * The suck-in rules of an ability's active blocks, or null.
 * @param {Array<[string, string]>} texts  activeAreaTexts pairs
 * @returns {{suck:{range:number, rule:string}, spit:{range:number, rule:string}, shove:{steps:number, source:string, rule:string}|null}|null}
 */
export function spoutRules(texts) {
  let suck = null, spit = null, shove = null;
  for (const [source, text] of texts ?? []) {
    const t = plain(text);
    let m = /\bsuck in any characters of your choice in range (\d+) of it\b/i.exec(t);
    if (m) {
      // The sentence and the next one: "Foes can pass a save to avoid this effect, and allies can always choose to avoid it."
      const first = sentenceOf(t, m.index);
      const end = t.indexOf(first) + first.length;
      suck = { range: Number(m[1]), rule: `${first} ${end < t.length ? sentenceOf(t, Math.min(t.length - 1, end + 1)) : ""}`.trim() };
    }
    m = /\bspits out all characters it sucked in\b[^.]*?\bin range (\d+) outside of the spout\b/i.exec(t);
    if (m) spit = { range: Number(m[1]), rule: sentenceOf(t, m.index) };
    m = /\bafter characters are spit out, they are shoved (\d+) away from the (?:water)?spout\b/i.exec(t);
    if (m) shove = { steps: Number(m[1]), source, rule: sentenceOf(t, m.index) };
  }
  if (!suck) return null;
  return { suck, spit: spit ?? { range: suck.range, rule: "" }, shove };
}

/** The creator, the ability and its suck-in rules behind a spout template, or null for any other template. */
function spoutOf(doc) {
  const f = doc?.flags?.[NS];
  const tf = terrainFlag(doc);
  if (!f?.cells?.length || !tf || tf.kind !== "mark" || !/spout/i.test(tf.name ?? "")) return null;
  let actor = null;
  try { actor = f.actorUuid ? fromUuidSync(f.actorUuid) : null; } catch { actor = null; }
  actor ??= game.actors?.get(f.actorId) ?? null;
  const item = actor?.items?.get?.(tf.itemId || String(f.abilityKey ?? "").replace(/:terrain$/, "")) ?? null;
  const rules = item ? spoutRules(activeAreaTexts(item.system)) : null;
  return rules ? { actor, item, rules, name: tf.name || item.name } : null;
}

/** Cells a token covers on its own scene. */
function cellsOfToken(td, at = null) {
  const grid = td.parent.grid;
  const half = grid.size / 2;
  const tl = at ?? grid.getOffset({ x: td.x + half, y: td.y + half });
  const out = [];
  for (let di = 0; di < Math.max(1, Math.round(td.height ?? 1)); di++)
    for (let dj = 0; dj < Math.max(1, Math.round(td.width ?? 1)); dj++) out.push({ i: tl.i + di, j: tl.j + dj });
  return out;
}

/** Is `cell` inside the scene's map (not its padding)? */
function onMap(scene, cell) {
  const d = scene.dimensions;
  if (!d) return true;
  const size = scene.grid.size;
  const p = scene.grid.getTopLeftPoint(cell);
  return p.x >= d.sceneX - 1 && p.y >= d.sceneY - 1 && p.x + size <= d.sceneX + d.sceneWidth + 1 && p.y + size <= d.sceneY + d.sceneHeight + 1;
}

/** The creator's token on `scene`, or null. */
function creatorToken(actor, scene) {
  return scene?.tokens?.find(t => t.actor?.id === actor?.id && !suckedIn(t)) ?? null;
}

/* -------------------------------------------------- */
/*  Token changes (direct, or through the active GM)   */
/* -------------------------------------------------- */

/** An internal change → a Token update: {_id, x?, y?, hidden?, suck?: object|null (null unsets)}. */
function toUpdate(u) {
  const o = { _id: String(u?._id ?? "") };
  for (const k of ["x", "y"]) if (u?.[k] != null && Number.isFinite(Number(u[k]))) o[k] = Number(u[k]);
  if (typeof u?.hidden === "boolean") o.hidden = u.hidden;
  if (u?.suck === null) o[`flags.${NS}.-=${FLAG}`] = null;
  else if (u?.suck && typeof u.suck === "object") o[`flags.${NS}.${FLAG}`] = { templateId: String(u.suck.templateId ?? ""), creatorId: String(u.suck.creatorId ?? "") };
  return o;
}

/** Apply the changes: the tokens this user owns (all for the GM) here, the others by the active GM. */
async function changeTokens(scene, changes, creatorId) {
  if (!scene || !changes?.length) return false;
  const mine = game.user.isGM ? changes : changes.filter(u => scene.tokens.get(u._id)?.isOwner);
  const rest = changes.filter(u => !mine.includes(u));
  if (mine.length) await scene.updateEmbeddedDocuments("Token", mine.map(toUpdate), { animate: false });
  if (!rest.length) return true;
  if (!game.users.activeGM) { ui.notifications.warn("No GM is connected: the GM has to change the other tokens."); return !!mine.length; }
  game.socket.emit(SOCKET, { type: "waterspoutTokens", userId: game.user.id, sceneId: scene.id, creatorId, changes: rest });
  return true;
}

/* -------------------------------------------------- */
/*  Sucking in                                         */
/* -------------------------------------------------- */

/** A card button handled by registerWaterspout. */
function btn(op, data, label, icon, title = "") {
  const attrs = Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ");
  return `<button type="button" class="icon-btn icon-btn--sm" data-action="iconSpout" data-op="${op}" ${attrs} title="${esc(title || label)}"><i class="fa-solid ${icon}"></i> ${esc(label)}</button>`;
}

/**
 * A card with the characters in range of the spout that it may suck in: after it is summoned and at the start of
 * the creator's turn. Nothing when no one is in range.
 * @param {MeasuredTemplateDocument} doc
 * @param {"summoned"|"start"} when
 */
export async function offerSuckIn(doc, when) {
  const s = spoutOf(doc);
  if (!s) return;
  const scene = doc.parent;
  const spout = doc.flags[NS].cells;
  const range = s.rules.suck.range;
  const own = creatorToken(s.actor, scene);
  const near = scene.tokens.filter(t => t.actor && !isMapObject(t) && !suckedIn(t)
    && cellsOfToken(t).some(c => spout.some(k => cheb(c, k) <= range)));
  if (!near.length) return;
  const base = { "scene-id": scene.id, "template-id": doc.id, creator: s.actor?.id ?? "" };
  const rows = near.map(t => {
    const foe = isHostile(t) !== isHostile(own);
    return `<div><strong>${esc(t.name)}</strong> <small>(${foe ? "foe: a save avoids it" : "ally: only if they agree"})</small> ${foe
      ? btn("in", { ...base, "token-id": t.id, foe: 1 }, "Save, then suck in", "fa-dice-d20", "Rolls their save: sucked in on a failure")
      : btn("in", { ...base, "token-id": t.id }, "Suck in", "fa-tornado")}</div>`;
  }).join("");
  await ChatMessage.create({
    speaker: s.actor ? ChatMessage.getSpeaker({ actor: s.actor }) : ChatMessage.getSpeaker(),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-tornado"></i> ${esc(s.name)} — ${when === "summoned" ? "summoned" : `start of ${esc(s.actor?.name ?? "the creator")}'s turn`}</strong>
      <p><small>${esc(s.rules.suck.rule)} (p.235)</small></p>${rows}
      <p><small>A character sucked in is hidden from the players and stays off the battlefield until it is spat out at the end of your turn.</small></p>
      <div>${btn("spitCard", base, "Spit them out now", "fa-wind", "The spit-out card, without waiting for the end of the turn")}</div></div>`,
  });
}

/** Suck `td` into the spout: hidden, flagged. A foe saves first (sucked in on a failure). */
async function suckIn(doc, td, foe) {
  const s = spoutOf(doc);
  if (!s) { ui.notifications.info("That waterspout is gone."); return false; }
  if (suckedIn(td)) { ui.notifications.info(`${td.name} is already inside.`); return true; }
  if (foe) {
    const { saveRoll } = await import("../dice/rolls.mjs");
    const r = await saveRoll({ statusLabel: s.name, actor: td.actor, subtitle: `${s.item?.name ?? s.name} — ${s.actor?.name ?? "?"} → ${td.name}`,
      successText: `Saved — not sucked in.`, failureText: `Failed — sucked into the ${s.name.toLowerCase()}.` });
    if (r?.success) return true;
  }
  td.object?.setTarget?.(false, { releaseOthers: false });
  const ok = await changeTokens(doc.parent, [{ _id: td.id, hidden: true, suck: { templateId: doc.id, creatorId: s.actor?.id ?? "" } }], s.actor?.id ?? "");
  if (ok) _log(`${td.name} sucked into ${s.name}`);
  return ok;
}

/* -------------------------------------------------- */
/*  Spitting out                                       */
/* -------------------------------------------------- */

/**
 * The card with a "Place" button for each character inside the creator's spouts (end of their turn), or for the
 * characters of one spout that was removed (`gone`: its cells, no shove).
 * @param {Scene} scene
 * @param {Actor|null} actor     the creator
 * @param {{templateId?: string, gone?: Array<{i:number,j:number}>, name?: string}} [opts]
 */
export async function postSpitOut(scene, actor, { templateId = "", gone = null, name = "" } = {}) {
  if (!scene) return;
  const inside = scene.tokens.filter(t => {
    const f = suckedIn(t);
    return f && (templateId ? f.templateId === templateId : f.creatorId === actor?.id);
  });
  if (!inside.length) return;
  const byTpl = new Map();
  for (const t of inside) byTpl.set(suckedIn(t).templateId, [...(byTpl.get(suckedIn(t).templateId) ?? []), t]);
  const parts = [];
  for (const [tid, tds] of byTpl) {
    const doc = gone ? null : scene.templates.get(tid);
    const s = doc ? spoutOf(doc) : null;
    const cells = gone ?? doc?.flags?.[NS]?.cells ?? [];
    const range = s?.rules?.spit?.range ?? 2;
    const base = { "scene-id": scene.id, "template-id": tid, creator: actor?.id ?? suckedIn(tds[0]).creatorId, cells: cells.map(cellKey).join(";"), range };
    parts.push(`<p><small>${esc(s?.rules?.spit?.rule || `Place them in any other free space in range ${range} outside of the spout.`)} ${esc(PLACE_RULE)}</small></p>`);
    parts.push(...tds.map(t => `<div>${btn("out", { ...base, "token-id": t.id }, `Place ${t.name}`, "fa-location-dot", `Click a free space in range ${range} outside the spout`)}</div>`));
    if (s?.rules?.shove && !gone) {
      const sh = s.rules.shove;
      parts.push(`<p><small>${esc(sh.source)}: ${esc(sh.rule)}</small></p><div>${btn("shove", { ...base, tokens: tds.map(t => t.id).join(","), steps: sh.steps }, `Shove them ${sh.steps} away`, "fa-arrows-left-right", "After placing them: each one spat out is pushed straight away from the spout")}</div>`);
    }
  }
  const title = gone ? `${name || "The waterspout"} is gone — place the characters inside back` : `End of ${actor?.name ?? "the creator"}'s turn — the waterspout spits out`;
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-wind"></i> ${esc(title)}</strong>${parts.join("")}</div>`,
  });
}

/** The spout's spaces now (the template if it is still there, else the ones on the button). */
function spoutCells(scene, ds) {
  const doc = scene.templates.get(ds.templateId);
  if (doc?.flags?.[NS]?.cells?.length) return doc.flags[NS].cells;
  return String(ds.cells ?? "").split(";").filter(Boolean).map(s => { const [i, j] = s.split(",").map(Number); return { i, j }; });
}

/** Why `td` can't stand with its top-left on `at` ("" when it can): on the map, free, outside the spout. */
function blockedAt(td, at, spoutKeys) {
  const scene = td.parent;
  const cells = cellsOfToken(td, at);
  if (cells.some(c => !onMap(scene, c))) return "That space is off the map.";
  if (cells.some(c => spoutKeys.has(cellKey(c)))) return "Outside the spout: pick another space.";
  const taken = new Set();
  for (const t of scene.tokens) if (t.id !== td.id && !suckedIn(t)) for (const c of cellsOfToken(t)) taken.add(cellKey(c));
  if (cells.some(c => taken.has(cellKey(c)))) return "That space isn't free.";
  return "";
}

/** Place a sucked-in character on a clicked space: shown again, flag gone. */
async function spitOut(scene, td, ds) {
  if (!suckedIn(td)) { ui.notifications.info(`${td.name} is no longer inside.`); return true; }
  if (scene !== canvas?.scene) { ui.notifications.warn("Open the scene of that waterspout first."); return false; }
  const spout = spoutCells(scene, ds);
  const keys = new Set(spout.map(cellKey));
  const range = Number(ds.range) || 2;
  const cells = await pickSpaces({ max: 1, color: TERRAIN_COLORS.mark, hint: `Place ${td.name}: a free space in range ${range} of the spout, outside it.`,
    check: (c) => {
      const why = blockedAt(td, c, keys);
      if (why) return why;
      return spout.length && !cellsOfToken(td, c).some(x => spout.some(k => cheb(x, k) <= range)) ? `Within range ${range} of the spout.` : "";
    } });
  if (!cells?.length) return false;
  const p = scene.grid.getTopLeftPoint(cells[0]);
  return changeTokens(scene, [{ _id: td.id, x: p.x, y: p.y, hidden: false, suck: null }], ds.creator);
}

/** Talent I: each character spat out pushed `steps` straight away from the spout's centre (blocked ones by hand). */
async function shoveAway(scene, ds) {
  const spout = spoutCells(scene, ds);
  if (!spout.length) return false;
  const ci = spout.reduce((n, c) => n + c.i, 0) / spout.length;
  const cj = spout.reduce((n, c) => n + c.j, 0) / spout.length;
  const keys = new Set(spout.map(cellKey));
  const steps = Number(ds.steps) || 1;
  const tds = String(ds.tokens ?? "").split(",").map(id => scene.tokens.get(id)).filter(Boolean);
  const waiting = tds.filter(t => suckedIn(t));
  if (waiting.length) { ui.notifications.warn(`Place ${waiting.map(t => t.name).join(", ")} first.`); return false; }
  const changes = [], blocked = [];
  for (const td of tds) {
    const own = cellsOfToken(td);
    const ti = own.reduce((n, c) => n + c.i, 0) / own.length;
    const tj = own.reduce((n, c) => n + c.j, 0) / own.length;
    const di = Math.sign(Math.round(ti - ci)), dj = Math.sign(Math.round(tj - cj));
    if (!di && !dj) { blocked.push(td.name); continue; }
    const at = { i: own[0].i + di * steps, j: own[0].j + dj * steps };
    if (blockedAt(td, at, keys)) { blocked.push(td.name); continue; }
    const p = scene.grid.getTopLeftPoint(at);
    changes.push({ _id: td.id, x: p.x, y: p.y });
  }
  if (changes.length) await changeTokens(scene, changes, ds.creator);
  if (blocked.length) ui.notifications.info(`${blocked.join(", ")}: blocked, shove by hand (they may collide).`);
  return true;
}

/* -------------------------------------------------- */
/*  Turns                                              */
/* -------------------------------------------------- */

/**
 * Start of `combatant`'s turn (active GM, IconCombat): a reminder when they are inside a spout (no turn until they
 * return), and the suck-in card for the spouts they created.
 * @param {Combatant} combatant
 */
export async function waterspoutTurnStart(combatant) {
  const td = combatant?.token;
  const scene = td?.parent ?? combatant?.parent?.scene ?? canvas?.scene;
  if (!scene) return;
  if (td && suckedIn(td)) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: td }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-tornado"></i> ${esc(td.name)} is inside the waterspout</strong><p>${esc(TURN_RULE)} Pass this turn to someone else.</p></div>`,
    });
    return;
  }
  const actor = combatant?.actor;
  if (!actor) return;
  for (const doc of scene.templates) {
    if (doc.flags?.[NS]?.actorId !== actor.id || !spoutOf(doc)) continue;
    await offerSuckIn(doc, "start");
  }
}

/** End of `combatant`'s turn (active GM, IconCombat): the spit-out card for the characters in their spouts. */
export async function waterspoutTurnEnd(combatant) {
  const actor = combatant?.actor;
  const scene = combatant?.token?.parent ?? combatant?.parent?.scene ?? canvas?.scene;
  if (actor && scene) await postSpitOut(scene, actor);
}

/* -------------------------------------------------- */
/*  Hooks                                              */
/* -------------------------------------------------- */

export function registerWaterspout() {
  Hooks.on("renderChatMessageHTML", (_message, html) => {
    for (const b of html.querySelectorAll('[data-action="iconSpout"]')) {
      if (b.dataset.iconBound) continue;
      b.dataset.iconBound = "true";
      const off = (why) => { b.disabled = true; b.title = why; b.style.opacity = "0.5"; };
      const creator = game.actors?.get(b.dataset.creator);
      if (!game.user.isGM && !creator?.isOwner) { off("Only the GM or the waterspout's creator"); continue; }
      b.addEventListener("click", async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        if (b.disabled) return;
        const ds = b.dataset;
        const scene = game.scenes?.get(ds.sceneId);
        if (!scene) { ui.notifications.warn("That scene is gone."); return; }
        b.disabled = true;
        let done = false;
        try {
          if (ds.op === "spitCard") {
            await postSpitOut(scene, creator ?? null, { templateId: ds.templateId });
            done = false;
          } else if (ds.op === "shove") {
            done = await shoveAway(scene, ds);
          } else {
            const td = scene.tokens.get(ds.tokenId);
            if (!td) { ui.notifications.info("That character is no longer on the scene."); done = true; }
            else if (ds.op === "in") {
              const doc = scene.templates.get(ds.templateId);
              if (!doc) { ui.notifications.info("That waterspout is gone."); done = true; }
              else done = await suckIn(doc, td, !!ds.foe);
            } else if (ds.op === "out") done = await spitOut(scene, td, ds);
          }
        } catch (err) { console.warn(`[ICON | Waterspout] ${ds.op} failed`, err); }
        if (done) off("Done"); else b.disabled = false;
      });
    }
  });

  // The spout removed (Remove, Delete, used again) with characters inside: a card to place them back.
  Hooks.on("deleteMeasuredTemplate", (doc) => {
    if (game.users.activeGM?.id !== game.user.id) return;
    const scene = doc.parent;
    if (!scene?.tokens?.some(t => suckedIn(t)?.templateId === doc.id)) return;
    const f = doc.flags?.[NS] ?? {};
    const actor = game.actors?.get(f.actorId) ?? null;
    postSpitOut(scene, actor, { templateId: doc.id, gone: f.cells ?? [], name: terrainFlag(doc)?.name || f.abilityName || "" })
      .catch(err => console.warn("[ICON | Waterspout] place-back card failed", err));
  });

  // The GM side of a player's click on tokens they don't own: only position, hidden and the suckedIn flag, and
  // only for a player who owns the spout's creator.
  game.socket?.on(SOCKET, (msg) => {
    if (msg?.type !== "waterspoutTokens" || !game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    const requester = game.users.get(msg.userId) ?? null;
    const scene = game.scenes.get(msg.sceneId);
    const creator = game.actors?.get(msg.creatorId);
    if (!scene || !requester || !creator?.testUserPermission?.(requester, "OWNER")) {
      console.warn(`[ICON | Waterspout] ${requester?.name ?? "?"} doesn't own the waterspout's creator — tokens not changed`);
      return;
    }
    const updates = (Array.isArray(msg.changes) ? msg.changes : []).map(toUpdate).filter(u => scene.tokens.get(u._id));
    if (updates.length) scene.updateEmbeddedDocuments("Token", updates, { animate: false }).catch(err => console.error("ICON 1.5 | waterspout tokens failed", err));
  });
}
