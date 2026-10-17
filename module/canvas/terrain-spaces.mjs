/**
 * terrain-spaces.mjs — single terrain spaces a PC's ability or trait marks on the map (R33b).
 *
 * Pits, dangerous and difficult terrain spaces (p.89) and named marks (Symphony's motes, Party Favor's mine,
 * the Elden Rune, Gates of Hell's afterimage, Eclipse's brand, a Polaris / Implode space). The ability panel and
 * the trait row show a chip for each one the text makes (terrainSpacesForItem: "Pit · 2", "Dangerous · 3",
 * "Mote · 4"); clicking it lets the user click that many spaces on the map (Enter / right-click finishes early,
 * Esc cancels). Right-click on the chip removes that chip's spaces from the scene.
 *
 * Each space is a one-cell ICON MeasuredTemplate (drawn by IconMeasuredTemplate, like the areas) with
 * `flags.icon-system.terrain` = { kind, name, label, dangerous, difficult, pit, foesOnly, onEnter, … }:
 * templates, not Regions, because players may create templates (Regions are GM-only) and the area code already
 * draws cells, keeps "lasting" ones at the turn change, deletes them with Delete on the Templates layer and moves
 * the ones with `followTokenId` with their token. Anything that reads the `terrain` flag works for any template,
 * one cell or many: R33c (lasting areas that move or grow) and R33d (marks that follow a character, via
 * followTokenId) can put the same flag on their templates and get the reminders below for free.
 *
 * What the spaces set off (only for the user who moved the token, only the start and the end of a move):
 *   dangerous terrain  "Entering or exiting a dangerous terrain space causes a character to take 2 piercing damage,
 *                      (ignoring armor and vigor). Characters can only take this damage once a turn" (p.89) — a
 *                      question to the mover; never damage without the click. "but only for foes": hostile only.
 *   named marks        the text's "enters" sentence (Symphony "Any character that enters an affected space … detonates
 *                      the mote", Party Favor "When any character enters the space, the mine explodes", Elden Rune "A
 *                      foe can scrub out an Elden Rune by entering or exiting its space") as a chat reminder with a
 *                      Remove button; "starts their turn there" (Symphony) at the start of that character's turn.
 */
import { terrainSpacesForItem, terrainLabel } from "../helpers/terrain-spaces.mjs";
import { armedInfusion, clearInfusion } from "../helpers/infuse.mjs";
import { tokenCells, sourceTokenFor } from "./area-templates.mjs";

const _log = (...a) => console.debug("[ICON | TerrainSpaces]", ...a);
const NS = "icon-system";
const FLAG = "terrain";
const HL = "IconTerrainPick";

/** Colours of a space on the map, per kind. */
export const TERRAIN_COLORS = { pit: "#6b4f2a", dangerous: "#d9480f", difficult: "#8f9a2c", mark: "#7b5fc9" };
const ICONS = { pit: "fa-circle-down", dangerous: "fa-fire", difficult: "fa-shoe-prints", mark: "fa-location-dot", extend: "fa-expand" };

/** The terrain flag of a template document, or null. */
export const terrainFlag = (doc) => doc?.flags?.[NS]?.[FLAG] ?? null;

const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const cellKey = (c) => `${c.i},${c.j}`;
const cheb = (a, b) => Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));
const isHostile = (td) => td?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE || ["foe", "legend"].includes(td?.actor?.type);
const isMapObject = (td) => !!td?.flags?.[NS]?.mapObject;

/** The terrain spaces of an item, as the sheet offers them. */
export function spacesOfItem(item) {
  if (!item) return [];
  return terrainSpacesForItem(item.system, { trait: item.type === "trait", itemName: item.name });
}

/** The status whose foes get the space under them ("pits to appear under every pacified foe"), or "". */
const underStatus = (sp) => (sp?.under && sp.under !== "self" ? sp.under : "");

/** Is `sp`'s Infuse version (Rime's DAGON, Pyre's PYROTIC) the one armed on `item`? */
function infuseArmedFor(item, sp) {
  const armed = armedInfusion(item?.parent);
  return !!armed && armed.itemId === item.id && String(armed.name ?? "").trim().toLowerCase() === String(sp.infuse ?? "").trim().toLowerCase();
}

/**
 * Sheet chips for the terrain spaces of an item. An Infuse version's space is offered only while that infusion is
 * armed, as the objects (R33a2). `index` is the space's place in the full list: the click reads it back.
 */
