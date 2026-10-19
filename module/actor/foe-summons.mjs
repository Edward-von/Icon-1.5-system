/**
 * foe-summons.mjs — the summons and objects a foe or legend puts on the map.
 *
 * They live on the actor that creates them (`system.summons`, see
 * FoeData.summonSchema), not in a compendium: the Foe / Legend sheet lists
 * them under its actions, and each one has a chip that drags onto the canvas.
 * Dropping it:
 *   - reuses the world Summon actor made the last time this foe placed this
 *     summon (flag `icon-system.foeSummon`), or creates one in the "Foe
 *     Summons" folder, with the rules text, size, HP/defense and the foe as
 *     summoner (the Summon sheet rolls with the summoner's [D] and fray);
 *   - places an unlinked token where it was dropped, so several copies
 *     (Soul Sparks, Blades of Agony, Automata) each have their own HP.
 * Creating actors is a GM job: a player who owns the foe (a co-GM running
 * the foes) sends the drop to the active GM over the system socket, and the
 * GM places it. Other players get a warning.
 */
import { summonImage } from "../helpers/summon-images.mjs";

const _log = (...a) => console.debug("[ICON | FoeSummons]", ...a);
const SOCKET = "system.icon-system";

export const FOE_SUMMON_DRAG = "IconFoeSummon";
const FOLDER_NAME = "Foe Summons";

/** Drag payload for the chip of summon `index` of `actor`. */
export function foeSummonDragData(actor, index) {
  return { type: FOE_SUMMON_DRAG, actorUuid: actor.uuid, index: Number(index) };
}

/** The world folder summons are created in (made on first use). */
async function summonFolder() {
  const existing = game.folders.find(f => f.type === "Actor" && f.name === FOLDER_NAME && !f.folder);
  if (existing) return existing;
  return Folder.create({ name: FOLDER_NAME, type: "Actor", color: "#6c3483", sorting: "a" });
}

/** Summon actor data for summon `sm` of `owner`. */
function summonActorData(owner, sm, key, folderId) {
  const img = summonImage(sm.name, { descriptor: sm.descriptor, kind: sm.kind });
  // A foe still in its compendium has no world actor to point at; a token's synthetic actor shares its base id.
  const summoner = owner.pack ? "" : owner.id;
  return {
    name: sm.name, type: "summon", img, folder: folderId,
    system: {
      summonerActorId:   summoner,
      sourceAbilityName: owner.name,
      intangible:        !!sm.intangible,
      size:              sm.size || 1,
      hp:                { value: sm.hp || 0, max: sm.hp || 0 },
      defense:           sm.defense || 0,
      speed:             sm.immobile || sm.kind === "object" ? 0 : 4,
      summonAction:      sm.action ?? "",
      summonEffect:      sm.rules ?? "",
      notes:             `<p><strong>${sm.descriptor || (sm.kind === "object" ? "Object" : "Summon")}</strong> — ${owner.name}${sm.source ? `, ${sm.source}` : ""}</p>`,
    },
    prototypeToken: {
      name: sm.name, actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
      width: sm.size || 1, height: sm.size || 1, lockRotation: true,
      displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
      displayBars: sm.hp ? CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER : CONST.TOKEN_DISPLAY_MODES.NONE,
      bar1: { attribute: "hp" },
      texture: { src: img },
    },
    flags: { "icon-system": { foeSummon: key } },
  };
}

/** Drop handler body: put summon `data.index` of actor `data.actorUuid` at (data.x, data.y). */
export async function placeFoeSummon(data, { requester = null } = {}) {
  const scene = data.sceneId ? game.scenes.get(data.sceneId) : canvas?.scene;
  if (!scene) return;
  const owner = await fromUuid(data.actorUuid);
  if (!game.user.isGM) {
    // A player who runs this foe: the active GM creates the actor and token.
    if (!owner?.isOwner) { ui.notifications.warn("Only the GM, or a player who owns this foe, can place its summons."); return; }
    if (!game.users.activeGM) { ui.notifications.warn("No GM is connected — can't place the summon right now."); return; }
    game.socket.emit(SOCKET, { type: "placeFoeSummon", userId: game.user.id, data: { ...data, sceneId: scene.id } });
    ui.notifications.info("Summon sent to the GM to place.");
    return;
  }
  if (requester && !owner?.testUserPermission?.(requester, "OWNER")) {
    console.warn(`[ICON | FoeSummons] ${requester.name} doesn't own "${owner?.name}" — summon not placed`);
    return;
  }
  const sm = owner?.system?.summons?.[data.index];
  _log(`place — owner: "${owner?.name}" | summon[${data.index}]: "${sm?.name}" | at ${data.x},${data.y}`);
  if (!sm) { ui.notifications.warn("That summon is no longer on the foe's sheet."); return; }

  // One world actor per (foe, summon): a compendium foe and its world copy are different foes.
  const key = `${owner.uuid}#${sm.name}`;
  let actor = game.actors.find(a => a.type === "summon" && a.getFlag("icon-system", "foeSummon") === key);
  if (!actor) {
    const folder = await summonFolder();
    actor = await Actor.create(summonActorData(owner, sm, key, folder.id), { iconUnlinked: true });
    _log(`place — created world actor "${actor.name}" (${actor.id}) in "${FOLDER_NAME}"`);
  }

  // The drop point is the cursor: centre the token on it, then snap to the grid.
  // The scene's own grid: a relayed drop may be on a scene the GM isn't viewing.
  const sceneGrid = scene.grid;
  const grid = sceneGrid.size;
  const size = sm.size || 1;
  const corner = { x: data.x - (size * grid) / 2 + grid / 2, y: data.y - (size * grid) / 2 + grid / 2 };
  const p = sceneGrid.getTopLeftPoint(corner);
  const td = await actor.getTokenDocument({ x: p.x, y: p.y });
  await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  ui.notifications.info(`${sm.name} placed (${owner.name})${requester ? ` for ${requester.name}` : ""}.`);
}

/** Canvas drop hook: our chips carry `type: "IconFoeSummon"`; everything else goes on to core. */
export function registerFoeSummonHooks() {
  Hooks.on("dropCanvasData", (_canvas, data) => {
    if (data?.type !== FOE_SUMMON_DRAG) return;
    placeFoeSummon(data).catch(err => { console.error("ICON 1.5 | placing a foe summon failed", err); ui.notifications.error(`Could not place the summon: ${err.message}`); });
    return false;
  });

  // The GM side of a player's drop (see placeFoeSummon). Only the active GM acts.
  game.socket?.on(SOCKET, (msg) => {
    if (msg?.type !== "placeFoeSummon" || !game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
    const requester = game.users.get(msg.userId) ?? null;
    placeFoeSummon(msg.data ?? {}, { requester }).catch(err => console.error("ICON 1.5 | placing a relayed foe summon failed", err));
  });
}
