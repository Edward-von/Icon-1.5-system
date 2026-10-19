/**
 * map-objects.mjs — the objects a PC's ability or trait puts on the map (R33a).
 *
 * The ability panel and the trait row show a chip for every object the text
 * creates (objectsForItem: "a height 1 boulder object", "Shrine — Height 1
 * object", "an object (Thrown Weapon, height 1)"). Dragging the chip onto the
 * scene places the object as a token of a world Summon actor, the same route
 * the foes' objects take (foe-summons.mjs):
 *   - one world actor per (character, item, object, height), in the "Map
 *     Objects" folder, owned like the character, with the creator as summoner
 *     and the text the object comes from as its Passive Effect, so the
 *     object's own rules are a click away (Spirit Shrine's height table);
 *   - an unlinked token where it was dropped, named "Boulder (height 1)", so
 *     each copy (Terraforming's two boulders, Underway's two portals) keeps
 *     its own height and hp.
 * Book rules applied on the drop (p.89, p.95): heights 1-3; objects can be
 *   stacked on other objects while the total height isn't past 3 (the token's
 *   elevation is the height under it); an object that "can't stack" (Underway)
 *   is refused on another object; "lasts until this ability is used again"
 *   asks whether to replace the earlier one (Underway places two portals per
 *   use, Spirit Shrine can be raised instead of moved). Objects stay when their
 *   creator is defeated: nothing removes them but a player or the GM.
 * An object's aura ("Object Effect: Aura 2") is placed around its token at
 * once and follows it (placeAuraOnToken); deleting the token removes it.
 * On the object's sheet: height − / + (Shrine "increasing the height by +1",
 * Terraforming "raise height of existing objects by +1") and, for the GM,
 * Destructible (10 hp, automatically hit, fails all saves, p.89).
 *
 * Creating actors is a GM job: a player's drop goes to the active GM over the
 * system socket, as for the foes' summons.
 */
import { objectsForItem, objectsInText, objectTokenName, objectRuleNotes, perHeightDamage, objectUpgrades, turnStartGrowth, objectUpgradeEffects, largestNumber } from "../helpers/objects.mjs";
import { armedInfusion, clearInfusion } from "../helpers/infuse.mjs";
import { summonImage } from "../helpers/summon-images.mjs";
import { placeAuraOnToken, tokenCells, tokensInCells, shapeCells } from "./area-templates.mjs";

const _log = (...a) => console.debug("[ICON | MapObjects]", ...a);
const NS = "icon-system";
const SOCKET = "system.icon-system";
const FLAG = "mapObject";
const FOLDER_NAME = "Map Objects";
const MAX_STACK = 3;
// Plant (p.184): "A plant space is dangerous terrain that only affects foes, and has a blessing token on it, which
// can be picked up if yourself or an ally enters its space. When the blessing is removed, remove the plant." The
// Megamushroom "counts as a plant, but isn't removed if the token is removed" (Spore Shroud p.187).
const PLANT_NOTE = "Counts as a plant (p.184): its space is dangerous terrain that only affects foes, and you or an ally entering it can pick up the blessing token. Unlike a plant, it stays when the token is picked up.";

export const MAP_OBJECT_DRAG = "IconMapObject";

/** The map-object flag of an actor or token document, or null. */
export const mapObjectFlag = (doc) => doc?.getFlag?.(NS, FLAG) ?? doc?.flags?.[NS]?.[FLAG] ?? null;

/** The objects of an item, as the sheet offers them (abilities and traits). */
export function objectsOfItem(item) {
  if (!item) return [];
  return objectsForItem(item.system, { trait: item.type === "trait" });
}

/** Is `obj`'s Infuse version (Pyrospire, Volcanic Geyser) the one armed on `item`? */
const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
function infuseArmedFor(item, obj) {
  const armed = armedInfusion(item?.parent);
  return !!armed && armed.itemId === item.id && sameName(armed.name, obj.infuse);
}

/**
 * Sheet chips: what the template needs for each object of an item. An Infuse
 * version's object (Pyroclast's PYROSPIRE, Geyser's VOLCANIC GEYSER) is offered
 * only while that infusion is armed, as the other Infuse versions (R33a2).
 * `index` stays the object's place in the full list: the drop reads it back.
 */
export function objectChips(item) {
  return objectsOfItem(item).map((o, index) => ({ o, index }))
    .filter(({ o }) => !o.infuse || infuseArmedFor(item, o))
    .map(({ o, index }) => ({
      index, name: o.name, height: o.height, aura: o.aura, source: o.source,
      label: `${o.name} · H${o.height}`,
    }));
}

/** Drag payload for object `index` of item `itemId` of `actor`. */
export function mapObjectDragData(actor, itemId, index) {
  return { type: MAP_OBJECT_DRAG, actorUuid: actor.uuid, itemId: String(itemId ?? ""), index: Number(index) };
}

/** Same object of the same item of the same character: what "used again" replaces. */
const groupOf = (owner, item, obj) => `${owner.id}#${item.id}#${obj.name}`;

/** The top-left point of the grid space under (x, y) on `scene`. */
const cellCorner = (scene, x, y) => scene.grid.getTopLeftPoint({ x, y });

/** Object tokens standing on the space whose top-left corner is `p`. */
function objectsAt(scene, p, { except = [] } = {}) {
  return scene.tokens.filter(t => !except.includes(t.id) && mapObjectFlag(t) && t.x === p.x && t.y === p.y);
}

/** Height of an object token (its synthetic actor's, so a raised copy counts as raised). */
export const tokenHeight = (td) => Math.max(1, Number(td?.actor?.system?.size) || Number(mapObjectFlag(td)?.height) || 1);

/* -------------------------------------------------- */
/*  Spaces, characters standing on objects (R33a4)     */
/* -------------------------------------------------- */

const cheb = (a, b) => Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));
/** Smallest distance between two sets of cells (0 = they share a space, 1 = adjacent, p.85). */
const gapBetween = (a, b) => { let best = Infinity; for (const x of a) for (const y of b) best = Math.min(best, cheb(x, y)); return best; };
/** The cells a token document covers on its own scene, at its place or at the top-left point `at`. */
function cellsOf(td, at = null) {
  const grid = td.parent.grid;
  const half = grid.size / 2;
  const tl = grid.getOffset({ x: (at?.x ?? td.x) + half, y: (at?.y ?? td.y) + half });
  return footprint(tl, td);
}
/** The cells a token of `td`'s size covers with its top-left cell at `tl`. */
function footprint(tl, td) {
  const w = Math.max(1, Math.round(td.width ?? 1)), h = Math.max(1, Math.round(td.height ?? 1));
  const out = [];
  for (let di = 0; di < h; di++) for (let dj = 0; dj < w; dj++) out.push({ i: tl.i + di, j: tl.j + dj });
  return out;
}
/** A foe for the rules "you and allies" / "foes that …": hostile token, or a foe / legend actor. */
const isHostile = (td) => td?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE || ["foe", "legend"].includes(td?.actor?.type);
/** Height of the objects stacked on the space whose top-left corner is `p` (0 = the ground). */
const groundAt = (scene, p, except = []) => objectsAt(scene, p, { except }).reduce((sum, t) => sum + tokenHeight(t), 0);

/**
 * The characters (not objects) standing on the space with top-left corner `p` at elevation `top`: "Characters can
 * stand on objects" (p.89). One that flies higher, or stands lower, is left alone.
 */
function standersOn(scene, p, top) {
  const grid = scene.grid;
  const cell = grid.getOffset({ x: p.x + grid.size / 2, y: p.y + grid.size / 2 });
  return scene.tokens.filter(t => !mapObjectFlag(t) && (Number(t.elevation) || 0) === top
    && cellsOf(t).some(c => c.i === cell.i && c.j === cell.j));
}

/**
 * Move tokens for an object's rule (stand on a stack, teleport through a portal, a geyser's placing): the tokens
 * the user may update directly, the others through the active GM (who checks that the user owns the object).
 * Never animated, and flagged so the movement offers (offerMoveTriggers) don't ask about it.
 * @param {TokenDocument} objectTd  the object whose rule moves them
 * @param {Array<{_id:string, x?:number, y?:number, elevation?:number}>} updates
 */
async function moveTokensFor(objectTd, updates) {
  const scene = objectTd?.parent;
  if (!scene || !updates?.length) return;
  const mine = game.user.isGM ? updates : updates.filter(u => scene.tokens.get(u._id)?.isOwner);
  const rest = updates.filter(u => !mine.includes(u));
  if (mine.length) await scene.updateEmbeddedDocuments("Token", mine, { animate: false, iconObjectMove: true });
  if (!rest.length) return;
  if (!game.users.activeGM) { ui.notifications.warn("No GM is connected — move the other tokens by hand."); return; }
  game.socket.emit(SOCKET, { type: "objectMoveTokens", userId: game.user.id, sceneId: scene.id, objectTokenId: objectTd.id, updates: rest });
}

/**
 * The top-left cells where token `td` could stand around `center` within `radius`, on free spaces only (no token
 * of any kind, inside the scene), that `keep(cell, cells)` accepts.
 */
function freeSpots(td, center, radius, keep) {
  const scene = td.parent;
  const grid = scene.grid;
  const size = grid.size;
  const rect = scene.dimensions.sceneRect;
  const taken = new Set();
  for (const t of scene.tokens) if (t.id !== td.id) for (const c of cellsOf(t)) taken.add(cellKey(c));
  const inScene = (c) => { const p = grid.getTopLeftPoint(c); return p.x >= rect.x && p.y >= rect.y && p.x + size <= rect.right && p.y + size <= rect.bottom; };
  const w = Math.max(1, Math.round(td.width ?? 1)), h = Math.max(1, Math.round(td.height ?? 1));
  const out = [];
  for (let i = center.i - radius - h; i <= center.i + radius + h; i++) for (let j = center.j - radius - w; j <= center.j + radius + w; j++) {
    const c = { i, j };
    const foot = footprint(c, td);
    if (foot.some(f => taken.has(cellKey(f)) || !inScene(f))) continue;
    if (keep(c, foot)) out.push(c);
  }
  return out;
}

const HL_PICK = "IconObjectPick";
let _picking = null;
/**
 * Let the user click one of `cells` on the map (highlighted). Resolves with the cell, or null on Esc /
 * right-click. Nothing moves until the click.
 */
function pickSpace(cells, hint) {
  if (!cells?.length || !canvas?.ready) return Promise.resolve(null);
  _picking?.cancel();
  return new Promise(resolve => {
    const keys = new Set(cells.map(cellKey));
    const hl = canvas.interface.grid;
    hl.addHighlightLayer(HL_PICK);
    for (const c of cells) {
      const p = canvas.grid.getTopLeftPoint(c);
      hl.highlightPosition(HL_PICK, { x: p.x, y: p.y, color: 0x2f9e6e, border: 0x2f9e6e, alpha: 0.30 });
    }
    let over = false;
    const done = (cell) => {
      if (over) return;
      over = true;
      canvas.stage.removeEventListener("pointerdown", down, { capture: true });
      window.removeEventListener("keydown", key, { capture: true });
      canvas.app.view.removeEventListener("contextmenu", ctx, { capture: true });
      try { hl.destroyHighlightLayer(HL_PICK); } catch { /* canvas gone */ }
      _picking = null;
      resolve(cell);
    };
    const down = (ev) => {
      const button = ev.button ?? ev.data?.button ?? 0;
      // Stop the right-click too, or a token under the cursor opens its HUD as the pick closes.
      if (button === 2) { ev.stopPropagation(); done(null); return; }
      if (button !== 0) return;
      ev.stopPropagation();
      const pos = ev.getLocalPosition(canvas.stage);
      const cell = canvas.grid.getOffset({ x: pos.x, y: pos.y });
      if (!keys.has(cellKey(cell))) { ui.notifications.warn("Pick one of the highlighted spaces (right-click or Esc to skip)."); return; }
      done(cell);
    };
    const key = (ev) => { if (ev.key === "Escape") { ev.preventDefault(); ev.stopImmediatePropagation(); done(null); } };
    const ctx = (ev) => ev.preventDefault();
    canvas.stage.addEventListener("pointerdown", down, { capture: true });
    window.addEventListener("keydown", key, { capture: true });
    canvas.app.view.addEventListener("contextmenu", ctx, { capture: true });
    _picking = { cancel: () => done(null) };
    ui.notifications.info(`${hint} Right-click or Esc to skip.`);
  });
}

/**
 * Put token `td` on the cell `cell` for an object's rule. A character standing on a stack where it was comes down
 * to the ground of the new space; one flying higher keeps its elevation.
 * @returns {object} the update
 */