export function terrainChips(item) {
  return spacesOfItem(item).map((sp, index) => ({ sp, index }))
    .filter(({ sp }) => !sp.infuse || infuseArmedFor(item, sp))
    .map(({ sp, index }) => {
      const n = sp.count ? String(sp.count) : "any";
      const byStatus = underStatus(sp);
      const label = sp.kind === "extend" ? `Area +${sp.count}` : byStatus ? `${sp.label}s under ${byStatus} foes` : `${sp.label} · ${n}`;
      const what = sp.kind === "extend"
        ? `Click to add ${sp.count} space${sp.count > 1 ? "s" : ""} adjacent to this ability's area already on the map`
        : byStatus ? `Click to mark a ${sp.label.toLowerCase()} under every ${byStatus} foe on this scene (asks first)`
        : sp.under === "self" ? `Click to mark the ${sp.label} on the space under your token`
          : `Click to mark ${sp.count ? sp.count : "as many as needed"} ${sp.label.toLowerCase()} space${sp.count === 1 ? "" : "s"} on the map (Enter or right-click finishes early, Esc cancels)`;
      // R33d: the talent / mastery in play lets it go on a character instead (follow-marks.mjs).
      const onChar = sp.onCharacter ? ` ${sp.onCharacter.source}: or on the one character you target, following them${sp.onCharacter.mark ? " as a mark" : ""} (the click asks).` : "";
      return {
        index, kind: sp.kind, label, icon: sp.onCharacter ? "fa-location-crosshairs" : ICONS[sp.kind] ?? ICONS.mark,
        title: `${sp.source ? `${sp.source}: ` : ""}${what}.${onChar} Right-click removes them. — ${sp.rules}`,
      };
    });
}

/**
 * Same space of the same item of the same character: what "used again" replaces and right-click removes. The pits
 * under the pacified foes (Pandaemonium's Talent II, p.178) are a group apart from the combo's own pit (p.177).
 */
export const groupOf = (actor, item, sp) => `${actor.id}#${item.id}#${sp.kind}#${sp.name}#${sp.dangerous ? 1 : 0}${underStatus(sp) ? `#${underStatus(sp)}` : ""}`;

/** Cells a token document covers on its own scene, at its place or with its top-left at `at`. */
export function cellsOf(td, at = null) {
  const grid = td.parent.grid;
  const half = grid.size / 2;
  const tl = grid.getOffset({ x: (at?.x ?? td.x) + half, y: (at?.y ?? td.y) + half });
  const w = Math.max(1, Math.round(td.width ?? 1)), h = Math.max(1, Math.round(td.height ?? 1));
  const out = [];
  for (let di = 0; di < h; di++) for (let dj = 0; dj < w; dj++) out.push({ i: tl.i + di, j: tl.j + dj });
  return out;
}

/* -------------------------------------------------- */
/*  Picking spaces                                     */
/* -------------------------------------------------- */

let _picking = null;
/**
 * Let the user click up to `max` spaces (0 = no limit). A click on a picked space takes it back; Enter or
 * right-click finishes, Esc cancels. `check(cell, picked)` returns why a space can't be picked, or "".
 * @returns {Promise<Array<{i:number,j:number}>|null>}
 */
export function pickSpaces({ max = 1, color = TERRAIN_COLORS.mark, hint = "", check = () => "" } = {}) {
  if (!canvas?.ready) return Promise.resolve(null);
  _picking?.cancel();
  const tint = Number(foundry.utils.Color.from(color));
  return new Promise(resolve => {
    const picked = [];
    let hover = null;
    const hl = canvas.interface.grid;
    hl.addHighlightLayer(HL);
    const render = () => {
      hl.clearHighlightLayer(HL);
      const paint = (c, alpha) => { const p = canvas.grid.getTopLeftPoint(c); hl.highlightPosition(HL, { x: p.x, y: p.y, color: tint, border: tint, alpha }); };
      for (const c of picked) paint(c, 0.5);
      if (hover && !picked.some(c => cellKey(c) === cellKey(hover))) paint(hover, 0.2);
    };
    let over = false;
    const done = (cells) => {
      if (over) return;
      over = true;
      canvas.stage.removeEventListener("pointerdown", down, { capture: true });
      canvas.stage.removeEventListener("pointermove", move, { capture: true });
      window.removeEventListener("keydown", key, { capture: true });
      canvas.app.view.removeEventListener("contextmenu", ctx, { capture: true });
      try { hl.destroyHighlightLayer(HL); } catch { /* canvas gone */ }
      _picking = null;
      resolve(cells?.length ? cells : null);
    };
    const cellAt = (ev) => { const pos = ev.getLocalPosition(canvas.stage); return canvas.grid.getOffset({ x: pos.x, y: pos.y }); };
    const move = (ev) => { const c = cellAt(ev); if (hover && cellKey(c) === cellKey(hover)) return; hover = c; render(); };
    const down = (ev) => {
      const button = ev.button ?? ev.data?.button ?? 0;
      if (button === 2) { ev.stopPropagation(); done(picked.slice()); return; }
      if (button !== 0) return;
      ev.stopPropagation();
      const cell = cellAt(ev);
      const at = picked.findIndex(c => cellKey(c) === cellKey(cell));
      if (at >= 0) { picked.splice(at, 1); render(); return; }
      const why = check(cell, picked);
      if (why) { ui.notifications.warn(why); return; }
      picked.push(cell);
      render();
      if (max && picked.length >= max) done(picked.slice());
    };
    const key = (ev) => {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopImmediatePropagation(); done(null); }
      else if (ev.key === "Enter") { ev.preventDefault(); ev.stopImmediatePropagation(); done(picked.slice()); }
    };
    const ctx = (ev) => ev.preventDefault();
    canvas.stage.addEventListener("pointerdown", down, { capture: true });
    canvas.stage.addEventListener("pointermove", move, { capture: true });
    window.addEventListener("keydown", key, { capture: true });
    canvas.app.view.addEventListener("contextmenu", ctx, { capture: true });
    _picking = { cancel: () => done(null) };
    ui.notifications.info(`${hint} ${max === 1 ? "Click a space" : max ? `Click up to ${max} spaces` : "Click the spaces"}; a second click takes one back. ${max === 1 ? "" : "Enter or right-click finishes, "}Esc cancels.`);
  });
}

