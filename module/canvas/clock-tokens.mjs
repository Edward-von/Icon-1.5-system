/**
 * clock-tokens.mjs — a campaign clock on the map.
 *
 * Maar's request (30 Sept 2026): drag a clock from the clock board onto the
 * scene and have a visual clock there that follows the board live. A clock
 * token is an ordinary Token of the board's actor (actor type "clock",
 * linked, so double-clicking it opens the board) with
 *   flags.icon-system.clock = { actorId, clockId }
 * Its image is fully transparent; on every draw / refresh this module paints
 * the clock over it — a disc cut into `max` segments, the first `value` filled
 * with the clock's colour, "value/max" in the middle — as a child of the token
 * placeable, where core draws the nameplate and bars.
 *
 * Live: ticking the clock on the board updates the actor; the updateActor
 * hook repaints every token of that clock on every client. The GM's client
 * also keeps the token documents in step (name, hidden for a secret clock)
 * and removes the tokens of a clock that was deleted from the board.
 */

const _log = (...a) => console.debug("[ICON | ClockTokens]", ...a);

export const CLOCK_DRAG = "IconClock";
const FLAG = "clock";
const OVERLAY = "_iconClockOverlay";

const clockFlag = tokenDoc => tokenDoc?.getFlag?.("icon-system", FLAG) ?? null;

/** The clock a token shows, or null. Read from the world actor, the single source of truth. */
function clockOf(tokenDoc) {
  const f = clockFlag(tokenDoc);
  if (!f) return null;
  const board = game.actors.get(f.actorId);
  return board?.system?.clocks?.find(c => c.id === f.clockId) ?? null;
}

const toColor = hex => {
  try { return foundry.utils.Color.from(hex || "#c8961c").valueOf(); } catch { return 0xc8961c; }
};