function moveUpdate(td, cell) {
  const scene = td.parent;
  const p = scene.grid.getTopLeftPoint(cell);
  const elev = Number(td.elevation) || 0;
  const wasOn = groundAt(scene, { x: td.x, y: td.y });
  const update = { _id: td.id, x: p.x, y: p.y };
  if (elev === wasOn) update.elevation = groundAt(scene, p);
  return update;
}

/** World actor data for object `obj` of `item` of `owner`. */
function objectActorData(owner, item, obj, key, folderId) {
  const img = summonImage(obj.name, { kind: "object" });
  const flag = { key, group: groupOf(owner, item, obj), name: obj.name, height: obj.height,
    creatorId: owner.id, itemId: item.id, abilityName: item.name, aura: obj.aura || 0 };
  const extras = [obj.noObstruction ? "no obstruction" : "", obj.noStack ? "can't be stacked" : ""].filter(Boolean).join(", ");
  return {
    name: obj.name, type: "summon", img, folder: folderId,
    ownership: foundry.utils.deepClone(owner.ownership ?? {}),
    system: {
      summonerActorId:   owner.id,
      sourceAbilityName: item.name,
      intangible:        true,              // "immune to damage and effects unless specified" (p.89)
      size:              obj.height,
      hp:                { value: 10, max: 10 },
      defense:           0,
      speed:             0,
      summonAction:      "",
      summonEffect:      item.system?.[obj.field] ?? "",
      notes: `<p><strong>Height ${obj.height} object</strong> — ${foundry.utils.escapeHTML(owner.name)}, ${foundry.utils.escapeHTML(item.name)}${obj.source ? ` (${foundry.utils.escapeHTML(obj.source)})` : ""}${extras ? `; ${extras}` : ""}.</p>`
        + `<p>Objects provide obstruction and cover, can be stood on, and are immune to damage and effects unless specified. They can be stacked up to a total height of 3 and are not removed when their creator is defeated (p.89, p.95). The GM can make one destructible: 10 hp, automatically hit, fails all saves (p.89).</p>`,
    },
    prototypeToken: {
      name: objectTokenName(obj.name, obj.height), actorLink: false,
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      width: 1, height: 1, lockRotation: true,
      displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
      displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
      bar1: { attribute: "hp" },
      sight: { enabled: false },
      texture: { src: img },
      flags: { [NS]: { [FLAG]: flag } },
    },
    flags: { [NS]: { [FLAG]: flag } },
  };
}

/** The world folder objects are created in (made on first use). */
async function objectFolder() {
  const existing = game.folders.find(f => f.type === "Actor" && f.name === FOLDER_NAME && !f.folder);
  if (existing) return existing;
  return Folder.create({ name: FOLDER_NAME, type: "Actor", color: "#7a6a3a", sorting: "a" });
}

/** Resolve the dropped chip to its character, item and object. */
async function resolveDrop(data) {
  const owner = await fromUuid(data.actorUuid);
  const item = owner?.items?.get(data.itemId);
  const obj = objectsOfItem(item)[data.index];
  return { owner, item, obj };
}

/**
 * The drop, on the client that dropped: ask about replacing, then place (GM)
 * or send it to the active GM (player).
 */
async function dropMapObject(data) {
  const scene = canvas?.scene;
  if (!scene) return;
  const { owner, item, obj } = await resolveDrop(data);
  if (!obj) { ui.notifications.warn("That object is no longer on the sheet."); return; }
  if (!owner.isOwner) { ui.notifications.warn(`Only the owner of ${owner.name} or the GM can place its objects.`); return; }

  // "lasts until this ability is used again": the earlier one goes, unless this is the
  // same use (Underway's second portal) or the player keeps it on purpose.
  let replace = false;
  const group = groupOf(owner, item, obj);
  const earlier = scene.tokens.filter(t => mapObjectFlag(t)?.group === group);
  if (obj.replace && earlier.length) {
    replace = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${obj.name} — replace?` },
      content: `<p><strong>${foundry.utils.escapeHTML(item.name)}</strong>: the ${foundry.utils.escapeHTML(obj.name.toLowerCase())} lasts until this ability is used again.</p>
        <p>Remove the ${earlier.length > 1 ? `${earlier.length} already on this scene` : "one already on this scene"} and place the new one, or keep ${earlier.length > 1 ? "them" : "it"} (a second one in the same use)?</p>`,
      yes: { label: "Replace" }, no: { label: "Keep both" }, rejectClose: false,
    }) ?? false;
  }
  const payload = { ...data, sceneId: scene.id, replace: !!replace };

  if (!game.user.isGM) {
    if (!game.users.activeGM) { ui.notifications.warn("No GM is connected — can't place the object right now."); return; }
    game.socket.emit(SOCKET, { type: "placeMapObject", userId: game.user.id, data: payload });
    ui.notifications.info(`${obj.name} sent to the GM to place.`);
    return;
  }
  await placeMapObject(payload);
}

/** GM side: create (or reuse) the object's actor and put its token on the map. */
export async function placeMapObject(data, { requester = null } = {}) {
  const scene = data.sceneId ? game.scenes.get(data.sceneId) : canvas?.scene;
  if (!scene) return;
  const { owner, item, obj } = await resolveDrop(data);
  if (!obj) { ui.notifications.warn("That object is no longer on the sheet."); return; }
  if (requester && !owner.testUserPermission?.(requester, "OWNER")) {
    console.warn(`[ICON | MapObjects] ${requester.name} doesn't own "${owner.name}" — object not placed`);
    return;
  }
  const tell = (msg, kind = "warn") => {
    if (requester) game.socket.emit(SOCKET, { type: "mapObjectNotice", userId: requester.id, kind, msg });
    ui.notifications[kind](msg);
  };

  const group = groupOf(owner, item, obj);
  const old = data.replace ? scene.tokens.filter(t => mapObjectFlag(t)?.group === group).map(t => t.id) : [];

  // Stacking (p.95): on other objects only while the total height isn't past 3.
  const p = cellCorner(scene, data.x, data.y);
  const below = objectsAt(scene, p, { except: old });
  const under = below.reduce((sum, t) => sum + tokenHeight(t), 0);
  if (below.length && obj.noStack) {
    tell(`${obj.name} can't be stacked or placed on other objects — pick a free space.`);
    return;
  }
  if (under + obj.height > MAX_STACK) {
    tell(`${obj.name} (height ${obj.height}) can't go on top of height ${under}: stacked objects can't be past height ${MAX_STACK} (p.95).`);
    return;
  }

  const key = `${owner.uuid}#${item.id}#${obj.name}#${obj.height}`;
  let actor = game.actors.find(a => a.type === "summon" && mapObjectFlag(a)?.key === key);
  if (!actor) {
    const folder = await objectFolder();
    actor = await Actor.create(objectActorData(owner, item, obj, key, folder.id), { iconUnlinked: true });
    _log(`created world actor "${actor.name}" (${actor.id})`);
  }
  if (old.length) await scene.deleteEmbeddedDocuments("Token", old);

  // R33a4: a character standing on that space is lifted onto the new object: Pyroclast's "Create a height 1 magma
  // spire object under them, pushing them up" (p.221); "Characters can stand on objects" (p.89).
  const lifted = standersOn(scene, p, under);
  const td = await actor.getTokenDocument({ x: p.x, y: p.y, elevation: under, name: objectTokenName(obj.name, obj.height) });
  const [token] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  _log(`placed "${obj.name}" h${obj.height} at ${p.x},${p.y} (elevation ${under})${old.length ? `, replacing ${old.length}` : ""}`);

  // The object's aura goes around it and follows it.
  if (token && obj.aura) {
    try {
      await placeAuraOnToken(token, { actor: owner, size: obj.aura, abilityName: `${obj.name} (${item.name})`,
        abilityKey: `${item.id}:object`, flags: { mapObject: true } });
    } catch (err) { console.error("ICON 1.5 | object aura failed", err); }
  }
  if (token && lifted.length) {
    await scene.updateEmbeddedDocuments("Token", lifted.map(t => ({ _id: t.id, elevation: under + obj.height })), { animate: false, iconObjectMove: true });
    _log(`lifted ${lifted.length} character(s) onto "${obj.name}"`);
  }
  // R33a4: Comet's "Spaces adjacent to it have rampart" (p.128) shown as an Aura 1 that follows the weapon.
  if (token && objectRuleNotes(obj.rules).rampart) {
    try {
      await placeAuraOnToken(token, { actor: owner, size: 1, abilityName: `Rampart — ${obj.name} (${item.name})`,
        abilityKey: `${item.id}:rampart`, flags: { mapObject: true, rampart: true } });
    } catch (err) { console.error("ICON 1.5 | rampart area failed", err); }
  }
  // The armed Infuse version (Volcanic Geyser, Pyrospire) has been used by placing its object.
  if (token && obj.infuse && infuseArmedFor(item, obj)) {
    try { await clearInfusion(owner); } catch (err) { console.warn("[ICON | MapObjects] could not clear the infusion", err); }
  }
  tell(`${objectTokenName(obj.name, obj.height)} placed${under ? ` on height ${under}` : ""}${obj.aura ? ` with Aura ${obj.aura}` : ""}${lifted.length ? `, lifting ${lifted.map(t => t.name).join(", ")}` : ""} (${owner.name}).`, "info");
}

/**
 * Change the height of an object token by `delta` (the object's sheet). The
 * stack it stands in can't go past 3 (p.95); objects above it are lifted or
 * lowered with it.
 * @param {Actor} actor  the object's (synthetic) actor
 * @param {number} delta
 */
export async function changeObjectHeight(actor, delta) {
  const td = actor?.token ?? actor?.getActiveTokens?.(false, true)?.[0] ?? null;
  const now = Math.max(1, Number(actor?.system?.size) || 1);
  const next = Math.min(MAX_STACK, Math.max(1, now + delta));
  if (next === now) { ui.notifications.info(`Objects are height 1 to ${MAX_STACK} (p.89).`); return false; }
  let above = [];
  let standers = [];
  if (td?.parent) {
    const stack = objectsAt(td.parent, { x: td.x, y: td.y }, { except: [td.id] });
    const others = stack.reduce((sum, t) => sum + tokenHeight(t), 0);
    const total = others + next;
    if (total > MAX_STACK) { ui.notifications.warn(`This stack would be height ${total}: stacked objects can't be past height ${MAX_STACK} (p.95).`); return false; }
    above = stack.filter(t => (t.elevation ?? 0) > (td.elevation ?? 0));
    // R33a4: the characters standing on top of the stack go up or down with it (p.89).
    standers = standersOn(td.parent, { x: td.x, y: td.y }, others + now);
  }
  await actor.update({ "system.size": next });
  const name = mapObjectFlag(actor)?.name ?? actor.name;
  if (td) {
    await td.update({ name: objectTokenName(name, next) });
    if (above.length) await td.parent.updateEmbeddedDocuments("Token", above.map(t => ({ _id: t.id, elevation: (t.elevation ?? 0) + (next - now) })));
    if (standers.length) await moveTokensFor(td, standers.map(t => ({ _id: t.id, elevation: Math.max(0, (Number(t.elevation) || 0) + (next - now)) })));
  }
  _log(`"${name}" height ${now} → ${next}`);
  return true;
}

/**
 * GM: make an object destructible (10 hp, automatically hit, fails all saves,
 * p.89) or immune again.
 * @param {Actor} actor  the object's (synthetic) actor
 */
export async function toggleObjectDestructible(actor) {
  if (!game.user.isGM) { ui.notifications.warn("Only the GM can make an object destructible (p.89)."); return; }
  const destructible = !!actor.system.intangible;   // intangible = immune → becomes destructible
  await actor.update({ "system.intangible": !destructible, "system.hp": { value: 10, max: 10 }, "system.defense": 0 });
  const td = actor.token ?? actor.getActiveTokens?.(false, true)?.[0] ?? null;
  if (td) await td.update({ displayBars: destructible ? CONST.TOKEN_DISPLAY_MODES.ALWAYS : CONST.TOKEN_DISPLAY_MODES.NONE });
  ui.notifications.info(destructible ? `${actor.name} is destructible: 10 hp, automatically hit by attacks and effects, fails all saves (p.89).` : `${actor.name} is immune to damage and effects again.`);
}

/* -------------------------------------------------- */
/*  Walls around an object (R33a5)                     */
/* -------------------------------------------------- */

const WALL_FLAG = "objectWall";

/** The walls placed around object token `td` (flagged with its id), on its scene. */
export function objectWallsOf(td) {
  const scene = td?.parent;
  if (!scene?.walls) return [];
  return scene.walls.filter(w => w.flags?.[NS]?.[WALL_FLAG]?.tokenId === td.id);
}

