/**
 * pack-summons.mjs — the summons of the `summons` compendium a PC puts on the map.
 *
 * The chip of an ability or trait (Beast, Shadow, Bomb, Wild Card, Plant…) and the
 * Geyser's Salt Sprite go through here. "Summons are characters" (p.95-96): every
 * copy on the map has HP of its own. So, like the foe summons (foe-summons.mjs):
 *   - one world actor per (summoner, summon), in the "Summons" folder, imported from
 *     the pack the first time, with the PC as summoner and the PC's owners as owners;
 *   - an unlinked token per drop, so two Beasts don't share one HP pool
 *     (playtest 18 October, P23).
 * The PC sheet lists those tokens (summonTokensOf), not the world actor, which only
 * holds the starting stats.
 * Creating actors is a GM job: a player's drop goes to the active GM over the
 * system socket, and the GM checks the player owns the summoner.
 */
const _log = (...a) => console.debug("[ICON | PackSummons]", ...a);
const SOCKET = "system.icon-system";

export const PACK_SUMMON_DRAG = "IconPackSummon";
const FOLDER_NAME = "Summons";

/** Drag payload for the chip of summon `uuid` (a summons pack actor) on `summoner`'s sheet. */
export function packSummonDragData(summoner, uuid) {
  return { type: PACK_SUMMON_DRAG, uuid, summonerId: summoner?.id ?? "" };
}

/** The world folder the summons' actors are kept in (made on first use). */
async function summonFolder() {
  const existing = game.folders.find(f => f.type === "Actor" && f.name === FOLDER_NAME && !f.folder);
  if (existing) return existing;
  return Folder.create({ name: FOLDER_NAME, type: "Actor", color: "#2e86c1", sorting: "a" });
}

/** The world actor behind the copies of `src` summoned by `summoner`, imported on first use. */
async function summonActorFor(src, summoner) {
  const key = `${summoner?.id ?? ""}#${src.uuid}`;
  const found = game.actors.find(a => a.type === "summon" && a.getFlag("icon-system", "packSummon") === key);
  if (found) return found;
  const data = game.actors.fromCompendium(src);
  const folder = await summonFolder();
  data.folder = folder.id;
  foundry.utils.setProperty(data, "flags.icon-system.packSummon", key);
  if (summoner) {
    foundry.utils.setProperty(data, "system.summonerActorId", summoner.id);
    data.ownership = foundry.utils.mergeObject(data.ownership ?? {}, foundry.utils.deepClone(summoner.ownership ?? {}));
    // On the summoner's side of the table (a PC's summon is not a foe).
    const disp = summoner.prototypeToken?.disposition;
    if (disp !== undefined) foundry.utils.setProperty(data, "prototypeToken.disposition", disp);
  }
  const actor = await Actor.create(data, { iconUnlinked: true });
  _log(`created world actor "${actor?.name}" (${actor?.id}) for ${summoner?.name ?? "no summoner"}`);
  return actor;
}

/**
 * Put a copy of summons-pack actor `data.uuid` on the map, `data.summonerId` as summoner.
 * `data.center`: (x, y) is the drop point (the token is centred on it); otherwise (x, y)
 * is the token's top-left corner (the Geyser's own space).
 */
export async function placePackSummon(data, { requester = null } = {}) {
  const scene = data.sceneId ? game.scenes.get(data.sceneId) : canvas?.scene;
  if (!scene) return null;
  const summoner = data.summonerId ? game.actors.get(data.summonerId) : null;
  if (!game.user.isGM) {
    if (summoner && !summoner.isOwner) { ui.notifications.warn("Only the GM, or a player who owns the summoner, can place its summons."); return null; }
    if (!game.users.activeGM) { ui.notifications.warn("No GM is connected — can't place the summon right now."); return null; }
    game.socket.emit(SOCKET, { type: "placePackSummon", userId: game.user.id, data: { ...data, sceneId: scene.id } });
    return null;
  }
  if (requester && !(summoner ?? null)?.testUserPermission?.(requester, "OWNER")) {
    console.warn(`[ICON | PackSummons] ${requester.name} doesn't own the summoner — summon not placed`);
    return null;
  }
  const src = await fromUuid(data.uuid);
  if (!src || src.type !== "summon") { ui.notifications.warn("That summon is no longer in the Summons compendium."); return null; }
  const actor = await summonActorFor(src, summoner);
  if (!actor) return null;

  let p = { x: data.x, y: data.y };
  if (data.center) {
    // The scene's own grid: a relayed drop may be on a scene the GM isn't viewing.
    const grid = scene.grid.size;
    const size = actor.prototypeToken?.width || 1;
    p = scene.grid.getTopLeftPoint({ x: data.x - (size * grid) / 2 + grid / 2, y: data.y - (size * grid) / 2 + grid / 2 });
  }
  const td = await actor.getTokenDocument({ x: p.x, y: p.y, actorLink: false });
  const [tok] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  _log(`placed "${actor.name}" at ${p.x},${p.y} (${summoner?.name ?? "no summoner"})${requester ? ` for ${requester.name}` : ""}`);
  return tok ?? null;
}

/**
 * The summons of `actor` standing on `scene`: unlinked tokens whose actor names it as
 * summoner (each copy with its own HP). Linked summons are their world actor and are
 * listed from the actors directory instead.
 */
export function summonTokensOf(actor, scene = canvas?.scene) {
  if (!actor || !scene) return [];
  return scene.tokens.filter(t => !t.actorLink && t.actor?.type === "summon" && t.actor.system?.summonerActorId === actor.id);
}

/** Re-render the open sheet of the summoner of `summonActor`, once per burst of changes. */
const _pending = new Set();
const _flush = foundry.utils.debounce(() => {
  for (const id of _pending) {
    const s = game.actors.get(id)?._sheet;
    if (s?.rendered) s.render();
  }
  _pending.clear();
}, 100);
function refreshSummoner(summonActor) {
  if (summonActor?.type !== "summon") return;
  const id = summonActor.system?.summonerActorId;
  if (!id) return;
  _pending.add(id);
  _flush();
}

export function registerPackSummonHooks() {
  Hooks.on("dropCanvasData", (_canvas, data) => {
    if (data?.type !== PACK_SUMMON_DRAG) return;
    placePackSummon({ ...data, center: true }).catch(err => { console.error("ICON 1.5 | placing a summon failed", err); ui.notifications.error(`Could not place the summon: ${err.message}`); });
    return false;
  });

  // The GM side of a player's drop (see placePackSummon). Only the active GM acts.
  game.socket?.on(SOCKET, (msg) => {
    if (msg?.type !== "placePackSummon" || !game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    const requester = game.users.get(msg.userId) ?? null;
    placePackSummon(msg.data ?? {}, { requester }).catch(err => console.error("ICON 1.5 | placing a relayed summon failed", err));
  });

  // The Summons list of the summoner's sheet follows the copies on the map: placed, removed, hurt, healed.
  Hooks.on("createToken", (td) => refreshSummoner(td.actor));
  Hooks.on("deleteToken", (td) => refreshSummoner(td.actor));
  Hooks.on("updateToken", (td, changed) => { if ("delta" in changed || "name" in changed) refreshSummoner(td.actor); });
  Hooks.on("updateActor", (actor) => refreshSummoner(actor));
  Hooks.on("canvasReady", () => {
    for (const a of game.actors) if (a.type === "icon" && a._sheet?.rendered) a._sheet.render();
  });
}
