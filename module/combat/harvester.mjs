/**
 * module/combat/harvester.mjs — the Harvester's job traits and summons (p.184).
 *
 *   Thrall  "Summon Action: At the start of your turn, all your thralls may dash 2 spaces, ignoring difficult
 *           terrain, then dealing 1 piercing damage to an adjacent foe. Then, remove each thrall and replace it
 *           with a plant." "You can have a maximum of six active thralls, and any number of plants."
 *           → at the start of the Harvester's turn (active GM, IconCombat), a card: the thralls are moved by hand,
 *           then "Strike and become plants" asks which adjacent foe each one hits, deals the 1 piercing damage and
 *           puts a Plant in each thrall's space. A seventh thrall is refused (pack-summons.mjs).
 *   Plant   "A plant space is dangerous terrain that only affects foes, and has a blessing token on it, which can be
 *           picked up if yourself or an ally enters its space. When the blessing is removed, remove the plant."
 *           → a foe entering, leaving or crossing a plant's space gets the dangerous terrain question
 *           (terrain-spaces.mjs offerTerrainOnMove, once a turn); an ally entering it is asked whether to pick the
 *           blessing up (+1 Blessed, the plant is removed).
 *   Mark of Tsumi  "At the end of your turn, deal 2 piercing damage to all foes marked by you, and bless either
 *           yourself, or all allies marked by you." → a card at the end of the turn with a damage button and the
 *           two blessing buttons (one of them).
 *   Gardener of Kin  "You can stack 2 marks on characters. Foes marked by you take +1 damage from summons."
 *           → two marks of the Harvester on one character (marks.mjs markLimit); +1 on the thralls' strike.
 *
 * Plants and thralls are recognised as the summons pack's Plant / Thrall (core keeps the pack entry in
 * `_stats.compendiumSource`, pack-summons.mjs keeps it in the `packSummon` flag).
 */

import { escapeHTML } from "../helpers/enrich.mjs";
import { loadSummonIndex } from "../helpers/summons.mjs";
import { marksBy } from "./marks.mjs";
import { sideOf } from "./damage-interrupts.mjs";

const _log = (...a) => console.debug("[ICON | Harvester]", ...a);
const NS = "icon-system";
const SOCKET = "system.icon-system";
export const MAX_THRALLS = 6;

/* -------------------------------------------------- */
/*  Recognising plants and thralls                      */
/* -------------------------------------------------- */

let _uuids = { plant: new Set(), thrall: new Set() };

/** Read the summons pack's Plant and Thrall entries once (ready hook). */
export async function loadHarvesterSummons() {
  const idx = await loadSummonIndex();
  _uuids = {
    plant:  new Set(idx.filter(e => /^plant$/i.test(e.name)).map(e => e.uuid)),
    thrall: new Set(idx.filter(e => /^thrall$/i.test(e.name)).map(e => e.uuid)),
  };
}

function _sourceOf(td) {
  const a = td?.actor;
  const key = String(a?.getFlag?.(NS, "packSummon") ?? "");
  return a?._stats?.compendiumSource || a?.baseActor?._stats?.compendiumSource || key.split("#")[1] || "";
}

/** Is this token document a Plant of the summons pack? */
export const isPlant = (td) => !!td?.actor && _uuids.plant.has(_sourceOf(td));
/** Is this token document a Thrall of the summons pack? */
export const isThrall = (td) => !!td?.actor && _uuids.thrall.has(_sourceOf(td));

/** The Plant entry of the summons pack (its uuid), or "". */
const plantUuid = () => [..._uuids.plant][0] ?? "";

/** Is `uuid` the summons pack's Thrall? */
export const isThrallUuid = (uuid) => _uuids.thrall.has(uuid);

/** `summoner`'s thralls on `scene` (unlinked tokens naming them as summoner). */
export function thrallsOf(summoner, scene) {
  if (!summoner || !scene) return [];
  return scene.tokens.filter(t => isThrall(t) && t.actor?.system?.summonerActorId === summoner.id);
}

