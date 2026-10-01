/**
 * reference.mjs — In-system rules reference (the "quick guide"): a
 * turn-structure schema, animated pictures of the area patterns
 * (area-diagrams.mjs), a searchable glossary of ICON 1.5 combat/narrative
 * keywords (Comeback, Exceed, statuses, triggered effects, resources, …) and
 * an FAQ of table edge cases.
 *
 * Opened from the Quick Guide button in the PC sheet header, the 📖 tool in
 * the token controls, and the header menu of every actor sheet
 * (`showReference` action).
 *
 * Definitions are condensed from the ICON 1.5 rulebook glossary. Content is
 * kept in English to match the rest of the in-system UI.
 */

import { areaDiagramsHTML } from "./area-diagrams.mjs";

const GOLD   = "#e8b828";
const TEXT    = "#d8c9a8";
const DIM     = "#a89878";
const BORDER  = "#3a3528";

/** Glossary data — grouped by category. Each entry: [term, definition].
 *  Also the single source of the inline keyword tooltips (helpers/keywords.mjs). */
export const GLOSSARY = [
  {
    title: "Core Stats & Health",
    terms: [
      ["Vitality (VIT)", "Your health stat. Multiply by 4 to get your Hit Points. Many effects heal/deal damage equal to your VIT (= 25% of max HP)."],
      ["Hit Points (HP)", "Your health, equal to 4× VIT. Reach <strong>0 HP</strong> and you're defeated: incapacitated and you take a wound. You always heal to bloodied after combat."],
      ["Defense", "How hard you are to hit. An attacker must <strong>match or beat</strong> your defense with the attack roll; lower is a miss."],
      ["Speed", "How far you can move with a standard move (full speed) or a dash (half speed)."],
      ["Size", "How many spaces a character occupies. Player characters are size 1 (a 1×1 space)."],
      ["Save", "Roll 1d20 against a hostile effect; you succeed (resisting or ending it) on a <strong>10+</strong>."],
      ["Armor X", "Reduce all incoming damage by X. If multiple apply, use only the highest value."],
      ["Wound", "Fill 25% of your HP from the right side of the bar, lowering your max HP. Usually taken on defeat; heals only at an interlude. <strong>4 wounds = fallen</strong> (total defeat)."],
    ],
  },
  {
    title: "Actions & Timing",
    terms: [
      ["Standard Move", "A free-action ability all characters get each turn: move up to your speed. Orthogonal only; can't be split once stopped."],
      ["Free Action", "Doesn't cost an action to perform, but can't be repeated and must be taken on your turn."],
      ["Interrupt X", "A reaction ability used when its trigger occurs, even on another character's turn. Usable X times per round; only <strong>one interrupt per turn</strong> (yours or anyone's)."],
      ["Delay", "A slow but powerful effect: your next turn must be slow, and the effect resolves at the <strong>start</strong> of that turn, before anything else."],
      ["Slow Turn", "Skip to act after all other characters. Several slow characters keep the normal alternating order. Triggers <strong>Charge</strong> effects."],
      ["End Turn", "This ability ends your turn. If several things would end your turn at once, you choose only one."],
      ["Effect", "A part of an ability that simply happens to all targets — no attack roll or save required."],
      ["Auto-hit", "An attack that doesn't roll: it always hits (but is never a critical hit or a miss)."],
      ["Limit Break", "Each job's signature ability, usable <strong>once per combat</strong>, fueled by Resolve."],
      ["Resolve", "Special resource powering the Limit Break; it builds up each round you remain in combat."],
    ],
  },
  {
    title: "Triggered Effects",
    note: "Bonus effects that turn on when their condition is met. Each unique effect can trigger only once per ability and once per trigger. This is the complete list of triggers in ICON 1.5.",
    terms: [
      ["Triggered Effect", "An effect that activates under a certain condition (critical hit, slay, collide, etc.). Each unique effect triggers once per ability and once per trigger."],
      ["Comeback", "Triggers if the character using the ability is <strong>bloodied</strong> (at or under 50% HP)."],
      ["Exceed", "Triggers when the attacker makes a total attack roll of <strong>15+</strong>."],
      ["Critical Hit", "Triggers on a total attack roll of <strong>20+</strong>: increase attack damage by +[D]. Once per attack."],
      ["Charge", "Triggers when the ability is used on a <strong>slow turn</strong>."],
      ["Collide", "Triggers on any character shoved into an obstruction by the ability."],
      ["Slay", "Triggers when the ability reduces at least one character to <strong>0 HP</strong>."],
      ["Finishing Blow", "<em>Vagabond only.</em> Triggers if the ability targets a <strong>bloodied</strong> foe."],
      ["Heroic", "<em>Stalwart only.</em> Triggers when its special condition is met (shove a character, sacrifice HP, etc., depending on job)."],
      ["Chain Reaction", "<em>Wright only.</em> Triggers when the ability damages <strong>two or more foes</strong>."],
      ["Infuse", "<em>Wright only.</em> Triggers when <strong>Aether is spent</strong> on an ability."],
      ["Gamble", "Roll 1d6 and trigger the listed effect on a result or higher (e.g. 4+ means 4, 5, or 6)."],
    ],
  },
  {
    title: "Attacks & Damage",
    terms: [
      ["Boon", "Roll +1d6 per boon and add the highest to your attack roll. Boons and curses cancel 1-to-1."],
      ["Curse", "Roll −1d6 per curse and apply the lowest to your attack roll. Cancels boons 1-to-1."],
      ["[D]", "Your class <strong>damage die</strong> (d6, d8, …). Roll it whenever you see the [D] symbol."],
      ["Fray Damage", "Fixed damage, usually added to all attacks on hit <em>or</em> miss."],
      ["Bonus Damage", "Roll one extra [D] for each instance of bonus damage and take the highest result."],
      ["Pierce", "Damage cannot be reduced by armor or weakened."],
      ["Resistance", "Take half damage, rounded up."],
      ["Cover", "Halves all damage from an ability the character has cover from."],
      ["Divine", "Damage that cannot be reduced, mitigated, or negated except by immunity (ignores armor, weak, resistance, defiance, and bypasses vigor)."],
      ["Sacrifice X", "Reduce your own HP by X as a cost, paid at the start of the ability. Can't be reduced, transferred, or resisted, and never brings you below 1 HP."],
      ["Immune to X", "Not affected by X in any way — doesn't even count as taking it."],
    ],
  },
  {
    title: "Movement & Positioning",
    terms: [
      ["Dash", "Special movement that ignores engagement."],
      ["Rush X", "An armored dash: move X spaces while <strong>unstoppable</strong> and immune to all damage."],
      ["Fly", "Ignores terrain/height penalties, obstruction, and engagement while moving."],
      ["Teleport X", "Instantly move to an unoccupied space within range X, ignoring everything in between."],
      ["Engagement", "Exiting a space adjacent to a foe costs +1 space of movement."],
      ["Difficult Terrain", "Costs +1 space of movement to exit."],
      ["Dangerous Terrain", "Entering or exiting deals 2 piercing damage (once per turn)."],
      ["Obstruction", "A space a character can't normally enter. By default: foes, terrain, and objects."],
      ["Elevation (Height)", "Moving up costs +1 space to enter per level of difference in elevation."],
      ["Line of Sight", "Being able to see and interact with a space. If there's any ambiguity, draw a line between the spaces to check."],
      ["Shove X", "Move a character involuntarily X spaces in a straight line away from you; if blocked, they Collide and stop."],
      ["Rampart", "Foes cannot enter or exit affected spaces by dashing, flying, or teleporting."],
      ["Aetherwall", "Blocks line of sight / certain abilities (Unerring ignores it)."],
    ],
  },
  {
    title: "Negative Statuses",
    note: "A status is a negative effect. Ongoing (+) statuses can't be purged, removed, or avoided.",
    terms: [
      ["Blind", "Max range of all abilities is 2."],
      ["Dazed", "+1 curse on attacks."],
      ["Hatred of X", "Deal half damage to all foes other than foe X (ends at end of your turn)."],
      ["Pacified", "Deals half damage. Breaks when damaged by a foe's ability."],
      ["Sealed", "Cannot inflict statuses."],
      ["Shattered", "Cannot gain or benefit from vigor."],
      ["Slashed", "Take 4 damage after you or an ally moves you (once per turn)."],
      ["Stunned", "Can't take interrupts; your next ability ends your turn, then the status ends."],
      ["Weakened", "All damage dealt reduced by 2."],
      ["Vulnerable", "All damage taken increased by 1."],
    ],
  },
  {
    title: "Positive Effects",
    terms: [
      ["Counter", "When damaged by an ability, deal 2 damage back each time damage is applied."],
      ["Defiance", "Prevents HP from dropping past 1. When it triggers, it's removed and you become immune to all damage for the rest of the turn."],
      ["Dodge", "Immune to all damage from misses, successful saves, and area effects."],
      ["Evasion", "When attacked, roll 1d6 before the attack roll; on 4+ the attack automatically misses."],
      ["Flying", "Ignores terrain damage, movement/height penalties, obstruction, and engagement."],
      ["Intangible", "Immune to damage and effects from foes; gives no obstruction or engagement."],
      ["Phasing", "Can pass through terrain, objects, and characters (but not end your turn there)."],
      ["Regeneration", "If bloodied, gain 4 vigor at the end of your turn."],
      ["Skirmisher", "Can move diagonally; dash is full speed."],
      ["Stealth", "Cannot be directly targeted except from an adjacent space. Breaks on any ability other than dash/standard move."],
      ["Sturdy", "When moved/placed by a foe, can only be moved max 1 space per turn."],
      ["True Strike", "Ignores dodge, blind, evasion, and stealth."],
      ["Unerring", "Ignores cover and aetherwall."],
      ["Unstoppable", "Immune to all statuses; can't be moved by foes; movement ignores engagement and rampart."],
    ],
  },
  {
    title: "States & Persistent Effects",
    terms: [
      ["Bloodied", "At or under 50% of max HP. (Triggers Comeback, Finishing Blow, etc.)"],
      ["Immobile", "Can't move, be moved, or be removed from the battlefield in any way."],
      ["Incapacitated", "Doesn't take turns or give obstruction/engagement; all its effects, marks, and summons are removed."],
      ["Defeated", "Reduced to <strong>0 HP</strong>: you become incapacitated and take a wound. A defeated ally can be brought back by <strong>Rescue</strong> (ends incapacitated, heals to full HP minus wounds)."],
      ["Fallen", "Reached <strong>4 wounds</strong> — total defeat. The character is dead or irrevocably changed and exits the campaign."],
      ["Ongoing (+)", "A status/effect that can't end until its source (a mark, a stance) ends. Marked with a + symbol."],
      ["Mark", "An ongoing effect placed on a target. One mark per ability, and one mark between two characters at a time."],
      ["Stance", "An ongoing positive effect. Only one stance at a time; drop it for a new stance or as a free action at the start of your turn."],
      ["Aura X", "A continuous, ongoing (+) effect on all specified characters within range X of an origin point (usually a character). Only affects them while inside."],
      ["Area Ability", "An ability that applies its effects in a large, fixed pattern of spaces."],
      ["Terrain Effect", "Something that creates or modifies the terrain of spaces on the battlefield."],
      ["Summon", "A character controlled by its summoner. Intangible; doesn't take turns or count as an ally/foe. Acts via a summon action on the summoner's turn; removed if the summoner is defeated."],
    ],
  },
  {
    title: "Resources & Tokens",
    terms: [
      ["Vigor", "A shield over your HP equal to your VIT. Damage hits vigor first; benefits from armor/resistance. Caps at 25% of HP; a vigor surge sets it to max. Lost at end of combat."],
      ["Cure", "A cured character gains 4 vigor (or a vigor surge if bloodied), then may save against all statuses."],
      ["Vigor Surge", "Immediately gain vigor equal to your full <strong>VIT</strong> (sets vigor to its max). Granted by Cure / Recover while bloodied."],
      ["Vigilance X", "X charges (d6 each). Spend any number on a trigger, rolling 1d6 per charge and taking the highest, to reduce damage to a nearby ally or punish a foe breaking adjacency."],
      ["Power Die", "A die ticked up/down by conditions, unique to the ability that granted it. Usually starts at 1 tick; if it ticks to 0, discard it."],
      ["Blessing", "A token (from certain abilities) you can spend for powerful effects; by default, spend one for +1 boon on a save. Discarded at end of combat."],
      ["Combo", "A combo ability has a base and combo version. Using the base grants a combo token; with a token, you use the combo version instead and discard the token. Max one token; all are discarded at end of combat."],
      ["Rebound", "A rebounded ability can be bounced off a character in range: it has no effect on them, but is redirected using their space as the origin (re-checking cover, line of sight, etc). Doesn't stack."],
    ],
  },
  {
    title: "Narrative (out of combat)",
    terms: [
      ["Effort", "Narrative resource. Spend 1 Effort to take a heroic/exceptional narrative action; an ally can spend it for you."],
      ["Strain", "Narrative harm (1 / 2 / 4 by risk) taken to avoid serious injury outside combat. Filling all strain boxes <strong>breaks</strong> the character."],
      ["Break", "When strain fills up: clear all strain boxes and take a burden. You stop being broken at the end of the scene."],
      ["Burden", "Long-term harm taken on a break: write its nature and tick two actions (with more than 0d) to −1d until it's healed."],
      ["Trait", "A passive ability from your job, class, or relics that always applies to your character."],
      ["Mastery", "An upgrade every ability (even Limit Breaks) has, which further improves it."],
    ],
  },
];

