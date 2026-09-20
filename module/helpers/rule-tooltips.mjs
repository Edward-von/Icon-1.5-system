/**
 * rule-tooltips.mjs — Rule explanations for ICON ability tags.
 *
 * Ability items store their rule tags as a flat array like:
 *   ["attack", "range-3", "true-strike"]
 *
 * This module maps each tag (or tag family with a numeric suffix, e.g.
 * "range-N", "rush-N") to a human-readable explanation shown as a
 * Foundry `data-tooltip` popup when hovering the tag badge.
 *
 * Sources: ICON 1.5 "MOST RELEVANT RULES" / "Relevant Rules" sections of
 * each class (Stalwart p.116-117, Vagabond p.145-146, Mendicant p.172-173,
 * Wright p.204-205) + per-job bulleted rule lists + quick-reference tables.
 */

/**
 * Each entry is either:
 *   - a string: the full tooltip text
 *   - a function(n): receives the numeric suffix for tag families like "range-3"
 */
const RULES = {
  /* ==================== ATTACK / TARGETING ==================== */
  "attack":      "Attack: 1d20 + boons/curses vs target Defense. Hit on total ≥ Defense, critical on total ≥ 20.",
  "autohit":     "Auto-hit: the attack hits automatically — no d20 attack roll is needed.",
  "true-strike": "True Strike: attacks ignore Dodge, Evasion, Blind, and Stealth. Essential against Skirmisher foes.",
  "unerring":    "Unerring: attacks ignore Cover and Aetherwall.",
  "pierce":      "Pierce: damage ignores Armor, Weakened, and Vigor. Great against heavily armored foes.",

  /* ==================== RANGE / TEMPLATES ==================== */
  "range":       (n) => `Range ${n}: the ability can target or reach up to ${n} spaces away.`,
  "line":        (n) => `Line ${n}: a straight orthogonal line, ${n} spaces long.`,
  "width":       (n) => `Width ${n}: the line is ${n} spaces wide instead of 1 (extra width added on either side, p.97).`,
  "no-max-range":"No maximum range: the ability can target any distance, line of sight permitting.",
  "melee":       "Melee: the ability only reaches adjacent characters (within 1 space, diagonals included, p.85).",
  "interrupt":   (n) => n ? `Interrupt ${n}: a reaction usable ${n} time${n > 1 ? "s" : ""} per round, outside your turn, when its trigger happens.`
                          : "Interrupt: a reaction usable outside your turn when its trigger happens; the number is how many times per round.",
  "arc":         (n) => `Arc ${n}: ${n} contiguous spaces that can bend; no diagonals.`,
  "burst":       (n) => `Burst ${n}: centered on target, ${n} spaces outward; usually excludes the target space.`,
  "blast":       "Blast: fixed template (see diagram).",
  "blast-s":     "Small Blast: the centre space and the 4 next to it — 5 spaces (p.98).",
  "blast-m":     "Medium Blast: the 3×3 block around the centre — 9 spaces (p.98).",
  "blast-l":     "Large Blast: every space within 2 orthogonal steps of the centre — 13 spaces (p.98).",
  "aura":        (n) => n ? `Aura ${n}: continuous ongoing effect that affects all characters within ${n} spaces of the origin (usually the user). Only affects characters while inside.`
                           : "Aura: continuous ongoing effect that affects all characters within the specified range of an origin point. Only affects characters while inside.",

  /* ==================== MOVEMENT ==================== */
  "dash":        "Dash: special movement that ignores Engagement. Half your Speed, rounded up. 1-action ability.",
  "rush":        (n) => `Rush ${n}: move ${n} spaces. While moving you are Unstoppable and immune to all damage and statuses for the duration of the move.`,
  "fly":         "Flying: ignore all terrain (except Impassable), engagement, and obstruction while moving. Must end on a valid space.",
  "flying":      "Flying: ignore all terrain (except Impassable), engagement, and obstruction while moving. Must end on a valid space.",
  "teleport":    (n) => `Teleport ${n}: instantly move to a free space within ${n} spaces, ignoring everything between origin and destination. You don't need line of sight.`,
  "phasing":     "Phasing: can move through other characters' spaces and some obstacles during this movement.",
  "end-turn":    "End Turn: this ability ends your turn immediately. If multiple effects would end your turn at once, you can only choose one.",
  "delay":       "Delay: a slow but powerful effect that typically ends your turn. When you use a delay effect, your next turn must be a slow turn. The effect occurs at the start of that turn.",

  /* ==================== TRIGGERED EFFECTS ==================== */
  "charge":      "Charge: triggers when you use this ability on a Slow Turn.",
  "heroic":      "Heroic: Stalwart trigger. Using a heroic effect prevents further heroics until the end of your next turn, and you deal half damage that turn.",
  "exceed":      "Exceed: triggers when your attack roll total is 15 or higher (before or after modifiers).",
  "collide":     "Collide: triggers when a character shoved by this ability hits an obstruction (another character, an object, or higher elevation).",
  "slay":        "Slay: triggers when this ability reduces a character to 0 HP.",
  "crit":        "Crit: triggers on a critical hit (attack total ≥ 20). Deals an extra [D] of damage.",
  "comeback":    "Comeback: triggers while the user is Bloodied (at or below 50% HP).",
  "finishing-blow": "Finishing Blow (Vagabond): triggers when the attack targets a Bloodied foe.",
  "infuse":      "Infuse (Wright): spend X Aether to upgrade the ability. Only one infuse effect can trigger at a time, and it must be chosen at the start of the action.",
  "gambit":      "Gambit: a conditional triggered effect with special use-per-combat rules. Can be activated once per combat under the listed conditions.",

  /* ==================== MECHANICS / SPECIAL ACTIONS ==================== */
  "shove":       (n) => n ? `Shove ${n}: move a character involuntarily ${n} spaces in a straight line away from you. If they would move into another character, an object, or up in elevation, they Collide and stop.`
                           : "Shove: move a character involuntarily away from you in a straight line. Collide triggers if they hit an obstruction.",
  "cure":        "Cure: grants Vigor 4 to the target (or a Vigor surge if Bloodied). The target may then save against all active statuses, ending each on a success.",
  "bless":       "Bless: give a blessing token to a character in range. Tokens can be spent for various Mendicant-specific effects and are discarded at combat end.",
  "combo":       (n) => n
    ? `Combo (step ${n}): foe combo abilities are a sequence, not a token — each part must be used in order, on different turns, looping back to the start after the last part (p.290).`
    : "Combo: actions with Combo have a base and combo version. Using the base grants a Combo token. The next Combo ability consumes the token and uses its combo version instead. Max one token at a time; all tokens are discarded at combat end.",
  "mark":        "Mark: place a mark on a specific character. Each ability only places one mark at a time; a character can only have one mark per marking ability. Marks persist and are hard for foes to remove.",
  "multimark":   "Multimark: a mark that isn't limited to one character. The ability keeps every mark it places (marking someone new doesn't end the previous one); a character can still carry only one mark from the same marker at a time (p.95).",
  "summon":      "Summon: places a character under your control. Summons are Intangible and don't count as foes or allies for ability purposes. They act via a summon action on their summoner's turn, or have a passive summon effect. Removed when the summoner is defeated.",
  "rebound":     "Rebound: a rebounded ability bounces off a target character and is redirected from their space as the new origin, respecting cover and line-of-sight from there. Effects tied to the original user (sacrificing HP, moving) still apply. Does not stack.",
  "boon":        (n) => `Boon${n && Number(n) > 1 ? ` ${n}` : ""}: the attack rolls ${n || 1} extra d6 and adds the highest to the d20 (p.12). The dialog fills it in for you; boons and curses cancel 1 to 1.`,
  "curse":       (n) => `Curse${n && Number(n) > 1 ? ` ${n}` : ""}: the roll subtracts the highest of ${n || 1} d6 from the d20 (p.12). The dialog fills it in for you; boons and curses cancel 1 to 1.`,
  "power-die":   "Power Die: a d6 tracker tied to a specific ability that ticks up or down based on conditions. Each power die is unique to its ability. Discarded when ticked to 0.",
  "stack-dice":  "Stack Dice (Fool): save a d6 result to influence a future gamble roll, including bomb summons.",
  "stance":      "Stance: an ongoing positive effect. You can only have one stance at a time; taking a new stance drops the old one (or drop as a free action at start of your turn). Refreshes regain its effects.",
  "interact":    "Interact: 1-action ability to use an interactable object or terrain feature.",
  "recover":     "Recover: 2-action ability. Cure yourself (Vigor 4, or Vigor surge if Bloodied), then save against all active statuses.",
  "rescue":      "Rescue: 1-action ability. Adjacent defeated ally ends incapacitated and heals to full HP minus wounds.",

  /* ==================== POSITIVE STATUSES ==================== */
  "unstoppable": "Unstoppable: immune to all statuses while moving; foes can't move you; ignores Engagement and Rampart.",
  "rampart":     "Rampart: foes can't Dash, Fly, or Teleport into or out of any space adjacent to this character. Like a super-engagement.",
  "vigilance":   (n) => n ? `Vigilance ${n}: ${n} charges (d6 each). Spend any number of charges for: reduce ally damage in range 2, OR damage foes breaking adjacency. Stacks up to 6, lasts until combat ends.`
                           : "Vigilance X: X charges (d6 each). Spend for: reduce ally damage in range 2, OR damage foes breaking adjacency. Stacks up to 6, lasts until combat ends.",
  "sturdy":      "Sturdy: when moved or removed/placed by a foe, can only be moved maximum 1 space per turn.",
  "counter":     "Counter: deal 2 damage back each time you take damage.",
  "defiance":    "Defiance: HP can't be reduced below 1. When triggered, become immune to all damage for the rest of the current turn.",
  "divine":      "Divine: damage can't be reduced except by immunity.",
  "dodge":       "Dodge: immune to damage from missed attacks, successful saves, and AoE spaces.",
  "evasion":     "Evasion: when targeted by an attack, roll 1d6. On a 4+, the attack automatically misses. Check before the attack roll.",
  "intangible":  "Intangible: immune to foe damage and effects; doesn't provide obstruction or engagement; doesn't count as foe or ally for abilities.",
  "regeneration":"Regeneration: if Bloodied, gain 4 Vigor at the end of your turn.",
  "skirmisher":  "Skirmisher: move diagonally; Dash uses full Speed.",
  "stealth":     "Stealth: cannot be directly targeted except from an adjacent space. Breaks on using any ability other than Dash or Standard Move.",
  "vigor":       "Vigor: temporary HP capped at your VIT. Gained via Cure and healing. Armor and resistance apply. Lost at combat end. Damage hits Vigor before HP.",
  "vigor-surge": "Vigor Surge: immediately gain Vigor equal to your full VIT.",
  "finesse":     "Finesse (Vagabond class trait): deal bonus damage to Bloodied foes.",

  /* ==================== NEGATIVE STATUSES ==================== */
  "slashed":     "Slashed: take 4 damage after you or an ally uses an ability that moves you. Maximum once per turn.",
  "blind":       "Blind: maximum range of all your abilities is 2.",
  "blinded":     "Blinded: maximum range of all your abilities is 2.",
  "dazed":       "Dazed: +1 curse on all attack rolls.",
  "hatred":      "Hatred of X: deal half damage to all targets other than X. Ends at the end of your turn, or if X becomes immune/un-targetable.",
  "pacified":    "Pacified: deal half damage. Breaks on taking damage from a foe's ability.",
  "sealed":      "Sealed: you cannot inflict statuses.",
  "shattered":   "Shattered: you cannot gain or benefit from Vigor.",
  "stunned":     "Stunned: cannot take interrupts. Your next ability used ends your turn, then the status clears.",
  "weakened":    "Weakened: all damage you deal is reduced by 2.",
  "vulnerable":  "Vulnerable: all damage you take is increased by 1 per instance.",

  /* ==================== SPECIAL STATES ==================== */
  "bloodied":    "Bloodied: at or below 50% of maximum HP.",
  "immobile":    "Immobile: cannot move and cannot be moved.",
  "incapacitated":"Incapacitated: no turns, no actions, no effects; all effects on you end. Typically caused by reaching 0 HP.",
  "defeated":    "Defeated: at 0 HP and Incapacitated. Take 1 Wound. Can be brought back by Rescue.",
  "fallen":      "Fallen: 4 Wounds accumulated. The character is dead or permanently removed from the campaign.",

  /* ==================== TERRAIN ==================== */
  "difficult":   "Difficult Terrain: costs +1 movement to exit a space of this type.",
  "dangerous":   "Dangerous Terrain: take 2 piercing damage when entering or exiting a space of this terrain. Max once per turn.",
  "impassable":  "Impassable Terrain: blocks all movement (except phasing) and blocks line of sight. Pillars, walls, solid cliffs.",
  "pit":         "Pit: counts as 1 space lower in elevation than its base space.",
  "slope":       "Slope: same height as the base space; ignore 1 elevation cost when exiting.",
  "object":      "Object: Size 1–3; blocks movement and provides cover. Destructible objects have 10 HP, auto-hit, fail saves.",
  "terrain":     "Terrain: specific battlefield feature with unique effects (difficult, dangerous, impassable, pit, slope, object).",

  /* ==================== DAMAGE TYPES ==================== */
  "piercing":    "Piercing damage: ignores Armor and Weakened reduction.",
  "divine-damage":"Divine damage: cannot be reduced by any means except immunity.",
  "true-damage": "True damage: ignores all modifiers and reductions.",
  "fray":        "Fray damage: flat damage dealt on both hit and miss. Based on the user's class fray stat.",

  /* ==================== BASIC ABILITIES ==================== */
  "basic-attack":"Basic Attack: simple attack with the class's basic attack range. Always available to everyone.",
  "light-attack":"Light Attack (1 action): attack roll. Hit: [D] + fray. Miss: fray.",
  "heavy-attack":"Heavy Attack (2 actions): attack roll. Hit: 2[D] + fray. Miss: fray.",
  "standard-move":"Standard Move (free): move up to your Speed.",
  "free-action": "Free Action: doesn't cost an action. Can only be used once per turn and must be on your turn.",

  /* ==================== RESOURCE / CLASS MECHANICS ==================== */
  "aether":      "Aether (Wright): power resource tracked as a d6. Wrights start combat with 0 and gain 1 at the start of each turn. Spent via Infuse to upgrade abilities. All Aether disperses at combat end.",
  "blessings":   "Blessings (Mendicant): tokens granted to allies. Can be spent for various effects tied to specific Mendicant jobs. Discarded at combat end.",
  "combo-token": "Combo Token: gained from using the base version of a combo ability. Spent to use the combo version of a combo ability. Max 1 at a time, discarded at combat end.",
  "heroics":     "Heroics: Stalwart class mechanic. Trigger heroic effects on abilities. After using a heroic effect, you can't use more until end of your next turn, and you deal half damage that turn.",
  "chain-reaction":"Chain Reaction (Wright): 1/round, if a Wright damages 2+ foes with an ability, they gain 1 Aether after the ability resolves.",

  /* ==================== MISC ==================== */
  "cover":       "Cover: adjacent to an object or higher terrain. Halves damage from ranged attacks.",
  "gamble":      "Gamble: roll a d6 with variable effect depending on the ability. Common to Fool abilities.",
  "save":        "Save: roll 1d20. On 10+, success. Made at end of your turn against each active status.",
  "ongoing":     "Ongoing (+): a + next to a status means it cannot be saved against and requires the source to be removed.",
  "wounds":      "Wounds: permanent reduction of max HP by VIT each. Fallen at 4 wounds. Healed only in Interludes.",
  "resolve":     "Resolve: resource for Limit Breaks. Party Resolve +1 per round (shared). Personal Resolve +1 after combat.",
};

