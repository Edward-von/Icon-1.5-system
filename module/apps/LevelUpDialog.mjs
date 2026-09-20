/**
 * LevelUpDialog — ApplicationV2 dialog to level up an ICON PC.
 *
 * Walks through all the benefits for the next level and applies them in one
 * transactional actor update. Covers both combat and narrative progression
 * from ICON 1.5 p. 241.
 *
 * Features:
 *   - XP gate: requires actor.narrative.xp.value >= 15
 *   - Chapter cap: can't cross from L4→L5 or L8→L9 unless actor.chapter was
 *     already bumped manually by the GM
 *   - L4 / L8 fork (combat): new job (+2 AP) OR +1 mastery
 *   - L4 / L8 fork (narrative): gain a bond power OR +1 to 2 actions
 *   - Ability picker: pulls abilities from the Jobs compendium, filters by
 *     chapter ≤ target, checkbox selection limited by AP gained
 *   - Relic picker: at levels 2/6/9, pulls from the Relics compendium
 *   - Bond power picker: filters by the PC's bond
 *   - Action improvement dropdowns
 *   - Posts a chat message on success
 */
import {
  LEVEL_BENEFITS, chapterForLevel,
  MAX_EQUIPPED_ABILITIES, XP_PER_LEVEL, apBudget,
} from "../helpers/advancement.mjs";
import { enrichHTML, escapeHTML, parseAbilitySections } from "../helpers/enrich.mjs";
import { ensureClassGambits } from "../helpers/classes.mjs";
import { formatTag } from "../helpers/rule-tooltips.mjs";

/** Plain-text, trimmed excerpt of a rich-text field (for option cards). */
function _excerpt(html, max = 150) {
  const t = String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : t;
}

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const _log = (...args) => console.debug("[ICON | LevelUpDialog]", ...args);

