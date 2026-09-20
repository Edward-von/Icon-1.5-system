/**
 * defenses.mjs — Defensive automation: Evasion, Dodge, Cover / Resistance.
 *
 * Rules (ICON 1.5):
 *  • Evasion (p.146): "Roll a d6 when targeted by an attack. On a 4+, the
 *    attack automatically misses. Check before the attack roll." Only the
 *    attack component is evaded; effects that don't need a hit go through
 *    (p.113 "Evasion and Dodge"). True Strike ignores it (p.117).
 *    Rigoletto relic (p.248): I — evasion triggers on a 3+; II — when you or
 *    an ally in range 2 evades, deal 2 damage to the attacker; III — you
 *    also roll evasion for allies in range 2, but only on a 6; Aspect
 *    (Gambit) — this turn your evasion is always successful.
 *  • Dodge (p.144): "Immune to all damage from missed attacks, successful
 *    saves, and area effects."
 *  • Cover (p.92): "Abilities deal half damage to characters in cover …
 *    Cover is always determined when and where damage is applied."
 *    Resistance halves the same way (only once, together with Cover).
 *  • NPC traits: "Slippery: Has Evasion while bloodied", "Nimble: Has evasion
 *    unless suffering from a status", "Sneak: While in stealth, has evasion
 *    and dodge" — the condition is evaluated from the actor's state when it
 *    is one the system can read (bloodied, stealth, flying, no status);
 *    otherwise the trait is only a reminder chip.
 *
 * Where it plugs in:
 *  • rollEvasion()       — combatRoll (rolls.mjs): one d6 per targeted token
 *                          with Evasion, before the d20; evaded targets are
 *                          listed on the attack card and dimmed in "Inflict".
 *  • damageMitigation()  — the "Apply" button of the damage card (icon.mjs):
 *                          Dodge → no damage on Miss / Area / successful-save
 *                          cards; Cover or Resistance → ½ (unless the roll
 *                          was already halved).
 *  • defenseProfile()    — the chips shown on the attack / damage dialogs and
 *                          on the damage card's target rows.
 *  • mapCoverHint()      — "Cover?" chip when the token stands next to a wall
 *                          (a hint only: cover also depends on the attacker's
 *                          side, so it is never applied automatically).
 */
import { unlockedRelics } from "./relic-reminders.mjs";

const _log = (...a) => console.debug("[ICON | Defenses]", ...a);

export const EVASION_THRESHOLD = 4;
export const EVASION_RELIC = "rigoletto";     // relic name in the pack (the book's "spinning top" token)

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* Local status check — same logic as statuses.mjs#hasStatus, kept here so this
 * module has no import cycle with rolls.mjs. */
function _has(actor, id) {
  if (!actor) return false;
  return actor.statuses?.has(id)
    ?? actor.effects?.some(e => e.statuses?.has(id) || e.getFlag?.("core", "statusId") === id)
    ?? false;
}

const NEGATIVE_STATUSES = ["slashed", "blind", "dazed", "hatred", "pacified", "sealed", "shattered", "stunned", "weakened", "vulnerable", "immobile"];

function _isBloodied(actor) {
  if (_has(actor, "bloodied")) return true;
  const hp = actor?.system?.combat?.hp ?? actor?.system?.hp;
  if (!hp || hp.value == null || !hp.max) return false;
  const threshold = hp.bloodied ?? Math.ceil(hp.max / 2);
  return hp.value <= threshold;
}

/* -------------------------------------------------- */
/*  Rigoletto (the evasion relic)                       */
/* -------------------------------------------------- */

/** Unlocked rank of the Rigoletto relic on a PC (0 = none). */
export function rigolettoRank(actor) {
  return unlockedRelics(actor).find(r => r.key === EVASION_RELIC)?.rank ?? 0;
}

/** Evasion succeeds on this die value or more (4, or 3 with Rigoletto I+). */
export function evasionThreshold(actor) {
  return rigolettoRank(actor) >= 1 ? 3 : EVASION_THRESHOLD;
}

