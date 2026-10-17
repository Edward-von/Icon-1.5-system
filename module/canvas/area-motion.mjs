/**
 * area-motion.mjs — terrain-effect areas that move or grow once they are on the map (R33c).
 *
 * Builds on the lasting areas of area-templates.mjs and the `terrain` flag of terrain-spaces.mjs (R33b): a moved
 * area is the same template with its cells shifted, so its terrain flag goes with it and the checks made when a
 * character moves in or out (dangerous terrain, "enters" reminders) keep working.
 *
 *   moving   Shift + arrow keys with the mouse over a lasting area (the owner or the GM) move it 1 space, as + / −
 *            resize an aura (R32). Chat cards carry buttons for the moves the text gives:
 *            Tsunami (p.233) "When you use this ability, choose another edge of the map. When you use this ability,
 *            and at the start of your turns, your tsunami moves 4 spaces in a straight line towards that edge. When a
 *            space of the tsunami would move off the map, the effect ends" — the edge is asked when it is placed and
 *            kept on the template; a card after placing it and at the start of the creator's turn has "Move 4";
 *            STORMLASH "Your active tsunamis move 2 spaces in that direction" — arrows that move them all;
 *            LEGENDARY STORM "moves anywhere from 1 to 4 spaces" from round 4; Waterspout (p.235) "Once during your
 *            turn, you may move the waterspout 1 space" and Ätherwand Talent II (p.226) "At the start of your turn,
 *            you can move the area 1 space in any direction" — arrows at the start of the creator's turn.
 *            "Any non-flying characters in Tsunami when it moves are dragged with it" — never on its own: the card
 *            lists who was inside and "Drag them with it" asks which ones.
 *   growing  Bifröst Talent II (p.226) "Bifröst areas grow by 2 spaces at the end of each round" — a card at the end
 *            of the round, "Add 2 spaces" clicks them as Blood Grove's "Area +N" (extendAreaTemplate); HURRICANE
 *            (p.235) "At round 4 or later, waterspouts grow to a small blast area instead of a single space. They
 *            become dangerous terrain" — a "Grow" button at the start of the creator's turn.
 *
 * The rules are read from the ability's blocks in play when the card is made (selected talent, unlocked mastery),
 * as the objects' growth (map-objects.mjs). Turn and round cards come from the active GM (IconCombat).
 */
import { areaLabel, shapeCells, isPlacingArea } from "./area-templates.mjs";
import { terrainFlag, extendAreaTemplate } from "./terrain-spaces.mjs";
import { areaMotion, areaGrowth, markGrowTo, activeAreaTexts, areaTerrainLabel, areaDamage } from "../helpers/area-terrain.mjs";

const _log = (...a) => console.debug("[ICON | AreaMotion]", ...a);
const NS = "icon-system";
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const cellKey = (c) => `${c.i},${c.j}`;

/** Directions in grid offsets (i = row, j = column). */
const DIRS = {
  up:    { di: -1, dj: 0,  word: "up",    edge: "the top edge",    icon: "fa-arrow-up" },
  down:  { di: 1,  dj: 0,  word: "down",  edge: "the bottom edge", icon: "fa-arrow-down" },
  left:  { di: 0,  dj: -1, word: "left",  edge: "the left edge",   icon: "fa-arrow-left" },
  right: { di: 0,  dj: 1,  word: "right", edge: "the right edge",  icon: "fa-arrow-right" },
};
const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

/** The PC and the ability item behind an ICON template ({} when it is not one). */
function sourceOf(doc) {
  const f = doc?.flags?.[NS];
  if (!f?.cells) return {};
  let actor = null;
  try { actor = f.actorUuid ? fromUuidSync(f.actorUuid) : null; } catch { actor = null; }
  actor ??= game.actors?.get(f.actorId) ?? null;
  const itemId = terrainFlag(doc)?.itemId || String(f.abilityKey ?? "").replace(/:terrain$/, "");
  return { actor, item: actor?.items?.get?.(itemId) ?? null, f };
}

/**
 * The moves and growth that apply to a lasting template, from its ability's blocks in play now, or null. A single
 * space moves only when the text moves it by name (the waterspout): Tsunami's pit "remains even if Tsunami moves on".
 */
