/**
 * xp-award.mjs — ICON 1.5 End-of-Session XP Award Macro
 *
 * Tick end-of-session XP triggers and award XP to every PC.
 */

(async () => {
  // Only actors the current user owns — a player updating a PC they don't own
  // throws a permission error and aborts the macro. With this filter a GM
  // awards XP to every PC, while a player awards it to just their own.
  const pcs = game.actors.filter(a => a.type === "icon" && a.isOwner);
  if (!pcs.length) {
    ui.notifications.warn("XP Award: no Icon (PC) actors you own were found. Ask your GM to award XP, or check actor ownership.");
    return;
  }

  let result;
  try {
  result = await foundry.applications.api.DialogV2.prompt({
    window:  { title: "End-of-Session XP" },
    content: `
      <style>
        .icon-xp-dialog { font-family: "Signika", serif; color: #c0b898; }
        .icon-xp-dialog h3 { color: #e8b828; margin: 8px 0 4px; border-bottom: 1px solid #3a3528; }
        .icon-xp-dialog label { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: .9em; cursor: pointer; }
        .icon-xp-dialog input[type=checkbox] { width: 16px; height: 16px; }
        .icon-xp-dialog input[type=number]   { width: 60px; background: #12161e; color: #e0d0b0; border: 1px solid #3a3528; border-radius: 3px; padding: 2px 5px; }
        .icon-xp-dialog .icon-xp-note { font-size: .78em; color: #7a7060; margin-left: 24px; font-style: italic; }
      </style>
      <div class="icon-xp-dialog">
        <h3>Ideals</h3>
        <label><input type="checkbox" id="ideal1"> Fulfilled at least 1 Ideal <span style="color:#e8b828">(+1 XP)</span></label>
        <label><input type="checkbox" id="ideal2"> Fulfilled 2+ Ideals <span style="color:#e8b828">(+2 XP total)</span></label>
        <p class="icon-xp-note">Tick both for 2 XP (ideal2 implies ideal1).</p>

        <h3>Challenges</h3>
        <label><input type="checkbox" id="chal1"> Character was challenged or tested <span style="color:#e8b828">(+1 XP)</span></label>
        <label><input type="checkbox" id="chal2"> Challenged multiple times <span style="color:#e8b828">(+2 XP total)</span></label>

        <h3>Ambitions</h3>
        <label>Completed ambition XP to award:
          <input type="number" id="ambXp" value="0" min="0" max="3"/>
          <span style="font-size:.8em;color:#7a7060">(0–3 XP)</span>
        </label>
        <p class="icon-xp-note">Minor=1, Medium=2, Major=3. Group ambitions give 1 to all.</p>

        <h3>Burden Invoke</h3>
        <label><input type="checkbox" id="burden"> Invoked a burden at least once <span style="color:#e8b828">(+1 XP)</span></label>
      </div>
    `,
    ok: {
      label: "Award XP",
      callback: (_e, button, dialog) => {
        const root = button?.form ?? dialog?.element ?? dialog;
        const checked = (id) => !!root.querySelector(`#${id}`)?.checked;
        const ideal1  = checked("ideal1");
        const ideal2  = checked("ideal2");
        const chal1   = checked("chal1");
        const chal2   = checked("chal2");
        const ambXp   = Math.min(3, Math.max(0, parseInt(root.querySelector("#ambXp")?.value) || 0));
        const burden  = checked("burden");

        const idealXp  = ideal2 ? 2 : ideal1 ? 1 : 0;
        const chalXp   = chal2  ? 2 : chal1  ? 1 : 0;
        const burdenXp = burden ? 1 : 0;
        const total    = idealXp + chalXp + ambXp + burdenXp;

        return { idealXp, chalXp, ambXp, burdenXp, total };
      },
    },
    rejectClose: false,
  });
  } catch { return; }

  if (!result || result.total === 0) {
    ui.notifications.info("XP Award: No XP awarded (0 total).");
    return;
  }

  const { idealXp, chalXp, ambXp, burdenXp, total } = result;

  const triggerRows = [];
  if (idealXp)  triggerRows.push(`<li><span><i class="fas fa-star"></i> Ideals</span><span class="icon-macro-value">+${idealXp} XP</span></li>`);
  if (chalXp)   triggerRows.push(`<li><span><i class="fas fa-shield-halved"></i> Challenged</span><span class="icon-macro-value">+${chalXp} XP</span></li>`);
  if (ambXp)    triggerRows.push(`<li><span><i class="fas fa-mountain-sun"></i> Ambition</span><span class="icon-macro-value">+${ambXp} XP</span></li>`);
  if (burdenXp) triggerRows.push(`<li><span><i class="fas fa-weight-hanging"></i> Burden</span><span class="icon-macro-value">+${burdenXp} XP</span></li>`);

  const pcRows = [];
  const levelups = [];

  for (const actor of pcs) {
    const currentXp = actor.system.narrative.xp?.value ?? 0;
    const maxXp     = actor.system.narrative.xp?.max ?? 15;
    const newXp     = Math.min(maxXp, currentXp + total);
    await actor.update({ "system.narrative.xp.value": newXp });

    pcRows.push(`
      <li>
        <span class="icon-macro-pc-name">${actor.name}</span>
        <span class="icon-macro-value">${currentXp} → ${newXp} XP</span>
      </li>
    `);

    if (newXp >= 15) {
      levelups.push(`<div class="icon-macro-levelup-alert"><i class="fas fa-arrow-up"></i> ${actor.name} — LEVEL UP DISPONIBILE</div>`);
      ui.notifications.info(`${actor.name} has filled their XP bar!`);
    }
  }

  const body = `
    <h4>Triggers</h4>
    <ul class="icon-macro-list">${triggerRows.join("")}</ul>
    <h4>Characters</h4>
    <ul class="icon-macro-list">${pcRows.join("")}</ul>
    <p style="text-align:center;margin-top:8px">
      Total: <span class="icon-macro-value" style="font-size:1.2em">+${total} XP</span>
    </p>
    ${levelups.join("")}
  `;

  const renderTpl = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const content = await renderTpl("systems/icon-system/templates/chat/macro-message.hbs", {
    type:    "xp",
    icon:    "fa-star",
    title:   "XP Award",
    content: body,
    footer:  "End of session.",
  });

  await ChatMessage.create({
    speaker: { alias: "End of Session" },
    content,
  });

  ui.notifications.info(`XP Award: +${total} XP awarded to ${pcs.length} PC(s).`);
})();
