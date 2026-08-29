/**
 * IconActor — Base Actor document class for ICON 1.5.
 */
export class IconActor extends Actor {

  /**
   * Ensure every NEW actor's prototype token is linked by default.
   * Existing actors are not touched (use game.icon.linkAllTokens() to
   * migrate them manually from the console).
   * @override
   */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if (this.prototypeToken?.actorLink !== true) {
      this.updateSource({ "prototypeToken.actorLink": true });
    }
  }

  /**
   * Grant +1 AP when XP crosses the halfway mark (7/15) for the first time
   * in a given level. The flag `system.narrative.xp.halfwayBonusClaimed` is
   * set to true on the same update so the bonus is never granted twice.
   * @override
   */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    if (this.type !== "icon") return;

    const newXp = foundry.utils.getProperty(changed, "system.narrative.xp.value");
    if (newXp === undefined) return;

    const oldXp    = this.system.narrative?.xp?.value ?? 0;
    const claimed  = this.system.narrative?.xp?.halfwayBonusClaimed ?? false;
    const HALFWAY  = 7;

    if (!claimed && oldXp < HALFWAY && newXp >= HALFWAY) {
      const currentAp = this.system.combat?.apTotal ?? 0;
      foundry.utils.setProperty(changed, "system.combat.apTotal", currentAp + 1);
      foundry.utils.setProperty(changed, "system.narrative.xp.halfwayBonusClaimed", true);

      // Post a chat message so the player notices the bonus
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="icon-chat-levelup">
                    <strong>${this.name}</strong> has reached the halfway mark (${HALFWAY} XP)!
                    <br><em>+1 AP granted.</em>
                  </div>`,
      });
    }
  }

  /**
   * Keep the on-token stance marker in sync with `system.combat.stance`.
   * ICON allows one stance at a time, so there is at most one marker effect.
   * Guarded to the triggering user so the embedded-effect mutation runs once.
   * @override
   */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (this.type !== "icon") return;
    if (userId !== game.user.id) return;
    const stance = foundry.utils.getProperty(changed, "system.combat.stance");
    if (stance === undefined) return;          // stance not part of this update
    await this._syncStanceMarker(stance);
  }

  /**
   * Create / update / remove the single "stance" marker ActiveEffect so the
   * token shows when this character is in a stance. The effect carries the
   * stance name and a flag so it can be found again.
   * @param {string} stanceName
   */
  async _syncStanceMarker(stanceName) {
    const existing = this.effects.find(e => e.getFlag("icon-system", "isStanceMarker"));
    const name = (stanceName ?? "").trim();
    const desiredName = name ? `Stance: ${name}` : null;
    // Idempotent: only write when the marker actually needs to change, so a
    // form re-submit on an unrelated field can't churn the effect.
    if (!name) {
      if (existing) await existing.delete();
      return;
    }
    if (existing) {
      if (existing.name !== desiredName) await existing.update({ name: desiredName });
      return;
    }
    await this.createEmbeddedDocuments("ActiveEffect", [{
      name:     desiredName,
      img:      "systems/icon-system/assets/statuses/stance.svg",
      statuses: ["stance"],   // makes it a temporary effect → renders on token
      flags:    { "icon-system": { isStanceMarker: true, isStatus: false } },
    }]);
  }

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Base data preparation before derived data
  }

  /** @override */
  prepareDerivedData() {
    // TypeDataModel.prepareDerivedData() is called automatically by Foundry;
    // place actor-level cross-model derivations here if needed.
    super.prepareDerivedData();
  }

  /**
   * ICON status effects are purely flag-like states handled by the combat engine.
   * They carry no mechanical `changes` entries and therefore do not use the
   * Foundry AE override pipeline.  Calling super here would crash in v13 on any
   * ActiveEffect whose change keys don't resolve to a field in the TypeDataModel
   * schema ("Cannot set properties of undefined (setting 'initial')").
   *
   * We only need to keep `this.statuses` populated so that `hasStatus()` works.
   * @override
   */
  applyActiveEffects() {
    this.statuses ??= new Set();
    this.statuses.clear();
    for (const effect of this.allApplicableEffects()) {
      for (const statusId of (effect.statuses ?? [])) {
        this.statuses.add(statusId);
      }
    }
  }

  /* -------------------------------------------------- */
  /*  Helpers                                            */
  /* -------------------------------------------------- */

  /** Whether this actor is bloodied (at or below 50% max HP). PCs use the
   *  derived `hp.bloodied` (50% of the BASE, un-wounded max). */
  get isBloodied() {
    const hp = this.system.combat?.hp ?? this.system.hp;
    if (!hp) return false;
    const threshold = hp.bloodied ?? Math.ceil(hp.max / 2);
    return hp.value <= threshold;
  }
}
