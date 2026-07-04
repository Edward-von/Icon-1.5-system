/**
 * combat-start.mjs — ICON 1.5 Combat Start Macro
 *
 * Posts a styled combat-start message showing every PC on the current scene
 * with their HP and Personal Resolve, plus a reminder of core turn-order
 * rules. Does NOT modify any resources.
 */

(async () => {
  const scene = game.scenes?.active ?? game.scenes?.current;
  const pcTokens = (scene?.tokens ?? []).filter(t => t.actor?.type === "icon");
  const pcs = pcTokens.length
    ? pcTokens.map(t => t.actor)
    : game.actors.filter(a => a.type === "icon");

  if (!pcs.length) {
    ui.notifications.warn("Combat Start: No Icon (PC) actors found.");
    return;
  }

  const rows = pcs.map(actor => {
    const hp       = actor.system.combat.hp?.value ?? 0;
    const hpMax    = actor.system.combat.hp?.max   ?? 0;
    const resolve  = actor.system.combat.resolve?.personal ?? 0;
    const hpClass  = hp <= hpMax / 2 ? "icon-macro-warning" : "icon-macro-success";
    return `
      <li>
        <span class="icon-macro-pc-name">${actor.name}</span>
        <span>
          <span class="${hpClass}">${hp}/${hpMax} HP</span>
          <span class="icon-macro-sub">Personal Resolve: <span class="icon-macro-value">${resolve}</span></span>
        </span>
      </li>
    `;
  }).join("");

  const body = `
    <h4>Party</h4>
    <ul class="icon-macro-list">${rows}</ul>
    <h4>Reminder</h4>
    <ul class="icon-macro-list">
      <li><span><i class="fas fa-user-shield"></i> I PC agiscono per primi</span></li>
      <li><span><i class="fas fa-arrows-left-right"></i> Turni alternati PC / NPC</span></li>
      <li><span><i class="fas fa-users"></i> Party Resolve</span><span class="icon-macro-value">+1 per round</span></li>
    </ul>
  `;

  const renderTpl = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const content = await renderTpl("systems/icon-system/templates/chat/macro-message.hbs", {
    type:    "combat",
    icon:    "fa-khanda",
    title:   "Combat",
    content: body,
    footer:  "Che il combattimento abbia inizio.",
  });

  await ChatMessage.create({
    speaker: { alias: "Combat" },
    content,
  });

  ui.notifications.info(`Combat Start: ${pcs.length} PC(s) engaged.`);
})();
