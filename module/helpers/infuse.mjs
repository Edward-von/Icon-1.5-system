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
  const m = /^infuse\s+(\d+|x)(?:\s*\(mastery\))?$/i.exec(String(label ?? "").trim());
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

/**
 * True when the infused version is an action of its own rather than an
 * upgrade of the next use: the book gives it its own cost after the name,
 * "Infuse 1: STORMLASH (Free Action) — Choose an edge of the map. Your active
 * tsunamis move 2 spaces in that direction." (Tsunami, Stormbender p.233).
 * Nothing is rolled for it, so it is spent and posted at once, not armed.
 */
export function isStandaloneInfusion(text) {
  return /^\s*[A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\s]{2,}\(\s*(?:[Ff]ree [Aa]ction|\d+\s+[Aa]ctions?|[Ii]nterrupt[^)]*)\s*\)\s*[—–-]/.test(String(text ?? ""));
}

/**
 * The infused version a Mastery adds, as one more Infuse block — or [] when
 * the mastery isn't unlocked or isn't one. Seven Wright masteries are a
 * bigger infusion of their ability: "GREAT SPIRIT LANCE: Infuse 6 — 2
 * actions, Attack, Line 10, Width 3…" (Lance), MAGNACRYO / MAGNAGEO /
 * MAGNAPYRE / MAGNABIO / MAGNARIME, TIDAL SMASH. They only lived in the
 * mastery text, so the panel never offered them. The label says "(Mastery)"
 * so it can't clash with the ability's own Infuse block of the same cost.
 * @param {object} system  the ability's system data
 * @returns {Array<{label:string, text:string}>}
 */
export function masteryInfusion(system) {
  if (!system?.masteryUnlocked) return [];
  const text = String(system.mastery ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const m = /^([^:—]+?):\s*Infuse\s+(\d+|X)\s*[—–-]\s*(.+)$/i.exec(text);
  if (!m) return [];
  return [{ label: `Infuse ${m[2].toUpperCase()} (Mastery)`, text: `${m[1].trim().toUpperCase()} — ${m[3]}` }];
}

/**
 * The Infuse versions of a Limit Break, as Infuse blocks. Its effect is one
 * text block with the versions written inline: "Infuse 6: TETRAFLARE — Deal
 * [D]+fray twice instead." (Gigaflare p.208), "Slay or Infuse 3: RAGNARÖK —
 * After this ability resolves…" (Gran Levincross); the Ultimate (chapter 3,
 * p.113) puts the name first: "METEOR — Infuse 8: 6 resolve. Deal [D]+fray
 * four times instead.", "GÖTTERDÄMMERUNG — Infuse 6: …".
 * Each block: `label` "Infuse N", `text` "NAME — rest" (read by infuseName),
 * `body` the rest alone, `source` "Limit Break" / "Ultimate", `slay` when Slay
 * also triggers it, `resolveCost` when the version names its own ("6 resolve").
 * @param {object} system  the limit-break item's system data
 * @param {{ultimate?: boolean}} opts  ultimate unlocked (chapter 3)
 */
export function limitBreakInfusions(system, { ultimate = false } = {}) {
  const plain = (t) => String(t ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const CAPS = "[A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\\s]{2,}?";
  const marker = new RegExp(`(?:\\b(${CAPS})\\s*[—–-]\\s*)?\\b([Ss]lay or )?[Ii]nfuse (\\d+|X)\\s*:\\s*`, "g");
  const out = [];
  for (const [source, raw] of [["Limit Break", system?.effect], ultimate ? ["Ultimate", system?.ultimate] : null].filter(Boolean)) {
    const text = plain(raw);
    const hits = [...text.matchAll(marker)];
    hits.forEach((m, i) => {
      const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
      let body = text.slice(m.index + m[0].length, end).trim();
      let name = (m[1] ?? "").trim();
      if (!name) {                                   // "TETRAFLARE — Deal …"
        name = infuseName(body);
        if (name) body = body.replace(/^[^—–-]*[—–-]\s*/, "");
      }
      const cost = /^x$/i.test(m[3]) ? "X" : m[3];
      const resolve = /^(\d+)\s+resolve\b\.?\s*/i.exec(body);
      out.push({
        label: `Infuse ${cost}`,
        text:  name ? `${name} — ${body}` : body,
        body, name, source,
        slay:  !!m[2],
        resolveCost: resolve ? Number(resolve[1]) : null,
      });
    });
  }
  return out;
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
      standalone: isStandaloneInfusion(sec.text),    // its own action (Stormlash): spent at once, never armed
      mastery: /\(mastery\)/i.test(sec.label),       // the Mastery's bigger version (masteryInfusion)
      costLabel: sec.label.replace(/\s*\(mastery\)\s*$/i, ""),   // "Infuse 6", for the button
      aether:  actor?.system?.combat?.classResources?.aether?.value ?? 0,
      // Limit Break blocks (limitBreakInfusions) carry these too.
      source:  sec.source ?? "",
      slay:    !!sec.slay,
      resolveCost: sec.resolveCost ?? null,
    });
  }
  return out;
}

/**
 * Spend the Aether and arm this infusion. Returns the amount spent, or null
 * when it couldn't (not enough Aether, or the player cancelled the "how much"
 * prompt of an Infuse X). With `arm: false` (a version that is its own
 * action, isStandaloneInfusion) the Aether is spent and the version posted,
 * but nothing stays armed: there is no roll to wait for.
 */
export async function armInfusion(actor, item, infusion, { arm = true } = {}) {
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

  const update = { "system.combat.classResources.aether.value": pool - cost };
  if (arm) update[`flags.${NS}.infused`] = { itemId: item.id, label: infusion.label, name: infusion.name, spent: cost };
  await actor.update(update);
  _log(`${arm ? "armed" : "used"} "${infusion.label}" on "${item.name}" — ${cost} Aether (${pool} → ${pool - cost})`);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--infuse">
        <strong><i class='fa-solid fa-wand-sparkles'></i> ${foundry.utils.escapeHTML(actor.name)}</strong> ${arm ? "infuses" : "uses the infusion of"}
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
