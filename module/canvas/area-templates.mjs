/**
 * area-templates.mjs — Blast / Burst / Line / Arc areas on the canvas.
 *
 * ICON 1.5 area patterns (manual p.97-98):
 *   Line X   — X spaces long, drawn orthogonally, each space further from the
 *              origin than the previous. Origin = the user (no range) or the
 *              first space of the line (with range).
 *   Arc X    — X contiguous spaces drawn sequentially in orthogonal steps, no
 *              overlap, never through the user; first space in range.
 *   Blast    — fixed templates (p.98 diagram): Small = cross of 5 spaces,
 *              Medium = 3×3, Large = 5×5 without the corners. Origin/attack
 *              space = the centre.
 *   Burst X  — a target space in range and every space within X of it (range
 *              counts diagonals, p.85). Does not affect the user unless said.
 *
 * The area is placed as a core MeasuredTemplateDocument whose cells are stored
 * in `flags.icon-system.cells`; IconMeasuredTemplate (registered as
 * CONFIG.MeasuredTemplate.objectClass) draws those cells instead of the
 * circle/cone/rect/ray shape, so every client sees the same squares. Tokens
 * standing in the cells become the placing user's targets.
 *
 * Interaction (placeAreaTemplate): the mouse drags a preview of the shape on
 * a grid highlight layer; left click places, right click / Esc cancels, the
 * mouse wheel rotates a Line. Arcs are painted one space at a time (Enter or
 * right click finishes a shorter arc). The range of the ability is shown
 * around the user's token while placing.
 */
const _log = (...a) => console.debug("[ICON | AreaTemplates]", ...a);

const FLAG_NS    = "icon-system";
const HL_PREVIEW = "icon-area-preview";
const HL_RANGE   = "icon-area-range";

/** Template colours per pattern (hex strings for the document, ints for PIXI). */
export const AREA_COLORS = { blast: "#e07a2f", burst: "#c8402f", line: "#3d7fd6", arc: "#8a4fc4" };

/** Fixed blast patterns as {di, dj} offsets from the centre cell (p.98). */
const BLAST_SHAPES = {
  s: [{ di: 0, dj: 0 }, { di: -1, dj: 0 }, { di: 1, dj: 0 }, { di: 0, dj: -1 }, { di: 0, dj: 1 }],
  m: [],
  l: [],
};
for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) BLAST_SHAPES.m.push({ di, dj });
for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
  if (Math.abs(di) === 2 && Math.abs(dj) === 2) continue;   // no corners
  BLAST_SHAPES.l.push({ di, dj });
}
const BLAST_LABELS = { s: "Small Blast", m: "Medium Blast", l: "Large Blast" };

const cellKey = (c) => `${c.i},${c.j}`;
const chebyshev = (a, b) => Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));

/* -------------------------------------------------- */
/*  Tag parsing                                        */
/* -------------------------------------------------- */

/**
 * Read the area pattern (and range) out of an ability's tags.
 * Accepts raw strings or the {raw,label} objects the sheets use.
 *   ["attack","range-5","medium-blast"] → { kind:"blast", size:"m", label:"Medium Blast", range:5 }
 *   ["burst-2-self"]                    → { kind:"burst", size:2, self:true, label:"Burst 2 (self)", range:0 }
 *   ["line-4"] / ["arc-6"]              → { kind:"line"|"arc", size:N, … }
 * `size` is 0 for a bare "line"/"arc" tag (the placer asks for it).
 * `range` is 0 when the ability has no range tag (= adjacent), Infinity for
 * "no-max-range". Returns null when the tags carry no area pattern.
 * @param {Array<string|{raw:string}>} tags
 */