const hasTrait = (actor, re) => !!actor?.items?.some(i => i.type === "trait" && re.test(i.name ?? ""));

/* -------------------------------------------------- */
/*  Cells                                               */
/* -------------------------------------------------- */

function cellsOf(td) {
  const grid = td.parent.grid;
  const half = grid.size / 2;
  const tl = grid.getOffset({ x: td.x + half, y: td.y + half });
  const w = Math.max(1, Math.round(td.width ?? 1)), h = Math.max(1, Math.round(td.height ?? 1));
  const out = [];
  for (let di = 0; di < h; di++) for (let dj = 0; dj < w; dj++) out.push({ i: tl.i + di, j: tl.j + dj });
  return out;
}

/** Spaces between two footprints: 0 overlapping, 1 adjacent. */
function gap(a, b) {
  let best = Infinity;
  for (const p of a) for (const q of b) best = Math.min(best, Math.max(Math.abs(p.i - q.i), Math.abs(p.j - q.j)));
  return best;
}

/* -------------------------------------------------- */
/*  Plants on the move (called from terrain-spaces.mjs)  */
/* -------------------------------------------------- */

/**
 * A token moved: the plants whose space it entered, left or crossed.
 * @param {TokenDocument} td
 * @param {Array} before  footprint before the move
 * @param {Array} after   footprint after the move
 * @param {Array<Array>} mid  footprints crossed on the way
 * @returns {{danger: object|null, entered: TokenDocument[]}}  the dangerous-terrain spec for a foe (as
 *   offerTerrainOnMove builds it), the plants whose space it ended in or crossed
 */
export function plantsOnMove(td, before, after, mid = []) {
  const scene = td.parent;
  if (!scene || isPlant(td) || isThrall(td)) return { danger: null, entered: [] };
  let danger = null;
  const entered = [];
  for (const p of scene.tokens) {
    if (!isPlant(p)) continue;
    const pc = cellsOf(p);
    const was = gap(before, pc) === 0, now = gap(after, pc) === 0;
    const crossed = !was && !now && mid.some(fp => gap(fp, pc) === 0);
    if (was === now && !crossed) continue;
    if (!danger) danger = { f: { label: "Plant" }, entered: now || crossed, crossed, doc: { flags: { [NS]: { abilityName: "Harvester" } } } };
    if (now || crossed) entered.push(p);
  }
  return { danger, entered };
}

/**
 * An ally entered (or crossed) a plant's space: pick its blessing up? +1 Blessed, and the plant goes ("When the
 * blessing is removed, remove the plant", p.184). One question per plant.
 * @param {TokenDocument} td  the ally
 * @param {TokenDocument[]} plants
 */
export async function offerPlantBlessings(td, plants) {
  if (!td.actor || td.actor.type === "summon") return;
  for (const p of plants) {
    if (!td.parent?.tokens?.get(p.id)) continue;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Plant — blessing" },
      content: `<p><strong>${escapeHTML(td.name)}</strong> entered the space of a <strong>plant</strong>: pick up its blessing token? `
        + `${escapeHTML(td.name)} gains a blessing and the plant is removed (p.184).</p>`,
      yes: { label: "Pick up blessing" }, no: { label: "Not now" }, rejectClose: false,
    }) ?? false;
    if (!ok) continue;
    await pickUpPlantBlessing(td.actor, p);
  }
}