/** Build the visual turn-structure schema. */
function turnSchemaHTML() {
  const step = `background:#241f17;border:1px solid ${BORDER};border-radius:6px;padding:7px 10px;margin:0`;
  const arrow = `text-align:center;color:${GOLD};font-size:1.1em;margin:2px 0`;
  const tag = `display:inline-block;background:#2e2818;border:1px solid ${BORDER};border-radius:4px;padding:1px 7px;margin:2px 3px 0 0;color:${GOLD};font-weight:bold;font-size:.9em`;
  return `
  <div style="margin:0 0 6px">
    <div style="${step}">
      <strong style="color:${GOLD}">Round</strong> — turns <strong>alternate</strong> between sides; a <strong>player character always goes first</strong>. When everyone has acted, the round ends and the next one starts with the opposite side.
    </div>
    <div style="${arrow}">↓ on your turn</div>
    <div style="${step}">
      <span style="${tag}">1 Standard Move</span><span style="${tag}">+ 2 Actions</span>
      <div style="margin-top:5px;color:${TEXT}">Spend your two actions on abilities, in any order. Move at any point during your turn.</div>
    </div>
    <div style="${arrow}">↓</div>
    <div style="${step}">
      <strong style="color:${GOLD}">Limits</strong>
      <ul style="margin:4px 0 0;padding-left:18px;color:${TEXT}">
        <li>Only <strong>one attack ability</strong> per turn.</li>
        <li>Each ability only <strong>once</strong> per turn (no duplicates).</li>
        <li>Some abilities cost <strong>both</strong> actions; some cost <strong>none</strong>.</li>
        <li><strong>Free actions</strong> don't spend an action but can't be repeated.</li>
      </ul>
    </div>
    <div style="${arrow}">↓</div>
    <div style="${step}">
      <strong style="color:${GOLD}">End turn</strong> → pass to the next character on the other side.
    </div>
    <p style="margin:7px 0 0;font-size:.85em;color:${DIM}">
      💡 <strong>Slow turn:</strong> you may skip your turn to act after everyone else (useful to react). <strong>Charge</strong> effects trigger on a slow turn.
    </p>
  </div>`;
}