function rulesOf(doc) {
  const { actor, item, f } = sourceOf(doc);
  if (!item || !f?.lasting || f.followTokenId) return null;
  const texts = activeAreaTexts(item.system);
  const tf = terrainFlag(doc);
  const mark = !!tf && tf.kind !== "area";
  const name = String(tf?.name ?? "").toLowerCase();
  let motion = areaMotion(texts);
  if (motion && mark) motion = motion.free && name && motion.free.noun === name ? { free: motion.free, freeAlt: motion.freeAlt } : null;
  let growTo = mark ? markGrowTo(texts) : null;
  if (growTo && growTo.noun !== name) growTo = null;
  return { actor, item, f, motion, growth: mark ? null : areaGrowth(texts), growTo, damage: mark ? null : areaDamage(texts) };
}

/**
 * R33c2: a button that posts a damage card for the characters in the area when it is clicked (GUNGNIR, Bifröst
 * Talent II): the card's own Apply buttons deal it, nothing is dealt on its own.
 */
function areaDamageButton(doc, d) {
  const what = `${d.amount}${d.piercing ? " piercing" : ""} damage`;
  return `<div><button type="button" class="icon-btn icon-btn--sm" data-action="iconAreaDamage" data-scene-id="${esc(doc.parent.id)}" data-template-id="${esc(doc.id)}" data-amount="${d.amount}" data-piercing="${d.piercing ? 1 : ""}" title="A damage card for the characters in the area now"><i class="fa-solid fa-bolt"></i> ${esc(what)} to all inside</button></div>`;
}

/** The damage card of areaDamageButton: the characters in the area's spaces now. */
async function postAreaDamage(doc, amount, piercing, only = null) {
  const scene = doc.parent;
  const targets = only ?? tokensIn(scene, doc.flags[NS].cells ?? []);
  if (!targets.length) { ui.notifications.info(`No one is in ${nameOf(doc)}.`); return false; }
  const { actor } = sourceOf(doc);
  const { postAbilityDamageCard } = await import("../combat/damage.mjs");
  const none = { mult: 0, fray: false, flat: 0 };
  await postAbilityDamageCard(actor, {
    parsed: { hit: { ...none }, miss: { ...none }, area: { ...none }, extras: [] },
    outcome: "other",
    other: { mult: 0, fray: false, flat: amount, area: true, label: nameOf(doc) },
    damagedie: actor?.system?.combat?.damagedie ?? "d6",
    fray: 0, abilityName: nameOf(doc), pierce: !!piercing,
    targetIds: targets.map(t => t.id), targetName: targets.map(t => t.name).join(", "),
    statusBonus: false,
  });
  return true;
}

/** Is `cell` inside the scene's map (not its padding)? */
function onMap(scene, cell) {
  const d = scene.dimensions;
  if (!d) return true;
  const size = scene.grid.size;
  const p = scene.grid.getTopLeftPoint(cell);
  return p.x >= d.sceneX - 1 && p.y >= d.sceneY - 1 && p.x + size <= d.sceneX + d.sceneWidth + 1 && p.y + size <= d.sceneY + d.sceneHeight + 1;
}

/** Cells a token document covers on its own scene. */
function cellsOfToken(td) {
  const grid = td.parent.grid;
  const half = grid.size / 2;
  const tl = grid.getOffset({ x: td.x + half, y: td.y + half });
  const out = [];
  for (let di = 0; di < Math.max(1, Math.round(td.height ?? 1)); di++)
    for (let dj = 0; dj < Math.max(1, Math.round(td.width ?? 1)); dj++) out.push({ i: tl.i + di, j: tl.j + dj });
  return out;
}

/** Characters (not map objects) standing in `cells`. */
function tokensIn(scene, cells) {
  const keys = new Set(cells.map(cellKey));
  return scene.tokens.filter(t => t.actor && !t.flags?.[NS]?.mapObject && cellsOfToken(t).some(c => keys.has(cellKey(c))));
}

const nameOf = (doc) => doc.flags[NS].abilityName || doc.flags[NS].area?.label || "Area";

/* -------------------------------------------------- */
/*  Moving                                             */
/* -------------------------------------------------- */

