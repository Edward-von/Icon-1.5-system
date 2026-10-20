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
import { marksOn, removeMark } from "../combat/marks.mjs";
import { isPlant as isPlantDoc } from "../combat/harvester.mjs";

const _log = (...a) => console.debug("[ICON | TerrainSpaces]", ...a);
const NS = "icon-system";
const FLAG = "terrain";
const HL = "IconTerrainPick";

/** Colours of a space on the map, per kind. */
export const TERRAIN_COLORS = { pit: "#6b4f2a", dangerous: "#d9480f", difficult: "#8f9a2c", mark: "#7b5fc9" };
const ICONS = { pit: "fa-circle-down", dangerous: "fa-fire", difficult: "fa-shoe-prints", mark: "fa-location-dot", extend: "fa-expand" };
// R33b2: chips that work the terrain already inside the ability's area on the map (workArea).
const AREA_WORK = {
  convert: { icon: "fa-fire", what: "Click to make the pits, your objects and the difficult terrain inside this ability's area on the map dangerous terrain" },
  boil: { icon: "fa-skull-crossbones", what: "Click to boil the dangerous terrain inside this ability's area: piercing damage to the characters in or adjacent to it" },
  clear: { icon: "fa-eraser", what: "Click the difficult or dangerous terrain spaces inside this ability's area to remove" },
  // Elden Rune Talent I (p.209): not the area's terrain, but a chip that works the ability's spaces all the same.
  teleport: { icon: "fa-person-running", what: "Free action: click one of this ability's free spaces within range of your token; you are placed there" },
};

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
      // R33b2: Bio's talents and Terraforming work the terrain already inside the ability's area.
      if (AREA_WORK[sp.kind]) return { index, kind: sp.kind, label: sp.label, icon: AREA_WORK[sp.kind].icon,
        title: `${sp.source ? `${sp.source}: ` : ""}${AREA_WORK[sp.kind].what}${sp.kind === "teleport" ? ` (up to ${sp.count})` : " (asks first)"}. — ${sp.rules}` };
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
    // Deepwrath Talent II (p.235): a pit made under a marked foe makes them shattered+ while inside it.
    if (kind === "pit") {
      const made = new Set(cells.map(cellKey));
      for (const td of scene.tokens) {
        if (!td.actor || isMapObject(td) || !touches(cellsOf(td), made)) continue;
        await offerPitShatter(td, false, tokenInPit(td)).catch(err => console.warn("[ICON | TerrainSpaces] pit shatter offer failed", err));
      }
    }
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
 * Symphony's "Charge: Create +2 more spaces" (p.178): the extra motes its charge effect adds, or null. The charge
 * text names no blessing, so the extra spaces cost none (charge, p.94: "when you use this ability on a slow turn").
 * @param {Item} item
 * @returns {{extra:number, rule:string}|null}
 */
function chargeExtraSpaces(item) {
  const t = String(item?.system?.chargeEffect ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const m = /\bcreate \+?(\d+) more spaces?\b/i.exec(t);
  return m && Number(m[1]) > 0 ? { extra: Number(m[1]), rule: t } : null;
}

/** Is it the actor's slow turn in the current combat (the tracker's Slow toggle)? Charge triggers then (p.94). */
function onSlowTurn(actor) {
  const c = game.combat?.combatant;
  return !!c && c.actor?.id === actor?.id && !!c.getFlag?.(NS, "slowTurn");
}

/**
 * Symphony (p.178): "Remove up to four blessings from characters anywhere" — whose blessings, and how many each
 * (at most the spec's count in all). The characters are every one with blessings: the world's actors and this
 * scene's unlinked tokens. With the charge effect ("Create +2 more spaces"), a box adds that many motes that take
 * no blessing: ticked by itself on the user's slow turn, by hand for Songweave / Blessing of Faith (p.176).
 * Resolves { taking: [{actor, count}] (count > 0), extra } or null when cancelled / nothing to place.
 */
async function askBlessingsToTake(scene, item, sp, actor) {
  const { getStatusCharges } = await import("../combat/statuses.mjs");
  const seen = new Set();
  const list = [];
  const consider = (a) => {
    if (!a || seen.has(a.uuid)) return;
    seen.add(a.uuid);
    const has = getStatusCharges(a, "blessed");
    if (has > 0) list.push({ actor: a, has });
  };
  for (const t of scene.tokens) if (!t.actorLink) consider(t.actor);
  for (const a of game.actors ?? []) consider(a);
  const charge = chargeExtraSpaces(item);
  if (!list.length && !charge) { ui.notifications.warn(`${item.name}: no character has a blessing to remove, so no mote can be created.`); return null; }
  const max = sp.count || 4;
  const rows = list.map((x, k) => `<div class="form-group"><label>${esc(x.actor.name)} <small>(${x.has})</small></label><input type="number" name="b${k}" value="0" min="0" max="${x.has}" step="1"></div>`).join("");
  const chargeRow = charge
    ? `<div class="form-group"><label><input type="checkbox" name="charge"${onSlowTurn(actor) ? " checked" : ""}> Charge: +${charge.extra} more mote${charge.extra === 1 ? "" : "s"}, no blessing for ${charge.extra === 1 ? "it" : "them"}</label></div><p><small>Charge: ${esc(charge.rule)} Ticked on your slow turn; tick it by hand when Songweave or Blessing of Faith triggers the charge effects.</small></p>`
    : "";
  let picked = null;
  try {
    picked = await foundry.applications.api.DialogV2.wait({
      window: { title: `${item.name} — whose blessings?` },
      content: `<p><small>${esc(sp.rules)}</small></p><p>Up to ${max} in all: one mote for each blessing removed. Characters you don't own lose theirs through the GM.</p>${rows}${list.length ? "" : "<p>No character has a blessing to remove.</p>"}${chargeRow}`,
      buttons: [{ action: "ok", label: "Remove and place the motes", default: true, callback: (_ev, button) => {
        const form = button.form;
        return {
          list: list.map((x, k) => ({ actor: x.actor, count: Math.max(0, Math.min(x.has, Math.floor(Number(form.elements[`b${k}`]?.value) || 0))) })),
          extra: charge && form.elements.charge?.checked ? charge.extra : 0,
        };
      } }, { action: "cancel", label: "Cancel" }],
      rejectClose: false,
    });
  } catch { picked = null; }
  if (!picked || !Array.isArray(picked.list)) return null;
  let left = max;
  const out = [];
  for (const x of picked.list) {
    const n = Math.min(x.count, left);
    if (n > 0) { out.push({ actor: x.actor, count: n }); left -= n; }
  }
  if (!out.length && !picked.extra) { ui.notifications.info(`${item.name}: no blessing chosen, no mote created.`); return null; }
  if (picked.list.reduce((n, x) => n + x.count, 0) > max) ui.notifications.info(`${item.name}: only ${max} blessings in all — the extra ones were left.`);
  return { taking: out, extra: picked.extra };
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
  if (sp.kind === "teleport") return teleportIntoSpace(actor, item, sp);
  if (AREA_WORK[sp.kind]) return workArea(actor, item, sp);
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

  // Symphony (p.178): "Remove up to four blessings from characters anywhere to create pulsing motes" — whose
  // blessings go is asked first, and one mote is placed per blessing taken, plus the charge's free ones.
  let taking = null;
  let chargeExtra = 0;
  if (sp.fromBlessings) {
    const asked = await askBlessingsToTake(scene, item, sp, actor);
    if (!asked) return;
    taking = asked.taking;
    chargeExtra = asked.extra;
  }
  const maxSpaces = taking ? taking.reduce((n, x) => n + x.count, 0) + chargeExtra : sp.count;
  // ARKENRUNE (Elden Rune's mastery, p.209): "You can put an Arkenrune down instead of a regular Elden Rune".
  const ark = sp.kind === "mark" && sp.under === "self" && !sp.infuse ? arkenruneOf(item, sp) : null;
  if (ark) {
    let which = null;
    try {
      which = await foundry.applications.api.DialogV2.wait({
        window: { title: `${item.name} — which rune?` },
        content: `<p><small>Mastery: ${esc(ark.rule)}</small></p>`,
        buttons: [{ action: "regular", label: sp.label, default: true }, { action: "ark", label: ark.name }],
        rejectClose: false,
      });
    } catch { which = null; }
    if (!which) return;
    if (which === "ark") return placeArkenrune(actor, item, sp, ark);
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
    cells = await pickSpaces({ max: maxSpaces, color: TERRAIN_COLORS[sp.kind], check,
      hint: `${item.name}${sp.source ? ` (${sp.source})` : ""}: ${sp.label.toLowerCase()} — ${sp.rules}` });
  }
  if (!cells?.length) return;
  if (replace) await deleteSpaces(scene, earlier);
  // GREAT RUNE (p.209), when armed: "Grant the following effect to your rune" — this rune carries it.
  const great = sp.kind === "mark" && !sp.infuse ? greatRuneArmed(item) : null;
  const docs = await createTerrainSpaces(scene, cells, sp, { actor, abilityName: item.name, abilityKey: `${item.id}:terrain`, group, source: sp.source, itemId: item.id,
    extra: great ? { great } : {} });
  if (!docs.length) return;
  if (great) {
    try { await clearInfusion(actor); } catch (err) { console.warn("[ICON | TerrainSpaces] could not clear the infusion", err); }
  }
  // The blessings go once the motes are on the map: as many as motes placed (fewer when finished early).
  let taken = "";
  if (taking) {
    const { removeBlessings } = await import("../combat/inflict-status.mjs");
    let left = docs.length;
    const parts = [];
    for (const x of taking) {
      const n = Math.min(x.count, left);
      if (n <= 0) break;
      left -= n;
      if (await removeBlessings({ target: x.actor, source: actor, count: n, abilityName: item.name })) parts.push(`${x.actor.name} ${n}`);
    }
    taken = parts.join(", ");
  }
  if (sp.infuse && infuseArmedFor(item, sp)) {
    try { await clearInfusion(actor); } catch (err) { console.warn("[ICON | TerrainSpaces] could not clear the infusion", err); }
  }
  const what = [sp.dangerous && sp.kind !== "dangerous" ? (sp.foesOnly ? "dangerous terrain for foes" : "dangerous terrain") : "", sp.kind === "pit" ? "one level lower than its base space (p.89)" : "",
    sp.kind === "difficult" || sp.difficult ? "difficult terrain: +1 movement to exit (p.89)" : "", sp.kind === "dangerous" ? "2 piercing damage on entering or exiting, once a turn (p.89)" : ""].filter(Boolean).join("; ");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--terrain">
        <strong><i class="fa-solid ${ICONS[sp.kind] ?? ICONS.mark}"></i> ${esc(item.name)}</strong>${sp.source ? ` <small>(${esc(sp.source)})</small>` : ""}: ${docs.length} × <strong>${esc(sp.label)}</strong>${replace ? " (replacing the earlier ones)" : ""}
        ${what ? `<br><small>${esc(what)}</small>` : ""}${taken ? `<br><small>Blessings removed: ${esc(taken)}.</small>` : ""}${great ? `<br><small><strong>${esc(great.name)}</strong>: ${esc(great.rule)}</small>` : ""}${chargeExtra ? `<br><small>Charge: +${chargeExtra} more space${chargeExtra === 1 ? "" : "s"}, no blessing for ${chargeExtra === 1 ? "it" : "them"}.</small>` : ""}
        <div>${removeSpacesButton(scene, docs, docs.length > 1 ? "Remove all" : "Remove")}${flashStepButton(scene, actor, item, sp)}</div>
      </div>`,
  });
  // Waterspout (p.235) "When summoned, ... you may have the waterspout suck in any characters of your choice in range 2".
  if (sp.kind === "mark") {
    const { offerSuckIn } = await import("./waterspout.mjs");
    for (const doc of docs) await offerSuckIn(doc, "summoned").catch(err => console.warn("[ICON | TerrainSpaces] waterspout offer failed", err));
  }
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
  if (!scene || !sp || sp.kind === "extend" || AREA_WORK[sp.kind]) return;
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

/* -------------------------------------------------- */
/*  Elden Rune (p.209): Talent I, Talent II, ARKENRUNE */
/* -------------------------------------------------- */

// "You can put an Arkenrune down instead of a regular Elden Rune, but only one at a time, replacing the last Arkenrune
// placed. Arkenrunes can't be scrubbed out, extend to a small blast area, and their benefits also extend to allies."
const ARKEN = /\b[Yy]ou can put an? ([A-Z][\w'-]*(?: [A-Z][\w'-]*)*) down instead of a regular ([A-Z][\w'-]*(?: [A-Z][\w'-]*)*)\b/;
// Talent II: "While standing in an Elden Rune, the infuse costs of your spells are reduced by 1, to a minimum of 1."
const RUNE_INFUSE = /\b[Ww]hile standing in an? ([A-Z][\w'-]*(?: [A-Z][\w'-]*)*), the infuse costs of your spells are reduced by (\d+), to a minimum of (\d+)\b/;

/** The unlocked mastery's other rune for the regular one `sp` names, or null. */
function arkenruneOf(item, sp) {
  const s = item?.system ?? {};
  if (!s.masteryUnlocked) return null;
  const rule = plainOf(s.mastery).replace(/^[A-Z' ]+:\s*/, "");
  const m = ARKEN.exec(rule);
  if (!m || m[2].toLowerCase() !== String(sp.name ?? "").toLowerCase()) return null;
  return {
    name: m[1], rule,
    size: /\bextend to an? (small|medium|large) blast area\b/i.exec(rule)?.[1]?.[0]?.toLowerCase() ?? "",
    noScrub: /\bcan't be scrubbed out\b/i.test(rule),
    allies: /\bbenefits also extend to allies\b/i.test(rule),
  };
}

/** ARKENRUNE: one at a time (the last one is replaced), on a blast around the space under the user, no scrub reminder. */
async function placeArkenrune(actor, item, sp, ark) {
  const scene = canvas.scene;
  const tok = sourceTokenFor(actor);
  if (!tok) { ui.notifications.warn(`${actor.name} has no token on this scene.`); return; }
  const own = tokenCells(tok.document);
  const picked = own.length === 1 ? own : await pickSpaces({ max: 1, color: TERRAIN_COLORS.mark, hint: `${item.name}: the ${ark.name}'s centre, one of the spaces under you.`,
    check: (c) => own.some(o => cellKey(o) === cellKey(c)) ? "" : "Pick a space under your token." });
  if (!picked?.length) return;
  const { shapeCells } = await import("./area-templates.mjs");
  const cells = ark.size ? shapeCells({ kind: "blast", size: ark.size }, picked[0]) : picked;
  const spec = { ...sp, name: ark.name, label: ark.name, rules: `${sp.rules} ${ark.rule}`.trim(),
    ...(ark.noScrub ? { onEnter: "", enterFoes: false, enterExit: false } : {}) };
  const group = groupOf(actor, item, spec);
  const earlier = scene.templates.filter(t => terrainFlag(t)?.group === group);
  if (earlier.length) await deleteSpaces(scene, earlier);
  const great = greatRuneArmed(item);
  const docs = await createTerrainSpaces(scene, cells, spec, { actor, abilityName: item.name, abilityKey: `${item.id}:terrain`, group, source: "Mastery",
    itemId: item.id, asOne: true, extra: { alliesToo: ark.allies, ...(great ? { great } : {}) } });
  if (!docs.length) return;
  if (great) {
    try { await clearInfusion(actor); } catch (err) { console.warn("[ICON | TerrainSpaces] could not clear the infusion", err); }
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid ${ICONS.mark}"></i> ${esc(item.name)}</strong> <small>(Mastery)</small>: an <strong>${esc(ark.name)}</strong>${ark.size ? ` over a ${ark.size === "s" ? "small" : ark.size === "m" ? "medium" : "large"} blast area` : ""}${earlier.length ? " (replacing the last one)" : ""}.
      <br><small>${esc([ark.noScrub ? "can't be scrubbed out" : "", ark.allies ? "its benefits also extend to allies" : ""].filter(Boolean).join("; "))}</small>${great ? `<br><small><strong>${esc(great.name)}</strong>: ${esc(great.rule)}</small>` : ""}
      <div>${removeSpacesButton(scene, docs)}</div></div>`,
  });
}

/** Elden Rune Talent I: the user's token onto one of the ability's free spaces within `sp.count` of it. */
async function teleportIntoSpace(actor, item, sp) {
  const scene = canvas.scene;
  const tok = sourceTokenFor(actor);
  if (!tok) { ui.notifications.warn(`${actor.name} has no token on this scene.`); return; }
  const td = tok.document;
  const keys = new Set(scene.templates.filter(t => { const f = terrainFlag(t); return f?.creatorId === actor.id && f.itemId === item.id && f.kind === "mark" && !f.onCharacter; })
    .flatMap(t => t.flags[NS].cells ?? []).map(cellKey));
  if (!keys.size) { ui.notifications.info(`No ${sp.name || "space"} of ${item.name} on this scene.`); return; }
  const r = Number(sp.count) || 3;
  const from = cellsOf(td);
  const taken = new Set();
  for (const t of scene.tokens) if (t.id !== td.id) for (const c of cellsOf(t)) taken.add(cellKey(c));
  const check = (c) => {
    if (!keys.has(cellKey(c))) return `Pick a ${sp.name || "space"} of ${item.name}.`;
    if (taken.has(cellKey(c))) return "That space isn't free.";
    return from.some(o => cheb(o, c) <= r) ? "" : `That space is beyond ${r} spaces of you.`;
  };
  const cells = await pickSpaces({ max: 1, color: TERRAIN_COLORS.mark, check, hint: `${item.name}${sp.source ? ` (${sp.source})` : ""}: teleport up to ${r} spaces into a ${sp.name || "space"}.` });
  if (!cells?.length || !(await placeTokenAt(td, cells[0]))) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: td }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-person-running"></i> ${esc(item.name)}</strong>${sp.source ? ` <small>(${esc(sp.source)})</small>` : ""}: ${esc(td.name)} teleports into a ${esc(sp.name || "space")} (free action).</div>`,
  });
}

