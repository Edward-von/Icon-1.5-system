/**
 * area-diagrams.mjs — Illustrated list of the ICON area patterns (pp.97-98)
 * for the rules reference: Blasts, Bursts, Line, Arcs, Aura, drawn on a
 * top-down grid the way the VTT highlights them while placing.
 *
 * The cells come from the same geometry as the real placement
 * (`shapeCells` / `cellsInRange` in canvas/area-templates.mjs) and use the same
 * colours, so the pictures can't drift from what the table sees. Each area
 * cell fades in after the previous one (CSS `icon-area-place` in icon.css),
 * which reads as the template being laid down; the animation is switched off
 * for users who ask for reduced motion.
 */

import { AREA_COLORS, shapeCells, cellsInRange } from "../canvas/area-templates.mjs";

const CELL = 15;                 // px per grid space in the diagram
const STEP = 0.12;               // s between two cells appearing
const key  = c => `${c.i},${c.j}`;

/* Arcs are painted by hand on the table, so the examples are hand-picked
 * paths: contiguous, orthogonal steps, twisting, never on the user (p.97). */
const ARC_PATHS = {
  3: [{ i: 2, j: 3 }, { i: 2, j: 4 }, { i: 3, j: 4 }],
  4: [{ i: 2, j: 2 }, { i: 1, j: 2 }, { i: 1, j: 3 }, { i: 1, j: 4 }],
  5: [{ i: 4, j: 2 }, { i: 4, j: 3 }, { i: 4, j: 4 }, { i: 3, j: 4 }, { i: 2, j: 4 }],
};

/**
 * Every diagram: `user` is the ability user's space, `cells` the area in the
 * order they appear, `focus` the origin / attack space (darker), `range` the
 * faint highlight of where the area may go.
 */
function diagrams() {
  const user = { i: 3, j: 0 };
  const self = { i: 3, j: 3 };
  const blastAt = { i: 3, j: 4 };
  const ringOrder = (cells, from) => cells.slice().sort((a, b) =>
    Math.max(Math.abs(a.i - from.i), Math.abs(a.j - from.j)) - Math.max(Math.abs(b.i - from.i), Math.abs(b.j - from.j))
    || (Math.abs(a.i - from.i) + Math.abs(a.j - from.j)) - (Math.abs(b.i - from.i) + Math.abs(b.j - from.j)));

  const blast = (size, label, n) => ({
    label, kind: "blast", user, focus: blastAt, range: cellsInRange([user], 3),
    cells: ringOrder(shapeCells({ kind: "blast", size }, blastAt), blastAt),
    caption: `${n} spaces. Range 3 shown: at least one of its spaces must be in range. The centre is the attack space.`,
  });
  const selfBurst = r => ({
    label: `Burst ${r} (self)`, kind: "burst", user: self, focus: null, range: null,
    cells: ringOrder(cellsInRange([self], r), self),
    caption: `Every space within ${r} of you. You are not affected unless the ability says so.`,
  });

  return [
    blast("s", "Small Blast", 5),
    blast("m", "Medium Blast", 9),
    blast("l", "Large Blast", 13),
    {
      label: "Burst 1 (target)", kind: "burst", user, focus: { i: 3, j: 3 }, range: cellsInRange([user], 3),
      cells: ringOrder(shapeCells({ kind: "burst", size: 1 }, { i: 3, j: 3 }), { i: 3, j: 3 }),
      caption: "Pick a space or character in range (3 here); it and every space within 1 of it are hit.",
    },
    selfBurst(1),
    selfBurst(2),
    {
      label: "Line 5", kind: "line", user, focus: null, range: null,
      cells: shapeCells({ kind: "line", size: 5 }, { i: 3, j: 1 }, { dir: { di: 0, dj: 1 } }),
      caption: "5 spaces drawn orthogonally, each further from you than the last; without a range it starts next to you. Width adds spaces on either side.",
    },
    ...[3, 4, 5].map(n => ({
      label: `Arc ${n}`, kind: "arc", user: self, focus: null, range: null,
      cells: ARC_PATHS[n],
      caption: `${n} spaces drawn one by one in orthogonal steps; it can twist, but never overlaps itself or you.`,
    })),
    {
      label: "Aura 2", kind: "aura", user: self, focus: null, range: null,
      cells: ringOrder(cellsInRange([self], 2), self),
      caption: "Ongoing: every space within 2 of you, moving with you. Characters are affected while inside.",
    },
  ];
}

/** One diagram as an inline SVG. */
function diagramSVG(d) {
  const all = [d.user, ...d.cells, ...(d.range ?? [])];
  const i0 = Math.min(...all.map(c => c.i)) - 1, i1 = Math.max(...all.map(c => c.i)) + 1;
  const j0 = Math.min(...all.map(c => c.j)) - 1, j1 = Math.max(...all.map(c => c.j)) + 1;
  const rows = i1 - i0 + 1, cols = j1 - j0 + 1;
  const x = c => (c.j - j0) * CELL, y = c => (c.i - i0) * CELL;
  const color = AREA_COLORS[d.kind] ?? AREA_COLORS.blast;
  const inArea = new Set(d.cells.map(key));

  const grid = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    grid.push(`<rect x="${(j - j0) * CELL}" y="${(i - i0) * CELL}" width="${CELL}" height="${CELL}" class="icon-area-grid"/>`);
  }
  const range = (d.range ?? []).filter(c => !inArea.has(key(c)))
    .map(c => `<rect x="${x(c)}" y="${y(c)}" width="${CELL}" height="${CELL}" class="icon-area-range"/>`);
  const cells = d.cells.map((c, n) => {
    const focus = d.focus && key(d.focus) === key(c);
    return `<rect x="${x(c) + 1}" y="${y(c) + 1}" width="${CELL - 2}" height="${CELL - 2}" rx="2"
      class="icon-area-cell${focus ? " icon-area-cell--focus" : ""}" fill="${color}" style="animation-delay:${(n * STEP).toFixed(2)}s"/>`;
  });
  const r = CELL / 2;
  const userMark = `<circle cx="${x(d.user) + r}" cy="${y(d.user) + r}" r="${r - 2.5}" class="icon-area-user"/>`;

  return `<svg class="icon-area-svg" viewBox="0 0 ${cols * CELL} ${rows * CELL}" width="${cols * CELL}" height="${rows * CELL}"
    role="img" aria-label="${d.label}">${grid.join("")}${range.join("")}${cells.join("")}${userMark}</svg>`;
}

/** The whole "Areas" section of the reference. */
export function areaDiagramsHTML() {
  const cards = diagrams().map(d => `
    <figure class="icon-area-card">
      <figcaption class="icon-area-card__title">${d.label}</figcaption>
      ${diagramSVG(d)}
      <p class="icon-area-card__text">${d.caption}</p>
    </figure>`).join("");
  return `
  <div class="icon-area-legend">
    <span><i class="icon-area-legend__user"></i> you</span>
    <span><i class="icon-area-legend__range"></i> range</span>
    <span><i class="icon-area-legend__focus"></i> attack / origin space</span>
  </div>
  <div class="icon-area-cards">${cards}</div>
  <p class="icon-area-note">An area with a listed range can go anywhere as long as one of its spaces is in range; without
    a range, one of its spaces must be next to you. Areas count cover and line of sight from their origin, and can hit
    you too — except Bursts, which skip you unless they say otherwise (p.97).</p>`;
}
