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
import { objectsForItem, objectsInText, objectTokenName, objectRuleNotes, perHeightDamage, objectUpgrades, turnStartGrowth } from "../helpers/objects.mjs";
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
  // The armed Infuse version (Volcanic Geyser, Pyrospire) has been used by placing its object.
  if (token && obj.infuse && infuseArmedFor(item, obj)) {
    try { await clearInfusion(owner); } catch (err) { console.warn("[ICON | MapObjects] could not clear the infusion", err); }
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

/* -------------------------------------------------- */
/*  What the objects set off (R33a3)                   */
/* -------------------------------------------------- */

const cellKey = (c) => `${c.i},${c.j}`;
/** Character tokens (not objects) in `cells` of the current scene. */
const charactersIn = (cells) => tokensInCells(cells).filter(t => !mapObjectFlag(t.document));

/**
 * An area `actor` just placed caught some of their objects whose rules trigger on it: the Aethershard,
 * "When you include the Aethershard in the area effect of any ability, the ability deals 2 piercing damage as an
 * area effect, once, to all characters in the area for every one of your Aethershards caught in the same ability.
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
export async function pickUpObjectBlessing(actor) {
  const td = objectToken(actor);
  if (!td?.parent) { ui.notifications.warn("Open the sheet of the object's token on the scene to pick its blessing up."); return; }
  if (actor.getFlag(NS, "blessingTaken")) { ui.notifications.info("The blessing token has already been picked up."); return; }
  const picker = canvas.tokens?.controlled?.find(t => t.actor && !mapObjectFlag(t.document))?.actor ?? game.user.character ?? null;
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
  const lines = [
    `<p><strong>Removed and placed${info.erupt.place ? ` ${esc(info.erupt.place)} spaces away` : ""}:</strong> ${who}${blastName ? ` (everyone in the ${blastName} blast centered on it)` : " (on the geyser)"}.</p>`,
  ];
  for (const u of info.erupt.placeUpgrades) lines.push(`<p><strong>${esc(u.source)}:</strong> ${esc(u.text)}</p>`);
  if (info.erupt.dangerous) lines.push(`<p>Create dangerous terrain under the foes placed.</p>`);
  lines.push(`<p>The ${esc(info.name.toLowerCase())} is removed.${info.erupt.summon ? ` Then summon a <strong>${esc(info.erupt.summon)}</strong> in its space (drag the chip from ${esc(info.abilityName || "the ability")}).` : ""}</p>`);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: game.actors?.get(mapObjectFlag(actor)?.creatorId) ?? actor }),
    content: `<div class="icon-chat-card icon-chat-card--object">
        <div class="icon-chat-card__header"><strong><i class="fa-solid fa-water"></i> ${esc(info.name)} erupts</strong></div>
        ${lines.join("")}
      </div>`,
  });
  // The characters to place are targeted, so the player can see them.
  try { for (const t of placed) t.setTarget(true, { releaseOthers: false }); } catch { /* targeting is a convenience */ }
  await removeMapObject(actor);
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
  const above = objectsAt(scene, p, { except }).filter(t => (t.elevation ?? 0) > from);
  if (!above.length) return;
  await scene.updateEmbeddedDocuments("Token", above.map(t => ({ _id: t.id, elevation: Math.max(0, (t.elevation ?? 0) - drop) })));
  _log(`${above.length} object(s) at ${p.x},${p.y} came down by ${drop}`);
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

  game.socket?.on(SOCKET, (msg) => {
    if (msg?.type === "mapObjectNotice") {
      if (msg.userId === game.user.id) ui.notifications[msg.kind === "info" ? "info" : "warn"](msg.msg);
      return;
    }
    if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    const requester = game.users.get(msg?.userId) ?? null;
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
