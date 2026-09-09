/**
 * defenses.mjs — Defensive automation: Evasion, Dodge, Cover / Resistance.
 *
 * Rules (ICON 1.5):
 *  • Evasion (p.146): "Roll a d6 when targeted by an attack. On a 4+, the
 *    attack automatically misses. Check before the attack roll." Only the
 *    attack component is evaded; effects that don't need a hit go through
 *    (p.113 "Evasion and Dodge"). True Strike ignores it (p.117).
 *    Spinning Top I: evasion triggers on a 3+.
 *  • Dodge (p.144): "Immune to all damage from missed attacks, successful
 *    saves, and area effects."
 *  • Cover (p.92): "Abilities deal half damage to characters in cover …
 *    Cover is always determined when and where damage is applied."
 *    Resistance halves the same way (only once, together with Cover).
 *
 * Where it plugs in:
 *  • rollEvasion()       — combatRoll (rolls.mjs): one d6 per targeted token
 *                          with Evasion, before the d20; evaded targets are
 *                          listed on the attack card and dimmed in "Inflict".
 *  • damageMitigation()  — the "Apply" button of the damage card (icon.mjs):
 *                          Dodge → no damage on Miss / Area cards; Cover or
 *                          Resistance → ½ (unless the roll was already halved).
 *  • defenseProfile()    — the chips shown on the attack / damage dialogs and
 *                          on the damage card's target rows.
 */
import { unlockedRelics } from "./relic-reminders.mjs";

const _log = (...a) => console.debug("[ICON | Defenses]", ...a);

export const EVASION_THRESHOLD = 4;

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* Local status check — same logic as statuses.mjs#hasStatus, kept here so this
 * module has no import cycle with rolls.mjs. */
function _has(actor, id) {
  if (!actor) return false;
  return actor.statuses?.has(id)
    ?? actor.effects?.some(e => e.statuses?.has(id) || e.getFlag?.("core", "statusId") === id)
    ?? false;
}

/* -------------------------------------------------- */
/*  Profile                                            */
/* -------------------------------------------------- */

/** Evasion succeeds on this die value or more (4, or 3 with Spinning Top I+). */
export function evasionThreshold(actor) {
  const top = unlockedRelics(actor).find(r => r.key === "spinning top");
  return top && top.rank >= 1 ? 3 : EVASION_THRESHOLD;
}

const TRAIT_RE = /\b(evasion|dodge|cover|resistance)\b/i;

/**
 * Everything the attacker's dialogs and the damage card need to know about a
 * defender: active defensive statuses plus NPC traits that mention one of
 * them ("Slippery: Has Evasion while bloodied") so the GM is reminded to set
 * the status by hand when the condition is met.
 */
export function defenseProfile(actor) {
  const p = {
    evasion:    _has(actor, "evasion"),
    dodge:      _has(actor, "dodge"),
    cover:      _has(actor, "cover"),
    resistance: _has(actor, "resistance"),
    stealth:    _has(actor, "stealth"),
    intangible: _has(actor, "intangible"),
    evasionThreshold: EVASION_THRESHOLD,
    traitNotes: [],
  };
  if (!actor) return p;
  if (p.evasion) p.evasionThreshold = evasionThreshold(actor);

  // NPC traits (foe / legend) that talk about a defence not currently active.
  const traits = actor.system?.traits;
  if (Array.isArray(traits)) {
    for (const t of traits) {
      const text = `${t?.name ?? ""}: ${_plain(t?.description ?? "")}`;
      const m = TRAIT_RE.exec(text);
      if (!m) continue;
      const key = m[1].toLowerCase();
      if (p[key]) continue;                       // already set as a status
      p.traitNotes.push({ key, name: t.name ?? "", text: _shorten(_plain(t.description ?? ""), 90) });
    }
  }
  return p;
}

