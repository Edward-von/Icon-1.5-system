/**
 * xp-award.mjs — ICON 1.5 End-of-Session XP Award Macro
 *
 * Tick end-of-session XP triggers and award XP to the chosen PCs.
 *
 * The dialog lists every PC you own with a checkbox, so a GM can also award
 * XP to one character alone — catching up a player who missed the end of the
 * session — instead of the whole table. Tokens selected on the canvas start
 * ticked; with nothing selected, everyone is.
 */

(async () => {
  // Only actors the current user owns — a player updating a PC they don't own
  // throws a permission error and aborts the macro. With this filter a GM sees
  // every PC, while a player sees just their own.
  const owned = game.actors.filter(a => a.type === "icon" && a.isOwner);
  if (!owned.length) {
    ui.notifications.warn("XP Award: no Icon (PC) actors you own were found. Ask your GM to award XP, or check actor ownership.");
    return;
  }

  // Pre-tick the PCs whose token is selected on the map, if any.
  const selected = new Set((canvas?.tokens?.controlled ?? [])
    .map(t => t.actor?.id).filter(id => owned.some(a => a.id === id)));
  const pcRowsHtml = owned
    .map(a => `<label><input type="checkbox" class="icon-xp-pc" value="${a.id}" ${!selected.size || selected.has(a.id) ? "checked" : ""}> ${foundry.utils.escapeHTML(a.name)}</label>`)
    .join("");

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
        .icon-xp-dialog .icon-xp-pcs { max-height: 140px; overflow-y: auto; border: 1px solid #3a3528; border-radius: 3px; padding: 4px 6px; background: #12161e; }
        .icon-xp-dialog .icon-xp-pick { display: flex; gap: 10px; margin: 2px 0 0 2px; font-size: .78em; }
        .icon-xp-dialog .icon-xp-pick a { color: #e8b828; cursor: pointer; text-decoration: underline; }
      </style>
      <div class="icon-xp-dialog">
        <h3>Characters</h3>
        <div class="icon-xp-pcs">${pcRowsHtml}</div>
        <div class="icon-xp-pick"><a data-xp-all>All</a><a data-xp-none>None</a>${selected.size ? "<span style='color:#7a7060'>(ticked from the selected tokens)</span>" : ""}</div>

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
        const ids = Array.from(root.querySelectorAll(".icon-xp-pc:checked")).map(el => el.value);

        return { idealXp, chalXp, ambXp, burdenXp, total, ids };
      },
    },
    // All / None links over the character list.
    render: (_event, dialog) => {
      const root = dialog.element;
      const boxes = () => root.querySelectorAll(".icon-xp-pc");
      root.querySelector("[data-xp-all]")?.addEventListener("click", () => boxes().forEach(b => { b.checked = true; }));
      root.querySelector("[data-xp-none]")?.addEventListener("click", () => boxes().forEach(b => { b.checked = false; }));
    },
    rejectClose: false,
  });
  } catch { return; }

  if (!result) return;

  const pcs = owned.filter(a => result.ids.includes(a.id));
  if (!pcs.length) {
    ui.notifications.warn("XP Award: no character was ticked — nothing was awarded.");
    return;
  }

  // End of session: refresh per-session bond power uses on every PC processed,
  // even when 0 XP is awarded — the session still ended.
  let powersReset = 0;
  for (const actor of pcs) {
    const used = actor.items.filter(i =>
      i.type === "bond-power" && (i.system?.usedThisSession ?? 0) > 0);
    if (!used.length) continue;
    await actor.updateEmbeddedDocuments("Item",
      used.map(i => ({ _id: i.id, "system.usedThisSession": 0 })));
    powersReset += used.length;
  }
  if (powersReset) {
    ui.notifications.info(`XP Award: reset ${powersReset} per-session bond power use(s).`);
  }

  if (result.total === 0) {
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
      levelups.push(`<div class="icon-macro-levelup-alert"><i class="fas fa-arrow-up"></i> ${actor.name} — LEVEL UP AVAILABLE</div>`);
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
