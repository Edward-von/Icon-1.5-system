/**
 * LegendSheet — ApplicationV2 sheet for Legend (Boss) actors (type: "legend").
 */
import { combatRoll } from "../../dice/rolls.mjs";
import { promptAttackMods, promptDamageMods } from "../../apps/roll-dialogs.mjs";
import { abilityCostLabel } from "../../helpers/enrich.mjs";
import { ensureAreaTargets, placeAreaTemplate, areaFromTags, areaSummaryHtml } from "../../canvas/area-templates.mjs";
import { marksOn, marksBy, applyMark, removeMark } from "../../combat/marks.mjs";
import { postAbilityDamageCard } from "../../combat/damage.mjs";
import { isFoeActionAttack } from "../../combat/ability-damage.mjs";
import { enrichHTML, escapeHTML, postNpcTraitCard, postNpcInterruptCard, postNpcActionCard, postNpcRoundActionCard } from "../../helpers/enrich.mjs";
import { getActorStatusMods, groupStatusesForUI } from "../../combat/status-modifiers.mjs";
import { applyStatus, removeStatus, hasStatus,
         STACKABLE_STATUSES, adjustStatusCharges } from "../../combat/statuses.mjs";
import { parseAbilityDamage as _parseAbilityDamage } from "../../combat/ability-damage.mjs";
import { PROTOTYPE_TOKEN_CONTROL, onConfigurePrototypeToken, filterPrototypeTokenControl } from "./_prototype-token-control.mjs";
import { REFERENCE_CONTROL, onShowReferenceControl } from "../../apps/reference.mjs";
import { BaseActorSheet } from "./BaseActorSheet.mjs";

const _log = (...args) => console.debug("[ICON | LegendSheet]", ...args);

export class LegendSheet extends BaseActorSheet {

  static DEFAULT_OPTIONS = {
    classes: ["icon", "sheet", "actor", "legend-sheet"],
    position: { width: 820, height: 760 },
    window:   { resizable: true, controls: [PROTOTYPE_TOKEN_CONTROL, REFERENCE_CONTROL] },
    actions: {
      configurePrototypeToken: onConfigurePrototypeToken,
      showReference:     onShowReferenceControl,
      rollAction:        LegendSheet.#onRollAction,
      placeActionArea:   LegendSheet.#onPlaceActionArea,
      markActionTarget:  LegendSheet.#onMarkActionTarget,
      removeMark:        LegendSheet.#onRemoveMark,
      rollLegendDamage:  LegendSheet.#onRollLegendDamage,
      foeTraitShowInChat: LegendSheet.#onFoeTraitShowInChat,
      addTrait:          LegendSheet.#onAddTrait,
      removeTrait:       LegendSheet.#onRemoveTrait,
      addAction:         LegendSheet.#onAddAction,
      removeAction:      LegendSheet.#onRemoveAction,
      addInterrupt:      LegendSheet.#onAddInterrupt,
      removeInterrupt:   LegendSheet.#onRemoveInterrupt,
      foeInterruptShowInChat: LegendSheet.#onFoeInterruptShowInChat,
      foeActionShowInChat:    LegendSheet.#onFoeActionShowInChat,
      foeRoundActionShowInChat: LegendSheet.#onFoeRoundActionShowInChat,
      addRoundAction:    LegendSheet.#onAddRoundAction,
      removeRoundAction: LegendSheet.#onRemoveRoundAction,
      addPhase:          LegendSheet.#onAddPhase,
      removePhase:       LegendSheet.#onRemovePhase,
      toggleStatus:        LegendSheet.#onToggleStatus,
      adjustElevation:     LegendSheet.#onAdjustElevation,
      adjustStatusCharges: LegendSheet.#onAdjustStatusCharges,
    },
    form: { submitOnChange: true },
  };

  static PARTS = {
    header:     { template: "systems/icon-system/templates/actor/legend-header.hbs" },
    tabs:       { template: "templates/generic/tab-navigation.hbs" },
    main:       { template: "systems/icon-system/templates/actor/legend-combat.hbs",   scrollable: [""] },
    conditions: { template: "systems/icon-system/templates/actor/icon-conditions.hbs", scrollable: [""] },
    notes:      { template: "systems/icon-system/templates/actor/legend-notes.hbs",    scrollable: [""] },
  };

