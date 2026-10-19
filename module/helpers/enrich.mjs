/**
 * enrich.mjs — Shared HTML-enrichment helper.
 *
 * In Foundry v13 the global `TextEditor` is deprecated; the correct path is
 * `foundry.applications.ux.TextEditor.implementation.enrichHTML`.
 * After Foundry's own enrichment (links, rolls) the rule keywords in the text
 * get their hover tooltips (helpers/keywords.mjs).
 */
import { enrichRuleKeywords } from "./keywords.mjs";

/**
 * @param {string} html
 * @param {object} [options]
 * @param {boolean} [options.keywords=true]  false = skip the rule-keyword
 *   tooltips. Used for an ability's flavour line: it is narrative prose
 *   ("send your target flying"), not rules, so its words must not look like
 *   keywords.
 * @param {string|null} [options.damageDie=null]  the character's damage die
 *   ("d10"): "[D]" / "2[D]" are shown as "d10" / "2d10" (PC sheet and its
 *   cards, see IconSheet._enrichAbility). Null keeps the [D] symbol.
 * @param {boolean} [options.leadName=false]  the text starts with the name of a
 *   mastery / combo / ultimate ("Flying Sleeves: …"): that name gets no keywords.
 * @param {boolean} [options.summonVerbs=false]  player text: "summon a <thing>"
 *   is the Summon keyword only for a creature of the summons pack (keywords.mjs).
 */
export async function enrichHTML(html, { keywords = true, damageDie = null, leadName = false, summonVerbs = false } = {}) {
  if (leadName && keywords) {
    const lead = _leadName(html);
    if (lead) {
      const head = await enrichHTML(lead.name, { keywords: false });
      const rest = await enrichHTML(lead.rest, { damageDie, summonVerbs });
      return rest ? `${head} ${rest}` : head;
    }
  }
  const out = await foundry.applications.ux.TextEditor.implementation.enrichHTML(formatRollTables(formatBulletLists(html)), { async: true });
  if (!keywords) return out;
  try { return enrichRuleKeywords(out, { damageDie, summonVerbs }); }
  catch (err) { console.warn("[ICON | enrich] keyword enrichment failed", err); return out; }
}

/**
 * The name a mastery, combo or ultimate text starts with ("Flying Sleeves:
 * Area becomes Arc 4…", Death Blossom p.162; "Shukuchi: You can teleport 2…").
 * It is the name of the version, not rules, so its words ("flying") are not
 * keywords. A rules label in that place ("Comeback: …", "Slay: …") is not a
 * name. Plain text only: hand-edited HTML keeps its own markup.
 * @returns {{name: string, rest: string}|null}  name includes its colon
 */
function _leadName(html) {
  const src = String(html ?? "").trim();
  if (!src || /<[a-z][^>]*>/i.test(src)) return null;
  // "HADES — Gains True Strike…" (Holy's combo): a capitalised name before a dash.
  const dash = /^([A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\s]{2,44}?)\s*[—–]\s*/.exec(src);
  if (dash) return { name: dash[0].trim(), rest: src.slice(dash[0].length) };
  const m = /^([^:.!?\n]{1,45}):\s*/.exec(src);
  if (!m || _LABEL_ONLY_RE.test(m[1].trim())) return null;
  return { name: `${m[1].trim()}:`, rest: src.slice(m[0].length) };
}

/**
 * Turn a numbered d6 table written inline in a plain rules text
 * ("…gamble. 1. Card explodes… 2. All characters… 3. …") into one row per
 * result, as the book prints it (Monogatari p.179, Chaos Tarot p.201, the
 * foes' gamble actions). Pack texts store the table as one run-on line.
 *
 * Only plain texts are touched (hand-edited HTML keeps its own markup), and
 * only when results 1, 2 and 3 are all found in order. The rows are spans
 * (shown as block rows by CSS) because the text sits inside a <p>/<span> on
 * the sheet and in chat, where a list element is not allowed.
 * @param {string} text
 * @returns {string}
 */
export function formatRollTables(text) {
  const src = String(text ?? "");
  if (!src || /<[a-z][^>]*>/i.test(src)) return src;
  const marks = _rollTableMarks(src);
  if (!marks) return src;
  const rows = marks.map((m, i) => _tableRow(i + 1, src.slice(m.body, marks[i + 1]?.at ?? src.length).trim()));
  return `${src.slice(0, marks[0].at).trim()}<span class="icon-roll-table">${rows.join("")}</span>`;
}

