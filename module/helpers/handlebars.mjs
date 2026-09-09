/**
 * registerHandlebarsHelpers — Custom Handlebars helpers for ICON 1.5.
 */
export function registerHandlebarsHelpers() {

  /**
   * {{icon-times n}} — render n repetitions of a block (for dot pips, boxes, etc.)
   * Usage: {{#icon-times 4}}●{{/icon-times}}
   */
  Handlebars.registerHelper("icon-times", function(n, options) {
    let result = "";
    for (let i = 0; i < n; i++) {
      result += options.fn(i);
    }
    return result;
  });

  /**
   * {{icon-range from to}} — iterate from..to inclusive
   * Usage: {{#icon-range 1 5 as |i|}}{{i}}{{/icon-range}}
   */
  Handlebars.registerHelper("icon-range", function(from, to, options) {
    let result = "";
    for (let i = from; i <= to; i++) {
      result += options.fn(i);
    }
    return result;
  });

  /**
   * {{iconRange n}} — subexpression form returning a 1-based array
   * [1, 2, ..., n]. Used inside `{{#each (iconRange 4) as |i|}}...{{/each}}`
   * where a concrete array is needed.
   */
  Handlebars.registerHelper("iconRange", function(n) {
    const count = Number(n) || 0;
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  /**
   * {{capitalize str}} — first-letter capitalisation for object keys like
   * "sneak" → "Sneak" (useful when iterating system.narrative.actions directly).
   */
  Handlebars.registerHelper("capitalize", function(str) {
    if (typeof str !== "string" || !str.length) return str ?? "";
    return str[0].toUpperCase() + str.slice(1);
  });

  /**
   * {{icon-filled value max}} — render filled/empty pip string
   */
  Handlebars.registerHelper("icon-filled", function(value, max) {
    const filled = Math.min(value, max);
    return "●".repeat(filled) + "○".repeat(Math.max(0, max - filled));
  });

  /**
   * {{icon-eq a b}} — strict equality check
   * Supports both inline {{icon-eq a b}} and block {{#icon-eq a b}}...{{/icon-eq}} usage.
   */
  Handlebars.registerHelper("icon-eq", function(a, b, options) {
    if (typeof options?.fn === "function") {
      return (a === b) ? options.fn(this) : (options.inverse ? options.inverse(this) : "");
    }
    return a === b;
  });

  /**
   * {{icon-lte a b}} — a <= b
   * Supports both inline subexpression and block usage. Coerces both operands
   * to Number so string inputs (e.g. form values) compare numerically.
   */
  Handlebars.registerHelper("icon-lte", function(a, b, options) {
    const na = Number(a);
    const nb = Number(b);
    const result = na <= nb;
    if (typeof options?.fn === "function") {
      return result ? options.fn(this) : (options.inverse ? options.inverse(this) : "");
    }
    return result;
  });

  /**
   * {{icon-lt a b}} — a < b
   * Supports both inline subexpression and block usage. Coerces both operands
   * to Number so string inputs (e.g. form values) compare numerically.
   */
  Handlebars.registerHelper("icon-lt", function(a, b, options) {
    const result = Number(a) < Number(b);
    if (typeof options?.fn === "function") {
      return result ? options.fn(this) : (options.inverse ? options.inverse(this) : "");
    }
    return result;
  });

  /**
   * {{icon-gt a b}} — a > b
   * Supports both inline and block usage.
   */
  Handlebars.registerHelper("icon-gt", function(a, b, options) {
    if (typeof options?.fn === "function") {
      return (a > b) ? options.fn(this) : (options.inverse ? options.inverse(this) : "");
    }
    return a > b;
  });

  /**
   * {{icon-gte a b}} — a >= b
   * Supports both inline and block usage.
   */
  Handlebars.registerHelper("icon-gte", function(a, b, options) {
    const result = Number(a) >= Number(b);
    if (typeof options?.fn === "function") {
      return result ? options.fn(this) : (options.inverse ? options.inverse(this) : "");
    }
    return result;
  });

  /**
   * {{icon-add a b}} — addition
   */
  Handlebars.registerHelper("icon-add", function(a, b) {
    return a + b;
  });

  /**
   * {{icon-pct value max}} — percentage string for CSS width
   */
  Handlebars.registerHelper("icon-pct", function(value, max) {
    if (!max) return "0%";
    return `${Math.round((value / max) * 100)}%`;
  });

  /**
   * {{icon-localize key}} — wrapper around game.i18n.localize
   */
  Handlebars.registerHelper("icon-localize", function(key) {
    if (typeof key !== "string") return "";
    return game.i18n.localize(key);
  });

  /**
   * {{localize key}} — alias, matching Foundry's built-in convention.
   * NOTE: Foundry core already registers a "localize" helper; this override
   * adds a type-guard so non-string values (e.g. accidental object pass-through)
   * never reach game.i18n.localize(), which expects a string.
   */
  Handlebars.registerHelper("localize", function(key, options) {
    if (typeof key !== "string") return "";
    // Keep core's `{{localize "COMBAT.Round" round=…}}` working: hash params
    // are format data (without this the tracker header read "Round {round}").
    const data = options?.hash ?? {};
    return Object.keys(data).length ? game.i18n.format(key, data) : game.i18n.localize(key);
  });

  /**
   * {{icon-sub a b}} — subtraction (for range end calc)
   */
  Handlebars.registerHelper("icon-sub", function(a, b) {
    return a - b;
  });

  /**
   * {{icon-or a b}} — logical OR (supports block usage)
   */
  Handlebars.registerHelper("icon-or", function(a, b, options) {
    if (typeof options?.fn === "function") {
      return (a || b) ? options.fn(this) : (options.inverse ? options.inverse(this) : "");
    }
    return a || b;
  });

  /**
   * {{icon-and a b}} — logical AND (supports block usage)
   */
  Handlebars.registerHelper("icon-and", function(a, b, options) {
    if (typeof options?.fn === "function") {
      return (a && b) ? options.fn(this) : (options.inverse ? options.inverse(this) : "");
    }
    return a && b;
  });

  /**
   * {{icon-not val}} — logical NOT (supports block usage)
   */
  Handlebars.registerHelper("icon-not", function(val, options) {
    if (typeof options?.fn === "function") {
      return (!val) ? options.fn(this) : (options.inverse ? options.inverse(this) : "");
    }
    return !val;
  });

  /**
   * {{icon-class-color class}} — returns CSS class for job class color
   */
  Handlebars.registerHelper("icon-class-color", function(cls) {
    return `icon-class--${cls}`;
  });
}
