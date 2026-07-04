/**
 * IconSheet — ApplicationV2 sheet for Player Characters (type: "icon").
 */
import { narrativeRoll, combatRoll, damageRoll, saveRoll } from "../../dice/rolls.mjs";
import { postAbilityDamageCard } from "../../combat/damage.mjs";
import { LevelUpDialog } from "../../apps/LevelUpDialog.mjs";
import { CharacterCreationDialog } from "../../apps/CharacterCreationDialog.mjs";
import { showWelcomeGuide } from "../../apps/welcome.mjs";
import { showReferenceGuide, REFERENCE_CONTROL } from "../../apps/reference.mjs";
import { enrichHTML, escapeHTML } from "../../helpers/enrich.mjs";
import { formatTag } from "../../helpers/rule-tooltips.mjs";
import { CLASS_INFO, buildClassTraitDocs, buildClassGambitDoc } from "../../helpers/classes.mjs";
import { getActorStatusMods, groupStatusesForUI } from "../../combat/status-modifiers.mjs";
import { applyStatus, removeStatus, hasStatus,
         STACKABLE_STATUSES, getStatusCharges,
         setStatusCharges, adjustStatusCharges,
         cycleOngoingStatus } from "../../combat/statuses.mjs";
import { PROTOTYPE_TOKEN_CONTROL, onConfigurePrototypeToken, filterPrototypeTokenControl } from "./_prototype-token-control.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

const _log = (...args) => console.debug("[ICON | IconSheet]", ...args);

/**
 * Extract structured damage info from an ability's free-text fields. The
 * source JSON uses patterns like:
 *   hitEffect: "[D] + fray. Attack target is weakened..."
 *   missEffect: "Fray."
 *   areaEffect: "Foes take fray damage"
 *   description: "...Attack: Autohit: 2[D]+fray. Area Effect: fray."
 *
 * We concatenate the fields and look for:
 *   - "autohit" → isAutoHit = true (skip the d20 roll)
 *   - "[D]" / "2[D]" / "3[D]" → dice multiplier
 *   - "fray" → includes fray flat damage
 *   - "N damage" → flat bonus / override
 *
 * Returns an object with per-outcome parsing results. Empty/non-damaging
 * fields default to zeros and no dice.
 */
export function _parseAbilityDamage(itemSystem) {
  const s = itemSystem ?? {};
  const isAttack = !!s.isAttack;

  const combined = [
    s.hitEffect, s.missEffect, s.areaEffect, s.description,
    s.critEffect, s.exceedEffect, s.heroicEffect,
  ].filter(Boolean).join(" ").toLowerCase();

  const isAutoHit = /auto[-\s]?hit/.test(combined);

  // Parse a single text blob for dice formula + fray + flat damage
  const parseChunk = (text) => {
    if (!text || typeof text !== "string") {
      return { mult: 0, fray: false, flat: 0 };
    }
    const lower = text.toLowerCase();
    // dice multiplier: "[D]", "2[D]", "3[d]"
    const diceMatch = lower.match(/(\d)?\s*\[d\]/);
    const mult = diceMatch ? (diceMatch[1] ? Number(diceMatch[1]) : 1) : 0;
    // fray flat bonus
    const includesFray = /\bfray\b/.test(lower);
    // explicit flat damage: "3 damage", "2 piercing damage"
    const flatMatch = lower.match(/(\d+)\s+(?:divine\s+|piercing\s+|true\s+)?damage/);
    const flat = flatMatch ? Number(flatMatch[1]) : 0;
    return { mult, fray: includesFray, flat };
  };

  // Primary hit: prefer `hitEffect`; fall back to description "On hit:" / "Autohit:" substring
  let hitText = s.hitEffect || "";
  if (!hitText && s.description) {
    const desc = s.description;
    const m = desc.match(/(?:on\s+hit|autohit)\s*[:]?\s*([^.]+)/i);
    if (m) hitText = m[1];
  }
  let hit = parseChunk(hitText);

  // Miss: prefer `missEffect`; fall back to "Miss:" in description
  let missText = s.missEffect || "";
  if (!missText && s.description) {
    const m = s.description.match(/miss\s*[:]\s*([^.]+)/i);
    if (m) missText = m[1];
  }
  const miss = parseChunk(missText);

  // Area: prefer `areaEffect`; fall back to "Area Effect:" in description
  let areaText = s.areaEffect || "";
  if (!areaText && s.description) {
    const m = s.description.match(/area\s*effect\s*[:]\s*([^.]+)/i);
    if (m) areaText = m[1];
  }
  let area = parseChunk(areaText);

  // Fallback: many legend/foe actions keep everything in `description` without
  // "On hit:" / "Miss:" / "Area Effect:" prefixes. If all per-outcome chunks
  // came up empty but the description has damage-shaped text, use it as the
  // hit chunk so the Damage button still shows.
  const anyDamage = (c) => c.mult > 0 || c.flat > 0 || c.fray;
  if (!anyDamage(hit) && !anyDamage(miss) && !anyDamage(area) && s.description) {
    const descChunk = parseChunk(s.description);
    if (anyDamage(descChunk)) hit = descChunk;
  }

  // Does this ability deal any damage at all?
  const dealsDamage = hit.mult > 0 || hit.flat > 0 || hit.fray ||
                       area.mult > 0 || area.flat > 0 || area.fray ||
                       miss.fray;

  return {
    isAttack,
    isAutoHit,
    dealsDamage,
    hit,    // { mult, fray, flat }
    miss,
    area,
  };
}

export class IconSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {

  /* -------------------------------------------------- */
  /*  Static config                                      */
  /* -------------------------------------------------- */