/**
 * Rigoletto Aspect gambit: "This turn only, your evasion is always
 * successful." Set by the Invoke Gambit button (IconSheet) as an actor flag
 * { combatId, round }; true while that round lasts.
 */
export function hasSureEvasion(actor) {
  const f = actor?.getFlag?.("icon-system", "sureEvasion");
  if (!f) return false;
  const combat = game.combat;
  if (!combat) return false;
  return f.combatId === combat.id && Number(f.round) === Number(combat.round);
}

/* -------------------------------------------------- */
/*  Profile                                            */
/* -------------------------------------------------- */

const TRAIT_RE = /\b(evasion|dodge|cover|resistance)\b/i;
/** "Has evasion while bloodied", "has evasion and dodge unless suffering from a status", "While in stealth, has evasion and dodge". */
const COND_RE  = /\b(?:has|have|gains?|with)\s+(evasion|dodge)(?:\s+(?:and|or)\s+(evasion|dodge))?\b[^.;]*?\b(while|unless|if|when)\b\s+([^.;]+)/i;
const COND_PREFIX_RE = /\b(while|unless|if|when)\s+([^,.;]+),\s*(?:it\s+|they\s+|the\s+\w+\s+)?(?:has|have|gains?)\s+(evasion|dodge)(?:\s+(?:and|or)\s+(evasion|dodge))?\b/i;

/**
 * Evaluate a trait condition against the actor's state.
 * @returns {boolean|null}  null = the system can't tell (reminder only)
 */
function _evalCondition(word, cond, actor) {
  const c = cond.toLowerCase();
  let value = null;
  if (/\bbloodied\b/.test(c))                                     value = _isBloodied(actor);
  else if (/\bstealth/.test(c))                                   value = _has(actor, "stealth");
  else if (/\bfly(?:ing)?\b/.test(c))                             value = _has(actor, "flying");
  else if (/\bsuffering from (?:a |any )?(?:negative )?status/.test(c) || /\bhas (?:a |any )?status/.test(c)) value = NEGATIVE_STATUSES.some(id => _has(actor, id));
  else if (/\bnot bloodied\b/.test(c))                            value = !_isBloodied(actor);
  if (value === null) return null;
  return word === "unless" ? !value : value;
}

/**
 * Everything the attacker's dialogs and the damage card need to know about a
 * defender: active defensive statuses (including the ones granted by an NPC
 * trait whose condition currently holds) plus trait reminders the system
 * can't evaluate.
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
    evasionVia: "",       // trait name when Evasion comes from a trait condition
    dodgeVia:   "",
    sureEvasion: false,
    rigoletto:  0,
    traitNotes: [],
  };
  if (!actor) return p;

  // NPC traits (foe / legend): evaluate conditional evasion / dodge, keep the
  // rest as reminders.
  const traits = actor.system?.traits;
  if (Array.isArray(traits)) {
    for (const t of traits) {
      const name = String(t?.name ?? "").trim();
      const desc = _plain(t?.description ?? "");
      const text = `${name}: ${desc}`;
      if (!TRAIT_RE.test(text)) continue;
      const m = COND_RE.exec(text) ?? null;
      const pm = m ? null : COND_PREFIX_RE.exec(text);
      let granted = [], word = "", cond = "";
      if (m)       { granted = [m[1], m[2]].filter(Boolean).map(s => s.toLowerCase()); word = m[3].toLowerCase(); cond = m[4]; }
      else if (pm) { granted = [pm[3], pm[4]].filter(Boolean).map(s => s.toLowerCase()); word = pm[1].toLowerCase(); cond = pm[2]; }
      // Unconditional "Dodge: Immune to damage from missed attacks…" / "Traits: Dodge" style trait.
      if (!granted.length && /^(evasion|dodge)$/i.test(name)) { granted = [name.toLowerCase()]; word = ""; cond = ""; }

      if (granted.length) {
        const ok = word ? _evalCondition(word, cond, actor) : true;
        if (ok === true) {
          for (const g of granted) { if (!p[g]) { p[g] = true; p[`${g}Via`] = name; } }
          continue;
        }
        if (ok === false) continue;   // condition known and not met: nothing to show
      }
      const key = TRAIT_RE.exec(text)[1].toLowerCase();
      if (p[key]) continue;
      p.traitNotes.push({ key, name, text: _shorten(desc, 90) });
    }
  }

  p.rigoletto = rigolettoRank(actor);
  if (p.evasion) {
    p.evasionThreshold = evasionThreshold(actor);
    p.sureEvasion = hasSureEvasion(actor);
  }
  return p;
}

function _plain(html) {
  return String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function _shorten(s, n) { return s.length > n ? `${s.slice(0, n - 1).trim()}…` : s; }

/* -------------------------------------------------- */
/*  Map cover hint                                     */
/* -------------------------------------------------- */

