/**
 * infuse.mjs — the Wright's Infuse versions of an ability.
 *
 * "Infuse: Wright only. Triggers when Aether is spent on an ability" (p.117).
 * The book prints the upgrade as its own block — "Infuse 3: CRYOTIC — Change
 * area to Line 8…", "Infuse X: ÄTHERSTURM — extend the area by 1 space for
 * every Aether infused" — so the cost and the name are already in the text and
 * don't need a new field on every ability.
 *
 * Arming an infusion spends the Aether and records it on the actor
 * (`flags.icon-system.infused`), the same way a spent combo token is recorded,
 * so the next roll of that ability knows which version is in play.
 *
 * "Aether is consumed at the start of the action" (p.204): the infused
 * version is good for one use. One use is several clicks (card, attack roll,
 * damage roll, area), so each step marks how far the use has gone
 * (noteInfusionStep); a step that comes again, or goes back (a second card,
 * a second attack after the damage), is the next use and finds the infusion
 * gone (startInfusionStep). A used infusion also lapses when the turn it was
 * used in ends (armedInfusion). Placing its object or terrain spends it at
 * once (map-objects, terrain-spaces); cancelling refunds it only before use;
 * the end of combat drops it with the rest of the Wright's Aether.
 */

import { SECTION_LABELS, escapeHTML } from "./enrich.mjs";
import { gridDistance } from "../combat/defenses.mjs";

const _log = (...a) => console.debug("[ICON | Infuse]", ...a);
const NS = "icon-system";

/**
 * "Infuse 3" → 3, "Infuse X" → null (the player picks how much). Also the
 * blocks Slay triggers too: "Slay or Infuse 3" (Nothung's GRAM p.225, Blitz's
 * GRAN BLITZ), "Infuse 3 or Slay" (Drifting Leaf's PHANTOM BLADE p.227).
 */
export function infuseCost(label) {
  const m = /^(?:slay\s+or\s+)?infuse\s+(\d+|x)(?:\s+or\s+slay)?(?:\s*\(mastery\))?$/i.exec(String(label ?? "").trim());
  if (!m) return undefined;
  return /^x$/i.test(m[1]) ? null : Number(m[1]);
}

/**
 * The name the book gives the infused version: "CRYOTIC" from "CRYOTIC — …",
 * and "STORMLASH" from "STORMLASH (Free Action) — …".
 */
export function infuseName(text) {
  const m = /^\s*([A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\s]{2,})(?:\s*\([^)]*\))?\s*[—-]/.exec(String(text ?? ""));
  return m ? m[1].trim() : "";
}

/**
 * True when the infused version is an action of its own rather than an
 * upgrade of the next use: the book gives it its own cost after the name,
 * "Infuse 1: STORMLASH (Free Action) — Choose an edge of the map. Your active
 * tsunamis move 2 spaces in that direction." (Tsunami, Stormbender p.233).
 * Nothing is rolled for it, so it is spent and posted at once, not armed.
 */
export function isStandaloneInfusion(text) {
  return /^\s*[A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\s]{2,}\(\s*(?:[Ff]ree [Aa]ction|\d+\s+[Aa]ctions?|[Ii]nterrupt\b[^)]*)\s*\)\s*[—–-]/.test(String(text ?? ""));
}

/**
 * The infused version a Mastery adds, as one more Infuse block — or [] when
 * the mastery isn't unlocked or isn't one. Seven Wright masteries are a
 * bigger infusion of their ability: "GREAT SPIRIT LANCE: Infuse 6 — 2
 * actions, Attack, Line 10, Width 3…" (Lance), MAGNACRYO / MAGNAGEO /
 * MAGNAPYRE / MAGNABIO / MAGNARIME, TIDAL SMASH. They only lived in the
 * mastery text, so the panel never offered them. The label says "(Mastery)"
 * so it can't clash with the ability's own Infuse block of the same cost.
 * @param {object} system  the ability's system data
 * @returns {Array<{label:string, text:string}>}
 */