/** Paint (or repaint) the clock over a Token placeable. */
function drawClock(token) {
  if (!clockFlag(token?.document)) return;
  const clock = clockOf(token.document);
  let g = token[OVERLAY];
  if (!g || g.destroyed) {
    g = token[OVERLAY] = token.addChild(new PIXI.Container());
    g.eventMode = "none";
  }
  g.removeChildren().forEach(c => c.destroy());

  const w = token.w, h = token.h;
  const r = Math.min(w, h) / 2 * 0.9;
  const cx = w / 2, cy = h / 2;
  const disc = new PIXI.Graphics();
  g.addChild(disc);

  if (!clock) {
    // The clock was removed from its board (the GM's client deletes the token right after).
    disc.lineStyle(3, 0x7a7060).beginFill(0x141922, 0.8).drawCircle(cx, cy, r).endFill();
    return;
  }

  const max = Math.max(1, clock.max || 1);
  const value = Math.min(Math.max(0, clock.value || 0), max);
  const full = value >= max;
  const color = toColor(clock.color);
  const step = (Math.PI * 2) / max;

  // Segments: filled ones in the clock's colour, the rest dark.
  for (let k = 0; k < max; k++) {
    const a0 = -Math.PI / 2 + k * step, a1 = a0 + step;
    disc.beginFill(k < value ? color : 0x2a3549, k < value ? 0.95 : 0.85);
    disc.moveTo(cx, cy).arc(cx, cy, r, a0, a1).lineTo(cx, cy);
    disc.endFill();
  }
  // Dividers and rim.
  disc.lineStyle(Math.max(1.5, r / 30), 0x0e1117, 1);
  for (let k = 0; k < max; k++) {
    const a = -Math.PI / 2 + k * step;
    disc.moveTo(cx, cy).lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  disc.lineStyle(Math.max(2, r / 16), full ? 0xe8b828 : 0xc8961c, 1).drawCircle(cx, cy, r);

  // value/max in the middle, readable on any segment colour.
  const label = new PIXI.Text(`${value}/${max}`, {
    fontFamily: "Signika", fontSize: Math.max(12, Math.round(r / 2.6)), fontWeight: "bold",
    fill: 0xf0e4c0, stroke: 0x0e1117, strokeThickness: Math.max(3, r / 12), align: "center",
  });
  label.anchor.set(0.5);
  label.position.set(cx, cy);
  g.addChild(label);
}

/** Repaint every clock token of a board on this client. */
function repaintBoard(actorId) {
  for (const t of canvas?.tokens?.placeables ?? []) {
    if (clockFlag(t.document)?.actorId === actorId) drawClock(t);
  }
}

/** Drag payload for clock `index` of board `actor` (ClockSheet chip). */
export function clockDragData(actor, index) {
  const clock = actor.system.clocks?.[Number(index)];
  return { type: CLOCK_DRAG, actorUuid: actor.uuid, clockId: clock?.id ?? "", index: Number(index) };
}

/** Drop on the canvas: place a clock token centred on the cursor. */
async function placeClockToken(data) {
  if (!canvas?.scene) return;
  if (!game.user.isGM) { ui.notifications.warn("Only the GM can place a clock on the map."); return; }
  const board = await fromUuid(data.actorUuid);
  if (!board || board.pack) { ui.notifications.warn("Drag the clock from a clock board in the world, not from a compendium."); return; }
  let clocks = board.system.clocks ?? [];
  let clock = clocks.find(c => c.id && c.id === data.clockId) ?? clocks[data.index];
  if (!clock) { ui.notifications.warn("That clock is no longer on the board."); return; }
  if (!clock.id) {
    // A clock older than migration 17 that somehow escaped it: give it its id now.
    const all = foundry.utils.deepClone(board.system.toObject().clocks);
    all[data.index].id = foundry.utils.randomID();
    await board.update({ "system.clocks": all });
    clock = board.system.clocks[data.index];
  }

  const size = 2;   // a 2×2 clock reads well at the default grid
  const grid = canvas.grid.size;
  const p = canvas.grid.getTopLeftPoint({ x: data.x - (size * grid) / 2 + grid / 2, y: data.y - (size * grid) / 2 + grid / 2 });
  const tokenData = {
    name: clock.name || "Clock",
    actorId: board.id, actorLink: true,
    x: p.x, y: p.y, width: size, height: size,
    texture: { src: "icons/svg/clockwork.svg" },
    alpha: 0,                                       // the image is invisible; drawClock paints the clock
    hidden: !!clock.secret,
    lockRotation: true,
    disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
    displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
    sight: { enabled: false },
    flags: { "icon-system": { [FLAG]: { actorId: board.id, clockId: clock.id } } },
  };
  await canvas.scene.createEmbeddedDocuments("Token", [tokenData]);
  _log(`placed "${clock.name}" (${clock.id}) of "${board.name}"`);
}

/** GM side: keep token documents in step with their clocks (name, secret, deleted). */
async function syncTokenDocs(board) {
  if (!game.users.activeGM?.isSelf) return;
  for (const scene of game.scenes) {
    const updates = [], deletes = [];
    for (const td of scene.tokens) {
      const f = clockFlag(td);
      if (!f || f.actorId !== board.id) continue;
      const clock = board.system.clocks?.find(c => c.id === f.clockId);
      if (!clock) { deletes.push(td.id); continue; }
      const want = { name: clock.name || "Clock", hidden: !!clock.secret };
      if (td.name !== want.name || td.hidden !== want.hidden) updates.push({ _id: td.id, ...want });
    }
    if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
    if (deletes.length) await scene.deleteEmbeddedDocuments("Token", deletes);
    if (updates.length || deletes.length) _log(`sync "${board.name}" on "${scene.name}": ${updates.length} updated, ${deletes.length} removed`);
  }
}

export function registerClockTokenHooks() {
  Hooks.on("dropCanvasData", (_canvas, data) => {
    if (data?.type !== CLOCK_DRAG) return;
    placeClockToken(data).catch(err => { console.error("ICON 1.5 | placing a clock failed", err); ui.notifications.error(`Could not place the clock: ${err.message}`); });
    return false;
  });
  Hooks.on("drawToken", token => drawClock(token));
  // Size changes need a repaint; moves don't (the overlay is a child and moves with the token).
  Hooks.on("refreshToken", (token, flags) => { if (flags?.refreshSize && clockFlag(token.document)) drawClock(token); });
  Hooks.on("updateActor", (actor, changes) => {
    if (actor.type !== "clock" || !foundry.utils.hasProperty(changes, "system.clocks")) return;
    repaintBoard(actor.id);
    syncTokenDocs(actor).catch(err => console.error("ICON 1.5 | clock token sync failed", err));
  });
}
