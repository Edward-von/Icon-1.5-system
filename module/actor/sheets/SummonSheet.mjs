/**
 * SummonSheet — ApplicationV2 sheet for Summon tokens (type: "summon").
 */
import { enrichHTML, summonRulesHTML } from "../../helpers/enrich.mjs";
import { combatRoll } from "../../dice/rolls.mjs";
import { promptAttackMods, promptDamageMods } from "../../apps/roll-dialogs.mjs";
import { postAbilityDamageCard } from "../../combat/damage.mjs";
import { summonStatusEntries } from "../../combat/ability-statuses.mjs";
import { parseAbilityDamage as _parseAbilityDamage } from "../../combat/ability-damage.mjs";
import { PROTOTYPE_TOKEN_CONTROL, onConfigurePrototypeToken, filterPrototypeTokenControl } from "./_prototype-token-control.mjs";
import { REFERENCE_CONTROL, onShowReferenceControl } from "../../apps/reference.mjs";
import { BaseActorSheet } from "./BaseActorSheet.mjs";
import { mapObjectFlag, changeObjectHeight, toggleObjectDestructible, objectSheetInfo, postObjectToChat, removeMapObject, pickUpObjectBlessing, eruptObject, teleportToObject, relocateObject } from "../../canvas/map-objects.mjs";

const _log = (...args) => console.debug("[ICON | SummonSheet]", ...args);

/** Damagedie/fray live in different places per actor type. */
function _resolveDamageStats(actor) {
  const s = actor?.system ?? {};
  return {
    damagedie: s.combat?.damagedie ?? s.damagedie ?? "d6",
    fray:      s.combat?.fray      ?? s.fray      ?? 0,
  };
}

export class SummonSheet extends BaseActorSheet {

  static DEFAULT_OPTIONS = {
    classes: ["icon", "sheet", "actor", "summon-sheet"],
    position: { width: 500, height: 420 },
    window:   { resizable: true, controls: [PROTOTYPE_TOKEN_CONTROL, REFERENCE_CONTROL] },
    actions: {
      rollSave:         BaseActorSheet.onRollSave,   // Conditions tab / save bar
      configurePrototypeToken: onConfigurePrototypeToken,
      showReference:     onShowReferenceControl,
      toggleIntangible:  SummonSheet.#onToggleIntangible,
      objectHeight:      SummonSheet.#onObjectHeight,
      toggleDestructible: SummonSheet.#onToggleDestructible,
      objectToChat:      SummonSheet.#onObjectToChat,
      objectRemove:      SummonSheet.#onObjectRemove,
      objectBlessing:    SummonSheet.#onObjectBlessing,
      objectErupt:       SummonSheet.#onObjectErupt,
      objectTeleport:    SummonSheet.#onObjectTeleport,
      objectRelocate:    SummonSheet.#onObjectRelocate,
      rollSummonAttack:  SummonSheet.#onRollSummonAttack,
      rollSummonDamage:  SummonSheet.#onRollSummonDamage,
    },
    form: { submitOnChange: true },
  };

  static PARTS = {
    main: { template: "systems/icon-system/templates/actor/summon-sheet.hbs", scrollable: [""] },
  };

  get title() { return this.document.name; }

  /** @override — add the "Prototype Token" control (DocumentSheetV2 lacks it). */
  _getHeaderControls() { return filterPrototypeTokenControl(super._getHeaderControls(), this); }