export function areaFromTags(tags) {
  let area = null;
  let range = 0;
  for (const t of tags ?? []) {
    const raw = String(t?.raw ?? t ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    if (!raw) continue;
    let m;
    if ((m = raw.match(/^(small|medium|large)-blast$/)))        area = { kind: "blast", size: m[1][0] };
    else if ((m = raw.match(/^blast-([sml])$/)))                 area = { kind: "blast", size: m[1] };
    else if ((m = raw.match(/^burst-(\d+)(?:-(self|target))?$/))) area = { kind: "burst", size: Number(m[1]), self: m[2] === "self", target: m[2] === "target" };
    else if ((m = raw.match(/^line(?:-(\d+))?$/)))               area = { kind: "line", size: Number(m[1] ?? 0) };
    else if ((m = raw.match(/^arc(?:-(\d+))?$/)))                area = { kind: "arc", size: Number(m[1] ?? 0) };
    else if ((m = raw.match(/^range-(\d+)\+?$/)))                range = Math.max(range, Number(m[1]));
    else if (raw === "no-max-range")                             range = Infinity;
  }
  if (!area) return null;
  area.range = range;
  area.label = areaLabel(area);
  return area;
}

/** Human label for an area spec ("Medium Blast", "Burst 2 (target)", "Line 4"). */
export function areaLabel(area) {
  if (!area) return "";
  switch (area.kind) {
    case "blast": return BLAST_LABELS[area.size] ?? "Blast";
    case "burst": return `Burst ${area.size}${area.self ? " (self)" : area.target ? " (target)" : ""}`;
    case "line":  return area.size ? `Line ${area.size}` : "Line";
    case "arc":   return area.size ? `Arc ${area.size}` : "Arc";
  }
  return "Area";
}

/* -------------------------------------------------- */
/*  Geometry helpers                                   */
/* -------------------------------------------------- */

/** Grid cells covered by a token document (top-left offset + width × height). */
export function tokenCells(tokenDoc) {
  const grid = canvas.grid;
  const half = grid.size / 2;
  const tl = grid.getOffset({ x: tokenDoc.x + half, y: tokenDoc.y + half });
  const w = Math.max(1, Math.round(tokenDoc.width ?? 1));
  const h = Math.max(1, Math.round(tokenDoc.height ?? 1));
  const cells = [];
  for (let di = 0; di < h; di++) for (let dj = 0; dj < w; dj++) cells.push({ i: tl.i + di, j: tl.j + dj });
  return cells;
}

/** Cells of a blast / burst centred on `center`, or a line starting there. */
function shapeCells(area, center, { dir = { di: 0, dj: 1 } } = {}) {
  const out = [];
  if (area.kind === "blast") {
    for (const o of BLAST_SHAPES[area.size] ?? BLAST_SHAPES.m) out.push({ i: center.i + o.di, j: center.j + o.dj });
  } else if (area.kind === "burst") {
    const r = Math.max(0, area.size);
    for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) out.push({ i: center.i + di, j: center.j + dj });
  } else if (area.kind === "line") {
    for (let k = 0; k < Math.max(1, area.size); k++) out.push({ i: center.i + dir.di * k, j: center.j + dir.dj * k });
  }
  return out;
}

/** Smallest Chebyshev distance from `cell` to any of `cells`. */
function distanceToCells(cell, cells) {
  let best = Infinity;
  for (const c of cells) best = Math.min(best, chebyshev(cell, c));
  return best;
}

/** Every cell within `range` of the source cells (source cells excluded). */
function cellsInRange(sourceCells, range) {
  const src = new Set(sourceCells.map(cellKey));
  const out = [];
  let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
  for (const c of sourceCells) { i0 = Math.min(i0, c.i); i1 = Math.max(i1, c.i); j0 = Math.min(j0, c.j); j1 = Math.max(j1, c.j); }
  for (let i = i0 - range; i <= i1 + range; i++) for (let j = j0 - range; j <= j1 + range; j++) {
    const c = { i, j };
    if (src.has(cellKey(c))) continue;
    if (distanceToCells(c, sourceCells) <= range) out.push(c);
  }
  return out;
}

/** Tokens (placeables) standing on any of `cells`. */
export function tokensInCells(cells, { exclude = [] } = {}) {
  const set = new Set(cells.map(cellKey));
  const skip = new Set(exclude);
  return canvas.tokens.placeables.filter(t => t.actor && !skip.has(t.id) && tokenCells(t.document).some(c => set.has(cellKey(c))));
}