/**
 * Edge cases that come up at the table, as [question, answer]. Collected by
 * the playtest group (October 2026) and checked against the rulebook; page
 * numbers are the PDF's "N of 501".
 */
export const FAQ = [
  ["When are interrupts reset?",
   "At the start of each of your turns. Each interrupt can be used as many times as its tag says (Interrupt 1, Interrupt 2…) between your turns, and only one interrupt per turn, yours or anyone else's (p.91, Interrupts)."],
  ["What are the engagement rules?",
   "Leaving a space adjacent to a foe costs +1 space of movement. A dash ignores engagement, and so does flying (p.88, Movement penalties; Dash, rush, fly, and teleport). But a space affected by Rampart can't be entered or left by dashing, flying or teleporting (p.104, Rampart)."],
  ["Can in-combat abilities be used out of combat?",
   "Not by the book: narrative play and tactical combat have separate rules with next to no overlap (p.11, Two modes of play). Some house rules to ask your GM about: use each ability once per combat or per session for a bonus on a related roll (+1 boon, increased effect…), use it for flavour only, or open a combat with it as a \"first strike\" that doesn't spend actions on your turn."],
  ["In what order do the effects of an ability resolve?",
   "In the order they are listed, unless the ability says otherwise; some effects happen before the attack even though they are written after it, for ease of formatting (p.108, Order of operations)."],
  ["Are summons allies?",
   "No. Summons count as neither foes nor allies: they can only be targeted by abilities that can target any character, or that name summons specifically (p.92, Targeting)."],
  ["Cover or Resistance together with Armor: which comes first?",
   "First the attacker's additions and multiplications (bonus damage and the like), then the defender's Armor and other reductions, then the defender's multiplications and divisions, such as Resistance. Example: 5 damage against 2 Armor and Resistance → 5 − 2 = 3, halved to 1.5, rounded up to 2. Vigor takes damage before HP, and Armor and Resistance apply to it normally (p.106, Damage order). The Apply button on damage cards follows this order."],
  ["I'm on a height 3 object and my target is next to me, down in a pit. Can a Range 2 ability hit them?",
   "Yes, and so can a melee attack. ICON doesn't track vertical space: height and elevation don't count for range or adjacency, and even flying characters can be reached in melee (p.106, Height). Think of areas (auras, blasts…) as columns, not spheres."],
  ["The sheet says I have 5 AP at level 2, but the book says 6!",
   "The sheet is right. The +1 AP at 7 XP starts at level 1 (p.15, Character Advancement), so there is none between level 0 and level 1. The Total AP column of the advancement table (p.115) counts it anyway, which puts every total one AP too high."],
  ["Why can't I save against Immobile?",
   "Immobile is a special state, not a status, so it can't be saved against (p.94, Special States)."],
  ["What does (+) mean?",
   "On a status or effect it means ongoing: it can't be saved against, removed or ignored until whatever causes it is lifted (p.94, Ongoing (+)). Elsewhere a \"+\" may stand for a boon, written +1D: in combat roll a d6 per boon and add the highest to the d20; in narrative play add a d6 to the pool per boon (p.12, Boons and curses)."],
  ["Is \"remove from the battlefield and place\" the same as teleporting?",
   "No. A character who is picked up and placed doesn't count as moving, so it doesn't trigger effects, interrupts or abilities that trigger off movement, and it isn't stopped by Rampart or Vigilance (p.88, Removing and placing characters)."],
];