/**
 * Move an area already on the map by `steps` spaces in a direction. Its terrain flag goes with it. Off the map: the
 * text's "would move off the map, the effect ends" asks to remove it; otherwise it stops at the edge. Characters
 * inside are never moved: with a "dragged with it" text, a card lists them with "Drag them with it".
 * @param {MeasuredTemplateDocument} doc
 * @param {string} dir    up / down / left / right
 * @param {number} steps
 * @param {{quiet?: boolean, edge?: boolean}} [opts]  quiet: a notification instead of a card (Shift + arrow)
 * @returns {Promise<number>} spaces moved
 */
export async function moveArea(doc, dir, steps, { quiet = false, edge = false } = {}) {
  const scene = doc?.parent;
  const f = doc?.flags?.[NS];
  const d = DIRS[dir];
  if (!scene || !f?.cells?.length || !d || !(steps > 0)) return 0;
  if (!(doc.isOwner || game.user.isGM)) { ui.notifications.warn("Only the one who placed the area or the GM can move it."); return 0; }
  const rules = rulesOf(doc);
  const name = nameOf(doc);
  const shifted = (k) => f.cells.map(c => ({ i: c.i + d.di * k, j: c.j + d.dj * k }));
  let n = steps;
  if (!shifted(n).every(c => onMap(scene, c))) {
    if (rules?.motion?.offMapEnds) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: `${name} — edge of the map` },
        content: `<p>A space of <strong>${esc(name)}</strong> would move off the map.</p><p><small>${esc(rules.motion.edge?.rule ?? "")} When a space of the tsunami would move off the map, the effect ends (p.233).</small></p><p>Remove it?</p>`,
        yes: { label: "Remove it" }, no: { label: "Keep it" }, rejectClose: false,
      }) ?? false;
      if (ok) await scene.deleteEmbeddedDocuments("MeasuredTemplate", [doc.id]);
      return 0;
    }
    while (n > 0 && !shifted(n).every(c => onMap(scene, c))) n--;
    if (!n) { ui.notifications.warn(`${name} can't move off the map.`); return 0; }
  }
  const inside = tokensIn(scene, f.cells);
  const size = scene.grid.size;
  await doc.update({ x: doc.x + d.dj * n * size, y: doc.y + d.di * n * size, [`flags.${NS}.cells`]: shifted(n) });
  const how = `${n} space${n > 1 ? "s" : ""} ${edge ? `toward ${d.edge}` : d.word}${n < steps ? ` (stopped at the edge of the map, ${steps} asked)` : ""}`;
  _log(`${name} moved ${how}`);
  const drag = !!rules?.motion?.drag && inside.length;
  if (quiet && !drag) {
    ui.notifications.info(`${name} moved ${how}.${inside.length ? ` It was over ${inside.map(t => t.name).join(", ")}: they stay where they are.` : ""}`, { console: false });
    return n;
  }
  const lines = [];
  if (inside.length) {
    lines.push(`<p>In it when it moved: ${esc(inside.map(t => t.name).join(", "))}.</p>`);
    if (drag) {
      lines.push(`<p><small>"Any non-flying characters in Tsunami when it moves are dragged with it, shoving them. If they are blocked by obstructions, they collide which could cause Tsunami to move on without them." (p.233)</small></p>`);
      lines.push(`<div><button type="button" class="icon-btn icon-btn--sm" data-action="iconAreaDrag" data-scene-id="${esc(scene.id)}" data-token-ids="${esc(inside.map(t => t.id).join(","))}" data-dir="${dir}" data-steps="${n}" title="Ask which ones, then move them by the same spaces"><i class="fa-solid fa-person-walking-arrow-right"></i> Drag them with it</button></div>`);
    }
  }
  if (rules?.motion?.afterMove) lines.push(`<p><small>${esc(rules.motion.afterMove.source)}: ${esc(rules.motion.afterMove.rule)}</small></p>`);
  await ChatMessage.create({
    speaker: rules?.actor ? ChatMessage.getSpeaker({ actor: rules.actor }) : ChatMessage.getSpeaker(),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-arrows-up-down-left-right"></i> ${esc(name)}</strong> moves ${esc(how)}.${lines.join("")}</div>`,
  });
  return n;
}

