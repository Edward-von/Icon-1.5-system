/**
 * apply-damage.mjs — ICON 1.5 Generic Damage Macro
 *
 * Posts a damage card for a manually-entered amount against the user's current
 * targets (or selected tokens as a fallback). Used for non-ability damage that
 * has no roll of its own — e.g. the Counter status, environmental/hazard damage,
 * fixed effect damage, etc.
 *
 * The per-target "Apply" buttons reuse the system's standard damage pipeline
 * (Vigor absorbs first, then HP; Mobs lose 1 hit per instance), so behaviour is
 * identical to ability-rolled damage.
 */

(async () => {
  // Prefer targeted tokens (press T); fall back to selected/controlled tokens.
  let tokens = Array.from(game.user?.targets ?? []);
  if (!tokens.length) tokens = canvas?.tokens?.controlled ?? [];
  if (!tokens.length) {
    ui.notifications.warn("Apply Damage: target (T) or select at least one token first.");
    return;
  }

  const result = await foundry.applications.api.DialogV2.prompt({
    window:  { title: "Apply Damage" },
    content: `
      <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
        <label>Damage amount
          <input type="number" name="amount" value="0" min="0" autofocus style="width:80px">
        </label>
        <label>Label (optional)
          <input type="text" name="label" placeholder="Counter" style="width:160px">
        </label>
        <p style="margin:0;font-size:.82em;color:#7fb2ff">
          🎯 ${tokens.length} target(s): ${tokens.map(t => t.actor?.name ?? t.name ?? "?").join(", ")}
        </p>
      </div>`,
    ok: {
      label: "Post Damage Card",
      callback: (_e, button, dialog) => {
        const root = button?.form ?? dialog?.element ?? dialog;
        return {
          amount: Math.max(0, Number(root.querySelector('input[name="amount"]')?.value) || 0),
          label:  root.querySelector('input[name="label"]')?.value?.trim() || "",
        };
      },
    },
    rejectClose: false,
  }).catch(() => null);

  if (!result || result.amount <= 0) {
    ui.notifications.info("Apply Damage: no damage entered.");
    return;
  }

  const { amount, label } = result;

  const targets = tokens.map(t => ({
    actorUuid: t.actor?.uuid ?? null,
    name:      t.actor?.name ?? t.document?.name ?? "Unknown",
    img:       t.actor?.img ?? t.document?.texture?.src ?? "",
    defense:   t.actor?.system?.combat?.defense ?? t.actor?.system?.defense ?? null,
    hp:        t.actor?.system?.combat?.hp?.value ?? t.actor?.system?.hp?.value ?? null,
    hpMax:     t.actor?.system?.combat?.hp?.max ?? t.actor?.system?.hp?.max ?? null,
  })).filter(t => t.actorUuid);

  if (!targets.length) {
    ui.notifications.warn("Apply Damage: selected tokens have no linked actors.");
    return;
  }

  const steps = [{ label: label ? `${label} (flat)` : "Flat damage", value: amount, isFinal: true }];

  const renderTpl = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const content = await renderTpl("systems/icon-system/templates/chat/damage-card.hbs", {
    steps,
    finalDamage: amount,
    targetName:  "",
    targets,
    hasTargets:  true,
  });

  await ChatMessage.create({
    speaker: { alias: label || "Damage" },
    content,
    flags: {
      "icon-system": {
        damage: { amount, sourceName: label || "Damage", targets: targets.map(t => t.actorUuid) },
      },
    },
  });
})();