  tabGroups = { primary: "main" };

  get title() { return this.document.name; }

  /** @override — add the "Prototype Token" control (DocumentSheetV2 lacks it). */
  _getHeaderControls() { return filterPrototypeTokenControl(super._getHeaderControls(), this); }

  /**
   * Intercept form submission to rescale HP when the GM changes
   * `playerScale`. The Legend's canonical 2-player HP is stored in
   * `system.hp.baseline`; changing `playerScale` updates `hp.max` (and
   * proportionally `hp.value`) to `baseline × max(playerScale, 2) / 2`.
   *
   * On the very first scale change for a legend, if `baseline` is 0
   * (never set), we capture the current `hp.max` as the baseline. All
   * existing legend JSONs were authored at the 2-player baseline, so
   * this gives them the right starting point with zero migration.
   */
  _prepareSubmitData(event, form, formData, updateData) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const system     = submitData?.system;
    if (!system) return submitData;

    const currentScale = this.document.system.playerScale ?? 2;
    const newScaleRaw  = system.playerScale;
    if (newScaleRaw == null) return submitData;

    const newScale = Math.max(2, Number(newScaleRaw) || 2);
    if (newScale === currentScale) return submitData;

    // Ensure baseline is set. If it's 0, treat the CURRENT hp.max as the
    // 2-player baseline (first-time scaling) — but if the current scale
    // is already above 2, back-compute to find the true baseline.
    let baseline = this.document.system.hp?.baseline ?? 0;
    if (!baseline) {
      const currentMax = this.document.system.hp?.max ?? 0;
      baseline = Math.round(currentMax * 2 / Math.max(currentScale, 2));
    }

    const newMax = Math.max(1, Math.round(baseline * newScale / 2));
    const oldMax = Math.max(1, this.document.system.hp?.max ?? newMax);
    const oldVal = this.document.system.hp?.value ?? oldMax;
    // Scale current value proportionally so a boss mid-fight stays at
    // the same % HP when the scale changes.
    const newVal = Math.max(0, Math.min(newMax, Math.round(oldVal * newMax / oldMax)));

    system.hp = {
      ...(system.hp ?? {}),
      baseline,
      max:   newMax,
      value: newVal,
    };