/** The token that represents `actor` on the current scene (controlled first). */
export function sourceTokenFor(actor) {
  return canvas.tokens?.controlled?.find(t => t.actor?.id === actor?.id)
      ?? actor?.getActiveTokens?.(false, false)?.[0]
      ?? null;
}

/* -------------------------------------------------- */
/*  Placement                                          */
/* -------------------------------------------------- */

/** Ask for the length of a bare "line"/"arc" tag. */
async function promptAreaSize(area) {
  try {
    const value = await foundry.applications.api.DialogV2.prompt({
      window: { title: `${areaLabel(area)} — length` },
      content: `<p>How many spaces long is this ${area.kind}?</p>
                <input type="number" name="size" value="3" min="1" max="20" autofocus style="width:80px">`,
      ok: { label: "OK", callback: (_e, button) => Number(button.form?.elements?.size?.value ?? 0) },
      rejectClose: false,
    });
    return Number(value) > 0 ? Number(value) : null;
  } catch { return null; }
}

/**
 * Interactive placement of one area on the canvas. Resolves with the chosen
 * cells, or null when cancelled. Only one placement runs at a time.
 */
class AreaPlacement {
  static #active = null;

  constructor({ area, sourceCells, rangeCells }) {
    this.area = area;
    this.sourceCells = sourceCells;
    this.sourceKeys = new Set(sourceCells.map(cellKey));
    this.rangeKeys = rangeCells ? new Set(rangeCells.map(cellKey)) : null;   // null = no restriction
    this.rangeCells = rangeCells;
    this.rotation = 0;            // quarter turns applied to a Line
    this.arcCells = [];           // painted Arc cells
    this.mouseCell = null;
    this.color = Number(foundry.utils.Color.from(AREA_COLORS[area.kind] ?? "#c4a64f"));
  }

