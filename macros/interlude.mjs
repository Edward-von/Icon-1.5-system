/**
 * interlude.mjs — ICON 1.5 Interlude Macro
 *
 * Effect (per PC):
 *   • Wounds cleared, HP restored to new max
 *   • Strain cleared, Effort refilled, Vigor cleared
 *   • Personal Resolve reset
 *   • All status effects removed (including ongoing)
 *   • 3 burden clock segments healed
 *   • House rule (opt-in): spend 2 Dust per extra segment beyond the base 3
 */

(async () => {
  const pcs = game.actors.filter(a => a.type === "icon");
  if (!pcs.length) {
    ui.notifications.warn("Interlude: No Icon (PC) actors found.");
    return;
  }

  const dustHouseRule = game.settings.get("icon-system", "hrInterludeDustHealing");

  const extraSegs = dustHouseRule
    ? (await foundry.applications.api.DialogV2.prompt({
        window:  { title: "Interlude — Dust Healing" },
        content: `
          <p>Each PC heals <strong>3 burden clock segments</strong> during an interlude.<br>
          You may spend <strong>2 Dust per extra segment</strong>.</p>
          <label>Extra segments from Dust (per PC):
            <input type="number" id="dustSegs" name="dustSegs" value="0" min="0" style="width:60px"/>
          </label>
        `,
        ok: {
          label: "Apply",
          callback: (_e, button, dialog) => {
            const root = button?.form ?? dialog?.element ?? dialog;
            return parseInt(root.querySelector("#dustSegs")?.value) || 0;
          },
        },
        rejectClose: false,
      }) ?? 0)
    : 0;

  const baseSegs  = 3;
  const totalSegs = baseSegs + extraSegs;
  const dustSpent = extraSegs * 2;

  const rows = [];

  for (const actor of pcs) {
    const vit = actor.system.combat.vit;
    await actor.update({
      "system.combat.wounds.value":     0,
      "system.combat.hp.value":         vit * 4,
      "system.combat.vigor.value":      0,
      "system.narrative.strain.value":  0,
      "system.narrative.effort.value":  actor.system.narrative.effort.max,
      "system.combat.resolve.personal": 0,
    });

    // Heal burden clocks — distribute totalSegs across burdens
    const burdens = actor.system.narrative.burdens ?? [];
    let healedFull = 0;
    let healedSegs = 0;
    if (burdens.length && totalSegs > 0) {
      let remaining = totalSegs;
      const advanced = burdens.map(b => {
        if (remaining <= 0) return b;
        const canFill = b.clock.max - b.clock.value;
        const fill    = Math.min(remaining, canFill);
        remaining    -= fill;
        healedSegs   += fill;
        return { ...b, clock: { ...b.clock, value: b.clock.value + fill } };
      });
      const filtered = advanced.filter(b => b.clock.value < b.clock.max);
      healedFull = advanced.length - filtered.length;
      await actor.update({ "system.narrative.burdens": filtered });
    }

    // Remove ALL status effects
    const effectIds = actor.effects
      .filter(e => e.getFlag("icon-system", "isStatus"))
      .map(e => e.id);
    if (effectIds.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", effectIds);
    }

    const remaining = actor.system.narrative.burdens.length;
    rows.push(`
      <li>
        <span class="icon-macro-pc-name">${actor.name}</span>
        <span class="icon-macro-success">+${healedSegs} seg</span>
      </li>
      <li>
        <span>Burdens remaining</span>
        <span class="icon-macro-value">${remaining}</span>
      </li>
      ${healedFull > 0 ? `
        <li>
          <span>Fully healed</span>
          <span class="icon-macro-success">${healedFull}</span>
        </li>
      ` : ""}
    `);
  }

  const bodyParts = [
    `<p>Step healing: <span class="icon-macro-value">${totalSegs}</span> burden segment(s) per PC.</p>`,
  ];
  if (dustSpent > 0) {
    bodyParts.push(`<p>Dust spent: <span class="icon-macro-warning">${dustSpent}</span> (<span class="icon-macro-value">+${extraSegs}</span> extra seg each).</p>`);
  }
  bodyParts.push(`<ul class="icon-macro-list">${rows.join("")}</ul>`);

  const renderTpl = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const content = await renderTpl("systems/icon-system/templates/chat/macro-message.hbs", {
    type:    "interlude",
    icon:    "fa-moon",
    title:   "Interlude",
    content: bodyParts.join(""),
    footer:  "The interlude draws to a close. A new expedition awaits.",
  });

  await ChatMessage.create({
    speaker: { alias: "Interlude" },
    content,
  });

  ui.notifications.info(`Interlude complete. ${totalSegs} burden segments applied per PC.`);
})();