function _plain(html) {
  return String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function _shorten(s, n) { return s.length > n ? `${s.slice(0, n - 1).trim()}…` : s; }

/**
 * Chips for a defender: "Evasion 4+", "Dodge", "Cover ½", "Resistance ½",
 * "Stealth". `outcome` (damage cards) turns the Dodge chip into "Dodge —
 * immune" on Miss / Area cards. Returns "" when there is nothing to show.
 */
export function defenseChipsHtml(actor, { outcome = null, halvedOnRoll = false, compact = false } = {}) {
  const p = defenseProfile(actor);
  const chips = [];
  if (p.evasion)    chips.push(_chip("evasion", `Evasion ${p.evasionThreshold}+`, `Evasion: a d6 is rolled when this character is targeted by an attack; ${p.evasionThreshold}+ = the attack misses them (p.146)${p.evasionThreshold === 3 ? " — Spinning Top I" : ""}.`));
  if (p.dodge) {
    const on = outcome === "miss" || outcome === "area";
    chips.push(_chip("dodge", on ? "Dodge — immune" : "Dodge", "Dodge: immune to all damage from missed attacks, successful saves and area effects (p.144).", on));
  }
  if (p.cover)      chips.push(_chip("cover", halvedOnRoll ? "Cover (already ½)" : "Cover ½", "Cover: half damage (p.92). Applied automatically when the damage is applied.", !halvedOnRoll));
  if (p.resistance) chips.push(_chip("resistance", halvedOnRoll ? "Resistance (already ½)" : "Resistance ½", "Resistance: half damage. Applied automatically when the damage is applied (once, together with Cover).", !halvedOnRoll));
  if (p.stealth && !compact)    chips.push(_chip("stealth", "Stealth", "Stealth: cannot be targeted directly except from an adjacent space (p.146)."));
  if (p.intangible && !compact) chips.push(_chip("intangible", "Intangible", "Intangible: see the character's text — usually immune to damage."));
  if (!compact) for (const n of p.traitNotes) chips.push(_chip("trait", `⚠ ${n.name}`, `${n.name}: ${n.text} — set the ${n.key} status by hand when it applies.`));
  return chips.join("");
}

function _chip(kind, label, title, on = false) {
  return `<span class="icon-def-chip icon-def-chip--${kind}${on ? " icon-def-chip--on" : ""}" title="${esc(title)}">${esc(label)}</span>`;
}

/* -------------------------------------------------- */
/*  Evasion (attack roll)                              */
/* -------------------------------------------------- */

/** The user's current targets with their actors. */
export function currentTargets() {
  if (typeof game === "undefined") return [];
  return Array.from(game.user?.targets ?? []).filter(t => t.actor).map(t => ({
    tokenId: t.id, actorUuid: t.actor.uuid, name: t.name ?? t.actor.name, actor: t.actor,
  }));
}

/** Why the attacker ignores Evasion ("" when they don't). */
export function ignoresEvasion(attacker) {
  if (_has(attacker, "true-strike")) return "True Strike";
  if (_has(attacker, "unerring"))    return "Unerring";
  return "";
}

/**
 * Roll Evasion for every target that has it (one d6 each, before the d20).
 *
 * @param {object} opts
 * @param {Actor}  opts.attacker
 * @param {Array}  [opts.targets]   currentTargets() (default: capture now)
 * @returns {Promise<{results:Array, rolls:Roll[], allEvaded:boolean, anyEvaded:boolean, ignored:string, evadedUuids:Set<string>}>}
 */
export async function rollEvasion({ attacker, targets = null } = {}) {
  const list = targets ?? currentTargets();
  const out  = { results: [], rolls: [], allEvaded: false, anyEvaded: false, ignored: "", evadedUuids: new Set() };
  const evaders = list.filter(t => _has(t.actor, "evasion"));
  if (!evaders.length) return out;

  out.ignored = ignoresEvasion(attacker);
  if (out.ignored) {
    out.results = evaders.map(t => ({ ...t, die: null, threshold: evasionThreshold(t.actor), evaded: false }));
    return out;
  }

  const roll = await new Roll(`${evaders.length}d6`).evaluate();
  out.rolls.push(roll);
  const dice = roll.dice[0].results.map(d => d.result);
  out.results = evaders.map((t, i) => {
    const threshold = evasionThreshold(t.actor);
    const evaded = dice[i] >= threshold;
    if (evaded) out.evadedUuids.add(t.actorUuid);
    return { ...t, die: dice[i], threshold, evaded };
  });
  out.anyEvaded = out.results.some(r => r.evaded);
  // "All evaded" only counts when every target was an evader that succeeded.
  out.allEvaded = out.anyEvaded && list.length === evaders.length && out.results.every(r => r.evaded);
  _log(`evasion vs ${evaders.map(e => e.name).join(", ")}: [${dice.join(",")}] → ${out.allEvaded ? "all evaded" : out.anyEvaded ? "some evaded" : "none"}`);
  return out;
}

/** The "Evasion" block of the attack card. */
export function evasionBlockHtml(ev) {
  if (!ev?.results?.length) return "";
  const rows = ev.results.map(r => {
    if (ev.ignored) {
      return `<div class="icon-chat-evasion__row icon-chat-evasion__row--ignored"><span class="icon-chat-evasion__name">${esc(r.name)}</span><span class="icon-chat-evasion__text">Evasion ignored — attacker has ${esc(ev.ignored)} (p.117)</span></div>`;
    }
    return `<div class="icon-chat-evasion__row ${r.evaded ? "icon-chat-evasion__row--evaded" : "icon-chat-evasion__row--failed"}">
      <span class="icon-chat-evasion__name">${esc(r.name)}</span>
      <span class="icon-chat-die icon-chat-die--evasion">${r.die}</span>
      <span class="icon-chat-evasion__text">${r.evaded ? `evaded (${r.threshold}+) — the attack misses them` : `no effect (needed ${r.threshold}+)`}</span>
    </div>`;
  }).join("");
  return `<div class="icon-chat-evasion">
    <div class="icon-chat-evasion__header"><span>Evasion</span><span class="icon-chat-evasion__note">1d6 per target with Evasion, before the attack roll (p.146)</span></div>
    ${rows}
  </div>`;
}

/* -------------------------------------------------- */
/*  Dodge / Cover / Resistance (damage application)   */
/* -------------------------------------------------- */

/**
 * What happens to the damage of a card when it is applied to `actor`.
 *
 * @param {Actor}  actor
 * @param {object} opts
 * @param {string}  [opts.outcome]       "hit" | "crit" | "miss" | "area" (from the card)
 * @param {boolean} [opts.halvedOnRoll]  the attacker already ticked Resistance / Cover on the roll
 * @returns {{ immune:boolean, immuneReason:string, half:boolean, halfReason:string }}
 */
export function damageMitigation(actor, { outcome = "hit", halvedOnRoll = false } = {}) {
  const out = { immune: false, immuneReason: "", half: false, halfReason: "" };
  if (!actor) return out;
  if (_has(actor, "dodge") && (outcome === "miss" || outcome === "area")) {
    out.immune = true;
    out.immuneReason = outcome === "miss" ? "Dodge — immune to damage from missed attacks" : "Dodge — immune to damage from area effects";
    return out;
  }
  if (halvedOnRoll) return out;   // halve only once (Resistance / Cover, p.92)
  const cover = _has(actor, "cover"), resistance = _has(actor, "resistance");
  if (cover || resistance) {
    out.half = true;
    out.halfReason = cover && resistance ? "Cover + Resistance (½ once)" : cover ? "Cover" : "Resistance";
  }
  return out;
}