/* -------------------------------------------------- */
/*  Creating and removing spaces                       */
/* -------------------------------------------------- */

/**
 * Create one terrain space per cell on `scene`, each a one-cell ICON template (the base R33c / R33d build on).
 * @param {Scene} scene
 * @param {Array<{i:number,j:number}>} cells
 * @param {object} spec   a terrainSpacesInText spec ({kind, name, label, dangerous, foesOnly, onEnter, …})
 * @param {object} opts
 * @param {Actor}  [opts.actor]          the creator (colour of nothing, ownership of the reminders)
 * @param {string} [opts.abilityName]
 * @param {string} [opts.abilityKey]
 * @param {string} [opts.group]          what "used again" replaces / right-click removes
 * @param {string} [opts.source]         "Talent II", "Dagon"…
 * @param {string|null} [opts.followTokenId]  a mark that follows a character (R33d)
 * @param {boolean} [opts.asOne]         R33d: one template over all the cells (a mark on a big token), not one each
 * @param {object}  [opts.extra]         R33d: more fields for the terrain flag (onCharacter, detonate, onDefeat…)
 * @returns {Promise<MeasuredTemplateDocument[]>}
 */
export async function createTerrainSpaces(scene, cells, spec, { actor = null, abilityName = "", abilityKey = "", group = "", source = "", followTokenId = null, itemId = "", asOne = false, extra = {} } = {}) {
  if (!scene || !cells?.length) return [];
  const kind = spec.kind ?? "mark";
  const label = spec.label ?? terrainLabel(spec);
  const color = TERRAIN_COLORS[kind] ?? TERRAIN_COLORS.mark;
  const terrain = {
    kind, name: spec.name ?? "", label, group, source, creatorId: actor?.id ?? "", itemId,
    dangerous: kind === "dangerous" || !!spec.dangerous, difficult: kind === "difficult" || !!spec.difficult, pit: kind === "pit",
    foesOnly: !!spec.foesOnly, rules: spec.rules ?? "",
    onEnter: spec.onEnter ?? "", enterFoes: !!spec.enterFoes, enterAllies: !!spec.enterAllies, enterExit: !!spec.enterExit, onStart: !!spec.onStart,
    ...extra,
  };
  const token = actor ? sourceTokenFor(actor) : null;
  const data = (asOne ? [cells] : cells.map(c => [c])).map(set => {
    const c = set[0];
    const o = scene.grid.getCenterPoint(c);
    return {
      t: "rect", x: o.x, y: o.y, distance: 1, direction: 0, width: 0,
      fillColor: color, borderColor: color, hidden: false,
      flags: { [NS]: {
        cells: set.map(g => ({ i: g.i, j: g.j })), area: { kind: "space", size: 1, self: false, width: 1, label },
        actorId: actor?.id ?? "", actorUuid: actor?.uuid ?? "", tokenId: token?.id ?? "", abilityKey, abilityName,
        // Terrain effects last on the battlefield (p.96): never cleared at the turn change.
        lasting: true, followTokenId, expiry: null, [FLAG]: terrain,
      } },
    };
  });
  try {
    const docs = await scene.createEmbeddedDocuments("MeasuredTemplate", data);
    _log(`${docs.length} × ${label} for "${abilityName}"`);
    return docs;
  } catch (err) {
    console.warn("[ICON | TerrainSpaces] could not create the spaces (permissions?)", err);
    ui.notifications.warn("Could not mark the spaces (you may lack the 'Create Measured Template' permission).");
    return [];
  }
}

/** A "Remove" button for chat cards: removes the listed spaces (registerTerrainSpaceHooks binds it). */
export function removeSpacesButton(scene, docs, label = "Remove") {
  const ids = (docs ?? []).map(d => d.id ?? d).filter(Boolean);
  if (!scene || !ids.length) return "";
  return `<button type="button" class="icon-btn icon-btn--sm icon-btn--remove" data-action="removeTerrainSpaces" data-scene-id="${esc(scene.id)}" data-template-ids="${esc(ids.join(","))}" title="Remove from the map"><i class="fa-solid fa-trash"></i> ${esc(label)}</button>`;
}

/** Delete the spaces this user may delete (their own, or any for the GM). */
async function deleteSpaces(scene, docs) {
  const ids = docs.filter(d => d.isOwner || game.user.isGM).map(d => d.id);
  if (ids.length) await scene.deleteEmbeddedDocuments("MeasuredTemplate", ids);
  return ids.length;
}

/**
 * The chip click: pick the spaces (or the space under the user's token) and mark them; ask first when the text says
 * it lasts until used again and some are already on the scene.
 * @param {Actor} actor
 * @param {string} itemId
 * @param {number} index  place of the space in spacesOfItem
 */