  /** Run the placement; resolves cells[] or null. */
  run() {
    if (AreaPlacement.#active) AreaPlacement.#active.cancel();
    AreaPlacement.#active = this;
    return new Promise(resolve => {
      this.resolve = resolve;
      this.prevLayer = canvas.activeLayer;
      canvas.templates.activate();
      const grid = canvas.interface.grid;
      grid.addHighlightLayer(HL_RANGE);
      grid.addHighlightLayer(HL_PREVIEW);
      if (this.rangeCells) {
        for (const c of this.rangeCells) {
          const p = canvas.grid.getTopLeftPoint(c);
          grid.highlightPosition(HL_RANGE, { x: p.x, y: p.y, color: 0x3d7fd6, border: 0x3d7fd6, alpha: 0.10 });
        }
      }
      this.handlers = {
        move:  (ev) => this.#onMove(ev),
        down:  (ev) => this.#onDown(ev),
        key:   (ev) => this.#onKey(ev),
        wheel: (ev) => this.#onWheel(ev),
        ctx:   (ev) => { ev.preventDefault(); },
      };
      canvas.stage.on("pointermove", this.handlers.move);
      canvas.stage.on("pointerdown", this.handlers.down);
      window.addEventListener("keydown", this.handlers.key, { capture: true });
      window.addEventListener("wheel", this.handlers.wheel, { capture: true, passive: false });
      canvas.app.view.addEventListener("contextmenu", this.handlers.ctx, { capture: true });
      const hint = this.area.kind === "arc"
        ? `Paint the ${this.area.label} one space at a time (${this.area.size} spaces, orthogonal steps). Enter or right-click finishes early, Esc cancels.`
        : `Click to place the ${this.area.label}. ${this.area.kind === "line" ? "Mouse wheel rotates it. " : ""}Right-click or Esc cancels.`;
      ui.notifications.info(hint);
    });
  }

  cancel() { this.#finish(null); }

  #finish(result) {
    if (AreaPlacement.#active !== this) return;
    AreaPlacement.#active = null;
    canvas.stage.off("pointermove", this.handlers.move);
    canvas.stage.off("pointerdown", this.handlers.down);
    window.removeEventListener("keydown", this.handlers.key, { capture: true });
    window.removeEventListener("wheel", this.handlers.wheel, { capture: true });
    canvas.app.view.removeEventListener("contextmenu", this.handlers.ctx, { capture: true });
    const grid = canvas.interface.grid;
    grid.destroyHighlightLayer(HL_PREVIEW);
    grid.destroyHighlightLayer(HL_RANGE);
    try { this.prevLayer?.activate(); } catch { /* layer gone */ }
    this.resolve(result);
  }

  /** Orthogonal direction pointing from the nearest source cell to `cell`. */
  #autoDirection(cell) {
    let nearest = this.sourceCells[0];
    for (const c of this.sourceCells) if (chebyshev(cell, c) < chebyshev(cell, nearest)) nearest = c;
    const di = cell.i - nearest.i, dj = cell.j - nearest.j;
    let dir;
    if (di === 0 && dj === 0) dir = { di: 0, dj: 1 };
    else if (Math.abs(dj) >= Math.abs(di)) dir = { di: 0, dj: Math.sign(dj) };
    else dir = { di: Math.sign(di), dj: 0 };
    for (let k = 0; k < this.rotation; k++) dir = { di: dir.dj, dj: -dir.di };   // rotate 90°
    return dir;
  }

  /** Cells the current mouse position would produce (blast / burst / line). */
  #previewCells() {
    if (!this.mouseCell) return [];
    if (this.area.kind === "line") return shapeCells(this.area, this.mouseCell, { dir: this.#autoDirection(this.mouseCell) });
    return shapeCells(this.area, this.mouseCell);
  }

  /** Is `cell` a legal next Arc space? */
  #arcCandidateValid(cell) {
    if (!cell || this.sourceKeys.has(cellKey(cell))) return false;
    if (this.arcCells.some(c => cellKey(c) === cellKey(cell))) return false;
    if (!this.arcCells.length) return !this.rangeKeys || this.rangeKeys.has(cellKey(cell));
    const last = this.arcCells[this.arcCells.length - 1];
    return Math.abs(last.i - cell.i) + Math.abs(last.j - cell.j) === 1;
  }

  #inRange(cells) {
    if (!this.rangeKeys) return true;
    return cells.some(c => this.rangeKeys.has(cellKey(c)));
  }

  #render() {
    const grid = canvas.interface.grid;
    grid.clearHighlightLayer(HL_PREVIEW);
    const paint = (cell, alpha) => {
      const p = canvas.grid.getTopLeftPoint(cell);
      grid.highlightPosition(HL_PREVIEW, { x: p.x, y: p.y, color: this.color, border: this.color, alpha });
    };
    if (this.area.kind === "arc") {
      for (const c of this.arcCells) paint(c, 0.45);
      if (this.#arcCandidateValid(this.mouseCell)) paint(this.mouseCell, 0.25);
      return;
    }
    const cells = this.#previewCells();
    const ok = this.#inRange(cells);
    for (const c of cells) paint(c, ok ? 0.4 : 0.15);
  }

