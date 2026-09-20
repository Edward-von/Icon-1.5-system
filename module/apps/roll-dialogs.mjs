/**
 * roll-dialogs.mjs — Attack roll and Damage roll dialogs.
 *
 * Same visual language as the sheets and the wizards ("Ink & Gold ×
 * Tactics"): a class-coloured band with the portrait, the ability name and
 * its tags, a target card fed by the user's current targets (DEF / ARM / HP),
 * the auto-applied modifiers as chips, steppers for boons & curses, outcome
 * as a segmented control, mitigation as toggle chips and a live preview line.
 *
 * Shared by PCs, foes and legends. Return shapes are unchanged from the old
 * prompts so the roll code (combatRoll / postAbilityDamageCard) is untouched:
 *   promptAttackMods → { boons, curses, defense }            | null
 *   promptDamageMods → { outcome, targetName, bonusDice, vulnerable,
 *                        resistance, weakened, hatred, useCombo } | null
 */
import { getActorStatusMods, getTagRollMods } from "../combat/status-modifiers.mjs";
import { hatredDamageHint } from "../combat/marks.mjs";
import { defenseChipsHtml, defenseProfile, ignoresEvasion } from "../combat/defenses.mjs";
import { escapeHTML as esc } from "../helpers/enrich.mjs";
import { IconActor } from "../actor/IconActor.mjs";

const _log = (...a) => console.debug("[ICON | roll-dialogs]", ...a);

/* -------------------------------------------------- */
/*  Shared pieces                                      */
/* -------------------------------------------------- */

/** CSS class that colours the band: PC → primary job class, NPC → npc red. */
function _bandClass(actor) {
  if (actor?.type === "icon") {
    const jobs = actor.system?.combat?.jobs ?? [];
    const primary = jobs.find(j => j.primary) ?? jobs[0];
    return `icon-class--${String(primary?.class ?? "stalwart").toLowerCase()}`;
  }
  return "icon-roll-hero--npc";
}

/** The user's current targets with the numbers the dialogs show. */
function _targets() {
  return Array.from(game.user?.targets ?? []).filter(t => t.actor).map(t => {
    const s = t.actor.system ?? {};
    return {
      id:      t.id,
      name:    t.name,
      actor:   t.actor,
      img:     t.actor.img ?? t.document?.texture?.src ?? "",
      defense: s.combat?.defense ?? s.defense ?? null,
      armor:   s.combat?.armor ?? s.armor ?? 0,
      hp:      s.combat?.hp?.value ?? s.hp?.value ?? null,
      hpMax:   s.combat?.hp?.max ?? s.hp?.max ?? null,
      // Defensive statuses / traits of the target (defenses.mjs)
      defense_: defenseProfile(t.actor),
      defChips: defenseChipsHtml(t.actor),
      // The stance the target is in, if any — it usually says what they are
      // about to do, and it was only visible on their own sheet until now.
      stance:  IconActor.stanceOf(t.actor),
    };
  });
}

/** Elevation difference vs targets → boons (higher) or curses (lower), p.89. */
function _elevationMods(actor, targets) {
  const readEl = (a, tok) => a?.getFlag?.("icon-system", "elevation") ?? tok?.document?.elevation ?? 0;
  const sourceToken = canvas?.tokens?.controlled?.find(t => t.actor?.id === actor?.id) ?? actor?.getActiveTokens?.(false, false)?.[0] ?? null;
  if (!targets.length) return { boons: 0, curses: 0, note: "" };
  const srcEl = readEl(actor, sourceToken);
  const diffs = targets.map(t => srcEl - readEl(canvas.tokens.get(t.id)?.actor, canvas.tokens.get(t.id)));
  const worst = Math.min(...diffs), best = Math.max(...diffs);
  if (worst < 0) return { boons: 0, curses: -worst, note: `Height disadvantage Δ${-worst}: +${-worst} curse${-worst > 1 ? "s" : ""}` };
  if (best > 0)  return { boons: best, curses: 0, note: `Height advantage Δ${best}: +${best} boon${best > 1 ? "s" : ""}` };
  return { boons: 0, curses: 0, note: "" };
}