  static DEFAULT_OPTIONS = {
    classes: ["icon", "sheet", "actor", "icon-sheet"],
    position: { width: 820, height: 700 },
    window:   { resizable: true, controls: [PROTOTYPE_TOKEN_CONTROL, REFERENCE_CONTROL] },
    actions: {
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
      removeLooseGear: IconSheet.#onRemoveLooseGear,
      setXp:         IconSheet.#onSetXp,
      adjustXp:      IconSheet.#onAdjustXp,
      setWounds:        IconSheet.#onSetWounds,
      levelUp:          IconSheet.#onLevelUp,
      openLevelUp:      IconSheet.#onLevelUp,
      levelDown:        IconSheet.#onLevelDown,
      openCharCreation: IconSheet.#onOpenCharCreation,
      showHelp:         IconSheet.#onShowHelp,
      showReference:    IconSheet.#onShowReference,
      removeTraitItem:  IconSheet.#onRemoveTraitItem,
      removeItem:        IconSheet.#onRemoveItem,
      setPrimaryJob:     IconSheet.#onSetPrimaryJob,
      abilityShowInChat:  IconSheet.#onAbilityShowInChat,
      abilityAttackRoll:  IconSheet.#onAbilityAttackRoll,
      abilityDamageRoll:  IconSheet.#onAbilityDamageRoll,
      traitShowInChat:    IconSheet.#onTraitShowInChat,
      relicShowInChat:    IconSheet.#onRelicShowInChat,
      bondPowerShowInChat: IconSheet.#onBondPowerShowInChat,
      toggleBondPowerUse:  IconSheet.#onToggleBondPowerUse,
      resetSessionPowers:  IconSheet.#onResetSessionPowers,
      bondShowInChat:      IconSheet.#onBondShowInChat,
      useLimitBreak: IconSheet.#onUseLimitBreak,
      addJob:        IconSheet.#onAddJob,
      removeJob:     IconSheet.#onRemoveJob,
      // Class resources (conditional by primary job class)
      setVigilance:     IconSheet.#onSetVigilance,
      spendVigilance:   IconSheet.#onSpendVigilance,
      clearVigilance:   IconSheet.#onClearVigilance,
      clearStance:      IconSheet.#onClearStance,
      toggleComboToken: IconSheet.#onToggleComboToken,
      adjustBlessings:  IconSheet.#onAdjustBlessings,
      clearBlessings:   IconSheet.#onClearBlessings,
      adjustAether:     IconSheet.#onAdjustAether,
      adjustDust:       IconSheet.#onAdjustDust,
      upgradeRelic:     IconSheet.#onUpgradeRelic,
      infuseRelic:      IconSheet.#onInfuseRelic,
      refocus:          IconSheet.#onRefocus,
      toggleAbilitiesLock: IconSheet.#onToggleAbilitiesLock,
      toggleStatus:        IconSheet.#onToggleStatus,
      adjustElevation:     IconSheet.#onAdjustElevation,
      adjustStatusCharges: IconSheet.#onAdjustStatusCharges,
      rollSave:            IconSheet.#onRollSave,
      addPowerDie:      IconSheet.#onAddPowerDie,
      tickPowerDie:     IconSheet.#onTickPowerDie,
      removePowerDie:   IconSheet.#onRemovePowerDie,
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

  /**
   * With `submitOnChange: true`, every form change re-serialises the whole
   * form and rebuilds array fields wholesale. Several array sub-fields have
   * NO form input — `jobs[].primary`, `jobs[].templateUuid`, and the burden/
   * ambition `clock.value` (it's driven by clickable segments, not an input).
   * Without intervention the ArrayField rebuild resets those to their schema
   * defaults on every submit. Symptoms reported in play:
   *   - typing HP manually wiped the primary-job flag → Vigilance/Aether/
   *     Blessing trackers and class-rule reminders vanished;
   *   - burden/ambition clocks couldn't be ticked and interlude healing
   *     "didn't stick".
   * Restore those fields from the live document before the update is applied.
   * (Adds/removes/Set-as-Primary all go through dedicated action handlers with
   * direct updates, so during a form submit the array lengths match the doc.)
   * @override
   */
  _prepareSubmitData(event, form, formData, updateData) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);

    const jobsSub  = foundry.utils.getProperty(submitData, "system.combat.jobs");
    const jobsLive = this.document.system.combat?.jobs ?? [];
    if (Array.isArray(jobsSub)) {
      jobsSub.forEach((job, i) => {
        if (!jobsLive[i] || !job) return;
        job.primary      = jobsLive[i].primary;
        job.templateUuid = jobsLive[i].templateUuid;
      });
    }

    for (const key of ["burdens", "ambitions"]) {
      const sub  = foundry.utils.getProperty(submitData, `system.narrative.${key}`);
      const live = this.document.system.narrative?.[key] ?? [];
      if (!Array.isArray(sub)) continue;
      sub.forEach((entry, i) => {
        if (entry?.clock && live[i]?.clock) entry.clock.value = live[i].clock.value;
      });
    }

    return submitData;
  }

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
    context.masterySpent     = masterySpent;
    context.masteryTotal     = masteryTotal;
    context.masteryFree      = Math.max(0, masteryTotal - masterySpent);
    context.masteryOverspent = masterySpent > masteryTotal;

    // Skill Rank counter — total pool granted by level-up (action improvements
    // from advancement table p. 241) vs. dots actually spent across the 10
    // narrative actions. Editable manually like apTotal/masteries.
    const skillRanksTotal = system.combat?.skillRanksTotal ?? 0;
    const actionsMap      = system.narrative?.actions ?? {};
    const skillRanksSpent = Object.values(actionsMap).reduce((sum, v) => sum + (Number(v) || 0), 0);
    context.skillRanksTotal     = skillRanksTotal;
    context.skillRanksSpent     = skillRanksSpent;
    context.skillRanksFree      = Math.max(0, skillRanksTotal - skillRanksSpent);
    context.skillRanksOverspent = skillRanksSpent > skillRanksTotal;

    // Enriched detail view for each equipped ability — rendered as hidden
    // preview panels under the ability slots grid in the Combat tab. Click on
    // a slot toggles the matching panel.
    context.abilityDetails = await Promise.all(context.abilityItems.map(async a => {
      const s = a.system ?? {};
      const talentSelected  = s.talentSelected ?? 0;
      const masteryUnlocked = !!s.masteryUnlocked;
      const parsed = _parseAbilityDamage(s);
      return {
        id:          a.id,
        name:        a.name,
        jobName:     s.jobName ?? "",
        class:       s.class ?? "",
        cost:        s.cost ?? "",
        chapter:     s.chapter ?? 1,
        tags:        (s.tags ?? []).map(formatTag).filter(Boolean),
        talentSelected,
        masteryUnlocked,
        // Parsed combat data — drives which buttons show and pre-fills dialogs
        isAttack:    parsed.isAttack,
        isAutoHit:   parsed.isAutoHit,
        dealsDamage: parsed.dealsDamage,
        description:         await enrichHTML(s.description),
        hitEffect:           await enrichHTML(s.hitEffect),
        missEffect:          await enrichHTML(s.missEffect),
        areaEffect:          await enrichHTML(s.areaEffect),
        chargeEffect:        await enrichHTML(s.chargeEffect),
        heroicEffect:        await enrichHTML(s.heroicEffect),
        exceedEffect:        await enrichHTML(s.exceedEffect),
        collideEffect:       await enrichHTML(s.collideEffect),
        slayEffect:          await enrichHTML(s.slayEffect),
        critEffect:          await enrichHTML(s.critEffect),
        finishingBlowEffect: await enrichHTML(s.finishingBlowEffect),
        comebackEffect:      await enrichHTML(s.comebackEffect),
        talent1:             await enrichHTML(s.talent1),
        talent2:             await enrichHTML(s.talent2),
        mastery:             await enrichHTML(s.mastery),
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
        comboEffect: await enrichHTML(s.comboEffect),
        hasCombo:    !!(s.isCombo && s.comboEffect && s.comboEffect.trim()),
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
        hasDesc:    !!(s.description && s.description.trim()),
      };
    }));