  #onMove(ev) {
    const pos = ev.getLocalPosition(canvas.stage);
    const cell = canvas.grid.getOffset({ x: pos.x, y: pos.y });
    if (this.mouseCell && cell.i === this.mouseCell.i && cell.j === this.mouseCell.j) return;
    this.mouseCell = cell;
    this.#render();
  }

  #onDown(ev) {
    const button = ev.button ?? ev.data?.button ?? 0;
    if (button === 2) {               // right click: finish a started arc, else cancel
      if (this.area.kind === "arc" && this.arcCells.length) return this.#finishArc();
      return this.cancel();
    }
    if (button !== 0) return;
    const pos = ev.getLocalPosition(canvas.stage);
    this.mouseCell = canvas.grid.getOffset({ x: pos.x, y: pos.y });
    if (this.area.kind === "arc") {
      if (!this.#arcCandidateValid(this.mouseCell)) {
        ui.notifications.warn(this.arcCells.length
          ? "An arc continues from its last space in an orthogonal step, without overlapping itself or you."
          : "The first space of the arc must be in range.");
        return;
      }
      this.arcCells.push(this.mouseCell);
      this.#render();
      if (this.arcCells.length >= this.area.size) this.#finishArc();
      return;
    }
    const cells = this.#previewCells();
    if (!cells.length) return;
    if (!this.#inRange(cells)) {
      ui.notifications.warn(`At least one space of the ${this.area.label} must be ${this.area.range ? `within range ${this.area.range}` : "adjacent to you"} (p.97).`);
      return;
    }
    this.#finish({ cells, origin: this.mouseCell });
  }

  /** Resolve with the painted arc (origin = its first space). */
  #finishArc() {
    this.#finish({ cells: this.arcCells.slice(), origin: this.arcCells[0] });
  }

  #onKey(ev) {
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopImmediatePropagation(); this.cancel(); }
    else if (ev.key === "Enter" && this.area.kind === "arc" && this.arcCells.length) {
      ev.preventDefault(); ev.stopImmediatePropagation(); this.#finishArc();
    }
  }

  #onWheel(ev) {
    if (this.area.kind !== "line") return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    this.rotation = (this.rotation + (ev.deltaY > 0 ? 1 : 3)) % 4;
    this.#render();
  }
}

/**
 * Place an area for an ability and target the tokens inside it.
 * Resolves with { template, cells, targets } or null when cancelled / not
 * possible (no token on the scene, gridless scene, …).
 *
 * @param {object} opts
 * @param {Actor}  opts.actor         the ability's user
 * @param {object} opts.area          from areaFromTags()
 * @param {string} opts.abilityName   shown on the template and in chat
 * @param {string} opts.abilityKey    identifies the ability (item id / action name) for replace & reuse
 * @param {boolean} [opts.replace=true]  delete this actor's previous template for the same ability
 */
export async function placeAreaTemplate({ actor, area, abilityName, abilityKey, replace = true }) {
  if (!canvas?.ready || !canvas.scene) { ui.notifications.warn("No active scene to place the area on."); return null; }
  if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) { ui.notifications.warn("Area templates need a square grid (ICON is played on squares, p.85)."); return null; }
  const token = sourceTokenFor(actor);
  if (!token) { ui.notifications.warn(`${actor?.name ?? "The actor"} has no token on this scene — place one to use area templates.`); return null; }

  area = { ...area };
  if ((area.kind === "line" || area.kind === "arc") && !area.size) {
    const size = await promptAreaSize(area);
    if (!size) return null;
    area.size = size;
    area.label = areaLabel(area);
  }

  const sourceCells = tokenCells(token.document);
  let cells, originCell;
  if (area.kind === "burst" && area.self) {
    cells = cellsInRange(sourceCells, area.size).concat(sourceCells);
    originCell = sourceCells[0];
  } else {
    const rangeCells = Number.isFinite(area.range) ? cellsInRange(sourceCells, Math.max(1, area.range)) : null;
    const placed = await new AreaPlacement({ area, sourceCells, rangeCells }).run();
    if (!placed) return null;
    ({ cells, origin: originCell } = placed);
  }

  if (replace) await deleteAreaTemplates({ actorId: actor.id, abilityKey });

  // Origin = blast/burst centre, first space of a line/arc (control icon + ruler text sit there).
  const origin = canvas.grid.getCenterPoint(originCell);
  const color = AREA_COLORS[area.kind] ?? "#c4a64f";
  const data = {
    t: "rect", x: origin.x, y: origin.y, distance: 1, direction: 0, width: 0,
    fillColor: color, borderColor: color, hidden: false,
    flags: { [FLAG_NS]: {
      cells, area: { kind: area.kind, size: area.size, self: !!area.self, label: area.label },
      actorId: actor.id, actorUuid: actor.uuid, abilityKey, abilityName: abilityName ?? "",
    } },
  };
  let template = null;
  try {
    [template] = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [data]);
  } catch (err) {
    console.warn("[ICON | AreaTemplates] template creation failed (permissions?)", err);
    ui.notifications.warn("Could not create the template on the scene (you may lack the 'Create Measured Template' permission) — targets were still selected.");
  }

  const targets = tokensInCells(cells, { exclude: area.kind === "burst" ? [token.id] : [] });
  await game.user.updateTokenTargets(targets.map(t => t.id));
  // Switching to the template layer released the token: give it back its selection.
  if (token.isOwner && !token.controlled) token.control({ releaseOthers: false });
  _log(`placed ${area.label} for "${abilityName}" — ${cells.length} cells, ${targets.length} target(s)`);
  ui.notifications.info(`${area.label} placed — ${targets.length ? targets.map(t => t.name).join(", ") : "no one"} in the area.`);
  return { template, cells, targets, area };
}

