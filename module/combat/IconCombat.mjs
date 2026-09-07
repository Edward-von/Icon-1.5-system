/**
 * IconCombat.mjs — Custom Combat document for ICON 1.5.
 *
 * Turn model (Lancer-style activations, adapted from the lancer-initiative
 * implementation used by the Lancer system):
 *   • No initiative rolls and no fixed turn order. Every combatant has a
 *     number of activations per round, shown as clickable pips in the
 *     combat tracker.
 *   • Clicking a pip activates that combatant (spends one activation and
 *     sets the tracker's active turn to them). Ending the turn sets the
 *     active turn back to "nobody" (turn = null).
 *   • Next Round resets everyone's activations.
 *   • Elite foes get 2 activations; Legends get 1 per player character
 *     (minimum 2); everyone else gets 1.
 *   • The PC/NPC alternation of ICON is advisory: the tracker banner shows
 *     which side should pick next (opposite of whoever acted last), but
 *     nothing is enforced — any pip can be clicked at any time.
 *
 * Slow Turn: kept as a per-combatant marker (it matters for Charge/Delay
 * effects in ICON), but it no longer reorders anything.
 *
 * Resolve:
 *   • Party Resolve: stored as a flag on the Combat document; +1 per round.
 *   • Personal Resolve: stored on individual Actor documents.
 *   • Both reset under specific conditions (combat end / camp).
 */

import { rollEndOfTurnSaves, applyEndOfTurnEffects } from "./statuses.mjs";
import { clearVigor, postCombatHeal, applyDamageToActor } from "./damage.mjs";
import { escapeHTML } from "../helpers/enrich.mjs";

/* ================================================== */
/*  Constants                                          */
/* ================================================== */

const FLAG_NS       = "icon-system";
const FLAG_FIRST    = "firstFaction";   // "pc" | "npc" — advisory: who opens the round
const FLAG_LAST     = "lastFaction";    // "pc" | "npc" — side of the last activation this round
const FLAG_RESOLVE  = "partyResolve";
const FLAG_SLOW     = "slowTurn";

/** Socket channel for relaying combat actions a player can't perform directly. */
const SOCKET = "system.icon-system";

/**
 * Relay a combat-tracker action (slow turn, personal resolve, activation
 * request) to the active GM. Returns true if the caller is a player and the
 * request was relayed (caller should stop). GMs always get false → they
 * perform the action directly.
 */
function _emitTrackerActionToGM(payload) {
  if (game.user.isGM) return false;
  if (!game.users.activeGM) {
    ui.notifications.warn("No GM is connected — can't do that right now.");
    return true;
  }
  game.socket.emit(SOCKET, payload);
  return true;
}

/** Play a short alert sound (used to flag a pending GM decision). */
function _playAlertSound() {
  try {
    const helper = foundry.audio?.AudioHelper ?? globalThis.AudioHelper;
    helper?.play?.({ src: "sounds/notify.wav", volume: 0.8, autoplay: true, loop: false }, false);
  } catch { /* audio is best-effort */ }
}

/* ================================================== */
/*  IconCombatant                                      */
/* ================================================== */

export class IconCombatant extends Combatant {

  /**
   * Delegate permission checks to the associated actor (mirrors Lancer):
   * lets a combatant with no token/actor still be managed by the GM.
   * @override
   */
  testUserPermission(user, permission, options) {
    return this.actor?.testUserPermission(user, permission, options) ?? user.isGM;
  }

  /**
   * Seed the activations flag for combatants that don't have one yet
   * (added mid-combat, or created before this model existed). Mid-round
   * additions start with a full set of activations so they can act.
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData();
    if (this.flags?.[FLAG_NS]?.activations?.max === undefined && canvas?.ready) {
      const pcCount = this.parent?.combatants?.filter(c => IconCombat.isPC(c)).length ?? 1;
      const max = IconCombat.turnsFor(this, pcCount);
      this.updateSource({
        [`flags.${FLAG_NS}.activations`]: {
          max,
          value: (this.parent?.round ?? 0) > 0 ? max : 0,
        },
      });
    }
    this.initiative ??= 0;
  }

  /** Current activation data: { max, value }. */
  get activations() {
    return this.getFlag(FLAG_NS, "activations") ?? {};
  }

  /**
   * Adjust the number of activations this combatant gets each round
   * (GM context-menu tool). Also adjusts the current value.
   */
  async addActivations(num) {
    if (num === 0) return this;
    return this.update({
      [`flags.${FLAG_NS}.activations`]: {
        max:   Math.max((this.activations.max ?? 1) + num, 1),
        value: Math.max((this.activations.value ?? 0) + num, 0),
      },
    });
  }

