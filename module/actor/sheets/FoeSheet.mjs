/**
 * FoeSheet — ApplicationV2 sheet for Foes (type: "foe").
 *
 * Acts as a "Foe Builder": the GM picks foeClass / Elite template / faction
 * and the base stats auto-populate from the canonical glossary table in the
 * manual (p.298). Traits and actions are added via the [+ Add] buttons or
 * drag-drop from the "Foe Abilities" compendium.
 */
import { combatRoll } from "../../dice/rolls.mjs";
import { promptAttackMods, promptDamageMods } from "../../apps/roll-dialogs.mjs";
import { currentTargets } from "../../combat/defenses.mjs";
import { abilityCostLabel } from "../../helpers/enrich.mjs";
import { ensureAreaTargets, placeAreaTemplate, areaFromTags, areaSummaryHtml, abilityArea } from "../../canvas/area-templates.mjs";
import { marksOn, marksBy, applyMark, removeMark, markFromTags } from "../../combat/marks.mjs";
import { postAbilityDamageCard } from "../../combat/damage.mjs";
import { isFoeActionAttack } from "../../combat/ability-damage.mjs";
import { npcActionStatusEntries, statusBlockHtml } from "../../combat/ability-statuses.mjs";
import { getActorStatusMods, groupStatusesForUI } from "../../combat/status-modifiers.mjs";
import { applyStatus, removeStatus, hasStatus,
         STACKABLE_STATUSES, adjustStatusCharges } from "../../combat/statuses.mjs";
import { enrichHTML, postNpcTraitCard, postNpcInterruptCard, postNpcActionCard, postNpcRoundActionCard } from "../../helpers/enrich.mjs";
import { getFoeBaseStats, FOE_CLASS_LABELS } from "../../data/actor/FoeData.mjs";
import { parseAbilityDamage as _parseAbilityDamage } from "../../combat/ability-damage.mjs";
import { formatTag } from "../../helpers/rule-tooltips.mjs";
import { PROTOTYPE_TOKEN_CONTROL, onConfigurePrototypeToken, filterPrototypeTokenControl } from "./_prototype-token-control.mjs";
import { REFERENCE_CONTROL, onShowReferenceControl } from "../../apps/reference.mjs";
import { BaseActorSheet } from "./BaseActorSheet.mjs";

const _log = (...args) => console.debug("[ICON | FoeSheet]", ...args);

export class FoeSheet extends BaseActorSheet {

  static DEFAULT_OPTIONS = {
    classes: ["icon", "sheet", "actor", "foe-sheet"],
    position: { width: 720, height: 680 },
    window:   { resizable: true, controls: [PROTOTYPE_TOKEN_CONTROL, REFERENCE_CONTROL] },
    actions: {
      rollSave:         BaseActorSheet.onRollSave,   // Conditions tab / save bar
      configurePrototypeToken: onConfigurePrototypeToken,
      showReference:    onShowReferenceControl,
      rollAction:       FoeSheet.#onRollAction,
      placeActionArea:  FoeSheet.#onPlaceActionArea,
      markActionTarget: FoeSheet.#onMarkActionTarget,
      removeMark:       FoeSheet.#onRemoveMark,
      rollFoeDamage:    FoeSheet.#onRollFoeDamage,
      foeActionShowInChat: FoeSheet.#onFoeActionShowInChat,
      foeTraitShowInChat:  FoeSheet.#onFoeTraitShowInChat,
      applyBaseStats:   FoeSheet.#onApplyBaseStats,
      addTrait:         FoeSheet.#onAddTrait,
      removeTrait:      FoeSheet.#onRemoveTrait,
      addAction:        FoeSheet.#onAddAction,
      removeAction:     FoeSheet.#onRemoveAction,
      addInterrupt:     FoeSheet.#onAddInterrupt,
      removeInterrupt:  FoeSheet.#onRemoveInterrupt,
      foeInterruptShowInChat: FoeSheet.#onFoeInterruptShowInChat,
      foeRoundActionShowInChat: FoeSheet.#onFoeRoundActionShowInChat,
      addRoundAction:   FoeSheet.#onAddRoundAction,
      removeRoundAction:FoeSheet.#onRemoveRoundAction,
      tickInterrupt:    FoeSheet.#onTickInterrupt,
      toggleStatus:        FoeSheet.#onToggleStatus,
      adjustElevation:     FoeSheet.#onAdjustElevation,
      adjustStatusCharges: FoeSheet.#onAdjustStatusCharges,
    },
    form: { submitOnChange: true },
  };

