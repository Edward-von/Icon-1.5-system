/**
 * camp.mjs — ICON 1.5 Camp Macro
 *
 * Effect (per PC, type "icon"):
 *   • HP healed to max (wounds still reduce hp.max)
 *   • Strain cleared
 *   • Effort refilled
 *   • Vigor cleared
 *   • Personal Resolve reset
 *   • Non-ongoing status effects removed
 *
 * Camp does NOT heal wounds or burdens — that's Interlude.
 */

(async () => {
  const pcs = game.actors.filter(a => a.type === "icon");
  if (!pcs.length) {
    ui.notifications.warn("Camp: No Icon (PC) actors found.");
    return;
  }

  const rows = [];

  for (const actor of pcs) {
    const sys = actor.system;
    const hpBefore     = sys.combat.hp.value;
    const strainBefore = sys.narrative.strain.value;
    const effortBefore = sys.narrative.effort.value;
    const vigorBefore  = sys.combat.vigor.value;

    await actor.update({
      "system.combat.hp.value":         sys.combat.hp.max,
      "system.combat.vigor.value":      0,
      "system.narrative.strain.value":  0,
      "system.narrative.effort.value":  sys.narrative.effort.max,
      "system.combat.resolve.personal": 0,
    });

    const effectIds = actor.effects
      .filter(e => {
        const isStatus  = e.getFlag("icon-system", "isStatus");
        const isOngoing = e.getFlag("icon-system", "ongoing");
        return isStatus && !isOngoing;
      })
      .map(e => e.id);
    if (effectIds.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", effectIds);
    }

    rows.push(`
      <li>
        <span class="icon-macro-pc-name">${actor.name}</span>
        <span class="icon-macro-value">Restored</span>
      </li>
      <li>
        <span>HP</span>
        <span class="icon-macro-success">${hpBefore} → ${sys.combat.hp.max}</span>
      </li>
      <li>
        <span>Strain</span>
        <span class="icon-macro-success">${strainBefore} → 0</span>
      </li>
      <li>
        <span>Effort</span>
        <span class="icon-macro-success">${effortBefore} → ${sys.narrative.effort.max}</span>
      </li>
      <li>
        <span>Vigor</span>
        <span class="icon-macro-success">${vigorBefore} → 0</span>
      </li>
    `);
  }

  const renderTpl = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const content = await renderTpl("systems/icon-system/templates/chat/macro-message.hbs", {
    type:    "camp",
    icon:    "fa-campground",
    title:   "Camp",
    content: `<ul class="icon-macro-list">${rows.join("")}</ul>`,
    footer:  "The party makes camp and recovers its strength.",
  });

  await ChatMessage.create({
    speaker: { alias: "Camp" },
    content,
  });

  ui.notifications.info(`Camp: ${pcs.map(a => a.name).join(", ")} fully rested.`);
})();