/**
 * Elden Rune Talent II (p.209) for `actor`'s next infusion: standing in a rune of their own ability with that talent,
 * or in an ARKENRUNE of an ally's ("their benefits also extend to allies"). Null when none.
 * @returns {{by: number, min: number, label: string}|null}
 */
export function runeInfuseReduction(actor) {
  for (const { f, creator, item, own } of runesStoodIn(actor)) {
    const s = item.system ?? {};
    const t = Number(s.talentSelected) || 0;
    const m = RUNE_INFUSE.exec(plainOf(t === 1 ? s.talent1 : t === 2 ? s.talent2 : ""));
    if (!m) continue;
    return { by: Number(m[2]) || 1, min: Number(m[3]) || 1, label: `${item.name} Talent ${t === 1 ? "I" : "II"}: standing in ${own ? "your" : `${creator.name}'s`} ${f.name || f.label}` };
  }
  return null;
}

/**
 * The marks of an ability `actor`'s token stands in that work for them: their own, or an ally's whose benefits
 * "also extend to allies" (ARKENRUNE, p.209). Each with its flag, creator and item.
 * @returns {Array<{f: object, creator: Actor, item: Item, own: boolean}>}
 */
function runesStoodIn(actor) {
  const td = sourceTokenFor(actor)?.document;
  if (!td?.parent) return [];
  const mine = cellsOf(td);
  const out = [];
  for (const { f, keys } of terrainOn(td.parent)) {
    if (f.kind !== "mark" || f.onCharacter || !touches(mine, keys)) continue;
    const creator = game.actors?.get(f.creatorId);
    const item = creator?.items?.get(f.itemId);
    if (!item) continue;
    const own = creator.id === actor.id;
    if (!own && !(f.alliesToo && !isFoeOf(td, creator))) continue;
    out.push({ f, creator, item, own });
  }
  return out;
}

// Elden Rune (p.209): "While standing on an Elden Rune space, the range of all abilities with a listed range is
// increased by +3."
const RUNE_RANGE = /\b[Ww]hile standing (?:on|in) an? ([A-Z][\w'-]*(?: [A-Z][\w'-]*)*?)(?: space)?, the range of all abilities with a listed range is increased by \+?(\d+)\b/;
// GREAT RUNE (Elden Rune's Infuse 3, p.209): "Grant the following effect to your rune: your attacks also shatter their
// main target while standing in this rune."
const GREAT_RUNE = /\bInfuse (?:\d+|X)\s*:\s*([A-Z][A-Z' ]+?)\s*[—–-]\s*Grant the following effect to your rune:\s*([^.]*\.)/i;

/**
 * Elden Rune (p.209): the range bonus `actor` has standing in a rune of their own, or in an ally's ARKENRUNE.
 * A listed range only: 0 (adjacent) and no maximum range stay as they are.
 * @returns {{by: number, label: string}|null}
 */
export function runeRangeBonus(actor) {
  for (const { f, creator, item, own } of runesStoodIn(actor)) {
    const m = RUNE_RANGE.exec(plainOf(item.system?.description));
    if (!m) continue;
    return { by: Number(m[2]) || 3, label: `${item.name}: standing in ${own ? "your" : `${creator.name}'s`} ${f.name || f.label}` };
  }
  return null;
}

/** `range` with the rune's bonus when it is a listed one (finite, above 0); `note` says why, or "". */
export function rangeWithRune(actor, range) {
  const r = Number(range) || 0;
  if (!(r > 0) || !Number.isFinite(r)) return { range: r || range, note: "" };
  const bonus = runeRangeBonus(actor);
  return bonus ? { range: r + bonus.by, note: `${bonus.label}: range +${bonus.by} (${r} → ${r + bonus.by}), p.209` } : { range: r, note: "" };
}

/**
 * GREAT RUNE (p.209) for `actor`'s attacks: standing in a rune of theirs granted it (or an ally's ARKENRUNE that has
 * it), "your attacks also shatter their main target". Null when none.
 * @returns {{label: string, rule: string}|null}
 */
export function runeAttackShatter(actor) {
  for (const { f, creator, own } of runesStoodIn(actor)) {
    if (!f.great) continue;
    return { label: `${f.great.name}: standing in ${own ? "your" : `${creator.name}'s`} ${f.name || f.label}`, rule: f.great.rule };
  }
  return null;
}

/** GREAT RUNE armed on `item` (its Infuse version that grants an effect to the rune), or null. */
function greatRuneArmed(item) {
  const armed = armedInfusion(item?.parent);
  if (!armed || armed.itemId !== item.id) return null;
  const m = GREAT_RUNE.exec(plainOf(item.system?.description));
  if (!m || String(armed.name ?? "").trim().toLowerCase() !== m[1].trim().toLowerCase()) return null;
  return { name: titleCaseWord(m[1].trim().toLowerCase()), rule: m[2].trim() };
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
 * R33b2: Bio's talents (p.218) and Terraforming (p.219) on the terrain inside the ability's own area on the map (the
 * newest one of this actor and ability, as extendArea): "To dangerous" marks a dangerous space on every pit, difficult
 * space and object of the user's inside it; "Boil" deals the piercing damage to the characters in or adjacent to the
 * dangerous spaces inside it; "Clear terrain" lets the user click the difficult / dangerous spaces inside it to remove.
 * Each asks before anything changes.
 */
async function workArea(actor, item, sp) {
  const scene = canvas.scene;
  const area = scene.templates.filter(t => {
    const f = t.flags?.[NS];
    return f?.cells?.length && f.actorId === actor.id && f.abilityKey === item.id && (!f[FLAG] || f[FLAG].kind === "area") && !f.followTokenId;
  }).sort((a, b) => (b._stats?.createdTime ?? 0) - (a._stats?.createdTime ?? 0))[0];
  if (!area) { ui.notifications.warn(`Place the area of ${item.name} first (its area button), then click this.`); return; }
  const inArea = new Set(area.flags[NS].cells.map(cellKey));
  const others = terrainOn(scene).filter(x => x.doc.id !== area.id && !x.f.onCharacter);
  const cellsWhere = (pred) => {
    const out = new Map();
    for (const x of others) if (pred(x.f)) for (const k of x.keys) if (inArea.has(k)) out.set(k, k);
    return out;
  };
  const toCell = (k) => { const [i, j] = k.split(",").map(Number); return { i, j }; };
  const head = `${item.name}${sp.source ? ` (${sp.source})` : ""}`;

  if (sp.kind === "convert") {
    const keys = cellsWhere(f => f.pit || f.difficult);
    for (const td of scene.tokens) if (td.flags?.[NS]?.mapObject?.creatorId === actor.id) for (const c of cellsOf(td)) if (inArea.has(cellKey(c))) keys.set(cellKey(c), cellKey(c));
    for (const k of cellsWhere(f => f.dangerous && !f.foesOnly).keys()) keys.delete(k);   // already dangerous
    if (!keys.size) { ui.notifications.info(`${head}: no pit, difficult terrain or object of yours inside the area that isn't dangerous already.`); return; }
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${head} — dangerous terrain` },
      content: `<p>Make <strong>${keys.size}</strong> space${keys.size > 1 ? "s" : ""} inside the area (pits, difficult terrain, your objects) dangerous terrain?</p><p><small>${esc(sp.rules)}</small></p>`,
      yes: { label: "Make dangerous" }, no: { label: "Not now" }, rejectClose: false,
    }) ?? false;
    if (!ok) return;
    const spec = { kind: "dangerous", name: "", rules: sp.rules };
    const docs = await createTerrainSpaces(scene, [...keys.keys()].map(toCell), spec, { actor, abilityName: item.name, abilityKey: `${item.id}:terrain`,
      group: groupOf(actor, item, spec), source: sp.source, itemId: item.id });
    if (docs.length) await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-fire"></i> ${esc(head)}</strong>: ${docs.length} space${docs.length > 1 ? "s" : ""} become dangerous terrain.<div>${removeSpacesButton(scene, docs, docs.length > 1 ? "Remove all" : "Remove")}</div></div>`,
    });
    return;
  }

  if (sp.kind === "boil") {
    const hot = [...cellsWhere(f => f.dangerous).keys()].map(toCell);
    if (!hot.length) { ui.notifications.info(`${head}: no dangerous terrain inside the area.`); return; }
    const hit = scene.tokens.filter(t => t.actor && !isMapObject(t) && cellsOf(t).some(c => hot.some(h => cheb(c, h) <= 1)));
    if (!hit.length) { ui.notifications.info(`${head}: nobody in or adjacent to the dangerous terrain inside the area.`); return; }
    const amount = Number(sp.amount) || 2;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${head} — boil` },
      content: `<p>${hot.length} dangerous space${hot.length > 1 ? "s" : ""} boil: <strong>${amount} piercing damage</strong> to ${esc(hit.map(t => t.name).join(", "))}?</p><p><small>${esc(sp.rules)}</small></p>`,
      yes: { label: `Deal ${amount} damage` }, no: { label: "Not now" }, rejectClose: false,
    }) ?? false;
    if (!ok) return;
    const { applyDamageToActor } = await import("../combat/damage.mjs");
    for (const t of hit) await applyDamageToActor(t.actor, amount, { chatConfirm: true });
    return;
  }

  // clear
  const removable = cellsWhere(f => f.dangerous || f.difficult);
  if (!removable.size) { ui.notifications.info(`${head}: no difficult or dangerous terrain inside the area.`); return; }
  const cells = await pickSpaces({ max: 0, color: TERRAIN_COLORS.difficult, hint: `${head}: the difficult or dangerous spaces to remove.`,
    check: (c) => removable.has(cellKey(c)) ? "" : "Pick a difficult or dangerous space inside the area." });
  if (!cells?.length) return;
  const picked = new Set(cells.map(cellKey));
  let removed = 0, refused = 0;
  for (const x of others) {
    if (!(x.f.dangerous || x.f.difficult) || ![...x.keys].some(k => picked.has(k))) continue;
    if (!(x.doc.isOwner || game.user.isGM)) { refused++; continue; }
    const left = x.doc.flags[NS].cells.filter(c => !picked.has(cellKey(c)));
    try {
      if (!left.length) await x.doc.delete();
      else await x.doc.update({ [`flags.${NS}.cells`]: left });   // an area keeps its other spaces
      removed++;
    } catch (err) { console.warn("[ICON | TerrainSpaces] could not clear a space", err); refused++; }
  }
  ui.notifications.info(`${head}: terrain cleared from ${cells.length} space${cells.length > 1 ? "s" : ""}.${refused ? ` ${refused} belong to someone else: ask the GM.` : ""}`);
  _log(`cleared ${removed} templates`);
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
  const own = area.flags[NS].cells.map(c => ({ i: c.i, j: c.j }));
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
  // The statuses of an area for who is inside (R33c2): the characters standing in the new spaces are now inside.
  if (terrainFlag(area)?.inside?.length) {
    try { await offerInsideOnShift(area, own); } catch (err) { console.warn("[ICON | TerrainSpaces] inside-area check failed", err); }
  }
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
 * says "entering or exiting"). The spaces crossed on the way count too (R33b2: map-objects.mjs movePath, Foundry's
 * waypoints of the move): a space only passed through is entered and exited.
 * @param {object|null} movement  Foundry's movement data of this update (options._movement[id]: Foundry 13 puts it under the underscored key)
 */
async function offerTerrainOnMove(td, prev, to, movement = null, { carriedBy = "" } = {}) {
  const scene = td.parent;
  if (!scene || !td.actor) return;
  const before = cellsOf(td, prev);
  const after = cellsOf(td, to);
  if (before[0].i === after[0].i && before[0].j === after[0].j) return;
  const hostile = isHostile(td);
  // The footprints in between (start and end left out); none for a move made by code or a teleport.
  const { movePath } = await import("./map-objects.mjs");
  const mid = movePath(td, prev, movement, before, after).slice(1, -1);
  let danger = null;
  const reminders = [];
  const inside = [];
  for (const { doc, f, keys } of terrainOn(scene)) {
    // P5: the area that dragged the character with it (Tsunami, p.233): it never left it, nothing is entered.
    if (carriedBy && doc.id === carriedBy) continue;
    const was = touches(before, keys), now = touches(after, keys);
    const crossed = !was && !now && mid.some(fp => touches(fp, keys));
    if (was === now && !crossed) continue;
    const entered = now || crossed;
    // R33b2: "Difficult Terrain - Costs +1 space of movement to exit" (p.89): a reminder, the movement isn't counted.
    if (f.difficult && ((was && !now) || crossed))
      ui.notifications.info(`${td.name} ${crossed ? "crosses" : "leaves"} difficult terrain (${f.label}): exiting costs +1 space of movement (p.89).`);
    if (f.dangerous && (!f.foesOnly || hostile) && !danger) danger = { f, entered, crossed, doc };
    if (f.onEnter && (entered || f.enterExit) && (!f.enterFoes || hostile) && !(f.enterAllies && hostile)) reminders.push({ doc, f, entered, crossed });
    // R33c2's statuses for who is inside: only a real enter / leave, not a space passed through.
    if (f.inside?.length && was !== now) inside.push({ doc, f, entered: now });
  }
  // Harvester plants (p.184): dangerous terrain for foes only; an ally entering may pick the blessing up.
  const { plantsOnMove, offerPlantBlessings } = await import("../combat/harvester.mjs");
  const plants = plantsOnMove(td, before, after, mid);
  if (hostile && plants.danger && !danger) danger = plants.danger;
  if (!hostile && plants.entered.length) await offerPlantBlessings(td, plants.entered);
  if (inside.length) await offerInsideEffects(td, inside);
  if (reminders.length) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: td }),
      content: `<div class="icon-chat-card icon-chat-card--terrain">${reminders.map(({ doc, f, entered, crossed }) => {
        const by = doc.flags[NS].abilityName;
        return `<p><strong><i class="fa-solid fa-location-dot"></i> ${esc(td.name)}</strong> ${crossed ? "passes through" : entered ? "enters" : "leaves"} the <strong>${esc(f.label)}</strong>${by ? ` (${esc(by)})` : ""}.</p><p><small>${esc(f.onEnter)}</small></p><div>${entered ? detonateButton(scene, doc, f, td, crossed) : ""} ${removeSpacesButton(scene, [doc])}</div>`;
      }).join("")}</div>`,
    });
  }
  // Deepwrath Talent II (p.235): shattered+ while inside pits.
  const pits = pitKeysOn(scene);
  const ground = !((Number(td.elevation) || 0) > 0);
  await offerPitShatter(td, ground && touches(before, pits), ground && touches(after, pits));
  // R33b2: DARKTIDE (Deepwrath's mastery, p.235) — the marked character's first vacated space this turn.
  const dark = terrainMarksOn(td.actor).filter(x => x.mastery);
  await offerDarktideLeave(td, before, after, dark);
  if (!danger) return;
  // DARKTIDE: "Marked allies are immune to dangerous terrain, and marked foes take +1 more damage from it".
  const immune = dark.find(x => DARK_IMMUNE.test(x.mastery) && !isFoeOf(td, x.creator));
  if (immune) { ui.notifications.info(`${td.name} is immune to dangerous terrain (${immune.item.name}, DARKTIDE).`); return; }
  const extra = dark.reduce((n, x) => { const m = DARK_EXTRA.exec(x.mastery); return n + (m && isFoeOf(td, x.creator) ? Number(m[1]) : 0); }, 0);
  const amount = 2 + extra;
  const key = turnKey();
  const who = td.actor.id;
  if (key && _dangerAsked.get(who) === key) return;
  if (key) _dangerAsked.set(who, key);
  const by = danger.doc.flags[NS].abilityName;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Dangerous terrain" },
    content: `<p><strong>${esc(td.name)}</strong> ${danger.crossed ? "passed through" : danger.entered ? "entered" : "left"} a dangerous terrain space (${esc(danger.f.label)}${by ? `, ${esc(by)}` : ""}).</p>
      <p>Take <strong>${amount} piercing damage</strong>${extra ? ` (2, +${extra} from DARKTIDE: marked foes take more damage from dangerous terrain)` : ""}, ignoring armor and vigor? Only once a turn, even entering more dangerous spaces (p.89).</p>`,
    yes: { label: `Take ${amount} damage` }, no: { label: "Not this time" }, rejectClose: false,
  }) ?? false;
  if (!ok) return;
  const { applyDamageToActor } = await import("../combat/damage.mjs");
  await applyDamageToActor(td.actor, amount, { ignoreVigor: true, chatConfirm: true });
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

/**
 * Mist Strider Talent II (p.169) "Foes in the area count all characters as having evasion": the areas the attacker
 * of `td` stands in with that rule, by name (empty when none). The attack dialog ticks evasion on every target.
 * @param {TokenDocument} td
 * @returns {string[]}
 */
export function areaEvasionFor(td) {
  const scene = td?.parent;
  if (!scene || !td.actor || isMapObject(td)) return [];
  const mine = cellsOf(td);
  const out = [];
  for (const { doc, f, keys } of terrainOn(scene)) {
    if (!touches(mine, keys) || !(f.inside ?? []).some(e => e.evasion && insideConcerns(e, td, f.creatorId))) continue;
    const name = doc.flags[NS].abilityName || f.label || "Area";
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

/** A chat button that gives or takes a status from one character, on a click (registerTerrainSpaceHooks binds it). */
export function insideStatusButton(td, status, { op = "apply", ongoing = false, label = "" } = {}) {
  return `<button type="button" class="icon-btn icon-btn--sm" data-action="terrainInsideStatus" data-token-uuid="${esc(td.uuid)}" data-status="${esc(status)}" data-ongoing="${ongoing ? "true" : "false"}" data-op="${op}"><i class="fa-solid ${op === "apply" ? "fa-plus" : "fa-minus"}"></i> ${esc(label)}</button>`;
}

/**
 * P27: the cards of an area's statuses speak as the one who placed the area (its token on the area's scene, else its
 * actor), not as whatever token the GM has selected.
 * @param {MeasuredTemplateDocument} doc
 */
function areaSpeaker(doc) {
  const f = doc?.flags?.[NS] ?? {};
  const token = f.tokenId ? doc.parent?.tokens?.get(f.tokenId) : null;
  if (token) return ChatMessage.getSpeaker({ token });
  const actor = game.actors?.get(f.actorId || terrainFlag(doc)?.creatorId);
  return actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();
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
    speaker: areaSpeaker(moves[0]?.doc),
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
    speaker: areaSpeaker(doc),
    content: `<div class="icon-chat-card icon-chat-card--terrain">${blocks.join("")}</div>`,
  });
}

/**
 * An area that moved over the characters (Tsunami, Waterspout, Shift + arrows; area-motion.mjs moveArea): the same
 * offers for those it now covers and no longer covers, as if they had walked in or out. One card, on a click.
 * @param {MeasuredTemplateDocument} doc  the area, already at its new cells
 * @param {Array<{i:number, j:number}>} oldCells  its cells before the move
 * @param {{skip?: string[], only?: string[]}} [opts]  token ids left out (dragged with it) / the only ones looked at
 */
export async function offerInsideOnShift(doc, oldCells, { skip = [], only = null } = {}) {
  const f = terrainFlag(doc);
  const scene = doc?.parent;
  if (!f?.inside?.length || !scene) return;
  const before = new Set((oldCells ?? []).map(cellKey));
  const after = new Set((doc.flags[NS].cells ?? []).map(cellKey));
  const blocks = [];
  for (const td of scene.tokens) {
    if (!td.actor || isMapObject(td) || skip.includes(td.id) || (only && !only.includes(td.id))) continue;
    const cells = cellsOf(td);
    const was = touches(cells, before), now = touches(cells, after);
    if (was === now) continue;
    // The character did not enter or exit by itself: only the "while inside" statuses, not Quench's "exiting".
    blocks.push(...await insideBlocks(td, [{ doc, f, entered: now }], { shifted: true }));
  }
  if (!blocks.length) return;
  await ChatMessage.create({
    speaker: areaSpeaker(doc),
    content: `<div class="icon-chat-card icon-chat-card--terrain">${blocks.join("")}</div>`,
  });
}

/** The card blocks of offerInsideEffects for one character. */
async function insideBlocks(td, moves, { placed = false, shifted = false } = {}) {
  const { hasStatus, ICON_STATUSES } = await import("../combat/statuses.mjs");
  const nameOf = (id) => ICON_STATUSES.find(s => s.id === id)?.name ?? id;
  const blocks = [];
  for (const { doc, f, entered } of moves) {
    const lines = [];
    for (const e of f.inside) {
      if (!insideConcerns(e, td, f.creatorId)) continue;
      const src = e.source ? ` <small>(${esc(e.source)})</small>` : "";
      if (e.note) {
        if (entered) lines.push(`<p>${esc(td.name)}: ${esc(e.note)} while inside${e.evasion ? " (its attack dialog ticks \"Defender has evasion\")" : ""}.${src}</p>`);
        else lines.push(`<p><small>${esc(td.name)} no longer ${e.evasion ? esc(e.note) : `has ${esc(e.note)}`}.</small></p>`);
        continue;
      }
      const name = `${nameOf(e.status)}${e.ongoing ? "+" : ""}`;
      const has = hasStatus(td.actor, e.status);
      if (e.when === "inside") {
        if (entered && !has) lines.push(`<p>Inside: ${esc(name)}.${src}<br>${insideStatusButton(td, e.status, { ongoing: e.ongoing, label: `${name} to ${td.name}` })}</p>`);
        else if (!entered && has) lines.push(`<p>Left the area: no longer ${esc(name)}?${src}<br>${insideStatusButton(td, e.status, { op: "remove", label: `Remove ${nameOf(e.status)}` })}</p>`);
      } else if (!placed && !shifted && ((e.when === "exit" && !entered) || e.when === "move")) {
        if (!has) lines.push(`<p><small>${esc(e.rule)}</small>${src}<br>${insideStatusButton(td, e.status, { label: `${td.name} gains ${name}` })}</p>`);
      }
    }
    if (!lines.length) continue;
    const by = doc.flags[NS].abilityName;
    blocks.push(`<p><strong><i class="fa-solid fa-location-dot"></i> ${esc(td.name)}</strong> ${placed ? "is inside" : shifted ? (entered ? "is now inside" : "is no longer inside") : entered ? "enters" : "leaves"} the area${by ? ` of <strong>${esc(by)}</strong>` : ""}.</p>${lines.join("")}`);
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
    lines.push(`<p><strong>${esc(td.name)}</strong> starts their turn on the <strong>${esc(f.label)}</strong>${by ? ` (${esc(by)})` : ""}.</p><p><small>${esc(f.onEnter)}</small></p><div>${detonateButton(scene, doc, f, td)} ${removeSpacesButton(scene, [doc])}</div>`);
  }
  // R33b2: Deepwrath (p.235) "While marked, create a watery pit under them at the start of their turn" — a button.
  for (const { creator, item, base } of terrainMarksOn(td.actor)) {
    const m = PIT_AT_START.exec(base);
    if (!m) continue;
    lines.push(`<p><strong>${esc(td.name)}</strong> is marked by <strong>${esc(item.name)}</strong> (${esc(creator.name)}).</p><p><small>${esc(m[0])}.</small></p>
      <div>${actButton("pitUnder", { scene: scene.id, token: td.id, creator: creator.id, item: item.id, label: titleCaseWord(m[1]) }, `Create ${m[1].toLowerCase()}`, "fa-circle-down", `Mark a ${m[1].toLowerCase()} under ${td.name}`)}</div>`);
  }
  // R33b2: the creator's own delayed spaces that go off at the start of their (slow) turn: Eclipse's brand (p.203).
  lines.push(...delayedSpacesAtStart(td, scene));
  if (!lines.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: td }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-location-dot"></i> Start of ${esc(td.name)}'s turn</strong>${lines.join("")}</div>`,
  });
}

/* -------------------------------------------------- */
/*  Abilities that work the spaces later (R33b2)       */
/* -------------------------------------------------- */
// Cards with one button per thing the ability does on the map: nothing moves or appears before that click.

const plainOf = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const titleCaseWord = (s) => String(s ?? "").trim().replace(/(^|\s)([a-z])/g, (_m, a, b) => a + b.toUpperCase());

// Deepwrath (p.235): the mark, its Effect and DARKTIDE (mastery).
const PIT_AT_START = /\bwhile marked, create (?:a|an) ((?:[\w-]+ )?pit) under them at the start of their turn\b/i;
const DRAG_UNDER = /\bif the marked character ends their turn inside a pit, you can drag them under\b[^.]*?\bany other pit in range (\d+)[^.]*\./i;
const DARK_IMMUNE = /\bmarked allies are immune to dangerous terrain\b/i;
const DARK_EXTRA = /\bmarked foes take \+(\d+) more damage from dangerous terrain\b/i;
const DARK_LEAVE = /\bthe first time the marked character vacates a space during their turn, they leave a dangerous terrain space behind them\b/i;

/** The marks on `actor`, each with its creator, the item that made it, its base text and its mastery (once unlocked). */
function terrainMarksOn(actor) {
  return marksOn(actor).map(mark => {
    const creator = game.actors?.get(mark.sourceActorId) ?? (mark.sourceActorUuid ? fromUuidSync(mark.sourceActorUuid) : null);
    const item = creator?.items?.get(mark.abilityKey);
    if (!item) return null;
    const s = item.system ?? {};
    const t = Number(s.talentSelected) || 0;
    return { mark, creator, item, base: plainOf(s.description), mastery: s.masteryUnlocked ? plainOf(s.mastery) : "",
      talent: t === 1 ? plainOf(s.talent1) : t === 2 ? plainOf(s.talent2) : "" };
  }).filter(Boolean);
}

// Deepwrath's talents (p.235): what the mark does while the marked character is inside a pit.
const DEEP_SAVE = /\bmarked allies gain \+?(\d+) boons? on saves in pits\b/i;
const DEEP_NO_HEIGHT = /\bfoes don't gain any height advantage against them while (?:they are )?inside pits\b/i;
const DEEP_BONUS = /\bmarked foes take bonus damage from all sources\b[^.]*?\bwhile inside pits\b/i;
const DEEP_SHATTER = /\bmarked foes\b[^.]*?\bare shat+er+ed\+ while inside pits\b/i;

/** Is the character of `td` on the ground in a pit space (p.89)? Same reading as the roll dialog's height. */
export function tokenInPit(td) {
  const scene = td?.parent;
  if (!scene || !td.actor || isMapObject(td) || (Number(td.elevation) || 0) > 0) return false;
  const pits = pitKeysOn(scene);
  return pits.size > 0 && cellsOf(td).some(c => pits.has(cellKey(c)));
}

/**
 * Deepwrath's talents (p.235) for the character of `td` while inside a pit (`inPit`, else read from the map):
 * Talent I "Marked allies gain +1 boon on saves in pits, and foes don't gain any height advantage against them while
 * inside pits"; Talent II "Marked foes take bonus damage from all sources and are shattered+ while inside pits".
 * Each field holds the name of the ability that grants it ("" = none).
 * @returns {{saveBoons: number, saveSource: string, noHeight: string, bonusDamage: string, shattered: string}}
 */
export function pitMarkEffects(td, { inPit = null } = {}) {
  const out = { saveBoons: 0, saveSource: "", noHeight: "", bonusDamage: "", shattered: "" };
  if (!td?.actor || !(inPit ?? tokenInPit(td))) return out;
  for (const { creator, item, talent } of terrainMarksOn(td.actor)) {
    if (!talent) continue;
    if (!isFoeOf(td, creator)) {
      const m = DEEP_SAVE.exec(talent);
      if (m && (Number(m[1]) || 1) > out.saveBoons) { out.saveBoons = Number(m[1]) || 1; out.saveSource = item.name; }
      if (DEEP_NO_HEIGHT.test(talent)) out.noHeight ||= item.name;
    } else {
      if (DEEP_BONUS.test(talent)) out.bonusDamage ||= item.name;
      if (DEEP_SHATTER.test(talent)) out.shattered ||= item.name;
    }
  }
  return out;
}

/**
 * Deepwrath Talent II (p.235) "are shattered+ while inside pits": the marked foe got into a pit (moved, or a pit made
 * under them) or out of it — a card with the button to give or take Shattered+; nothing changes without a click.
 */
async function offerPitShatter(td, was, now) {
  if (was === now || !td?.actor) return;
  const name = pitMarkEffects(td, { inPit: true }).shattered;
  if (!name) return;
  const { hasStatus } = await import("../combat/statuses.mjs");
  const has = hasStatus(td.actor, "shattered");
  if (now === has) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: td }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><p><strong><i class="fa-solid fa-circle-down"></i> ${esc(td.name)}</strong> ${now ? "is now inside a pit" : "is no longer inside a pit"}, marked by <strong>${esc(name)}</strong>.</p>
      <p><small>Talent II: marked foes take bonus damage from all sources and are shattered+ while inside pits (p.235).</small></p>
      <div>${now ? insideStatusButton(td, "shattered", { ongoing: true, label: `Shattered+ to ${td.name}` }) : insideStatusButton(td, "shattered", { op: "remove", label: "Remove Shattered" })}</div></div>`,
  });
}

/** Is `td` a foe of `creator`? The other side of the creator's token, else a hostile one. */
function isFoeOf(td, creator) {
  const own = creator ? sourceTokenFor(creator)?.document : null;
  return own ? isHostile(td) !== isHostile(own) : isHostile(td);
}

/** A card button handled by bindTerrainActs: `op` and its JSON arguments. */
function actButton(op, args, label, icon = "fa-location-dot", title = "") {
  return `<button type="button" class="icon-btn icon-btn--sm" data-action="terrainAct" data-op="${esc(op)}" data-args="${esc(JSON.stringify(args))}" title="${esc(title || label)}"><i class="fa-solid ${esc(icon)}"></i> ${esc(label)}</button>`;
}

/** The pit spaces on `scene`, as cell keys. */
const pitKeysOn = (scene) => new Set(terrainOn(scene).filter(x => x.f.pit).flatMap(x => [...x.keys]));

/** Put `td` on `cell` (its top-left), without animation; the GM or the token's owner only. */
async function placeTokenAt(td, cell) {
  if (!(td.isOwner || game.user.isGM)) { ui.notifications.warn(`Only the GM or the owner of ${td.name} can move them: ask the GM to click.`); return false; }
  const p = td.parent.grid.getTopLeftPoint(cell);
  await td.update({ x: p.x, y: p.y }, { animate: false });
  return true;
}

// DARKTIDE "the first time … during their turn": the turns already offered, on this client.
const _darkLeft = new Set();

/**
 * DARKTIDE (p.235): "The first time the marked character vacates a space during their turn, they leave a dangerous
 * terrain space behind them." Asked to the mover, on their own turn, once a turn per mark.
 */
async function offerDarktideLeave(td, before, after, dark) {
  const leave = dark.find(x => DARK_LEAVE.test(x.mastery));
  const combat = game.combat;
  if (!leave || !combat?.started || combat.combatant?.tokenId !== td.id) return;
  const key = `${turnKey()}#${td.id}#${leave.creator.id}#${leave.item.id}`;
  if (_darkLeft.has(key)) return;
  _darkLeft.add(key);
  const left = before.filter(c => !after.some(a => cellKey(a) === cellKey(c)));
  if (!left.length) return;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: `${leave.item.name} — DARKTIDE` },
    content: `<p><strong>${esc(td.name)}</strong> vacates a space for the first time this turn.</p><p><small>${esc(DARK_LEAVE.exec(leave.mastery)[0])}.</small></p><p>Leave a dangerous terrain space where they were?</p>`,
    yes: { label: "Leave it" }, no: { label: "Not now" }, rejectClose: false,
  }) ?? false;
  if (!ok) return;
  const spec = { kind: "dangerous", name: "", rules: DARK_LEAVE.exec(leave.mastery)[0] };
  const docs = await createTerrainSpaces(td.parent, [left[0]], spec, { actor: leave.creator, abilityName: leave.item.name, abilityKey: `${leave.item.id}:terrain`,
    group: groupOf(leave.creator, leave.item, spec), source: "DARKTIDE", itemId: leave.item.id });
  if (docs.length) await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: td }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-fire"></i> ${esc(leave.item.name)}</strong> <small>(DARKTIDE)</small>: ${esc(td.name)} leaves a dangerous terrain space behind them.<div>${removeSpacesButton(td.parent, docs)}</div></div>`,
  });
}