/** "Drag them with it": the characters ticked move by the area's spaces (the ones this user may move). */
async function dragTokens(scene, ids, dir, steps) {
  const d = DIRS[dir];
  const tds = ids.map(id => scene.tokens.get(id)).filter(Boolean);
  if (!d || !tds.length) { ui.notifications.info("No one left to drag."); return; }
  const picked = await foundry.applications.api.DialogV2.wait({
    window: { title: "Drag with the area" },
    content: `<p>Move these characters ${steps} space${steps > 1 ? "s" : ""} ${d.word} with the area? Untick the flying ones and anyone blocked (they collide instead).</p>
      ${tds.map(t => `<label style="display:block"><input type="checkbox" name="t-${esc(t.id)}" checked> ${esc(t.name)}</label>`).join("")}`,
    buttons: [
      { action: "drag", label: "Drag them", default: true, callback: (_e, button) => tds.filter(t => button.form?.elements?.[`t-${t.id}`]?.checked) },
      { action: "cancel", label: "Cancel", callback: () => null },
    ],
    rejectClose: false,
  }).catch(() => null);
  if (!picked?.length) return;
  const mine = picked.filter(t => t.isOwner);
  const others = picked.filter(t => !t.isOwner);
  const size = scene.grid.size;
  if (mine.length) {
    await scene.updateEmbeddedDocuments("Token", mine.map(t => ({ _id: t.id, x: t.x + d.dj * steps * size, y: t.y + d.di * steps * size })), { iconObjectMove: true });
  }
  if (others.length) ui.notifications.warn(`Ask the GM to move ${others.map(t => t.name).join(", ")}: you can't move them.`);
}

/** Buttons for the moves the text gives an area (card after placing it, start of the creator's turn). */
function motionButtons(doc, rules, round) {
  const m = rules?.motion;
  if (!m) return "";
  const scene = doc.parent;
  const dirKey = doc.flags[NS].motion?.dir;
  const btn = (dir, steps, label, extra = "", title = "") =>
    `<button type="button" class="icon-btn icon-btn--sm" data-action="iconAreaMove" data-scene-id="${esc(scene.id)}" data-template-id="${esc(doc.id)}" data-dir="${dir}" data-steps="${steps}" ${extra} title="${esc(title)}"><i class="fa-solid ${DIRS[dir].icon}"></i>${label ? ` ${esc(label)}` : ""}</button>`;
  const arrows = (steps, extra = "", group = "") => Object.keys(DIRS).map(k => btn(k, steps, "", `${extra} data-group="${group}"`, `Move ${steps} ${DIRS[k].word}`)).join(" ");
  const out = [];
  if (m.edge) {
    const legendary = m.range && (Number(round) || 0) >= m.range.round;
    if (dirKey && DIRS[dirKey]) {
      out.push(`<p>${esc(m.edge.rule)}</p><div>${legendary
        ? Array.from({ length: m.range.max - m.range.min + 1 }, (_, k) => btn(dirKey, m.range.min + k, `${m.range.min + k}`, `data-edge="1" data-group="edge-${doc.id}"`, `Move ${m.range.min + k} toward ${DIRS[dirKey].edge}`)).join(" ")
        : btn(dirKey, m.edge.steps, `Move ${m.edge.steps} toward ${DIRS[dirKey].edge}`, `data-edge="1" data-group="edge-${doc.id}"`)}</div>`);
      if (legendary) out.push(`<p><small>${esc(m.range.source)}: ${esc(m.range.rule)}</small></p>`);
    } else {
      out.push(`<p>${esc(m.edge.rule)} No edge chosen yet: pick it.</p><div>${Object.keys(DIRS).map(k => btn(k, m.edge.steps, DIRS[k].edge.replace(/^the /, ""), `data-edge="1" data-set-dir="1" data-group="edge-${doc.id}"`)).join(" ")}</div>`);
    }
  }
  if (m.lash) out.push(`<p><strong>${esc(m.lash.source)}</strong>: ${esc(m.lash.rule)}</p><div>${arrows(m.lash.steps, `data-all="1"`)}</div>`);
  if (m.free) {
    out.push(`<p>${esc(m.free.source ? `${m.free.source}: ` : "")}${esc(m.free.rule)}</p><div>${arrows(m.free.steps, "", `free-${doc.id}`)}</div>`);
    if (m.freeAlt) out.push(`<p><small>${esc(m.freeAlt.source)}: ${esc(m.freeAlt.rule)}</small></p><div>${arrows(m.freeAlt.steps, "", `free-${doc.id}`)}</div>`);
  }
  return out.join("");
}

