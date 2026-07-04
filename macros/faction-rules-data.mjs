/**
 * faction-rules-data.mjs — hand-curated faction templates and special
 * mechanics from the ICON 1.5 manual (Book of Foes, pp.298-468). Used by
 * tools/populate-faction-rules.mjs to seed the `foe-abilities` pack.
 *
 * Each entry becomes a foe-ability Item. The sheet's drop handler copies
 * the entry into the foe's traits/actions arrays, so the GM drags these
 * onto a foe the same way they drag any other foe-ability.
 *
 * Entry shape (abilityType drives which fields are used):
 *   {
 *     abilityType:    "action" | "trait" | "interrupt" | "round-action",
 *     name:           string,   // displayed as "SourceFoe — name" in compendium
 *     sourceFoe:      string,   // prefix used in compendium list
 *     faction:        string,
 *     cost:           "1action" | "2actions" | "free action" | ... (actions only)
 *     tags:           string[]  (actions only)
 *     trigger:        string    (interrupts only)
 *     interruptLimit: number    (interrupts only)
 *     roundNumber:    number    (round-actions only)
 *     hitEffect / missEffect / areaEffect: string (actions only)
 *     description:    string    (main rule text)
 *   }
 *
 * All text is paraphrased/summarized from the rulebook for mechanical use;
 * flavor paragraphs are omitted.
 */