/**
 * End of `prev`'s turn (active GM, from IconCombat): Deepwrath's "If the marked character ends their turn inside a
 * pit, you can drag them under … placing them in the space of any other pit in range 3 from their original location"
 * (p.235) — a card with Drag under.
 * @param {Combatant} prev
 */
export async function terrainTurnEnd(prev) {
  const td = prev?.token;
  const scene = td?.parent ?? canvas?.scene;
  if (!scene) return;
  // Polaris (p.202): "you may gamble at the end of any turn after yours".
  await polarisTurnEnd(prev, scene);
  if (!td?.actor || isMapObject(td)) return;
  const lines = [];
  const pits = pitKeysOn(scene);
  const inPit = cellsOf(td).some(c => pits.has(cellKey(c)));
  for (const { creator, item, base } of terrainMarksOn(td.actor)) {
    const m = DRAG_UNDER.exec(base);
    if (!m || !inPit) continue;
    lines.push(`<p><strong>${esc(td.name)}</strong> ends their turn inside a pit, marked by <strong>${esc(item.name)}</strong> (${esc(creator.name)}).</p><p><small>${esc(m[0])}</small></p>
      <div>${actButton("dragUnder", { scene: scene.id, token: td.id, creator: creator.id, item: item.id, range: Number(m[1]) || 3 }, "Drag under", "fa-water", `Click another free pit in range ${m[1]} of ${td.name}; they are placed there`)}</div>`);
  }
  if (!lines.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: td }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-circle-down"></i> End of ${esc(td.name)}'s turn</strong>${lines.join("")}</div>`,
  });
}

