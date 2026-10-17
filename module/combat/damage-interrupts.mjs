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
import { addCardMods, cardModsFor } from "./damage-card-mods.mjs";
import { marksBy, removeMark } from "./marks.mjs";

const _log = (...a) => console.debug("[ICON | DamageInterrupts]", ...a);
const FLAG_NS = "icon-system";

/* -------------------------------------------------- */
/*  Which interrupts a damage card triggers            */
/* -------------------------------------------------- */

/**
 * Interrupts that do more than post themselves, by lower-case name.
 *   scope   "self" | "ally" | "either" — overrides damageTriggerScope()
 *   onUse   async ({ owner, it, item, target, message }) after the use is spent
 *           and the card posted: what the interrupt changes on the damage card
 *           (addCardMods, damage-card-mods.mjs). Nothing here runs on its own:
 *           only from the interrupt's button.
 */
export const INTERRUPT_SPECS = {
  /* Righteous Disdain (Demon Slayer, p.128): "Apply the damage to both you and
   * your ally, but both of you gain resistance to it, and are sturdy against
   * its effects." Mastery SHIRAHADORI (p.129): "The damage from Righteous
   * Disdain cannot reduce you past 1 hp." */
  "righteous disdain": {
    scope: "ally",
    async onUse({ owner, item, target, message }) {
      if (!target || target.uuid === owner.uuid) return;
      const onCard = (message?.flags?.[FLAG_NS]?.damage?.targets ?? []).includes(owner.uuid);
      const tokenId = owner.token?.id ?? owner.getActiveTokens?.()[0]?.id ?? "";
      const self = { actorUuid: owner.uuid, source: "Righteous Disdain", half: true, sturdy: true };
      if (!onCard) self.row = { name: owner.name, img: owner.img ?? "", tokenId };
      const mods = [{ actorUuid: target.uuid, source: "Righteous Disdain", half: true, sturdy: true }, self];
      if (item?.system?.masteryUnlocked) mods.push({ actorUuid: owner.uuid, source: "Shirahadori", minHp: 1 });
      await addCardMods(message, mods);
    },
  },

  /* Dire Parry (Riposte's stance, Knave p.142): "A foe targets an ally in
   * range 2 with an ability" — a targeting trigger, which the damage card
   * comes after; it is offered there anyway, on the ally's row, because with
   * Strong Left (p.143) its uses are banked (up to 3) and the card is where the
   * table sees the foe's ability land. */
  "dire parry": { scope: "ally" },

  /* Wish (Seer, p.203): "That damage cannot reduce your ally past 1 hp, and
   * they are cured after it resolves." The cure and the Seer's sacrifice of
   * 25% max HP stay on the posted card, for the table. */
  "wish": {
    scope: "ally",
    async onUse({ target, message }) {
      if (target) await addCardMods(message, [{ actorUuid: target.uuid, source: "Wish", minHp: 1 }]);
    },
  },

  /* Grace of the Spirits (Spirit Shrine's mastery SPIRIT PATRONAGE, p.193):
   * "Your ally becomes immune to all damage from the triggering ability." */
  "grace of the spirits": {
    scope: "ally",
    async onUse({ target, message }) {
      if (target) await addCardMods(message, [{ actorUuid: target.uuid, source: "Grace of the Spirits", immune: true }]);
    },
  },

  /* Heartfire (Blazing Bond, p.210): "You or your ally takes damage […]
   * Effect: You can choose to reduce that damage by 3 (as if by armor) […] If
   * you do, the other partner sacrifices 3." Only for the marked partner. */
  "heartfire": {
    scope: "either",
    async onUse({ target, message }) {
      if (target) await addCardMods(message, [{ actorUuid: target.uuid, source: "Heartfire", reduce: 3 }]);
    },
  },
};

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
 *   { key, name, limit, cost, trigger, kind: "ability" | "granted" | "mastery" | "refresh" | "npc",
 *     itemId?, label?, index?, effect?, partners?, bankMax?, bankOnTurn?, refreshes? }
 * PCs: abilities whose cost is "Interrupt N" (the talent / mastery count, as on
 * the sheet's badge), interrupts granted inside an ability's text ("Cheat
 * Time — Interrupt 1"; a stance's interrupt only while in the stance, a mark's
 * only while the mark is on someone) or by its unlocked mastery (Grace of the
 * Spirits), and a stance's damage-triggered Refresh (Riposte), which gives
 * its interrupt back.
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
    const mastery = s.masteryUnlocked ? plainText(s.mastery) : "";
    // An interrupt the unlocked mastery grants: "SPIRIT PATRONAGE: Grace of the
    // Spirits — Interrupt 1: Trigger: … Effect: …" (Spirit Shrine, p.193).
    const mi = /([A-Z][A-Za-z' ]{0,40}?)\s*[—–]\s*Interrupt (\d+)[.:]?\s*Trigger:\s*(.+?)\s*Effect:\s*(.+)$/.exec(mastery);
    if (mi) {
      out.push({ key: `${item.id}-m`, itemId: item.id, kind: "mastery", name: mi[1].trim(), limit: Number(mi[2]),
                 cost: `Interrupt ${mi[2]}`, trigger: mi[3], effect: mi[4] });
    }
    const isStance = tags.some(t => tagKey(t) === "stance");
    if (isStance && !stances.includes(item.name)) continue;
    // "Mark: … While marked and in range, gain the following interrupt"
    // (Blazing Bond's Heartfire): only with a mark of this ability on the
    // scene, and "your ally" is the marked partner.
    const byMark = desc.sections.some(sec => sec.label === "Mark");
    const partners = byMark ? marksBy(actor.id, item.id).map(m => m.targetActor?.uuid).filter(Boolean) : null;
    if (partners && !partners.length) continue;
    // Blazing Bond's mastery GREAT SOUL BOND (p.210): "If one of the partners
    // would take damage from an ability that would reduce them below 1 hp, the
    // other can reduce themselves to 1 hp to grant that ally immunity to all
    // damage from the triggering ability. The bond then snaps, ending this
    // mark." Not an interrupt (no uses): offered on the damage card while the
    // mark is on, to whichever partner is not the one hit.
    if (partners && /reduce themselves to 1 hp to grant that ally immunity/i.test(mastery)) {
      out.push({ key: `${item.id}-sb`, itemId: item.id, kind: "soulbond",
                 name: /^([A-Z][A-Z' ]+):/.exec(mastery)?.[1].toLowerCase().replace(/(^|\s)\p{L}/gu, c => c.toUpperCase()) ?? "Soul Bond",
                 limit: 1, cost: "Mastery", trigger: mastery, partners });
    }
    const granted = [];
    desc.sections.forEach((sec, n) => {
      const head = interruptBlockName(sec.label);
      if (!head) return;
      const it = grantedInterrupt(s, sec.label);
      if (!it) return;
      const trig = it.lines.find(l => l.label === "Trigger")?.text ?? "";
      // Riposte's STRONG LEFT (p.143): "Uses of Dire Parry can stack up to 3
      // times, and you can bank these uses" — a store of uses that the turn
      // start does not empty.
      const bank = new RegExp(`uses of ${escapeRegExp(it.name)} can stack up to (\\d+) times`, "i").exec(mastery);
      // "HEARTFIRE" → "Heartfire", as the sheet titles a capitalised name (R61).
      const name = /[a-z]/.test(it.name) ? it.name : it.name.toLowerCase().replace(/(^|[\s'’-])\p{L}/gu, c => c.toUpperCase());
      const entry = { key: `${item.id}-g${n}`, itemId: item.id, label: sec.label, kind: "granted", name,
                      limit: Number(/\d+/.exec(it.cost)?.[0] ?? 1), cost: it.cost, trigger: trig,
                      ...(partners ? { partners } : {}), ...(bank ? { bankMax: Number(bank[1]) } : {}),
                      ...(bank && new RegExp(`refresh ${escapeRegExp(item.name)} at the start of your turn`, "i").test(mastery) ? { bankOnTurn: true } : {}) };
      granted.push(entry);
      out.push(entry);
    });
    // A stance refreshed by damage ("Refresh: Refresh this stance when a foe
    // damages you or an adjacent ally with an ability", Riposte p.142) gives
    // its interrupt back: one more button, which spends nothing.
    const refresh = desc.sections.find(sec => sec.label === "Refresh");
    if (isStance && granted.length && refresh && damageTriggerScope(refresh.text)) {
      out.push({ key: `${item.id}-r`, itemId: item.id, kind: "refresh", name: item.name, limit: 1, cost: "Refresh",
                 trigger: refresh.text, refreshes: granted.map(g => g.key) });
    }
  }
  return out;
}

function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** Uses spent this round (foes: the same flag the sheet's tick boxes write). */
export function interruptUsesOf(actor, key) {
  return Number(actor?.getFlag(FLAG_NS, `interruptUses.${key}`) ?? 0) || 0;
}

/** A banked interrupt's stored uses (1 until the store is first touched: entering the stance gives one). */
function bankOf(actor, key) {
  const v = actor?.getFlag(FLAG_NS, `interruptBank.${key}`);
  return v == null ? 1 : Math.max(0, Number(v) || 0);
}

/** Uses left and the most there can be: {left, max}. A refresh is always available. */
export function interruptLeft(actor, it) {
  if (it.kind === "refresh" || it.kind === "soulbond") return { left: 1, max: 1 };
  if (it.bankMax) return { left: bankOf(actor, it.key), max: it.bankMax };
  return { left: Math.max(0, it.limit - interruptUsesOf(actor, it.key)), max: it.limit };
}

/** Spend one use (also the PC sheet's interrupt chat button, R61). */
export async function spendUse(actor, it) {
  if (it.bankMax) return actor.setFlag(FLAG_NS, `interruptBank.${it.key}`, Math.max(0, bankOf(actor, it.key) - 1));
  return actor.setFlag(FLAG_NS, `interruptUses.${it.key}`, interruptUsesOf(actor, it.key) + 1);
}

/**
 * Set the uses left by hand (the PC sheet's tick boxes): a banked interrupt
 * stores that many, an ordinary one records limit − left as spent.
 */
export async function setInterruptLeft(actor, it, left) {
  if (it.kind === "refresh") return;
  if (it.bankMax) {
    return actor.setFlag(FLAG_NS, `interruptBank.${it.key}`, Math.min(it.bankMax, Math.max(0, left)));
  }
  const used = Math.min(it.limit, Math.max(0, it.limit - left));
  if (used > 0) return actor.setFlag(FLAG_NS, `interruptUses.${it.key}`, used);
  if (actor.getFlag(FLAG_NS, `interruptUses.${it.key}`) != null) return actor.unsetFlag(FLAG_NS, `interruptUses.${it.key}`);
}

/** Give a stance's interrupts back (a refresh): a banked one stores one more, up to its cap. */
async function refreshUses(actor, keys) {
  const all = interruptsOf(actor);
  for (const key of keys) {
    const it = all.find(i => i.key === key);
    if (!it) continue;
    if (it.bankMax) await actor.setFlag(FLAG_NS, `interruptBank.${key}`, Math.min(it.bankMax, bankOf(actor, key) + 1));
    else if (actor.getFlag(FLAG_NS, `interruptUses.${key}`) != null) await actor.unsetFlag(FLAG_NS, `interruptUses.${key}`);
  }
}

/**
 * Start of a PC's turn (IconCombat.mjs): a banked interrupt whose mastery
 * refreshes its stance "at the start of your turn" (Strong Left) stores one
 * more use. Ordinary uses are reset there by clearing the interruptUses flag.
 * @param {Actor} actor
 */
export async function bankInterruptsAtTurnStart(actor) {
  _cache.delete(actor?.uuid);
  for (const it of interruptsOf(actor)) {
    if (!it.bankMax || !it.bankOnTurn) continue;
    const next = Math.min(it.bankMax, bankOf(actor, it.key) + 1);
    _log(`bankAtTurnStart — "${actor.name}" | ${it.name} → ${next}/${it.bankMax}`);
    await actor.setFlag(FLAG_NS, `interruptBank.${it.key}`, next);
  }
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
  // Great Soul Bond: the bond's holder and its marked partner; the one not hit presses.
  for (const o of owners) {
    for (const it of interruptsOf(o.actor)) {
      if (it.kind !== "soulbond") continue;
      let presser = null;
      if (o.self) presser = it.partners.map(u => { try { return fromUuidSync(u); } catch { return null; } }).find(a => userPlays(a)) ?? null;
      else if (it.partners.includes(target.uuid) && userPlays(o.actor)) presser = o.actor;
      if (presser) out.push({ owner: o.actor, it, presser, left: 1, max: 1 });
    }
  }
  for (const o of owners) {
    if (!userPlays(o.actor)) continue;
    for (const it of interruptsOf(o.actor)) {
      if (it.kind === "soulbond") continue;
      const spec = interruptSpec(it.name);
      const scope = spec.scope ?? damageTriggerScope(it.trigger);
      if (!scope) continue;
      if (o.self ? scope === "ally" : scope === "self") continue;
      // A mark's interrupt: "your ally" is the marked partner only (Heartfire).
      if (it.partners && !o.self && !it.partners.includes(target.uuid)) continue;
      // "…by a foe's ability": a foe of the interrupt's owner, not a friend's area.
      if (/\bfoe/i.test(plainText(it.trigger)) && attackerSide && attackerSide === sideOf(o.actor, o.tokenId)) continue;
      out.push({ owner: o.actor, it, ...interruptLeft(o.actor, it) });
    }
  }
  return out;
}

/* -------------------------------------------------- */
/*  Card decoration                                     */
/* -------------------------------------------------- */

function buttonHtml({ owner, it, left, max, presser }, targetUuid) {
  if (it.kind === "soulbond") {
    const title = `${it.name} (${owner.name}'s Blazing Bond mastery) — ${presser.name}. ${plainText(it.trigger)}`
      + `\n${presser.name} drops to 1 HP, this character becomes immune to all damage from this ability, and the mark ends.`
      + ` Use it when the damage would reduce them below 1 HP: that is up to you.`;
    return `<button type="button" class="icon-chat-btn icon-chat-btn--interrupt" data-action="damageInterrupt"
              data-owner-uuid="${escapeHTML(owner.uuid)}" data-key="${escapeHTML(it.key)}" data-target-uuid="${escapeHTML(targetUuid)}"
              data-presser-uuid="${escapeHTML(presser.uuid)}" title="${escapeHTML(title)}">
              <i class="fa-solid fa-link-slash"></i> ${escapeHTML(it.name)}<small> · ${escapeHTML(presser.name)}</small></button>`;
  }
  if (it.kind === "refresh") {
    const title = `${it.name} — ${owner.name}. Refresh: ${plainText(it.trigger)}\nGives the stance's interrupt back`
      + ` (a banked one stores one more). Spends nothing.`;
    return `<button type="button" class="icon-chat-btn icon-chat-btn--interrupt" data-action="damageInterrupt"
              data-owner-uuid="${escapeHTML(owner.uuid)}" data-key="${escapeHTML(it.key)}" data-target-uuid="${escapeHTML(targetUuid)}"
              title="${escapeHTML(title)}"><i class="fa-solid fa-rotate"></i> Refresh ${escapeHTML(it.name)}<small> · ${escapeHTML(owner.name)}</small></button>`;
  }
  const stunned = hasStatus(owner, "stunned");
  const title = `${it.name} (${it.cost}${it.bankMax ? `, banks up to ${it.bankMax}` : ""}) — ${owner.name}. Trigger: ${plainText(it.trigger)}`
    + `\nSpends one use and posts the interrupt. Range and the one-interrupt-per-turn rule are up to you.`
    + (stunned ? "\nStunned: can't take interrupts." : "");
  return `<button type="button" class="icon-chat-btn icon-chat-btn--interrupt" data-action="damageInterrupt"
            data-owner-uuid="${escapeHTML(owner.uuid)}" data-key="${escapeHTML(it.key)}" data-target-uuid="${escapeHTML(targetUuid)}"
            title="${escapeHTML(title)}" ${left <= 0 || stunned ? "disabled" : ""}>
            <i class="fa-solid fa-bolt"></i> ${escapeHTML(it.name)}<small> · ${escapeHTML(owner.name)} ${left}/${max}${it.bankMax ? " banked" : ""}</small>
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
      // The owner's counts changed: rewrite every button of theirs on this card.
      html.querySelectorAll(`[data-action="damageInterrupt"][data-owner-uuid="${CSS.escape(btn.dataset.ownerUuid)}"]`)
        .forEach(b => _refreshButton(b));
    });
  });
}

/** Re-read one button's uses after a click (actor flags don't re-render a chat card). */
function _refreshButton(btn) {
  let owner = null;
  try { owner = fromUuidSync(btn.dataset.ownerUuid); } catch { owner = null; }
  const it = owner ? interruptsOf(owner).find(i => i.key === btn.dataset.key) : null;
  if (!it) { btn.disabled = true; return; }
  if (it.kind === "refresh") { btn.disabled = false; return; }
  if (it.kind === "soulbond") { btn.disabled = true; return; }   // the bond snapped
  const { left, max } = interruptLeft(owner, it);
  const small = btn.querySelector("small");
  if (small) small.textContent = ` · ${owner.name} ${left}/${max}${it.bankMax ? " banked" : ""}`;
  btn.disabled = left <= 0 || hasStatus(owner, "stunned");
}

/**
 * The "gain N vigor" button of a posted interrupt card (postInterruptCard):
 * only the character's owners can press it, once per card (the flag
 * `icon-system.vigorGiven` keeps it pressed after a reload).
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindInterruptVigorButtons(message, html) {
  html.querySelectorAll('[data-action="interruptGainVigor"]').forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    if (message?.getFlag?.(FLAG_NS, "vigorGiven")) { btn.disabled = true; btn.title = "Vigor already given from this card"; return; }
    let actor = null;
    try { actor = fromUuidSync(btn.dataset.actorUuid); } catch { actor = null; }
    if (!actor?.isOwner) { btn.disabled = true; return; }
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      btn.disabled = true;
      const amount = Number(btn.dataset.amount) || 0;
      const { addVigor } = await import("./damage.mjs");
      const before = actor.system?.combat?.vigor?.value ?? actor.system?.vigor?.value ?? 0;
      await addVigor(actor, amount);
      const after = actor.system?.combat?.vigor?.value ?? actor.system?.vigor?.value ?? 0;
      _log(`gainVigor — "${actor.name}" | +${amount} | ${before} → ${after} | card: ${message?.id}`);
      if (message?.isOwner) await message.setFlag(FLAG_NS, "vigorGiven", true);
      ui.notifications.info(`${actor.name}: vigor ${before} → ${after}.`);
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
export async function useDamageInterrupt(message, { ownerUuid, key, targetUuid, presserUuid } = {}) {
  const owner = await fromUuid(ownerUuid ?? "");
  if (!owner) return false;
  const it = interruptsOf(owner).find(i => i.key === key);
  if (!it) { ui.notifications.warn(`${owner.name} no longer has that interrupt.`); return false; }
  const target = targetUuid ? await fromUuid(targetUuid) : null;
  if (it.kind === "soulbond") return useSoulBond(message, owner, it, target, presserUuid ? await fromUuid(presserUuid) : null);
  if (it.kind === "refresh") {
    _log(`refresh — "${owner.name}" | ${it.name} | gives back: ${it.refreshes.join(", ")} | card: ${message?.id}`);
    await refreshUses(owner, it.refreshes);
    const back = interruptsOf(owner).filter(i => it.refreshes.includes(i.key))
      .map(i => { const { left, max } = interruptLeft(owner, i); return `${escapeHTML(i.name)} ${left}/${max}${i.bankMax ? " banked" : ""}`; });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: owner }),
      content: `<div class="icon-chat-card"><strong>${escapeHTML(owner.name)}</strong> refreshes <strong>${escapeHTML(it.name)}</strong>`
             + ` (${escapeHTML(plainText(it.trigger))})<br><small>${back.join(", ")}</small></div>`,
    });
    return true;
  }
  if (hasStatus(owner, "stunned")) { ui.notifications.warn(`${owner.name} is Stunned and can't take interrupts.`); return false; }
  const { left, max } = interruptLeft(owner, it);
  if (left <= 0) { ui.notifications.warn(`${it.name}: no uses left${it.bankMax ? " in the bank" : " this round"} (0/${max}).`); return false; }
  const spec = interruptSpec(it.name);
  if (spec.onUse && target && cardModsFor(message, target.uuid).sources.includes(it.name)) {
    ui.notifications.warn(`${it.name} has already changed this damage for ${target.name}.`);
    return false;
  }
  _log(`use — "${owner.name}" | ${it.name} (${it.kind}) | left ${left} → ${left - 1} / ${max}${it.bankMax ? " banked" : ""} | target: "${target?.name ?? "?"}" | card: ${message?.id}`);
  await spendUse(owner, it);
  await postInterruptCard(owner, it, { target, message, usesLeft: left - 1, max });
  if (spec.onUse) {
    try { await spec.onUse({ owner, it, item: it.itemId ? owner.items.get(it.itemId) : null, target, message }); }
    catch (err) { console.error(`ICON 1.5 | ${it.name}: changing the damage card failed`, err); }
  }
  return true;
}

/**
 * Great Soul Bond (Blazing Bond's mastery, p.210): the partner not hit drops
 * to 1 HP, the one hit becomes immune to this damage (the card's `immune`
 * change), and the bond's mark ends.
 */
async function useSoulBond(message, owner, it, target, presser) {
  if (!target || !presser) return false;
  if (cardModsFor(message, target.uuid).sources.includes(it.name)) {
    ui.notifications.warn(`${it.name} has already changed this damage for ${target.name}.`);
    return false;
  }
  const hpPath = presser.type === "icon" ? "system.combat.hp.value" : "system.hp.value";
  const hp = Number(foundry.utils.getProperty(presser, hpPath) ?? 0) || 0;
  _log(`soulBond — holder "${owner.name}" | "${presser.name}" hp ${hp} → ${Math.min(hp, 1)} | immune: "${target.name}" | card: ${message?.id}`);
  if (hp > 1) await presser.update({ [hpPath]: 1 });
  // The mark first: the card re-renders when its change is written, and should no longer offer the bond.
  for (const m of marksBy(owner.id, it.itemId)) await removeMark(m.uuid);
  _cache.delete(owner.uuid);
  await addCardMods(message, [{ actorUuid: target.uuid, source: it.name, immune: true }]);
  const src = message?.flags?.[FLAG_NS]?.damage ?? {};
  const what = [src.sourceName, src.abilityName].filter(Boolean).join("'s ");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: presser }),
    content: `<div class="icon-chat-card"><strong>${escapeHTML(it.name)}</strong> (Blazing Bond mastery): <strong>${escapeHTML(presser.name)}</strong>`
           + ` reduces themselves to 1 HP (${hp} → ${Math.min(hp, 1)}); <strong>${escapeHTML(target.name)}</strong> is immune to all damage`
           + `${what ? ` from ${escapeHTML(what)}` : " from the triggering ability"}. The bond snaps.</div>`,
  });
  return true;
}

/** The "Used on …" line under the posted interrupt. */
function usedOnHtml(it, { target, message, usesLeft, max = it.limit }) {
  const src = message?.flags?.[FLAG_NS]?.damage ?? {};
  const what = [src.sourceName, src.abilityName].filter(Boolean).join("'s ");
  return `<p class="icon-chat-card__interrupt-used"><small><i class="fa-solid fa-bolt"></i> On ${escapeHTML(target?.name ?? "the target")}'s damage`
       + `${what ? ` from ${escapeHTML(what)}` : ""} — ${usesLeft}/${max} use${max === 1 ? "" : "s"} left${it.bankMax ? " in the bank" : " this round"}.</small></p>`;
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
  } else if (it.kind === "mastery") {
    raw = [{ label: "Trigger", text: it.trigger }, { label: "Effect", text: it.effect, mastery: true }];
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
  // A block that gives the user vigor ("Heroic: Gain vigor 4 after this
  // ability resolves", Righteous Disdain p.128): a button for it, pressed by
  // the table when the block applies.
  const vigor = raw.map(l => {
    const m = /^\s*gain\s+(?:vigor\s+(\d+)|(\d+)\s+vigor)\b/i.exec(plainText(l.text));
    if (!m) return "";
    const amount = Number(m[1] ?? m[2]);
    return `<button type="button" class="icon-chat-btn" data-action="interruptGainVigor" data-actor-uuid="${escapeHTML(owner.uuid)}"
              data-amount="${amount}" title="${escapeHTML(`${l.label}: ${plainText(l.text)}\nGives ${owner.name} ${amount} vigor (up to their VIT).`)}">
              <i class="fa-solid fa-shield-heart"></i> ${escapeHTML(l.label)}: gain ${amount} vigor</button>`;
  }).join("");
  const pc = {
    name:    item.name,
    label:   it.cost,
    title:   it.kind === "granted" || it.kind === "mastery" ? it.name : "",
    jobName: s.jobName ?? "",
    class:   s.class ?? "",
    chapter: s.chapter ?? 1,
    lines,
    statusHtml: statusBlockHtml(parseInflictedStatuses(text, { sourceName: owner.name, label: it.name }),
                                { source: owner, abilityName: item.name }) + used
              + (vigor ? `<div class="icon-chat-card__interrupts">${vigor}</div>` : ""),
  };
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const content = await renderTemplate("systems/icon-system/templates/chat/ability-part-card.hbs", { pc });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: owner }), content });
}
