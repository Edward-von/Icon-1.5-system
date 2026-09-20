/**
 * area-templates.mjs — Blast / Burst / Line / Arc areas on the canvas.
 *
 * ICON 1.5 area patterns (manual p.97-98):
 *   Line X   — X spaces long, drawn orthogonally, each space further from the
 *              origin than the previous. Origin = the user (no range) or the
 *              first space of the line (with range).
 *   Arc X    — X contiguous spaces drawn sequentially in orthogonal steps, no
 *              overlap, never through the user; first space in range.
 *   Blast    — fixed templates (p.98 diagram): Small = cross of 5 spaces
 *              (every space 1 step away), Medium = 3×3, Large = every space
 *              within 2 orthogonal steps, 13 spaces — a bigger cross, not a
 *              5×5. Origin/attack space = the centre.
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
export const AREA_COLORS = { blast: "#e07a2f", burst: "#c8402f", line: "#3d7fd6", arc: "#8a4fc4", aura: "#c4a64f" };

/** Class colours (same values as the sheet's --stalwart/--vagabond/… tokens). */
export const CLASS_COLORS = {
  stalwart: "#c0392b", vagabond: "#d4a017", mendicant: "#27ae60", wright: "#2980b9",
};

/**
 * The colour to draw an area in. Auras are the ones that pile up on the map —
 * several characters can hold one at the same time and they all looked alike —
 * so an aura takes the character's own colour: the one picked on their sheet
 * (`flags.icon-system.auraColor`), else their class colour, else the generic
 * aura gold. Blast / line / arc / burst keep the colour of their shape.
 * @param {object} area
 * @param {Actor}  actor
 * @returns {string} hex colour
 */
export function areaColor(area, actor) {
  if (area?.kind !== "aura") return AREA_COLORS[area?.kind] ?? AREA_COLORS.aura;
  const picked = String(actor?.getFlag?.("icon-system", "auraColor") ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(picked)) return picked;
  const cls = String(actor?.system?.combat?.jobs?.find?.(j => j.primary)?.class
                  ?? actor?.system?.class ?? "").toLowerCase();
  return CLASS_COLORS[cls] ?? AREA_COLORS.aura;
}

/** Fixed blast patterns as {di, dj} offsets from the centre cell (p.98). */
const BLAST_SHAPES = {
  s: [{ di: 0, dj: 0 }, { di: -1, dj: 0 }, { di: 1, dj: 0 }, { di: 0, dj: -1 }, { di: 0, dj: 1 }],
  m: [],
  l: [],
};
for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) BLAST_SHAPES.m.push({ di, dj });
// Large blast: the diagram on p.98 is the small blast's cross grown by one
// step — every space at most 2 orthogonal steps from the centre (13 spaces),
// NOT a 5×5 block (that would be 21 and is what this used to draw).
for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
  if (Math.abs(di) + Math.abs(dj) > 2) continue;
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
  let aura = null;
  let range = 0;
  let width = 0;
  for (const t of tags ?? []) {
    const raw = String(t?.raw ?? t ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    if (!raw) continue;
    let m;
    if ((m = raw.match(/^(small|medium|large)-blast$/)))        area = { kind: "blast", size: m[1][0] };
    else if ((m = raw.match(/^blast-([sml])$/)))                 area = { kind: "blast", size: m[1] };
    else if ((m = raw.match(/^burst-(\d+)(?:-(self|target))?$/))) area = { kind: "burst", size: Number(m[1]), self: m[2] === "self", target: m[2] === "target" };
    else if ((m = raw.match(/^line(?:-(\d+))?$/)))               area = { kind: "line", size: Number(m[1] ?? 0) };
    else if ((m = raw.match(/^arc(?:-(\d+))?$/)))                area = { kind: "arc", size: Number(m[1] ?? 0) };
    else if ((m = raw.match(/^aura(?:-(\d+))?$/)))               aura = { kind: "aura", size: Number(m[1] ?? 0), self: true };
    else if ((m = raw.match(/^width-(\d+)$/)))                   width = Number(m[1]);
    else if ((m = raw.match(/^range-(\d+)\+?$/)))                range = Math.max(range, Number(m[1]));
    else if (raw === "no-max-range")                             range = Infinity;
  }
  // A stance with both an aura and (say) a line keeps the line as its area;
  // the aura is a persistent effect around the user.
  area = area ?? aura;
  if (!area) return null;
  area.range = range;
  if (area.kind === "line" && width > 1) area.width = width;
  area.label = areaLabel(area);
  return area;
}

