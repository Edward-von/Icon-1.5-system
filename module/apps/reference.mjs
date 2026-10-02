/**
 * reference.mjs — In-system rules reference (the "Quick Guide"): a
 * turn-structure schema, screen recordings of the area patterns
 * (area-diagrams.mjs), a searchable glossary of ICON 1.5 combat/narrative
 * keywords (Comeback, Exceed, statuses, triggered effects, resources, …) and
 * an FAQ of table edge cases.
 *
 * Built like the actor sheets (same window classes, banded header, core tab
 * strip, `.icon-section` panels), so it shares their look and CSS.
 *
 * Opened from the Quick Guide button in the PC sheet header, the 📖 tool in
 * the token controls, the header menu of every actor sheet (`showReference`
 * action) and the once-per-update prompt (`promptQuickGuide`).
 *
 * Definitions are condensed from the ICON 1.5 rulebook glossary. Content is
 * kept in English to match the rest of the in-system UI.
 */

import { areaDiagramsHTML, startAreaClips } from "./area-diagrams.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const _log = (...a) => console.debug("[ICON | QuickGuide]", ...a);

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
  return `
  <section class="icon-section">
    <h3 class="icon-section__title">Round</h3>
    <p class="icon-guide-text">Turns <strong>alternate</strong> between sides; a <strong>player character always goes
      first</strong>. When everyone has acted, the round ends and the next one starts with the opposite side.</p>
  </section>
  <div class="icon-guide-arrow">↓ on your turn</div>
  <section class="icon-section">
    <h3 class="icon-section__title">Your turn</h3>
    <div class="icon-guide-chips"><span class="icon-tag">1 Standard Move</span><span class="icon-tag">+ 2 Actions</span></div>
    <p class="icon-guide-text">Spend your two actions on abilities, in any order. Move at any point during your turn.</p>
  </section>
  <div class="icon-guide-arrow">↓</div>
  <section class="icon-section">
    <h3 class="icon-section__title">Limits</h3>
    <ul class="icon-guide-list">
      <li>Only <strong>one attack ability</strong> per turn.</li>
      <li>Each ability only <strong>once</strong> per turn (no duplicates).</li>
      <li>Some abilities cost <strong>both</strong> actions; some cost <strong>none</strong>.</li>
      <li><strong>Free actions</strong> don't spend an action but can't be repeated.</li>
      <li>Your standard move is taken <strong>all at once</strong>: stop to use an ability and the move ends, and any
        spaces you didn't use are <strong>lost</strong> (p.88, Movement can't be broken up).</li>
    </ul>
  </section>
  <div class="icon-guide-arrow">↓</div>
  <section class="icon-section">
    <h3 class="icon-section__title">End turn</h3>
    <p class="icon-guide-text">Pass to the next character on the other side.</p>
  </section>
  <p class="icon-guide-note"><strong>Slow turn:</strong> you may skip your turn to act after everyone else (useful to
    react). <strong>Charge</strong> effects trigger on a slow turn.</p>`;
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
    <div class="icon-ref-term icon-guide-faq" data-term="${q.toLowerCase().replace(/"/g, "")}">
      <strong class="icon-guide-faq__q">${q}</strong>
      <div class="icon-guide-faq__a">${a}</div>
    </div>`).join("");
  return `<section class="icon-section icon-ref-section">
    <h3 class="icon-section__title">Edge cases from the table</h3>
    ${rows}
  </section>`;
}

/** Build the glossary HTML (one panel per category; each term is a filterable row). */
function glossaryHTML() {
  return GLOSSARY.map(sec => {
    const rows = sec.terms.map(([term, def]) => `
      <div class="icon-ref-term icon-guide-term" data-term="${term.toLowerCase()}">
        <strong>${term}</strong> <span>— ${def}</span>
      </div>`).join("");
    const noteHTML = sec.note ? `<p class="icon-guide-note">${sec.note}</p>` : "";
    return `<section class="icon-section icon-ref-section">
      <h3 class="icon-section__title">${sec.title}</h3>
      ${noteHTML}
      ${rows}
    </section>`;
  }).join("");
}

/** The guide's tabs, in order; `searchable` panes take part in the search. */
const PANES = [
  { id: "turn",     icon: "fa-solid fa-clock-rotate-left", label: "Turn",     html: () => turnSchemaHTML() },
  { id: "areas",    icon: "fa-solid fa-vector-square",     label: "Areas",    html: () => `<section class="icon-section">${areaDiagramsHTML()}</section>` },
  { id: "glossary", icon: "fa-solid fa-book",              label: "Glossary", html: () => glossaryHTML(), searchable: true },
  { id: "faq",      icon: "fa-solid fa-circle-question",   label: "FAQ",      html: () => faqHTML(),      searchable: true },
];

/** Tab shown when the guide opens: the last one used in this browser session. */
let lastTab = "turn";

/**
 * The Quick Guide window. One instance at a time; `showReferenceGuide` brings
 * it to the front (and switches tab) when it is already open.
 */
export class QuickGuide extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "icon-quick-guide",
    classes: ["icon", "sheet", "icon-quick-guide"],
    position: { width: 720, height: 720 },
    window: { title: "ICON 1.5 — Quick Guide", icon: "fa-solid fa-book-open", resizable: true },
  };

  static PARTS = {
    header:   { template: "systems/icon-system/templates/apps/quick-guide/header.hbs" },
    tabs:     { template: "templates/generic/tab-navigation.hbs" },
    turn:     { template: "systems/icon-system/templates/apps/quick-guide/pane.hbs" },
    areas:    { template: "systems/icon-system/templates/apps/quick-guide/pane.hbs" },
    glossary: { template: "systems/icon-system/templates/apps/quick-guide/pane.hbs" },
    faq:      { template: "systems/icon-system/templates/apps/quick-guide/pane.hbs" },
    empty:    { template: "systems/icon-system/templates/apps/quick-guide/empty.hbs" },
  };

  static TABS = {
    primary: { tabs: PANES.map(({ id, icon, label }) => ({ id, icon, label })), initial: "turn" },
  };

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const pane = PANES.find(p => p.id === partId);
    if (pane) context.pane = { id: pane.id, html: pane.html(), cssClass: context.tabs?.[pane.id]?.cssClass ?? "" };
    return context;
  }

  changeTab(tab, group, options = {}) {
    super.changeTab(tab, group, options);
    lastTab = tab;
    // Picking a tab ends a search.
    const input = this.element?.querySelector(".icon-guide-search");
    if (input?.value && !options.fromSearch) { input.value = ""; this.#filter(""); }
    this.element?.querySelector(".window-content")?.scrollTo(0, 0);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    _log(`rendered on "${this.tabGroups.primary}"`);
    const input = this.element.querySelector(".icon-guide-search");
    input?.addEventListener("input", () => this.#filter(input.value));
    startAreaClips(this.element);
  }

  /**
   * Search: show the matching rows of every searchable pane together (no tab
   * lit); an empty query goes back to the tab that was open.
   */
  #filter(raw) {
    const root = this.element;
    const q = raw.trim().toLowerCase();
    root.classList.toggle("is-searching", !!q);
    for (const a of root.querySelectorAll(".tabs > [data-tab]")) a.classList.toggle("active", !q && a.dataset.tab === lastTab);
    for (const el of root.querySelectorAll(".icon-ref-term")) {
      el.hidden = !!q && !(el.dataset.term.includes(q) || el.textContent.toLowerCase().includes(q));
    }
    for (const sec of root.querySelectorAll(".icon-ref-section")) {
      sec.hidden = !!q && !sec.querySelector(".icon-ref-term:not([hidden])");
    }
    let any = false;
    for (const pane of PANES) {
      const el = root.querySelector(`.tab[data-tab="${pane.id}"]`);
      if (!el) continue;
      const show = !!pane.searchable && !!el.querySelector(".icon-ref-term:not([hidden])");
      el.classList.toggle("is-match", !!q && show);
      if (show) any = true;
    }
    const empty = root.querySelector(".icon-guide-empty");
    if (empty) empty.hidden = !q || any;
    if (!q) this.changeTab(lastTab, "primary", { force: true, fromSearch: true });
  }
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
 * the last tab used. Safe to call any time; never throws.
 * @returns {Promise<QuickGuide|void>}
 */
export async function showReferenceGuide({ tab } = {}) {
  try {
    const target = PANES.some(p => p.id === tab) ? tab : lastTab;
    const open = foundry.applications.instances.get("icon-quick-guide");
    if (open?.rendered) {
      open.changeTab(target, "primary", { force: true });
      open.bringToFront();
      return open;
    }
    const app = new QuickGuide();
    app.tabGroups.primary = target;
    return await app.render({ force: true });
  } catch (err) {
    console.error("[ICON | QuickGuide] could not open the guide", err);
  }
}

/* -------------------------------------------------- */
/*  Once-per-update prompt                             */
/* -------------------------------------------------- */

const PROMPT_SETTING = "quickGuidePromptVersion";

/** Register the client setting holding the last version the prompt was shown for. Call from init. */
export function registerQuickGuidePromptSetting() {
  game.settings.register("icon-system", PROMPT_SETTING, {
    name:    "Quick Guide prompt shown for version",
    scope:   "client",
    config:  false,
    type:    String,
    default: "",
  });
}

/**
 * Ask every user, once per system version, whether they want to open the
 * Quick Guide. `stampOnly` records the version without asking (used on a
 * first launch, where the welcome guide is already on screen).
 */
export async function promptQuickGuide({ stampOnly = false } = {}) {
  const version = game.system.version ?? "";
  const seen = game.settings.get("icon-system", PROMPT_SETTING) ?? "";
  _log(`prompt: version ${version} | last shown for "${seen || "(never)"}"`);
  if (seen === version) return;
  await game.settings.set("icon-system", PROMPT_SETTING, version);
  if (stampOnly) return;

  const open = await foundry.applications.api.DialogV2.confirm({
    window:  { title: `ICON 1.5 — version ${version}`, icon: "fa-solid fa-book-open" },
    content: `<p>The ICON 1.5 system has been updated to <strong>${version}</strong>.</p>
      <p>Do you want to open the <strong>Quick Guide</strong>? It covers how a turn works, every area pattern, the
      glossary and an FAQ of edge cases. You can open it any time from the Quick Guide button on your character
      sheet or the <i class="fa-solid fa-book"></i> book in the token controls.</p>`,
    yes: { label: "Open the Quick Guide", icon: "fa-solid fa-book-open", default: true },
    no:  { label: "Not now", icon: "fa-solid fa-xmark" },
    rejectClose: false,
  }).catch(() => false);
  if (open) showReferenceGuide({ tab: "turn" });
}
