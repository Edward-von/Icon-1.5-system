/**
 * IconSheet — ApplicationV2 sheet for Player Characters (type: "icon").
 */
import { narrativeRoll, combatRoll, damageRoll, relicInvokeHtml, relicNotesHtml, attackFlags } from "../../dice/rolls.mjs";
import { postAbilityDamageCard, recoverAction, applyDamageToActor } from "../../combat/damage.mjs";
import { LevelUpDialog } from "../../apps/LevelUpDialog.mjs";
import { CharacterCreationDialog } from "../../apps/CharacterCreationDialog.mjs";
import { showWelcomeGuide } from "../../apps/welcome.mjs";
import { showReferenceGuide, REFERENCE_CONTROL } from "../../apps/reference.mjs";
import { enrichHTML, escapeHTML, parseAbilitySections, abilityCostLabel, enrichLimitBreakText } from "../../helpers/enrich.mjs";
import { resolveAbilityTags, resolveAbilityCost, traitAuraTag } from "../../helpers/rule-tooltips.mjs";
import { buildAbilityBlocks, interruptBlockName, grantedInterrupt, comboDisplayName, comboTitle, comboReplacesBase, comboReplacedBlocks, masteryGainsBothEffects, talentAttackBlocks, alternateCombo, withActiveCombo } from "../../helpers/ability-blocks.mjs";
import { powerDieView, fillJobTraitPowerDice } from "../../data/item/power-die.mjs";
import { ensureAreaTargets, placeAreaTemplate, areaFromTags, areaSummaryHtml,
         areaVariants, chooseAreaVariant, abilityArea, areaColor, areaLasts, findAreaTemplates,
         areasInText, aurasInText, areaDrawnFromTarget, lineExtensionInText, areaLabel, infusedAreas, rangeFromTags,
         attackSpaceTokenId, retargetFromTemplate, distanceInArea, sourceTokenFor } from "../../canvas/area-templates.mjs";
import { marksOn, marksBy, applyMark, removeMark, markFromTags, abilityTracks } from "../../combat/marks.mjs";
import { buildAbilityProfile, abilityRelicReminders, attackInvokes, gambitInvokes,
         relicInvokeRank } from "../../combat/relic-reminders.mjs";
import { abilityStatusEntries, statusBlockHtml, parseInflictedStatuses, captureTargets } from "../../combat/ability-statuses.mjs";
import { promptAttackTarget, rememberAttackTarget, rememberedAttackTarget } from "../../apps/roll-dialogs.mjs";
import { currentTargets, tagKey } from "../../combat/defenses.mjs";
import { exceedTriggers, noteFirstUseThisCombat } from "../../combat/crit-thresholds.mjs";
import { abilityGambles, rollGamble } from "../../combat/gamble.mjs";
import { IconActor } from "../IconActor.mjs";
import { loadSummonIndex, summonsForAbility, summonsForTrait } from "../../helpers/summons.mjs";
import { objectChips, objectsForbiddingAttacks, mapObjectFlag } from "../../canvas/map-objects.mjs";
import { terrainChips, placeTerrainFromChip, removeTerrainOfChip } from "../../canvas/terrain-spaces.mjs";
import { characterSpecOf, markRangeConfirmed } from "../../canvas/follow-marks.mjs";
import { afterAreaPlaced } from "../../canvas/area-motion.mjs";
import { terrainBlockOf, areaStackLimit, activeAreaTexts, baseAreaText, insideEffectsOf, areaExtendsOld, impassableAlternative } from "../../helpers/area-terrain.mjs";
import { infusionsOf, armInfusion, cancelInfusion, armedInfusion, masteryInfusion, limitBreakInfusions,
         startInfusionStep, noteInfusionStep, infusionStepRepeats, INFUSE_STEP, splitInfuseBlocks, infuseVersionParts, infuseVersionHtml,
         withoutUnarmedInfusions } from "../../helpers/infuse.mjs";
import { CLASS_INFO, buildClassTraitDocs, buildClassGambitDoc, ensureClassGambits } from "../../helpers/classes.mjs";
import { expectedApTotal, expectedSkillRanksFromLevels,
         STARTING_ACTION_DOTS } from "../../helpers/advancement.mjs";
import { groupStatusesForUI } from "../../combat/status-modifiers.mjs";
import { visibleStatuses } from "../../combat/tracker-statuses.mjs";
import { applyStatus, removeStatus, hasStatus,
         STACKABLE_STATUSES,
         setStatusCharges, adjustStatusCharges } from "../../combat/statuses.mjs";
import { PROTOTYPE_TOKEN_CONTROL, onConfigurePrototypeToken, filterPrototypeTokenControl } from "./_prototype-token-control.mjs";
import { BaseActorSheet } from "./BaseActorSheet.mjs";
import { promptNarrativeRoll, promptAttackMods,
         promptDamageMods, promptAbilityConfig } from "../../apps/sheet-dialogs.mjs";

const _log = (...args) => console.debug("[ICON | IconSheet]", ...args);

/**
 * The combo version's own "Mark:" block, or null. Rot's combo, Regenerate,
 * marks an ally instead of a foe and "can be placed even if Rot is already
 * active", so it is a mark of its own (key `<item id>:combo`), with its own
 * Mark button, rather than a replacement of the base mark.
 * @returns {{name:string, text:string, stackText:string}|null}
 */