/**
 * Is the token standing next to a wall segment? A character "can take cover
 * by moving adjacent to an object or terrain space that is 1 or more high"
 * (p.92); walls on the map are the closest thing the system can read. This
 * is only a hint — cover depends on where the attack comes from.
 * @param {Token|TokenDocument|null} token
 * @returns {boolean}
 */
export function mapCoverHint(token) {
  try {
    const doc = token?.document ?? token;
    if (!doc || !canvas?.ready || !canvas.walls?.placeables?.length) return false;
    const grid = canvas.grid?.size ?? 100;
    const w = (doc.width ?? 1) * grid, h = (doc.height ?? 1) * grid;
    const cx = doc.x + w / 2, cy = doc.y + h / 2;
    // Adjacent square's far edge: half the token + one grid space (+ a little slack).
    const reach = Math.max(w, h) / 2 + grid + 2;
    for (const wall of canvas.walls.placeables) {
      const d = wall.document;
      if (!d) continue;
      if (d.door && d.ds === 1) continue;                      // open door
      const [x1, y1, x2, y2] = d.c ?? [];
      if (x1 == null) continue;
      if (_segmentDistance(cx, cy, x1, y1, x2, y2) <= reach) return true;
    }
  } catch (err) { console.warn("[ICON | Defenses] mapCoverHint failed", err); }
  return false;
}

function _segmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx, qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

/** Token of an actor on the current scene (controlled first, then any). */
export function tokenOf(actor, tokenId = null) {
  if (tokenId) { const t = canvas?.tokens?.get(tokenId); if (t) return t; }
  return actor?.getActiveTokens?.(false, false)?.[0] ?? null;
}

/** Grid distance (Chebyshev, in spaces) between two tokens, from their edges. */
export function gridDistance(a, b) {
  const da = a?.document ?? a, db = b?.document ?? b;
  if (!da || !db) return Infinity;
  const grid = canvas?.grid?.size ?? 100;
  const ax1 = da.x / grid, ay1 = da.y / grid, ax2 = ax1 + (da.width ?? 1) - 1, ay2 = ay1 + (da.height ?? 1) - 1;
  const bx1 = db.x / grid, by1 = db.y / grid, bx2 = bx1 + (db.width ?? 1) - 1, by2 = by1 + (db.height ?? 1) - 1;
  const dx = Math.max(0, bx1 - ax2, ax1 - bx2), dy = Math.max(0, by1 - ay2, ay1 - by2);
  return Math.round(Math.max(dx, dy));
}

/* -------------------------------------------------- */
/*  Chips                                              */
/* -------------------------------------------------- */

/**
 * Chips for a defender: "Evasion 4+", "Dodge", "Cover ½", "Resistance ½",
 * "Stealth", "Cover? wall". `outcome` (damage cards) turns the Dodge chip into
 * "Dodge — immune" on Miss / Area / successful-save cards. Returns "" when
 * there is nothing to show.
 */
