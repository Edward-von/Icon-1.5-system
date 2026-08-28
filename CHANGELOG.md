# Changelog — ICON 1.5 (sistema Foundry VTT)

## 28 agosto 2026 — Audit completo dei foe e delle legend (fix pass)

Audit manuale di **tutti i 376 foe e le 28 legend** contro il manuale (pp. 288–501), poi
fix pass completo. Findings e script in `icon-compendium-audit/foes-audit/`.

### 🐛 Correzioni di gioco (foes)
- **Template di fazione applicati a tutti i foe** (prima li avevano solo i Demon): Legion
  of the Dead (Relict), Enrage (Ruin Beast), Valuables/Greed/Cut and Run (Scavenger),
  Chain of Command (Imperial), Blightland Survivalists (Lowlander), Legacy of the Titans
  con **size 2** per tutti i Jotunn (Titanblood), Nature Spirits + **Trickery/charge** e
  Spirit Away (Hob).
- **Le varianti ora hanno tutto il kit della base** (154 varianti, 33 famiglie), con i
  testi verbatim della base e gli interrupt separati; classe/statline allineate alla base.
- **10 foe mancanti creati**: Ruin Ape, Bouncer, Feathered Demon, Priest of the Nettle,
  Priest of the Herb, Mayfly spirit, Beast spirit, Cultist, Vile Darter, Giant Insect
  (erano fusi in altri foe). Archon↔Sniper rimessi nella fazione giusta.
- Fix puntuali: Kelpie elite HP 56 · Clot speed 2 · Basilisk Petrification · Color Demon
  Distorted Soul · Great Boulder Lumbering · Greenkeeper Living Root · Geryan Bargain ·
  Watcher Phasing · Horn Demon Regeneration · Crystalline Counter · Mondo Sturdy e
  duplicati rimossi · Judge (4 azioni inventate rimosse) · Sword Master (kit Steam Wright
  rimosso) · Royal Guard Battalion of Limbs completo · Battle Wagon Torpedo completo ·
  Radiance of the Black Sun (ch3) su tutta la famiglia Necrosavant · Starfall sui Tethian
  · Sentinel/Sapper/Diviner (basic jobs) e molti altri.
- Note di capitolo (Chapter 2+/3) rimesse sull'abilità giusta della base; campo
  **chapter** popolato (110 foe).
- **Combo sequenziate** (Wraith, Impaler, Floatfish, Boil Slug, White Beast, Ring Finger,
  Gear Walker…); le azioni del Calderone dei Troll non sono più taggate combo.

### 🐛 Legend
- **Tutte le 28 legend ri-autorate verbatim dal manuale**: tratti, azioni, interrupt,
  round action, fasi con nome e gating (`phaseIndex`), combo, tattiche e trofei. Erano
  riassunte, con abilità tronche o intere sezioni assenti (Chimaera senza le 10 teste,
  Apex senza Might of the Wild, Master mezzo vuoto, Keeper senza armi/armature, ecc.).
- **24 legend avevano `_id` non validi**: Foundry le scartava in migrazione — il pack
  legend non si era mai caricato davvero. Corretto.

### 🔧 Pulizia dati
- ~180 code di scraping rimosse ("Chapter 1+", "335 of 501", intro di altri foe…).
- Testi dei tratti glossario unificati (263 tratti, testo p.104).
- Tag normalizzati (`boon-1`, `per-round-1`, `unerring`…), tag spuri rimossi.
- Attori-oggetto/parti di legend rimossi (10) o ridotti a summon puliti (8).
- Pack `foe-abilities` rigenerato dagli attori (3.917 item, id conservati dove possibile).
- Verificato headless: 404/404 schede si aprono, 0 errori.

**Per i mondi esistenti**: i foe e le legend già trascinati nei mondi NON si aggiornano
da soli — reimportarli dal compendio.

## 24 agosto 2026 (sera) — Audit completo delle ability dei PG

Audit manuale di **tutte le 148 ability, 96 tratti e 16 limit break** dei 16 job,
confrontati pagina per pagina con il manuale (pp. 116–236). Fedeltà dei testi già
ottima; corretti però parecchi problemi strutturali sistematici:

### 🐛 Correzioni di gioco
- **13 interrupt avevano perso la riga "Trigger:"** (Catapult, Perseus, Righteous
  Disdain, Boiling Blood, Sucker Punch, Masquerade, Warding Bolts, Nocturne, Justice,
  Wish, Midas, Sturmreiten, Heave-Ho) — ripristinata dal manuale. Senza, non si sapeva
  QUANDO usarli.
- **Regole delle evocazioni ripristinate**: le sezioni SUMMONS dei job erano andate
  perse — **Bomb** (Fool), **Shadow + Shadow Cloud** (Shade), **Beast** (Warden),
  **Thrall + Plant** (Harvester); completate anche **Wild Card** (Seer) e **Salt
  Sprite** (Stormbender). Ora vivono nel tratto di riferimento del job (visibile in
  scheda) e nelle ability principali; i template job aggiornati di conseguenza.