export const FACTION_RULES = [

  /* ================================================================
     UNIVERSAL — Elite template (p.299)
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Elite",
    sourceFoe:   "Universal Template",
    faction:     "Templates",
    description: "Takes 2 turns per round. Double HP. Costs 2 points in the encounter budget. Stacks with other templates. Cannot be applied to foes that already have the Elite trait (e.g. Jotunn).",
  },

  /* ================================================================
     FOLK (p.315) — Template: Kin / Special Mechanic: Great Culture
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Kin",
    sourceFoe:   "Faction: Folk",
    faction:     "Folk",
    description: "Folk are Kin. They can be bargained with and usually surrender or flee if outmatched. Martial cultures (Islanders, Leggio, Guilders) may fight harder.",
  },
  {
    abilityType: "trait",
    name:        "Great Culture: Great Faith (Chronicler)",
    sourceFoe:   "Faction: Folk",
    faction:     "Folk",
    description: "Chroniclers can take slow turns like players. If they choose to take a slow turn, they gain 3 vigor.",
  },
  {
    abilityType: "trait",
    name:        "Great Culture: Stack Dice (Churner)",
    sourceFoe:   "Faction: Folk",
    faction:     "Folk",
    description: "Once per combat, when the Churner would roll a random d6 as part of an ability, they may choose the number instead. A Churner can always spend a free action to roll 1d6 and dash up to that many spaces.",
  },
  {
    abilityType: "action",
    name:        "Great Culture: Strive (Guilder)",
    sourceFoe:   "Faction: Folk",
    faction:     "Folk",
    cost:        "freeaction",
    tags:        ["1/combat"],
    description: "Until the start of their next turn, the Guilder increases the distance of any dash, rush, teleport or flight by +3.",
  },
  {
    abilityType: "action",
    name:        "Great Culture: Bravado (Islander)",
    sourceFoe:   "Faction: Folk",
    faction:     "Folk",
    cost:        "freeaction",
    tags:        [],
    description: "This character sacrifices 50% of their max HP but immediately gains +1 action.",
  },
  {
    abilityType: "action",
    name:        "Great Culture: Acrobatics (Leggio)",
    sourceFoe:   "Faction: Folk",
    faction:     "Folk",
    cost:        "freeaction",
    tags:        [],
    description: "Dash 2. This action can interrupt and split up other actions or movement.",
  },
  {
    abilityType: "trait",
    name:        "Great Culture: Camaraderie (Villager)",
    sourceFoe:   "Faction: Folk",
    faction:     "Folk",
    description: "+1 boon on attacks and saves for every adjacent ally.",
  },

  /* ================================================================
     RELICT (p.323) — Template + Legion of the Dead
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Monsters",
    sourceFoe:   "Faction: Relict",
    faction:     "Relict",
    description: "Most Relict are mindless husks. Their more intelligent masters have complex motivations but are rarely open to negotiation.",
  },
  {
    abilityType: "trait",
    name:        "Legion of the Dead",
    sourceFoe:   "Faction: Relict",
    faction:     "Relict",
    description: "All Relict except Legends may rise again when defeated. At the start of each round that this character is defeated, roll 1d6: on 5+ it rises at 25% HP and takes its turn normally. If defeated again it disintegrates and is removed. Deactivates if all characters with this trait are defeated. A Relict fight also includes a free Husk mob that does not cost encounter budget.",
  },

  /* ================================================================
     RUIN BEAST (p.345) — Template + Enrage
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Beast",
    sourceFoe:   "Faction: Ruin Beast",
    faction:     "Ruin Beast",
    description: "Beasts do not negotiate. They may flee if losing badly or out of self-preservation. Their motivations are simple — territory or food.",
  },
  {
    abilityType: "trait",
    name:        "Enrage",
    sourceFoe:   "Faction: Ruin Beast",
    faction:     "Ruin Beast",
    description: "Gain +1 action while bloodied.",
  },

  /* ================================================================
     SCAVENGER (p.366) — Template + Valuables
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Scavenger Kin",
    sourceFoe:   "Faction: Scavenger",
    faction:     "Scavenger",
    description: "Scavengers are kin, can be bargained with, and will flee or surrender if heavily outnumbered or heavily losing a fight. They fight for wealth in the ruins and will not fight if terms can be reached.",
  },
  {
    abilityType: "trait",
    name:        "Valuables",
    sourceFoe:   "Faction: Scavenger",
    faction:     "Scavenger",
    description: "At the start of a Scavenger fight, the GM places Valuables tokens on the battlefield equal to (players + 1). Any character can pick one up by moving into its space. Tokens don't obstruct and share space with anything except other valuables. Characters drop them in adjacent spaces when defeated, or voluntarily as 1 action. Any character that ends a fight holding 2+ tokens gains 1 dust. Tokens left on the battlefield don't count.",
  },
  {
    abilityType: "trait",
    name:        "Greed",
    sourceFoe:   "Faction: Scavenger",
    faction:     "Scavenger",
    description: "When a Scavenger uses an ability and either they or their target holds one or more Valuables tokens, the ability gains its more powerful Greed effects (listed on the individual ability).",
  },
  {
    abilityType: "trait",
    name:        "Cut and Run",
    sourceFoe:   "Faction: Scavenger",
    faction:     "Scavenger",
    description: "If a Scavenger holds 4 or more Valuables tokens, they attempt to flee the battlefield. They flee successfully if they start their turn in an edge space with no hostile characters adjacent.",
  },

  /* ================================================================
     IMPERIAL (p.387) — Template + Chain of Command
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Imperial Kin",
    sourceFoe:   "Faction: Imperial",
    faction:     "Imperial",
    description: "Imperials are kin, can be bargained with, and will flee or surrender if heavily outnumbered or heavily losing. They follow orders from their commander and can often be worked around if players sidestep those orders.",
  },
  {
    abilityType: "trait",
    name:        "Chain of Command",
    sourceFoe:   "Faction: Imperial",
    faction:     "Imperial",
    description: "Designate one foe the commanding officer of the detachment; they get the Imperial Officer template. At the start of each round, assign an Orders token to any Imperial. That character auto-activates the exceed effects of their attacks, deals bonus damage, and gains +1 action, but can only take their turn after all other Imperials have acted. Discard the token at end of round.",
  },
  {
    abilityType: "trait",
    name:        "Imperial Officer: Promotion",
    sourceFoe:   "Faction: Imperial",
    faction:     "Imperial",
    description: "Starts combat with vigor equal to their VIT. (Part of the Imperial Officer template; stacks with other templates.)",
  },
  {
    abilityType: "trait",
    name:        "Imperial Officer: Command Aura",
    sourceFoe:   "Faction: Imperial",
    faction:     "Imperial",
    description: "Aura 2. Allies in the aura gain +1 boon on attacks. (Part of the Imperial Officer template.)",
  },

  /* ================================================================
     DEMON (p.406) — Template + Abyssal Legion
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Demon Monsters",
    sourceFoe:   "Faction: Demon",
    faction:     "Demon",
    description: "Demons do not flee or negotiate. Most are mindless extra-dimensional killing machines; those that can communicate are cruel and sadistic.",
  },
  {
    abilityType: "trait",
    name:        "Abyssal Legion",
    sourceFoe:   "Faction: Demon",
    faction:     "Demon",
    description: "When fighting Demons, at the start of combat place a Natal mob on the map. The mob does not count toward the encounter budget. Some Demon abilities add or remove members from this mob.",
  },
  {
    abilityType: "action",
    name:        "Devour",
    sourceFoe:   "Faction: Demon",
    faction:     "Demon",
    cost:        "2actions",
    tags:        ["1/combat"],
    description: "The Demon devours an adjacent bloodied Demon, destroying it permanently and curing itself. It then gains +1 action for all its turns for the rest of combat, starting with this one.",
  },
  {
    abilityType: "action",
    name:        "Devour Natal",
    sourceFoe:   "Faction: Demon",
    faction:     "Demon",
    cost:        "freeaction",
    tags:        [],
    description: "The Demon Devours an adjacent Natal, destroying it and gaining +1 action for this turn only. A Demon can use Devour OR Devour Natal on a turn, not both.",
  },

  /* ================================================================
     LOWLANDER (p.428) — Template + Blightland Survivalists
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Lowlander Kin",
    sourceFoe:   "Faction: Lowlander",
    faction:     "Lowlander",
    description: "Lowlanders are kin and can be bargained with. They fight for territory or supplies and respect fair deals. They prefer to take captives in battle and ransom them back. They will flee from fights they can't win and exploit weaknesses when they see them.",
  },
  {
    abilityType: "trait",
    name:        "Lowlander Toxin",
    sourceFoe:   "Faction: Lowlander",
    faction:     "Lowlander",
    description: "At the start of each round in any combat featuring Lowlanders, all non-Lowlander characters sacrifice 2 HP.",
  },
  {
    abilityType: "trait",
    name:        "Pit Expert",
    sourceFoe:   "Faction: Lowlander",
    faction:     "Lowlander",
    description: "Lowlanders ignore movement and height disadvantage from pits.",
  },
  {
    abilityType: "trait",
    name:        "Suddenly! (Lowlander Trap)",
    sourceFoe:   "Faction: Lowlander",
    faction:     "Lowlander",
    description: "At the start of any round, the GM can spring a Lowlander trap in any unoccupied space not adjacent to a PC. The trap is a pit. When activated, a foe in range 2 of the trap must save or be shoved until inside it. Foes that end their turn inside the pit take 3 piercing damage. Any trap can be disarmed by a character taking the Interact action adjacent, removing it.",
  },

  /* ================================================================
     JOTUNN (p.448) — Template + Legacy of the Titans
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Ancient Jotunn Kin",
    sourceFoe:   "Faction: Jotunn",
    faction:     "Jotunn",
    description: "Ancient Jotunn are kin, can be bargained with, and will flee or surrender if heavily losing. They are driven by negative emotions (sadness, anger, distrust, hunger); appeasing or appealing to their feelings can open them to negotiation. Typically they don't flee but will surrender if they see no chance of winning.",
  },
  {
    abilityType: "trait",
    name:        "Blood Jotunn Monsters",
    sourceFoe:   "Faction: Jotunn",
    faction:     "Jotunn",
    description: "Blood Jotunn are infected with the Blood Rage. Driven only by pain and rage, reduced to near-mindless monsters. They do not flee or negotiate. It may be possible to cure the Rage.",
  },
  {
    abilityType: "trait",
    name:        "Legacy of the Titans: Elite",
    sourceFoe:   "Faction: Jotunn",
    faction:     "Jotunn",
    description: "All Jotunn have the Elite type if they don't already. They are worth 2 points in an encounter budget and take 2 turns. Double HP if upgrading from a normal foe.",
  },
  {
    abilityType: "trait",
    name:        "Legacy of the Titans: Titanblood",
    sourceFoe:   "Faction: Jotunn",
    faction:     "Jotunn",
    description: "Increase size to 2 if not already 2.",
  },
  {
    abilityType: "trait",
    name:        "Legacy of the Titans: Titanfall",
    sourceFoe:   "Faction: Jotunn",
    faction:     "Jotunn",
    description: "When defeated, roll 1d6 and assign a compass direction (1 none, 2 N, 3 E, 4 S, 5 W, 6 GM choice). The Jotunn falls into a medium blast area placed adjacent to its space in that direction. Size 1 characters inside must save or take 6 damage, or 3 on a successful save. Move all characters out of the area into the closest available space and place the defeated Jotunn there. It counts as a 2x2 height 1 object while defeated.",
  },
  {
    abilityType: "trait",
    name:        "Legacy of the Titans: Titan Armament",
    sourceFoe:   "Faction: Jotunn",
    faction:     "Jotunn",
    description: "You can arm a Jotunn with Titansteel weaponry, increasing its encounter budget cost by +1. If so, it has 50% more HP and takes one extra turn per round.",
  },

  /* ================================================================
     HOB (p.467) — Template + Nature Spirits
     ================================================================ */
  {
    abilityType: "trait",
    name:        "Hob Kin",
    sourceFoe:   "Faction: Hob",
    faction:     "Hob",
    description: "Hobs can (technically) be bargained with and may flee or surrender when badly losing. Unless greatly pressed, Hobs considered kin will never kill characters intentionally, preferring to punish or humiliate. They are strongly motivated by trespass or injury against the land. As immortal nature spirits they don't fear death (they return with the next season) but can be flighty and run away when afraid.",
  },
  {
    abilityType: "trait",
    name:        "Hob Monsters",
    sourceFoe:   "Faction: Hob",
    faction:     "Hob",
    description: "Hobs stirred up by natural disaster or desecration become warped and malicious. They will not bargain or negotiate until things are put right, usually returning to their usual natures once the crisis passes.",
  },
  {
    abilityType: "trait",
    name:        "Greenwalker",
    sourceFoe:   "Faction: Hob",
    faction:     "Hob",
    description: "Hobs are immune to difficult terrain.",
  },
  {
    abilityType: "action",
    name:        "Spirit Away",
    sourceFoe:   "Faction: Hob",
    faction:     "Hob",
    cost:        "freeaction",
    tags:        [],
    description: "The Hob swaps places with an adjacent character, removing and placing both characters.",
  },
  {
    abilityType: "trait",
    name:        "Trickery",
    sourceFoe:   "Faction: Hob",
    faction:     "Hob",
    description: "Like player characters, Hobs have charge abilities and can choose to take a slow turn whenever they would take a regular turn.",
  },
  {
    abilityType: "trait",
    name:        "Forest Children",
    sourceFoe:   "Faction: Hob",
    faction:     "Hob",
    description: "Any fight with Hobs may include a Sprigg mob.",
  },
];
