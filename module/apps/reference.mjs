/**
 * reference.mjs — In-system rules reference: a turn-structure schema plus a
 * searchable glossary of ICON 1.5 combat/narrative keywords (Comeback, Exceed,
 * statuses, triggered effects, resources, …).
 *
 * Re-openable any time from the 📖 Reference button in the Character
 * Management section of the PC sheet (Notes tab → `showReference` action).
 *
 * Definitions are condensed from the ICON 1.5 rulebook glossary. Content is
 * kept in English to match the rest of the in-system UI.
 */

const GOLD   = "#e8b828";
const TEXT    = "#d8c9a8";
const DIM     = "#a89878";
const BORDER  = "#3a3528";

/** Glossary data — grouped by category. Each entry: [term, definition]. */
const GLOSSARY = [
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

function referenceHTML() {
  const subH = `color:${GOLD};margin:4px 0 8px;font-size:1.05em`;
  return `
<div class="icon-reference" style="font-size:.92em;line-height:1.5;color:${TEXT};max-height:64vh;overflow:auto;padding-right:6px">
  <h2 style="${subH}"><i class="fas fa-clock-rotate-left"></i> How a turn works</h2>
  ${turnSchemaHTML()}

  <h2 style="${subH}; margin-top:14px"><i class="fas fa-book"></i> Glossary</h2>
  <input type="text" class="icon-ref-search" placeholder="Search any term (e.g. comeback, exceed, vigor, save, shove)…"
         style="width:100%;box-sizing:border-box;margin:0 0 6px;padding:5px 8px;background:#1c1812;border:1px solid ${BORDER};border-radius:4px;color:${TEXT}">
  <div class="icon-ref-glossary">
    ${glossaryHTML()}
  </div>
  <p class="icon-ref-empty" style="display:none;color:${DIM};font-style:italic;margin:8px 0">No terms match your search.</p>
</div>`;
}

/** Wire up the live search filter once the dialog has rendered. */
function attachSearch(root) {
  if (!root) return;
  const input = root.querySelector(".icon-ref-search");
  if (!input) return;
  const terms    = Array.from(root.querySelectorAll(".icon-ref-term"));
  const sections = Array.from(root.querySelectorAll(".icon-ref-section"));
  const empty    = root.querySelector(".icon-ref-empty");
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    let anyVisible = false;
    for (const el of terms) {
      const match = !q || el.dataset.term.includes(q) || el.textContent.toLowerCase().includes(q);
      el.style.display = match ? "" : "none";
      if (match) anyVisible = true;
    }
    // Hide a section header if all its terms are filtered out.
    for (const sec of sections) {
      const visible = sec.querySelector(".icon-ref-term:not([style*='display: none'])");
      sec.style.display = visible ? "" : "none";
    }
    if (empty) empty.style.display = anyVisible ? "none" : "";
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
  label: "ICON 1.5 — Rules Reference",
};

/**
 * Action handler for the header control — register under
 * `DEFAULT_OPTIONS.actions.showReference`. Bound to the sheet instance.
 */
export function onShowReferenceControl(event) {
  showReferenceGuide();
}

/**
 * Show the rules reference (turn schema + glossary). Safe to call any time;
 * never throws.
 * @returns {Promise<unknown>}
 */
export function showReferenceGuide() {
  return foundry.applications.api.DialogV2.prompt({
    window:  { title: "ICON 1.5 — Rules Reference", icon: "fa-solid fa-book" },
    content: referenceHTML(),
    position: { width: 680 },
    render: (_event, dialog) => {
      const root = dialog?.element ?? dialog?.window?.content ?? null;
      attachSearch(root);
    },
    ok: { label: "Close", icon: "fa-solid fa-check", callback: () => true },
    rejectClose: false,
  }).catch(() => {});
}