async function pickUpPlantBlessing(picker, plant) {
  // Here when the picker is this user's, otherwise through the GM (inflict-status.mjs).
  const { grantStatus } = await import("./inflict-status.mjs");
  await grantStatus({ target: picker, statusId: "blessed", label: "Blessed", abilityName: "Plant" });
  await _removeTokens(plant.parent, [plant.id]);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: picker }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-seedling"></i> ${escapeHTML(picker.name)}</strong>
      picks up the blessing token of a plant (+1 Blessed); the plant is removed (p.184).</div>`,
  });
}

/** Delete tokens: here when this user may, otherwise by the active GM. */
async function _removeTokens(scene, ids) {
  ids = ids.filter(id => scene?.tokens?.get(id));
  if (!ids.length) return;
  if (ids.every(id => scene.tokens.get(id).isOwner) || game.user.isGM) { await scene.deleteEmbeddedDocuments("Token", ids); return; }
  if (!game.users.activeGM) { ui.notifications.warn("No GM is connected — the GM removes it."); return; }
  game.socket.emit(SOCKET, { type: "harvesterRemoveTokens", userId: game.user.id, sceneId: scene.id, ids });
}

/* -------------------------------------------------- */
/*  Thralls: start of the Harvester's turn              */
/* -------------------------------------------------- */

/**
 * Start of `actor`'s turn (active GM): their thralls' Summon Action, as a card with the button that resolves it.
 * @param {Actor} actor
 */
export async function thrallsTurnStart(actor) {
  if (actor?.type !== "icon") return;
  const scene = game.combat?.scene ?? canvas?.scene;
  const thralls = thrallsOf(actor, scene);
  if (!thralls.length) return;
  _log(`thrallsTurnStart — ${actor.name}: ${thralls.length} thrall(s)`);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--terrain">
      <p><strong><i class="fa-solid fa-ghost"></i> ${escapeHTML(actor.name)}'s thralls</strong> (${thralls.length}) — Summon Action, start of the turn (p.184)</p>
      <p><small>Each thrall may dash 2 spaces (ignoring difficult terrain), then deals 1 piercing damage to an adjacent foe; then each thrall is replaced with a plant. Move the thralls first, then press the button.</small></p>
      <div><button type="button" class="icon-chat-btn" data-action="harvesterThralls" data-summoner-uuid="${escapeHTML(actor.uuid)}" data-scene-id="${escapeHTML(scene.id)}">
        <i class="fa-solid fa-seedling"></i> Strike and become plants</button></div>
    </div>`,
  });
}

/**
 * The button: which adjacent foe each thrall hits (none is fine), the damage, then each thrall becomes a plant.
 * @param {Actor} summoner
 * @param {Scene} scene
 */
export async function resolveThralls(summoner, scene) {
  const thralls = thrallsOf(summoner, scene);
  if (!thralls.length) { ui.notifications.info(`${summoner.name} has no thralls on this scene.`); return false; }
  const side = sideOf(summoner);
  const gardener = hasTrait(summoner, /^gardener of kin$/i);
  const markedBy = new Set(marksBy(summoner.id).map(m => m.targetActor?.uuid));
  const rows = thralls.map((t, k) => {
    const mine = cellsOf(t);
    const foes = scene.tokens.filter(o => o.actor && o.id !== t.id && !isPlant(o) && !isThrall(o)
      && sideOf(o.actor, o.id) !== side && gap(mine, cellsOf(o)) === 1);
    return { t, k, foes };
  });
  const dmgOf = (o) => 1 + (gardener && markedBy.has(o.actor?.uuid) ? 1 : 0);
  const content = `<p>Each thrall deals 1 piercing damage to an adjacent foe${gardener ? " (+1 to foes you marked: Gardener of Kin)" : ""}, then becomes a plant.</p>`
    + rows.map(({ t, k, foes }) => `<div class="form-group"><label>${escapeHTML(t.name)} ${k + 1}</label><select name="t${k}">
        <option value="">No foe adjacent / no strike</option>
        ${foes.map((o, n) => `<option value="${escapeHTML(o.id)}"${n === 0 ? " selected" : ""}>${escapeHTML(o.name)} (${dmgOf(o)} piercing)</option>`).join("")}
      </select></div>`).join("");
  let picked = null;
  try {
    picked = await foundry.applications.api.DialogV2.wait({
      window: { title: `${summoner.name}'s thralls` },
      content,
      buttons: [{ action: "ok", label: "Strike and become plants", default: true,
        callback: (_ev, button) => rows.map(({ k }) => button.form.elements[`t${k}`]?.value ?? "") },
      { action: "cancel", label: "Cancel" }],
      rejectClose: false,
    });
  } catch { picked = null; }
  if (!Array.isArray(picked)) return false;
  const { applyDamageToActor } = await import("./damage.mjs");
  for (let k = 0; k < rows.length; k++) {
    const foe = picked[k] ? scene.tokens.get(picked[k]) : null;
    if (!foe?.actor) continue;
    _log(`thrall ${k + 1} → ${foe.name}: ${dmgOf(foe)} piercing`);
    await applyDamageToActor(foe.actor, dmgOf(foe), { ignoreVigor: true, chatConfirm: true });
  }
  const ids = thralls.map(t => t.id);
  if (game.user.isGM) await thrallsToPlants(scene, ids, summoner);
  else if (game.users.activeGM) game.socket.emit(SOCKET, { type: "harvesterPlants", userId: game.user.id, sceneId: scene.id, ids, summonerId: summoner.id });
  else ui.notifications.warn("No GM is connected — the thralls can't become plants right now.");
  return true;
}