/**
 * The row of a numbered d6 table ("1. … 2. … 3. …", same reading as
 * formatRollTables) for result `n`, as plain text — used by the gamble card to
 * print the row the die landed on. HTML wrappers are stripped first.
 * @param {string} text
 * @param {number} n
 * @returns {string}  "" when the text has no table or no row `n`
 */
export function rollTableRow(text, n) {
  const src = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const marks = src ? _rollTableMarks(src) : null;
  const m = marks?.[n - 1];
  return m ? src.slice(m.body, marks[n]?.at ?? src.length).trim() : "";
}

/** Positions of the "1. ", "2. ", … markers of an inline d6 table, or null (fewer than 3). */
function _rollTableMarks(src) {
  // Result k: "k. " after a space (or at the start), not immediately followed
  // by another "k. " — "is shoved 2. 2. Lantern" (Shopkeep) is the end of
  // result 1 followed by result 2. Result 1 must also start a sentence.
  const find = (k, from) => {
    const re = new RegExp(`(^|${k === 1 ? "[.:!?]" : ""}\\s+)${k}\\.\\s+(?!${k}\\.\\s)`, "g");
    re.lastIndex = from;
    const m = re.exec(src);
    return m ? { at: m.index + m[1].length, body: m.index + m[0].length } : null;
  };
  const marks = [];
  for (let k = 1, from = 0; ; k++) {
    const m = find(k, from);
    if (!m) break;
    marks.push(m);
    from = m.body;
  }
  return marks.length < 3 ? null : marks;
}

/**
 * One row of a roll table or bullet list. A short name before ":" or " - "
 * ("A Tale of Fury: …", "Earth - …", "Bloodied: …") is the row's title.
 */
function _tableRow(marker, body, { sub = false } = {}) {
  const t = body.match(/^([^:.]{1,45}?)(:|\s[-–—]\s)\s*/);
  if (t) body = `<b class="icon-roll-table__title">${t[1]}${t[2].trim() === ":" ? ":" : ` ${t[2].trim()}`}</b> ${body.slice(t[0].length)}`;
  return `<span class="icon-roll-table__row${sub ? " icon-roll-table__row--sub" : ""}"><span class="icon-roll-table__num">${marker}</span>`
       + `<span class="icon-roll-table__text">${body}</span></span>`;
}

/**
 * Turn the bullet lines of a plain rules text ("…standing in that space:
 * \n• If there is, …\n• If there isn't, …\nThen, end the effect.") into one
 * row per bullet, as the book prints them (Eclipse p.203, Raging Wolf's
 * Comeback p.137, Lycanthropy). Pack texts mark a list item with a line break
 * followed by "•"; the line after the last bullet goes back to running text.
 * Inline " • " bullets with no line break are left as they are. A "◦" line is
 * a sub-item of the bullet above it, indented one step (Split Heaven and
 * Hell p.127: the three distances under "Sever Divine Thread").
 * @param {string} text
 * @returns {string}
 */
export function formatBulletLists(text) {
  const src = String(text ?? "");
  if (!/\n\s*[•◦]/.test(src) || /<[a-z][^>]*>/i.test(src)) return src;
  const out = [];
  let rows = [];
  const flush = () => {
    if (rows.length) out.push(`<span class="icon-roll-table">${rows.join("")}</span>`);
    rows = [];
  };
  for (const raw of src.split("\n")) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (line.startsWith("•")) { rows.push(_tableRow("•", line.slice(1).trim())); continue; }
    if (line.startsWith("◦")) { rows.push(_tableRow("◦", line.slice(1).trim(), { sub: true })); continue; }
    flush();
    out.push(line);
  }
  flush();
  return out.join(" ");
}

/**
 * The rules of a foe's / legend's summon (system.summons.N.rules) with their
 * list one row per item, before enrichHTML (foe / legend sheet and its chat
 * card). Pack summon rules are stored as one "<p>…</p>" with the list inline
 * ("…the following effects. • A • B"), and formatBulletLists() reads neither
 * HTML nor inline bullets (Churn Baron's Crony, Deep Snow Aesi's Icicle, the
 * Everforge, the Blade of Agony). A text that is only that one paragraph has
 * each inline "•" put on its own line and the rows built inside the same <p>;
 * in these texts the items run to the end, so no running text follows the
 * last one. Any other text is returned as it is. Words are never changed.
 * @param {string} rules
 * @returns {string}
 */