/** Ask which edge of the map a Tsunami heads for (Top / Bottom / Left / Right), or null. */
async function askEdge(name, rule) {
  try {
    return await foundry.applications.api.DialogV2.wait({
      window: { title: `${name} — which edge?` },
      content: `<p>${esc(rule)}</p><p>Choose the edge of the map it moves towards:</p>`,
      buttons: Object.entries(DIRS).map(([k, d], i) => ({ action: k, label: d.edge.replace(/^the /, "").replace(/^\w/, c => c.toUpperCase()), default: i === 1 })),
      rejectClose: false,
    });
  } catch { return null; }
}

/**
 * Right after a lasting area of a PC's ability is placed (IconSheet): an area that heads for an edge asks which one
 * and keeps it (Tsunami); a card offers the move the text makes "when you use this ability" and its other moves.
 * @param {MeasuredTemplateDocument} doc
 * @param {Actor} actor
 * @param {Item} item
 */
export async function afterAreaPlaced(doc, actor, item) {
  const rules = rulesOf(doc);
  const m = rules?.motion;
  if (!m?.edge && !m?.lash) return;
  if (m.edge) {
    const dir = await askEdge(item?.name ?? nameOf(doc), m.edge.rule);
    if (dir && DIRS[dir]) await doc.setFlag(NS, "motion", { dir });
  }
  const buttons = motionButtons(doc, rules, game.combat?.round);
  if (!buttons) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-arrows-up-down-left-right"></i> ${esc(item?.name ?? nameOf(doc))}</strong> placed${m.edge?.onUse ? ": it moves now, and at the start of your turns" : ""}.${buttons}<p><small>Shift + arrow keys with the mouse over the area move it 1 space.</small></p></div>`,
  });
}

/* -------------------------------------------------- */
/*  Turn and round                                     */
/* -------------------------------------------------- */

/** The lasting templates `actor` placed on `scene`, with their rules. */
function rulesFor(scene, actor) {
  if (!scene || !actor) return [];
  return scene.templates.filter(t => t.flags?.[NS]?.actorId === actor.id && t.flags[NS].lasting && !t.flags[NS].followTokenId)
    .map(doc => ({ doc, rules: rulesOf(doc) })).filter(e => e.rules);
}

/**
 * Start of `combatant`'s turn (active GM, IconCombat): the areas they placed that move at the start of their turn
 * or once during it (Tsunami, Waterspout, Ätherwand Talent II), and the waterspouts that grow from round 4
 * (HURRICANE), in one card with the buttons.
 * @param {Combatant} combatant
 */
export async function areaTurnStart(combatant) {
  const actor = combatant?.actor;
  const scene = combatant?.token?.parent ?? combatant?.parent?.scene ?? canvas?.scene;
  const round = Number(combatant?.parent?.round) || 0;
  const lines = [];
  for (const { doc, rules } of rulesFor(scene, actor)) {
    const m = rules.motion;
    const name = nameOf(doc);
    const parts = [];
    if (m?.edge || (m?.free && ["start", "turn"].includes(m.free.at))) {
      const only = m.edge ? { ...rules, motion: { ...m, lash: null } } : rules;
      parts.push(motionButtons(doc, only, round));
    }
    const g = rules.growTo;
    if (g && round >= g.round && (doc.flags[NS].cells?.length ?? 0) === 1) {
      parts.push(`<p>${esc(g.source)}: ${esc(g.rule)}</p><div><button type="button" class="icon-btn icon-btn--sm" data-action="iconAreaGrowTo" data-scene-id="${esc(scene.id)}" data-template-id="${esc(doc.id)}" title="It becomes a ${esc(areaLabel({ kind: "blast", size: g.size }))} around its space"><i class="fa-solid fa-expand"></i> Grow to ${esc(areaLabel({ kind: "blast", size: g.size }))}</button></div>`);
    }
    // R33c2: GUNGNIR (p.225) "At the start and end of your turn, you may deal 1 piercing damage to all characters in the area".
    const dt = rules.damage?.turn;
    if (dt?.start) parts.push(`<p>${esc(dt.source)}: ${esc(dt.rule)}</p>${areaDamageButton(doc, dt)}`);
    if (parts.length) lines.push(`<p><strong>${esc(name)}</strong></p>${parts.join("")}`);
  }
  noteLeaveStart(combatant, scene);
  if (!lines.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-arrows-up-down-left-right"></i> Start of ${esc(actor.name)}'s turn — areas</strong>${lines.join("")}</div>`,
  });
}