// Eclipse (p.203): the brand checked at the start of the creator's slow turn; THE HELM keeps it after it goes off.
const ECLIPSE_CHECK = /\bat the start of that turn, check if there is a character standing in that space\b/i;
const ECLIPSE_KEEP = /\beffect does not expire after activating\b/i;
// Implode (p.211): "at the start of that turn, that space explodes with gravitational energy, shoving all characters in
// a large blast area effect around it as close as possible towards it … Any character in the center space when this
// ability activates must save or be stunned."
const IMPLODE_AT_START = /\bat the start of that turn, that space explodes\b/i;
// Polaris (p.202): "While you have at least one Polaris space active, you may gamble at the end of any turn after
// yours … A meteor lands in every space chosen by Polaris, exploding … 1: Small blast area effect, deals damage equal
// to the gamble result. 2: Medium Blast, deals +2 damage. 3: Large Blast, deals +2 damage, and characters in center
// spaces are stunned. Then, remove all spaces." "Each effect other than the blast size stacks": 3 spaces = +4.
const POLARIS_GAMBLE = /\bat least one [\w' -]+ space active, you may gamble at the end of any turn after yours\b/i;

/** The Polaris spaces of `item` on `scene` (the ones on a character too, R33d: they count and get a blast). */
const polarisSpaces = (scene, creator, item) => scene.templates.filter(t => {
  const f = terrainFlag(t);
  return f?.creatorId === creator.id && f.itemId === item.id && f.kind === "mark" && t.flags[NS].cells?.length;
});

/**
 * End of `prev`'s turn: for every Polaris-like ability with spaces on the scene, whose creator isn't `prev`, a card to
 * the creator's owners and the GM with Gamble (the meteors land only on that click).
 */
async function polarisTurnEnd(prev, scene) {
  const seen = new Set();
  for (const { doc, f } of terrainOn(scene)) {
    if (f.kind !== "mark" || seen.has(`${f.creatorId}#${f.itemId}`)) continue;
    seen.add(`${f.creatorId}#${f.itemId}`);
    if (f.creatorId === prev.actor?.id) continue;
    const src = itemOfSpace(doc);
    if (!src || !POLARIS_GAMBLE.test(src.base)) continue;
    const n = polarisSpaces(scene, src.creator, src.item).length;
    const whisper = game.users.filter(u => u.isGM || src.creator.testUserPermission(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: src.creator }), whisper,
      content: `<div class="icon-chat-card icon-chat-card--terrain"><p><strong><i class="fa-solid fa-meteor"></i> ${esc(src.item.name)}</strong>: end of ${esc(prev.name ?? prev.actor?.name ?? "")}'s turn — ${n} space${n === 1 ? "" : "s"} active; ${esc(src.creator.name)} may gamble.</p>
        <p><small>${n >= 3 ? "Large Blasts, +4 damage, characters in the center spaces stunned" : n === 2 ? "Medium Blasts, +2 damage" : "Small Blast, damage equal to the gamble result"}; then all the spaces are removed.</small></p>
        <div>${actButton("polarisGamble", { scene: scene.id, creator: src.creator.id, item: src.item.id }, "Gamble", "fa-dice", "Gamble, then a blast on every space; the spaces are removed")}</div></div>`,
    });
  }
}

