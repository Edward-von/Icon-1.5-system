/**
 * IconItemSheet — ApplicationV2 sheet for all ICON item types.
 * Renders type-specific fields via conditional HBS blocks.
 */
import { enrichHTML, postNpcTraitCard } from "../helpers/enrich.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

const _log = (...args) => console.debug("[ICON | IconItemSheet]", ...args);

export class IconItemSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["icon", "sheet", "item", "icon-item-sheet"],
    position: { width: 580, height: 620 },
    window:   { resizable: true },
    actions: {
      addChapterScaling:    IconItemSheet.#onAddChapterScaling,
      removeChapterScaling: IconItemSheet.#onRemoveChapterScaling,
      addTag:               IconItemSheet.#onAddTag,
      removeTag:            IconItemSheet.#onRemoveTag,
      addJobTrait:          IconItemSheet.#onAddJobTrait,
      removeJobTrait:       IconItemSheet.#onRemoveJobTrait,
      addWeaponSlot:        IconItemSheet.#onAddWeaponSlot,
      removeWeaponSlot:     IconItemSheet.#onRemoveWeaponSlot,
      itemShowInChat:       IconItemSheet.#onItemShowInChat,
    },
    form: { submitOnChange: true },
  };

  static PARTS = {
    header: { template: "systems/icon-system/templates/item/item-header.hbs" },
    main:   { template: "systems/icon-system/templates/item/item-main.hbs", scrollable: [""] },
  };

  get title() { return `${this.document.name} [${this.document.type}]`; }

  /** Show in Chat from the item sheet itself (works in compendium view too,
   *  where there is no actor sheet to post from). Foe abilities and traits
   *  post the generic trait/action card; the parent actor (if embedded) is
   *  the speaker. */
  static async #onItemShowInChat(event, target) {
    event.stopPropagation();
    const item   = this.document;
    const actor  = item.parent instanceof Actor ? item.parent : null;
    const system = item.system ?? {};
    _log(`itemShowInChat — "${item.name}" (${item.type})`);
    if (item.type === "foe-ability" && system.abilityType !== "trait") {
      const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
      const a = {
        name:        item.name,
        cost:        system.cost ?? "",
        tags:        (system.tags ?? []).filter(t => t && t.trim()),
        description: await enrichHTML(system.description),
        hitEffect:   await enrichHTML(system.hitEffect),
        missEffect:  await enrichHTML(system.missEffect),
        areaEffect:  await enrichHTML(system.areaEffect),
      };
      const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "" });
      await ChatMessage.create({ speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(), content });
      return;
    }
    await postNpcTraitCard(actor, { name: item.name, description: system.description }, { label: system.jobName || actor?.name || "" });
  }

  async _prepareContext(options) {
    _log(`_prepareContext — item: "${this.document.name}" | type: "${this.document.type}"`);
    const context = await super._prepareContext(options);
    const item    = this.document;
    const system  = item.system;

    context.item       = item;
    context.system     = system;
    context.itemType   = item.type;
    context.config     = CONFIG.ICON;
    context.isEditable = this.isEditable;
    context.canShowInChat = ["foe-ability", "trait"].includes(item.type);

    context.classChoices = {
      stalwart:  "Stalwart",
      vagabond:  "Vagabond",
      mendicant: "Mendicant",
      wright:    "Wright",
    };
    context.costChoices = {
      "1action":    "1 Action",
      "2actions":   "2 Actions",
      "free":       "Free",
      "interrupt-1":"Interrupt (1)",
      "interrupt-2":"Interrupt (2)",
      "interrupt-3":"Interrupt (3)",
    };
    context.chapterChoices = { 1: "Chapter 1", 2: "Chapter 2", 3: "Chapter 3" };
    context.invokeChoices  = { attack: "Attack", gambit: "Gambit", round: "Round" };
    context.sourceChoices  = { job: "Job", class: "Class" };
    context.abilityTypeChoices = { action: "Action", interrupt: "Interrupt", trait: "Trait", "round-action": "Round Action" };

    switch (item.type) {
      case "ability":
        context.enriched = {
          hitEffect:           await _enrich(system.hitEffect),
          missEffect:          await _enrich(system.missEffect),
          areaEffect:          await _enrich(system.areaEffect),
          chargeEffect:        await _enrich(system.chargeEffect),
          heroicEffect:        await _enrich(system.heroicEffect),
          exceedEffect:        await _enrich(system.exceedEffect),
          collideEffect:       await _enrich(system.collideEffect),
          slayEffect:          await _enrich(system.slayEffect),
          critEffect:          await _enrich(system.critEffect),
          finishingBlowEffect: await _enrich(system.finishingBlowEffect),
          comebackEffect:      await _enrich(system.comebackEffect),
          comboEffect:         await _enrich(system.comboEffect),
          talent1:             await _enrich(system.talent1),
          talent2:             await _enrich(system.talent2),
          mastery:             await _enrich(system.mastery),
          description:         await _enrich(system.description),
        };
        // Interrupt abilities use a cost of "interrupt-1/2/3" — expose a flag so
        // the sheet can always show the Trigger field (even when still empty),
        // instead of only when interruptTrigger already has a value.
        context.isInterruptAbility = String(system.cost ?? "").startsWith("interrupt");
        break;
      case "limit-break":
        context.enriched = {
          effect:      await _enrich(system.effect),
          ultimate:    await _enrich(system.ultimate),
          description: await _enrich(system.description),
        };
        break;
      case "trait":
      case "gear-kit":
        context.enriched = { description: await _enrich(system.description) };
        break;
      case "bond":
        context.enriched = {
          specialAbility: await _enrich(system.specialAbility),
          description:    await _enrich(system.description),
        };
        break;
      case "relic":
        context.enriched = {
          rank1:       await _enrich(system.rank1?.description),
          rank2:       await _enrich(system.rank2?.description),
          rank3:       await _enrich(system.rank3?.description),
          aspect:      await _enrich(system.aspect?.description),
          questDesc:   await _enrich(system.aspect?.questDescription),
          invokeEffect:await _enrich(system.invokeEffect),
        };
        break;
      case "bond-power":
        context.enriched = { description: await _enrich(system.description) };
        break;
      case "foe-ability":
        context.enriched = {
          hitEffect:   await _enrich(system.hitEffect),
          missEffect:  await _enrich(system.missEffect),
          areaEffect:  await _enrich(system.areaEffect),
          description: await _enrich(system.description),
        };
        break;
      case "job-template":
        context.enriched = {
          description: await _enrich(system.description),
          lbEffect:    await _enrich(system.limitBreak?.effect),
          lbUltimate:  await _enrich(system.limitBreak?.ultimate),
        };
        context.enrichedJobTraits = await Promise.all((system.traits ?? []).map(async (t, i) => ({
          ...t, i, enrichedDescription: await _enrich(t.description),
        })));
        break;
    }

    _log(`_prepareContext — done | enrichedKeys: ${Object.keys(context.enriched ?? {}).join(", ") || "(none)"}`);
    return context;
  }

  _onRender(context, options) {
    _log(`_onRender — item: "${this.document.name}" | type: "${this.document.type}"`);
    super._onRender(context, options);
  }

  /* -------------------------------------------------- */
  /*  Actions                                            */
  /* -------------------------------------------------- */

  static async #onAddChapterScaling(event, target) {
    if (this.document.type !== "bond-power") {
      _log(`addChapterScaling — BLOCKED: item type "${this.document.type}" (need "bond-power")`);
      return;
    }
    const scaling = foundry.utils.deepClone(this.document.system.chapterScaling);
    const next = [1, 2, 3].find(c => !scaling.some(s => s.chapter === c)) ?? 1;
    _log(`addChapterScaling — item: "${this.document.name}" | chapter: ${next} | count: ${scaling.length} → ${scaling.length + 1}`);
    scaling.push({ chapter: next, description: "" });
    await this.document.update({ "system.chapterScaling": scaling });
  }

  static async #onRemoveChapterScaling(event, target) {
    const idx     = Number(target.dataset.index);
    const scaling = foundry.utils.deepClone(this.document.system.chapterScaling);
    _log(`removeChapterScaling — item: "${this.document.name}" | idx: ${idx} | chapter: ${scaling[idx]?.chapter}`);
    scaling.splice(idx, 1);
    await this.document.update({ "system.chapterScaling": scaling });
  }

  static async #onAddTag(event, target) {
    const tags = foundry.utils.deepClone(this.document.system.tags ?? []);
    _log(`addTag — item: "${this.document.name}" | count: ${tags.length} → ${tags.length + 1}`);
    tags.push("");
    await this.document.update({ "system.tags": tags });
  }

  static async #onRemoveTag(event, target) {
    const idx  = Number(target.dataset.index);
    const tags = foundry.utils.deepClone(this.document.system.tags ?? []);
    _log(`removeTag — item: "${this.document.name}" | idx: ${idx} | value: "${tags[idx]}"`);
    tags.splice(idx, 1);
    await this.document.update({ "system.tags": tags });
  }

  static async #onAddJobTrait(event, target) {
    if (this.document.type !== "job-template") return;
    const traits = foundry.utils.deepClone(this.document.system.traits ?? []);
    _log(`addJobTrait — item: "${this.document.name}" | count: ${traits.length} → ${traits.length + 1}`);
    traits.push({ name: "New Trait", description: "" });
    await this.document.update({ "system.traits": traits });
  }

  static async #onRemoveJobTrait(event, target) {
    if (this.document.type !== "job-template") return;
    const idx    = Number(target.dataset.index);
    const traits = foundry.utils.deepClone(this.document.system.traits ?? []);
    _log(`removeJobTrait — item: "${this.document.name}" | idx: ${idx} | name: "${traits[idx]?.name}"`);
    traits.splice(idx, 1);
    await this.document.update({ "system.traits": traits });
  }

  static async #onAddWeaponSlot(event, target) {
    if (this.document.type !== "job-template") return;
    const slots = foundry.utils.deepClone(this.document.system.weaponSlots ?? []);
    _log(`addWeaponSlot — item: "${this.document.name}" | count: ${slots.length} → ${slots.length + 1}`);
    slots.push("");
    await this.document.update({ "system.weaponSlots": slots });
  }

  static async #onRemoveWeaponSlot(event, target) {
    if (this.document.type !== "job-template") return;
    const idx   = Number(target.dataset.index);
    const slots = foundry.utils.deepClone(this.document.system.weaponSlots ?? []);
    _log(`removeWeaponSlot — item: "${this.document.name}" | idx: ${idx} | value: "${slots[idx]}"`);
    slots.splice(idx, 1);
    await this.document.update({ "system.weaponSlots": slots });
  }
}

async function _enrich(html) {
  return enrichHTML(html);
}