/** Range from the tags alone: 0 = none (adjacent), Infinity = no maximum range. */
export function rangeFromTags(tags) {
  let range = 0;
  for (const t of tags ?? []) {
    const raw = String(t?.raw ?? t ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    const m = raw.match(/^range-(\d+)\+?$/);
    if (m) range = Math.max(range, Number(m[1]));
    else if (raw === "no-max-range") range = Infinity;
  }
  return range;
}

/** Human label for an area spec ("Medium Blast", "Burst 2 (target)", "Line 4", "Aura 2"). */
export function areaLabel(area) {
  if (!area) return "";
  switch (area.kind) {
    case "blast": return BLAST_LABELS[area.size] ?? "Blast";
    case "burst": return `Burst ${area.size}${area.self ? " (self)" : area.target ? " (target)" : ""}`;
    case "line":  return (area.size ? `Line ${area.size}` : "Line") + (area.width > 1 ? ` (width ${area.width})` : "");
    case "arc":   return area.size ? `Arc ${area.size}` : "Arc";
    case "aura":  return area.size ? `Aura ${area.size}` : "Aura";
  }
  return "Area";
}

/**
 * Every area pattern mentioned in a rules text, in order of appearance:
 *   "Area becomes Arc 4 … extend the area effect to arc 8" → [Arc 4, Arc 8]
 *   "Increase area to Large Blast"                        → [Large Blast]
 * Used for the combo / charge / talent variants of an ability.
 * @param {string} text
 * @returns {object[]}  area specs (without range)
 */
export function areasInText(text) {
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").toLowerCase();
  const out = [];
  const seen = new Set();
  const re = /\b(?:(small|medium|large) blast|line (\d+)|arc (\d+)|burst (\d+)(?: \((self|target)\))?)\b/g;
  for (const m of plain.matchAll(re)) {
    let area;
    if (m[1]) area = { kind: "blast", size: m[1][0] };
    else if (m[2]) area = { kind: "line", size: Number(m[2]) };
    else if (m[3]) area = { kind: "arc", size: Number(m[3]) };
    else if (m[4]) area = { kind: "burst", size: Number(m[4]), self: m[5] === "self", target: m[5] === "target" };
    else continue;
    area.label = areaLabel(area);
    if (seen.has(area.label)) continue;
    seen.add(area.label);
    out.push(area);
  }
  return out;
}

/**
 * The area to offer for an ability: the one in its tags, or — when the tags
 * carry none — the first one named in its own rules text. The book prints the
 * shape of most terrain-effect abilities in the prose rather than the header
 * ("Tsunami, 2 Actions, Terrain Effect … The area is a medium blast terrain
 * effect", p.233; the same for Fairy Ring, Ätherwand, Blood Grove, Party
 * Favor…), so without this they never offered a template at all.
 * @param {Array} tags
 * @param {string} [description]  the ability's own text
 * @returns {object|null}
 */
export function abilityArea(tags, description = "") {
  return areaFromTags(tags) ?? areasInText(description)[0] ?? null;
}

/**
 * The areas an ability can be placed with: the one from its tags first, then
 * the alternatives its combo / charge / unlocked upgrade texts describe.
 * @param {object} opts
 * @param {Array}  opts.tags    ability tags (raw strings or {raw})
 * @param {Array<[string, string]>} [opts.texts]  [source label, rules text] pairs
 * @returns {Array<{label:string, source:string, area:object}>}
 */
export function areaVariants({ tags, texts = [] }) {
  const base = areaFromTags(tags);
  const range = base?.range ?? rangeFromTags(tags);
  const out = [];
  const seen = new Set();
  if (base) { out.push({ label: base.label, source: "", area: base }); seen.add(base.label); }
  for (const [source, text] of texts) {
    for (const area of areasInText(text)) {
      if (seen.has(area.label)) continue;
      seen.add(area.label);
      out.push({ label: area.label, source, area: { ...area, range } });
    }
  }
  return out;
}

/**
 * Let the user pick one of several area variants (a single variant is
 * returned straight away). Resolves the chosen area or null.
 */
export async function chooseAreaVariant(variants, abilityName = "") {
  if (!variants?.length) return null;
  if (variants.length === 1) return variants[0].area;
  try {
    const buttons = variants.map((v, i) => ({
      action: String(i),
      label: v.source ? `${v.source}: ${v.label}` : v.label,
      default: i === 0,
      callback: () => v.area,
    }));
    return await foundry.applications.api.DialogV2.wait({
      window: { title: `${abilityName || "Ability"} — which area?` },
      content: `<p>This ability can be placed as more than one pattern. Pick the one you are using:</p>`,
      buttons,
      rejectClose: false,
    });
  } catch { return null; }
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

/**
 * Cells of a blast / burst centred on `center`, or a line starting there.
 * A line of width W adds the extra columns beside it ("on either side", p.97):
 * odd widths spread evenly, even widths put the extra column on the `flip`
 * side (toggled with Shift + wheel while placing).
 */
function shapeCells(area, center, { dir = { di: 0, dj: 1 }, flip = false } = {}) {
  const out = [];
  if (area.kind === "blast") {
    for (const o of BLAST_SHAPES[area.size] ?? BLAST_SHAPES.m) out.push({ i: center.i + o.di, j: center.j + o.dj });
  } else if (area.kind === "burst") {
    const r = Math.max(0, area.size);
    for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) out.push({ i: center.i + di, j: center.j + dj });
  } else if (area.kind === "line") {
    const w = Math.max(1, area.width ?? 1);
    const perp = { di: dir.dj, dj: -dir.di };                    // 90° to the line
    const lo = -Math.floor((w - 1) / 2), hi = Math.ceil((w - 1) / 2);
    for (let k = 0; k < Math.max(1, area.size); k++) {
      for (let s = lo; s <= hi; s++) {
        const side = flip ? -s : s;
        out.push({ i: center.i + dir.di * k + perp.di * side, j: center.j + dir.dj * k + perp.dj * side });
      }
    }
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

/**
 * Make `tokens` the user's targets (Foundry v13 has no User#updateTokenTargets:
 * targeting goes through Token#setTarget, which also broadcasts it).
 */
function _setUserTargets(tokens) {
  const keep = new Set(tokens.map(t => t.id));
  for (const t of Array.from(game.user.targets)) if (!keep.has(t.id)) t.setTarget(false, { releaseOthers: false });
  for (const t of tokens) if (!t.isTargeted) t.setTarget(true, { releaseOthers: false });
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
    this.freePlacement = false;   // Alt held: ignore the range restriction
    this.rangeCells = rangeCells;
    this.rotation = 0;            // quarter turns applied to a Line
    this.flip = false;            // side of the extra width of an even-width Line
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
        keyup: (ev) => { if (ev.key === "Alt") this.#setFreePlacement(false); },
        wheel: (ev) => this.#onWheel(ev),
        ctx:   (ev) => { ev.preventDefault(); },
      };
      // Capture phase: a click on the control icon of a template already on
      // the map would otherwise be swallowed by that icon before reaching us.
      canvas.stage.addEventListener("pointermove", this.handlers.move, { capture: true });
      canvas.stage.addEventListener("pointerdown", this.handlers.down, { capture: true });
      window.addEventListener("keydown", this.handlers.key, { capture: true });
      window.addEventListener("keyup", this.handlers.keyup, { capture: true });
      window.addEventListener("wheel", this.handlers.wheel, { capture: true, passive: false });
      canvas.app.view.addEventListener("contextmenu", this.handlers.ctx, { capture: true });
      const free = this.rangeKeys ? " Hold Alt to place it outside the usual range (an Infuse that extends the range, a GM ruling)." : "";
      const hint = this.area.kind === "arc"
        ? `Paint the ${this.area.label} one space at a time (${this.area.size} spaces, orthogonal steps). Enter or right-click finishes early, Esc cancels.${free}`
        : `Click to place the ${this.area.label}. ${this.area.kind === "line" ? "Mouse wheel rotates it. " : ""}Right-click or Esc cancels.${free}`;
      ui.notifications.info(hint);
    });
  }

  cancel() { this.#finish(null); }

  #finish(result) {
    if (AreaPlacement.#active !== this) return;
    AreaPlacement.#active = null;
    canvas.stage.removeEventListener("pointermove", this.handlers.move, { capture: true });
    canvas.stage.removeEventListener("pointerdown", this.handlers.down, { capture: true });
    window.removeEventListener("keydown", this.handlers.key, { capture: true });
    window.removeEventListener("keyup", this.handlers.keyup, { capture: true });
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
    if (this.area.kind === "line") return shapeCells(this.area, this.mouseCell, { dir: this.#autoDirection(this.mouseCell), flip: this.flip });
    return shapeCells(this.area, this.mouseCell);
  }

  /** Is `cell` a legal next Arc space? */
  #arcCandidateValid(cell) {
    if (!cell || this.sourceKeys.has(cellKey(cell))) return false;
    if (this.arcCells.some(c => cellKey(c) === cellKey(cell))) return false;
    if (!this.arcCells.length) return !this.rangeKeys || this.freePlacement || this.rangeKeys.has(cellKey(cell));
    const last = this.arcCells[this.arcCells.length - 1];
    return Math.abs(last.i - cell.i) + Math.abs(last.j - cell.j) === 1;
  }

  #inRange(cells) {
    if (!this.rangeKeys || this.freePlacement) return true;
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
    ev.stopPropagation();             // the click is ours: don't select whatever lies under the mouse
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

  /**
   * Alt releases the range restriction while it is held: the placement rules
   * are the usual ones, but an Infuse that extends the range (or a ruling at
   * the table) shouldn't leave the template unplaceable.
   */
  #setFreePlacement(on) {
    if (this.freePlacement === on) return;
    this.freePlacement = on;
    this.#render();
  }

  #onKey(ev) {
    if (ev.key === "Alt") this.#setFreePlacement(true);
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopImmediatePropagation(); this.cancel(); }
    else if (ev.key === "Enter" && this.area.kind === "arc" && this.arcCells.length) {
      ev.preventDefault(); ev.stopImmediatePropagation(); this.#finishArc();
    }
  }

  #onWheel(ev) {
    if (this.area.kind !== "line") return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (ev.shiftKey) this.flip = !this.flip;                       // Shift + wheel: swap the wide side
    else this.rotation = (this.rotation + (ev.deltaY > 0 ? 1 : 3)) % 4;
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
  if ((area.kind === "line" || area.kind === "arc" || area.kind === "aura") && !area.size) {
    const size = await promptAreaSize(area);
    if (!size) return null;
    area.size = size;
    area.label = areaLabel(area);
  }

  const sourceCells = tokenCells(token.document);
  const isAura = area.kind === "aura";
  let cells, originCell;
  if (isAura || (area.kind === "burst" && area.self)) {
    // Around the user, no click needed. An aura keeps following the token.
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
  const color = areaColor(area, actor);
  const data = {
    t: "rect", x: origin.x, y: origin.y, distance: 1, direction: 0, width: 0,
    fillColor: color, borderColor: color, hidden: false,
    flags: { [FLAG_NS]: {
      cells, area: { kind: area.kind, size: area.size, self: !!area.self, width: area.width ?? 1, label: area.label },
      actorId: actor.id, actorUuid: actor.uuid, abilityKey, abilityName: abilityName ?? "",
      // Auras move with their token (updateToken hook in registerAreaTemplates)
      followTokenId: isAura ? token.id : null,
    } },
  };
  let template = null;
  try {
    [template] = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [data]);
  } catch (err) {
    console.warn("[ICON | AreaTemplates] template creation failed (permissions?)", err);
    ui.notifications.warn("Could not create the template on the scene (you may lack the 'Create Measured Template' permission) — targets were still selected.");
  }

  if (isAura) {
    // A persistent effect, not an attack: nothing to target.
    if (token.isOwner && !token.controlled) token.control({ releaseOthers: false });
    _log(`placed ${area.label} for "${abilityName}" — follows token ${token.id}`);
    ui.notifications.info(`${area.label} placed around ${token.name}; it follows the token.`);
    return { template, cells, targets: [], area };
  }

  // Seer wild cards (p.200): a card whose small blast this area touches can be
  // set off, growing the area to cover it — and the cards that reaches in turn.
  // Asked before the targets are read, so the extension counts for targeting.
  // Imported here rather than at the top: wild-cards.mjs reads tokenCells from
  // this module, and a lazy import keeps the two from importing each other.
  if (template) {
    try {
      const { offerWildCards } = await import("./wild-cards.mjs");
      cells = await offerWildCards(template, cells, { abilityName });
    } catch (err) { console.error("ICON 1.5 | wild card check failed", err); }
  }

  const targets = tokensInCells(cells, { exclude: area.kind === "burst" ? [token.id] : [] });
  _setUserTargets(targets);
  // Switching to the template layer released the token: give it back its selection.
  if (token.isOwner && !token.controlled) token.control({ releaseOthers: false });
  _log(`placed ${area.label} for "${abilityName}" — ${cells.length} cells, ${targets.length} target(s)`);
  ui.notifications.info(`${area.label} placed — ${targets.length ? targets.map(t => t.name).join(", ") : "no one"} in the area.`);
  return { template, cells, targets, area };
}