  /**
   * Adjust the remaining activations for this round (spend / refund),
   * clamped to [0, max].
   */
  async modifyCurrentActivations(num) {
    if (num === 0) return this;
    // Persist `max` too: for a combatant added mid-round the max only lives
    // in the prepareBaseData seed (never written to the DB), so a value-only
    // update left other clients / reloads with an unseeded flag and a wrong
    // pip count (re-seeded to full, or 0 when the canvas wasn't ready yet).
    const max = this.activations.max ?? 1;
    return this.update({
      [`flags.${FLAG_NS}.activations`]: {
        max,
        value: Math.clamp((this.activations.value ?? 0) + num, 0, max),
      },
    });
  }
}

/* ================================================== */
/*  IconCombat                                         */
/* ================================================== */

export class IconCombat extends Combat {

  /* -------------------------------------------------- */
  /*  Previous-state seeding                             */
  /* -------------------------------------------------- */

  /**
   * Ensure `this.previous` is always a valid object.
   *
   * Foundry v13 core's Combat#recordPreviousState does
   * `Object.assign(this.previous, {...})` whenever combatants are
   * added or the combat state changes. If `previous` is null on a
   * freshly-created Combat (which happens with our flow), that call
   * throws "Cannot convert undefined or null to object" and aborts
   * combatant creation. We seed `previous` to a valid empty state
   * during construction so the assign never sees a null target.
   */
  _initialize(options) {
    super._initialize(options);
    if (this.previous == null) {
      this.previous = { round: null, turn: null, tokenId: null, combatantId: null };
    }
  }