/** GM: replace each thrall with a Plant in its space. */
async function thrallsToPlants(scene, ids, summoner) {
  const uuid = plantUuid();
  if (!uuid) { ui.notifications.warn("The summons pack has no Plant."); return; }
  const { placePackSummon } = await import("../actor/pack-summons.mjs");
  const spots = ids.map(id => scene.tokens.get(id)).filter(Boolean).map(t => ({ id: t.id, x: t.x, y: t.y }));
  await scene.deleteEmbeddedDocuments("Token", spots.map(s => s.id));
  for (const s of spots) await placePackSummon({ uuid, summonerId: summoner.id, sceneId: scene.id, x: s.x, y: s.y });
  _log(`${spots.length} thrall(s) of ${summoner.name} became plants`);
}

/* -------------------------------------------------- */
/*  Mark of Tsumi: end of the Harvester's turn          */
/* -------------------------------------------------- */

/**
 * End of `actor`'s turn (active GM): the Mark of Tsumi card when they have the trait.
 * @param {Actor} actor
 */
export async function markOfTsumiTurnEnd(actor) {
  if (actor?.type !== "icon" || !hasTrait(actor, /^mark of tsumi$/i)) return;
  const { foes, allies } = _marked(actor);
  const names = (l) => l.map(a => escapeHTML(a.name)).join(", ");
  const btn = (op, label, icon, extra = "") => `<button type="button" class="icon-chat-btn" data-action="markOfTsumi" data-op="${op}" data-actor-uuid="${escapeHTML(actor.uuid)}"${extra}><i class="fa-solid ${icon}"></i> ${label}</button>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--terrain">
      <p><strong><i class="fa-solid fa-moon"></i> Mark of Tsumi</strong> — end of ${escapeHTML(actor.name)}'s turn (p.184)</p>
      <p><small>Deal 2 piercing damage to all foes marked by you, and bless either yourself, or all allies marked by you.</small></p>
      <div>${foes.length ? btn("damage", `2 piercing · ${names(foes)}`, "fa-burst") : `<small>No foe marked by ${escapeHTML(actor.name)}.</small>`}</div>
      <div>${btn("blessSelf", `Bless ${escapeHTML(actor.name)}`, "fa-hand-sparkles", ' data-bless="1"')}
        ${allies.length ? btn("blessAllies", `Bless ${names(allies)}`, "fa-hand-sparkles", ' data-bless="1"') : ""}</div>
    </div>`,
  });
}

/** Characters marked by `actor` on the scene, split into foes and allies (by side). */
function _marked(actor) {
  const side = sideOf(actor);
  const seen = new Map();
  for (const m of marksBy(actor.id)) if (m.targetActor && !m.tracked) seen.set(m.targetActor.uuid, m.targetActor);
  const all = [...seen.values()].filter(a => a.uuid !== actor.uuid);
  return { foes: all.filter(a => sideOf(a) !== side), allies: all.filter(a => sideOf(a) === side) };
}

