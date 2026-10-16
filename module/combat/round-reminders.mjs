/**
 * round-reminders.mjs — "At round 4 or later…" reminders (R62, 16 Oct 2026).
 *
 * Many masteries, talents, traits, relic ranks and foe actions switch on at a
 * given combat round ("At round 4 or later, Drifting Leaf's infuse is always
 * active", "At the start of round 5 and for the rest of combat…", "Round 3+:
 * Two sparks", relics' "Invoke (Round 4+)", p.114). Players forget them. When
 * a round starts, the active GM posts what becomes true in THAT round for the
 * characters in the combat:
 *   - PCs: only the text the character really has (the selected talent, the
 *     unlocked mastery, traits of the current chapter or lower, relic ranks
 *     up to the unlocked one) — one public card;
 *   - foes / legends: every trait, action, interrupt, round action and phase
 *     — one card whispered to the GM.
 *
 * Phrases read (case-insensitive), on each sentence of the text:
 *   "round N or later / or higher / or greater / or more", "round N+",
 *   "from round N"                          → from round N on (announced at N)
 *   "at (the start of) round N", "on round N", "(Round N)",
 *   "round 1, 3, and 5", "round 3 and 5"    → those rounds
 *   … "and every two / third / 2 rounds thereafter", "(Round 3, 5, 7, etc)"
 *                                           → N, then every k rounds
 * Not read: "round N or lower" and "at the end of round N" (an end, not a start).
 *
 * The parser (roundPhrases / phraseFiresAt / *Sources) uses no Foundry API,
 * so the compendium survey script can import it.
 */

import { unlockedRelics, RANK_LABELS } from "./relic-reminders.mjs";

const _log = (...a) => console.debug("[ICON | round-reminders]", ...a);

const FLAG_NS = "icon-system";
const FLAG_POSTED = "roundReminders";   // { [round]: true } — one post per round

const _plain = (html) => String(html ?? "")
  .replace(/<\/(?:p|li|div|h\d)>/gi, ". ")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .replace(/(?:\.\s*){2,}/g, ". ")
  .trim();

const STEP_WORDS = { two: 2, second: 2, other: 2, three: 3, third: 3, four: 4, fourth: 4, five: 5, fifth: 5 };