  /** @override */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (this.previous == null) {
      this.previous = { round: null, turn: null, tokenId: null, combatantId: null };
    }
  }

  /** New combats start with no active turn. @override */
  async _preCreate(data, options, user) {
    this.updateSource({ turn: null });
    return super._preCreate(data, options, user);
  }

  /**
   * Avoid the Foundry bug where turn events are managed on create,
   * before this.previous is set (same guard as Lancer).
   */
  async _manageTurnEvents(adjustedTurn) {
    if (!this.previous) return;
    return super._manageTurnEvents(adjustedTurn);
  }

  /**
   * Stamp the outgoing active combatant on the update options whenever the
   * turn changes, so the GM's updateCombat hook can run end-of-turn
   * resolution for them regardless of which client initiated the change.
   * @override
   */
  async _preUpdate(changed, options, user) {
    if (("turn" in changed) || ("round" in changed)) {
      options._iconPrevCombatantId = (this.turn != null ? this.combatant?.id : null) ?? null;
    }
    return super._preUpdate(changed, options, user);
  }

  /* -------------------------------------------------- */
  /*  Initiative — disabled                              */
  /* -------------------------------------------------- */

  /**
   * ICON does not use initiative rolls — activation order is free-form.
   * Override all initiative rolling entry points to no-op so nothing
   * accidentally rolls d20s on combatants.
   * @override
   */
  async rollInitiative(ids, options) {
    return this;
  }

  /** @override */
  async rollAll(options)   { return this; }

  /** @override */
  async rollNPC(options)   { return this; }

  /**
   * "Next up" sounds make no sense when the next activation isn't
   * deterministic (same filter as Lancer). @override
   */
  _playCombatSound(announcement) {
    if (announcement === "nextUp") return;
    return super._playCombatSound(announcement);
  }

  /* -------------------------------------------------- */
  /*  Faction detection                                  */
  /* -------------------------------------------------- */

  /** True if the combatant belongs to the PC faction. */
  static isPC(combatant) {
    const type = combatant?.actor?.type;
    return type === "icon";
  }

  /** True if the combatant is an NPC (foe or legend). */
  static isNPC(combatant) {
    const type = combatant?.actor?.type;
    return type === "foe" || type === "legend";
  }

  /**
   * Whose side should pick the NEXT activation (advisory banner):
   *   • while someone is active → their own side ("X is acting");
   *   • otherwise → the side opposite to whoever activated last;
   *   • at round start (nobody has acted) → the round's opening side;
   *   • if the suggested side has no activations left → the other side
   *     keeps acting consecutively (turn order rules, p.87).
   */
  get upcomingFaction() {
    if (!this.started) return this.getFlag(FLAG_NS, FLAG_FIRST) ?? "pc";
    if (this.turn != null && this.combatant) {
      return IconCombat.isPC(this.combatant) ? "pc" : "npc";
    }
    const last = this.getFlag(FLAG_NS, FLAG_LAST);
    let side = last
      ? (last === "pc" ? "npc" : "pc")
      : (this.getFlag(FLAG_NS, FLAG_FIRST) ?? "pc");
    if (!this._sideHasActivations(side)) {
      const other = side === "pc" ? "npc" : "pc";
      if (this._sideHasActivations(other)) side = other;
    }
    return side;
  }

  /** True if any combatant of the given side still has activations left. */
  _sideHasActivations(faction) {
    return this.combatants.some(c =>
      (faction === "pc" ? IconCombat.isPC(c) : IconCombat.isNPC(c)) &&
      (c.activations?.value ?? 0) > 0
    );
  }

  /** "pc" or "npc" — faction of the currently-active combatant. */
  get currentFaction() {
    const c = this.combatant;
    if (!c || this.turn == null) return null;
    return IconCombat.isPC(c) ? "pc" : "npc";
  }

  /* -------------------------------------------------- */
  /*  Activations                                        */
  /* -------------------------------------------------- */

  /**
   * Number of activations a combatant gets per round.
   *   • Summons don't take turns (they act through their summoner) → 0.
   *   • Elite foes take 2 turns (Elite template, p.299).
   *   • Legends take 1 turn PER player character (minimum 2 player scaling).
   *   • Everyone else takes 1 turn.
   */
  static turnsFor(combatant, pcCount) {
    const type = combatant?.actor?.type;
    if (type === "summon") return 0;
    if (type === "legend") return Math.max(pcCount, 2);
    if (type === "foe" && combatant?.actor?.system?.isElite) return 2;
    return 1;
  }

  /**
   * Refill every combatant's activations (round start). The max is
   * recomputed each round so PC count / Elite changes are picked up.
   */
  async resetActivations() {
    const pcCount = this.combatants.filter(c => IconCombat.isPC(c)).length;
    const skipDefeated = "skipDefeated" in this.settings && this.settings.skipDefeated;
    const updates = this.combatants.map(c => {
      const max = IconCombat.turnsFor(c, pcCount);
      return {
        _id: c.id,
        [`flags.${FLAG_NS}.activations`]: {
          max,
          value: skipDefeated && c.isDefeated ? 0 : max,
        },
      };
    });
    return this.updateEmbeddedDocuments("Combatant", updates);
  }

  /** PCs first, then NPCs; stable by name within each side. @override */
  _sortCombatants(a, b) {
    const fa = IconCombat.isPC(a) ? 0 : 1;
    const fb = IconCombat.isPC(b) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return (a.name || "").localeCompare(b.name || "");
  }

  /* -------------------------------------------------- */
  /*  Activate / deactivate                              */
  /* -------------------------------------------------- */

  /**
   * Spend one of the combatant's activations and make them the active turn.
   * GMs can always do this; a player can activate a combatant they own while
   * nobody is active. Otherwise the request is relayed to the GM.
   */
  async activateCombatant(id, override = false) {
    if (!(game.user.isGM || (this.turn == null && this.combatants.get(id)?.isOwner) || override)) {
      return this.requestActivation(id);
    }
    const combatant = this.combatants.get(id);
    if (!combatant?.activations.value) return this;

    // Re-activating the combatant who is already active (Elite second turn):
    // close the current turn first so end-of-turn effects resolve between the
    // two activations (a same-index update would otherwise produce no event).
    const turn = this.turns.findIndex(t => t.id === id);
    if (this.turn != null && this.turn === turn) await this.nextTurn();

    await combatant.modifyCurrentActivations(-1);
    const updateData = { turn };
    const updateOptions = { direction: 1, worldTime: { delta: CONFIG.time.turnTime } };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /**
   * End the given combatant's activation (back to "nobody active") if they
   * are the current turn and the user owns them (or is the GM).
   */
  async deactivateCombatant(id) {
    const turn = this.turns.findIndex(t => t.id === id);
    if (turn !== this.turn) {
      ui.notifications?.warn("This combatant is not the active turn.");
      return this;
    }
    if (!this.turns[turn].testUserPermission(game.user, "OWNER") && !game.user.isGM) {
      ui.notifications?.warn(`You don't control ${this.turns[turn].name} — only their owner (or the GM) can end their turn.`);
      return this;
    }
    return this.nextTurn();
  }

  /**
   * A player asked to activate a combatant they can't control right now
   * (someone else is still active). Notify the GM, who can activate them.
   */
  async requestActivation(id) {
    const combatant = this.combatants.get(id);
    if (!combatant) return this;
    _emitTrackerActionToGM({
      type: "combatTrackerAction",
      method: "requestActivation",
      combatId: this.id,
      combatantId: id,
      userName: game.user.name,
    });
    ui.notifications.info(`Activation of ${combatant.name} requested — waiting for the GM.`);
    return this;
  }

  /* -------------------------------------------------- */
  /*  Start combat                                       */
  /* -------------------------------------------------- */

  /** PCs always go first in round 1. @override */
  async startCombat() {
    await this.setFlag(FLAG_NS, FLAG_FIRST,   "pc");
    await this.setFlag(FLAG_NS, FLAG_RESOLVE, 0);
    await this.unsetFlag(FLAG_NS, FLAG_LAST);
    // Legend HP scaling is manual: the GM sets `system.playerScale`
    // on the Legend sheet before the fight, and the sheet rescales
    // hp.max from the canonical hp.baseline.
    await this.resetActivations();
    this._playCombatSound("startEncounter");
    const updateData = { round: 1, turn: null };
    Hooks.callAll("combatStart", this, updateData);
    await this.update(updateData);
    return this;
  }

  /* -------------------------------------------------- */
  /*  Turn / round flow                                  */
  /* -------------------------------------------------- */

  /**
   * Ends the current activation without starting a new one (turn → null).
   * The next activation is chosen by clicking a pip in the tracker.
   * @override
   */
  async nextTurn() {
    const updateData = { turn: null };
    const updateOptions = { direction: 0, worldTime: { delta: 0 } };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /**
   * End the current activation and refund it (undo). No-op when nobody
   * is active — spent activations are refunded from the GM context menu.
   * @override
   */
  async previousTurn() {
    if (this.turn == null) return this;
    await this.combatant?.modifyCurrentActivations(1);
    const updateData = { turn: null };
    const updateOptions = { direction: -1, worldTime: { delta: -CONFIG.time.turnTime }, _iconSkipEndOfTurn: true };
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /** @override */
  async nextRound() {
    if (!game.user.isGM) return this;

    /* --- Alternation advisory: the side that acted last flips --- */
    const last = this.getFlag(FLAG_NS, FLAG_LAST)
              ?? this.getFlag(FLAG_NS, FLAG_FIRST)
              ?? "pc";
    const nextFirst = last === "pc" ? "npc" : "pc";
    await this.setFlag(FLAG_NS, FLAG_FIRST, nextFirst);
    await this.unsetFlag(FLAG_NS, FLAG_LAST);

    /* --- Party Resolve +1 (house rule, opt-in via system settings) --- */
    if (game.settings.get("icon-system", "hrPartyResolveAutoIncrement")) {
      await this._incrementPartyResolve();
    }

    /* --- Clear slow-turn markers (they reset each round) --- */
    const slowUpdates = this.combatants
      .filter(c => c.getFlag(FLAG_NS, FLAG_SLOW))
      .map(c => c.setFlag(FLAG_NS, FLAG_SLOW, false));
    await Promise.all(slowUpdates);

    /* --- Legend interrupts recharge at round start (per manual p.292) --- */
    for (const combatant of this.combatants) {
      const actor = combatant.actor;
      if (actor?.type !== "legend") continue;
      // Clear the entire interruptUses flag object so every slot goes back to 0.
      if (actor.getFlag(FLAG_NS, "interruptUses") != null) {
        await actor.unsetFlag(FLAG_NS, "interruptUses");
      }
    }

    /* --- Refill activations for the new round --- */
    await this.resetActivations();

    const updateData = { round: this.round + 1, turn: null };
    const updateOptions = { direction: 1, worldTime: { delta: CONFIG.time.roundTime } };
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /** @override */
  async previousRound() {
    if (!game.user.isGM) return this;
    await this.resetActivations();
    const round = Math.max(this.round - 1, 0);
    const updateData = { round, turn: null };
    const updateOptions = { direction: -1, worldTime: { delta: round > 0 ? -CONFIG.time.roundTime : 0 } };
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /** Reset = refill everyone's activations and clear the active turn. @override */
  async resetAll() {
    await this.resetActivations();
    await this.update({ turn: null });
    return this;
  }

  /* -------------------------------------------------- */
  /*  End combat                                         */
  /* -------------------------------------------------- */

  /**
   * @override
   * Core endCombat() only shows a confirmation dialog and deletes the combat
   * on "Yes". Our cleanup (vigor, post-combat heal, class resources) used to
   * run BEFORE calling super — i.e. before the GM confirmed — so pressing
   * "No" still refilled everyone's HP. Now we show the same confirmation
   * first and run the cleanup only after a "Yes".
   */
  async endCombat() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window:  { title: "COMBAT.EndTitle" },
      content: `<p>${game.i18n.localize("COMBAT.EndConfirmation")}</p>`,
      modal:   true,
    });
    if (!confirmed) return this;

    await this.#cleanupAfterCombat();
    await this.delete();
    return this;
  }

  /**
   * End-of-combat bookkeeping for PC actors: vigor cleared, post-combat heal,
   * party resolve reset, class resources reset. Runs only after the GM has
   * confirmed the "End Encounter" dialog.
   */
  async #cleanupAfterCombat() {
    /* --- Clear Vigor from all PC actors --- */
    for (const combatant of this.combatants) {
      if (combatant.actor?.type === "icon") {
        await clearVigor(combatant.actor);
        await postCombatHeal(combatant.actor);
      }
    }

    /* --- Reset party resolve on combat document --- */
    await this.setFlag(FLAG_NS, FLAG_RESOLVE, 0);

    /* --- Reset party resolve + class resources on PC actors ---
     * Class resources that reset at end of combat:
     *   • Vigilance   (Stalwart)   → 0
     *   • Combo Token (Vagabond)   → 0
     *   • Blessing Tokens (Mendicant) → 0
     *   • Power Dice  (Wright)     → []
     *   • Aether      (Wright)     → 0  ("All Aether disperses at the end of combat", p.204)
     * Stacked Dice (Fool) are also lost at end of combat.
     */
    for (const combatant of this.combatants) {
      if (combatant.actor?.type === "icon") {
        await combatant.actor.update({
          "system.combat.resolve.party": 0,
          "system.combat.classResources.vigilance.value":      0,
          "system.combat.classResources.comboToken.value":     0,
          "system.combat.classResources.blessingTokens.value": 0,
          "system.combat.classResources.powerDice":            [],
          "system.combat.classResources.aether.value":         0,
          "system.combat.classResources.stackedDice.value":    0,
          "flags.icon-system.-=comboSpentOnItem":              null,
        });
      }
    }
  }

  /* -------------------------------------------------- */
  /*  Resolve                                            */
  /* -------------------------------------------------- */

  /** Increment shared party resolve on the combat document and on all PC actors. */
  async _incrementPartyResolve() {
    const current = this.getFlag(FLAG_NS, FLAG_RESOLVE) ?? 0;
    const next    = current + 1;
    await this.setFlag(FLAG_NS, FLAG_RESOLVE, next);

    // Also sync to each PC actor's party resolve field
    for (const combatant of this.combatants) {
      const actor = combatant.actor;
      if (actor?.type !== "icon") continue;
      await actor.update({
        "system.combat.resolve.party": actor.system.combat.resolve.party + 1,
      });
    }

    ui.notifications?.info(`Party Resolve: ${next}`);
  }

  /** Current party resolve (from combat document flag). */
  get partyResolve() {
    return this.getFlag(FLAG_NS, FLAG_RESOLVE) ?? 0;
  }

  /* -------------------------------------------------- */
  /*  Personal Resolve                                   */
  /* -------------------------------------------------- */

  /**
   * Award +1 personal resolve to the given actor after they use their Limit Break.
   * They may also give 1 to an ally.
   */
  static async awardPersonalResolve(actor, amount = 1) {
    // Players can only update their own PC. For an ally's PC, relay to the GM.
    if (!actor.isOwner &&
        _emitTrackerActionToGM({ type: "combatTrackerAction", method: "awardResolve", actorId: actor.id, amount })) {
      return;
    }
    const current = actor.system.combat?.resolve?.personal ?? 0;
    const next    = current + amount;
    await actor.update({ "system.combat.resolve.personal": next });
    ui.notifications?.info(`${actor.name}: personal resolve ${current} → ${next}`);
  }

  /** Reset personal resolve to 0 (called at camp). */
  static async resetPersonalResolve(actor) {
    await actor.update({ "system.combat.resolve.personal": 0 });
  }

  /* -------------------------------------------------- */
  /*  Slow Turn                                          */
  /* -------------------------------------------------- */

  /**
   * Toggle slow-turn status for a combatant. Activation order stays free in
   * this turn model, but the tracker sorts slow combatants after the normal
   * pending ones and tints their row, and the marker matters for
   * Charge/Delay effects.
   */
  static async toggleSlowTurn(combatantId) {
    const combat     = game.combat;
    if (!combat)     return;
    const combatant  = combat.combatants.get(combatantId);
    if (!combatant)  return;

    // A player can flag their own combatant directly (owner flag write);
    // for anyone else, relay the request to the active GM.
    if (!combatant.isOwner &&
        _emitTrackerActionToGM({ type: "combatTrackerAction", method: "toggleSlowTurn", combatantId })) return;

    const isSlow = combatant.getFlag(FLAG_NS, FLAG_SLOW) ?? false;
    await combatant.setFlag(FLAG_NS, FLAG_SLOW, !isSlow);

    ui.notifications?.info(
      isSlow
        ? `${combatant.name} returns to normal turn.`
        : `${combatant.name} elects a Slow Turn.`
    );
  }

  /** True if this combatant currently has a slow turn. */
  static isSlow(combatant) {
    return combatant?.getFlag(FLAG_NS, FLAG_SLOW) ?? false;
  }
}