  async _prepareContext(options) {
    _log(`_prepareContext — actor: "${this.document.name}"`);
    const context = await super._prepareContext(options);
    const actor   = this.document;
    const system  = actor.system;

    context.actor      = actor;
    context.system     = system;
    context.config     = CONFIG.ICON;
    context.isEditable = this.isEditable;

    context.enrichedSummonAction = await enrichHTML(system.summonAction);
    // A foe's summon copies its rules as written ("… • a • b"): one line per bullet, as on the foe sheet.
    context.enrichedSummonEffect = await enrichHTML(summonRulesHTML(system.summonEffect));
    context.enrichedNotes        = await enrichHTML(system.notes);

    const parsed = _parseAbilityDamage({ description: system.summonAction });
    context.parsedAction = parsed;
    context.dealsDamage  = parsed.dealsDamage;
    context.hasAction    = !!(system.summonAction && String(system.summonAction).trim());

    if (system.summonerActorId) {
      const summoner = game.actors?.get(system.summonerActorId);
      context.summonerName = summoner?.name ?? system.summonerActorId;
      _log(`_prepareContext — summonerId: "${system.summonerActorId}" → "${context.summonerName}"`);
    } else {
      context.summonerName = "—";
    }

    // An object an ability / trait put on the map (R33a, map-objects.mjs): height and destructible.
    const obj = mapObjectFlag(actor);
    context.mapObject = obj ? {
      height:       system.size,
      canLower:     system.size > 1,
      canRaise:     system.size < 3,
      destructible: !system.intangible,
      aura:         obj.aura || 0,
      isGM:         game.user.isGM,
    } : null;
    // R33a2: its rules, the total height of its stack and the benefits on now, Comet's pick up.
    if (context.mapObject) {
      const info = objectSheetInfo(actor);
      if (info) {
        Object.assign(context.mapObject, info, { height: system.size });
        // R33a3: the sidebar's world actor is the template of its copies: no height of its own to change.
        if (info.world) Object.assign(context.mapObject, { canLower: false, canRaise: false, copiesLabel: info.copies.map(c => c.label).join(", ") });
        context.mapObject.enrichedRules = info.rules ? await enrichHTML(foundry.utils.escapeHTML(info.rules)) : "";
        context.mapObject.enrichedUpgrades = await Promise.all(info.upgrades.map(async u => ({ source: u.source, html: await enrichHTML(foundry.utils.escapeHTML(u.text)) })));
      }
    }

    // Save buttons: a summon carries statuses like anyone else (BaseActorSheet#rollSave)
    context.saveableStatuses = this._saveableStatuses();

    _log(`_prepareContext — done | intangible: ${system.intangible}`);
    return context;
  }

  // Drop binding, portrait picker and tab handling come from BaseActorSheet.

