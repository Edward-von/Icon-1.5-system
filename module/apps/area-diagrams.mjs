/**
 * area-diagrams.mjs — The ICON area patterns (pp.97-98) for the Quick Guide:
 * one short screen recording per pattern, taken in Foundry with the system's
 * own placement tool (the range shown around the user, the preview following
 * the mouse, the click, the characters inside becoming targets).
 *
 * The clips are looping, muted WebM files in assets/guide/areas/. They play
 * only for users who haven't asked their system for reduced motion; the
 * others get the player controls instead (QuickGuide wires that up).
 */

const CLIPS = "systems/icon-system/assets/guide/areas";

const ARC = n => `${n} spaces painted one click at a time, in orthogonal steps; it can twist, but never overlaps itself or you. The origin space is you; in an attack, the attack space is any one character in the area.`;

/** The patterns by family: heading, the family's origin / attack space in one
 *  line (p.97), then every clip as [file name, title, caption]. */
const AREA_GROUPS = [
  ["Blast", "Origin and attack space: <strong>the central space</strong>.", [
    ["small-blast",    "Small Blast",      "5 spaces. Range 3 shown: at least one of its spaces must be in range. The centre is the origin and attack space."],
    ["medium-blast",   "Medium Blast",     "9 spaces. Range 3 shown: at least one of its spaces must be in range. The centre is the origin and attack space."],
    ["large-blast",    "Large Blast",      "13 spaces. Range 3 shown: at least one of its spaces must be in range. The centre is the origin and attack space."],
  ]],
  ["Burst", "Origin and attack space: <strong>the central space</strong> — the space or character you pick for Burst (target), you for Burst (self).", [
    ["burst-1-target", "Burst 1 (target)", "Pick a space or character in range (3 here); it and every space within 1 of it are hit. That central space is the origin and attack space."],
    ["burst-1-self",   "Burst 1 (self)",   "Every space within 1 of you. You are the central space, so the origin and attack space; you are not affected unless the ability says so."],
    ["burst-2-self",   "Burst 2 (self)",   "Every space within 2 of you. You are the central space, so the origin and attack space; you are not affected unless the ability says so."],
  ]],
  ["Line", "Origin space: <strong>you</strong>, or <strong>the line's first space</strong> if it has a range. Attack space: <strong>any one character in the area</strong>.", [
    ["line-5",         "Line 5",           "5 spaces drawn orthogonally, each further from you than the last; without a range it starts next to you (you are the origin space), and it turns with the mouse. Width adds spaces on either side. In an attack, the attack space is any one character in the area."],
    ["line-4-range-3", "Line 4, range 3",  "With a range, the line can start anywhere in range (3 here): its first space is the origin space, and the rest runs away from it."],
  ]],
  ["Arc", "Origin space: <strong>you</strong>. Attack space: <strong>any one character in the area</strong>.", [
    ["arc-3",          "Arc 3",            ARC(3)],
    ["arc-4",          "Arc 4",            ARC(4)],
    ["arc-5",          "Arc 5",            ARC(5)],
  ]],
  ["Aura", "Centred on you and moves with you; placing it targets no one.", [
    ["aura-2",         "Aura 2",           "Ongoing: every space within 2 of you, moving with you. Characters are affected while inside; placing it targets no one."],
  ]],
];

/** The whole "Areas" section of the reference. */
export function areaDiagramsHTML() {
  const groups = AREA_GROUPS.map(([heading, key, areas]) => {
    const cards = areas.map(([file, label, caption]) => `
      <figure class="icon-area-card">
        <figcaption class="icon-area-card__title">${label}</figcaption>
        <video class="icon-area-clip" src="${CLIPS}/${file}.webm" loop muted playsinline preload="metadata"
               aria-label="${label}: the area being placed on the map"></video>
        <p class="icon-area-card__text">${caption}</p>
      </figure>`).join("");
    return `
    <h3 class="icon-area-group">${heading}</h3>
    <p class="icon-area-key">${key}</p>
    <div class="icon-area-cards">${cards}</div>`;
  }).join("");
  return `
  <p class="icon-area-legend">Recorded in Foundry with the 📐 placement: <span class="icon-area-legend__range">blue</span> is the
    ability's range, the coloured squares are the area, red corners mark the characters it targets.</p>
  ${groups}
  <p class="icon-area-note">An area with a listed range can go anywhere as long as one of its spaces is in range; without
    a range, one of its spaces must be next to you. Areas count cover and line of sight from their origin space, and can
    hit you too — except Bursts, which skip you unless they say otherwise. In an area attack, a character in the attack
    space gets the to-hit roll and the attack part; everyone else in the area gets the area effect (p.97).</p>`;
}

/**
 * Start the clips of a rendered guide, or give them player controls when the
 * user prefers reduced motion. Safe to call on every render.
 * @param {HTMLElement} root
 */
export function startAreaClips(root) {
  const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  for (const video of root?.querySelectorAll(".icon-area-clip") ?? []) {
    if (still) { video.controls = true; continue; }
    video.autoplay = true;
    video.play?.().catch(() => { /* not visible yet: autoplay takes over */ });
  }
}