export function masteryInfusion(system) {
  if (!system?.masteryUnlocked) return [];
  const text = String(system.mastery ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const m = /^([^:—]+?):\s*Infuse\s+(\d+|X)\s*[—–-]\s*(.+)$/i.exec(text);
  if (!m) return [];
  return [{ label: `Infuse ${m[2].toUpperCase()} (Mastery)`, text: `${m[1].trim().toUpperCase()} — ${m[3]}` }];
}

/**
 * The Infuse versions of a Limit Break, as Infuse blocks. Its effect is one
 * text block with the versions written inline: "Infuse 6: TETRAFLARE — Deal
 * [D]+fray twice instead." (Gigaflare p.208), "Slay or Infuse 3: RAGNARÖK —
 * After this ability resolves…" (Gran Levincross); the Ultimate (chapter 3,
 * p.113) puts the name first: "METEOR — Infuse 8: 6 resolve. Deal [D]+fray
 * four times instead.", "GÖTTERDÄMMERUNG — Infuse 6: …".
 * Each block: `label` "Infuse N", `text` "NAME — rest" (read by infuseName),
 * `body` the rest alone, `source` "Limit Break" / "Ultimate", `slay` when Slay
 * also triggers it, `resolveCost` when the version names its own ("6 resolve").
 * @param {object} system  the limit-break item's system data
 * @param {{ultimate?: boolean}} opts  ultimate unlocked (chapter 3)
 */
export function limitBreakInfusions(system, { ultimate = false } = {}) {
  const plain = (t) => String(t ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const CAPS = "[A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\\s]{2,}?";
  const marker = new RegExp(`(?:\\b(${CAPS})\\s*[—–-]\\s*)?\\b([Ss]lay or )?[Ii]nfuse (\\d+|X)\\s*:\\s*`, "g");
  const out = [];
  for (const [source, raw] of [["Limit Break", system?.effect], ultimate ? ["Ultimate", system?.ultimate] : null].filter(Boolean)) {
    const text = plain(raw);
    const hits = [...text.matchAll(marker)];
    hits.forEach((m, i) => {
      const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
      let body = text.slice(m.index + m[0].length, end).trim();
      let name = (m[1] ?? "").trim();
      if (!name) {                                   // "TETRAFLARE — Deal …"
        name = infuseName(body);
        if (name) body = body.replace(/^[^—–-]*[—–-]\s*/, "");
      }
      const cost = /^x$/i.test(m[3]) ? "X" : m[3];
      const resolve = /^(\d+)\s+resolve\b\.?\s*/i.exec(body);
      out.push({
        label: `Infuse ${cost}`,
        text:  name ? `${name} — ${body}` : body,
        body, name, source,
        slay:  !!m[2],
        resolveCost: resolve ? Number(resolve[1]) : null,
      });
    });
  }
  return out;
}

/**
 * A Limit Break text (effect or ultimate) without the Infuse versions that
 * can't trigger now, for reading its statuses: only one infusion is chosen and
 * "only one infuse effect can trigger at a time" (p.204), so a version that
 * isn't armed doesn't happen. A "Slay or Infuse" version stays (Slay can
 * trigger it with nothing armed), as in splitInfuseBlocks. Same markers as
 * limitBreakInfusions; the text comes back unchanged when nothing is removed.
 * @param {string} raw  the effect / ultimate text
 * @param {{armed?: string}} opts  label of the armed version ("Infuse 6"), if any
 */
export function withoutUnarmedInfusions(raw, { armed = "" } = {}) {
  const text = String(raw ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const CAPS = "[A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\\s]{2,}?";
  const marker = new RegExp(`(?:\\b(${CAPS})\\s*[—–-]\\s*)?\\b([Ss]lay or )?[Ii]nfuse (\\d+|X)\\s*:\\s*`, "g");
  const hits = [...text.matchAll(marker)];
  let out = "", from = 0, cut = false;
  hits.forEach((m, i) => {
    const label = `Infuse ${/^x$/i.test(m[3]) ? "X" : m[3]}`;
    if (m[2] || (armed && label === armed)) return;
    out += text.slice(from, m.index);
    from = i + 1 < hits.length ? hits[i + 1].index : text.length;
    cut = true;
  });
  return cut ? `${out}${text.slice(from)}`.trim() : String(raw ?? "");
}

/* -------------------------------------------------- */
/*  The Infuse versions on a chat card                 */
/* -------------------------------------------------- */

/** Labels an Infuse version writes its blocks with: the ability's own, plus "Terrain" (MAGNAGEO). */
const _VL = `(?:On hit|Auto[\\s-]?hit|Hit|Miss|Area effect|Area|${SECTION_LABELS.join("|")}|Terrain)`;
const VERSION_LABEL_RE = new RegExp(`(?:^|[.!?…)\\]]\\s+|[—–]\\s*)(${_VL}(?:\\s+or\\s+${_VL})?):\\s*`, "gi");

/** "On hit" → "Hit", "Area effect" → "Area", each half of "Comeback or Exceed". */
const _canonVersionLabel = (label) => label.split(/\s+or\s+/i).map(part => {
  const p = part.trim();
  if (/^(?:on\s+hit|auto[\s-]?hit)$/i.test(p)) return "Hit";
  if (/^area(?:\s+effect)?$/i.test(p)) return "Area";
  return p.charAt(0).toUpperCase() + p.slice(1);
}).join(" or ");

/**
 * An Infuse version split into the parts an ability card shows. The pack
 * writes the bigger versions on one line — "MAGNABIO — 2 actions, Attack,
 * Range 8, Large Blast. Hit: 2[D]+fray. Miss: [D]+fray. Area: [D]+fray.
 * Terrain Effect: … Benefits from Bio talents." (Geomancer p.218) — which
 * read as a wall of text; here each "Label:" is a block of its own, as on the
 * ability card.
 *   name   "MAGNABIO"; cost "Free Action" when the version names its own (Stormlash)
 *   lead   the text before the first block ("2 actions, Attack, Range 8, Large Blast.")
 *   blocks [{label, text}] in the written order
 *   tail   "Benefits from Bio talents."
 *   whole  true when the version is a complete ability (its own action cost
 *          or its own Hit / Miss): the base blocks don't carry over
 * @param {string} text  "NAME — rest", as infusionsOf / masteryInfusion give it
 */
export function infuseVersionParts(text) {
  let t = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const name = infuseName(t);
  let cost = "";
  if (name) {
    const head = /^\s*[A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\s]{2,}(?:\s*\(([^)]*)\))?\s*[—–-]\s*/.exec(t);
    if (head) { cost = (head[1] ?? "").trim(); t = t.slice(head[0].length); }
  }
  // "Attack: On hit: …" (MAGNAPYRE): "Attack:" only introduces the attack lines.
  t = t.replace(/\bAttack:\s*/g, "");
  let tail = "";
  const tm = /\s*((?:[A-Z][\w']*\s+)?[Bb]enefits from [A-Za-z' ]+ talents\.?)\s*$/.exec(t);
  if (tm) { tail = tm[1].charAt(0).toUpperCase() + tm[1].slice(1); t = t.slice(0, tm.index).trim(); }

  const hits = [];
  VERSION_LABEL_RE.lastIndex = 0;
  for (const m of t.matchAll(VERSION_LABEL_RE)) {
    if (m[1][0] !== m[1][0].toUpperCase()) continue;     // "gains effect: …" is prose
    hits.push({ label: m[1], labelStart: m.index + m[0].indexOf(m[1]), bodyStart: m.index + m[0].length });
  }
  const lead = (hits.length ? t.slice(0, hits[0].labelStart) : t).trim();
  const blocks = hits.map((h, i) => ({
    label: _canonVersionLabel(h.label),
    text:  t.slice(h.bodyStart, i + 1 < hits.length ? hits[i + 1].labelStart : undefined).trim(),
  })).filter(b => b.text);
  const whole = /^\d+\s+actions?\b/i.test(lead) || blocks.some(b => /^(?:Hit|Miss)$/.test(b.label));
  return { name, cost, lead, blocks, tail, whole };
}

/**
 * Take the Infuse blocks out of an ability's card blocks (buildAbilityBlocks),
 * so the card can show them as their own versions. A description block
 * written after an Infuse block is part of that version: "Infuse 3: PRIMAL
 * BURST — … you may shove the affected character … Collide: Foe must save or
 * be stunned." (Quaking Palm, p.221), INCANDIUS's "Collide: Characters are
 * vulnerable." (Soul Burn). Field blocks (Comeback, Exceed…) stay with the base.
 * @param {object[]} blocks
 * @param {{armed?: string}} opts  label of the armed version, if any
 * @returns {{base: object[], groups: Array<{label:string, block:object, extra:object[]}>}}
 */
export function splitInfuseBlocks(blocks, { armed = "" } = {}) {
  const base = [], groups = [];
  let cur = null;
  for (const b of blocks ?? []) {
    // A "Slay or Infuse" block stays with the base: Slay can trigger it with
    // nothing armed, so it isn't folded away as a version. Armed, it is the
    // version in play, shown once as such and not again among the base blocks.
    const slay = /\bslay\b/i.test(b.label);
    if (infuseCost(b.label) !== undefined && (!slay || (armed && b.label === armed))) { cur = { label: b.label, block: b, extra: [] }; groups.push(cur); continue; }
    if (cur && b.fromText && b.key === "section" && !b.combo) { cur.extra.push(b); continue; }
    cur = null;
    base.push(b);
  }
  return { base, groups };
}

/**
 * HTML of one Infuse version on a chat card. Closed (a <details> row with its
 * name) when it isn't the one in play, open and marked when it is armed.
 * @param {{label:string, text:string, extra?:object[]}} version  extra: blocks already enriched
 * @param {object} opts
 * @param {(t:string) => Promise<string>|string} [opts.enrich]  default: escape only
 * @param {boolean} [opts.armed]  the armed one: shown open, as the card's main block
 * @param {number}  [opts.spent]  Aether spent on it (Infuse X)
 */
export async function infuseVersionHtml(version, { enrich = escapeHTML, armed = false, spent = 0 } = {}) {
  const parts = infuseVersionParts(version.text);
  const title = `${version.label}${parts.name ? `: ${parts.name}` : ""}${parts.cost ? ` (${parts.cost})` : ""}`;
  const body = [];
  if (parts.lead) body.push(`<p class="icon-infuse-version__lead">${await enrich(parts.lead)}</p>`);
  for (const b of parts.blocks) body.push(`<p class="icon-ability-section"><strong>${escapeHTML(b.label)}:</strong> ${await enrich(b.text)}</p>`);
  for (const b of version.extra ?? []) body.push(`<p class="icon-ability-section"><strong>${escapeHTML(b.label)}:</strong> ${b.text}</p>`);
  if (parts.tail) body.push(`<p class="icon-infuse-version__tail">${escapeHTML(parts.tail)}</p>`);
  const icon = `<i class="fa-solid fa-wand-sparkles"></i>`;
  if (armed) {
    const note = /\bX\b/.test(version.label) && spent ? ` <small>(${spent} Aether)</small>` : "";
    return `<div class="icon-infuse-version icon-infuse-version--armed"><p class="icon-infuse-version__title">${icon} Infused — ${escapeHTML(title)}${note}</p>${body.join("")}</div>`;
  }
  return `<details class="icon-infuse-version"><summary>${icon} ${escapeHTML(title)}</summary>${body.join("")}</details>`;
}

/**
 * What the actor currently has infused, or null. An infusion already used
 * (noteInfusionStep) only counts within the combat turn it was used in: its
 * damage and area are rolled and placed then, and the next turn it is spent.
 * A version that lasts "until the start of your next turn" (PHANTOM BLADE,
 * Drifting Leaf p.227) stays in play through the other turns until then.
 */
export function armedInfusion(actor) {
  const f = actor?.getFlag?.(NS, "infused");
  if (!f || !f.itemId) return null;
  if (f.used && !_sameTurn(f.used, _turnKey()) && !(f.lasts === "nextTurn" && _beforeOwnNextTurn(actor, f.used))) return null;
  return f;
}

/** True while the combat that `used` was noted in hasn't reached the actor's next turn yet. */
function _beforeOwnNextTurn(actor, used) {
  const c = globalThis.game?.combat;
  if (!c?.started || !used?.combatId || c.id !== used.combatId) return false;
  const own = (c.turns ?? []).map((t, i) => (t.actor === actor || t.actorId === actor.id) ? i : -1).filter(i => i >= 0);
  if (!own.length) return false;
  const r = Number(used.round) || 0, t = Number(used.turn) || 0;
  const later = own.find(i => i > t);
  const next = later !== undefined ? { round: r, turn: later } : { round: r + 1, turn: own[0] };
  const round = Number(c.round) || 0, turn = Number(c.turn) || 0;
  return round < next.round || (round === next.round && turn < next.turn);
}

/** The steps of one use, in order: the area button is not one (it can come at any point). */
export const INFUSE_STEP = { card: 1, attack: 2, damage: 3 };

/** The combat turn now, or null outside a started combat. */
function _turnKey() {
  const c = globalThis.game?.combat;
  return c?.started ? { combatId: c.id, round: Number(c.round) || 0, turn: Number(c.turn) || 0 } : null;
}

function _sameTurn(used, now) {
  const a = used?.combatId ? used : null;
  if (!a || !now) return !a && !now;
  return a.combatId === now.combatId && Number(a.round) === now.round && Number(a.turn) === now.turn;
}

/**
 * Whether this step of using `itemId` would be the next use of an infused
 * ability (startInfusionStep would clear the infusion). The damage dialog
 * asks then whether it is a reroll of the same use instead.
 */
export function infusionStepRepeats(actor, itemId, step) {
  const armed = armedInfusion(actor);
  if (!armed || armed.itemId !== itemId || !armed.used) return false;
  return step <= (Number(armed.used.step) || 0);
}

/**
 * Before a step of using `itemId` (INFUSE_STEP) reads the armed version: when
 * that use already went this far — a second card, a second attack, a damage
 * roll after the damage — this is the next use of the ability, and the
 * infusion paid for the previous one is cleared (the Aether stays spent).
 * @returns {Promise<boolean>} true when it was cleared
 */
export async function startInfusionStep(actor, itemId, step) {
  if (!infusionStepRepeats(actor, itemId, step)) return false;
  const armed = armedInfusion(actor);
  _log(`"${armed.label}" was used already (step ${armed.used.step}, now ${step}): cleared for the next use`);
  await clearInfusion(actor);
  return true;
}

/** After a step of using `itemId` went ahead with the infused version: remember how far the use got. */
export async function noteInfusionStep(actor, itemId, step) {
  const armed = armedInfusion(actor);
  if (!armed || armed.itemId !== itemId) return;
  if (armed.used && step <= (Number(armed.used.step) || 0)) return;
  await actor.update({ [`flags.${NS}.infused.used`]: { step, ...(_turnKey() ?? { combatId: null }) } });
}

/**
 * The infusions of one ability, ready for the sheet: label, cost, name, and
 * whether this one is the armed one.
 * @param {Array<{label:string,text:string}>} sections  parsed description blocks
 * @param {Actor}  actor
 * @param {string} itemId
 */
export function infusionsOf(sections, actor, itemId) {
  const armed = armedInfusion(actor);
  const out = [];
  for (const sec of sections ?? []) {
    const cost = infuseCost(sec.label);
    if (cost === undefined) continue;
    out.push({
      label:   sec.label,
      cost,                                   // null = "X", chosen when arming
      name:    infuseName(sec.text),
      text:    sec.text,
      armed:   !!armed && armed.itemId === itemId && armed.label === sec.label,
      standalone: isStandaloneInfusion(sec.text),    // its own action (Stormlash): spent at once, never armed
      mastery: /\(mastery\)/i.test(sec.label),       // the Mastery's bigger version (masteryInfusion)
      costLabel: sec.label.replace(/\s*\(mastery\)\s*$/i, ""),   // "Infuse 6", for the button
      aether:  actor?.system?.combat?.classResources?.aether?.value ?? 0,
      // Limit Break blocks (limitBreakInfusions) carry these too.
      source:  sec.source ?? "",
      slay:    !!sec.slay || /\bslay\b/i.test(sec.label),
      resolveCost: sec.resolveCost ?? null,
    });
  }
  return out;
}

/**
 * Spend the Aether and arm this infusion. Returns the amount spent, or null
 * when it couldn't (not enough Aether, or the player cancelled the "how much"
 * prompt of an Infuse X). With `arm: false` (a version that is its own
 * action, isStandaloneInfusion) the Aether is spent and the version posted,
 * but nothing stays armed: there is no roll to wait for.
 */
export async function armInfusion(actor, item, infusion, { arm = true } = {}) {
  const pool = actor.system?.combat?.classResources?.aether?.value ?? 0;
  let cost = infusion.cost;

  if (cost === null) {                        // Infuse X: ask how much
    if (pool < 1) { ui.notifications.warn(`${actor.name} has no Aether to infuse.`); return null; }
    cost = await _promptAmount(pool, infusion);
    if (!cost) return null;
  }

  // Cost reductions: Conqueror's Edge (Spellblade, p.224), Inner Furnace
  // (Enochian, p.208). They lower a printed cost only: an Infuse X is "per
  // Aether infused", so the amount chosen is the amount paid.
  let paid = cost;
  const notes = [];
  let sacrifice = 0;
  if (infusion.cost !== null && paid > 0) {
    // Elden Rune Talent II (Enochian, p.209): "While standing in an Elden Rune, the infuse costs of your spells are
    // reduced by 1, to a minimum of 1" — its own minimum, before the reductions that may go to 0.
    try {
      const { runeInfuseReduction } = await import("../canvas/terrain-spaces.mjs");
      const rune = runeInfuseReduction(actor);
      if (rune && paid > rune.min) {
        paid = Math.max(rune.min, paid - rune.by);
        notes.push(`${rune.label}: −${rune.by}, to a minimum of ${rune.min}`);
      }
    } catch (err) { console.warn("[ICON | Infuse] Elden Rune check failed", err); }
    // Conqueror's Edge: "The Infuse cost of your abilities is reduced by 1 if
    // there's a foe in range 2."
    if (hasTrait(actor, "conqueror's edge") && foeInRange(actor, 2)) {
      paid = Math.max(0, paid - 1);
      notes.push("Conqueror's Edge: −1, a foe is in range 2");
    }
    // Inner Furnace: "Once a round, you may burn your own life force when you
    // Infuse an ability. You can sacrifice 25% of your max hp to reduce the
    // Aether cost of that ability by 2." "% Health" (p.106): of the max BASE hp, i.e. VIT.
    if (paid > 0 && innerFurnaceReady(actor) && pool >= Math.max(0, paid - 2)) {
      const hpCost = Number(actor.system?.combat?.vit) || Math.ceil((actor.system?.combat?.hp?.baseMax ?? 0) / 4);
      const choice = await _promptInnerFurnace(actor, infusion, { paid, pool, hpCost });
      if (choice === null) return null;           // dialog closed: no infusion
      if (choice) {
        sacrifice = hpCost;
        paid = Math.max(0, paid - 2);
        notes.push(`Inner Furnace: −2, sacrificed ${hpCost} hp`);
      }
    }
  }
  if (pool < paid) {
    ui.notifications.warn(`${infusion.label} needs ${paid} Aether — ${actor.name} has ${pool}.`);
    return null;
  }

  const update = { "system.combat.classResources.aether.value": pool - paid };
  // Sacrifice (p.103): can't be reduced or resisted and can't bring hp below 1,
  // so it goes straight onto the hp bar, not through the damage pipeline.
  let hpLost = 0;
  if (sacrifice) {
    const hpNow = Number(actor.system?.combat?.hp?.value) || 0;
    const hpNew = Math.max(1, hpNow - sacrifice);
    hpLost = Math.max(0, hpNow - hpNew);
    update["system.combat.hp.value"] = hpNew;
    const combat = game.combat;
    update[`flags.${NS}.innerFurnace`] = combat?.started ? { combatId: combat.id, round: Number(combat.round) } : null;
  }
  // "Until the start of your next turn" (PHANTOM BLADE): used, it outlasts the turn (armedInfusion).
  const lasts = /\buntil the start of your next turn\b/i.test(String(infusion.text ?? "")) ? "nextTurn" : "";
  // furnaceAt: the Inner Furnace round this arm wrote, so cancelling frees only that one.
  if (arm) update[`flags.${NS}.infused`] = { itemId: item.id, label: infusion.label, name: infusion.name, spent: paid, hpLost, furnace: !!sacrifice,
    furnaceAt: sacrifice ? (update[`flags.${NS}.innerFurnace`] ?? null) : null, lasts, used: null };
  await actor.update(update);
  _log(`${arm ? "armed" : "used"} "${infusion.label}" on "${item.name}" — ${paid} Aether (${pool} → ${pool - paid})${notes.length ? ` [${notes.join("; ")}]` : ""}`);

  const esc = foundry.utils.escapeHTML;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--infuse">
        <strong><i class='fa-solid fa-wand-sparkles'></i> ${esc(actor.name)}</strong> ${arm ? "infuses" : "uses the infusion of"}
        <strong>${esc(item.name)}</strong>${infusion.name ? ` — <em>${esc(infusion.name)}</em>` : ""}
        <br><small>${esc(infusion.label)}: ${paid} Aether spent (${pool - paid} left)</small>
        ${notes.length ? `<br><small>${notes.map(esc).join("<br>")}</small>` : ""}
        ${infusion.text ? await _versionBodyHtml(infusion) : ""}
      </div>`,
  });
  return paid;
}

/** True when the actor has a trait of that name (case and apostrophe style ignored). */
function hasTrait(actor, name) {
  const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[’‘`]/g, "'");
  return !!actor?.items?.some(i => i.type === "trait" && norm(i.name) === norm(name));
}

/** A hostile token within `range` spaces of the actor's token on this scene. */
function foeInRange(actor, range) {
  const tok = actor?.getActiveTokens?.(false, false)?.[0];
  if (!tok) return false;
  const own = tok.document?.disposition ?? CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  const enemy = own === CONST.TOKEN_DISPOSITIONS.HOSTILE ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : CONST.TOKEN_DISPOSITIONS.HOSTILE;
  return (canvas?.tokens?.placeables ?? []).some(t => t !== tok && t.actor && t.document?.disposition === enemy
    && !t.document?.hidden && gridDistance(tok, t) <= range);
}

/** Inner Furnace held and not yet used this round (outside combat: always). */
function innerFurnaceReady(actor) {
  if (!hasTrait(actor, "inner furnace")) return false;
  const f = actor.getFlag?.(NS, "innerFurnace");
  const combat = game.combat;
  if (!f || !combat?.started) return true;
  return !(f.combatId === combat.id && Number(f.round) === Number(combat.round));
}

/** "Burn your life force?" Resolves true / false, or null when closed. */
async function _promptInnerFurnace(actor, infusion, { paid, pool, hpCost }) {
  const esc = foundry.utils.escapeHTML;
  const after = Math.max(0, paid - 2);
  const short = pool < paid ? `<p><em>Without it you can't pay: you have ${pool} Aether.</em></p>` : "";
  try {
    return await foundry.applications.api.DialogV2.wait({
      window: { title: `Inner Furnace — ${infusion.label}` },
      content: `<p><strong>Inner Furnace</strong> (once a round): sacrifice <strong>${hpCost} hp</strong> (25% of your max hp)
        to pay <strong>${after}</strong> Aether instead of ${paid}?</p>${short}
        <p style="font-size:.9em;opacity:.85">Sacrifice can't be reduced or resisted and can't bring you below 1 hp.</p>`,
      buttons: [
        { action: "burn", label: `Sacrifice ${hpCost} hp`, icon: "fa-solid fa-fire", default: true, callback: () => true },
        { action: "no", label: `Pay ${paid} Aether`, icon: "fa-solid fa-wand-sparkles", callback: () => false },
      ],
      rejectClose: false,
    }) ?? null;
  } catch { return null; }
}

/** The version's blocks, labelled as on an ability card, for the "infuses" message. */
async function _versionBodyHtml(infusion) {
  const html = await infuseVersionHtml(infusion, { armed: true });
  // The message already names the version: keep only its blocks.
  return html.replace(/<p class="icon-infuse-version__title">.*?<\/p>/, "");
}

/**
 * Give the Aether back and disarm (the ability wasn't used after all). Once
 * the infused version has been used (noteInfusionStep) there is nothing to
 * undo: it is only disarmed and the result is "used".
 * @returns {Promise<boolean|"used">}
 */
export async function cancelInfusion(actor) {
  const armed = armedInfusion(actor);
  if (!armed) return false;
  if (armed.used) {
    await clearInfusion(actor);
    _log(`disarmed "${armed.label}" — already used, the Aether stays spent`);
    return "used";
  }
  const pool = actor.system?.combat?.classResources?.aether?.value ?? 0;
  const max  = actor.system?.combat?.classResources?.aether?.max ?? 6;
  const update = {
    "system.combat.classResources.aether.value": Math.min(max, pool + (armed.spent ?? 0)),
    [`flags.${NS}.infused`]: null,
  };
  // Cancelling is an undo: Inner Furnace's hp come back and its use this round too.
  if (armed.furnace) {
    const hp = actor.system?.combat?.hp ?? {};
    update["system.combat.hp.value"] = Math.min(Number(hp.max) || Infinity, (Number(hp.value) || 0) + (Number(armed.hpLost) || 0));
    // Only while the round's use is still this arm's: a later Inner Furnace
    // (another round, a standalone version) keeps "once a round" spent (p.208).
    const now = actor.getFlag?.(NS, "innerFurnace") ?? null, at = armed.furnaceAt;
    const mine = at === undefined || (!now && !at)
      || (!!now && !!at && now.combatId === at.combatId && Number(now.round) === Number(at.round));
    if (mine) update[`flags.${NS}.innerFurnace`] = null;
  }
  await actor.update(update);
  _log(`cancelled "${armed.label}" — ${armed.spent} Aether returned${armed.furnace ? `, ${armed.hpLost} hp back (Inner Furnace)` : ""}`);
  return true;
}

/** Forget the armed infusion (it has been used). The Aether stays spent. */
export async function clearInfusion(actor) {
  // The raw flag: a used one from an earlier turn is hidden by armedInfusion but still stored.
  if (!actor?.getFlag?.(NS, "infused")) return false;
  await actor.update({ [`flags.${NS}.infused`]: null });
  return true;
}

/** "How much Aether?" for an Infuse X. Resolves the amount or 0. */
async function _promptAmount(pool, infusion) {
  const esc = foundry.utils.escapeHTML;
  try {
    const value = await foundry.applications.api.DialogV2.prompt({
      window: { title: `${infusion.label}${infusion.name ? ` — ${infusion.name}` : ""}` },
      content: `<p>How much Aether do you spend? You have <strong>${pool}</strong>.</p>
        ${infusion.text ? `<p style="font-size:.9em;opacity:.85">${esc(infusion.text)}</p>` : ""}
        <p><input type="number" name="amount" value="1" min="1" max="${pool}" style="width:100%"></p>`,
      ok: {
        label: "Infuse",
        callback: (_e, button) => Math.max(0, Math.min(pool, Number(button.form?.elements?.amount?.value) || 0)),
      },
      rejectClose: false,
    });
    return value ?? 0;
  } catch { return 0; }
}