/**
 * The four walls around the footprint of `td` with its top-left corner at `at` (its place by default):
 * "Objects … provide obstruction" (p.89, p.95) and "You can't move through obstructions … objects are obstructions
 * by default" (p.88), so they block movement; "By default, objects, characters, and all terrain other than impassable
 * terrain do not block line of sight" (p.92), so not sight, light or sound. Each wall is one-way: it stops a token
 * coming from outside but lets out what is inside (the object's own token when it is moved, a character standing on
 * it, p.89 "Characters can stand on objects"). Square grids only.
 */
function objectWallData(td, at = null) {
  const grid = td.parent.grid;
  const x0 = at?.x ?? td.x, y0 = at?.y ?? td.y;
  const x1 = x0 + Math.max(1, Math.round(td.width ?? 1)) * grid.size;
  const y1 = y0 + Math.max(1, Math.round(td.height ?? 1)) * grid.size;
  const center = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  const sides = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
  const { WALL_MOVEMENT_TYPES: MOVE, WALL_SENSE_TYPES: SENSE, WALL_DIRECTIONS: DIR } = CONST;
  return sides.map((c, side) => {
    // Foundry ignores a one-way wall for an origin on the side named by its direction (Edge#orientPoint:
    // orientation < 0 is LEFT): the object's centre is the side that passes.
    const o = foundry.utils.orient2dFast({ x: c[0], y: c[1] }, { x: c[2], y: c[3] }, center);
    return {
      c, move: MOVE.NORMAL, sight: SENSE.NONE, light: SENSE.NONE, sound: SENSE.NONE,
      dir: o < 0 ? DIR.LEFT : DIR.RIGHT,
      flags: { [NS]: { [WALL_FLAG]: { tokenId: td.id, side } } },
    };
  });
}

/**
 * GM, from the object's sheet: put walls around the object's token, or take them away. Only on a click — nothing
 * builds them by itself. Not for an object that doesn't provide obstruction (Underway p.168 "Portals don't provide
 * obstruction"). The walls follow the token when it moves and go when it is deleted (hooks below).
 * @param {Actor} actor  the object's (synthetic) actor
 */
export async function toggleObjectWalls(actor) {
  if (!game.user.isGM) { ui.notifications.warn("Only the GM can add or remove an object's walls."); return; }
  const td = objectToken(actor);
  const scene = td?.parent;
  if (!scene) { ui.notifications.warn("This object has no token on a scene."); return; }
  const have = objectWallsOf(td);
  if (have.length) {
    await scene.deleteEmbeddedDocuments("Wall", have.map(w => w.id));
    ui.notifications.info(`${td.name}: walls removed.`);
    return;
  }
  if (objectSheetInfo(actor)?.noObstruction) { ui.notifications.warn(`${td.name} doesn't provide obstruction (p.168): no walls.`); return; }
  if (scene.grid.type !== CONST.GRID_TYPES.SQUARE) { ui.notifications.warn("Walls around objects need a square grid."); return; }
  await scene.createEmbeddedDocuments("Wall", objectWallData(td));
  ui.notifications.info(`${td.name}: walls added — they block movement into its space (not sight) and follow the token. Flying and teleporting ignore objects' obstruction (p.88): use Foundry's teleport, or the GM's unconstrained movement, for those.`);
}

/** Move the walls of object `td` to its new top-left corner `to` (active GM). */
async function moveObjectWalls(td, to) {
  const walls = objectWallsOf(td);
  if (!walls.length) return;
  const data = objectWallData(td, to);
  const updates = walls.map(w => {
    const d = data[Number(w.flags[NS][WALL_FLAG].side) || 0];
    return { _id: w.id, c: d.c, dir: d.dir };
  });
  await td.parent.updateEmbeddedDocuments("Wall", updates);
}

/** Active GM, on a scene's load: walls left by an object token that no longer exists go. */
async function clearOrphanObjectWalls(scene) {
  const ids = scene?.walls?.filter(w => { const f = w.flags?.[NS]?.[WALL_FLAG]; return f && !scene.tokens.get(f.tokenId); }).map(w => w.id) ?? [];
  if (!ids.length) return;
  await scene.deleteEmbeddedDocuments("Wall", ids);
  _log(`removed ${ids.length} wall(s) of objects no longer on "${scene.name}"`);
}

/* -------------------------------------------------- */
/*  The object's rules at the table (R33a2)            */
/* -------------------------------------------------- */

/**
 * The token of an object's sheet: the synthetic actor's own. The world actor of the "Map Objects"
 * folder (its sheet opened from the sidebar) is only the template its copies are made from: no
 * token of its own (R33a3; before, it showed "total height 1" whatever the copies were).
 */
const objectToken = (actor) => actor?.isToken ? actor.token : null;

/** The copies of a world object actor on the current scene. */
const worldCopies = (actor) => {
  const key = mapObjectFlag(actor)?.key;
  return key && canvas?.scene ? canvas.scene.tokens.filter(t => mapObjectFlag(t)?.key === key) : [];
};

/**
 * Everything the object's sheet and its chat card show besides the full text:
 * its rules (the block that creates it, with its "Object Effect"), the total
 * height of its stack and the height benefits that are on now (Spirit Shrine
 * p.192: "benefits equal to its total height, including other objects it is
 * stacked on"), Comet's "you cannot attack" and "pick up", the talent / mastery
 * lines of the creator's ability that speak of it, and damage "per height"
 * (Spirit Patronage p.193).
 * @param {Actor} actor  the object's (synthetic) actor
 */
export function objectSheetInfo(actor) {
  const flag = mapObjectFlag(actor);
  if (!flag) return null;
  const own = Math.max(1, Number(actor.system?.size) || 1);
  const td = objectToken(actor);
  const below = Math.max(0, Number(td?.elevation) || 0);
  const total = below + own;
  const found = objectsInText(actor.system?.summonEffect);
  const obj = found.find(o => sameName(o.name, flag.name) && o.height === Number(flag.height))
    ?? found.find(o => sameName(o.name, flag.name)) ?? null;
  const rules = obj?.rules ?? "";
  const notes = objectRuleNotes(rules);
  const benefits = notes.benefits.map(b => ({ ...b, label: `${b.min}${b.plus ? "+" : ""}`, active: total >= b.min }));
  // The creator's ability, as it is now (talent chosen, mastery unlocked).
  const creator = game.actors?.get(flag.creatorId) ?? null;
  const item = creator?.items?.get(flag.itemId) ?? null;
  const field = item ? objectsOfItem(item).find(o => sameName(o.name, flag.name))?.field ?? "" : "";
  const upgrades = item ? objectUpgrades(item.system, flag.name, field) : [];
  const perHeight = upgrades.map(u => ({ ...u, dmg: perHeightDamage(u.text) })).find(u => u.dmg) ?? null;
  // R33a3: the world actor (sidebar) lists its copies on this scene instead of a height of its own.
  const world = !actor.isToken;
  const copies = world ? worldCopies(actor).map(t => {
    const h = tokenHeight(t), e = Math.max(0, Number(t.elevation) || 0);
    return { height: h, below: e, total: h + e, label: e ? `height ${h} on height ${e}` : `height ${h}` };
  }) : [];
  return {
    name: flag.name, height: own, below, total, onMap: !!td, world, copies,
    rules, benefits, upgrades,
    activeBenefits: benefits.filter(b => b.active),
    noAttack: notes.noAttack, pickUp: notes.pickUp,
    perHeight: perHeight ? { source: perHeight.source, amount: perHeight.dmg.amount, type: perHeight.dmg.type, times: own } : null,
    creatorName: creator?.name ?? "", abilityName: flag.abilityName ?? item?.name ?? "",
    // R33a3: Aethershard caught in an area, Megamushroom's blessing token / "counts as a plant", Geyser's eruption.
    areaTrigger: notes.areaTrigger,
    blessing: notes.blessing ? { taken: !!actor.getFlag?.(NS, "blessingTaken") } : null,
    countsAs: notes.countsAs,
    plantNote: notes.countsAs === "plant",
    erupt: notes.erupt ? { ...notes.erupt, placeUpgrades: upgrades.filter(u => /\bplaced\b/i.test(u.text)) } : null,
    // R33a4: Underway's teleport, Comet's rampart and pick up when moving, the talent / mastery effects on moving.
    portal: notes.portal, rampart: notes.rampart, pickUpNear: notes.pickUpNear,
    moves: objectUpgradeEffects(upgrades),
    // R33a5: Foundry walls around it (GM button); Underway "Portals don't provide obstruction" (p.168) gets none.
    noObstruction: !!obj?.noObstruction,
    walls: td ? objectWallsOf(td).length : 0,
  };
}

/** Post the object's rules and what is on now to chat (sheet button). */
export async function postObjectToChat(actor) {
  const info = objectSheetInfo(actor);
  if (!info) return;
  const esc = foundry.utils.escapeHTML;
  const { enrichHTML } = await import("../helpers/enrich.mjs");
  const lines = [];
  lines.push(`<p><strong>Height ${info.height}</strong>${info.below ? `, on height ${info.below} — total height ${info.total}` : ""}${info.creatorName ? ` · ${esc(info.creatorName)}, ${esc(info.abilityName)}` : ""}</p>`);
  if (info.rules) lines.push(`<p>${await enrichHTML(esc(info.rules))}</p>`);
  if (info.benefits.length) {
    lines.push(`<p><strong>Total height ${info.total} — on now:</strong></p><ul>${info.benefits.map(b =>
      `<li${b.active ? "" : ' style="opacity:.45"'}><strong>${b.label}:</strong> ${esc(b.text)}${b.active ? "" : " <em>(not yet)</em>"}</li>`).join("")}</ul>`);
  }
  for (const u of info.upgrades) lines.push(`<p><strong>${esc(u.source)}:</strong> ${await enrichHTML(esc(u.text))}</p>`);
  if (info.perHeight) lines.push(`<p><strong>${esc(info.perHeight.source)}:</strong> height ${info.height} → ${info.perHeight.amount} ${esc(info.perHeight.type)} damage ×${info.perHeight.times}.</p>`);
  if (info.noAttack) lines.push(`<p><em>While this object is on the map, ${esc(info.creatorName || "its creator")} cannot attack.</em></p>`);
  if (info.blessing) lines.push(`<p><strong>Blessing token:</strong> ${info.blessing.taken ? "picked up" : "on it"}.</p>`);
  if (info.plantNote) lines.push(`<p><em>${esc(PLANT_NOTE)}</em></p>`);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: game.actors?.get(mapObjectFlag(actor)?.creatorId) ?? actor }),
    content: `<div class="icon-chat-card icon-chat-card--object">
        <div class="icon-chat-card__header"><strong><i class="fa-solid fa-cube"></i> ${esc(info.name)}</strong> <span class="icon-badge">Object</span></div>
        ${lines.join("")}
      </div>`,
  });
}

/**
 * Take an object off the map (Comet's "Pick up", or any object removed): the
 * token goes, its aura with it, and the objects stacked on it come down
 * (deleteToken hook). Players can't delete tokens (Foundry's default), so a
 * player's request goes to the active GM.
 * @param {Actor} actor  the object's (synthetic) actor
 */
export async function removeMapObject(actor) {
  const td = objectToken(actor);
  if (!td?.parent) { ui.notifications.warn("This object has no token on a scene."); return; }
  if (game.user.isGM) { await td.parent.deleteEmbeddedDocuments("Token", [td.id]); return; }
  if (!actor.isOwner) { ui.notifications.warn("Only the owner of this object or the GM can remove it."); return; }
  if (!game.users.activeGM) { ui.notifications.warn("No GM is connected — can't remove the object right now."); return; }
  game.socket.emit(SOCKET, { type: "removeMapObject", userId: game.user.id, sceneId: td.parent.id, tokenId: td.id });
  actor.sheet?.close?.();
}

/**
 * The objects of `actor` on the current scene whose rules forbid attacking:
 * Comet, "While this object is active, you cannot attack" (p.128).
 * @returns {TokenDocument[]}
 */
export function objectsForbiddingAttacks(actor) {
  const scene = canvas?.scene;
  if (!scene || !actor) return [];
  return scene.tokens.filter(t => mapObjectFlag(t)?.creatorId === actor.id && t.actor && objectSheetInfo(t.actor)?.noAttack);
}

/**
 * Ask before an attack while one of `actor`'s objects forbids attacking (Comet, p.128).
 * Shared by every attack entry point (ability attacks, Light / Heavy Attack) so they all ask the same.
 * @param {Actor} actor
 * @param {string} attackName  shown in the dialog title
 * @returns {Promise<boolean>} true = go on with the roll
 */
