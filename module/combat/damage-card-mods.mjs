/**
 * module/combat/damage-card-mods.mjs — what an interrupt changes on a damage card (R35b / R35c).
 *
 * A damage card is rolled once; who takes what is settled when each target's
 * Apply button is pressed (icon.mjs). An interrupt used from the card
 * (damage-interrupts.mjs) can change that settlement for one character, and
 * the change has to be seen by everyone and survive a reload, so it is written
 * on the card itself, as the flag `icon-system.damage.mods`:
 *
 *   [{ actorUuid, source, half?, minHp?, reduce?, immune?, sturdy?, row? }]
 *     half    resistance against this damage (Righteous Disdain) — once, with Cover / Resistance
 *     minHp   the damage can't take the character below that HP (Shirahadori, Wish)
 *     reduce  taken off as if by armor (Heartfire)
 *     immune  no damage at all (Grace of the Spirits)
 *     sturdy  sturdy against the ability's effects (note only)
 *     row     {name, img, tokenId}: the character was not on the card and takes the damage too
 *             (Righteous Disdain: "Apply the damage to both you and your ally")
 *
 * Only the card's author or a GM may write a chat message: anyone else's
 * change goes to the active GM by socket (IconCombat.mjs → handleCardModSocket).
 */

import { escapeHTML } from "../helpers/enrich.mjs";

const _log = (...a) => console.debug("[ICON | DamageCardMods]", ...a);
const FLAG_NS = "icon-system";
const SOCKET  = "system.icon-system";

/** The changes written on a card. */
export function cardMods(message) {
  const live = message?.id ? (game.messages.get(message.id) ?? message) : message;
  const list = live?.flags?.[FLAG_NS]?.damage?.mods;
  return Array.isArray(list) ? list : [];
}

/**
 * Everything the card's changes do to one character's damage, merged.
 * @returns {{any:boolean, half:boolean, halfReason:string, minHp:number, reduce:number, reduceReason:string,
 *            immune:boolean, immuneReason:string, sturdy:boolean, sources:string[]}}
 */
export function cardModsFor(message, actorUuid) {
  const own = cardMods(message).filter(m => m.actorUuid === actorUuid);
  const pick = (k) => own.filter(m => m[k]);
  const names = (l) => [...new Set(l.map(m => m.source))].join(", ");
  return {
    any:          own.length > 0,
    half:         pick("half").length > 0,
    halfReason:   names(pick("half")),
    minHp:        Math.max(0, ...own.map(m => Number(m.minHp) || 0)),
    minHpReason:  names(pick("minHp")),
    reduce:       own.reduce((a, m) => a + (Number(m.reduce) || 0), 0),
    reduceReason: names(pick("reduce")),
    immune:       pick("immune").length > 0,
    immuneReason: names(pick("immune")),
    sturdy:       pick("sturdy").length > 0,
    sources:      [...new Set(own.map(m => m.source))],
  };
}

/**
 * Write changes on a card (or ask the GM to).
 * @param {ChatMessage} message
 * @param {Array<object>} mods  entries as in the header
 */
export async function addCardMods(message, mods) {
  if (!message || !mods?.length) return;
  if (message.isOwner) {
    const next = [...cardMods(message), ...mods];
    _log(`addCardMods — card ${message.id} | +${mods.length} | ${mods.map(m => `${m.source}→${m.actorUuid}`).join(", ")}`);
    await message.update({ [`flags.${FLAG_NS}.damage.mods`]: next });
    return;
  }
  if (!game.users.activeGM) {
    ui.notifications.warn("No GM is connected: the damage card can't be changed right now. Apply the damage by hand.");
    return;
  }
  game.socket.emit(SOCKET, { type: "damageCardMod", messageId: message.id, mods });
}

/** GM side of addCardMods for a player's change. */
export async function handleCardModSocket(data) {
  const message = game.messages.get(data?.messageId ?? "");
  if (!message?.flags?.[FLAG_NS]?.damage || !Array.isArray(data.mods)) return;
  const clean = data.mods.slice(0, 6).map(m => ({
    actorUuid: String(m.actorUuid ?? ""), source: String(m.source ?? "").slice(0, 60),
    ...(m.half ? { half: true } : {}), ...(m.immune ? { immune: true } : {}), ...(m.sturdy ? { sturdy: true } : {}),
    ...(Number(m.minHp) > 0 ? { minHp: Math.min(99, Math.floor(Number(m.minHp))) } : {}),
    ...(Number(m.reduce) > 0 ? { reduce: Math.min(99, Math.floor(Number(m.reduce))) } : {}),
    ...(m.row ? { row: { name: String(m.row.name ?? "").slice(0, 80), img: String(m.row.img ?? ""), tokenId: String(m.row.tokenId ?? "") } } : {}),
  })).filter(m => m.actorUuid);
  await addCardMods(message, clean);
}