/** FAQ entries — same filterable rows as the glossary. */
function faqHTML() {
  const rows = FAQ.map(([q, a]) => `
    <div class="icon-ref-term" data-term="${q.toLowerCase().replace(/"/g, "")}" style="margin:0 0 9px;padding-left:2px">
      <strong style="color:${TEXT}">${q}</strong>
      <div style="color:${DIM};margin-top:2px">${a}</div>
    </div>`).join("");
  return `<section class="icon-ref-section">${rows}</section>`;
}

/** Build the glossary HTML (sectioned; each term is a filterable row). */
function glossaryHTML() {
  const sectionH = `color:${GOLD};margin:14px 0 5px;font-size:.95em;border-bottom:1px solid ${BORDER};padding-bottom:3px`;
  return GLOSSARY.map(sec => {
    const rows = sec.terms.map(([term, def]) => `
      <div class="icon-ref-term" data-term="${term.toLowerCase()}" style="margin:0 0 5px;padding-left:2px">
        <strong style="color:${TEXT}">${term}</strong>
        <span style="color:${DIM}"> — ${def}</span>
      </div>`).join("");
    const noteHTML = sec.note ? `<p style="margin:0 0 6px;font-size:.85em;color:${DIM};font-style:italic">${sec.note}</p>` : "";
    return `<section class="icon-ref-section">
      <h3 style="${sectionH}">${sec.title}</h3>
      ${noteHTML}
      ${rows}
    </section>`;
  }).join("");
}

