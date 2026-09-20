/**
 * infuse.mjs — the Wright's Infuse versions of an ability.
 *
 * "Infuse: Wright only. Triggers when Aether is spent on an ability" (p.117).
 * The book prints the upgrade as its own block — "Infuse 3: CRYOTIC — Change
 * area to Line 8…", "Infuse X: ÄTHERSTURM — extend the area by 1 space for
 * every Aether infused" — so the cost and the name are already in the text and
 * don't need a new field on every ability.
 *
 * Arming an infusion spends the Aether and records it on the actor
 * (`flags.icon-system.infused`), the same way a spent combo token is recorded,
 * so the next roll of that ability knows which version is in play. It clears
 * when the ability is rolled, when the infusion is cancelled, and at the end
 * of combat with the rest of the Wright's Aether.
 */

const _log = (...a) => console.debug("[ICON | Infuse]", ...a);
const NS = "icon-system";

/** "Infuse 3" → 3, "Infuse X" → null (the player picks how much). */
export function infuseCost(label) {
  const m = /^infuse\s+(\d+|x)$/i.exec(String(label ?? "").trim());
  if (!m) return undefined;
  return /^x$/i.test(m[1]) ? null : Number(m[1]);
}

/**
 * The name the book gives the infused version: "CRYOTIC" from "CRYOTIC — …",
 * and "STORMLASH" from "STORMLASH (Free Action) — …".
 */
export function infuseName(text) {
  const m = /^\s*([A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\s]{2,})(?:\s*\([^)]*\))?\s*[—-]/.exec(String(text ?? ""));
  return m ? m[1].trim() : "";
}

/** What the actor currently has infused, or null. */
export function armedInfusion(actor) {
  const f = actor?.getFlag?.(NS, "infused");
  return f && f.itemId ? f : null;
}

/**
 * The infusions of one ability, ready for the sheet: label, cost, name, and
 * whether this one is the armed one.
 * @param {Array<{label:string,text:string}>} sections  parsed description blocks
 * @param {Actor}  actor
 * @param {string} itemId
 */
export function infusionsOf(sections, actor, itemId) {
  const armed = armedInfusion(actor);
  const out = [];
  for (const sec of sections ?? []) {
    const cost = infuseCost(sec.label);
    if (cost === undefined) continue;
    out.push({
      label:   sec.label,
      cost,                                   // null = "X", chosen when arming
      name:    infuseName(sec.text),
      text:    sec.text,
      armed:   !!armed && armed.itemId === itemId && armed.label === sec.label,
      aether:  actor?.system?.combat?.classResources?.aether?.value ?? 0,
    });
  }
  return out;
}

/**
 * Spend the Aether and arm this infusion. Returns the amount spent, or null
 * when it couldn't (not enough Aether, or the player cancelled the "how much"
 * prompt of an Infuse X).
 */
export async function armInfusion(actor, item, infusion) {
  const pool = actor.system?.combat?.classResources?.aether?.value ?? 0;
  let cost = infusion.cost;

  if (cost === null) {                        // Infuse X: ask how much
    if (pool < 1) { ui.notifications.warn(`${actor.name} has no Aether to infuse.`); return null; }
    cost = await _promptAmount(pool, infusion);
    if (!cost) return null;
  }
  if (pool < cost) {
    ui.notifications.warn(`${infusion.label} needs ${cost} Aether — ${actor.name} has ${pool}.`);
    return null;
  }

  await actor.update({
    "system.combat.classResources.aether.value": pool - cost,
    [`flags.${NS}.infused`]: { itemId: item.id, label: infusion.label, name: infusion.name, spent: cost },
  });
  _log(`armed "${infusion.label}" on "${item.name}" — ${cost} Aether (${pool} → ${pool - cost})`);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--infuse">
        <strong>✨ ${foundry.utils.escapeHTML(actor.name)}</strong> infuses
        <strong>${foundry.utils.escapeHTML(item.name)}</strong>${infusion.name ? ` — <em>${foundry.utils.escapeHTML(infusion.name)}</em>` : ""}
        <br><small>${foundry.utils.escapeHTML(infusion.label)}: ${cost} Aether spent (${pool - cost} left)</small>
        ${infusion.text ? `<div class="icon-chat-card__desc">${foundry.utils.escapeHTML(infusion.text)}</div>` : ""}
      </div>`,
  });
  return cost;
}

/** Give the Aether back and disarm (the ability wasn't used after all). */
export async function cancelInfusion(actor) {
  const armed = armedInfusion(actor);
  if (!armed) return false;
  const pool = actor.system?.combat?.classResources?.aether?.value ?? 0;
  const max  = actor.system?.combat?.classResources?.aether?.max ?? 6;
  await actor.update({
    "system.combat.classResources.aether.value": Math.min(max, pool + (armed.spent ?? 0)),
    [`flags.${NS}.infused`]: null,
  });
  _log(`cancelled "${armed.label}" — ${armed.spent} Aether returned`);
  return true;
}

/** Forget the armed infusion (it has been used). The Aether stays spent. */
export async function clearInfusion(actor) {
  if (!armedInfusion(actor)) return false;
  await actor.update({ [`flags.${NS}.infused`]: null });
  return true;
}

/** "How much Aether?" for an Infuse X. Resolves the amount or 0. */
async function _promptAmount(pool, infusion) {
  const esc = foundry.utils.escapeHTML;
  try {
    const value = await foundry.applications.api.DialogV2.prompt({
      window: { title: `${infusion.label}${infusion.name ? ` — ${infusion.name}` : ""}` },
      content: `<p>How much Aether do you spend? You have <strong>${pool}</strong>.</p>
        ${infusion.text ? `<p style="font-size:.9em;opacity:.85">${esc(infusion.text)}</p>` : ""}
        <p><input type="number" name="amount" value="1" min="1" max="${pool}" style="width:100%"></p>`,
      ok: {
        label: "Infuse",
        callback: (_e, button) => Math.max(0, Math.min(pool, Number(button.form?.elements?.amount?.value) || 0)),
      },
      rejectClose: false,
    });
    return value ?? 0;
  } catch { return 0; }
}