// River Guardians (p.169): the areas with a "start inside, end outside" rule each combatant started their turn in,
// noted by the active GM at the start of the turn (combatant id → template ids). On this client only: a reload in
// the middle of a turn loses it, and the end of that turn says nothing.
const _startedInside = new Map();
const isFoeToken = (td) => td?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE || ["foe", "legend"].includes(td?.actor?.type);

/** The lasting areas on `scene` with a River Guardians rule, with it. */
function leaveAreas(scene) {
  if (!scene) return [];
  return scene.templates.filter(t => t.flags?.[NS]?.lasting && !t.flags[NS].followTokenId)
    .map(doc => ({ doc, leave: rulesOf(doc)?.damage?.leave })).filter(e => e.leave);
}

function noteLeaveStart(combatant, scene) {
  _startedInside.delete(combatant?.id);
  const td = combatant?.token;
  if (!td || !isFoeToken(td)) return;
  const mine = cellsOfToken(td).map(cellKey);
  const ids = leaveAreas(scene).filter(({ doc }) => (doc.flags[NS].cells ?? []).some(c => mine.includes(cellKey(c)))).map(({ doc }) => doc.id);
  if (ids.length) _startedInside.set(combatant.id, ids);
}

/**
 * End of `combatant`'s turn (active GM, IconCombat): GUNGNIR's "At the start and end of your turn, you may deal 1
 * piercing damage to all characters in the area" (p.225) for the areas they placed, and River Guardians' "Foes that
 * start their turn inside the area that end their turn outside of it take 2 damage and are dazed" (Mist Strider's
 * mastery p.169) for a foe that did. Cards with buttons: nothing is dealt or given without a click.
 * @param {Combatant} combatant
 */
export async function areaTurnEnd(combatant) {
  const actor = combatant?.actor;
  const td = combatant?.token;
  const scene = td?.parent ?? combatant?.parent?.scene ?? canvas?.scene;
  if (!scene || !actor) return;
  const lines = [];
  for (const { doc, rules } of rulesFor(scene, actor)) {
    const dt = rules.damage?.turn;
    if (dt?.end) lines.push(`<p><strong>${esc(nameOf(doc))}</strong></p><p>${esc(dt.source)}: ${esc(dt.rule)}</p>${areaDamageButton(doc, dt)}`);
  }
  const started = _startedInside.get(combatant.id) ?? [];
  _startedInside.delete(combatant.id);
  if (td && started.length) {
    const mine = cellsOfToken(td).map(cellKey);
    const { insideStatusButton } = await import("./terrain-spaces.mjs");
    for (const { doc, leave } of leaveAreas(scene)) {
      if (!started.includes(doc.id) || (doc.flags[NS].cells ?? []).some(c => mine.includes(cellKey(c)))) continue;
      const what = `${leave.amount}${leave.piercing ? " piercing" : ""} damage`;
      lines.push(`<p><strong>${esc(td.name)}</strong> started the turn inside <strong>${esc(nameOf(doc))}</strong> and ends it outside.</p><p><small>${esc(leave.source)}: ${esc(leave.rule)}</small></p>
        <div><button type="button" class="icon-btn icon-btn--sm" data-action="iconAreaLeaveDamage" data-scene-id="${esc(scene.id)}" data-template-id="${esc(doc.id)}" data-token-id="${esc(td.id)}" data-amount="${leave.amount}" data-piercing="${leave.piercing ? 1 : ""}"><i class="fa-solid fa-bolt"></i> ${esc(what)} to ${esc(td.name)}</button>
        ${leave.status ? insideStatusButton(td, leave.status, { label: `${leave.status[0].toUpperCase()}${leave.status.slice(1)} to ${td.name}` }) : ""}</div>`);
    }
  }
  if (!lines.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-bolt"></i> End of ${esc(actor.name)}'s turn — areas</strong>${lines.join("")}</div>`,
  });
}