- **Effetti incondizionati fuori dal campo "On hit"** (~28 ability): le righe
  "Effect:"/"Mark:" del manuale valgono anche se l'attacco manca, ma erano dentro
  l'effetto colpito — la scheda le nascondeva sul miss. Spostate nella descrizione.
- **"Miss:" incastrato nel campo hit** (~16 ability, blocchi Mendicant/Wright):
  separato nei campi corretti — ora la scheda mostra il danno da miss.
- **Effetti da talento mostrati come base** (12 ability): exceed/comeback/slay/charge
  che il manuale dà SOLO con un talento erano anche nei campi base — ripuliti.
- **Testi mancanti reintegrati**: vincoli di Terraforming, clausole di Underway,
  esplosione fissa di Magnapyre, altezza impilata dello Spirit Shrine, "counts as an
  attack" di Split Heaven and Hell, distanza illimitata di Deus Ex Machina e altri.

### 🔧 Pulizia dati
- Rimossi i duplicati-ability dei tratti di capitolo 3 Mendicant (Gran Redempta, Defy
  the Cycle, Great Spirit Festival, Chakravartin) — restano tratti come da manuale, e
  ora sono inclusi nei template job (prima mancavano).
- Placeholder d'authoring eliminati ("[attack]", "(implicit: see description)").
- I template job ora incorporano il **testo completo dei Limit Break** (prima una
  versione riassunta finiva sulla scheda del PG).
- Tag fuorvianti rimossi, dieresi ripristinate (Ätherwand, Bifröst, Ragnarök,
  Götterdämmerung…), tag di testata dei Limit Break (Divine, ecc.) reintegrati nel
  testo, flavor mancanti aggiunti dove certi.

Nota: i PG già creati conservano le copie vecchie delle ability — per riallinearle,
ri-trascina le ability dal compendio (o usa il wizard su un PG nuovo).

## 24 agosto 2026 — Hotfix: schede PG

### 🐛 Correzioni di gioco
- **Le schede dei PG non si aprivano**: il bug colpiva i personaggi **senza job assegnato** — quindi tutti i PG nuovi. Il banner del wizard di creazione (novità dell'8 agosto) aggiungeva un secondo elemento radice al template dell'header, e Foundry lo rifiuta in blocco (*"Template part must render a single HTML element"*). I PG con job già scelti non erano toccati, per questo il bug era sfuggito ai test. Corretto e verificato su tutte le schede: PG nuovi, PG esistenti, foe, legend e summon.
- **Errori di migrazione all'avvio del mondo**: ~2.150 documenti dei compendi risultavano scritti da Foundry "14.360" e a ogni avvio del mondo riempivano il log di errori *"cannot be migrated"* (i compendi funzionavano lo stesso, ma la migrazione lato server veniva saltata). Versioni normalizzate a 13.351 — l'avvio ora è pulito.

### ✨ Novità
- **Barra HP sui token**: i nuovi attori hanno di default la **barra HP sul token** — sempre visibile per i PG, visibile solo al GM per i nemici. Gli HP si possono anche modificare direttamente dall'HUD del token (click destro sul token), senza aprire la scheda. Per i mondi già esistenti: da console GM (F12) `await game.icon.enableTokenBars();` aggiorna in un colpo tutti gli attori e i token già piazzati.

### 📎 Promemoria
- Il **Basic Attack dalla scheda** richiesto è **già presente** nella release dell'8 agosto (tab *Combat* → sezione *Basic Actions*: Light/Heavy Attack con tiro d'attacco e danno, più Recover) — era nella zip che il bug delle schede ha impedito di provare.

---

## 8 agosto 2026 — Secondo giro di feedback

### 🐛 Correzioni di gioco
- **Danno delle abilità Combo (PG)**: il tiro di danno ora può usare la **versione combo** — nel dialogo del danno c'è una spunta *Combo version*, pre-attivata se hai il combo token (o l'hai appena speso mostrando la carta in chat).
- **Combo dei nemici**: come da manuale (p.290) per i foe le combo sono una **sequenza** di azioni, non coppie con token. Le azioni della sequenza ora sono **adiacenti e numerate** (*Combo 1 → Combo 2 → …*) con tooltip della regola. Aggiornati 47 foe e 109 abilità nel compendio.
- **Ideali dei Bond**: i bond hanno **3 ideali** ma la scheda ne mostrava (e ne *salvava*) solo 2 — il terzo veniva cancellato al primo salvataggio. Ora tutti e tre sono visibili e modificabili. Per i PG già colpiti: ri-trascina il bond dal compendio o riscrivi il terzo ideale.
- **Blocco per capitolo**: le ability di capitolo 2+ (es. *Intimidate*) non si possono più trascinare su un PG di capitolo inferiore (il GM può forzare con conferma). Wizard e level-up filtravano già correttamente.
- **Colori delle classi**: Mendicant e Wright erano **invertiti** — ora Mendicant è verde e Wright è blu.