/** Split plain text into sentences ("•" bullets count as breaks). */
function _sentences(text) {
  return String(text ?? "")
    .split(/(?<=[.!?])\s+(?=[A-Z(•])|\s*•\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * The round phrases of one text.
 * @param {string} html
 * @returns {{ sentence:string, from:number|null, rounds:number[], start:number|null, every:number|null }[]}
 *   one entry per phrase: `from` = active from that round on; `rounds` =
 *   exact rounds; `start`/`every` = a periodic one (start, start+every, …).
 */
export function roundPhrases(html) {
  const out = [];
  const all = _sentences(_plain(html));
  for (const [idx, own] of all.entries()) {
    // A short one ("At the start of round 5, become suffused with immortal
    // flame.", "Phase II (Round 4+).") takes the next sentence along: that is
    // where the effect is.
    const sentence = own.length < 70 && all[idx + 1] ? `${own} ${all[idx + 1]}` : own;
    const re = /\bround\s+(\d+)/gi;
    let m;
    while ((m = re.exec(own))) {
      const n = Number(m[1]);
      const before = own.slice(0, m.index);
      const after  = own.slice(m.index + m[0].length);
      if (/^\s*or\s+(?:lower|less|earlier|before)\b/i.test(after)) continue;
      if (/\bend\s+of\s*(?:the\s*)?$/i.test(before)) continue;
      if (/^\s*(?:\+|or\s+(?:later|higher|greater|more|after)\b)/i.test(after) || /\bfrom\s*$/i.test(before)) {
        out.push({ sentence, from: n, rounds: [], start: null, every: null });
        continue;
      }
      if (!/(?:\bstart\s+of|\bbeginning\s+of|\bat|\bon|\()\s*$/i.test(before)) continue;
      // A list right after: "round 1, 3, and 5", "round 3 and 5", "(Round 3, 6, 9+)".
      const list = /^((?:\s*,\s*(?:and\s+)?\d+|\s+and\s+\d+)*)(\s*,?\s*(?:etc\b|\+))?/i.exec(after);
      const rounds = [n, ...((list?.[1] ?? "").match(/\d+/g) ?? []).map(Number)];
      let every = null;
      const per = /\bevery\s+(\d+|two|three|four|five|second|third|fourth|fifth|other)\s+rounds?\b/i.exec(after);
      if (per) every = Number(per[1]) || STEP_WORDS[per[1].toLowerCase()] || null;
      else if (list?.[2] && rounds.length >= 2) every = rounds[1] - rounds[0];
      if (every && every > 0) out.push({ sentence, from: null, rounds: [], start: n, every });
      else out.push({ sentence, from: null, rounds, start: null, every: null });
      re.lastIndex = m.index + m[0].length + (list?.[0]?.length ?? 0);
    }
  }
  return out;
}

/** Does the phrase become true exactly at the start of round R? */
export function phraseFiresAt(p, R) {
  if (p.from != null) return R === p.from;
  if (p.every) return R >= p.start && (R - p.start) % p.every === 0;
  return p.rounds.includes(R);
}

/* -------------------------------------------------- */
/*  Where the text comes from                          */
/* -------------------------------------------------- */

const ABILITY_BASE_FIELDS = [
  "description", "hitEffect", "missEffect", "areaEffect", "chargeEffect", "heroicEffect", "exceedEffect",
  "collideEffect", "slayEffect", "critEffect", "finishingBlowEffect", "comebackEffect", "interruptTrigger",
];

/** "GREAT CYCLONE: At round 4…" → "GREAT CYCLONE". */
function _leadName(html) {
  const m = /^([^:.]{2,40}):\s/.exec(_plain(html));
  return m ? m[1].trim() : "";
}

/**
 * Text of a PC ability the character really has.
 * @param {object} item  { name, system }
 * @param {object} [opts]
 * @param {boolean} [opts.all]  survey: both talents and the mastery, as if unlocked
 * @returns {{ label:string, text:string }[]}
 */
export function abilitySources(item, { all = false } = {}) {
  const s = item.system ?? {};
  const out = [{ label: item.name, text: [...ABILITY_BASE_FIELDS.map(f => s[f]), s.isCombo || all ? s.comboEffect : ""].filter(Boolean).join(" </p> ") }];
  const sel = Number(s.talentSelected ?? 0);
  for (const t of [1, 2]) {
    if (!(all || sel === t) || !s[`talent${t}`]) continue;
    const name = _leadName(s[`talent${t}`]);
    out.push({ label: `${item.name} (Talent${name ? `: ${name}` : ` ${t === 1 ? "I" : "II"}`})`, text: s[`talent${t}`], lead: name });
  }
  if ((all || s.masteryUnlocked) && s.mastery) {
    const name = _leadName(s.mastery);
    out.push({ label: `${item.name} (Mastery${name ? `: ${name}` : ""})`, text: s.mastery, lead: name });
  }
  return out;
}

/** Relic ranks up to `rank` (4 = Aspect). */
export function relicSources(item, rank) {
  const s = item.system ?? {};
  return [[1, s.rank1], [2, s.rank2], [3, s.rank3], [4, s.aspect]]
    .filter(([r, x]) => r <= rank && x?.description)
    .map(([r, x]) => ({ label: `${item.name} ${RANK_LABELS[r]}`, text: x.description }));
}

/** Traits, actions, interrupts, round actions and phases of a foe / legend. */
export function npcSources(system) {
  const s = system ?? {};
  const out = [];
  for (const t of s.traits ?? [])       out.push({ label: t.name, text: t.description });
  for (const a of s.actions ?? [])      out.push({ label: a.name, text: [a.description, a.hitEffect, a.missEffect, a.areaEffect].filter(Boolean).join(" </p> ") });
  for (const i of s.interrupts ?? [])   out.push({ label: i.name, text: [i.trigger, i.effect, i.description].filter(Boolean).join(" </p> ") });
  for (const r of s.roundActions ?? []) out.push({ label: r.name, text: [r.effect, r.description].filter(Boolean).join(" </p> ") });
  for (const p of s.phases ?? []) {
    // The label ("Phase II (Round 4+)") only when the description doesn't say it.
    const text = roundPhrases(p.description).length ? p.description : `${p.label}. ${p.description ?? ""}`;
    out.push({ label: p.label, text });
  }
  return out.filter(x => x.text);
}

/** Every text source of one actor in the combat. */
export function actorRoundSources(actor) {
  if (!actor) return [];
  if (actor.type === "icon") {
    const chapter = Number(actor.system?.combat?.chapter ?? 1);
    const out = [];
    for (const i of actor.items) {
      if (i.type === "ability") out.push(...abilitySources(i));
      else if (i.type === "trait" && Number(i.system?.chapter ?? 1) <= chapter) out.push({ label: i.name, text: i.system?.description });
    }
    for (const r of unlockedRelics(actor)) out.push(...relicSources(r.item, r.rank));
    return out.filter(x => x.text);
  }
  if (actor.type === "foe" || actor.type === "legend") return npcSources(actor.system);
  return [];
}

/**
 * What becomes true for one actor at the start of round R.
 * @returns {{ label:string, sentence:string, from:boolean }[]}  one line per distinct sentence
 */
export function roundRemindersFor(actor, R) {
  const out = [];
  const seen = new Set();
  for (const src of actorRoundSources(actor)) {
    for (const p of roundPhrases(src.text)) {
      if (!phraseFiresAt(p, R)) continue;
      let sentence = p.sentence;
      if (src.lead && sentence.startsWith(`${src.lead}:`)) sentence = sentence.slice(src.lead.length + 1).trim();
      const key = sentence.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: src.label, sentence, from: p.from != null });
    }
  }
  return out;
}

/* -------------------------------------------------- */
/*  Chat                                               */
/* -------------------------------------------------- */

/**
 * Post the reminders of round `combat.round`: one public card for the PCs,
 * one card whispered to the GMs for foes and legends. Called by the active GM
 * only (IconCombat updateCombat hook); a combat flag keeps it to one post per
 * round even if the round is undone and advanced again.
 */
export async function postRoundReminders(combat) {
  const R = Number(combat?.round) || 0;
  if (R < 1) return;
  const posted = combat.getFlag(FLAG_NS, FLAG_POSTED) ?? {};
  if (posted[R]) return;
  const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));
  const pcRows = [];
  const npcRows = [];
  const seenActors = new Set();
  for (const c of combat.combatants) {
    const actor = c.actor;
    if (!actor || c.defeated) continue;
    // Five goons of the same kind: one set of lines.
    const key = actor.type === "icon" ? actor.id : `${actor.type}:${actor.name}`;
    if (seenActors.has(key)) continue;
    seenActors.add(key);
    const lines = roundRemindersFor(actor, R);
    if (!lines.length) continue;
    const rows = actor.type === "icon" ? pcRows : npcRows;
    for (const l of lines) {
      rows.push(`<div class="icon-chat-relic icon-chat-relic--note"><span class="icon-chat-relic__label">${esc(c.name || actor.name)} — ${esc(l.label)}${l.from ? " (now active)" : ""}</span><span class="icon-chat-relic__text">${esc(l.sentence)}</span></div>`);
    }
  }
  await combat.setFlag(FLAG_NS, FLAG_POSTED, { ...posted, [R]: true });
  if (!pcRows.length && !npcRows.length) return;
  const card = (rows, tag) => `<div class="icon-chat-card icon-chat-card--round-reminder">
      <div class="icon-chat-card__header"><strong>Round ${R}</strong><span class="icon-badge icon-badge--invoke">${tag}</span></div>
      <div class="icon-chat-relics icon-chat-relics--notes">${rows.join("")}</div>
    </div>`;
  _log(`round ${R}: ${pcRows.length} PC line(s), ${npcRows.length} foe line(s)`);
  try {
    if (pcRows.length) await ChatMessage.create({ speaker: { alias: `Round ${R}` }, content: card(pcRows, "round") });
    if (npcRows.length) await ChatMessage.create({ speaker: { alias: `Round ${R}` }, content: card(npcRows, "foes"), whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id) });
  } catch (err) { console.warn("ICON 1.5 | round reminders failed:", err); }
}