export function summonRulesHTML(rules) {
  const src = String(rules ?? "").trim();
  const m = /^<p>([^<]*)<\/p>$/i.exec(src);
  const text = m ? m[1].trim() : src;
  if (/<[a-z][^>]*>/i.test(text) || !/\s•\s/.test(text)) return rules ?? "";
  return `<p>${formatBulletLists(text.replace(/\s+•\s+/g, "\n• "))}</p>`;
}

/**
 * Plain text of an ability description: <p>/<br> wrappers and line breaks
 * become spaces, except around a bullet line ("\n• …" or a "\n◦ …" sub-item),
 * which keeps its own line for formatBulletLists().
 */
function _flattenText(description) {
  const lines = String(description ?? "").replace(/<\/?(?:p|br|div)\b[^>]*>/gi, " ")
    .split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const bullet = (l) => /^[•◦]/.test(l);
  return lines.reduce((acc, line, i) => !i ? line
    : `${acc}${bullet(line) || bullet(lines[i - 1]) ? "\n" : " "}${line}`, "");
}

/**
 * escapeHTML — escape a string for safe insertion inside template-literal
 * HTML. Use this on any document name, user-editable label, or other
 * free-form text that gets interpolated into a string that ends up in
 * `innerHTML`, a DialogV2 `content`, or a ChatMessage `content` field.
 */
export function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Post an NPC (foe / legend / foe-ability item) trait to chat using the
 * shared trait card. `trait` is a plain `{ name, description }` object —
 * NPC traits are inline schema entries, not embedded Items. `actor` may be
 * null (compendium item view): the card then has no speaker actor.
 */
export async function postNpcTraitCard(actor, trait, { label, statusHtml = "" } = {}) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const tr = {
    name:        trait?.name ?? "Trait",
    jobName:     label ?? actor?.name ?? "",
    class:       "",
    chapter:     null,
    description: await enrichHTML(trait?.description),
    // Inflict / Gain / Effects block read from the trait text (ability-statuses.mjs)
    statusHtml,
  };
  const content = await renderTemplate("systems/icon-system/templates/chat/trait-card.hbs", { tr });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
  });
}

/**
 * Split an ability's `description` into its book-layout pieces. Pack data
 * stores the flavour line, the (interrupt) trigger and the "Effect:" rules
 * text in ONE field, e.g.
 *   "Fill the air with blades. Effect: You may rush 1, then …"
 *   "Better get your sea legs. Trigger: A foe damages you… Effect: After …"
 * The rulebook prints Effect AFTER the Attack/Area lines (and Trigger before
 * everything), so the sheet/chat card need the pieces separately.
 *
 * "Effect:" is only recognised at the start of a sentence — "Area Effect:",
 * "Terrain Effect:", "Summon Effect:", "Special Effect:" stay in the text
 * they belong to. Later "Effect:" repetitions remain inside `effect`
 * (mirrors the book, which lists several Effect lines).
 *
 * @param {string} description  raw description
 * @returns {{ flavor: string, trigger: string, effect: string }}
 */
export function splitAbilityDescription(description) {
  const { flavor, trigger, sections } = parseAbilitySections(description);
  const effect = sections.map(s => s.label === "Effect" ? s.text : `${s.label}: ${s.text}`).join(" ");
  return { flavor, trigger, effect };
}

/**
 * Labels the book uses to start a rules block inside an ability text. Matched
 * case-insensitively at a sentence start (or after an em dash / line break);
 * the first letter must be a capital so "…remove the mark: …" stays prose.
 * Canonical display form = each word capitalised except small words
 * ("Terrain effect" → "Terrain Effect", "While in this stance" → "While in this Stance").
 */