export function defenseChipsHtml(actor, { outcome = null, halvedOnRoll = false, compact = false, tokenId = null, attacker = null } = {}) {
  const p = defenseProfile(actor);
  const chips = [];
  if (p.evasion) {
    const via = p.evasionVia ? ` (${p.evasionVia})` : "";
    const label = p.sureEvasion ? "Evasion — sure" : `Evasion ${p.evasionThreshold}+${via}`;
    chips.push(_chip("evasion", label, `Evasion: a d6 is rolled when this character is targeted by an attack; ${p.evasionThreshold}+ = the attack misses them (p.146)${p.evasionThreshold === 3 ? " — Rigoletto I" : ""}${p.sureEvasion ? " — Rigoletto Aspect: always successful this turn" : ""}${p.evasionVia ? ` — from the trait ${p.evasionVia}` : ""}.`, p.sureEvasion));
  }
  if (p.dodge) {
    const on = outcome === "miss" || outcome === "area" || outcome === "save-success";
    chips.push(_chip("dodge", on ? "Dodge — immune" : `Dodge${p.dodgeVia ? ` (${p.dodgeVia})` : ""}`, `Dodge: immune to all damage from missed attacks, successful saves and area effects (p.144)${p.dodgeVia ? ` — from the trait ${p.dodgeVia}` : ""}.`, on));
  }
  if (p.cover)      chips.push(_chip("cover", halvedOnRoll ? "Cover (already ½)" : "Cover ½", "Cover: half damage (p.92). Applied automatically when the damage is applied.", !halvedOnRoll));
  if (p.resistance) chips.push(_chip("resistance", halvedOnRoll ? "Resistance (already ½)" : "Resistance ½", "Resistance: half damage. Applied automatically when the damage is applied (once, together with Cover).", !halvedOnRoll));
  const wall = attacker ? aetherwallAgainst(actor, attacker, { targetTokenId: tokenId }) : { active: false };
  if (wall.active) chips.push(_chip("resistance", halvedOnRoll ? `Aetherwall (already ½)` : `Aetherwall ½`, `Aetherwall (Artillery, p.298): resistance against abilities from characters outside range 2 — the attacker is ${wall.distance} spaces away, so the damage is halved when it is applied.`, !halvedOnRoll));
  if (!p.cover && mapCoverHint(tokenOf(actor, tokenId))) chips.push(_chip("cover-hint", "Cover? wall", "This token stands next to a wall: it may be in cover from attacks coming from the other side (p.92). Set the Cover status if it applies — nothing is halved automatically."));
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

/**
 * Normalise an ability / action tag to its key: "True Strike", "true strike",
 * {raw:"true-strike"} and {label:"True Strike"} all become "true-strike".
 */
export function tagKey(t) {
  const raw = typeof t === "string" ? t : (t?.raw ?? t?.label ?? "");
  return String(raw).trim().toLowerCase().replace(/[\s_]+/g, "-");
}

/**
 * Why the attacker ignores Evasion ("" when they don't): the True Strike /
 * Unerring status on the attacker, or the same tag on the attack itself
 * (p.117 — "true strike" is a tag attacks can carry: Demon Cutter, the
 * Warrior's Cleave, the Trooper's Brutal Strike…).
 */
export function ignoresEvasion(attacker, tags = []) {
  const keys = (Array.isArray(tags) ? tags : []).map(tagKey);
  if (keys.includes("true-strike") || keys.includes("truestrike")) return "True Strike (tag)";
  if (keys.includes("unerring")) return "Unerring (tag)";
  if (_has(attacker, "true-strike")) return "True Strike";
  if (_has(attacker, "unerring"))    return "Unerring";
  return "";
}

/**
 * Rigoletto III: a PC with Evasion and the relic at rank III also rolls
 * evasion for allies in range 2 (on a 6). Find such a holder near a token.
 * `allTokens` lets tests inject the scene's tokens.
 */
function _rigolettoGuardian(target, allTokens = null) {
  const tok = tokenOf(target.actor, target.tokenId);
  if (!tok) return null;
  const tokens = allTokens ?? canvas?.tokens?.placeables ?? [];
  for (const other of tokens) {
    const a = other?.actor;
    if (!a || a === target.actor || a.type !== "icon") continue;
    if (rigolettoRank(a) < 3 || !defenseProfile(a).evasion) continue;
    if ((other.document?.disposition ?? other.disposition) !== (tok.document?.disposition ?? tok.disposition)) continue;
    if (gridDistance(tok, other) <= 2) return { actor: a, token: other };
  }
  return null;
}

/** Rigoletto II holders (rank ≥ 2 with the relic) within range 2 of a token, the token's actor included. */
function _rigolettoStrikers(target, allTokens = null) {
  const out = [];
  if (rigolettoRank(target.actor) >= 2) out.push(target.actor);
  const tok = tokenOf(target.actor, target.tokenId);
  if (!tok) return out;
  const tokens = allTokens ?? canvas?.tokens?.placeables ?? [];
  for (const other of tokens) {
    const a = other?.actor;
    if (!a || a === target.actor || a.type !== "icon" || rigolettoRank(a) < 2) continue;
    if ((other.document?.disposition ?? other.disposition) !== (tok.document?.disposition ?? tok.disposition)) continue;
    if (gridDistance(tok, other) <= 2) out.push(a);
  }
  return out;
}

/**
 * Roll Evasion for every target that has it (one d6 each, before the d20).
 *
 * @param {object} opts
 * @param {Actor}  opts.attacker
 * @param {Array}  [opts.targets]   currentTargets() (default: capture now)
 * @param {Array}  [opts.sceneTokens]  tokens to scan for Rigoletto holders (default: the canvas)
 * @param {Array}  [opts.tags]      tags of the attack ("true strike" / "unerring" ignore Evasion)
 * @returns {Promise<{results:Array, rolls:Roll[], allEvaded:boolean, anyEvaded:boolean, ignored:string, evadedUuids:Set<string>}>}
 */
export async function rollEvasion({ attacker, targets = null, sceneTokens = null, tags = [] } = {}) {
  const list = targets ?? currentTargets();
  const out  = { results: [], rolls: [], allEvaded: false, anyEvaded: false, ignored: "", evadedUuids: new Set() };

  // Who rolls: targets with Evasion (own status or trait), plus targets an
  // allied Rigoletto III holder in range 2 covers (needs a 6).
  const evaders = [];
  for (const t of list) {
    const p = defenseProfile(t.actor);
    if (p.evasion) { evaders.push({ ...t, threshold: p.evasionThreshold, sure: p.sureEvasion, via: p.evasionVia, guardian: null }); continue; }
    const g = _rigolettoGuardian(t, sceneTokens);
    if (g) evaders.push({ ...t, threshold: 6, sure: false, via: `Rigoletto III of ${g.actor.name}`, guardian: g.actor });
  }
  if (!evaders.length) return out;

  out.ignored = ignoresEvasion(attacker, tags);
  if (out.ignored) {
    out.results = evaders.map(t => ({ ...t, die: null, evaded: false, notes: [] }));
    return out;
  }

  const rolled = evaders.filter(e => !e.sure);
  let dice = [];
  if (rolled.length) {
    const roll = await new Roll(`${rolled.length}d6`).evaluate();
    out.rolls.push(roll);
    dice = roll.dice[0].results.map(d => d.result);
  }
  let di = 0;
  out.results = evaders.map(t => {
    const die = t.sure ? null : dice[di++];
    const evaded = t.sure || die >= t.threshold;
    const notes = [];
    if (evaded) {
      out.evadedUuids.add(t.actorUuid);
      const strikers = _rigolettoStrikers(t, sceneTokens);
      for (const s of strikers) notes.push(`Rigoletto II (${s.name}): deal 2 damage to ${attacker?.name ?? "the attacker"}`);
    }
    return { ...t, die, evaded, notes };
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
    const via = r.via ? ` <small>(${esc(r.via)})</small>` : "";
    const notes = r.notes?.length ? `<div class="icon-chat-evasion__notes">${r.notes.map(n => `<span>✦ ${esc(n)}</span>`).join("")}</div>` : "";
    const die = r.sure ? `<span class="icon-chat-die icon-chat-die--evasion icon-chat-die--sure" title="Rigoletto Aspect: always successful this turn">✦</span>` : `<span class="icon-chat-die icon-chat-die--evasion">${r.die}</span>`;
    return `<div class="icon-chat-evasion__row ${r.evaded ? "icon-chat-evasion__row--evaded" : "icon-chat-evasion__row--failed"}">
      <span class="icon-chat-evasion__name">${esc(r.name)}${via}</span>
      ${die}
      <span class="icon-chat-evasion__text">${r.sure ? "evaded (Rigoletto Aspect) — the attack misses them" : r.evaded ? `evaded (${r.threshold}+) — the attack misses them` : `no effect (needed ${r.threshold}+)`}</span>
      ${notes}
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
 * @param {string}  [opts.outcome]       "hit" | "crit" | "miss" | "area" | "save-fail" | "save-success" (from the card)
 * @param {boolean} [opts.halvedOnRoll]  the attacker already ticked Resistance / Cover on the roll
 * @returns {{ immune:boolean, immuneReason:string, half:boolean, halfReason:string }}
 */
export function hasAetherwall(actor) {
  if (!actor) return false;
  // The Artillery class baseline trait, written onto the foe as data
  // (apply-class-baseline.mjs), or the class itself for a foe that never got it.
  const traits = actor.system?.traits;
  if (Array.isArray(traits) && traits.some(t => /^aetherwall$/i.test(String(t?.name ?? "").trim()))) return true;
  return String(actor.system?.foeClass ?? "").toLowerCase() === "artillery";
}

/**
 * Aetherwall (p.298, Artillery): "Gains resistance against all abilities from
 * characters that are outside of range 2 from them." Needs both tokens on the
 * scene; with no token for either side we can't measure, so it stays off
 * rather than guessing.
 * @returns {{ active: boolean, distance: number|null }}
 */
export function aetherwallAgainst(target, attacker, { attackerTokenId = null, targetTokenId = null } = {}) {
  if (!hasAetherwall(target)) return { active: false, distance: null };
  const ta = tokenOf(attacker, attackerTokenId);
  const tt = tokenOf(target, targetTokenId);
  if (!ta || !tt) return { active: false, distance: null };
  const d = gridDistance(ta, tt);
  return { active: Number.isFinite(d) && d > 2, distance: Number.isFinite(d) ? d : null };
}

export function damageMitigation(actor, { outcome = "hit", halvedOnRoll = false, trueStrike = false, unerring = false, attacker = null, attackerTokenId = null, targetTokenId = null } = {}) {
  const out = { immune: false, immuneReason: "", half: false, halfReason: "" };
  if (!actor) return out;
  const p = defenseProfile(actor);
  // Damage types the attack was rolled with (p.104): True Strike "ignores
  // dodge, blind, evasion, and stealth", Unerring "ignores cover and
  // aetherwall". Evasion and stealth are settled on the attack roll; what
  // reaches the damage card is the Dodge cancellation and the Cover halving.
  if (p.dodge && trueStrike) p.dodge = false;
  if (p.cover && unerring)   p.cover = false;
  if (p.dodge && (outcome === "miss" || outcome === "area" || outcome === "save-success")) {
    out.immune = true;
    const via = p.dodgeVia ? ` (${p.dodgeVia})` : "";
    out.immuneReason = outcome === "miss" ? `Dodge${via} — immune to damage from missed attacks`
                     : outcome === "area" ? `Dodge${via} — immune to damage from area effects`
                     : `Dodge${via} — immune to damage from successful saves`;
    return out;
  }
  if (halvedOnRoll) return out;   // halve only once (Resistance / Cover, p.92)
  // Aetherwall: a resistance that only exists against attacks from beyond
  // range 2, so it is measured here rather than read from a status — and
  // Unerring ignores it, as it ignores cover (p.104).
  const wall = unerring ? { active: false } : aetherwallAgainst(actor, attacker, { attackerTokenId, targetTokenId });
  if (p.cover || p.resistance || wall.active) {
    out.half = true;
    const why = [p.cover ? "Cover" : "", p.resistance ? "Resistance" : "", wall.active ? `Aetherwall (range ${wall.distance})` : ""].filter(Boolean);
    out.halfReason = why.length > 1 ? `${why.join(" + ")} (½ once)` : why[0];
  }
  return out;
}