export async function confirmAttackAllowed(actor, attackName) {
  const forbidding = objectsForbiddingAttacks(actor);
  if (!forbidding.length) return true;
  const names = forbidding.map(t => mapObjectFlag(t)?.name ?? t.name).join(", ");
  const go = await foundry.applications.api.DialogV2.confirm({
    window: { title: `${attackName} — you cannot attack` },
    content: `<p>Your <strong>${foundry.utils.escapeHTML(names)}</strong> is on the map: while this object is active, you cannot attack. Pick it up first (open the object, Pick up).</p><p>Roll the attack anyway?</p>`,
    yes: { label: "Roll anyway" }, no: { label: "Cancel", default: true }, rejectClose: false,
  });
  return !!go;
}

/* -------------------------------------------------- */
/*  What the objects set off (R33a3)                   */
/* -------------------------------------------------- */

const cellKey = (c) => `${c.i},${c.j}`;
/** Character tokens (not objects) in `cells` of the current scene. */
const charactersIn = (cells) => tokensInCells(cells).filter(t => !mapObjectFlag(t.document));

/**
 * An area `actor` just placed caught some of their objects whose rules trigger on it: the Aethershard,
 * "When you include the Aethershard in the area effect of any ability, the ability resonates with the shards, dealing
 * 2 piercing damage as an area effect, once, to all characters in the area for every one of your Aethershards caught in the same ability.
 * Then destroy all Aethershards activated this way and gain 1 Aether" (p.210). Asked like the Seer's wild cards
 * (wild-cards.mjs): on yes, a damage card (2 × shards, piercing, area, once) for the characters in the area, the
 * shards removed, the Aether gained.
 * @param {Array<{i:number,j:number}>} cells  the area's cells (after the wild cards)
 * @param {{actor: Actor, abilityName?: string}} opts
 */
export async function offerAreaObjectTriggers(cells, { actor, abilityName = "" } = {}) {
  const scene = canvas?.scene;
  if (!scene || !actor || !cells?.length) return;
  const set = new Set(cells.map(cellKey));
  const caught = [];
  for (const td of scene.tokens) {
    const flag = mapObjectFlag(td);
    // "every one of YOUR Aethershards"
    if (!flag || flag.creatorId !== actor.id || !td.actor) continue;
    if (!tokenCells(td).some(c => set.has(cellKey(c)))) continue;
    const trigger = objectSheetInfo(td.actor)?.areaTrigger;
    if (trigger) caught.push({ td, trigger, name: flag.name });
  }
  if (!caught.length) return;
  const esc = foundry.utils.escapeHTML;
  const n = caught.length;
  const { amount, type, aether } = caught[0].trigger;
  const total = amount * n;
  const name = caught[0].name;
  const plural = n > 1 ? `${name}s` : name;
  const targets = charactersIn(cells);
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: `${name} caught` },
    content: `<p>${abilityName ? `<strong>${esc(abilityName)}</strong> includes ` : "This area includes "}<strong>${n}</strong> of your ${esc(plural.toLowerCase())}.</p>
      <p>Deal <strong>${amount}${type ? ` ${type}` : ""} damage × ${n} = ${total}</strong> as an area effect, once, to all characters in the area
      (${targets.length ? esc(targets.map(t => t.name).join(", ")) : "no one"}), then destroy ${n > 1 ? "them" : "it"}${aether ? ` and gain ${aether} Aether` : ""} (p.210)?</p>`,
    yes: { label: "Resonate" }, no: { label: "Not this time" }, rejectClose: false,
  }) ?? false;
  if (!ok) return;

  // The shards go first: a damage card can't be undone, a removed shard can be placed again.
  for (const { td } of caught) {
    if (game.user.isGM) await td.parent.deleteEmbeddedDocuments("Token", [td.id]).catch(err => console.warn("[ICON | MapObjects] could not destroy", err));
    else game.socket.emit(SOCKET, { type: "removeMapObject", userId: game.user.id, sceneId: td.parent.id, tokenId: td.id });
  }
  if (aether && actor.type === "icon" && actor.isOwner) {
    const res = actor.system?.combat?.classResources?.aether;
    if (res) {
      const next = Math.min(Number(res.max) || 6, (Number(res.value) || 0) + aether);
      await actor.update({ "system.combat.classResources.aether.value": next });
    }
  }
  if (targets.length && total > 0) {
    const { postAbilityDamageCard } = await import("../combat/damage.mjs");
    const none = { mult: 0, fray: false, flat: 0 };
    await postAbilityDamageCard(actor, {
      parsed: { hit: { ...none }, miss: { ...none }, area: { ...none }, extras: [] },
      outcome: "other",
      other: { mult: 0, fray: false, flat: total, area: true, label: `${n} ${plural}` },
      damagedie: actor.system?.combat?.damagedie ?? "d6",
      fray: 0,
      abilityName: abilityName || name,
      pierce: type === "piercing",
      divine: type === "divine",
      targetIds: targets.map(t => t.id),
      targetName: targets.map(t => t.name).join(", "),
      statusBonus: false,
    });
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--object">
        <strong><i class="fa-solid fa-gem"></i> ${n} ${esc(plural)}</strong> resonate${abilityName ? ` with <strong>${esc(abilityName)}</strong>` : ""}
        <br><small>${amount}${type ? ` ${type}` : ""} damage × ${n} = ${total} to all characters in the area, once; the ${esc(n > 1 ? plural.toLowerCase() : name.toLowerCase())} ${n > 1 ? "are" : "is"} destroyed${aether ? ` and ${esc(actor.name)} gains ${aether} Aether` : ""} (p.210).</small>
      </div>`,
  });
  _log(`${n} ${name} caught by "${abilityName}" — ${total} damage to ${targets.length}`);
}

/**
 * Megamushroom: "The object has a blessing token on it and counts as a plant" (Spore Shroud p.187), and a plant's
 * blessing "can be picked up if yourself or an ally enters its space" (p.184). The character picking it up is the
 * token the user controls (not an object), else their assigned character; it gains one Blessed charge. The object
 * stays ("isn't removed if the token is removed"). Anyone may pick it up: the object's flag is set by its owner, or
 * by the active GM for an ally who doesn't own it.
 * @param {Actor} actor  the object's (synthetic) actor
 */
export async function pickUpObjectBlessing(actor, { picker: who = null } = {}) {
  const td = objectToken(actor);
  if (!td?.parent) { ui.notifications.warn("Open the sheet of the object's token on the scene to pick its blessing up."); return; }
  if (actor.getFlag(NS, "blessingTaken")) { ui.notifications.info("The blessing token has already been picked up."); return; }
  // R33a4: `who` is the character that just entered its space (offerMoveTriggers).
  const picker = who ?? canvas.tokens?.controlled?.find(t => t.actor && !mapObjectFlag(t.document))?.actor ?? game.user.character ?? null;
  if (!picker?.isOwner) { ui.notifications.warn("Select the token of the character picking the blessing up."); return; }
  const { adjustStatusCharges } = await import("../combat/statuses.mjs");
  await adjustStatusCharges(picker, "blessed", 1);
  if (actor.isOwner) await actor.setFlag(NS, "blessingTaken", true);
  else if (game.users.activeGM) game.socket.emit(SOCKET, { type: "objectBlessing", userId: game.user.id, sceneId: td.parent.id, tokenId: td.id });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: picker }),
    content: `<div class="icon-chat-card icon-chat-card--object"><strong><i class="fa-solid fa-hand-sparkles"></i> ${foundry.utils.escapeHTML(picker.name)}</strong>
      picks up the blessing token on the <strong>${foundry.utils.escapeHTML(mapObjectFlag(actor)?.name ?? actor.name)}</strong> (+1 Blessed; the object stays).</div>`,
  });
}

/**
 * Geyser's eruption (p.232): "If any character either starts or ends their turn on a geyser, you can cause it to
 * erupt, removing that character from the battlefield, then placing them one or two spaces away. Then, remove the
 * geyser. Effect: After the geyser is removed, summon a Salt Sprite in its space." Volcanic Geyser: "it removes
 * and places all characters in a medium blast area centered on it, and creates dangerous terrain under foes".
 * The card names the characters to place (the ones on the geyser, or in the blast around it) and what follows;
 * placing them and the Salt Sprite stay with the players (the Salt Sprite chip of the ability). The geyser goes.
 * @param {Actor} actor  the object's (synthetic) actor
 */
export async function eruptObject(actor) {
  const info = objectSheetInfo(actor);
  const td = objectToken(actor);
  if (!info?.erupt || !td?.parent) { ui.notifications.warn("This object has no token on the scene."); return; }
  if (td.parent.id !== canvas?.scene?.id) { ui.notifications.warn("View the scene the object is on first."); return; }
  const own = tokenCells(td);
  const cells = info.erupt.blast ? shapeCells({ kind: "blast", size: info.erupt.blast }, own[0]) : own;
  const placed = charactersIn(cells);
  const esc = foundry.utils.escapeHTML;
  const blastName = { s: "small", m: "medium", l: "large" }[info.erupt.blast] ?? "";
  const who = placed.length ? esc(placed.map(t => t.name).join(", ")) : "no one";

  // R33a4: how far they go ("one or two spaces away"; GREAT GEYSER "Allies can be placed up to three spaces away"),
  // and the Salt Sprite out of the summons pack. Asked first: nothing moves without a click.
  const base = largestNumber(info.erupt.place) || 2;
  const allyMax = Math.max(base, info.moves?.alliesPlace || 0);
  let sprite = null;
  if (info.erupt.summon) {
    try { const { loadSummonIndex } = await import("../helpers/summons.mjs"); sprite = (await loadSummonIndex()).find(e => sameName(e.name, info.erupt.summon)) ?? null; }
    catch (err) { console.warn("[ICON | MapObjects] summons index unavailable", err); }
  }
  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: `${info.name} — erupt` },
    content: `<p>Removed and placed: <strong>${who}</strong>.</p>
      ${placed.length ? `<label class="checkbox"><input type="checkbox" name="place" checked> Place them now: click a highlighted free space for each (up to ${base} spaces away${allyMax > base ? `, allies up to ${allyMax}` : ""}); Esc leaves one where it is</label>` : ""}
      ${info.erupt.summon ? (sprite
        ? `<label class="checkbox"><input type="checkbox" name="summon" checked> Then summon a ${esc(sprite.name)} in its space</label>`
        : `<p><em>${esc(info.erupt.summon)} not found in the summons pack: place it by hand.</em></p>`) : ""}`,
    buttons: [
      { action: "erupt", label: "Erupt", icon: "fa-solid fa-water", default: true,
        callback: (_e, button) => ({ place: !!button.form?.elements?.place?.checked, summon: !!button.form?.elements?.summon?.checked }) },
      { action: "cancel", label: "Cancel" },
    ],
    rejectClose: false,
  });
  if (!choice || typeof choice !== "object") return;

  const lines = [
    `<p><strong>Removed and placed${info.erupt.place ? ` ${esc(info.erupt.place)} spaces away` : ""}:</strong> ${who}${blastName ? ` (everyone in the ${blastName} blast centered on it)` : " (on the geyser)"}.</p>`,
  ];
  for (const u of info.erupt.placeUpgrades) lines.push(`<p><strong>${esc(u.source)}:</strong> ${esc(u.text)}</p>`);
  if (info.erupt.dangerous) lines.push(`<p>Create dangerous terrain under the foes placed.</p>`);
  lines.push(`<p>The ${esc(info.name.toLowerCase())} is removed.${info.erupt.summon ? (choice.summon && sprite ? ` Then a <strong>${esc(sprite.name)}</strong> is summoned in its space.` : ` Then summon a <strong>${esc(info.erupt.summon)}</strong> in its space (drag the chip from ${esc(info.abilityName || "the ability")}).`) : ""}</p>`);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: game.actors?.get(mapObjectFlag(actor)?.creatorId) ?? actor }),
    content: `<div class="icon-chat-card icon-chat-card--object">
        <div class="icon-chat-card__header"><strong><i class="fa-solid fa-water"></i> ${esc(info.name)} erupts</strong></div>
        ${lines.join("")}
      </div>`,
  });
  if (choice.place) {
    // One click per character, while the geyser is still there (its space isn't free).
    const landed = [];
    for (const t of placed) {
      const ttd = t.document;
      const max = isHostile(ttd) ? base : allyMax;
      const tl = cellsOf(ttd)[0];
      const spots = freeSpots(ttd, tl, max, (c) => { const d = cheb(c, tl); return d >= 1 && d <= max; });
      if (!spots.length) { ui.notifications.warn(`No free space up to ${max} away for ${ttd.name}: place them by hand.`); continue; }
      const cell = await pickSpace(spots, `Place ${ttd.name} up to ${max} space${max > 1 ? "s" : ""} away (${info.name}).`);
      if (cell) await moveTokensFor(td, [moveUpdate(ttd, cell)]);
      landed.push({ td: ttd, cell: cell ?? null });
    }
    // R33b: Volcanic Geyser "creates dangerous terrain under foes" (p.234) — a dangerous space under each foe placed,
    // where it landed (a relayed move may not have arrived yet), after asking.
    const foes = landed.filter(l => isHostile(l.td));
    if (info.erupt.dangerous && foes.length) {
      try {
        const { offerTerrainUnder } = await import("./terrain-spaces.mjs");
        const creator = game.actors?.get(mapObjectFlag(actor)?.creatorId) ?? null;
        await offerTerrainUnder(foes, { kind: "dangerous", label: "Dangerous" },
          { actor: creator, abilityName: info.name, itemId: mapObjectFlag(actor)?.itemId ?? "", title: `${info.name} — dangerous terrain` });
      } catch (err) { console.error("ICON 1.5 | dangerous terrain under foes failed", err); }
    }
  } else {
    // The characters to place are targeted, so the player can see them.
    try { for (const t of placed) t.setTarget(true, { releaseOthers: false }); } catch { /* targeting is a convenience */ }
  }
  const spot = { sceneId: td.parent.id, x: td.x, y: td.y, creatorId: mapObjectFlag(actor)?.creatorId ?? "" };
  await removeMapObject(actor);
  if (choice.summon && sprite) await summonInSpace({ ...spot, uuid: sprite.uuid, name: sprite.name });
}

/**
 * Summon a creature of the summons pack on a space (Geyser: "After the geyser is removed, summon a Salt Sprite in its
 * space", p.232). The world actor imported from the pack is reused if there is one, as a drag from the sheet would.
 * A player's request goes to the active GM, who checks that they own the creator.
 */
async function summonInSpace(data, { requester = null } = {}) {
  if (!game.user.isGM) {
    if (!game.users.activeGM) { ui.notifications.warn(`No GM is connected — place the ${data.name} by hand.`); return; }
    game.socket.emit(SOCKET, { type: "objectSummon", userId: game.user.id, data });
    return;
  }
  const scene = game.scenes.get(data.sceneId);
  if (!scene) return;
  if (requester && !game.actors.get(data.creatorId)?.testUserPermission?.(requester, "OWNER")) {
    console.warn(`[ICON | MapObjects] ${requester.name} doesn't own the creator — ${data.name} not summoned`);
    return;
  }
  const { loadSummonIndex } = await import("../helpers/summons.mjs");
  const entry = (await loadSummonIndex()).find(e => e.uuid === data.uuid);
  if (!entry) return;
  let actor = game.actors.find(a => a._stats?.compendiumSource === entry.uuid || a.flags?.core?.sourceId === entry.uuid);
  if (!actor) {
    const src = await fromUuid(entry.uuid);
    if (!src) return;
    actor = await Actor.create(game.actors.fromCompendium(src));
  }
  const td = await actor.getTokenDocument({ x: data.x, y: data.y });
  await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  _log(`summoned "${actor.name}" at ${data.x},${data.y}`);
}