/**
 * Target the tokens standing in an existing area template (for a second
 * attack roll on the same ability after the tokens moved).
 */
export async function retargetFromTemplate(template) {
  const cells = template?.getFlag(FLAG_NS, "cells") ?? [];
  const area  = template?.getFlag(FLAG_NS, "area") ?? {};
  const actorId = template?.getFlag(FLAG_NS, "actorId");
  const own = area.kind === "burst" ? canvas.tokens.placeables.filter(t => t.actor?.id === actorId).map(t => t.id) : [];
  const targets = tokensInCells(cells, { exclude: own });
  await game.user.updateTokenTargets(targets.map(t => t.id));
  return { template, cells, targets, area };
}

/** Existing area templates on the current scene for an actor (+ ability). */
export function findAreaTemplates({ actorId, abilityKey } = {}) {
  if (!canvas?.scene) return [];
  return canvas.scene.templates.filter(t => {
    const f = t.flags?.[FLAG_NS];
    if (!f?.cells) return false;
    if (actorId && f.actorId !== actorId) return false;
    if (abilityKey && f.abilityKey !== abilityKey) return false;
    return true;
  });
}

/** Delete area templates (all of the scene's when no filter is given). */
export async function deleteAreaTemplates({ actorId, abilityKey, scene } = {}) {
  const sc = scene ?? canvas?.scene;
  if (!sc) return 0;
  const docs = (sc === canvas?.scene ? findAreaTemplates({ actorId, abilityKey }) : sc.templates.filter(t => t.flags?.[FLAG_NS]?.cells))
    .filter(t => t.isOwner || game.user.isGM);
  if (!docs.length) return 0;
  await sc.deleteEmbeddedDocuments("MeasuredTemplate", docs.map(d => d.id));
  return docs.length;
}

/**
 * Attack-roll helper: make sure the area of an attack is on the table before
 * rolling. Reuses this actor's existing template for the ability (re-reading
 * the tokens inside it), otherwise places a new one. Returns the placement
 * result, `null` when the user cancelled the placement, or `undefined` when
 * the ability has no area / the placement was impossible (roll goes on).
 */
export async function ensureAreaTargets({ actor, tags, abilityName, abilityKey }) {
  const area = areaFromTags(tags);
  if (!area) return undefined;
  const existing = findAreaTemplates({ actorId: actor.id, abilityKey })[0];
  if (existing) return retargetFromTemplate(existing);
  if (!canvas?.ready || !sourceTokenFor(actor)) return undefined;
  return placeAreaTemplate({ actor, area, abilityName, abilityKey });
}

/** Chat summary line for an attack card (safe HTML). */
export function areaSummaryHtml(placement) {
  if (!placement?.area) return "";
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const names = placement.targets?.length ? placement.targets.map(t => esc(t.name)).join(", ") : "no one";
  const btn = placement.template
    ? ` <button type="button" class="icon-btn icon-btn--sm icon-btn--remove icon-chat-card__area-remove" data-action="removeAreaTemplate" data-template-id="${esc(placement.template.id)}" data-scene-id="${esc(placement.template.parent?.id)}" title="Remove the template from the map">🗑 area</button>`
    : "";
  return `<div class="icon-chat-card__area"><span class="icon-chat-card__area-label">📐 ${esc(placement.area.label)}</span> <span class="icon-chat-card__area-targets">${names}</span>${btn}</div>`;
}