  static async #onToggleIntangible(event, target) {
    const current = this.document.system.intangible;
    _log(`toggleIntangible — actor: "${this.document.name}" | ${current} → ${!current}`);
    await this.document.update({ "system.intangible": !current });
  }

  /** Object: height − / + (data-delta), within 1-3 and the stack's 3 (p.89, p.95). */
  static async #onObjectHeight(event, target) {
    await changeObjectHeight(this.document, Number(target.dataset.delta) || 0);
  }

  /** Object, GM only: destructible (10 hp, auto-hit, fails saves, p.89) or immune again. */
  static async #onToggleDestructible(event, target) {
    await toggleObjectDestructible(this.document);
  }

  /** Object: post its rules and the height benefits on now to chat (R33a2). */
  static async #onObjectToChat(event, target) {
    await postObjectToChat(this.document);
  }

  /** Object: take it off the map — Comet's "Pick up" (R33a2); objects stacked on it come down. */
  static async #onObjectRemove(event, target) {
    await removeMapObject(this.document);
  }

  /** Object: pick its blessing token up — Megamushroom (Spore Shroud p.187, plant p.184; R33a3). */
  static async #onObjectBlessing(event, target) {
    await pickUpObjectBlessing(this.document);
  }

  /** Object: erupt — Geyser / Volcanic Geyser (p.232; R33a3): a card with whom to place, then it goes. */
  static async #onObjectErupt(event, target) {
    await eruptObject(this.document);
  }

  /** Object: Underway's "Teleport here" — the selected token goes next to this portal (p.168; R33a4). */
  static async #onObjectTeleport(event, target) {
    await teleportToObject(this.document);
  }

  /** Object: Aethershard Talent I's move up to range 2 (p.210; R33a4). */
  static async #onObjectRelocate(event, target) {
    await relocateObject(this.document);
  }

  /** Roll the summon's attack as a standard combat roll. Speaker is the summon;
   *  stats come from the summoner when available for boon/curse auto-mods. */
  static async #onRollSummonAttack(event, target) {
    const actor    = this.document;
    const summoner = actor.system.summonerActorId
      ? game.actors?.get(actor.system.summonerActorId)
      : null;
    const abilityName = actor.system.sourceAbilityName || actor.name;
    // Same restyled dialog as PCs / foes (targets, defensive chips, Evasion note);
    // boon / curse auto-mods come from the summoner when one is set.
    const mods = await promptAttackMods({ name: abilityName, cost: "", tags: [] }, actor, { modsActor: summoner ?? actor });
    if (!mods) return;

    _log(`rollSummonAttack — summon: "${actor.name}" | ability: "${abilityName}" | summoner: "${summoner?.name ?? "(none)"}"`);
    await combatRoll({
      abilityName,
      boons:   mods.boons,
      curses:  mods.curses,
      defense: mods.defense,
      critAt: mods.critAt,
      exceedAt: mods.exceedAt,
      statusEntries: summonStatusEntries(actor.system.summonAction, { sourceName: actor.name }),
      evasionOverride: mods.evasion,
      actor,
    });
  }

  /** Roll damage from the summon's action text. [D]/fray come from the summoner
   *  (if set) because the summon carries no damagedie/fray of its own. */
  static async #onRollSummonDamage(event, target) {
    event.stopPropagation();
    const actor    = this.document;
    const summoner = actor.system.summonerActorId
      ? game.actors?.get(actor.system.summonerActorId)
      : null;

    const parsed = _parseAbilityDamage({ description: actor.system.summonAction });
    if (!parsed.dealsDamage) {
      ui.notifications.warn("This summon's action does not deal damage.");
      return;
    }

    const { damagedie, fray } = _resolveDamageStats(summoner ?? actor);
    const abilityName = actor.system.sourceAbilityName || actor.name;
    // Same damage dialog as PCs / foes / legends: Other outcome, Pierce /
    // Divine / True Strike, targets. The summon has its own Attack roll, so
    // Hit is always offered.
    const mods = await promptDamageMods(
      { name: abilityName, cost: "", tags: [], parsed, isAttack: true, isAutoHit: !!parsed.isAutoHit, parsedCombo: null },
      { damagedie, fray },
      { actor },
    );
    if (!mods) return;

    _log(`rollSummonDamage — summon: "${actor.name}" | summoner: "${summoner?.name ?? "(none)"}" | [D]: ${damagedie} | fray: ${fray}`);
    await postAbilityDamageCard(actor, {
      parsed,
      outcome:     mods.outcome,
      damagedie,
      fray,
      abilityName,
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

  /* -------------------------------------------------- */
  /*  Drag-drop                                          */
  /* -------------------------------------------------- */

  /**
   * Drop handler. Supports two types of payloads:
   *   • Actor  → set summonerActorId (link this summon to a PC/foe/legend).
   *   • Item   → populate sourceAbilityName + summonAction from the ability
   *              text. Accepts ability / foe-ability / limit-break / trait.
   */
  async _onDropSheet(event) {
    if (this._dropInProgress) return;
    this._dropInProgress = true;
    try {
      let data;
      try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
      catch { return; }

      if (data?.type === "Actor") {
        const actor = await Actor.implementation.fromDropData(data);
        if (!actor) return;
        _log(`drop Actor — summoner: "${actor.name}" (${actor.id})`);
        await this.document.update({ "system.summonerActorId": actor.id });
        ui.notifications.info(`Summoner set to ${actor.name}.`);
        return;
      }

      if (data?.type === "Item") {
        const item = await Item.implementation.fromDropData(data);
        if (!item) return;
        _log(`drop Item — "${item.name}" | type: "${item.type}"`);

        const s = item.system ?? {};
        // Strip "FoeName — " prefix sometimes used by compendium naming.
        const cleanName = item.name.includes(" — ")
          ? item.name.split(" — ").slice(1).join(" — ").trim()
          : item.name;

        // Pick the best text field for each item type.
        let actionText = "";
        switch (item.type) {
          case "ability": {
            // Stitch together the hit/miss/effect blocks into one description.
            const parts = [];
            if (s.hitEffect)  parts.push(`<p><strong>Hit:</strong> ${s.hitEffect}</p>`);
            if (s.missEffect) parts.push(`<p><strong>Miss:</strong> ${s.missEffect}</p>`);
            if (s.areaEffect) parts.push(`<p><strong>Area:</strong> ${s.areaEffect}</p>`);
            if (s.description) parts.push(s.description);
            actionText = parts.join("");
            break;
          }
          case "foe-ability": {
            const parts = [];
            if (s.hitEffect)  parts.push(`<p><strong>Hit:</strong> ${s.hitEffect}</p>`);
            if (s.missEffect) parts.push(`<p><strong>Miss:</strong> ${s.missEffect}</p>`);
            if (s.areaEffect) parts.push(`<p><strong>Area:</strong> ${s.areaEffect}</p>`);
            if (s.description) parts.push(s.description);
            actionText = parts.join("");
            break;
          }
          case "limit-break":
            actionText = s.effect ?? s.description ?? "";
            break;
          case "trait":
            actionText = s.description ?? "";
            break;
          default:
            ui.notifications.warn(`Cannot drop item type "${item.type}" on a Summon.`);
            return;
        }

        await this.document.update({
          "system.sourceAbilityName": cleanName,
          "system.summonAction":      actionText,
        });
        ui.notifications.info(`Summon configured from "${cleanName}".`);
        return;
      }
    } finally {
      this._dropInProgress = false;
    }
  }
}