/* -------------------------------------------------- */
/*  Moving through and around objects (R33a4)          */
/* -------------------------------------------------- */

/** The objects of the same character with the same name on `td`'s scene (Underway's portals), `td` left out. */
const networkOf = (td) => {
  const flag = mapObjectFlag(td);
  return td.parent.tokens.filter(t => t.id !== td.id && mapObjectFlag(t)?.creatorId === flag?.creatorId && sameName(mapObjectFlag(t)?.name, flag?.name));
};

/**
 * Underway (p.168): "As a free action ability, you and allies can teleport from any space adjacent to an underway to
 * a free adjacent space to any other underway." Bale Portal: "Foes that are shoved into portals or that end their
 * turn adjacent to an underway can be teleported to any free space adjacent to any other underway. A foe can pass a
 * save to avoid it … once a round. Bloodied foes fail the save."
 * The traveller clicks a highlighted free space next to one of `destinations`.
 * @param {TokenDocument} traveller
 * @param {TokenDocument[]} destinations  portals to arrive at
 * @param {TokenDocument} portal          a portal of the network (rules, permission for relayed moves)
 */
async function teleportVia(traveller, destinations, portal) {
  const info = objectSheetInfo(portal.actor);
  const hostile = isHostile(traveller);
  const pull = info?.moves?.pullFoes;
  if (hostile && !pull && !game.user.isGM) { ui.notifications.warn(`${info?.name ?? "This portal"}: only you and allies can teleport through it (p.168).`); return false; }
  // R33a5: Bale Portal, "can only be successfully teleported this way once a round" — read from the chat cards of
  // this combat round (everyone sees them; nothing to write on a foe the user doesn't own).
  const combat = game.combat?.started ? game.combat : null;
  const stamp = hostile && pull && combat ? { tokenId: traveller.id, combatId: combat.id, round: combat.round } : null;
  if (stamp && game.messages?.contents.some(m => { const b = m.flags?.[NS]?.balePortal; return b && b.tokenId === stamp.tokenId && b.combatId === stamp.combatId && b.round === stamp.round; })) {
    const msg = `${traveller.name} was already teleported by ${pull.source} this round: a foe can only be teleported this way once a round (p.168).`;
    if (!game.user.isGM) { ui.notifications.warn(msg); return false; }
    const again = await foundry.applications.api.DialogV2.confirm({ window: { title: `${pull.source} — once a round` }, content: `<p>${foundry.utils.escapeHTML(msg)} Teleport anyway?</p>`, rejectClose: false }) ?? false;
    if (!again) return false;
  }
  const spots = [];
  const seen = new Set();
  for (const d of destinations) {
    const pc = cellsOf(d);
    for (const c of freeSpots(traveller, pc[0], 1 + Math.max(traveller.width ?? 1, traveller.height ?? 1), (_c, foot) => gapBetween(foot, pc) === 1)) {
      if (!seen.has(cellKey(c))) { seen.add(cellKey(c)); spots.push(c); }
    }
  }
  if (!spots.length) { ui.notifications.warn(`No free space next to ${destinations.length > 1 ? "the other portals" : "that portal"}.`); return false; }
  const save = hostile && pull ? ` ${pull.source}: the foe can pass a save to avoid it (bloodied foes fail), once a round.` : "";
  const cell = await pickSpace(spots, `Teleport ${traveller.name}: click a free space next to ${destinations.length > 1 ? "another" : "the"} ${info?.name?.toLowerCase() ?? "portal"}.${save}`);
  if (!cell) return false;
  await moveTokensFor(portal, [moveUpdate(traveller, cell)]);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: traveller }),
    content: `<div class="icon-chat-card icon-chat-card--object"><strong><i class="fa-solid fa-dungeon"></i> ${foundry.utils.escapeHTML(traveller.name)}</strong>
      teleports through the <strong>${foundry.utils.escapeHTML(info?.name ?? "portal")}</strong>${hostile && pull ? ` (${foundry.utils.escapeHTML(pull.source)} — save, bloodied foes fail; once a round)` : " (free action, p.168)"}.</div>`,
    ...(stamp ? { flags: { [NS]: { balePortal: stamp } } } : {}),
  });
  return true;
}

/**
 * The portal's sheet: "Teleport here". The selected token (else the user's character) goes from a space adjacent to
 * another portal of the same character to a free space next to this one.
 * @param {Actor} actor  the portal's (synthetic) actor
 */
export async function teleportToObject(actor) {
  const dest = objectToken(actor);
  const info = objectSheetInfo(actor);
  if (!info?.portal || !dest?.parent) { ui.notifications.warn("This object has no token on the scene."); return; }
  if (dest.parent.id !== canvas?.scene?.id) { ui.notifications.warn("View the scene the object is on first."); return; }
  const traveller = canvas.tokens?.controlled?.find(t => !mapObjectFlag(t.document))?.document
    ?? game.user.character?.getActiveTokens?.(false, true)?.find(t => t.parent?.id === dest.parent.id) ?? null;
  if (!traveller) { ui.notifications.warn("Select the token of the character who teleports."); return; }
  const from = networkOf(dest).find(o => gapBetween(cellsOf(traveller), cellsOf(o)) === 1);
  if (!from) {
    if (!game.user.isGM) { ui.notifications.warn(`${traveller.name} must be in a space adjacent to another ${info.name.toLowerCase()} (p.168).`); return; }
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${info.name} — teleport` },
      content: `<p>${foundry.utils.escapeHTML(traveller.name)} isn't adjacent to another ${foundry.utils.escapeHTML(info.name.toLowerCase())}. Teleport anyway (a foe shoved into a portal, a ruling)?</p>`,
      rejectClose: false,
    }) ?? false;
    if (!ok) return;
  }
  await teleportVia(traveller, [dest], dest);
}

/**
 * Aethershard Talent I (p.210): "When you take any action that spends Aether, you can first remove one of your
 * Aethershards, then place it in any free space up to range 2 from its original location." The shard's sheet: click
 * a highlighted free space.
 * @param {Actor} actor  the object's (synthetic) actor
 */
export async function relocateObject(actor) {
  const td = objectToken(actor);
  const rel = objectSheetInfo(actor)?.moves?.relocate;
  if (!rel || !td?.parent) { ui.notifications.warn("This object has no token on the scene."); return; }
  if (td.parent.id !== canvas?.scene?.id) { ui.notifications.warn("View the scene the object is on first."); return; }
  const tl = cellsOf(td)[0];
  const spots = freeSpots(td, tl, rel.range, (c) => { const d = cheb(c, tl); return d >= 1 && d <= rel.range; });
  const cell = await pickSpace(spots, `${rel.source}: place the ${(mapObjectFlag(actor)?.name ?? actor.name).toLowerCase()} in a free space up to range ${rel.range}.`);
  if (!cell) return;
  const p = td.parent.grid.getTopLeftPoint(cell);
  await moveTokensFor(td, [{ _id: td.id, x: p.x, y: p.y }]);
}

/**
 * After a token moved (by its user, not by these rules): what the objects around offer, one question each.
 *   Comet (p.128)        "You can pick your weapon up if you enter or exit any space adjacent to it" — its creator
 *                        entered or left a space adjacent to the Thrown Weapon.
 *   Megamushroom / plant "can be picked up if yourself or an ally enters its space" (p.184, p.187) — not a foe.
 *   Underway (p.168)     a character (not a foe) came next to a portal: teleport to another one?
 * (Comet's rampart is checked before the move instead: rampartCheck.)
 * The spaces crossed count too (movePath: Foundry's waypoints of the move); the Underway question only where it ends.
 * @param {object|null} movement  Foundry's movement data of this update (options._movement[id]: Foundry 13 puts it under the underscored key), for its actions
 */
async function offerMoveTriggers(td, prev, to, movement = null, { elevationMoved = false } = {}) {
  const scene = td.parent;
  if (!scene || scene.id !== canvas?.scene?.id || !td.actor) return;
  const before = cellsOf(td, prev);
  // v13: inside updateToken the document may still report the pre-move x/y — the new spot is passed in.
  const after = cellsOf(td, to);
  if (before[0].i === after[0].i && before[0].j === after[0].j) return;
  const hostile = isHostile(td);
  const esc = foundry.utils.escapeHTML;
  const ask = (title, html, yes) => foundry.applications.api.DialogV2.confirm({ window: { title }, content: html, yes: { label: yes }, no: { label: "Not now" }, rejectClose: false }).then(r => !!r);
  if (!elevationMoved) await offerStepUpDown(td, before, after, ask);
  // R33a5: the spaces crossed on the way too (Foundry's waypoints of this move, each leg on its direct grid path).
  const path = movePath(td, prev, movement, before, after);
  const portalsAsked = new Set();
  for (const o of scene.tokens.filter(t => mapObjectFlag(t) && t.actor)) {
    if (!scene.tokens.get(o.id)) continue;            // gone meanwhile
    const flag = mapObjectFlag(o);
    const info = objectSheetInfo(o.actor);
    if (!info) continue;
    const oc = cellsOf(o);
    const wasNear = gapBetween(before, oc) === 1, isNear = gapBetween(after, oc) === 1;
    const passedNear = path.some(f => gapBetween(f, oc) === 1);
    if (info.pickUpNear && flag.creatorId === td.actor.id && (wasNear || isNear || passedNear)) {
      const how = isNear ? "entered" : wasNear ? "left" : "passed through";
      if (await ask(`${info.name} — pick up?`, `<p>${esc(td.name)} ${how} a space adjacent to the <strong>${esc(info.name)}</strong>: pick it up? It ends the effect and removes the object (p.128).</p>`, "Pick up"))
        await removeMapObject(o.actor);
      continue;
    }
    if (info.blessing && !info.blessing.taken && !hostile && gapBetween(before, oc) > 0 && path.some(f => gapBetween(f, oc) === 0)) {
      if (await ask(`${info.name} — blessing`, `<p>${esc(td.name)} ${gapBetween(after, oc) === 0 ? "entered" : "passed through"} the space of the <strong>${esc(info.name)}</strong>: pick up its blessing token (+1 Blessed; the object stays)?</p>`, "Pick up blessing"))
        await pickUpObjectBlessing(o.actor, { picker: td.actor });
      continue;
    }
    const net = flag.creatorId + "#" + String(flag.name).toLowerCase();
    if (info.portal && !hostile && isNear && !wasNear && !portalsAsked.has(net)) {
      portalsAsked.add(net);
      const others = networkOf(o);
      if (!others.length) continue;
      if (await ask(`${info.name} — teleport?`, `<p>${esc(td.name)} is next to the <strong>${esc(info.name)}</strong>: teleport to a free space next to ${others.length > 1 ? "another" : "the other"} one (free action, p.168)?</p>`, "Teleport"))
        await teleportVia(td, others, o);
    }
    // R33a5: Bale Portal, "Foes that are shoved into portals … can be teleported" (p.168): the system can't tell a
    // shove from the foe's own move, so the user who moved it is asked, only where the mastery is unlocked.
    if (info.portal && info.moves.pullFoes && hostile && isNear && !wasNear && !portalsAsked.has(net)) {
      portalsAsked.add(net);
      const others = networkOf(o);
      if (!others.length) continue;
      if (await ask(`${info.moves.pullFoes.source} — shoved into the portal?`, `<p>${esc(td.name)} ended next to the <strong>${esc(info.name)}</strong>. If it was <strong>shoved</strong> into the portal, ${esc(info.creatorName || "its creator")} can teleport it next to ${others.length > 1 ? "another" : "the other"} one: roll its save first (bloodied foes fail), once a round (p.168).</p>`, "Save failed — teleport"))
        await teleportVia(td, others, o);
    }
  }
}

