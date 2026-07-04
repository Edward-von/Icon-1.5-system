/**
 * IconCombat.mjs — Custom Combat document for ICON 1.5.
 *
 * Turn order rules:
 *   • Round 1: PCs go first.
 *   • Strict PC/NPC alternation within a round.
 *   • Slow turns: combatant elects to skip normal slot → goes after all
 *     non-slow characters (they still interleave with other slow combatants).
 *   • At end of round: the side that went LAST flips; next round opens with
 *     the OTHER side.
 *   • When one side is exhausted: remaining side takes consecutive turns.
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
const FLAG_FIRST    = "firstFaction";   // "pc" | "npc"
const FLAG_RESOLVE  = "partyResolve";
const FLAG_SLOW     = "slowTurn";

/** Socket channel for relaying combat actions a player can't perform directly. */
const SOCKET = "system.icon-system";

/**
 * Players can't update the Combat / Combatant documents (they don't own NPC
 * combatants, and the "who acts next" prompt writes flags). So when a player
 * ends their turn, we relay the request to the active GM, who runs the real
 * turn-advance logic (and gets the who-acts-next prompt). Returns true if the
 * caller is a player and the request was relayed (caller should stop).
 */
function _relayToGM(combat, method) {
  if (game.user.isGM) return false;
  if (!game.users.activeGM) {
    ui.notifications.warn("No GM is connected — the turn can't be advanced right now.");
    return true;
  }
  game.socket.emit(SOCKET, { type: "combatAdvance", method, combatId: combat.id });
  ui.notifications.info("Turn passed — waiting for the GM to choose who acts next.");
  return true;
}

