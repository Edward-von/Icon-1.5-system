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
import { objectsForItem, objectTokenName } from "../helpers/objects.mjs";
import { summonImage } from "../helpers/summon-images.mjs";
import { placeAuraOnToken } from "./area-templates.mjs";

const _log = (...a) => console.debug("[ICON | MapObjects]", ...a);
const NS = "icon-system";
const SOCKET = "system.icon-system";
const FLAG = "mapObject";
const FOLDER_NAME = "Map Objects";
const MAX_STACK = 3;

export const MAP_OBJECT_DRAG = "IconMapObject";

/** The map-object flag of an actor or token document, or null. */
export const mapObjectFlag = (doc) => doc?.getFlag?.(NS, FLAG) ?? doc?.flags?.[NS]?.[FLAG] ?? null;

/** The objects of an item, as the sheet offers them (abilities and traits). */
export function objectsOfItem(item) {
  if (!item) return [];
  return objectsForItem(item.system, { trait: item.type === "trait" });
}

/** Sheet chips: what the template needs for each object of an item. */
export function objectChips(item) {
  return objectsOfItem(item).map((o, index) => ({
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
    actor = await Actor.create(objectActorData(owner, item, obj, key, folder.id));
    _log(`created world actor "${actor.name}" (${actor.id})`);
  }
  if (old.length) await scene.deleteEmbeddedDocuments("Token", old);

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
  tell(`${objectTokenName(obj.name, obj.height)} placed${under ? ` on height ${under}` : ""}${obj.aura ? ` with Aura ${obj.aura}` : ""} (${owner.name}).`, "info");
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
  if (td?.parent) {
    const stack = objectsAt(td.parent, { x: td.x, y: td.y }, { except: [td.id] });
    const total = stack.reduce((sum, t) => sum + tokenHeight(t), 0) + next;
    if (total > MAX_STACK) { ui.notifications.warn(`This stack would be height ${total}: stacked objects can't be past height ${MAX_STACK} (p.95).`); return false; }
    above = stack.filter(t => (t.elevation ?? 0) > (td.elevation ?? 0));
  }
  await actor.update({ "system.size": next });
  const name = mapObjectFlag(actor)?.name ?? actor.name;
  if (td) {
    await td.update({ name: objectTokenName(name, next) });
    if (above.length) await td.parent.updateEmbeddedDocuments("Token", above.map(t => ({ _id: t.id, elevation: (t.elevation ?? 0) + (next - now) })));
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
  });

  game.socket?.on(SOCKET, (msg) => {
    if (msg?.type === "mapObjectNotice") {
      if (msg.userId === game.user.id) ui.notifications[msg.kind === "info" ? "info" : "warn"](msg.msg);
      return;
    }
    if (msg?.type !== "placeMapObject" || !game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    const requester = game.users.get(msg.userId) ?? null;
    placeMapObject(msg.data ?? {}, { requester }).catch(err => console.error("ICON 1.5 | placing a relayed object failed", err));
  });
}
