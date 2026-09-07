/**
 * AbilityData — TypeDataModel for combat abilities (type: "ability").
 */
const {
  StringField, NumberField, BooleanField,
  ArrayField, HTMLField,
} = foundry.data.fields;

import { powerDieSchema } from "./power-die.mjs";

export class AbilityData extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    return {
      jobName:  new StringField({ required: true, initial: "" }),
      class:    new StringField({ required: true, initial: "stalwart", choices: ["stalwart","vagabond","mendicant","wright"] }),
      chapter:  new NumberField({ required: true, initial: 1, min: 1, max: 3, integer: true }),
      cost:     new StringField({ required: true, initial: "1action", choices: ["1action","2actions","free","interrupt-1","interrupt-2","interrupt-3"] }),
      isAttack: new BooleanField({ required: true, initial: false }),
      tags:     new ArrayField(new StringField({ initial: "" }), { initial: [] }),

      // Only relevant for interrupt-type abilities
      interruptTrigger: new StringField({ required: true, initial: "" }),

      hitEffect:           new HTMLField({ required: true, initial: "" }),
      missEffect:          new HTMLField({ required: true, initial: "" }),
      areaEffect:          new HTMLField({ required: true, initial: "" }),
      chargeEffect:        new HTMLField({ required: true, initial: "" }),   // slow turn
      heroicEffect:        new HTMLField({ required: true, initial: "" }),   // Stalwart heroic
      exceedEffect:        new HTMLField({ required: true, initial: "" }),   // roll 15+
      collideEffect:       new HTMLField({ required: true, initial: "" }),
      slayEffect:          new HTMLField({ required: true, initial: "" }),
      critEffect:          new HTMLField({ required: true, initial: "" }),
      finishingBlowEffect: new HTMLField({ required: true, initial: "" }),   // Vagabond
      comebackEffect:      new HTMLField({ required: true, initial: "" }),   // user bloodied

      talent1:     new HTMLField({ required: true, initial: "" }),
      talent2:     new HTMLField({ required: true, initial: "" }),
      mastery:     new HTMLField({ required: true, initial: "" }),
      // Optional tag overrides: when the matching talent / mastery is unlocked,
      // this comma-separated list REPLACES `tags` on the sheet and chat cards
      // (e.g. Draken Cross Talent II → "attack, range-5, medium-blast").
      // Empty = the upgrade does not change the tags.
      talent1Tags: new StringField({ required: true, initial: "" }),
      talent2Tags: new StringField({ required: true, initial: "" }),
      masteryTags: new StringField({ required: true, initial: "" }),
      description: new HTMLField({ required: true, initial: "" }),

      // Combo ability — Vagabond (and others) can have a powered-up version that
      // activates when the combo token is active. When isCombo is true and the
      // token is set, the sheet shows the combo version instead of normal effects.
      isCombo:     new BooleanField({ required: true, initial: false }),
      comboEffect: new HTMLField({ required: true, initial: "" }),

      // Which talent (if any) the character has unlocked for this ability.
      // 0 = no talent chosen, 1 = Talent I locked in, 2 = Talent II locked in.
      // Mutually exclusive — once chosen, the other talent is permanently
      // unavailable for this ability.
      talentSelected:  new NumberField({ required: true, initial: 0, min: 0, max: 2, integer: true }),
      // True once the character has spent a mastery point to unlock this
      // ability's mastery effect.
      masteryUnlocked: new BooleanField({ required: true, initial: false }),

      // Optional power die tracked on the ability itself (Odinforce, Soul Blade…).
      powerDie: powerDieSchema(),
    };
  }
}