  static PARTS = {
    header:     { template: "systems/icon-system/templates/actor/foe-header.hbs" },
    tabs:       { template: "templates/generic/tab-navigation.hbs" },
    main:       { template: "systems/icon-system/templates/actor/foe-main.hbs",       scrollable: [""] },
    conditions: { template: "systems/icon-system/templates/actor/icon-conditions.hbs", scrollable: [""] },
    notes:      { template: "systems/icon-system/templates/actor/foe-notes.hbs",      scrollable: [""] },
  };

  tabGroups = { primary: "main" };

  get title() { return this.document.name; }

  /** @override — add the "Prototype Token" control (DocumentSheetV2 lacks it). */
  _getHeaderControls() { return filterPrototypeTokenControl(super._getHeaderControls(), this); }

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
    context.enrichedDefeat      = await enrich(system.defeat);
    context.enrichedLoot        = await enrich(system.loot);

    context.enrichedTraits = await Promise.all(system.traits.map(async (t, i) => ({
      ...t, i, enrichedDescription: await enrich(t.description),
    })));
    context.enrichedActions = await Promise.all(system.actions.map(async (a, i) => {
      const parsed = _parseAbilityDamage(a);
      return {
        ...a, i,
        enrichedHit:  await enrich(a.hitEffect),
        enrichedMiss: await enrich(a.missEffect),
        enrichedArea: await enrich(a.areaEffect),
        enrichedDesc: await enrich(a.description),
        // Display chips with prettified label + rule tooltip ("combo-2" →
        // "Combo 2" with the sequence rule). Kept separate from `tags`,
        // which stays the raw editable array.
        tagChips: (a.tags ?? []).map(formatTag).filter(Boolean),
        areaLabel: abilityArea(a.tags, [a.description, a.hitEffect, a.missEffect, a.areaEffect].join(" "))?.label ?? "",
        // ^ the shape is usually in the header tags; when it is only in the
        //   prose (as for several terrain actions) the text is read too.
        canMark: markFromTags(a.tags).can,
        marks: marksBy(actor.id, `action:${a.name}`).map(m => ({ uuid: m.uuid, targetName: m.targetName })),
        parsed,
        dealsDamage: parsed.dealsDamage,
        isAttack: isFoeActionAttack(a),
      };
    }));
    context.enrichedInterrupts = await Promise.all(system.interrupts.map(async (r, i) => ({
      ...r, i,
      enrichedEffect: await enrich(r.effect),
      enrichedDesc:   await enrich(r.description),
    })));
    context.enrichedRoundActions = await Promise.all(system.roundActions.map(async (r, i) => ({
      ...r, i,
      enrichedEffect: await enrich(r.effect),
    })));

    context.foeClassLabel = FOE_CLASS_LABELS[system.foeClass] ?? "Heavy";
    context.foeClassChoices = FOE_CLASS_LABELS;

    // Conditions tab — toggleable status buttons (shared template w/ IconSheet)
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
    context.marksOnActor = marksOn(actor).map(m => ({ uuid: m.uuid, abilityName: m.abilityName, sourceName: m.sourceName, text: m.text }));
    context.conditions = {
      negative: markActive(groups.negative),
      positive: markActive(groups.positive),
      special:  markActive(groups.special),
    };
    // "🎲 Save" buttons at the top of the Conditions tab (BaseActorSheet#rollSave)
    context.saveableStatuses = this._saveableStatuses();

    _log(`_prepareContext — done | class: ${system.foeClass} | elite: ${system.isElite} | traits: ${system.traits.length} | actions: ${system.actions.length} | interrupts: ${system.interrupts.length}`);
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

  // Tabs, drop binding, portrait picker and status right-click handlers
  // all come from BaseActorSheet._onRender.

  /**
   * Form submit hook — when the GM changes foeClass or toggles isElite via
   * the header, inject the corresponding base stats from the p.298 glossary
   * into the same update so the form commits everything atomically.
   *
   * Elite template (p.299): doubles HP for non-mob classes. The 2-turns
   * effect is handled by IconCombat.turnsFor().
   *
   * This runs BEFORE the document update is issued, so there's no race with
   * re-renders.
   */
  _prepareSubmitData(event, form, formData, updateData) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const system     = submitData?.system;
    if (!system) return submitData;

    const currentClass = this.document.system.foeClass ?? "heavy";
    const currentElite = this.document.system.isElite  ?? false;
    const newClass     = system.foeClass ?? currentClass;
    // Booleans come back as "true"/"false" strings or actual booleans depending
    // on how the input was wired — coerce explicitly.
    const newElite     = system.isElite !== undefined
      ? (system.isElite === true || system.isElite === "true" || system.isElite === "on")
      : currentElite;

