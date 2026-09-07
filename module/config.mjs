/**
 * CONFIG.ICON — Global constants for the ICON 1.5 system.
 */
export const ICON = {};

/* -------------------------------------------------- */
/*  Core rule constants                                */
/*  Single authoritative source for rule numbers that  */
/*  were previously scattered as literals. Mutable at  */
/*  runtime via CONFIG.ICON.rules for house rules.     */
/* -------------------------------------------------- */

ICON.rules = {
  maxWounds:         4,   // 4th wound = Fallen (exits the campaign)
  defaultVit:        10,  // fallback VIT when a PC has none set
  recoverVigor:      4,   // Recover action: vigor gained when not bloodied
  regenerationVigor: 4,   // Regeneration status: vigor at end of turn while bloodied
  weakenedPenalty:   2,   // Weakened: flat damage reduction on the attacker
  boonCurseCap:      2,   // net boons/curses clamp to ±this
  mobHitsPerMember:  2,   // mob members have 2 hits each (manual p.291)
  aetherMax:         6,   // Wright Aether is tracked on a d6 power die (p.204)
};

/* -------------------------------------------------- */
/*  Classes & Jobs                                     */
/* -------------------------------------------------- */

ICON.classes = {
  stalwart:  "ICON.ClassStalwart",
  vagabond:  "ICON.ClassVagabond",
  mendicant: "ICON.ClassMendicant",
  wright:    "ICON.ClassWright",
};

ICON.jobs = {
  stalwart:  ["bastion", "demon-slayer", "colossus", "knave"],
  vagabond:  ["fool", "freelancer", "shade", "warden"],
  mendicant: ["chanter", "harvester", "sealer", "seer"],
  wright:    ["enochian", "geomancer", "spellblade", "stormbender"],
};

ICON.jobLabels = {
  bastion:       "ICON.JobBastion",
  "demon-slayer":"ICON.JobDemonSlayer",
  colossus:      "ICON.JobColossus",
  knave:         "ICON.JobKnave",
  fool:          "ICON.JobFool",
  freelancer:    "ICON.JobFreelancer",
  shade:         "ICON.JobShade",
  warden:        "ICON.JobWarden",
  chanter:       "ICON.JobChanter",
  harvester:     "ICON.JobHarvester",
  sealer:        "ICON.JobSealer",
  seer:          "ICON.JobSeer",
  enochian:      "ICON.JobEnochian",
  geomancer:     "ICON.JobGeomancer",
  spellblade:    "ICON.JobSpellblade",
  stormbender:   "ICON.JobStormbender",
};

/* -------------------------------------------------- */
/*  Bonds                                              */
/* -------------------------------------------------- */

ICON.bonds = [
  "pathfinder", "seeker", "mighty", "wolf",
  "harlequin", "highborn", "mender", "brave",
  "broker", "elder", "outsider", "dreamer",
];

ICON.bondLabels = {
  pathfinder: "ICON.BondPathfinder",
  seeker:     "ICON.BondSeeker",
  mighty:     "ICON.BondMighty",
  wolf:       "ICON.BondWolf",
  harlequin:  "ICON.BondHarlequin",
  highborn:   "ICON.BondHighborn",
  mender:     "ICON.BondMender",
  brave:      "ICON.BondBrave",
  broker:     "ICON.BondBroker",
  elder:      "ICON.BondElder",
  outsider:   "ICON.BondOutsider",
  dreamer:    "ICON.BondDreamer",
};

/* -------------------------------------------------- */
/*  Actions (Narrative)                                */
/* -------------------------------------------------- */

ICON.actions = {
  sneak:    "ICON.ActionSneak",
  traverse: "ICON.ActionTraverse",
  sense:    "ICON.ActionSense",
  study:    "ICON.ActionStudy",
  charm:    "ICON.ActionCharm",
  command:  "ICON.ActionCommand",
  tinker:   "ICON.ActionTinker",
  excel:    "ICON.ActionExcel",
  smash:    "ICON.ActionSmash",
  endure:   "ICON.ActionEndure",
};