/**
 * R33a5: the footprints a token covered on its way from `prev`, start and end included: Foundry's movement
 * data of the update gives the waypoints passed, each leg is followed on the grid's direct path — except a teleport
 * (Foundry's "blink" / "displace" action), which crosses nothing. Without it (a move made by code), only the start
 * and the end.
 */
export function movePath(td, prev, movement, before, after) {
  const grid = td.parent.grid;
  const half = grid.size / 2;
  const ok = (p) => Number.isFinite(p?.x) && Number.isFinite(p?.y);
  const stops = (movement?.passed?.waypoints ?? []).filter(ok);
  if (!stops.length) return [before, after];
  const out = [before];
  try {
    let from = prev;
    for (const w of stops) {
      if (!["blink", "displace"].includes(w.action)) {
        for (const o of grid.getDirectPath([{ x: from.x + half, y: from.y + half }, { x: w.x + half, y: w.y + half }]))
          out.push(footprint({ i: o.i, j: o.j }, td));
      }
      from = w;
    }
    out.push(after);
    return out;
  } catch (err) {
    console.warn("[ICON | MapObjects] path of the move unreadable", err);
    return [before, after];
  }
}

/**
 * R33a5: a character who stood on the ground or on top of a stack walked onto a space with a different height of
 * objects: "Characters can stand on objects" (p.89). One question — climb up / step down to that height — and
 * nothing changes without the click. One flying higher than where it stood, or a move that set its own elevation,
 * is left alone. "It costs +1 movement per difference in height to move up elevation, to a max of +3. Spaces 4 or
 * more spaces higher cannot be entered with normal movement" (p.89) is told, not counted.
 * @param {TokenDocument} td
 * @param {Array<{i:number,j:number}>} before  the cells it left
 * @param {Array<{i:number,j:number}>} after   the cells it reached
 */
async function offerStepUpDown(td, before, after, ask) {
  const scene = td.parent;
  const groundOf = (cells) => Math.max(0, ...cells.map(c => groundAt(scene, scene.grid.getTopLeftPoint(c))));
  const elev = Number(td.elevation) || 0;
  const was = groundOf(before), now = groundOf(after);
  if (elev !== was || now === was) return;
  const up = now > was;
  const esc = foundry.utils.escapeHTML;
  const cost = up ? ` Climbing costs +${Math.min(3, now - was)} movement (+1 per height, p.89)${now - was >= 4 ? " — 4 or more higher can't be entered with normal movement" : ""}.` : "";
  const html = `<p>${esc(td.name)} ${up ? `walked onto objects of height ${now}` : now ? `stepped down to objects of height ${now}` : "stepped down from the objects to the ground"}: set its elevation to <strong>${now}</strong>?${cost}</p>`;
  if (!await ask(up ? "Climb onto the object?" : "Step down?", html, up ? `Stand on height ${now}` : `Elevation ${now}`)) return;
  if (!scene.tokens.get(td.id)) return;
  await scene.updateEmbeddedDocuments("Token", [{ _id: td.id, elevation: now }], { animate: false, iconObjectMove: true });
}

/* Rampart (R33a5) ----------------------------------- */

/** Foes whose move the user said was a normal one (not a dash), so the steps that follow aren't asked again. */
const rampartCleared = new Map();
const turnKey = () => game.combat?.started ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : "";
function rampartAlreadyCleared(td) {
  const c = rampartCleared.get(td.id);
  if (!c) return false;
  return c.turn ? c.turn === turnKey() : Date.now() - c.at < 60000;
}

/** The "Name: text" of each trait of an actor (the foe's trait list and its trait items), tags stripped. */
function traitTexts(actor) {
  const strip = (s) => String(s ?? "").replace(/<[^>]+>/g, " ");
  const list = Array.isArray(actor?.system?.traits) ? actor.system.traits : [];
  return [
    ...list.map(t => `${t?.name ?? ""}: ${strip(t?.description)}`),
    ...(actor?.items ?? []).filter(i => i.type === "trait").map(i => `${i.name}: ${strip(i.system?.description)}`),
  ];
}
const RAMPART_IGNORE = /\b(?:immune to|ignores?)\b[^.]{0,40}\brampart\b/i;

/**
 * Does this foe ignore rampart? "Unstoppable … movement ignores engagement and rampart" (p.104), and foe traits such
 * as "Hovering: Immune to rampart" or "Slip: Movement ignores rampart". A sentence about allies ("Tactics Aura: Aura 1.
 * Allies ignore engagement and rampart effects while in the aura", p.391) doesn't count: an ally is "an allied
 * character other than you" (p.92), so the aura's owner isn't covered — see tacticsAuraSize.
 */
function ignoresRampart(actor) {
  if (!actor) return false;
  if (actor.statuses?.has?.("unstoppable")) return true;
  return traitTexts(actor).some(text => text.split(/\.\s+/).some(s => RAMPART_IGNORE.test(s) && !/\ballies\b/i.test(s)));
}

/** Size of an aura in which this actor's allies ignore rampart (Tactics Aura, p.391), or 0. */
function tacticsAuraSize(actor) {
  for (const text of traitTexts(actor)) {
    if (!text.split(/\.\s+/).some(s => /\ballies\b/i.test(s) && RAMPART_IGNORE.test(s))) continue;
    const size = Number(text.match(/\baura\s+(\d+)/i)?.[1]);
    if (size > 0) return size;
  }
  return 0;
}

/**
 * Comet's "Spaces adjacent to it have rampart" (p.128): "Foes cannot enter or exit any space affected by a
 * character's Rampart by dashing, flying, or teleporting" (p.117; p.126 glossary). Checked before a foe's move made
 * by dragging or with the keyboard (Foundry's preMoveToken, on the client that moves it), when its path starts, ends
 * or passes in a rampart space:
 *   - Foundry's teleport (blink), fly or jump action ("Fly: You fly, jump, or leap", p.88), or a foe with the flying
 *     status → the move is refused, with a notice;
 *   - any other action: the system can't tell a dash from a walk, so the move is held and the user who moved it is
 *     asked; "normal move or rush" (rush makes it unstoppable, p.88, p.104) lets it go on, "dash" leaves it where it
 *     was. The answer stands for that foe until the turn changes (a minute out of combat).
 * Unstoppable foes, traits that ignore or are immune to rampart, and steps taken inside another foe's Tactics Aura
 * (p.391) aren't checked.
 * @returns {boolean|void}  false to refuse the move
 */
function rampartCheck(td, movement, options) {
  try {
    if (options?.iconRampartOk || options?.iconObjectMove) return;
    if (!["dragging", "keyboard"].includes(movement?.method)) return;
    const scene = td?.parent;
    if (!scene || mapObjectFlag(td) || !td.actor || !isHostile(td)) return;
    const ramparts = scene.tokens.filter(t => mapObjectFlag(t) && t.actor && objectSheetInfo(t.actor)?.rampart);
    if (!ramparts.length) return;
    const ways = [...(movement.passed?.waypoints ?? []), ...(movement.pending?.waypoints ?? [])].filter(w => Number.isFinite(w?.x) && Number.isFinite(w?.y));
    if (!ways.length || ways.every(w => w.action === "displace")) return;
    const origin = movement.origin ?? { x: td.x, y: td.y };
    const last = ways.at(-1);
    const before = cellsOf(td, origin), after = cellsOf(td, last);
    if (before[0].i === after[0].i && before[0].j === after[0].j) return;
    const path = movePath(td, origin, { passed: { waypoints: ways } }, before, after);
    const near = ramparts.find(o => { const oc = cellsOf(o); return path.some(f => gapBetween(f, oc) === 1); });
    if (!near || ignoresRampart(td.actor)) return;
    // Tactics Aura of another foe (p.391): every step next to a rampart is taken inside the aura → no rampart.
    const auras = scene.tokens.filter(t => t.id !== td.id && !mapObjectFlag(t) && t.actor && isHostile(t))
      .map(t => ({ cells: cellsOf(t), size: tacticsAuraSize(t.actor) })).filter(a => a.size > 0);
    if (auras.length) {
      const hot = path.filter(f => ramparts.some(o => gapBetween(f, cellsOf(o)) === 1));
      if (hot.every(f => auras.some(a => gapBetween(f, a.cells) <= a.size))) return;
    }
    const name = objectSheetInfo(near.actor)?.name ?? near.name;
    const rule = "foes cannot enter or exit a rampart space by dashing, flying or teleporting (p.117)";
    const actions = ways.map(w => w.action);
    const how = actions.includes("blink") ? "teleporting" : (actions.includes("fly") || actions.includes("jump") || td.actor.statuses?.has?.("flying")) ? "flying" : "";
    if (how) {
      ui.notifications.warn(`${td.name} can't move there by ${how}: the spaces next to the ${name} have rampart — ${rule}.`);
      return false;
    }
    if (rampartAlreadyCleared(td)) return;
    // Held: ask, then move again the same way when it was a normal move.
    const esc = foundry.utils.escapeHTML;
    const waypoints = ways.map(w => ({ x: w.x, y: w.y, elevation: w.elevation, action: w.action, snapped: w.snapped, explicit: w.explicit, checkpoint: w.checkpoint }));
    foundry.applications.api.DialogV2.confirm({
      window: { title: `Rampart — ${name}` },
      content: `<p><strong>${esc(td.name)}</strong> would enter or leave a space next to the <strong>${esc(name)}</strong>, which has rampart: ${esc(rule)} — only by normal movement (or a rush: unstoppable ignores rampart, p.104).</p><p>Is this a dash?</p>`,
      yes: { label: "Normal move or rush — go on" }, no: { label: "Dash — stay" }, rejectClose: false,
    }).then(async (go) => {
      if (!go) { ui.notifications.info(`${td.name} stays: it can't dash into or out of a rampart space (p.117).`); return; }
      if (!scene.tokens.get(td.id)) return;
      rampartCleared.set(td.id, { turn: turnKey(), at: Date.now() });
      await td.move(waypoints, { method: "api", iconRampartOk: true });
    }).catch(err => console.warn("[ICON | MapObjects] rampart question failed", err));
    return false;
  } catch (err) { console.warn("[ICON | MapObjects] rampart check failed", err); }
}

/**
 * R33a5: Aethershard Talent II, "Your abilities gain pierce against characters adjacent to Aethershards" (p.210):
 * does `attacker`'s damage pierce the character of token `tokenId` (current scene) right now? "The space under a
 * character is also considered adjacent to it" (p.92). Read when the damage is applied, as cover is.
 * @returns {{source:string, name:string}|null}
 */