    const classChanged = system.foeClass !== undefined && newClass !== currentClass;
    const eliteChanged = system.isElite  !== undefined && newElite !== currentElite;

    if (classChanged || eliteChanged) {
      // Elite is forbidden on mob class — silently clear it.
      const effectiveElite = (newClass === "mob") ? false : newElite;
      const base = getFoeBaseStats(newClass, effectiveElite);
      _log(`_prepareSubmitData — builder change | ${currentClass}/${currentElite ? "elite" : "basic"} → ${newClass}/${effectiveElite ? "elite" : "basic"}`, base);
      system.foeClass  = newClass;
      system.isElite   = effectiveElite;
      system.vit       = base.vit;
      system.defense   = base.defense;
      system.speed     = base.speed;
      system.fray      = base.fray;
      system.damagedie = base.damagedie;
      system.armor     = base.armor;
      system.hp        = { value: base.hp.max, max: base.hp.max };

      // When switching to mob, initialise the members/hits tracker with the
      // canonical "2 members per PC" default (assume 3-PC party = 6 members
      // = 12 hits).
      if (classChanged && newClass === "mob") {
        const currentMob = this.document.system.mob ?? {};
        if (!currentMob.members || currentMob.members === 0) {
          system.mob = { members: 6, hitsRemaining: 12 };
        }
      }
    }

    return submitData;
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
    if (placement === null) ui.notifications.info(`${action.name}: area not placed — rolling the attack only.`);

    const mods = await FoeSheet.#promptAttackMods(action, actor, placement?.area ?? null);
    if (!mods) return;
    const rollTargets = mods.attackTargetId
      ? currentTargets().filter(t => t.tokenId === mods.attackTargetId)
      : null;

