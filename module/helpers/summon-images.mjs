/**
 * summon-images.mjs — A picture for every summon and object instead of the
 * grey silhouette (mystery-man.svg). Icons from Foundry's own set
 * (icons/svg), so nothing is downloaded and the art works on every install.
 *
 * By name for the summons and objects of the packs (foe / legend summons and
 * the PC Summons compendium), then by words in the name or descriptor for
 * anything made by hand.
 */
const SVG = (n) => `icons/svg/${n}.svg`;
export const DEFAULT_SUMMON_IMG = "icons/svg/mystery-man.svg";

const BY_NAME = {
  // PC summons (Summons compendium)
  "astral seraph": "angel", "beast": "pawprint", "great beast": "pawprint", "bomb": "explosion",
  "master card": "card-joker", "wild card": "card-joker", "plant": "oak", "salt sprite": "light",
  "selkie": "whale", "severed soul": "terror", "shadow": "invisible", "thrall": "cowled",
  // Foe summons
  "attack insect": "wing", "crony": "cowled", "dancing light": "light", "decoy": "statue",
  "flapjack": "wing", "junk golem": "clockwork", "lesser root": "oak", "lonely soul": "terror",
  "loose limbs": "bones", "mushroom": "poison", "pearlsecent bubble": "aura", "pit worm": "burrow",
  "scrap turret": "target", "shadow clone": "invisible", "soul spark": "sun", "tame monster": "pawprint",
  "trained beasts": "pawprint",
  // Foe objects
  "bonfire": "fire", "cauldron": "tankard", "cocoon": "net", "deep root": "oak", "herbal censer": "regen",
  "imperial standard": "tower-flag", "pillar of iz": "obelisk", "portal": "portal",
  "sarcophagus of iz": "chest", "shop": "coins", "temple bell": "sound",
  // Legend summons
  "blade of agony": "sword", "combat automaton": "clockwork", "flagellant knight": "holy-shield",
  "memory": "book", "munition": "explosion", "repair automaton": "clockwork", "shield automaton": "shield",
  "soul fragment": "terror", "star seed": "sun", "targeting reticle": "target", "the maiden": "angel",
  "the scepter bearer": "holy-shield", "the shrouded lady": "cowled", "the sycophant": "cowled",
  "torpedo": "thrust", "turret automaton": "target", "wailing soul": "terror",
  // Legend objects
  "arkentech super mine": "trap", "aurelian bomb": "explosion", "everforge": "fire-shield",
  "icicle": "frozen", "keg": "barrel", "overclock piston": "lever", "rally point": "tower-flag",
  "seismic thumper": "mountain", "volatile gem": "radiation",
};

const BY_WORD = [
  [/\b(?:automaton|golem|turret|construct|machine)/i, "clockwork"],
  [/\b(?:soul|spirit|ghost|wraith)/i, "terror"],
  [/\b(?:bomb|mine|explosive|munition)/i, "explosion"],
  [/\b(?:fire|flame|ember|brazier)/i, "fire"],
  [/\b(?:ice|icicle|frost)/i, "frozen"],
  [/\b(?:root|tree|plant|vine|thorn)/i, "oak"],
  [/\b(?:beast|wolf|hound|monster|animal)/i, "pawprint"],
  [/\b(?:blade|sword|weapon)/i, "sword"],
  [/\b(?:wall|pillar|boulder|rock|stone|statue)/i, "statue"],
  [/\b(?:trap|snare)/i, "trap"],
  [/\b(?:light|wisp|spark)/i, "light"],
  [/\b(?:banner|standard|flag)/i, "tower-flag"],
  [/\b(?:portal|gate)/i, "portal"],
  [/\b(?:shield|guard)/i, "shield"],
  [/\b(?:card)/i, "card-joker"],
];

/**
 * The picture for a summon / object.
 * @param {string} name
 * @param {object} [opts]
 * @param {string} [opts.descriptor]  "Height 1 object", "Size 1, intangible"…
 * @param {string} [opts.kind]        "summon" | "object"
 * @returns {string} an image path (never empty)
 */
export function summonImage(name, { descriptor = "", kind = "" } = {}) {
  const key = String(name ?? "").trim().toLowerCase();
  if (BY_NAME[key]) return SVG(BY_NAME[key]);
  const text = `${name ?? ""} ${descriptor ?? ""}`;
  for (const [re, icon] of BY_WORD) if (re.test(text)) return SVG(icon);
  return SVG(kind === "object" || /\bobject\b/i.test(descriptor) ? "barrel" : "cowled");
}

/**
 * New Summon actors that still have the grey silhouette get their picture
 * (dragged from the Summons compendium, made from a foe's chip, or by hand),
 * on the actor and on its token.
 */
export function registerSummonImageHook() {
  Hooks.on("preCreateActor", (doc, data) => {
    if (doc.type !== "summon") return;
    const img = data.img ?? doc.img;
    if (img && img !== DEFAULT_SUMMON_IMG && img !== "icons/svg/mystery-man-black.svg") return;
    const pic = summonImage(doc.name);
    const token = data.prototypeToken?.texture?.src ?? doc.prototypeToken?.texture?.src;
    const update = { img: pic };
    if (!token || token === DEFAULT_SUMMON_IMG) update["prototypeToken.texture.src"] = pic;
    doc.updateSource(update);
  });
}