### ✨ Novità
- **Status "Marked"**: nuovo status accumulabile (*Marked: 1/2/3*, click sinistro/destro) con icona a mirino, su schede e token HUD.
- **Banner del wizard**: le schede PG senza job mostrano un richiamo dorato ben visibile al wizard di creazione, su ogni tab.
- **Sezione "Basic Actions"** nel tab Combat (richiudibile): le azioni base di p.85 con pulsanti funzionanti per **Light/Heavy Attack** (attacco + danno) e **Recover** (applica il Vigor).
- **Armatura visibile sulle carte danno**: badge **ARM** per ogni bersaglio e nota "Apply subtracts the target's Armor" (l'armatura veniva già applicata, ma in modo invisibile). La macro *Apply Damage* ha ora l'opzione **Pierce** (ignora armatura).
- **Kit equipaggiamento dei Bond**: applicando un bond (wizard o drag-drop) i suoi kit vengono elencati nelle **Note**; trascinare un kit ne scrive il contenuto.
- **Slow Turn**: chi dichiara il turno lento viene **ordinato in fondo** ai combattenti ancora da attivare, con bordo ambra. I pulsanti di fine turno ora **avvisano** invece di fallire in silenzio.
- **Poteri di Bond per sessione**: la macro di fine sessione (*Award Session XP*) azzera automaticamente gli usi; sistemati 5 poteri a cui mancava il limite (Strike the Road, Reputation, Lost Cat, Rarefied, Ridi Pagliacci ×3).
- **Checkbox Elite**: non deborda più dal riquadro nella scheda foe.

### 📦 Nota distribuzione
- Diversi bug segnalati (caselle Effort, End Turn/Slow Turn, "danno diretto agli HP") erano **già corretti** nelle build successive alla zip in circolazione — questa release riallinea tutto.

---

## 25 giugno 2026 — Correzioni da feedback

### 🐛 Correzioni di gioco
- **Contatore Effort**: il numero mostrato (es. *2/3*) ora corrisponde alle caselle piene. Prima il contatore segnava sempre **uno in meno** delle caselle effettivamente riempite.

### 🎨 Interfaccia
- **Poteri di Bond — usi per sessione**: i poteri con un limite "X/sessione" mostrano ora dei **pallini cliccabili** accanto al nome per tenere il conto degli usi durante la sessione. Aggiunto il pulsante **New Session** (nella sezione Powers) per azzerare tutti i contatori a inizio sessione.
- **Reference rapida** 📖: apre uno **schema del turno** e un **glossario ricercabile** con ~100 definizioni di gioco. Basta digitare un termine (es. *comeback*, *exceed*, *vigor*, *save*, *shove*) per filtrarlo. Copre stat di base, azioni e timing, tutti e 10 i trigger, danni, movimento, statuses, effetti positivi, stati persistenti, risorse e termini narrativi (Effort/Strain/Burden). Disponibile **lato player e lato GM**: dalla barra del titolo (icona 📖) di ogni scheda (PG, Foe, Legend, Summon) e dal pulsante *📖 Reference* nella sezione *Character Management* del PG.

---

## 31 maggio 2026 — Aggiornamento di manutenzione e correzioni

### 🐛 Correzioni di gioco
- **Rigenerazione**: ora funziona anche su **nemici e Legend** (prima solo sui PG) e scatta a **fine turno**, come da manuale.
- **Pacified**: ora **dimezza davvero i danni** inflitti — prima lo status era puramente decorativo.
- **Carta del danno**: mostra **Difesa e HP anche dei bersagli nemici** (prima quei campi restavano vuoti quando un PG colpiva un foe).
- **Recupero post-combattimento**: corretto un caso limite in cui un personaggio esattamente a metà HP non veniva curato.
- Vari ritocchi di robustezza per la **compatibilità con Foundry v14** (tiri, dialoghi, macro).

### 📚 Bestiario e compendi
- **Libreria "Foe Abilities" ripulita**: completate alcune azioni rimaste vuote (riprese dai nemici già corretti) e **rimosse 13 voci vuote/orfane** (residui di vecchi import corrotti). I nemici *giocabili* erano già a posto — questa è pulizia della libreria da cui si trascinano le abilità.
- **Legend**: lo **scaling degli HP in base al numero di giocatori** ora funziona correttamente per tutti i 29 Legend (prima il valore di base non era impostato).
- Verificato il **Fetid Idol**: è corretto così com'è (è un boss-oggetto immobile che combatte tramite worshipper e Round Action, quindi non ha "azioni" normali — è di design).

### 🎨 Interfaccia
- Icone dedicate per **Power Die** ed **Elevation** (prima erano il placeholder con il "?").
- Lo status **Immobile** ora compare correttamente nel gruppo delle **condizioni negative**.
- Aggiunto il job mancante **Sealer** (Mendicant) dove non era ancora elencato.

### 🔧 Sotto il cofano
- Macro **Camp / Interlude / XP / Apply Damage** aggiornate per v14 (dialoghi più moderni).
- Consolidato e ripulito il codice dei tiri di danno e rimosse parti di codice non più usate.

---

**Come aggiornare:** dopo l'update, ricarica il mondo (F5).
**Nota sui nemici:** i foe già presenti nel tuo mondo mantengono le loro copie; le correzioni alla **libreria** valgono per i nemici **re-importati** dal compendio (come già accennato nelle versioni precedenti).