export const SECTION_LABELS = [
  // Long "end your turn and …" forms first: the book prints them as one label
  // (Eclipse, Morrigan, Six Hells Trigram, Intimidate).
  "End your turn and (?:gain|create) (?:a )?(?:Delay|Terrain Effect|Stance)", "End your turn and Mark",
  "Gain Delay",
  "Effect", "Trigger", "Stance", "Refresh", "Mark", "Terrain Effect", "Summon Effect", "Summon",
  "Special Effect", "Special", "Object Effect", "Object", "Area Effect", "Charge", "Comeback",
  "Collide", "Slay", "Exceed", "Heroic", "Crit", "Finishing Blow", "Free Action", "Delay",
  "Gain Stance", "While in this stance", "In this stance", "Interrupt \\d", "Infuse (?:\\d+|X)",
  // The book writes the pair both ways round: "Slay or Infuse 3" (Blitz,
  // Nothung) and "Infuse 3 or Slay" (Drifting Leaf, p.227).
  "Slay or Infuse \\d", "Infuse \\d or Slay", "Talent", "Mastery",
];
const SECTION_RE = new RegExp(
  `(?:^|[.!?…)\\]]\\s+|—\\s*|>\\s*|\\n\\s*)(${SECTION_LABELS.join("|")}):\\s*`, "gi",
);

/** A text that is exactly one rules label ("Finishing Blow", "Infuse 3"). */
const _LABEL_ONLY_RE = new RegExp(`^(?:${SECTION_LABELS.join("|")})$`, "i");

/** Words kept lowercase inside a multi-word label ("End your turn and gain Delay"). */
const _SMALL_WORDS = new Set(["a", "an", "and", "in", "or", "the", "this", "your", "turn", "gain", "create"]);
const _canonLabel = (raw) => raw.trim().replace(/\b[a-zA-Z]+/g, (w, i) =>
  (i > 0 && _SMALL_WORDS.has(w.toLowerCase())) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1));

/**
 * Parse an ability text into its book-layout blocks, in the order they are
 * written:
 *   "Flavour. Stance: … Refresh: … Effect: …"
 *   → { flavor: "Flavour.", trigger: "", sections: [{label:"Stance", text}, {label:"Refresh", …}, …] }
 * A leading "Trigger:" block (interrupt abilities) is pulled out into
 * `trigger`; a Trigger nested inside another block ("Interrupt 1: Trigger: …")
 * stays in that block's text. Unknown "Something:" prefixes are left in the
 * running text.
 *
 * @param {string} description  raw description (plain text or light HTML)
 * @returns {{ flavor: string, trigger: string, sections: Array<{label: string, text: string}> }}
 */