export class LevelUpDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor         = actor;
    this.currentLevel  = actor.system.combat.level;
    this.targetLevel   = Math.min(this.currentLevel + 1, 12);
    this.benefits      = LEVEL_BENEFITS[this.targetLevel] ?? { combat: {}, narrative: {} };
    this._bondPowers   = [];
    this._abilities    = [];
    this._relics       = [];
    this._talentOptions  = [];
    this._masteryOptions = [];
    this._jobTemplates   = [];

    // Wizard state
    this._stage = 1;          // 1 = review & forks, 2 = pickers
    this._savedFormData = {}; // stage-1 values captured on "Next" for re-population + submission
  }

  static DEFAULT_OPTIONS = {
    classes: ["icon", "level-up-dialog"],
    position: { width: 740, height: 760 },
    tag: "form",
    form: {
      handler: LevelUpDialog.#onSubmit,
      closeOnSubmit: false, // close manually only on success
    },
    actions: {
      cancel:    LevelUpDialog.#onCancel,
      nextStage: LevelUpDialog.#onNextStage,
      prevStage: LevelUpDialog.#onPrevStage,
    },
    window: {
      title:     "Level Up",
      icon:      "fa-solid fa-arrow-up",
      resizable: true,
    },
  };

  static PARTS = {
    form: { template: "systems/icon-system/templates/apps/level-up.hbs", scrollable: [""] },
  };

  get title() { return `Level Up — ${this.actor.name} (${this.currentLevel} → ${this.targetLevel})`; }

  /* -------------------------------------------------- */
  /*  Preflight validation                               */
  /* -------------------------------------------------- */

  /**
   * Returns an error message if the actor can't level up right now, or null
   * if the level-up is allowed. Called from IconSheet before opening the
   * dialog, and again as a safety check on submit.
   *
   * Rules: level up is always allowed when the PC has 15 XP and is below
   * level 12. Chapter progression is automatic — the target level determines
   * the new chapter via `chapterForLevel(level)`, so L5 bumps Ch1→Ch2, L9
   * bumps Ch2→Ch3. No GM gate is required.
   */
  static canLevelUp(actor) {
    const sys = actor.system;
    const xp  = sys.narrative?.xp?.value ?? 0;
    const lvl = sys.combat?.level ?? 0;

    if (lvl >= 12)          return `${actor.name} is already at the max level (12).`;
    if (xp  < XP_PER_LEVEL) return `${actor.name} needs ${XP_PER_LEVEL} XP to level up (current: ${xp}).`;
    return null;
  }

  /* -------------------------------------------------- */
  /*  Context                                            */
  /* -------------------------------------------------- */

  async _prepareContext(options) {
    _log(`_prepareContext — actor: "${this.actor.name}" | ${this.currentLevel} → ${this.targetLevel}`);

    const narr  = this.benefits.narrative ?? {};
    const combat = this.benefits.combat ?? {};

    const needsBondPower = !!(narr.bondPowers || narr.bondPowerOrActions);
    if (needsBondPower) await this._loadBondPowers();

    // AP gained: fixed amount from table + bonus if the user picks "new job"
    // at L4/L8 (handled in submit). We load ability options whenever the level
    // grants any AP or when there's a job choice available.
    const apGranted = (combat.ap ?? 0);
    // AP left over from earlier levels can be spent here too, so the ability
    // and talent pickers open even at a level that grants none of its own.
    const bankedAp  = apBudget(this.actor).free;
    const canGainAP = apGranted > 0 || bankedAp > 0 || combat.jobChoice;

    // Resolve pending new-job template (if chosen in stage 1) so we can
    // include its abilities in the stage-2 picker and show it in the recap.
    let pendingJob = null;
    const pendingUuid = this._savedFormData?.newJobTemplateUuid;
    if (pendingUuid && this._savedFormData?.jobChoice === "newJob") {
      try {
        const tpl = await fromUuid(pendingUuid);
        if (tpl) {
          pendingJob = {
            uuid:    tpl.uuid,
            name:    tpl.name,
            class:   tpl.system?.class ?? "",
            jobName: tpl.system?.jobName ?? tpl.name,
          };
        }
      } catch (err) {
        _log(`WARN: could not resolve pending job template uuid "${pendingUuid}"`, err);
      }
    }
    this._pendingJob = pendingJob;

    if (canGainAP) {
      await this._loadAbilities();
      this._loadTalentOptions();
    }

    // Mastery picker when the level grants a mastery point (also when the
    // L4/L8 "same job" choice grants one — handled below via submit form).
    const baseMasteryGain = combat.masteryPoint ?? 0;
    const canGainMastery = baseMasteryGain > 0 || combat.jobChoice;
    if (canGainMastery) this._loadMasteryOptions();

    // Relic picker at levels with a relic benefit
    if (combat.relic) await this._loadRelics();

    // Job template list for the L4 / L8 "new job" fork
    if (combat.jobChoice) await this._loadJobTemplates();

    // Action improvement slots — 2 for bondPowerOrActions levels, else the
    // level's actionImprovements count.
    const improveCount = narr.bondPowerOrActions ? 2 : (narr.actionImprovements ?? 0);
    const improveSlots = Array.from({ length: improveCount }, (_, i) => i + 1);

    // Ability selection slots (max of apGranted or 2 for the L4/L8 new-job path)
    const maxAbilityPicks = Math.max(apGranted, combat.jobChoice ? 2 : 0);

    const actions = Object.entries(CONFIG.ICON.actions).map(([key, labelKey]) => {
      const rating = this.actor.system.narrative.actions[key] ?? 0;
      return {
        key,
        label:      game.i18n.localize(labelKey) ?? key,
        rating,
        nextRating: Math.min(rating + 1, 4),
        maxed:      rating >= 4,
      };
    });

    // Current equipped abilities — used to compute class-match quota
    const equippedIds = this.actor.items.filter(i => i.type === "ability").map(i => i.id);
    const primaryJob  = this.actor.system.combat.jobs?.find(j => j.primary);

    // Compute effective budgets taking into account the stage-1 choices that
    // the player may have made (e.g. L4 "new job" gives +2 AP at submit).
    const saved = this._savedFormData ?? {};
    let effectiveApGain      = apGranted;
    let effectiveMasteryGain = baseMasteryGain;
    if (combat.jobChoice) {
      if (saved.jobChoice === "newJob")  effectiveApGain      += 2;
      if (saved.jobChoice === "mastery") effectiveMasteryGain += 1;
    }

    // Narrative pickers visibility depends on stage-1 choice at L4 / L8.
    let showBondPowerField = needsBondPower;
    let effectiveImproveSlots = improveSlots;
    if (narr.bondPowerOrActions) {
      if (saved.narrativeChoice === "bondPower") {
        showBondPowerField    = true;
        effectiveImproveSlots = [];
      } else if (saved.narrativeChoice === "actions") {
        showBondPowerField    = false;
        effectiveImproveSlots = Array.from({ length: 2 }, (_, i) => i + 1);
      } else {
        // Not chosen yet (stage 1)
        showBondPowerField    = false;
        effectiveImproveSlots = [];
      }
    }

    // AP banked from earlier levels (typically the +1 of a halfway mark that
    // was never spent), read once above as `bankedAp`.
    const carryAp = bankedAp;

    // Max ability picks = AP effectively gained (including new-job bonus)
    const effectiveMaxPicks = Math.max(effectiveApGain + carryAp, 0);

    return {
      actor:          this.actor,
      jobs:           this.actor.system.combat.jobs ?? [],
      currentLevel:   this.currentLevel,
      targetLevel:    this.targetLevel,
      chapter:        chapterForLevel(this.targetLevel),
      actorChapter:   this.actor.system.combat.chapter,
      benefits:       this.benefits,
      combat,
      narrative:      narr,
      bondPowers:     this._bondPowers,
      abilities:      this._abilities,
      relics:         this._relics,
      jobTemplates:   this._jobTemplates,
      pendingJob,
      talentOptions:  this._talentOptions,
      masteryOptions: this._masteryOptions,
      bondName:       this.actor.system.narrative.bond ?? "",
      primaryClass:   primaryJob?.class ?? "",
      primaryJobName: primaryJob?.name ?? "(none)",
      equippedCount:  equippedIds.length,
      maxEquipped:    MAX_EQUIPPED_ABILITIES,
      unlockedJobNames: this._unlockedJobNames ?? [],
      hasNoAbilities: canGainAP && this._abilities.length === 0,
      actions,
      improveSlots:   effectiveImproveSlots,
      maxAbilityPicks: effectiveMaxPicks,
      apGranted:      effectiveApGain,
      carryAp,
      apBudgetTotal:  effectiveApGain + carryAp,
      masteryGain:    effectiveMasteryGain,

      // Wizard state
      stage:    this._stage,
      isStage1: this._stage === 1,
      isStage2: this._stage === 2,
      savedData: saved,

      // Stage-1 content visibility
      hasCombatFork:    !!combat.jobChoice,
      hasNarrativeFork: !!narr.bondPowerOrActions,

      // Stage-2 pickers visibility (respect stage-1 choices)
      hasBondPower:     showBondPowerField,
      hasAbilityPicker: canGainAP && this._abilities.length > 0 && (effectiveApGain + carryAp) > 0,
      hasTalentPicker:  canGainAP && this._talentOptions.length > 0 && (effectiveApGain + carryAp) > 0,
      hasMasteryPicker: canGainMastery && this._masteryOptions.length > 0 && effectiveMasteryGain > 0,
      hasRelicPicker:   !!combat.relic,
    };
  }

  /**
   * Build the list of owned abilities that still have an unspent talent.
   * An ability can only spend one talent (I or II), so once `talentSelected`
   * is non-zero it's excluded from this list.
   */
  _loadTalentOptions() {
    const owned = this.actor.items.filter(i => i.type === "ability");
    this._talentOptions = owned
      .filter(a => (a.system?.talentSelected ?? 0) === 0)
      .filter(a => (a.system?.talent1?.trim() || a.system?.talent2?.trim()))
      .map(a => {
        const s = a.system ?? {};
        return {
          id:       a.id,
          name:     a.name,
          jobName:  s.jobName ?? "",
          class:    s.class ?? "",
          talent1:  s.talent1 ?? "",
          talent2:  s.talent2 ?? "",
          hasT1:    !!(s.talent1 && s.talent1.trim()),
          hasT2:    !!(s.talent2 && s.talent2.trim()),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    _log(`loaded ${this._talentOptions.length} talent options`);
  }

  /**
   * Build the list of owned abilities that still have an unspent mastery
   * (and have a mastery effect to unlock in the first place).
   */
  _loadMasteryOptions() {
    const owned = this.actor.items.filter(i => i.type === "ability");
    this._masteryOptions = owned
      .filter(a => !(a.system?.masteryUnlocked ?? false))
      .filter(a => a.system?.mastery && a.system.mastery.trim())
      .map(a => ({
        id:      a.id,
        name:    a.name,
        jobName: a.system?.jobName ?? "",
        class:   a.system?.class ?? "",
        mastery: a.system?.mastery ?? "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    _log(`loaded ${this._masteryOptions.length} mastery options`);
  }

  /* -------------------------------------------------- */
  /*  Compendium loaders                                 */
  /* -------------------------------------------------- */

  async _loadBondPowers() {
    const pack = game.packs.get("icon-system.bond-powers");
    if (!pack) { _log(`WARN: compendium "icon-system.bond-powers" not found`); return; }
    const all = await pack.getDocuments();
    const bondName = (this.actor.system.narrative.bond ?? "").trim().toLowerCase();
    const owned = new Set(this.actor.items.filter(i => i.type === "bond-power").map(i => i.name));

    this._bondPowers = all
      .filter(i => i.type === "bond-power")
      .filter(i => !bondName || (i.system?.bondName ?? "").trim().toLowerCase() === bondName)
      .filter(i => !owned.has(i.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(i => ({ uuid: i.uuid, name: i.name, description: _excerpt(i.system?.description, 160) }));

    _log(`loaded ${this._bondPowers.length} bond powers for bond: "${bondName || "(any)"}"`);
  }

  async _loadAbilities() {
    const pack = game.packs.get("icon-system.jobs");
    if (!pack) { _log(`WARN: compendium "icon-system.jobs" not found`); return; }

    const all = await pack.getDocuments();
    const actor = this.actor;
    // Use the chapter the PC will be in AFTER this level-up, so the L4→L5
    // and L8→L9 transitions unlock the new chapter's abilities in the same
    // dialog where the level is gained.
    const actorChapter = Math.max(
      actor.system.combat.chapter ?? 1,
      chapterForLevel(this.targetLevel),
    );
    const jobs = actor.system.combat.jobs ?? [];
    const primaryJob = jobs.find(j => j.primary);
    const primaryClass = primaryJob?.class ?? "";

    // Unlocked jobs = the jobs the PC actually has. Abilities can only be
    // picked from one of these. Match by jobName case-insensitive.
    // If the player chose "new job" in stage 1 and picked a template, also
    // include that template's jobName in the allowed set so stage 2 can
    // show the new job's abilities.
    const unlockedJobNames = new Set(jobs.map(j => (j.name ?? "").trim().toLowerCase()).filter(Boolean));
    const displayNames = jobs.map(j => j.name).filter(Boolean);
    if (this._pendingJob?.jobName) {
      unlockedJobNames.add(this._pendingJob.jobName.toLowerCase());
      displayNames.push(`${this._pendingJob.jobName} (new)`);
    }
    this._unlockedJobNames = Array.from(new Set(displayNames));
    _log(`unlocked jobs: [${this._unlockedJobNames.join(", ")}] | primary class: "${primaryClass}" | chapter cap: ${actorChapter}`);

    const ownedNames = new Set(actor.items.filter(i => i.type === "ability").map(i => i.name));

    this._abilities = all
      .filter(i => i.type === "ability")
      // Chapter must be <= the actor's current chapter
      .filter(i => (i.system?.chapter ?? 1) <= actorChapter)
      // Ability must belong to one of the unlocked jobs
      .filter(i => {
        const jn = (i.system?.jobName ?? "").trim().toLowerCase();
        return unlockedJobNames.has(jn);
      })
      // Not already owned
      .filter(i => !ownedNames.has(i.name))
      .sort((a, b) => {
        // Sort: primary-class matches first, then by jobName, then by chapter, then by name
        const aMatch = a.system?.class === primaryClass ? 0 : 1;
        const bMatch = b.system?.class === primaryClass ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        const jobCmp = (a.system?.jobName ?? "").localeCompare(b.system?.jobName ?? "");
        if (jobCmp) return jobCmp;
        const chCmp = (a.system?.chapter ?? 1) - (b.system?.chapter ?? 1);
        if (chCmp) return chCmp;
        return a.name.localeCompare(b.name);
      })
      .map(i => ({
        uuid:           i.uuid,
        name:           i.name,
        jobName:        i.system?.jobName ?? "",
        class:          i.system?.class ?? "",
        chapter:        i.system?.chapter ?? 1,
        cost:           i.system?.cost ?? "",
        matchesPrimary: i.system?.class === primaryClass,
        tags:           (i.system?.tags ?? []).map(formatTag).filter(Boolean).map(t => t.label),
        flavor:         _excerpt(parseAbilitySections(i.system?.description).flavor, 110),
      }));

    _log(`loaded ${this._abilities.length} eligible abilities (from ${unlockedJobNames.size} unlocked jobs, chapter <= ${actorChapter})`);
  }

  /**
   * Load job templates from the Jobs compendium for the L4 / L8 "new job"
   * fork. Excludes any job whose name is already in the actor's jobs array.
   */
  async _loadJobTemplates() {
    const pack = game.packs.get("icon-system.jobs");
    if (!pack) { _log(`WARN: compendium "icon-system.jobs" not found`); return; }
    const all = await pack.getDocuments();

    const ownedJobNames = new Set(
      (this.actor.system.combat.jobs ?? [])
        .map(j => (j.name ?? "").trim().toLowerCase())
        .filter(Boolean),
    );

    this._jobTemplates = all
      .filter(i => i.type === "job-template")
      .filter(i => !ownedJobNames.has((i.system?.jobName ?? "").trim().toLowerCase()))
      .sort((a, b) =>
        (a.system?.class ?? "").localeCompare(b.system?.class ?? "") ||
        a.name.localeCompare(b.name),
      )
      .map(i => ({
        uuid:    i.uuid,
        name:    i.name,
        class:   i.system?.class ?? "",
        jobName: i.system?.jobName ?? "",
      }));

    _log(`loaded ${this._jobTemplates.length} eligible job templates (excluded ${ownedJobNames.size} owned)`);
  }

  async _loadRelics() {
    const pack = game.packs.get("icon-system.relics");
    if (!pack) { _log(`WARN: compendium "icon-system.relics" not found`); return; }
    const all = await pack.getDocuments();
    const ownedNames = new Set(this.actor.items.filter(i => i.type === "relic").map(i => i.name));
    this._relics = all
      .filter(i => i.type === "relic")
      .filter(i => !ownedNames.has(i.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(i => ({
        uuid:          i.uuid,
        name:          i.name,
        invokeType:    i.system?.invokeType ?? "",
        invokeCondition: i.system?.invokeCondition ?? "",
        description:   _excerpt(i.system?.rank1?.description ?? i.system?.invokeEffect ?? i.system?.suggestedForm, 150),
      }));
    _log(`loaded ${this._relics.length} relics`);
  }

  /* -------------------------------------------------- */
  /*  Submit                                             */
  /* -------------------------------------------------- */

  static async #onSubmit(event, form, formData) {
    const data    = formData.object;
    const dialog  = this;
    const actor   = dialog.actor;
    const system  = actor.system;
    const level   = dialog.targetLevel;
    const benefits = dialog.benefits;

    // Block accidental submit from stage 1 (e.g. pressing Enter in a text input).
    if (dialog._stage !== 2) {
      _log(`submit IGNORED — still in stage ${dialog._stage}`);
      return;
    }

    _log(`submit — targetLevel: ${level} | form:`, data);

    // Safety re-check: someone might have changed the actor between opening
    // and submitting the dialog (or edited XP manually).
    const preflightError = LevelUpDialog.canLevelUp(actor);
    if (preflightError) {
      ui.notifications.error(preflightError);
      return;
    }

    const updates = {
      "system.combat.level":                       level,
      "system.combat.chapter":                     chapterForLevel(level),
      "system.narrative.xp.value":                 0,
      "system.narrative.xp.halfwayBonusClaimed":   false,
    };

    /* ---------- Combat benefits ---------- */
    const c = benefits.combat ?? {};
    let apGain      = c.ap ?? 0;
    let masteryGain = c.masteryPoint ?? 0;

    // L4 / L8 fork
    if (c.jobChoice) {
      if (data.jobChoice === "newJob") {
        if (!data.newJobTemplateUuid) {
          ui.notifications.error(`Pick a Job Template for the new job before confirming.`);
          return;
        }
        const newJobTemplate = await fromUuid(data.newJobTemplateUuid);
        if (!newJobTemplate) {
          ui.notifications.error(`Could not load the selected job template.`);
          return;
        }
        apGain += 2;
        const jobs    = foundry.utils.deepClone(system.combat.jobs);
        const tplSys  = newJobTemplate.system ?? {};
        const jobName = tplSys.jobName || newJobTemplate.name;
        // Don't add duplicates
        if (!jobs.some(j => (j.name ?? "").toLowerCase() === jobName.toLowerCase())) {
          // Secondary job — ONLY unlocks abilities. Traits and Limit Break
          // are not embedded; those come from the primary job only. Player
          // can switch primary from the Combat tab each expedition.
          const newCls = tplSys.class ?? "stalwart";
          jobs.push({
            name:         jobName,
            class:        newCls,
            primary:      false,
            templateUuid: newJobTemplate.uuid,
          });
          updates["system.combat.jobs"] = jobs;
          // A secondary job of ANOTHER class grants that class's Gambit —
          // ensureClassGambits() runs right after the actor update below.
        }
      } else {
        masteryGain += 1;
      }
    }

    if (apGain > 0)      updates["system.combat.apTotal"]   = system.combat.apTotal   + apGain;
    if (masteryGain > 0) updates["system.combat.masteries"] = system.combat.masteries + masteryGain;

    /* ---------- Narrative benefits ---------- */
    const n = benefits.narrative ?? {};
    let pickBondPower = (n.bondPowers ?? 0) > 0;
    let improveN      = n.actionImprovements ?? 0;

    if (n.bondPowerOrActions) {
      if (data.narrativeChoice === "bondPower") pickBondPower = true;
      else improveN += 2;
    }

    // Grow the Skill Rank pool by the number of action improvements earned
    // this level. Mirrors how apTotal / masteries grow, so the Skill Rank
    // counter in the Notes tab stays in sync with spendable dots.
    if (improveN > 0) {
      updates["system.combat.skillRanksTotal"] = (system.combat.skillRanksTotal ?? 0) + improveN;
    }

    // Action improvements and the bond power are spent here or lost: they are
    // not banked like AP or mastery points. Stop the submit while something is
    // still unpicked — unless there is genuinely nothing to pick (every action
    // already at the maximum rating of 4, p.17; no bond power in the list).
    const emptySlots = Array.from({ length: improveN }, (_, i) => i + 1).filter(i => !data[`improveAction${i}`]).length;
    const allMaxed   = Object.keys(CONFIG.ICON.actions).every(k => (system.narrative.actions[k] ?? 0) >= 4);
    if (emptySlots > 0 && !allMaxed) {
      ui.notifications.error(`${emptySlots} action improvement${emptySlots > 1 ? "s" : ""} still to spend — pick an action for every dot before confirming (they don't carry over).`);
      _log(`submit BLOCKED — ${emptySlots} empty improveAction slot(s)`);
      return;
    }
    if (pickBondPower && !data.bondPowerUuid && (dialog._bondPowers?.length ?? 0) > 0) {
      ui.notifications.error("Pick a Bond Power before confirming (it doesn't carry over).");
      _log(`submit BLOCKED — bond power not picked`);
      return;
    }

    // Count picks per action so that picking the same action twice stacks
    // (e.g. L4 "+1 to 2 actions" with both slots set to Sneak → +2 Sneak).
    const pickCounts = {};
    for (let i = 1; i <= improveN; i++) {
      const key = data[`improveAction${i}`];
      if (!key) continue;
      pickCounts[key] = (pickCounts[key] ?? 0) + 1;
    }
    for (const [key, count] of Object.entries(pickCounts)) {
      const current = system.narrative.actions[key] ?? 0;
      const next    = Math.min(current + count, 4);
      if (next !== current) updates[`system.narrative.actions.${key}`] = next;
    }

    /* ---------- Collect ability picks ---------- */
    // formData serializes the checkbox group as an array OR a single string OR
    // undefined, depending on how many were checked. Normalize.
    const pickedAbilityUuids = [];
    const raw = data.abilityPick;
    if (Array.isArray(raw))       pickedAbilityUuids.push(...raw.filter(Boolean));
    else if (typeof raw === "string" && raw) pickedAbilityUuids.push(raw);

    /* ---------- Collect talent picks ---------- */
    // For each talent option, the form has a field `talent:<itemId>` whose
    // value is "" (no pick), "1" (Talent I), or "2" (Talent II). Each pick
    // costs 1 AP, same pool as new abilities.
    const talentPicks = [];
    for (const opt of dialog._talentOptions) {
      const choice = data[`talent:${opt.id}`];
      if (choice === "1" || choice === "2") {
        talentPicks.push({ itemId: opt.id, talent: Number(choice) });
      }
    }

    const totalApSpent = pickedAbilityUuids.length + talentPicks.length;
    if (totalApSpent > apGain) {
      ui.notifications.error(`You spent ${totalApSpent} AP (${pickedAbilityUuids.length} new abilities + ${talentPicks.length} talents) but only earned ${apGain} AP this level.`);
      return;
    }

    // Enforce max-equipped cap
    const currentEquipped = actor.items.filter(i => i.type === "ability").length;
    if (currentEquipped + pickedAbilityUuids.length > MAX_EQUIPPED_ABILITIES) {
      ui.notifications.error(`Max ${MAX_EQUIPPED_ABILITIES} equipped abilities — you already have ${currentEquipped} and picked ${pickedAbilityUuids.length}.`);
      return;
    }

    /* ---------- Enforce half-must-match-primary-class rule ---------- */
    // Rule (p. 241): at least half of the equipped combat abilities must
    // match the primary job's class color.
    const primaryJob = system.combat.jobs?.find(j => j.primary);
    const primaryClass = primaryJob?.class;
    if (primaryClass && pickedAbilityUuids.length > 0) {
      // Resolve picked items to check their class
      const picked = await Promise.all(pickedAbilityUuids.map(u => fromUuid(u)));
      const existingAbilities = actor.items.filter(i => i.type === "ability");
      const matchingAfter = [
        ...existingAbilities.filter(i => i.system?.class === primaryClass),
        ...picked.filter(i => i?.system?.class === primaryClass),
      ].length;
      const totalAfter = existingAbilities.length + picked.length;
      if (matchingAfter * 2 < totalAfter) {
        ui.notifications.error(
          `Class-match rule: at least half of equipped abilities must match your primary class "${primaryClass}". ` +
          `After these picks: ${matchingAfter}/${totalAfter}.`,
        );
        return;
      }
    }

    /* ---------- Collect mastery picks ---------- */
    // Single-select radio: `masteryPick` holds the itemId (or empty).
    const masteryPicks = [];
    const masteryRaw = data.masteryPick;
    if (Array.isArray(masteryRaw))       masteryPicks.push(...masteryRaw.filter(Boolean));
    else if (typeof masteryRaw === "string" && masteryRaw) masteryPicks.push(masteryRaw);

    if (masteryPicks.length > masteryGain) {
      ui.notifications.error(`You selected ${masteryPicks.length} masteries but only earned ${masteryGain} Mastery Point${masteryGain === 1 ? "" : "s"} this level.`);
      return;
    }

    /* ---------- Apply the actor update ---------- */
    _log(`applying updates:`, updates);
    await actor.update(updates);

    /* ---------- Embed new items ---------- */
    // Note: traits and Limit Break from the new job are NOT embedded here.
    // Per ICON rules, only the PRIMARY job contributes traits and LB. The
    // new job added at L4/L8 is a secondary job — use the "Set as Primary"
    // button in the Combat tab to swap traits/LB to this job before an
    // expedition.
    // Secondary-class Gambit trait (jobs array is now updated on the actor).
    await ensureClassGambits(actor);

    const toEmbed = [];

    // Ability items
    for (const uuid of pickedAbilityUuids) {
      const item = await fromUuid(uuid);
      if (item) toEmbed.push(item.toObject());
    }

    // Bond power
    if (pickBondPower && data.bondPowerUuid) {
      const item = await fromUuid(data.bondPowerUuid);
      if (item) toEmbed.push(item.toObject());
    }

    // Relic
    if (c.relic) {
      if (!data.relicUuid) {
        _log(`WARN: level ${level} grants a relic but no relic was selected`);
        ui.notifications.warn(`You skipped the Relic pick — you can drop one manually later.`);
      } else {
        const item = await fromUuid(data.relicUuid);
        if (item) {
          _log(`relic selected — "${item.name}" (${item.uuid})`);
          toEmbed.push(item.toObject());
        } else {
          _log(`ERROR: could not resolve relic uuid "${data.relicUuid}"`);
          ui.notifications.error(`Could not load the selected relic.`);
        }
      }
    }

    if (toEmbed.length) {
      _log(`embedding ${toEmbed.length} items:`, toEmbed.map(i => `${i.name} (${i.type})`));
      await actor.createEmbeddedDocuments("Item", toEmbed);
    } else {
      _log(`no items to embed`);
    }

    /* ---------- Apply talent and mastery unlocks on existing abilities ---------- */
    const abilityUpdates = [];
    for (const pick of talentPicks) {
      abilityUpdates.push({
        _id: pick.itemId,
        "system.talentSelected": pick.talent,
      });
    }
    for (const itemId of masteryPicks) {
      // If the same ability was also given a talent, merge into one update
      const existing = abilityUpdates.find(u => u._id === itemId);
      if (existing) {
        existing["system.masteryUnlocked"] = true;
      } else {
        abilityUpdates.push({
          _id: itemId,
          "system.masteryUnlocked": true,
        });
      }
    }
    if (abilityUpdates.length) {
      _log(`updating ${abilityUpdates.length} existing ability items:`, abilityUpdates);
      await actor.updateEmbeddedDocuments("Item", abilityUpdates);
    }

    /* ---------- Chat message ---------- */
    const benefitStrings = [];
    if (apGain > 0)         benefitStrings.push(`+${apGain} AP`);
    if (masteryGain > 0)    benefitStrings.push(`+${masteryGain} Mastery`);
    if (c.limitBreak)       benefitStrings.push(`Limit Break unlocked`);
    if (c.relic)            benefitStrings.push(`Relic #${c.relicNumber} gained`);
    if (pickedAbilityUuids.length) benefitStrings.push(`${pickedAbilityUuids.length} new abilit${pickedAbilityUuids.length === 1 ? "y" : "ies"}`);
    if (talentPicks.length) benefitStrings.push(`${talentPicks.length} talent${talentPicks.length === 1 ? "" : "s"} unlocked`);
    if (masteryPicks.length) benefitStrings.push(`${masteryPicks.length} master${masteryPicks.length === 1 ? "y" : "ies"} unlocked`);
    if (pickBondPower && data.bondPowerUuid) benefitStrings.push(`new Bond Power`);

    const speaker = ChatMessage.getSpeaker({ actor });
    await ChatMessage.create({
      speaker,
      content: `<div class="icon-chat-levelup">
                  <strong>${escapeHTML(actor.name)}</strong> has reached <strong>Level ${level}</strong>!
                  ${benefitStrings.length ? `<br><em>${escapeHTML(benefitStrings.join(" • "))}</em>` : ""}
                </div>`,
    });

    ui.notifications.info(`${actor.name} leveled up to ${level}!`);
    dialog.close();
  }

  static async #onCancel(event, target) {
    _log(`cancel`);
    this.close();
  }

  /**
   * Live helpers on top of the form: the new-job card grid follows the
   * combat-path radio (stage 1); the AP counter follows ability + talent
   * picks and locks the remaining ability cards once the budget is spent
   * (stage 2). Submit still validates everything server-side of the form.
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    const $  = (sel) => html.querySelector(sel);
    const $$ = (sel) => Array.from(html.querySelectorAll(sel));

    /* Stage 1: new-job picker only matters when "New Job" is the chosen path */
    const newJobBlock = $('[data-role="new-job-block"]');
    const syncJobChoice = () => {
      if (!newJobBlock) return;
      newJobBlock.hidden = $('input[name="jobChoice"]:checked')?.value !== "newJob";
    };

    /* Stage 2: narrative picks (action improvements + bond power). Unlike AP,
       which is banked on the sheet, these are lost if the player confirms
       without choosing, so the counter and the summary keep them in sight. */
    const improveCounter = $('[data-role="improve-counter"]');
    const improveSelects = $$('select[name^="improveAction"]');
    const bondPowerBoxes = $$('input[name="bondPowerUuid"]');
    const improvesLeft   = () => improveSelects.filter(sel => !sel.value).length;
    const bondPowerLeft  = () => bondPowerBoxes.length > 0 && !bondPowerBoxes.some(b => b.checked);
    const syncNarrative = () => {
      if (!improveCounter) return;
      const left = improvesLeft();
      improveCounter.textContent = left ? `${left} to pick` : "all picked";
      improveCounter.classList.toggle("icon-wizard__counter--full", left === 0);
    };

    /* Stage 2: AP budget = new abilities + talents */
    const apCounter    = $('[data-role="ap-counter"]');
    const abilityBoxes = $$('input[name="abilityPick"]');
    const budget       = context.apBudgetTotal ?? context.apGranted ?? 0;
    const syncAp = () => {
      const abilities = abilityBoxes.filter(b => b.checked).length;
      const talents   = $$('input[name^="talent:"]:checked').filter(r => r.value !== "").length;
      const spent     = abilities + talents;
      const left      = budget - spent;
      abilityBoxes.forEach(b => { b.disabled = !b.checked && left <= 0; });
      if (apCounter) {
        apCounter.textContent = left > 0 ? `AP ${left} left` : left === 0 ? "AP all spent" : `AP ${-left} over`;
        apCounter.classList.toggle("icon-wizard__counter--full", left === 0);
        apCounter.classList.toggle("icon-wizard__counter--over", left < 0);
      }
      const summary = $('[data-role="summary"]');
      if (summary) {
        const parts = [];
        if (budget) parts.push(`<strong>${spent}/${budget}</strong> AP`);
        if ($('input[name="masteryPick"]:checked')?.value) parts.push("mastery picked");
        if ($('input[name="relicUuid"]:checked')) parts.push("relic picked");
        if ($('input[name="bondPowerUuid"]:checked')) parts.push("bond power picked");
        // What still has to be spent before Confirm will go through.
        const missing = [];
        const left = improvesLeft();
        if (left) missing.push(`<strong>${left}</strong> action improvement${left > 1 ? "s" : ""} to pick`);
        if (bondPowerLeft()) missing.push("<strong>bond power</strong> to pick");
        if (missing.length) parts.push(missing.join(" · "));
        summary.innerHTML = parts.join(" · ") || "Make your picks, then confirm.";
        summary.classList.toggle("icon-wizard__summary--warn", missing.length > 0);
      }
    };

    // Bind on the part root (replaced on every render), not on this.element
    // (the <form>, which persists across renders and would stack listeners).
    (html.querySelector(".icon-wizard") ?? html).addEventListener("change", ev => {
      const name = ev.target?.name ?? "";
      if (name === "jobChoice") syncJobChoice();
      else { syncNarrative(); syncAp(); }
    });
    syncJobChoice();
    syncNarrative();
    syncAp();
  }

  /**
   * Capture the current form state into `this._savedFormData`. Called before
   * advancing from stage 1 → 2 so the player's fork choices survive the
   * re-render and are available for the submit handler.
   */
  _captureForm() {
    if (!this.element) return;
    const fd = new FormData(this.element);
    const data = {};
    for (const [k, v] of fd.entries()) {
      if (data[k] === undefined) data[k] = v;
      else if (Array.isArray(data[k])) data[k].push(v);
      else data[k] = [data[k], v];
    }
    this._savedFormData = data;
    _log(`captured form:`, data);
  }

  /** "Next →" — save stage-1 form values and advance to stage 2. */
  static async #onNextStage(event, target) {
    event.preventDefault();
    this._captureForm();
    this._stage = 2;
    _log(`advance to stage 2`);
    await this.render();
  }

  /** "← Back" — return to stage 1; previous values are re-applied on render. */
  static async #onPrevStage(event, target) {
    event.preventDefault();
    this._stage = 1;
    _log(`return to stage 1`);
    await this.render();
  }
}