/* ================================================== */
/*  Hooks                                              */
/* ================================================== */

/**
 * Register combat lifecycle hooks.
 * Called once from icon.mjs after init.
 */
export function registerCombatHooks() {
  // Guard against double registration (hot-reload, accidental second call) —
  // duplicated hooks mean duplicated end-of-turn saves and socket handling.
  if (registerCombatHooks._registered) return;
  registerCombatHooks._registered = true;

  /**
   * Relay channel: players emit tracker actions they can't perform directly;
   * the active GM (only one processes) performs them.
   */
  game.socket?.on(SOCKET, async (data) => {
    try {
      if (!game.user.isGM) return;
      // Only the designated active GM processes, to avoid double-execution.
      if (game.users.activeGM?.id !== game.user.id) return;

      if (data?.type === "combatTrackerAction") {
        if (data.method === "toggleSlowTurn") {
          await IconCombat.toggleSlowTurn(data.combatantId);
        } else if (data.method === "awardResolve") {
          const actor = game.actors.get(data.actorId);
          if (actor) await IconCombat.awardPersonalResolve(actor, data.amount ?? 1);
        } else if (data.method === "requestActivation") {
          const combat = game.combats.get(data.combatId);
          const combatant = combat?.combatants.get(data.combatantId);
          if (!combatant) return;
          _playAlertSound();
          ui.notifications.warn(
            `${data.userName ?? "A player"} wants to activate ${combatant.name} — click their pip in the tracker.`
          );
        }
      } else if (data?.type === "applyDamage") {
        /* A player pressed "Apply Damage" on an actor they don't own —
         * the active GM applies it through the same shared code path. */
        const actor = await fromUuid(data.actorUuid ?? "");
        if (!actor) return;
        const { applyArmor = false, half = false } = data.options ?? {};
        await applyDamageToActor(actor, data.amount, {
          applyArmor, half,
          chatConfirm: true,
          allowRelay:  false,
        });
      }
    } catch (err) {
      console.error("ICON 1.5 | combat socket handler failed:", err);
    }
  });

  /**
   * updateCombat fires whenever the Combat document changes.
   * We use it (GM side) to:
   *   1. Run end-of-turn resolution (status saves, Regeneration) for the
   *      combatant whose activation just ended.
   *   2. Record which side acted last (drives the alternation banner and
   *      next round's opening side).
   *   3. Recharge foe interrupts at the start of their own activation.
   *   4. Nudge the GM when every activation has been spent.
   */
  Hooks.on("updateCombat", async (combat, changes, options, userId) => {
    // Only process on the GM client to avoid duplicate execution
    if (!game.user.isGM) return;
    if (!(combat instanceof IconCombat)) return;

    try {
      const turnChanged  = "turn"  in changes;
      const roundChanged = "round" in changes;
      if (!turnChanged && !roundChanged) return;

      /* --- End-of-turn resolution for the outgoing combatant ---
       * The id is stamped in IconCombat#_preUpdate on the initiating client
       * and broadcast with the update options. Skipped on previousTurn
       * (that's an undo, not a completed activation). */
      if (!options._iconSkipEndOfTurn) {
        const prevId = options._iconPrevCombatantId ?? null;
        const prev   = prevId ? combat.combatants.get(prevId) : null;
        if (prev?.actor) {
          await rollEndOfTurnSaves(prev);
          await applyEndOfTurnEffects(prev);
        }
      }

      /* --- Start-of-activation housekeeping for the NOW-active combatant --- */
      const current = combat.turn != null ? combat.combatant : null;
      if (turnChanged && current?.actor) {
        /* Record which side acted last (advisory alternation). */
        await combat.setFlag(FLAG_NS, FLAG_LAST, IconCombat.isPC(current) ? "pc" : "npc");

        /* Non-legend foes recharge interrupts at the start of their own
         * turn. Legends recharge at round start (handled in nextRound). */
        const actor = current.actor;
        if (actor?.type === "foe" && actor.getFlag(FLAG_NS, "interruptUses") != null) {
          await actor.unsetFlag(FLAG_NS, "interruptUses");
        }
      }

      /* --- Round complete? Nudge the GM to advance --- */
      if (turnChanged && combat.turn == null && combat.started && combat.combatants.size) {
        const allSpent = combat.combatants.every(c => (c.activations?.value ?? 0) === 0);
        if (allSpent) {
          ui.notifications.info("All activations are spent — advance to the next round.");
        }
      }
    } catch (err) {
      console.error("ICON 1.5 | Error in updateCombat handler:", err);
    }
  });

  /**
   * A combatant marked defeated mid-round loses their remaining activations
   * immediately (their pips would otherwise stay clickable until the next
   * round refill). Un-marking does NOT refund — the GM can right-click →
   * Undo Activation if the defeat was a mistake.
   */
  Hooks.on("updateCombatant", async (combatant, changes, options, userId) => {
    if (!game.user.isGM) return;
    if (game.users.activeGM?.id !== game.user.id) return;
    if (!(combatant.parent instanceof IconCombat)) return;
    if (changes.defeated !== true) return;
    if ((combatant.activations?.value ?? 0) === 0) return;
    try {
      await combatant.update({ [`flags.${FLAG_NS}.activations.value`]: 0 });
    } catch (err) {
      console.error("ICON 1.5 | Failed to zero activations on defeat:", err);
    }
  });

  /**
   * preCreateCombat: log when a Combat document is being created so we
   * can see if Foundry's auto-create path is firing.
   */
  Hooks.on("preCreateCombat", (doc, data, options, userId) => {
    console.debug("ICON 1.5 | preCreateCombat data:", {
      sceneId: data?.scene,
      type:    doc?.constructor?.name,
    });
  });

  Hooks.on("createCombat", (doc, options, userId) => {
    console.debug("ICON 1.5 | createCombat fired | id:", doc?.id, "| scene:", doc?.scene);
  });

  /**
   * preCreateCombatant: log the combatant data being created so we can
   * see what Foundry's #onToggleCombat is sending. If we spot a clearly
   * invalid combatant (no actor, no token), return false to block creation
   * before it crashes core's warn().
   */
  Hooks.on("preCreateCombatant", (doc, data, options, userId) => {
    try {
      console.debug("ICON 1.5 | preCreateCombatant data:", {
        actorId:   data?.actorId,
        tokenId:   data?.tokenId,
        sceneId:   data?.sceneId,
        hasActor:  !!doc?.actor,
        actorName: doc?.actor?.name,
      });
      if (!doc?.actor) {
        console.warn("ICON 1.5 | preCreateCombatant — BLOCKED: combatant has no resolvable actor.");
        ui.notifications.warn(`Cannot add token to combat: no valid actor found.`);
        return false;
      }
    } catch (err) {
      console.error("ICON 1.5 | preCreateCombatant hook error:", err);
    }
  });

  /**
   * Legend phase announcement: when a Legend's HP drops into a new phase
   * threshold, post a chat card announcing the phase transition.
   *
   * We capture the pre-update `currentPhase` in `preUpdateActor` (it's a
   * derived field, so after the update prepareDerivedData has already
   * recomputed it based on the new HP), then compare in `updateActor`.
   * Only forward transitions (phase index increasing) are announced, so
   * a heal that pushes the boss back up doesn't spam the chat.
   */
  Hooks.on("preUpdateActor", (actor, changes, options /*, userId */) => {
    if (actor.type !== "legend") return;
    options._iconLegendOldPhase = actor.system.currentPhase ?? 0;
  });

  Hooks.on("updateActor", async (actor, changes, options /*, userId */) => {
    if (!game.user.isGM) return;
    if (actor.type !== "legend") return;
    const oldPhase = options._iconLegendOldPhase;
    if (oldPhase == null) return;
    const newPhase = actor.system.currentPhase ?? 0;
    if (newPhase <= oldPhase) return;  // only announce forward transitions

    const phase = actor.system.phases?.[newPhase];
    if (!phase) return;

    try {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
          <div class="icon-chat-card icon-chat-card--phase" style="border-color:#c04060">
            <div class="icon-chat-card__header">
              <strong class="icon-chat-card__action">⚡ ${escapeHTML(actor.name)} — ${escapeHTML(phase.label ?? `Phase ${newPhase + 1}`)}</strong>
              <span class="icon-chat-card__pool">HP ${actor.system.hp.value}/${actor.system.hp.max}</span>
            </div>
            ${phase.description ? `<p style="margin:4px 0;font-size:.9em;color:#c0b898">${escapeHTML(phase.description)}</p>` : ""}
          </div>
        `,
      });
    } catch (err) {
      console.error("ICON 1.5 | Legend phase announcement failed:", err);
    }
  });

  /**
   * combatStart: ensure party resolve is initialised.
   */
  Hooks.on("combatStart", async (combat) => {
    if (!game.user.isGM) return;
    if (!(combat instanceof IconCombat)) return;
    await combat.setFlag(FLAG_NS, FLAG_RESOLVE, 0);
  });

  /**
   * Render the combat tracker: strip vanilla initiative header buttons and
   * add ICON-specific controls (slow-turn marker, resolve display with +1,
   * PC/NPC turn indicator, prominent round counter + party resolve, legend
   * round-action indicator). Activation pips are rendered by the tracker
   * template itself (IconCombatTracker).
   */
  Hooks.on("renderCombatTracker", (app, html, data) => {
    try {
      const combat = data?.combat ?? app.viewed;
      if (!combat || !(combat instanceof IconCombat)) return;
      _renderIconTracker(app, html, data, combat);
    } catch (err) {
      console.error("ICON 1.5 | Error in renderCombatTracker hook:", err);
    }
  });
}

function _renderIconTracker(app, html, data, combat) {
    /* -------------------------------------------------- */
    /*  Strip vanilla initiative header buttons            */
    /* -------------------------------------------------- */
    html.querySelectorAll('[data-control="rollAll"], [data-control="rollNPC"], [data-action="rollAll"], [data-action="rollNPC"]')
        .forEach(el => el.remove());

    /* -------------------------------------------------- */
    /*  Per-combatant controls (slow btn, resolve badge)   */
    /* -------------------------------------------------- */
    html.querySelectorAll(".combatant").forEach(el => {
      const id = el.dataset.combatantId;
      const c  = combat.combatants.get(id);
      if (!c) return;

      // The GM controls every combatant; a player controls only combatants they
      // own (their own PC), so they too can elect a Slow Turn on themselves.
      const canControl = game.user.isGM || c.actor?.isOwner || c.isOwner;
      if (!canControl) return;

      // Foundry only renders a `.combatant-controls` container for the GM, so
      // create one for owning players (otherwise their Slow button has nowhere
      // to live and never appears).
      let controls = el.querySelector(".combatant-controls");
      if (!controls) {
        controls = document.createElement("div");
        controls.classList.add("combatant-controls", "icon-injected-controls");
        el.appendChild(controls);
      }

      // --- Slow Turn button (marker for Charge/Delay effects) ---
      const isSlow  = IconCombat.isSlow(c);
      const slowBtn = document.createElement("button");
      slowBtn.type  = "button";
      slowBtn.title = isSlow
        ? "Cancel Slow Turn"
        : "Declare a Slow Turn — sorts after normal turns for this round (triggers Charge effects)";
      slowBtn.classList.add("icon-slow-btn");
      if (isSlow) slowBtn.classList.add("icon-slow-btn--active");
      slowBtn.textContent = isSlow ? "⏩ Slow" : "⏸ Slow";
      slowBtn.addEventListener("click", ev => {
        ev.stopPropagation();
        IconCombat.toggleSlowTurn(id);
      });
      controls.prepend(slowBtn);

      // --- Personal / Party Resolve display (PCs only) ---
      if (IconCombat.isPC(c) && c.actor?.type === "icon") {
        const personal = c.actor.system.combat?.resolve?.personal ?? 0;
        const party    = c.actor.system.combat?.resolve?.party    ?? 0;

        const resWrap = document.createElement("span");
        resWrap.classList.add("icon-resolve-display");
        resWrap.title = `Personal: ${personal}  |  Party: ${party}`;
        resWrap.innerHTML = `<span class="icon-resolve-display__value">⚡${personal}+${party}</span>`;

        const plusBtn = document.createElement("button");
        plusBtn.type = "button";
        plusBtn.classList.add("icon-resolve-plus");
        plusBtn.textContent = "+1";
        plusBtn.title = "Add 1 Personal Resolve";
        plusBtn.addEventListener("click", ev => {
          ev.stopPropagation();
          IconCombat.awardPersonalResolve(c.actor, 1);
        });
        resWrap.appendChild(plusBtn);

        controls.prepend(resWrap);
      }
    });

    /* -------------------------------------------------- */
    /*  Header block: round, PC/NPC turn indicator, resolve */
    /* -------------------------------------------------- */
    const header = html.querySelector(".combat-tracker-header, header");
    if (header && combat.started && !header.querySelector(".icon-combat-banner")) {
      const banner = document.createElement("div");
      banner.classList.add("icon-combat-banner");

      const faction = combat.upcomingFaction;         // "pc" | "npc" | null
      const acting  = combat.currentFaction != null;  // someone is mid-activation
      const factionLabel = faction === "pc"
        ? (acting ? "PC TURN" : "PC PICKS NEXT")
        : faction === "npc"
          ? (acting ? "NPC TURN" : "NPC PICKS NEXT")
          : "";
      const factionClass = faction === "pc" ? "icon-turn-indicator--pc" :
                           faction === "npc" ? "icon-turn-indicator--npc" : "";

      banner.innerHTML = `
        <div class="icon-combat-banner__round">Round <strong>${combat.round}</strong></div>
        <div class="icon-turn-indicator ${factionClass}">${factionLabel}</div>
        <div class="icon-party-resolve">
          <span class="icon-party-resolve__label">Party Resolve</span>
          <span class="icon-party-resolve__value">⚡${combat.partyResolve}</span>
        </div>
      `;
      header.appendChild(banner);

      // --- Legend round-action indicator: list legends with round actions
      //     whose roundNumber matches the current round ---
      const triggered = [];
      for (const c of combat.combatants) {
        if (c.actor?.type !== "legend") continue;
        const ras = c.actor.system?.roundActions ?? [];
        for (const ra of ras) {
          // Treat roundNumber 1 as "every round" for simplicity; anything else
          // only fires when it matches (or is a multiple — e.g. 3 → 3,6,9).
          const rn = ra.roundNumber ?? 1;
          const hit = rn === 1 || (rn > 1 && combat.round >= rn && combat.round % rn === 0);
          if (hit) triggered.push(`${escapeHTML(c.name)}: ${escapeHTML(ra.name)}`);
        }
      }
      if (triggered.length) {
        const raBox = document.createElement("div");
        raBox.classList.add("icon-legend-round-actions");
        raBox.innerHTML = `
          <div class="icon-legend-round-actions__title">⚠ Legend Round Actions</div>
          <ul>${triggered.map(t => `<li>${t}</li>`).join("")}</ul>
        `;
        header.appendChild(raBox);
      }
    }
}
