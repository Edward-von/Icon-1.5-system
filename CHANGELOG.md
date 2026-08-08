# Changelog — ICON 1.5 (sistema Foundry VTT)

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