/** The guide's tabs, in order. */
const TABS = [
  { id: "turn",     icon: "fa-clock-rotate-left", label: "Turn",     title: "How a turn works" },
  { id: "areas",    icon: "fa-vector-square",     label: "Areas",    title: "Areas" },
  { id: "glossary", icon: "fa-book",              label: "Glossary", title: "Glossary" },
  { id: "faq",      icon: "fa-circle-question",   label: "FAQ",      title: "FAQ" },
];

/** Tab shown when the guide opens: the last one used in this browser session. */
let lastTab = "turn";

function referenceHTML(active) {
  const subH = `color:${GOLD};margin:4px 0 8px;font-size:1.05em`;
  const body = { turn: turnSchemaHTML(), areas: areaDiagramsHTML(), glossary: glossaryHTML(), faq: faqHTML() };
  const tabs = TABS.map(t => `
  <a class="${t.id === active ? "active" : ""}" data-ref-tab="${t.id}"><i class="fas ${t.icon}"></i> ${t.label}</a>`).join("");
  const panes = TABS.map(t => `
  <section class="icon-ref-pane" data-ref-pane="${t.id}" ${t.id === active ? "" : "hidden"}>
    <h2 style="${subH}"><i class="fas ${t.icon}"></i> ${t.title}</h2>
    ${body[t.id]}
  </section>`).join("");
  return `
<nav class="icon-ref-nav">${tabs}
</nav>
<input type="text" class="icon-ref-search" placeholder="Search the glossary and FAQ (e.g. comeback, vigor, summons, armor)…"
       style="width:100%;box-sizing:border-box;margin:0 0 6px;padding:5px 8px;background:#1c1812;border:1px solid ${BORDER};border-radius:4px;color:${TEXT}">
<div class="icon-reference" style="font-size:.92em;line-height:1.5;color:${TEXT};height:60vh;overflow:auto;padding-right:6px">
  ${panes}
  <p class="icon-ref-empty" style="display:none;color:${DIM};font-style:italic;margin:8px 0">Nothing matches your search.</p>
</div>`;
}