export function objectPierceAgainst(attacker, tokenId) {
  try {
    const scene = canvas?.scene;
    const td = tokenId ? scene?.tokens.get(tokenId) : null;
    if (!attacker || !td || mapObjectFlag(td)) return null;
    const mine = cellsOf(td);
    for (const o of scene.tokens.filter(t => mapObjectFlag(t)?.creatorId === attacker.id && t.actor)) {
      if (gapBetween(mine, cellsOf(o)) > 1) continue;
      const info = objectSheetInfo(o.actor);
      if (info?.moves.pierceNear) return { source: info.moves.pierceNear.source, name: info.name };
    }
  } catch (err) { console.warn("[ICON | MapObjects] pierce check failed", err); }
  return null;
}

/**
 * R33a5: is the character `token` maybe in cover thanks to an object? A hint for the defence chips, never applied:
 *   Geyser Talent I (p.232)    an ally standing on a geyser "have cover from all directions"
 *   Underway Talent II (p.168) "Allies adjacent to underways have cover"
 *   any object (p.89, p.92)    "A character can take cover by moving adjacent to an object … that is 1 or more height
 *                              higher than the elevation they are currently standing on" — only against characters
 *                              past its row, never adjacent or higher ones, so it depends on the attacker.
 * @param {Token|TokenDocument|null} token
 * @returns {{label:string, title:string}|null}
 */
export function objectCoverHint(token) {
  try {
    const td = token?.document ?? token;
    const scene = td?.parent;
    if (!scene || mapObjectFlag(td) || !scene.tokens.some(t => mapObjectFlag(t))) return null;
    const mine = cellsOf(td);
    const elev = Number(td.elevation) || 0;
    const ally = !isHostile(td);
    let plain = null;
    for (const o of scene.tokens.filter(t => mapObjectFlag(t) && t.actor)) {
      const g = gapBetween(mine, cellsOf(o));
      if (g > 1) continue;
      const info = objectSheetInfo(o.actor);
      if (!info) continue;
      if (ally && g === 0 && info.moves.coverOn)
        return { label: `Cover — on ${info.name.toLowerCase()}`, title: `${info.moves.coverOn.source} (p.232): allies standing on the ${info.name.toLowerCase()} have cover from all directions. Set the Cover status — nothing is halved automatically.` };
      if (ally && g === 1 && info.moves.coverNear)
        return { label: `Cover? ${info.name.toLowerCase()}`, title: `${info.moves.coverNear.source} (p.168): allies adjacent to the ${info.name.toLowerCase()} have cover. Set the Cover status if it applies — nothing is halved automatically.` };
      if (!plain && g === 1 && (Number(o.elevation) || 0) + tokenHeight(o) > elev)
        plain = { label: "Cover? object", title: `Next to the ${info.name} (total height ${(Number(o.elevation) || 0) + tokenHeight(o)}): cover against characters past its row of spaces, not adjacent nor on higher elevation (p.92). Set the Cover status if it applies — nothing is halved automatically.` };
    }
    return plain;
  } catch (err) { console.warn("[ICON | MapObjects] cover hint failed", err); return null; }
}

/**
 * Cover from the objects against one attacker, read when the damage is applied (p.92 "Cover is always determined
 * when and where damage is applied"):
 *   - "Characters cannot benefit from cover against adjacent foes" and "Characters on a higher elevation ignore cover
 *     against all characters on a lower elevation" (p.92): an adjacent or higher attacker → none.
 *   - Geyser Talent I (p.232): an ally standing on a geyser has "cover from all directions" → cover.
 *   - an adjacent object 1 or more higher than where the character stands gives "cover against all characters past
 *     the row of spaces on that battlefield that their cover is currently occupying" (p.92). An object beside the
 *     character (in its rows, or in its columns) occupies the line across the attack: cover when the attacker is
 *     wholly past that line. On a diagonal the book doesn't say whether its row or its column counts: past both →
 *     cover either way, past neither → none, past only one → a hint, the GM sets the Cover status by hand.
 *   - Underway Talent II (p.168) "Allies adjacent to underways have cover" names no direction: still a hint.
 * @param {Token|TokenDocument|null} token          the character hit
 * @param {Token|TokenDocument|null} attackerToken  the character dealing the damage
 * @returns {{state:"cover"|"maybe"|"none", label?:string, title?:string, reason?:string}|null}
 *   null = the attacker isn't on the same scene (then objectCoverHint)
 */
export function objectCoverAgainst(token, attackerToken) {
  try {
    const td = token?.document ?? token;
    const ad = attackerToken?.document ?? attackerToken;
    const scene = td?.parent;
    if (!scene || !ad || ad.parent !== scene || ad.id === td.id || mapObjectFlag(td)) return null;
    const none = { state: "none" };
    if (!scene.tokens.some(t => mapObjectFlag(t))) return none;
    const mine = cellsOf(td), theirs = cellsOf(ad);
    const elev = Number(td.elevation) || 0;
    if (gapBetween(mine, theirs) <= 1) return none;
    if ((Number(ad.elevation) || 0) > elev) return none;
    const ally = !isHostile(td);
    const span = (cells, k) => [Math.min(...cells.map(c => c[k])), Math.max(...cells.map(c => c[k]))];
    const [iMin, iMax] = span(mine, "i"), [jMin, jMax] = span(mine, "j");
    const [aiMin, aiMax] = span(theirs, "i"), [ajMin, ajMax] = span(theirs, "j");
    // Is the attacker wholly past the line `[lo, hi]` of axis `k`, on the side `dir` (+1 / −1) away from the target?
    const past = (k, lo, hi, dir) => dir > 0 ? (k === "i" ? aiMin : ajMin) > hi : (k === "i" ? aiMax : ajMax) < lo;
    let maybe = null;
    for (const o of scene.tokens.filter(t => mapObjectFlag(t) && t.actor)) {
      const oc = cellsOf(o);
      const g = gapBetween(mine, oc);
      if (g > 1) continue;
      const info = objectSheetInfo(o.actor);
      if (!info) continue;
      const name = info.name.toLowerCase();
      if (ally && g === 0 && info.moves.coverOn)
        return { state: "cover", label: `Cover ½ — on ${name}`, reason: `Cover (on the ${name}, ${info.moves.coverOn.source})`,
          title: `${info.moves.coverOn.source} (p.232): allies standing on the ${name} have cover from all directions — the attacker is neither adjacent nor higher (p.92), so the damage is halved when it is applied.` };
      if (g !== 1) continue;
      if (ally && info.moves.coverNear && !maybe)
        maybe = { state: "maybe", label: `Cover? ${name}`, title: `${info.moves.coverNear.source} (p.168): allies adjacent to the ${name} have cover. Set the Cover status if it applies — nothing is halved automatically.` };
      const total = (Number(o.elevation) || 0) + tokenHeight(o);
      if (total <= elev) continue;
      const [oiMin, oiMax] = span(oc, "i"), [ojMin, ojMax] = span(oc, "j");
      const inRows = oiMin >= iMin && oiMax <= iMax, inCols = ojMin >= jMin && ojMax <= jMax;
      const di = oiMin > iMax ? 1 : oiMax < iMin ? -1 : 0;
      const dj = ojMin > jMax ? 1 : ojMax < jMin ? -1 : 0;
      const pastCol = dj !== 0 && past("j", ojMin, ojMax, dj);
      const pastRow = di !== 0 && past("i", oiMin, oiMax, di);
      const why = `the ${info.name} (total height ${total}) next to it`;
      if ((inRows && pastCol) || (inCols && pastRow) || (!inRows && !inCols && pastCol && pastRow))
        return { state: "cover", label: `Cover ½ — ${name}`, reason: `Cover (${info.name})`,
          title: `Behind ${why}: the attacker is past the row of spaces the object occupies, not adjacent nor higher (p.92), so the damage is halved when it is applied.` };
      if (!inRows && !inCols && (pastCol || pastRow) && !maybe)
        maybe = { state: "maybe", label: `Cover? ${name} (diagonal)`, title: `Behind ${why}, on a diagonal: the attacker is past its ${pastCol ? "column" : "row"} but not its ${pastCol ? "row" : "column"}, and the book doesn't say which one counts (p.92). Set the Cover status if the table rules it — nothing is halved automatically.` };
    }
    return maybe ?? none;
  } catch (err) { console.warn("[ICON | MapObjects] object cover failed", err); return null; }
}

/**
 * At the start or the end of `combatant`'s turn (active GM, from the combat hook), what the objects on the scene
 * say about it, in one chat card:
 *   Geyser (p.232)       "If any character either starts or ends their turn on a geyser, you can cause it to erupt"
 *   Comet (p.128)        its creator starts their turn adjacent to the Thrown Weapon: "or start your turn there"
 *   Bale Portal (p.168)  a foe ends its turn adjacent to an underway
 *   AETHERSHIFT (p.211)  "If you start or end your turn adjacent to an Aethershard, gain phasing until the end of your
 *                        next turn" — applied, with its countdown.
 * @param {Combatant} combatant
 * @param {"start"|"end"} at
 */
export async function objectTurnBoundary(combatant, at) {
  const td = combatant?.token;
  const actor = combatant?.actor;
  const scene = td?.parent;
  if (!td || !actor || !scene || mapObjectFlag(td)) return;
  const mine = cellsOf(td);
  const esc = foundry.utils.escapeHTML;
  const lines = [];
  let gain = null;
  for (const o of scene.tokens.filter(t => mapObjectFlag(t) && t.actor)) {
    const flag = mapObjectFlag(o);
    const info = objectSheetInfo(o.actor);
    if (!info) continue;
    const g = gapBetween(mine, cellsOf(o));
    const creator = info.creatorName || "its creator";
    if (info.erupt && g === 0)
      lines.push(`${esc(td.name)} ${at === "start" ? "starts" : "ends"} their turn on the <strong>${esc(info.name)}</strong>: ${esc(creator)} can make it erupt (its sheet → Erupt, p.232).`);
    // R33a5: with a Pick up button on the card — clicked by the creator's user, nothing is removed before.
    if (at === "start" && info.pickUpNear && flag.creatorId === actor.id && g === 1)
      lines.push(`${esc(td.name)} starts their turn adjacent to the <strong>${esc(info.name)}</strong>: they can pick it up (p.128).
        <button type="button" class="icon-chat-btn" data-icon-object-pickup="${o.id}" data-scene-id="${scene.id}"><i class="fa-solid fa-hand"></i> Pick up</button>`);
    if (at === "end" && info.portal && info.moves.pullFoes && isHostile(td) && g === 1)
      lines.push(`${esc(td.name)} ends their turn adjacent to the <strong>${esc(info.name)}</strong> — ${esc(info.moves.pullFoes.source)}: ${esc(creator)} can teleport them next to another one (save to avoid it, bloodied foes fail; once a round). GM: select the foe, open the other portal's sheet → Teleport here.`);
    if (!gain && info.moves.adjacentGain && flag.creatorId === actor.id && g === 1) gain = { ...info.moves.adjacentGain, name: info.name };
  }
  if (gain) {
    const { applyStatus, hasStatus } = await import("../combat/statuses.mjs");
    const { expiryFromUntil } = await import("../combat/status-expiry.mjs");
    const has = hasStatus(actor, gain.status);
    if (!has) {
      const expiry = expiryFromUntil(gain.until, { target: actor, source: actor });
      await applyStatus(actor, gain.status, false, expiry ? { flags: { expiry } } : {});
    }
    lines.push(`${esc(td.name)} ${at === "start" ? "starts" : "ends"} their turn adjacent to the <strong>${esc(gain.name)}</strong> — ${esc(gain.source)}: ${has ? `already has ${esc(gain.status)}` : `gains ${esc(gain.status)} ${esc(gain.until)}`}. ${esc(gain.text.replace(/^.*?\bnext turn\.\s*/i, ""))}`);
  }
  if (!lines.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--object"><strong><i class="fa-solid fa-cube"></i> ${at === "start" ? "Start" : "End"} of ${esc(td.name)}'s turn</strong>
      ${lines.map(l => `<p>${l}</p>`).join("")}</div>`,
  });
}

/**
 * At the start of `actor`'s turn their objects grow as the chosen talent says: Geyser Talent I, "Increase the
 * height of all geysers by +1 at the start of your turn" (p.232). Within the stack's height 3 (p.95). Active GM.
 * @param {Actor} actor  the combatant whose turn starts
 */
export async function growObjectsAtTurnStart(actor) {
  const scene = canvas?.scene;
  if (!scene || !actor) return;
  const grown = [];
  for (const td of scene.tokens) {
    const flag = mapObjectFlag(td);
    if (!flag || flag.creatorId !== actor.id || !td.actor) continue;
    const item = actor.items?.get(flag.itemId);
    if (!item) continue;
    const by = objectUpgrades(item.system, flag.name).reduce((n, u) => n || turnStartGrowth(u.text, flag.name), 0);
    if (!by) continue;
    const own = tokenHeight(td);
    const stack = objectsAt(scene, { x: td.x, y: td.y }).reduce((sum, t) => sum + tokenHeight(t), 0);
    const step = Math.min(by, MAX_STACK - own, MAX_STACK - stack);
    if (step <= 0) continue;
    if (await changeObjectHeight(td.actor, step)) grown.push(`${flag.name} → height ${own + step}`);
  }
  if (!grown.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--object"><strong><i class="fa-solid fa-arrow-up"></i> Start of ${foundry.utils.escapeHTML(actor.name)}'s turn</strong>
      <br><small>${foundry.utils.escapeHTML(grown.join(", "))} (talent: "+1 height at the start of your turn"; stacks stay within height 3, p.95).</small></div>`,
  });
}