/* -------------------------------------------------- */
/*  Foe Factions                                       */
/* -------------------------------------------------- */

ICON.factions = {
  folk:       "ICON.FactionFolk",
  relict:     "ICON.FactionRelict",
  "ruin-beast":"ICON.FactionRuinBeast",
  scavenger:  "ICON.FactionScavenger",
  imperial:   "ICON.FactionImperial",
  demon:      "ICON.FactionDemon",
  lowlander:  "ICON.FactionLowlander",
  jotunn:     "ICON.FactionJotunn",
  hob:        "ICON.FactionHob",
};

/* -------------------------------------------------- */
/*  Chapters                                           */
/* -------------------------------------------------- */

ICON.chapters = {
  1: "ICON.Chapter1",
  2: "ICON.Chapter2",
  3: "ICON.Chapter3",
};

/* -------------------------------------------------- */
/*  Damage Dice                                        */
/* -------------------------------------------------- */

ICON.damageDice = {
  d6:  "d6",
  d8:  "d8",
  d10: "d10",
};

/* -------------------------------------------------- */
/*  Ability Costs                                      */
/* -------------------------------------------------- */

ICON.abilityCosts = {
  "1action":    "ICON.Cost1Action",
  "2actions":   "ICON.Cost2Actions",
  "free":       "ICON.CostFree",
  "interrupt-1":"ICON.CostInterrupt1",
  "interrupt-2":"ICON.CostInterrupt2",
  "interrupt-3":"ICON.CostInterrupt3",
};

// NOTE: the canonical status list (ids, icons, save/boon flags, grouping) lives
// in module/combat/statuses.mjs (ICON_STATUSES) and is what the UI/engine use.
// The old ICON.statusesNegative/Positive/Special arrays here were unreferenced
// and drifted out of date, so they were removed.

/* -------------------------------------------------- */
/*  Effect Levels (Narrative)                          */
/* -------------------------------------------------- */

ICON.effectLevels = {
  weak:         { label: "ICON.EffectWeak",         segments: 1 },
  normal:       { label: "ICON.EffectNormal",       segments: 2 },
  powerful:     { label: "ICON.EffectPowerful",     segments: 3 },
  superpowered: { label: "ICON.EffectSuperpowered", segments: 5 },
};

/* -------------------------------------------------- */
/*  Risk Levels (Narrative)                            */
/* -------------------------------------------------- */

ICON.riskLevels = {
  controlled: "ICON.RiskControlled",
  risky:      "ICON.RiskRisky",
  desperate:  "ICON.RiskDesperate",
};

/* -------------------------------------------------- */
/*  Kin Types                                          */
/* -------------------------------------------------- */

ICON.kinTypes = {
  thrynn:    "ICON.KinThrynn",
  trogg:     "ICON.KinTrogg",
  beastfolk: "ICON.KinBeastfolk",
  xixo:      "ICON.KinXixo",
};

/* -------------------------------------------------- */
/*  Cultures                                           */
/* -------------------------------------------------- */

ICON.cultures = {
  yeokin:      "ICON.CultureYeokin",
  islander:    "ICON.CultureIslander",
  leggio:      "ICON.CultureLeggio",
  churner:     "ICON.CultureChurner",
  chronicler:  "ICON.CultureChronicler",
  guilder:     "ICON.CultureGuilder",
};

/* -------------------------------------------------- */
/*  Relic Invoke Types                                 */
/* -------------------------------------------------- */

ICON.invokeTypes = {
  attack: "ICON.InvokeAttack",
  gambit: "ICON.InvokeGambit",
  round:  "ICON.InvokeRound",
};

/* -------------------------------------------------- */
/*  AoE Patterns                                       */
/* -------------------------------------------------- */

ICON.aoePatterns = {
  "line":       "ICON.AoELine",
  "arc":        "ICON.AoEArc",
  "blast-s":    "ICON.AoEBlastS",
  "blast-m":    "ICON.AoEBlastM",
  "blast-l":    "ICON.AoEBlastL",
  "burst":      "ICON.AoEBurst",
  "aura":       "ICON.AoEAura",
};