function _comboMark(s) {
  if (!s?.isCombo) return null;
  const raw  = String(s.comboEffect ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const head = raw.match(/^([A-Z][A-Z' -]*[A-Z])\s*[—–-]\s*/);   // "REGENERATE — Mark: …"
  const mark = parseAbilitySections(head ? raw.slice(head[0].length) : raw).sections.find(sec => /\bMark$/i.test(sec.label));
  if (!mark) return null;
  const name = head ? head[1].toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "Combo";
  return { name, text: mark.text, stackText: raw };
}

/**
 * The "Mark:" block of the alternate combo an unlocked mastery adds, or null:
 * Rot's mastery adds REGROWTH (p.186), a mark of its own next to Regenerate
 * (key `<item id>:combo-alt`), so it gets its own Mark button too.
 */
function _altComboMark(s) {
  const alt = alternateCombo(s);
  return alt ? _comboMark({ isCombo: true, comboEffect: alt.text }) : null;
}

/**
 * The text the area button reads when the tags carry no area: the ability's
 * own, then the upgrades in play (selected talent, unlocked mastery, armed
 * combo) — the same texts the area choice offers (_areaVariantsFor). Sow's
 * mastery "Reap and Sow also create an arc 4 area" (p.185) is in neither the
 * base tags nor REAP's, so the button was missing while the combo was armed.
 */
function _areaText(s, comboArmed) {
  const talent = { 1: s.talent1, 2: s.talent2 }[Number(s.talentSelected ?? 0)];
  return [s.description, talent, s.masteryUnlocked ? s.mastery : "", comboArmed ? s.comboEffect : "",
    ...TRIGGERED_BLOCKS.map(([, key]) => s[key])]
    .filter(t => typeof t === "string" && t).join(" ");
}

/** The blocks an attack sets off, in the book's order (p.98-99), with the text the area choice reads. */
const TRIGGERED_BLOCKS = [
  ["Exceed", "exceedEffect"], ["Crit", "critEffect"], ["Collide", "collideEffect"],
  ["Slay", "slayEffect"], ["Finishing Blow", "finishingBlowEffect"], ["Comeback", "comebackEffect"],
];

/**
 * The triggered blocks' texts for areaVariants, one entry per distinct text:
 * Death writes the same explosion under Slay and Finishing Blow (p.155), so it
 * is offered once as "Slay / Finishing Blow".
 */
function _triggeredAreaTexts(s) {
  const byText = new Map();
  for (const [source, key] of TRIGGERED_BLOCKS) {
    const text = String(s[key] ?? "").trim();
    if (!text) continue;
    byText.set(text, byText.has(text) ? `${byText.get(text)} / ${source}` : source);
  }
  return [...byText].map(([text, source]) => [source, text]);
}

/** Is this variant source one of _triggeredAreaTexts' ("Slay", "Slay / Finishing Blow")? */
const _isTriggeredSource = (source) => String(source ?? "").split(" / ").every(p => TRIGGERED_BLOCKS.some(([b]) => b === p));

/**
 * The area button's label: the tags' area or the first one in the text, else
 * an aura the text gives (Fulminate p.226 "The character gains aura 2 while
 * marked"; Rampant Nail p.227, the spike's aura 2), else "" (no button).
 */
function _areaButtonLabel(tags, text) {
  return abilityArea(tags, text)?.label ?? aurasInText(text)[0]?.label ?? "";
}

/** Marks an ability has on the scene: the base mark, then the combo's own (labelled with its name). */
function _abilityMarks(actorId, itemId, comboMark, altMark = null) {
  const row = (m, version = "") => ({ uuid: m.uuid, targetName: m.targetName, stacks: m.stacks, version });
  return [
    ...marksBy(actorId, itemId).map(m => row(m)),
    ...(comboMark ? marksBy(actorId, `${itemId}:combo`).map(m => row(m, comboMark.name)) : []),
    ...(altMark ? marksBy(actorId, `${itemId}:combo-alt`).map(m => row(m, altMark.name)) : []),
  ];
}


// Damage parsing lives in combat/ability-damage.mjs. The re-export keeps
// world macros that import { _parseAbilityDamage } from this file working.
import { parseAbilityDamage as _parseAbilityDamage, parseComboAbilityDamage, parseLimitBreakDamage, parseLimitBreakPercent, infusedAbilityDamage } from "../../combat/ability-damage.mjs";
import { grantStatus } from "../../combat/inflict-status.mjs";
import { TROPHY_UNITS } from "../../data/item/TrophyData.mjs";
import { interruptsOf, interruptLeft, spendUse, setInterruptLeft } from "../../combat/damage-interrupts.mjs";
import { bondGearRules, bondNameOf, looseGearLimit, addBondKits, bondKitItems, partyBondGear, itemCount } from "../../helpers/gear.mjs";
export { _parseAbilityDamage };

/**
 * Whether the infused damage adds damage of its own under "Other" that the
 * base doesn't have (MAGNARIME's "again", MAGNAPYRE's explosion, p.233): it
 * is rolled after the base damage, so a second Damage Roll in the same turn
 * starts as "Reroll (same use)".
 */
function _addsDamage(infused, base) {
  return (infused?.extras?.length ?? 0) > (base?.extras?.length ?? 0);
}

/** The armed one of an ability's infusions (infusionsOf), with the Aether spent on it, or null. */
function _armedVersion(infusions, actor) {
  const armed = (infusions ?? []).find(i => i.armed);
  return armed ? { ...armed, spent: armedInfusion(actor)?.spent ?? 0 } : null;
}

export class IconSheet extends BaseActorSheet {

  /* -------------------------------------------------- */
  /*  Static config                                      */
  /* -------------------------------------------------- */

  static DEFAULT_OPTIONS = {
    classes: ["icon", "sheet", "actor", "icon-sheet"],
    position: { width: 820, height: 700 },
    window:   { resizable: true, controls: [PROTOTYPE_TOKEN_CONTROL, REFERENCE_CONTROL] },
    actions: {
      rollSave:         BaseActorSheet.onRollSave,   // Conditions tab / save bar
      configurePrototypeToken: onConfigurePrototypeToken,
      rollAction:          IconSheet.#onRollAction,        // legacy alias
      rollNarrativeAction: IconSheet.#onRollNarrativeAction,
      setActionRating:     IconSheet.#onSetActionRating,
      toggleEffort:      IconSheet.#onToggleEffort,
      recoverAllEffort:  IconSheet.#onRecoverAllEffort,
      toggleStrain:  IconSheet.#onToggleStrain,
      setStrain:     IconSheet.#onSetStrain,
      clockTick:     IconSheet.#onClockTick,
      clockUntick:   IconSheet.#onClockUntick,
      setClockSegment: IconSheet.#onSetClockSegment,
      adjustClock:   IconSheet.#onAdjustClock,
      addBurden:     IconSheet.#onAddBurden,
      removeBurden:  IconSheet.#onRemoveBurden,
      addAmbition:   IconSheet.#onAddAmbition,
      removeAmbition:IconSheet.#onRemoveAmbition,
      addLooseGear:    IconSheet.#onAddLooseGear,
      outsiderGear:    IconSheet.#onOutsiderGear,
      removeLooseGear: IconSheet.#onRemoveLooseGear,
      gearKitCarry:     IconSheet.#onGearKitCarry,
      gearItemUsed:     IconSheet.#onGearItemUsed,
      gearItemGiveBack: IconSheet.#onGearItemGiveBack,
      blessCharacter:   IconSheet.#onBlessCharacter,
      gearNewExpedition: IconSheet.#onGearNewExpedition,
      gearAddBondKits:  IconSheet.#onGearAddBondKits,
      gearCustomKit:    IconSheet.#onGearCustomKit,
      gearClearOldKit:  IconSheet.#onGearClearOldKit,
      setXp:         IconSheet.#onSetXp,
      adjustXp:      IconSheet.#onAdjustXp,
      setWounds:        IconSheet.#onSetWounds,
      levelUp:          IconSheet.#onLevelUp,
      openLevelUp:      IconSheet.#onLevelUp,
      levelDown:        IconSheet.#onLevelDown,
      openCharCreation: IconSheet.#onOpenCharCreation,
      showHelp:         IconSheet.#onShowHelp,
      showReference:    IconSheet.#onShowReference,
      abilityStance:    IconSheet.#onAbilityStance,
      removeTraitItem:  IconSheet.#onRemoveTraitItem,
      removeItem:        IconSheet.#onRemoveItem,
      setPrimaryJob:     IconSheet.#onSetPrimaryJob,
      abilityShowInChat:  IconSheet.#onAbilityShowInChat,
      abilityPartToChat:  IconSheet.#onAbilityPartToChat,
      abilityInterruptToChat: IconSheet.#onAbilityInterruptToChat,
      setInterruptUses:   IconSheet.#onSetInterruptUses,
      abilityGamble:      IconSheet.#onAbilityGamble,
      abilityAttackRoll:  IconSheet.#onAbilityAttackRoll,
      abilityPlaceArea:   IconSheet.#onAbilityPlaceArea,
      abilityMark:        IconSheet.#onAbilityMark,
      abilityTrack:       IconSheet.#onAbilityTrack,
      removeMark:         IconSheet.#onRemoveMark,
      abilityDamageRoll:  IconSheet.#onAbilityDamageRoll,
      traitShowInChat:    IconSheet.#onTraitShowInChat,
      traitPlaceArea:     IconSheet.#onTraitPlaceArea,
      placeTerrainSpaces: IconSheet.#onPlaceTerrainSpaces,
      relicShowInChat:    IconSheet.#onRelicShowInChat,
      trophyShowInChat:   IconSheet.#onTrophyShowInChat,
      trophyUse:          IconSheet.#onTrophyUse,
      trophyAdjust:       IconSheet.#onTrophyAdjust,
      trophyToggle:       IconSheet.#onTrophyToggle,
      addCustomTrophy:    IconSheet.#onAddCustomTrophy,
      invokeGambit:       IconSheet.#onInvokeGambit,
      bondPowerShowInChat: IconSheet.#onBondPowerShowInChat,
      toggleBondPowerUse:  IconSheet.#onToggleBondPowerUse,
      resetSessionPowers:  IconSheet.#onResetSessionPowers,
      bondShowInChat:      IconSheet.#onBondShowInChat,
      useLimitBreak: IconSheet.#onUseLimitBreak,
      limitBreakDamageRoll: IconSheet.#onLimitBreakDamageRoll,
      limitBreakPercentDamage: IconSheet.#onLimitBreakPercentDamage,
      limitBreakPlaceArea:  IconSheet.#onLimitBreakPlaceArea,
      limitBreakInfuse:     IconSheet.#onLimitBreakInfuse,
      addJob:        IconSheet.#onAddJob,
      removeJob:     IconSheet.#onRemoveJob,
      // Class resources (conditional by primary job class)
      setVigilance:     IconSheet.#onSetVigilance,
      setStackedDice:   IconSheet.#onSetStackedDice,
      useStackedDie:    IconSheet.#onUseStackedDie,
      traitSpendAether: IconSheet.#onTraitSpendAether,
      openSummon:       IconSheet.#onOpenSummon,
      spendVigilance:   IconSheet.#onSpendVigilance,
      clearVigilance:   IconSheet.#onClearVigilance,
      clearStance:      IconSheet.#onClearStance,
      resetAuraColor:   IconSheet.#onResetAuraColor,
      abilityInfuse:    IconSheet.#onAbilityInfuse,
      toggleComboToken: IconSheet.#onToggleComboToken,
      adjustBlessings:  IconSheet.#onAdjustBlessings,
      clearBlessings:   IconSheet.#onClearBlessings,
      adjustAether:     IconSheet.#onAdjustAether,
      adjustDust:       IconSheet.#onAdjustDust,
      upgradeRelic:     IconSheet.#onUpgradeRelic,
      infuseRelic:      IconSheet.#onInfuseRelic,
      refocus:          IconSheet.#onRefocus,
      fixPhantomAp:     IconSheet.#onFixPhantomAp,
      fixSkillRanks:    IconSheet.#onFixSkillRanks,
      toggleAbilitiesLock: IconSheet.#onToggleAbilitiesLock,
      toggleStatus:        IconSheet.#onToggleStatus,
      adjustElevation:     IconSheet.#onAdjustElevation,
      adjustStatusCharges: IconSheet.#onAdjustStatusCharges,
      addPowerDie:      IconSheet.#onAddPowerDie,
      rollPowerDie:     IconSheet.#onRollPowerDie,
      tickPowerDie:     IconSheet.#onTickPowerDie,
      removePowerDie:   IconSheet.#onRemovePowerDie,
      editPowerDie:     IconSheet.#onEditPowerDie,
      // Power die tracked on an ability / trait item
      itemPowerDieTick: IconSheet.#onItemPowerDieTick,
      itemPowerDieSet:  IconSheet.#onItemPowerDieSet,
      itemPowerDieRoll: IconSheet.#onItemPowerDieRoll,
      // Basic actions (p.85)
      basicAttackRoll:  IconSheet.#onBasicAttackRoll,
      basicDamageRoll:  IconSheet.#onBasicDamageRoll,
      damageUtility:    IconSheet.#onDamageUtility,
      basicRecover:     IconSheet.#onBasicRecover,
    },
    form: { submitOnChange: true },
  };

  static PARTS = {
    header:     { template: "systems/icon-system/templates/actor/icon-header.hbs" },
    tabs:       { template: "templates/generic/tab-navigation.hbs" },
    narrative:  { template: "systems/icon-system/templates/actor/icon-narrative.hbs",  scrollable: [""] },
    combat:     { template: "systems/icon-system/templates/actor/icon-combat.hbs",     scrollable: [""] },
    conditions: { template: "systems/icon-system/templates/actor/icon-conditions.hbs", scrollable: [""] },
    relics:     { template: "systems/icon-system/templates/actor/icon-relics.hbs",     scrollable: [""] },
    notes:      { template: "systems/icon-system/templates/actor/icon-notes.hbs",      scrollable: [""] },
  };

  /** Active tab per group */
  tabGroups = { primary: "narrative" };

  /** Sort mode for the narrative actions list: "default" | "alphabetical" | "rank" */
  _actionSortMode = "default";

  /** Edit-lock for the Equipped Abilities block. When true, the talent/mastery
   *  editors and the × remove buttons on ability slots are disabled to prevent
   *  accidental edits during play. Toggled via a button in the Combat tab. */
  _abilitiesLocked = true;

  /* -------------------------------------------------- */
  /*  Form submission                                    */
  /* -------------------------------------------------- */

  /*
   * Array sub-fields with NO form input (`jobs[].primary`, `jobs[].templateUuid`,
   * burden/ambition `clock.value`) used to be reset by every submit. They are
   * now preserved generically by BaseActorSheet._processFormData, which merges
   * each submitted array element onto its live counterpart before the clean
   * step — the same fix that protects foe/legend action tags.
   */

  /* -------------------------------------------------- */
  /*  Getters                                            */
  /* -------------------------------------------------- */

  get title() { return this.document.name; }

  /** @override — add the "Prototype Token" control (DocumentSheetV2 lacks it). */
  _getHeaderControls() { return filterPrototypeTokenControl(super._getHeaderControls(), this); }

  /* -------------------------------------------------- */
  /*  Context                                            */
  /* -------------------------------------------------- */

  async _prepareContext(options) {
    _log(`_prepareContext — actor: "${this.document.name}" | activeTab: ${this.tabGroups.primary}`);
    const context = await super._prepareContext(options);
    const actor   = this.document;
    const system  = actor.system;
    // Summons compendium index (cached after the first sheet opens): the
    // ability panels offer the creatures their text names, ready to drag.
    await loadSummonIndex();
    // Aura colour shown in the picker: the character's own, or the colour
    // their auras are drawn in by default (area-templates.mjs).
    context.auraColor = areaColor({ kind: "aura" }, actor);

    context.actor      = actor;
    context.system     = system;
    context.config     = CONFIG.ICON;
    context.isEditable = this.isEditable;
    context.tabs       = this._buildTabs();

    // Enriched HTML fields
    context.enrichedNotes = await enrichHTML(system.biography.notes);

    // Ability items embedded in the actor
    context.abilityItems = actor.items
      .filter(i => i.type === "ability")
      .sort((a, b) => a.sort - b.sort);
    context.limitBreakItem = actor.items.find(i => i.type === "limit-break");
    // Its text in the book's layout (R39): tag line, flavour, one labelled block per line.
    context.limitBreakEffect = context.limitBreakItem
      ? await enrichLimitBreakText(context.limitBreakItem.system.effect, { enrich: t => this._enrichAbility(t) }) : "";
    // The Ultimate (p.113: "Upon entering chapter 3, you unlock the Ultimate
    // limit break for your job, which improves it"): always shown, dimmed and
    // locked before chapter 3 — the same threshold as #limitBreakTexts.
    context.limitBreakUltimate = context.limitBreakItem?.system?.ultimate
      ? await enrichLimitBreakText(context.limitBreakItem.system.ultimate, { enrich: t => this._enrichAbility(t) }) : "";
    context.limitBreakUltimateUnlocked = (actor.system.combat?.chapter ?? 1) >= 3;
    context.limitBreakFlavor = context.limitBreakItem?.system?.description
      ? await this._enrichAbility(context.limitBreakItem.system.description, { keywords: false }) : "";
    // "1action" / "free" are storage keys — the panel prints "1 Action" / "Free Action".
    context.limitBreakCost = abilityCostLabel(context.limitBreakItem?.system?.cost ?? "");
    // Limit breaks that deal damage get a Damage Roll button, like abilities.
    context.limitBreakDeals = !!context.limitBreakItem && IconSheet.#limitBreakDamage(actor, context.limitBreakItem).dealsDamage;
    // A share of the target's max hp, which no die rolls (Gigantas Crusher p.135, Split Heaven and Hell p.127).
    context.limitBreakPercent = !!context.limitBreakItem && !!parseLimitBreakPercent(context.limitBreakItem.system);
    // ... and the ones with an aura or an area get the area button (Paradiso p.155: "You gain Aura 2").
    const lbAreas = context.limitBreakItem ? IconSheet.#limitBreakAreas(actor, context.limitBreakItem) : [];
    context.limitBreakArea = lbAreas.length === 1 ? lbAreas[0].label : lbAreas.length ? "Area" : "";
    // Its Infuse versions (Wright, p.117: Gigaflare's Tetraflare, the Ultimate's Meteor), armed like an ability's.
    context.limitBreakInfusions = context.limitBreakItem ? IconSheet.#limitBreakInfusionList(actor, context.limitBreakItem) : [];
    context.limitBreakResolve = context.limitBreakItem
      ? (context.limitBreakInfusions.find(i => i.armed)?.resolveCost ?? context.limitBreakItem.system.resolveCost) : 0;

    // AP / Mastery spending counters
    // Each owned ability costs 1 AP. Each unlocked talent costs +1 AP.
    // Each unlocked mastery costs 1 mastery point.
    const apSpentAbilities = context.abilityItems.length;
    const apSpentTalents   = context.abilityItems.filter(a => (a.system?.talentSelected ?? 0) > 0).length;
    const masterySpent     = context.abilityItems.filter(a => a.system?.masteryUnlocked).length;
    const apTotal      = system.combat?.apTotal ?? 0;
    const masteryTotal = system.combat?.masteries ?? 0;
    context.apSpentAbilities = apSpentAbilities;
    context.apSpentTalents   = apSpentTalents;
    context.apSpent          = apSpentAbilities + apSpentTalents;
    context.apTotal          = apTotal;
    context.apFree           = Math.max(0, apTotal - context.apSpent);
    context.apOverspent      = context.apSpent > apTotal;
    // The halfway XP bonus used to be handed out at level 0 as well, which the
    // book does not do (p.112). Migration 15 takes that point back, but it runs
    // once per world: a character imported from an older world afterwards still
    // carries it. Flag the exact signature — one more AP than everything this
    // system grants adds up to — so it can be corrected whenever it turns up.
    context.apPhantomHalfway = (system.combat?.level ?? 0) >= 1
      && apTotal === expectedApTotal(actor) + 1;
    context.masterySpent     = masterySpent;
    context.masteryTotal     = masteryTotal;
    context.masteryFree      = Math.max(0, masteryTotal - masterySpent);
    context.masteryOverspent = masterySpent > masteryTotal;

    // Skill Rank counter — dots on the ten narrative actions vs the dots the
    // character is entitled to. `system.combat.skillRanksTotal` only counts the
    // action improvements handed out by level ups (LevelUpDialog), but the
    // dots on the sheet also include the six every character starts with:
    // the bond's +2 in one action and the 4 to distribute (p.241). Without
    // those six in the total, a brand-new character reads "Spent 6 / 0 OVER"
    // for ever, which is what it did until now.
    // `system.combat.skillRanksTotal` is an accumulator: only LevelUpDialog
    // ever adds to it. A character who did not earn every level through that
    // dialog — imported from another world, built by hand, level typed into
    // the field — has a pool that stopped growing, and reads OVER for ever
    // however many dots they legitimately hold. So take the larger of what was
    // accumulated and what the advancement table grants at this level; a GM
    // who raised the field by hand keeps their number.
    const skillRanksStored   = system.combat?.skillRanksTotal ?? 0;
    const skillRanksEarned   = expectedSkillRanksFromLevels(actor);
    const skillRanksFromLevels = Math.max(skillRanksStored, skillRanksEarned);
    const skillRanksTotal = STARTING_ACTION_DOTS + skillRanksFromLevels;
    const actionsMap      = system.narrative?.actions ?? {};
    const skillRanksSpent = Object.values(actionsMap).reduce((sum, v) => sum + (Number(v) || 0), 0);
    context.skillRanksBase       = STARTING_ACTION_DOTS;
    context.skillRanksFromLevels = skillRanksFromLevels;
    context.skillRanksTotal      = skillRanksTotal;
    context.skillRanksSpent      = skillRanksSpent;
    context.skillRanksFree       = Math.max(0, skillRanksTotal - skillRanksSpent);
    context.skillRanksOverspent  = skillRanksSpent > skillRanksTotal;
    // The field is behind the level: offer to bring it up to date, so the
    // stored number and the counter stop disagreeing.
    context.skillRanksBehind     = skillRanksStored < skillRanksEarned;
    context.skillRanksEarned     = skillRanksEarned;

    // Enriched detail view for each equipped ability — rendered as hidden
    // preview panels under the ability slots grid in the Combat tab. Click on
    // a slot toggles the matching panel.
    context.abilityDetails = await Promise.all(context.abilityItems.map(async a => {
      // The combo chosen for this use (normal or the mastery's alternate, see _pickCombo).
      const s = this._comboSystem(a);
      const talentSelected  = s.talentSelected ?? 0;
      const masteryUnlocked = !!s.masteryUnlocked;
      const desc = parseAbilitySections(s.description);
      const infusions = infusionsOf([...desc.sections, ...masteryInfusion(s)], actor, a.id);
      // The armed Infuse version's damage (Magnabio's Hit 2[D]+fray, Cryotic's fray damage).
      const parsed = infusedAbilityDamage(_parseAbilityDamage(s, { baseBlocks: true }), _armedVersion(infusions, actor), { infusions, system: s });
      const parsedCombo = parseComboAbilityDamage(s);
      const trigger = (s.interruptTrigger ?? "").trim() || desc.trigger;
      // While the combo token is held, a combo ability shows the combo's own
      // tags (Hades: True Strike + Medium Blast) — flagged as upgraded — and
      // its own area on the area button (Death Blossom → Flying Sleeves: Arc 4).
      // Same test as the attack / Show in Chat buttons; context.comboActive is
      // only set further down, so reading it here was always false.
      const comboArmed = this._comboArmed(a);
      // Interrupt uses changed by a talent / mastery go on the cost badge (Catapult → Interrupt 3).
      const { tags, ...cost } = resolveAbilityCost(s, resolveAbilityTags(s, { comboMode: comboArmed }));
      return {
        id:          a.id,
        name:        a.name,
        jobName:     s.jobName ?? "",
        class:       s.class ?? "",
        cost:        abilityCostLabel(cost.key),
        costTooltip: cost.tooltip,
        costUpgraded: cost.upgraded,
        chapter:     s.chapter ?? 1,
        tags,
        comboArmed,
        // "Medium Blast" / "Line 4" / … from the tags, or from the ability's own
        // text when the header has no area (Tsunami, p.233) → area button
        areaLabel:   _areaButtonLabel(tags, _areaText(s, comboArmed)),
        // Mark abilities: Mark button + the marks this ability currently has on the scene
        canMark:     markFromTags(tags).can || !!_comboMark(a.system) || !!_altComboMark(a.system),
        comboMark:   _comboMark(a.system),
        altComboMark: _altComboMark(a.system),
        // Stance abilities: stance button, lit while this is the stance in play
        canStance:   tags.some(t => tagKey(t) === "stance"),
        stanceOn:    IconActor.stancesOf(actor).includes(a.name),
        // Gamble button (p.148): "gamble" tag, or the word in a text in play
        canGamble:   abilityGambles(s, tags),
        // Summons this ability names: draggable straight onto the map
        summons:     summonsForAbility(s, s.jobName),
        // Objects this ability puts on the map (R33a): draggable chips too
        objects:     objectChips(a),
        // Terrain spaces it marks (R33b): pits, dangerous / difficult terrain, motes, mines, runes…
        spaces:      terrainChips(a),
        // Infuse versions (Wright, p.117): cost, name, and whether one is armed
        infusions,
        marks:       _abilityMarks(actor.id, a.id, _comboMark(a.system), _altComboMark(a.system)),
        // Track button: a reminder on the designated character that isn't a mark (marks.mjs)
        canTrack:    abilityTracks(s, tags),
        trackMarks:  marksBy(actor.id, `${a.id}:track`).map(m => ({ uuid: m.uuid, targetName: m.targetName })),
        talentSelected,
        masteryUnlocked,
        powerDie:    powerDieView(s),
        // Uses left this round of each interrupt the ability gives (its own
        // "Interrupt N" cost, a granted or mastery one): the same counts the
        // damage card's buttons spend (damage-interrupts.mjs).
        interruptUses: interruptsOf(actor).filter(i => i.itemId === a.id && i.kind !== "refresh").map(i => {
          const { left, max } = interruptLeft(actor, i);
          return { key: i.key, name: i.name, left, max, banked: !!i.bankMax,
                   pips: Array.from({ length: max }, (_, n) => ({ n: n + 1, on: n < left })) };
        }),
        // Relic integration: reminder lines the character's relics add to this ability
        relicReminders: await this._relicRemindersFor(s, parsed),
        // Book-order rules blocks parsed out of the description (Stance, Mark, Effect…)
        sections:    await Promise.all(desc.sections.map(async sec => ({ label: sec.label, text: await this._enrichAbility(sec.text) }))),
        // Every rules block (Hit/Miss/Area/Charge… + the parsed ones) in reading
        // order, merged where the book prints one line — see helpers/ability-blocks.mjs
        // A granted interrupt's block ("Cheat Time — Interrupt 1") gets a chat
        // button posting that interrupt alone (#onAbilityInterruptToChat).
        // comboReplaced: the base block a combo written as a change takes the place of
        // (Sweet Torment's Effect, Succubus's Mark), struck through while the token is held.
        blocks:      comboReplacedBlocks(s, await buildAbilityBlocks(s, { sections: desc.sections, enrich: t => this._enrichAbility(t) }))
          .map(b => ({ ...b, interruptChat: b.key === "section" && !b.combo && !!interruptBlockName(b.label) })),
        // Parsed combat data — drives which buttons show and pre-fills dialogs.
        // dealsDamage includes the combo version so combo-only damage still
        // gets a Damage button, and the talent / mastery damage that only the
        // dialog's "Other" outcome rolls.
        isAttack:    parsed.isAttack,
        isAutoHit:   parsed.isAutoHit,
        dealsDamage: parsed.dealsDamage || !!parsedCombo?.dealsDamage || !!parsed.extras?.length,
        description:         await this._enrichAbility(desc.flavor, { keywords: false }),
        trigger:             await this._enrichAbility(trigger),
        hitEffect:           await this._enrichAbility(s.hitEffect),
        missEffect:          await this._enrichAbility(s.missEffect),
        areaEffect:          await this._enrichAbility(s.areaEffect),
        chargeEffect:        await this._enrichAbility(s.chargeEffect),
        heroicEffect:        await this._enrichAbility(s.heroicEffect),
        exceedEffect:        await this._enrichAbility(s.exceedEffect),
        collideEffect:       await this._enrichAbility(s.collideEffect),
        slayEffect:          await this._enrichAbility(s.slayEffect),
        critEffect:          await this._enrichAbility(s.critEffect),
        finishingBlowEffect: await this._enrichAbility(s.finishingBlowEffect),
        comebackEffect:      await this._enrichAbility(s.comebackEffect),
        talent1:             await this._enrichAbility(s.talent1),
        talent2:             await this._enrichAbility(s.talent2),
        mastery:             await this._enrichAbility(s.mastery, { leadName: true }),
        // Boolean flags for template conditional rendering
        hasHit:     !!(s.hitEffect && s.hitEffect.trim()),
        hasMiss:    !!(s.missEffect && s.missEffect.trim()),
        hasArea:    !!(s.areaEffect && s.areaEffect.trim()),
        hasCharge:  !!(s.chargeEffect && s.chargeEffect.trim()),
        hasHeroic:  !!(s.heroicEffect && s.heroicEffect.trim()),
        hasExceed:  !!(s.exceedEffect && s.exceedEffect.trim()),
        hasCollide: !!(s.collideEffect && s.collideEffect.trim()),
        hasSlay:    !!(s.slayEffect && s.slayEffect.trim()),
        hasCrit:    !!(s.critEffect && s.critEffect.trim()),
        hasFinish:  !!(s.finishingBlowEffect && s.finishingBlowEffect.trim()),
        hasComeback:!!(s.comebackEffect && s.comebackEffect.trim()),
        isCombo:     !!(s.isCombo),
        comboEffect: await this._enrichAbility(s.comboEffect, { leadName: true }),
        hasCombo:    !!(s.isCombo && s.comboEffect && s.comboEffect.trim()),
        // Complete combo ability: the base text is struck through while the token is held (not for "The Hook: Gains…").
        comboWhole:  !!(s.isCombo && comboReplacesBase(s.comboEffect, s)),
        // Talent visibility:
        //   - Show Talent I only if it has content AND (no choice yet OR I is chosen)
        //   - Show Talent II only if it has content AND (no choice yet OR II is chosen)
        // Note: this gates the preview panel. The item sheet editor still
        // shows everything so GMs can adjust.
        hasTalent1: !!(s.talent1 && s.talent1.trim()) && (talentSelected === 0 || talentSelected === 1),
        hasTalent2: !!(s.talent2 && s.talent2.trim()) && (talentSelected === 0 || talentSelected === 2),
        // "Raw" flags are independent of the current selection — used by the
        // talent/mastery editor dropdown so it always shows the available picks.
        hasTalent1Raw: !!(s.talent1 && s.talent1.trim()),
        hasTalent2Raw: !!(s.talent2 && s.talent2.trim()),
        hasMasteryRaw: !!(s.mastery && s.mastery.trim()),
        // Mastery visible only if unlocked
        hasMastery: !!(s.mastery && s.mastery.trim()) && masteryUnlocked,
        hasDesc:    !!desc.flavor,
        hasTrigger: !!trigger,
        hasSections: desc.sections.length > 0,
      };
    }));
    // The six slots above the panels show the same cost as the panel badge
    // ("1 Action", Catapult's mastery "Interrupt 3"), not the stored key.
    context.abilityCosts = Object.fromEntries(context.abilityDetails.map(d => [d.id, d]));

    // Relic items — enriched detail view for the Relics tab.
    // We can't access RelicData SchemaField descriptions directly in Handlebars
    // reliably, so build plain objects with pre-enriched HTML here.
    const rawRelics = actor.items.filter(i => i.type === "relic");
    const dustPool  = system.narrative?.dust ?? 0;
    // Gambit invokes (once per combat, p.114) and the abilities each relic touches
    // (the inverse of the reminder lines on the ability panels).
    const gambits = gambitInvokes(actor);
    context.relicItems = await Promise.all(rawRelics.map(async r => {
      const s = r.system ?? {};
      const currentRank = s.currentRank ?? 1;
      const rank2Cost   = s.rank2?.dustCost ?? 6;
      const rank3Cost   = s.rank3?.dustCost ?? 6;
      const aspectCost  = s.aspect?.dustCost ?? 12;
      const invested    = s.investedDust ?? 0;
      // Cost of the immediate next rank (for the infusion progress display).
      const nextCost    = currentRank === 1 ? rank2Cost
                        : currentRank === 2 ? rank3Cost
                        : currentRank === 3 ? aspectCost
                        : 0;
      return {
        id:              r.id,
        name:            r.name,
        img:             r.img,
        invokeType:      s.invokeType ?? "",
        invokeCondition: s.invokeCondition ?? "",
        suggestedForm:   s.suggestedForm ?? "",
        invokeEffect:    await enrichHTML(s.invokeEffect),
        // Which rank grants the Invoke, and whether this character has it yet
        invokeRank:      relicInvokeRank(s),
        invokeRankLabel: ["", "I", "II", "III", "Aspect"][relicInvokeRank(s)] ?? "",
        invokeLocked:    currentRank < relicInvokeRank(s),
        rank1:           await enrichHTML(s.rank1?.description),
        rank1DustCost:   s.rank1?.dustCost ?? 0,
        rank2:           await enrichHTML(s.rank2?.description),
        rank2DustCost:   rank2Cost,
        rank3:           await enrichHTML(s.rank3?.description),
        rank3DustCost:   rank3Cost,
        aspect:          await enrichHTML(s.aspect?.description),
        aspectQuest:     await enrichHTML(s.aspect?.questDescription),
        aspectDustCost:  aspectCost,
        aspectQuestCompleted: !!s.aspect?.questCompleted,
        currentRank,
        investedDust:    invested,
        nextRankCost:    nextCost,
        canInfuse:       dustPool >= 1 && currentRank < 4 && invested < nextCost,
        // Per-rank UI flags
        rank1Unlocked: currentRank >= 1,
        rank2Unlocked: currentRank >= 2,
        rank3Unlocked: currentRank >= 3,
        aspectUnlocked: currentRank >= 4,
        // Which locked rank is the immediate next one (where infusion applies).
        rank2IsNext:  currentRank === 1,
        rank3IsNext:  currentRank === 2,
        aspectIsNext: currentRank === 3,
        // Upgrade is allowed once invested + pool covers the cost (so you can
        // either infuse gradually or pay the remainder all at once).
        canUpgradeRank2:  currentRank === 1 && (invested + dustPool) >= rank2Cost,
        canUpgradeRank3:  currentRank === 2 && (invested + dustPool) >= rank3Cost,
        canUpgradeAspect: currentRank === 3 && (invested + dustPool) >= aspectCost,
        gambit:  gambits.find(g => g.itemId === r.id) ?? null,
        // abilityDetails (not the raw Items) carry the ✦ reminder lines.
        touches: (context.abilityDetails ?? []).filter(a => (a.relicReminders ?? []).some(rr => rr.relic === r.name)).map(a => a.name),
      };
    }));
    context.dustPool = dustPool;

    // Trophies (p.242): uses left, 1/battle marker, "in effect" marker for the
    // ones that last a combat or an expedition. Three at once.
    const rawTrophies = actor.items.filter(i => i.type === "trophy");
    context.trophyItems = await Promise.all(rawTrophies.map(async t => {
      const s = t.system ?? {};
      const unit = TROPHY_UNITS[s.usesUnit] ?? TROPHY_UNITS.uses;
      const max  = s.uses?.max ?? 1;
      const left = Math.min(max, s.uses?.value ?? 0);
      const unlimited = s.usesUnit === "unlimited";
      return {
        unlimited,
        id:          t.id,
        name:        t.name,
        img:         t.img,
        kindLabel:   s.kind === "trait" ? "Trait" : s.kind === "ability" ? "Ability" : "",
        source:      s.sourceLabel ?? "",
        usesText:    s.usesText ?? "",
        left, max,
        unitLeft:    unit.left,
        lasting:     !!unit.active,
        activeLabel: unit.active,
        active:      !!s.active,
        perCombat:   !!s.perCombat,
        usedThisCombat: !!s.usedThisCombat,
        broken:      !unlimited && left <= 0,
        pips:        !unlimited && max <= 10 ? Array.from({ length: max }, (_, i) => ({ on: i < left })) : null,
        description: await enrichHTML(s.description),
      };
    }));
    context.trophyCount = rawTrophies.length;
    context.trophyOver  = rawTrophies.length > 3;

    // Gear (p.35): base kit always with you, bond kits carried one per
    // expedition (two for the Highborn), used/lost items marked until the
    // next expedition; loose gear taken along up to the bond's limit.
    {
      const bondName = bondNameOf(actor);
      const rules    = bondGearRules(bondName);
      const kits = actor.items.filter(i => i.type === "gear-kit").map(k => {
        return {
          id: k.id, name: k.name, always: !!k.system.always, carried: !!k.system.carried, custom: !!k.system.custom,
          items: (k.system.items ?? []).filter(Boolean).map(name => {
            const { spent, max } = itemCount(k.system, name);
            return { name, used: spent >= max, spent, max, counted: max > 1, left: max - spent };
          }),
        };
      }).sort((a, b) => (b.always - a.always) || (b.carried - a.carried) || a.name.localeCompare(b.name));
      const loose = system.narrative?.looseGear ?? [];
      const looseLimit = looseGearLimit(actor);
      const looseCarried = loose.filter(g => g.carried).length;
      context.gear = {
        bondName, kits,
        carryLimit:   rules.carry,
        carriedCount: kits.filter(k => k.carried && !k.always).length,
        canCustom:    rules.customItems > 0 && !!bondName,
        customItems:  rules.customItems,
        canAddBondKits: !!bondName,
        oldKit:       system.narrative?.gearKit ?? "",
        looseLimit, looseCarried,
        looseOver:    looseCarried > looseLimit,
        // The Outsider takes gear from the party's other bonds at the end of an interlude (p.76).
        isOutsider:   bondName.trim().toLowerCase() === "outsider",
      };
    }

    // Bond item — embedded bond (drag-and-drop slot in the Narrative tab).
    // At most one is expected; if more exist (legacy) we show the first.
    const bondItem = actor.items.find(i => i.type === "bond");
    if (bondItem) {
      const bs = bondItem.system ?? {};
      context.bondItem = {
        id:                 bondItem.id,
        name:                bondItem.name,
        img:                 bondItem.img,
        effortMax:           bs.effortMax ?? 3,
        secondWindTrigger:   bs.secondWindTrigger ?? "",
        primaryActions:      Array.isArray(bs.primaryActions) ? bs.primaryActions.filter(Boolean) : [],
        enrichedDescription: await enrichHTML(bs.description ?? ""),
        enrichedSpecial:     await enrichHTML(bs.specialAbility ?? ""),
        enrichedGambit:      await enrichHTML(bs.gambitPower ?? ""),
      };
    } else {
      context.bondItem = null;
    }

    // Bond power items — enriched detail view for the Narrative tab.
    const rawBondPowers = actor.items.filter(i => i.type === "bond-power");
    context.bondPowerItems = await Promise.all(rawBondPowers.map(async bp => {
      const s = bp.system ?? {};
      return {
        id:           bp.id,
        name:         bp.name,
        img:          bp.img,
        bondName:     s.bondName ?? "",
        effortCost:   s.effortCost ?? 0,
        limitPerSession: s.limitPerSession ?? 0,
        usedThisSession: Math.min(s.usedThisSession ?? 0, s.limitPerSession ?? 0),
        isGambit:     !!s.isGambit,
        description:  await enrichHTML(s.description),
      };
    }));

    // Trait items (embedded on the actor — from dropped Job Templates, Job items,
    // or individual trait drags). Enriched descriptions for rendering. Also
    // compute isLocked based on the PC's current chapter: a chapter-3 trait is
    // locked until the character reaches chapter 3.
    const currentChapter = system.combat?.chapter ?? 1;
    const rawTraits = actor.items
      .filter(i => i.type === "trait")
      .sort((a, b) => {
        const jobCmp = (a.system?.jobName ?? "").localeCompare(b.system?.jobName ?? "");
        if (jobCmp) return jobCmp;
        const chCmp = (a.system?.chapter ?? 1) - (b.system?.chapter ?? 1);
        if (chCmp) return chCmp;
        return a.name.localeCompare(b.name);
      });
    // Quick class-resource controls shown in the header of the CLASS trait
    // (source "class": Fortify / Bless / Chain Reaction), so the Vigilance
    // pips, Aether and Power Dice, and Blessings are usable right
    // next to the class feature that explains them (Maar's request, Aug 2026).
    const cr = system.combat?.classResources ?? {};
    // Power dice tracker (combat tab, every class): ticks never above the die.
    context.powerDice = (cr.powerDice ?? []).map(d => {
      const faces = Number(d.faces) || 6;
      return { id: d.id, label: d.label ?? "", faces, ticks: Math.min(faces, d.ticks ?? 1) };
    });
    const quickFor = (t) => {
      // Fool's "Stack Dice" job trait: pips for the die(s) currently held.
      if (t.system?.source === "job" && /stack/i.test(t.name ?? "") && /fool/i.test(t.system?.jobName ?? "")) {
        const sd  = cr.stackedDice ?? {};
        // Death's Apprentice (Fool Ch.2 trait) lets them hold 2 — auto-raise
        // the cap once that trait is present and unlocked.
        const hasDA = rawTraits.some(o => /death.s apprentice/i.test(o.name ?? "") && (o.system?.chapter ?? 1) <= currentChapter);
        const max = hasDA ? 2 : 1;
        return { type: "stackedDice", value: sd.value ?? 0, max,
                 pips: Array.from({ length: max }, (_, i) => ({ i: i + 1, active: i + 1 <= (sd.value ?? 0) })) };
      }
      // "You can spend 2 Aether any time to regain it" (Aether Deflection,
      // Spellblade p.224): a button that pays the Aether and says so in chat.
      const regain = /\bspend (\d+) Aether any time to regain it\b/i.exec(String(t.system?.description ?? "").replace(/<[^>]+>/g, " "));
      if (regain) {
        const cost = Number(regain[1]), aether = cr.aether?.value ?? 0;
        return { type: "aetherRegain", cost, aether, short: aether < cost };
      }
      if (t.system?.source !== "class") return null;
      // Only on the class trait that uses the resource (Fortify, Bless,
      // Chain Reaction), not on every class trait. Vagabond gets none: no
      // trait mentions combo, and the COMBO toggle sits above the abilities.
      const desc = String(t.system?.description ?? "").replace(/<[^>]+>/g, " ");
      const uses = { stalwart: /\bvigilance\b/i, mendicant: /\bblessing tokens?\b/i, wright: /\baether\b/i }[t.system?.class];
      if (!uses?.test(desc)) return null;
      switch (t.system?.class) {
        case "stalwart":  return { type: "vigilance", value: cr.vigilance?.value ?? 0, max: cr.vigilance?.max ?? 6,
                                   pips: Array.from({ length: 6 }, (_, i) => ({ i: i + 1, active: i + 1 <= (cr.vigilance?.value ?? 0) })) };
        case "wright":    return { type: "wright", aether: cr.aether?.value ?? 0, dice: context.powerDice };
        case "mendicant": return { type: "blessings", value: cr.blessingTokens?.value ?? 0 };
        default: return null;
      }
    };
    context.traitItems = await Promise.all(rawTraits.map(async t => {
      const chapter = t.system?.chapter ?? 1;
      // A trait that gives its owner an aura gets the same area button as the
      // abilities (Shieldmaster "You have aura 1", p.121); not while locked.
      const auraTag = chapter > currentChapter ? "" : traitAuraTag(t.system?.description);
      return {
        areaLabel:           auraTag ? (areaFromTags([auraTag])?.label ?? "") : "",
        // Summons the trait puts on the table, as on the abilities (Beast
        // Master, Selkie, Bound Spirit, Cheap Trick); not while locked.
        summons:             chapter > currentChapter ? [] : summonsForTrait(t.system, t.system?.jobName),
        objects:             chapter > currentChapter ? [] : objectChips(t),
        spaces:              chapter > currentChapter ? [] : terrainChips(t),
        quick:               quickFor(t),
        powerDie:            powerDieView(t.system),
        id:                  t.id,
        name:                t.name,
        jobName:             t.system?.jobName ?? "",
        class:               t.system?.class ?? "",
        source:              t.system?.source ?? "",
        chapter,
        isLocked:            chapter > currentChapter,
        enrichedDescription: await enrichHTML(t.system?.description),
      };
    }));

    // Actions list for narrative tab
    context.actionsList = Object.entries(CONFIG.ICON.actions).map(([key, labelKey]) => ({
      key,
      label: game.i18n.localize(labelKey),
      rating: system.narrative.actions[key] ?? 0,
    }));

    // Level-up availability flag for the UI (XP >= 15 && level < 12 && not at chapter cap)
    context.canLevelUp = LevelUpDialog.canLevelUp(actor) === null;
    context.xpReady    = (system.narrative?.xp?.value ?? 0) >= 15;
    context.narrative  = { levelUpAvailable: (system.narrative?.xp?.value ?? 0) >= 15 };

    // Sort based on current mode
    context.actionSortMode = this._actionSortMode;
    if (this._actionSortMode === "alphabetical") {
      context.actionsList.sort((a, b) => a.label.localeCompare(b.label));
    } else if (this._actionSortMode === "rank") {
      context.actionsList.sort((a, b) => b.rating - a.rating || a.label.localeCompare(b.label));
    }

    // Summons attached to this PC (summon actors whose summonerActorId points
    // here). Players had no way to reach them from their own sheet.
    context.summons = (game.actors?.contents ?? [])
      .filter(a => a.type === "summon" && a.system?.summonerActorId === actor.id)
      .map(a => ({
        id:    a.id,
        name:  a.name,
        img:   a.img,
        source: a.system?.sourceAbilityName ?? "",
        hp:    a.system?.hp?.value ?? null,
        hpMax: a.system?.hp?.max ?? null,
        onScene: !!canvas?.scene?.tokens?.some(t => t.actorId === a.id),
      }));

    // Vigor ticks (one per point up to vigor.max = VIT). Vigor over the
    // maximum (Gran Reversa's Mastery, p.202) adds extra "over" ticks.
    {
      const vmax = Math.max(1, system.combat?.vigor?.max ?? 1);
      const vval = system.combat?.vigor?.value ?? 0;
      const len  = Math.max(vmax, vval);
      context.vigorTickCount = len;
      context.vigorTicks = Array.from({ length: len }, (_, i) => ({ on: i < vval, over: i >= vmax }));
    }

    // HP bar segments: 4 quarters of VIT each over the BASE max. Wounds
    // black out quarters from the right (p. 15 diagram) — the bloodied line
    // at 50% never moves.
    {
      const vit    = system.combat?.vit ?? 0;
      const wounds = system.combat?.wounds?.value ?? 0;
      context.hpSegments = Array.from({ length: 4 }, (_, k) => {
        const i = k + 1;                       // 1..4 from the left
        const woundNo = 4 - k;                 // segment 4 (rightmost) = wound 1
        return {
          i, woundNo,
          left:   k * 25,
          width:  25,
          hpFrom: k * vit + 1,
          hpTo:   i * vit,
          wounded: woundNo <= wounds,
        };
      });
    }

    // Combo token — active when a vagabond (or any class with combo abilities)
    // has earned their combo token. Drives the combo display on ability previews.
    context.comboActive = (system.combat?.classResources?.comboToken?.value ?? 0) === 1;

    // Stances: how many at once, and why (Martial Master, Byrax Aspect, extra).
    const stanceMax = IconActor.stanceMax(this.document);
    context.stanceMax     = stanceMax.max;
    context.stanceSources = stanceMax.sources.join(", ");
    context.stanceCount   = IconActor.stancesOf(this.document).length;

    // Primary job class — drives the conditional class-resources panel
    // in the Combat tab (Vigilance / Combo Token / Blessings / Aether).
    // Normalize to lowercase: legacy actors may have "Wright" / "Mendicant"
    // with capitalized first letter, breaking the case-sensitive icon-eq
    // helper in the template.
    const primaryJob = (system.combat?.jobs ?? []).find(j => j.primary);
    context.primaryJobClass = (primaryJob?.class ?? "").toLowerCase();
    const baseInfo = context.primaryJobClass ? CLASS_INFO[context.primaryJobClass] : null;

    // Merge relevant rules from ALL classes the actor has jobs in (primary +
    // secondaries from multiclass). Dedupe by rule name so the same keyword
    // (e.g. "Shove X") doesn't appear twice when two classes both reference it.
    if (baseInfo) {
      const allClasses = new Set(
        (system.combat?.jobs ?? [])
          .map(j => (j.class ?? "").toLowerCase())
          .filter(Boolean),
      );
      const seen = new Set();
      const mergedRules = [];
      for (const cls of allClasses) {
        const info = CLASS_INFO[cls];
        if (!info?.relevantRules) continue;
        for (const r of info.relevantRules) {
          const key = r.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          mergedRules.push(r);
        }
      }
      // Build a shallow copy of baseInfo with the merged rules so the template
      // sees one unified list. The primary's special mechanic / gambit are kept.
      context.classInfo = { ...baseInfo, relevantRules: mergedRules };
    } else {
      context.classInfo = null;
    }
    _log(`primaryJobClass: "${context.primaryJobClass}" (raw: "${primaryJob?.class}") | merged rules: ${context.classInfo?.relevantRules?.length ?? 0}`);

    // Edit-lock state for equipped abilities — UI shows lock/unlock button
    // and disables talent/mastery editors when locked.
    context.abilitiesLocked = this._abilitiesLocked;

    // Conditions tab: toggleable status buttons grouped negative/positive/special.
    // Each entry has an `active` flag based on the actor's current statuses set,
    // so the UI shows which conditions are currently applied. The "elevation"
    // entry uses the icon-system flag instead of the status check, so a
    // non-zero elevation always reads as active. Stackable statuses (blessed,
    // power-die) read their charge count from `flags.icon-system.statusCharges`
    // and use the same left/right-click pattern as elevation.
    const elevationLevel = actor.getFlag("icon-system", "elevation") ?? 0;
    context.elevationLevel = elevationLevel;
    const allCharges = actor.getFlag("icon-system", "statusCharges") ?? {};
    context.statusCharges = allCharges;
    const groups = groupStatusesForUI();
    const markActive = list => list.map(s => {
      const stackable = STACKABLE_STATUSES.has(s.id);
      const charges   = stackable ? (allCharges[s.id] ?? 0) : 0;
      const effect    = actor.effects.find(e =>
        e.statuses?.has(s.id) || e.getFlag("core", "statusId") === s.id);
      return {
        ...s,
        // "Hatred of X": show who it is of (marks.mjs)
        name: (s.id === "hatred" && effect?.name) ? effect.name : s.name,
        stackable,
        charges,
        ongoing: effect?.getFlag("icon-system", "ongoing") ?? false,
        active: s.id === "elevation"
          ? elevationLevel !== 0
          : stackable
            ? charges > 0
            : (actor.statuses?.has(s.id) ?? false),
      };
    });
    context.marksOnActor = marksOn(actor).map(m => ({ uuid: m.uuid, abilityName: m.abilityName, sourceName: m.sourceName, text: m.text, stacks: m.stacks, tracked: !!m.tracked }));
    context.conditions = {
      // Statuses the sheet trackers / marks replace are left out (tracker-statuses.mjs)
      negative: markActive(visibleStatuses(actor, groups.negative)),
      positive: markActive(visibleStatuses(actor, groups.positive)),
      special:  markActive(visibleStatuses(actor, groups.special)),
    };
    // "Roll Save" buttons at the top of the Conditions tab (BaseActorSheet#rollSave)
    context.saveableStatuses = this._saveableStatuses();

    _log(`_prepareContext — done | abilities: ${context.abilityItems.length} | relics: ${context.relicItems.length} | sort: ${this._actionSortMode} | primaryJobClass: "${context.primaryJobClass}"`);
    return context;
  }

  async _preparePartContext(partId, context, options) {
    await super._preparePartContext(partId, context, options);
    if (context.tabs?.[partId]) context.tab = context.tabs[partId];
    _log(`_preparePartContext — part: "${partId}" | tab.cssClass: "${context.tab?.cssClass ?? "(none)"}"`);
    return context;
  }

  _buildTabs() {
    const active = this.tabGroups.primary;
    const defs = [
      { id: "narrative",  label: "ICON.TabNarrative"  },
      { id: "combat",     label: "ICON.TabCombat"     },
      { id: "conditions", label: "ICON.TabConditions" },
      { id: "relics",     label: "ICON.TabRelics"     },
      { id: "notes",      label: "ICON.TabNotes"      },
    ];
    return Object.fromEntries(defs.map(d => [d.id, {
      id:       d.id,
      group:    "primary",
      label:    game.i18n.localize(d.label) ?? d.label,
      active:   active === d.id,
      cssClass: active === d.id ? "active" : "",
    }]));
  }

  /* -------------------------------------------------- */
  /*  Render hooks                                       */
  /* -------------------------------------------------- */

  async _onFirstRender(context, options) {
    await super._onFirstRender?.(context, options);
    // Self-heal: secondary-class Gambit traits (they silently failed to embed
    // before the TraitData "gambit" fix). Creating items re-renders the sheet.
    try { await ensureClassGambits(this.document); }
    catch (err) { console.warn("ICON 1.5 | ensureClassGambits failed:", err); }
  }

  _onRender(context, options) {
    _log(`_onRender — actor: "${this.document.name}" | activeTab: ${this.tabGroups.primary}`);
    // Tabs, drop binding, portrait picker and status right-click handlers
    // come from BaseActorSheet.
    super._onRender(context, options);

    const html = this.element;

    // Ability slots — guarded per slot element.
    // - dragover/drop: assign ability to the slot (existing behavior)
    // - single click: toggle the matching preview panel below the grid
    // - double click: existing [data-item-id] dblclick handler opens the sheet
    html.querySelectorAll(".icon-ability-slot").forEach(slot => {
      if (slot.dataset.iconDropBound) return;
      slot.dataset.iconDropBound = "true";
      slot.addEventListener("dragover", ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = "copy"; });
      slot.addEventListener("drop",     ev => { ev.stopPropagation(); this.#onDropAbilitySlot(ev, slot); });

      // Click → toggle preview panel. Use a 200ms timer so we can distinguish
      // from double-click (which opens the item sheet via the dblclick handler).
      let clickTimer = null;
      slot.addEventListener("click", ev => {
        // If the click was on an action button (e.g. the × remove), let its
        // own handler run and skip the preview toggle.
        if (ev.target.closest('[data-action]')) return;
        if (!slot.dataset.itemId) return; // empty slot — nothing to preview
        if (clickTimer) return;
        clickTimer = setTimeout(() => {
          clickTimer = null;
          this.#toggleAbilityPreview(html, slot.dataset.itemId);
        }, 200);
      });
      slot.addEventListener("dblclick", ev => {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      });
    });

    // Terrain space chips (R33b): right-click removes that chip's spaces from the scene. Guarded per element.
    html.querySelectorAll("[data-terrain-index]").forEach(el => {
      if (el.dataset.iconTerrainBound) return;
      el.dataset.iconTerrainBound = "true";
      el.addEventListener("contextmenu", ev => {
        ev.preventDefault(); ev.stopPropagation();
        removeTerrainOfChip(this.document, el.dataset.itemId, el.dataset.terrainIndex)
          .catch(err => console.warn("[ICON | IconSheet] removing terrain spaces failed", err));
      });
    });

    // Item link dblclick — guarded per element.
    html.querySelectorAll("[data-item-id]").forEach(el => {
      if (el.dataset.iconDblBound) return;
      el.dataset.iconDblBound = "true";
      el.addEventListener("dblclick", ev => {
        // Ignore double-clicks on interactive controls inside the box (quick
        // class-resource buttons, pips, inputs) — opening the item sheet
        // from a rapid "+ +" on Blessings was Maar's complaint.
        if (ev.target.closest("button, input, select, textarea, a, [data-action]")) return;
        const item = this.document.items.get(el.dataset.itemId);
        _log(`dblclick item — id: "${el.dataset.itemId}" | found: ${!!item}`);
        item?.sheet.render(true);
      });
    });

    // Talent select on the equipped-ability preview panels.
    html.querySelectorAll('select[data-action="setAbilityTalent"]').forEach(sel => {
      if (sel.dataset.iconChangeBound) return;
      sel.dataset.iconChangeBound = "true";
      sel.addEventListener("change", ev => {
        ev.stopPropagation();
        ev.preventDefault();
        this._setAbilityTalent(sel.dataset.itemId, Number(sel.value));
      });
    });

    // Mastery checkbox on the equipped-ability preview panels.
    html.querySelectorAll('input[data-action="toggleAbilityMastery"]').forEach(cb => {
      if (cb.dataset.iconChangeBound) return;
      cb.dataset.iconChangeBound = "true";
      cb.addEventListener("change", ev => {
        ev.stopPropagation();
        ev.preventDefault();
        this._setAbilityMastery(cb.dataset.itemId, cb.checked);
      });
    });

    // Action sort selector — change mode and re-render. stopPropagation so the
    // form submit-on-change doesn't try to write a system field named __actionSort.
    const sortSelect = html.querySelector('select[name="__actionSort"]');
    if (sortSelect && !sortSelect.dataset.iconChangeBound) {
      sortSelect.dataset.iconChangeBound = "true";
      sortSelect.addEventListener("change", ev => {
        ev.stopPropagation();
        ev.preventDefault();
        this._actionSortMode = sortSelect.value;
        _log(`setActionSort — mode: "${this._actionSortMode}"`);
        this.render();
      });
    }
  }

  /* -------------------------------------------------- */
  /*  Action handlers                                    */
  /* -------------------------------------------------- */

  static async #onRollAction(event, target) {
    // Legacy handler — kept for compatibility with the old [Roll] button.
    // Prefers data-action-key but falls back to data-skill for new markup.
    const key    = target.dataset.actionKey ?? target.dataset.skill;
    const actor  = this.document;
    const rating = actor.system.narrative.actions[key] ?? 0;
    const label  = game.i18n.localize(CONFIG.ICON.actions[key]) ?? key;
    _log(`rollAction (legacy) — actor: "${actor.name}" | action: "${key}" | rating: ${rating}`);
    await narrativeRoll({ actionLabel: label, rating, actor });
  }

  /**
   * Roll a narrative action from the dice-icon button. Opens a dialog first
   * so the player can pick boons / curses / whether to push effort, then
   * hands off to narrativeRoll() which posts the outcome chat card.
   */
  static async #onRollNarrativeAction(event, target) {
    event?.preventDefault?.();
    const key    = target.dataset.skill;
    const actor  = this.document;
    const rating = actor.system.narrative.actions[key] ?? 0;
    const label  = game.i18n.localize(CONFIG.ICON.actions[key]) ?? key;
    const effort = actor.system.narrative.effort ?? { value: 0, max: 0 };

    _log(`rollNarrativeAction — open dialog | actor: "${actor.name}" | skill: "${key}" | rating: ${rating} | effort: ${effort.value}/${effort.max}`);

    const result = await promptNarrativeRoll({ label, rating, effort });
    if (!result) return;  // cancelled

    const { boons, curses, pushEffort, rollType } = result;
    let   bonusDice = 0;

    // Push effort: spend 1 effort, add +1 bonus die. The bonus bypasses the
    // normal ±2 cap (boons/curses clamp separately in narrativeRoll).
    if (pushEffort) {
      if (effort.value <= 0) {
        ui.notifications.warn(`${actor.name} has no effort to push.`);
      } else {
        await actor.update({ "system.narrative.effort.value": effort.value - 1 });
        bonusDice = 1;
        _log(`rollNarrativeAction — pushed effort | ${effort.value} → ${effort.value - 1} | +1 bonus die (bypasses cap)`);
      }
    }

    _log(`rollNarrativeAction — rolling | skill: "${key}" | rating: ${rating} | boons: ${boons} | curses: ${curses} | bonusDice: ${bonusDice} | type: ${rollType}`);
    await narrativeRoll({ actionLabel: label, rating, boons, curses, bonusDice, rollType, actor });
  }


  /**
   * Click handler for the clickable dot pips. Sets the action rating to the
   * clicked dot's value. Clicking the highest currently-filled dot TOGGLES
   * the rating down by one (so [●●●○] click on dot 3 → [●●○○]).
   */
  static async #onSetActionRating(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const key     = target.dataset.skill;
    const value   = Number(target.dataset.value);
    const actor   = this.document;
    const current = actor.system.narrative.actions[key] ?? 0;
    // Toggle: clicking the currently-maxed dot clears it by one step.
    const next    = (value === current) ? value - 1 : value;
    const clamped = Math.max(0, Math.min(next, 4));
    _log(`setActionRating — actor: "${actor.name}" | skill: "${key}" | ${current} → ${clamped}`);
    await actor.update({ [`system.narrative.actions.${key}`]: clamped });
  }

  static async #onToggleEffort(event, target) {
    const idx    = Number(target.dataset.index);
    const effort = this.document.system.narrative.effort;
    const newVal = idx < effort.value ? idx : idx + 1;
    const clamped = Math.max(0, Math.min(newVal, effort.max));
    _log(`toggleEffort — actor: "${this.document.name}" | idx: ${idx} | ${effort.value} → ${clamped}`);
    await this.document.update({ "system.narrative.effort.value": clamped });
  }

  static async #onRecoverAllEffort(event, target) {
    const effort = this.document.system.narrative.effort;
    _log(`recoverAllEffort — actor: "${this.document.name}" | ${effort.value} → ${effort.max}`);
    await this.document.update({ "system.narrative.effort.value": effort.max });
    ui.notifications?.info(`${this.document.name}: effort restored (${effort.max}/${effort.max}).`);
  }

  static async #onToggleStrain(event, target) {
    const idx    = Number(target.dataset.index);
    const strain = this.document.system.narrative.strain;
    const newVal = idx < strain.value ? idx : idx + 1;
    const clamped = Math.max(0, Math.min(newVal, 5));
    _log(`toggleStrain — actor: "${this.document.name}" | idx: ${idx} | ${strain.value} → ${clamped}`);
    await this.document.update({ "system.narrative.strain.value": clamped });
  }

  /**
   * Click a strain box (1..5). If the clicked box equals the current value,
   * clear one strain (decrement). Otherwise set strain to the clicked value.
   */
  static async #onSetStrain(event, target) {
    const value   = Number(target.dataset.value) || 0;
    const current = this.document.system.narrative.strain.value ?? 0;
    const next    = (value === current) ? value - 1 : value;
    const clamped = Math.max(0, Math.min(5, next));
    _log(`setStrain — actor: "${this.document.name}" | ${current} → ${clamped}`);
    await this.document.update({ "system.narrative.strain.value": clamped });
  }

  static async #onClockTick(event, target) {
    const path  = target.dataset.path;
    const clock = foundry.utils.getProperty(this.document, path) ?? 0;
    const max   = Number(target.dataset.max);
    const next  = Math.min(clock + 1, max);
    _log(`clockTick — actor: "${this.document.name}" | path: "${path}" | ${clock} → ${next}`);
    await this.document.update({ [path]: next });
  }

  static async #onClockUntick(event, target) {
    const path  = target.dataset.path;
    const clock = foundry.utils.getProperty(this.document, path) ?? 0;
    const next  = Math.max(clock - 1, 0);
    _log(`clockUntick — actor: "${this.document.name}" | path: "${path}" | ${clock} → ${next}`);
    await this.document.update({ [path]: next });
  }

  /**
   * Click a burden/ambition clock segment (1-indexed). If the clicked segment
   * equals the current value, clear it (decrement). Otherwise set the clock
   * value to the clicked segment.
   */
  static async #onSetClockSegment(event, target) {
    const type    = target.dataset.type;                  // "burden" | "ambition"
    const index   = Number(target.dataset.index);
    const segment = Number(target.dataset.segment) || 0;
    const key     = type === "burden" ? "burdens" : "ambitions";
    const list    = foundry.utils.deepClone(this.document.system.narrative[key] ?? []);
    const entry   = list[index];
    if (!entry) return;
    const max     = Number(entry.clock?.max ?? 6);
    const current = Number(entry.clock?.value ?? 0);
    const next    = (segment === current) ? segment - 1 : segment;
    const clamped = Math.max(0, Math.min(max, next));
    entry.clock.value = clamped;
    _log(`setClockSegment — ${type}[${index}] seg=${segment} | ${current} → ${clamped}`);
    await this.document.update({ [`system.narrative.${key}`]: list });
  }

  /**
   * +/- a burden/ambition clock by data-delta. Explicit buttons so adjusting a
   * clock never depends on clicking the small segment squares.
   */
  static async #onAdjustClock(event, target) {
    const type  = target.dataset.type;                 // "burden" | "ambition"
    const index = Number(target.dataset.index);
    const delta = Number(target.dataset.delta) || 0;
    const key   = type === "burden" ? "burdens" : "ambitions";
    const list  = foundry.utils.deepClone(this.document.system.narrative[key] ?? []);
    const entry = list[index];
    if (!entry) return;
    const max     = Number(entry.clock?.max ?? 6);
    const current = Number(entry.clock?.value ?? 0);
    const clamped = Math.max(0, Math.min(max, current + delta));
    entry.clock.value = clamped;
    _log(`adjustClock — ${type}[${index}] | ${current} → ${clamped}`);
    await this.document.update({ [`system.narrative.${key}`]: list });
  }

  static async #onAddBurden(event, target) {
    const burdens = foundry.utils.deepClone(this.document.system.narrative.burdens);
    if (burdens.length >= 3) { _log(`addBurden — BLOCKED (max 3)`); return; }
    _log(`addBurden — actor: "${this.document.name}" | count: ${burdens.length} → ${burdens.length + 1}`);
    burdens.push({ name: "New Burden", clock: { value: 0, max: 6 }, actions: ["", ""] });
    await this.document.update({ "system.narrative.burdens": burdens });
  }

  static async #onRemoveBurden(event, target) {
    const idx     = Number(target.dataset.index);
    const burdens = foundry.utils.deepClone(this.document.system.narrative.burdens);
    _log(`removeBurden — actor: "${this.document.name}" | idx: ${idx} | name: "${burdens[idx]?.name}"`);
    burdens.splice(idx, 1);
    await this.document.update({ "system.narrative.burdens": burdens });
  }

  static async #onAddAmbition(event, target) {
    const ambitions = foundry.utils.deepClone(this.document.system.narrative.ambitions);
    if (ambitions.length >= 3) { _log(`addAmbition — BLOCKED (max 3)`); return; }
    const maxes = [4, 6, 10];
    _log(`addAmbition — actor: "${this.document.name}" | count: ${ambitions.length} → ${ambitions.length + 1}`);
    ambitions.push({ name: "New Ambition", clock: { value: 0, max: maxes[ambitions.length] ?? 6 } });
    await this.document.update({ "system.narrative.ambitions": ambitions });
  }

  static async #onRemoveAmbition(event, target) {
    const idx       = Number(target.dataset.index);
    const ambitions = foundry.utils.deepClone(this.document.system.narrative.ambitions);
    _log(`removeAmbition — actor: "${this.document.name}" | idx: ${idx} | name: "${ambitions[idx]?.name}"`);
    ambitions.splice(idx, 1);
    await this.document.update({ "system.narrative.ambitions": ambitions });
  }

  /** Add an empty loose-gear row. Any amount can be kept; how many are taken
   *  on an expedition is the "carried" tick (p.36). */
  static async #onAddLooseGear(event, target) {
    const gear = foundry.utils.deepClone(this.document.system.narrative.looseGear ?? []);
    const carried = gear.filter(g => g.carried).length;
    gear.push({ name: "", carried: carried < looseGearLimit(this.document) });
    _log(`addLooseGear — actor: "${this.document.name}" | count: ${gear.length}`);
    await this.document.update({ "system.narrative.looseGear": gear });
  }

  /**
   * The Outsider, end of an interlude (p.76): pick one piece of gear from the
   * kits of the bonds the rest of the party uses; it joins the loose gear list.
   */
  static async #onOutsiderGear(event, target) {
    const groups = await partyBondGear(this.document);
    if (!groups.length) {
      ui.notifications.info("No other bond in the party: the Outsider takes gear from the kits of the bonds the other player characters use (p.76).");
      return;
    }
    const have = new Set((this.document.system.narrative.looseGear ?? []).map(g => String(g.name ?? "").trim().toLowerCase()));
    const options = groups.map(g => `<optgroup label="${escapeHTML(`${g.bond} — ${g.kit}`)}">${
      g.items.map(it => `<option value="${escapeHTML(it)}"${have.has(it.trim().toLowerCase()) ? " disabled" : ""}>${escapeHTML(it)}</option>`).join("")}</optgroup>`).join("");
    let picked = null;
    try {
      picked = await foundry.applications.api.DialogV2.prompt({
        window: { title: `End of interlude — ${this.document.name}` },
        content: `<p>The Outsider can take <strong>one</strong> piece of gear from the kits of any bond used by another character in the party and add it to their loose gear (p.76).</p>
          <label style="display:block">Gear <select name="gear" style="width:100%">${options}</select></label>`,
        ok: { label: "Add to loose gear", callback: (_e, button) => button.form?.elements?.gear?.value ?? "" },
        rejectClose: false,
      });
    } catch { picked = null; }
    if (!picked) return;
    const gear = foundry.utils.deepClone(this.document.system.narrative.looseGear ?? []);
    gear.push({ name: picked, carried: false });
    _log(`outsiderGear — "${this.document.name}" takes "${picked}"`);
    await this.document.update({ "system.narrative.looseGear": gear });
  }

  /* -------------------------------------------------- */
  /*  Gear kits (p.35)                                   */
  /* -------------------------------------------------- */

  /**
   * Carry (or put down) a bond kit for this expedition. One kit at a time
   * (the others are put down), two for the Highborn.
   */
  static async #onGearKitCarry(event, target) {
    event.stopPropagation();
    const actor = this.document;
    const kit = actor.items.get(target.dataset.itemId);
    if (!kit || kit.system.always) return;
    const limit = bondGearRules(bondNameOf(actor)).carry || 1;
    if (kit.system.carried) { await kit.update({ "system.carried": false }); return; }
    const others = actor.items.filter(i => i.type === "gear-kit" && !i.system.always && i.system.carried && i.id !== kit.id);
    const updates = [{ _id: kit.id, "system.carried": true }];
    if (limit === 1) others.forEach(o => updates.push({ _id: o.id, "system.carried": false }));
    else if (others.length >= limit) {
      ui.notifications.warn(`${actor.name} already carries ${limit} kits this expedition: put one down first.`);
      return;
    }
    await actor.updateEmbeddedDocuments("Item", updates);
  }

  /**
   * Use one of a kit item (click): "5 fire stones" counts down 5 uses, other
   * items one; when none are left it is marked used up or lost until the next
   * expedition, and a click on it then gets it back. Shift+click sets how
   * many uses the item has (any item, e.g. rations).
   */
  static async #onGearItemUsed(event, target) {
    event.stopPropagation();
    const kit  = this.document.items.get(target.dataset.itemId);
    const name = target.dataset.name;
    if (!kit || !name) return;

    if (event.shiftKey) {
      const { max } = itemCount(kit.system, name);
      let n = null;
      try {
        n = await foundry.applications.api.DialogV2.prompt({
          window: { title: `Uses — ${name}` },
          content: `<label style="display:block">How many uses does <strong>${escapeHTML(name)}</strong> have?
            <input type="number" name="n" value="${max}" min="1" max="99" style="width:100%" autofocus></label>`,
          ok: { label: "Set", callback: (_e, button) => Number(button.form?.elements?.n?.value) || 0 },
          rejectClose: false,
        });
      } catch { n = null; }
      if (!n || n < 1) return;
      return IconSheet.#queueKitWrite(kit, (counts, row, used) => {
        row.max = Math.min(99, n);
        row.spent = Math.min(row.spent, row.max);
        if (row.spent >= row.max) used.add(name); else used.delete(name);
      }, name);
    }

    return IconSheet.#queueKitWrite(kit, (counts, row, used, k) => {
      const { spent, max } = itemCount(k.system, name);
      if (spent >= max) { row.spent = 0; used.delete(name); }           // all gone: a click gets it back
      else { row.spent = spent + 1; if (row.spent >= max) used.add(name); }
    }, name);
  }

  /** Pending kit writes, per kit: see #queueKitWrite. */
  static #kitWrites = new Map();

  /**
   * Change one item row of a kit after the kit's previous change has landed.
   * Two quick clicks used to read the same counts before the first update was
   * saved, and counted as one: each write now waits its turn and reads the
   * kit afresh. `change(counts, row, used, kit)` edits the copies in place.
   */
  static #queueKitWrite(kit, change, name) {
    const key = kit.uuid;
    const run = async () => {
      const k = fromUuidSync(key);
      if (!k) return;
      const counts = foundry.utils.deepClone(k.system.counts ?? []);
      let row = counts.find(c => c.name === name);
      if (!row) { row = { name, spent: 0, max: 0 }; counts.push(row); }
      const used = new Set(k.system.used ?? []);
      if (change(counts, row, used, k) === false) return;
      await k.update({ "system.counts": counts, "system.used": [...used] });
    };
    const next = (IconSheet.#kitWrites.get(key) ?? Promise.resolve()).catch(() => {}).then(run);
    IconSheet.#kitWrites.set(key, next);
    next.catch(() => {}).finally(() => { if (IconSheet.#kitWrites.get(key) === next) IconSheet.#kitWrites.delete(key); });
    return next;
  }

  /** Give back one use of a counted kit item (the "−" next to it). */
  static async #onGearItemGiveBack(event, target) {
    event.stopPropagation();
    const kit  = this.document.items.get(target.dataset.itemId);
    const name = target.dataset.name;
    if (!kit || !name) return;
    return IconSheet.#queueKitWrite(kit, (counts, row, used, k) => {
      const { spent } = itemCount(k.system, name);
      if (spent <= 0) return false;
      row.spent = spent - 1;
      used.delete(name);
    }, name);
  }

  /** A new expedition: used and lost kit items come back (p.35). */
  static async #onGearNewExpedition(event) {
    event.stopPropagation();
    const actor = this.document;
    // Spent uses go back to 0; quantities set by hand stay.
    const kits = actor.items.filter(i => i.type === "gear-kit" && ((i.system.used ?? []).length || (i.system.counts ?? []).some(c => c.spent > 0)));
    if (kits.length) await actor.updateEmbeddedDocuments("Item", kits.map(k => ({
      _id: k.id, "system.used": [], "system.counts": (k.system.counts ?? []).map(c => ({ ...c, spent: 0 })),
    })));
    const carried = actor.items.filter(i => i.type === "gear-kit" && i.system.carried).map(i => i.name);
    ui.notifications.info(`${actor.name}: gear restocked for a new expedition${carried.length ? ` — carrying ${carried.join(" + ")}` : " — pick the kit to carry"}.`);
  }

  /** Put the bond's kits (and the base kit) on the sheet. */
  static async #onGearAddBondKits(event) {
    event.stopPropagation();
    const actor = this.document;
    const bond  = bondNameOf(actor);
    if (!bond) { ui.notifications.warn("Give the character a bond first."); return; }
    const n = await addBondKits(actor, bond);
    ui.notifications.info(n ? `${n} kit(s) of the ${bond} added.` : `The ${bond}'s kits are already on the sheet.`);
  }

  /**
   * Custom kit (p.35): any three items from the bond's kits, five for the
   * Highborn (p.66). Picked in a dialog, saved as a kit of its own.
   */
  static async #onGearCustomKit(event) {
    event.stopPropagation();
    const actor = this.document;
    const rules = bondGearRules(bondNameOf(actor));
    const n = rules.customItems;
    const groups = await bondKitItems(actor);
    if (!n || !groups.length) { ui.notifications.warn("No bond kits to pick items from."); return; }
    const html = `<p class="notes">Pick any ${n} items from your bond's kits (p.35${n === 5 ? ", p.66" : ""}).</p>`
      + groups.map(g => `<fieldset class="icon-custom-kit__group"><legend>${escapeHTML(g.kit)}</legend>`
        + g.items.map(it => `<label class="icon-custom-kit__item"><input type="checkbox" name="pick" value="${escapeHTML(it)}"> ${escapeHTML(it)}</label>`).join("")
        + `</fieldset>`).join("");
    const picked = await foundry.applications.api.DialogV2.prompt({
      window: { title: `Custom kit — ${n} items` },
      content: `<div class="icon-custom-kit">${html}</div>`,
      ok: {
        label: "Make kit",
        callback: (ev, button) => [...button.form.querySelectorAll('input[name="pick"]:checked')].map(i => i.value),
      },
      rejectClose: false,
    });
    if (!picked) return;
    if (picked.length !== n) { ui.notifications.warn(`A custom kit has ${n} items: ${picked.length} picked.`); return; }
    const old = actor.items.filter(i => i.type === "gear-kit" && i.system.custom).map(i => i.id);
    if (old.length) await actor.deleteEmbeddedDocuments("Item", old);
    await actor.createEmbeddedDocuments("Item", [{
      name: "Custom Kit", type: "gear-kit", img: "icons/svg/item-bag.svg",
      system: { bondName: bondNameOf(actor), kitName: "Custom Kit", items: [...new Set(picked)], custom: true, carried: false },
    }]);
  }

  /** Clear the old free-text kit field once the kits are on the sheet. */
  static async #onGearClearOldKit(event) {
    event.stopPropagation();
    await this.document.update({ "system.narrative.gearKit": "" });
  }

  /** Remove a loose-gear slot by index. */
  static async #onRemoveLooseGear(event, target) {
    const idx  = Number(target.dataset.index);
    const gear = foundry.utils.deepClone(this.document.system.narrative.looseGear ?? []);
    gear.splice(idx, 1);
    _log(`removeLooseGear — actor: "${this.document.name}" | idx: ${idx}`);
    await this.document.update({ "system.narrative.looseGear": gear });
  }

  /**
   * Click an XP pip (1..15). If the clicked pip equals the current value,
   * clear one XP (decrement). Otherwise set XP to the clicked value.
   * Clamped to [0, 15].
   */
  static async #onSetXp(event, target) {
    const value   = Number(target.dataset.value) || 0;
    const current = this.document.system.narrative.xp.value ?? 0;
    const next    = (value === current) ? value - 1 : value;
    const clamped = Math.max(0, Math.min(15, next));
    _log(`setXp — actor: "${this.document.name}" | ${current} → ${clamped}`);
    await this.document.update({ "system.narrative.xp.value": clamped });
  }

  static async #onAdjustXp(event, target) {
    const delta   = Number(target.dataset.delta) || 0;
    const current = this.document.system.narrative.xp.value ?? 0;
    const clamped = Math.max(0, Math.min(15, current + delta));
    _log(`adjustXp — actor: "${this.document.name}" | ${current} → ${clamped} (delta ${delta})`);
    await this.document.update({ "system.narrative.xp.value": clamped });
  }

  /**
   * Click a wound pip (1..4). If the clicked pip equals the current value,
   * clear one wound (decrement). Otherwise set wounds to the clicked value.
   * Clamped to [0, 4] — 4 wounds = Fallen.
   */
  static async #onSetWounds(event, target) {
    const value   = Number(target.dataset.value) || 0;
    const current = this.document.system.combat.wounds.value ?? 0;
    const next    = (value === current) ? value - 1 : value;
    const clamped = Math.max(0, Math.min(4, next));
    _log(`setWounds — actor: "${this.document.name}" | ${current} → ${clamped}`);
    await this.document.update({ "system.combat.wounds.value": clamped });
  }

  static async #onLevelUp(event, target) {
    const actor = this.document;
    _log(`levelUp — actor: "${actor.name}" | xp: ${actor.system.narrative.xp.value} | level: ${actor.system.combat.level}`);

    // Preflight check: XP >= 15, level < 12, not at chapter cap
    const err = LevelUpDialog.canLevelUp(actor);
    if (err) {
      _log(`levelUp — BLOCKED: ${err}`);
      ui.notifications.warn(err);
      return;
    }
    new LevelUpDialog(actor).render(true);
  }

  /**
   * Decrement level by 1. Only touches level + chapter — does NOT revert AP,
   * mastery points, bond powers, abilities, or action dots gained previously
   * (those are non-trivial to undo and must be adjusted manually).
   */
  static async #onLevelDown(event, target) {
    const actor = this.document;
    const level = actor.system.combat.level;
    _log(`levelDown — actor: "${actor.name}" | currentLevel: ${level}`);
    if (level <= 0) {
      ui.notifications.warn(`${actor.name} is already at level 0.`);
      return;
    }
    const next = level - 1;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window:  { title: "Level Down" },
      content: `<p>Level down <strong>${escapeHTML(actor.name)}</strong> from <strong>${level}</strong> to <strong>${next}</strong>?</p>
                <p class="notes">This only decreases the level counter. AP, mastery points, bond powers and action improvements previously gained are <em>not</em> reverted — adjust them manually if needed.</p>`,
      modal: true,
    });
    if (!confirmed) { _log(`levelDown — cancelled`); return; }

    const chapter = next <= 4 ? 1 : (next <= 8 ? 2 : 3);
    _log(`levelDown — applying | ${level} → ${next} | chapter: ${chapter}`);
    await actor.update({
      "system.combat.level":   next,
      "system.combat.chapter": chapter,
    });
  }

  static async #onOpenCharCreation(event, target) {
    _log(`openCharCreation — actor: "${this.document.name}"`);
    new CharacterCreationDialog(this.document).render(true);
  }

  /** Re-open the first-launch "how to build a character" guide. */
  static async #onShowHelp(event, target) {
    _log(`showHelp — opening welcome guide`);
    showWelcomeGuide();
  }

  /** Open the quick guide (turn schema, areas, glossary, FAQ). */
  static async #onShowReference(event, target) {
    _log(`showReference — opening rules reference`);
    showReferenceGuide();
  }

  /* -------------------------------------------------- */
  /*  Ability preview: show in chat / attack / damage    */
  /* -------------------------------------------------- */

  /**
   * Find the enriched ability detail for a given itemId (built in
   * _prepareContext as `abilityDetails`). Returns null if not found.
   */
  /**
   * enrichHTML for the ability texts of this character (preview panel, Show in
   * Chat card, attack card): "[D]" / "2[D]" are shown with the character's own
   * damage die ("d10" / "2d10", p.84, p.91), with "[D] = d10" on hover. A character
   * with no job yet keeps the [D] symbol (its die is only the schema default).
   * Item sheets, compendium views and NPC sheets call enrichHTML directly and
   * keep [D].
   */
  _enrichAbility(html, opts = {}) {
    const combat = this.document.system?.combat ?? {};
    const damageDie = (combat.jobs?.length && combat.damagedie) ? combat.damagedie : null;
    return enrichHTML(html, { damageDie, summonVerbs: true, ...opts });
  }

  /**
   * Relic reminder lines for one ability (relic-reminders.mjs), with the
   * rule keywords enriched like every other block on the card.
   */
  async _relicRemindersFor(s, parsed, { forAttackCard = false } = {}) {
    const tags = resolveAbilityTags(s).map(t => t.raw);
    const profile = buildAbilityProfile(s, { tags, isAttack: parsed.isAttack, dealsDamage: parsed.dealsDamage });
    const list = abilityRelicReminders(this.document, profile, { forAttackCard });
    return Promise.all(list.map(async r => ({ ...r, text: await this._enrichAbility(r.text) })));
  }

  /**
   * Is the combo version of this ability the one in play? True while the combo
   * token is held, and also right after Show in Chat spent it on this very
   * ability (the attack and damage rolls come as separate clicks afterwards).
   */
  _comboArmed(item) {
    const s = item?.system ?? {};
    if (!s.isCombo || !String(s.comboEffect ?? "").trim()) return false;
    const token = (this.document.system.combat?.classResources?.comboToken?.value ?? 0) === 1;
    return token || this.document.getFlag("icon-system", "comboSpentOnItem") === item.id;
  }

  /**
   * The ability's data with the combo version chosen for this use: the mastery's
   * alternate combo (Fantasia, Regrowth, Fists of Heaven and Hell, Gran Judicata)
   * in comboEffect / comboTags once it was picked in _pickCombo, the item's own
   * data otherwise.
   */
  _comboSystem(item) {
    const choice = this.document.getFlag("icon-system", "comboChoice");
    return withActiveCombo(item?.system ?? {}, !!choice?.alternate && choice?.itemId === item?.id);
  }

  /**
   * An unlocked mastery that adds an alternate combo ("You can choose this
   * ability or Fleet when you spend a token", p.177): while the combo is armed,
   * ask once which combo this use is, and remember it (flag comboChoice) for
   * the card, attack and damage clicks that follow. False when the dialog is closed.
   */
  async _pickCombo(item) {
    if (!item || !this._comboArmed(item)) return true;
    const alt = alternateCombo(item.system);
    if (!alt) return true;
    if (this.document.getFlag("icon-system", "comboChoice")?.itemId === item.id) return true;
    const normal = comboDisplayName(item.system.comboEffect) || "Combo";
    const pick = await foundry.applications.api.DialogV2.wait({
      window: { title: `${item.name} — choose the combo` },
      content: `<p>Your mastery gives ${escapeHTML(item.name)} an alternate combo. Which one do you use with this token?</p>`,
      buttons: [
        { action: "normal",    label: normal,   icon: "fa-solid fa-bolt", default: true },
        { action: "alternate", label: alt.name, icon: "fa-solid fa-star" },
      ],
      rejectClose: false,
    });
    if (pick !== "normal" && pick !== "alternate") return false;
    _log(`pickCombo — "${item.name}" | ${pick === "alternate" ? alt.name : normal}`);
    await this.document.setFlag("icon-system", "comboChoice", { itemId: item.id, alternate: pick === "alternate" });
    return true;
  }

  async _getAbilityDetail(itemId, { comboMode = null, noInfusion = false } = {}) {
    const item = this.document.items.get(itemId);
    if (!item) return null;
    await loadSummonIndex();   // chat cards can be posted before any sheet render
    const s = this._comboSystem(item);
    const desc = parseAbilitySections(s.description);
    // noInfusion: the base version, as the next use after an infused one reads it.
    const infusions = infusionsOf([...desc.sections, ...masteryInfusion(s)], this.document, item.id)
      .map(i => noInfusion ? { ...i, armed: false } : i);
    // The armed Infuse version's damage replaces the base where it writes its own (p.117).
    const parsed = infusedAbilityDamage(_parseAbilityDamage(s, { baseBlocks: true }), _armedVersion(infusions, this.document), { infusions, system: s });
    const parsedCombo = parseComboAbilityDamage(s);
    // Combo version in play: its tags replace the ability's (Hades gains True
    // Strike and Medium Blast) and its own text says how the attack lands
    // (auto-hit instead of a roll), so the buttons and the area follow it.
    const combo  = comboMode ?? this._comboArmed(item);
    const { tags, ...cost } = resolveAbilityCost(s, resolveAbilityTags(s, { comboMode: combo }));
    const active = combo && parsedCombo ? parsedCombo : parsed;
    const trigger = (s.interruptTrigger ?? "").trim() || desc.trigger;
    return {
      id:          item.id,
      name:        item.name,
      jobName:     s.jobName ?? "",
      class:       s.class ?? "",
      cost:        abilityCostLabel(cost.key),
      costTooltip: cost.tooltip,
      costUpgraded: cost.upgraded,
      chapter:     s.chapter ?? 1,
      tags,
      areaLabel:   _areaButtonLabel(tags, _areaText(s, combo)),
      comboArmed:  combo,
      canMark:     markFromTags(tags).can || !!_comboMark(item.system) || !!_altComboMark(item.system),
      comboMark:   _comboMark(item.system),
      altComboMark: _altComboMark(item.system),
      canStance:   tags.some(t => tagKey(t) === "stance"),
      stanceOn:    IconActor.stancesOf(this.document).includes(item.name),
      canGamble:   abilityGambles(s, tags),
      actorUuid:   this.document.uuid,
      summons:     summonsForAbility(s, s.jobName),
      infusions,
      marks:       _abilityMarks(this.document.id, item.id, _comboMark(item.system), _altComboMark(item.system)),
      canTrack:    abilityTracks(s, tags),
      trackMarks:  marksBy(this.document.id, `${item.id}:track`).map(m => ({ uuid: m.uuid, targetName: m.targetName })),
      talentSelected:  s.talentSelected ?? 0,
      masteryUnlocked: !!s.masteryUnlocked,
      powerDie:    powerDieView(s),
      relicReminders: await this._relicRemindersFor(s, parsed),
      relicProfile:   buildAbilityProfile(s, { tags: tags.map(t => t.raw), isAttack: active.isAttack, dealsDamage: parsed.dealsDamage || !!parsedCombo?.dealsDamage }),
      sections:    await Promise.all(desc.sections.map(async sec => ({ label: sec.label, text: await this._enrichAbility(sec.text) }))),
      blocks:      await buildAbilityBlocks(s, { sections: desc.sections, enrich: t => this._enrichAbility(t) }),
      hasSections: desc.sections.length > 0,
      isAttack:    active.isAttack,
      isAutoHit:   active.isAutoHit,
      dealsDamage: active.dealsDamage,
      parsed,
      parsedCombo,
      description:         await this._enrichAbility(desc.flavor, { keywords: false }),
      trigger:             await this._enrichAbility(trigger),
      hitEffect:           await this._enrichAbility(s.hitEffect),
      missEffect:          await this._enrichAbility(s.missEffect),
      areaEffect:          await this._enrichAbility(s.areaEffect),
      chargeEffect:        await this._enrichAbility(s.chargeEffect),
      heroicEffect:        await this._enrichAbility(s.heroicEffect),
      exceedEffect:        await this._enrichAbility(s.exceedEffect),
      collideEffect:       await this._enrichAbility(s.collideEffect),
      slayEffect:          await this._enrichAbility(s.slayEffect),
      critEffect:          await this._enrichAbility(s.critEffect),
      finishingBlowEffect: await this._enrichAbility(s.finishingBlowEffect),
      comebackEffect:      await this._enrichAbility(s.comebackEffect),
      talent1:             await this._enrichAbility(s.talent1),
      talent2:             await this._enrichAbility(s.talent2),
      mastery:             await this._enrichAbility(s.mastery, { leadName: true }),
      hasDesc:     !!desc.flavor,
      hasTrigger:  !!trigger,
      hasHit:      !!(s.hitEffect && s.hitEffect.trim()),
      hasMiss:     !!(s.missEffect && s.missEffect.trim()),
      hasArea:     !!(s.areaEffect && s.areaEffect.trim()),
      hasCharge:   !!(s.chargeEffect && s.chargeEffect.trim()),
      hasHeroic:   !!(s.heroicEffect && s.heroicEffect.trim()),
      hasExceed:   !!(s.exceedEffect && s.exceedEffect.trim()),
      hasCollide:  !!(s.collideEffect && s.collideEffect.trim()),
      hasSlay:     !!(s.slayEffect && s.slayEffect.trim()),
      hasCrit:     !!(s.critEffect && s.critEffect.trim()),
      hasFinish:   !!(s.finishingBlowEffect && s.finishingBlowEffect.trim()),
      hasComeback: !!(s.comebackEffect && s.comebackEffect.trim()),
      isCombo:     !!(s.isCombo),
      comboEffect: await this._enrichAbility(s.comboEffect, { leadName: true }),
      hasCombo:    !!(s.isCombo && s.comboEffect && s.comboEffect.trim()),
      // Complete combo ability: the base text is struck through while the token is held (not for "The Hook: Gains…").
      comboWhole:  !!(s.isCombo && comboReplacesBase(s.comboEffect, s)),
      // Only show a talent in chat once it has actually been unlocked/selected.
      // talentSelected: 0 = none unlocked, 1 = Talent I, 2 = Talent II.
      hasTalent1: !!(s.talent1 && s.talent1.trim()) && (s.talentSelected ?? 0) === 1,
      hasTalent2: !!(s.talent2 && s.talent2.trim()) && (s.talentSelected ?? 0) === 2,
      hasMastery: !!(s.mastery && s.mastery.trim()) && !!s.masteryUnlocked,
    };
  }

  /**
   * The Infuse versions of an ability on its Show in Chat card (p.117). They
   * used to be printed in full with the base, so Bio with its mastery carried
   * BIOTIC and the whole of MAGNABIO on one line. Now:
   *   - nothing armed: the base, and each version as a closed row with its
   *     name ("Infuse 6 (Mastery): MAGNABIO") that opens on a click;
   *   - a version armed: that version is the card's main block, labelled like
   *     an ability (Hit / Miss / Area…), the others stay closed; a version
   *     that is a complete ability (MAGNABIO: "2 actions, Attack, Range 8")
   *     closes the base blocks too, an upgrade (BIOTIC) keeps them open.
   * A mastery that is an infusion is shown here instead of the Mastery line.
   * @returns {object} fields to merge into the card's ability data ({} when it has no versions)
   */
  async _infuseCardParts(ab) {
    const infusions = ab.infusions ?? [];
    const armed = infusions.find(i => i.armed && !i.standalone);
    // An armed "Slay or Infuse" block leaves the base for the armed version (GRAM, GRAN BLITZ).
    const { base, groups } = splitInfuseBlocks(ab.blocks, { armed: armed?.label });
    const versions = groups.map(g => ({ label: g.label, text: infusions.find(i => i.label === g.label)?.text ?? "", extra: g.extra }));
    const fromMastery = infusions.filter(i => i.mastery);
    for (const i of fromMastery) versions.push({ label: i.label, text: i.text, extra: [] });
    if (!versions.length) return {};
    const enrich = t => this._enrichAbility(t);
    const armedVersion = armed ? versions.find(v => v.label === armed.label) : null;
    const whole = !!armedVersion && infuseVersionParts(armedVersion.text).whole;
    const rows = [];
    if (whole && base.length) {
      const blocksHtml = base.map(b => `<p class="icon-ability-section"><strong>${escapeHTML(b.label)}:</strong> ${b.text}</p>`).join("");
      rows.push(`<details class="icon-infuse-version icon-infuse-version--base"><summary>Base version: ${escapeHTML(ab.name)}</summary>${blocksHtml}</details>`);
    }
    for (const v of versions) if (v !== armedVersion) rows.push(await infuseVersionHtml(v, { enrich }));
    return {
      blocks:             whole ? [] : base,
      name:               armed?.name ? `${ab.name} — ${armed.name}` : ab.name,
      infuseArmedHtml:    armedVersion ? await infuseVersionHtml(armedVersion, { enrich, armed: true, spent: armedInfusion(this.document)?.spent ?? 0 }) : "",
      infuseVersionsHtml: rows.join(""),
      hasMastery:         fromMastery.length ? false : ab.hasMastery,
    };
  }

  /** Post the full ability card to chat. When the combo token is active and the
   *  ability has a combo version, posts the combo variant and consumes the token. */
  static async #onAbilityShowInChat(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (!(await this._pickCombo(item))) return;
    // A second card for an infusion already used is the next use: base version (p.204).
    await startInfusionStep(this.document, itemId, INFUSE_STEP.card);
    // A mastery that gives both versions at once (Dervish's BEACON OF HOPE,
    // p.178: "gain both effects at once … you don't actually need to spend"
    // a combo token) prints the base and the combo together, token or not.
    const both = masteryGainsBothEffects(item?.system);
    const ab = await this._getAbilityDetail(itemId, both ? { comboMode: true } : {});
    if (!ab) return;

    const comboMode = ab.comboArmed;
    _log(`abilityShowInChat — "${ab.name}" | comboMode: ${comboMode} | both: ${both}`);

    // Statuses the text inflicts → "Inflict" buttons for the current targets
    // (non-attack abilities like Implode / Gentleness only have this card).
    const sys  = this._comboSystem(item);
    // An attack whose area is on the map: the token in its attack space (the
    // centre of a Blast / Burst, p.97), else the attack target picked for it
    // in the attack / auto-hit that placed it, gets the attack part and the others the
    // area part, as on the attack card. Nothing asked here: unknown = all buttons.
    const cardTargets = captureTargets();
    let attackTargetId = "";
    if (ab.isAttack && cardTargets.length > 1) {
      const tpl = findAreaTemplates({ actorId: this.document.id, abilityKey: ab.id })[0];
      // The remembered pick only while that token is still inside the area (moved with Shift + arrows or dragged).
      const placed = tpl ? await retargetFromTemplate(tpl, { retarget: false }) : null;
      const remembered = rememberedAttackTarget(this.document, ab);
      if (placed) attackTargetId = attackSpaceTokenId(placed) || (placed.targets.some(t => t.id === remembered) ? remembered : "");
      if (!cardTargets.some(t => t.tokenId === attackTargetId)) attackTargetId = "";
    }
    const statusHtml = statusBlockHtml(abilityStatusEntries(sys, { comboMode, sourceName: this.document.name }), { source: this.document, abilityName: ab.name, targets: cardTargets, attackTargetId });

    // Combo version: the blocks are rebuilt with the combo text merged in, so
    // an ability whose combo only ADDS something (Low Blow / The Hook) still
    // prints in full, with the combo wording marked.
    let cardAb = comboMode
      ? { ...ab,
          // "Devil Hand", with "God Hand combo" beside it (the base name when the combo has none).
          // Both versions at once: "Dervish + Dawn".
          name:    both ? [ab.name, comboDisplayName(sys.comboEffect)].filter(Boolean).join(" + ")
                        : comboDisplayName(sys.comboEffect) || ab.name,
          comboOf: !both && comboDisplayName(sys.comboEffect) ? ab.name : "",
          blocks: await buildAbilityBlocks(sys, {
            sections: parseAbilitySections(sys.description).sections,
            enrich:   t => this._enrichAbility(t),
            comboText: sys.comboEffect ?? "",
          }) }
      : ab;
    // Infuse versions: closed rows, or the armed one as the main block.
    cardAb = { ...cardAb, ...(await this._infuseCardParts(cardAb)) };

    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/ability-card.hbs", { ab: cardAb, comboMode, statusHtml });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content,
    });
    await noteInfusionStep(this.document, itemId, INFUSE_STEP.card);

    // Both versions printed without an armed token: there is no token to spend.
    if (comboMode && this._comboArmed(item)) {
      // Consume the token, but remember which ability it was spent on: the
      // damage roll comes as a separate click afterwards, and by then the
      // token reads 0 — the stash lets the damage dialog default to the
      // combo version anyway.
      await this.document.update({ "system.combat.classResources.comboToken.value": 0 });
      await this.document.setFlag("icon-system", "comboSpentOnItem", itemId);
    }
  }

  /**
   * Post one upgrade of an ability on its own (data-part = "mastery" | "talent1"
   * | "talent2"): Symphony's CRESCENDO mote at the end of the turn (p.179),
   * Spirit Shrine's Grace of the Spirits interrupt (p.193) — the trigger
   * without the rest of the ability. Only an unlocked mastery / the selected
   * talent; statuses in that text get their Inflict / Gain buttons.
   */
  static async #onAbilityPartToChat(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const s = item.system ?? {};
    const part = target.dataset.part;
    const parts = {
      mastery: { text: s.mastery, label: "Mastery",    on: !!s.masteryUnlocked },
      talent1: { text: s.talent1, label: "Talent I",   on: Number(s.talentSelected ?? 0) === 1 },
      talent2: { text: s.talent2, label: "Talent II",  on: Number(s.talentSelected ?? 0) === 2 },
    };
    const p = parts[part];
    if (!p?.on || !String(p.text ?? "").trim()) return;
    // The book opens a mastery with its name in capitals ("CRESCENDO: If you…").
    const plain = String(p.text).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const caps  = part === "mastery" ? /^([A-Z][A-Z'’ -]*[A-Z])\s*:/.exec(plain)?.[1] : null;
    const title = caps ? caps.toLowerCase().replace(/(^|[\s'’-])\p{L}/gu, c => c.toUpperCase()) : "";
    _log(`abilityPartToChat — "${item.name}" | ${p.label}${title ? ` (${title})` : ""}`);
    const pc = {
      name:     item.name,
      label:    p.label,
      title,
      jobName:  s.jobName ?? "",
      class:    s.class ?? "",
      chapter:  s.chapter ?? 1,
      text:     await this._enrichAbility(p.text, { leadName: part === "mastery" }),
      statusHtml: statusBlockHtml(parseInflictedStatuses(p.text, { sourceName: this.document.name, label: p.label }),
                                  { source: this.document, abilityName: item.name }),
    };
    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/ability-part-card.hbs", { pc });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.document }), content });
  }

  /**
   * Post an interrupt granted inside an ability's text on its own (data-label =
   * its block label, "Cheat Time — Interrupt 1"): trigger, effect, and the
   * lines that change it — PHANTOM BLADE (Drifting Leaf, p.227), the unlocked
   * mastery (Revolution, Chronotemper p.152), the selected talent. See
   * grantedInterrupt() in helpers/ability-blocks.mjs.
   */
  static async #onAbilityInterruptToChat(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const s = item.system ?? {};
    const it = grantedInterrupt(s, target.dataset.label);
    if (!it) return;
    // Posting the interrupt is using it: spend one use, as the damage card's
    // button does. Not in the list (a stance not taken, a mark not out): post only.
    const counted = interruptsOf(this.document).find(i => i.kind === "granted" && i.itemId === item.id && i.label === target.dataset.label);
    // Stunned: "Can't take interrupts" (p.117), as the damage card's button.
    if (hasStatus(this.document, "stunned")) {
      ui.notifications.warn(`${this.document.name} is Stunned and can't take interrupts.`);
      return;
    }
    if (counted) {
      const { left, max } = interruptLeft(this.document, counted);
      if (left <= 0) {
        ui.notifications.warn(`${counted.name}: no uses left${counted.bankMax ? " in the bank" : " this round"} (0/${max}).`);
        return;
      }
      await spendUse(this.document, counted);
    }
    _log(`abilityInterruptToChat — "${item.name}" | ${it.name} (${it.cost}) | lines: ${it.lines.map(l => l.label).join(", ")} | use spent: ${!!counted}`);
    // "LEAF ON THE WIND" → "Leaf on the Wind", as the mastery names on R31's card.
    const title = /[a-z]/.test(it.name) ? it.name
      : it.name.toLowerCase().replace(/(^|[\s'’-])\p{L}/gu, c => c.toUpperCase())
          .replace(/\s(?:On|The|Of|And|In|A|An)(?=\s)/g, w => w.toLowerCase());
    const lines = await Promise.all(it.lines.map(async l => ({
      label: l.label, mastery: !!l.mastery,
      text: await this._enrichAbility(l.text, { leadName: !!l.mastery }),
    })));
    const raw = it.lines.map(l => l.text).join(" ");
    const pc = {
      name:     item.name,
      label:    it.cost,
      title,
      jobName:  s.jobName ?? "",
      class:    s.class ?? "",
      chapter:  s.chapter ?? 1,
      lines,
      statusHtml: statusBlockHtml(parseInflictedStatuses(raw, { sourceName: this.document.name, label: title }),
                                  { source: this.document, abilityName: item.name }),
    };
    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/ability-part-card.hbs", { pc });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.document }), content });
  }

  /**
   * Tick box of an interrupt's uses (data-key, data-n = the box clicked, from 1):
   * clicking a lit box spends down to it, a dark one gives uses back up to it.
   */
  static async #onSetInterruptUses(event, target) {
    event.stopPropagation();
    if (!this.isEditable) return;
    const it = interruptsOf(this.document).find(i => i.key === target.dataset.key);
    if (!it) return;
    const n = Number(target.dataset.n) || 0;
    const { left, max } = interruptLeft(this.document, it);
    const next = n <= left ? n - 1 : n;
    _log(`setInterruptUses — "${this.document.name}" | ${it.name} | left ${left} → ${next} / ${max}`);
    await setInterruptLeft(this.document, it, next);
  }

  /** Gamble button of an ability: dice dialog, Nd6 keep highest, card (combat/gamble.mjs). */
  static async #onAbilityGamble(event, target) {
    event.stopPropagation();
    await rollGamble(this.document, this.document.items.get(target.dataset.itemId));
  }

  /** Post a trait card to chat. */
  static async #onTraitShowInChat(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    _log(`traitShowInChat — "${item.name}"`);

    const tr = {
      name:        item.name,
      jobName:     item.system?.jobName ?? "",
      class:       item.system?.class ?? "",
      chapter:     item.system?.chapter ?? 1,
      description: await enrichHTML(item.system?.description),
    };
    // Only the statuses the character GAINS (Spite: "gain Hatred+ of the closest
    // foe until the end of your next turn"): a PC trait's other status words are
    // conditions and reminders, not something the card should inflict.
    const gains = parseInflictedStatuses(item.system?.description ?? "", { sourceName: this.document.name, label: "" }).filter(e => e.kind === "gain");
    tr.statusHtml = statusBlockHtml(gains, { source: this.document, abilityName: item.name });

    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/trait-card.hbs", { tr });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content,
    });
  }

  /* -------------------------------------------------- */
  /*  Trophies (p.242) — tracked, not automated           */
  /* -------------------------------------------------- */

  /** Chat card for a trophy; `event` is a line saying what just happened. */
  async _postTrophyCard(item, event = "") {
    const s = item.system ?? {};
    const unit = TROPHY_UNITS[s.usesUnit] ?? TROPHY_UNITS.uses;
    const tp = {
      name:        item.name,
      kindLabel:   s.kind === "trait" ? "Trait" : s.kind === "ability" ? "Ability" : "",
      source:      s.sourceLabel ?? "",
      description: await enrichHTML(s.description),
      left:        s.usesUnit === "unlimited" ? "Unlimited" : (s.uses?.value ?? 0),
      unitLeft:    unit.left || "uses",
      broken:      !!s.broken,
      perCombat:   !!s.perCombat,
      event,
    };
    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/trophy-card.hbs", { tp });
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.document }), content });
  }

  static async #onTrophyShowInChat(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (item) await this._postTrophyCard(item);
  }

  /**
   * Use the trophy: one use (or one combat / expedition) goes, the card goes to
   * chat. A combat- or expedition-long trophy is switched "in effect"; a
   * 1/battle one is marked spent for this combat. At 0 it crumbles (p.242).
   */
  static async #onTrophyUse(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const s = item.system;
    if (s.usesUnit === "unlimited") {
      await this._postTrophyCard(item, `${this.document.name} uses ${item.name}.`);
      return;
    }
    const left = s.uses?.value ?? 0;
    if (left <= 0) { ui.notifications.warn(`${item.name} has crumbled: no uses left.`); return; }
    if (s.perCombat && s.usedThisCombat) { ui.notifications.warn(`${item.name} can only be used once per combat.`); return; }
    const unit = TROPHY_UNITS[s.usesUnit] ?? TROPHY_UNITS.uses;
    const next = left - 1;
    const update = { "system.uses.value": next };
    if (s.perCombat) update["system.usedThisCombat"] = true;
    if (unit.active) update["system.active"] = true;
    _log(`trophyUse — "${item.name}" ${left} → ${next}`);
    await item.update(update);
    const what = unit.active ? `${unit.active.toLowerCase()}` : "used";
    await this._postTrophyCard(item, next <= 0
      ? `${this.document.name} uses ${item.name} (${what}) — its last use: the trophy crumbles.`
      : `${this.document.name} uses ${item.name} (${what}).`);
  }

  /** −/+ on the uses left (data-delta), between 0 and the maximum. */
  static async #onTrophyAdjust(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const max  = item.system.uses?.max ?? 1;
    const next = Math.max(0, Math.min(max, (item.system.uses?.value ?? 0) + (Number(target.dataset.delta) || 0)));
    await item.update({ "system.uses.value": next });
  }

  /** Flip a trophy marker: data-field = "active" | "usedThisCombat". */
  static async #onTrophyToggle(event, target) {
    event.stopPropagation();
    const item  = this.document.items.get(target.dataset.itemId);
    const field = target.dataset.field;
    if (!item || !["active", "usedThisCombat"].includes(field)) return;
    await item.update({ [`system.${field}`]: !item.system[field] });
  }

  /** A blank trophy on this character, opened for editing (custom trophies). */
  static async #onAddCustomTrophy(event) {
    event.stopPropagation();
    const [item] = await this.document.createEmbeddedDocuments("Item", [{
      name: "New trophy", type: "trophy", img: "icons/svg/chest.svg",
      system: { usesText: "1", usesUnit: "uses", uses: { value: 1, max: 1 } },
    }]);
    item?.sheet?.render(true);
  }

  /** Post a relic card to chat (only the unlocked ranks are shown). */
  static async #onRelicShowInChat(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    _log(`relicShowInChat — "${item.name}"`);

    const s = item.system ?? {};
    const currentRank = s.currentRank ?? 1;
    // The Invoke belongs to one rank of the relic (Riftwalker's is Rank III,
    // Domain's the Aspect): don't advertise it before it is unlocked.
    const invokeRank = relicInvokeRank(s);
    const invokeOn   = currentRank >= invokeRank;
    const rl = {
      name:            item.name,
      invokeRank,
      invokeRankLabel: ["", "I", "II", "III", "Aspect"][invokeRank] ?? "",
      invokeType:      invokeOn ? (s.invokeType ?? "") : "",
      invokeCondition: invokeOn ? (s.invokeCondition ?? "") : "",
      invokeEffect:    invokeOn ? await enrichHTML(s.invokeEffect) : "",
      currentRank,
      aspectUnlocked:  currentRank >= 4,
      rank1:           currentRank >= 1 ? await enrichHTML(s.rank1?.description) : "",
      rank2:           currentRank >= 2 ? await enrichHTML(s.rank2?.description) : "",
      rank3:           currentRank >= 3 ? await enrichHTML(s.rank3?.description) : "",
      aspect:          currentRank >= 4 ? await enrichHTML(s.aspect?.description) : "",
    };

    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/relic-card.hbs", { rl });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content,
    });
  }

  /**
   * Invoke a relic's Gambit (p.114: once per combat — twice for Sleipnir /
   * Tower of Barbs Aspect). Counts the use on the relic item for the current
   * combat, posts the gambit text to chat; the Rigoletto Aspect also arms
   * "sure evasion" for this round (defenses.mjs).
   */
  static async #onInvokeGambit(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const g = gambitInvokes(this.document).find(x => x.itemId === item.id);
    if (!g) { ui.notifications.warn(`"${item.name}" has no Invoke (Gambit) in its unlocked ranks.`); return; }
    if (!g.canInvoke) { ui.notifications.warn(`${g.relic}: the gambit was already used this combat (${g.used}/${g.maxUses}).`); return; }
    const combat = game.combat?.started ? game.combat : null;
    _log(`invokeGambit — "${g.relic}" | combat: ${combat?.id ?? "none"} | used: ${g.used}/${g.maxUses}`);
    if (combat) await item.setFlag("icon-system", "gambitUses", { combatId: combat.id, count: g.used + 1 });
    if (g.relic.trim().toLowerCase() === "rigoletto" && combat) {
      await this.document.setFlag("icon-system", "sureEvasion", { combatId: combat.id, round: combat.round });
    }
    const used = combat ? `${g.used + 1}/${g.maxUses} used this combat` : "outside combat — not counted";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content: `<div class="icon-chat-card icon-chat-card--relic">
        <div class="icon-chat-card__header">
          <strong class="icon-chat-card__action">✦ Invoke (Gambit) — ${escapeHTML(g.relic)} ${escapeHTML(g.rankLabel)}</strong>
          <span class="icon-badge icon-badge--invoke">${escapeHTML(used)}</span>
        </div>
        <div class="icon-chat-card__desc">${escapeHTML(g.text)}</div>
        ${g.notes.length ? `<p class="icon-chat-relic__note">${g.notes.map(escapeHTML).join(" · ")}</p>` : ""}
        ${g.relic.trim().toLowerCase() === "rigoletto" ? `<p class="icon-chat-relic__note">Evasion is automatically successful for ${escapeHTML(this.document.name)} this round.</p>` : ""}
      </div>`,
    });
    this.render({ parts: ["relics"] });
  }

  /** Post a bond-power card to chat. */
  static async #onBondPowerShowInChat(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    _log(`bondPowerShowInChat — "${item.name}"`);

    const s = item.system ?? {};
    const bp = {
      name:            item.name,
      bondName:        s.bondName ?? "",
      isGambit:        !!s.isGambit,
      effortCost:      s.effortCost ?? 0,
      limitPerSession: s.limitPerSession ?? 0,
      description:     await enrichHTML(s.description),
    };

    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/bond-power-card.hbs", { bp });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content,
    });
  }

  /**
   * Click a per-session use pip on a bond power. Pips are 0-based; a pip at
   * idx is "used" when idx < usedThisSession. Clicking a used pip clears down
   * to it; clicking an empty pip fills up through it. Clamped to [0, limit].
   */
  static async #onToggleBondPowerUse(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const s     = item.system ?? {};
    const limit = s.limitPerSession ?? 0;
    if (limit <= 0) return;
    const used  = Math.min(s.usedThisSession ?? 0, limit);
    const idx   = Number(target.dataset.index);
    const newVal = idx < used ? idx : idx + 1;
    const clamped = Math.max(0, Math.min(newVal, limit));
    _log(`toggleBondPowerUse — "${item.name}" | idx: ${idx} | ${used} → ${clamped}`);
    await item.update({ "system.usedThisSession": clamped });
  }

  /** Reset per-session use counters on all bond powers (start of a new session). */
  static async #onResetSessionPowers(event, target) {
    const updates = this.document.items
      .filter(i => i.type === "bond-power" && (i.system?.usedThisSession ?? 0) > 0)
      .map(i => ({ _id: i.id, "system.usedThisSession": 0 }));
    _log(`resetSessionPowers — actor: "${this.document.name}" | cleared ${updates.length} power(s)`);
    if (updates.length) await this.document.updateEmbeddedDocuments("Item", updates);
    ui.notifications?.info(`${this.document.name}: per-session powers reset for new session.`);
  }

  /** Post the Bond's misc text (special ability, second wind, ideals, gambit,
   *  description) to chat. */
  static async #onBondShowInChat(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId)
      ?? this.document.items.find(i => i.type === "bond");
    if (!item) return;
    _log(`bondShowInChat — "${item.name}"`);

    const s = item.system ?? {};
    const bond = {
      name:           item.name,
      effortMax:      s.effortMax ?? 0,
      primaryActions: (Array.isArray(s.primaryActions) ? s.primaryActions : []).filter(Boolean),
      ideals:         (Array.isArray(s.ideals) ? s.ideals : []).filter(Boolean),
      secondWindTrigger: s.secondWindTrigger ?? "",
      special:        await enrichHTML(s.specialAbility ?? ""),
      gambit:         await enrichHTML(s.gambitPower ?? ""),
      description:    await enrichHTML(s.description ?? ""),
    };

    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/bond-card.hbs", { bond });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content,
    });
  }

  /**
   * Take (or drop) the stance this ability grants. One stance at a time
   * (p.103), more with Martial Master / Byrax / the extra stances on the sheet
   * (IconActor.stanceMax): a new stance joins the others until the maximum,
   * then replaces the oldest; pressing the button again drops it. Writing
   * `system.combat.stance` is enough — IconActor keeps the token marker in step.
   */
  static async #onAbilityStance(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const list = IconActor.stancesOf(this.document);
    const { max } = IconActor.stanceMax(this.document);
    let next, dropped = [];
    if (list.includes(item.name)) next = list.filter(n => n !== item.name);
    else {
      next = [...list, item.name];
      while (next.length > max) dropped.push(next.shift());
    }
    _log(`abilityStance — "${item.name}" | [${list.join(", ")}] → [${next.join(", ")}] (max ${max})`);
    await this.document.update({ "system.combat.stance": IconActor.joinStances(next) });
    if (dropped.length) {
      const limit = max === 1 ? "one stance at a time, p.103" : `${max} stances at most`;
      ui.notifications.info(`${this.document.name}: "${dropped.join(", ")}" dropped for "${item.name}" (${limit}).`);
    }
  }

  /**
   * Mark the targeted token with this ability (marks.mjs). Exactly one
   * token must be targeted; the mark's text is the ability's "Mark:" block.
   * `data-combo` = the combo version's own mark (Rot → Regenerate).
   */
  static async #onAbilityMark(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const targets = Array.from(game.user?.targets ?? []).filter(t => t.actor);
    if (targets.length !== 1) { ui.notifications.warn("Target exactly one token to mark it (hover it and press T)."); return; }
    // The ability's range, as the "On a character" chip checks it (follow-marks.mjs): beyond it, asked first.
    if (!(await markRangeConfirmed(this.document, { name: item.name, item }, targets[0]))) return;
    // data-combo="1": the combo's own mark (Regenerate); "alt": the mastery's alternate combo (Regrowth).
    const altMark   = target.dataset.combo === "alt";
    const comboMark = altMark ? _altComboMark(item.system) : target.dataset.combo === "1" ? _comboMark(item.system) : null;
    if (comboMark) {
      _log(`abilityMark — "${item.name}" combo "${comboMark.name}" on ${targets[0].name}`);
      await applyMark({ source: this.document, target: targets[0].actor, abilityKey: `${item.id}:${altMark ? "combo-alt" : "combo"}`,
        abilityName: `${item.name} (${comboMark.name})`, text: comboMark.text, stackText: comboMark.stackText });
      return;
    }
    const sections = parseAbilitySections(item.system.description).sections;
    // No "Mark:" block, but a talent / mastery makes the space a mark (Polaris Talent I, Party Favor's Amico):
    // its own sentence, as the "On a character" chip writes it (follow-marks.mjs), not the whole ability text.
    const oc = characterSpecOf(item)?.onCharacter;
    const text = sections.find(sec => /\bMark$/i.test(sec.label))?.text
      ?? (oc?.mark ? `${oc.source ? `${oc.source}: ` : ""}${oc.rule}` : null)
      ?? sections.map(sec => `${sec.label}: ${sec.text}`).join(" ");
    _log(`abilityMark — "${item.name}" on ${targets[0].name}`);
    const multi = markFromTags(resolveAbilityTags(item.system, { comboMode: this._comboArmed(item) })).multi;
    await applyMark({ source: this.document, target: targets[0].actor, abilityKey: item.id, abilityName: item.name, text, multi });
  }

  /**
   * Track the targeted token with this ability: a reminder that isn't a mark
   * (Grand Banishment, The Tower — marks.mjs applyMark `track`). Its text is
   * the ability's own rules text; one tracker per ability.
   */
  static async #onAbilityTrack(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const targets = Array.from(game.user?.targets ?? []).filter(t => t.actor);
    if (targets.length !== 1) { ui.notifications.warn("Target exactly one token to track it (hover it and press T)."); return; }
    // The Tower keeps "At the end of that foe's turn…" in its Area Effect field, not in the description.
    const s = item.system;
    const text = [
      ...parseAbilitySections(s.description).sections.map(sec => `${sec.label}: ${sec.text}`),
      ...[["Hit", s.hitEffect], ["Area Effect", s.areaEffect]].filter(([, t]) => typeof t === "string" && t.trim()).map(([l, t]) => `${l}: ${t}`),
    ].join(" ");
    _log(`abilityTrack — "${item.name}" on ${targets[0].name}`);
    await applyMark({ source: this.document, target: targets[0].actor, abilityKey: `${item.id}:track`, abilityName: item.name, text, track: true });
  }

  /** ✕ on a mark chip (ability panel) or in the Conditions tab list. */
  static async #onRemoveMark(event, target) {
    event.stopPropagation();
    if (target.dataset.effectUuid) await removeMark(target.dataset.effectUuid);
  }

  /**
   * Place the ability's Blast / Line / Arc / Burst on the map and target
   * the tokens inside it (area-templates.mjs). Replaces this actor's previous
   * template for the same ability.
   */
  /** Is this ability's area a terrain effect, kept past the next turn? (area-templates.mjs areaLasts) */
  #areaLasts(ab, area = null) {
    // R33c: an area whose own sentence is a terrain effect lasts (Morrigan's Dark Wing, p.171). The rest lasts
    // when the ability's own text is one — not because a talent or the mastery makes something else a terrain
    // effect (Land Waster's Ajax boulder, Bio's Magnabio cloud: their Burst 1 / Small Blast attack used to stay).
    if (area?.terrain) return true;
    const s = this.document.items.get(ab.id)?.system ?? {};
    return areaLasts(ab.tags, baseAreaText(s));
  }

  /**
   * What a placed area of this ability carries (R33c): lasting, the terrain its spaces are (dangerous, difficult,
   * what entering sets off: the area's own block, else the ability's "Terrain effect:" block), and how many may
   * stay at once (Gust's NORTHSOUL "no more than three", Mist Strider's "second cloud").
   */
  #areaPlacementOpts(ab, area) {
    const s = this.document.items.get(ab.id)?.system ?? {};
    const lasting = this.#areaLasts(ab, area);
    // With MJÖLLNIR (p.227) the area is an Arc 5, and so is the Talent II extension.
    const extension = area?.kind === "line" || area?.kind === "arc" ? this.#lineExtension(ab, s) : null;
    const allPits = this.#areaOnAllPits(ab, s, area);
    if (!lasting || area?.kind === "aura") return { lasting, extension, allPits };
    const base = area?.terrain ?? terrainBlockOf(s.description) ?? { kind: "area", name: "", label: "Terrain", rules: "" };
    // R33c2: what the area does to the characters inside it (blinded+, cover, stealth on exiting…), offered at movement.
    const inside = insideEffectsOf([...activeAreaTexts(s), ["", base.rules ?? ""]]);
    const terrain = inside.length ? { ...base, inside } : base;
    const stack = areaStackLimit(activeAreaTexts(s));
    // R33c2: Ätherwand Talent I extends the old area instead of replacing it; HELLERWIND may make it impassable.
    const extendsOld = areaExtendsOld(activeAreaTexts(s));
    const impassable = impassableAlternative(activeAreaTexts(s));
    return { lasting, terrain, extension, allPits, stack: stack?.max ?? 1, stackRule: stack ? `${stack.source ? `${stack.source}: ` : ""}${stack.rule}` : "",
      ...(extendsOld ? { extendsOld } : {}), ...(impassable ? { impassable } : {}) };
  }

  /**
   * DULCE PURGATORIO (Pandaemonium's mastery, p.178): "Pandaemonium's area effect … extend[s] to all pits on the
   * battlefield": with the mastery unlocked the ability's own area (not the armed combo's, Purgatorio, nor the
   * pits' blasts) also takes every pit space on the scene (Edoardo's ruling, 17 October 2026).
   */
  #areaOnAllPits(ab, s, area) {
    if (!ab.hasMastery || ab.comboArmed || !area || area.kind === "aura" || area.centeredOn === "pits" || area.centeredOn === "plants") return false;
    const text = String(s.mastery ?? "").replace(/<[^>]+>/g, " ").replace(/’/g, "'").replace(/\s+/g, " ").toLowerCase();
    const at = text.indexOf(`${String(ab.name ?? "").toLowerCase()}'s area effect`);
    return at >= 0 && /^[^.]*\ball pits on the battlefield\b/.test(text.slice(at));
  }

  /**
   * R47b: the second line an upgrade the character has adds to the ability's line (Sturmreiten Talent II,
   * p.227: "extend Sturmreiten's area by another line 3 area, drawn in a different direction").
   */
  #lineExtension(ab, s) {
    for (const [has, text, source] of [[ab.hasTalent1, s.talent1, "Talent I"], [ab.hasTalent2, s.talent2, "Talent II"], [ab.hasMastery, s.mastery, "Mastery"]]) {
      const ext = has ? lineExtensionInText(text) : null;
      if (ext) return { ...ext, source };
    }
    return null;
  }

  /**
   * The texts an aura's duration is read from (area-templates.mjs auraExpiry),
   * in the order they win: the armed combo replaces the base text, then the
   * base effect, then the upgrades the character has (Dervish Talent I: "a
   * swirling aura 1 … until the start of your next turn").
   */
  #auraText(ab) {
    const s = this._comboSystem(this.document.items.get(ab.id));
    return [
      ab.hasCombo && ab.comboArmed ? s.comboEffect : "",
      s.description, s.effect, s.areaEffect, s.hitEffect,
      ab.hasTalent1 ? s.talent1 : "", ab.hasTalent2 ? s.talent2 : "", ab.hasMastery ? s.mastery : "",
    ].filter(v => typeof v === "string" && v).join("\n");
  }

  /**
   * The areas this ability can be placed with (the area button and the attack roll share
   * the list, so both offer the same choice).
   */
  _areaVariantsFor(ab) {
    // Base area from the tags + the shapes the combo / charge / unlocked
    // upgrade texts describe ("Area becomes Arc 4", "Charge: Large Blast")
    const s = this._comboSystem(this.document.items.get(ab.id));
    // A talent / mastery / combo whose tags change the area (Draken Cross
    // Talent II: Medium Blast, range 5) still lets the base area be placed:
    // the book's upgrade is often conditional ("Charge: … may be increased"),
    // and then the base area is the default.
    const baseArea = areaFromTags(s.tags ?? []);
    const tagArea  = areaFromTags(ab.tags);
    // A bare "aura" tag is the same aura once its size is read from the text
    // (resolveAbilityTags): Endless Battlement offers Aura 1, not also "Base: Aura".
    const sameAura = baseArea?.kind === "aura" && tagArea?.kind === "aura" && (!baseArea.size || baseArea.size === tagArea.size);
    const changed  = !!(baseArea && tagArea && !sameAura && (baseArea.label !== tagArea.label || baseArea.range !== tagArea.range));
    const upgraded = changed ? ab.tags.find(t => t.upgraded && areaFromTags([t])) ?? ab.tags.find(t => t.upgraded) : null;
    const tagSource = changed ? (/^From ([^:]+):/.exec(upgraded?.tooltip ?? "")?.[1] ?? "Upgrade") : "";
    const sourceText = { "Talent I": s.talent1, "Talent II": s.talent2, "Mastery": s.mastery, "Combo": s.comboEffect }[tagSource] ?? "";
    const conditional = /^\s*(?:charge|heroic|exceed|collide|comeback|finishing blow)\s*:/i.test(String(sourceText).replace(/<[^>]+>/g, ""));
    // The armed Infuse version can change the shape ("CRYOTIC — Change area
    // to Line 8", "BIOTIC — increase blast size to medium blast") or size it
    // by the Aether spent (Magnarime p.233 "Arc 4, plus one per aether
    // infused"; Ätherwand p.226 "Extend the area by 1 space for every Aether
    // infused, up to a maximum of +3"). It is offered first.
    const spent = armedInfusion(this.document)?.spent ?? 0;
    const ownArea = abilityArea(ab.tags, s.description);
    if (ownArea && !ownArea.range) ownArea.range = rangeFromTags(ab.tags);
    const lead = (ab.infusions ?? []).filter(i => i.armed).flatMap(i =>
      infusedAreas(i.text, spent, ownArea).map(area => ({ source: i.cost === null ? `${i.costLabel} (${spent} Aether)` : i.costLabel, area })));
    // A mastery that is a bigger infusion (MAGNARIME: Infuse X — … becomes
    // Arc 4) only changes the area while that infusion is armed (lead above).
    const masteryIsInfusion = masteryInfusion({ ...s, masteryUnlocked: true }).length > 0;
    const variants = areaVariants({
      tags: ab.tags,
      tagSource,
      lead,
      alt: changed ? [{ source: "Base", area: baseArea }] : [],
      altFirst: conditional,
      // The auras the texts give: Phantom Bolts "as an Aura 2 instead" (p.158),
      // Fulminate's marked character and its talents' Aura 3 / Aura 1 (p.226),
      // Rook's Heroic "increase aura to Aura 2", Rampant Nail's spike (p.227).
      auras: true,
      texts: [
        // Only when the header has no area: the shape is in the prose instead
        // ("The area is a medium blast terrain effect", p.233).
        areaFromTags(ab.tags) ? null : ["Text", s.description],
        // The combo's shapes only while the combo version is in play (its tags
        // are then already ab.tags): Flying Sleeves offers Arc 4 / Arc 8, the
        // base Death Blossom just its Burst 1.
        ab.hasCombo && ab.comboArmed ? ["Combo", s.comboEffect] : null,
        s.chargeEffect ? ["Charge",   s.chargeEffect] : null,
        s.heroicEffect ? ["Heroic",   s.heroicEffect] : null,
        // The blocks set off by the attack (Death's Slay / Finishing Blow,
        // p.155: "explodes in a large blast area effect centered on them").
        ..._triggeredAreaTexts(s),
        ab.hasTalent1 ? ["Talent I",  s.talent1]      : null,
        ab.hasTalent2 ? ["Talent II", s.talent2]      : null,
        ab.hasMastery && !masteryIsInfusion ? ["Mastery", s.mastery] : null,
      ].filter(Boolean),
    });
    // R33a3: with an area in the tags the description isn't read above, but an area it centres on objects
    // is a second one, not the same shape again: Helix Heel (Line 3) "all objects this line passed through
    // resonate, releasing a burst 1 area effect centered on them" (p.219) offers "Burst 1 (on object)" too.
    if (areaFromTags(ab.tags)) {
      const range = rangeFromTags(ab.tags);
      for (const area of areasInText(s.description).filter(a => a.centeredOn === "object")) {
        if (!variants.some(v => v.label === area.label)) variants.push({ label: area.label, source: "Text", area: { ...area, range } });
      }
    }
    // An area the upgrade text draws from the target (Sow's Spectral Scythe,
    // p.185: "drawn from your target as the origin space") is placed next to
    // that target, whether it came from the tags or from the text.
    const fromTarget = new Set([
      ab.hasTalent1 && s.talent1, ab.hasTalent2 && s.talent2, ab.hasMastery && s.mastery, ab.comboArmed && s.comboEffect,
    ].filter(t => t && areaDrawnFromTarget(t)).flatMap(t => areasInText(t).map(a => a.label)));
    // A mastery whose area replaces every area of the ability (MJÖLLNIR, p.227: "Create an arc 5 area any time
    // you would create an area with this ability instead") is the only one offered, not a choice beside the base.
    const masteryPlain = String(s.mastery ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    if (ab.hasMastery && /\bany time you would create an area with this ability,? instead\b/i.test(masteryPlain)
        && variants.some(v => v.source === "Mastery")) {
      variants.splice(0, variants.length, ...variants.filter(v => v.source === "Mastery"));
    }
    return variants.map(v => {
      const area = { ...v.area };
      if (fromTarget.has(v.label)) area.fromTarget = true;
      // A triggered block's area comes after the attack, never as its area (the attack roll leaves it out).
      if (_isTriggeredSource(v.source)) area.afterAttack = true;
      return { ...v, area };
    });
  }

  static async #onAbilityPlaceArea(event, target) {
    event.stopPropagation();
    const ab = await this._getAbilityDetail(target.dataset.itemId);
    if (!ab) return;
    const variants = this._areaVariantsFor(ab);
    if (!variants.length) { ui.notifications.warn(`"${ab.name}" has no Blast / Line / Arc / Burst / Aura tag.`); return; }
    const area = await chooseAreaVariant(variants, ab.name);
    if (!area) return;
    _log(`abilityPlaceArea — "${ab.name}" | ${area.label}`);
    const opts = this.#areaPlacementOpts(ab, area);
    // R33c2: HELLERWIND (p.226) "You can create a powerful gale instead": asked; the gale is impassable, never
    // extended (Talent I) nor moved (Talent II, area-motion.mjs reads `impassable` on the terrain flag).
    if (opts.impassable && opts.terrain) {
      const alt = opts.impassable;
      let pick = null;
      try {
        pick = await foundry.applications.api.DialogV2.wait({
          window: { title: `${ab.name} — ${alt.source || "Mastery"}` },
          content: `<p><small>${foundry.utils.escapeHTML(alt.rule)}</small></p>`,
          buttons: [{ action: "normal", label: ab.name, default: true }, { action: "alt", label: alt.name.replace(/^\w/, c => c.toUpperCase()) }],
          rejectClose: false,
        });
      } catch { pick = null; }
      if (!pick) return;
      if (pick === "alt") {
        const name = alt.name.replace(/^\w/, c => c.toUpperCase());
        opts.terrain = { ...opts.terrain, name, impassable: true, label: `${name} · Impassable`,
          rules: `${opts.terrain.rules ?? ""} ${alt.rule} Impassable (p.89): provides obstruction and cover, and blocks line of sight.`.trim() };
        delete opts.extendsOld;
      }
    }
    delete opts.impassable;
    const placed = await placeAreaTemplate({ actor: this.document, area, abilityName: ab.name, abilityKey: ab.id, text: this.#auraText(ab), ...opts });
    // R33c: Tsunami's edge, the moves and growth it has (area-motion.mjs).
    // (Not the pits' blasts, R49: an area effect that is gone once resolved.)
    if (placed?.template && opts.lasting && area.centeredOn !== "pits" && area.centeredOn !== "plants") await afterAreaPlaced(placed.template, this.document, this.document.items.get(ab.id));
  }

  /**
   * Terrain space chip (R33b): click the spaces the ability / trait marks on the map
   * ("Pit · 2", "Mote · 4", "Area +2"). Right-click on the chip removes them (_onRender).
   */
  static async #onPlaceTerrainSpaces(event, target) {
    event.stopPropagation();
    _log(`placeTerrainSpaces — item ${target.dataset.itemId} #${target.dataset.terrainIndex}`);
    await placeTerrainFromChip(this.document, target.dataset.itemId, target.dataset.terrainIndex);
  }

  /**
   * Place the aura a trait gives its owner (p.102): Shieldmaster "You have
   * aura 1" (p.121), Pelagic Rage "You gain aura 2". It follows the token and
   * its duration, if the text gives one, is read as for the abilities' auras.
   */
  static async #onTraitPlaceArea(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const text = item.system?.description ?? "";
    const area = areaFromTags([traitAuraTag(text)]);
    if (!area) { ui.notifications.warn(`"${item.name}" gives no aura.`); return; }
    _log(`traitPlaceArea — "${item.name}" | ${area.label}`);
    await placeAreaTemplate({ actor: this.document, area, abilityName: item.name, abilityKey: item.id, lasting: true, text });
  }

  /**
   * Prompt for boons/curses/defense, then roll the attack via combatRoll.
   * - If the ability isn't an attack → warn and stop.
   * - If the ability has an area pattern → place it (or reuse the one already
   *   on the map) and target the tokens inside before anything else.
   * - If it's an auto-hit → skip the d20 and post a "Auto-hit" chat notice,
   *   then hand off to the damage roll.
   */
  static async #onAbilityAttackRoll(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId;
    if (!(await this._pickCombo(this.document.items.get(itemId)))) return;
    await startInfusionStep(this.document, itemId, INFUSE_STEP.attack);
    const ab = await this._getAbilityDetail(itemId);
    if (!ab) return;
    _log(`abilityAttackRoll — "${ab.name}" | isAttack: ${ab.isAttack} | autoHit: ${ab.isAutoHit}`);

    if (!ab.isAttack) {
      ui.notifications.warn(`"${ab.name}" is not an attack ability — it doesn't require an attack roll.`);
      return;
    }

    // Comet: "While this object is active, you cannot attack" (R33a2) — ask before rolling.
    const forbidding = objectsForbiddingAttacks(this.document);
    if (forbidding.length) {
      const names = forbidding.map(t => mapObjectFlag(t)?.name ?? t.name).join(", ");
      const go = await foundry.applications.api.DialogV2.confirm({
        window: { title: `${ab.name} — you cannot attack` },
        content: `<p>Your <strong>${escapeHTML(names)}</strong> is on the map: while this object is active, you cannot attack. Pick it up first (open the object, Pick up).</p><p>Roll the attack anyway?</p>`,
        yes: { label: "Roll anyway" }, no: { label: "Cancel", default: true }, rejectClose: false,
      });
      if (!go) return;
    }

    // Area attack: Blast / Line / Arc / Burst on the map first, targets from it.
    // Cancelling the placement (Escape / right click) no longer kills the roll:
    // the attack is rolled without an area, so the d20 can be thrown before —
    // or without — putting the arc down. Cancel the dialog to call it off.
    // No area on the map yet for this ability: the same choice as the area button (base
    // area, talent / combo / charge shapes) instead of always the tags' one.
    let areaChoice;
    // An extra area drawn from the target (Sow's Spectral Scythe, p.185) is
    // not the attack's area: the attack keeps its target and the area goes
    // down with the area button. Placing it here retargeted the area instead.
    const allVariants = this._areaVariantsFor(ab);
    // The same for an area set off after the attack (Death's Slay, p.155) or centred on a character,
    // and the pits' blasts inside the attack's area (R49: Holy Talent I, PURGATORIO, p.177).
    const notTheAttack = (a) => a?.fromTarget || a?.afterAttack || a?.centeredOn === "target" || a?.centeredOn === "object" || a?.centeredOn === "pits" || a?.centeredOn === "plants" || a?.centeredOn === "spike";
    const attackVariants = allVariants.filter(v => v.area?.kind !== "aura" && !notTheAttack(v.area));
    const noAttackArea = !attackVariants.length && allVariants.some(v => notTheAttack(v.area));
    if (canvas?.ready && this.document.getActiveTokens().length && !findAreaTemplates({ actorId: this.document.id, abilityKey: ab.id }).length) {
      if (attackVariants.length > 1) {
        areaChoice = await chooseAreaVariant(attackVariants, ab.name);
        if (!areaChoice) return;   // closing the "which area?" dialog calls the attack off
      }
    }
    const areaOpts = this.#areaPlacementOpts(ab, areaChoice ?? areaFromTags(ab.tags));
    const placement = noAttackArea ? undefined : await ensureAreaTargets({ actor: this.document, tags: ab.tags, abilityName: ab.name, abilityKey: ab.id, lasting: areaOpts.lasting, terrain: areaOpts.terrain ?? null, extension: areaOpts.extension ?? null, allPits: !!areaOpts.allPits, area: areaChoice });
    if (placement === null) ui.notifications.info(`${ab.name}: area not placed — rolling the attack only.`);

    // Relic integration: "Invoke (Attack, N+)" checks on the raw d20 and the
    // relic reminders that apply to this attack (round-gated ones only when
    // the round is reached).
    const relicInvokes = attackInvokes(this.document);
    const relicNotes   = abilityRelicReminders(this.document, ab.relicProfile, { forAttackCard: true });

    // Combo armed (token held, or spent on this ability via Show in Chat): the
    // combo text replaces the normal one on the card and for the statuses, and
    // ab.tags / ab.isAutoHit already come from the combo version (_getAbilityDetail).
    const comboArmed = ab.comboArmed;
    const statusEntries = abilityStatusEntries(this._comboSystem(this.document.items.get(itemId)), { comboMode: comboArmed, sourceName: this.document.name });

    // The unlocked talent's lines, for the auto-hit card and the attack card alike.
    const talentName = ab.hasTalent1 ? "Talent I" : ab.hasTalent2 ? "Talent II" : "";
    const talentBlocks = [];
    {
      const sys = this.document.items.get(itemId)?.system ?? {};
      for (const tb of talentName ? talentAttackBlocks(ab.hasTalent1 ? sys.talent1 : sys.talent2) : [])
        talentBlocks.push({ ...tb, text: await this._enrichAbility(tb.text) });
    }

    if (ab.isAutoHit) {
      // Auto-hit: no d20 roll, just announce and (optionally) chain into damage.
      // With an attack invoke, p.245 says to roll 1d20 anyway just to check it.
      // Area on the table with several characters in it: one of them is the
      // attack target (p.97) — the token in a Blast / Burst's central space,
      // otherwise asked — so its row gets the attack part, the rest the area.
      let attackTargetId = "";
      const inCard = captureTargets();
      if (placement?.area && inCard.length > 1) {
        attackTargetId = attackSpaceTokenId(placement);
        if (!attackTargetId || !inCard.some(t => t.tokenId === attackTargetId)) {
          attackTargetId = await promptAttackTarget(ab, this.document, { areaLabel: placement.area.label ?? "" });
          if (attackTargetId === null) return;   // closing the dialog calls the attack off
        }
        rememberAttackTarget(this.document, ab, attackTargetId);
      }
      const autoAreaHtml = placement ? areaSummaryHtml(placement, { attackTargetId }) : "";
      await noteInfusionStep(this.document, itemId, INFUSE_STEP.attack);
      let invokeHtml = "";
      const rolls = [];
      if (relicInvokes.length) {
        const d20r = await new Roll("1d20").evaluate();
        rolls.push(d20r);
        invokeHtml = relicInvokeHtml(relicInvokes, d20r.total, { autoHit: true });
      }
      // The talent applies here too (Death's Slay, Sow's Comeback). Without an attack
      // roll there is no Exceed (total 15+, p.95), no crit and no miss: those lines are left out.
      const talentHtml = talentBlocks.filter(tb => !["exceed", "crit", "miss"].includes(tb.key)).map(tb => `
                    <div class="icon-chat-card__effect-block">
                      <span class="icon-chat-card__effect-label">${escapeHTML(tb.label ? `${tb.label} (${talentName})` : talentName)}</span>
                      <span class="icon-chat-card__effect-text">${tb.text}</span>
                    </div>`).join("");
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.document }),
        content: `<div class="icon-chat-card icon-chat-card--autohit">
                    <div class="icon-chat-card__header">
                      <strong>${escapeHTML(ab.name)}</strong>
                      <span class="icon-badge icon-badge--primary">Auto-hit</span>
                    </div>
                    ${autoAreaHtml}
                    <p>This attack ignores the attack roll and goes directly to damage.</p>
                    ${talentHtml}
                    ${invokeHtml}
                    ${relicNotesHtml(relicNotes)}
                    ${statusBlockHtml(statusEntries, { source: this.document, abilityName: ab.name, outcome: { isHit: true, isCrit: false, isExceed: false }, targets: inCard, attackTargetId })}
                  </div>`,
        rolls,
        // Who was targeted: the "when targeted" interrupt buttons (damage-interrupts.mjs, R35).
        flags: { "icon-system": { attack: attackFlags({ actor: this.document, abilityName: ab.name,
          targets: attackTargetId ? inCard.filter(t => t.tokenId === attackTargetId) : inCard }) } },
      });
      // Chain into damage if the ability deals damage
      if (ab.dealsDamage) {
        await IconSheet.#onAbilityDamageRoll.call(this, event, target);
      }
      return;
    }

    // What triggers the exceed whatever the total: the mastery (BLOOD FESTIVAL p.192, BURIAL FIST p.194),
    // the ability's own text (Open the Gates p.194), the traits (Pulverize, Aether Shot) and relics (Arenheir II).
    const abilityItem = this.document.items.get(itemId);
    const forced = exceedTriggers(this.document, abilityItem, { comboArmed: !!ab.comboArmed });
    const mods = await promptAttackMods(ab, this.document, { area: placement?.area ?? null, exceedTriggers: forced });
    if (!mods) return;
    await noteInfusionStep(this.document, itemId, INFUSE_STEP.attack);
    // "The first time you use Matsuri in a combat": any use counts, taken or not.
    if (forced.some(e => e.firstUse)) await noteFirstUseThisCombat(this.document, abilityItem);

    // With an area on the table the extra tokens only take the area effect:
    // the d20 (and the Evasion roll) is for the attack target picked in the dialog.
    const rollTargets = mods.attackTargetId
      ? currentTargets().filter(t => t.tokenId === mods.attackTargetId)
      : null;
    const areaLine = placement ? areaSummaryHtml(placement, { attackTargetId: mods.attackTargetId }) : "";

    // Combo version: the card is built from the ability with the combo merged
    // in, like Show in Chat — Hit / Miss / Exceed / Crit take the combo's
    // wording where it rewrites them (Devil Hand's Exceed is "Repeat the
    // effect", not God Hand's vigor), and the combo's own lines ("+1 boon",
    // its Effect blocks) are listed above them instead of being poured, whole,
    // into the Hit box.
    let card = { hit: ab.hitEffect, miss: ab.missEffect, exceed: ab.exceedEffect, crit: ab.critEffect, effects: [] };
    if (comboArmed) {
      const sys = this._comboSystem(this.document.items.get(itemId));
      const blocks = await buildAbilityBlocks(sys, {
        sections: parseAbilitySections(sys.description).sections, enrich: t => this._enrichAbility(t), comboText: sys.comboEffect ?? "" });
      const keysOf = (b) => String(b.key ?? "").split("+");
      const field = (k) => blocks.find(b => keysOf(b).includes(k))?.text ?? "";
      card = {
        hit: field("hit"), miss: field("miss"), exceed: field("exceed"), crit: field("crit"),
        effects: blocks.filter(b => b.combo && !keysOf(b).some(k => ["hit", "miss", "exceed", "crit"].includes(k)))
                       .map(b => ({ label: b.label, text: b.text })),
      };
    }
    // Armed Infuse version (p.117): the card reads it like an ability — its
    // own Hit / Miss take the base's place (MAGNABIO: "Hit: 2[D]+fray"), its
    // other lines are listed above them. A complete version drops the base
    // Exceed / Crit too; the talents still apply ("Benefits from Bio talents").
    const infused = !comboArmed ? (ab.infusions ?? []).find(i => i.armed && !i.standalone) : null;
    if (infused) {
      const parts = infuseVersionParts(infused.text);
      const enrich = t => this._enrichAbility(t);
      if (parts.whole) { card.exceed = ""; card.crit = ""; }
      const tag = `${infused.costLabel}${parts.name ? `: ${parts.name}` : ""}`;
      if (parts.lead) card.effects.push({ label: tag, text: await enrich(parts.lead), infuse: true });
      for (const b of parts.blocks) {
        if (b.label === "Hit" || b.label === "Miss") card[b.label.toLowerCase()] = await enrich(b.text);
        else card.effects.push({ label: `${b.label} (${parts.name || infused.costLabel})`, text: await enrich(b.text), infuse: true });
      }
      // Blocks the book writes after the version belong to it (PRIMAL BURST's Collide, p.221).
      for (const b of splitInfuseBlocks(ab.blocks, { armed: infused.label }).groups.find(g => g.label === infused.label)?.extra ?? [])
        card.effects.push({ label: `${b.label} (${parts.name || infused.costLabel})`, text: b.text, infuse: true });
      if (parts.tail) card.effects.push({ label: tag, text: escapeHTML(parts.tail), infuse: true });
    }

    // The unlocked talent applies to every version of the ability (God Hand,
    // p.192: "All versions of this ability gain Exceed: …"), so the base card
    // and the combo card both carry it: a Hit / Miss / Exceed / Crit it grants
    // joins that box (shown or dimmed with the outcome), anything else
    // ("Increase teleports to 2", "Slay: …") gets a block of its own.
    const talentEffects = [];
    for (const tb of talentBlocks) {
      if (["hit", "miss", "exceed", "crit"].includes(tb.key)) {
        const line = `<strong>${talentName}:</strong> ${tb.text}`;
        card[tb.key] = card[tb.key] ? `${card[tb.key]}<br>${line}` : line;
      } else {
        talentEffects.push({ label: tb.label ? `${tb.label} (${talentName})` : talentName, text: tb.text });
      }
    }
    // A mastery that takes the place of the Collide (IZUNA DROP, Gigaton Whip p.137: "Instead of the
    // normal collide effect, on collide you can do the legendary Izuna drop") goes on the card, saying so.
    {
      const sys = abilityItem?.system ?? {};
      const plain = String(sys.mastery ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (sys.masteryUnlocked && /\binstead of the normal collide effect\b/i.test(plain)) {
        const name = /^([A-Z][A-Za-z' -]*[A-Za-z])\s*:/.exec(plain)?.[1] ?? "Mastery";
        talentEffects.push({ label: `Collide — ${name} (Mastery, replaces the normal collide)`, text: await this._enrichAbility(sys.mastery, { leadName: true }) });
      }
    }

    await combatRoll({
      abilityName:  comboArmed ? comboTitle(ab.name, this._comboSystem(this.document.items.get(itemId)).comboEffect)
                  : infused?.name ? `${ab.name} — ${infused.name}` : ab.name,
      costLabel:    ab.cost,
      // `ab.tags` is an array of {raw, label, tooltip} — combatRoll expects plain strings
      tags:         ab.tags.map(t => t.label ?? t.raw ?? ""),
      boons:        mods.boons,
      curses:       mods.curses,
      defense:      mods.defense,
      critAt:      mods.critAt,
      exceedAt:      mods.exceedAt,
      forceExceed:  mods.forceExceed,
      hitEffect:    card.hit,
      missEffect:   card.miss,
      exceedEffect: card.exceed,
      critEffect:   card.crit,
      effects:      card.effects,
      talentEffects,
      areaHtml:     areaLine,
      relicInvokes,
      relicNotes,
      statusEntries,
      targets:      rollTargets?.length ? rollTargets : null,
      evasionOverride: mods.evasion,
      actor:        this.document,
    });
  }

  /**
   * Prompt for outcome (hit/crit/miss/area) and modifiers, then call
   * damageRoll using the parsed formula from the ability's text.
   * (Target Armor is no longer entered here — it is subtracted automatically
   * when the defender presses "Apply Damage", from their own armor value.)
   * - dice multiplier comes from parsed "[D]" / "2[D]" / "3[D]"
   * - fray included only if the ability's text mentions "fray"
   * - flat damage used for "N damage" abilities (overrides dice)
   */
  static async #onAbilityDamageRoll(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId;
    if (!(await this._pickCombo(this.document.items.get(itemId)))) return;
    // A damage roll after the damage of an infused use is the next use (p.204),
    // unless the dialog's "Reroll (same use)" says it is the same one rolled again.
    const repeat  = infusionStepRepeats(this.document, itemId, INFUSE_STEP.damage);
    const infused = await this._getAbilityDetail(itemId);
    if (!infused) return;
    const base    = repeat ? await this._getAbilityDetail(itemId, { noInfusion: true }) : null;
    let sameUse   = repeat && _addsDamage(infused.parsed, base.parsed);
    let ab        = repeat && !sameUse ? base : infused;
    const combat = this.document.system.combat;
    _log(`abilityDamageRoll — "${ab.name}" | parsed:`, ab.parsed, "| parsedCombo:", ab.parsedCombo);

    if (!ab.dealsDamage && !ab.parsedCombo?.dealsDamage && !ab.parsed?.extras?.length) {
      ui.notifications.warn(`"${ab.name}" does not deal damage.`);
      return;
    }

    // Default the "combo version" choice from combo state: token still held,
    // or already spent on this very ability via Show in Chat.
    const comboToken   = (combat.classResources?.comboToken?.value ?? 0) === 1;
    const comboSpentOn = this.document.getFlag("icon-system", "comboSpentOnItem");
    const comboDefault = !!ab.parsedCombo && (comboToken || comboSpentOn === itemId);

    let mods;
    for (;;) {
      mods = await promptDamageMods(repeat ? { ...ab, reroll: { sameUse } } : ab, combat, { comboDefault, actor: this.document, prev: mods });
      if (!mods) return;
      if (!repeat || !mods.rerollSwitch) break;
      // The chip was flipped: the dialog opens again on the other version.
      sameUse = !!mods.sameUse;
      ab = sameUse ? infused : base;
    }
    if (repeat && !sameUse) await startInfusionStep(this.document, itemId, INFUSE_STEP.damage);
    // The area button still reads the version afterwards, until the next use or the end of the turn.
    await noteInfusionStep(this.document, itemId, INFUSE_STEP.damage);

    const useCombo = !!(mods.useCombo && ab.parsedCombo);
    // Read before the flags go: the card title names the combo chosen for this use.
    const comboText = this._comboSystem(this.document.items.get(itemId)).comboEffect;
    if (comboSpentOn === itemId) {
      await this.document.update({ "flags.icon-system.-=comboSpentOnItem": null, "flags.icon-system.-=comboChoice": null });
    }

    await postAbilityDamageCard(this.document, {
      parsed:      useCombo ? ab.parsedCombo : ab.parsed,
      outcome:     mods.outcome,
      damagedie:   combat.damagedie,
      fray:        combat.fray,
      // The armed Infuse version names the roll ("Bio — MAGNABIO").
      abilityName: useCombo ? comboTitle(ab.name, comboText)
                 : ab.parsed?.version?.name ? `${ab.name} — ${ab.parsed.version.name}` : ab.name,
      bonusDice:   mods.bonusDice,
      vulnerable:  mods.vulnerable,
      resistance:  mods.resistance,
      weakened:    mods.weakened,
      hatred:      mods.hatred,
      flatBonus:   mods.flatBonus,
      pierce:      mods.pierce,
      divine:      mods.divine,
      trueStrike:  mods.trueStrike,
      unerring:    mods.unerring,
      targetName:  mods.targetName,
      targetIds:   mods.targetIds,
      attackTargetId: mods.attackTargetId,
      other:       mods.other,
      instances:   mods.instances,
    });

    _log(`abilityDamageRoll — "${ab.name}" | outcome: ${mods.outcome} | combo: ${useCombo}`);
  }


  /* -------------------------------------------------- */
  /*  Basic actions (p.85)                               */
  /* -------------------------------------------------- */

  /**
   * Synthetic ability detail for the two basic attacks, shaped like
   * _getAbilityDetail output so the shared attack/damage dialogs work.
   * Light: 1 action, [D] + fray. Heavy: 2 actions, 2[D] + fray. Miss: fray.
   */
  /** Basic attack range of the actor's primary job class (0 if unknown). */
  static #basicAttackRange(actor) {
    const jobs    = actor.system.combat?.jobs ?? [];
    const primary = jobs.find(j => j.primary) ?? jobs[0];
    const cls     = (primary?.class ?? "").toLowerCase();
    return CLASS_INFO[cls]?.basicAttackRange ?? 0;
  }

  static #basicAttackDetail(heavy, range = 0) {
    return {
      name:  heavy ? "Heavy Attack" : "Light Attack",
      cost:  heavy ? "2 actions" : "1 action",
      // Basic attack range is a CLASS statistic (Stalwart 3 / Vagabond 4 /
      // Mendicant 5 / Wright 6) — surfaced as a tag so the chat card and the
      // attack dialog remind the table of it.
      tags:  range ? [{ raw: `range-${range}`, label: `Range ${range}` }] : [],
      isAttack:    true,
      isAutoHit:   false,
      dealsDamage: true,
      parsed: {
        isAttack: true, isAutoHit: false, dealsDamage: true,
        hit:  { mult: heavy ? 2 : 1, fray: true, flat: 0 },
        miss: { mult: 0, fray: true, flat: 0 },
        area: { mult: 0, fray: false, flat: 0 },
      },
      parsedCombo: null,
      hitEffect:  heavy ? "2[D] + fray" : "[D] + fray",
      missEffect: "Fray damage.",
    };
  }

  static async #onBasicAttackRoll(event, target) {
    event.stopPropagation();
    const heavy = target.dataset.heavy === "true";
    const ab = IconSheet.#basicAttackDetail(heavy, IconSheet.#basicAttackRange(this.document));
    _log(`basicAttackRoll — "${ab.name}"`);
    const mods = await promptAttackMods(ab, this.document);
    if (!mods) return;
    // Basic attacks are attacks too: relic invokes and attack reminders apply.
    const profile = buildAbilityProfile({ cost: "1action" }, { tags: ab.tags.map(t => t.raw ?? ""), isAttack: true, dealsDamage: true });
    await combatRoll({
      abilityName: ab.name,
      costLabel:   ab.cost,
      tags:        ab.tags.map(t => t.label),
      boons:       mods.boons,
      curses:      mods.curses,
      defense:     mods.defense,
      critAt:     mods.critAt,
      exceedAt:     mods.exceedAt,
      // "[D] + fray" read with the character's die ("d10 + fray"), like ability cards
      hitEffect:   await this._enrichAbility(ab.hitEffect),
      missEffect:  ab.missEffect,
      relicInvokes: attackInvokes(this.document),
      evasionOverride: mods.evasion,
      relicNotes:   abilityRelicReminders(this.document, profile, { forAttackCard: true }),
      actor:       this.document,
    });
  }

  /**
   * Damage Utility (Combat tab bottom): the damage dialog with no ability
   * behind it — only the free "Other" panel (dice of the character's [D],
   * fixed amount, fray, area, source label) plus the usual modifiers, types
   * and instances. The card and Apply are the ability ones.
   */
  static async #onDamageUtility(event, target) {
    event.stopPropagation();
    const combat = this.document.system.combat;
    const none = { mult: 0, fray: false, flat: 0 };
    const ab = {
      name: "Damage Utility", tags: [], parsedCombo: null,
      parsed: { hit: { ...none }, miss: { ...none }, area: { ...none }, extras: [] },
    };
    const mods = await promptDamageMods(ab, combat, { actor: this.document, free: true });
    if (!mods) return;
    const o = mods.other ?? {};
    if (!(o.mult > 0 || o.flat > 0 || o.fray || mods.bonusDice > 0 || mods.flatBonus > 0)) {
      ui.notifications.info("Damage Utility: no damage entered.");
      return;
    }
    _log("damageUtility —", mods);
    await postAbilityDamageCard(this.document, {
      parsed:      ab.parsed,
      outcome:     mods.outcome,
      damagedie:   combat.damagedie,
      fray:        combat.fray,
      abilityName: ab.name,
      bonusDice:   mods.bonusDice,
      vulnerable:  mods.vulnerable,
      resistance:  mods.resistance,
      weakened:    mods.weakened,
      hatred:      mods.hatred,
      flatBonus:   mods.flatBonus,
      pierce:      mods.pierce,
      divine:      mods.divine,
      trueStrike:  mods.trueStrike,
      unerring:    mods.unerring,
      targetName:  mods.targetName,
      targetIds:   mods.targetIds,
      attackTargetId: mods.attackTargetId,
      other:       mods.other,
      instances:   mods.instances,
    });
  }

  static async #onBasicDamageRoll(event, target) {
    event.stopPropagation();
    const heavy = target.dataset.heavy === "true";
    const ab = IconSheet.#basicAttackDetail(heavy, IconSheet.#basicAttackRange(this.document));
    const combat = this.document.system.combat;
    _log(`basicDamageRoll — "${ab.name}"`);
    const mods = await promptDamageMods(ab, combat, { actor: this.document });
    if (!mods) return;
    await postAbilityDamageCard(this.document, {
      parsed:      ab.parsed,
      outcome:     mods.outcome,
      damagedie:   combat.damagedie,
      fray:        combat.fray,
      abilityName: ab.name,
      bonusDice:   mods.bonusDice,
      vulnerable:  mods.vulnerable,
      resistance:  mods.resistance,
      weakened:    mods.weakened,
      hatred:      mods.hatred,
      flatBonus:   mods.flatBonus,
      pierce:      mods.pierce,
      divine:      mods.divine,
      trueStrike:  mods.trueStrike,
      unerring:    mods.unerring,
      targetName:  mods.targetName,
      targetIds:   mods.targetIds,
      attackTargetId: mods.attackTargetId,
      other:       mods.other,
      instances:   mods.instances,
    });
  }

  /** Recover (2 actions): +4 Vigor (surge if bloodied) + chat card. Status
   *  saves stay manual — use the sheet's save button per status. */
  static async #onBasicRecover(event, target) {
    event.stopPropagation();
    _log(`basicRecover — actor: "${this.document.name}"`);
    await recoverAction(this.document);
  }

  /**
   * Toggle the hidden preview panel for an equipped ability. Shows the
   * panel matching `itemId`, hides all others. Clicking the same slot again
   * collapses the panel.
   */
  #toggleAbilityPreview(html, itemId) {
    const panels = html.querySelectorAll(".icon-ability-preview");
    let alreadyShown = false;
    panels.forEach(p => {
      if (p.dataset.abilityId === itemId) alreadyShown = !p.hidden;
    });
    panels.forEach(p => {
      if (alreadyShown) {
        p.hidden = true;
      } else {
        p.hidden = p.dataset.abilityId !== itemId;
      }
    });
    _log(`toggleAbilityPreview — itemId: "${itemId}" | ${alreadyShown ? "hiding" : "showing"}`);
  }

  /** Delete an embedded trait item from the actor (click × on a trait card). */
  static async #onRemoveTraitItem(event, target) {
    const itemId = target.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (!item) { _log(`removeTraitItem — BLOCKED: no item with id "${itemId}"`); return; }
    _log(`removeTraitItem — actor: "${this.document.name}" | deleting trait: "${item.name}" (${itemId})`);
    await this.document.deleteEmbeddedDocuments("Item", [itemId]);
  }

  /**
   * Switch which job is primary for this expedition. Removes the old primary's
   * traits and limit-break items (matched by jobName), loads the new primary's
   * job template, copies its base stats to combat.*, and embeds its traits +
   * limit break. Falls back to searching the compendium by jobName if the
   * target job has no stored templateUuid (legacy actors).
   */
  static async #onSetPrimaryJob(event, target) {
    event.stopPropagation();
    const idx   = Number(target.dataset.index);
    const actor = this.document;
    const jobs  = foundry.utils.deepClone(actor.system.combat.jobs ?? []);
    const newPrimary = jobs[idx];
    if (!newPrimary) { _log(`setPrimaryJob — BLOCKED: no job at index ${idx}`); return; }
    if (newPrimary.primary) { ui.notifications.info(`"${newPrimary.name}" is already the primary job.`); return; }

    _log(`setPrimaryJob — switching to "${newPrimary.name}" (idx ${idx})`);

    const oldPrimary = jobs.find(j => j.primary);

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window:  { title: "Switch Primary Job" },
      content: `<p>Set <strong>${escapeHTML(newPrimary.name)}</strong> as the primary job?</p>
                ${oldPrimary ? `<p class="notes">The current primary <strong>${escapeHTML(oldPrimary.name)}</strong>'s traits and Limit Break will be <strong>removed</strong> from the sheet. Their base stats will be replaced with ${escapeHTML(newPrimary.name)}'s stats (HP will be reset to the new max).</p>` : ""}
                <p class="notes">Your equipped abilities are kept as-is.</p>`,
      modal: true,
    });
    if (!confirmed) { _log(`setPrimaryJob — cancelled`); return; }

    // 1. Resolve the new primary's job template (via stored uuid or compendium fallback)
    const newTemplate = await IconSheet.#resolveJobTemplate(newPrimary);
    if (!newTemplate) {
      ui.notifications.error(`Could not find job template for "${newPrimary.name}". Drop it from the Jobs compendium first, then try again.`);
      return;
    }
    const tplSys = newTemplate.system ?? {};
    const bs = tplSys.baseStats ?? {};

    // 2. Find and delete the old primary's embedded traits + LB (by jobName)
    //    AND any class-level traits from the old class. Class traits have
    //    source="class" and no jobName, so they survive the per-job filter.
    const toDelete = [];
    if (oldPrimary) {
      for (const it of actor.items) {
        if (it.type === "trait" && it.system?.source === "job" &&
            (it.system?.jobName ?? "").toLowerCase() === (oldPrimary.name ?? "").toLowerCase()) {
          toDelete.push(it.id);
        }
        if (it.type === "limit-break" &&
            (it.system?.jobName ?? "").toLowerCase() === (oldPrimary.name ?? "").toLowerCase()) {
          toDelete.push(it.id);
        }
      }
    }
    // Always sweep stale class traits AND gambit traits regardless of
    // oldPrimary (covers actors that may have accumulated them from multiple
    // sources). Both are rebuilt below from the new primary + secondary jobs.
    for (const it of actor.items) {
      if (it.type === "trait" &&
          (it.system?.source === "class" || it.system?.source === "gambit")) {
        toDelete.push(it.id);
      }
    }
    if (toDelete.length) {
      _log(`setPrimaryJob — deleting ${toDelete.length} old items (traits+LB+class traits+gambits)`);
      await actor.deleteEmbeddedDocuments("Item", toDelete);
    }

    // 3. Update jobs array: swap primary flag
    for (const j of jobs) j.primary = false;
    jobs[idx].primary = true;
    // Store/refresh the templateUuid on the target entry while we're here
    if (!jobs[idx].templateUuid && newTemplate.uuid) jobs[idx].templateUuid = newTemplate.uuid;

    // 4. Copy new primary's base stats to the actor
    const vit = bs.vit ?? actor.system.combat.vit;
    const hpMax = vit * 4;
    const updates = {
      "system.combat.jobs":      jobs,
      "system.combat.vit":       vit,
      "system.combat.defense":   bs.defense   ?? actor.system.combat.defense,
      "system.combat.speed":     bs.speed     ?? actor.system.combat.speed,
      "system.combat.fray":      bs.fray      ?? actor.system.combat.fray,
      "system.combat.damagedie": bs.damagedie ?? actor.system.combat.damagedie,
      "system.combat.armor":     bs.armor     ?? actor.system.combat.armor,
      "system.combat.hp.max":    hpMax,
      "system.combat.hp.value":  hpMax,
      "system.combat.vigor.max": vit,
    };
    _log(`setPrimaryJob — applying ${newPrimary.name} stats: vit=${vit} def=${bs.defense} spd=${bs.speed}`);
    await actor.update(updates);

    // 5. Embed the new primary's traits + LB + class traits
    const toCreate = [...buildClassTraitDocs(newPrimary.class ?? "stalwart")];
    if (Array.isArray(tplSys.traits)) {
      for (const t of tplSys.traits) {
        if (!t?.name && !t?.description) continue;
        toCreate.push({
          type: "trait",
          name: t.name || `${newPrimary.name} trait`,
          system: {
            jobName:     newPrimary.name,
            class:       newPrimary.class ?? "stalwart",
            source:      "job",
            passive:     true,
            chapter:     Number(t.chapter) || 1,
            description: t.description ?? "",
          },
        });
      }
    }
    if (tplSys.limitBreak?.name) {
      toCreate.push({
        type: "limit-break",
        name: tplSys.limitBreak.name,
        system: {
          jobName:     newPrimary.name,
          class:       newPrimary.class ?? "stalwart",
          resolveCost: tplSys.limitBreak.resolveCost ?? 2,
          cost:        tplSys.limitBreak.cost ?? "1action",
          effect:      tplSys.limitBreak.effect ?? "",
          ultimate:    tplSys.limitBreak.ultimate ?? "",
        },
      });
    } else {
      // Fallback: search the jobs compendium for a standalone LB matching jobName
      const lbItem = await IconSheet.#findLimitBreakForJob(newPrimary.name);
      if (lbItem) {
        _log(`setPrimaryJob — using compendium LB "${lbItem.name}" for job "${newPrimary.name}"`);
        const lbObj = lbItem.toObject();
        lbObj.system = lbObj.system ?? {};
        lbObj.system.jobName = newPrimary.name;
        lbObj.system.class   = newPrimary.class ?? "stalwart";
        toCreate.push(lbObj);
      }
    }
    // Rebuild gambits: for each secondary job whose class differs from the
    // new primary, embed its class gambit. Deduped by class.
    const newPrimaryClass = newPrimary.class ?? "stalwart";
    const secondaryClasses = new Set(
      jobs.filter(j => !j.primary && j.class && j.class !== newPrimaryClass)
          .map(j => j.class),
    );
    for (const cls of secondaryClasses) {
      const gambitDoc = buildClassGambitDoc(cls);
      if (gambitDoc) toCreate.push(gambitDoc);
    }

    if (toCreate.length) {
      _log(`setPrimaryJob — embedding ${toCreate.length} new-primary items (traits+LB+gambits)`);
      await fillJobTraitPowerDice(toCreate);
      await actor.createEmbeddedDocuments("Item", toCreate);
    }

    ui.notifications.info(`Primary job switched to "${newPrimary.name}".`);
  }

  /**
   * Look up a job template Item document for a job entry. Tries the stored
   * templateUuid first, then falls back to searching the `icon-system.jobs`
   * compendium for a job-template with a matching jobName.
   */
  static async #resolveJobTemplate(jobEntry) {
    if (jobEntry.templateUuid) {
      try {
        const doc = await fromUuid(jobEntry.templateUuid);
        if (doc && doc.type === "job-template") return doc;
      } catch (err) {
        _log(`resolveJobTemplate — uuid lookup failed: ${err.message}`);
      }
    }
    const pack = game.packs.get("icon-system.jobs");
    if (!pack) return null;
    const all = await pack.getDocuments();
    const target = (jobEntry.name ?? "").trim().toLowerCase();
    return all.find(d =>
      d.type === "job-template" &&
      ((d.system?.jobName ?? "").trim().toLowerCase() === target ||
        d.name.trim().toLowerCase().startsWith(target))
    ) ?? null;
  }

  /**
   * Generic remove handler — deletes any embedded item on the actor by id.
   * Used by the × buttons on bond-power, ability, and relic cards.
   * Pass `data-item-id` on the clicked button.
   */
  static async #onRemoveItem(event, target) {
    event.stopPropagation(); // don't trigger click handlers on parent cards/slots
    const itemId = target.dataset.itemId;
    if (!itemId) { _log(`removeItem — BLOCKED: no data-item-id on target`); return; }
    const item = this.document.items.get(itemId);
    if (!item) { _log(`removeItem — BLOCKED: no item with id "${itemId}"`); return; }

    _log(`removeItem — actor: "${this.document.name}" | deleting "${item.name}" (${item.type}) (${itemId})`);

    // If the item is currently equipped in an ability slot, clear that slot
    // reference too so we don't leave a dangling id in combat.equippedAbilities.
    if (item.type === "ability") {
      const equipped = foundry.utils.deepClone(this.document.system.combat.equippedAbilities ?? []);
      const idx = equipped.indexOf(itemId);
      if (idx >= 0) {
        equipped[idx] = null;
        await this.document.update({ "system.combat.equippedAbilities": equipped });
        _log(`removeItem — cleared equipped slot ${idx}`);
      }
    }

    // Removing the bond: also clear the cached name string so other systems
    // (LevelUp, CharacterCreation) see the character as bond-less.
    if (item.type === "bond") {
      await this.document.update({ "system.narrative.bond": "" });
    }

    await this.document.deleteEmbeddedDocuments("Item", [itemId]);
  }

  /**
   * Damage of the limit break (effect, and the ultimate from chapter 3, p.113),
   * with the armed Infuse version of it, if any (Tetraflare: "twice instead").
   */
  static #limitBreakDamage(actor, lb, { noInfusion = false } = {}) {
    const armed = noInfusion ? null : armedInfusion(actor);
    return parseLimitBreakDamage(lb.system, {
      ultimate: (actor.system.combat?.chapter ?? 1) >= 3,
      infused:  armed?.itemId === lb.id ? armed.label : null,
    });
  }

  /** The limit break's Infuse versions, ready for the panel (the Ultimate's from chapter 3). */
  static #limitBreakInfusionList(actor, lb) {
    const ultimate = (actor.system.combat?.chapter ?? 1) >= 3;
    return infusionsOf(limitBreakInfusions(lb.system, { ultimate }), actor, lb.id);
  }

  /**
   * Infuse the limit break: spend the Aether and arm that version (p.117), as
   * an ability's Infuse button does. Pressing the armed one again gives the
   * Aether back. "Use Limit Break" then posts that version's text and pays its
   * resolve (Meteor: "6 resolve"), and the Damage Roll uses its damage.
   */
  static async #onLimitBreakInfuse(event, target) {
    event?.stopPropagation?.();
    const lb = this.document.items.find(i => i.type === "limit-break");
    if (!lb) return;
    const label = target.dataset.label ?? "";
    const armed = armedInfusion(this.document);
    if (armed && armed.itemId === lb.id && armed.label === label) {
      const undone = await cancelInfusion(this.document);
      ui.notifications.info(undone === "used" ? `${lb.name}: infusion already used, the Aether stays spent.` : `${lb.name}: infusion cancelled, Aether returned.`);
      return;
    }
    const infusion = IconSheet.#limitBreakInfusionList(this.document, lb).find(i => i.label === label);
    if (!infusion) return;
    // Only one infuse effect at a time: a different one is refunded first.
    if (armed) await cancelInfusion(this.document);
    _log(`limitBreakInfuse — "${lb.name}" | ${infusion.label} ${infusion.name}`);
    await armInfusion(this.document, lb, infusion);
  }

  /**
   * Damage Roll of the limit break: the ability damage dialog and card, with
   * the limit break's text read like an ability's (Gigaflare p.208: "[D]+fray
   * divine damage"; Passage to the Afterlife p.190: "[D]+fray, three times").
   * Spending the resolve stays on "Use Limit Break".
   */
  static async #onLimitBreakDamageRoll(event, target) {
    event?.stopPropagation?.();
    const lb = this.document.items.find(i => i.type === "limit-break");
    if (!lb) return ui.notifications.warn("No Limit Break equipped.");
    // As an ability's: a second Damage Roll is the next use unless it is "Reroll (same use)".
    const repeat = infusionStepRepeats(this.document, lb.id, INFUSE_STEP.damage);
    const infused = IconSheet.#limitBreakDamage(this.document, lb);
    const baseParsed = repeat ? IconSheet.#limitBreakDamage(this.document, lb, { noInfusion: true }) : null;
    let sameUse = repeat && _addsDamage(infused, baseParsed);
    let parsed = repeat && !sameUse ? baseParsed : infused;
    _log(`limitBreakDamageRoll — "${lb.name}" | parsed:`, parsed);
    if (!parsed.dealsDamage) return ui.notifications.warn(`"${lb.name}" does not deal damage.`);
    const combat = this.document.system.combat;
    const abOf = (p) => ({
      // The armed Infuse version names the roll ("Gigaflare — TETRAFLARE").
      name: p.version?.name ? `${lb.name} — ${p.version.name}` : lb.name,
      cost: abilityCostLabel(lb.system.cost ?? ""),
      tags: resolveAbilityTags(lb.system), parsed: p, parsedCombo: null,
      isAttack: p.isAttack, isAutoHit: p.isAutoHit, dealsDamage: true,
    });
    let mods;
    for (;;) {
      mods = await promptDamageMods(repeat ? { ...abOf(parsed), reroll: { sameUse } } : abOf(parsed), combat, { actor: this.document, prev: mods });
      if (!mods) return;
      if (!repeat || !mods.rerollSwitch) break;
      sameUse = !!mods.sameUse;
      parsed = sameUse ? infused : baseParsed;
    }
    if (repeat && !sameUse) await startInfusionStep(this.document, lb.id, INFUSE_STEP.damage);
    const name = abOf(parsed).name;
    await noteInfusionStep(this.document, lb.id, INFUSE_STEP.damage);
    await postAbilityDamageCard(this.document, {
      parsed,
      outcome:     mods.outcome,
      damagedie:   combat.damagedie,
      fray:        combat.fray,
      abilityName: name,
      bonusDice:   mods.bonusDice,
      vulnerable:  mods.vulnerable,
      resistance:  mods.resistance,
      weakened:    mods.weakened,
      hatred:      mods.hatred,
      flatBonus:   mods.flatBonus,
      pierce:      mods.pierce,
      divine:      mods.divine,
      trueStrike:  mods.trueStrike,
      unerring:    mods.unerring,
      targetName:  mods.targetName,
      targetIds:   mods.targetIds,
      attackTargetId: mods.attackTargetId,
      other:       mods.other,
      instances:   mods.instances,
    });
  }

  /**
   * "% Max HP" of the limit break: the share of each targeted character's max
   * BASE hp (p.106: "always considers maximum base hp, and not max hp based on
   * wounds"), picked per target (failed / successful save, distance on the
   * line), with the Legend rule of the text (Gigantas Crusher p.135: they may
   * always save, divine fray on a success, 25% on a failure; Split Heaven and
   * Hell p.127: always 25%). Dealt through applyDamageToActor; divine (p.104)
   * ignores armor, halving and vigor. Shares round up (p.86).
   */
  static async #onLimitBreakPercentDamage(event, target) {
    event?.stopPropagation?.();
    const lb = this.document.items.find(i => i.type === "limit-break");
    if (!lb) return ui.notifications.warn("No Limit Break equipped.");
    const combat = this.document.system.combat;
    const pct = parseLimitBreakPercent(lb.system, { ultimate: (combat?.chapter ?? 1) >= 3 });
    if (!pct) return ui.notifications.warn(`"${lb.name}" deals no share of max hp.`);
    const tokens = Array.from(game.user?.targets ?? []).filter(t => t.actor);
    if (!tokens.length) return ui.notifications.warn("Target the characters first (T), then press % Max HP.");
    const esc = escapeHTML;
    const baseMax = (a) => a.type === "icon"
      ? Number(a.system.combat?.hp?.baseMax ?? a.system.combat?.hp?.max ?? 0)
      : Number(a.system.hp?.max ?? 0);
    const choicesOf = (a) => (a.type === "legend" && pct.legend) ? pct.legend : pct.options;
    const fray = Number(combat?.fray ?? 0) || 0;
    const optLabel = (o, max) => o.fray
      ? `${o.label}: divine fray (${fray})${o.note ? `, ${o.note}` : ""}`
      : `${o.label}: ${o.pct}% → ${Math.ceil(max * o.pct / 100)}`;
    // Distance bands ("1 space / 2-4 spaces / 5+ spaces", Split Heaven and Hell p.127: "depending on their
    // distance on the line from you"): measured on this limit break's line on the map, from the user's token,
    // and preselected; the select stays free to change.
    const band = (label) => {
      const m = /^(\d+)\s*(?:[-–]\s*(\d+)|(\+))?\s*spaces?$/i.exec(String(label ?? "").trim());
      return m ? { lo: Number(m[1]), hi: m[3] ? Infinity : Number(m[2] ?? m[1]) } : null;
    };
    const banded = pct.options.length > 1 && pct.options.every(o => band(o.label));
    const line = banded ? findAreaTemplates({ actorId: this.document.id, abilityKey: lb.id })
      .filter(t => t.flags?.["icon-system"]?.area?.kind === "line")
      .sort((a, b) => (b._stats?.createdTime ?? 0) - (a._stats?.createdTime ?? 0))[0] : null;
    const userDoc = line ? (canvas.tokens?.get(line.flags["icon-system"].tokenId)?.document ?? sourceTokenFor(this.document)?.document) : null;
    const rows = tokens.map((t, i) => {
      const a = t.actor, max = baseMax(a);
      const choices = choicesOf(a);
      const dist = line && userDoc && choices === pct.options ? distanceInArea(line, t.document, userDoc) : null;
      const pick = dist === null ? -1 : choices.findIndex(o => { const b = band(o.label); return b && dist >= b.lo && dist <= b.hi; });
      const opts = choices.map((o, j) => `<option value="${j}"${j === pick ? " selected" : ""}>${esc(optLabel(o, max))}</option>`).join("");
      const where = !line || choices !== pct.options ? "" : dist === null ? " <small>· not on the line</small>" : ` <small>· ${dist} on the line</small>`;
      return `<div style="display:flex; gap:6px; align-items:center">
          <span style="flex:1"><strong>${esc(t.name ?? a.name)}</strong>${a.type === "legend" ? " (Legend)" : ""} <small>max base hp ${max}</small>${where}</span>
          <select name="t${i}">${opts}</select></div>`;
    }).join("");
    // Atomos Crusher (Ultimate): +25% to non-legends while the user is at 1 hp or lower.
    const bonus = pct.bonus;
    const lowHp = Number(combat?.hp?.value ?? 99) <= 1;
    const bonusHtml = bonus
      ? `<label><input type="checkbox" name="bonus" ${!bonus.lowHp || lowHp ? "checked" : ""}>
           ${esc(bonus.name)}: +${bonus.pct}% of max hp${bonus.nonLegend ? " to non-legends" : ""}${bonus.lowHp ? " (you're at 1 hp or lower)" : ""}</label>`
      : "";
    const content = `<div class="icon-lb-percent" style="display:flex; flex-direction:column; gap:6px; padding:4px 0">
        ${rows}${bonusHtml}
        <p style="margin:0; opacity:.75"><small>Of the max <em>base</em> hp, not reduced by wounds (p.106); rounded up.${pct.divine ? " Divine: no armor, halving or vigor (p.104)." : ""}</small></p>
      </div>`;
    let picked;
    try {
      picked = await foundry.applications.api.DialogV2.prompt({
        window: { title: `${lb.name} — % Max HP` },
        content,
        ok: {
          label: "Apply",
          callback: (_e, button) => ({
            rows: tokens.map((_t, i) => Number(button.form.elements[`t${i}`]?.value) || 0),
            bonus: !!button.form.elements.bonus?.checked,
          }),
        },
        rejectClose: false,
      });
    } catch { picked = null; }
    if (!picked) return;
    const lines = [], hits = [];
    let refund = false;
    for (const [i, t] of tokens.entries()) {
      const a = t.actor, max = baseMax(a);
      const o = choicesOf(a)[picked.rows[i]] ?? choicesOf(a)[0];
      if (o.note && /refund/i.test(o.note)) refund = true;
      const extra = (o.fray || !picked.bonus || !bonus || (bonus.nonLegend && a.type === "legend")) ? 0 : bonus.pct;
      const share = o.fray ? 0 : o.pct + extra;
      const amount = o.fray ? fray : Math.ceil(max * share / 100);
      _log(`limitBreakPercentDamage — "${lb.name}" → "${a.name}" | ${o.label} | ${o.fray ? "fray" : `${share}% of ${max}`} = ${amount}`);
      lines.push(`<li><strong>${esc(t.name ?? a.name)}</strong> — ${esc(o.label)}: <strong>${amount}</strong>${pct.divine ? " divine" : ""} damage
        <small>(${o.fray ? "fray" : `${share}% of ${max} max base hp`}${o.note ? `; ${esc(o.note)}` : ""})</small></li>`);
      hits.push([a, amount]);
    }
    // A Legend's successful save refunds the resolve cost (Gigantas Crusher
    // p.135): once per use, to the pools it was paid from (the party share
    // syncs to the other PCs through the updateActor hook of IconCombat).
    let refundHtml = "";
    if (refund) {
      const spend = this.document.getFlag("icon-system", "limitBreakSpend");
      if (spend?.lbId === lb.id && (spend.party || spend.personal)) {
        const res = this.document.system.combat.resolve;
        await this.document.update({
          "system.combat.resolve.party":    res.party    + (spend.party ?? 0),
          "system.combat.resolve.personal": res.personal + (spend.personal ?? 0),
          "flags.icon-system.-=limitBreakSpend": null,
        });
        const back = [spend.personal ? `${spend.personal} personal` : "", spend.party ? `${spend.party} party` : ""].filter(Boolean).join(" + ");
        _log(`limitBreakPercentDamage — refund: ${back}`);
        refundHtml = `<p style="margin:4px 0 0"><i class="fa-solid fa-rotate-left"></i> Resolve cost refunded: ${esc(back)} (a Legend saved).</p>`;
      } else {
        ui.notifications.warn(`No recorded resolve spend for "${lb.name}" (already refunded, or used before this version): refund it by hand.`);
      }
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content: `<div class="icon-chat-card"><strong>${esc(lb.name)}</strong> — % of max hp<ul style="margin:4px 0 0">${lines.join("")}</ul>${refundHtml}</div>`,
    });
    for (const [a, amount] of hits) {
      await applyDamageToActor(a, amount, { applyArmor: !pct.divine, ignoreVigor: pct.divine, chatConfirm: true });
    }
  }

  /** The limit break's rules texts: the effect, and the ultimate from chapter 3 (p.113). */
  static #limitBreakTexts(actor, lb) {
    const s = lb.system ?? {};
    return { effect: s.effect ?? "", ultimate: (actor.system.combat?.chapter ?? 1) >= 3 ? (s.ultimate ?? "") : "" };
  }

  /**
   * The areas a limit break can be placed with, read like an ability's: the
   * tags (Death Sentence "Line 4", Elemental and High Prophecy "Aura 2"), a
   * bare "aura" tag sized from the text (Paradiso p.155: "You gain Aura 2"),
   * then the shapes the effect / ultimate name (Cataclysm's medium blast
   * explosions, Split Heaven and Hell's "line 5 area effect").
   */
  static #limitBreakAreas(actor, lb) {
    const { effect, ultimate } = IconSheet.#limitBreakTexts(actor, lb);
    const tags = resolveAbilityTags({ ...lb.system, description: effect });
    const variants = areaVariants({
      tags,
      texts: [["Effect", effect], ultimate ? ["Ultimate", ultimate] : null].filter(Boolean),
    });
    const plain = String(effect).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    // A line the text gives no length is placed as a Line whose length is
    // asked (Curtain Call: "draw a line area effect of that many spaces +2").
    if (!variants.some(v => v.area.kind === "line") && /\bline area\b/i.test(plain)) {
      const area = { kind: "line", size: 0, range: 0 };
      area.label = areaLabel(area);
      variants.push({ label: area.label, source: "", area });
    }
    // Its width, when the text gives one (Cataclysm: "a line area 3 spaces wide").
    const width = Number(/\bline area (\d+) spaces? wide\b/i.exec(plain)?.[1] ?? 0);
    // With no range of its own, an area the text spreads over the battlefield
    // goes anywhere on it (Cataclysm: "from one side of the battlefield to the
    // next", explosions centred on the objects in it), not next to the user.
    const anywhere = /\bbattlefield\b/i.test(plain);
    return variants.map(v => {
      const area = { ...v.area };
      if (width > 1 && area.kind === "line" && !(area.width > 1)) area.width = width;
      if (anywhere && area.kind !== "aura" && !area.range) area.range = Infinity;
      area.label = areaLabel(area);
      return { ...v, label: area.label, area };
    });
  }

  /** Place the limit break's aura or area on the map, as the abilities' area button does. */
  static async #onLimitBreakPlaceArea(event, target) {
    event?.stopPropagation?.();
    const lb = this.document.items.find(i => i.type === "limit-break");
    if (!lb) return ui.notifications.warn("No Limit Break equipped.");
    const variants = IconSheet.#limitBreakAreas(this.document, lb);
    if (!variants.length) return ui.notifications.warn(`"${lb.name}" has no Blast / Line / Arc / Burst / Aura.`);
    const area = await chooseAreaVariant(variants, lb.name);
    if (!area) return;
    const { effect, ultimate } = IconSheet.#limitBreakTexts(this.document, lb);
    const text = [effect, ultimate].filter(Boolean).join(" ");
    _log(`limitBreakPlaceArea — "${lb.name}" | ${area.label}`);
    await placeAreaTemplate({
      actor: this.document, area, abilityName: lb.name, abilityKey: lb.id,
      lasting: areaLasts(lb.system.tags ?? [], text), text,
    });
  }

  static async #onUseLimitBreak(event, target) {
    const lb = this.document.items.find(i => i.type === "limit-break");
    if (!lb) { _log(`useLimitBreak — BLOCKED: no limit-break item`); return ui.notifications.warn("No Limit Break equipped."); }
    // Using it again after an infused use is the base version: the Aether paid for one use (p.204).
    await startInfusionStep(this.document, lb.id, INFUSE_STEP.card);
    // The armed Infuse version of it (Tetraflare, Meteor) is the one used: its
    // text goes on the card, and its own resolve cost replaces the base one
    // (Meteor: "Infuse 8: 6 resolve").
    const infusion = IconSheet.#limitBreakInfusionList(this.document, lb).find(i => i.armed) ?? null;
    const cost    = infusion?.resolveCost ?? lb.system.resolveCost;
    const resolve = this.document.system.combat.resolve;
    const total   = resolve.personal + resolve.party;
    _log(`useLimitBreak — actor: "${this.document.name}" | lb: "${lb.name}" | cost: ${cost} | resolve: ${total} (personal: ${resolve.personal}, party: ${resolve.party})`);
    if (total < cost) { _log(`useLimitBreak — BLOCKED: not enough resolve`); return ui.notifications.warn(`Need ${cost} Resolve (have ${total}).`); }
    // p.99: "you can use any combination of party or personal resolve, but
    // party resolve is shared … used with the consent of your team members".
    // The player picks the split whenever there is one to pick; it starts on
    // personal first, since the party pool belongs to everyone.
    const minParty = Math.max(0, cost - resolve.personal);
    const maxParty = Math.min(resolve.party, cost);
    let partySpend = minParty;
    if (maxParty > minParty) {
      const content = `
        <div class="icon-lb-resolve" style="display:flex; flex-direction:column; gap:6px; padding:4px 0">
          <p style="margin:0"><strong>${escapeHTML(lb.name)}</strong> costs <strong>${cost}</strong> Resolve.
            You have <strong>${resolve.personal}</strong> personal and the party has <strong>${resolve.party}</strong>.</p>
          <label>From party resolve:
            <input type="number" name="party" value="${minParty}" min="${minParty}" max="${maxParty}" style="width:60px">
          </label>
          <p style="margin:0" data-split>From personal resolve: <strong>${cost - minParty}</strong></p>
          <p style="margin:0; opacity:.75"><small>Party resolve is shared: spend it with your team's consent (p.99).</small></p>
        </div>`;
      const id = Hooks.on("renderDialogV2", (app, html) => {
        const input = html.querySelector?.('.icon-lb-resolve input[name="party"]');
        if (!input) return;
        Hooks.off("renderDialogV2", id);
        const out = html.querySelector(".icon-lb-resolve [data-split] strong");
        input.addEventListener("input", () => {
          const p = Math.max(minParty, Math.min(maxParty, Number(input.value) || 0));
          out.textContent = String(cost - p);
        });
      });
      let picked;
      try {
        picked = await foundry.applications.api.DialogV2.prompt({
          window: { title: `Limit Break — ${lb.name}` },
          content,
          ok: {
            label: "Use Limit Break",
            callback: (_e, button) => Math.max(minParty, Math.min(maxParty, Number(button.form.elements.party?.value) || 0)),
          },
          rejectClose: false,
        });
      } catch { picked = null; }
      finally { Hooks.off("renderDialogV2", id); }
      if (picked == null) return;
      partySpend = picked;
    }
    const personalSpend = cost - partySpend;
    _log(`useLimitBreak — spend: party ${partySpend}, personal ${personalSpend}`);
    await this.document.update({
      "system.combat.resolve.party":    resolve.party    - partySpend,
      "system.combat.resolve.personal": resolve.personal - personalSpend,
      // What this use paid and from which pool, so a refund (Gigantas Crusher
      // p.135, a Legend's successful save) gives back the same amounts.
      "flags.icon-system.limitBreakSpend": { lbId: lb.id, party: partySpend, personal: personalSpend },
    });
    const speaker = ChatMessage.getSpeaker({ actor: this.document });
    const spent = [personalSpend ? `${personalSpend} personal` : "", partySpend ? `${partySpend} party` : ""].filter(Boolean).join(" + ");
    // The statuses the limit break inflicts or grants get their buttons, like an
    // ability card (Mock: slashed+, weakened+, hatred+ "until the end of their next turn").
    // From chapter 3 the Ultimate improves it (p.113): its text and statuses join the card.
    // The armed Infuse version is not added again: limitBreakInfusions reads it
    // out of the effect / ultimate text, so its statuses are already parsed there
    // (adding it twice gave the Ultimate's version a second set of buttons).
    // The versions not armed are left out: they don't trigger (p.204).
    const { ultimate } = IconSheet.#limitBreakTexts(this.document, lb);
    const armedIn = (source) => ({ armed: infusion?.source === source ? infusion.label : "" });
    const entries = parseInflictedStatuses(withoutUnarmedInfusions(lb.system.effect, armedIn("Limit Break")), { sourceName: this.document.name, label: "Effect" });
    if (ultimate) entries.push(...parseInflictedStatuses(withoutUnarmedInfusions(ultimate, armedIn("Ultimate")), { sourceName: this.document.name, label: "Ultimate" }));
    const statusHtml = statusBlockHtml(entries, { source: this.document, abilityName: lb.name });
    const ultimateHtml = ultimate
      ? `<div class="icon-limit-break__ultimate"><p class="icon-limit-break__ultimate-label"><strong>Ultimate</strong></p>${await enrichLimitBreakText(ultimate, { enrich: t => this._enrichAbility(t) })}</div>`
      : "";
    const infuseHtml = infusion
      ? `<div class="icon-chat-card__desc"><strong><i class="fa-solid fa-wand-sparkles"></i> ${escapeHTML(infusion.label)}${infusion.name ? ` — ${escapeHTML(infusion.name)}` : ""}</strong> (${escapeHTML(infusion.source)}): ${escapeHTML(infusion.name ? infusion.text.replace(/^[^—]*—\s*/, "") : infusion.text)}</div>`
      : "";
    const title = infusion?.name ? `${lb.name} — ${infusion.name}` : lb.name;
    const effectHtml = await enrichLimitBreakText(lb.system.effect, { enrich: t => this._enrichAbility(t) });
    await ChatMessage.create({ speaker, content: `<strong>${escapeHTML(this.document.name)}</strong> uses <em>${escapeHTML(title)}</em>!${spent ? ` <small>(Resolve: ${spent})</small>` : ""}<div class="icon-limit-break__effect">${effectHtml}</div>${ultimateHtml}${infuseHtml}${statusHtml}` });
    await noteInfusionStep(this.document, lb.id, INFUSE_STEP.card);
  }

  static async #onAddJob(event, target) {
    const jobs = foundry.utils.deepClone(this.document.system.combat.jobs);
    _log(`addJob — actor: "${this.document.name}" | count: ${jobs.length} → ${jobs.length + 1}`);
    jobs.push({ name: "New Job", class: "stalwart", primary: jobs.length === 0 });
    await this.document.update({ "system.combat.jobs": jobs });
  }

  static async #onRemoveJob(event, target) {
    const idx  = Number(target.dataset.index);
    const jobs = foundry.utils.deepClone(this.document.system.combat.jobs);
    _log(`removeJob — actor: "${this.document.name}" | idx: ${idx} | name: "${jobs[idx]?.name}"`);
    jobs.splice(idx, 1);
    if (jobs.length > 0 && !jobs.some(j => j.primary)) jobs[0].primary = true;
    await this.document.update({ "system.combat.jobs": jobs });
  }

  /* -------------------------------------------------- */
  /*  Class Resources (per primary job class)            */
  /* -------------------------------------------------- */

  /** Stalwart — set vigilance to the clicked pip (toggle off if same). */
  static async #onSetVigilance(event, target) {
    event?.stopPropagation?.();
    const value   = Number(target.dataset.value) || 0;
    const current = this.document.system.combat.classResources.vigilance.value ?? 0;
    const next    = (value === current) ? value - 1 : value;
    const clamped = Math.max(0, Math.min(6, next));
    _log(`setVigilance — actor: "${this.document.name}" | ${current} → ${clamped}`);
    await this.document.update({ "system.combat.classResources.vigilance.value": clamped });
  }

  /**
   * Stalwart — spend Vigilance charges. Prompts for how many charges and for
   * which of the two uses, rolls 1d6 per charge and keeps the HIGHEST (p.105,
   * p.117: "rolling 1d6 per charge spent and picking the highest result" —
   * more charges raise the odds of a 6, they don't add up), posts it to chat
   * and deducts the spent charges from the tracker.
   */
  static async #onSpendVigilance(event, target) {
    event?.stopPropagation?.();
    const actor = this.document;
    const cur   = actor.system.combat?.classResources?.vigilance?.value ?? 0;
    if (cur <= 0) {
      ui.notifications.warn("No Vigilance charges to spend.");
      return;
    }

    const content = `
      <div style="display:flex; flex-direction:column; gap:6px; padding:4px 0">
        <p style="margin:0">You have <strong>${cur}</strong> Vigilance ${cur === 1 ? "charge" : "charges"}.
          Each spent charge rolls 1d6 and you keep the <strong>highest</strong> die — the dice don't add up.</p>
        <label>Charges to spend:
          <input type="number" name="charges" value="${cur}" min="1" max="${cur}" style="width:60px">
        </label>
        <label><input type="radio" name="use" value="reduce" checked>
          An ally in range 2 is damaged by a foe's ability: reduce the damage, as if with armor</label>
        <label><input type="radio" name="use" value="punish">
          A foe breaks adjacency with you: deal that much damage to them</label>
      </div>`;

    let spend;
    try {
      spend = await foundry.applications.api.DialogV2.prompt({
        window:  { title: "Spend Vigilance" },
        content,
        ok: {
          label: "Roll",
          callback: (_e, button, dialog) => {
            const root = button?.form ?? dialog?.element ?? dialog;
            const n = Number(root.querySelector('input[name="charges"]')?.value) || 1;
            const use = root.querySelector('input[name="use"]:checked')?.value ?? "reduce";
            return { n: Math.max(1, Math.min(cur, n)), use };
          },
        },
        rejectClose: false,
      });
    } catch { return; }
    if (!spend) return;
    const { use } = spend;
    spend = spend.n;

    // kh = keep the highest die (p.105).
    const roll = await new Roll(spend > 1 ? `${spend}d6kh` : "1d6").evaluate();
    const charges = `${spend} ${spend === 1 ? "charge" : "charges"}${spend > 1 ? ", highest die" : ""}`;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor:  use === "punish"
        ? `Vigilance — ${charges}: the foe breaking adjacency takes ${roll.total} damage`
        : `Vigilance — ${charges}: reduce the ally's damage by ${roll.total} (as if with armor)`,
    });

    const next = Math.max(0, cur - spend);
    _log(`spendVigilance — actor: "${actor.name}" | spent ${spend} (rolled ${roll.total}) | ${cur} → ${next}`);
    await actor.update({ "system.combat.classResources.vigilance.value": next });
  }

  /** Stalwart — clear vigilance to 0. */
  static async #onClearVigilance(event, target) {
    _log(`clearVigilance — actor: "${this.document.name}"`);
    await this.document.update({ "system.combat.classResources.vigilance.value": 0 });
  }

  /**
   * Infuse: spend the Aether and arm this version of the ability (p.117 —
   * "triggers when Aether is spent on an ability"). Pressing the armed one
   * again gives the Aether back, for when the plan changes before the roll.
   */
  static async #onAbilityInfuse(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    const label = target.dataset.label ?? "";
    const armed = armedInfusion(this.document);
    if (armed && armed.itemId === item.id && armed.label === label) {
      const undone = await cancelInfusion(this.document);
      ui.notifications.info(undone === "used" ? `${item.name}: infusion already used, the Aether stays spent.` : `${item.name}: infusion cancelled, Aether returned.`);
      return;
    }
    const sections = parseAbilitySections(item.system?.description ?? "").sections;
    const infusion = infusionsOf([...sections, ...masteryInfusion(item.system)], this.document, item.id).find(i => i.label === label);
    if (!infusion) return;
    // A version that is its own action (Stormlash, "Free Action") has no roll
    // to wait for: spend and post it now, leaving any armed infusion alone.
    if (infusion.standalone) { await armInfusion(this.document, item, infusion, { arm: false }); return; }
    // Only one infuse effect can be up at a time (rule-tooltips: "only one
    // infuse effect can trigger at a time"), so a different one is refunded.
    if (armed) await cancelInfusion(this.document);
    await armInfusion(this.document, item, infusion);
  }

  /** Back to the class colour for this character's auras (clears the flag). */
  static async #onResetAuraColor(event, target) {
    event.stopPropagation();
    await this.document.unsetFlag("icon-system", "auraColor");
    _log(`resetAuraColor — "${this.document.name}" back to the class colour`);
  }

  /** Clear the active stance (also removes the on-token marker via _onUpdate). */
  static async #onClearStance(event, target) {
    _log(`clearStance — actor: "${this.document.name}"`);
    await this.document.update({ "system.combat.stance": "" });
  }

  /** Vagabond — toggle combo token between 0 and 1. */
  static async #onToggleComboToken(event, target) {
    const current = this.document.system.combat.classResources.comboToken.value ?? 0;
    const next    = current ? 0 : 1;
    _log(`toggleComboToken — actor: "${this.document.name}" | ${current} → ${next}`);
    // Setting the token by hand also forgets a token already spent on an
    // ability with Show in Chat: otherwise that ability stayed in its combo
    // version (tags, area) with COMBO off until a damage roll cleared it.
    await this.document.update({
      "system.combat.classResources.comboToken.value": next,
      "flags.icon-system.-=comboSpentOnItem": null,
      "flags.icon-system.-=comboChoice": null,
    });
  }

  /** Fool — set Stacked Dice held (click the last active pip to drop one). */
  static async #onSetStackedDice(event, target) {
    const sd      = this.document.system.combat.classResources.stackedDice ?? {};
    const current = sd.value ?? 0;
    const max     = Number(target.dataset.max) || 1;
    const clicked = Number(target.dataset.value) || 0;
    const next    = Math.max(0, Math.min(max, clicked === current ? clicked - 1 : clicked));
    _log(`setStackedDice — actor: "${this.document.name}" | ${current} → ${next}`);
    await this.document.update({ "system.combat.classResources.stackedDice.value": next });
  }

  /** Fool — spend one Stacked Die by hand (p.149) and say so in chat. The
   *  Gamble window spends its own die (combat/gamble.mjs), so this is only for
   *  a gamble resolved outside it. */
  static async #onUseStackedDie(event, target) {
    const current = this.document.system.combat.classResources.stackedDice?.value ?? 0;
    if (current <= 0) return;
    _log(`useStackedDie — actor: "${this.document.name}" | ${current} → ${current - 1}`);
    await this.document.update({ "system.combat.classResources.stackedDice.value": current - 1 });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content: `<p><strong>${escapeHTML(this.document.name)}</strong> uses a <strong>Stacked Die</strong>: the gamble result is <strong>6</strong> <small>(Stack Dice, p.149)</small>.</p>`,
    });
  }

  /** A trait that lets you "spend 2 Aether any time to regain" its interrupt
   *  (Aether Deflection, Spellblade p.224): pay the Aether and say so in chat.
   *  The use spent from a chat card's interrupt button is given back. */
  static async #onTraitSpendAether(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    const cost = Number(target.dataset.cost) || 0;
    if (!item || cost <= 0) return;
    const pool = this.document.system.combat.classResources.aether?.value ?? 0;
    if (pool < cost) { ui.notifications.warn(`${item.name} needs ${cost} Aether — ${this.document.name} has ${pool}.`); return; }
    _log(`traitSpendAether — "${item.name}" | Aether ${pool} → ${pool - cost}`);
    await this.document.update({ "system.combat.classResources.aether.value": pool - cost });
    // The once-per-combat use counted by the interrupt buttons of the chat cards (damage-interrupts.mjs) comes back.
    if (this.document.getFlag("icon-system", `interruptCombat.${item.id}-t`) != null)
      await this.document.unsetFlag("icon-system", `interruptCombat.${item.id}-t`);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content: `<p><strong>${escapeHTML(this.document.name)}</strong> spends <strong>${cost} Aether</strong> to regain the use of <strong>${escapeHTML(item.name)}</strong> <small>(${pool - cost} Aether left)</small>.</p>`,
    });
  }

  /** Open the sheet of a summon attached to this PC. */
  static async #onOpenSummon(event, target) {
    const summon = game.actors?.get(target.dataset.actorId);
    _log(`openSummon — id: "${target.dataset.actorId}" | found: ${!!summon}`);
    summon?.sheet.render(true);
  }

  /** Mendicant — +/- blessing tokens (clamped to ≥ 0). */
  static async #onAdjustBlessings(event, target) {
    const delta   = Number(target.dataset.delta) || 0;
    const current = this.document.system.combat.classResources.blessingTokens.value ?? 0;
    const next    = Math.max(0, current + delta);
    _log(`adjustBlessings — actor: "${this.document.name}" | ${current} → ${next}`);
    await this.document.update({ "system.combat.classResources.blessingTokens.value": next });
  }

  /**
   * Mendicant — Bless (1 action): "Grant a blessing token to a character in
   * range 4" (p.172). Pick the character (the targeted ones first, then the
   * characters on the map, then the player characters); they get one more
   * Blessed charge. Nothing is spent from this sheet: where blessings come
   * from is left to the table (Maar).
   */
  static async #onBlessCharacter(event, target) {
    event.stopPropagation();
    const me = this.document;
    const seen = new Set();
    const choices = [];
    const add = (actor, label, tag) => {
      if (!actor || seen.has(actor.uuid)) return;
      seen.add(actor.uuid);
      choices.push({ uuid: actor.uuid, label, tag });
    };
    for (const t of game.user?.targets ?? []) add(t.actor, t.name, "(targeted)");
    for (const t of canvas?.tokens?.placeables ?? []) if (t.actor && t.document.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) add(t.actor, t.name, "");
    for (const a of game.actors ?? []) if (a.type === "icon" && a.hasPlayerOwner) add(a, a.name, "");
    if (!choices.length) { ui.notifications.warn("No character to bless: target a token or add a player character."); return; }
    const options = choices.map((c, i) => `<option value="${escapeHTML(c.uuid)}"${i === 0 ? " selected" : ""}>${escapeHTML(c.label)}${c.uuid === me.uuid ? " (yourself)" : ""}${c.tag ? ` ${c.tag}` : ""}</option>`).join("");
    let uuid = null;
    try {
      uuid = await foundry.applications.api.DialogV2.prompt({
        window: { title: `Bless — ${me.name}` },
        content: `<p><strong>Bless</strong> (1 action): grant a blessing token to a character in range 4 (p.172). They can spend it for +1 boon on a save.</p>
          <label style="display:block">Character <select name="who" style="width:100%">${options}</select></label>`,
        ok: { label: "Give a blessing", icon: "fa-solid fa-hands-praying", callback: (_e, button) => button.form?.elements?.who?.value ?? "" },
        rejectClose: false,
      });
    } catch { uuid = null; }
    if (!uuid) return;
    const who = await fromUuid(uuid);
    if (!who) return;
    _log(`blessCharacter — "${me.name}" blesses "${who.name}"`);
    await grantStatus({ target: who, source: me, statusId: "blessed", label: "Blessing", abilityName: "Bless" });
  }

  /** Mendicant — clear blessing tokens to 0. */
  static async #onClearBlessings(event, target) {
    _log(`clearBlessings — actor: "${this.document.name}"`);
    await this.document.update({ "system.combat.classResources.blessingTokens.value": 0 });
  }

  /** Wright — +/- aether, clamped to 0..6 (Aether is tracked on a d6 power die, p.204). */
  static async #onAdjustAether(event, target) {
    const delta   = Number(target.dataset.delta) || 0;
    const current = this.document.system.combat.classResources.aether.value ?? 0;
    const next    = Math.clamp(current + delta, 0, CONFIG.ICON.rules.aetherMax);
    if (next === current && delta > 0) ui.notifications.info(`Aether is capped at ${CONFIG.ICON.rules.aetherMax} (d6 power die).`);
    _log(`adjustAether — actor: "${this.document.name}" | ${current} → ${next}`);
    await this.document.update({ "system.combat.classResources.aether.value": next });
  }

  /**
   * Set the talent on an equipped ability item (0 = none, 1 = Talent I, 2 = Talent II).
   * Validates against the AP counter: setting a new talent costs 1 AP. Switching
   * between I and II is free (only the choice changes). Removing a talent (→ 0)
   * refunds 1 AP. Blocks if the operation would put the PC into AP overspend.
   */
  async _setAbilityTalent(itemId, value) {
    if (this._abilitiesLocked) {
      ui.notifications.warn("Equipped abilities are locked. Click the lock to unlock.");
      await this.render();
      return;
    }
    const actor = this.document;
    const item  = actor.items.get(itemId);
    if (!item || item.type !== "ability") {
      _log(`setAbilityTalent — item not found or wrong type: ${itemId}`);
      return;
    }
    const previous = item.system?.talentSelected ?? 0;
    if (previous === value) return;

    // AP delta: +1 if going from no-talent to a talent, -1 if going from a
    // talent to no-talent, 0 if just swapping I↔II.
    let apDelta = 0;
    if (previous === 0 && value !== 0) apDelta = 1;
    else if (previous !== 0 && value === 0) apDelta = -1;

    if (apDelta > 0) {
      const apTotal = actor.system.combat?.apTotal ?? 0;
      // Recompute spent AP: each ability = 1, each existing talent = 1.
      const abilities = actor.items.filter(i => i.type === "ability");
      const apSpent = abilities.length
                    + abilities.filter(a => (a.system?.talentSelected ?? 0) > 0).length;
      if (apSpent + apDelta > apTotal) {
        ui.notifications.warn(`Not enough AP free: ${apSpent}/${apTotal} spent, this talent would cost +1.`);
        await this.render(); // revert select to old value
        return;
      }
    }

    _log(`setAbilityTalent — "${item.name}" | ${previous} → ${value} | apDelta: ${apDelta}`);
    await item.update({ "system.talentSelected": value });
  }

  /**
   * Toggle mastery on an equipped ability item. Validates against the mastery
   * counter when unlocking. Locking refunds 1 mastery point implicitly via the
   * derived counter on next render.
   */
  async _setAbilityMastery(itemId, unlocked) {
    if (this._abilitiesLocked) {
      ui.notifications.warn("Equipped abilities are locked. Click the lock to unlock.");
      await this.render();
      return;
    }
    const actor = this.document;
    const item  = actor.items.get(itemId);
    if (!item || item.type !== "ability") {
      _log(`setAbilityMastery — item not found or wrong type: ${itemId}`);
      return;
    }
    const previous = !!item.system?.masteryUnlocked;
    if (previous === unlocked) return;

    if (unlocked) {
      const masteryTotal = actor.system.combat?.masteries ?? 0;
      const masterySpent = actor.items.filter(i => i.type === "ability" && i.system?.masteryUnlocked).length;
      if (masterySpent + 1 > masteryTotal) {
        ui.notifications.warn(`Not enough Mastery Points free: ${masterySpent}/${masteryTotal} spent.`);
        await this.render();
        return;
      }
    }

    _log(`setAbilityMastery — "${item.name}" | ${previous} → ${unlocked}`);
    await item.update({ "system.masteryUnlocked": unlocked });
  }


  /** Toggle a status effect on the actor (Conditions tab buttons). */
  static async #onToggleStatus(event, target) {
    const statusId = target.dataset.statusId;
    if (!statusId) return;
    const actor = this.document;
    if (hasStatus(actor, statusId)) {
      _log(`toggleStatus — removing "${statusId}" from "${actor.name}"`);
      await removeStatus(actor, statusId);
    } else {
      _log(`toggleStatus — applying "${statusId}" to "${actor.name}"`);
      await applyStatus(actor, statusId);
    }
  }

  /**
   * Adjust the charge count of a stackable status (Blessed, Power Die).
   * Left-click +1, right-click -1. The underlying ActiveEffect is auto-applied
   * when count > 0, removed when count returns to 0. Triggered from the
   * Conditions tab buttons.
   */
  static async #onAdjustStatusCharges(event, target) {
    event.preventDefault();
    const statusId = target.dataset.statusId;
    if (!statusId) return;
    const delta = event.type === "contextmenu" ? -1 : (Number(target.dataset.delta) || 1);
    const next  = await adjustStatusCharges(this.document, statusId, delta);
    _log(`adjustStatusCharges — "${statusId}" → ${next}`);
  }

  /**
   * Adjust the actor's elevation level (stored as a system flag).
   * Left-click  → +1, right-click (contextmenu) → -1, middle-click → reset to 0.
   * The "elevation" status effect stays applied while the value is non-zero.
   */
  static async #onAdjustElevation(event, target) {
    event.preventDefault();
    const actor = this.document;
    const current = actor.getFlag("icon-system", "elevation") ?? 0;
    let delta = Number(target.dataset.delta);
    if (event.type === "contextmenu") delta = -1;
    if (event.button === 1) delta = -current; // middle click = reset
    const next = current + (Number.isFinite(delta) ? delta : 1);
    _log(`adjustElevation — actor: "${actor.name}" | ${current} → ${next}`);
    await actor.setFlag("icon-system", "elevation", next);
    // Sync the status effect: applied when elevation != 0
    if (next !== 0 && !hasStatus(actor, "elevation")) {
      await applyStatus(actor, "elevation");
    } else if (next === 0 && hasStatus(actor, "elevation")) {
      await removeStatus(actor, "elevation");
    }
  }

  /** Toggle the per-sheet edit lock on the equipped-abilities block. */
  static async #onToggleAbilitiesLock(event, target) {
    this._abilitiesLocked = !this._abilitiesLocked;
    _log(`abilitiesLocked — ${this._abilitiesLocked}`);
    await this.render();
  }

  /** Adjust the actor's Dust pool by ±1 (clamped to ≥ 0). */
  static async #onAdjustDust(event, target) {
    const delta   = Number(target.dataset.delta) || 0;
    const current = this.document.system.narrative.dust ?? 0;
    const next    = Math.max(0, current + delta);
    _log(`adjustDust — actor: "${this.document.name}" | ${current} → ${next}`);
    await this.document.update({ "system.narrative.dust": next });
  }

  /**
   * Take back the level-0 halfway ability point on a character that still
   * carries it. Same correction migration 15 makes, offered on the sheet for
   * characters that arrive after the migration has already run (imported from
   * an older world, or copied from one).
   */
  static async #onFixPhantomAp(event, target) {
    const actor   = this.document;
    const apTotal = actor.system.combat?.apTotal ?? 0;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window:  { title: "AP Total" },
      content: `<p><strong>${escapeHTML(actor.name)}</strong> has <strong>${apTotal}</strong> AP, one more than
                   everything this system grants adds up to.</p>
                <p class="notes">The halfway ability point (7 XP) used to be handed out at level 0 as well.
                   The book gives it "at level 1 and higher" (p.112), so that first one was never earned.
                   Set AP Total to <strong>${apTotal - 1}</strong>?</p>`,
      rejectClose: false,
    });
    if (!ok) { _log(`phantom AP — cancelled`); return; }
    await actor.update({ "system.combat.apTotal": apTotal - 1 });
    ui.notifications.info(`${actor.name}: AP Total ${apTotal} → ${apTotal - 1}.`);
  }

  /**
   * Bring `skillRanksTotal` up to the number of action improvements the
   * advancement table has granted by this character's level. Only ever raises
   * it: a GM who handed out extra dots keeps them.
   */
  static async #onFixSkillRanks(event, target) {
    const actor  = this.document;
    const stored = actor.system.combat?.skillRanksTotal ?? 0;
    const earned = expectedSkillRanksFromLevels(actor);
    if (earned <= stored) { _log(`skill ranks — already up to date`); return; }
    const ok = await foundry.applications.api.DialogV2.confirm({
      window:  { title: "Skill Ranks" },
      content: `<p><strong>${escapeHTML(actor.name)}</strong> is level <strong>${actor.system.combat?.level ?? 0}</strong>,
                   which grants <strong>${earned}</strong> action improvement${earned === 1 ? "" : "s"}, but the field
                   holds <strong>${stored}</strong>.</p>
                <p class="notes">That happens when the levels were not taken through the level-up wizard — an
                   imported sheet, or a level typed in by hand. Set the field to <strong>${earned}</strong>?
                   The pool becomes ${STARTING_ACTION_DOTS + earned} dots with the ${STARTING_ACTION_DOTS} from
                   character creation (p.46).</p>`,
      rejectClose: false,
    });
    if (!ok) { _log(`skill ranks — cancelled`); return; }
    await actor.update({ "system.combat.skillRanksTotal": earned });
    ui.notifications.info(`${actor.name}: Skill Ranks from level ups ${stored} → ${earned}.`);
  }

  /**
   * Refocus the PC (manual p. 113). Three modes:
   *   - keep jobs (4 Dust): drop abilities, talents, masteries.
   *   - reset jobs (8 Dust): also drops jobs, traits, LB, resets combat stats.
   *   - start over (free): nuke everything to a fresh sheet — items, jobs,
   *     stats, level, AP, masteries, dust pool stays. Used when the player
   *     wants a clean rebuild from scratch (not the manual's refocus rule).
   */
  static async #onRefocus(event, target) {
    const actor = this.document;
    const dust  = actor.system.narrative?.dust ?? 0;

    const choice = await foundry.applications.api.DialogV2.wait({
      window:  { title: "Refocus" },
      content: `<p>Refocus <strong>${escapeHTML(actor.name)}</strong>?</p>
                <p class="notes">Refunds AP, Mastery Points, and Skill Ranks (all action dots reset). This <strong>deletes</strong> embedded items.</p>
                <p>Current Dust: <strong>${dust}</strong></p>
                <ul>
                  <li><strong>Keep Jobs (4 Dust):</strong> drops abilities, talents, and masteries only.</li>
                  <li><strong>Reset Jobs (8 Dust):</strong> also drops jobs, traits, limit break, and resets combat stats.</li>
                  <li><strong>Start Over:</strong> wipes the whole sheet back to a level-0 state.</li>
                </ul>`,
      buttons: [
        { action: "keep",  label: "Keep Jobs (4 Dust)",  default: true,
          callback: () => "keep" },
        { action: "reset", label: "Reset Jobs (8 Dust)",
          callback: () => "reset" },
        { action: "wipe",  label: "Start Over",
          callback: () => "wipe" },
        { action: "cancel", label: "Cancel",
          callback: () => null },
      ],
      rejectClose: false,
    });
    if (!choice) { _log(`refocus — cancelled`); return; }

    const cost = choice === "wipe" ? 0 : (choice === "reset" ? 8 : 4);
    if (dust < cost) {
      ui.notifications.error(`Not enough Dust for refocus: have ${dust}, need ${cost}.`);
      return;
    }

    _log(`refocus — actor: "${actor.name}" | mode: ${choice} | cost: ${cost} dust`);

    // Collect item IDs to delete based on mode
    let idsToDelete;
    if (choice === "wipe") {
      // Drop EVERYTHING: abilities, traits, LB, bond powers, relics, anything embedded
      idsToDelete = actor.items.map(i => i.id);
    } else if (choice === "reset") {
      idsToDelete = actor.items.filter(i => i.type === "ability" || i.type === "limit-break" || i.type === "trait").map(i => i.id);
    } else {
      idsToDelete = actor.items.filter(i => i.type === "ability").map(i => i.id);
    }
    if (idsToDelete.length) {
      await actor.deleteEmbeddedDocuments("Item", idsToDelete);
    }

    const updates = {
      "system.narrative.dust": dust - cost,
      // All refocus modes refund skill ranks: zero every action dot so the
      // player re-spends them. `skillRanksTotal` is NOT reset — it is the
      // pool earned by levelling up (one per action improvement), the same
      // way apTotal and masteries survive a refocus; zeroing it used to throw
      // away every improvement the character had ever earned.
      "system.narrative.actions.sneak":    0,
      "system.narrative.actions.traverse": 0,
      "system.narrative.actions.sense":    0,
      "system.narrative.actions.study":    0,
      "system.narrative.actions.charm":    0,
      "system.narrative.actions.command":  0,
      "system.narrative.actions.tinker":   0,
      "system.narrative.actions.excel":    0,
      "system.narrative.actions.smash":    0,
      "system.narrative.actions.endure":   0,
    };
    if (choice === "reset" || choice === "wipe") {
      // Reset jobs and base combat stats to defaults
      Object.assign(updates, {
        "system.combat.jobs":      [],
        "system.combat.vit":       10,
        "system.combat.defense":   6,
        "system.combat.speed":     4,
        "system.combat.armor":     0,
        "system.combat.fray":      4,
        "system.combat.damagedie": "d6",
        "system.combat.hp.max":    40,
        "system.combat.hp.value":  40,
        "system.combat.vigor.max": 10,
        "system.combat.vigor.value": 0,
      });
    }
    if (choice === "wipe") {
      // Full reset: also wipe level/chapter/AP/mastery and narrative state
      Object.assign(updates, {
        "system.combat.level":      0,
        "system.combat.chapter":    1,
        "system.combat.apTotal":    0,
        "system.combat.masteries":  0,
        "system.combat.wounds.value": 0,
        "system.combat.equippedAbilities":  [],
        "system.combat.equippedLimitBreak": "",
        "system.combat.resolve.personal":   0,
        "system.combat.resolve.party":      0,
        "system.narrative.xp.value":        0,
        "system.narrative.bond":            "",
        "system.narrative.gearKit":         "",
        "system.narrative.looseGear":       [],
        "system.narrative.burdens":         [],
        "system.narrative.ambitions":       [],
        "system.narrative.strain.value":    0,
        "system.narrative.effort.value":    3,
      });
    }
    await actor.update(updates);

    const speaker = ChatMessage.getSpeaker({ actor });
    const label = choice === "wipe"  ? "Started Over"
                : choice === "reset" ? "Jobs reset"
                :                      "Jobs kept";
    const dustNote = cost > 0 ? `, −${cost} Dust` : "";
    await ChatMessage.create({
      speaker,
      content: `<div class="icon-chat-refocus"><strong>${escapeHTML(actor.name)}</strong> refocused (${label}${dustNote}).</div>`,
    });
    ui.notifications.info(`${actor.name} refocused.`);
  }

  /**
   * Upgrade an embedded relic to a target rank (2, 3, or 4 = Aspect). Spends
   * the rank's dust cost from the actor's narrative.dust pool and bumps the
   * relic's currentRank field. Validates: must be the immediate next rank,
   * and the actor must have enough dust. Manual p. 245 — costs are stored
   * on the relic item itself (so per-relic overrides are respected).
   */
  static async #onUpgradeRelic(event, target) {
    const itemId     = target.dataset.itemId;
    const targetRank = Number(target.dataset.targetRank);
    const actor      = this.document;
    const relic      = actor.items.get(itemId);
    if (!relic || relic.type !== "relic") {
      _log(`upgradeRelic — relic not found: ${itemId}`);
      return;
    }
    const s = relic.system ?? {};
    const currentRank = s.currentRank ?? 1;
    if (targetRank !== currentRank + 1) {
      ui.notifications.warn(`Must upgrade ranks in order. Currently rank ${currentRank}.`);
      return;
    }
    const cost = targetRank === 2 ? (s.rank2?.dustCost ?? 6)
               : targetRank === 3 ? (s.rank3?.dustCost ?? 6)
               :                    (s.aspect?.dustCost ?? 12);
    // Invested dust (already infused into this relic) counts first; the
    // remainder is pulled from the actor's free Dust pool.
    const invested  = s.investedDust ?? 0;
    const dust      = actor.system.narrative?.dust ?? 0;
    const fromInv   = Math.min(invested, cost);
    const fromPool  = cost - fromInv;
    if (fromPool > dust) {
      ui.notifications.error(`Not enough Dust: ${invested} infused + ${dust} free = ${invested + dust}, need ${cost}.`);
      return;
    }

    const breakdown = fromInv > 0
      ? `${fromInv} infused${fromPool > 0 ? ` + ${fromPool} from pool` : ""}`
      : `${fromPool} from pool`;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window:  { title: `Upgrade ${relic.name}` },
      content: `<p>Spend <strong>${cost} Dust</strong> (${breakdown}) to upgrade <strong>${escapeHTML(relic.name)}</strong> to ${targetRank === 4 ? "<em>Aspected</em>" : `Rank ${targetRank}`}?</p><p class="notes">Free Dust pool: ${dust} → ${dust - fromPool}</p>`,
      modal: true,
    });
    if (!confirmed) { _log(`upgradeRelic — cancelled`); return; }

    _log(`upgradeRelic — "${relic.name}" | rank ${currentRank} → ${targetRank} | cost: ${cost} (inv ${fromInv} + pool ${fromPool})`);
    if (fromPool > 0) await actor.update({ "system.narrative.dust": dust - fromPool });
    // Leftover invested dust carries toward the following rank.
    await relic.update({ "system.currentRank": targetRank, "system.investedDust": invested - fromInv });

    const speaker = ChatMessage.getSpeaker({ actor });
    await ChatMessage.create({
      speaker,
      content: `<div class="icon-chat-relic-upgrade"><strong>${escapeHTML(actor.name)}</strong> upgraded <strong>${escapeHTML(relic.name)}</strong> to ${targetRank === 4 ? "<em>Aspected</em>" : `Rank ${targetRank}`} (−${cost} Dust).</div>`,
    });
  }

  /**
   * Infuse 1 Dust from the actor's pool into a relic, accumulating toward the
   * next rank (ICON p.245 — dust can be added a little at a time, e.g. after
   * each combat). When investedDust reaches the next rank's cost, the upgrade
   * unlocks.
   */
  static async #onInfuseRelic(event, target) {
    const itemId = target.dataset.itemId;
    const actor  = this.document;
    const relic  = actor.items.get(itemId);
    if (!relic || relic.type !== "relic") return;

    const s           = relic.system ?? {};
    const currentRank = s.currentRank ?? 1;
    if (currentRank >= 4) {
      ui.notifications.info(`${relic.name} is already fully Aspected.`);
      return;
    }
    const nextCost = currentRank === 1 ? (s.rank2?.dustCost ?? 6)
                   : currentRank === 2 ? (s.rank3?.dustCost ?? 6)
                   :                      (s.aspect?.dustCost ?? 12);
    const invested = s.investedDust ?? 0;
    if (invested >= nextCost) {
      ui.notifications.info(`${relic.name} is fully infused (${invested}/${nextCost}) — ready to upgrade.`);
      return;
    }
    const dust = actor.system.narrative?.dust ?? 0;
    if (dust < 1) {
      ui.notifications.warn(`No Dust to infuse.`);
      return;
    }

    const newInvested = invested + 1;
    _log(`infuseRelic — "${relic.name}" | invested ${invested} → ${newInvested}/${nextCost} | pool ${dust} → ${dust - 1}`);
    await actor.update({ "system.narrative.dust": dust - 1 });
    await relic.update({ "system.investedDust": newInvested });

    if (newInvested >= nextCost) {
      ui.notifications.info(`${relic.name} fully infused (${newInvested}/${nextCost}) — upgrade is now available.`);
    }
  }

  /**
   * Power die dialog: label, die size and (when adding) starting ticks.
   * Resolves to { label, faces, ticks } or null when cancelled.
   */
  static async #powerDieDialog({ title, label = "", faces = 6, ticks = 1, withTicks = true }) {
    const sizes = [4, 6, 8, 10, 12].map(f => `<option value="${f}" ${f === faces ? "selected" : ""}>d${f}</option>`).join("");
    const content = `
      <div style="display:flex; flex-direction:column; gap:6px; padding:4px 0">
        <label>Label (the ability that gave it):
          <input type="text" name="label" value="${escapeHTML(label)}" placeholder="e.g. Godly Smite" autofocus>
        </label>
        <label>Die: <select name="faces">${sizes}</select></label>
        ${withTicks ? `<label>Starting at: <input type="number" name="ticks" value="${ticks}" min="1" max="12" style="width:60px"></label>` : ""}
      </div>`;
    try {
      return await foundry.applications.api.DialogV2.prompt({
        window: { title },
        content,
        ok: {
          label: "Save",
          callback: (_e, button, dialog) => {
            const root  = button?.form ?? dialog?.element ?? dialog;
            const f     = Number(root.querySelector('select[name="faces"]')?.value) || 6;
            const t     = Number(root.querySelector('input[name="ticks"]')?.value) || ticks;
            return {
              label: String(root.querySelector('input[name="label"]')?.value ?? "").trim(),
              faces: f,
              ticks: Math.max(1, Math.min(f, t)),
            };
          },
        },
        rejectClose: false,
      });
    } catch { return null; }
  }

  /** Roll a power die (1dN, d6 when the button names no die) to chat. */
  static async #onRollPowerDie(event, target) {
    const actor = this.document;
    const id    = target.dataset.id;
    const dice  = actor.system.combat.classResources.powerDice ?? [];
    const die   = id ? dice.find(d => d.id === id) : null;
    const faces = Number(die?.faces) || 6;
    const roll  = await new Roll(`1d${faces}`).evaluate();
    const name  = escapeHTML(die?.label || "Power Die");
    const flavor = die
      ? `${name} (${die.ticks} ${die.ticks === 1 ? "tick" : "ticks"}) — rolled 1d${faces}`
      : "Power Die — rolled 1d6";
    _log(`rollPowerDie — actor: "${actor.name}" | die: ${id ?? "-"} d${faces} | result: ${roll.total}`);
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
  }

  /** Set out a new power die: label, size and starting ticks from a dialog. */
  static async #onAddPowerDie(event, target) {
    const picked = await IconSheet.#powerDieDialog({ title: "Set out a power die" });
    if (!picked) return;
    const dice = foundry.utils.deepClone(this.document.system.combat.classResources.powerDice ?? []);
    const id   = foundry.utils.randomID(8);
    dice.push({ id, ...picked });
    _log(`addPowerDie — actor: "${this.document.name}" | id: ${id} | "${picked.label}" d${picked.faces} at ${picked.ticks} | total: ${dice.length}`);
    await this.document.update({ "system.combat.classResources.powerDice": dice });
  }

  /** Rename a power die or change its size (ticks are kept, capped at the new size). */
  static async #onEditPowerDie(event, target) {
    const id   = target.dataset.id;
    const dice = foundry.utils.deepClone(this.document.system.combat.classResources.powerDice ?? []);
    const die  = dice.find(d => d.id === id);
    if (!die) { _log(`editPowerDie — BLOCKED: no die with id "${id}"`); return; }
    const picked = await IconSheet.#powerDieDialog({
      title: "Edit power die", label: die.label ?? "", faces: Number(die.faces) || 6, withTicks: false,
    });
    if (!picked) return;
    die.label = picked.label;
    die.faces = picked.faces;
    die.ticks = Math.min(die.faces, die.ticks);
    _log(`editPowerDie — id: ${id} | "${die.label}" d${die.faces} at ${die.ticks}`);
    await this.document.update({ "system.combat.classResources.powerDice": dice });
  }

  /**
   * Adjust a power die's ticks, never above its size. If ticks drop to 0
   * the die is discarded (removed from the array).
   */
  static async #onTickPowerDie(event, target) {
    const id    = target.dataset.id;
    const delta = Number(target.dataset.delta) || 0;
    const dice  = foundry.utils.deepClone(this.document.system.combat.classResources.powerDice ?? []);
    const idx   = dice.findIndex(d => d.id === id);
    if (idx < 0) { _log(`tickPowerDie — BLOCKED: no die with id "${id}"`); return; }
    const faces = Number(dice[idx].faces) || 6;
    const prev  = dice[idx].ticks;
    const nextTicks = Math.min(faces, prev + delta);
    if (nextTicks === prev) {
      if (delta > 0) ui.notifications.info(`${dice[idx].label || "Power die"} is already at its maximum (${faces}).`);
      return;
    }
    if (nextTicks <= 0) {
      dice.splice(idx, 1);
      _log(`tickPowerDie — discarded | id: ${id} | remaining: ${dice.length}`);
    } else {
      dice[idx].ticks = nextTicks;
      _log(`tickPowerDie — id: ${id} | ${prev} → ${nextTicks}`);
    }
    await this.document.update({ "system.combat.classResources.powerDice": dice });
  }

  /** Discard a power die by id. */
  static async #onRemovePowerDie(event, target) {
    const id   = target.dataset.id;
    const dice = foundry.utils.deepClone(this.document.system.combat.classResources.powerDice ?? []);
    const next = dice.filter(d => d.id !== id);
    _log(`removePowerDie — id: ${id} | ${dice.length} → ${next.length}`);
    await this.document.update({ "system.combat.classResources.powerDice": next });
  }

  /* -------------------------------------------------- */
  /*  Power die on an ability / trait item               */
  /* -------------------------------------------------- */

  /** Item (ability/trait) carrying a power die, or null. */
  #powerDieItem(target) {
    const item = this.document.items.get(target.dataset.itemId);
    const view = powerDieView(item?.system);
    if (!item || !view) { _log(`itemPowerDie — BLOCKED: no power die on item "${target.dataset.itemId}"`); return null; }
    return { item, view };
  }

  /** Tick the item's power die by ±1; ticking to 0 discards it (manual glossary). */
  static async #onItemPowerDieTick(event, target) {
    event.stopPropagation();
    const found = this.#powerDieItem(target);
    if (!found) return;
    const { item, view } = found;
    const delta = Number(target.dataset.delta) || 0;
    const next  = Math.min(view.faces, Math.max(0, view.value + delta));
    if (next === view.value) {
      if (delta > 0) ui.notifications.info(`${item.name}: power die is already at its maximum (${view.faces}).`);
      return;
    }
    _log(`itemPowerDieTick — "${item.name}" d${view.faces}: ${view.value} → ${next}`);
    await item.update({ "system.powerDie.value": next });
    if (next === 0) ui.notifications.info(`${item.name}: power die ticked to 0 — discarded.`);
  }

  /** Set the item's power die out at its starting value, or discard it (value 0). */
  static async #onItemPowerDieSet(event, target) {
    event.stopPropagation();
    const found = this.#powerDieItem(target);
    if (!found) return;
    const { item, view } = found;
    const value = Math.min(view.faces, Math.max(0, Number(target.dataset.value ?? view.start) || 0));
    _log(`itemPowerDieSet — "${item.name}" d${view.faces}: ${view.value} → ${value}`);
    await item.update({ "system.powerDie.value": value });
  }

  /** Roll the item's power die (1dN) to chat, flagged with its current ticks. */
  static async #onItemPowerDieRoll(event, target) {
    event.stopPropagation();
    const found = this.#powerDieItem(target);
    if (!found) return;
    const { item, view } = found;
    const roll = await new Roll(`1d${view.faces}`).evaluate();
    _log(`itemPowerDieRoll — "${item.name}" d${view.faces} (${view.value} ticks) → ${roll.total}`);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      flavor:  `${escapeHTML(item.name)} — power die d${view.faces} (${view.value} ${view.value === 1 ? "tick" : "ticks"})`,
    });
  }

  /* -------------------------------------------------- */
  /*  Drag-drop                                          */
  /* -------------------------------------------------- */

  async _onDropSheet(event) {
    // Re-entry guard: if a previous drop is still mid-processing (compendium
    // lookup, DialogV2 confirm, actor update), silently ignore any additional
    // drop events. Belt-and-suspenders alongside the listener-binding guard
    // in BaseActorSheet.
    // The player is told, since a drop made while the talent/mastery prompt
    // of the previous one is still open would otherwise just vanish.
    if (this._dropInProgress) {
      _log(`drop — IGNORED (another drop is already in progress)`);
      ui.notifications.info("The previous item is still being added: finish that first, then drop this one again.");
      return;
    }
    this._dropInProgress = true;
    try {
      await this.#handleDrop(event);
    } finally {
      this._dropInProgress = false;
    }
  }

  /**
   * Chapter gate for dropped abilities / limit breaks. The level-up and
   * character-creation dialogs already filter by chapter, but dragging
   * straight from a compendium bypassed them entirely. Players are blocked;
   * the GM gets a confirm so deliberate overrides stay possible.
   * @returns {Promise<boolean>} true if the drop may proceed.
   */
  async #checkChapterGate(item) {
    if (item.type !== "ability" && item.type !== "limit-break") return true;
    const itemChapter  = item.system?.chapter ?? 1;
    const actorChapter = this.document.system.combat?.chapter ?? 1;
    if (itemChapter <= actorChapter) return true;

    const label = item.type === "ability" ? "ability" : "limit break";
    if (!game.user.isGM) {
      ui.notifications.warn(
        `"${item.name}" is a chapter ${itemChapter} ${label} — ${this.document.name} is chapter ${actorChapter}. Ask your GM if you think this is unlocked.`);
      _log(`chapterGate — BLOCKED "${item.name}" (ch ${itemChapter} > actor ch ${actorChapter})`);
      return false;
    }
    const ok = await foundry.applications.api.DialogV2.confirm({
      window:  { title: "Chapter Lock" },
      content: `<p><strong>${escapeHTML(item.name)}</strong> is a chapter ${itemChapter} ${label}, but <strong>${escapeHTML(this.document.name)}</strong> is chapter ${actorChapter}.</p>
                <p>Add it anyway?</p>`,
      modal: true,
    }).catch(() => false);
    _log(`chapterGate — GM override for "${item.name}": ${ok}`);
    return !!ok;
  }

  /** Actual drop routing — called exactly once per drop event via #onDrop. */
  async #handleDrop(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data.type !== "Item") { _log(`drop — ignored data.type: "${data.type}"`); return; }

    _log(`drop — resolving item from data:`, data);
    const item = await Item.implementation.fromDropData(data);
    if (!item) { _log(`drop — ERROR: could not resolve item`); return; }

    _log(`drop — item: "${item.name}" | type: "${item.type}" | fromActor: ${item.parent?.id === this.document.id}`);

    if (item.parent?.id === this.document.id) {
      _log(`drop — SKIP: already embedded on this actor`);
      return;
    }

    switch (item.type) {
      case "ability":
      case "limit-break":
      case "bond-power":
      case "trait":
      case "relic":
      case "trophy":
        if (item.type === "trophy" && this.document.items.filter(i => i.type === "trophy").length >= 3) {
          ui.notifications.warn(`${this.document.name} already holds three trophies: a character can hold on to three at once (p.242).`);
        }
        if (item.type !== "trophy" && !(await this.#checkChapterGate(item))) return;
        {
          const itemData = item.toObject();
          // An ability dropped anywhere on the sheet (not only on a slot) asks
          // for its talent / mastery too: slots show the first six abilities
          // whatever the drop point, so a drop that missed a slot used to
          // embed the ability silently with no talent and no mastery.
          if (item.type === "ability") {
            const config = await promptAbilityConfig(item);
            if (config === null) { _log(`drop — "${item.name}" cancelled in the talent/mastery prompt`); return; }
            itemData.system = itemData.system ?? {};
            itemData.system.talentSelected  = config.talent;
            itemData.system.masteryUnlocked = config.mastered;
          }
          _log(`drop — embedding "${item.name}" (${item.type})`);
          await this.document.createEmbeddedDocuments("Item", [itemData]);
        }
        break;
      case "bond":
        await this.#onDropBond(item);
        break;
      case "job-template":
        await this.#onDropJobTemplate(item);
        break;
      case "gear-kit": {
        // The kit goes on the sheet with its items (Gear section). An
        // adventurer's kit is always carried; a bond kit is picked to carry
        // when nothing else is.
        const actor = this.document;
        if (actor.items.some(i => i.type === "gear-kit" && i.name === item.name)) {
          ui.notifications.info(`${actor.name} already has the ${item.name}.`);
          break;
        }
        const data = item.toObject();
        const isBase = !!item.system?.isAdventurersKit;
        const carrying = actor.items.some(i => i.type === "gear-kit" && !i.system.always && i.system.carried);
        data.system.always  = isBase;
        data.system.carried = !isBase && !carrying;
        data.system.used    = [];
        _log(`drop — gear-kit: embedding "${item.name}" (always: ${isBase}, carried: ${data.system.carried})`);
        await actor.createEmbeddedDocuments("Item", [data]);
        break;
      }
      default:
        _log(`drop — WARN: unhandled item type "${item.type}"`);
        ui.notifications.warn(`Cannot drop item type "${item.type}" on this sheet.`);
    }
  }

  /**
   * Drop a Job Template → routes based on whether this will be the primary
   * job (first job on the actor) or a secondary one.
   *
   * PRIMARY (first drop): copies base stats to the actor, embeds all traits
   * and the limit break as separate Items, adds to combat.jobs with primary=true.
   *
   * SECONDARY (subsequent drop): just adds an entry to combat.jobs with
   * primary=false, storing the template UUID so the user can switch primary
   * later. Stats / traits / LB are NOT touched — per rules, those come only
   * from the primary job and can be swapped per expedition.
   */
  async #onDropJobTemplate(item) {
    const actor = this.document;
    const s     = item.system ?? {};
    const jobName = s.jobName || item.name;
    const cls     = s.class ?? "stalwart";

    const jobs        = foundry.utils.deepClone(actor.system.combat.jobs ?? []);
    const alreadyOwned = jobs.find(j => j.name?.toLowerCase() === jobName.toLowerCase());
    if (alreadyOwned) {
      ui.notifications.warn(`${actor.name} already has a job named "${jobName}".`);
      return;
    }

    const willBePrimary = jobs.length === 0;
    _log(`dropJobTemplate — template: "${item.name}" | class: "${cls}" | jobName: "${jobName}" | primary: ${willBePrimary}`);

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window:  { title: willBePrimary ? "Import Primary Job" : "Add Secondary Job" },
      content: willBePrimary
        ? `<p>Set <strong>${jobName}</strong> as the primary job for <strong>${actor.name}</strong>?</p>
           <p class="notes">This will <strong>overwrite</strong> the actor's combat stats (VIT, Defense, Speed, Fray, [D], Armor) and embed the job's traits and Limit Break. HP will be reset to max based on the new VIT.</p>`
        : `<p>Add <strong>${jobName}</strong> as a secondary job on <strong>${actor.name}</strong>?</p>
           <p class="notes">This only unlocks access to the job's abilities. Traits and Limit Break are <em>not</em> added — per ICON rules those come only from the <strong>primary</strong> job. You can switch primary jobs from the Combat tab each expedition.</p>`,
      modal: true,
    });
    if (!confirmed) { _log(`dropJobTemplate — cancelled`); return; }

    jobs.push({
      name:         jobName,
      class:        cls,
      primary:      willBePrimary,
      templateUuid: item.uuid,
    });

    const updates = { "system.combat.jobs": jobs };

    // Apply base stats ONLY if this is the primary job
    if (willBePrimary) {
      const bs  = s.baseStats ?? {};
      const vit = bs.vit ?? actor.system.combat.vit;
      const hpMax = vit * 4;
      Object.assign(updates, {
        "system.combat.vit":       vit,
        "system.combat.defense":   bs.defense   ?? actor.system.combat.defense,
        "system.combat.speed":     bs.speed     ?? actor.system.combat.speed,
        "system.combat.fray":      bs.fray      ?? actor.system.combat.fray,
        "system.combat.damagedie": bs.damagedie ?? actor.system.combat.damagedie,
        "system.combat.armor":     bs.armor     ?? actor.system.combat.armor,
        "system.combat.hp.max":    hpMax,
        "system.combat.hp.value":  hpMax,
        "system.combat.vigor.max": vit,
      });
      _log(`dropJobTemplate — applying primary stats: vit=${vit} def=${bs.defense} spd=${bs.speed} fray=${bs.fray} [D]=${bs.damagedie} arm=${bs.armor}`);
    }

    await actor.update(updates);

    // Embed traits and LB ONLY for the primary job. Also embeds the
    // CLASS-level traits (e.g. Stalwart's Armor 2 / Fortify / Rush X).
    if (willBePrimary) {
      const toCreate = [
        ...buildClassTraitDocs(cls),
        ...this.#buildTemplateEmbeds(s, jobName, cls),
      ];
      // Fallback: if the inline limitBreak was empty, try the compendium
      const hasInlineLB = toCreate.some(d => d.type === "limit-break");
      if (!hasInlineLB) {
        const lbItem = await IconSheet.#findLimitBreakForJob(jobName);
        if (lbItem) {
          _log(`dropJobTemplate — using compendium LB "${lbItem.name}" for job "${jobName}"`);
          const lbObj = lbItem.toObject();
          // Stamp jobName on the LB so the swap-primary cleanup can find it
          lbObj.system = lbObj.system ?? {};
          lbObj.system.jobName = jobName;
          lbObj.system.class   = cls;
          toCreate.push(lbObj);
        }
      }
      if (toCreate.length) {
        _log(`dropJobTemplate — embedding ${toCreate.length} items (primary, includes class traits)`);
        await fillJobTraitPowerDice(toCreate);
        await actor.createEmbeddedDocuments("Item", toCreate);
      }
    }

    // SECONDARY job: embed the new class's Gambit trait if its class differs
    // from the current primary's class, and the actor doesn't already have it.
    if (!willBePrimary) {
      const created = await ensureClassGambits(actor);
      if (created.length) _log(`dropJobTemplate — embedded ${created.map(d => d.name).join(", ")} (secondary class)`);
    }

    ui.notifications.info(
      willBePrimary
        ? `Primary job "${jobName}" set on ${actor.name}.`
        : `Secondary job "${jobName}" added to ${actor.name}. Its abilities are now available in level-up pickers. Set as primary from the Combat tab to use its traits/LB.`,
    );
  }

  /**
   * Look up a Limit Break item from the jobs compendium that matches the
   * given jobName. Used as a fallback when the job template's inline
   * `limitBreak` sub-object is empty — older / community-built templates
   * often store the LB as a separate compendium item linked by jobName
   * rather than embedded inline.
   *
   * Returns the LB item document or null if none found.
   */
  static async #findLimitBreakForJob(jobName) {
    if (!jobName) return null;
    const pack = game.packs.get("icon-system.jobs");
    if (!pack) return null;
    try {
      const all = await pack.getDocuments();
      const target = jobName.trim().toLowerCase();
      return all.find(i =>
        i.type === "limit-break" &&
        ((i.system?.jobName ?? "").trim().toLowerCase() === target ||
         (i.name ?? "").trim().toLowerCase().includes(target)),
      ) ?? null;
    } catch (err) {
      _log(`findLimitBreakForJob — pack lookup failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Build the list of embedded-Item docs for a job template's traits and
   * limit break. Returns a plain array to be passed to createEmbeddedDocuments.
   * Used by #onDropJobTemplate and #onSetPrimaryJob.
   *
   * Note: the LB fallback (compendium lookup) is async and lives in the
   * callers — this function only handles the inline LB defined on the
   * job template itself.
   */
  #buildTemplateEmbeds(templateSystem, jobName, cls) {
    const docs = [];
    const s = templateSystem ?? {};

    if (Array.isArray(s.traits)) {
      for (const t of s.traits) {
        if (!t?.name && !t?.description) continue;
        docs.push({
          type: "trait",
          name: t.name || `${jobName} trait`,
          system: {
            jobName:     jobName,
            class:       cls,
            source:      "job",
            passive:     true,
            chapter:     Number(t.chapter) || 1,
            description: t.description ?? "",
          },
        });
      }
    }

    if (s.limitBreak?.name) {
      docs.push({
        type: "limit-break",
        name: s.limitBreak.name,
        system: {
          jobName:     jobName,
          class:       cls,
          resolveCost: s.limitBreak.resolveCost ?? 2,
          cost:        s.limitBreak.cost ?? "1action",
          effect:      s.limitBreak.effect ?? "",
          ultimate:    s.limitBreak.ultimate ?? "",
        },
      });
    }

    return docs;
  }

  async #onDropBond(item) {
    const actor = this.document;
    const s     = item.system;

    // If another bond is already embedded, ask before replacing.
    const existing = actor.items.find(i => i.type === "bond");
    if (existing) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window:  { title: "Replace Bond" },
        content: `<p>Replace <strong>${escapeHTML(existing.name)}</strong> with <strong>${escapeHTML(item.name)}</strong>?</p>
                  <p class="notes">The current bond will be removed from this character. Effort max and ideals will be overwritten with the new bond's values.</p>`,
        modal: true,
      });
      if (!ok) { _log(`dropBond — cancelled (replace declined)`); return; }
      const oldKits = actor.items.filter(i => i.type === "gear-kit" && !i.system.custom).map(i => i.id);
      await actor.deleteEmbeddedDocuments("Item", [existing.id, ...oldKits]);
    }

    _log(`dropBond — bond: "${item.name}" | effortMax: ${s.effortMax} | ideals: ${JSON.stringify(s.ideals)}`);
    await actor.createEmbeddedDocuments("Item", [item.toObject()]);
    const updates = {
      "system.narrative.bond":       item.name,
      "system.narrative.effort.max": s.effortMax ?? 3,
      "system.biography.ideals":     Array.isArray(s.ideals) ? s.ideals : [],
    };

    await actor.update(updates);
    // The bond's kits (and the base kit) go on the sheet, Gear section.
    const kits = await addBondKits(actor, item.name);
    ui.notifications.info(`Bond "${item.name}" applied${kits ? ` — ${kits} gear kit(s) added: pick the one you carry in the Gear section` : ""}.`);
  }

  async #onDropAbilitySlot(event, slot) {
    event.preventDefault();
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    if (data.type !== "Item") return;

    const item = await Item.implementation.fromDropData(data);
    if (!item || item.type !== "ability") {
      _log(`dropAbilitySlot — BLOCKED: item type is "${item?.type}" (need "ability")`);
      return ui.notifications.warn("Only ability items can be slotted.");
    }

    if (!(await this.#checkChapterGate(item))) return;

    _log(`dropAbilitySlot — ability: "${item.name}" | slot: ${slot.dataset.slot} | alreadyEmbedded: ${item.parent?.id === this.document.id}`);

    // Ask the player which talent (if any) and whether the mastery is unlocked
    // for this ability. Skipped silently if the ability has no talents/mastery.
    const config = await promptAbilityConfig(item);
    if (config === null) { _log(`dropAbilitySlot — cancelled by user`); return; }

    let embedded = item.parent?.id === this.document.id ? item : null;
    if (!embedded) {
      _log(`dropAbilitySlot — embedding "${item.name}" (talent: ${config.talent}, mastered: ${config.mastered})`);
      const itemData = item.toObject();
      itemData.system = itemData.system ?? {};
      itemData.system.talentSelected  = config.talent;
      itemData.system.masteryUnlocked = config.mastered;
      const [created] = await this.document.createEmbeddedDocuments("Item", [itemData]);
      embedded = created;
    } else {
      // Already embedded on this actor — update talent/mastery only
      _log(`dropAbilitySlot — updating existing "${item.name}" (talent: ${config.talent}, mastered: ${config.mastered})`);
      await embedded.update({
        "system.talentSelected":  config.talent,
        "system.masteryUnlocked": config.mastered,
      });
    }

    const slotIdx  = Number(slot.dataset.slot);
    const equipped = foundry.utils.deepClone(this.document.system.combat.equippedAbilities);
    while (equipped.length <= slotIdx) equipped.push(null);
    equipped[slotIdx] = embedded.id;
    _log(`dropAbilitySlot — assigned "${embedded.name}" (${embedded.id}) to slot ${slotIdx}`);
    await this.document.update({ "system.combat.equippedAbilities": equipped });
  }

}