/** The tokens (not objects) standing on any of `cells`. */
function charactersOn(scene, cells) {
  const keys = new Set(cells.map(cellKey));
  return scene.tokens.filter(t => t.actor && !isMapObject(t) && cellsOf(t).some(c => keys.has(cellKey(c))));
}

/** The creator's item of a space, and its texts in play. */
function itemOfSpace(doc) {
  const f = terrainFlag(doc);
  const creator = game.actors?.get(f?.creatorId);
  const item = creator?.items?.get(f?.itemId);
  if (!item) return null;
  const s = item.system ?? {};
  const talent = Number(s.talentSelected) || 0;
  return { creator, item, base: plainOf(s.description), talent: talent === 1 ? plainOf(s.talent1) : talent === 2 ? plainOf(s.talent2) : "", talentNo: talent, mastery: s.masteryUnlocked ? plainOf(s.mastery) : "" };
}

/**
 * Start of the creator's turn: the spaces of theirs that go off then, as card lines with their buttons.
 *   Eclipse (p.203): "At the start of that turn, check if there is a character standing in that space: If there is,
 *   that character takes 2 divine damage and is sealed. If there isn't, it explodes for a large blast area effect
 *   centered on that space … All characters in the area take 2 divine damage, and create a space of dangerous
 *   terrain under every foe in the area. Then, end the effect."
 */
function delayedSpacesAtStart(td, scene) {
  const lines = [];
  for (const { doc, f } of terrainOn(scene)) {
    // Only the named space (the brand), not the pits / dangerous spaces the same ability makes.
    if (f.creatorId !== td.actor.id || f.onCharacter || f.kind !== "mark") continue;
    const src = itemOfSpace(doc);
    if (src && IMPLODE_AT_START.test(src.base)) {
      // Implode (p.211): the space chosen goes off now. WAKING VOID's one on a character (onCharacter) has its own card.
      lines.push(`<p><strong>${esc(src.item.name)}</strong>: the space explodes with gravitational energy (large blast around it).</p>
        <div>${actButton("implode", { scene: scene.id, template: doc.id, creator: src.creator.id, item: src.item.id }, "Activate", "fa-circle-dot", "Place the Large Blast around the space and target who is inside")} ${removeSpacesButton(scene, [doc])}</div>`);
      continue;
    }
    if (!src || !ECLIPSE_CHECK.test(src.base)) continue;
    const { creator, item } = src;
    const cells = doc.flags[NS].cells;
    const on = charactersOn(scene, cells);
    const keep = ECLIPSE_KEEP.test(src.mastery) ? " THE HELM: the effect may stay instead (Remove when it ends)." : "";
    const args = { scene: scene.id, template: doc.id, creator: creator.id, item: item.id };
    lines.push(on.length
      ? `<p><strong>${esc(item.name)}</strong>: <strong>${esc(on.map(t => t.name).join(", "))}</strong> stands on the ${esc(f.label.toLowerCase())}: 2 divine damage and sealed.${esc(keep)}</p>
        <div>${actButton("eclipseHit", { ...args, tokens: on.map(t => t.id) }, "2 divine damage + sealed", "fa-sun")} ${removeSpacesButton(scene, [doc], "End the effect")}</div>`
      : `<p><strong>${esc(item.name)}</strong>: nobody stands on the ${esc(f.label.toLowerCase())}: it explodes, a large blast centred on it.${esc(keep)}</p>
        <div>${actButton("eclipseBlast", args, "Explode", "fa-burst", "Place the Large Blast centred on the brand and target who is inside")} ${removeSpacesButton(scene, [doc], "End the effect")}</div>`);
  }
  return lines;
}

/**
 * Implode (p.211) "shoving all characters in a large blast area effect around it as close as possible towards it":
 * where `td` ends up shoved in a straight line towards `centre` (p.107 "Characters must be shoved in straight
 * lines"), one space at a time while each space brings them closer and is free: another character, an object or a
 * wall stops them. Returns the new top-left cell, the spaces moved and what stopped them ("" when nothing did): p.117
 * "If they would move into another character's space, an object, or into a higher elevation space, they Collide and
 * stop moving".
 */
function shoveTowardsCell(td, centre) {
  const scene = td.parent;
  const dist = (cells) => Math.min(...cells.map(c => cheb(c, centre)));
  const start = cellsOf(td);
  const near = start.reduce((a, c) => cheb(c, centre) < cheb(a, centre) ? c : a, start[0]);
  const di = Math.sign(centre.i - near.i), dj = Math.sign(centre.j - near.j);
  const taken = new Map();
  for (const t of scene.tokens) if (t.id !== td.id) for (const c of cellsOf(t)) taken.set(cellKey(c), t);
  const w = Math.max(1, Math.round(td.width ?? 1)), h = Math.max(1, Math.round(td.height ?? 1));
  const foot = (tl) => { const out = []; for (let a = 0; a < h; a++) for (let b = 0; b < w; b++) out.push({ i: tl.i + a, j: tl.j + b }); return out; };
  const centreOf = (tl) => { const p = scene.grid.getTopLeftPoint(tl); return { x: p.x + w * scene.grid.size / 2, y: p.y + h * scene.grid.size / 2 }; };
  let tl = { i: start[0].i, j: start[0].j };
  let steps = 0;
  let blockedBy = "";
  while (di || dj) {
    const next = { i: tl.i + di, j: tl.j + dj };
    const cells = foot(next);
    if (dist(cells) >= dist(foot(tl))) break;
    const hit = cells.map(c => taken.get(cellKey(c))).find(Boolean);
    if (hit) { blockedBy = hit.actor && !isMapObject(hit) ? hit.name : "an object"; break; }
    let wall = false;
    try { wall = !!td.object?.checkCollision?.(centreOf(next), { origin: centreOf(tl), type: "move", mode: "any" }); } catch { wall = false; }
    if (wall) { blockedBy = "a wall"; break; }
    tl = next;
    steps++;
  }
  return { cell: tl, steps, blockedBy };
}

/**
 * Implode (p.211) "Characters are shoved in any order you like": one "Shove" button per character standing on `cells`
 * (the large blast), except `exclude` (who is in the center space), each towards `centre`. Also for WAKING VOID's
 * blast centred on a character (follow-marks.mjs).
 * @returns {string} the buttons' HTML, or ""
 */
export function implodeShoveButtons(scene, creator, item, cells, centre, exclude = []) {
  const skip = new Set(exclude.map(t => t.id));
  const base = { scene: scene.id, creator: creator.id, item: item.id };
  return charactersOn(scene, cells).filter(t => !skip.has(t.id)).map(t => actButton("implodeShove", { ...base, token: t.id, cell: { i: centre.i, j: centre.j } }, `Shove ${t.name}`, "fa-compress",
    `${t.name} shoved in a straight line as close as possible towards the centre (another character, an object or a wall stops them)`)).join(" ");
}

/**
 * A blast of `size` ("s" / "m" / "l") centred on each of `centres`, joined (each character once), placed for `creator`
 * with the usual area code (it targets who is inside). Resolves placeAreaTemplate's { template, cells, targets } or null.
 */
