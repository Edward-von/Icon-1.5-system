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
import { getActorStatusMods } from "../combat/status-modifiers.mjs";
import { hatredDamageHint } from "../combat/marks.mjs";
import { defenseChipsHtml, defenseProfile, ignoresEvasion } from "../combat/defenses.mjs";
import { escapeHTML as esc } from "../helpers/enrich.mjs";

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

function _targetCard(targets, { showDefense = true } = {}) {
  if (!targets.length) {
    return `
      <section class="icon-roll-card icon-roll-card--targets icon-roll-card--empty">
        <h4 class="icon-roll-card__title">🎯 Target</h4>
        <p class="icon-roll-card__hint">No token targeted — hover a token and press <kbd>T</kbd> (Shift+T for several), or fill the numbers by hand below.</p>
      </section>`;
  }
  return `
    <section class="icon-roll-card icon-roll-card--targets">
      <h4 class="icon-roll-card__title">🎯 Target${targets.length > 1 ? "s" : ""} <small>${targets.length > 1 && showDefense ? "lowest DEF is used" : ""}</small></h4>
      <ul class="icon-roll-targets">
        ${targets.map(t => `
          <li class="icon-roll-target">
            <img src="${esc(t.img)}" alt="">
            <span class="icon-roll-target__name">${esc(t.name)}</span>
            <span class="icon-roll-target__stats">
              ${showDefense && t.defense != null ? `<span title="Defense">DEF <b>${t.defense}</b></span>` : ""}
              <span title="Armor (subtracted when the damage is applied)">ARM <b>${t.armor ?? 0}</b></span>
              ${t.hp != null ? `<span title="Hit points">HP <b>${t.hp}</b>${t.hpMax != null ? `/${t.hpMax}` : ""}</span>` : ""}
            </span>
            ${t.defChips ? `<span class="icon-roll-target__defs">${t.defChips}</span>` : ""}
          </li>`).join("")}
      </ul>
    </section>`;
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
export async function promptAttackMods(ab, actor) {
  const auto    = getActorStatusMods(actor);
  const targets = _targets();
  const elev    = _elevationMods(actor, targets);
  const defenses = targets.map(t => t.defense).filter(d => d != null);
  const autoDefense = defenses.length ? Math.min(...defenses) : "";
  const boons  = (auto.boons  ?? 0) + elev.boons;
  const curses = (auto.curses ?? 0) + elev.curses;
  const notes  = [...(auto.notes ?? []), elev.note].filter(Boolean);

  // Evasion (p.146): rolled automatically with the attack, one d6 per target
  // that has it — tell the attacker up front.
  const evaders = targets.filter(t => t.defense_?.evasion);
  if (evaders.length) {
    const ignored = ignoresEvasion(actor);
    notes.push(ignored
      ? `${ignored}: ignores Evasion (${evaders.map(t => t.name).join(", ")})`
      : `Evasion: ${evaders.map(t => `${t.name} rolls 1d6 (${t.defense_.evasionThreshold}+ = miss)`).join(", ")} before the attack`);
  }

  const content = `
    <div class="icon-roll-dialog icon-roll-dialog--attack">
      ${_hero({ actor, kicker: "Attack roll · d20 + boons − curses", title: ab.name ?? "Attack", cost: ab.cost, tags: ab.tags, dieLabel: "d20", dieSub: "crit 20+ · exceed 15+" })}
      <div class="icon-roll-body">
        ${_targetCard(targets)}
        <section class="icon-roll-card">
          <h4 class="icon-roll-card__title">Modifiers</h4>
          ${notes.length ? `<div class="icon-roll-auto">${notes.map(n => `<span class="icon-roll-auto__chip" title="Applied automatically from statuses / elevation">⚙ ${esc(n)}</span>`).join("")}</div>` : `<p class="icon-roll-card__hint">No automatic modifiers (statuses, height).</p>`}
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
          return {
            boons:   Math.max(0, Number(f.elements.boons?.value)  || 0),
            curses:  Math.max(0, Number(f.elements.curses?.value) || 0),
            defense: defenseVal !== "" && defenseVal != null ? Number(defenseVal) : null,
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
            ${_stepper({ name: "bonusDice", label: "Bonus dice", hint: "extra [D] added to the pool, keep the highest N", value: 0, max: 5 })}
          </div>
          <div class="icon-roll-chips">
            <label class="icon-roll-chip"><input type="checkbox" name="vulnerable"><span>Vulnerable <small>+1</small></span></label>
            <label class="icon-roll-chip" title="${autoHalf.length ? `Applied automatically on Apply for ${esc(autoHalf.join(", "))} — tick only for a target WITHOUT the status` : "Half damage. Tick for a target in cover / with resistance that has no status set; otherwise it is applied automatically on Apply"}"><input type="checkbox" name="resistance"><span>Resistance / Cover <small>½${autoHalf.length ? " · auto on Apply" : ""}</small></span></label>
            <label class="icon-roll-chip"><input type="checkbox" name="weakened"><span>Weakened <small>−2</small></span></label>
            ${hatred.active ? `<label class="icon-roll-chip icon-roll-chip--hatred" title="${esc(hatred.note)}"><input type="checkbox" name="hatred" ${hatred.halve ? "checked" : ""}><span>Hatred of ${esc(hatred.name)} <small>½ vs others</small></span></label>` : ""}
          </div>
          ${hatred.active || autoHalf.length || dodgers.length ? `<div class="icon-roll-auto">
            ${hatred.active ? `<span class="icon-roll-auto__chip">⚠ ${esc(hatred.note)}</span>` : ""}
            ${autoHalf.length ? `<span class="icon-roll-auto__chip" title="Cover / Resistance: half damage, applied when the damage is applied (p.92)">⚙ ½ on Apply: ${esc(autoHalf.join(", "))} (Cover / Resistance)</span>` : ""}
            ${dodgers.length ? `<span class="icon-roll-auto__chip" title="Dodge: immune to damage from missed attacks, successful saves and area effects (p.144)">⚙ Dodge: ${esc(dodgers.join(", "))} — no damage from Miss / Area</span>` : ""}
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
      let txt = parts.join(" + ") || "no damage";
      const tail = [];
      if (f.elements.vulnerable?.checked) tail.push("+1 vulnerable");
      if (f.elements.resistance?.checked) tail.push("½ resistance");
      if (f.elements.hatred?.checked)     tail.push("½ hatred");
      if (f.elements.weakened?.checked)   tail.push("−2 weakened");
      if (tail.length) txt += `  →  ${tail.join(", ")}`;
      formula.textContent = txt;
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
          };
        },
      },
      rejectClose: false,
    });
  } catch (err) { _log("damage dialog closed", err); return null; }
}