async function resolveMarkOfTsumi(actor, op) {
  const { foes, allies } = _marked(actor);
  if (op === "damage") {
    const { applyDamageToActor } = await import("./damage.mjs");
    for (const f of foes) await applyDamageToActor(f, 2, { ignoreVigor: true, chatConfirm: true });
    return;
  }
  const { grantStatus } = await import("./inflict-status.mjs");
  const who = op === "blessSelf" ? [actor] : allies;
  for (const a of who) await grantStatus({ target: a, source: actor, statusId: "blessed", label: "Blessed", abilityName: "Mark of Tsumi" });
}

/* -------------------------------------------------- */
/*  Hooks                                               */
/* -------------------------------------------------- */

export function registerHarvesterHooks() {
  Hooks.once("ready", () => loadHarvesterSummons().catch(err => console.warn("[ICON | Harvester] summons index failed", err)));

  Hooks.on("renderChatMessageHTML", (_message, html) => {
    html.querySelectorAll('[data-action="harvesterThralls"]').forEach(btn => {
      if (btn.dataset.iconBound) return;
      btn.dataset.iconBound = "true";
      const summoner = fromUuidSync(btn.dataset.summonerUuid);
      if (!summoner?.isOwner) { btn.disabled = true; return; }
      btn.addEventListener("click", async ev => {
        ev.preventDefault(); ev.stopPropagation();
        btn.disabled = true;
        const scene = game.scenes.get(btn.dataset.sceneId);
        try { if (!(await resolveThralls(summoner, scene))) btn.disabled = false; }
        catch (err) { btn.disabled = false; console.error("ICON 1.5 | thralls failed", err); ui.notifications.error("The thralls' action failed (see console)."); }
      });
    });
    html.querySelectorAll('[data-action="markOfTsumi"]').forEach(btn => {
      if (btn.dataset.iconBound) return;
      btn.dataset.iconBound = "true";
      const actor = fromUuidSync(btn.dataset.actorUuid);
      if (!actor?.isOwner) { btn.disabled = true; return; }
      btn.addEventListener("click", async ev => {
        ev.preventDefault(); ev.stopPropagation();
        btn.disabled = true;
        // "bless either yourself, or all allies marked by you": one of the two.
        if (btn.dataset.bless) btn.closest("div")?.querySelectorAll("[data-bless]").forEach(b => { b.disabled = true; });
        try { await resolveMarkOfTsumi(actor, btn.dataset.op); }
        catch (err) { console.error("ICON 1.5 | Mark of Tsumi failed", err); ui.notifications.error("Mark of Tsumi failed (see console)."); }
      });
    });
  });

  // The GM side: thralls into plants, a plant picked up by a player who doesn't own it.
  game.socket?.on(SOCKET, async (msg) => {
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    if (msg?.type !== "harvesterPlants" && msg?.type !== "harvesterRemoveTokens") return;
    const scene = game.scenes.get(msg.sceneId);
    if (!scene) return;
    try {
      if (msg.type === "harvesterPlants") {
        const summoner = game.actors.get(msg.summonerId);
        const requester = game.users.get(msg.userId);
        if (!summoner || !summoner.testUserPermission(requester, "OWNER")) return;
        await thrallsToPlants(scene, (msg.ids ?? []).filter(id => isThrall(scene.tokens.get(id))), summoner);
      } else {
        // Only plants: a player may remove a plant by picking its blessing up, nothing else.
        const ids = (msg.ids ?? []).filter(id => isPlant(scene.tokens.get(id)));
        if (ids.length) await scene.deleteEmbeddedDocuments("Token", ids);
      }
    } catch (err) { console.error("ICON 1.5 | Harvester relay failed", err); }
  });
}
