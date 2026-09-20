# ICON 1.5 — Foundry VTT system

An **unofficial**, fan-made game system for playing [ICON](https://massifpress.com/icon) 1.5 in
[Foundry VTT](https://foundryvtt.com/) v13+.

ICON is written, drawn and laid out by **Tom Bloom** (Massif Press). Version 1.5 is a free playtest:
the book asks only that you keep its credits page when you share it, and this system is built for
people playing that playtest. It is not affiliated with or endorsed by Massif Press.

> If you are the author or publisher and would like something changed or removed, open an issue and
> it will be dealt with.

## Install

In Foundry: **Game Systems → Install System**, then paste this manifest URL:

```
https://github.com/Edward-von/Icon-1.5-system/releases/latest/download/system.json
```

Foundry will offer updates from the same URL whenever a new release is published.

## What's in it

- **Character sheets** for player characters, foes, legends and summons, plus a board of campaign
  clocks, all laid out in the book's own order.
- **Compendia**: jobs and abilities, foes and legends, foe abilities, bonds and bond powers, relics,
  gear kits, summons, and the system's macros.
- **Rolls that follow the rules**: attacks with boons and curses (including the ones an ability
  carries in its own tag line), evasion rolled before the d20, damage with armor, cover, resistance,
  dodge, pierce and divine applied where the book applies them.
- **Automation that stays out of the way**: statuses read out of an ability's text with a button per
  status and per target, saves at 10+, marks and Hatred, stances, area templates for blasts, lines,
  arcs, bursts and auras, Wright Infuse, the Seer's wild cards.
- **GM tools**: an encounter designer with the p.292 budget, the turn tracker with ICON's turn
  order, and a reference sheet for the rules glossary.

The rules text in the compendia comes from the ICON 1.5 playtest book. Page numbers are cited
throughout the code so any rule can be checked against the source.

## Requirements

- Foundry VTT **v13** or later (verified on v14).
- No modules are required.

## Reporting a bug

Open an [issue](https://github.com/Edward-von/Icon-1.5-system/issues) and include:

1. the system version (Foundry shows it under Game Systems);
2. what you did, what happened, and what you expected;
3. anything red in the console (F12).

The version matters: a bug fixed in a newer release often looks identical from the outside.

## Updating a world

Worlds are migrated automatically when they are opened with a newer system version. Migrations only
touch data that still matches what the system originally wrote, so anything you have edited by hand
is left alone. The console records what each migration changed.

## Credits and licence

- **ICON** — game, writing, art and layout by Tom Bloom, © Tom Bloom 2023. Massif Press.
- **This system** — by Edward_von.

The **code** of this system is released under the MIT licence (see [LICENSE](LICENSE)). The **game
content** it carries — ability, foe, relic and bond text, and anything else drawn from the ICON 1.5
book — belongs to Tom Bloom and is not covered by that licence.