export async function placeTerrainFromChip(actor, itemId, index) {
  const scene = canvas?.scene;
  if (!canvas?.ready || !scene) { ui.notifications.warn("No active scene to mark the spaces on."); return; }
  if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) { ui.notifications.warn("Terrain spaces need a square grid (p.85)."); return; }
  const item = actor?.items?.get(itemId);
  const sp = spacesOfItem(item)[Number(index)];
  if (!sp) { ui.notifications.warn("That terrain space is no longer on the sheet."); return; }
  if (!actor.isOwner) { ui.notifications.warn(`Only the owner of ${actor.name} or the GM can mark its spaces.`); return; }
  if (sp.kind === "extend") return extendArea(actor, item, sp);
  if (underStatus(sp)) return terrainUnderStatusFoes(actor, item, sp);
  // R33d: Polaris Talent I, Amico, WAKING VOID — on a space as before, or on the targeted character.
  if (sp.onCharacter) {
    const own = new Set(actor.getActiveTokens?.(false, true)?.map(t => t.id) ?? []);
    const targets = Array.from(game.user?.targets ?? []).filter(t => t.actor && !own.has(t.id));
    let where = null;
    try {
      where = await foundry.applications.api.DialogV2.wait({
        window: { title: `${item.name} — where?` },
        content: `<p><small>${esc(sp.onCharacter.source)}: ${esc(sp.onCharacter.rule)}</small></p>${targets.length === 1 ? "" : "<p>To put it on a character, target that one token first (hover it and press T).</p>"}`,
        buttons: [
          { action: "space", label: "On a space", default: true },
          { action: "character", label: targets.length === 1 ? `On ${targets[0].name}` : "On a character" },
        ],
        rejectClose: false,
      });
    } catch { where = null; }
    if (!where) return;
    if (where === "character") {
      const { placeMarkOnCharacter } = await import("./follow-marks.mjs");
      return placeMarkOnCharacter(actor, item, sp);
    }
  }

  const group = groupOf(actor, item, sp);
  const earlier = scene.templates.filter(t => terrainFlag(t)?.group === group);
  let replace = false;
  if (sp.replace && earlier.length) {
    replace = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${sp.label} — replace?` },
      content: `<p><strong>${esc(item.name)}</strong> lasts until the ability is used again.</p><p>Remove the ${earlier.length} already on this scene and mark the new ones, or keep them?</p>`,
      yes: { label: "Replace" }, no: { label: "Keep both" }, rejectClose: false,
    }) ?? false;
  }

  let cells = null;
  if (sp.under === "self") {
    // "Inscribe an Elden Rune on the space underneath you": no click for a one-space token.
    const tok = sourceTokenFor(actor);
    if (!tok) { ui.notifications.warn(`${actor.name} has no token on this scene.`); return; }
    const own = tokenCells(tok.document);
    cells = own.length === 1 ? own : await pickSpaces({ max: 1, color: TERRAIN_COLORS[sp.kind], hint: `${item.name}: one of the spaces under you.`,
      check: (c) => own.some(o => cellKey(o) === cellKey(c)) ? "" : "Pick a space under your token." });
  } else {
    // Spaces a token stands on, for "free space" (Party Favor's mine, Symphony's motes, Blitz Talent I).
    const taken = new Set();
    if (sp.free) for (const t of scene.tokens) for (const c of cellsOf(t)) taken.add(cellKey(c));
    // Symphony: "None can be placed adjacent to each other or overlap" — the ones already there count too.
    const already = sp.apart ? scene.templates.filter(t => terrainFlag(t)?.creatorId === actor.id && terrainFlag(t)?.name === sp.name).flatMap(t => t.flags[NS].cells ?? []) : [];
    const check = (c, picked) => {
      if (sp.free && taken.has(cellKey(c))) return "That space isn't free: pick an empty one.";
      if (sp.apart && [...picked, ...already].some(o => cheb(o, c) <= 1)) return `${sp.label}s can't be adjacent to each other or overlap.`;
      return "";
    };
    cells = await pickSpaces({ max: sp.count, color: TERRAIN_COLORS[sp.kind], check,
      hint: `${item.name}${sp.source ? ` (${sp.source})` : ""}: ${sp.label.toLowerCase()} — ${sp.rules}` });
  }
  if (!cells?.length) return;
  if (replace) await deleteSpaces(scene, earlier);
  const docs = await createTerrainSpaces(scene, cells, sp, { actor, abilityName: item.name, abilityKey: `${item.id}:terrain`, group, source: sp.source, itemId: item.id });
  if (!docs.length) return;
  if (sp.infuse && infuseArmedFor(item, sp)) {
    try { await clearInfusion(actor); } catch (err) { console.warn("[ICON | TerrainSpaces] could not clear the infusion", err); }
  }
  const what = [sp.dangerous && sp.kind !== "dangerous" ? (sp.foesOnly ? "dangerous terrain for foes" : "dangerous terrain") : "", sp.kind === "pit" ? "one level lower than its base space (p.89)" : "",
    sp.kind === "difficult" || sp.difficult ? "difficult terrain: +1 movement to exit (p.89)" : "", sp.kind === "dangerous" ? "2 piercing damage on entering or exiting, once a turn (p.89)" : ""].filter(Boolean).join("; ");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--terrain">
        <strong><i class="fa-solid ${ICONS[sp.kind] ?? ICONS.mark}"></i> ${esc(item.name)}</strong>${sp.source ? ` <small>(${esc(sp.source)})</small>` : ""}: ${docs.length} × <strong>${esc(sp.label)}</strong>${replace ? " (replacing the earlier ones)" : ""}
        ${what ? `<br><small>${esc(what)}</small>` : ""}
        <div>${removeSpacesButton(scene, docs, docs.length > 1 ? "Remove all" : "Remove")}</div>
      </div>`,
  });
}

/**
 * Right-click on a chip: remove that chip's spaces from the current scene (after asking).
 * @param {Actor} actor
 * @param {string} itemId
 * @param {number} index
 */
export async function removeTerrainOfChip(actor, itemId, index) {
  const scene = canvas?.scene;
  const item = actor?.items?.get(itemId);
  const sp = spacesOfItem(item)[Number(index)];
  if (!scene || !sp || sp.kind === "extend") return;
  const docs = scene.templates.filter(t => terrainFlag(t)?.group === groupOf(actor, item, sp));
  if (!docs.length) { ui.notifications.info(`No ${sp.label.toLowerCase()} spaces of ${item.name} on this scene.`); return; }
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: `${sp.label} — remove` },
    content: `<p>Remove the ${docs.length} ${esc(sp.label.toLowerCase())} space${docs.length > 1 ? "s" : ""} of <strong>${esc(item.name)}</strong> from this scene?</p>`,
    rejectClose: false,
  }) ?? false;
  if (!ok) return;
  const n = await deleteSpaces(scene, docs);
  ui.notifications.info(`${n} space${n === 1 ? "" : "s"} removed.`);
}

/**
 * Blood Grove (p.186): "extend the area by 2 spaces, adding to its total area on any edge" (Talent II), "extend the
 * area by 1 space, added to its total area, as long as those spaces are placed adjacent to the area" (HUNGRY GROVE):
 * the spaces clicked, each adjacent to the area (or to one just added), join the ability's area on the map.
 */
async function extendArea(actor, item, sp) {
  const scene = canvas.scene;
  // R33c: the area may carry a terrain flag of its own (kind "area": Blood Grove is dangerous for foes).
  const area = scene.templates.find(t => {
    const f = t.flags?.[NS];
    return f?.cells?.length && f.actorId === actor.id && f.abilityKey === item.id && (!f[FLAG] || f[FLAG].kind === "area") && !f.followTokenId;
  });
  if (!area) { ui.notifications.warn(`Place the area of ${item.name} first (its area button), then extend it.`); return; }
  await extendAreaTemplate(area, sp.count, { actor, name: item.name, source: sp.source });
}

/**
 * Add `count` spaces to an area already on the map, each adjacent to it (or to one just added): Blood Grove's
 * "Area +N" chips (R33b), Bifröst Talent II's "grow by 2 spaces … at the end of each round" (R33c, area-motion.mjs).
 * @param {MeasuredTemplateDocument} area
 * @param {number} count
 * @param {{actor?: Actor, name?: string, source?: string, note?: string}} [opts]
 * @returns {Promise<number>} spaces added
 */
export async function extendAreaTemplate(area, count, { actor = null, name = "", source = "", note = "" } = {}) {
  if (!area?.parent || area.parent !== canvas?.scene) { ui.notifications.warn("Open the scene of that area first."); return 0; }
  if (!(area.isOwner || game.user.isGM)) { ui.notifications.warn("Only the one who placed the area or the GM can extend it."); return 0; }
  const own = area.flags[NS].cells;
  const keys = new Set(own.map(cellKey));
  const check = (c, picked) => {
    if (keys.has(cellKey(c))) return "That space is already in the area.";
    return [...own, ...picked].some(o => cheb(o, c) <= 1) ? "" : "Pick a space adjacent to the area.";
  };
  const cells = await pickSpaces({ max: count, color: area.fillColor ?? TERRAIN_COLORS.mark, check,
    hint: `${name}${source ? ` (${source})` : ""}: add ${count} space${count > 1 ? "s" : ""} adjacent to the area.` });
  if (!cells?.length) return 0;
  await area.update({ [`flags.${NS}.cells`]: [...own, ...cells] });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-expand"></i> ${esc(name)}</strong>${source ? ` <small>(${esc(source)})</small>` : ""}: the area grows by ${cells.length} space${cells.length > 1 ? "s" : ""} (${own.length + cells.length} in all).${note ? `<br><small>${esc(note)}</small>` : ""}</div>`,
  });
  return cells.length;
}

