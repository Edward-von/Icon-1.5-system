/**
 * module/combat/damage-interrupts.mjs — interrupts usable from a damage card (R35).
 *
 * An interrupt is "a reaction ability used when its trigger occurs, even on
 * another character's turn. Usable X times per round" (p.85 / Quick Guide).
 * Several triggers happen exactly when a damage card is on the table: "You are
 * damaged by a foe's ability" (Sturmreiten), "An ally on the battlefield takes
 * damage from a foe…" (Wish), "damage to your ally has been determined on the
 * foe's end but not applied yet" (Righteous Disdain), the foes' "The knight is
 * damaged by an ability".
 *
 * ONE place decides which interrupts fire on a damage card:
 *   - damageTriggerScope(trigger) reads the trigger text ("self" / "ally" /
 *     "either", or null when the trigger is not about damage);
 *   - INTERRUPT_SPECS (by interrupt name) overrides that reading and carries
 *     what the interrupt does to the card beyond posting itself (R35b / R35c).
 *
 * Under each target row of a damage card, the characters the current user
 * plays get one button per interrupt that damage triggers: theirs when they
 * are the one hit, an ally's when an ally is hit. Pressing it spends one use
 * (uses come back at the start of the character's turn; legends at the start
 * of the round, IconCombat.mjs) and posts the interrupt's Trigger and Effect.
 * Range, line of sight and the one-interrupt-per-turn rule stay with the table.
 */

import { parseAbilitySections, enrichHTML, escapeHTML, postNpcInterruptCard } from "../helpers/enrich.mjs";
import { interruptBlockName, grantedInterrupt } from "../helpers/ability-blocks.mjs";
import { resolveAbilityTags, resolveAbilityCost } from "../helpers/rule-tooltips.mjs";
import { plainText, parseInflictedStatuses, statusBlockHtml } from "./ability-statuses.mjs";
import { hasStatus } from "./statuses.mjs";
import { tagKey } from "./defenses.mjs";

const _log = (...a) => console.debug("[ICON | DamageInterrupts]", ...a);
const FLAG_NS = "icon-system";

/* -------------------------------------------------- */
/*  Which interrupts a damage card triggers            */
/* -------------------------------------------------- */

/**
 * Interrupts whose trigger text alone does not say enough, by lower-case name.
 *   scope   "self" | "ally" | "either" — overrides damageTriggerScope()
 * Further keys (what the interrupt changes on the card) come with R35b / R35c.
 */
export const INTERRUPT_SPECS = {};

/** "Damage" wording of a trigger: being damaged, taking damage, damage about to land. */
const DAMAGE_RE = /\b(?:is|are|gets?|being|was) damaged\b|\btakes? damage\b|\btook damage\b|\bdamages? (?:you|your|an?|the|one|any)\b|\bdamage to (?:you|your|an?|the)\b|\bdeals damage\b[^.]*\bto (?:you|your|an?|the)\b/;

/**
 * Who has to be hit for a trigger to fire.
 * @param {string} trigger  trigger text (plain or HTML)
 * @returns {"self"|"ally"|"either"|null}  null: not a damage trigger, or one
 *   about a marked / chosen character the card can't know about
 */