    await combatRoll({
      abilityName: action.name,
      // tags of the action: "true strike" / "unerring" make the Evasion check skip (p.117)
      tags:        action.tags ?? [],
      boons:       mods.boons,
      curses:      mods.curses,
      defense:     mods.defense,
      areaHtml:    placement ? areaSummaryHtml(placement, { attackTargetId: mods.attackTargetId }) : "",
      // Area attacks hit one target, the rest only take the area effect (p.117).
      targets:     rollTargets?.length ? rollTargets : null,
      statusEntries: npcActionStatusEntries(action, { sourceName: actor.name }),
      actor,
    });
  }

  /** "Inflict" block for a foe action / interrupt / round action card (statuses read from its text). */
  #statusHtmlFor(action, name) {
    return statusBlockHtml(npcActionStatusEntries(action, { sourceName: this.document.name }), { source: this.document, abilityName: name });
  }

  /** 🎯 Mark the targeted token with this action (marks.mjs); exactly one target. */
  static async #onMarkActionTarget(event, target) {
    event.stopPropagation();
    const action = this.document.system.actions[Number(target.dataset.actionIndex)];
    if (!action) return;
    const targets = Array.from(game.user?.targets ?? []).filter(t => t.actor);
    if (targets.length !== 1) { ui.notifications.warn("Target exactly one token to mark it (hover it and press T)."); return; }
    _log(`markActionTarget — "${action.name}" on ${targets[0].name}`);
    await applyMark({ source: this.document, target: targets[0].actor, abilityKey: `action:${action.name}`, abilityName: action.name,
                      text: action.description ?? "", multi: markFromTags(action.tags).multi });
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
    // Tags first (the book puts the shape in the action's header), then the
    // action's own text for the ones that only describe it in prose.
    const area = abilityArea(action.tags, [action.description, action.hitEffect, action.missEffect, action.areaEffect].join(" "));
    if (!area) { ui.notifications.warn(`"${action.name}" has no Blast / Line / Arc / Burst tag, and its text names no area.`); return; }
    _log(`placeActionArea — "${action.name}" | ${area.label}`);
    await placeAreaTemplate({ actor, area, abilityName: action.name, abilityKey: `action:${action.name}` });
  }

  /** Post a foe action to chat (name, cost, tags, description, hit/miss/area). */
  /** Post a foe trait to chat (elites/legends often carry fight-defining
   *  passives here — the GM needs to show them without retyping). */
  /** Post a foe/legend interrupt (trigger + effect) to chat. */
  static async #onFoeInterruptShowInChat(event, target) {
    event.stopPropagation();
    const idx       = Number(target.dataset.interruptIndex);
    const actor     = this.document;
    const interrupt = actor.system.interrupts[idx];
    if (!interrupt) return;
    _log(`foeInterruptShowInChat — actor: "${actor.name}" | interrupt[${idx}]: "${interrupt.name}"`);
    await postNpcInterruptCard(actor, interrupt, { statusHtml: this.#statusHtmlFor(interrupt, interrupt.name) });
  }

  static async #onFoeTraitShowInChat(event, target) {
    event.stopPropagation();
    const idx   = Number(target.dataset.traitIndex);
    const actor = this.document;
    const trait = actor.system.traits[idx];
    if (!trait) return;
    _log(`foeTraitShowInChat — actor: "${actor.name}" | trait[${idx}]: "${trait.name}"`);
    // Traits get the same Inflict / Gain / Effects block as actions (Titanfall, Sneak, Hold the Line…)
    await postNpcTraitCard(actor, trait, { statusHtml: this.#statusHtmlFor(trait, trait.name) });
  }

  static async #onFoeActionShowInChat(event, target) {
    event.stopPropagation();
    const idx    = Number(target.dataset.actionIndex);
    const actor  = this.document;
    const action = actor.system.actions[idx];
    if (!action) return;
    _log(`foeActionShowInChat — actor: "${actor.name}" | action[${idx}]: "${action.name}"`);
    await postNpcActionCard(actor, action, { statusHtml: this.#statusHtmlFor(action, action.name) });
  }

  /** Post a foe round action (name, round, effect) to chat. */
  static async #onFoeRoundActionShowInChat(event, target) {
    event.stopPropagation();
    const idx   = Number(target.dataset.roundActionIndex);
    const actor = this.document;
    const ra    = actor.system.roundActions[idx];
    if (!ra) return;
    _log(`foeRoundActionShowInChat — actor: "${actor.name}" | roundAction[${idx}]: "${ra.name}"`);
    await postNpcRoundActionCard(actor, ra, { statusHtml: this.#statusHtmlFor(ra, ra.name) });
  }


  /**
   * Roll damage for a foe action. Parses [D] / fray / flat from the action's
   * hit/miss/area text via _parseAbilityDamage and posts a damage chat card
   * with per-target Apply buttons, matching the PC damage flow.
   */
  static async #onRollFoeDamage(event, target) {
    event.stopPropagation();
    const idx    = Number(target.dataset.actionIndex);
    const actor  = this.document;
    const action = actor.system.actions[idx];
    if (!action) return;

    const parsed = _parseAbilityDamage(action);
    _log(`rollFoeDamage — actor: "${actor.name}" | action[${idx}]: "${action.name}" | parsed:`, parsed);
    if (!parsed.dealsDamage) {
      ui.notifications.warn(`"${action.name}" does not deal damage.`);
      return;
    }

    const mods = await FoeSheet.#promptFoeDamageMods(action, parsed, actor);
    if (!mods) return;

    await postAbilityDamageCard(actor, {
      parsed,
      outcome:     mods.outcome,
      damagedie:   actor.system.damagedie || "d6",
      fray:        actor.system.fray ?? 0,
      abilityName: action.name,
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
    });
  }

  /** Dialog for foe damage modifiers: outcome, bonus dice, target mitigation. */
  static async #promptFoeDamageMods(action, parsed, actor) {
    return promptDamageMods(
      { name: action.name, cost: abilityCostLabel(action.cost), tags: action.tags ?? [], parsed, isAutoHit: !!parsed.isAutoHit, parsedCombo: null },
      { damagedie: actor.system.damagedie || "d6", fray: actor.system.fray ?? 0 },
      { actor },
    );
  }

  /**
   * Prompt for boons/curses/target defense before rolling a foe attack.
   * Mirrors IconSheet's #promptAttackMods so the experience is consistent
   * between PC and foe rolls.
   */
  /** Toggle a status effect on this foe (Conditions tab buttons). */
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

  /** Adjust the charge count of a stackable status (Blessed, Power Die). */
  static async #onAdjustStatusCharges(event, target) {
    event.preventDefault();
    const statusId = target.dataset.statusId;
    if (!statusId) return;
    const delta = event.type === "contextmenu" ? -1 : (Number(target.dataset.delta) || 1);
    const next = await adjustStatusCharges(this.document, statusId, delta);
    _log(`adjustStatusCharges — "${statusId}" → ${next}`);
  }

  /** Adjust this foe's elevation flag (left=+1, right-click=-1, middle=reset). */
  static async #onAdjustElevation(event, target) {
    event.preventDefault();
    const actor = this.document;
    const current = actor.getFlag("icon-system", "elevation") ?? 0;
    let delta = Number(target.dataset.delta);
    if (event.type === "contextmenu") delta = -1;
    if (event.button === 1) delta = -current;
    const next = current + (Number.isFinite(delta) ? delta : 1);
    _log(`adjustElevation — actor: "${actor.name}" | ${current} → ${next}`);
    await actor.setFlag("icon-system", "elevation", next);
    if (next !== 0 && !hasStatus(actor, "elevation")) {
      await applyStatus(actor, "elevation");
    } else if (next === 0 && hasStatus(actor, "elevation")) {
      await removeStatus(actor, "elevation");
    }
  }

  static async #promptAttackMods(action, actor, area = null) {
    return promptAttackMods({ name: action.name, cost: abilityCostLabel(action.cost), tags: action.tags ?? [] }, actor, { area });
  }

  static async #onApplyBaseStats(event, target) {
    const actor = this.document;
    const s     = actor.system;
    const base  = getFoeBaseStats(s.foeClass, s.isElite);
    _log(`applyBaseStats — actor: "${actor.name}" | class: ${s.foeClass} | elite: ${s.isElite} | stats:`, base);
    await actor.update({
      "system.vit":        base.vit,
      "system.defense":    base.defense,
      "system.speed":      base.speed,
      "system.fray":       base.fray,
      "system.damagedie":  base.damagedie,
      "system.armor":      base.armor,
      "system.hp.value":   base.hp.max,
      "system.hp.max":     base.hp.max,
    });
    const label = `${FOE_CLASS_LABELS[s.foeClass] ?? s.foeClass}${s.isElite ? " (Elite)" : ""}`;
    ui.notifications.info(`Base stats applied for ${label}.`);
  }

  static async #onAddTrait(event, target) {
    const traits = foundry.utils.deepClone(this.document.system.traits);
    _log(`addTrait — actor: "${this.document.name}" | count: ${traits.length} → ${traits.length + 1}`);
    traits.push({ name: "New Trait", description: "" });
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
    actions.push({ name: "New Action", cost: "1action", tags: [], hitEffect: "", missEffect: "", areaEffect: "", description: "" });
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
    interrupts.push({ name: "New Interrupt", limit: 1, trigger: "", effect: "", description: "" });
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
        return ui.notifications.warn(`Cannot drop item type "${item.type}" on a Foe.`);
      }
      await this.#onDropFoeAbility(item);
    } finally {
      this._dropInProgress = false;
    }
  }

  async #onDropFoeAbility(item) {
    const s     = item.system;
    const actor = this.document;
    // Compendium items are named "FoeName — AbilityName"; strip the prefix
    // when copying onto a foe so the actor displays just the ability name.
    const cleanName = item.name.includes(" — ")
      ? item.name.split(" — ").slice(1).join(" — ").trim()
      : item.name;
    _log(`dropFoeAbility — actor: "${actor.name}" | item: "${item.name}" | cleaned: "${cleanName}" | abilityType: "${s.abilityType}"`);
    switch (s.abilityType) {
      case "action": {
        const actions = foundry.utils.deepClone(actor.system.actions);
        actions.push({ name: cleanName, cost: s.cost || "1action", tags: s.tags ?? [], hitEffect: s.hitEffect ?? "", missEffect: s.missEffect ?? "", areaEffect: s.areaEffect ?? "", description: s.description ?? "" });
        _log(`dropFoeAbility — added action "${cleanName}" | total actions: ${actions.length}`);
        await actor.update({ "system.actions": actions });
        break;
      }
      case "interrupt": {
        const interrupts = foundry.utils.deepClone(actor.system.interrupts);
        interrupts.push({ name: cleanName, limit: s.interruptLimit ?? 1, trigger: s.trigger ?? "", effect: s.description ?? "", description: "" });
        _log(`dropFoeAbility — added interrupt "${cleanName}" | total: ${interrupts.length}`);
        await actor.update({ "system.interrupts": interrupts });
        break;
      }
      case "trait": {
        const traits = foundry.utils.deepClone(actor.system.traits);
        traits.push({ name: cleanName, description: s.description ?? "" });
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

  /** Track interrupt uses during combat. Uses a flag (not persisted to DB via update). */
  static async #onTickInterrupt(event, target) {
    const idx       = Number(target.dataset.index);
    const interrupt = this.document.system.interrupts[idx];
    if (!interrupt) return;
    const uses = this.document.getFlag("icon-system", `interruptUses.${idx}`) ?? 0;
    const next = Math.min(uses + 1, interrupt.limit);
    _log(`tickInterrupt — actor: "${this.document.name}" | idx: ${idx} | name: "${interrupt.name}" | uses: ${uses} → ${next} / ${interrupt.limit}`);
    await this.document.setFlag("icon-system", `interruptUses.${idx}`, next);
  }
}
