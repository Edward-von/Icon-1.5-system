/**
 * SummonSheet — ApplicationV2 sheet for Summon tokens (type: "summon").
 */
import { enrichHTML, escapeHTML } from "../../helpers/enrich.mjs";
import { combatRoll } from "../../dice/rolls.mjs";
import { postAbilityDamageCard } from "../../combat/damage.mjs";
import { getActorStatusMods } from "../../combat/status-modifiers.mjs";
import { parseAbilityDamage as _parseAbilityDamage } from "../../combat/ability-damage.mjs";
import { PROTOTYPE_TOKEN_CONTROL, onConfigurePrototypeToken, filterPrototypeTokenControl } from "./_prototype-token-control.mjs";
import { REFERENCE_CONTROL, onShowReferenceControl } from "../../apps/reference.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

const _log = (...args) => console.debug("[ICON | SummonSheet]", ...args);

/** Damagedie/fray live in different places per actor type. */
function _resolveDamageStats(actor) {
  const s = actor?.system ?? {};
  return {
    damagedie: s.combat?.damagedie ?? s.damagedie ?? "d6",
    fray:      s.combat?.fray      ?? s.fray      ?? 0,
  };
}

export class SummonSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["icon", "sheet", "actor", "summon-sheet"],
    position: { width: 500, height: 420 },
    window:   { resizable: true, controls: [PROTOTYPE_TOKEN_CONTROL, REFERENCE_CONTROL] },
    actions: {
      configurePrototypeToken: onConfigurePrototypeToken,
      showReference:     onShowReferenceControl,
      toggleIntangible:  SummonSheet.#onToggleIntangible,
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
    context.enrichedSummonEffect = await enrichHTML(system.summonEffect);
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

    _log(`_prepareContext — done | intangible: ${system.intangible}`);
    return context;
  }

  _onRender(context, options) {
    _log(`_onRender — actor: "${this.document.name}"`);
    super._onRender(context, options);
    // Bind drop listener once per element to avoid N-fold duplication.
    if (!this.element.dataset.iconDropBound) {
      this.element.dataset.iconDropBound = "true";
      this.element.addEventListener("dragover", ev => ev.preventDefault());
      this.element.addEventListener("drop",     ev => this.#onDrop(ev));
    }

    // Portrait img picker — V2 sheets don't auto-bind data-edit="img".
    this.element.querySelectorAll('img[data-edit="img"]').forEach(img => {
      if (img.dataset.iconImgBound) return;
      img.dataset.iconImgBound = "true";
      img.style.cursor = "pointer";
      img.addEventListener("click", ev => {
        if (!this.isEditable) return;
        ev.preventDefault();
        new foundry.applications.apps.FilePicker.implementation({
          type: "image",
          current: this.document.img,
          callback: path => {
            _log(`portrait — picked: "${path}"`);
            this.document.update({ img: path });
          },
          top:  this.position.top + 40,
          left: this.position.left + 10,
        }).browse();
      });
    });
  }

  static async #onToggleIntangible(event, target) {
    const current = this.document.system.intangible;
    _log(`toggleIntangible — actor: "${this.document.name}" | ${current} → ${!current}`);
    await this.document.update({ "system.intangible": !current });
  }

  /** Roll the summon's attack as a standard combat roll. Speaker is the summon;
   *  stats come from the summoner when available for boon/curse auto-mods. */
  static async #onRollSummonAttack(event, target) {
    const actor    = this.document;
    const summoner = actor.system.summonerActorId
      ? game.actors?.get(actor.system.summonerActorId)
      : null;
    const modSource = summoner ?? actor;

    const auto = getActorStatusMods(modSource);
    const targets = Array.from(game.user?.targets ?? []);
    let autoDefense = "";
    let targetNote  = "";
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
    const noteHtml = auto.notes.length
      ? `<p style="margin:0;font-size:.85em;color:#c4a64f;border-left:3px solid #c4a64f;padding-left:6px">⚠ Auto-applied: ${auto.notes.join(" • ")}</p>`
      : "";
    const abilityName = actor.system.sourceAbilityName || actor.name;
    const content = `
      <div style="display:flex; flex-direction:column; gap:6px; padding:4px 0">
        <p style="margin:0"><strong>${escapeHTML(abilityName)}</strong></p>
        ${targetNote}
        ${noteHtml}
        <label>Boons:  <input type="number" name="boons"  value="${auto.boons}"  min="0" max="9" style="width:60px"></label>
        <label>Curses: <input type="number" name="curses" value="${auto.curses}" min="0" max="9" style="width:60px"></label>
        <label>Target Defense: <input type="number" name="defense" value="${autoDefense}" min="0" placeholder="(optional)" style="width:80px"></label>
      </div>
    `;
    let mods;
    try {
      mods = await foundry.applications.api.DialogV2.prompt({
        window: { title: `Attack: ${abilityName}` },
        content,
        ok: {
          label: "Roll Attack",
          callback: (_e, button, dialog) => {
            const root = button?.form ?? dialog?.element ?? dialog;
            const defenseVal = root.querySelector('input[name="defense"]')?.value;
            return {
              boons:   Number(root.querySelector('input[name="boons"]')?.value  ?? 0),
              curses:  Number(root.querySelector('input[name="curses"]')?.value ?? 0),
              defense: defenseVal ? Number(defenseVal) : null,
            };
          },
        },
        rejectClose: false,
      });
    } catch { return; }
    if (!mods) return;

    _log(`rollSummonAttack — summon: "${actor.name}" | ability: "${abilityName}" | summoner: "${summoner?.name ?? "(none)"}"`);
    await combatRoll({
      abilityName,
      boons:   mods.boons,
      curses:  mods.curses,
      defense: mods.defense,
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

    const mods = await SummonSheet.#promptSummonDamageMods(actor, parsed);
    if (!mods) return;

    const { damagedie, fray } = _resolveDamageStats(summoner ?? actor);
    const abilityName = actor.system.sourceAbilityName || actor.name;
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
    });
  }

  static async #promptSummonDamageMods(actor, parsed) {
    const content = `
      <form>
        <div class="form-group">
          <label>Outcome</label>
          <select name="outcome">
            <option value="hit"  selected>Hit</option>
            ${parsed.hit.mult > 0 ? '<option value="crit">Critical (+1 die)</option>' : ""}
            ${parsed.miss.fray || parsed.miss.flat > 0 ? '<option value="miss">Miss</option>' : ""}
            ${parsed.area.mult > 0 || parsed.area.flat > 0 || parsed.area.fray ? '<option value="area">Area</option>' : ""}
          </select>
        </div>
        <div class="form-group">
          <label>Bonus dice</label>
          <input type="number" name="bonusDice" value="0" min="0">
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="vulnerable"> Target is vulnerable (+1)</label>
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="resistance"> Target has resistance (½)</label>
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="weakened"> Attacker is weakened (−2)</label>
        </div>
      </form>
    `;
    const abilityName = actor.system.sourceAbilityName || actor.name;
    return foundry.applications.api.DialogV2.wait({
      window:  { title: `Damage: ${abilityName}` },
      content,
      buttons: [
        { action: "roll", label: "Roll Damage", default: true, callback: (_e, btn) => {
          const f = btn.form;
          return {
            outcome:    f.elements.outcome.value,
            bonusDice:  Number(f.elements.bonusDice.value) || 0,
            vulnerable: f.elements.vulnerable.checked,
            resistance: f.elements.resistance.checked,
            weakened:   f.elements.weakened.checked,
          };
        } },
        { action: "cancel", label: "Cancel", callback: () => null },
      ],
      rejectClose: false,
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
  async #onDrop(event) {
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