export function damageTriggerScope(trigger) {
  const t = plainText(trigger).toLowerCase();
  if (!t || !DAMAGE_RE.test(t)) return null;
  if (/\b(?:marked|chosen) character\b/.test(t)) return null;
  const ally = /\ball(?:y|ies)\b/.test(t);
  // "You are damaged", "Self or any ally", a foe's own name ("The knight is damaged", "The nixie or an ally…").
  const self = /\byou\b/.test(t) || /^self\b/.test(t) || /^the [a-z' ]+? (?:or|is|gets|just|takes)\b/.test(t);
  if (self && ally) return "either";
  return ally ? "ally" : "self";
}

/** The spec of an interrupt name ({} when it has none). */
export function interruptSpec(name) {
  return INTERRUPT_SPECS[String(name ?? "").trim().toLowerCase()] ?? {};
}

/* -------------------------------------------------- */
/*  An actor's interrupts                              */
/* -------------------------------------------------- */

/**
 * Every interrupt a character has, as one shape:
 *   { key, name, limit, cost, trigger, kind: "ability" | "granted" | "npc",
 *     itemId?, label?, index? }
 * PCs: abilities whose cost is "Interrupt N" (the talent / mastery count, as on
 * the sheet's badge) and interrupts granted inside an ability's text ("Cheat
 * Time — Interrupt 1"; a stance's interrupt only while in the stance).
 * Foes / legends: their Interrupts list.
 * @param {Actor} actor
 * @returns {Array<object>}
 */
export function interruptsOf(actor) {
  if (!actor) return [];
  // The chat log renders every damage card at once on load: read each
  // character's abilities once per burst, not once per card.
  if (!_cache.size) setTimeout(() => _cache.clear(), 0);
  if (!_cache.has(actor.uuid)) _cache.set(actor.uuid, _readInterrupts(actor));
  return _cache.get(actor.uuid);
}
const _cache = new Map();

function _readInterrupts(actor) {
  const out = [];
  if (actor.type === "foe" || actor.type === "legend") {
    (actor.system?.interrupts ?? []).forEach((r, i) => {
      if (!r?.name) return;
      out.push({ key: String(i), index: i, kind: "npc", name: r.name, limit: Math.max(1, Number(r.limit ?? 1) || 1),
                 cost: Number(r.limit) > 0 ? `Interrupt ${r.limit}` : "Interrupt", trigger: r.trigger ?? "" });
    });
    return out;
  }
  const stances = String(actor.system?.combat?.stance ?? "").split("|").map(s => s.trim()).filter(Boolean);
  for (const item of actor.items ?? []) {
    if (item.type !== "ability") continue;
    const s = item.system ?? {};
    const desc = parseAbilitySections(s.description);
    const tags = resolveAbilityTags(s);
    const cost = resolveAbilityCost(s, tags).key;
    const m = /^interrupt-(\d+)$/.exec(cost);
    if (m) {
      out.push({ key: item.id, itemId: item.id, kind: "ability", name: item.name, limit: Number(m[1]),
                 cost: `Interrupt ${m[1]}`, trigger: String(s.interruptTrigger ?? "").trim() || desc.trigger });
    }
    const isStance = tags.some(t => tagKey(t) === "stance");
    if (isStance && !stances.includes(item.name)) continue;
    desc.sections.forEach((sec, n) => {
      const head = interruptBlockName(sec.label);
      if (!head) return;
      const it = grantedInterrupt(s, sec.label);
      if (!it) return;
      const trig = it.lines.find(l => l.label === "Trigger")?.text ?? "";
      out.push({ key: `${item.id}-g${n}`, itemId: item.id, label: sec.label, kind: "granted", name: it.name,
                 limit: Number(/\d+/.exec(it.cost)?.[0] ?? 1), cost: it.cost, trigger: trig });
    });
  }
  return out;
}

/** Uses spent this round (foes: the same flag the sheet's tick boxes write). */
export function interruptUsesOf(actor, key) {
  return Number(actor?.getFlag(FLAG_NS, `interruptUses.${key}`) ?? 0) || 0;
}

/* -------------------------------------------------- */
/*  Sides and who may press                            */
/* -------------------------------------------------- */

/** "party" or "enemy": the token's disposition first, the actor type otherwise. */
function sideOf(actor, tokenId = null) {
  const tok = (tokenId && canvas?.tokens?.get(tokenId)?.document) || actor?.token || actor?.getActiveTokens?.()[0]?.document;
  const disp = tok?.disposition ?? actor?.prototypeToken?.disposition;
  if (disp === 1) return "party";
  if (disp === -1) return "enemy";
  return actor?.type === "foe" || actor?.type === "legend" ? "enemy" : "party";
}

/** The current user plays this character: a player their own, the GM the ones no player owns. */
function userPlays(actor) {
  if (!actor?.isOwner) return false;
  return !game.user.isGM || !actor.hasPlayerOwner;
}

/** Characters on the scene (one entry per actor; unlinked tokens are their own actor). */
function sceneCharacters() {
  const seen = new Map();
  for (const t of canvas?.tokens?.placeables ?? []) {
    const a = t.actor;
    if (!a || seen.has(a.uuid)) continue;
    if (!["icon", "summon", "foe", "legend"].includes(a.type)) continue;
    seen.set(a.uuid, { actor: a, tokenId: t.id });
  }
  return [...seen.values()];
}

/**
 * The interrupts one target row of a damage card offers to the current user.
 * @param {Actor} target
 * @param {object} ctx  { tokenId, attacker }
 * @returns {Array<{owner:Actor, it:object, uses:number}>}
 */
export function damageInterruptsFor(target, { tokenId = null, attacker = null } = {}) {
  if (!target) return [];
  const targetSide = sideOf(target, tokenId);
  const attackerSide = attacker ? sideOf(attacker) : null;
  const owners = [{ actor: target, tokenId, self: true }];
  for (const c of sceneCharacters()) {
    if (c.actor.uuid === target.uuid) continue;
    if (sideOf(c.actor, c.tokenId) !== targetSide) continue;
    owners.push({ ...c, self: false });
  }
  const out = [];
  for (const o of owners) {
    if (!userPlays(o.actor)) continue;
    for (const it of interruptsOf(o.actor)) {
      const spec = interruptSpec(it.name);
      const scope = spec.scope ?? damageTriggerScope(it.trigger);
      if (!scope) continue;
      if (o.self ? scope === "ally" : scope === "self") continue;
      // "…by a foe's ability": a foe of the interrupt's owner, not a friend's area.
      if (/\bfoe/i.test(plainText(it.trigger)) && attackerSide && attackerSide === sideOf(o.actor, o.tokenId)) continue;
      out.push({ owner: o.actor, it, uses: interruptUsesOf(o.actor, it.key) });
    }
  }
  return out;
}

/* -------------------------------------------------- */
/*  Card decoration                                     */
/* -------------------------------------------------- */

function buttonHtml({ owner, it, uses }, targetUuid) {
  const left = Math.max(0, it.limit - uses);
  const stunned = hasStatus(owner, "stunned");
  const title = `${it.name} (${it.cost}) — ${owner.name}. Trigger: ${plainText(it.trigger)}`
    + `\nSpends one use and posts the interrupt. Range and the one-interrupt-per-turn rule are up to you.`
    + (stunned ? "\nStunned: can't take interrupts." : "");
  return `<button type="button" class="icon-chat-btn icon-chat-btn--interrupt" data-action="damageInterrupt"
            data-owner-uuid="${escapeHTML(owner.uuid)}" data-key="${escapeHTML(it.key)}" data-target-uuid="${escapeHTML(targetUuid)}"
            title="${escapeHTML(title)}" ${left <= 0 || stunned ? "disabled" : ""}>
            <i class="fa-solid fa-bolt"></i> ${escapeHTML(it.name)}<small> · ${escapeHTML(owner.name)} ${left}/${it.limit}</small>
          </button>`;
}

/**
 * Add the interrupt buttons under each target row of a damage card. Called by
 * the renderChatMessageHTML hook (icon.mjs) on every render of the card.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function decorateDamageInterrupts(message, html) {
  const dmg = message?.flags?.[FLAG_NS]?.damage;
  if (!dmg) return;
  let attacker = null;
  try { attacker = dmg.sourceActorUuid ? fromUuidSync(dmg.sourceActorUuid) : null; } catch { attacker = null; }
  html.querySelectorAll(".icon-chat-card__target-row[data-actor-uuid]").forEach(row => {
    if (row.dataset.iconInterrupts) return;
    row.dataset.iconInterrupts = "true";
    let target = null;
    try { target = fromUuidSync(row.dataset.actorUuid); } catch { target = null; }
    const list = damageInterruptsFor(target, { tokenId: row.dataset.tokenId || null, attacker });
    if (!list.length) return;
    const box = document.createElement("div");
    box.className = "icon-chat-card__interrupts";
    box.innerHTML = `<span class="icon-chat-card__interrupts-label">Interrupt</span>` + list.map(e => buttonHtml(e, target.uuid)).join("");
    row.after(box);
  });
  html.querySelectorAll('[data-action="damageInterrupt"]').forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      btn.disabled = true;
      const ok = await useDamageInterrupt(message, btn.dataset);
      if (!ok) { btn.disabled = false; return; }
      const small = btn.querySelector("small");
      if (small) small.textContent = small.textContent.replace(/(\d+)\/(\d+)$/, (_, l, n) => `${Math.max(0, l - 1)}/${n}`);
      btn.disabled = /\b0\/\d+$/.test(small?.textContent ?? "");
    });
  });
}

/* -------------------------------------------------- */
/*  Pressing the button                                 */
/* -------------------------------------------------- */

/**
 * Spend one use of the interrupt and post it.
 * @param {ChatMessage} message  the damage card
 * @param {{ownerUuid:string, key:string, targetUuid:string}} data
 * @returns {Promise<boolean>} false when nothing was done
 */
export async function useDamageInterrupt(message, { ownerUuid, key, targetUuid } = {}) {
  const owner = await fromUuid(ownerUuid ?? "");
  if (!owner) return false;
  const it = interruptsOf(owner).find(i => i.key === key);
  if (!it) { ui.notifications.warn(`${owner.name} no longer has that interrupt.`); return false; }
  if (hasStatus(owner, "stunned")) { ui.notifications.warn(`${owner.name} is Stunned and can't take interrupts.`); return false; }
  const uses = interruptUsesOf(owner, it.key);
  if (uses >= it.limit) { ui.notifications.warn(`${it.name}: no uses left this round (${it.limit}/${it.limit}).`); return false; }
  const target = targetUuid ? await fromUuid(targetUuid) : null;
  _log(`use — "${owner.name}" | ${it.name} (${it.kind}) | uses ${uses} → ${uses + 1} / ${it.limit} | target: "${target?.name ?? "?"}" | card: ${message?.id}`);
  await owner.setFlag(FLAG_NS, `interruptUses.${it.key}`, uses + 1);
  await postInterruptCard(owner, it, { target, message, usesLeft: it.limit - uses - 1 });
  return true;
}

/** The "Used on …" line under the posted interrupt. */
function usedOnHtml(it, { target, message, usesLeft }) {
  const src = message?.flags?.[FLAG_NS]?.damage ?? {};
  const what = [src.sourceName, src.abilityName].filter(Boolean).join("'s ");
  return `<p class="icon-chat-card__interrupt-used"><small><i class="fa-solid fa-bolt"></i> On ${escapeHTML(target?.name ?? "the target")}'s damage`
       + `${what ? ` from ${escapeHTML(what)}` : ""} — ${usesLeft}/${it.limit} use${it.limit === 1 ? "" : "s"} left this round.</small></p>`;
}

/**
 * Post the interrupt: a foe's with the foe card, a PC ability's Trigger and
 * the rest of its blocks (selected talent, unlocked mastery), a granted one
 * with grantedInterrupt()'s lines (as the sheet's button, R61).
 */
export async function postInterruptCard(owner, it, ctx = {}) {
  const used = usedOnHtml(it, ctx);
  if (it.kind === "npc") {
    const r = owner.system?.interrupts?.[it.index] ?? {};
    const text = [r.trigger, r.effect, r.description].filter(Boolean).join(" ");
    const statusHtml = statusBlockHtml(parseInflictedStatuses(text, { sourceName: owner.name, label: r.name }),
                                       { source: owner, abilityName: r.name });
    await postNpcInterruptCard(owner, r, { statusHtml: statusHtml + used });
    return;
  }
  const item = owner.items.get(it.itemId);
  if (!item) return;
  const s = item.system ?? {};
  let raw;
  if (it.kind === "granted") {
    raw = grantedInterrupt(s, it.label)?.lines ?? [];
  } else {
    const desc = parseAbilitySections(s.description);
    raw = [{ label: "Trigger", text: it.trigger }, ...desc.sections.map(sec => ({ label: sec.label, text: sec.text }))];
    const fields = [["Heroic", s.heroicEffect], ["Charge", s.chargeEffect], ["Comeback", s.comebackEffect]];
    for (const [label, text] of fields) if (String(text ?? "").trim() && !raw.some(l => l.label === label)) raw.push({ label, text });
    const talent = { 1: ["Talent I", s.talent1], 2: ["Talent II", s.talent2] }[Number(s.talentSelected ?? 0)];
    if (talent && String(talent[1] ?? "").trim()) raw.push({ label: talent[0], text: String(talent[1]).trim() });
    if (s.masteryUnlocked && String(s.mastery ?? "").trim()) raw.push({ label: "Mastery", text: String(s.mastery).trim(), mastery: true });
  }
  raw = raw.filter(l => String(l.text ?? "").trim());
  const lines = await Promise.all(raw.map(async l => ({ label: l.label, mastery: !!l.mastery, text: await enrichHTML(l.text) })));
  const text = raw.map(l => l.text).join(" ");
  const pc = {
    name:    item.name,
    label:   it.cost,
    title:   it.kind === "granted" ? it.name : "",
    jobName: s.jobName ?? "",
    class:   s.class ?? "",
    chapter: s.chapter ?? 1,
    lines,
    statusHtml: statusBlockHtml(parseInflictedStatuses(text, { sourceName: owner.name, label: it.name }),
                                { source: owner, abilityName: item.name }) + used,
  };
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const content = await renderTemplate("systems/icon-system/templates/chat/ability-part-card.hbs", { pc });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: owner }), content });
}