/**
 * Mark terrain under tokens that were just placed, after asking: the Volcanic Geyser "creates dangerous terrain
 * under foes" (p.234). One space per token, at `cells` when given (the token may still be moving there).
 * @param {Array<{td: TokenDocument, cell?: {i:number,j:number}}>} placed
 * @param {object} spec   { kind: "dangerous", … }
 * @param {{actor?: Actor, abilityName?: string, itemId?: string, title?: string}} opts
 */
export async function offerTerrainUnder(placed, spec, { actor = null, abilityName = "", itemId = "", title = "" } = {}) {
  const scene = placed?.[0]?.td?.parent;
  if (!scene || !placed.length) return [];
  const label = spec.label ?? terrainLabel(spec);
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: title || `${label} — mark?` },
    content: `<p>Mark a <strong>${esc(label.toLowerCase())}</strong> space under ${esc(placed.map(p => p.td.name).join(", "))}?</p>`,
    yes: { label: "Mark" }, no: { label: "Not now" }, rejectClose: false,
  }) ?? false;
  if (!ok) return [];
  const cells = placed.map(p => p.cell ?? cellsOf(p.td)[0]);
  const docs = await createTerrainSpaces(scene, cells, spec, { actor, abilityName, abilityKey: itemId ? `${itemId}:terrain` : "", itemId,
    group: actor && itemId ? groupOf(actor, { id: itemId }, { ...spec, name: spec.name ?? "" }) : "" });
  if (docs.length) {
    await ChatMessage.create({
      speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid ${ICONS[spec.kind] ?? ICONS.mark}"></i> ${esc(abilityName || label)}</strong>: ${docs.length} × <strong>${esc(label)}</strong> under ${esc(placed.map(p => p.td.name).join(", "))}.
        <div>${removeSpacesButton(scene, docs, docs.length > 1 ? "Remove all" : "Remove")}</div></div>`,
    });
  }
  return docs;
}

/**
 * The chip of "its effect causes pits to appear under every pacified foe" (Pandaemonium's Talent II, p.178): the foes
 * on the scene with that status (statuses.mjs) and no such space under them yet, then the question of offerTerrainUnder.
 */
async function terrainUnderStatusFoes(actor, item, sp) {
  const scene = canvas.scene;
  const status = underStatus(sp);
  const { hasStatus } = await import("../combat/statuses.mjs");
  const already = new Set(scene.templates.filter(t => terrainFlag(t)?.kind === sp.kind).flatMap(t => t.flags[NS].cells ?? []).map(cellKey));
  const foes = scene.tokens.filter(td => td.actor && !isMapObject(td) && isHostile(td) && hasStatus(td.actor, status));
  const placed = foes.filter(td => !already.has(cellKey(cellsOf(td)[0]))).map(td => ({ td }));
  if (!placed.length) {
    ui.notifications.info(foes.length ? `Every ${status} foe already has a ${sp.label.toLowerCase()} under them.` : `No ${status} foe on this scene.`);
    return [];
  }
  return offerTerrainUnder(placed, sp, { actor, abilityName: item.name, itemId: item.id, title: `${item.name} — ${sp.label.toLowerCase()}s under ${status} foes` });
}

/* -------------------------------------------------- */
/*  What the spaces set off                            */
/* -------------------------------------------------- */

/** The spaces with a terrain flag on `scene` and the cells of each. */
const terrainOn = (scene) => scene.templates.filter(t => terrainFlag(t) && t.flags[NS].cells?.length)
  .map(t => ({ doc: t, f: terrainFlag(t), keys: new Set(t.flags[NS].cells.map(cellKey)) }));

const touches = (cells, keys) => cells.some(c => keys.has(cellKey(c)));

// Dangerous terrain "only once a turn" (p.89): the turns a character was already asked in, on this client.
const _dangerAsked = new Map();
function turnKey() {
  const c = game.combat;
  return c?.started ? `${c.id}.${c.round}.${c.turn}` : "";
}

/**
 * After a token moved (by this user): dangerous terrain entered or left, named marks entered (or left, when the text
 * says "entering or exiting"). Only the start and the end of the move are looked at.
 */
async function offerTerrainOnMove(td, prev, to) {
  const scene = td.parent;
  if (!scene || !td.actor) return;
  const before = cellsOf(td, prev);
  const after = cellsOf(td, to);
  if (before[0].i === after[0].i && before[0].j === after[0].j) return;
  const hostile = isHostile(td);
  let danger = null;
  const reminders = [];
  const inside = [];
  for (const { doc, f, keys } of terrainOn(scene)) {
    const was = touches(before, keys), now = touches(after, keys);
    if (was === now) continue;
    if (f.dangerous && (!f.foesOnly || hostile) && !danger) danger = { f, entered: now, doc };
    if (f.onEnter && (now || f.enterExit) && (!f.enterFoes || hostile) && !(f.enterAllies && hostile)) reminders.push({ doc, f, entered: now });
    if (f.inside?.length) inside.push({ doc, f, entered: now });
  }
  if (inside.length) await offerInsideEffects(td, inside);
  if (reminders.length) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: td }),
      content: `<div class="icon-chat-card icon-chat-card--terrain">${reminders.map(({ doc, f, entered }) => {
        const by = doc.flags[NS].abilityName;
        return `<p><strong><i class="fa-solid fa-location-dot"></i> ${esc(td.name)}</strong> ${entered ? "enters" : "leaves"} the <strong>${esc(f.label)}</strong>${by ? ` (${esc(by)})` : ""}.</p><p><small>${esc(f.onEnter)}</small></p><div>${removeSpacesButton(scene, [doc])}</div>`;
      }).join("")}</div>`,
    });
  }
  if (!danger) return;
  const key = turnKey();
  const who = td.actor.id;
  if (key && _dangerAsked.get(who) === key) return;
  if (key) _dangerAsked.set(who, key);
  const by = danger.doc.flags[NS].abilityName;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Dangerous terrain" },
    content: `<p><strong>${esc(td.name)}</strong> ${danger.entered ? "entered" : "left"} a dangerous terrain space (${esc(danger.f.label)}${by ? `, ${esc(by)}` : ""}).</p>
      <p>Take <strong>2 piercing damage</strong>, ignoring armor and vigor? Only once a turn, even entering more dangerous spaces (p.89).</p>`,
    yes: { label: "Take 2 damage" }, no: { label: "Not this time" }, rejectClose: false,
  }) ?? false;
  if (!ok) return;
  const { applyDamageToActor } = await import("../combat/damage.mjs");
  await applyDamageToActor(td.actor, 2, { ignoreVigor: true, chatConfirm: true });
}

/** Does an area's inside effect (area-terrain.mjs insideEffectsOf) concern the character of `td`? */
function insideConcerns(e, td, creatorId) {
  const self = !!creatorId && td.actor?.id === creatorId;
  if (e.immune && self) return false;
  switch (e.who) {
    case "self": return self;
    case "allies": return !self && !isHostile(td);
    case "self+allies": return !isHostile(td);
    case "foes": return isHostile(td);
    default: return true;
  }
}

/** A chat button that gives or takes a status from one character, on a click (registerTerrainSpaceHooks binds it). */
export function insideStatusButton(td, status, { op = "apply", ongoing = false, label = "" } = {}) {
  return `<button type="button" class="icon-btn icon-btn--sm" data-action="terrainInsideStatus" data-token-uuid="${esc(td.uuid)}" data-status="${esc(status)}" data-ongoing="${ongoing ? "true" : "false"}" data-op="${op}"><i class="fa-solid ${op === "apply" ? "fa-plus" : "fa-minus"}"></i> ${esc(label)}</button>`;
}

/**
 * R33c2: a character moved into or out of a terrain-effect area that does something to the characters inside it
 * ("Foes inside are blinded+", Mist Strider p.169; shadow clouds p.161; Magnabio's "characters inside are
 * shattered+" p.218; Dark Wing's "allies in the area have cover" p.171; Quench's cover and "exiting the area can
 * gain stealth" p.157; Tsunami Talent II's "+1 curse on saves" p.233). One chat card with a button per status:
 * nothing is given or taken without a click. "+" statuses are ongoing (p.104): they stay while inside, and leaving
 * offers their removal.
 * @param {TokenDocument} td
 * @param {Array<{doc: MeasuredTemplateDocument, f: object, entered: boolean}>} moves
 */
async function offerInsideEffects(td, moves) {
  const blocks = await insideBlocks(td, moves);
  if (!blocks.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: td }),
    content: `<div class="icon-chat-card icon-chat-card--terrain">${blocks.join("")}</div>`,
  });
}

/**
 * R33c2: a terrain-effect area just placed: the same offers for the characters already inside it, in one card.
 * @param {MeasuredTemplateDocument} doc
 */
export async function offerInsideOnPlace(doc) {
  const f = terrainFlag(doc);
  const scene = doc?.parent;
  if (!f?.inside?.length || !scene) return;
  const keys = new Set((doc.flags[NS].cells ?? []).map(cellKey));
  const blocks = [];
  for (const td of scene.tokens) {
    if (!td.actor || isMapObject(td) || !touches(cellsOf(td), keys)) continue;
    blocks.push(...await insideBlocks(td, [{ doc, f, entered: true }], { placed: true }));
  }
  if (!blocks.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker(),
    content: `<div class="icon-chat-card icon-chat-card--terrain">${blocks.join("")}</div>`,
  });
}

/** The card blocks of offerInsideEffects for one character. */
async function insideBlocks(td, moves, { placed = false } = {}) {
  const { hasStatus, ICON_STATUSES } = await import("../combat/statuses.mjs");
  const nameOf = (id) => ICON_STATUSES.find(s => s.id === id)?.name ?? id;
  const blocks = [];
  for (const { doc, f, entered } of moves) {
    const lines = [];
    for (const e of f.inside) {
      if (!insideConcerns(e, td, f.creatorId)) continue;
      const src = e.source ? ` <small>(${esc(e.source)})</small>` : "";
      if (e.note) {
        if (entered) lines.push(`<p>${esc(td.name)}: ${esc(e.note)} while inside.${src}</p>`);
        else lines.push(`<p><small>${esc(td.name)} no longer has ${esc(e.note)}.</small></p>`);
        continue;
      }
      const name = `${nameOf(e.status)}${e.ongoing ? "+" : ""}`;
      const has = hasStatus(td.actor, e.status);
      if (e.when === "inside") {
        if (entered && !has) lines.push(`<p>Inside: ${esc(name)}.${src}<br>${insideStatusButton(td, e.status, { ongoing: e.ongoing, label: `${name} to ${td.name}` })}</p>`);
        else if (!entered && has) lines.push(`<p>Left the area: no longer ${esc(name)}?${src}<br>${insideStatusButton(td, e.status, { op: "remove", label: `Remove ${nameOf(e.status)}` })}</p>`);
      } else if (!placed && ((e.when === "exit" && !entered) || e.when === "move")) {
        if (!has) lines.push(`<p><small>${esc(e.rule)}</small>${src}<br>${insideStatusButton(td, e.status, { label: `${td.name} gains ${name}` })}</p>`);
      }
    }
    if (!lines.length) continue;
    const by = doc.flags[NS].abilityName;
    blocks.push(`<p><strong><i class="fa-solid fa-location-dot"></i> ${esc(td.name)}</strong> ${placed ? "is inside" : entered ? "enters" : "leaves"} the area${by ? ` of <strong>${esc(by)}</strong>` : ""}.</p>${lines.join("")}`);
  }
  return blocks;
}

/**
 * Start of `combatant`'s turn (active GM, from the combat hook): the named marks they stand on whose text says
 * "starts their turn there" (Symphony's motes, p.178), in one chat card with Remove buttons.
 * @param {Combatant} combatant
 */
export async function terrainTurnStart(combatant) {
  const td = combatant?.token;
  const scene = td?.parent;
  if (!td || !scene || isMapObject(td)) return;
  const mine = cellsOf(td);
  const lines = [];
  for (const { doc, f, keys } of terrainOn(scene)) {
    if (!f.onStart || !touches(mine, keys) || (f.enterFoes && !isHostile(td))) continue;
    const by = doc.flags[NS].abilityName;
    lines.push(`<p><strong>${esc(td.name)}</strong> starts their turn on the <strong>${esc(f.label)}</strong>${by ? ` (${esc(by)})` : ""}.</p><p><small>${esc(f.onEnter)}</small></p><div>${removeSpacesButton(scene, [doc])}</div>`);
  }
  if (!lines.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: td }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-location-dot"></i> Start of ${esc(td.name)}'s turn</strong>${lines.join("")}</div>`,
  });
}