/**
 * Return a tooltip text for a tag. Handles tag families with numeric
 * suffixes (e.g. "range-3" → RULES.range(3)). Falls back to null if nothing
 * matches.
 */
export function explainTag(tag) {
  if (!tag || typeof tag !== "string") return null;
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return null;

  // Exact match first (covers "blast-s", "end-turn", "finishing-blow", etc.)
  const direct = RULES[normalized];
  if (direct != null) {
    return typeof direct === "function" ? direct() : direct;
  }

  // Numeric-suffix family: "range-3", "rush-2", "teleport-5", "aura-2"
  const m = normalized.match(/^([a-z][a-z-]*?)-(\d+)$/);
  if (m) {
    const [, key, num] = m;
    const entry = RULES[key];
    if (typeof entry === "function") return entry(num);
    if (typeof entry === "string") return entry;
  }

  return null;
}

/**
 * Transform a raw tag string into a displayable object:
 *   { raw, label, tooltip }
 * - raw: unchanged, used as DOM data
 * - label: prettified ("range-3" → "Range 3", "true-strike" → "True Strike")
 * - tooltip: full rule explanation, or null if unknown
 */
export function formatTag(tag) {
  const raw = String(tag ?? "").trim();
  if (!raw) return null;
  // The packs write the same thing two ways ("+1-boon" on job abilities,
  // "boon-1" on foes): show one label, so the NPC cards read like the PC ones.
  const bc = /^\+?(\d+)-(boons?|curses?)$/i.exec(raw) ?? (m => m && [m[0], m[2], m[1]])(/^(boons?|curses?)-(\d+)$/i.exec(raw));
  if (bc) {
    const n = Number(bc[1]);
    const word = String(bc[2]).toLowerCase().replace(/s$/, "");
    return { raw, label: `+${n} ${word[0].toUpperCase()}${word.slice(1)}${n > 1 ? "s" : ""}`, tooltip: explainTag(`${word}-${n}`) };
  }
  const label = raw
    .split("-")
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(" ");
  return { raw, label, tooltip: explainTag(raw) };
}