/* -------------------------------------------------- */
/*  Canvas object                                      */
/* -------------------------------------------------- */

/**
 * MeasuredTemplate that renders the ICON cell set stored in
 * `flags.icon-system.cells`. Core templates (no flag) keep their behaviour.
 */
export class IconMeasuredTemplate extends foundry.canvas.placeables.MeasuredTemplate {

  /** Absolute grid cells of this area, or null for a core template. */
  get iconCells() {
    const cells = this.document?.flags?.[FLAG_NS]?.cells;
    return Array.isArray(cells) && cells.length ? cells : null;
  }

  /** Canvas-space bounding rectangle of the cells. */
  #cellsRect() {
    const grid = canvas.grid;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of this.iconCells) {
      const p = grid.getTopLeftPoint(c);
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x + grid.size); y1 = Math.max(y1, p.y + grid.size);
    }
    return new PIXI.Rectangle(x0, y0, x1 - x0, y1 - y0);
  }

  /** @override */
  get bounds() {
    if (!this.iconCells) return super.bounds;
    return this.#cellsRect();
  }

  /** @override */
  _computeShape() {
    if (!this.iconCells) return super._computeShape();
    const r = this.#cellsRect();
    return new PIXI.Rectangle(r.x - this.document.x, r.y - this.document.y, r.width, r.height);
  }

  /** @override */
  _refreshTemplate() {
    if (!this.iconCells) return super._refreshTemplate();
    const grid = canvas.grid;
    const size = grid.size;
    const s = canvas.dimensions.uiScale;
    const t = this.template.clear();
    const keys = new Set(this.iconCells.map(cellKey));
    const ox = this.document.x, oy = this.document.y;
    t.lineStyle(this._borderThickness * s, this.document.borderColor, 0.9);
    // Outline: every cell edge that is not shared with another cell of the area.
    for (const c of this.iconCells) {
      const p = grid.getTopLeftPoint(c);
      const x = p.x - ox, y = p.y - oy;
      if (!keys.has(cellKey({ i: c.i - 1, j: c.j }))) t.moveTo(x, y).lineTo(x + size, y);
      if (!keys.has(cellKey({ i: c.i + 1, j: c.j }))) t.moveTo(x, y + size).lineTo(x + size, y + size);
      if (!keys.has(cellKey({ i: c.i, j: c.j - 1 }))) t.moveTo(x, y).lineTo(x, y + size);
      if (!keys.has(cellKey({ i: c.i, j: c.j + 1 }))) t.moveTo(x + size, y).lineTo(x + size, y + size);
    }
    // Origin marker (centre / first space)
    t.lineStyle(this._borderThickness * s, 0x000000).beginFill(this.document.fillColor, 0.6).drawCircle(0, 0, 5 * s).endFill();
  }

  /** @override */
  _getGridHighlightPositions() {
    if (!this.iconCells) return super._getGridHighlightPositions();
    return this.iconCells.map(c => canvas.grid.getTopLeftPoint(c));
  }

  /** @override */
  _refreshRulerText() {
    if (!this.iconCells) return super._refreshRulerText();
    const f = this.document.flags[FLAG_NS];
    const name = f.abilityName ? ` · ${f.abilityName}` : "";
    this.ruler.text = `${f.area?.label ?? "Area"}${name}`;
    const r = this.#cellsRect();
    this.ruler.position.set(r.x - this.document.x, r.y + r.height - this.document.y + 4);
  }

  /** @override */
  testPoint(point) {
    if (!this.iconCells) return super.testPoint(point);
    const c = canvas.grid.getOffset(point);
    return this.iconCells.some(k => k.i === c.i && k.j === c.j);
  }
}

/** Register the canvas class (call from the init hook). */
export function registerAreaTemplates() {
  CONFIG.MeasuredTemplate.objectClass = IconMeasuredTemplate;
}