/**
 * Objects stacked above a space that lost (part of) its stack come down by
 * `drop` (p.95: an object's elevation is the height of the objects under it).
 * @param {Scene} scene
 * @param {{x:number, y:number}} p   top-left corner of the space
 * @param {number} from              elevation of the object that went
 * @param {number} drop              its height
 * @param {string[]} except          token ids left out
 */
async function settleStack(scene, p, from, drop, except = []) {
  if (!(drop > 0)) return;
  const remaining = objectsAt(scene, p, { except });
  // R33a4: the characters standing on top of the stack come down with it (p.89).
  const left = remaining.reduce((sum, t) => sum + tokenHeight(t), 0);
  const standers = standersOn(scene, p, left + drop);
  const above = remaining.filter(t => (t.elevation ?? 0) > from);
  if (above.length) await scene.updateEmbeddedDocuments("Token", above.map(t => ({ _id: t.id, elevation: Math.max(0, (t.elevation ?? 0) - drop) })));
  if (standers.length) await scene.updateEmbeddedDocuments("Token", standers.map(t => ({ _id: t.id, elevation: left })), { animate: false, iconObjectMove: true });
  if (above.length || standers.length) _log(`${above.length} object(s) and ${standers.length} character(s) at ${p.x},${p.y} came down by ${drop}`);
}

export function registerMapObjectHooks() {
  Hooks.on("dropCanvasData", (_canvas, data) => {
    if (data?.type !== MAP_OBJECT_DRAG) return;
    dropMapObject(data).catch(err => { console.error("ICON 1.5 | placing an object failed", err); ui.notifications.error(`Could not place the object: ${err.message}`); });
    return false;
  });

  // An object's aura goes with it.
  Hooks.on("deleteToken", (tokenDoc) => {
    if (game.users.activeGM?.id !== game.user.id || !mapObjectFlag(tokenDoc)) return;
    const scene = tokenDoc.parent;
    const ids = scene?.templates.filter(t => t.flags?.[NS]?.mapObject && t.flags[NS].followTokenId === tokenDoc.id).map(t => t.id) ?? [];
    if (ids.length) scene.deleteEmbeddedDocuments("MeasuredTemplate", ids).catch(err => console.warn("[ICON | MapObjects] could not remove the object's aura", err));
    // R33a5: its walls go with it.
    const walls = objectWallsOf(tokenDoc).map(w => w.id);
    if (walls.length) scene.deleteEmbeddedDocuments("Wall", walls).catch(err => console.warn("[ICON | MapObjects] could not remove the object's walls", err));
    // The objects stacked on it come down (R33a2).
    if (scene) settleStack(scene, { x: tokenDoc.x, y: tokenDoc.y }, tokenDoc.elevation ?? 0, tokenHeight(tokenDoc), [tokenDoc.id])
      .catch(err => console.warn("[ICON | MapObjects] could not lower the stack", err));
  });

  // An object moved off a stack: the ones above come down; moved onto a stack: it sits on top (R33a2).
  // area-templates.mjs' preUpdateToken leaves the old position in options.iconPrevPos.
  Hooks.on("updateToken", async (tokenDoc, changed, options) => {
    // A sheet open on the object shows its total height: refresh it when the token goes up or down.
    // (`_sheet`: the sheet already built, if any — `sheet` would build one for every object.)
    if ("elevation" in changed && mapObjectFlag(tokenDoc) && tokenDoc.actor?._sheet?.rendered) tokenDoc.actor._sheet.render();
    if (!options?.iconPrevPos || !mapObjectFlag(tokenDoc)) return;
    if (game.users.activeGM?.id !== game.user.id) return;
    const scene = tokenDoc.parent;
    if (!scene) return;
    const from = cellCorner(scene, options.iconPrevPos.x, options.iconPrevPos.y);
    // v13: inside updateToken the document may still report the pre-move x/y — the new spot is in `changed`.
    const to = cellCorner(scene, changed.x ?? tokenDoc.x, changed.y ?? tokenDoc.y);
    if (from.x === to.x && from.y === to.y) return;
    // R33a5: its walls follow it.
    moveObjectWalls(tokenDoc, { x: changed.x ?? tokenDoc.x, y: changed.y ?? tokenDoc.y }).catch(err => console.warn("[ICON | MapObjects] could not move the object's walls", err));
    const height = tokenHeight(tokenDoc);
    const was = Number(options.iconPrevElevation ?? tokenDoc.elevation) || 0;
    try {
      await settleStack(scene, from, was, height, [tokenDoc.id]);
      const under = objectsAt(scene, to, { except: [tokenDoc.id] }).reduce((sum, t) => sum + tokenHeight(t), 0);
      if (under !== (tokenDoc.elevation ?? 0)) await tokenDoc.update({ elevation: under });
      if (under + height > MAX_STACK) ui.notifications.warn(`${tokenDoc.name} is now on height ${under}: stacked objects can't be past height ${MAX_STACK} (p.95).`);
    } catch (err) { console.warn("[ICON | MapObjects] could not restack a moved object", err); }
  });
  Hooks.on("preUpdateToken", (tokenDoc, changed, options) => {
    if (("x" in changed || "y" in changed) && mapObjectFlag(tokenDoc)) options.iconPrevElevation = tokenDoc.elevation ?? 0;
  });
  // R33a5: Comet's rampart refuses a foe's fly / teleport and asks about a dash, before the move (rampartCheck).
  Hooks.on("preMoveToken", (tokenDoc, movement, options) => rampartCheck(tokenDoc, movement, options));
  // R33a5: walls of objects deleted while no GM was there to take them away.
  Hooks.on("canvasReady", (cv) => {
    if (game.users.activeGM?.id !== game.user.id) return;
    clearOrphanObjectWalls(cv?.scene).catch(err => console.warn("[ICON | MapObjects] could not clear orphan walls", err));
  });

  // R33a4: a character moved by its user next to / onto an object: Comet's pick up, the Megamushroom's blessing,
  // Underway's teleport — asked on the client that moved it (once), never for the moves these rules make.
  Hooks.on("updateToken", (tokenDoc, changed, options, userId) => {
    if (userId !== game.user.id || options?.iconObjectMove || !options?.iconPrevPos) return;
    if (!("x" in changed || "y" in changed) || mapObjectFlag(tokenDoc)) return;
    if (!tokenDoc.parent?.tokens?.some(t => mapObjectFlag(t))) return;
    const to = { x: changed.x ?? tokenDoc.x, y: changed.y ?? tokenDoc.y };
    offerMoveTriggers(tokenDoc, options.iconPrevPos, to, options._movement?.[tokenDoc.id] ?? null, { elevationMoved: "elevation" in changed }).catch(err => console.warn("[ICON | MapObjects] movement offers failed", err));
  });

  // R33a5: the Pick up button of the start-of-turn card (Comet "or start your turn there", p.128).
  Hooks.on("renderChatMessageHTML", (_message, html) => {
    for (const btn of html.querySelectorAll?.("[data-icon-object-pickup]") ?? []) {
      if (btn.dataset.iconBound) continue;
      btn.dataset.iconBound = "true";
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const td = game.scenes.get(btn.dataset.sceneId)?.tokens.get(btn.dataset.iconObjectPickup);
        if (!td?.actor || !mapObjectFlag(td)) { ui.notifications.info("That object is no longer on the map."); return; }
        if (!td.actor.isOwner) { ui.notifications.warn(`Only ${objectSheetInfo(td.actor)?.creatorName || "its creator"} can pick it up.`); return; }
        btn.disabled = true;
        try { await removeMapObject(td.actor); } catch (err) { btn.disabled = false; console.warn("[ICON | MapObjects] pick up failed", err); }
      });
    }
  });

  // R33a4: Aethershard Talent I, "When you take any action that spends Aether, you can first remove one of your
  // Aethershards, then place it in any free space up to range 2" (p.210): a reminder to the user who spent it.
  const AETHER = "system.combat.classResources.aether.value";
  Hooks.on("preUpdateActor", (actor, changed, options) => {
    if (foundry.utils.hasProperty(changed, AETHER)) options.iconPrevAether = Number(foundry.utils.getProperty(actor, AETHER)) || 0;
  });
  Hooks.on("updateActor", (actor, changed, options, userId) => {
    if (userId !== game.user.id || options?.iconPrevAether == null || !canvas?.scene) return;
    if (!((Number(foundry.utils.getProperty(changed, AETHER)) || 0) < options.iconPrevAether)) return;
    const shard = canvas.scene.tokens.find(t => mapObjectFlag(t)?.creatorId === actor.id && t.actor && objectSheetInfo(t.actor)?.moves?.relocate);
    if (!shard) return;
    const rel = objectSheetInfo(shard.actor).moves.relocate;
    ui.notifications.info(`${actor.name} spent Aether — ${rel.source}: you can first move one of your ${mapObjectFlag(shard).name.toLowerCase()}s up to range ${rel.range} (its sheet → Move).`);
  });

  game.socket?.on(SOCKET, (msg) => {
    if (msg?.type === "mapObjectNotice") {
      if (msg.userId === game.user.id) ui.notifications[msg.kind === "info" ? "info" : "warn"](msg.msg);
      return;
    }
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    const requester = game.users.get(msg?.userId) ?? null;
    if (msg?.type === "objectMoveTokens") {
      // R33a4: a player's object rule moves tokens they don't own (a foe on a geyser, a character on a rising
      // stack): only position and elevation, only if they own the object.
      const scene = game.scenes.get(msg.sceneId);
      const obj = scene?.tokens.get(msg.objectTokenId);
      if (!obj || !mapObjectFlag(obj) || !requester || !obj.actor?.testUserPermission?.(requester, "OWNER")) {
        console.warn(`[ICON | MapObjects] ${requester?.name ?? "?"} doesn't own that object — tokens not moved`);
        return;
      }
      const pick = (u) => { const o = { _id: String(u?._id ?? "") }; for (const k of ["x", "y", "elevation"]) if (Number.isFinite(Number(u?.[k])) && u?.[k] != null) o[k] = Number(u[k]); return o; };
      const updates = (Array.isArray(msg.updates) ? msg.updates : []).map(pick).filter(u => scene.tokens.get(u._id) && !mapObjectFlag(scene.tokens.get(u._id)));
      if (updates.length) scene.updateEmbeddedDocuments("Token", updates, { animate: false, iconObjectMove: true }).catch(err => console.error("ICON 1.5 | moving relayed tokens failed", err));
      return;
    }
    if (msg?.type === "objectSummon") {
      summonInSpace(msg.data ?? {}, { requester }).catch(err => console.error("ICON 1.5 | relayed summon failed", err));
      return;
    }
    if (msg?.type === "objectBlessing") {
      // An ally picked up the blessing token of an object they don't own (pickUpObjectBlessing, R33a3).
      const td = game.scenes.get(msg.sceneId)?.tokens.get(msg.tokenId);
      if (td?.actor && mapObjectFlag(td) && requester) td.actor.setFlag(NS, "blessingTaken", true).catch(err => console.warn("[ICON | MapObjects] could not mark the blessing taken", err));
      return;
    }
    if (msg?.type === "removeMapObject") {
      // A player picking up / removing an object they own (removeMapObject).
      const td = game.scenes.get(msg.sceneId)?.tokens.get(msg.tokenId);
      if (!td || !mapObjectFlag(td)) return;
      if (!requester || !td.actor?.testUserPermission?.(requester, "OWNER")) {
        console.warn(`[ICON | MapObjects] ${requester?.name ?? "?"} doesn't own "${td.name}" — not removed`);
        return;
      }
      td.parent.deleteEmbeddedDocuments("Token", [td.id]).catch(err => console.error("ICON 1.5 | removing a relayed object failed", err));
      return;
    }
    if (msg?.type !== "placeMapObject") return;
    placeMapObject(msg.data ?? {}, { requester }).catch(err => console.error("ICON 1.5 | placing a relayed object failed", err));
  });
}