    _log(`_prepareSubmitData — playerScale ${currentScale} → ${newScale} | baseline:${baseline} | hp:${oldVal}/${oldMax} → ${newVal}/${newMax}`);
    return submitData;
  }

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

    const enrich = (s) => enrichHTML(s);

    context.enrichedDescription = await enrich(system.description);
    context.enrichedTactics     = await enrich(system.tactics);
    context.enrichedLore        = await enrich(system.lore);
    context.enrichedLoot        = await enrich(system.loot);

    // Build plain objects with explicit field assignment instead of spreading
    // the schema-backed array entries — Foundry data models don't always
    // enumerate fields on `...spread`, so the textareas would render empty.
    context.enrichedTraits = await Promise.all(system.traits.map(async (t, i) => ({
      i,
      name:        t.name ?? "",
      description: t.description ?? "",
      phaseIndex:  t.phaseIndex,
      isActive:    t.phaseIndex == null || t.phaseIndex <= system.currentPhase,
      enrichedDescription: await enrich(t.description),
    })));

    context.enrichedActions = await Promise.all(system.actions.map(async (a, i) => {
      const phaseLabel = a.phaseIndex == null
        ? "All"
        : (system.phases?.[a.phaseIndex]?.label ?? `Phase ${a.phaseIndex + 1}`);
      const parsed = _parseAbilityDamage(a);
      const mode   = a.damageMode ?? "none";
      // When the GM has set an explicit damageMode we trust that over the
      // text parser. Otherwise fall back to the parser's dealsDamage flag.
      // damageMode "none" is the schema default (no explicit config) → trust the
      // text parser, exactly like #onRollLegendDamage does. Only an explicit
      // "hit"/"hit-miss" forces the button on.
      const dealsDamage = mode === "hit" || mode === "hit-miss" ? true : parsed.dealsDamage;
      return {
        i,
        name:        a.name ?? "",
        cost:        a.cost ?? "1action",
        tags:        a.tags ?? [],
        areaLabel:   areaFromTags(a.tags)?.label ?? "",
        canMark:     (a.tags ?? []).some(t => String(t).toLowerCase() === "mark"),
        marks:       marksBy(actor.id, `action:${a.name}`).map(m => ({ uuid: m.uuid, targetName: m.targetName })),
        hitEffect:   a.hitEffect  ?? "",
        missEffect:  a.missEffect ?? "",
        areaEffect:  a.areaEffect ?? "",
        description: a.description ?? "",
        phaseIndex:  a.phaseIndex,
        phaseLabel,
        isActive:    a.phaseIndex == null || a.phaseIndex <= system.currentPhase,
        enrichedHit:  await enrich(a.hitEffect),
        enrichedMiss: await enrich(a.missEffect),
        enrichedArea: await enrich(a.areaEffect),
        enrichedDesc: await enrich(a.description),
        parsed,
        dealsDamage,
        isAttack:    isFoeActionAttack(a),
        damageMode:     mode,
        damageHitDice:  a.damageHitDice  ?? 0,
        damageHitFray:  !!a.damageHitFray,
        damageMissDice: a.damageMissDice ?? 0,
        damageMissFray: !!a.damageMissFray,
      };
    }));

    context.enrichedInterrupts = await Promise.all(system.interrupts.map(async (r, i) => ({
      i,
      name:        r.name ?? "",
      limit:       r.limit ?? 2,
      trigger:     r.trigger ?? "",
      effect:      r.effect ?? "",
      description: r.description ?? "",
      enrichedEffect: await enrich(r.effect),
      enrichedDesc:   await enrich(r.description),
    })));

    context.enrichedRoundActions = await Promise.all(system.roundActions.map(async (r, i) => ({
      i,
      name:        r.name ?? "",
      roundNumber: r.roundNumber ?? 1,
      effect:      r.effect ?? "",
      description: r.description ?? "",
      enrichedEffect: await enrich(r.effect),
    })));

    context.enrichedPhases = await Promise.all(system.phases.map(async (p, i) => ({
      i,
      label:        p.label ?? "",
      hpThreshold:  p.hpThreshold ?? 0,
      description:  p.description ?? "",
      isCurrent:    i === system.currentPhase,
      enrichedDescription: await enrich(p.description),
    })));

    context.phaseBar = system.phases.map(p => ({
      label: p.label,
      pct:   system.hp.max > 0 ? Math.round((p.hpThreshold / system.hp.max) * 100) : 0,
    }));

    // Conditions tab — shared with IconSheet/FoeSheet
    const elevationLevel = actor.getFlag("icon-system", "elevation") ?? 0;
    context.elevationLevel = elevationLevel;
    const allCharges = actor.getFlag("icon-system", "statusCharges") ?? {};
    context.statusCharges = allCharges;
    const groups = groupStatusesForUI();
    const markActive = list => list.map(s => {
      const stackable = STACKABLE_STATUSES.has(s.id);
      const charges   = stackable ? (allCharges[s.id] ?? 0) : 0;
      return {
        ...s,
        name: s.id === "hatred" ? (actor.effects.find(e => e.statuses?.has("hatred"))?.name ?? s.name) : s.name,
        stackable,
        charges,
        active: s.id === "elevation"
          ? elevationLevel !== 0
          : stackable
            ? charges > 0
            : (actor.statuses?.has(s.id) ?? false),
      };
    });
    context.marksOnActor = marksOn(actor).map(m => ({ uuid: m.uuid, abilityName: m.abilityName, sourceName: m.sourceName, text: m.text }));
    context.conditions = {
      negative: markActive(groups.negative),
      positive: markActive(groups.positive),
      special:  markActive(groups.special),
    };

    _log(`_prepareContext — done | phases: ${system.phases.length} | currentPhase: ${system.currentPhase} | actions: ${system.actions.length}`);
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
    return {
      main:       { id: "main",       group: "primary", label: "Stats & Abilities", active: active === "main",       cssClass: active === "main"       ? "active" : "" },
      conditions: { id: "conditions", group: "primary", label: "Conditions",        active: active === "conditions", cssClass: active === "conditions" ? "active" : "" },
      notes:      { id: "notes",      group: "primary", label: "Notes",             active: active === "notes",      cssClass: active === "notes"      ? "active" : "" },
    };
  }

  /** Which <details data-open-key> elements were open at last render.
   *  Preserves expand/collapse state across the re-renders triggered by
   *  submitOnChange so the GM can edit multiple fields in a row without
   *  the Edit panel snapping shut each time. */
  _openDetails = new Set();

  _onRender(context, options) {
    _log(`_onRender — actor: "${this.document.name}" | activeTab: ${this.tabGroups.primary}`);
    // Tabs, drop binding, portrait picker and status right-click handlers
    // come from BaseActorSheet.
    super._onRender(context, options);

    // Restore open <details> and wire toggle listeners to keep tracking.
    this.element.querySelectorAll("details[data-open-key]").forEach(d => {
      const key = d.dataset.openKey;
      if (this._openDetails.has(key)) d.open = true;
      if (d.dataset.iconToggleBound) return;
      d.dataset.iconToggleBound = "true";
      d.addEventListener("toggle", () => {
        if (d.open) this._openDetails.add(key);
        else        this._openDetails.delete(key);
      });
    });
  }

  /* -------------------------------------------------- */
  /*  Actions                                            */
  /* -------------------------------------------------- */

  static async #onRollAction(event, target) {
    const idx    = Number(target.dataset.actionIndex);
    const actor  = this.document;
    const action = actor.system.actions[idx];
    _log(`rollAction — actor: "${actor.name}" | action[${idx}]: "${action?.name}"`);
    if (!action) return;

    // Area attack: template on the map + targets before the dialog (null = cancelled)
    const placement = await ensureAreaTargets({ actor, tags: action.tags, abilityName: action.name, abilityKey: `action:${action.name}` });
    if (placement === null) return;

    const mods = await LegendSheet.#promptAttackMods(action, actor);
    if (!mods) return;

    await combatRoll({
      abilityName: action.name,
      boons:       mods.boons,
      curses:      mods.curses,
      defense:     mods.defense,
      areaHtml:    areaSummaryHtml(placement),
      actor,
    });
  }

  /** 🎯 Mark the targeted token with this action (marks.mjs); exactly one target. */
  static async #onMarkActionTarget(event, target) {
    event.stopPropagation();
    const action = this.document.system.actions[Number(target.dataset.actionIndex)];
    if (!action) return;
    const targets = Array.from(game.user?.targets ?? []).filter(t => t.actor);
    if (targets.length !== 1) { ui.notifications.warn("Target exactly one token to mark it (hover it and press T)."); return; }
    _log(`markActionTarget — "${action.name}" on ${targets[0].name}`);
    await applyMark({ source: this.document, target: targets[0].actor, abilityKey: `action:${action.name}`, abilityName: action.name, text: action.description ?? "" });
  }

  /** ✕ on a mark chip or in the Conditions tab list. */
  static async #onRemoveMark(event, target) {
    event.stopPropagation();
    if (target.dataset.effectUuid) await removeMark(target.dataset.effectUuid);
  }

  /** 📐 Place an action's Blast / Line / Arc / Burst on the map and target the tokens inside. */
  static async #onPlaceActionArea(event, target) {
    event.stopPropagation();
    const idx    = Number(target.dataset.actionIndex);
    const actor  = this.document;
    const action = actor.system.actions[idx];
    if (!action) return;
    const area = areaFromTags(action.tags);
    if (!area) { ui.notifications.warn(`"${action.name}" has no Blast / Line / Arc / Burst tag.`); return; }
    _log(`placeActionArea — "${action.name}" | ${area.label}`);
    await placeAreaTemplate({ actor, area, abilityName: action.name, abilityKey: `action:${action.name}` });
  }

  static async #onRollLegendDamage(event, target) {
    event.stopPropagation();
    const idx    = Number(target.dataset.actionIndex);
    const actor  = this.document;
    const action = actor.system.actions[idx];
    if (!action) return;

    // If the GM has configured explicit damage (damageMode != "none") we use
    // those structured values; otherwise fall back to parsing the text.
    const mode   = action.damageMode ?? "none";
    const parsed = mode === "none"
      ? _parseAbilityDamage(action)
      : {
          dealsDamage: true,
          hit:  { mult: action.damageHitDice  ?? 0, fray: !!action.damageHitFray,  flat: 0 },
          miss: mode === "hit-miss"
            ? { mult: action.damageMissDice ?? 0, fray: !!action.damageMissFray, flat: 0 }
            : { mult: 0, fray: false, flat: 0 },
          area: { mult: 0, fray: false, flat: 0 },
        };
    _log(`rollLegendDamage — actor: "${actor.name}" | action[${idx}]: "${action.name}" | mode: ${mode} | parsed:`, parsed);
    if (!parsed.dealsDamage) {
      ui.notifications.warn(`"${action.name}" does not deal damage.`);
      return;
    }

    const mods = await LegendSheet.#promptLegendDamageMods(action, parsed, actor);
    if (!mods) return;

    await postAbilityDamageCard(actor, {
      parsed,
      outcome:     mods.outcome,
      damagedie:   actor.system.damagedie || "d8",
      fray:        actor.system.fray ?? 0,
      abilityName: action.name,
      bonusDice:   mods.bonusDice,
      vulnerable:  mods.vulnerable,
      resistance:  mods.resistance,
      weakened:    mods.weakened,
      hatred:      mods.hatred,
    });
  }

  static async #promptLegendDamageMods(action, parsed, actor) {
    return promptDamageMods(
      { name: action.name, cost: abilityCostLabel(action.cost), tags: action.tags ?? [], parsed, isAutoHit: !!parsed.isAutoHit, parsedCombo: null },
      { damagedie: actor.system.damagedie || "d8", fray: actor.system.fray ?? 0 },
      { actor },
    );
  }

  /**
   * Attack-roll prompt for legend actions. Pre-fills boons/curses from
   * status auto-mods + elevation difference vs targets, and defense from
   * the targeted token. Mirrors FoeSheet/IconSheet prompts.
   */
  static async #promptAttackMods(action, actor) {
    return promptAttackMods({ name: action.name, cost: abilityCostLabel(action.cost), tags: action.tags ?? [] }, actor);
  }

  /** Toggle a status effect on this legend (Conditions tab buttons). */
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

  /** Adjust this legend's elevation flag (left=+1, right-click=-1 via _onRender). */
  static async #onAdjustElevation(event, target) {
    event.preventDefault();
    const actor = this.document;
    const current = actor.getFlag("icon-system", "elevation") ?? 0;
    const next = current + 1;
    _log(`adjustElevation — actor: "${actor.name}" | ${current} → ${next}`);
    await actor.setFlag("icon-system", "elevation", next);
    if (next !== 0 && !hasStatus(actor, "elevation")) {
      await applyStatus(actor, "elevation");
    } else if (next === 0 && hasStatus(actor, "elevation")) {
      await removeStatus(actor, "elevation");
    }
  }

  /** Adjust the charge count of a stackable status (Blessed, Power Die). */
  static async #onAdjustStatusCharges(event, target) {
    event.preventDefault();
    const statusId = target.dataset.statusId;
    if (!statusId) return;
    const next = await adjustStatusCharges(this.document, statusId, 1);
    _log(`adjustStatusCharges — "${statusId}" → ${next}`);
  }

  static async #onAddPhase(event, target) {
    const phases = foundry.utils.deepClone(this.document.system.phases);
    _log(`addPhase — actor: "${this.document.name}" | count: ${phases.length} → ${phases.length + 1}`);
    phases.push({ label: `Phase ${phases.length + 1}`, hpThreshold: 0, description: "", traitsAdded: [], actionsAdded: [] });
    await this.document.update({ "system.phases": phases });
  }

  static async #onRemovePhase(event, target) {
    const idx    = Number(target.dataset.index);
    const phases = foundry.utils.deepClone(this.document.system.phases);
    _log(`removePhase — actor: "${this.document.name}" | idx: ${idx} | label: "${phases[idx]?.label}"`);
    phases.splice(idx, 1);
    await this.document.update({ "system.phases": phases });
  }

  /** Post a legend trait to chat. */
  /** Post a legend action to chat (also for actions with no attack roll, e.g. Dread March). */
  static async #onFoeActionShowInChat(event, target) {
    event.stopPropagation();
    const idx    = Number(target.dataset.actionIndex);
    const actor  = this.document;
    const action = actor.system.actions[idx];
    if (!action) return;
    _log(`foeActionShowInChat — actor: "${actor.name}" | action[${idx}]: "${action.name}"`);
    await postNpcActionCard(actor, action);
  }

  /** Post a legend round action (name, round, effect) to chat. */
  static async #onFoeRoundActionShowInChat(event, target) {
    event.stopPropagation();
    const idx   = Number(target.dataset.roundActionIndex);
    const actor = this.document;
    const ra    = actor.system.roundActions[idx];
    if (!ra) return;
    _log(`foeRoundActionShowInChat — actor: "${actor.name}" | roundAction[${idx}]: "${ra.name}"`);
    await postNpcRoundActionCard(actor, ra);
  }

  /** Post a foe/legend interrupt (trigger + effect) to chat. */
  static async #onFoeInterruptShowInChat(event, target) {
    event.stopPropagation();
    const idx       = Number(target.dataset.interruptIndex);
    const actor     = this.document;
    const interrupt = actor.system.interrupts[idx];
    if (!interrupt) return;
    _log(`foeInterruptShowInChat — actor: "${actor.name}" | interrupt[${idx}]: "${interrupt.name}"`);
    await postNpcInterruptCard(actor, interrupt);
  }

  static async #onFoeTraitShowInChat(event, target) {
    event.stopPropagation();
    const idx   = Number(target.dataset.traitIndex);
    const actor = this.document;
    const trait = actor.system.traits[idx];
    if (!trait) return;
    _log(`foeTraitShowInChat — actor: "${actor.name}" | trait[${idx}]: "${trait.name}"`);
    await postNpcTraitCard(actor, trait);
  }

  static async #onAddTrait(event, target) {
    const traits = foundry.utils.deepClone(this.document.system.traits);
    _log(`addTrait — actor: "${this.document.name}" | count: ${traits.length} → ${traits.length + 1}`);
    traits.push({ name: "New Trait", description: "", phaseIndex: null });
    await this.document.update({ "system.traits": traits });
  }

  static async #onRemoveTrait(event, target) {
    const idx    = Number(target.dataset.index);
    const traits = foundry.utils.deepClone(this.document.system.traits);
    _log(`removeTrait — actor: "${this.document.name}" | idx: ${idx} | name: "${traits[idx]?.name}"`);
    traits.splice(idx, 1);
    await this.document.update({ "system.traits": traits });
  }

  static async #onAddAction(event, target) {
    const actions = foundry.utils.deepClone(this.document.system.actions);
    _log(`addAction — actor: "${this.document.name}" | count: ${actions.length} → ${actions.length + 1}`);
    actions.push({ name: "New Action", cost: "1action", tags: [], hitEffect: "", missEffect: "", areaEffect: "", description: "", phaseIndex: null });
    await this.document.update({ "system.actions": actions });
  }

  static async #onRemoveAction(event, target) {
    const idx     = Number(target.dataset.index);
    const actions = foundry.utils.deepClone(this.document.system.actions);
    _log(`removeAction — actor: "${this.document.name}" | idx: ${idx} | name: "${actions[idx]?.name}"`);
    actions.splice(idx, 1);
    await this.document.update({ "system.actions": actions });
  }

  static async #onAddInterrupt(event, target) {
    const interrupts = foundry.utils.deepClone(this.document.system.interrupts);
    _log(`addInterrupt — actor: "${this.document.name}" | count: ${interrupts.length} → ${interrupts.length + 1}`);
    interrupts.push({ name: "New Interrupt", limit: 2, trigger: "", effect: "", description: "" });
    await this.document.update({ "system.interrupts": interrupts });
  }

  static async #onRemoveInterrupt(event, target) {
    const idx        = Number(target.dataset.index);
    const interrupts = foundry.utils.deepClone(this.document.system.interrupts);
    _log(`removeInterrupt — actor: "${this.document.name}" | idx: ${idx} | name: "${interrupts[idx]?.name}"`);
    interrupts.splice(idx, 1);
    await this.document.update({ "system.interrupts": interrupts });
  }

  static async #onAddRoundAction(event, target) {
    const ra = foundry.utils.deepClone(this.document.system.roundActions);
    _log(`addRoundAction — actor: "${this.document.name}" | count: ${ra.length} → ${ra.length + 1}`);
    ra.push({ name: "New Round Action", roundNumber: ra.length + 1, effect: "", description: "" });
    await this.document.update({ "system.roundActions": ra });
  }

  static async #onRemoveRoundAction(event, target) {
    const idx = Number(target.dataset.index);
    const ra  = foundry.utils.deepClone(this.document.system.roundActions);
    _log(`removeRoundAction — actor: "${this.document.name}" | idx: ${idx} | name: "${ra[idx]?.name}"`);
    ra.splice(idx, 1);
    await this.document.update({ "system.roundActions": ra });
  }

  /* -------------------------------------------------- */
  /*  Drag-drop                                          */
  /* -------------------------------------------------- */

  async _onDropSheet(event) {
    if (this._dropInProgress) {
      _log(`drop — IGNORED (another drop is already in progress)`);
      return;
    }
    this._dropInProgress = true;
    try {
      let data;
      try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
      if (data.type !== "Item") { _log(`drop — ignored data.type: "${data.type}"`); return; }

      _log(`drop — resolving item from data:`, data);
      const item = await Item.implementation.fromDropData(data);
      if (!item) { _log(`drop — ERROR: could not resolve item`); return; }

      _log(`drop — item: "${item.name}" | type: "${item.type}"`);
      if (item.type !== "foe-ability") {
        _log(`drop — WARN: expected foe-ability, got "${item.type}"`);
        return ui.notifications.warn(`Cannot drop item type "${item.type}" on a Legend.`);
      }
      await this.#onDropFoeAbility(item);
    } finally {
      this._dropInProgress = false;
    }
  }

  async #onDropFoeAbility(item) {
    const s     = item.system;
    const actor = this.document;
    // Strip the "FoeName — " prefix used by compendium item names.
    const cleanName = item.name.includes(" — ")
      ? item.name.split(" — ").slice(1).join(" — ").trim()
      : item.name;
    _log(`dropFoeAbility — actor: "${actor.name}" | item: "${item.name}" | cleaned: "${cleanName}" | abilityType: "${s.abilityType}"`);
    switch (s.abilityType) {
      case "action": {
        const actions = foundry.utils.deepClone(actor.system.actions);
        actions.push({ name: cleanName, cost: s.cost || "1action", tags: s.tags ?? [], hitEffect: s.hitEffect ?? "", missEffect: s.missEffect ?? "", areaEffect: s.areaEffect ?? "", description: s.description ?? "", phaseIndex: null });
        _log(`dropFoeAbility — added action "${cleanName}" | total actions: ${actions.length}`);
        await actor.update({ "system.actions": actions });
        break;
      }
      case "interrupt": {
        const interrupts = foundry.utils.deepClone(actor.system.interrupts);
        interrupts.push({ name: cleanName, limit: s.interruptLimit ?? 2, trigger: s.trigger ?? "", effect: s.description ?? "", description: "" });
        _log(`dropFoeAbility — added interrupt "${cleanName}" | total: ${interrupts.length}`);
        await actor.update({ "system.interrupts": interrupts });
        break;
      }
      case "trait": {
        const traits = foundry.utils.deepClone(actor.system.traits);
        traits.push({ name: cleanName, description: s.description ?? "", phaseIndex: null });
        _log(`dropFoeAbility — added trait "${cleanName}" | total: ${traits.length}`);
        await actor.update({ "system.traits": traits });
        break;
      }
      case "round-action": {
        const ra = foundry.utils.deepClone(actor.system.roundActions);
        ra.push({ name: cleanName, roundNumber: s.roundNumber ?? ra.length + 1, effect: s.description ?? "", description: "" });
        _log(`dropFoeAbility — added round-action "${cleanName}" | total: ${ra.length}`);
        await actor.update({ "system.roundActions": ra });
        break;
      }
      default:
        _log(`dropFoeAbility — WARN: unknown abilityType "${s.abilityType}"`);
    }
    ui.notifications.info(`"${cleanName}" added.`);
  }
}
