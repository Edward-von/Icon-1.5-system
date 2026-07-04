/**
 * Shared "Prototype Token" header control for the ICON actor sheets.
 *
 * Our sheets extend DocumentSheetV2 directly (not ActorSheetV2), so they don't
 * inherit the standard actor header controls. Without this, there's no way to
 * configure the token separately from the portrait — editing the portrait was
 * the only image picker, leaving the token stuck on the same/default image.
 *
 * Mirrors core ActorSheetV2's `configurePrototypeToken` control + handler
 * (foundry v13: applications/sheets/actor-sheet.mjs).
 */

/** Header-control descriptor — add to a sheet's `DEFAULT_OPTIONS.window.controls`. */
export const PROTOTYPE_TOKEN_CONTROL = {
  action: "configurePrototypeToken",
  icon: "fa-solid fa-circle-user",
  label: "TOKEN.TitlePrototype",
  ownership: "OWNER",
};

/**
 * Action handler — register under `DEFAULT_OPTIONS.actions.configurePrototypeToken`.
 * Called with `this` bound to the sheet instance.
 */
export function onConfigurePrototypeToken(event) {
  new CONFIG.Token.prototypeSheetClass({
    prototype: this.document.prototypeToken,
    position: {
      left: Math.max(this.position.left - 560 - 10, 10),
      top: this.position.top,
    },
  }).render({ force: true });
}

/**
 * Filter for `_getHeaderControls()` — drops the prototype-token control when the
 * sheet isn't editable or the actor is a synthetic (unlinked) token, matching
 * core behaviour. Returns the (mutated) controls array.
 */
export function filterPrototypeTokenControl(controls, sheet) {
  if (!sheet.isEditable || sheet.document.isToken) {
    controls.findSplice(c => c.action === "configurePrototypeToken");
  }
  return controls;
}