export function registerTerrainSpaceHooks() {
  // A character moved by this user: dangerous terrain and named marks (area-templates.mjs' preUpdateToken leaves
  // the old position in options.iconPrevPos). Objects (R33a) don't set anything off.
  Hooks.on("updateToken", (tokenDoc, changed, options, userId) => {
    if (userId !== game.user.id || !options?.iconPrevPos) return;
    if (!("x" in changed || "y" in changed) || isMapObject(tokenDoc)) return;
    if (!tokenDoc.parent?.templates?.some(t => terrainFlag(t))) return;
    const to = { x: changed.x ?? tokenDoc.x, y: changed.y ?? tokenDoc.y };
    offerTerrainOnMove(tokenDoc, options.iconPrevPos, to).catch(err => console.warn("[ICON | TerrainSpaces] movement check failed", err));
  });

  // R33c2: the status buttons of a terrain-effect area entered or left (offerInsideEffects).
  Hooks.on("renderChatMessageHTML", (_message, html) => {
    for (const btn of html.querySelectorAll('[data-action="terrainInsideStatus"]')) {
      if (btn.dataset.iconBound) continue;
      btn.dataset.iconBound = "true";
      const actorOf = () => fromUuidSync(btn.dataset.tokenUuid)?.actor ?? null;
      const actor = actorOf();
      if (!actor) { btn.disabled = true; btn.title = "That character is no longer on the scene"; btn.style.opacity = "0.5"; continue; }
      if (!actor.isOwner && !game.user.isGM) { btn.disabled = true; btn.title = "Only the owner of that character or the GM"; btn.style.opacity = "0.5"; continue; }
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const a = actorOf();
        if (!a) return;
        const { applyStatus, removeStatus } = await import("../combat/statuses.mjs");
        try {
          if (btn.dataset.op === "remove") await removeStatus(a, btn.dataset.status);
          else await applyStatus(a, btn.dataset.status, btn.dataset.ongoing === "true");
        } catch (err) { console.warn("[ICON | TerrainSpaces] status change failed", err); return; }
        btn.disabled = true; btn.style.opacity = "0.5";
      });
    }
  });

  // "Remove" / "Remove all" on the cards.
  Hooks.on("renderChatMessageHTML", (_message, html) => {
    for (const btn of html.querySelectorAll('[data-action="removeTerrainSpaces"]')) {
      if (btn.dataset.iconBound) continue;
      btn.dataset.iconBound = "true";
      const scene = game.scenes?.get(btn.dataset.sceneId);
      const docs = () => String(btn.dataset.templateIds ?? "").split(",").map(id => scene?.templates?.get(id)).filter(Boolean);
      if (!docs().length) { btn.disabled = true; btn.title = "Already removed"; btn.style.opacity = "0.5"; continue; }
      if (!game.user.isGM && !docs().some(d => d.isOwner)) { btn.disabled = true; btn.title = "Only the one who marked it or the GM can remove it"; btn.style.opacity = "0.5"; continue; }
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const list = docs();
        if (!list.length) { ui.notifications.info("Already removed."); return; }
        try { await deleteSpaces(scene, list); } catch (err) { console.warn("[ICON | TerrainSpaces] removal failed", err); return; }
        btn.disabled = true; btn.style.opacity = "0.5";
      });
    }
  });
}