/* -------------------------------------------------- */
/*  On the rendered card                                */
/* -------------------------------------------------- */

function chip(kind, label, title) {
  return `<span class="icon-def-chip icon-def-chip--${kind} icon-def-chip--on" title="${escapeHTML(title)}">${escapeHTML(label)}</span>`;
}

/** Chips telling what an interrupt changed for this character. */
function modChipsHtml(m, { divine = false, halvedOnRoll = false, pierce = false } = {}) {
  const out = [];
  if (m.immune) out.push(chip("dodge", `Immune (${m.immuneReason})`, `${m.immuneReason}: immune to all damage from this ability. Apply deals nothing.`));
  if (m.half) {
    const why = divine ? " — not against divine damage (p.104)" : halvedOnRoll ? " — already halved on the roll" : "";
    out.push(chip("resistance", `Resistance ½ (${m.halfReason})`, `${m.halfReason}: resistance to this damage. Halved once on Apply, together with Cover / Resistance${why}.`));
  }
  if (m.reduce > 0) out.push(chip("resistance", `−${m.reduce} (${m.reduceReason})`, `${m.reduceReason}: ${m.reduce} less damage, as if by armor.`
    + (divine ? " Not against divine damage (p.104)." : pierce ? " Not against pierce: it ignores armor (p.104)." : "")));
  if (m.minHp > 0) out.push(chip("resistance", `Not below ${m.minHp} HP (${m.minHpReason})`, `${m.minHpReason}: this damage can't reduce the character past ${m.minHp} HP.`));
  if (m.sturdy) out.push(chip("trait", "Sturdy vs. its effects", "Sturdy against this ability's effects: moved by it at most 1 space (glossary)."));
  return out.join("");
}

/**
 * Before the card's buttons are bound (icon.mjs): add the rows of characters
 * who now take the damage too, and the chips of every change. Each new row is
 * a copy of the first target row, so it carries the same amount, instances,
 * pierce and divine on its Apply buttons.
 */
export function injectCardMods(message, html) {
  const mods = cardMods(message);
  if (!mods.length) return;
  const dmg = message.flags?.[FLAG_NS]?.damage ?? {};
  const rows = [...html.querySelectorAll(".icon-chat-card__target-row[data-actor-uuid]")];
  const template = rows[0];
  if (!template) return;
  for (const m of mods) {
    if (!m.row || html.querySelector(`.icon-chat-card__target-row[data-actor-uuid="${CSS.escape(m.actorUuid)}"]`)) continue;
    const row = template.cloneNode(true);
    row.dataset.actorUuid = m.actorUuid;
    row.dataset.tokenId = m.row.tokenId ?? "";
    row.querySelectorAll(".icon-chat-card__target-def, .icon-chat-card__target-hp").forEach(e => e.remove());
    const name = row.querySelector(".icon-chat-card__target-name");
    if (name) name.innerHTML = `<strong>${escapeHTML(m.row.name ?? "")}</strong> <small>(${escapeHTML(m.source)})</small>`;
    const img = row.querySelector(".icon-chat-card__target-img");
    if (img && m.row.img) img.src = m.row.img; else img?.remove();
    row.querySelectorAll("button").forEach(b => {
      b.dataset.actorUuid = m.actorUuid;
      b.dataset.tokenId = m.row.tokenId ?? "";
      b.title = String(b.title ?? "").replace(/ to .*?(,|$)/, ` to ${m.row.name}$1`);
    });
    const after = html.querySelector(`.icon-chat-card__target-row[data-actor-uuid="${CSS.escape(mods.find(x => x.source === m.source && !x.row)?.actorUuid ?? "")}"]`)
               ?? rows[rows.length - 1];
    after.after(row);
  }
  html.querySelectorAll(".icon-chat-card__target-row[data-actor-uuid]").forEach(row => {
    const m = cardModsFor(message, row.dataset.actorUuid);
    if (!m.any) return;
    const holder = document.createElement("span");
    holder.className = "icon-chat-card__target-defs icon-chat-card__target-mods";
    holder.innerHTML = modChipsHtml(m, { divine: !!dmg.divine, halvedOnRoll: !!dmg.halvedOnRoll,
      pierce: !!html.querySelector('[data-action="applyDamage"][data-pierce="true"]') });
    const firstBtn = row.querySelector("button");
    firstBtn ? row.insertBefore(holder, firstBtn) : row.appendChild(holder);
  });
}