/** Tags as chips (accepts raw strings or {raw,label} objects). */
function _tagChips(tags) {
  return (tags ?? []).map(t => {
    const label = t?.label ?? String(t ?? "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return label ? `<span class="icon-tag icon-tag--small">${esc(label)}</span>` : "";
  }).join("");
}

function _hero({ actor, kicker, title, cost, tags, dieLabel, dieSub }) {
  return `
    <header class="icon-roll-hero ${_bandClass(actor)}">
      <div class="icon-roll-hero__notch"><img src="${esc(actor?.img ?? "")}" alt=""></div>
      <div class="icon-roll-hero__identity">
        <span class="icon-roll-hero__kicker">${esc(kicker)}</span>
        <h2 class="icon-roll-hero__title">${esc(title)}</h2>
        <div class="icon-roll-hero__meta">
          ${cost ? `<span class="icon-badge">${esc(cost)}</span>` : ""}
          ${_tagChips(tags)}
        </div>
      </div>
      <div class="icon-roll-hero__die">
        <span class="icon-roll-hero__die-value">${esc(dieLabel)}</span>
        ${dieSub ? `<span class="icon-roll-hero__die-label">${esc(dieSub)}</span>` : ""}
      </div>
    </header>`;
}

/**
 * The target card. One row per targeted token, each with a ✕ that drops it
 * from the roll (and untargets it on the map).
 *
 * ICON area attacks hit ONE attack target and cover the others with the area
 * effect (p.117), so when several tokens are targeted the rows carry a radio:
 * the picked one gives the Defense to beat and is the only one that rolls
 * Evasion, the others are labelled "area".
 */
function _targetCard(targets, { showDefense = true, pickAttackTarget = false, areaLabel = "" } = {}) {
  if (!targets.length) {
    return `
      <section class="icon-roll-card icon-roll-card--targets icon-roll-card--empty">
        <h4 class="icon-roll-card__title">🎯 Target</h4>
        <p class="icon-roll-card__hint">No token targeted — hover a token and press <kbd>T</kbd> (Shift+T for several), or fill the numbers by hand below.</p>
      </section>`;
  }
  const pick = pickAttackTarget && targets.length > 1;
  const hint = pick
    ? `<small>${areaLabel ? `${esc(areaLabel)} — ` : ""}pick the attack target, the others only take the area effect</small>`
    : (targets.length > 1 && showDefense ? `<small>lowest DEF is used</small>` : "");
  return `
    <section class="icon-roll-card icon-roll-card--targets" data-pick="${pick ? "1" : ""}">
      <h4 class="icon-roll-card__title">🎯 Target${targets.length > 1 ? "s" : ""} ${hint}</h4>
      <ul class="icon-roll-targets">
        ${targets.map((t, i) => `
          <li class="icon-roll-target" data-token-id="${esc(t.id)}" data-name="${esc(t.name)}"
              data-defense="${t.defense ?? ""}"
              data-evasion="${t.defense_?.evasion ? (t.defense_.sureEvasion ? "sure" : String(t.defense_.evasionThreshold ?? 4)) : ""}">
            ${pick ? `<label class="icon-roll-target__pick" title="Attack target — the one you roll the d20 against">
                        <input type="radio" name="attackTarget" value="${esc(t.id)}"${i === 0 ? " checked" : ""}>
                      </label>` : ""}
            <img src="${esc(t.img)}" alt="">
            <span class="icon-roll-target__name">${esc(t.name)}</span>
            ${pick ? `<span class="icon-roll-target__role">area</span>` : ""}
            <span class="icon-roll-target__stats">
              ${showDefense && t.defense != null ? `<span title="Defense">DEF <b>${t.defense}</b></span>` : ""}
              <span title="Armor (subtracted when the damage is applied)">ARM <b>${t.armor ?? 0}</b></span>
              ${t.hp != null ? `<span title="Hit points">HP <b>${t.hp}</b>${t.hpMax != null ? `/${t.hpMax}` : ""}</span>` : ""}
              ${t.stance ? `<span class="icon-roll-target__stance" title="Stance the target is in (p.104: one at a time)">🧘 ${esc(t.stance)}</span>` : ""}
            </span>
            ${t.defChips ? `<span class="icon-roll-target__defs">${t.defChips}</span>` : ""}
            <button type="button" class="icon-btn icon-btn--remove icon-btn--inline icon-roll-target__drop"
                    data-drop="${esc(t.id)}" title="Drop this target from the roll (also untargets it on the map)">✕</button>
          </li>`).join("")}
      </ul>
    </section>`;
}

/**
 * Wire the ✕ buttons and the attack-target radios of a target card.
 * `onChange({ attackTargetId, rows })` runs after every change so the caller
 * can refresh the Defense field and the Evasion note.
 */
function _wireTargetCard(root, onChange) {
  const card = root.querySelector(".icon-roll-card--targets");
  if (!card) return;
  const rows = () => Array.from(card.querySelectorAll(".icon-roll-target"));
  const fire = () => {
    const list = rows();
    const picked = card.querySelector('input[name="attackTarget"]:checked')?.value ?? list[0]?.dataset.tokenId ?? "";
    list.forEach(r => r.classList.toggle("icon-roll-target--attack", r.dataset.tokenId === picked));
    onChange({ attackTargetId: picked, rows: list });
  };
  card.addEventListener("click", ev => {
    const drop = ev.target.closest("[data-drop]");
    if (!drop) return;
    ev.preventDefault();
    const row = drop.closest(".icon-roll-target");
    const wasPicked = row?.querySelector('input[name="attackTarget"]')?.checked;
    // Untarget on the map too, so the roll and the damage card agree with the dialog.
    const token = canvas?.tokens?.get(row?.dataset.tokenId);
    try { token?.setTarget(false, { releaseOthers: false }); }
    catch (err) { console.warn("[ICON | roll-dialogs] could not untarget", err); }
    row?.remove();
    const left = rows();
    if (wasPicked && left.length) {
      const radio = left[0].querySelector('input[name="attackTarget"]');
      if (radio) radio.checked = true;
    }
    if (!left.length) card.classList.add("icon-roll-card--empty");
    fire();
  });
  card.addEventListener("change", ev => { if (ev.target.name === "attackTarget") fire(); });
  fire();
}

function _stepper({ name, label, hint, value, min = 0, max = 9 }) {
  return `
    <div class="icon-roll-stepper">
      <label for="icon-roll-${name}">${label}${hint ? `<small>${hint}</small>` : ""}</label>
      <div class="icon-roll-stepper__ctl">
        <button type="button" class="icon-roll-stepper__btn" data-step="-1" data-for="${name}" aria-label="−1">−</button>
        <input type="number" id="icon-roll-${name}" name="${name}" value="${value}" min="${min}" max="${max}">
        <button type="button" class="icon-roll-stepper__btn" data-step="1" data-for="${name}" aria-label="+1">+</button>
      </div>
    </div>`;
}

/** Wire steppers + a live preview; runs once, on the dialog that owns `rootSel`. */
function _onDialogRender(rootSel, fn) {
  const id = Hooks.on("renderDialogV2", (app, html) => {
    const root = html.querySelector(rootSel);
    if (!root) return;
    Hooks.off("renderDialogV2", id);
    root.querySelectorAll(".icon-roll-stepper__btn").forEach(btn => btn.addEventListener("click", () => {
      const input = root.querySelector(`input[name="${btn.dataset.for}"]`);
      if (!input) return;
      const next = (Number(input.value) || 0) + Number(btn.dataset.step);
      input.value = Math.max(Number(input.min) || 0, Math.min(Number(input.max) || 99, next));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }));
    try { fn(root, app); } catch (err) { console.warn("[ICON | roll-dialogs] preview wiring failed", err); }
  });
}

const DIALOG_OPTS = { classes: ["icon-roll-window"], position: { width: 460 } };

/* -------------------------------------------------- */
/*  Attack roll                                        */
/* -------------------------------------------------- */

/**
 * Attack-roll dialog. `ab` needs { name, cost?, tags? }; `actor` is the
 * attacker. Boons/curses are pre-filled from the attacker's statuses and
 * the elevation difference; Defense from the lowest targeted token.
 * @returns {Promise<{boons:number, curses:number, defense:number|null}|null>}
 */
export async function promptAttackMods(ab, actor, { modsActor = null, area = null } = {}) {
  // `modsActor`: whose statuses give the automatic boons / curses (a summon uses its summoner's).
  // `area`: the area placed for this attack — with one on the table the extra
  // tokens are in the area, not attack targets, so the dialog asks which one
  // the d20 is rolled against (p.117).
  const auto    = getActorStatusMods(modsActor ?? actor);
  // Boons / curses the ability itself carries ("+1 boon" in its tag line, p.12):
  // Strafe Shot, Soul Shot, Apex, Diablo… and the NPC actions tagged boon-N.
  const fromTags = getTagRollMods(ab.tags ?? []);
  const targets = _targets();
  const elev    = _elevationMods(actor, targets);
  const pick    = !!area && targets.length > 1;
  // Attack target: the picked one with an area, otherwise the lowest DEF as before.
  const defenses = targets.map(t => t.defense).filter(d => d != null);
  const autoDefense = pick ? (targets[0]?.defense ?? "") : (defenses.length ? Math.min(...defenses) : "");
  const boons  = (auto.boons  ?? 0) + elev.boons  + fromTags.boons;
  const curses = (auto.curses ?? 0) + elev.curses + fromTags.curses;
  const notes  = [...fromTags.notes, ...(auto.notes ?? []), elev.note].filter(Boolean);

  // The attack's own "true strike" / "unerring" tag counts as much as the status (p.117).
  const ignoredEvasion = ignoresEvasion(actor, ab.tags ?? []);
  // Evasion (p.146): rolled automatically with the attack, one d6 per target
  // that has it — tell the attacker up front. Rebuilt in the browser when the
  // attack target changes, so the chip is a placeholder here.
  const evaders = (pick ? targets.slice(0, 1) : targets).filter(t => t.defense_?.evasion);
  const evasionNote = (list) => !list.length ? "" : (ignoredEvasion
    ? `${ignoredEvasion}: ignores Evasion (${list.map(t => t.name).join(", ")})`
    : `Evasion: ${list.map(t => t.defense_.sureEvasion
        ? `${t.name} evades automatically (Rigoletto Aspect, this turn)`
        : `${t.name} rolls 1d6 (${t.defense_.evasionThreshold}+ = miss)`).join(", ")} before the attack`);
  const evasionChip = `<span class="icon-roll-auto__chip" data-role="evasion" title="Applied automatically from the ability, the statuses and the elevation"${evaders.length ? "" : " hidden"}>⚙ ${esc(evasionNote(evaders))}</span>`;

  const content = `
    <div class="icon-roll-dialog icon-roll-dialog--attack">
      ${_hero({ actor, kicker: "Attack roll · d20 + boons − curses", title: ab.name ?? "Attack", cost: ab.cost, tags: ab.tags, dieLabel: "d20", dieSub: "crit 20+ · exceed 15+" })}
      <div class="icon-roll-body">
        ${_targetCard(targets, { pickAttackTarget: pick, areaLabel: area?.label ?? "" })}
        <section class="icon-roll-card">
          <h4 class="icon-roll-card__title">Modifiers</h4>
          <div class="icon-roll-auto"${notes.length || evaders.length ? "" : " hidden"}>${notes.map(n => `<span class="icon-roll-auto__chip" title="Applied automatically from the ability, the statuses and the elevation">⚙ ${esc(n)}</span>`).join("")}${evasionChip}</div>
          <p class="icon-roll-card__hint" data-role="no-mods"${notes.length || evaders.length ? " hidden" : ""}>No automatic modifiers (ability tags, statuses, height).</p>
          <div class="icon-roll-steppers">
            ${_stepper({ name: "boons",  label: "Boons",  hint: "+1d6 each, keep the highest, added to the d20", value: boons })}
            ${_stepper({ name: "curses", label: "Curses", hint: "+1d6 each, keep the highest, subtracted", value: curses })}
            <div class="icon-roll-stepper icon-roll-stepper--defense">
              <label for="icon-roll-defense">Target Defense<small>hit when d20 + mods ≥ DEF</small></label>
              <div class="icon-roll-stepper__ctl">
                <button type="button" class="icon-roll-stepper__btn" data-step="-1" data-for="defense" aria-label="−1">−</button>
                <input type="number" id="icon-roll-defense" name="defense" value="${autoDefense}" min="0" max="30" placeholder="—">
                <button type="button" class="icon-roll-stepper__btn" data-step="1" data-for="defense" aria-label="+1">+</button>
              </div>
            </div>
          </div>
          <div class="icon-roll-preview"><span class="icon-roll-preview__formula"></span><span class="icon-roll-preview__note"></span></div>
        </section>
      </div>
    </div>`;

  _onDialogRender(".icon-roll-dialog--attack", root => {
    const f = root.closest("form") ?? root;
    const b = f.querySelector('input[name="boons"]'), c = f.querySelector('input[name="curses"]'), d = f.querySelector('input[name="defense"]');
    const formula = root.querySelector(".icon-roll-preview__formula"), note = root.querySelector(".icon-roll-preview__note");
    const update = () => {
      const net = (Number(b.value) || 0) - (Number(c.value) || 0);
      const def = d.value === "" ? null : Number(d.value);
      let txt = "1d20";
      if (net > 0) txt += ` + best of ${net}d6`;
      if (net < 0) txt += ` − best of ${-net}d6`;
      if (def != null) txt += ` vs DEF ${def}`;
      formula.textContent = txt;
      note.textContent = def != null
        ? (net > 0 ? `Net +${net} boon${net > 1 ? "s" : ""}: you need ${def} or more after the bonus die.` : net < 0 ? `Net ${net} curse${net < -1 ? "s" : ""}: you need ${def} or more after the penalty die.` : `You need ${def} or more on the d20.`)
        : "No Defense: the card shows the total, compare it by hand.";
    };
    [b, c, d].forEach(el => el.addEventListener("input", update));

    // Dropping a target with ✕ or picking another attack target rewrites the
    // Defense to beat and the Evasion note: only the attack target rolls it.
    let defenseTouched = false;
    d.addEventListener("input", () => { defenseTouched = true; });
    const evasionChipEl = root.querySelector('[data-role="evasion"]');
    _wireTargetCard(root, ({ attackTargetId, rows }) => {
      const attackRow = rows.find(r => r.dataset.tokenId === attackTargetId);
      if (!defenseTouched) {
        const defs = (pick ? [attackRow] : rows).map(r => r?.dataset.defense).filter(v => v);
        d.value = defs.length ? Math.min(...defs.map(Number)) : "";
      }
      if (evasionChipEl) {
        const evading = (pick ? [attackRow] : rows).filter(r => r?.dataset.evasion);
        const list = evading.map(r => targets.find(t => t.id === r.dataset.tokenId)).filter(Boolean);
        const text = evasionNote(list);
        evasionChipEl.hidden = !text;
        evasionChipEl.textContent = text ? `⚙ ${text}` : "";
        // The chips box may have started empty (no statuses, no evader).
        const box = evasionChipEl.parentElement;
        const anyChip = !!text || !!box?.querySelector(".icon-roll-auto__chip:not([hidden]):not([data-role='evasion'])");
        if (box) box.hidden = !anyChip;
        const noMods = root.querySelector('[data-role="no-mods"]');
        if (noMods) noMods.hidden = anyChip;
      }
      update();
    });
    update();
  });

  try {
    return await foundry.applications.api.DialogV2.prompt({
      ...DIALOG_OPTS,
      window: { title: `Attack — ${ab.name ?? "Attack"}` },
      content,
      ok: {
        label: "⚔ Roll Attack",
        callback: (_e, button) => {
          const f = button.form;
          const defenseVal = f.elements.defense?.value;
          // Targets still listed when the dialog was confirmed (the ✕ removes
          // the row and untargets the token) and which of them takes the attack.
          const rows = Array.from(f.querySelectorAll(".icon-roll-target"));
          const attackTargetId = f.querySelector('input[name="attackTarget"]:checked')?.value
                              ?? rows[0]?.dataset.tokenId ?? "";
          return {
            boons:   Math.max(0, Number(f.elements.boons?.value)  || 0),
            curses:  Math.max(0, Number(f.elements.curses?.value) || 0),
            defense: defenseVal !== "" && defenseVal != null ? Number(defenseVal) : null,
            attackTargetId,
            targetIds: rows.map(r => r.dataset.tokenId),
          };
        },
      },
      rejectClose: false,
    });
  } catch (err) { _log("attack dialog closed", err); return null; }
}

/* -------------------------------------------------- */
/*  Damage roll                                        */
/* -------------------------------------------------- */

/**
 * Damage-roll dialog. `ab` needs { name, parsed, parsedCombo?, isAutoHit? };
 * `combat` needs { damagedie, fray }; `opts.actor` (the attacker) enables the
 * Hatred hint, `opts.comboDefault` pre-ticks the combo version.
 * @returns {Promise<object|null>}  see file header
 */
export async function promptDamageMods(ab, combat, { comboDefault = false, actor = null } = {}) {
  const p   = ab.parsed ?? { hit: {}, miss: {}, area: {} };
  const die = combat?.damagedie ?? "d6";
  const fray = Number(combat?.fray ?? 0);
  const targets = _targets();
  const hatred  = actor ? hatredDamageHint(actor) : { active: false };
  // Cover / Resistance are halved automatically when the target presses Apply
  // (p.92: "determined when and where damage is applied"); the checkbox below
  // is for targets without the status. Ticking it marks the roll as already
  // halved so Apply won't halve twice.
  const autoHalf = targets.filter(t => t.defense_?.cover || t.defense_?.resistance).map(t => t.name);
  const dodgers  = targets.filter(t => t.defense_?.dodge).map(t => t.name);

  // Finishing Blow (Vagabond): the block triggers when the ability targets a
  // bloodied foe — at or under 50% HP (p.104). When its text grants bonus
  // damage, that is one extra die kept at the highest (p.117), so the dialog
  // opens with the die already in and says where it came from.
  const bloodied = targets.filter(t => t.hp != null && t.hpMax > 0 && t.hp <= t.hpMax / 2);
  const fbBlock  = (ab.blocks ?? []).find(b => /finishing blow/i.test(String(b.label ?? "")));
  const fbText   = String(fbBlock?.text ?? "").replace(/<[^>]*>/g, " ");
  const fbBonus  = fbBlock && bloodied.length && /bonus damage/i.test(fbText) ? 1 : 0;
  const fbNote   = !fbBlock || !bloodied.length ? ""
    : `Finishing Blow: ${bloodied.map(t => t.name).join(", ")} ${bloodied.length > 1 ? "are" : "is"} bloodied${fbBonus ? " — +1 bonus die added" : " — the block triggers"}`;

  const chunkFormula = (c) => {
    const parts = [];
    if (c?.mult > 0) parts.push(`${c.mult}[${die}]`);
    if (c?.fray)     parts.push(`fray ${fray}`);
    if (c?.flat)     parts.push(`${c.flat} flat`);
    return parts.join(" + ");
  };
  const outcomes = [
    { value: "hit",  label: "Hit",  formula: chunkFormula(p.hit) || "no damage", show: true },
    { value: "crit", label: "Crit", formula: p.hit?.mult > 0 ? `${p.hit.mult + 1}[${die}]${p.hit.fray ? ` + fray ${fray}` : ""}` : "", show: p.hit?.mult > 0 },
    { value: "miss", label: "Miss", formula: chunkFormula(p.miss), show: !!(p.miss?.fray || p.miss?.flat > 0 || p.miss?.mult > 0) },
    { value: "area", label: "Area", formula: chunkFormula(p.area), show: !!(p.area?.mult > 0 || p.area?.flat > 0 || p.area?.fray) },
  ].filter(o => o.show);

  const pc = ab.parsedCombo;
  const comboFormula = pc?.dealsDamage ? (chunkFormula(pc.hit) || chunkFormula(pc.area) || "see card") : null;

  const content = `
    <div class="icon-roll-dialog icon-roll-dialog--damage">
      ${_hero({ actor, kicker: `Damage roll${ab.isAutoHit ? " · auto-hit" : ""}`, title: ab.name ?? "Damage", cost: ab.cost, tags: ab.tags, dieLabel: `[D] ${die}`, dieSub: `fray ${fray}` })}
      <div class="icon-roll-body">
        ${_targetCard(targets, { showDefense: false })}
        <section class="icon-roll-card">
          <h4 class="icon-roll-card__title">Outcome</h4>
          <div class="icon-roll-seg">
            ${outcomes.map((o, i) => `
              <label class="icon-roll-seg__opt">
                <input type="radio" name="outcome" value="${o.value}" ${i === 0 ? "checked" : ""}>
                <span class="icon-roll-seg__label">${o.label}<small>${esc(o.formula)}</small></span>
              </label>`).join("")}
          </div>
          ${comboFormula ? `
            <label class="icon-roll-chip icon-roll-chip--combo" title="Roll the combo version's damage instead of the base ability's.">
              <input type="checkbox" name="useCombo" ${comboDefault ? "checked" : ""}><span>⚡ Combo version <small>${esc(comboFormula)}</small></span>
            </label>` : ""}
        </section>
        <section class="icon-roll-card">
          <h4 class="icon-roll-card__title">Modifiers</h4>
          <div class="icon-roll-steppers">
            ${_stepper({ name: "bonusDice", label: "Bonus dice", hint: "extra [D] added to the pool, keep the highest N", value: fbBonus, max: 5 })}
            ${_stepper({ name: "flatBonus", label: "Flat damage", hint: "a fixed amount added after the dice (Harden, blessings, one-off effects)", value: 0, max: 30 })}
          </div>
          <div class="icon-roll-chips">
            <label class="icon-roll-chip"><input type="checkbox" name="vulnerable"><span>Vulnerable <small>+1</small></span></label>
            <label class="icon-roll-chip" title="${autoHalf.length ? `Applied automatically on Apply for ${esc(autoHalf.join(", "))} — tick only for a target WITHOUT the status` : "Half damage. Tick for a target in cover / with resistance that has no status set; otherwise it is applied automatically on Apply"}"><input type="checkbox" name="resistance"><span>Resistance / Cover <small>½${autoHalf.length ? " · auto on Apply" : ""}</small></span></label>
            <label class="icon-roll-chip"><input type="checkbox" name="weakened"><span>Weakened <small>−2</small></span></label>
            <label class="icon-roll-chip icon-roll-chip--type" title="Pierce (p.104): damage cannot be reduced by armor or weakened."><input type="checkbox" name="pierce"><span>Pierce <small>no armor</small></span></label>
            <label class="icon-roll-chip icon-roll-chip--type" title="Divine (p.104): damage cannot be reduced, mitigated or negated in any way except immunity — ignores armor, weakened, resistance and defiance, and bypasses vigor."><input type="checkbox" name="divine"><span>Divine <small>nothing reduces it</small></span></label>
            <label class="icon-roll-chip icon-roll-chip--type" title="True Strike (p.104): ignores dodge, blind, evasion and stealth. On the damage card it stops Dodge cancelling a Miss / Area result."><input type="checkbox" name="trueStrike"><span>True Strike <small>ignores Dodge</small></span></label>
            <label class="icon-roll-chip icon-roll-chip--type" title="Unerring (p.104): ignores cover and aetherwall. On Apply the target's Cover no longer halves the damage."><input type="checkbox" name="unerring"><span>Unerring <small>ignores Cover</small></span></label>
            ${hatred.active ? `<label class="icon-roll-chip icon-roll-chip--hatred" title="${esc(hatred.note)}"><input type="checkbox" name="hatred" ${hatred.halve ? "checked" : ""}><span>Hatred of ${esc(hatred.name)} <small>½ vs others</small></span></label>` : ""}
          </div>
          ${hatred.active || autoHalf.length || dodgers.length || fbNote ? `<div class="icon-roll-auto">
            ${fbNote ? `<span class="icon-roll-auto__chip" title="Finishing Blow (Vagabond): triggers when the attack targets a Bloodied foe — at or under 50% HP (p.104).">⚙ ${esc(fbNote)}</span>` : ""}
            ${hatred.active ? `<span class="icon-roll-auto__chip">⚠ ${esc(hatred.note)}</span>` : ""}
            ${autoHalf.length ? `<span class="icon-roll-auto__chip" title="Cover / Resistance: half damage, applied when the damage is applied (p.92)">⚙ ½ on Apply: ${esc(autoHalf.join(", "))} (Cover / Resistance)</span>` : ""}
            ${dodgers.length ? `<span class="icon-roll-auto__chip" data-dodge-note title="Dodge: immune to damage from missed attacks, successful saves and area effects (p.144)">⚙ Dodge: ${esc(dodgers.join(", "))} — no damage from Miss / Area</span>` : ""}
          </div>` : ""}
          <div class="icon-roll-preview"><span class="icon-roll-preview__formula"></span><span class="icon-roll-preview__note">Armor, Cover and Resistance are applied when the target presses Apply.</span></div>
        </section>
      </div>
    </div>`;

  _onDialogRender(".icon-roll-dialog--damage", root => {
    const f = root.closest("form") ?? root;
    const formula = root.querySelector(".icon-roll-preview__formula");
    const update = () => {
      const outcome = f.querySelector('input[name="outcome"]:checked')?.value ?? "hit";
      const useCombo = !!f.elements.useCombo?.checked && !!pc;
      const src = useCombo ? pc : p;
      const chunk = outcome === "miss" ? src.miss : outcome === "area" ? src.area : src.hit;
      let mult = chunk?.mult ?? 0; if (outcome === "crit") mult = Math.max(1, mult) + 1;
      const bonus = Number(f.elements.bonusDice?.value) || 0;
      const parts = [];
      if (mult > 0) parts.push(bonus > 0 ? `roll ${mult + bonus}${die}, keep ${mult}` : `${mult}[${die}]`);
      else if (bonus > 0) parts.push(`best of ${bonus}${die}`);
      if (chunk?.fray) parts.push(`fray ${fray}`);
      if (chunk?.flat) parts.push(`${chunk.flat}`);
      const flat = Number(f.elements.flatBonus?.value) || 0;
      if (flat > 0) parts.push(`${flat} flat`);
      let txt = parts.join(" + ") || "no damage";
      const tail = [];
      if (f.elements.vulnerable?.checked) tail.push("+1 vulnerable");
      if (f.elements.resistance?.checked) tail.push("½ resistance");
      if (f.elements.hatred?.checked)     tail.push("½ hatred");
      if (f.elements.weakened?.checked)   tail.push("−2 weakened");
      if (f.elements.divine?.checked)      tail.push("divine — nothing reduces it");
      else if (f.elements.pierce?.checked) tail.push("pierce — ignores armor");
      if (tail.length) txt += `  →  ${tail.join(", ")}`;
      formula.textContent = txt;
      // The Dodge reminder only matters for the outcomes Dodge cancels (Miss / Area).
      const dodgeNote = root.querySelector("[data-dodge-note]");
      if (dodgeNote) dodgeNote.hidden = !(outcome === "miss" || outcome === "area");
    };
    f.querySelectorAll('input').forEach(el => el.addEventListener("input", update));
    f.querySelectorAll('input').forEach(el => el.addEventListener("change", update));
    update();
  });

  try {
    return await foundry.applications.api.DialogV2.prompt({
      ...DIALOG_OPTS,
      window: { title: `Damage — ${ab.name ?? "Damage"}` },
      content,
      ok: {
        label: "💥 Roll Damage",
        callback: (_e, button) => {
          const f = button.form;
          return {
            outcome:    f.querySelector('input[name="outcome"]:checked')?.value ?? "hit",
            targetName: targets.map(t => t.name).join(", "),
            bonusDice:  Math.max(0, Number(f.elements.bonusDice?.value) || 0),
            vulnerable: !!f.elements.vulnerable?.checked,
            resistance: !!f.elements.resistance?.checked,
            weakened:   !!f.elements.weakened?.checked,
            hatred:     !!f.elements.hatred?.checked,
            useCombo:   !!f.elements.useCombo?.checked,
            flatBonus:  Math.max(0, Number(f.elements.flatBonus?.value) || 0),
            pierce:     !!f.elements.pierce?.checked,
            divine:     !!f.elements.divine?.checked,
            trueStrike: !!f.elements.trueStrike?.checked,
            unerring:   !!f.elements.unerring?.checked,
          };
        },
      },
      rejectClose: false,
    });
  } catch (err) { _log("damage dialog closed", err); return null; }
}