/**
 * Read the tokens standing in an existing area template (for a second attack
 * roll on the same ability after the tokens moved).
 *
 * `retarget: false` returns who is in the area WITHOUT touching the user's
 * targets: an ICON area attack has one attack target and the rest only take
 * the area effect (p.117), so once the player has narrowed the selection by
 * hand — Shift+T on the map, ✕ in the attack dialog — re-targeting everybody
 * would undo that choice on every roll.
 */
export async function retargetFromTemplate(template, { retarget = true } = {}) {
  const cells = template?.getFlag(FLAG_NS, "cells") ?? [];
  const area  = template?.getFlag(FLAG_NS, "area") ?? {};
  const actorId = template?.getFlag(FLAG_NS, "actorId");
  const own = area.kind === "burst" ? canvas.tokens.placeables.filter(t => t.actor?.id === actorId).map(t => t.id) : [];
  const targets = tokensInCells(cells, { exclude: own });
  if (retarget) _setUserTargets(targets);
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
  if (!area || area.kind === "aura") return undefined;      // an aura is not the attack's area
  const existing = findAreaTemplates({ actorId: actor.id, abilityKey })[0];
  // Reusing a template already on the table: only target from it when the
  // player has nothing targeted, otherwise their own selection wins.
  if (existing) return retargetFromTemplate(existing, { retarget: !game.user?.targets?.size });
  if (!canvas?.ready || !sourceTokenFor(actor)) return undefined;
  return placeAreaTemplate({ actor, area, abilityName, abilityKey });
}