/** Parse a comma-separated tag override string into clean raw tags. */
function _parseTagList(str) {
  return String(str ?? "").split(",").map(t => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean);
}

/** Strip HTML tags and collapse whitespace (for tooltips built from rich text). */
function _plainText(html) {
  return String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Resolve the tags an ability currently shows, applying the talent / mastery
 * tag overrides the character has unlocked (see AbilityData.talent1Tags etc)
 * and, with `comboMode`, the combo version's own tags (comboTags): the book's
 * combo versions change the area, the range or how the attack lands ("HADES —
 * Gains True Strike and Medium Blast", "The Hook: Gains range 2").
 * Each active override replaces the whole list; the combo override wins over
 * mastery, which wins over the talents. Tags that were not in the base list
 * are flagged `upgraded` and carry the source (e.g. "Talent II") in their
 * tooltip.
 * @param {object} system  ability system data
 * @param {object} [options]
 * @param {boolean} [options.comboMode]  the combo version is the one being used
 * @returns {Array<{raw:string,label:string,tooltip:string|null,upgraded:boolean}>}
 */
export function resolveAbilityTags(system, { comboMode = false } = {}) {
  const s = system ?? {};
  const base = (s.tags ?? []).map(t => String(t ?? "").trim()).filter(Boolean);
  const selected = Number(s.talentSelected ?? 0);

  const layers = [];
  if (selected === 1 && String(s.talent1Tags ?? "").trim()) layers.push({ tags: _parseTagList(s.talent1Tags), source: "Talent I",  text: s.talent1 });
  if (selected === 2 && String(s.talent2Tags ?? "").trim()) layers.push({ tags: _parseTagList(s.talent2Tags), source: "Talent II", text: s.talent2 });
  if (s.masteryUnlocked && String(s.masteryTags ?? "").trim()) layers.push({ tags: _parseTagList(s.masteryTags), source: "Mastery", text: s.mastery });
  if (comboMode && String(s.comboTags ?? "").trim()) layers.push({ tags: _parseTagList(s.comboTags), source: "Combo", text: s.comboEffect });

  let current = base;
  const origin = new Map();   // raw tag → layer that introduced it
  for (const layer of layers) {
    for (const t of layer.tags) if (!base.includes(t) && !origin.has(t)) origin.set(t, layer);
    current = layer.tags;
  }

  return current.map(formatTag).filter(Boolean).map(tag => {
    const layer = origin.get(tag.raw);
    if (!layer) return { ...tag, upgraded: false };
    const from = `From ${layer.source}: ${_plainText(layer.text)}`;
    const tooltip = tag.tooltip ? [from, tag.tooltip].join("\n\n") : from;
    return { ...tag, upgraded: true, tooltip };
  });
}
