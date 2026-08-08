/**
 * IconCombatTracker.mjs — Combat tracker with Lancer-style activation pips.
 *
 * Replaces the tracker list part with our own template: each combatant row
 * shows one clickable pip per remaining activation (click = activate) and a
 * stop button on the active combatant (click = end their activation).
 * Sorting: active combatant first, then units with activations left, spent
 * units last. GM context menu gains Add/Remove/Undo Activation entries.
 */

import { IconCombat } from "./IconCombat.mjs";

const CoreCombatTracker = foundry.applications.sidebar.tabs.CombatTracker;

export class IconCombatTracker extends CoreCombatTracker {
  static DEFAULT_OPTIONS = {
    actions: {
      activateCombatantTurn:   IconCombatTracker.#onActivateCombatant,
      deactivateCombatantTurn: IconCombatTracker.#onDeactivateCombatant,
    },
  };

  static PARTS = foundry.utils.mergeObject(
    CoreCombatTracker.PARTS,
    { tracker: { template: "systems/icon-system/templates/combat/tracker.hbs" } },
    { inplace: false }
  );

  /** Add activation pips, faction css and popcorn sorting to the turn data. */
  async _prepareTrackerContext(context, options) {
    await super._prepareTrackerContext(context, options);
    const combat = this.viewed;
    if (!combat || !context.turns) return;

    context.turns = context.turns.map(t => {
      const combatant   = combat.combatants.get(t.id);
      const activations = combatant?.activations ?? {};
      const pending     = activations.value ?? 0;
      const isActive    = combat.turn != null && combat.combatant?.id === t.id;

      const buttons = Array.from({ length: pending }, () => ({
        icon:    "fa-solid fa-circle-play",
        cls:     "icon-activation-btn",
        action:  "activateCombatantTurn",
        tooltip: "Activate",
      }));
      if (isActive) buttons.push({
        icon:    "fa-solid fa-circle-stop",
        cls:     "icon-activation-btn icon-activation-btn--stop",
        action:  "deactivateCombatantTurn",
        tooltip: "End Turn",
      });

      // Summons (max 0 activations) get no faction tint and are never "done".
      const takesTurns = (activations.max ?? 0) > 0;
      const slow = IconCombat.isSlow(combatant);
      const extra = [
        IconCombat.isPC(combatant) ? "icon-faction-pc"
          : IconCombat.isNPC(combatant) ? "icon-faction-npc" : "",
        (combat.started && takesTurns && !isActive && pending === 0) ? "icon-done" : "",
        slow ? "icon-slow" : "",
      ].filter(Boolean).join(" ");

      return { ...t, buttons, pending, slow, css: `${t.css ?? ""} ${extra}`.trim() };
    });

    // Active combatant on top, spent units at the bottom; slow-turn units sort
    // after the normal pending ones (they act at the end of the round). Stable
    // otherwise.
    const rank = t => t.css.includes("active") ? 0
                    : t.pending === 0          ? 3
                    : t.slow                   ? 2 : 1;
    context.turns.sort((a, b) => rank(a) - rank(b));
  }

  static async #onActivateCombatant(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const { combatantId } = target.closest("[data-combatant-id]")?.dataset ?? {};
    if (combatantId) await this.viewed?.activateCombatant(combatantId);
  }

  static async #onDeactivateCombatant(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const { combatantId } = target.closest("[data-combatant-id]")?.dataset ?? {};
    if (combatantId) await this.viewed?.deactivateCombatant(combatantId);
  }

  /** GM tools for activations; drop the initiative-based core entries. */
  _getEntryContextOptions() {
    const getCombatant = li => this.viewed?.combatants.get(li.dataset.combatantId ?? "");
    const entries = [
      {
        name: "Add Activation",
        icon: '<i class="fa-solid fa-plus"></i>',
        condition: () => game.user.isGM,
        callback: li => getCombatant(li)?.addActivations(1),
      },
      {
        name: "Remove Activation",
        icon: '<i class="fa-solid fa-minus"></i>',
        condition: () => game.user.isGM,
        callback: li => getCombatant(li)?.addActivations(-1),
      },
      {
        name: "Undo Activation",
        icon: '<i class="fa-solid fa-arrow-rotate-left"></i>',
        condition: () => game.user.isGM,
        callback: li => getCombatant(li)?.modifyCurrentActivations(1),
      },
    ];
    entries.push(...super._getEntryContextOptions()
      .filter(e => !["COMBAT.CombatantReroll", "COMBAT.CombatantClear"].includes(e.name)));
    return entries;
  }
}
