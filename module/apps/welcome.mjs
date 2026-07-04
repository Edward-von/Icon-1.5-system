/**
 * welcome.mjs — First-launch "how to build a character" guide.
 *
 * Shown once per user (client-scoped `welcomeShown` flag, registered in
 * icon.mjs) on first load, and re-openable any time from the Character
 * Management section of the PC sheet (the ❔ Guide button → `showHelp` action).
 */

const GOLD = "#e8b828";
const H3 = `color:${GOLD};margin:14px 0 4px;font-size:1em;border-bottom:1px solid #3a3528;padding-bottom:3px;`;

const WELCOME_HTML = `
<div class="icon-welcome" style="font-size:.92em;line-height:1.5;color:#d8c9a8;max-height:60vh;overflow:auto;padding-right:6px">
  <p style="margin:0 0 8px">Welcome to <strong>ICON 1.5</strong>! Here's how to build and manage a character in a few steps.</p>

  <h3 style="${H3}">1 · Create your character — the wand <i class="fas fa-wand-magic-sparkles"></i></h3>
  <p style="margin:0 0 6px">Open the character sheet and go to the <strong>Narrative</strong> tab. Next to the <strong>XP</strong> bar, press the <i class="fas fa-wand-magic-sparkles"></i> <strong>wand</strong> button: this opens the creation wizard. Pick your <strong>Kin</strong>, <strong>Culture</strong> and <strong>Bond</strong>, distribute your narrative action dots, and choose your <strong>starting job</strong> with its 2 abilities. This builds your <strong>level&nbsp;0</strong> character.</p>

  <h3 style="${H3}">2 · Level up — <i class="fas fa-arrow-up"></i> Level Up</h3>
  <p style="margin:0 0 6px">When the XP bar is full (<strong>15 XP</strong>), press <i class="fas fa-arrow-up"></i> <strong>Level Up</strong> (same spot, below the bar). The wizard lets you pick — depending on the level — new abilities, talents, masteries, relics and bond powers. That's how you go 0→1, 1→2 and so on. At the halfway mark (<strong>7 XP</strong>) you automatically gain <strong>+1 AP</strong>.</p>

  <h3 style="${H3}">3 · Equip abilities — the <strong>Combat</strong> tab</h3>
  <p style="margin:0 0 6px">On the <strong>Combat</strong> tab, drag abilities into the equipped <strong>slots</strong>. The <i class="fas fa-lock"></i> lock toggles the talent/mastery editors on and off, to prevent accidental changes during play.</p>

  <h3 style="${H3}">4 · Your budget — <strong>Character Management</strong></h3>
  <p style="margin:0 0 6px">On the <strong>Notes</strong> tab, the <strong>Character Management</strong> section shows how much <strong>AP</strong> (abilities &amp; talents), <strong>Masteries</strong> and <strong>Skill Ranks</strong> (narrative actions) you've spent vs. the total earned from levelling up. The <span style="color:#e08a2a;font-weight:bold">⚠ OVER</span> flag warns if you've overspent. <strong>↻ Refocus</strong> refunds everything so you can rebuild.</p>

  <h3 style="${H3}">5 · Primary job ★</h3>
  <p style="margin:0 0 6px">Your <strong>primary</strong> job (marked with ★) provides base stats, traits and the Limit Break. Drag a <em>Job Template</em> from the <strong>Jobs</strong> compendium; if you have several jobs you can switch the primary from the Combat tab — the other jobs' abilities stay available.</p>

  <p style="margin:14px 0 0;font-size:.85em;color:#a89878;border-top:1px solid #3a3528;padding-top:8px">
    💡 You can reopen this guide any time from the <strong>❔ Guide</strong> button in the <em>Character Management</em> section (Notes tab).
  </p>
</div>`;

/**
 * Show the getting-started guide. Safe to call any time; never throws.
 * @returns {Promise<unknown>}
 */
export function showWelcomeGuide() {
  return foundry.applications.api.DialogV2.prompt({
    window:  { title: "ICON 1.5 — How to Build Your Character", icon: "fa-solid fa-wand-magic-sparkles" },
    content: WELCOME_HTML,
    position: { width: 660 },
    ok: { label: "Got it", icon: "fa-solid fa-check", callback: () => true },
    rejectClose: false,
  }).catch(() => {});
}