/**
 * End of a round (active GM, IconCombat): the areas that grow at the end of each round (Bifröst Talent II), one card
 * per area with "Add N spaces" (the spaces are clicked, adjacent to the area) and what the growth sets off.
 * @param {Combat} combat
 */
export async function areaRoundEnd(combat) {
  const scene = combat?.scene ?? canvas?.scene;
  if (!scene) return;
  const actors = new Map();
  for (const t of scene.templates) {
    const id = t.flags?.[NS]?.actorId;
    if (id && t.flags[NS].lasting && !actors.has(id)) actors.set(id, sourceOf(t).actor);
  }
  for (const actor of actors.values()) {
    for (const { doc, rules } of rulesFor(scene, actor)) {
      const g = rules.growth;
      if (!g) continue;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-expand"></i> End of round ${Math.max(1, (Number(combat.round) || 1) - 1)} — ${esc(nameOf(doc))}</strong>
          <p>${esc(g.source)}: ${esc(g.rule)}</p>${g.note ? `<p><small>${esc(g.note)}</small></p>` : ""}
          <div><button type="button" class="icon-btn icon-btn--sm" data-action="iconAreaGrow" data-scene-id="${esc(scene.id)}" data-template-id="${esc(doc.id)}" data-count="${g.count}" data-source="${esc(g.source)}" data-note="${esc(g.note)}" title="Click ${g.count} spaces adjacent to the area"><i class="fa-solid fa-expand"></i> Add ${g.count} space${g.count > 1 ? "s" : ""}</button></div>${rules.damage?.grow ? areaDamageButton(doc, rules.damage.grow) : ""}</div>`,
      });
    }
  }
}

/** HURRICANE: a one-space waterspout becomes a blast around its space, dangerous terrain. */
async function growToBlast(doc) {
  const rules = rulesOf(doc);
  const g = rules?.growTo;
  const f = doc.flags[NS];
  if (!g || f.cells?.length !== 1) { ui.notifications.info("It has already grown."); return false; }
  if (!(doc.isOwner || game.user.isGM)) { ui.notifications.warn("Only the one who placed it or the GM can change it."); return false; }
  const cells = shapeCells({ kind: "blast", size: g.size }, f.cells[0]);
  const tf = terrainFlag(doc) ?? {};
  const terrain = { ...tf, dangerous: !!tf.dangerous || g.dangerous };
  terrain.label = areaTerrainLabel({ ...terrain, name: tf.name || "" });
  const area = { ...f.area, kind: "blast", size: g.size };
  area.label = `${areaLabel(area)}${tf.name ? ` · ${tf.name}` : ""}`;
  await doc.update({ [`flags.${NS}.cells`]: cells, [`flags.${NS}.area`]: area, [`flags.${NS}.terrain`]: terrain });
  await ChatMessage.create({
    speaker: rules.actor ? ChatMessage.getSpeaker({ actor: rules.actor }) : ChatMessage.getSpeaker(),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-expand"></i> ${esc(nameOf(doc))}</strong> grows to a ${esc(areaLabel({ kind: "blast", size: g.size }))}${g.dangerous ? " and becomes dangerous terrain" : ""} (${esc(g.source)}).</div>`,
  });
  return true;
}

/* -------------------------------------------------- */
/*  Hooks                                              */
/* -------------------------------------------------- */