export function parseAbilitySections(description, { extraLabels = [] } = {}) {
  // <p>/<br> wrappers become whitespace so a label never ends up inside a
  // half-open tag; bullet lines keep their line break (see _flattenText).
  const text = _flattenText(description);
  if (!text) return { flavor: "", trigger: "", sections: [] };

  // Extra labels a caller reads on top of the shared ones (limit breaks: "Attack", "Aura").
  const re = extraLabels.length
    ? new RegExp(SECTION_RE.source.replace(`(${SECTION_LABELS.join("|")})`, `(${[...extraLabels, ...SECTION_LABELS].join("|")})`), "gi")
    : SECTION_RE;
  const hits = [];
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    const label = m[1];
    if (label[0] !== label[0].toUpperCase()) continue;           // lowercase → prose, not a label
    const labelStart = m.index + m[0].indexOf(label);
    hits.push({ label: _canonLabel(label), labelStart, bodyStart: m.index + m[0].length });
  }

  const flavor = (hits.length ? text.slice(0, hits[0].labelStart) : text).trim();
  const all = hits.map((h, i) => ({
    label: h.label,
    text:  text.slice(h.bodyStart, i + 1 < hits.length ? hits[i + 1].labelStart : undefined).trim(),
  }));
  // A granted interrupt is printed "Spirit Away — Interrupt 2: Trigger: …"
  // (Fairy Ring p.187, Gran Reversa, Drifting Leaf): its name sits before the
  // label, so it was left dangling at the end of the previous block. Move it
  // onto the interrupt's own label ("Spirit Away — Interrupt 2").
  for (let i = 1; i < all.length; i++) {
    if (!/^Interrupt \d/.test(all[i].label)) continue;
    const m = all[i - 1].text.match(/\s*\b([A-Z][A-Za-z' ]{0,40}?)\s*[—–]$/);
    if (!m) continue;
    all[i - 1].text = all[i - 1].text.slice(0, m.index).trim();
    all[i].label = `${m[1]} — ${all[i].label}`;
  }
  // The same heading written as a sentence: "Cheat Time — Interrupt 1.
  // Trigger: …" (Chronotemper p.152, Riposte, Endless Battlement, Deus Ex
  // Machina, Blazing Bond). The name and cost ended the previous block and the
  // trigger stood alone; they become one "Cheat Time — Interrupt 1" block
  // reading "Trigger: …", as in the colon form above.
  for (let i = 1; i < all.length; i++) {
    if (all[i].label !== "Trigger") continue;
    const m = all[i - 1].text.match(/\s*\b([A-Z][A-Za-z' ]{0,40}?)\s*[—–]\s*(Interrupt \d)\.$/);
    if (!m) continue;
    all[i - 1].text = all[i - 1].text.slice(0, m.index).trim();
    all[i] = { label: `${m[1]} — ${m[2]}`, text: `Trigger: ${all[i].text}` };
  }
  const sections = all.filter(s => s.text);

  let trigger = "";
  if (sections[0]?.label === "Trigger") trigger = sections.shift().text;
  return { flavor, trigger, sections };
}

/**
 * Enrich a whole ability description (item sheet), leaving the leading
 * flavour line without rule-keyword tooltips: only the rules blocks after it
 * get them. Hand-edited HTML descriptions are enriched as before, so their
 * markup is never rebuilt.
 * @param {string} description
 * @returns {Promise<string>}
 */
export async function enrichAbilityDescription(description, opts = {}) {
  const raw = String(description ?? "");
  if (/<[a-z][^>]*>/i.test(raw)) return enrichHTML(raw, opts);
  const { flavor } = parseAbilitySections(raw);
  if (!flavor) return enrichHTML(raw, opts);
  const text = _flattenText(raw);
  const rest = text.slice(flavor.length).trim();
  const head = await enrichHTML(flavor, { keywords: false });
  return rest ? `${head} ${await enrichHTML(rest, opts)}` : head;
}

/**
 * Book layout of a limit break's effect text (sheet panel, "Use Limit Break"
 * card, item sheet). The pack stores it as plain text: the tag line the book
 * prints under the cost written as the first sentence ("Divine, Unerring, True
 * Strike." Gigaflare p.208), then the rules blocks, one per line. It was shown
 * raw, so line breaks were lost and nothing was labelled. Here:
 *   - a leading sentence made only of tags becomes its own small line;
 *   - each line is a paragraph; "•" lines stay with the line above them as a
 *     list (formatBulletLists), so Lycanthropy's dash benefits are rows;
 *   - each block label (Effect, Attack, Aura, Stance, Delay, Infuse 6…) is bold
 *     at the start of its own paragraph, as for abilities; the name of an
 *     Infuse version joins its label ("Infuse 6: TETRAFLARE").
 * Hand-edited HTML is enriched as it is.
 * @param {string} text  the effect text
 * @param {object} [opts]
 * @param {(t: string) => Promise<string>} [opts.enrich]  enricher for each block (default enrichHTML)
 * @returns {Promise<string>}
 */
export async function enrichLimitBreakText(text, { enrich = (t) => enrichHTML(t) } = {}) {
  const raw = String(text ?? "");
  if (!raw.trim()) return "";
  if (/<[a-z][^>]*>/i.test(raw)) return enrich(raw);
  const lines = raw.split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const paras = [];
  for (const line of lines) {
    if (/^[•◦]/.test(line) && paras.length) paras[paras.length - 1] += `\n${line}`;
    else paras.push(line);
  }
  let tagLine = "";
  const head = /^([^.:]+)\.\s+/.exec(paras[0] ?? "");
  if (head && head[1].split(",").every(t => _LB_TAG_RE.test(t.trim()))) {
    tagLine = head[1].trim();
    paras[0] = paras[0].slice(head[0].length);
  }
  const out = tagLine ? [`<p class="icon-limit-break__tags">${escapeHTML(tagLine)}</p>`] : [];
  for (const para of paras) {
    const { flavor, trigger, sections } = parseAbilitySections(para, { extraLabels: ["Attack", "Aura"] });
    if (flavor) out.push(`<p>${await enrich(flavor)}</p>`);
    if (trigger) sections.unshift({ label: "Trigger", text: trigger });
    for (const sec of sections) {
      let label = sec.label, body = sec.text;
      const named = /\bInfuse\b/i.test(label) && /^([A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\s]{2,}?)\s*[—–]\s*/.exec(body);
      if (named) { label = `${label}: ${named[1].trim()}`; body = body.slice(named[0].length); }
      out.push(`<p class="icon-ability-section"><strong>${escapeHTML(label)}${named ? "" : ":"}</strong> ${await enrich(body)}</p>`);
    }
  }
  return out.join("");
}

/** The tags a limit break's first sentence may list (Passage to the Afterlife: "Attack, Divine, +1 boon"). */
const _LB_TAG_RE = /^(?:attack|divine|unerring|true strike|pierce|sacrifice|delay|gamble|stance|aura|summon|end turn|[+-]?\d+ (?:boons?|curses?))$/i;

/** Human label for a foe/legend action cost key. */
const NPC_COST_LABELS = { "1action": "1 Action", "2actions": "2 Actions", "free": "Free" };

/** Human label for a PC ability cost key ("2actions" → "2 Actions", "interrupt-1" → "Interrupt 1"). */
export function abilityCostLabel(cost) {
  const key = String(cost ?? "").trim();
  if (!key) return "";
  const m = key.match(/^interrupt-(\d)$/);
  if (m) return `Interrupt ${m[1]}`;
  return { "1action": "1 Action", "2actions": "2 Actions", "free": "Free Action" }[key] ?? key;
}

/**
 * The `icon-system.abilityCard` flag of a Show in Chat card: a use of this
 * ability with no attack roll, so the damage card rolled next does not take
 * the Inflict buttons of an earlier attack (damage.mjs#_inflictAttackCardId).
 */
function _abilityCardFlags(actor, name) {
  return actor ? { "icon-system": { abilityCard: { sourceActorUuid: actor.uuid, abilityName: String(name ?? "") } } } : {};
}

/**
 * Post a foe/legend action to chat (name, cost, tags, description,
 * hit/miss/area). Works for non-attack actions too — the card simply omits
 * the Hit/Miss lines when they are empty.
 * @param {Actor} actor
 * @param {{name:string, cost:string, tags?:string[], description?:string, hitEffect?:string, missEffect?:string, areaEffect?:string}} action
 */
export async function postNpcActionCard(actor, action, { statusHtml = "" } = {}) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const a = {
    name:        action?.name ?? "Action",
    cost:        NPC_COST_LABELS[action?.cost] ?? action?.cost ?? "",
    tags:        (action?.tags ?? []).filter(t => t && t.trim()),
    description: await enrichHTML(action?.description),
    hitEffect:   await enrichHTML(action?.hitEffect),
    missEffect:  await enrichHTML(action?.missEffect),
    areaEffect:  await enrichHTML(action?.areaEffect),
  };
  const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "", statusHtml });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
    flags: _abilityCardFlags(actor, a.name),
  });
}