async function blastOn(creator, item, centres, size, where, suffix) {
  const { placeAreaTemplate, areaLabel } = await import("./area-templates.mjs");
  const area = { kind: "blast", size, centeredOn: "cells", centres: centres.map(c => ({ i: c.i, j: c.j })) };
  area.label = `${areaLabel({ kind: "blast", size })}${centres.length > 1 ? ` × ${centres.length}` : ""} (${where})`;
  return placeAreaTemplate({ actor: creator, area, abilityName: item.name, abilityKey: `${item.id}:${suffix}` });
}

// A mark that explodes when entered: Symphony's mote "detonates the mote, removing it and creating a small blast
// explosion as an area effect, centered on them" (p.178), Party Favor's "the mine explodes with a medium blast area
// effect [centered on it]. Gamble for effects … Then the mine is destroyed" (p.151).
const DETONATES = /\b(?:detonates the [\w-]+|the [\w-]+ explodes)\b[^.]*?\b(small|medium|large) blast\b[^.]*\./i;
const SIZE_KEY = { small: "s", medium: "m", large: "l" };
// Motes exploded this turn, per ability (Symphony Talent I "if at least one other mote was already exploded this turn").
const _detonated = new Map();

/**
 * "Detonate" for a mark that explodes when `td` enters it or starts their turn there, or "". `crossed`: the space was
 * only passed through on the way — "centered on them" (Symphony p.178) is then where they were when they entered it,
 * the mark's own space, not where the move ended.
 */
function detonateButton(scene, doc, f, td, crossed = false) {
  const m = DETONATES.exec(f.onEnter ?? "");
  if (!m || f.onCharacter) return "";
  const onThem = /\bcentered on them\b/i.test(m[0]);
  return actButton("detonateSpace", { scene: scene.id, template: doc.id, token: td.id, creator: f.creatorId, item: f.itemId,
    size: SIZE_KEY[m[1].toLowerCase()], onThem, crossed: !!crossed, gamble: /\bgamble\b/i.test(f.onEnter) },
  "Detonate", "fa-bomb", `${onThem ? `${m[1]} blast centred on ${td.name}${crossed ? " as they passed through it (on its space)" : ""}` : `${m[1]} blast centred on the space`}${/\bgamble\b/i.test(f.onEnter) ? ", after the gamble" : ""}; the space is removed`);
}

// Gates of Hell's mastery (p.129): "Flash Step — Free Action: Remove an afterimage that has no characters occupying it,
// then remove yourself and place yourself in its space."
const FLASH_STEP = /\bremove an afterimage that has no characters occupying it, then remove yourself and place yourself in its space\b/i;

/** " Flash Step" on the card of the afterimages just marked, when the ability's text in play has it; else "". */
function flashStepButton(scene, actor, item, sp) {
  const s = item.system ?? {};
  const texts = [s.description, s.masteryUnlocked ? s.mastery : ""].map(plainOf).join(" ");
  if (!/afterimage/i.test(sp.name ?? "") || !FLASH_STEP.test(texts)) return "";
  return ` ${actButton("flashStep", { scene: scene.id, creator: actor.id, item: item.id }, "Flash Step", "fa-person-running", "Free action: click a free afterimage of yours; it is removed and you are placed there")}`;
}

// Elden Rune (p.209): "The rune lasts until the end of the scene."
const UNTIL_SCENE_END = /\blasts until the end of the scene\b/i;

/**
 * A space whose ability says it "lasts until the end of the scene" (Elden Rune, its Arkenrune and GREAT RUNE, p.209).
 * End Encounter keeps these (IconCombat) and the GM card below offers to remove them; every other terrain effect ends
 * with the combat ("When you go out of combat … anything created, such as terrain effects … end and disappear", p.86).
 */
export function lastsUntilSceneEnd(doc) {
  const f = terrainFlag(doc);
  return !!f && !!doc.flags?.[NS]?.cells?.length && !f.onCharacter && UNTIL_SCENE_END.test(itemOfSpace(doc)?.base ?? "");
}