/**
 * Tabs and search. A tab shows one pane. Typing in the search box shows the
 * matching rows of the Glossary and FAQ together (no tab lit); clearing it
 * goes back to the tab that was open.
 */
function attachTabs(root) {
  if (!root) return;
  const body  = root.querySelector(".icon-reference");
  const input = root.querySelector(".icon-ref-search");
  const links = Array.from(root.querySelectorAll("[data-ref-tab]"));
  const panes = Array.from(root.querySelectorAll("[data-ref-pane]"));
  const terms = Array.from(root.querySelectorAll(".icon-ref-term"));
  const empty = root.querySelector(".icon-ref-empty");
  if (!body || !input) return;

  const show = id => {
    lastTab = id;
    for (const a of links) a.classList.toggle("active", a.dataset.refTab === id);
    for (const p of panes) p.hidden = p.dataset.refPane !== id;
    for (const el of terms) el.style.display = "";
    for (const sec of root.querySelectorAll(".icon-ref-section")) sec.style.display = "";
    if (empty) empty.style.display = "none";
    body.scrollTop = 0;
  };

  for (const a of links) a.addEventListener("click", ev => {
    ev.preventDefault();
    if (input.value) input.value = "";
    show(a.dataset.refTab);
  });

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return show(lastTab);
    for (const a of links) a.classList.remove("active");
    let any = false;
    for (const el of terms) {
      const match = el.dataset.term.includes(q) || el.textContent.toLowerCase().includes(q);
      el.style.display = match ? "" : "none";
      if (match) any = true;
    }
    // Hide a glossary category whose terms are all filtered out.
    for (const sec of root.querySelectorAll(".icon-ref-section")) {
      sec.style.display = sec.querySelector(".icon-ref-term:not([style*='display: none'])") ? "" : "none";
    }
    // Only the searchable panes, and only those with something left in them.
    for (const p of panes) {
      p.hidden = !p.querySelector(".icon-ref-term:not([style*='display: none'])");
    }
    if (empty) empty.style.display = any ? "none" : "";
  });
}

/**
 * Shared window header-control descriptor — add to a sheet's
 * `DEFAULT_OPTIONS.window.controls` so the Reference is reachable from the title
 * bar on every sheet (player and GM alike).
 */
export const REFERENCE_CONTROL = {
  action: "showReference",
  icon: "fa-solid fa-book",
  label: "ICON 1.5 — Quick Guide",
};

/**
 * Action handler for the header control — register under
 * `DEFAULT_OPTIONS.actions.showReference`. Bound to the sheet instance.
 */
export function onShowReferenceControl(event) {
  showReferenceGuide();
}

/**
 * Show the quick guide (tabs: turn schema, areas, glossary, FAQ), on `tab` or
 * the last tab used. Safe to call any time;
 * never throws.
 * @returns {Promise<unknown>}
 */
export function showReferenceGuide({ tab } = {}) {
  const active = TABS.some(t => t.id === tab) ? tab : lastTab;
  // A string content goes through foundry.utils.cleanHTML, which strips the
  // inline <svg> of the area pictures; a bare <div> is taken as-is.
  const content = document.createElement("div");
  content.innerHTML = referenceHTML(active);
  return foundry.applications.api.DialogV2.prompt({
    window:  { title: "ICON 1.5 — Quick Guide", icon: "fa-solid fa-book-open" },
    content,
    position: { width: 680 },
    render: (_event, dialog) => {
      const root = dialog?.element ?? dialog?.window?.content ?? null;
      attachTabs(root);
    },
    ok: { label: "Close", icon: "fa-solid fa-check", callback: () => true },
    rejectClose: false,
  }).catch(() => {});
}