/**
 * Post a foe/legend round action to chat (reuses the foe-action card layout,
 * with "Round N" as the cost badge).
 * @param {Actor} actor
 * @param {{name:string, roundNumber?:number, effect?:string, description?:string}} roundAction
 */
export async function postNpcRoundActionCard(actor, roundAction, { statusHtml = "" } = {}) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const rn = Number(roundAction?.roundNumber ?? 1);
  const a = {
    name:        roundAction?.name ?? "Round Action",
    cost:        rn > 1 ? `Round Action — Round ${rn}+` : "Round Action",
    tags:        [],
    description: await enrichHTML(roundAction?.description),
    effect:      await enrichHTML(roundAction?.effect),
  };
  const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "", statusHtml });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
    flags: _abilityCardFlags(actor, a.name),
  });
}

/**
 * Post a foe/legend interrupt to chat (reuses the foe-action card layout).
 * @param {Actor} actor
 * @param {{name:string, limit:number, trigger:string, effect:string, description?:string}} interrupt
 */
export async function postNpcInterruptCard(actor, interrupt, { statusHtml = "" } = {}) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const limit = Number(interrupt?.limit ?? 1);
  const a = {
    name:        interrupt?.name ?? "Interrupt",
    cost:        limit > 0 ? `Interrupt ${limit}` : "Interrupt",
    tags:        [],
    trigger:     await enrichHTML(interrupt?.trigger),
    description: await enrichHTML(interrupt?.description),
    effect:      await enrichHTML(interrupt?.effect),
  };
  const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "", statusHtml });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
    flags: _abilityCardFlags(actor, a.name),
  });
}