/** Active GM, a combat deleted: a card offering to remove the spaces that last until the end of the scene. */
async function spacesAtSceneEnd(combat) {
  const scene = combat?.scene ?? game.scenes?.get(combat?._source?.scene) ?? canvas?.scene;
  if (!scene) return;
  const docs = scene.templates.filter(lastsUntilSceneEnd);
  if (!docs.length) return;
  const names = [...new Set(docs.map(d => d.flags[NS].abilityName).filter(Boolean))];
  await ChatMessage.create({
    whisper: game.users.filter(u => u.isGM).map(u => u.id),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-flag-checkered"></i> End of the scene?</strong> ${docs.length} space${docs.length > 1 ? "s" : ""} of ${esc(names.join(", "))} last until the end of the scene.
      <div>${removeSpacesButton(scene, docs, docs.length > 1 ? "Remove all" : "Remove")}</div></div>`,
  });
}

/** Remove a space after its effect went off, unless a mastery keeps it (`keep`). */
async function endSpace(doc, keep) {
  if (keep || !doc?.parent?.templates?.get(doc.id)) return;
  try { await deleteSpaces(doc.parent, [doc]); } catch (err) { console.warn("[ICON | TerrainSpaces] could not remove the space", err); }
}

/** The card buttons' work. Each returns true when done (the button is then greyed out). */
const TERRAIN_ACTS = {
  /** Eclipse: whoever stands on the brand takes 2 divine damage and is sealed; then the effect ends. */
  async eclipseHit({ scene: sid, template, tokens, creator: cid, item: iid }) {
    const scene = game.scenes?.get(sid);
    const creator = game.actors?.get(cid);
    const item = creator?.items?.get(iid);
    const tds = (tokens ?? []).map(id => scene?.tokens?.get(id)).filter(t => t?.actor);
    if (!tds.length || !item) { ui.notifications.warn("That character or ability is gone."); return true; }
    const { applyDamageToActor } = await import("../combat/damage.mjs");
    const { grantStatus } = await import("../combat/inflict-status.mjs");
    for (const t of tds) {
      await applyDamageToActor(t.actor, 2, { chatConfirm: true });
      await grantStatus({ target: t.actor, source: creator, statusId: "sealed", label: "Sealed", abilityName: item.name });
    }
    const doc = scene.templates.get(template);
    await endSpace(doc, ECLIPSE_KEEP.test(itemOfSpace(doc ?? {})?.mastery ?? ""));
    return true;
  },
  /** Eclipse: nobody on the brand — the Large Blast on it, then a card with what the explosion does. */
  async eclipseBlast({ scene: sid, template }) {
    const scene = game.scenes?.get(sid);
    const doc = scene?.templates?.get(template);
    const src = doc ? itemOfSpace(doc) : null;
    if (!src) { ui.notifications.warn("The brand is gone."); return true; }
    if (scene !== canvas?.scene) { ui.notifications.warn("Open the scene of the brand first."); return false; }
    const { creator, item } = src;
    if (!creator.isOwner) { ui.notifications.warn(`Only the owner of ${creator.name} can place the blast.`); return false; }
    const centre = doc.flags[NS].cells[0];
    const placed = await blastOn(creator, item, [centre], "l", "on the brand", "explode");
    if (!placed) return false;
    const inArea = charactersOn(scene, placed.cells);
    const foes = inArea.filter(t => isFoeOf(t, creator));
    const ids = (list) => list.map(t => t.id);
    const base = { scene: scene.id, creator: creator.id, item: item.id };
    const buttons = [
      inArea.length ? actButton("damageTokens", { ...base, tokens: ids(inArea), amount: 2 }, `2 divine damage to all (${inArea.length})`, "fa-sun") : "",
      foes.length ? actButton("terrainUnderTokens", { ...base, tokens: ids(foes), kind: "dangerous" }, `Dangerous under foes (${foes.length})`, "fa-fire") : "",
      src.talentNo === 1 && /\bcreate a fiery pit in its center space\b/i.test(src.talent)
        ? actButton("pitAt", { ...base, cell: centre, dangerous: true, sealAdjacent: /\badjacent to the pit are sealed\b/i.test(src.talent), label: "Fiery pit" }, "Talent I: fiery pit", "fa-circle-down") : "",
    ].filter(Boolean).join(" ");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-burst"></i> ${esc(item.name)}</strong> explodes: ${inArea.length ? esc(inArea.map(t => t.name).join(", ")) : "no one"} in the area.
        <p><small>All characters in the area take 2 divine damage, and create a space of dangerous terrain under every foe in the area.${src.talentNo === 2 ? ` Talent II: ${esc(src.talent)}` : ""}</small></p>
        ${buttons ? `<div>${buttons}</div>` : ""}</div>`,
    });
    await endSpace(doc, ECLIPSE_KEEP.test(src.mastery));
    return true;
  },
  /** Damage to the listed characters, each one once (armor only with `armor`: not for divine / piercing). */
  async damageTokens({ scene: sid, tokens, amount, armor = false }) {
    const scene = game.scenes?.get(sid);
    const tds = (tokens ?? []).map(id => scene?.tokens?.get(id)).filter(t => t?.actor);
    if (!tds.length) { ui.notifications.warn("Those characters are gone."); return true; }
    const { applyDamageToActor } = await import("../combat/damage.mjs");
    for (const t of tds) await applyDamageToActor(t.actor, Number(amount) || 0, { chatConfirm: true, applyArmor: !!armor });
    return true;
  },
  /** Polaris: gamble, then a blast on every space (size by how many), the spaces removed, a card with the rest. */
  async polarisGamble({ scene: sid, creator: cid, item: iid }) {
    const scene = game.scenes?.get(sid);
    const creator = game.actors?.get(cid);
    const item = creator?.items?.get(iid);
    if (!scene || !item) { ui.notifications.warn("That ability is gone."); return true; }
    if (scene !== canvas?.scene) { ui.notifications.warn("Open the scene of those spaces first."); return false; }
    if (!creator.isOwner) { ui.notifications.warn(`Only the owner of ${creator.name} can gamble.`); return false; }
    const spaces = polarisSpaces(scene, creator, item);
    if (!spaces.length) { ui.notifications.info(`No ${item.name} space left on this scene.`); return true; }
    const n = spaces.length;
    const { rollGamble } = await import("../combat/gamble.mjs");
    const result = await rollGamble(creator, item);
    if (result == null) return false;
    const centres = spaces.map(t => t.flags[NS].cells[0]);
    const size = n >= 3 ? "l" : n === 2 ? "m" : "s";
    const placed = await blastOn(creator, item, centres, size, `on the ${item.name} spaces`, "meteor");
    if (!placed) return false;
    try { await deleteSpaces(scene, spaces); } catch (err) { console.warn("[ICON | TerrainSpaces] could not remove the spaces", err); }
    // The one on a character (Talent I) was made by the GM: ending its mark takes it away (follow-marks.mjs).
    for (const t of spaces.filter(t => terrainFlag(t).onCharacter && scene.templates.get(t.id))) {
      const holder = scene.tokens.get(t.flags[NS].followTokenId)?.actor;
      const eff = marksOn(holder).find(m => m.sourceActorId === creator.id && m.abilityKey === item.id);
      if (eff) { try { await removeMark(eff.uuid); } catch (err) { console.warn("[ICON | TerrainSpaces] could not end the mark", err); } }
    }
    const damage = result + (n >= 2 ? 2 : 0) + (n >= 3 ? 2 : 0);
    const inArea = charactersOn(scene, placed.cells);
    const onCentre = charactersOn(scene, centres);
    const base = { scene: scene.id, creator: creator.id, item: item.id };
    const src = itemOfSpace({ flags: { [NS]: { [FLAG]: { creatorId: creator.id, itemId: item.id } } } });
    const t2 = src?.talentNo === 2 && /\bcreate a space of difficult terrain under the center space of each\b/i.test(src.talent);
    const buttons = [
      inArea.length ? actButton("damageTokens", { ...base, tokens: inArea.map(t => t.id), amount: damage, armor: true }, `${damage} damage to all (${inArea.length})`, "fa-meteor") : "",
      n >= 3 && onCentre.length ? actButton("statusTokens", { ...base, tokens: onCentre.map(t => t.id), status: "stunned", label: "Stunned" }, `Stun the centres (${onCentre.length})`, "fa-star") : "",
      t2 ? actButton("terrainAtCells", { ...base, cells: centres, kind: "difficult" }, "Talent II: difficult under the centres", "fa-shoe-prints") : "",
      t2 && result >= 4 ? actButton("terrainAtCells", { ...base, cells: centres, kind: "pit" }, "Talent II: pits instead", "fa-circle-down") : "",
    ].filter(Boolean).join(" ");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-meteor"></i> ${esc(item.name)}</strong>: ${n} meteor${n > 1 ? "s" : ""} (gamble ${result}) — ${esc(placed.area?.label ?? "")}, <strong>${damage} damage</strong> to ${inArea.length ? esc(inArea.map(t => t.name).join(", ")) : "no one"}${n >= 3 ? "; characters in the center spaces are stunned" : ""}. All the spaces are removed.
        ${t2 ? `<p><small>Talent II: ${esc(src.talent)}${result >= 4 ? " (a height 1 meteor object: from the object chip)" : ""}</small></p>` : ""}${buttons ? `<div>${buttons}</div>` : ""}</div>`,
    });
    return true;
  },
  /** Implode: the Large Blast around the space, the space removed, a card for the shove, the save and the talents. */
  async implode({ scene: sid, template, creator: cid, item: iid }) {
    const scene = game.scenes?.get(sid);
    const doc = scene?.templates?.get(template);
    const creator = game.actors?.get(cid);
    const item = creator?.items?.get(iid);
    if (!doc || !item) { ui.notifications.warn("Already activated, or the ability is gone."); return true; }
    if (scene !== canvas?.scene) { ui.notifications.warn("Open the scene of that space first."); return false; }
    if (!creator.isOwner) { ui.notifications.warn(`Only the owner of ${creator.name} can place the blast.`); return false; }
    const centre = doc.flags[NS].cells[0];
    const placed = await blastOn(creator, item, [centre], "l", "around the space", "implode");
    if (!placed) return false;
    await deleteSpaces(scene, [doc]);
    const src = itemOfSpace({ flags: { [NS]: { [FLAG]: { creatorId: creator.id, itemId: item.id } } } });
    const onCentre = charactersOn(scene, [centre]);
    const base = { scene: scene.id, creator: creator.id, item: item.id };
    const t1 = src?.talentNo === 1 && /\bcenter space is also shattered\b/i.test(src.talent);
    const t2 = src?.talentNo === 2 && /\bcenter space also becomes a pit\b/i.test(src.talent);
    // "Characters are shoved in any order you like": one button per character in the area, clicked in that order.
    const shoves = implodeShoveButtons(scene, creator, item, placed.cells, centre, onCentre);
    const buttons = [
      onCentre.length ? actButton("statusTokens", { ...base, tokens: onCentre.map(t => t.id), status: "stunned", label: "Stunned" }, `Failed save: stun ${onCentre.map(t => t.name).join(", ")}`, "fa-star") : "",
      t1 && onCentre.length ? actButton("statusTokens", { ...base, tokens: onCentre.map(t => t.id), status: "shattered", label: "Shattered" }, "Talent I: shatter the centre", "fa-heart-crack") : "",
      t2 ? actButton("pitAt", { ...base, cell: centre }, "Talent II: the centre becomes a pit", "fa-circle-down") : "",
    ].filter(Boolean).join(" ");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-circle-dot"></i> ${esc(item.name)}</strong> activates: shove every character in the area as close as possible towards the centre, in any order you like${shoves ? " (one button each, in the order you choose)" : ""}.
        ${shoves ? `<div>${shoves}</div>` : ""}${onCentre.length ? `<p><small>${esc(onCentre.map(t => t.name).join(", "))} in the center space: save or be stunned.</small></p>` : ""}${buttons ? `<div>${buttons}</div>` : ""}</div>`,
    });
    return true;
  },
  /** Implode: one character shoved as close as possible towards the centre (shoveTowardsCell). */
  async implodeShove({ scene: sid, token, cell, item: iid, creator: cid }) {
    const scene = game.scenes?.get(sid);
    const td = scene?.tokens?.get(token);
    if (!td || !cell) { ui.notifications.warn("That character is gone."); return true; }
    if (scene !== canvas?.scene) { ui.notifications.warn("Open the scene of that character first."); return false; }
    const { cell: to, steps, blockedBy } = shoveTowardsCell(td, cell);
    const item = game.actors?.get(cid)?.items?.get(iid);
    const name = item?.name ?? "Implode";
    if (!steps && !blockedBy) { ui.notifications.info(`${td.name} can't get any closer to the centre of ${name}.`); return true; }
    if (steps && !(await placeTokenAt(td, to))) return false;
    // p.117: shoved into another character, an object (or higher ground) "they Collide and stop moving"; the
    // ability's own Collide effect, if any, triggers on them once (p.94).
    const collide = plainOf(item?.system?.collideEffect);
    const collision = blockedBy ? `<p><small><strong>${esc(td.name)}</strong> collides with ${esc(blockedBy)} and stops (p.117).${collide ? ` Collide: ${esc(collide)}` : ""}</small></p>` : "";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: td }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-compress"></i> ${esc(name)}</strong>: ${esc(td.name)} is shoved ${steps} space${steps === 1 ? "" : "s"} towards the centre.${collision}</div>`,
    });
    return true;
  },
  /** One space of `kind` on each of `cells` (Polaris Talent II). */
  async terrainAtCells({ scene: sid, cells, creator: cid, item: iid, kind = "difficult" }) {
    const scene = game.scenes?.get(sid);
    const creator = game.actors?.get(cid);
    const item = creator?.items?.get(iid);
    if (!scene || !item || !cells?.length) { ui.notifications.warn("That ability is gone."); return true; }
    const spec = { kind, name: "" };
    const docs = await createTerrainSpaces(scene, cells, spec, { actor: creator, abilityName: item.name, abilityKey: `${item.id}:terrain`,
      group: groupOf(creator, item, spec), itemId: item.id });
    if (!docs.length) return false;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid ${ICONS[kind] ?? ICONS.mark}"></i> ${esc(item.name)}</strong>: ${docs.length} × <strong>${esc(terrainLabel(spec))}</strong>.<div>${removeSpacesButton(scene, docs, docs.length > 1 ? "Remove all" : "Remove")}</div></div>`,
    });
    return true;
  },
  /** Flash Step: a free afterimage of the user's removed, the user's token placed in its space. */
  async flashStep({ scene: sid, creator: cid, item: iid }) {
    const scene = game.scenes?.get(sid);
    const creator = game.actors?.get(cid);
    const item = creator?.items?.get(iid);
    if (!scene || !item) { ui.notifications.warn("That ability is gone."); return false; }
    if (scene !== canvas?.scene) { ui.notifications.warn("Open the scene of the afterimages first."); return false; }
    const tok = sourceTokenFor(creator);
    if (!tok) { ui.notifications.warn(`${creator.name} has no token on this scene.`); return false; }
    const free = terrainOn(scene).filter(x => x.f.creatorId === creator.id && x.f.itemId === item.id && /afterimage/i.test(x.f.name ?? "")
      && !charactersOn(scene, x.doc.flags[NS].cells).length);
    if (!free.length) { ui.notifications.info(`${item.name}: no afterimage of yours with nobody on it.`); return false; }
    const cells = await pickSpaces({ max: 1, color: TERRAIN_COLORS.mark, hint: `${item.name} — Flash Step: a free afterimage.`,
      check: (c) => free.some(x => x.keys.has(cellKey(c))) ? "" : "Pick one of your afterimages with nobody on it." });
    if (!cells) return false;
    const x = free.find(y => y.keys.has(cellKey(cells[0])));
    await deleteSpaces(scene, [x.doc]);
    if (!(await placeTokenAt(tok.document, cells[0]))) return false;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-person-running"></i> ${esc(item.name)}</strong> — Flash Step: ${esc(creator.name)} takes the place of an afterimage (free action).</div>`,
    });
    return false;   // the button stays: Flash Step can be used again on another afterimage
  },
  /** A status for the listed characters (relayed to the GM when needed). */
  async statusTokens({ scene: sid, tokens, creator: cid, item: iid, status, label }) {
    const scene = game.scenes?.get(sid);
    const creator = game.actors?.get(cid);
    const tds = (tokens ?? []).map(id => scene?.tokens?.get(id)).filter(t => t?.actor);
    if (!tds.length) { ui.notifications.warn("Those characters are gone."); return true; }
    const { grantStatus } = await import("../combat/inflict-status.mjs");
    for (const t of tds) await grantStatus({ target: t.actor, source: creator, statusId: status, label: label || status, abilityName: creator?.items?.get(iid)?.name ?? "" });
    return true;
  },
  /**
   * A mote / mine set off (detonateButton): the gamble first when the text has one, the blast on the character or
   * on the space, the space removed, then a card with the buttons for what the explosion does.
   */
  async detonateSpace({ scene: sid, template, token, creator: cid, item: iid, size = "m", onThem = false, crossed = false, gamble = false }) {
    const scene = game.scenes?.get(sid);
    const doc = scene?.templates?.get(template);
    const td = scene?.tokens?.get(token);
    const creator = game.actors?.get(cid);
    const item = creator?.items?.get(iid);
    if (!doc || !item) { ui.notifications.warn("Already set off, or the ability is gone."); return true; }
    if (scene !== canvas?.scene) { ui.notifications.warn("Open the scene of that space first."); return false; }
    if (!creator.isOwner) { ui.notifications.warn(`Only the owner of ${creator.name} can place the blast.`); return false; }
    const f = terrainFlag(doc);
    let result = null;
    if (gamble) {
      const { rollGamble } = await import("../combat/gamble.mjs");
      result = await rollGamble(creator, item);
      if (result == null) return false;   // the gamble dialog was closed
    }
    // Passed through on the way (detonateButton): "centered on them" is where they were then, the space itself.
    const passed = !!(onThem && td && crossed);
    const centre = onThem && td && !crossed ? cellsOf(td)[0] : doc.flags[NS].cells[0];
    const placed = await blastOn(creator, item, [centre], size, passed ? `on ${td.name} as they passed the ${String(f.label).toLowerCase()}` : onThem && td ? `on ${td.name}` : `on the ${String(f.label).toLowerCase()}`, "detonate");
    if (!placed) return false;
    await deleteSpaces(scene, [doc]);
    // Symphony: what the explosion does (p.178).
    const text = f.onEnter ?? "";
    const inArea = charactersOn(scene, placed.cells);
    const foes = inArea.filter(t => isFoeOf(t, creator));
    const base = { scene: scene.id, creator: creator.id, item: item.id };
    const fray = Number(creator.system?.combat?.fray) || 0;
    const buttons = [];
    const notes = [];
    if (/\bfoes inside take fray damage\b/i.test(text) && foes.length)
      buttons.push(actButton("damageTokens", { ...base, tokens: foes.map(t => t.id), amount: fray, armor: true }, `Fray (${fray}) to foes (${foes.length})`, "fa-burst"));
    if (/\ballies inside gain 2 vigor\b/i.test(text)) notes.push("Allies inside gain 2 vigor.");
    if (td && /\bif that character was a foe, they also have a pit created under them\b/i.test(text) && isFoeOf(td, creator))
      buttons.push(actButton("pitAt", { ...base, cell: passed ? centre : cellsOf(td)[0] }, passed ? `Pit where ${td.name} passed` : `Pit under ${td.name}`, "fa-circle-down"));
    if (td && /\bif the character was yourself or an ally, they are blessed\b/i.test(text) && !isFoeOf(td, creator))
      buttons.push(actButton("statusTokens", { ...base, tokens: [td.id], status: "blessed", label: "Blessed" }, `Bless ${td.name}`, "fa-hands-praying"));
    if (/\bcan fly 1\b/i.test(text) && td && !isFoeOf(td, creator)) notes.push(`${td.name} can fly 1.`);
    // Talent I / II: count the motes of this ability set off this turn (on this client).
    const k = `${turnKey()}#${item.id}`;
    const n = (_detonated.get(k) ?? 0) + 1;
    _detonated.set(k, n);
    const src = itemOfSpace({ flags: { [NS]: { [FLAG]: { creatorId: creator.id, itemId: item.id } } } });
    if (src?.talentNo && /\bmotes? (?:explode|was already exploded)|\bsecond mote\b/i.test(src.talent))
      notes.push(`${n === 1 ? "First" : `Number ${n}`} of this ability's motes set off this turn. Talent ${src.talentNo === 1 ? "I" : "II"}: ${src.talent}`);
    if (passed) notes.push(`Centred on its space: ${td.name} passed through it and moved on ("centered on them", p.178).`);
    if (!buttons.length && !notes.length) return true;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-bomb"></i> ${esc(item.name)}</strong>: the ${esc(String(f.label).toLowerCase())} explodes${result != null ? ` (gamble ${result})` : ""} — ${inArea.length ? esc(inArea.map(t => t.name).join(", ")) : "no one"} in the area.
        ${notes.map(x => `<p><small>${esc(x)}</small></p>`).join("")}${buttons.length ? `<div>${buttons.join(" ")}</div>` : ""}</div>`,
    });
    return true;
  },
  /** A space of terrain under each listed character (one space each, where they stand now). */
  async terrainUnderTokens({ scene: sid, tokens, creator: cid, item: iid, kind = "dangerous" }) {
    const scene = game.scenes?.get(sid);
    const creator = game.actors?.get(cid);
    const item = creator?.items?.get(iid);
    const tds = (tokens ?? []).map(id => scene?.tokens?.get(id)).filter(Boolean);
    if (!tds.length || !item) { ui.notifications.warn("Those characters or the ability are gone."); return true; }
    const spec = { kind, name: "" };
    const docs = await createTerrainSpaces(scene, tds.map(t => cellsOf(t)[0]), spec, { actor: creator, abilityName: item.name,
      abilityKey: `${item.id}:terrain`, group: groupOf(creator, item, spec), itemId: item.id });
    if (!docs.length) return false;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid ${ICONS[kind] ?? ICONS.mark}"></i> ${esc(item.name)}</strong>: ${docs.length} × <strong>${esc(terrainLabel(spec))}</strong> under ${esc(tds.map(t => t.name).join(", "))}.<div>${removeSpacesButton(scene, docs, docs.length > 1 ? "Remove all" : "Remove")}</div></div>`,
    });
    return true;
  },
  /** A pit on a given space (Eclipse Talent I: dangerous, characters adjacent sealed). */
  async pitAt({ scene: sid, cell, creator: cid, item: iid, dangerous = false, sealAdjacent = false, label = "" }) {
    const scene = game.scenes?.get(sid);
    const creator = game.actors?.get(cid);
    const item = creator?.items?.get(iid);
    if (!scene || !item || !cell) { ui.notifications.warn("That ability is gone."); return true; }
    const spec = { kind: "pit", name: "", dangerous: !!dangerous, label: label || (dangerous ? "Dangerous pit" : "Pit") };
    const docs = await createTerrainSpaces(scene, [cell], spec, { actor: creator, abilityName: item.name, abilityKey: `${item.id}:terrain`,
      group: groupOf(creator, item, spec), itemId: item.id });
    if (!docs.length) return false;
    const near = sealAdjacent ? scene.tokens.filter(t => t.actor && !isMapObject(t) && cellsOf(t).some(c => cheb(c, cell) === 1)) : [];
    if (near.length) {
      const { grantStatus } = await import("../combat/inflict-status.mjs");
      for (const t of near) await grantStatus({ target: t.actor, source: creator, statusId: "sealed", label: "Sealed", abilityName: item.name });
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-circle-down"></i> ${esc(item.name)}</strong>: a <strong>${esc(spec.label.toLowerCase())}</strong>${dangerous ? " (also dangerous terrain)" : ""}${near.length ? `; sealed: ${esc(near.map(t => t.name).join(", "))}` : ""}.<div>${removeSpacesButton(scene, docs)}</div></div>`,
    });
    return true;
  },
  /** RECYCLE (Dark Sliver's mastery, p.187): the mote of life without its blessing becomes a terrain effect. */
  async moteTerrain({ scene: sid, token }) {
    const scene = game.scenes?.get(sid);
    const td = scene?.tokens?.get(token);
    if (!td) { ui.notifications.warn("That mote of life is gone."); return true; }
    if (!(td.isOwner || game.user.isGM)) { ui.notifications.warn("Only the owner of the mote or the GM can do that."); return false; }
    const summoner = game.actors?.get(td.actor?.system?.summonerActorId ?? "") ?? null;
    const rule = "A mote of life is a plant, but becomes a terrain effect when its blessing is removed. Inside, any ally gains regeneration while standing in its space.";
    const spec = { kind: "mark", name: "Mote of life", label: "Mote of life", rules: rule };
    const docs = await createTerrainSpaces(scene, cellsOf(td), spec, { actor: summoner, abilityName: "Mote of life", asOne: true,
      extra: { inside: [{ when: "inside", status: "regeneration", ongoing: false, who: "allies", source: "RECYCLE", rule }] } });
    if (!docs.length) return false;
    try { await td.delete(); } catch (err) { console.warn("[ICON | TerrainSpaces] could not remove the mote token", err); }
    await ChatMessage.create({
      speaker: summoner ? ChatMessage.getSpeaker({ actor: summoner }) : ChatMessage.getSpeaker(),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-seedling"></i> Mote of life</strong> becomes a terrain effect: allies standing in its space gain regeneration (RECYCLE, p.187).<div>${removeSpacesButton(scene, docs)}</div></div>`,
    });
    return true;
  },
  /** Deepwrath: a pit under the marked character, where they stand now. */
  async pitUnder({ scene: sid, token, creator: cid, item: iid, label }) {
    const scene = game.scenes?.get(sid);
    const td = scene?.tokens?.get(token);
    const creator = game.actors?.get(cid);
    const item = creator?.items?.get(iid);
    if (!td || !item) { ui.notifications.warn("That character or ability is gone."); return true; }
    const spec = { kind: "pit", name: "", label: label || "Pit", rules: PIT_AT_START.exec(plainOf(item.system.description))?.[0] ?? "" };
    const docs = await createTerrainSpaces(scene, cellsOf(td), spec, { actor: creator, abilityName: item.name, abilityKey: `${item.id}:terrain`,
      group: groupOf(creator, item, spec), itemId: item.id, asOne: true });
    if (!docs.length) return false;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-circle-down"></i> ${esc(item.name)}</strong>: a <strong>${esc(spec.label.toLowerCase())}</strong> under ${esc(td.name)} (one level lower than its base space, p.89).<div>${removeSpacesButton(scene, docs)}</div></div>`,
    });
    return true;
  },
  /** Deepwrath: from the pit they are in to another free pit in range. */
  async dragUnder({ scene: sid, token, item: iid, creator: cid, range }) {
    const scene = game.scenes?.get(sid);
    const td = scene?.tokens?.get(token);
    if (!td) { ui.notifications.warn("That character is gone."); return true; }
    if (scene !== canvas?.scene) { ui.notifications.warn("Open the scene of that character first."); return false; }
    if (!(td.isOwner || game.user.isGM)) { ui.notifications.warn(`Only the GM or the owner of ${td.name} can move them: ask the GM to click.`); return false; }
    const r = Number(range) || 3;
    const from = cellsOf(td);
    const fromKeys = new Set(from.map(cellKey));
    const pits = pitKeysOn(scene);
    const taken = new Set();
    for (const t of scene.tokens) if (t.id !== td.id) for (const c of cellsOf(t)) taken.add(cellKey(c));
    const check = (c) => {
      const k = cellKey(c);
      if (!pits.has(k)) return "Pick a pit space.";
      if (fromKeys.has(k)) return "Pick another pit, not the one they are in.";
      if (taken.has(k)) return "That pit isn't free.";
      return from.some(o => cheb(o, c) <= r) ? "" : `That pit is beyond range ${r} of where they are.`;
    };
    const name = game.actors?.get(cid)?.items?.get(iid)?.name ?? "Deepwrath";
    const cells = await pickSpaces({ max: 1, color: TERRAIN_COLORS.pit, check, hint: `${name}: drag ${td.name} under — another pit in range ${r}.` });
    if (!cells) return false;
    if (!(await placeTokenAt(td, cells[0]))) return false;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: td }),
      content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-water"></i> ${esc(name)}</strong>: ${esc(td.name)} is dragged under and comes up in another pit.</div>`,
    });
    return true;
  },
};