    // Relic items — enriched detail view for the Relics tab.
    // We can't access RelicData SchemaField descriptions directly in Handlebars
    // reliably, so build plain objects with pre-enriched HTML here.
    const rawRelics = actor.items.filter(i => i.type === "relic");
    const dustPool  = system.narrative?.dust ?? 0;
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
      };
    }));
    context.dustPool = dustPool;

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
    context.traitItems = await Promise.all(rawTraits.map(async t => {
      const chapter = t.system?.chapter ?? 1;
      return {
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

    // Combo token — active when a vagabond (or any class with combo abilities)
    // has earned their combo token. Drives the combo display on ability previews.
    context.comboActive = (system.combat?.classResources?.comboToken?.value ?? 0) === 1;

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
    context.conditions = {
      negative: markActive(groups.negative),
      positive: markActive(groups.positive),
      special:  markActive(groups.special),
    };

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

  _onRender(context, options) {
    _log(`_onRender — actor: "${this.document.name}" | activeTab: ${this.tabGroups.primary}`);
    super._onRender(context, options);

    for (const [group, tabId] of Object.entries(this.tabGroups)) {
      _log(`_onRender — changeTab("${tabId}", "${group}")`);
      this.changeTab(tabId, group, { initial: true });
    }

    const html = this.element;

    // Global drop handler — bind ONCE per element. `this.element` persists
    // across re-renders in ApplicationV2, so without this guard every render
    // would stack another listener on top, causing a single drop to fire N
    // times after N renders (observed as duplicate items embedded).
    if (!html.dataset.iconDropBound) {
      html.dataset.iconDropBound = "true";
      html.addEventListener("dragover", ev => ev.preventDefault());
      html.addEventListener("drop",     ev => this.#onDrop(ev));
    }

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

    // Item link dblclick — guarded per element.
    html.querySelectorAll("[data-item-id]").forEach(el => {
      if (el.dataset.iconDblBound) return;
      el.dataset.iconDblBound = "true";
      el.addEventListener("dblclick", ev => {
        const item = this.document.items.get(el.dataset.itemId);
        _log(`dblclick item — id: "${el.dataset.itemId}" | found: ${!!item}`);
        item?.sheet.render(true);
      });
    });

    // Portrait img picker — V2 sheets don't auto-bind data-edit="img" the way
    // V1 did, so wire a click handler that opens FilePicker on the IMG element.
    html.querySelectorAll('img[data-edit="img"]').forEach(img => {
      if (img.dataset.iconImgBound) return;
      img.dataset.iconImgBound = "true";
      img.style.cursor = "pointer";
      img.addEventListener("click", ev => {
        if (!this.isEditable) return;
        ev.preventDefault();
        const current = this.document.img;
        new foundry.applications.apps.FilePicker.implementation({
          type: "image",
          current,
          callback: path => {
            _log(`portrait — picked: "${path}"`);
            this.document.update({ img: path });
          },
          top: this.position.top + 40,
          left: this.position.left + 10,
        }).browse();
      });
    });

    // Elevation button (Conditions tab) — V2 actions only fire on click,
    // so wire the contextmenu (right-click) handler manually to decrement.
    html.querySelectorAll('button[data-action="adjustElevation"]').forEach(btn => {
      if (btn.dataset.iconCtxBound) return;
      btn.dataset.iconCtxBound = "true";
      btn.addEventListener("contextmenu", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!this.isEditable) return;
        const actor = this.document;
        const current = actor.getFlag("icon-system", "elevation") ?? 0;
        const next = current - 1;
        _log(`adjustElevation (right-click) — actor: "${actor.name}" | ${current} → ${next}`);
        await actor.setFlag("icon-system", "elevation", next);
        if (next !== 0 && !hasStatus(actor, "elevation")) {
          await applyStatus(actor, "elevation");
        } else if (next === 0 && hasStatus(actor, "elevation")) {
          await removeStatus(actor, "elevation");
        }
      });
    });

    // Stackable-status buttons (Blessed, Power Die, Vigilance) — right-click decrements.
    html.querySelectorAll('button[data-action="adjustStatusCharges"]').forEach(btn => {
      if (btn.dataset.iconCtxBound) return;
      btn.dataset.iconCtxBound = "true";
      btn.addEventListener("contextmenu", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!this.isEditable) return;
        const statusId = btn.dataset.statusId;
        if (!statusId) return;
        const next = await adjustStatusCharges(this.document, statusId, -1);
        _log(`adjustStatusCharges (right-click) — "${statusId}" → ${next}`);
      });
    });

    // Regular status toggles — right-click applies the + (ongoing) version.
    html.querySelectorAll('button[data-action="toggleStatus"]').forEach(btn => {
      if (btn.dataset.iconCtxBound) return;
      btn.dataset.iconCtxBound = "true";
      btn.addEventListener("contextmenu", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!this.isEditable) return;
        const statusId = btn.dataset.statusId;
        if (!statusId) return;
        const state = await cycleOngoingStatus(this.document, statusId);
        _log(`cycleOngoingStatus (right-click) — "${statusId}" → ${state}`);
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

    const result = await IconSheet.#promptNarrativeRoll({ label, rating, effort });
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
   * Show the pre-roll dialog for a narrative action. Returns an object
   * `{ boons, curses, pushEffort }` or `null` if the user cancels.
   *
   * The dialog shows a live preview of the effective dice pool and warns
   * when pushing effort would be wasted (boons already at the ±2 cap).
   */
  static async #promptNarrativeRoll({ label, rating, effort }) {
    const canPush = effort.value > 0;
    const difficultyHouseRule = game.settings.get("icon-system", "hrNarrativeDifficultyVariants");
    const rollTypeRow = difficultyHouseRule ? `
        <div class="icon-roll-dialog__row">
          <label for="iconRollType">Roll Type</label>
          <select id="iconRollType" name="rollType">
            <option value="standard" selected>Standard  (1-3 fail / 4-5 partial / 6 success)</option>
            <option value="heroic">Heroic  (1-4 fail / 5 partial / 6 success)</option>
            <option value="routine">Routine  (1-2 fail / 3-4 partial / 5-6 success)</option>
          </select>
        </div>
    ` : `
        <input type="hidden" name="rollType" value="standard">
    `;
    const content = `
      <form class="icon-roll-dialog">
        <p>Rolling <strong>${label}</strong> — rating <strong>${rating}</strong>.</p>
        ${rollTypeRow}
        <div class="icon-roll-dialog__row">
          <label for="iconBoons">Boons <small>(+1d6 each)</small></label>
          <input type="number" id="iconBoons" name="boons" value="0" min="0" max="5">
        </div>
        <div class="icon-roll-dialog__row">
          <label for="iconCurses">Curses <small>(−1d6 each)</small></label>
          <input type="number" id="iconCurses" name="curses" value="0" min="0" max="5">
        </div>
        <div class="icon-roll-dialog__row icon-roll-dialog__row--check">
          <label>
            <input type="checkbox" name="pushEffort" ${canPush ? "" : "disabled"}>
            Push Effort (−1 effort, +1 boon)
            <small>${canPush ? `Current effort: ${effort.value}/${effort.max}` : "No effort available"}</small>
          </label>
        </div>
        <div class="icon-roll-dialog__preview" data-rating="${rating}">
          <div class="icon-roll-dialog__pool"></div>
          <div class="icon-roll-dialog__thresholds"></div>
          <div class="icon-roll-dialog__warn"></div>
          <div class="icon-roll-dialog__note">
            <small>Boons and curses cap at <strong>±2</strong> net. Push Effort adds an extra die <strong>on top</strong> of the cap.</small>
          </div>
        </div>
      </form>
    `;

    // Thresholds by roll type — kept in sync with ROLL_THRESHOLDS in rolls.mjs.
    const THRESHOLDS = {
      standard: { success: 6, partial: 4, desc: "1-3 fail / 4-5 partial / 6 success" },
      heroic:   { success: 6, partial: 5, desc: "1-4 fail / 5 partial / 6 success" },
      routine:  { success: 5, partial: 3, desc: "1-2 fail / 3-4 partial / 5-6 success" },
    };

    // Hook the next DialogV2 render to wire up the live preview — fires once.
    Hooks.once("renderDialogV2", (app, html) => {
      const form = html.querySelector("form.icon-roll-dialog");
      if (!form) return;

      const typeEl     = form.elements.rollType;
      const boonsEl    = form.elements.boons;
      const cursesEl   = form.elements.curses;
      const pushEl     = form.elements.pushEffort;
      const poolEl     = form.querySelector(".icon-roll-dialog__pool");
      const threshEl   = form.querySelector(".icon-roll-dialog__thresholds");
      const warnEl     = form.querySelector(".icon-roll-dialog__warn");

      const update = () => {
        const rollType  = typeEl?.value || "standard";
        const t         = THRESHOLDS[rollType] ?? THRESHOLDS.standard;
        const rawBoons  = Math.max(0, Number(boonsEl.value)  || 0);
        const rawCurses = Math.max(0, Number(cursesEl.value) || 0);
        const pushBonus = pushEl?.checked ? 1 : 0;
        // Boons/curses cap to ±2 net; push is added on top as bonus die.
        const netRaw    = rawBoons - rawCurses;
        const netCapped = Math.max(-2, Math.min(2, netRaw));
        const effectivePool = Math.max(0, rating + netCapped + pushBonus);
        const isLowest  = effectivePool === 0;

        const netLabel  = netCapped > 0 ? `+${netCapped}` : `${netCapped}`;
        const pushLabel = pushBonus ? ` +1 <span class="icon-roll-dialog__push">push</span>` : "";
        poolEl.innerHTML = isLowest
          ? `<strong>Effective pool:</strong> 2d6 pick lowest <em>(rating ${rating} ${netLabel}${pushLabel} = 0)</em>`
          : `<strong>Effective pool:</strong> ${effectivePool}d6 pick highest <em>(rating ${rating} ${netLabel}${pushLabel})</em>`;

        threshEl.innerHTML = `<strong>${rollType[0].toUpperCase()}${rollType.slice(1)} thresholds:</strong> ${t.desc}`;

        // Warn when boons/curses exceed the cap (push is separate and always works).
        const warnings = [];
        if (netRaw > 2) {
          warnings.push(`⚠ Net would be +${netRaw}, capped at +2. Extra boons wasted.`);
        } else if (netRaw < -2) {
          warnings.push(`⚠ Net would be ${netRaw}, capped at −2. Extra curses wasted.`);
        }
        warnEl.innerHTML = warnings.map(w => `<div>${w}</div>`).join("");
      };

      typeEl  ?.addEventListener("change", update);
      boonsEl  .addEventListener("input",  update);
      cursesEl .addEventListener("input",  update);
      pushEl  ?.addEventListener("change", update);
      update();
    });

    try {
      return await foundry.applications.api.DialogV2.prompt({
        window: { title: `Narrative Roll — ${label}` },
        content,
        modal: true,
        rejectClose: false,
        ok: {
          label: "🎲 Roll",
          callback: (event, button) => {
            const form = button.form;
            return {
              rollType:   form.elements.rollType?.value || "standard",
              boons:      Math.max(0, Number(form.elements.boons.value)  || 0),
              curses:     Math.max(0, Number(form.elements.curses.value) || 0),
              pushEffort: !!form.elements.pushEffort?.checked,
            };
          },
        },
      });
    } catch {
      return null;
    }
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

  /** Add an empty loose-gear slot (max 2). */
  static async #onAddLooseGear(event, target) {
    const gear = foundry.utils.deepClone(this.document.system.narrative.looseGear ?? []);
    if (gear.length >= 2) { _log(`addLooseGear — BLOCKED (max 2)`); return; }
    gear.push("");
    _log(`addLooseGear — actor: "${this.document.name}" | count: ${gear.length}`);
    await this.document.update({ "system.narrative.looseGear": gear });
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

  /** Open the rules reference (turn schema + glossary of triggers/keywords). */
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
  async _getAbilityDetail(itemId) {
    const item = this.document.items.get(itemId);
    if (!item) return null;
    const s = item.system ?? {};
    const parsed = _parseAbilityDamage(s);
    return {
      id:          item.id,
      name:        item.name,
      jobName:     s.jobName ?? "",
      class:       s.class ?? "",
      cost:        s.cost ?? "",
      chapter:     s.chapter ?? 1,
      tags:        (s.tags ?? []).map(formatTag).filter(Boolean),
      talentSelected:  s.talentSelected ?? 0,
      masteryUnlocked: !!s.masteryUnlocked,
      isAttack:    parsed.isAttack,
      isAutoHit:   parsed.isAutoHit,
      dealsDamage: parsed.dealsDamage,
      parsed,
      description:         await enrichHTML(s.description),
      hitEffect:           await enrichHTML(s.hitEffect),
      missEffect:          await enrichHTML(s.missEffect),
      areaEffect:          await enrichHTML(s.areaEffect),
      chargeEffect:        await enrichHTML(s.chargeEffect),
      heroicEffect:        await enrichHTML(s.heroicEffect),
      exceedEffect:        await enrichHTML(s.exceedEffect),
      collideEffect:       await enrichHTML(s.collideEffect),
      slayEffect:          await enrichHTML(s.slayEffect),
      critEffect:          await enrichHTML(s.critEffect),
      finishingBlowEffect: await enrichHTML(s.finishingBlowEffect),
      comebackEffect:      await enrichHTML(s.comebackEffect),
      talent1:             await enrichHTML(s.talent1),
      talent2:             await enrichHTML(s.talent2),
      mastery:             await enrichHTML(s.mastery),
      hasDesc:     !!(s.description && s.description.trim()),
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
      comboEffect: await enrichHTML(s.comboEffect),
      hasCombo:    !!(s.isCombo && s.comboEffect && s.comboEffect.trim()),
      // Only show a talent in chat once it has actually been unlocked/selected.
      // talentSelected: 0 = none unlocked, 1 = Talent I, 2 = Talent II.
      hasTalent1: !!(s.talent1 && s.talent1.trim()) && (s.talentSelected ?? 0) === 1,
      hasTalent2: !!(s.talent2 && s.talent2.trim()) && (s.talentSelected ?? 0) === 2,
      hasMastery: !!(s.mastery && s.mastery.trim()) && !!s.masteryUnlocked,
    };
  }

  /** Post the full ability card to chat. When the combo token is active and the
   *  ability has a combo version, posts the combo variant and consumes the token. */
  static async #onAbilityShowInChat(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId;
    const ab = await this._getAbilityDetail(itemId);
    if (!ab) return;

    const comboActive = (this.document.system.combat?.classResources?.comboToken?.value ?? 0) === 1;
    const comboMode   = comboActive && ab.hasCombo;
    _log(`abilityShowInChat — "${ab.name}" | comboMode: ${comboMode}`);

    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/ability-card.hbs", { ab, comboMode });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content,
    });

    if (comboMode) {
      await this.document.update({ "system.combat.classResources.comboToken.value": 0 });
    }
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

    const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTemplate("systems/icon-system/templates/chat/trait-card.hbs", { tr });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.document }),
      content,
    });
  }

  /** Post a relic card to chat (only the unlocked ranks are shown). */
  static async #onRelicShowInChat(event, target) {
    event.stopPropagation();
    const item = this.document.items.get(target.dataset.itemId);
    if (!item) return;
    _log(`relicShowInChat — "${item.name}"`);

    const s = item.system ?? {};
    const currentRank = s.currentRank ?? 1;
    const rl = {
      name:            item.name,
      invokeType:      s.invokeType ?? "",
      invokeCondition: s.invokeCondition ?? "",
      invokeEffect:    await enrichHTML(s.invokeEffect),
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
   * Prompt for boons/curses/defense, then roll the attack via combatRoll.
   * - If the ability isn't an attack → warn and stop.
   * - If it's an auto-hit → skip the d20 and post a "Auto-hit" chat notice,
   *   then hand off to the damage roll.
   */
  static async #onAbilityAttackRoll(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId;
    const ab = await this._getAbilityDetail(itemId);
    if (!ab) return;
    _log(`abilityAttackRoll — "${ab.name}" | isAttack: ${ab.isAttack} | autoHit: ${ab.isAutoHit}`);

    if (!ab.isAttack) {
      ui.notifications.warn(`"${ab.name}" is not an attack ability — it doesn't require an attack roll.`);
      return;
    }

    if (ab.isAutoHit) {
      // Auto-hit: no d20 roll, just announce and (optionally) chain into damage
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.document }),
        content: `<div class="icon-chat-card icon-chat-card--autohit">
                    <div class="icon-chat-card__header">
                      <strong>${escapeHTML(ab.name)}</strong>
                      <span class="icon-badge icon-badge--primary">Auto-hit</span>
                    </div>
                    <p>This attack ignores the attack roll and goes directly to damage.</p>
                  </div>`,
      });
      // Chain into damage if the ability deals damage
      if (ab.dealsDamage) {
        await IconSheet.#onAbilityDamageRoll.call(this, event, target);
      }
      return;
    }

    const mods = await IconSheet.#promptAttackMods(ab, this.document);
    if (!mods) return;

    await combatRoll({
      abilityName:  ab.name,
      costLabel:    ab.cost,
      // `ab.tags` is an array of {raw, label, tooltip} — combatRoll expects plain strings
      tags:         ab.tags.map(t => t.label ?? t.raw ?? ""),
      boons:        mods.boons,
      curses:       mods.curses,
      defense:      mods.defense,
      hitEffect:    ab.hitEffect,
      missEffect:   ab.missEffect,
      exceedEffect: ab.exceedEffect,
      critEffect:   ab.critEffect,
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
    const ab = await this._getAbilityDetail(itemId);
    if (!ab) return;
    const combat = this.document.system.combat;
    _log(`abilityDamageRoll — "${ab.name}" | parsed:`, ab.parsed);

    if (!ab.dealsDamage) {
      ui.notifications.warn(`"${ab.name}" does not deal damage.`);
      return;
    }

    const mods = await IconSheet.#promptDamageMods(ab, combat);
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
      targetName:  mods.targetName,
    });

    _log(`abilityDamageRoll — "${ab.name}" | outcome: ${mods.outcome}`);
  }

  /** Minimal dialog for attack-roll modifiers. Pre-fills boons/curses from
   *  any active statuses on the actor (Dazed → +1 curse, etc.) and the target
   *  defense from the currently-targeted token, then shows a transparent
   *  breakdown so the player knows where the numbers came from. */
  static async #promptAttackMods(ab, actor) {
    const auto = getActorStatusMods(actor);
    // Auto-detect target defense: if exactly one token is targeted, use its
    // defense. Multiple targets → use the lowest (most permissive). PCs use
    // system.combat.defense; foes/legends use system.defense.
    const targets = Array.from(game.user?.targets ?? []);
    let autoDefense = "";
    let targetNote = "";
    if (targets.length > 0) {
      const defenses = targets.map(t => {
        const a = t.actor;
        return a?.system?.combat?.defense ?? a?.system?.defense ?? null;
      }).filter(d => d != null);
      if (defenses.length) {
        autoDefense = Math.min(...defenses);
        const names = targets.map(t => t.actor?.name ?? "?").join(", ");
        targetNote = `<p style="margin:0;font-size:.85em;color:#7fb2ff;border-left:3px solid #7fb2ff;padding-left:6px">🎯 Target: ${names} (DEF ${autoDefense})</p>`;
      }
    }

    // Auto-detect elevation difference (manual p.89):
    //   • Attacker HIGHER than target → +1 boon per level (height advantage)
    //   • Attacker LOWER  than target → +1 curse per level (height disadvantage)
    // Reads `flags.icon-system.elevation` from each actor (set via the
    // Conditions tab elevation button). Falls back to `token.elevation` if
    // the flag is missing, so existing tokens with elevation set still work.
    const readEl = (a, tok) => a?.getFlag?.("icon-system", "elevation")
                              ?? tok?.document?.elevation
                              ?? 0;
    const sourceToken = canvas?.tokens?.controlled?.find(t => t.actor?.id === actor.id)
                     ?? actor.getActiveTokens?.()?.[0]
                     ?? null;
    let elevationBoons  = 0;
    let elevationCurses = 0;
    let elevationNote = "";
    if (targets.length > 0) {
      const srcEl = readEl(actor, sourceToken);
      const elDiffs = targets.map(t => srcEl - readEl(t.actor, t));
      const worstDiff = Math.min(...elDiffs);
      const bestDiff  = Math.max(...elDiffs);
      if (worstDiff < 0) {
        elevationCurses = Math.abs(worstDiff);
        elevationNote = `Height disadvantage Δ${elevationCurses}: +${elevationCurses} curse${elevationCurses > 1 ? "s" : ""}`;
      } else if (bestDiff > 0) {
        elevationBoons = bestDiff;
        elevationNote = `Height advantage Δ${elevationBoons}: +${elevationBoons} boon${elevationBoons > 1 ? "s" : ""}`;
      }
    }

    const totalBoons  = auto.boons  + elevationBoons;
    const totalCurses = auto.curses + elevationCurses;
    const allNotes = [...auto.notes];
    if (elevationNote) allNotes.push(elevationNote);
    const noteHtml = allNotes.length
      ? `<p style="margin:0;font-size:.85em;color:#c4a64f;border-left:3px solid #c4a64f;padding-left:6px">⚠ Auto-applied: ${allNotes.join(" • ")}</p>`
      : "";
    const content = `
      <div style="display:flex; flex-direction:column; gap:6px; padding:4px 0">
        <p style="margin:0"><strong>${ab.name}</strong> — ${ab.cost}</p>
        ${targetNote}
        ${noteHtml}
        <label>Boons:  <input type="number" name="boons" value="${totalBoons}" min="0" max="9" style="width:60px"></label>
        <label>Curses: <input type="number" name="curses" value="${totalCurses}" min="0" max="9" style="width:60px"></label>
        <label>Target Defense: <input type="number" name="defense" value="${autoDefense}" min="0" placeholder="(optional)" style="width:80px"></label>
      </div>
    `;
    try {
      return await foundry.applications.api.DialogV2.prompt({
        window:   { title: `Attack: ${ab.name}` },
        content,
        ok: {
          label: "Roll Attack",
          callback: (_e, button, dialog) => {
            const root = button?.form ?? dialog?.element ?? dialog;
            const defenseVal = root.querySelector('input[name="defense"]')?.value;
            return {
              boons:   Number(root.querySelector('input[name="boons"]')?.value ?? 0),
              curses:  Number(root.querySelector('input[name="curses"]')?.value ?? 0),
              defense: defenseVal ? Number(defenseVal) : null,
            };
          },
        },
        rejectClose: false,
      });
    } catch { return null; }
  }

  /** Minimal dialog for damage-roll modifiers. */
  static async #promptDamageMods(ab, combat) {
    const p = ab.parsed ?? { hit: {}, miss: {}, area: {} };
    // Build human-readable formula strings from parsed data
    const fmtChunk = (c, label) => {
      const parts = [];
      if (c.mult > 0) parts.push(`${c.mult}[${combat.damagedie}]`);
      if (c.fray)     parts.push(`fray (${combat.fray})`);
      if (c.flat)     parts.push(`${c.flat} flat`);
      return parts.length ? `${label}: ${parts.join(" + ")}` : null;
    };
    const hitLabel  = fmtChunk(p.hit, "Hit")   || "Hit: (no damage)";
    const critLabel = p.hit.mult > 0 ? `Crit: ${p.hit.mult + 1}[${combat.damagedie}]${p.hit.fray ? ` + fray (${combat.fray})` : ""}` : "Crit: (no damage)";
    const missLabel = fmtChunk(p.miss, "Miss") || "Miss: (no damage)";
    const areaLabel = fmtChunk(p.area, "Area") || null;

    const content = `
      <div style="display:flex; flex-direction:column; gap:6px; padding:4px 0">
        <p style="margin:0"><strong>${ab.name}</strong>${ab.isAutoHit ? ' <span class="icon-badge icon-badge--primary">Auto-hit</span>' : ""}</p>
        <label>Outcome:
          <select name="outcome">
            <option value="hit"  selected>${hitLabel}</option>
            ${p.hit.mult > 0 ? `<option value="crit">${critLabel}</option>` : ""}
            ${missLabel !== "Miss: (no damage)" ? `<option value="miss">${missLabel}</option>` : ""}
            ${areaLabel ? `<option value="area">${areaLabel}</option>` : ""}
          </select>
        </label>
        <label>Target name: <input type="text" name="targetName" value="" style="width:140px"></label>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <label title="Extra [D] dice added to the pool. Top N are summed where N = base dice count.">
            Bonus Damage: <input type="number" name="bonusDice" value="0" min="0" max="5" style="width:50px">
          </label>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <label><input type="checkbox" name="vulnerable"> Vulnerable (+1)</label>
          <label><input type="checkbox" name="resistance"> Resistance (½)</label>
          <label><input type="checkbox" name="weakened"> Weakened (−2)</label>
        </div>
        <p style="margin:2px 0 0; font-size:0.76em; color:var(--ic-text-dim); line-height:1.4">
          <em>Bonus Damage:</em> add K extra [D] to the pool, then sum the top N
          (where N = base dice count). Example: 2[D] + 1 bonus → roll 3 dice, sum the 2 highest.
        </p>
      </div>
    `;
    try {
      return await foundry.applications.api.DialogV2.prompt({
        window:   { title: `Damage: ${ab.name}` },
        content,
        ok: {
          label: "Roll Damage",
          callback: (_e, button, dialog) => {
            const root = button?.form ?? dialog?.element ?? dialog;
            return {
              outcome:    root.querySelector('select[name="outcome"]')?.value ?? "hit",
              targetName: root.querySelector('input[name="targetName"]')?.value ?? "",
              bonusDice:  Number(root.querySelector('input[name="bonusDice"]')?.value ?? 0),
              vulnerable: !!root.querySelector('input[name="vulnerable"]')?.checked,
              resistance: !!root.querySelector('input[name="resistance"]')?.checked,
              weakened:   !!root.querySelector('input[name="weakened"]')?.checked,
            };
          },
        },
        rejectClose: false,
      });
    } catch { return null; }
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

  static async #onUseLimitBreak(event, target) {
    const lb = this.document.items.find(i => i.type === "limit-break");
    if (!lb) { _log(`useLimitBreak — BLOCKED: no limit-break item`); return ui.notifications.warn("No Limit Break equipped."); }
    const cost    = lb.system.resolveCost;
    const resolve = this.document.system.combat.resolve;
    const total   = resolve.personal + resolve.party;
    _log(`useLimitBreak — actor: "${this.document.name}" | lb: "${lb.name}" | cost: ${cost} | resolve: ${total} (personal: ${resolve.personal}, party: ${resolve.party})`);
    if (total < cost) { _log(`useLimitBreak — BLOCKED: not enough resolve`); return ui.notifications.warn(`Need ${cost} Resolve (have ${total}).`); }
    const partySpend    = Math.min(resolve.party, cost);
    const personalSpend = cost - partySpend;
    await this.document.update({
      "system.combat.resolve.party":    resolve.party    - partySpend,
      "system.combat.resolve.personal": resolve.personal - personalSpend,
    });
    const speaker = ChatMessage.getSpeaker({ actor: this.document });
    await ChatMessage.create({ speaker, content: `<strong>${escapeHTML(this.document.name)}</strong> uses <em>${escapeHTML(lb.name)}</em>!<br>${lb.system.effect ?? ""}` });
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
   * Stalwart — spend Vigilance charges. Prompts for how many charges to spend,
   * rolls 1d6 per charge, posts the total to chat as a damage reduction, and
   * deducts the spent charges from the tracker. (Manual: spend any number of
   * charges to reduce damage to an ally in range 2, or damage foes breaking
   * adjacency — each charge is a d6.)
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
          Each spent charge rolls 1d6; the total reduces damage.</p>
        <label>Charges to spend:
          <input type="number" name="charges" value="${cur}" min="1" max="${cur}" style="width:60px">
        </label>
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
            return Math.max(1, Math.min(cur, n));
          },
        },
        rejectClose: false,
      });
    } catch { return; }
    if (!spend) return;

    const roll = await new Roll(`${spend}d6`).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor:  `Vigilance — spent ${spend} ${spend === 1 ? "charge" : "charges"}: reduce damage by ${roll.total}`,
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
    await this.document.update({ "system.combat.classResources.comboToken.value": next });
  }

  /** Mendicant — +/- blessing tokens (clamped to ≥ 0). */
  static async #onAdjustBlessings(event, target) {
    const delta   = Number(target.dataset.delta) || 0;
    const current = this.document.system.combat.classResources.blessingTokens.value ?? 0;
    const next    = Math.max(0, current + delta);
    _log(`adjustBlessings — actor: "${this.document.name}" | ${current} → ${next}`);
    await this.document.update({ "system.combat.classResources.blessingTokens.value": next });
  }

  /** Mendicant — clear blessing tokens to 0. */
  static async #onClearBlessings(event, target) {
    _log(`clearBlessings — actor: "${this.document.name}"`);
    await this.document.update({ "system.combat.classResources.blessingTokens.value": 0 });
  }

  /** Wright — +/- aether (clamped to ≥ 0). */
  static async #onAdjustAether(event, target) {
    const delta   = Number(target.dataset.delta) || 0;
    const current = this.document.system.combat.classResources.aether.value ?? 0;
    const next    = Math.max(0, current + delta);
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
      ui.notifications.warn("Equipped abilities are locked. Click the 🔒 to unlock.");
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
      ui.notifications.warn("Equipped abilities are locked. Click the 🔒 to unlock.");
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

  /**
   * Save roll button: prompt for status name and offer to spend a Mendicant
   * blessing token for +1 boon, then roll a save (1d20 + boons, 10+ = success).
   * If the actor has no blessing tokens, the checkbox is hidden.
   */
  static async #onRollSave(event, target) {
    const actor = this.document;
    const blessings = getStatusCharges(actor, "blessed");
    const blessingHtml = blessings > 0
      ? `<label style="display:flex;align-items:center;gap:6px;padding:4px 0">
          <input type="checkbox" name="useBlessing"> Use Blessing (+1 boon, you have ${blessings})
         </label>`
      : `<p class="notes" style="margin:0;font-size:.85em;color:#888">Not blessed (apply Blessed in the Conditions tab to gain a charge).</p>`;
    const content = `
      <div style="display:flex;flex-direction:column;gap:6px;padding:4px 0">
        <label>Status: <input type="text" name="statusLabel" value="status" style="width:160px"></label>
        <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" name="ongoing"> Ongoing+ (auto-fail)</label>
        ${blessingHtml}
      </div>
    `;
    let result;
    try {
      result = await foundry.applications.api.DialogV2.prompt({
        window: { title: `Save Roll — ${actor.name}` },
        content,
        ok: {
          label: "Roll Save",
          callback: (_e, button, dialog) => {
            const root = button?.form ?? dialog?.element ?? dialog;
            return {
              statusLabel: root.querySelector('input[name="statusLabel"]')?.value || "status",
              ongoing:     !!root.querySelector('input[name="ongoing"]')?.checked,
              useBlessing: !!root.querySelector('input[name="useBlessing"]')?.checked,
            };
          },
        },
        rejectClose: false,
      });
    } catch { return; }
    if (!result) return;

    let boons = 0;
    let boonNote = "";
    if (result.useBlessing && blessings > 0) {
      boons = 1;
      boonNote = "blessing";
      // Consume one Blessed charge — auto-removes the status when count → 0
      await adjustStatusCharges(actor, "blessed", -1);
    }

    _log(`rollSave — actor: "${actor.name}" | status: "${result.statusLabel}" | ongoing: ${result.ongoing} | blessing: ${result.useBlessing}`);
    await saveRoll({
      statusLabel: result.statusLabel,
      ongoing:     result.ongoing,
      boons,
      boonNote,
      actor,
    });
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
      // All refocus modes refund skill ranks: zero every action dot and
      // reset the pool so the player re-spends from scratch. skillRanksTotal
      // is regranted at the next level-up, but a manual-edited value would
      // be lost on refocus — which matches the refund semantics of AP/Mastery.
      "system.combat.skillRanksTotal":     0,
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

  /** Wright — add a new power die with ticks = 1. */
  static async #onAddPowerDie(event, target) {
    const dice = foundry.utils.deepClone(this.document.system.combat.classResources.powerDice ?? []);
    const id   = foundry.utils.randomID(8);
    dice.push({ id, ticks: 1 });
    _log(`addPowerDie — actor: "${this.document.name}" | id: ${id} | total: ${dice.length}`);
    await this.document.update({ "system.combat.classResources.powerDice": dice });
  }

  /**
   * Wright — adjust a power die's ticks. If ticks drop to 0 or below, the
   * die is consumed (removed from the array).
   */
  static async #onTickPowerDie(event, target) {
    const id    = target.dataset.id;
    const delta = Number(target.dataset.delta) || 0;
    const dice  = foundry.utils.deepClone(this.document.system.combat.classResources.powerDice ?? []);
    const idx   = dice.findIndex(d => d.id === id);
    if (idx < 0) { _log(`tickPowerDie — BLOCKED: no die with id "${id}"`); return; }
    const nextTicks = dice[idx].ticks + delta;
    if (nextTicks <= 0) {
      dice.splice(idx, 1);
      _log(`tickPowerDie — consumed | id: ${id} | remaining: ${dice.length}`);
    } else {
      dice[idx].ticks = nextTicks;
      _log(`tickPowerDie — id: ${id} | ${dice[idx].ticks - delta} → ${nextTicks}`);
    }
    await this.document.update({ "system.combat.classResources.powerDice": dice });
  }

  /** Wright — remove a power die by id. */
  static async #onRemovePowerDie(event, target) {
    const id   = target.dataset.id;
    const dice = foundry.utils.deepClone(this.document.system.combat.classResources.powerDice ?? []);
    const next = dice.filter(d => d.id !== id);
    _log(`removePowerDie — id: ${id} | ${dice.length} → ${next.length}`);
    await this.document.update({ "system.combat.classResources.powerDice": next });
  }

  /* -------------------------------------------------- */
  /*  Drag-drop                                          */
  /* -------------------------------------------------- */

  async #onDrop(event) {
    // Re-entry guard: if a previous drop is still mid-processing (compendium
    // lookup, DialogV2 confirm, actor update), silently ignore any additional
    // drop events. Belt-and-suspenders alongside the listener-binding guard
    // in _onRender.
    if (this._dropInProgress) {
      _log(`drop — IGNORED (another drop is already in progress)`);
      return;
    }
    this._dropInProgress = true;
    try {
      await this.#handleDrop(event);
    } finally {
      this._dropInProgress = false;
    }
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
        _log(`drop — embedding "${item.name}" (${item.type})`);
        await this.document.createEmbeddedDocuments("Item", [item.toObject()]);
        break;
      case "bond":
        await this.#onDropBond(item);
        break;
      case "job-template":
        await this.#onDropJobTemplate(item);
        break;
      case "gear-kit":
        _log(`drop — gear-kit: setting gearKit to "${item.name}"`);
        await this.document.update({ "system.narrative.gearKit": item.name });
        ui.notifications.info(`Kit "${item.name}" equipped.`);
        break;
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
        await actor.createEmbeddedDocuments("Item", toCreate);
      }
    }

    // SECONDARY job: embed the new class's Gambit trait if its class differs
    // from the current primary's class, and the actor doesn't already have it.
    if (!willBePrimary) {
      const primaryJob = actor.system.combat.jobs?.find(j => j.primary);
      const primaryClass = primaryJob?.class;
      if (cls && cls !== primaryClass) {
        const hasGambit = actor.items.some(i =>
          i.type === "trait" &&
          i.system?.source === "gambit" &&
          i.system?.class === cls,
        );
        if (!hasGambit) {
          const gambitDoc = buildClassGambitDoc(cls);
          if (gambitDoc) {
            _log(`dropJobTemplate — embedding ${cls} gambit (secondary class)`);
            await actor.createEmbeddedDocuments("Item", [gambitDoc]);
          }
        }
      }
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
      await actor.deleteEmbeddedDocuments("Item", [existing.id]);
    }

    _log(`dropBond — bond: "${item.name}" | effortMax: ${s.effortMax} | ideals: ${JSON.stringify(s.ideals)}`);
    await actor.createEmbeddedDocuments("Item", [item.toObject()]);
    await actor.update({
      "system.narrative.bond":       item.name,
      "system.narrative.effort.max": s.effortMax ?? 3,
      "system.biography.ideals":     Array.isArray(s.ideals) ? s.ideals : [],
    });
    ui.notifications.info(`Bond "${item.name}" applied.`);
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

    _log(`dropAbilitySlot — ability: "${item.name}" | slot: ${slot.dataset.slot} | alreadyEmbedded: ${item.parent?.id === this.document.id}`);

    // Ask the player which talent (if any) and whether the mastery is unlocked
    // for this ability. Skipped silently if the ability has no talents/mastery.
    const config = await this.#promptAbilityConfig(item);
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

  /**
   * Prompt the player for talent / mastery configuration when equipping an
   * ability via drag-drop. Returns:
   *   { talent: 0|1|2, mastered: boolean }
   * or null if the user cancelled the dialog.
   *
   * If the ability has no talents or mastery text, the dialog is skipped and
   * default values are returned.
   */
  async #promptAbilityConfig(item) {
    const s = item.system ?? {};
    const hasT1 = !!(s.talent1 && s.talent1.trim());
    const hasT2 = !!(s.talent2 && s.talent2.trim());
    const hasM  = !!(s.mastery && s.mastery.trim());

    // Nothing to configure — return defaults immediately
    if (!hasT1 && !hasT2 && !hasM) {
      return { talent: 0, mastered: false };
    }

    const parts = [];
    parts.push(`<div class="icon-ability-config-dialog">`);
    parts.push(`<p>Configure how <strong>${item.name}</strong> is unlocked on this character.</p>`);

    if (hasT1 || hasT2) {
      parts.push(`<h4 style="margin:8px 0 4px; color:var(--ic-gold-bright,#e8b828)">Talent <small>(mutually exclusive)</small></h4>`);
      parts.push(`<label style="display:block; margin:4px 0"><input type="radio" name="talent" value="0" checked> <em>None — no talent unlocked</em></label>`);
      if (hasT1) parts.push(`<label style="display:block; margin:4px 0"><input type="radio" name="talent" value="1"> <strong>Talent I:</strong> ${s.talent1}</label>`);
      if (hasT2) parts.push(`<label style="display:block; margin:4px 0"><input type="radio" name="talent" value="2"> <strong>Talent II:</strong> ${s.talent2}</label>`);
    }

    if (hasM) {
      parts.push(`<h4 style="margin:8px 0 4px; color:var(--ic-gold-bright,#e8b828)">Mastery</h4>`);
      parts.push(`<label style="display:block; margin:4px 0"><input type="checkbox" name="mastered"> <strong>★ Mastery unlocked:</strong> ${s.mastery}</label>`);
    }

    parts.push(`</div>`);

    try {
      const result = await foundry.applications.api.DialogV2.prompt({
        window:  { title: `Equip: ${item.name}` },
        position: { width: 520 },
        content:  parts.join(""),
        ok: {
          label: "Equip",
          callback: (_event, button, dialog) => {
            const root = button?.form ?? dialog?.element ?? dialog;
            const talentEl   = root?.querySelector?.('input[name="talent"]:checked');
            const masteredEl = root?.querySelector?.('input[name="mastered"]');
            return {
              talent:   Number(talentEl?.value ?? 0),
              mastered: !!masteredEl?.checked,
            };
          },
        },
        rejectClose: false,
      });
      return result ?? null;
    } catch (err) {
      _log(`promptAbilityConfig — dialog error:`, err);
      return null;
    }
  }
}