/** The lasting area under the mouse that this user may move (the smallest, with overlaps), or null. */
function movableUnderMouse() {
  if (!canvas?.ready || !canvas.scene || !canvas.mousePosition) return null;
  const c = canvas.grid.getOffset(canvas.mousePosition);
  const under = canvas.scene.templates.filter(t => {
    const f = t.flags?.[NS];
    return f?.lasting && !f.followTokenId && (t.isOwner || game.user.isGM) && (f.cells ?? []).some(k => k.i === c.i && k.j === c.j);
  });
  under.sort((a, b) => a.flags[NS].cells.length - b.flags[NS].cells.length);
  return under[0] ?? null;
}

export function registerAreaMotion() {
  // Shift + arrow with the mouse over a lasting area: move it 1 space. Not while typing, nor while an area is being
  // placed, nor over a sheet or the sidebar (canvas.mousePosition keeps the last spot on the board).
  let overBoard = false;
  window.addEventListener("pointermove", (ev) => { overBoard = !!canvas?.app?.view && ev.target === canvas.app.view; }, { capture: true, passive: true });
  window.addEventListener("keydown", (ev) => {
    const dir = KEYS[ev.key];
    if (!dir || !ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!overBoard || isPlacingArea()) return;
    const el = document.activeElement;
    if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
    const doc = movableUnderMouse();
    if (!doc) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (!ev.repeat) moveArea(doc, dir, 1, { quiet: true }).catch(err => console.warn("[ICON | AreaMotion] move failed", err));
  }, { capture: true });

  Hooks.on("renderChatMessageHTML", (_message, html) => {
    for (const btn of html.querySelectorAll('[data-action^="iconArea"]')) {
      if (btn.dataset.iconBound) continue;
      btn.dataset.iconBound = "true";
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const ds = btn.dataset;
        const scene = game.scenes?.get(ds.sceneId);
        if (!scene) { ui.notifications.warn("That scene is gone."); return; }
        try {
          if (ds.action === "iconAreaDrag") {
            await dragTokens(scene, String(ds.tokenIds ?? "").split(",").filter(Boolean), ds.dir, Number(ds.steps) || 0);
            return;
          }
          const doc = scene.templates.get(ds.templateId);
          if (!doc) { ui.notifications.info("That area is no longer on the map."); return; }
          if (ds.action === "iconAreaMove") {
            if (ds.setDir) await doc.setFlag(NS, "motion", { dir: ds.dir });
            // STORMLASH moves all the creator's areas of that ability.
            const f = doc.flags[NS];
            const docs = ds.all ? scene.templates.filter(t => t.flags?.[NS]?.actorId === f.actorId && t.flags[NS].abilityKey === f.abilityKey && t.flags[NS].lasting && !t.flags[NS].followTokenId) : [doc];
            let moved = 0;
            for (const d of docs) moved += await moveArea(d, ds.dir, Number(ds.steps) || 1, { edge: !!ds.edge });
            // A move the text allows once (toward the edge, "once during your turn"): its row goes grey.
            if (moved && ds.group) for (const b of html.querySelectorAll(`[data-group="${ds.group}"]`)) { b.disabled = true; b.style.opacity = "0.5"; }
          } else if (ds.action === "iconAreaGrow") {
            const { actor } = sourceOf(doc);
            const n = await extendAreaTemplate(doc, Number(ds.count) || 1, { actor, name: nameOf(doc), source: ds.source ?? "", note: ds.note ?? "" });
            if (n) { btn.disabled = true; btn.style.opacity = "0.5"; }
          } else if (ds.action === "iconAreaGrowTo") {
            if (await growToBlast(doc)) { btn.disabled = true; btn.style.opacity = "0.5"; }
          } else if (ds.action === "iconAreaDamage" || ds.action === "iconAreaLeaveDamage") {
            // R33c2: a damage card (GUNGNIR, Bifröst Talent II, River Guardians); its Apply buttons deal it.
            const only = ds.action === "iconAreaLeaveDamage" ? [scene.tokens.get(ds.tokenId)].filter(Boolean) : null;
            if (only && !only.length) { ui.notifications.info("That character is no longer on the scene."); return; }
            if (await postAreaDamage(doc, Number(ds.amount) || 1, !!ds.piercing, only)) { btn.disabled = true; btn.style.opacity = "0.5"; }
          }
        } catch (err) { console.warn("[ICON | AreaMotion] button failed", err); }
      });
    }
  });
}