/**
 * Chat summary line for an attack card (safe HTML). With `attackTargetId` the
 * line separates the one token the attack was rolled against from the ones
 * that only take the area effect (p.117).
 */
export function areaSummaryHtml(placement, { attackTargetId = "" } = {}) {
  if (!placement?.area) return "";
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const inArea = placement.targets ?? [];
  const attacked = attackTargetId ? inArea.find(t => t.id === attackTargetId) : null;
  const others = attacked ? inArea.filter(t => t.id !== attacked.id) : inArea;
  const names = attacked
    ? `attack: ${esc(attacked.name)}${others.length ? ` · area: ${others.map(t => esc(t.name)).join(", ")}` : ""}`
    : (inArea.length ? inArea.map(t => esc(t.name)).join(", ") : "no one");
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

  /** @override — a new cell set (aura following its token) must redraw everything. */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (changed.flags?.[FLAG_NS]?.cells) this.renderFlags.set({ refreshShape: true });
  }
}

/**
 * Register the canvas class and the token-following hooks (call from the
 * init hook). Auras stay glued to their token: when it moves, every area
 * template flagged `followTokenId` for it is shifted by the same number of
 * cells. Runs on the active GM's client only (it can update anyone's template).
 */
export function registerAreaTemplates() {
  CONFIG.MeasuredTemplate.objectClass = IconMeasuredTemplate;
  Hooks.on("preUpdateToken", (tokenDoc, changed, options) => {
    // Remember where the token was so updateToken can compute the cell delta.
    if ("x" in changed || "y" in changed) options.iconPrevPos = { x: tokenDoc.x, y: tokenDoc.y };
  });
  Hooks.on("updateToken", async (tokenDoc, changed, options) => {
    if (!options?.iconPrevPos) return;
    if (!canvas?.ready || game.users.activeGM?.id !== game.user.id) return;
    const scene = tokenDoc.parent;
    if (!scene || scene.id !== canvas.scene?.id) return;
    const followers = scene.templates.filter(t => t.flags?.[FLAG_NS]?.followTokenId === tokenDoc.id);
    if (!followers.length) return;
    const grid = canvas.grid;
    const half = grid.size / 2;
    // v13: inside updateToken the document still reports the pre-move x/y
    // (the movement is applied by the animation) — read the new spot from `changed`.
    const before = grid.getOffset({ x: options.iconPrevPos.x + half, y: options.iconPrevPos.y + half });
    const after  = grid.getOffset({ x: (changed.x ?? tokenDoc.x) + half, y: (changed.y ?? tokenDoc.y) + half });
    const di = after.i - before.i, dj = after.j - before.j;
    if (!di && !dj) return;
    const origin = grid.getCenterPoint(after);   // the token's top-left cell, as when the aura was placed
    const updates = followers.map(t => {
      const cells = (t.flags[FLAG_NS].cells ?? []).map(c => ({ i: c.i + di, j: c.j + dj }));
      return { _id: t.id, x: origin.x, y: origin.y, [`flags.${FLAG_NS}.cells`]: cells };
    });
    try { await scene.updateEmbeddedDocuments("MeasuredTemplate", updates); }
    catch (err) { console.warn("[ICON | AreaTemplates] could not move aura templates", err); }
  });
}