/** Bind the terrainAct buttons of a chat card (GM or the creator's owner). */
function bindTerrainActs(html) {
  for (const btn of html.querySelectorAll('[data-action="terrainAct"]')) {
    if (btn.dataset.iconBound) continue;
    btn.dataset.iconBound = "true";
    let args = {};
    try { args = JSON.parse(btn.dataset.args || "{}"); } catch { /* malformed: nothing to do */ }
    const off = (why) => { btn.disabled = true; btn.title = why; btn.style.opacity = "0.5"; };
    const creator = args.creator ? game.actors?.get(args.creator) : null;
    if (!game.user.isGM && !creator?.isOwner) { off("Only the GM or the owner of the one who made it"); continue; }
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      const act = TERRAIN_ACTS[btn.dataset.op];
      if (!act || btn.disabled) return;
      btn.disabled = true;
      let done = false;
      try { done = await act(args, btn); } catch (err) { console.warn(`[ICON | TerrainSpaces] ${btn.dataset.op} failed`, err); }
      if (done) off("Done"); else btn.disabled = false;
    });
  }
}

export function registerTerrainSpaceHooks() {
  Hooks.on("renderChatMessageHTML", (_message, html) => bindTerrainActs(html));
  // The end of the combat stands for the end of the scene: the Elden Rune's "lasts until the end of the scene".
  Hooks.on("deleteCombat", (combat) => {
    if (game.users.activeGM?.id !== game.user.id) return;
    spacesAtSceneEnd(combat).catch(err => console.warn("[ICON | TerrainSpaces] end of scene reminder failed", err));
  });
  // A character moved by this user: dangerous terrain and named marks (area-templates.mjs' preUpdateToken leaves
  // the old position in options.iconPrevPos). Objects (R33a) don't set anything off.
  Hooks.on("updateToken", (tokenDoc, changed, options, userId) => {
    if (userId !== game.user.id || !options?.iconPrevPos) return;
    if (!("x" in changed || "y" in changed) || isMapObject(tokenDoc)) return;
    // A marked character may set off DARKTIDE (R33b2) with no terrain on the scene yet; plants are tokens (harvester.mjs).
    if (!tokenDoc.parent?.templates?.some(t => terrainFlag(t)) && !marksOn(tokenDoc.actor).length
        && !tokenDoc.parent?.tokens?.some(t => isPlantDoc(t))) return;
    const to = { x: changed.x ?? tokenDoc.x, y: changed.y ?? tokenDoc.y };
    offerTerrainOnMove(tokenDoc, options.iconPrevPos, to, options._movement?.[tokenDoc.id] ?? null, { carriedBy: options.iconDragArea ?? "" }).catch(err => console.warn("[ICON | TerrainSpaces] movement check failed", err));
  });
  // RECYCLE (Dark Sliver's mastery, p.187): "A mote of life is a plant, but becomes a terrain effect when its blessing
  // is removed": its Blessed status gone, a card with the button that turns its space into that terrain effect.
  Hooks.on("deleteActiveEffect", (effect) => {
    if (game.users.activeGM?.id !== game.user.id || !effect?.statuses?.has?.("blessed")) return;
    const actor = effect.parent;
    if (!(actor instanceof Actor)) return;
    const tds = (actor.isToken ? [actor.token] : actor.getActiveTokens(false, true)).filter(Boolean);
    for (const td of tds) {
      if (![td.name, actor.name].some(n => /^mote of life$/i.test(String(n ?? "").trim())) || !td.parent) continue;
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ token: td }),
        content: `<div class="icon-chat-card icon-chat-card--terrain"><p><strong><i class="fa-solid fa-seedling"></i> ${esc(td.name)}</strong> lost its blessing.</p>
          <p><small>RECYCLE (p.187): a mote of life becomes a terrain effect when its blessing is removed. Inside, any ally gains regeneration while standing in its space.</small></p>
          <div>${actButton("moteTerrain", { scene: td.parent.id, token: td.id, creator: actor.id }, "Becomes a terrain effect", "fa-seedling", "The mote's space becomes a terrain effect (allies inside gain regeneration); the mote token is removed")}</div></div>`,
      }).catch(err => console.warn("[ICON | TerrainSpaces] mote of life card failed", err));
    }
  });
  // Deepwrath Talent II (p.235) "shattered+ while inside pits": a pit removed under a marked foe (Remove, Delete on
  // the map) takes them out of it — the card to remove Shattered. Active GM only, so the card comes once.
  Hooks.on("deleteMeasuredTemplate", (doc) => {
    if (game.users.activeGM?.id !== game.user.id || !terrainFlag(doc)?.pit) return;
    const scene = doc.parent;
    const keys = new Set((doc.flags[NS].cells ?? []).map(cellKey));
    if (!scene || !keys.size) return;
    for (const td of scene.tokens) {
      if (!td.actor || isMapObject(td) || (Number(td.elevation) || 0) > 0 || !touches(cellsOf(td), keys)) continue;
      offerPitShatter(td, true, tokenInPit(td)).catch(err => console.warn("[ICON | TerrainSpaces] pit shatter offer failed", err));
    }
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