/**
 * Relay a combat-tracker action (slow turn, personal resolve) to the active GM.
 * Returns true if the caller is a player and the request was relayed (caller
 * should stop). GMs always get false → they perform the action directly.
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

/** Play a short alert sound (used to flag a pending GM turn decision). */
function _playAlertSound() {
  try {
    const helper = foundry.audio?.AudioHelper ?? globalThis.AudioHelper;
    helper?.play?.({ src: "sounds/notify.wav", volume: 0.8, autoplay: true, loop: false }, false);
  } catch { /* audio is best-effort */ }
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

  /* -------------------------------------------------- */
  /*  Initiative — disabled                              */
  /* -------------------------------------------------- */

  /**
   * ICON does not use initiative rolls — turn order is strict PC/NPC
   * alternation. Override all initiative rolling entry points to no-op so
   * nothing accidentally rolls d20s on combatants.
   * @override
   */
  async rollInitiative(ids, options) {
    return this;
  }

  /** @override */
  async rollAll(options)   { return this; }

  /** @override */
  async rollNPC(options)   { return this; }

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
   * Whose side should pick the NEXT combatant to act.
   *
   * In ICON, after a PC turn an NPC acts next (GM picks), and after an NPC
   * turn a PC acts next (players pick). We compute this from the side that
   * just finished acting.
   *
   * Returns "pc" | "npc" | null.
   */
  get upcomingFaction() {
    // Combat hasn't started yet → whoever is set to go first
    if (!this.started) return this.getFlag(FLAG_NS, FLAG_FIRST) ?? "pc";
    const current = this.combatant;
    if (!current) return null;
    // While a combatant is active, their OWN side is the "current turn"
    return IconCombat.isPC(current) ? "pc" : "npc";
  }

  /* -------------------------------------------------- */
  /*  Turn order construction                            */
  /* -------------------------------------------------- */

  /**
   * Number of turns a combatant gets per round.
   *   • Elite foes take 2 turns (Elite template, p.299).
   *   • Legends take 1 turn PER player character (minimum 2 player scaling).
   *   • Everyone else takes 1 turn.
   */
  static turnsFor(combatant, pcCount) {
    const type = combatant?.actor?.type;
    if (type === "legend") return Math.max(pcCount, 2);
    if (type === "foe" && combatant?.actor?.system?.isElite) return 2;
    return 1;
  }

  /**
   * Build the alternating turn order.
   * Slow combatants are appended AFTER all normal interleaved slots.
   * Elite foes appear twice; legends appear once per player character.
   * @override
   */
  setupTurns() {
    try {
      // Skip orphan combatants (no actor) to avoid crashes later.
      const all       = [...this.combatants].filter(c => c?.actor);
      const normal    = all.filter(c => !c.getFlag(FLAG_NS, FLAG_SLOW));
      const slow      = all.filter(c =>  c.getFlag(FLAG_NS, FLAG_SLOW));

      /* --- Count PCs for legend turn scaling --- */
      const pcCount = all.filter(c => IconCombat.isPC(c)).length;

      /* --- Helper: expand a combatant list by duplicating multi-turn entries --- */
      const expand = (list) => {
        const out = [];
        for (const c of list) {
          const n = IconCombat.turnsFor(c, pcCount);
          for (let i = 0; i < n; i++) out.push(c);
        }
        return out;
      };

      /* --- Split normal combatants by faction --- */
      const pcs  = expand(normal.filter(c =>  IconCombat.isPC(c)).sort(_byInitiative));
      const npcs = expand(normal.filter(c => !IconCombat.isPC(c)).sort(_byInitiative));

      /* --- Determine who goes first this round --- */
      const firstFaction = this.getFlag(FLAG_NS, FLAG_FIRST) ?? "pc";
      const [primary, secondary] = firstFaction === "pc"
        ? [pcs, npcs]
        : [npcs, pcs];

      /* --- Interleave: primary, secondary, primary, secondary… --- */
      const interleaved = _interleave(primary, secondary);

      /* --- Slow turns: interleave slow PCs and NPCs among themselves --- */
      const slowPCs  = expand(slow.filter(c =>  IconCombat.isPC(c)).sort(_byInitiative));
      const slowNPCs = expand(slow.filter(c => !IconCombat.isPC(c)).sort(_byInitiative));
      const interlevedSlow = _interleave(slowPCs, slowNPCs);

      this.turns = [...interleaved, ...interlevedSlow];
      return this.turns;
    } catch (err) {
      console.error("ICON 1.5 | Error in setupTurns:", err);
      // Fallback to a plain (no-expansion) turn order so combat can still run.
      this.turns = [...this.combatants].filter(c => c?.actor);
      return this.turns;
    }
  }

  /* -------------------------------------------------- */
  /*  Interactive turn picking                           */
  /* -------------------------------------------------- */

  /** Number of acts this combatant has left this round. */
  _actsRemaining(combatant) {
    const acted = combatant.getFlag(FLAG_NS, "actedThisRound") ?? 0;
    const pcCount = this.combatants.filter(c => IconCombat.isPC(c)).length;
    const max = IconCombat.turnsFor(combatant, pcCount);
    return Math.max(0, max - acted);
  }

  /** Clear the actedThisRound flag on every combatant. Called at round start. */
  async _resetActedThisRound() {
    for (const c of this.combatants) {
      if (c.getFlag(FLAG_NS, "actedThisRound") != null) {
        await c.unsetFlag(FLAG_NS, "actedThisRound");
      }
    }
  }

  /**
   * Prompt for which combatant of the given faction acts next.
   * Returns the chosen Combatant, or null if cancelled or no candidates.
   * Skips the prompt entirely if there's only one candidate left.
   */
  async _promptCombatant(faction, { alert = false } = {}) {
    const candidates = this.combatants.filter(c =>
      c.actor &&
      this._actsRemaining(c) > 0 &&
      (faction === "pc" ? IconCombat.isPC(c) : IconCombat.isNPC(c)),
    );
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    const factionLabel = faction === "pc" ? "Player Character" : "NPC";
    const pcCount = this.combatants.filter(c => IconCombat.isPC(c)).length;
    const buildOptions = () => candidates.map(c => {
      const acted = c.getFlag(FLAG_NS, "actedThisRound") ?? 0;
      const total = IconCombat.turnsFor(c, pcCount);
      const turnsLabel = total > 1 ? ` <em>(turn ${acted + 1}/${total})</em>` : "";
      return `<label style="display:block;padding:4px;cursor:pointer">
        <input type="radio" name="combatant" value="${escapeHTML(c.id)}" style="margin-right:6px"> ${escapeHTML(c.name)}${turnsLabel}
      </label>`;
    }).join("");

    // Alert the GM (sound + banner) — typically when a player passed the turn.
    if (alert) {
      _playAlertSound();
      ui.notifications.warn(`A player passed the turn — choose who acts next (${factionLabel}).`);
    }

    // Persistent, modal prompt: the GM cannot dismiss it by accident (Escape /
    // clicking away re-opens it). They must either pick a combatant or press the
    // explicit "Cancel" button to deliberately abort the advance.
    const CANCEL = "__icon_cancel__";
    // Safety cap so a pathological close-loop can never hang the client forever.
    for (let attempt = 0; attempt < 100; attempt++) {
      let result;
      try {
        result = await foundry.applications.api.DialogV2.wait({
          window:  { title: `⚠ Who acts next? (${factionLabel})` },
          modal:   true,
          content: `<div><p style="margin:0 0 8px;color:#e0a020;font-weight:bold">Select the next combatant to act — this can't be skipped.</p>${buildOptions()}</div>`,
          buttons: [
            { action: "confirm", label: "Confirm", default: true, callback: (_e, button, dialog) => {
              const root = button?.form ?? dialog?.element ?? dialog;
              return root.querySelector('input[name="combatant"]:checked')?.value ?? null;
            } },
            { action: "cancel", label: "Cancel (don't advance)", callback: () => CANCEL },
          ],
          rejectClose: false,
        });
      } catch { result = null; }

      if (result === CANCEL) return null;                 // deliberate abort
      if (result && result !== CANCEL) {
        const chosen = this.combatants.get(result);
        if (chosen) return chosen;                        // valid choice
      }
      // Closed without choosing, or Confirm with nothing selected → re-prompt.
      _playAlertSound();
    }
    return null;
  }

  /**
   * Prompt for a combatant of the given faction, mark them as having acted
   * (incrementing the actedThisRound counter), and jump the combat tracker
   * to their slot. Returns true on success, false if cancelled or none.
   */
  async _promptAndJump(faction, { alert = false } = {}) {
    const chosen = await this._promptCombatant(faction, { alert });
    if (!chosen) return false;

    const acted = chosen.getFlag(FLAG_NS, "actedThisRound") ?? 0;
    await chosen.setFlag(FLAG_NS, "actedThisRound", acted + 1);

    // Find the (acted)th occurrence of chosen in this.turns. Elite foes and
    // Legends appear multiple times in this.turns — we want the slot that
    // matches "this is their Nth turn of the round".
    let seen = 0;
    let turnIdx = -1;
    for (let i = 0; i < this.turns.length; i++) {
      if (this.turns[i]?.id === chosen.id) {
        if (seen === acted) { turnIdx = i; break; }
        seen++;
      }
    }
    if (turnIdx < 0) {
      // Fall back to first matching slot
      turnIdx = this.turns.findIndex(c => c?.id === chosen.id);
    }
    if (turnIdx < 0) return false;

    await this.update({ turn: turnIdx }, { previousTurn: this.turn });
    return true;
  }

  /* -------------------------------------------------- */
  /*  Start combat                                       */
  /* -------------------------------------------------- */

  /** PCs always go first in round 1. @override */
  async startCombat() {
    await this.setFlag(FLAG_NS, FLAG_FIRST,   "pc");
    await this.setFlag(FLAG_NS, FLAG_RESOLVE, 0);
    await this._resetActedThisRound();
    // Legend HP scaling is now manual: the GM sets `system.playerScale`
    // on the Legend sheet before the fight, and the sheet rescales
    // hp.max from the canonical hp.baseline.
    await super.startCombat();
    // Prompt for the first PC to act in round 1
    await this._promptAndJump("pc");
    return this;
  }

  /* -------------------------------------------------- */
  /*  Next Turn                                          */
  /* -------------------------------------------------- */

  /**
   * Strict PC/NPC alternation with interactive who-acts-next picking.
   * The faction is determined automatically: opposite of the current side,
   * unless that side has no one left, in which case the same side acts again.
   * @override
   */
  async nextTurn({ alert = false } = {}) {
    if (_relayToGM(this, "nextTurn")) return this;
    const pcsRemaining  = this.combatants.filter(c => IconCombat.isPC(c)  && this._actsRemaining(c) > 0).length;
    const npcsRemaining = this.combatants.filter(c => IconCombat.isNPC(c) && this._actsRemaining(c) > 0).length;

    // Both sides exhausted → end of round
    if (pcsRemaining === 0 && npcsRemaining === 0) {
      return this.nextRound();
    }

    // Determine upcoming faction by alternation (with fallback if one side empty)
    const cur = this.combatant;
    const curFaction = cur ? (IconCombat.isPC(cur) ? "pc" : "npc") : null;
    let upcoming;
    if (curFaction === "pc" && npcsRemaining > 0)        upcoming = "npc";
    else if (curFaction === "npc" && pcsRemaining > 0)   upcoming = "pc";
    else if (pcsRemaining > 0)                            upcoming = "pc";
    else                                                  upcoming = "npc";

    const acted = await this._promptAndJump(upcoming, { alert });
    if (!acted) return; // User cancelled — stay on current turn
    return this;
  }

  /* -------------------------------------------------- */
  /*  Next Round                                         */
  /* -------------------------------------------------- */

  /** @override */
  async nextRound({ alert = false } = {}) {
    if (_relayToGM(this, "nextRound")) return this;
    /* --- Determine who ended this round (last non-slow combatant) --- */
    const lastNormal = this.turns.findLast(c => !c.getFlag(FLAG_NS, FLAG_SLOW));
    const lastFaction = lastNormal
      ? (IconCombat.isPC(lastNormal) ? "pc" : "npc")
      : "pc";
    const nextFirst = lastFaction === "pc" ? "npc" : "pc";

    /* --- Update faction order for next round --- */
    await this.setFlag(FLAG_NS, FLAG_FIRST, nextFirst);

    /* --- Party Resolve +1 (house rule, opt-in via system settings) --- */
    if (game.settings.get("icon-system", "hrPartyResolveAutoIncrement")) {
      await this._incrementPartyResolve();
    }

    /* --- Clear slow-turn flags (resets each round) --- */
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

    /* --- Reset per-combatant acted counter so the next round starts fresh --- */
    await this._resetActedThisRound();

    await super.nextRound();
    /* --- Prompt for the first combatant of the new round's starting faction --- */
    await this._promptAndJump(nextFirst, { alert });
    return this;
  }

  /* -------------------------------------------------- */
  /*  Previous turn / round (relayed for players too)    */
  /* -------------------------------------------------- */

  /** @override */
  async previousTurn() {
    if (_relayToGM(this, "previousTurn")) return this;
    return super.previousTurn();
  }

  /** @override */
  async previousRound() {
    if (_relayToGM(this, "previousRound")) return this;
    return super.previousRound();
  }

  /* -------------------------------------------------- */
  /*  End combat                                         */
  /* -------------------------------------------------- */

  /** @override */
  async endCombat() {
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
     * Aether (Wright) persists across combats per ICON rules.
     */
    for (const combatant of this.combatants) {
      if (combatant.actor?.type === "icon") {
        await combatant.actor.update({
          "system.combat.resolve.party": 0,
          "system.combat.classResources.vigilance.value":      0,
          "system.combat.classResources.comboToken.value":     0,
          "system.combat.classResources.blessingTokens.value": 0,
          "system.combat.classResources.powerDice":            [],
        });
      }
    }

    return super.endCombat();
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
   * Toggle slow-turn status for a combatant.
   * If already in a slow turn, calling this removes it.
   * Rebuilds turn order immediately.
   */
  static async toggleSlowTurn(combatantId) {
    const combat     = game.combat;
    if (!combat)     return;
    const combatant  = combat.combatants.get(combatantId);
    if (!combatant)  return;

    // Electing a slow turn reorders the Combat document (GM-only write). A
    // player relays the request to the active GM, who performs the toggle.
    if (_emitTrackerActionToGM({ type: "combatTrackerAction", method: "toggleSlowTurn", combatantId })) return;

    const isSlow = combatant.getFlag(FLAG_NS, FLAG_SLOW) ?? false;
    await combatant.setFlag(FLAG_NS, FLAG_SLOW, !isSlow);
    combat.setupTurns();
    combat.render(false);

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

  /* -------------------------------------------------- */
  /*  Current-turn faction                               */
  /* -------------------------------------------------- */

  /** "pc" or "npc" — faction of the currently-active combatant. */
  get currentFaction() {
    const c = this.combatant;
    if (!c) return null;
    return IconCombat.isPC(c) ? "pc" : "npc";
  }
}

/* ================================================== */
/*  Helpers                                            */
/* ================================================== */

/** Interleave two arrays: [a0, b0, a1, b1, …, remaining…] */
function _interleave(a, b) {
  const result = [];
  const len    = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
}

/** Sort by initiative descending; ties broken by combatant name. */
function _byInitiative(a, b) {
  const ia = a.initiative ?? -Infinity;
  const ib = b.initiative ?? -Infinity;
  if (ia !== ib) return ib - ia;
  return a.name.localeCompare(b.name);
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
   * Relay channel: a player who ends/changes the turn emits a request here;
   * the active GM (only one processes) runs the real turn-advance method.
   */
  game.socket?.on(SOCKET, async (data) => {
    try {
      if (!game.user.isGM) return;
      // Only the designated active GM processes, to avoid double-execution.
      if (game.users.activeGM?.id !== game.user.id) return;

      if (data?.type === "combatAdvance") {
        const combat = game.combats.get(data.combatId);
        if (!(combat instanceof IconCombat)) return;
        const allowed = ["nextTurn", "nextRound", "previousTurn", "previousRound"];
        if (!allowed.includes(data.method)) return;
        // alert:true → the GM gets a modal, sound + banner (a player passed the
        // turn, so the GM must be nudged to pick who acts next).
        await combat[data.method]({ alert: true });
      } else if (data?.type === "combatTrackerAction") {
        if (data.method === "toggleSlowTurn") {
          await IconCombat.toggleSlowTurn(data.combatantId);
        } else if (data.method === "awardResolve") {
          const actor = game.actors.get(data.actorId);
          if (actor) await IconCombat.awardPersonalResolve(actor, data.amount ?? 1);
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
   * We use it to:
   *   1. Trigger end-of-turn status saves for the combatant who JUST finished.
   *   2. Apply end-of-turn effects (Regeneration) for that same combatant.
   */
  Hooks.on("updateCombat", async (combat, changes, options, userId) => {
    // Only process on the GM client to avoid duplicate execution
    if (!game.user.isGM) return;
    if (!(combat instanceof IconCombat)) return;

    try {
      /* --- Turn changed --- */
      const turnChanged  = "turn"  in changes;
      const roundChanged = "round" in changes;

      if (turnChanged || roundChanged) {
        /* End-of-turn resolution for the PREVIOUS combatant: status saves,
         * then Regeneration — both happen at the end of one's own turn. */
        const prevTurn = options.previousTurn ?? (combat.turn > 0 ? combat.turn - 1 : null);
        if (prevTurn != null && !roundChanged) {
          const prevCombatant = combat.turns[prevTurn];
          if (prevCombatant?.actor) {
            await rollEndOfTurnSaves(prevCombatant);
            await applyEndOfTurnEffects(prevCombatant);
          }
        }

        /* Start-of-turn housekeeping for the NOW-active combatant */
        const current = combat.combatant;
        if (current?.actor) {
          /* Non-legend foes recharge interrupts at the start of their own
           * turn. Legends recharge at round start (handled in nextRound). */
          const actor = current.actor;
          if (actor?.type === "foe") {
            if (actor.getFlag(FLAG_NS, "interruptUses") != null) {
              await actor.unsetFlag(FLAG_NS, "interruptUses");
            }
          }
        }
      }
    } catch (err) {
      console.error("ICON 1.5 | Error in updateCombat handler:", err);
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
   * Render the combat tracker: strip vanilla initiative UI and add ICON-specific
   * controls (slow turn button, resolve display with +1, PC/NPC turn indicator,
   * prominent round counter + party resolve, legend round-action indicator).
   */
  Hooks.on("renderCombatTracker", (app, html, data) => {
    try {
      const combat = data?.combat;
      if (!combat || !(combat instanceof IconCombat)) return;
      _renderIconTracker(app, html, data, combat);
    } catch (err) {
      console.error("ICON 1.5 | Error in renderCombatTracker hook:", err);
    }
  });
}

function _renderIconTracker(app, html, data, combat) {
    /* -------------------------------------------------- */
    /*  Strip vanilla initiative UI                        */
    /* -------------------------------------------------- */
    // Hide per-combatant initiative number / d20 roll button
    html.querySelectorAll(".token-initiative, [data-control=\"rollInitiative\"]")
        .forEach(el => el.remove());
    // Hide "Roll All" / "Roll NPC" buttons in the tracker header
    html.querySelectorAll('[data-control="rollAll"], [data-control="rollNPC"]')
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

      // --- Slow Turn button ---
      const isSlow  = IconCombat.isSlow(c);
      const slowBtn = document.createElement("button");
      slowBtn.type  = "button";
      slowBtn.title = isSlow ? "Cancel Slow Turn" : "Go Slow (skip to after all normal turns)";
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
    /*  Consumed turns: strike through + sink to bottom     */
    /* -------------------------------------------------- */
    // A combatant may appear in multiple tracker rows (elite foes, legends).
    // Walk the rows in turn order, counting each combatant's occurrences, and
    // mark a row as "consumed" once that occurrence index falls below the
    // combatant's actedThisRound count AND it isn't the in-progress (active)
    // slot. Consumed rows get struck through and sink to the bottom of the list.
    if (combat.started) {
      const rows       = Array.from(html.querySelectorAll(".combatant"));
      const currentId  = combat.combatant?.id ?? null;
      const seen       = new Map();   // combatantId → occurrences seen so far
      const consumed   = [];
      for (const el of rows) {
        const id = el.dataset.combatantId;
        const c  = id ? combat.combatants.get(id) : null;
        if (!c) continue;
        const occ = seen.get(id) ?? 0;
        seen.set(id, occ + 1);
        const acted = c.getFlag(FLAG_NS, "actedThisRound") ?? 0;
        // The in-progress slot of the current combatant is occurrence acted-1;
        // every earlier started occurrence is fully consumed. For a combatant
        // who is NOT currently acting, all started occurrences are consumed.
        const threshold = (id === currentId) ? acted - 1 : acted;
        if (occ < threshold) {
          el.classList.add("icon-turn-consumed");
          consumed.push(el);
        }
      }
      // Move consumed rows to the bottom, preserving their relative order.
      for (const el of consumed) el.parentElement?.appendChild(el);
    }

    /* -------------------------------------------------- */
    /*  Header block: round, PC/NPC turn indicator, resolve */
    /* -------------------------------------------------- */
    const header = html.querySelector(".combat-tracker-header, header");
    if (header && combat.started && !header.querySelector(".icon-combat-banner")) {
      const banner = document.createElement("div");
      banner.classList.add("icon-combat-banner");

      const faction = combat.upcomingFaction; // "pc" | "npc" | null
      const factionLabel = faction === "pc" ? "PC TURN" : faction === "npc" ? "NPC TURN" : "";
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
