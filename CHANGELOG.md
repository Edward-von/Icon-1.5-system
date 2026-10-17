# Changelog — ICON 1.5 (sistema Foundry VTT)

## 17 ottobre 2026 — Il rampart di Comet ferma davvero i foe (versione 1.15.229)

### Round di debug del 15 ottobre, voce emersa su R33

- **Rampart di Comet**: un foe poteva volare, teletrasportarsi o fare un dash dentro o fuori gli spazi accanto
  all'arma, e arrivava solo un avviso dopo il movimento → il sistema non distingue un dash da un passo normale → ora
  il controllo avviene prima del movimento ("Foes cannot enter or exit any space affected by a character's Rampart by
  dashing, flying, or teleporting", p.117, p.128). Vale per i movimenti trascinati o fatti da tastiera che partono,
  finiscono o passano accanto all'arma. Se l'azione di Foundry è teleport, fly o jump ("fly, jump, or leap", p.88), o
  se il foe ha lo status flying, il movimento viene rifiutato con un avviso. Altrimenti il movimento resta in sospeso
  e si chiede a chi muove se è un dash. "Normal move or rush" lo fa proseguire (il rush rende unstoppable, p.88,
  p.104) e la risposta vale per quel foe fino al cambio di turno. "Dash" lo lascia dov'era. Non si controllano i foe
  unstoppable né quelli con tratti che ignorano il rampart ("Hovering: Immune to rampart", "Slip"). Solo codice.

## 17 ottobre 2026 — Copertura degli oggetti calcolata per direzione (versione 1.15.228)

### Round di debug del 15 ottobre, voce emersa su R33

- **Copertura dagli oggetti**: vicino a un oggetto il bersaglio aveva solo il chip tratteggiato "Cover? object" e il
  danno non veniva mai dimezzato → la regola dipende dal lato da cui arriva l'attacco e il sistema non la calcolava →
  all'Apply si guarda il token dell'attaccante. Se l'oggetto è accanto al bersaglio, almeno 1 più alto di lui, e
  l'attaccante sta tutto oltre la riga di spazi occupata dall'oggetto, il danno viene dimezzato con chip "Cover ½ —
  boulder" ("cover against all characters past the row of spaces … that their cover is currently occupying", p.92).
  Non c'è copertura se l'attaccante è adiacente o più in alto (p.92). Un alleato in piedi su un geyser con Geyser
  Talent I ha copertura da tutte le direzioni (p.232). Oggetto in diagonale: se l'attaccante è oltre sia la riga sia
  la colonna la copertura vale, se non è oltre nessuna delle due non vale, se è oltre una sola resta un chip
  suggerimento e il GM decide. Underway Talent II resta un suggerimento. Unerring ignora questa copertura (p.105), il
  danno divine no. I muri dell'oggetto non accendono più il chip generico "Cover? wall". Solo codice.

## 17 ottobre 2026 — Muri di Foundry attorno agli oggetti, a clic del GM (versione 1.15.227)

### Round di debug del 15 ottobre, R33a5

- **Muri attorno agli oggetti**: un oggetto sulla mappa "Provides obstruction" (p.89, p.95), ma un token ci passava
  attraverso → il sistema non creava muri di Foundry → sulla scheda dell'oggetto c'è ora un bottone "Add walls /
  Remove walls", solo per il GM e solo a clic (scelta di Edoardo). Crea quattro muri attorno al token. I muri bloccano
  il movimento ("objects are obstructions", p.88) ma non la vista ("objects … do not block line of sight", p.92). Sono
  a senso unico: fermano chi entra da fuori ma lasciano uscire il token dell'oggetto e chi ci sta sopra. Ogni muro è
  segnato col token dell'oggetto, segue il token quando si sposta e sparisce quando il token viene cancellato.
  All'apertura della scena il GM toglie da solo i muri rimasti senza oggetto. Underway non ha il bottone ("Portals
  don't provide obstruction", p.168). Funziona solo con griglia quadrata. Solo codice.

## 17 ottobre 2026 — Harvest Moon: scegli quali plant esplodono e chi prende la blessing (versione 1.15.226)

### Round di debug del 16 ottobre, voce emersa su R49

- **Harvest Moon**: tutte le plant attraversate esplodevano per forza; poi la plant restava sulla mappa e la blessing
  andava data a mano → il "you can" e il "granting its blessing to yourself or any other ally in range 3 of that
  plant" (p.186) non venivano letti → ora una finestra mostra una casella per ogni plant nell'area (già spuntate) e,
  per ognuna, chi prende la blessing: tu o un alleato entro 3 caselle da quella plant. Esplodono solo le plant
  spuntate. Chi è stato scelto riceve la blessing. Poi la plant viene tolta dalla mappa ("When the blessing is
  removed, remove the plant", p.184). Fanno eccezione due casi: un "Mote of life" perde la sua blessing e arriva la
  card RECYCLE per trasformarlo in terrain effect (p.187); un Megamushroom resta sulla mappa ("isn't removed", p.187)
  e la sua blessing risulta presa. Una riga in chat riassume tutto. Solo codice.

## 17 ottobre 2026 — Symphony: il Charge dà 2 mote gratis (versione 1.15.225)

### Round di debug del 15 ottobre, voce emersa su R33

- **Charge di Symphony**: "Charge: Create +2 more spaces" (p.178) era ignorato, quindi si potevano piazzare solo tanti
  mote quante blessing tolte → il campo Charge dell'abilità non veniva letto → ora la finestra "whose blessings?" ha
  una casella "Charge: +2 more motes". La casella è già spuntata se è il turno slow del personaggio (il charge scatta
  nel turno slow, p.94); si spunta a mano quando il charge viene da Songweave o da Blessing of Faith (p.176). Le 2
  caselle in più non costano blessing, perché il testo del Charge non ne nomina nessuna. Con il Charge funziona anche
  se nessuno ha blessing (0 tolte + 2 mote). La card in chat lo scrive. Solo codice.

## 17 ottobre 2026 — Il rimbalzo di Bifröst (PATH TO ERENHELION) (versione 1.15.224)

### Round di debug del 15 ottobre, voce emersa su R33

- **Rimbalzo di Bifröst**: con la mastery PATH TO ERENHELION, se la line di Bifröst finiva sulla casella di un
  oggetto, la seconda line 3 andava disegnata a mano → il testo "bounces if its end space lands in the space of an
  object, creating a second line 3 area" (p.226) non veniva letto → ora, quando l'ultima casella della line è su un
  token oggetto, compare la domanda "Bounce / No bounce". Con Bounce si disegna la seconda line 3 partendo da una
  casella accanto a quella finale, nella direzione scelta dal giocatore (il libro non dice quale; risposta di
  Edoardo). La seconda line entra nella stessa area: stesso danno e stesso terrain effect. Vale sia dal bottone area
  sia dal tiro. Solo codice.

## 17 ottobre 2026 — Elden Rune: +3 al range sulla runa e GREAT RUNE che frantuma (versione 1.15.223)

### Round di debug del 15 ottobre, voce emersa su R33

- **Elden Rune, range e GREAT RUNE**: il "+3 al range mentre stai sulla runa" e lo shatter di GREAT RUNE erano solo
  testo; in più lo sconto del Talent II e la scelta Arkenrune non comparivano mai → le regex del commit precedente
  cercavano "while"/"you" in minuscolo, ma il testo dell'abilità inizia con la maiuscola ("While standing…", "You can
  put…") → ora, stando sulla propria Elden Rune (o su un'Arkenrune di un alleato), un range elencato prende +3. Vale
  quando si piazza un'area (avviso a schermo), nel controllo di distanza del Mark e come nota nel dialogo d'attacco.
  Il range 0 (adiacente) e "nessun range massimo" non cambiano. Se GREAT RUNE (Infuse 3) è infusa quando si piazza la
  runa, normale o Arkenrune, la runa la conserva e l'infusione si consuma. Gli attacchi fatti stando in quella runa
  ricevono sulla card un bottone Shattered per il bersaglio principale, e il dialogo d'attacco lo segnala (p.209). Le
  tre scelte di Talent II / Arkenrune / teletrasporto sono confermate da Edoardo. Solo codice.

## 17 ottobre 2026 — applyDamagePipeline accetta danno pierce e divine (versione 1.15.222)

### Round di debug del 16 ottobre, voce emersa su R37

- **applyDamagePipeline e tipi di danno**: da macro non si poteva far ignorare armor o vigor → la funzione dell'API in
  `damage.mjs` non aveva le opzioni `pierce` / `divine` → aggiunte, con le stesse regole dell'Apply della card del
  danno (p.104): pierce salta l'armor del bersaglio e il Weakened di chi attacca; divine salta anche il dimezzamento
  da Cover / Resistance e il vigor non assorbe niente; il titolo della card dice "Piercing Damage" / "Divine Damage";
  senza le opzioni il comportamento è quello di prima. Solo codice.

## 17 ottobre 2026 — Blessing of Faith: True Strike solo su quell'abilità, niente status (versione 1.15.221)

### Round di debug del 15 ottobre, voce emersa su R1

- **Blessing of Faith e True Strike**: la card proponeva agli alleati un pulsante "Gain True Strike" come status → il
  parser leggeva "gain True Strike" come uno status che dura, ma p.176 dice "gain True Strike on that ability" e True
  Strike è il tag di un attacco (p.117) → quando un tag (True Strike, Unerring, Pierce) è seguito da "on that
  ability/attack" diventa un promemoria "True Strike on that ability (tick it in its attack dialog)" invece di un
  pulsante; la card del tratto non lo propone più. Solo codice.

## 17 ottobre 2026 — Burial Fist: il round 4 vale anche per il bonus damage (versione 1.15.220)

### Round di debug del 15 ottobre, voce emersa su R16

- **Burial Fist e bonus damage**: non era chiaro se il bonus damage di BURIAL FIST valesse sempre o solo dal round 4 →
  la frase di p.194 ("deals bonus damage and always triggers exceed effects at round 4 or later") mette la condizione
  in fondo a tutta la frase, e il manuale scrive allo stesso modo "At round 3+, deals bonus damage and …", dove il
  round vale per tutte e due le cose → il comportamento attuale è quello giusto (dado bonus ed Exceed insieme dal
  round 4) e la lettura è ora scritta nei commenti; prima del round 4 la casella resta spuntabile a mano. Solo un
  commento nel codice, nessun cambio di comportamento.

## 17 ottobre 2026 — Bend Fate non è più tra gli effetti che "scelgono il numero" del gamble (versione 1.15.219)

### Round di debug del 15 ottobre, voce emersa su R36

- **Bend Fate nel dialogo del gamble**: l'opzione "Set the number" diceva che Bend Fate permette di scegliere un
  numero qualsiasi → il tooltip lo metteva insieme a Silver Rabbit III e alla Golden Mask, ma p.199 dice di tirare un
  dado in più per ogni carta scartata e scegliere tra i risultati usciti → tolto dal tooltip e dai commenti; Bend Fate
  resta sul suo pulsante della card del gamble (p.199). Solo codice.

## 17 ottobre 2026 — Bottoni "when targeted" anche sulle abilità che non attaccano; chi è solo nell'area non è "targeted" (versione 1.15.218)

### Round di debug del 15 ottobre, voce emersa su R35

- **Interrupt "when targeted" senza attacco**: sotto lo Show in Chat di un'abilità che non è un attacco non
  comparivano i bottoni degli interrupt con trigger "targeted by an ability" → la card non salvava i bersagli → ora
  salva i personaggi scelti come bersaglio (escluso chi usa l'abilità), perché "Abilities may specify targets: Self,
  Ally, Foe…" vale anche per le abilità che non attaccano (p.91-92). Per le aree il manuale distingue: l'effetto
  d'area colpisce chi è nell'area senza prenderlo di mira ("Abilities that affect or target a space, such as the area
  effect of an AoE", p.107; Stealth "cannot be targeted directly … but could still be hit by an area effect", p.109).
  Negli attacchi ad area quindi è "targeted" solo chi sta nell'attack space (p.97), come già succedeva. Nelle abilità
  ad area che non attaccano, con l'area sulla mappa, è "targeted" solo il personaggio al centro di un Burst ("Affects
  a targeted space or character", p.97) o di un blast centrato su un bersaglio. Solo codice.

## 17 ottobre 2026 — Le abilità a costo Interrupt spendono un uso quando vengono usate davvero (versione 1.15.217)

### Round di debug del 15 ottobre, voce emersa su R35

- **Abilità a costo "Interrupt N"**: lanciare dalla scheda un'abilità con costo Interrupt (Attack Roll, Auto-Hit,
  Damage Roll) non toglieva nessun uso, mentre i bottoni nelle card di chat lo toglievano → la scheda non controllava
  gli usi di queste abilità → ora Attack Roll, Auto-Hit e Damage Roll spendono un uso. Se il personaggio è Stunned
  ("Can't take interrupts", p.117) o non ha più usi, il tiro non parte. Show in Chat resta gratis: mostra soltanto
  (scelta di Edoardo). "Only one interrupt during any turn" (p.91): nello stesso turno di combattimento l'attacco e il
  suo danno, oppure il bottone interrupt della card e il tiro che segue, contano come un uso solo. Fuori combattimento
  il danno che segue l'attacco (o il bottone della card) conta come lo stesso uso. Solo codice.

## 17 ottobre 2026 — "X damage, twice" sul tiro salvezza: un solo tiro (versione 1.15.216)

### Round di debug del 16 ottobre, voce emersa su R40

- **Danno ripetuto dopo un tiro salvezza**: con "X damage, twice" uscivano due card, ognuna con il suo tiro di [D] →
  `postSaveDamage` postava una card per ogni ripetizione → ora esce una sola card che tira [D] una volta e applica il
  totale più volte separate (p.92: "roll [D] once, then apply the total damage … separate times"), tramite
  `instances`. Il conteggio "per minion, up to N times" resta e si moltiplica per le ripetizioni (al massimo 10). Solo
  codice.

## 17 ottobre 2026 — Il danno dopo un tiro salvezza tiene conto di Weakened (versione 1.15.215)

### Round di debug del 16 ottobre, voce emersa su R40

- **Danno del tiro salvezza con attaccante Weakened**: chi è Weakened faceva danno pieno con i danni legati al tiro
  salvezza (p.104: "All damage dealt reduced by 2") → `postSaveDamage` non passava `weakened` alla card del danno,
  mentre le sheet lo passano → ora si legge lo status Weakened di chi agisce e si toglie 2. Il danno piercing e divine
  continua a ignorarlo (p.104). Solo codice.

## 17 ottobre 2026 — La card dell'attacco mostra anche Effect, Collide, Charge, Heroic, Area; la finestra del danno propone il Collide e Izuna Drop (versione 1.15.214)

### Round di debug del 15 ottobre, voce emersa su R16

- **Blocchi sulla card dell'attacco**: la card mostrava solo Hit / Miss / Exceed / Crit e le righe del talento, quindi
  mancavano Effect, Special, Collide, Charge, Heroic e Area (Gigaton Whip: "They take fray damage", p.137) → la card
  usava solo quei quattro campi → ora riporta anche le altre righe dell'abilità, nell'ordine di lettura. Quelle
  scritte prima dell'attacco vanno sopra Hit, le altre sotto Miss. Una riga condivisa con l'Exceed ("Exceed or
  Heroic") tiene solo l'altra etichetta. Le righe della combo e della versione Infuse non vengono ripetute, le
  versioni Infuse non armate restano fuori, e con Izuna Drop sbloccata il Collide normale lascia il posto alla
  mastery. Nella finestra del danno, sotto "Other", c'è ora il danno del Collide ("Collide · fray"); con Izuna Drop
  c'è solo "Collide — Izuna Drop · fray ×2". La card "Show in Chat" è un messaggio separato e non si tocca. Solo
  codice.

## 17 ottobre 2026 — Blood Festival, Burial Fist e Aether Shot: il bonus damage arriva alla card e alla finestra del danno (versione 1.15.213)

### Round di debug del 15 ottobre, voce emersa su R16

- **Resto di Blood Festival**: "increase all its teleports by +2, it deals bonus damage" (p.192) e il bonus damage di
  Burial Fist (p.194) non arrivavano né alla card né alla finestra del danno → la casella Exceed portava con sé solo
  l'Exceed → ora, se la casella è spuntata, la card dell'attacco ha un blocco "<nome> (this use)" con tutta la frase
  (teletrasporti +2 compresi). La finestra del danno dello stesso uso (stesso turno di combattimento) si apre con 1
  dado bonus per ogni fonte e un'etichetta che le nomina. Vale anche per Aether Shot ("deals bonus damage and triggers
  all exceed effects", p.155). Solo codice.

## 17 ottobre 2026 — Tutto quello che "fa scattare l'Exceed" ha la sua casella nella finestra dell'attacco (versione 1.15.212)

### Round di debug del 15 ottobre, voce emersa su R16

- **Exceed fuori dalle mastery**: oltre a Blood Festival e Burial Fist, nessun'altra frase "triggers all exceed
  effects" arrivava alla finestra dell'attacco. L'unica via era la casella "Exceed on" messa a mano → la ricerca
  leggeva solo il testo della mastery → ora legge anche il testo dell'abilità e il suo talento scelto (Special di Open
  the Gates "the first time it is used in combat", p.194; area di Soul Shot "two or more allies", p.158), i tratti del
  personaggio (Pulverize p.135, Aether Shot p.155, Blessing of War p.191) e i ranghi sbloccati delle reliquie
  (Arenheir II e Paleblood I, p.252). Ogni fonte ha una casella col suo nome. È già spuntata quando la condizione si
  può leggere: primo uso nel combattimento, round N o successivi, round 3 e 6, 2+ livelli più in alto del bersaglio,
  bersaglio al 25% degli HP o meno. Altrimenti resta vuota e mostra la frase come promemoria. Le frasi "your next
  attack…" (stance, abilità di fine turno) restano fuori. Con la combo armata si legge il testo della combo al posto
  della base. Solo codice.

## 17 ottobre 2026 — Mote of life senza blessing: diventa un terrain effect (versione 1.15.211)

### Round di debug del 16 ottobre, voce emersa su R49

- **Mote of life senza blessing**: quando la mote perdeva la blessing non succedeva niente → nessun codice guardava la
  rimozione del suo status Blessed → ora, quando lo status Blessed viene tolto a un token che si chiama "Mote of
  life", il GM attivo manda una card con il bottone "Becomes a terrain effect". Il clic crea un terrain effect sulla
  casella della mote, dove gli alleati che ci stanno dentro ricevono l'offerta di regeneration (con il bottone per
  toglierla quando escono), e rimuove il token della mote (RECYCLE, p.187). Solo codice.

## 17 ottobre 2026 — Pit tolto sotto un nemico marchiato da Deepwrath: card per togliere Shattered (versione 1.15.210)

### Round di debug del 15 ottobre, voce emersa su R33

- **Deepwrath Talent II, pit cancellato**: se si cancellava un pit mentre un nemico marchiato ci stava sopra, non
  arrivava la card per togliere Shattered+ → il controllo partiva solo quando il token si muoveva o quando un pit
  veniva creato → ora, quando un pit viene cancellato (bottone Remove o Canc sulla mappa), il GM attivo manda la card
  con "Remove Shattered" a chi era dentro (p.235). Solo codice.

## 17 ottobre 2026 — Lo shove di Implode bloccato segnala la collisione (versione 1.15.209)

### Round di debug del 15 ottobre, voce emersa su R33

- **Collisione nello shove di Implode**: quando lo shove si fermava contro un ostacolo, il token si fermava e basta →
  `shoveTowardsCell` non diceva cosa l'aveva fermato → ora restituisce l'ostacolo (un personaggio, un oggetto o un
  muro) e la card dice "X collides with Y and stops (p.117)". Se l'abilità ha un effetto Collide, la card ne mostra il
  testo (Collide p.95 e p.102: scatta una volta sola per abilità). Anche uno shove di 0 caselle contro un ostacolo ora
  ha la sua card, invece del solo avviso. Solo codice.

## 17 ottobre 2026 — Implode su un personaggio: bottoni Shove verso di lui (versione 1.15.208)

### Round di debug del 15 ottobre, voce emersa su R33

- **Shove di WAKING VOID**: con Implode usato su un personaggio (WAKING VOID, p.211) veniva piazzata la Large Blast,
  ma lo shove "as close as possible towards it" restava da fare a mano → `implodeOnHolder` piazzava solo l'area → ora,
  dopo la blast, arriva una card con un bottone "Shove <nome>" per ogni personaggio nell'area, verso la casella del
  personaggio. Il personaggio al centro non viene spinto. I bottoni sono gli stessi dell'Implode su una casella. Solo
  codice.

## 17 ottobre 2026 — Un'area che si allarga offre gli status a chi sta nelle caselle nuove (versione 1.15.207)

### Round di debug del 15 ottobre, voce emersa su R33

- **Area che cresce sopra i personaggi**: quando un'area si allargava ("Add 2 spaces" di Bifröst Talent II,
  l'estensione di Ätherwand Talent I, "Area +N" di Blood Grove), chi stava nelle caselle nuove non riceveva l'offerta
  degli status "mentre sei dentro" → `extendAreaTemplate` aggiornava solo le caselle, senza controllare chi c'era
  sopra → ora, dopo l'allargamento, parte lo stesso controllo usato quando l'area si sposta (`offerInsideOnShift`).
  Vale anche per la tromba d'acqua che diventa una blast con HURRICANE (p.235). Solo codice.

## 17 ottobre 2026 — Aether Deflection dà la resistenza sulla card del danno (versione 1.15.206)

### Round di debug del 15 ottobre, voce emersa su R35

- **Aether Deflection sul danno**: "Gain resistance against damage from that ability" (Spellblade, p.224) restava solo
  testo → l'interrupt si usa dalla card d'attacco, quando la card del danno non esiste ancora → quando lo si usa, la
  resistenza resta in attesa sul personaggio. La card del danno che quella stessa abilità posta subito dopo la scrive
  sulla riga del personaggio: chip della resistenza e danno dimezzato su Apply, come Righteous Disdain. Vale solo per
  l'ultima card d'attacco di quell'abilità: un'attesa rimasta da un attacco vecchio non conta, e chi crea la card la
  cancella. Solo codice.

## 17 ottobre 2026 — Chip vigor anche per "gain vigor N" (versione 1.15.205)

### Round di debug del 15 ottobre, voce emersa su R35

- **"Gain vigor 4" senza chip**: l'Heroic di Righteous Disdain ("Gain vigor 4 after this ability resolves", p.128) non
  aveva la chip promemoria del vigor → `NOTE_VIGOR_RE` leggeva solo "gain 4 vigor" → ora legge anche l'ordine "gain
  vigor N", che è usato anche altrove nel manuale (es. "allies gain vigor 3"). Solo codice.

## 17 ottobre 2026 — Niente interrupt dalla scheda se Stunned (versione 1.15.204)

### Round di debug del 15 ottobre, voce emersa su R35

- **Interrupt da Stunned**: dalla scheda il bottone chat di un interrupt postava e spendeva un uso anche con il
  personaggio Stunned → il controllo dello Stunned c'era solo sul bottone della card del danno → ora i bottoni chat
  degli interrupt delle schede PG, foe e legend si rifiutano con l'avviso "is Stunned and can't take interrupts"
  (Stunned: "Can't take interrupts", p.117). Solo codice.

## 17 ottobre 2026 — Usi degli interrupt sulle schede di foe e legend (versione 1.15.203)

### Round di debug del 15 ottobre, voce emersa su R35

- **Usi degli interrupt di foe e legend**: le schede di foe e legend mostravano solo il limite ("/ turn") e non quanti
  usi restavano, e il bottone chat dell'interrupt postava senza spendere niente → l'azione `tickInterrupt` esisteva ma
  nessun template la usava, e il bottone chat non contava gli usi → sotto ogni interrupt ora ci sono le caselline
  degli usi rimasti, con lo stesso aspetto della scheda PG e lo stesso flag `interruptUses` che spendono i bottoni
  della card del danno e della card d'attacco. Un clic su una casella accesa spende fino a lì, uno su una spenta ridà
  gli usi. Il bottone chat spende un uso e si rifiuta con 0 usi rimasti. Anche la scheda del legend ora ha il bottone
  chat degli interrupt (prima c'era solo l'azione, senza bottone). Gli usi tornano all'inizio del turno del foe e
  all'inizio del round per il legend (p.292). Solo codice.

## 17 ottobre 2026 — Assault Wave chiede quanti minion contano (versione 1.15.202)

### Round di debug del 16 ottobre, voce emersa su R40

- **Assault Wave conta i minion**: "3 piercing damage per minion in the area, up to a maximum of six times, or just 1
  piercing damage per minion on a successful save" (p.312) postava una sola card da 3 (o da 1) → `_dmgChunk` non
  leggeva né il "per minion" né il tetto "up to a maximum of six times" (e un "up to a maximum of four times" sarebbe
  stato preso come "quattro volte fisse") → ora `_dmgChunk` salva cosa si conta (`per`) e il tetto (`maxTimes`), e
  `postSaveDamage` chiede "quante volte" prima di tirare (al massimo il tetto) e posta una card con quel numero di
  istanze, ognuna applicata per conto suo (p.92). Con 0 non c'è danno. Sul tiro riuscito il tetto non c'è, perché il
  manuale lo scrive solo per il tiro fallito. Solo codice.

## 17 ottobre 2026 — Il danno dei tiri salvezza tiene il tipo piercing / divine (versione 1.15.201)

### Round di debug del 16 ottobre, voce emersa su R40

- **Danno dei tiri salvezza piercing/divine**: Assault Wave e le altre abilità con "must save or take 3 piercing
  damage" postavano una card di danno normale, così l'Apply toglieva l'armatura anche se il testo dice piercing
  (p.104) → `_dmgChunk` leggeva la quantità ma non il tipo, e `postSaveDamage` non passava `pierce` / `divine` alla
  card → ora `_dmgChunk` legge il tipo ("3 piercing damage", "[D]+fray piercing damage", "divine fray damage") e
  `postSaveDamage` lo passa alla card. Se il ramo del tiro riuscito è scritto corto ("2 piercing damage, or 1 on a
  successful save"), prende lo stesso tipo. L'etichetta del bottone mostra il tipo. Solo codice.

## 17 ottobre 2026 — Foretell dal mazzo con la mano vuota (versione 1.15.200)

### Round di debug del 15 ottobre, voce emersa su R36

- **Foretell con la mano vuota**: senza carte in mano non c'era modo di fare Foretell → il bottone Foretell sta solo
  sulle carte della mano, mentre il manuale dice "If you have no cards in hand, draw the top card of your deck
  instead, apply its effects, then discard it" (p.199) → una mano vuota ora mostra il bottone "Foretell from the
  deck": prende una carta dal mazzo del Seer, la mette direttamente nella sua pila degli scarti e pubblica in chat la
  card della Great Wheel con i suoi effetti. Se il mazzo è finito, prima rimescola la pila degli scarti nel mazzo. La
  carta è presa a caso, come le pescate di Skein, perché il mazzo è mescolato. Solo codice.

## 17 ottobre 2026 — Foretell scarta nella pila del proprio Seer (versione 1.15.199)

### Round di debug del 15 ottobre, voce emersa su R36

- **Foretell scarta nella pila giusta**: con due Seer al tavolo, la carta giocata col bottone Foretell finiva sempre
  nella pila "Discard" comune e gli scarti dei due Seer si mescolavano → il bottone cercava solo la pila chiamata
  "Discard" e non guardava di chi fosse la mano → ora capisce di quale Seer è la mano e usa la sua pila (quella col
  nome del personaggio, altrimenti "Discard"), la stessa che usano le pescate di Skein e Bend Fate (p.199). Solo
  codice.

## 17 ottobre 2026 — Il bottone Mark controlla il range (versione 1.15.198)

### Round di debug del 15 ottobre, voce emersa su R33

- **Range sul bottone Mark**: il bottone Mark delle schede PG, foe e legend marcava anche un bersaglio lontanissimo →
  il controllo del range c'era solo sul chip "On a character" → ora il bottone usa lo stesso controllo: prende il
  range dal tag dell'abilità o, se manca, dal testo ("Mark a character in range 6", Deepwrath p.235). Oltre quel range
  chiede "Put it on … anyway?", con Cancel come scelta predefinita (come il chip). Vale anche per Polaris Talent I e
  Amico. Solo codice.

## 17 ottobre 2026 — Elden Rune: teletrasporto, infuse ridotto e Arkenrune sulla mappa (versione 1.15.197)

### Round di debug del 15 ottobre, voce emersa su R33

- **Elden Rune Talent I / II e ARKENRUNE**: il teletrasporto di 3, l'infuse ridotto e l'Arkenrune (p.209) erano solo
  testo → nessuna parte del codice li leggeva → ora: con il Talent I la scheda ha il chip "Teleport to Elden Rune". Si
  clicca una delle proprie rune libere entro 3 caselle e il token ci viene messo, con una card. Con il Talent II,
  mentre si sta in una propria rune (o nell'Arkenrune di un alleato), il costo di un Infuse con numero scende di 1,
  mai sotto 1, e la card dell'infuse lo scrive. Con la mastery sbloccata, quando si piazza la rune si sceglie fra
  Elden Rune e Arkenrune. L'Arkenrune copre uno small blast attorno alla casella sotto di sé, ne esiste una sola (la
  precedente viene tolta) e non manda il promemoria "scrub out" quando un foe ci entra. Solo codice.

## 17 ottobre 2026 — I talenti di Deepwrath funzionano dentro i pit (versione 1.15.196)

### Round di debug del 15 ottobre, voce emersa su R33

- **Deepwrath Talent I / II nei pit**: il +1 boon ai tiri salvezza, il niente vantaggio di altezza, il bonus damage e
  lo shattered+ "while inside pits" (p.235) erano solo testo → il codice non sapeva chi è marcato e sta in un pit →
  ora c'è un controllo unico (stessa lettura del pit della finestra di tiro: a terra, su una casella pit). Un alleato
  marcato in un pit prende +1 boon su ogni tiro salvezza (finestra Save, salvezze di fine turno, salvezze contro gli
  status). Un nemico che lo attacca dall'alto non prende boon di altezza, e una nota lo dice. Contro un nemico marcato
  in un pit la finestra del danno parte con +1 dado bonus (p.92) e una nota. Quando quel nemico entra in un pit (si
  muove, o un pit viene creato sotto di lui) arriva una card col bottone Shattered+; quando esce, una card col bottone
  per toglierlo. Solo codice.

## 17 ottobre 2026 — Interrupt "when targeted" sulla card dell'attacco (versione 1.15.195)

### Round di debug del 15 ottobre, voce emersa su R35

- **Interrupt "when targeted" sulla card d'attacco**: Aether Deflection (Spellblade, p.224), l'Heroic Intervention di
  Endless Battlement (p.122) e i foe "is targeted by an attack" non avevano un bottone → i bottoni di R35 c'erano solo
  sulla card del danno e leggevano solo trigger di danno → ora la card dell'attacco salva chi è stato preso di mira.
  Vale per l'attacco tirato (PG, foe, legend, summon) e per la card auto-hit dei PG. Sotto la card, per ogni
  bersaglio, compaiono gli interrupt il cui trigger è "essere preso di mira", per i personaggi che l'utente gioca.
  Sono gli stessi bottoni della card del danno: spendono un uso e postano Trigger ed Effect. Il sistema ora legge
  anche i tratti che sono interrupt. Aether Deflection conta il suo uso per combattimento, e "spend 2 Aether to regain
  it" lo restituisce. Solo codice.

## 17 ottobre 2026 — Implode: shove guidato verso il centro (versione 1.15.194)

### Round di debug del 15 ottobre, voce emersa su R33

- **Implode, shove verso il centro**: "shoving all characters … as close as possible towards it … in any order you
  like" (p.211) era solo testo sulla card → nessun bottone faceva lo shove → ora la card di attivazione ha un bottone
  "Shove <nome>" per ogni personaggio nella Large Blast (non per chi sta già nella casella centrale). Ogni clic sposta
  quel token in linea retta verso il centro (p.107 "Characters must be shoved in straight lines"), una casella alla
  volta finché si avvicina; lo fermano un altro personaggio, un oggetto o un muro. L'ordine è quello dei clic. Solo il
  GM o il proprietario di chi ha usato Implode; per un token che non è suo, il giocatore riceve "ask the GM to click",
  come per il Drag under di Deepwrath. Solo codice.

## 17 ottobre 2026 — Ätherwand: shattered a fine turno dentro l'area (versione 1.15.193)

### Round di debug del 15 ottobre, voce emersa su R33

- **Ätherwand, "Foes that end their turn in the area are shattered"**: a fine turno non c'era nessun promemoria
  (p.226) → la frase non era fra le regole di fine turno delle aree → ora un foe che finisce il turno dentro un'area
  Ätherwand (di chiunque) trova nella card "End of … turn — areas" il bottone "Shattered to <nome>", come per River
  Guardians. Niente viene dato senza clic, e se il foe è già shattered il bottone non c'è. Solo codice.

## 17 ottobre 2026 — Mist Strider Talent II: evasion per i foe dentro la nuvola (versione 1.15.192)

### Round di debug del 15 ottobre, voce emersa su R33

- **Mist Strider Talent II**: "Foes in the area count all characters as having evasion" (p.169) non aveva nessun
  promemoria → la frase non era fra le regole "per chi sta dentro" lette dall'area → ora è riconosciuta: quando la
  nuvola si piazza o un foe ci entra, la card lo scrive, e il dialog d'attacco di un foe che sta dentro la nuvola
  spunta "Defender has evasion" su tutti i bersagli, con una chip "Inside Mist Strider: all characters count as having
  evasion" (le caselle si possono ancora togliere a mano). Vale per le nuvole piazzate dopo l'aggiornamento. Solo
  codice.

## 17 ottobre 2026 — Area spostata sopra i personaggi: offerta degli status (versione 1.15.191)

### Round di debug del 15 ottobre, voce emersa su R33

- **Area spostata sopra i personaggi**: quando un'area terrain effect si muoveva (Tsunami p.233, Waterspout p.235,
  Shift + frecce), chi ci finiva dentro o ne usciva non riceveva l'offerta degli status (blinded+ di Mist Strider
  p.169, cover di Dark Wing p.171…) → il controllo partiva solo quando si muoveva il token o si piazzava l'area → ora
  `moveArea` confronta le caselle di prima e di dopo e manda una card con i bottoni: status a chi ora è coperto
  dall'area, "Remove" a chi è rimasto fuori. Le regole "uscendo / entrando" (stealth di Quench p.157, Mist Strider
  Talent I) non scattano, perché il personaggio non si è mosso. Solo codice.

## 17 ottobre 2026 — Izuna Drop sulla card dell'attacco di Gigaton Whip (versione 1.15.190)

### Round di debug del 15 ottobre, voce emersa su R16

- **Izuna Drop al posto del Collide**: con la mastery IZUNA DROP sbloccata la card dell'attacco di Gigaton Whip non
  diceva che il Collide era cambiato → la card dell'attacco non mostra il blocco Collide e la mastery non ci entrava →
  ora una mastery che dice "Instead of the normal collide effect" (p.137) va sulla card in un blocco "Collide — Izuna
  Drop (Mastery, replaces the normal collide)" con il suo testo. Solo codice.

## 17 ottobre 2026 — Blood Festival e Burial Fist fanno scattare l'Exceed (versione 1.15.189)

### Round di debug del 15 ottobre, voce emersa su R16

- **Mastery che fanno scattare l'Exceed**: con BLOOD FESTIVAL (Matsuri, p.192) o BURIAL FIST (Open the Gates, p.194)
  sbloccate, la card dell'attacco mostrava l'Exceed solo con un totale di 15+ → la card guardava solo il totale del
  tiro e non la mastery → ora la finestra dell'attacco ha una casella con il nome della mastery. Per Blood Festival è
  già spuntata al primo uso nel combattimento e si può togliere, perché il libro dice "you may". Per Burial Fist è
  spuntata dal round 4. Con la casella spuntata la card mostra il blocco "Exceed (BLOOD FESTIVAL)" anche sotto 15, e i
  bottoni degli status dell'Exceed si accendono. Solo codice.

## 17 ottobre 2026 — Pierce degli Aethershard ridà il weakened (versione 1.15.188)

### Round di debug del 15 ottobre, voce emersa su R33

- **Pierce degli shard e weakened**: con l'attaccante weakened, il bersaglio vicino a un Aethershard (Talent II,
  p.210) prendeva comunque il −2 → il weakened viene tolto dal totale quando la card nasce, e il pierce degli shard si
  decide solo all'Apply, per bersaglio → ora la card si segna quanto ha tolto il weakened. All'Apply, un bersaglio che
  il danno trafigge solo grazie allo shard riprende quel valore, perché il pierce "cannot be reduced by armor or
  weakened" (p.104). La chip "Pierce (Aethershard) +2" lo dice. Solo codice.

## 17 ottobre 2026 — Great Soul Bond usabile dalla card del danno (versione 1.15.187)

### Round di debug del 15 ottobre, voce emersa su R35

- **Great Soul Bond**: la mastery di Blazing Bond ("the other can reduce themselves to 1 hp to grant that ally
  immunity to all damage from the triggering ability. The bond then snaps, ending this mark", p.210) non aveva bottone
  → non è un interrupt con trigger, quindi la lettura degli interrupt non la trovava → ora, con la mastery sbloccata e
  il mark attivo, la card del danno mostra il bottone "Great Soul Bond" sotto la riga del partner colpito. Lo vede chi
  gioca l'altro partner. Premuto: l'altro partner scende a 1 HP, il colpito diventa immune a quel danno (stesso flag
  `immune` di Grace of the Spirits), il mark finisce e in chat compare una card. Se il danno lo porterebbe davvero
  sotto 1 HP lo decide il tavolo. Solo codice.

## 17 ottobre 2026 — Righteous Disdain: bottone per il vigor del Heroic (versione 1.15.186)

### Round di debug del 15 ottobre, voce emersa su R35

- **Heroic di Righteous Disdain**: "Heroic: Gain vigor 4 after this ability resolves" (p.128) restava solo come testo
  sulla card dell'interrupt postata dalla card del danno → nessun codice leggeva le righe "gain vigor N" / "gain N
  vigor" della card → ora la card postata ha un bottone "Heroic: gain 4 vigor". Solo chi possiede il personaggio può
  premerlo, e solo una volta per card (resta premuto anche dopo un reload). Il vigor non supera la VIT, come nel
  Recover. Solo codice.

## 17 ottobre 2026 — Symphony toglie davvero le blessing (versione 1.15.185)

### Round di debug del 15 ottobre, voce emersa su R33

- **Symphony: mote senza togliere le blessing**: il chip Mote faceva piazzare fino a 4 mote senza togliere nessuna
  blessing, mentre il libro dice "Remove up to four blessings from characters anywhere to create pulsing motes"
  (p.178) → il testo veniva letto solo come "fino a quattro" → ora il chip chiede prima di chi togliere le blessing e
  quante. L'elenco mostra tutti i personaggi che ne hanno: attori del mondo e token non collegati della scena, massimo
  4 in tutto. Poi si piazza una mote per ogni blessing tolta. Le blessing vengono tolte dopo il piazzamento, tante
  quante le mote messe. Per i personaggi che il giocatore non possiede passano dal GM, e ogni perdita ha la sua riga
  in chat. Solo codice.

## 17 ottobre 2026 — Mote attraversata: l'esplosione va sulla mote (versione 1.15.184)

### Round di debug del 15 ottobre, voce emersa su R33

- **Mote di Symphony attraversata**: se un personaggio passava sopra una mote senza fermarsi, la Small Blast "centered
  on them" (p.178) veniva piazzata dove il token aveva finito il movimento → il pulsante Detonate usava sempre la
  casella attuale del token → ora, se la mote è stata solo attraversata, la blast è centrata sulla casella della mote
  (dove si trovava il personaggio quando ci è entrato). La card lo dice, e il pit sotto un foe va lì. Se il
  personaggio si ferma sulla mote, o inizia lì il turno, tutto funziona come prima. Solo codice.

## 17 ottobre 2026 — HARVEST MOON riconosce la mote of life (versione 1.15.183)

### Round di debug del 16 ottobre, voce emersa su R49

- **Mote of life ignorata da HARVEST MOON**: le esplosioni delle piante di HARVEST MOON (p.186) non vedevano la mote
  of life di Dark Sliver (RECYCLE, p.187: "A mote of life is a plant") → come piante venivano riconosciute solo le
  Plant del pack summons e i Megamushroom, e la mote non ha una voce sua → ora conta come pianta anche un token che si
  chiama "Mote of life" (nome del token o dell'attore). Anche il messaggio "nessuna pianta" lo dice. Solo codice.

## 17 ottobre 2026 — La blast del Rampant Nail segue lo spuntone (versione 1.15.182)

### Round di debug del 16 ottobre, voce emersa su R49

- **Rampant Nail, blast che resta indietro**: se si spostava lo spuntone con Shift + frecce, la Small Blast pericolosa
  del Talent I ("a small blast area centered on the nail is dangerous terrain", p.227) restava dov'era → lo
  spostamento muoveva solo l'area su cui stava il mouse, e la blast è un'area a parte → ora, quando si sposta lo
  spuntone, la blast collegata si sposta delle stesse caselle. Se si preme Shift + freccia sopra la blast, si sposta
  lo spuntone e la blast va con lui. Solo codice.

## 17 ottobre 2026 — Bend Fate dalla card del gamble (versione 1.15.181)

### Round di debug del 15 ottobre, voce emersa su R36

- **Bend Fate**: dopo un gamble il Seer doveva scartare a mano, tirare i dadi in più e ricordarsi che può scegliere
  qualunque risultato → la card del gamble non conosceva Bend Fate (p.199) → ora, dopo un gamble tirato davvero (non
  con Stacked Die né con il numero scelto), un Seer con carte in mano trova il bottone *Bend Fate*. Il giocatore
  sceglie quante e quali carte scartare (vanno negli scarti), si tira 1d6 per carta, e una nuova card mostra tutti i
  dadi fin qui (quelli nuovi tratteggiati) con la riga della tabella 1-6 di ogni risultato. Il giocatore ne sceglie
  uno qualunque. La nuova card ha di nuovo il bottone, così si può scartare ancora dopo aver visto i dadi. Solo
  codice.

## 17 ottobre 2026 — Il mazzo del Seer durante il combattimento: pesca fino a 5, Skein, limite di 7, rimescolare (versione 1.15.180)

### Round di debug del 15 ottobre, voce emersa su R36

- **Wheel of Fate e Skein**: a inizio combattimento, a ogni turno del Seer e quando il mazzo finiva, pescate e scarti
  erano tutti a mano con i Cards di Foundry → il sistema non conosceva le regole del mazzo (p.199) → ora il GM attivo
  pubblica in chat una card a inizio combattimento ("pesca fino a 5 se ne hai meno", bottone *Draw up to 5*, assente
  se la mano ne ha già 5), una a inizio turno (Skein, bottone *Draw 1*) e una a fine turno (bottone *Didn't attack:
  draw 1* e, se la mano ha 7 carte o più, *Discard down to 7*, che fa scegliere esattamente le carte in più e le manda
  negli scarti). Quando il mazzo è vuoto, la pesca rimette prima nel mazzo le carte degli scarti venute da quel mazzo
  e lo mescola, poi continua; la card in chat lo dice. Solo il proprietario del Seer può cliccare, e ogni bottone si
  usa una volta sola. La mano è quella col nome del personaggio, oppure l'unica che il suo giocatore possiede, oppure
  l'unica che esiste. Il mazzo è quello da cui vengono le carte della mano o degli scarti, oppure quello col nome del
  personaggio, oppure l'unico mazzo. Gli scarti sono la pila col nome del personaggio, oppure quella chiamata
  "Discard". Solo codice.

## 17 ottobre 2026 — Elenchi puntati nella scheda del Summon di un foe (versione 1.15.179)

### Round di debug del 15 ottobre, voce emersa su R12

- **Elenchi "•" nel Summon trascinato da un foe**: dopo aver trascinato il chip di un summon di un foe sulla mappa,
  sulla scheda del Summon le regole con l'elenco "•" restavano tutte su una riga → `foe-summons.mjs` copia `sm.rules`
  così com'è in `system.summonEffect`, e `SummonSheet` lo passava a `enrichHTML` senza `summonRulesHTML` → ora la
  scheda passa il testo da `summonRulesHTML` prima di arricchirlo, come fa la scheda del foe. Il testo salvato non
  cambia, quindi si sistemano anche i summon già sulla mappa. Solo codice.

## 17 ottobre 2026 — Usi degli interrupt dei PG sulla scheda, e il bottone chat ne spende uno (versione 1.15.178)

### Round di debug del 15 ottobre, voce emersa su R35

- **Usi degli interrupt dei PG**: la scheda PG non mostrava quanti usi restavano agli interrupt (li contavano solo i
  bottoni della card del danno), e il bottone "posta in chat" dell'interrupt dentro un'abilità (R61) non ne spendeva
  uno → la scheda non leggeva il flag `interruptUses` / `interruptBank` → ora nell'anteprima di ogni abilità c'è una
  riga per ciascun suo interrupt (il costo "Interrupt N" dell'abilità, quello che concede nel testo, quello della
  maestria), con "usi rimasti/massimo" e caselline da cliccare. Il bottone chat dell'interrupt concesso spende un uso,
  e se gli usi sono finiti avvisa e non posta. Gli usi tornano a inizio turno come prima ("Usable X times per round",
  p.85). Solo codice.

## 17 ottobre 2026 — La × e il badge combo tornano sui riquadri delle abilità (versione 1.15.177)

### Round di debug del 15 ottobre, voce emersa su R5

- **× e combo sui riquadri pieni**: sui riquadri delle abilità equipaggiate non compariva mai la × per togliere
  l'abilità, e il badge combo (fulmine) non si accendeva con il gettone combo attivo → dentro il blocco `{{#with}}`
  del riquadro, `../isEditable`, `../abilitiesLocked` e `../comboActive` puntavano al numero del riquadro invece che
  alla scheda → ora li legge con `@root.` (`templates/actor/icon-combat.hbs`). Solo codice.

## 17 ottobre 2026 — Le caselle di terreno guardano anche gli spazi attraversati (versione 1.15.176)

### Round di debug del 15 ottobre, R33b2

- **Movimento attraversato**: passare sopra un dangerous, una mote / mine o un difficult senza fermarsi non faceva
  nulla → `offerTerrainOnMove` guardava solo la casella di partenza e quella di arrivo → ora legge il percorso con il
  lettore dei waypoint degli oggetti (`movePath` di `map-objects.mjs`, ora esportato, nessuna seconda versione): una
  casella solo attraversata conta come entrata e uscita (domanda dei 2 danni, sempre una volta a turno; promemoria
  "passes through" con Detonate; avviso del difficult). I teletrasporti (blink / displace) e gli spostamenti fatti dal
  codice non attraversano nulla. Gli status "inside" delle aree restano legati solo a entrata e uscita vere. Solo
  codice.

## 17 ottobre 2026 — Rune a fine scena, Flash Step, Bio e Terraforming sul terreno (versione 1.15.175)

### Round di debug del 15 ottobre, R33b2

- **Elden Rune / Flash Step / Bio / Terraforming**: rune che restavano, afterimage senza Flash Step e terreno da
  convertire o togliere a mano → nessun codice per questi testi → quando il combat finisce il GM riceve una card con
  "Remove all" per le caselle che "lasts until the end of the scene" (p.209); la card dell'afterimage ha "Flash Step"
  (p.129: si clicca un afterimage libero, sparisce e il token va lì); Bio ha i chip "To dangerous" (Talent I) e "Boil"
  (Talent II, 2 piercing a chi è dentro o accanto al dangerous, p.218); Terraforming ha "Clear terrain" (si cliccano
  le caselle difficult o dangerous nell'area e vengono tolte, p.219). Tutto chiede conferma prima. Solo codice.

## 17 ottobre 2026 — Il pit conta come un livello più in basso (versione 1.15.174)

### Round di debug del 15 ottobre, R33b2

- **Pit / difficult**: un personaggio in un pit valeva la stessa altezza degli altri → l'altezza veniva letta solo
  dall'elevazione del token → nel dialog del tiro, chi sta a terra in un pit conta 1 più in basso ("Pits count as one
  level lower of elevation", p.89) per boon e curse d'altezza, senza toccare il token; chi esce da terreno difficile
  vede l'avviso "+1 space of movement" (p.89), che il sistema non conta. Solo codice.

## 17 ottobre 2026 — Polaris e Implode si attivano dalle card (versione 1.15.173)

### Round di debug del 15 ottobre, R33b2

- **Polaris / Implode**: il gamble di Polaris e l'attivazione di Implode erano a mano → nessuna card a fine o a inizio
  turno → a fine di ogni turno non del creatore esce una card sussurrata con "Gamble": tira il dado e fa esplodere un
  meteor su ogni casella Polaris, compresa quella su un personaggio (Talent I), Small / Medium / Large Blast secondo
  quante sono, danno = risultato +2 o +4 con tre (p.202), poi i bottoni per il danno, lo stun dei centri e il Talent
  II, e tutte le caselle vengono tolte (il mark sul personaggio finisce con loro). Implode a inizio turno del creatore
  ha "Activate": Large Blast intorno alla casella, che poi sparisce, e bottoni per il save fallito, il Talent I e il
  pit del Talent II (p.211); le caselle di Waking Void su un personaggio hanno già la loro card. Lo shove verso il
  centro e il meteor object del Talent II di Polaris restano a mano. Solo codice.

## 17 ottobre 2026 — Mote e mine esplodono con un clic (versione 1.15.172)

### Round di debug del 15 ottobre, R33b2

- **Symphony / Party Favor**: entrare in una mote o in una mine dava solo un promemoria → la card non aveva un bottone
  per l'esplosione → c'è "Detonate": per la mine (p.151) prima il gamble, poi la Medium Blast sulla casella; per la
  mote (p.178) la Small Blast centrata sul personaggio; la casella sparisce e una card dà i bottoni per il fray ai
  foe, il pit sotto il foe o la blessing all'alleato, e conta le mote esplose nel turno per i talenti. Il conteggio
  delle blessing tolte per creare le mote resta a mano. Solo codice.

## 17 ottobre 2026 — Eclipse esplode da una card (versione 1.15.171)

### Round di debug del 15 ottobre, R33b2

- **Eclipse**: a inizio del turno lento il brand restava lì senza fare niente (p.203) → nessun codice guardava il
  brand a inizio turno del creatore → la card dice chi c'è sopra: se c'è qualcuno, bottone "2 divine damage + sealed";
  se non c'è nessuno, "Explode" piazza la Large Blast centrata sul brand e bersaglia chi è dentro, poi i bottoni per i
  2 divine a tutti, il dangerous sotto i foe e il fiery pit del Talent I (pit dangerous, sigilla chi è adiacente). Il
  brand sparisce, tranne con THE HELM. Le aree ora si possono centrare su caselle date (`placeAreaTemplate`,
  `centeredOn: "cells"`). Il Talent II (bolidi) resta testo sulla card. Solo codice.

## 17 ottobre 2026 — Deepwrath crea e usa i pit dalle card (versione 1.15.170)

### Round di debug del 15 ottobre, R33b2

- **Deepwrath**: il pit sotto il marcato a inizio turno, il "drag under" e DARKTIDE (p.235) andavano fatti a mano → il
  codice delle caselle guardava solo chi entra o esce, non i mark → a inizio turno del marcato la card ha "Create
  watery pit"; a fine turno, se è in un pit, c'è "Drag under" (si clicca un altro pit libero entro range 3 e il token
  va lì); con DARKTIDE la prima casella che il marcato lascia nel suo turno chiede se lasciarci terreno dangerous, gli
  alleati marcati non ricevono la domanda dei danni da terreno dangerous e i foe marcati prendono 3 danni invece di 2.
  Solo codice.

## 17 ottobre 2026 — Mist Strider: consumare una nuvola (versione 1.15.169)

### Round di debug del 15 ottobre, R33c2

- **Mist Strider**: "consume a cloud … summoning a beast in any of its spaces" (p.169) non aveva promemoria → la card
  di inizio turno ora ha, per ogni nuvola, il bottone "Consume this cloud": toglie la nuvola, ingrigisce gli altri
  (una a turno) e ricorda di evocare la bestia in uno dei suoi spazi, che si evoca a mano. Nocturne Talent I e Trap
  Door Spider Technique restano a mano. Solo codice.

## 17 ottobre 2026 — Bifröst HEIMDALL, Ätherwand Talent I e HELLERWIND (versione 1.15.168)

### Round di debug del 15 ottobre, R33c2

- **HEIMDALL**: la seconda line poteva coprire la prima → "cannot overlap the first" (p.226) non era controllato → ora
  il piazzamento la rifiuta se tocca la prima.
- **Ätherwand Talent I**: riusare l'abilità sostituiva l'area → "doesn't replace the old area, but extends it" (p.226)
  non era letto → ora gli spazi nuovi si aggiungono all'area già sulla mappa, a patto che almeno uno sia adiacente.
- **HELLERWIND**: non c'era modo di creare il gale → ora il bottone area chiede "Ätherwand / Powerful gale"; il gale è
  "Impassable" (p.89), non si estende e non ha bottoni di movimento (l'impassabilità non blocca davvero i token). Solo
  codice.

## 17 ottobre 2026 — Waterspout: terreno lasciato, HURRICANE (versione 1.15.167)

### Round di debug del 15 ottobre, R33c2

- **Waterspout**: Talent II "leaves a space of difficult terrain in one space that it vacates", la spinta di HURRICANE
  e la sua Small Blast non erano gestiti, e il bottone area piazzava un'area a parte → ora lo spostamento da 3 (Talent
  II) offre "Difficult terrain on a space it left" (si clicca uno degli spazi lasciati); a inizio turno chi è
  adiacente a un waterspout cresciuto riceve il promemoria "shoved 1" (p.235), con la spinta a mano; la Small Blast di
  HURRICANE non viene più proposta come area da piazzare, resta solo il bottone Grow. Risucchiare / risputare e la
  spinta del Talent I restano da decidere. Solo codice.

## 17 ottobre 2026 — Tsunami si piazza contro un bordo della mappa (versione 1.15.166)

### Round di debug del 15 ottobre, R33c2

- **Tsunami**: per metterla lontano dal PG serviva Alt → il piazzamento usava il range dell'abilità invece di
  "anywhere as long as its edge is adjacent to an edge of the map" (p.233) → ora non c'è più limite di range: tutta
  l'area deve stare sulla mappa, con almeno uno spazio sull'ultima riga o colonna (`mapEdgeCheck`). Collisioni dei
  trascinati e "also affects flying foes" restano a giudizio del tavolo. Solo codice.

## 17 ottobre 2026 — Aree terrain effect: danni su clic (versione 1.15.165)

### Round di debug del 15 ottobre, R33c2

- **Danni dell'area**: GUNGNIR (p.225), Bifröst Talent II (p.226) e River Guardians (p.169) scrivevano il danno solo
  nel testo → nessuna card lo proponeva → GUNGNIR ha il bottone "1 piercing damage to all inside" a inizio e a fine
  turno del creatore; la card di fine round di Bifröst ha lo stesso bottone accanto a "Add 2 spaces"; un foe che
  inizia il turno nella nuvola di Mist Strider con River Guardians e lo finisce fuori riceve la card "2 damage to X" +
  "Dazed to X". Il bottone apre la normale card del danno, con i suoi Apply. Il "start inside" di River Guardians è
  ricordato solo dal GM attivo (un F5 a metà turno lo perde). Solo codice.

## 17 ottobre 2026 — Aree terrain effect: status per chi sta dentro (versione 1.15.164)

### Round di debug del 15 ottobre, R33c2

- **Status dentro l'area**: chi entrava nella nuvola di Mist Strider, nelle shadow clouds di Nocturne, nella toxic
  cloud di Magnabio, nell'area di Dark Wing o di Quench non riceveva niente → le frasi "foes inside are blinded+"
  (p.169), "characters are blinded+" (p.161), "characters inside are shattered+" (p.218), "allies in the area have
  cover" (p.171), "the area grants cover" (p.157) erano solo testo → ora entrando (o quando l'area viene piazzata su
  chi c'è già) esce una card con il bottone dello status (es. "Blind+ a X"), uscendo il bottone "Remove …"; Quench
  "exiting the area can gain stealth" e Mist Strider Talent I offrono "X gains Stealth"; per Tsunami Talent II solo il
  promemoria "+1 curse on saves while inside". Il creatore è escluso quando il testo dice "You are immune" (shadow
  cloud p.161). Tutto su clic; il "once a round" di Quench e Mist Strider Talent I resta a mano. Solo codice.

## 17 ottobre 2026 — Bottone Pick up a inizio turno per Comet (versione 1.15.163)

### Round di debug del 15 ottobre, R33a5

- **Comet a inizio turno**: la card "starts their turn adjacent" rimandava alla scheda dell'arma → c'era solo il testo
  → ora la card ha un bottone "Pick up", che funziona solo per chi possiede l'oggetto (o per il GM) e toglie l'arma al
  clic. Solo codice.

## 17 ottobre 2026 — Bale Portal: foe spinti e una volta per round (versione 1.15.162)

### Round di debug del 15 ottobre, R33a5

- **Bale Portal**: un foe spinto dentro un portale non aveva nessuna domanda, e si poteva teletrasportare lo stesso
  foe più volte nello stesso round → il sistema non distingue una spinta da un movimento del foe e non contava i
  teletrasporti → ora chi muove un foe accanto a un underway (solo con la mastery sbloccata) riceve la domanda "shoved
  into the portal?", e il bottone "Save failed — teleport" lo fa piazzare (p.168); un secondo teletrasporto nello
  stesso round viene rifiutato ai giocatori, il GM riceve una domanda per forzarlo (il conteggio si legge dalle card
  in chat del round). Il tiro salvezza resta a mano. Solo codice.

## 17 ottobre 2026 — Gli oggetti guardano il percorso del movimento (versione 1.15.161)

### Round di debug del 15 ottobre, R33a5

- **Percorso**: passare accanto alla Thrown Weapon o sopra un Megamushroom senza fermarsi non faceva nessuna domanda →
  si guardavano solo partenza e arrivo → ora si leggono le tappe del movimento di Foundry, seguendo ogni tratto sulla
  griglia (i tratti in teleport sono saltati): la domanda "pick up" di Comet ("passed through"), l'avviso del rampart
  e la benedizione del Megamushroom valgono anche per gli spazi attraversati. La domanda dell'Underway resta solo dove
  ci si ferma. Solo codice.

## 17 ottobre 2026 — Salire e scendere dagli oggetti camminando (versione 1.15.160)

### Round di debug del 15 ottobre, R33a5

- **In piedi sugli oggetti**: un personaggio che camminava su un boulder restava a elevazione 0 (o restava in alto
  scendendo) → l'elevazione cambiava solo quando era la pila a cambiare → ora una domanda "Climb onto the object? /
  Step down?" propone la nuova elevazione e dice quanto costa salire (+1 movimento per livello, p.89); l'elevazione
  cambia solo col clic, e chi vola più in alto, o un movimento che cambia già l'elevazione da sé, non viene toccato.
  Il costo di movimento viene detto ma non contato. Solo codice.

## 17 ottobre 2026 — Pierce degli Aethershard bersaglio per bersaglio (versione 1.15.159)

### Round di debug del 15 ottobre, R33a5

- **Aethershard Talent II**: "Your abilities gain pierce against characters adjacent to Aethershards" (p.210) era solo
  una riga sulla scheda → il pierce della card del danno vale per tutta la card, non per un bersaglio → ora un
  bersaglio adiacente (o sopra) a uno shard di chi attacca ha il chip "Pierce (Aethershard)" e all'Apply la sua
  armatura viene ignorata; l'adiacenza si guarda quando si applica il danno, come la copertura. Solo codice.

## 17 ottobre 2026 — Avviso del rampart di Comet (versione 1.15.158)

### Round di debug del 15 ottobre, R33a5

- **Rampart di Comet**: un foe entrava o usciva dagli spazi accanto all'arma lanciata senza nessun avviso → il rampart
  era solo un'aura da guardare → ora chi muove il foe riceve un avviso: più deciso se il movimento di Foundry è "fly"
  o "blink" (teleport) o se il foe ha flying, altrimenti un promemoria "se era un dash…" (rampart, p.117 e p.126). Il
  sistema non annulla niente: si usa Ctrl+Z se il tavolo è d'accordo. Solo codice.

## 17 ottobre 2026 — Copertura dagli oggetti sulla mappa (versione 1.15.157)

### Round di debug del 15 ottobre, R33a5

- **Copertura dagli oggetti**: un personaggio accanto a un oggetto, a un Underway con Talent II o in piedi su un
  Geyser con Talent I non mostrava nessun segno di copertura → i suggerimenti di copertura guardavano solo i muri di
  Foundry → ora le card di danno e i dialog mostrano un chip tratteggiato: "Cover? object" (oggetto adiacente più alto
  di dove sta il personaggio, p.92), "Cover? underway" (p.168), "Cover — on geyser" ("from all directions", p.232). Il
  chip è solo un suggerimento: il danno non viene dimezzato da solo (lo status Cover si mette a mano, come per il chip
  dei muri). Solo codice.

## 17 ottobre 2026 — Amico: una sola card Detonate in chat (versione 1.15.156)

### Round di debug del 15 ottobre, R33d2

- **Detonate di Amico**: a ogni fine turno non del creatore si accumulava una card sussurrata nuova, anche se nessuno
  voleva farla esplodere → ogni turno creava una card in più → ogni nuova card cancella la precedente non usata dello
  stesso mark, quindi in chat ce n'è solo una, l'ultima. Solo codice.

## 17 ottobre 2026 — Segno sul personaggio: il token giusto su più scene (versione 1.15.155)

### Round di debug del 15 ottobre, R33d2

- **Linked su più scene**: un personaggio collegato con token su più scene riceveva lo spazio sul primo token trovato
  → il mark non sapeva quale token era stato targettato → il mark ora si ricorda il token targettato (anche quando
  passa dal GM), e lo spazio e l'aura "while marked" (Fulminate) vanno su quello. I mark vecchi, senza questo dato,
  cercano come prima. Solo codice.

## 17 ottobre 2026 — Segnare di nuovo: si sceglie quale mark resta (versione 1.15.154)

### Round di debug del 15 ottobre, R33d2

- **Mark che si sostituiscono**: segnando di nuovo lo stesso personaggio con un'altra abilità, il mark vecchio spariva
  senza chiedere → il libro dice "choosing which gets replaced if they mark that character again" (p.95) → ora una
  finestra chiede "<nuovo> replaces it / Keep <vecchio>" a chi segna, sul suo client; quando il mark viene passato al
  GM la risposta viaggia con lui, quindi il GM non riceve la domanda. Chiudendo la finestra non viene messo niente. La
  stessa abilità di nuovo (spostata, rinnovata, stack) e i tracker non chiedono. Vale per i bottoni Mark di tutte le
  schede e per il chip "On a character" (`applyMark`). Solo codice.

## 17 ottobre 2026 — Implode su un personaggio: la large blast con un clic (versione 1.15.153)

### Round di debug del 15 ottobre, R33d2

- **WAKING VOID**: con Implode su un personaggio, all'inizio del turno lento non usciva niente, e se il personaggio
  veniva sconfitto c'era solo una card di testo → mancavano un promemoria a inizio turno e un bottone per l'esplosione
  ("at the start of that turn, that space explodes … large blast", "If that character is defeated, Implode immediately
  activates", p.211) → all'inizio del turno successivo del creatore esce una card sussurrata, una volta sola, con
  "Large Blast on <personaggio>": piazza la large blast centrata sul suo token e poi chiude il tracker e lo spazio. La
  card della sconfitta ha lo stesso bottone, e dopo la sconfitta a inizio turno non esce una seconda card. Lo shove
  resta a mano. Solo codice.

## 17 ottobre 2026 — Segno sul personaggio: controllo del range (versione 1.15.152)

### Round di debug del 15 ottobre, R33d2

- **Range del segno sul personaggio**: con "On <bersaglio>" si poteva segnare chiunque, a qualsiasi distanza → il chip
  non guardava il range dell'abilità ("any character in range", Amico p.151; Polaris range 5 p.202; Implode range 6
  p.211) → se i due token sono sulla stessa scena e il bersaglio è più lontano del range (tag `range-N`, oppure "in
  range N" nel testo: Party Favor 3), una finestra chiede "Anyway / Cancel", con Cancel come scelta predefinita. Solo
  codice.

## 17 ottobre 2026 — Interrupt strani sul danno (versione 1.15.151)

### Round di debug del 15 ottobre, R35c

- **Interrupt che annullano o riducono il danno**: Grace of the Spirits, Wish e Heartfire si postavano ma il danno
  sulla card restava uguale → la card non aveva modo di segnare immunità, soglia di HP o riduzione → i loro bottoni la
  cambiano: Grace of the Spirits (p.193) rende l'alleato immune e Apply non fa danno, nemmeno divine; Wish (p.203)
  l'alleato non scende sotto 1 HP; Heartfire (p.210) −3 come armatura, non contro pierce / divine, e solo per il
  partner marcato (nuove opzioni `minHp` ed `extraArmor` in `applyDamageToActor`). Ora si leggono anche gli interrupt
  dati da una mastery sbloccata.
- **Dire Parry e Strong Left**: gli usi "messi da parte" della mastery (p.143) non esistevano → c'era solo il limite
  per round → con Strong Left Dire Parry tiene una riserva fino a 3 (+1 a inizio turno, da solo come dice la mastery,
  −1 a ogni uso); il Refresh di Riposte "when a foe damages you or an adjacent ally" (p.142) ha il suo bottone, che
  non spende niente. Solo codice.

## 17 ottobre 2026 — Righteous Disdain dalla card del danno (versione 1.15.150)

### Round di debug del 15 ottobre, R35b

- **Righteous Disdain**: l'effetto "Apply the damage to both you and your ally, but both of you gain resistance"
  (p.128) andava fatto a mano → la card del danno non poteva cambiare chi prende il danno → il bottone dell'interrupt
  aggiunge il Demon Slayer alla card come secondo bersaglio con lo stesso danno; tutti e due hanno resistenza (dimezza
  una volta sola all'Apply, insieme a Cover / Resistance, mai sul divine) e un chip "Sturdy vs. its effects". Con la
  mastery Shirahadori (p.129) il Demon Slayer si ferma a 1 HP. Le modifiche stanno su un flag della card
  (`module/combat/damage-card-mods.mjs`); se le chiede un giocatore le scrive il GM via socket. Solo codice.

## 17 ottobre 2026 — Interrupt dalle card del danno (versione 1.15.149)

### Round di debug del 15 ottobre, R35a

- **Interrupt sul danno**: un interrupt che scatta quando si viene colpiti (Sturmreiten, Wish, Righteous Disdain, "The
  knight is damaged" dei foe) andava cercato a mano sulla scheda e gli usi dei PG non erano contati → la card del
  danno non sapeva quali interrupt fa scattare → sotto ogni bersaglio della card c'è un bottone per ogni interrupt che
  quel danno attiva, per i personaggi che giochi tu (il colpito, o un alleato se il trigger dice "an ally … is
  damaged"); il clic spende un uso e posta Trigger ed Effect. Chi decide quali interrupt scattano sta in un punto solo
  (`module/combat/damage-interrupts.mjs`), modulare come chiedeva Turz Ven. Gli usi dei PG ora si contano (flag
  `interruptUses`) e tornano a inizio del loro turno; i foe usano le stesse spunte della scheda. Gittata, aura, linea
  di vista e "un interrupt per turno" restano al tavolo. Solo codice.

## 17 ottobre 2026 — Carte del Seer: bersagli e area (versione 1.15.148)

### Round di debug del 15 ottobre, R36c

- **Carte senza bersaglio**: dalla card in chat non si capiva su chi era stata usata la carta e The Ewer non piazzava
  la sua area → la card non leggeva i bersagli → ora la card scrive "Foretold on: <alleato>" con i bersagli del
  momento in cui è stata giocata, oppure dice di bersagliare l'alleato; The Ewer ha il bottone "Place Small Blast
  (target)" che centra il blast sull'alleato con gli strumenti area già esistenti (wild card comprese), poi lascia
  bersagliati solo gli alleati, così il bottone Blessed li benedice tutti. Solo codice.

## 17 ottobre 2026 — Carte del Seer giocate in chat (versione 1.15.147)

### Round di debug del 15 ottobre, R36b

- **Carta giocata senza traccia in chat**: giocando una carta dalla mano la chat non diceva quale carta era né cosa
  faceva → il Play di Foundry scrive solo "ha giocato 1 carta" → ora nella mano ogni carta ha un bottone Foretell
  (ruota) che posta una card in chat (`great-wheel-card.hbs`) con l'effetto, il testo di Foretell richiudibile, i
  bottoni Gain per gli alleati bersagliati (Unstoppable, Evasion, Defiance, Counter, Sturdy, Blessed…) e i promemoria,
  poi sposta la carta negli scarti; anche il Play di Foundry verso una pila posta la stessa card. Nessuno status viene
  applicato senza un clic. Letture scelte, da far confermare a Maar: con The Sun anche Counter e Sturdy scadono "until
  the start of their next turn"; The Chariot e The Star restano promemoria ("during the ability", un boon). Solo
  codice.

## 17 ottobre 2026 — Carte del Seer: l'effetto su ogni carta (versione 1.15.146)

### Round di debug del 15 ottobre, R36a

- **Carte del Seer senza effetto**: nei mazzi del Seer (deck, mano, scarti) le carte avevano solo il nome → il sistema
  non conosceva la tabella The Great Wheel, e i mazzi sono i Cards di Foundry creati nel mondo, senza testo → la
  tabella del libro (p.199) ora sta nel codice (`module/combat/great-wheel.mjs`): sotto il nome di ogni carta, nei
  fogli di Foundry e nel foglio della singola carta, compare l'effetto ("Q — The Moon: Ally gains Evasion…") con le
  keyword evidenziate. La carta si riconosce dal valore (Asso = 1 … Re = 13) o dal nome ("Queen of Hearts", "The
  Moon"); le carte coperte non mostrano l'effetto. Niente legato alla scheda (come chiedeva Maar), carte del mondo mai
  modificate, nessun pack. Solo codice.

## 17 ottobre 2026 — Il danno dei blocchi Effect di foe e legend è proposto sotto Other (versione 1.15.145)

### Round di debug del 16 ottobre, voce emersa su R40

- **Kelpie Savage Fang, Overpower, Mighty Smite e altre azioni di foe e legend**: il danno extra scritto nei loro
  "Effect:" non compariva nel dialog del danno → la lettura dei blocchi base (Mark, Effect…) valeva solo per le
  abilità dei PG → vale anche per foe e legend (FoeSheet e LegendSheet con l'opzione `foe`): ogni frase con danno
  diventa una chip sotto Other, con il nome del blocco; restano fuori Collide / Exceed / Charge / Slay / Heroic /
  Comeback / Critical / Finishing Blow e le frasi che cambiano il danno, e il testo Summon / Object Effect dei foe
  resta letto come prima (il pulsante Damage di Torpedo e simili non cambia). Su tutti i pack: 227 chip nuove (89 foe,
  24 legend, 114 foe-abilities, in gran parte copie), zero cambi a Hit / Miss / Area / pulsante Damage e ai jobs. Solo
  codice.

## 17 ottobre 2026 — Danno "fino a N volte": la chip lo dice e Instances si ferma a N (versione 1.15.144)

### Round di debug del 16 ottobre, voce emersa su R40

- **Circle the Oak, Quaking Palm, Nothung (e foe come Shotgun Trooper)**: la chip proponeva una sola istanza e il
  numero di volte andava messo a mano senza sapere il massimo → il parser leggeva "three times" ma non "up to a
  maximum of four times" → ora "up to (a maximum of) N times" / "to a maximum of N times", nella stessa frase del
  danno, è un tetto: la chip mostra "· up to ×N" e nel dialog del danno Instances parte da 1 e arriva al massimo a N
  (anche scritto a mano); vale anche per Hit / Area dei foe con la stessa frase (Strongarm, Realignment, Provoke,
  Shotgun Trooper, Commander…). Il "gains 2 vigor … up to three times" di Blood Feed non viene letto. Solo codice.

## 17 ottobre 2026 — Il danno che un foe infligge a se stesso non è più proposto (versione 1.15.143)

### Round di debug del 15 ottobre, voce emersa su R14

- **Incredible Bulk del Bale Troll**: la scheda mostrava il pulsante Damage e proponeva 10 piercing come danno
  inflitto → il parser escludeva solo il danno "to you" (Provoke p.142), non "to itself" ("The troll deals 10 piercing
  damage to itself", p.457) → anche "to itself" è escluso in `ability-damage.mjs`: l'azione non propone più quel danno
  né il pulsante Damage. Su tutti i pack cambia solo lui (e la sua copia in foe-abilities). Solo codice.

## 17 ottobre 2026 — Harvest Moon: esplosioni sulle plant con un clic (versione 1.15.142)

### Round di debug del 16 ottobre, voce emersa su R49

- **Harvest, mastery HARVEST MOON**: le Small Blast "centered on each plant" (p.186) si piazzavano a mano, una alla
  volta → il sistema non riconosceva le plant sulla mappa → ora una plant è riconosciuta in modo sicuro: un token il
  cui attore viene dalla Plant del compendio summons (Foundry lo annota da solo quando il token arriva dal pack, chip
  compreso), oppure un oggetto Megamushroom, che "counts as a plant" (p.187). La variante "Mastery: Small Blast (on
  plants)" mette con un clic una Small Blast su ogni plant dentro l'Arc di Harvest già piazzato; le blast sono unite,
  così chi sta in più blast è preso una volta sola ("only be damaged by one of these explosions a turn"). Le plant non
  diventano bersagli e l'Arc resta sulla mappa. Una plant creata a mano non viene riconosciuta. Solo codice.

## 17 ottobre 2026 — Split Heaven and Hell: fascia di distanza misurata sulla linea (versione 1.15.141)

### Round di debug del 16 ottobre, voce emersa su R37

- **Split Heaven and Hell, "% Max HP"**: la fascia "1 space / 2-4 spaces / 5+ spaces" (p.127, "depending on their
  distance on the line from you") andava scelta a mano per ogni bersaglio → il dialog non sapeva dove fosse la linea
  piazzata → ora, se la linea del Limit Break è sulla mappa, il dialog misura per ogni bersaglio la distanza dal token
  del personaggio alla casella più vicina del bersaglio dentro la linea (contando le diagonali, anche sulle colonne in
  più date dalla larghezza), preseleziona la fascia giusta e scrive "· N on the line" oppure "· not on the line". Il
  menu resta modificabile; i Legend restano al loro 25% fisso. Solo codice.

## 17 ottobre 2026 — Rampant Nail: la Small Blast del Talent I sullo spuntone (versione 1.15.140)

### Round di debug del 16 ottobre, voce emersa su R49

- **Rampant Nail Talent I**: la Small Blast "centered on the nail is dangerous terrain" (p.227) si piazzava a mano
  come un'area qualsiasi, non era dangerous e, se si piazzava, toglieva lo spuntone → "centered on the nail" non
  veniva riconosciuto e la frase non dice "terrain effect" → ora la variante "Talent I: Small Blast (on nail)" va da
  sola sullo spuntone già sulla mappa (l'Aura 2 dello stesso attore e della stessa abilità), è dangerous e resta; lo
  spuntone resta al suo posto e viene sostituita solo una blast messa prima. Quando lo spuntone viene tolto
  (esplosione, Remove, nuovo spuntone) la blast se ne va con lui. Senza spuntone sulla mappa compare un avviso e non
  succede nulla. Solo codice.

## 17 ottobre 2026 — Barrato solo il blocco sostituito dalla combo (versione 1.15.139)

### Round di debug del 15 ottobre, voce emersa su R1

- **Barrato parziale**: con Sweet Torment, Indignation, Succubus o Penumbra pronte, la scheda non barrava niente della
  base anche se la combo ne sostituisce un blocco → si barravano solo le combo complete → ora, con il segnalino combo,
  viene barrato solo il blocco della base che la combo sostituisce ("replace the base effect", "Instead of the mark"
  p.164, "instead of teleporting"), con la nuova `comboReplacedBlocks` in `ability-blocks.mjs` (stessa logica con cui
  la card fonde la combo). The Hook e Flying Sleeves non barrano niente; le combo complete restano barrate per intero;
  con la mastery che dà entrambe le versioni (Dervish) non si barra niente. Solo codice.

## 17 ottobre 2026 — Talento nella card auto-hit (versione 1.15.138)

### Round di debug del 15 ottobre, voce emersa su R16

- **Talento assente nell'auto-hit**: la card degli attacchi auto-hit non mostrava il talento sbloccato (lo Slay del
  Talent II di Death, il Comeback del Talent II di Sow) → il talento veniva aggiunto solo alla card con il tiro → ora
  anche la card auto-hit mostra le righe del talento. Exceed, Critico e Miss restano fuori perché senza tiro non
  possono scattare (Exceed è un tiro totale di 15+, p.95). Nessuna mastery del compendio aggiunge blocchi Hit / Exceed
  / Slay all'attacco, quindi per le mastery non cambia nulla. Solo codice.

## 17 ottobre 2026 — Abilità trascinata su un riquadro pieno (versione 1.15.137)

### Round di debug del 15 ottobre, voce emersa su R5

- **Riquadro sbagliato**: un'abilità trascinata su un riquadro già occupato (es. il quinto) finiva nel primo → nei
  riquadri pieni `{{@index}}` usciva vuoto (dentro il `#with` di `icon-combat.hbs`) e `#onDropAbilitySlot` lo leggeva
  come 0 → ora i riquadri pieni scrivono il loro numero (`{{../this}}`) come quelli vuoti. Solo codice.

## 17 ottobre 2026 — Gli usi dei kit contano anche con clic rapidissimi (versione 1.15.136)

### Dal playtest della 1.15.1, usi dei kit

- **Usi dei kit con clic veloci**: due clic sullo stesso oggetto del kit (o su due oggetti dello stesso kit) prima che
  la scheda si ridisegnasse contavano come uno → ogni clic leggeva gli usi prima che il salvataggio precedente fosse
  arrivato e scriveva lo stesso valore (l'elenco degli usi è uno solo per kit) → ora le modifiche a un kit fanno la
  fila (`#queueKitWrite` in IconSheet): ognuna aspetta la precedente e rilegge il kit, così ogni clic conta; vale per
  l'uso, lo Shift + clic e il "−". Solo codice.

## 17 ottobre 2026 — Reap da lontano guadagna Unerring (versione 1.15.135)

### Round di debug del 15 ottobre, voce emersa su R1

- **Reap contro il bersaglio di Sow lontano**: il Reap fatto da lontano sul foe marcato da Sow non guadagnava
  Unerring, quindi Cover e Aetherwall dimezzavano lo stesso il danno → la finestra del danno non sapeva della regola
  speciale di Reap ("You can make this melee attack against the target marked by sow regardless of distance or line of
  sight", e così guadagna Unerring, p.185) → ora, con la versione combo e il bersaglio marcato da Sow (dallo stesso
  attaccante) a più di 1 casella, Unerring è già spuntato e la riga dice perché ("<nome> marked, out of reach
  (p.185)"). Il tiro d'attacco non avvisa né blocca un bersaglio lontano, come vuole la regola. Da adiacente è un
  attacco in mischia normale (lettura scelta). Solo codice.

## 17 ottobre 2026 — La spesa di resolve del Limit Break finisce col combattimento (versione 1.15.134)

### Round di debug del 16 ottobre, voce emersa su R37

- **Rimborso del Limit Break da un combattimento passato**: un "% Max HP" con un Legend che salva rimborsava l'ultimo
  uso del Limit Break anche se era di un combattimento precedente → l'annotazione della spesa (`limitBreakSpend`) non
  veniva mai cancellata a fine combattimento → ora si cancella con il resto delle risorse a fine incontro
  (`IconCombat.mjs`), quindi senza un uso nel combattimento in corso compare l'avviso "rimborsalo a mano". Ogni nuovo
  uso la sovrascrive già e il rimborso controlla che sia lo stesso Limit Break. Solo codice.

## 17 ottobre 2026 — Elenchi "•" a righe nelle regole dei summon di foe e legend (versione 1.15.133)

### Round di debug del 15 ottobre, voce emersa su R12

- **Elenchi nelle regole dei summon**: sulla scheda e nella card in chat le regole dei summon di Churn Baron (Crony:
  Blunderbuss / Arkentech Explosives), Deep Snow Aesi (Icicle), Keeper of the Eldflame (Everforge) e Violence Demon
  (Blade of Agony) mostravano l'elenco tutto su una riga → i pack salvano queste regole dentro un `<p>` con i "•" in
  mezzo al testo, e la resa a righe salta i testi in HTML (e nella card c'è in più il descrittore in HTML) → la scheda
  e il bottone chat preparano le regole con una nuova funzione (`summonRulesHTML` in `enrich.mjs`) che mette ogni "•"
  su una riga sua dentro lo stesso paragrafo; cambiano 5 regole su 144, parole invariate, pack non toccati, vale anche
  per i foe già importati. Solo codice.

## 17 ottobre 2026 — Painkiller: l'aura di Sweet Torment resta (versione 1.15.132)

### Round di debug del 15 ottobre, voce emersa su R19

- **Aura di Sweet Torment con Painkiller**: con la mastery di Bleak Mercy sbloccata l'aura scadeva comunque alla fine
  del turno successivo → la durata (`auraExpiry` in `area-templates.mjs`) veniva letta solo dal testo della combo
  ("until the end of your next turn, gain aura 1") → se il testo sbloccato dice che l'aura "lasts indefinitely"
  (p.144) l'aura non ha più scadenza. Nel pack jobs lo dice solo la mastery di Bleak Mercy. Solo codice.

## 17 ottobre 2026 — Testo del mark di Polaris e Party Favor (versione 1.15.131)

### Round di debug del 15 ottobre, voce emersa su R17

- **Testo del mark di Polaris / Party Favor**: il bottone Mark metteva nel mark tutto il testo dell'abilità (Terrain
  Effect + Gamble) → senza blocco "Mark:" il bottone (`#onAbilityMark`) prendeva tutte le sezioni della descrizione →
  ora prende la frase del talento / della mastery che crea il mark ("Talent I: You can cause one of your Polaris to
  follow a character as a mark…", "Mastery: Amico: …"), come già faceva il chip "On a character". Nel pack riguarda
  solo Polaris e Party Favor. Solo codice.

## 17 ottobre 2026 — "Gains True Strike" non è più uno status (versione 1.15.130)

### Round di debug del 15 ottobre, voce emersa su R1

- **"Gains True Strike" letto come status**: l'Inflict di Indignation, Land Waster, Takedown, Draken Cross e Rook (e
  il "Gains unerring" di Pistolero / Razor Shot / Collect Bounty / Stutterslash dei foe) proponeva un bottone "Gain
  True Strike" → una frase "Gains …" senza soggetto veniva letta come guadagnata da chi usa l'abilità, ma è l'abilità
  che prende il tag (p.117, p.141) → per true strike, unerring e pierce quella frase non dà più il bottone
  (`ability-statuses.mjs`); gli altri status ("then gain counter") restano. Confrontati tutti i testi dei pack prima e
  dopo: cambiano solo quelle frasi. Solo codice.

## 17 ottobre 2026 — Il dialog del danno riaperto ricorda le scelte (versione 1.15.129)

### Round di debug del 16 ottobre, voce emersa su R38b

- **Reroll (same use)**: cambiando la casella, il dialog si riapriva sull'altra versione con tutto da capo → il dialog
  nuovo non riceveva le scelte del precedente → ora tornano esito, bersaglio d'attacco, Vulnerable / Resistance /
  Weakened / Hatred, Flat damage, bonus dice, chip e pannello di Other; i dadi bonus che la versione aggiunge da sola
  (dall'Aether dell'Infuse, Finishing Blow) vengono tolti o rimessi; Divine, Pierce, Unerring, True Strike e Instances
  seguono il testo della nuova versione. Vale per abilità e Limit Break. Solo codice.

## 17 ottobre 2026 — L'esito Other dice da dove vengono le chip (versione 1.15.128)

### Round di debug del 16 ottobre, voce emersa su R40

- **Etichetta di Other**: diceva sempre "mastery / talent / free" → il testo era fisso → ora nomina le fonti delle
  chip visibili (es. "Mark / free", "Combo / free", "Effect / Talent II / free"; oltre tre fonti si accorcia con "…")
  e cambia insieme alla casella Combo version. Senza chip resta "free amount". Solo codice.

## 17 ottobre 2026 — Chip di Other con Unerring, ×N e due danni di Blitz (versione 1.15.127)

### Round di debug del 16 ottobre, voce emersa su R40

- **Chip senza Unerring né ×N**: la chip di Astral Chain non spuntava Unerring, quella di Chastise non mostrava ×3 e
  Blitz proponeva una chip sola → il parser non segnava "unerring damage", l'etichetta della chip non mostrava le
  istanze e una frase dava sempre una sola chip → ora le chip mostrano "unerring" e "×N", e sceglierne una "unerring"
  spunta Unerring (Astral Chain p.156; anche Trick Shot Talent II e Warding Bolts Talent I); cambiando esito Unerring
  torna al valore del tag o dello status. Una frase con due danni separati da ", then" dà due chip: Blitz (p.225) ha
  "Effect — 1st" e "Effect — 2nd", da 1 piercing ciascuna. Hit / Miss / Area invariati su tutto il pack jobs. Solo
  codice.

## 17 ottobre 2026 — Il Mark di Incubus sparisce con Succubus (versione 1.15.126)

### Round di debug del 16 ottobre, voce emersa su R40

- **Chip Mark con il combo Succubus**: con la Combo version spuntata restava anche la chip "Mark" (2) della base → il
  dialog non sapeva che Succubus scrive "Instead of the mark" (p.164) → la combo ora dice quali blocchi della base
  sostituisce ("instead of the mark / effect / stance"), e con Combo version spuntata quelle chip si nascondono. Nel
  pack jobs riguarda solo Incubus. Solo codice.

## 17 ottobre 2026 — Chip della combo di Succubus solo con la combo (versione 1.15.125)

### Round di debug del 16 ottobre, voce emersa su R40

- **Chip "Combo — Succubus"**: compariva sotto Other anche senza combo → il dialog elencava sempre le righe della
  combo insieme a quelle della base → ora la chip si vede solo con la casella "Combo version" spuntata, che parte
  spuntata quando la combo è armata (combo token pieno, o combo già spesa su questa abilità); togliendo la spunta la
  chip sparisce e, se era scelta, viene deselezionata. Solo codice.

## 17 ottobre 2026 — Elenchi a righe anche nei foe (versione 1.15.124)

### Round di debug del 15 ottobre, voce emersa su R12

- **Elenchi "•" dei foe in un paragrafo unico**: in circa 50 tratti e azioni di foe e legend (Imperial Spy, Relict,
  trappola dei Lowlander, Eternal Star del Warden, decreti del Majesty Demon, Creeping Cold delle Aesi…) le voci
  restavano attaccate in una sola frase → nei compendi gli elenchi erano scritti con " • " in linea, senza a capo, e
  la resa a righe di R12 vale solo per le voci che iniziano una riga → nei pack foes, legends, foe abilities e foe
  templates ogni voce ora sta su una riga che inizia con "•" (482 testi, contando le copie dello stesso tratto su più
  foe), senza cambiare una parola; dove il libro rientra le voci sotto un'altra (azioni libere di Possess del Silent
  One, "While stuck" dello Static Charge, le altezze di Raze Hell / Raze Heaven) sono sotto-voci "◦"; il testo che nel
  libro segue l'ultima voce torna a capo come testo normale (controllato sul manuale). Niente migrazione: vale per i
  foe importati di nuovo dal compendio, non per quelli già nel mondo. Script in
  `icon-compendium-audit/r12b-foe-bullet-lists/`. Solo compendi.

## 17 ottobre 2026 — Costo leggibile nei riquadri delle abilità (versione 1.15.123)

### Round di debug del 15 ottobre, voce emersa su R5

- **Costo grezzo nei sei riquadri della tab Combat**: sotto il nome dell'abilità si leggeva "1action" o "interrupt-1",
  e Catapult con la mastery restava "Interrupt 1" → il riquadro stampava il costo come è salvato, invece di usare il
  costo già pronto per il pannello sotto (quello che segue talenti e mastery) → ora il riquadro mostra lo stesso costo
  del pannello ("1 Action", "Interrupt 3" per Catapult con la mastery), con la stessa spiegazione al passaggio del
  mouse. Solo codice.

## 17 ottobre 2026 — Spiegazioni per gli ultimi tag grigi dei foe (versione 1.15.122)

### Round di debug del 15 ottobre, voce emersa su R5

- **Tag dei foe senza spiegazione**: passando il mouse su "Per Round 1", "Repeatable", "Per Combat 1", "Usable When
  Bloodied", "Round 3+ Only", "Burst 1 Target", "Cauldron Action", "Might Of The Wild" e altri non compariva niente →
  mancavano dall'elenco delle spiegazioni, e alcuni hanno il numero in mezzo al nome ("burst-2-self",
  "requires-6+-tally", "4-assets"), una forma che il sistema non leggeva → aggiunte le spiegazioni prese dal manuale,
  ognuna con la sua pagina: usi limitati e Repeatable (p.290), Area effect e Burst target / self (p.97), Range 4+
  (p.342), Usable only on bloodied foes (p.333); le meccaniche delle singole fazioni con la loro fazione: Cauldron
  action del Troll (p.452), Might of the Wild dell'Apex (p.360-361), Path of Ruin del Wyrm (p.362-363), Forge action
  del Keeper of the Eldflame (p.461), Blade consume del Violence Demon (p.420), Gaze target only del Pale Man (p.416),
  Tally dell'Aurelian (p.373), Assets del Churn Baron (p.375), Thievery della Falling Leaf Aesi (p.485). Nei compendi
  non resta nessun tag senza spiegazione (35 aggiunti). Solo codice.

## 17 ottobre 2026 — Boiling Blood: "Defy Death" non resta più appeso al testo di colore (versione 1.15.121)

### Round di debug del 15 ottobre, voce emersa su R8

- **Boiling Blood**: il testo di colore finiva con "Defy Death —" → nel libro (p.138) "Defy Death" è il nome
  dell'interrupt, stampato come titolo sopra Trigger ed Effect, ma nel compendio stava prima di "Trigger:" e il
  sistema lo lasciava nel testo di colore → ora il nome apre l'Effect ("Effect: Defy Death — You fight on, …"), così i
  talenti e la mastery che lo nominano ("While Defy Death is active") hanno un riferimento chiaro; la migrazione 36 lo
  fa sulle copie già sulle schede che hanno ancora il testo originale. Compendio Jobs + migrazione.

## 17 ottobre 2026 — Reap, la combo di Sow, ha i suoi tag (versione 1.15.120)

### Round di debug del 15 ottobre, voce emersa su R1

- **Reap mostrava Range 4 e Pierce**: con il combo token armato Sow (Harvester) mostrava ancora Range 4 e Pierce → i
  tag della combo erano stati copiati dalla base ("attack, range-4, mark, pierce, combo"), ma il libro (p.185) stampa
  REAP come abilità completa, un attacco melee ("You can make this melee attack against the target marked by sow
  regardless of distance or line of sight"), senza riga di tag sua; inoltre, se i tag della combo non avevano un
  range, il sistema rimetteva quello della base → ora i tag della combo sono "attack, melee, combo" (via Range 4, Mark
  e Pierce) e Melee vale come range in `rule-tooltips.mjs`, così il Range 4 della base non torna; `COMBO_TAGS_BY_NAME`
  aggiornato; la migrazione 35 lo fa sulle copie già sulle schede che hanno ancora i tag originali. Compendio Jobs +
  migrazione.

## 17 ottobre 2026 — Commento corretto in pitBlastCells (versione 1.15.119)

### Round di debug del 16 ottobre, voce emersa su R49

- **Commento sbagliato**: il commento di `pitBlastCells` (`area-templates.mjs`) diceva che l'area di Holy resta come
  terrain effect → non è più vero dalla 1.15.98 → ora dice che conta l'area dell'abilità, che resti o no, finché è
  sulla mappa. Nessun cambio di comportamento.

## 17 ottobre 2026 — I due chip dei pit di Pandaemonium non si cancellano a vicenda (versione 1.15.118)

### Round di debug del 16 ottobre, voce emersa su R49

- **Chip dei pit legati**: il clic destro su uno dei due chip pit di Pandaemonium toglieva dalla scena sia il pit
  della combo sia quelli sotto i foe pacified → i due chip finivano nello stesso gruppo (`groupOf` in
  `terrain-spaces.mjs`), che non teneva conto di "sotto i foe pacified" → i pit del Talent II hanno un gruppo loro: il
  clic destro, e il "replace" quando l'abilità viene usata di nuovo, toccano solo i pit di quel chip. Gli altri spazi
  e il Volcanic Geyser non cambiano gruppo. Solo codice.

## 17 ottobre 2026 — Bersaglio d'attacco ricordato solo se è ancora nell'area (versione 1.15.117)

### Round di debug del 16 ottobre, voce emersa su R41

- **Area spostata**: spostata un'area Line / Arc senza ripiazzarla, Show in Chat usava ancora il bersaglio d'attacco
  scelto prima, anche se quel token non era più dentro → il bersaglio ricordato si controllava solo tra i bersagli
  selezionati, non tra i token dentro le caselle dell'area → ora vale solo se il token sta ancora in una casella
  dell'area attuale, comunque sia stata spostata (trascinata, Shift + frecce, movimenti delle aree); altrimenti tutti
  i bottoni Inflict, come quando il bersaglio non si sa. Vale per schede PG, foe e legend. Solo codice.

## 17 ottobre 2026 — MJÖLLNIR sostituisce sempre l'area di Sturmreiten (versione 1.15.116)

### Round di debug del 16 ottobre, voce emersa su R47b

- **MJÖLLNIR "instead"**: con MJÖLLNIR sbloccata, Sturmreiten chiedeva ancora di scegliere tra Line 3 e Arc 5 → l'Arc
  5 della mastery veniva aggiunto come alternativa accanto all'area base, invece di prenderne il posto ("Create an arc
  5 area any time you would create an area with this ability instead", p.227) → una mastery che dice "any time you
  would create an area with this ability instead" ora lascia solo la sua area, sia nel bottone area sia nel tiro
  d'attacco (`_areaVariantsFor` in IconSheet). L'estensione del Talent II resta un Arc 5. Solo codice.

## 17 ottobre 2026 — Danno dei summon con la finestra condivisa (versione 1.15.115)

### Round di debug del 15 ottobre, voce emersa su R23

- **Danno dei summon**: la finestra del danno dei summon aveva solo Hit / Crit / Miss / Area, senza "Other" né Pierce
  / Divine / True Strike → la scheda summon usava ancora una sua vecchia finestra semplice (`#promptSummonDamageMods`)
  invece di quella condivisa da PG, foe e legend → ora usa la finestra condivisa di `roll-dialogs.mjs`: esito Other,
  danno fisso, tipi di danno, Unerring, Hatred, bersagli e istanze; [D] e fray restano quelli del summoner, letti
  prima di aprire la finestra. L'esito Hit c'è sempre, perché il summon ha il suo tiro d'attacco. La vecchia finestra
  è stata tolta. Solo codice.

## 17 ottobre 2026 — Aure dei foe senza numero (versione 1.15.114)

### Round di debug del 15 ottobre, voce emersa su R19

- **Aura of Slaughter dei demoni**: piazzando l'aura dei sei demoni (Armor, Gaping, Horn, Starving, Nail, Battle), la
  scheda chiedeva la dimensione (proposta 3) e mostrava "Aura" senza numero → il loro tag "aura" non ha numero, e le
  schede foe / legend leggevano solo i tag, senza guardare il testo come fanno le schede PG → in `abilityArea` un tag
  "aura" senza numero prende la dimensione dal testo dell'azione ("gains aura 2", p.407): Aura 2, senza domanda. Vale
  anche per le legend e per i foe già importati. Solo codice.

## 17 ottobre 2026 — Annullare un'infusione non sblocca più Inner Furnace due volte (versione 1.15.113)

### Round di debug del 16 ottobre, voce emersa su R38b

- **Inner Furnace usabile due volte nello stesso round**: un'infusione armata con Inner Furnace nel round 1 e non
  usata, annullata nel round 2 dopo un altro Inner Furnace (es. STORMLASH), permetteva un altro sacrificio nel round
  2, contro "Once a round" (p.208) → l'annullamento azzerava sempre il segno "Inner Furnace usato", anche quando nel
  frattempo lo aveva riscritto un altro uso → all'armo il sistema ricorda combattimento e round dell'Inner Furnace di
  quell'infusione (`furnaceAt`), e l'annullamento lo azzera solo se il segno è ancora quello. I punti ferita
  sacrificati tornano indietro comunque. Solo codice.

## 17 ottobre 2026 — PHANTOM BLADE resta attiva fino al tuo turno successivo (versione 1.15.112)

### Round di debug del 16 ottobre, voce emersa su R38b

- **PHANTOM BLADE scadeva a fine turno**: usata Drifting Leaf con "Infuse 3 or Slay: PHANTOM BLADE", nel turno del foe
  l'infusione non risultava più attiva e il bottone Infuse si poteva pagare di nuovo, ma il libro dice "Until the
  start of your next turn, this interrupt has unlimited uses" (p.227) → un'infusione già usata valeva solo per il
  turno in cui era stata usata, qualunque cosa dicesse il testo → all'armo il sistema si segna se il testo della
  versione dice "until the start of your next turn"; in quel caso, una volta usata, resta armata nei turni degli altri
  e scade solo all'inizio del turno successivo del personaggio, nello stesso combattimento. Le altre versioni scadono
  a fine turno come prima. Solo codice.

## 17 ottobre 2026 — Gigantas Crusher restituisce la resolve quando un Legend salva (versione 1.15.111)

### Round di debug del 16 ottobre, voce emersa su R37

- **Rimborso della resolve di Gigantas Crusher**: se un Legend superava il tiro salvezza, la card del "% Max HP"
  scriveva solo "refunds the resolve cost" e la resolve non tornava ("refunding this ability's resolve cost on a
  successful save", p.135) → "Use Limit Break" non si ricordava quanta resolve aveva preso dalla riserva personale e
  quanta dal party → ora l'uso del Limit Break si annota la spesa divisa tra personale e party; quando nel "% Max HP"
  un Legend ha "Successful save", la stessa quantità torna alle stesse riserve, una volta sola, e la card lo scrive.
  La distanza sulla linea di Split Heaven and Hell resta da scegliere a mano. Solo codice.

## 17 ottobre 2026 — La misura dell'aura di Fulminate la sceglie chi marca (versione 1.15.110)

### Round di debug del 16 ottobre, voce emersa su R48

- **Talent I di Fulminate con un mark passato al GM**: se il giocatore marcava un personaggio che non è suo, la
  finestra "Aura 2 / Aura 3" compariva al GM invece che al giocatore → il mark lo crea il GM (via socket), e la
  domanda partiva sul client di chi crea il mark → ora la domanda compare sul client del giocatore prima di inoltrare
  il mark; la misura scelta viaggia con la richiesta e resta scritta sul mark, così il GM mette l'aura di quella
  misura senza chiedere niente (p.226). Solo codice.

## 17 ottobre 2026 — Il danno divine salta il vigor anche dalle card (versione 1.15.109)

### Round di debug del 16 ottobre, voce emersa su R37

- **Divine e vigor**: il danno divine applicato col bottone Apply (o ½) di una card di danno veniva ancora assorbito
  dal vigor del bersaglio → il gestore dei bottoni in `icon.mjs` toglieva al divine armor e dimezzamento ma non gli
  diceva di ignorare il vigor, mentre p.104 dice che il divine "cannot be reduced, mitigated, or negated in any way
  except immunity (ignores armor, weak, resistance, defiance, and bypasses vigor)" → ora i bottoni passano anche
  "ignora il vigor" quando la card è divine; tutte le strade (Damage Utility, schede PG / foe / Legend, oggetti sulla
  mappa, inoltro al GM) passano da lì. Piercing e gli altri tipi restano come prima. Solo codice.

## 17 ottobre 2026 — Danno rilanciato di un uso infuso: "Reroll (same use)" (versione 1.15.108)

### Round di debug del 16 ottobre, voce emersa su R38b

- **Danno rilanciato di un uso infuso**: un secondo Damage Roll della stessa abilità infusa (o del Limit Break) nello
  stesso turno usciva base e cancellava l'infusione, anche se a tavolo era solo lo stesso tiro rifatto → ogni Damage
  Roll dopo il primo contava sempre come uso nuovo (p.204: l'Aether "is consumed at the start of the action"; il libro
  non parla di rilanci) → nel dialog del danno c'è la casella "Reroll (same use)": spuntata si tira di nuovo la
  versione infusa e l'infusione resta; vuota è un uso nuovo, sulla versione base, e l'infusione viene cancellata;
  cambiarla riapre il dialog sulla versione scelta. Chiudere il dialog senza tirare non cancella più l'infusione.
- **Il secondo tiro di MAGNARIME cancellava l'infusione**: il danno "again" di MAGNARIME (p.233), come le esplosioni
  di MAGNAPYRE e GREAT SPIRIT LANCE, si tira a parte dopo il danno base, ma il secondo Damage Roll cancellava
  l'infusione e usciva base con l'Aether già speso → stessa causa → quando la versione infusa aggiunge danni suoi
  sotto "Other", la casella "Reroll (same use)" parte già spuntata. Solo codice.

## 17 ottobre 2026 — Limit Break con danno in percentuale degli hp (versione 1.15.107)

### Round di debug del 16 ottobre, voce emersa su R37

- **Gigantas Crusher e Split Heaven and Hell**: questi Limit Break fanno danno come percentuale degli hp massimi del
  bersaglio e non si poteva applicare (il Damage Roll di Gigantas Crusher proponeva solo il "divine fray" dei Legend)
  → il Damage Roll sa leggere solo dadi, fray e numeri fissi, non le percentuali → nuovo bottone "% Max HP" nel
  riquadro Limit Break: si bersagliano i personaggi e per ognuno si sceglie tiro salvezza fallito o riuscito (Gigantas
  Crusher: 50% / 25%, p.135) oppure distanza sulla linea (Split Heaven and Hell: 1 casella 100%, 2-4 caselle 50%, 5+
  caselle 25%, p.127). I Legend seguono il testo: Gigantas Crusher 25% su save fallito oppure divine fray su save
  riuscito; Split Heaven and Hell sempre 25%. La percentuale si calcola sugli hp massimi base, non ridotti dalle wound
  (p.106), arrotondata per eccesso; il danno è divine (ignora armatura, dimezzamenti e vigor, p.104) e passa dalla
  stessa funzione degli altri danni. Dal capitolo 3 una casella per Atomos Crusher (+25% ai non-Legend, già spuntata a
  1 hp o meno). In chat una card di riepilogo più "Damage Applied" per ogni bersaglio. Solo codice.

## 17 ottobre 2026 — Dulce Purgatorio: l'area di Pandaemonium prende tutti i pit (versione 1.15.106)

### Round di debug del 16 ottobre, voce emersa su R49

- **Pandaemonium con DULCE PURGATORIO**: con la Mastery sbloccata l'area di Pandaemonium copriva solo il suo Medium
  Blast, quindi chi stava su un pit fuori dall'area non veniva preso → la prima metà della Mastery ("Pandaemonium's
  area effect … extend to all pits on the battlefield", p.178) non veniva letta; c'era solo l'esplosione dei pit di
  Purgatorio (1.15.96) → lettura (a) scelta da Edoardo: con la Mastery sbloccata e la combo non armata, quando si
  piazza l'area di Pandaemonium (dal bottone dell'area o dal tiro d'attacco) alle sue caselle si aggiungono quelle di
  tutti i pit della scena, nello stesso template ("Medium Blast + all pits"), e chi sta su un pit è bersaglio una
  volta sola. L'area di Purgatorio (combo armata) e "Medium Blast (on pits)" restano come prima. Rimettere i
  personaggi in un'altra casella dell'area resta a mano. Solo codice.

## 17 ottobre 2026 — L'aura di Fulminate arriva da sola con il mark (versione 1.15.105)

### Round di debug del 16 ottobre, voce emersa su R48

- **Aura di Fulminate sul nuovo marcato**: quando il mark di Fulminate andava su un personaggio (o passava da un
  altro), l'aura "while marked" spariva dal primo bersaglio ma sul nuovo non compariva, e bisognava rimetterla a mano
  con il bottone area → la 1.15.80 la toglieva quando il mark finisce, ma niente la metteva quando il mark comincia →
  ora, quando nasce un mark e il testo dell'abilità dice "The character gains aura N while marked" (p.226), l'aura N
  si piazza da sola intorno al token marcato, lo segue ed è legata a quel mark (finisce con lui). Solo con il Talent I
  ("When marking a character, you can increase the area to 3") una finestra chiede Aura 2 o Aura 3. Se l'aura di quel
  mark è già sulla mappa non ne viene messa una seconda; rimarcando lo stesso personaggio resta una sola aura. Solo
  codice.

## 17 ottobre 2026 — Card del Limit Break: niente status dalle versioni Infuse non armate (versione 1.15.104)

### Round di debug del 16 ottobre, voce emersa su R37

- **Status degli Infuse non armati**: la card di "Use Limit Break" mostrava i bottoni degli status nominati in una
  versione Infuse anche quando quella versione non era infusa → gli status venivano cercati in tutto il testo
  dell'effetto e dell'Ultimate, versioni Infuse comprese → ora prima della ricerca si tolgono dal testo le versioni
  Infuse non armate (nuova `withoutUnarmedInfusions` in `helpers/infuse.mjs`), perché "only one infuse effect can
  trigger at a time" (p.204). Restano la versione armata (solo nel testo da cui viene, effetto o Ultimate) e le "Slay
  or Infuse", che lo Slay può far scattare senza infondere, come fa la card delle abilità con `splitInfuseBlocks`. Un
  limit break senza versioni Infuse viene letto come prima; nel pack nessun Infuse di limit break nomina status,
  quindi oggi la differenza si vede solo su limit break fatti a mano. Solo codice.

## 17 ottobre 2026 — Le aree d'attacco di Geo, The Tower e Dark Sliver non restano più sulla mappa (versione 1.15.103)

### Round di debug del 16 ottobre, voce emersa su R49

- **Aree che restavano come terrain effect**: l'Arc di Geo, l'area di The Tower e quella di Dark Sliver restavano
  sulla mappa anche dopo il turno, come se fossero terrain effect → il loro "Terrain effect:" crea solo un oggetto o
  sceglie uno spazio (il masso di Geo p.218, il meteorite di The Tower p.203, lo spazio dell'anima di Dark Sliver
  p.187), ma il sistema lo leggeva come se rendesse terrain tutta l'area (i terrain effect sono "passive effects that
  modify the terrain spaces of the battlefield", p.95-96); in più contava anche l'elenco dei nomi dei blocchi ("hit,
  miss, area, terrain effect…") → quei blocchi e quell'elenco non decidono più se l'area resta: le tre aree spariscono
  al turno dopo come quella di Holy, mentre i terrain effect che descrivono l'area stessa (Blood Grove, Tsunami,
  Sanctify…) restano come prima. Simulato sul pack jobs: le aree che restano passano da 25 a 22, cambiano solo queste
  tre. Solo codice.

## 17 ottobre 2026 — Sturmreiten: con MJÖLLNIR il Talent II aggiunge un secondo Arc 5 (versione 1.15.102)

### Round di debug del 16 ottobre, voce emersa su R47b

- **Sturmreiten con mastery e Talent II**: con MJÖLLNIR l'area diventa un Arc 5 e l'estensione del Talent II non
  veniva offerta → R47b la proponeva solo dopo una Line, ma MJÖLLNIR "Create an arc 5 area any time you would create
  an area with this ability instead" (p.227) vale anche per l'area aggiunta dal Talent II → ora, piazzato l'Arc 5, la
  stessa finestra chiede "dal primo spazio / dall'ultimo spazio / nessuna estensione"; il secondo Arc 5 si dipinge
  partendo da una casella evidenziata accanto a quell'estremità, non nel verso in cui il primo arco corre lì ("drawn
  in a different direction", lettura scelta: come per la Line), senza passare sul primo arco né sul personaggio; i due
  archi diventano un solo template ("Arc 5 + Arc 5") e colpiscono insieme. Solo codice.

## 17 ottobre 2026 — Aethershard senza bottone danno (versione 1.15.101)

### Round di debug del 16 ottobre, voce emersa su R33a3

- **Aethershard: bottone "Damage Roll" sull'abilità**: la scheda offriva un tiro danno Hit 2 piercing su Aethershard →
  il parser del danno, non trovando "On hit:" né "Area Effect:", leggeva tutta la descrizione e prendeva i "2 piercing
  damage" del Summon Effect, che li infligge lo shard quando un'area lo include (p.210-211), non l'abilità → sulla
  scheda del personaggio il danno scritto dentro un blocco "Summon Effect:" / "Object Effect:" non conta più come
  danno dell'abilità, né come Hit né come voce sotto Other; il danno della risonanza resta sulla sua carta; le azioni
  di foe e legend continuano a leggerlo (lì il bottone serve al GM per torpedo, munition e simili). Su tutte le 703
  combinazioni del pack jobs cambia solo Aethershard. Solo codice.

## 17 ottobre 2026 — Il danno dei blocchi Mark / Effect della base si tira da Other (versione 1.15.100)

### Round di debug del 16 ottobre, voce emersa su R40

- **Danno dei blocchi della base**: il Mark di Incubus (p.164, "both the target and any adjacent foes take 2 damage
  and are dazed"), l'Effect di Chastise (p.179, "1 divine damage three times") e simili non comparivano nel Damage
  Roll, nemmeno sotto Other → Other leggeva solo talenti, mastery, combo e versioni Infuse, non i blocchi della
  descrizione base → per le abilità dei PG ogni frase con danno dentro Mark / Effect / Terrain Effect / Stance /
  Summon Effect diventa una chip in Other col nome del blocco: Incubus, Chastise, Astral Chain, Sidhe, Quaking Palm,
  Rook, Blitz, Circle the Oak, Dark Sliver, Astra, Nothung (divine con EXCALIBUR), Drifting Leaf. Restano fuori le
  righe Hit / Miss / Area, un Area effect già coperto da Area, le versioni Infuse e le frasi che cambiano il danno
  invece di aggiungerne. Foe, legend e summon non cambiano. Confrontate tutte le 271 voci del pack jobs: Hit / Miss /
  Area cambiano solo dove è giusto (sotto).
- **Danno "unerring"**: "2 unerring damage" (Mark di Astral Chain p.156, Showdown p.157, Warding Bolts) non contava
  come danno → la parola "unerring" tra il numero e "damage" non era riconosciuta → ora conta: Showdown e Warding
  Bolts hanno il loro Damage Roll. Solo codice.

## 17 ottobre 2026 — Slay or Infuse armato mostrato una volta sola, come versione infusa (versione 1.15.99)

### Round di debug del 16 ottobre, voce emersa su R46

- **Slay or Infuse armato sulla card Show in Chat**: con GRAM (Nothung) o GRAN BLITZ (Blitz) armati, la card mostrava
  il blocco "Slay or Infuse 3" tra quelli base come testo normale, senza il riquadro "Infused" e senza il nome della
  versione nel titolo, mentre la card di attacco la dava per infusa (e lì il blocco compariva già una volta sola) → da
  R46 il blocco "Slay or Infuse" resta sempre tra i blocchi base, perché lo Slay può attivarlo anche senza Aether,
  quindi non veniva mai trattato come la versione armata → ora, quando è armato, lascia i blocchi base e diventa il
  blocco "Infused — Slay or Infuse 3: GRAM" in cima, con il titolo "Nothung — GRAM"; senza niente di armato resta tra
  i blocchi base, visibile. Solo codice.

## 17 ottobre 2026 — L'area di Holy non resta più sulla mappa (versione 1.15.98)

### Round di debug del 16 ottobre, voce emersa su R49

- **Medium Blast di Holy/Hades come terrain effect**: l'area dell'attacco di Hades restava sulla mappa e non spariva
  al turno dopo → la riga della combo "Terrain Effect: Create a pit under your target" (Holy p.177) finiva nel testo
  base dell'abilità (`baseAreaText` in `area-terrain.mjs`), quello che decide se la sua area resta → ora la combo è
  esclusa da quel testo, come i talenti e la mastery: il pit è un terrain effect, la Medium Blast no. Simulato su
  tutto il pack jobs (copia): le aree che restano passano da 25 a 24 e cambia solo Holy. L'area della mastery
  MAGNASANCTI resta come prima; l'esplosione dei pit di Talent I nello stesso turno trova ancora l'area. Solo codice.

## 17 ottobre 2026 — Pit sotto i foe pacified (Pandaemonium Talent II) (versione 1.15.97)

### Round di debug del 16 ottobre, voce emersa su R49

- **Pandaemonium, Talent II**: "its effect causes pits to appear under every pacified foe" (p.178) non metteva nessun
  pit: andavano messi a mano, uno per uno, con il chip "Pit · 1" della combo → la frase non ha un verbo come "create"
  né un numero, quindi il riconoscimento dei pit non la vedeva, e anche riconosciuta sarebbe stata scartata come
  doppione del pit della combo ("Create a pit under the attack target", p.177) → ora con il Talent II scelto la scheda
  mostra un secondo chip "Pits under pacified foes": il clic trova sulla scena i token ostili con lo status pacified
  che non hanno ancora un pit sotto, chiede una volta "Mark a pit space under …?" (lo schema del Volcanic Geyser) e
  mette un pit sotto ognuno, con una card in chat con Remove all. Senza foe pacified avvisa e non fa niente. Nulla
  parte senza il clic. Solo codice.

## 17 ottobre 2026 — Dulce Purgatorio fa esplodere tutti i pit del campo (versione 1.15.96)

### Round di debug del 16 ottobre, voce emersa su R49

- **Dulce Purgatorio**: con la Mastery di Pandaemonium sbloccata, "Medium Blast (on pits)" faceva esplodere solo i pit
  dentro l'area dell'abilità → il controllo "dentro l'area" in `pitBlastCells` non leggeva la Mastery ("Purgatorio's
  pit explosion effect extend to all pits on the battlefield", p.178) → con la Mastery sbloccata esplodono tutti i pit
  della scena, e non serve più piazzare prima l'area dell'abilità; senza Mastery resta tutto come prima. La prima metà
  della Mastery (l'Area Effect di Pandaemonium su tutti i pit) resta da decidere. Solo codice.

## 17 ottobre 2026 — Il bersaglio d'attacco segue l'area, non solo il nome dell'azione (versione 1.15.95)

### Round di debug del 16 ottobre, voce emersa su R41

- **Bersaglio d'attacco di un'area vecchia**: ripiazzando a mano l'area di un'abilità dopo un tiro, Show in Chat (PG,
  foe e legend) e la finestra del danno potevano partire dal bersaglio scelto per l'area precedente, se quel token era
  ancora tra i bersagli → il bersaglio scelto era legato solo ad attore + nome dell'azione, non all'area → quando
  sulla mappa compare una nuova area di quell'abilità (hook `createMeasuredTemplate` in `roll-dialogs.mjs`, sul client
  che la crea) la scelta precedente viene dimenticata. Il tiro d'attacco che piazza l'area sceglie il bersaglio dopo
  averla piazzata, quindi la sua scelta resta; un'area già sulla mappa riusata dall'attacco e l'esplosione dei pit non
  la azzerano. Solo codice.

## 17 ottobre 2026 — Split Heaven and Hell e Lycanthropy con le parole del libro (versione 1.15.94)

### Round di debug del 16 ottobre, voce emersa su R39

- **Parole dei Limit Break diverse dal libro**: Split Heaven and Hell diceva "depending on their distance from you" e
  "(maximum 3 width)", Lycanthropy non aveva "(including this one!)" nel secondo punto → testo del pack trascritto a
  parole proprie (la migrazione 31 aveva sistemato solo l'elenco delle distanze e la descrizione) → ora il pack jobs
  dice come il libro: "their distance on the line from you", "by 1 space, to a maximum of 3 width, and its length"
  (p.127) e "abilities, summons, or actions (including this one!) may be increased by +1" (p.168), sia sull'oggetto
  Limit Break sia nel template del job (Demon Slayer, Warden). La migrazione 34 corregge le copie già nel mondo che
  hanno ancora le frasi vecchie. Pack + migrazione.

## 17 ottobre 2026 — I pit esplodono dall'area: Holy Talent I e Purgatorio (versione 1.15.93)

### Round di debug del 16 ottobre, voce emersa su R49

- **Esplosioni dei pit da piazzare a mano**: le esplosioni dei pit di Holy Talent I e della combo Purgatorio di
  Pandaemonium (p.177, "all pits in the area explode for a medium blast area effect, centered on them") andavano
  piazzate a mano, una Medium Blast alla volta, e chi era preso da due esplosioni andava contato una volta sola a
  occhio → `centreOf` lasciava apposta a mano le aree "centered on them" dopo i pit, e quella Medium Blast aveva la
  stessa etichetta dell'area dell'attacco, quindi la scelta dell'area non la proponeva nemmeno → ora il bottone
  dell'area propone "Medium Blast (on pits)": prende l'area dell'abilità già sulla mappa (la più recente), trova tutti
  i pit al suo interno e mette una Medium Blast su ognuno, unite in un solo template, e bersaglia chi sta in almeno
  una delle esplosioni una volta sola ("characters in at least one area"). L'area dell'abilità resta; viene sostituita
  solo un'esplosione precedente della stessa abilità. Il tiro d'attacco non la usa mai come area dell'attacco. Se
  l'area o i pit mancano compare un avviso e non succede nulla. Plants / nails / clouds restano a mano. Solo codice.

## 17 ottobre 2026 — L'infusione si consuma con l'uso dell'abilità (versione 1.15.92)

### Round di debug del 16 ottobre, voce emersa su R38b

- **Infusione riusata gratis**: nello stesso combattimento la seconda volta l'abilità (o il Limit Break) usciva di
  nuovo infusa senza pagare Aether → la card, il tiro d'attacco, il Damage Roll e "Use Limit Break" leggevano
  l'infusione armata senza mai consumarla (lo facevano solo oggetti e terreni), mentre per il manuale l'Aether si
  spende all'inizio dell'azione e vale per un uso (p.204) → ogni passo (card, attacco, danno) segna fin dove è
  arrivato l'uso: un passo che si ripete o torna indietro è l'uso successivo ed esce base, con l'Aether già speso.
  Un'infusione usata scade a fine turno e annullarla dopo l'uso non rimborsa più l'Aether. Il pulsante dell'area non
  conta come passo, quindi danno e area dopo la card leggono ancora la versione infusa. Limite noto: rilanciare il
  danno dello stesso uso conta come uso nuovo ed esce base. Solo codice.

## 17 ottobre 2026 — Il danno aggiunto dalle versioni Infuse delle abilità compare in Other (versione 1.15.91)

### Round di debug del 16 ottobre, voce emersa su R46

- **Danno delle versioni Infuse armate**: MAGNARIME (Rime p.233, "Deal 1 piercing damage to all characters in the area
  again … for every two aether infused"), BOULDER KICK (Dragon Dive p.218, "they take 2 piercing damage twice
  instead"), INCANDIUS (Soul Burn p.210, "dealing 1 piercing") e GRAM (Nothung p.225) non comparivano tra le scelte di
  Other nel tiro del danno → il programma leggeva solo le righe Hit / Miss / Area della versione armata e le frasi che
  cambiano il danno, e il danno che la versione aggiunge si perdeva; MAGNARIME, essendo una Mastery, veniva proposto
  sempre come "Mastery", anche senza Aether spesa, e una volta sola → ora ogni frase con danno aggiunto della versione
  armata diventa una scelta in Other con il nome della versione ("Infuse 3 — BOULDER KICK"). MAGNARIME compare solo da
  armato e conta un'istanza ogni 2 Aether spese ("Infuse X — MAGNARIME (4 Aether)", Instances 2); INCANDIUS, che nel
  libro non ha la parola "damage", conta come 1 piercing. Ora compaiono anche le esplosioni di MAGNAPYRE e GREAT
  SPIRIT LANCE.
- **Slay or Infuse**: i blocchi "Slay or Infuse 3" / "Infuse 3 or Slay" non avevano il bottone Infuse, perché come
  costo si riconosceva solo "Infuse N" → ora il costo si legge anche lì: GRAM, GRAN BLITZ, RUINÖS, HEIMDALL e PHANTOM
  BLADE hanno il bottone. Il loro danno è sempre proposto in Other, anche senza Aether, perché lo attiva anche lo
  Slay; sulla card in chat il blocco resta al suo posto.
- **Excalibur su GRAM**: con la Mastery EXCALIBUR ("All 1 piercing damage listed by this ability becomes divine",
  p.225) il danno di GRAM restava piercing → la regola che cambia il tipo di danno vale anche per il danno delle
  versioni Infuse: GRAM diventa 1 divine, due volte. Solo codice.

## 17 ottobre 2026 — Card del Limit Break: niente bottoni di status doppi con l'Infuse armato (versione 1.15.90)

### Round di debug del 16 ottobre, voce emersa su R37

- **Bottoni di status dell'Infuse doppi sulla card del Limit Break**: con una versione Infuse armata, gli status
  scritti nel suo testo potevano avere due serie di bottoni sulla card di "Use Limit Break" (succede con l'Infuse
  dell'Ultimate, al posto di METEOR; nei limit break del compendio nessun Infuse nomina status, quindi si vedeva solo
  su limit break fatti a mano) → gli status si cercavano sul testo dell'effetto più quello dell'Infuse armato, ma il
  testo dell'Infuse viene preso proprio da dentro l'effetto o l'Ultimate, quindi lo stesso testo veniva letto due
  volte (e la seconda copia finiva sotto l'etichetta sbagliata) → gli status si cercano solo su effetto e Ultimate,
  che contengono già l'Infuse. Solo codice.

## 17 ottobre 2026 — Aethershard: torna il testo del libro (versione 1.15.89)

### Round di debug del 16 ottobre, voce emersa su R33a3

- **Aethershard, Summon Effect**: nel compendio diceva "the ability deals 2 piercing damage as an area effect … Then
  destroy all activated Aethershards and gain 1 Aether" → il testo del pack era una parafrasi, non quello del libro
  (p.210-211: "the ability resonates with the shards, dealing 2 piercing damage as an area effect … Then destroy all
  Aethershards activated this way and gain 1 Aether") → il pack dei job ora ha la frase del libro, e la migrazione 33
  la mette anche nelle copie già sulle schede che hanno ancora quella vecchia. Il resto della frase era già uguale al
  libro. Il dialog "Aethershard caught" di quando un'area prende gli shard funziona come prima con tutte e due le
  forme (danno 2 piercing per shard, +1 Aether).

## 17 ottobre 2026 — Show in Chat delle azioni foe / legend divide le righe di un'area (versione 1.15.88)

### Round di debug del 16 ottobre, voce emersa su R41

- **Show in Chat di un'azione d'attacco foe / legend con un'area**: con l'area dell'azione ancora sulla mappa e più
  token bersagliati, la card mostrava a tutti tutti i bottoni Inflict, sia la parte d'attacco sia quella d'area → le
  schede foe e legend non passavano a `statusBlockHtml` nessun bersaglio d'attacco (la scheda PG lo fa dalla 1.15.86)
  → ora `#actionStatusHtml` cerca l'area dell'azione sulla mappa (chiave `action:<nome>`): il bersaglio d'attacco è il
  token al centro di un Blast / Burst (p.97: "The origin space and the attack space (if there is one) is the central
  space"), altrimenti quello scelto nel dialog d'attacco; lui riceve la parte d'attacco e gli altri solo quella
  d'area. Se il bersaglio non si conosce restano tutti i bottoni con le etichette "attack target only". Tratti,
  interrupt e round action non cambiano. Solo codice.

## 17 ottobre 2026 — Helix Heel: tornano le tre parole del libro (versione 1.15.87)

### Round di debug del 16 ottobre, voce emersa su R55

- **Helix Heel, secondo Effect**: nel compendio diceva "you can keep extending the line by 3 spaces, but can only
  extend it once per object" → al testo del pack mancavano tre parole del libro (p.219: "by 3 spaces this way each
  time, but can only extend it once per object") → il pack dei job ora ha "this way each time", e la migrazione 32
  aggiunge le stesse parole alle copie già sulle schede che hanno ancora la frase vecchia. Nient'altro cambia
  (bottone dell'area line 3, danno, Charge).

## 17 ottobre 2026 — Card Auto-hit e Show in Chat sanno chi è il bersaglio d'attacco di un'area (versione 1.15.86)

### Round di debug del 16 ottobre, voce emersa su R41

- **Bersaglio d'attacco senza il dialog dell'attacco**: con più token in un'area piazzata, la card "Auto-hit" e la
  card di Show in Chat davano tutti i bottoni Inflict a tutti, e i gruppi erano solo etichettati "attack target only"
  → la divisione per righe (attacco al bersaglio d'attacco, blocco Area agli altri) la faceva solo la card del tiro
  d'attacco, perché il bersaglio d'attacco veniva solo dal dialog dell'attacco, che l'auto-hit salta → ora l'auto-hit
  prende come bersaglio d'attacco il token nello spazio centrale di un Blast / Burst (p.97: "The origin space and the
  attack space (if there is one) is the central space"); con un Line / Arc ("the attack space is any character in the
  area", p.97) lo chiede in un piccolo dialog. Poi divide le righe come la card d'attacco ("(attack target)" /
  "(area)"), la riga dell'area dice "attack: X · area: Y, Z" e il dialog del danno che segue parte già su quel token.
  Show in Chat di un'abilità d'attacco la cui area è ancora sulla mappa usa il centro dell'area, o il bersaglio scelto
  per quell'area; se non si sa resta come prima. Show in Chat non chiede mai niente.

## 17 ottobre 2026 — Wish, mastery: Unstoppable all'alleato, non a te (versione 1.15.85)

### Round di debug del 16 ottobre, voce emersa su R42

- **Wish, Star Scorned Hermit** (Seer, p.203): "they also gain defiance, then become unstoppable until the end of
  their next turn" dava il Gain Unstoppable a chi usa l'abilità, e la Defiance dell'alleato prendeva la durata
  dell'Unstoppable → "then become" senza soggetto veniva letto come un ordine a te, e la durata veniva cercata oltre
  la virgola fino a "until the end of their next turn" → una frase senza soggetto che comincia con "then/and" subito
  dopo un "they / one of them" tiene lo stesso destinatario (qui l'alleato), e una durata scritta dopo ", then …" vale
  solo per quella frase. Ora la Defiance va all'alleato senza durata (resta finché non scatta, p.104) e l'Unstoppable
  va all'alleato "until the end of their next turn". Confrontati vecchio e nuovo su tutti i 4719 testi dei pack:
  cambia solo Wish. Solo codice.

## 17 ottobre 2026 — Aria: la blast cresciuta resta centrata su di te (versione 1.15.84)

### Round di debug del 16 ottobre, voce emersa su R49

- **Aria, Medium Blast e Large Blast da piazzare a mano**: il bottone area di Aria (Chanter, p.178) metteva la Small
  Blast sul token del personaggio da sola, ma la Medium Blast e la Large Blast della Special ("the area becomes a
  medium blast. If you are damaged again, it becomes a large blast") si piazzavano a mano come un'area qualsiasi → il
  "centered on you" sta solo nella prima frase, e il sistema leggeva il centro di ogni area solo nella frase in cui
  compare → un'area che lo stesso testo fa crescere più avanti ("the area becomes …", "it becomes …") tiene il centro
  dell'area prima: ora la scelta offre "Medium Blast (self)" e "Large Blast (self)", che vanno sul token del
  personaggio senza clic. Nei compendi cambia solo Aria; le aree centrate su oggetti (Helix Heel, Volcanic Geyser)
  erano già a posto da R33a2. Solo codice.

## 17 ottobre 2026 — Il danno di Succubus resta [D]+fray su Hit, i 3 danni ai marcati vanno sotto Other (versione 1.15.83)

### Round di debug del 16 ottobre, voce emersa su R40

- **Succubus metteva 3 danni al posto di [D]+fray**: con la combo di Incubus armata, il Damage Roll proponeva 3 su Hit
  invece di [D]+fray → `parseComboAbilityDamage` trattava ogni testo combo senza etichette Hit / Miss / Area come un
  nuovo Hit. Nel libro (p.164) Succubus dice "Instead of the mark, gain Effect: deal 3 damage to all characters marked
  by Incubus, and teleport them 2": cambia solo il Mark, l'attacco resta "On hit: [D]+fray. Miss: fray damage" → ora
  il danno scritto in un Effect che la combo aggiunge non sostituisce più l'Hit. Compare sotto **Other** come voce
  "Combo — Succubus" (3 danni, un clic riempie il pannello). Hit e Miss restano quelli della base. Le altre combo del
  compendio Jobs danno lo stesso danno di prima (controllate tutte e 17). Solo codice.

## 17 ottobre 2026 — L'Ultimate dei Limit Break compare su scheda e card (versione 1.15.82)

### Round di debug del 16 ottobre, voce emersa su R37

- **Ultimate del Limit Break invisibile**: il riquadro Limit Break della scheda e la card di "Use Limit Break"
  mostravano solo l'Effect; l'Ultimate (p.113, sbloccato entrando nel capitolo 3) non compariva da nessuna parte,
  nemmeno al capitolo 3, anche se il Damage Roll e le aree ne leggevano già il testo → il template della scheda e il
  messaggio in chat leggevano solo il campo `effect` e ignoravano `ultimate` → ora la scheda mostra sotto l'Effect un
  blocco "Ultimate", impaginato come l'Effect, sbiadito e con il lucchetto "Chapter 3" finché il personaggio non è al
  capitolo 3. Dal capitolo 3 (la stessa soglia del Damage Roll) la card di "Use Limit Break" aggiunge il testo
  dell'Ultimate dopo l'Effect, con i bottoni degli status che infligge o concede (gruppo "Ultimate").

## 17 ottobre 2026 — L'infusione armata non sopravvive al combattimento (versione 1.15.81)

### Round di debug del 16 ottobre, voce emersa su R38b

- **Infusione armata a fine combattimento**: un'infusione armata e non usata (abilità o Limit Break) restava "armed"
  anche nel combattimento successivo, già pagata e pronta → "End Encounter" azzerava l'Aether ("All Aether disperses
  at the end of combat", p.204) ma non toglieva il segno `flags.icon-system.infused` che dice quale versione è armata
  → a fine combattimento quel segno ora viene cancellato insieme all'Aether. È una semplice cancellazione, non un
  annullamento: l'Aether non torna e, con Inner Furnace, non tornano nemmeno gli hp sacrificati (il rimborso di R64
  resta solo per il tasto che annulla l'infusione).

## 17 ottobre 2026 — L'aura di Fulminate finisce con il mark (versione 1.15.80)

### Round di debug del 16 ottobre, voce emersa su R48

- **Aura di Fulminate sul personaggio marcato**: l'Aura 2 (o 3 / 1 con i talenti) piazzata attorno al personaggio
  marcato restava sulla mappa quando il mark finiva o passava a un altro bersaglio, e andava tolta a mano ("The
  character gains aura 2 while marked", p.226) → l'aura non sapeva di dipendere dal mark → ora un'aura data a un altro
  personaggio da un testo che dice "while marked" si ricorda di quale mark dipende (chi ha marcato, quale abilità, su
  chi), e quando quel mark finisce il GM attivo la toglie dalla mappa da solo: tolto dalla ✕, marcato un altro
  bersaglio, chi ha marcato sconfitto, fine del combattimento. Le aure piazzate prima di questa versione si tolgono
  ancora a mano.

## 17 ottobre 2026 — Avvio del combat senza promemoria "End of round 0" (versione 1.15.79)

### Round di debug del 16 ottobre, voce emersa su R62

- **Promemoria di fine round all'avvio del combat**: premendo "Begin Combat" in chat compariva subito "End of round 0"
  (Paleblood: "Tick the Paleblood die up by 1"), anche se nessun round era ancora finito; il manuale dice di far
  salire il dado "at the end of each round" (p.252) → `startCombat` porta il round da 0 a 1 senza indicare una
  direzione, e l'hook `updateCombat` (`IconCombat.mjs`, blocco "Round advanced") lo trattava come un avanzamento di
  round normale: postava i promemoria relic "round-end" e controllava le riserve dell'Encounter Designer già al round
  1 → quella parte ora parte solo quando il round nuovo è 2 o più, come già succedeva per le aree che crescono
  (Bifröst). Il promemoria "cosa si attiva in questo round" (R62) continua a uscire anche al round 1.

## 17 ottobre 2026 — Il clic destro che chiude la scelta di uno spazio non apre più l'HUD del token (versione 1.15.78)

### Round di debug del 16 ottobre, voce emersa su R33b

- **Clic destro nella scelta di uno spazio degli oggetti della mappa**: durante "Teleport here", "Erupt" o "Move"
  dello shard il clic destro chiudeva la scelta, ma se sotto il cursore c'era un token si apriva anche il suo HUD →
  `pickSpace` (`module/canvas/map-objects.mjs`) chiudeva la scelta senza fermare l'evento, che proseguiva fino al
  token (il clic sinistro invece veniva già fermato) → ora il clic destro viene fermato anche lui (`stopPropagation`),
  come fa già la scelta degli spazi del terreno in `terrain-spaces.mjs`.

## 17 ottobre 2026 — Tre Limit Break riallineati al libro (versione 1.15.77)

### Round di debug del 16 ottobre, voce emersa su R39

- **Split Heaven and Hell, distanze in riga** (p.127): nel libro "1 space / 2-4 spaces / 5+ spaces" è un sotto-elenco
  sotto "Sever Divine Thread" → nel compendio erano in una riga separata da ";" → ora sono tre righe "◦", che la scheda,
  la card e la sheet dell'item mostrano rientrate sotto la riga "•" (nuovo: il sistema sapeva fare solo elenchi a un
  livello, ora un "◦" a inizio riga è un sotto-punto).
- **Paradiso senza la prima frase dell'Aura** (p.155): "You gain an aura of supernatural accuracy, charging your
  weapons and the weapons of your allies with aether." mancava → rimessa come testo del blocco Aura, con "You gain
  Aura 2…" nel paragrafo sotto come nel libro.
- **Lycanthropy tagliata** (p.168): il testo di colore finiva a "…pours into you." → aggiunto ", granting you massively
  increased speed and power."
- Compendio Jobs corretto (Limit Break e template dei job). Migrazione 31: aggiorna le copie già sulle schede e nella
  sidebar che hanno ancora il passaggio vecchio parola per parola.

## 17 ottobre 2026 — Infuse più economico: Conqueror's Edge e Inner Furnace (versione 1.15.76)

### Round di debug del 16 ottobre, punto R64

- **Costo dell'Infuse sempre pieno**: con Conqueror's Edge o Inner Furnace l'Infuse costava comunque l'Aether stampato
  → il bottone Infuse toglieva il costo dell'etichetta senza guardare i tratti → ora il costo si riduce prima di pagare,
  per le abilità e per le versioni Infuse del Limit Break.
- **Conqueror's Edge** (Spellblade, p.224): −1 automatico se un token ostile è entro range 2 dal token del PG (serve il
  token sulla scena). La card in chat lo scrive ("Conqueror's Edge: −1, a foe is in range 2").
- **Inner Furnace** (Enochian, p.208): una volta per round un dialog chiede "Sacrifice N hp" (25% degli hp massimi =
  VIT, perché le percentuali usano gli hp base, p.106) o "Pay N Aether". Se accetti paghi 2 Aether in meno e perdi quegli
  hp direttamente, senza armor né resistenze e mai sotto 1 hp (regola Sacrifice, p.103). Il dialog compare anche quando
  l'Aether da solo non basterebbe ma col −2 sì. Chiuderlo con la ✕ annulla l'Infuse. Fuori combat si può usare sempre.
- **Annullare** un'infusione armata (ripremere il bottone) restituisce l'Aether pagato e, se c'era Inner Furnace, anche
  gli hp e l'uso del round.
- **Scelte nostre** (il libro non lo dice): i due sconti si sommano (Conqueror's Edge prima, poi Inner Furnace); il costo
  non scende sotto 0; l'Infuse X non viene scontato, perché lì l'Aether scelto è la quantità dell'effetto ("per Aether
  infused"). Solo codice, nessun dato cambiato.

## 17 ottobre 2026 — Soglie di crit / exceed variabili: Soulfire, Arenheir e a mano (versione 1.15.75)

### Round di debug del 16 ottobre, punto R63

- **Soglie fisse nel tiro d'attacco**: con Soulfire o Arenheir il tiro contava comunque crit 20+ ed exceed 15+ →
  le soglie erano scritte fisse nel codice → ora il dialog d'attacco le calcola e le mostra in due nuovi stepper
  "Crit on" / "Exceed on", che si possono cambiare a mano (come chiedeva Maar, "actively modify"); la card in chat usa
  quei valori ("Exceed (13+)", e accanto al totale "crit 18+ · exceed 13+" quando non sono 20 / 15).
- **Soulfire** (Enochian, p.208): da bloodied crit 18+ / exceed 13+, a 1 HP 15+ / 10+.
- **Arenheir III** (p.252): −1 a entrambe, −2 dal round 3, −3 dal round 5 (fuori combat −1).
- **Arenheir Aspect**: ogni critico nel combat abbassa il crit di 1 per gli attacchi dopo, mai sotto 15+; il conto è
  sulla relic e riparte a ogni combat.
- **Come si combinano** (il libro non lo dice, lettura più semplice): Soulfire fissa il valore di partenza, Arenheir III
  lo abbassa, poi l'Aspect abbassa il crit fino a 15+ al massimo (se è già 15 o meno, l'Aspect non aggiunge niente).
  Esempio: Enochian bloodied con Arenheir III al round 3 → crit 16+, exceed 11+.
- Foe, legend e summon hanno gli stessi stepper (partono da 20 / 15). Solo codice, nessun dato cambiato.

## 17 ottobre 2026 — Chronotemper: tolta l'etichetta "Power Die" (versione 1.15.74)

### Round di debug del 16 ottobre, punto R52

- **Chronotemper** (Fool, p.152): sulla scheda c'era l'etichetta "Power Die" ma l'abilità non usa nessun dado → il libro
  stampa davvero "1 action / Mark, Power die", ma è un errore: né il testo né i talenti né la mastery usano un power die
  (Cheat Time fa un Gamble) → su richiesta di Maar il compendio Jobs ora ha solo il tag "Mark", così un giocatore non
  cerca un dado che non c'è (qui ci discostiamo apposta dal libro).
- La migrazione 30 toglie "Power Die" anche dalle copie già sulle schede e nella sidebar (gli altri tag restano).

## 17 ottobre 2026 — Sturmreiten: la seconda Line 3 del Talent II (versione 1.15.73)

### Round di debug del 16 ottobre, punto R47b

- **Sturmreiten, Talent II** (Spellblade, p.227: "Comeback: You may extend Sturmreiten's area by another line 3 area,
  drawn in a different direction"): non c'era modo di aggiungere la seconda Line → il piazzamento faceva una sola Line
  alla volta e il testo del talento non veniva letto → ora, col Talent II scelto, dopo aver piazzato la Line 3 si apre
  la domanda "another Line 3?": **From the first space / From the last space / No extension** (il libro non dice da
  dove parte; Maar: dal primo o dall'ultimo spazio, a scelta). Si clicca una delle caselle evidenziate accanto a quello
  spazio e la seconda Line 3 parte da lì, in una direzione diversa da quella della prima e senza sovrapporsi a lei. Le
  due Line diventano un solo template ("Line 3 + Line 3") e i bersagli sono quelli di entrambe.
- **Comeback**: se il PG non è bloodied la domanda lo dice e propone "No extension" come scelta di default; si può
  comunque estendere (decide il tavolo).
- Senza il talento, o con l'Arc 5 della mastery MJÖLLNIR, non cambia niente. Solo codice, nessun dato cambiato.

## 16 ottobre 2026 — Open the Gates: lo Special davanti alle due versioni (versione 1.15.72)

### Round di debug del 15 ottobre, punto R34

- **Open the Gates** (Sealer, p.194: "Effect: This attack gains +1 boon, cannot miss (turn any miss into a hit) and
  triggers any exceed effects the first time it is used in combat."): sulla scheda quel blocco compariva dopo l'Exceed e
  sembrava dipendere dall'exceed → il libro lo stampa sotto la riga Exceed, prima della combo, ed è ambiguo; Edoardo ha
  scelto di leggerlo come regola di tutta l'abilità → nel compendio Jobs il blocco ha ora l'etichetta "Special:" ed è in
  testa, come lo Special di Raging Wolf (p.137): Special, Effect (Teleport 1), Hit, Miss, Exceed. Parole del libro
  invariate.
- **Anche sulla versione combo**: Center the Temple è una combo completa e la card della combo non teneva niente della
  versione base → ora una combo completa tiene in cima i blocchi "Special" della base (solo Open the Gates ne ha uno fra
  le abilità combo), quindi Show in Chat con la combo armata mostra lo Special sopra i blocchi di Center the Temple.
- La migrazione 29 fa lo stesso sulle copie già sulle schede e nella sidebar (solo quelle con il testo e l'ordine
  originali, non quelle modificate a mano).

## 16 ottobre 2026 — Segni che seguono un personaggio (versione 1.15.71)

### Round di debug del 15 ottobre, punto R33d

- **Segno su un personaggio**: "You can cause one of your Polaris to follow a character as a mark instead of a space"
  (Polaris Talent I p.202), "You can throw the party favor at any character in range instead, making it a mark" (AMICO di
  Party Favor p.151), "You can choose a character with this ability instead of a space" (WAKING VOID di Implode p.211) →
  il chip di R33b ("Polaris · 1", "Mine · 1", "Implode · 1") sapeva mettere il segno solo su uno spazio → ora, con il
  talento scelto o la mastery sbloccata, il clic chiede **On a space / On <bersaglio>**. Sul personaggio targettato
  (uno solo, T sopra il token) nasce il mark del sistema (lo stesso del bottone Mark, che Polaris Talent I e Amico avevano
  già) e il GM attivo mette lo spazio viola "Polaris (mark)" sulle caselle del token: lo segue quando si muove, come le
  aure. Nessuna domanda entrando o uscendo (sul personaggio non ci entra nessuno).
- **Mark e spazio vanno insieme**: regola dei mark p.95 ("Each ability typically places only one mark, and a character can
  only mark another character with one mark at a time … Marks also end if the character placing them is defeated") →
  usata quella già fatta in `marks.mjs`. Il mark che finisce (✕ sul chip del mark, creatore a 0 hp, fine del combat, un
  mark nuovo dello stesso creatore sul personaggio, lo stesso Polaris messo su un altro) toglie lo spazio; lo spazio
  tolto (Canc sulla mappa, tasto destro sul chip, **End mark** sulla card) chiude il mark; il token cancellato porta via lo
  spazio. Anche il bottone Mark della scheda ora mette lo spazio.
- **Polaris**: la card del piazzamento dice quanti spazi Polaris sono attivi, quello sul personaggio compreso ("Each effect
  … depending on how many spaces are active").
- **Amico**: "You can gamble at the end of any turn after yours to detonate it, ending the mark and effect" → alla fine di
  ogni turno che non è del creatore, card sussurrata al creatore e al GM con **Detonate**: apre il gamble dell'abilità
  (la riga della tabella 1–3 / 4–5 / 6), poi la Medium Blast centrata sul personaggio marcato (targetta chi c'è dentro),
  poi il mark e lo spazio finiscono. Chiudendo il gamble non succede niente.
- **WAKING VOID**: "but it doesn't stun the center character. If that character is defeated, Implode immediately activates"
  → quando il personaggio va a 0 hp, card con la frase e il testo di Implode, e "Done: end it".
- Scelte mie: un solo chip che chiede dove (non un chip in più); il mark lo scrive marks.mjs, lo spazio il GM attivo (i
  giocatori non devono poter creare template); WAKING VOID non dice "mark", quindi è un *tracker* (non sostituisce gli
  altri mark e non finisce se chi ha usato Implode è sconfitto, p.95 vale solo per i mark); Polaris Talent I "one of your
  Polaris": uno solo sul personaggio alla volta (un mark per abilità). `rollGamble` ora restituisce il risultato.
  Controllato su una copia del pack jobs: solo Polaris (Talent I), Party Favor (mastery) e Implode (mastery) offrono "On a
  character". Nessun pack, nessuna migrazione. Il resto (range, attivazione di Implode, gamble di Polaris…) è in TODO, R33d2.

## 16 ottobre 2026 — Aree terrain effect che durano, si muovono o crescono (versione 1.15.70)

### Round di debug del 15 ottobre, punto R33c

- **Aree terrain senza effetto sul terreno**: le aree che restano (Terrain effects p.96) erano solo disegni: "The area is
  a medium blast terrain effect that is difficult and dangerous terrain" (Tsunami p.233), "The area is dangerous terrain
  for foes" (Blood Grove p.186, DARK WING di Morrigan p.171), "The area is dangerous terrain" (GUNGNIR di Blitz p.225,
  MAGNABIO di Bio p.218), "All spaces of this terrain effect are shadow clouds" (Nocturne p.163; Shadow Cloud p.161
  "Difficult terrain … blinded+") → nessuno leggeva il blocco dell'area → ora ogni area terrain piazzata porta il flag
  `terrain` di R33b letto dal suo blocco (fino all'etichetta dopo): entrando o uscendo da un'area dangerous esce la stessa
  domanda dei 2 piercing (una volta a turno, "for foes" solo per i foe); la frase "enter" diventa un promemoria
  (Gust p.234 "Characters that enter any end space of the line …"; Bifröst p.226 "Yourself and allies that enter …",
  solo per gli alleati).
- **Tutto "lasting" per colpa di un talento**: un'abilità restava sulla mappa se *qualunque* suo testo diceva "terrain
  effect" → la Small Blast dell'attacco di Bio (per il cloud di MAGNABIO) e la Burst 1 di Land Waster (per il boulder di
  Ajax) non sparivano mai → ora resta l'area la cui frase è un terrain effect, o l'area dell'abilità quando è il testo
  base (non talenti / mastery) a dirlo. Con MAGNABIO armata, la Medium Blast resta, la Large Blast no.
- **Quench**: "create a small blast terrain effect of smoke on you" (Showdown p.157) si piazzava a mano in range 3 → ora
  "… on you" la centra sul PG come "centered on you". Le aree di talenti / mastery (DARK WING, GUNGNIR, QUENCH, Nocturne
  Talent II) erano già offerte dal bottone area solo con il talento scelto / la mastery sbloccata: ora restano anche loro.
- **Più aree insieme**: "Gust's area is not replaced if the ability is used again, though you cannot have more than three
  areas active" (NORTHSOUL p.234), "Create a second cloud" (Mist Strider p.170), "Create a new line 3 terrain effect, which
  cannot overlap the first" (HEIMDALL di Bifröst), "creating a second line 3 area" (PATH TO ERENHELION p.226) → il secondo
  piazzamento sostituiva il primo → ora, con un'area già sulla mappa, una domanda "Add another (2 of 3) / Replace them";
  pieno, "Add" toglie la più vecchia. Limite letto dal testo; senza quelle frasi si sostituisce come prima.
- **Muovere un'area**: nessun modo di spostare un'area piazzata → ora con il mouse sopra un'area che resta (anche un pit o
  una mote di R33b) **Shift + freccia** la sposta di 1 casella (chi l'ha piazzata o il GM, come il + / − delle aure di R32);
  il flag terrain va con lei.
- **Tsunami**: "choose another edge of the map … at the start of your turns, your tsunami moves 4 spaces in a straight line
  towards that edge. When a space of the tsunami would move off the map, the effect ends" (p.233) → ora al piazzamento
  chiede il bordo (Top / Bottom / Left / Right) e lo salva nell'area; la card ha "Move 4 toward the bottom edge" (anche a
  inizio turno del PG, dal GM attivo); con LEGENDARY STORM sbloccata, dal round 4, bottoni 1-4; STORMLASH ("Your active
  tsunamis move 2 spaces in that direction") con quattro frecce che muovono tutte le Tsunami del PG. Se uno spazio uscirebbe
  dalla mappa chiede se toglierla. "Any non-flying characters in Tsunami when it moves are dragged with it": la card dice chi
  c'era dentro e **Drag them with it** apre la lista da spuntare (i volanti si tolgono); niente si muove senza il clic.
  Talent I: la card ricorda il pit al centro.
- **Waterspout**: "Summon a waterspout in a space in range that is difficult terrain … Once during your turn, you may move the
  waterspout 1 space" (p.235) → non aveva niente da piazzare → ora chip "Waterspout · 1" (segno di una casella, difficult);
  a inizio turno del PG una card con le frecce di 1 (Talent II: anche da 3), una volta. HURRICANE "At round 4 or later,
  waterspouts grow to a small blast area instead of a single space. They become dangerous terrain": dal round 4 la card ha
  "Grow to Small Blast".
- **Ätherwand Talent II**: "At the start of your turn, you can move the area 1 space in any direction" (p.226) → le frecce a
  inizio turno, letto dalla stessa regola del Waterspout.
- **Bifröst Talent II**: "Bifröst areas grow by 2 spaces at the end of each round. When they grow, deal 1 piercing damage to all
  characters inside" (p.226) → ora a fine round (non all'avvio del combat) una card con la frase e **Add 2 spaces**: si
  cliccano due caselle adiacenti, come "Area +N" di Blood Grove (stessa funzione, `extendAreaTemplate`).
- Scelte mie: i movimenti e la crescita sono letti al momento dal testo in gioco (talento scelto, mastery sbloccata), come la
  crescita dei geyser; Shift + frecce e non frecce sole (le frecce muovono i token); il bordo della Tsunami si chiede una volta
  e resta sull'area; le card di turno e di round le manda il GM attivo; i token trascinati non fanno domande degli oggetti.
  Controllato su tutto il pack jobs con uno script (copia del pack): il "lasting" cambia solo per otto abilità il cui
  terrain effect è in un talento / mastery (Apex, Bio, Blitz, Gates of Hell, Growing Season, Land Waster, Morrigan,
  Showdown); di queste, solo Bio e Land Waster hanno un'area propria che ora sparisce, le aree terrain di talento / mastery
  restano. Nessun pack, nessuna migrazione. Il resto (status per chi sta dentro, danni
  dell'area, risucchio del Waterspout, sovrapposizione di HEIMDALL…) è in TODO, R33c2.

## 16 ottobre 2026 — Spazi di terreno: pit, dangerous, difficult e segni con nome (versione 1.15.69)

### Round di debug del 15 ottobre, punto R33b

- **Pit e terreno solo a mano**: tante abilità creano singoli spazi di terreno ("Create two pits", Terraforming; "creating
  2 spaces of dangerous terrain", Pyroclast Talent I; "create a watery pit under them", Deepwrath p.235; "Create a space
  of dangerous terrain … under every foe", Eclipse e Bio) e bisognava disegnarli con lo strumento dei template di
  Foundry → niente li leggeva → ora la scheda del PG mostra un **chip colorato** sull'abilità e sul tratto ("Pit · 2",
  "Dangerous · 3", "Difficult · 1", "Pit · any" quando è uno per ogni personaggio): un clic, poi si cliccano sulla mappa
  gli spazi (un secondo clic ne toglie uno, Invio o clic destro finisce prima, Esc annulla). Ogni spazio è un template
  di una casella col suo colore (marrone pit, rosso dangerous, verde oliva difficult, viola i segni) e l'etichetta
  "Pit · Rime"; resta finché non lo si toglie (p.96: i terrain effect restano anche se chi li crea è sconfitto). Talenti
  solo se scelti, mastery solo se sbloccata, versioni Infuse (DAGON di Rime, PYROTIC di Pyre) solo con l'Infuse armato,
  che viene consumato. "The pit is also dangerous terrain" (Eclipse Talent I, MAGMOTIC di Pyroclast) dà un "Dangerous
  pit".
- **Segni con nome**: le motes di Symphony ("create pulsing motes … None can be placed adjacent to each other", p.178:
  chip "Mote · 4", spazi liberi e non adiacenti), la mine di Party Favor (p.151), l'Elden Rune ("Inscribe an Elden Rune
  on the space underneath you", p.209: messa da sola sotto il token), l'afterimage di Flash Step (Gates of Hell p.129,
  "dangerous terrain, but only for foes"), il brand di Eclipse (p.203, anche dangerous), lo spazio scelto di Polaris
  (p.202) e il centro di Implode ("Choose a space in range") col nome dell'abilità.
- **Togliere gli spazi**: tasto destro sul chip li toglie tutti (dopo una domanda); la card in chat del piazzamento ha
  "Remove all"; sul layer dei template di Foundry si cancellano anche uno per uno con Canc. "lasts until this ability is
  used again" chiede "Replace / Keep both" come per gli oggetti.
- **Dangerous terrain**: "Entering or exiting a dangerous terrain space causes a character to take 2 piercing damage,
  (ignoring armor and vigor). Characters can only take this damage once a turn" (p.89) → nessuno lo ricordava → ora chi
  trascina un personaggio dentro o fuori da uno spazio dangerous riceve la domanda "Take 2 damage / Not this time";
  "Take 2 damage" toglie 2 hp senza armatura né vigor, con la nota "Damage Applied" (nuova opzione `ignoreVigor` di
  `applyDamageToActor`, passata anche al GM per chi non possiede l'attore). Una domanda sola per turno di combattimento
  per personaggio; "only for foes" solo per i foe. Mai danno senza il clic.
- **Promemoria dei segni**: entrando nello spazio di una mote o della mine esce una card con la frase del libro ("Any
  character that enters an affected space … detonates the mote …", "When any character enters the space, the mine
  explodes …") e il bottone Remove; l'Elden Rune solo per un foe che entra o esce ("A foe can scrub out an Elden Rune by
  entering or exiting its space"). A inizio turno di chi sta su una mote ("or starts their turn there") la card la manda
  il GM attivo.
- **Blood Grove**: "extend the area by 2 spaces, adding to its total area on any edge" (Talent II) e "extend the area by 1
  space … adjacent to the area" (HUNGRY GROVE, p.186) → chip "Area +2" / "Area +1": con l'area già piazzata col suo
  bottone, si cliccano gli spazi adiacenti e si aggiungono a quel template.
- **Volcanic Geyser**: "creates dangerous terrain under foes" (p.234), lasciato da R33a4 → ora, dopo Erupt con i
  personaggi ripiazzati a clic, una domanda segna uno spazio dangerous sotto ogni foe dove è atterrato.
- Scelte mie: template e non Region (i giocatori possono creare template, le Region solo il GM; il disegno a caselle, il
  "lasting" e il seguire un token ci sono già); il flag `terrain` sul template (tipo, nome, dangerous / foesOnly, frase
  "enters") vale per qualunque template, di una casella o di tante: R33c (aree che durano e si muovono) e R33d (segni che
  seguono un personaggio, con `followTokenId`) lo riusano e hanno già il controllo al movimento; si guardano solo la
  partenza e l'arrivo di un movimento, come per gli oggetti; niente controllo del range (il testo lo dice nella
  didascalia del chip). Trovati scorrendo tutto il pack jobs con la stessa lettura: 66 spazi in 44 abilità, anche Massive
  Overhead, Valkyrie, Cryo, Chaos Tarot, Dropkick, Blackstar, Death Blossom, Takedown, Heave-Ho, Harrow, Holy (combo),
  Eye of the Storm. Nessun pack, nessuna migrazione. Il resto (pit a inizio turno di Deepwrath, controllo del brand di
  Eclipse, esplosioni di mote / mine, elevazione −1 dei pit, costo del difficult, gamble di Polaris…) è in TODO, R33b2.

## 16 ottobre 2026 — Oggetti e movimento: portali, arma lanciata, eruzione guidata, pile con personaggi sopra (versione 1.15.68)

### Round di debug del 15 ottobre, punto R33a4

- **Underway, teleport a mano**: "you and allies can teleport from any space adjacent to an underway to a free adjacent
  space to any other underway" (p.168) → bisognava spostare il token a occhio → ora la scheda del portale ha **Teleport
  here**: il token selezionato (accanto a un altro portale dello stesso PG) vede in verde gli spazi liberi attorno a questo
  portale e ci va con un clic, senza animazione, con una riga in chat. E quando un personaggio (non un foe) viene
  trascinato accanto a un portale esce la domanda "teleport?" con gli spazi attorno agli altri portali. Esc o clic destro:
  non si muove niente.
- **Bale Portal**: "Foes that … end their turn adjacent to an underway can be teleported … A foe can pass a save … once a
  round. Bloodied foes fail the save" (p.168) → ora, a fine turno di un foe accanto a un portale (mastery sbloccata), una
  card lo ricorda; il GM lo sposta con "Teleport here" (il suggerimento ricorda il save). Il save e il "once a round" restano
  al tavolo.
- **Comet**: "Spaces adjacent to it have rampart … You can pick your weapon up if you enter or exit any space adjacent to it
  or start your turn there" (p.128); rampart: "Foes cannot enter or exit a space affected by a rampart effect by dashing,
  flying, or teleporting" (p.104) → c'era solo il bottone Pick up → ora attorno all'arma c'è un'aura 1 "Rampart" che la
  segue (solo da vedere: il movimento non viene bloccato) e una nota sulla scheda; quando il Demon Slayer entra o esce da
  uno spazio accanto, chi l'ha mosso riceve la domanda "pick it up?"; a inizio turno accanto all'arma, una card lo ricorda.
- **Megamushroom**: la benedizione "can be picked up if yourself or an ally enters its space" (p.184, p.187) → solo
  bottone → ora chi trascina un personaggio non foe sul suo spazio riceve la domanda "pick up its blessing token?".
- **Geyser, eruzione guidata e Salt Sprite**: "removing that character from the battlefield, then placing them one or two
  spaces away … summon a Salt Sprite in its space" (p.232) → la card di R33a3 lasciava tutto a mano → ora Erupt chiede
  prima (due caselle, tutte e due accese): poi, per ogni personaggio da ripiazzare, gli spazi liberi a 1-2 (GREAT GEYSER:
  alleati fino a 3) si accendono e un clic ce lo mette (Esc lo lascia lì); il geyser va via e il **Salt Sprite** del pack
  summons compare nel suo spazio (riusando l'attore del mondo se c'è già). Un foe mosso da un giocatore passa dal GM
  (socket, solo se il giocatore possiede il geyser). A inizio / fine turno di un personaggio sul geyser una card ricorda
  "can make it erupt".
- **Personaggi su una pila che sale o scende**: "Characters can stand on objects" (p.89) → si muovevano solo gli oggetti →
  ora chi sta in cima alla pila (elevazione uguale all'altezza della pila) sale e scende con − / +, con la crescita del
  Geyser Talent I, e scende quando l'oggetto sotto viene tolto o spostato; chi vola più in alto non viene toccato. Un
  oggetto piazzato sullo spazio di un personaggio lo solleva: Pyroclast "Create a height 1 magma spire object under them,
  pushing them up" (p.221).
- **Aethershard**: Talent I "you can first remove one of your Aethershards, then place it in any free space up to range 2"
  (p.210) → ora bottone **Move** sulla scheda dello shard (spazi liberi fino a 2) e, quando il PG spende Aether, un avviso
  per chi l'ha speso. Mastery AETHERSHIFT "If you start or end your turn adjacent to an Aethershard, gain phasing until the
  end of your next turn" (p.211) → ora il GM attivo dà Phasing con la sua scadenza al cambio turno, con una card.
- Scelte mie: niente si sposta senza un clic (le domande vanno solo a chi ha mosso il token, le card di turno solo dal GM
  attivo, così con due GM non escono doppie); si guardano solo la partenza e l'arrivo di un movimento, non gli spazi in
  mezzo; i movimenti fatti da queste regole non fanno altre domande; uno spazio "libero" è senza token di nessun tipo;
  dopo un teletrasporto o un'eruzione chi stava su una pila scende a terra. Nessun pack, nessuna migrazione. Restano in
  TODO, R33a5: muri di Foundry e copertura degli oggetti, Talent II di Aethershard (pierce), personaggi che salgono /
  scendono camminando su un oggetto, il rampart che blocca davvero, i foe "shoved into portals".

## 16 ottobre 2026 — Aethershard nelle aree, eruzione del Geyser, Megamushroom, pilastro di Upheaval (versione 1.15.67)

### Round di debug del 15 ottobre, punto R33a3

- **Aethershard da contare a mano**: "When you include the Aethershard in the area effect of any ability … 2 piercing
  damage as an area effect, once, to all characters in the area for every one of your Aethershards caught … Then
  destroy all Aethershards activated this way and gain 1 Aether" (p.210) → nessuno guardava se l'area copriva uno shard
  → ora, piazzata un'area (dopo le wild card), se copre uno o più Aethershard **di chi la piazza** esce una domanda
  come per le wild card: "Resonate" toglie gli shard (il giocatore passa dal GM via socket), dà +1 Aether (massimo 6)
  e posta una card del danno "Other, area" con 2 × shard piercing per i personaggi nell'area (gli oggetti esclusi), con
  i soliti Apply. La regola è letta dal testo dell'oggetto, non dal nome. La card degli shard non usa né consuma il
  Bonus Damage del PG (nuova opzione `statusBonus` di `postAbilityDamageCard`): è il danno degli shard, non dell'abilità.
- **Eruzione del Geyser**: "you can cause it to erupt, removing that character from the battlefield, then placing them one
  or two spaces away. Then, remove the geyser. Effect: After the geyser is removed, summon a Salt Sprite in its space"
  (p.232) → tutto a mano → ora la scheda del geyser ha **Erupt**: card con chi va tolto e ripiazzato (chi sta sullo
  spazio del geyser; per il Volcanic Geyser tutti nella medium blast attorno, più "dangerous terrain under foes"), la
  riga della mastery GREAT GEYSER se sbloccata, il promemoria del Salt Sprite; quei personaggi restano targettati e il
  geyser viene tolto. Spostare i personaggi e piazzare il Salt Sprite (dal suo chip) resta a mano: la scelta dello
  spazio è del giocatore.
- **Geyser Talent I**: "Increase the height of all geysers by +1 at the start of your turn" (p.232) → ora, all'inizio
  del turno del creatore (GM attivo, non quando si torna indietro), i suoi geyser crescono di 1, entro l'altezza 3 della
  pila (p.95), con una riga in chat. Letto in generale ("increase the height of all <oggetti> by +N at the start of
  your turn"); nel pack jobs c'è solo questo.
- **Megamushroom**: "The object has a blessing token on it and counts as a plant, but isn't removed if the token is
  removed" (Spore Shroud p.187); plant: "dangerous terrain that only affects foes … blessing token … can be picked up if
  yourself or an ally enters its space" (p.184) → ora la scheda dice "Blessing token: on it", ha la nota sulla plant e
  il bottone **Pick up blessing**: il token selezionato (o il personaggio dell'utente) prende +1 Blessed, l'oggetto
  resta; se chi lo prende non possiede l'oggetto, lo segna il GM via socket.
- **Pilastro di Upheaval**: "Boulder may be placed as a height 2 pillar instead" (Titan Strength p.136) non contiene la
  parola "object" → nessun chip → ora "placed / created as a height N <nome> instead" è letto: chip "Pillar · H2" con
  la mastery sbloccata. Unico testo del pack jobs che cambia (confronto prima / dopo su tutto il pack).
- **Helix Heel**: la "burst 1 area effect centered on them" sugli oggetti (p.219) era letta, ma con la Line 3 nei tag il
  bottone area non leggeva la descrizione → ora le aree della descrizione centrate su un oggetto si aggiungono alla
  scelta ("Text: Burst 1 (on object)"); il tiro d'attacco continua a non offrirle.
- **Scheda dalla barra laterale**: l'attore della cartella "Map Objects" mostrava "total height 1" qualunque fosse la
  copia sulla mappa → è solo il modello delle copie → ora niente − / + né Remove, badge "Height N (as placed)", l'elenco
  delle copie sulla scena con la loro altezza e una nota "doppio clic sul token".
- Scelte mie: gli shard tolti prima di postare il danno (una card non si annulla, uno shard si ripiazza); la Resonate
  vale solo per gli shard del PG che piazza l'area; "Erupt" non sposta nessuno da solo. Nessun pack, nessuna
  migrazione. Quello che resta (teleport di Underway e Bale Portal, rampart e raccolta automatica di Comet, muri e
  copertura, personaggi sopra una pila che scende, Salt Sprite piazzato da solo, raccolta della benedizione entrando
  nello spazio, talenti e mastery di Aethershard) è in TODO, R33a4.

## 16 ottobre 2026 — Effetti degli oggetti sulla mappa, pile, aree sugli oggetti (versione 1.15.66)

### Round di debug del 15 ottobre, punto R33a2

- **Effetto dell'oggetto da leggere a mano**: con l'oggetto sulla mappa (R33a) il suo testo c'era solo tutto intero
  nella scheda → nessuno diceva quali benefici sono accesi → ora la scheda dell'oggetto (doppio clic sul token) ha in
  cima una sezione **Object Effect**: il blocco di testo che crea l'oggetto (dall'etichetta prima, "Effect:" /
  "Object:" / "Terrain effect:", fino al blocco Infuse / Charge dopo; "Object Effect: …" compreso), l'**altezza
  totale** della pila (elevazione + altezza propria) e, per lo Spirit Shrine, la lista "1: / 2: / 3+:" con accese le
  righe raggiunte ("benefits equal to its total height, including other objects it is stacked on", p.192). Sotto, le
  righe del talento scelto e della mastery sbloccata dell'abilità che nominano l'oggetto (Comet Talent II "adjacent to
  your weapon", Shrine Talent I "inside the Shrine's aura", Geyser Talent I "all geysers"…). Spirit Patronage
  ("2 divine damage once to the foe per height of the shrine", p.193) mostra quante volte. Bottone **Chat** che posta
  tutto questo in una card.
- **Comet**: "While this object is active, you cannot attack. You can pick your weapon up …" (p.128) → nulla lo
  ricordava → ora tirare un attacco con la Thrown Weapon sulla mappa chiede "Roll anyway / Cancel", e la scheda
  dell'oggetto ha la riga "cannot attack" e il bottone **Pick up** (per gli altri oggetti **Remove**). I giocatori in
  Foundry non possono cancellare token: il loro Pick up passa al GM attivo via socket, come il piazzamento.
- **Pile che restavano sospese**: togliendo un oggetto da sotto una pila quelli sopra restavano all'elevazione vecchia
  (p.95) → nessun hook li toccava → ora, quando un oggetto viene cancellato o trascinato via, quelli sopra nello stesso
  spazio scendono della sua altezza; un oggetto trascinato su un'altra pila prende come elevazione l'altezza sotto
  (avviso se supera 3).
- **Pyrospire / Volcanic Geyser sempre offerti**: i chip delle versioni Infuse c'erano anche senza Infuse → ora si
  vedono solo con quell'infusione armata, come le altre versioni Infuse; piazzare l'oggetto la consuma (l'infusione
  non resta armata).
- **Aree centrate su un oggetto**: "medium blast area centered on it" (Volcanic Geyser, p.232) e "burst 1 … centered on
  them" dopo "objects" (Helix Heel, p.219) si piazzavano a mano → ora l'area si chiama "… (on object)" e, se hai
  targettato il token dell'oggetto (o un solo altro token, per i summon "centered on it"), si piazza da sola centrata
  lì; senza target, avviso e piazzamento a mano come prima. "Centered on them" dopo pit / piante / nail resta a mano.
  Helix Heel: la frase ora viene letta così, ma il suo bottone area offre solo la Line 3 dei tag (il testo della
  descrizione si legge solo per le abilità senza area nei tag): resta in R33a3.
- Scelte mie: i benefici dello Shrine sono cumulativi ("additional benefits": a totale 3 valgono 1, 2 e 3+); il danno
  di Spirit Patronage conta l'altezza dello Shrine, non della pila (il testo dice "height of the shrine", i benefici
  invece "total height"); il controllo "cannot attack" è una domanda, non un blocco; gli oggetti trascinati su una
  pila non vengono rifiutati, solo avvisati. Nessun pack, nessuna migrazione. Il resto (Aethershard nelle aree, teleport
  di Underway, eruzione del Geyser, Megamushroom plant, pilastro di Upheaval, muri / copertura, Helix Heel) è in TODO,
  R33a3.

## 16 ottobre 2026 — Oggetti sulla mappa (versione 1.15.65)

### Round di debug del 15 ottobre, punto R33a

- **Oggetti delle abilità solo a mano**: molte abilità e tratti creano un oggetto ("Create a height 1 boulder object",
  Geo; "Shrine — Height 1 object. Object Effect: Aura 2", Spirit Shrine p.192; "it becomes an object (Thrown Weapon,
  height 1)", Comet) e bisognava inventarselo con un token qualunque → non c'era niente che li leggesse → ora la scheda
  del PG mostra un **chip col cubo** ("Boulder · H1") nel pannello dell'abilità e nella riga del tratto, per ogni oggetto
  scritto nel testo. Si trascina sulla mappa come i chip dei summon: il GM attivo (anche per il drop di un giocatore,
  via socket come per i summon dei foe) crea un attore Summon nella cartella "Map Objects", di proprietà dei giocatori
  del PG, con il PG come summoner e il testo da cui viene l'oggetto (così la tabella delle altezze dello Shrine è a un
  clic), e piazza un token non collegato "Boulder (height 1)", col nome sempre visibile. Letti: Comet, Spirit Shrine,
  Stone Double, Geo, Terraforming, Pyroclast (Magma Spire, e Pyrospire alta 3), Astra, Polaris (Talent II), Fairy Ring
  (Megamushroom della mastery), Underway, Geyser (e Volcanic Geyser), Aethershard; in più, trovati scorrendo tutto il
  compendio: Massive Overhead, Upheaval, Land Waster, The Tower, Midas, Eye of the Storm (Aethercloud), Growing Season
  (Blood Tree). Talenti e mastery contano solo se scelti / sbloccati.
- **Regole del libro sul drop** (p.89, p.95): altezza 1–3; un oggetto si può mettere sopra altri finché il totale non
  supera 3 (l'elevazione del token è l'altezza sotto; oltre, avviso e niente token); "can't stack" (Underway) rifiuta
  lo spazio di un altro oggetto; "lasts until this ability is used again" chiede se sostituire il precedente o tenerli
  tutti e due (Underway ne mette due per uso). Gli oggetti restano quando il creatore è sconfitto (nessun codice li
  toglie). Un oggetto immune non entra nei bersagli delle aree ("immune to damage and effects unless specified").
- **Aura dell'oggetto**: "Object Effect: Aura 2" (Spirit Shrine) → l'aura si piazza da sola attorno al token
  dell'oggetto e lo segue come le altre aure; cancellando il token sparisce anche l'aura (chiude l'emerso di R48).
- **Scheda dell'oggetto**: badge "Object", altezza con − / + (Shrine "increasing the height by +1", Terraforming "raise
  height of existing objects by +1"; gli oggetti impilati sopra salgono o scendono con lui; il totale resta entro 3) e,
  solo per il GM, "Make destructible": 10 hp, colpito automaticamente, fallisce tutti i save (p.89), con barra HP.
- Scelte mie: un oggetto è un attore Summon con un flag (nessun tipo nuovo, nessun pack toccato, nessuna migrazione);
  un attore per PG + abilità + oggetto + altezza, un token per copia; le versioni Infuse che cambiano l'oggetto
  (Pyrospire, Volcanic Geyser) hanno il loro chip sempre visibile, non solo con l'Infuse armato. Quello che resta
  (effetti degli oggetti sul gioco, aree centrate sugli oggetti, Aethershard nelle aree…) è in TODO, R33a2.

## 16 ottobre 2026 — Tre regex rotte di questo round (versione 1.15.64)

### Round di debug del 16 ottobre, voci emerse su R53 e R60

- **Limit Break non aggiornati sulle schede (R39)**: la migrazione 25 doveva sostituire il testo vecchio di sei Limit
  Break già presi (Gran Levincross, Death Sentence, …) → la sua funzione di confronto aveva `/s+/` invece di `/\s+/`,
  quindi toglieva le lettere "s" dal testo invece di unire gli spazi e non riconosceva mai il testo vecchio → corretta
  la regex. Nessun mondo l'ha ancora eseguita (l'ultimo deploy è la 1.15.2, schema 19), quindi basta correggerla lì
  senza una migrazione nuova.
- **Bottone "Regain (2 Aether)" di Aether Deflection mai visibile (R59)**: "you can spend 2 Aether any time to regain
  it" (p.224) → nella regex i due `\b` erano finiti nel file come carattere invisibile "backspace" (0x08), quindi
  cercava un backspace prima di "spend" e non trovava niente → rimessi i `\b`.
- **Versioni Infuse scritte "(Interrupt …)"**: stessa causa in `isStandaloneInfusion` (`[Ii]nterrupt` seguito dal
  carattere 0x08) → rimesso il `\b`. Nel compendio nessuna versione usa questa forma oggi; Stormlash funzionava già.
- Controllato tutto il codice (`module/`, `macros/`, template): non restano altri caratteri di controllo né regex con
  la barra persa.

## 16 ottobre 2026 — Promemoria "round N or later" a inizio round (versione 1.15.63)

### Round di debug del 16 ottobre, punto R62

- **Buff di round dimenticati**: molte mastery, talenti, tratti e relic si accendono a un certo round (Drifting Leaf,
  GREAT CYCLONE: "At round 4 or later, Drifting Leaf's infuse is always active"; Storm Hilt Rage: "At the start of round
  5 and for the rest of combat…"; relic "Round Invoke … For example (Round 5+) relics have effects that are always
  active at round 5 or later", p.114) e Maar segnalava che i giocatori se ne scordano "many, many times" → il tracker
  non diceva niente quando il round arrivava → ora, quando inizia un round (anche il round 1 all'avvio), il **GM attivo**
  (lo stesso controllo `game.users.activeGM` dei save di fine turno, così con due GM non esce doppio) guarda i
  combattenti e posta una card **"Round N"** con una riga per ogni frase che diventa vera **proprio in quel round**:
  "Nome — Drifting Leaf (Mastery: GREAT CYCLONE) (now active): At round 4 or later, Drifting Leaf's infuse is always
  active."
- **Chi vede cosa**: la card dei **PG è pubblica** (i buff sono dei giocatori); quella di **foe e legend è sussurrata
  ai GM** (non svela le azioni dei nemici). Quindi al massimo due messaggi per round, uno per pubblico; un flag sul
  combat impedisce di ripostarli se si torna indietro di un round e si riavanza. Combattenti sconfitti esclusi; più
  token dello stesso foe danno una sola serie di righe.
- **Cosa conta per i PG**: solo il testo che il personaggio ha davvero — testo base dell'abilità (la combo solo se
  l'abilità è combo), il **talento scelto**, la **mastery sbloccata**, i **tratti del capitolo attuale o inferiore**, i
  **rank di relic sbloccati** (Aspect compreso). Per foe e legend: tratti, azioni, interrupt, round action e fasi.
- **Frasi lette**: "round N or later / or higher / or greater", "round N+" (anche "Round 3+ only", "Invoke (Round
  4+)"), "from round N" → annunciate al round N; "at (the start of) round N", "(Round 4)", liste ("round 1, 3, and 5",
  "round 3 and 5") → in quei round; "… and every two / third / 2 rounds thereafter", "(Round 3, 5, 7, etc)" → ogni k
  round. Non lette: "round 3 or lower" e "at the end of round N" (una fine, non un inizio: Clot, Warden round 10). Una
  frase corta prende con sé la successiva, dove sta l'effetto (Phoenix Rage: "…become suffused with immortal flame.
  Gain defiance…").
- **Conteggio sui compendi** (tutti i talenti e le mastery come se sbloccati): **Jobs 27 frasi** in 24 documenti (18
  mastery, 4 talenti, 1 combo — Open the Gates —, 4 tratti "At the start of round 5": Phoenix / Storm Hilt / Pelagic /
  Orogenic Rage); **Foe Abilities 84 frasi** in 82 abilità (quasi tutte "At round 3+"; Maze Demon ai round 1, 3, 5;
  Unstable Demon e Bonabra al round 4); **Foes 76** in 68 foe; **Legends 19** in 12 (fasi II al round 4, Midan / Dread
  Lords / Arkenlich ogni 3 round, Falling Leaf Aesi ogni 2, Warden ogni 2 dal 4); **Relics 5** (Domain e Skipjack
  Aspect Round 4+, Conquering King I e II Round 5+ / 7+, Arenheir III ai round 3 e 5). Nessuna frase che non scatti mai
  tra i round 1 e 10. Script e uscita: `../icon-compendium-audit/r62-round-reminders/`. Solo codice
  (`module/combat/round-reminders.mjs`, hook in `IconCombat.mjs`), nessun dato cambiato.

## 16 ottobre 2026 — Interrupt concessi in chat da soli (versione 1.15.62)

### Round di debug del 16 ottobre, punto R61

- **Postare solo l'interrupt di un'abilità**: Maar chiedeva un modo di mandare in chat il solo interrupt scritto nel
  testo di Chronotemper (Fool, p.152: "While marked, that character can use the following interrupt: Cheat Time —
  Interrupt 1. Trigger: The start or end of any turn other than yours. Effect: …"), aggiornato con la mastery
  (Revolution: "You can take this interrupt three times a round"), e quello di Drifting Leaf (Spellblade, p.227: "Leaf
  on the Wind — Interrupt 2 … Infuse 3 or Slay: PHANTOM BLADE — Until the start of your next turn, this interrupt has
  unlimited uses") → nell'anteprima delle abilità sulla scheda PG, accanto all'intestazione di ogni blocco "Nome —
  Interrupt N" c'è lo stesso bottone col fumetto di R31 (1.15.35): posta una card col titolo dell'abilità, sotto
  "Interrupt 1: Cheat Time", e le righe **Trigger** ed **Effect** dell'interrupt; in fondo si aggiungono i blocchi
  dell'abilità che parlano di "this interrupt" (PHANTOM BLADE), il **talento scelto** e la **mastery sbloccata** quando
  nominano l'interrupt (o il suo nome, o per Drifting Leaf l'infuse: GREAT CYCLONE). Keyword con tooltip e bottoni
  Inflict / Gain per gli status, come le altre card.
- **Intestazione dell'interrupt scritta come frase**: in cinque abilità il libro stampa "Cheat Time — Interrupt 1."
  col punto (Chronotemper, Riposte, Endless Battlement, Deus Ex Machina, Blazing Bond): il nome restava appeso alla
  fine del blocco Mark / Stance e il Trigger stava da solo → ora, come già per la forma coi due punti (R9, 1.15.11),
  diventano un unico blocco "Cheat Time — Interrupt 1: Trigger: …", sulla scheda e in Show in Chat. Nessun'altra
  abilità, Limit Break, mastery o talento del pack jobs cambia i suoi blocchi (confronto su tutti i testi).
- **Quali blocchi ricevono il bottone** (pack jobs, 8 blocchi): Reverse Fate (Gran Reversa), HEARTFIRE (Blazing Bond),
  Dire Parry (Riposte, + mastery Strong Left), Heroic Intervention (Endless Battlement, + mastery Perfect Battlement),
  Divine Intervention (Deus Ex Machina, + mastery Whip of the Thrones, + talento II), Cheat Time (Chronotemper, +
  mastery Revolution), Spirit Away (Fairy Ring, + mastery SPORE SHROUD, + talento II), LEAF ON THE WIND (Drifting Leaf,
  + PHANTOM BLADE, + talenti I e II, + mastery GREAT CYCLONE). Gli interrupt scritti dentro una mastery (Soul Proxy di
  Umbral Echo, Grace of the Spirits di Spirit Shrine, GRAN JUDICATA di Justice) si postano già col bottone della
  mastery di R31. Script e uscite: `../icon-compendium-audit/r61-interrupt-chat/`. Solo codice, nessun dato cambiato.

## 16 ottobre 2026 — Versioni Infuse nella card: solo quella usata (versione 1.15.61)

### Round di debug del 16 ottobre, punto R60

- **Show in Chat delle abilità con Infuse** (Wright, p.117: "Infuse: Wright only. Triggers when Aether is spent on an
  ability"): la card stampava sempre la base **e** tutte le versioni Infuse per intero, anche senza Aether speso; con la
  mastery sbloccata la riga "★ Mastery" portava la versione grande su una riga sola (Bio con BIOTIC e MAGNABIO, p.218:
  "Infuse 6: MAGNABIO — 2 actions, Attack, Range 8, Large Blast. Hit: … Miss: … Area: …") → card enorme e difficile
  da leggere → ora, **senza niente armato**, la card mostra la base e ogni versione come una **riga chiusa** col nome
  ("Infuse 3: BIOTIC", "Infuse 6 (Mastery): MAGNABIO") che si apre col clic; **con una versione armata** (bottone
  Infuse della scheda) quella è il blocco principale, aperto, sotto "Infused — …", e il titolo diventa "Bio — MAGNABIO".
  Le versioni che sono un'abilità completa (le Magna e Great Spirit Lance: hanno un loro costo d'azione e i loro Hit /
  Miss) chiudono anche la base in una riga "Base version"; quelle che potenziano la base (BIOTIC, PYROTIC, VOLVAGA…)
  la lasciano aperta. È la proposta di Turz Ven (il bottone Infuse cambia cosa si posta) insieme a quella di Maar (le
  righe chiudibili).
- **Versioni scritte su una riga** (Magnabio, Great Spirit Lance, Magnapyre, Magnageo, Magnacryo): tutto il testo
  stava in un paragrafo → ora ogni "Hit:", "Miss:", "Area:", "Effect:", "Terrain:", "Comeback or Exceed:" è un blocco
  etichettato come su una card normale, la riga del costo ("2 actions, Attack, Range 8, Large Blast.") sta in cima e
  "Benefits from Bio talents." in fondo. Lo stesso formato c'è nel messaggio "<nome> infuses …" che esce quando si arma.
- **Blocchi che appartengono alla versione**: il "Collide:" scritto dopo PRIMAL BURST (Quaking Palm, p.221) e dopo
  INCANDIUS (Soul Burn) è parte della versione infusa (la spinta che lei aggiunge) → ora sta dentro la sua riga, non
  tra i blocchi della base.
- **Card dell'attacco con una versione armata**: mostrava sempre Hit / Miss della base → ora prende Hit e Miss della
  versione quando li scrive (MAGNABIO: "Hit: 2[D]+fray"), elenca sopra le sue altre righe in blu e il titolo dice
  "Bio — MAGNABIO"; una versione completa toglie Exceed / Crit della base, i talenti restano.
- Confronto prima/dopo su tutte le 22 abilità del pack jobs con Infuse (28 versioni):
  `../icon-compendium-audit/r60-infuse-card/` (`versions.mjs`, `compare.mjs` e le uscite). Nessun dato cambiato: la
  scheda (pannello dell'abilità) è come prima.

## 16 ottobre 2026 — Aether senza attacco: Stormlash e Aether Deflection (versione 1.15.60)

### Round di debug del 16 ottobre, punto R59

- **Tsunami / Stormlash** (Stormbender, p.233: "Infuse 1: STORMLASH — Free Action — Choose an edge of the map. Your
  active tsunamis move 2 spaces in that direction"): il bottone Infuse 1 spendeva già l'Aether e scriveva la versione
  in chat, ma poi la lasciava **armata** in attesa di un tiro di Tsunami che non arriva mai (Stormlash è un'azione a
  parte, non un potenziamento del prossimo uso) → restava "armed", un secondo clic restituiva l'Aether già usato, e
  armare un'altra infusione lo rimborsava → una versione Infuse che il libro dà con un suo costo d'azione tra
  parentesi ("(Free Action)", "(1 action)", "(Interrupt …)") ora si **usa subito**: il clic scala l'Aether, posta
  "<nome> uses the infusion of Tsunami — STORMLASH" con il testo, e non arma niente (un'altra infusione già armata
  resta com'è). Nel pack jobs è l'unica versione di questo tipo.
- **Aether Deflection** (Spellblade, p.224: "You only have one use of this interrupt per combat. However, you can spend
  2 Aether any time to regain it"): non c'era modo di pagare i 2 Aether e dirlo in chat → nella riga del tratto (tab
  Combat) c'è ora il bottone **Regain (2 Aether)**: scala 2 Aether e posta "<nome> spends 2 Aether to regain the use of
  Aether Deflection". È spento con meno di 2 Aether o su una scheda non modificabile. I tratti dei PG non hanno un
  contatore di usi, quindi non c'è altro da ripristinare. Il bottone compare su qualunque tratto con "spend N Aether
  any time to regain it".
- Altri testi con Aether speso senza attacco, cercati in tutti i pack: Conqueror's Edge (Spellblade, "you may infuse 3
  Aether to trigger the slay effect of any ability": legato a un'abilità, non è lo stesso caso) e Bright Soul
  (Enochian, cap. 3, "If you are defeated, you can choose to burn off all your aether…": spende tutto, non N, e solo
  alla sconfitta). Nessuno dei due è stato toccato.

## 16 ottobre 2026 — Casella "Defender has evasion" nella finestra dell'attacco (versione 1.15.59)

### Round di debug del 16 ottobre, punto R58

- **Curse of Chaos** (Fool, p.149: "You have evasion against characters that are 3 or more spaces away from you"; Maar
  lo chiama "Boon of Chaos"): durante un attacco non c'era modo di dire che il difensore ha l'Evasion → il tiro
  d'Evasion (p.146: "Roll a d6 when targeted by an attack. On a 4+, the attack automatically misses. Check before the
  attack roll") partiva solo se il bersaglio aveva lo status Evasion (o un tratto NPC che il sistema sa leggere), e un
  tratto con condizione di distanza non lo dà → nella finestra dell'attacco ogni bersaglio ha ora la casella
  **Defender has evasion**: spuntata da sola se il bersaglio ha l'Evasion, si può spuntare o togliere a mano. Il tiro
  usa la casella al posto dello status, con la stessa regola di sempre (d6 prima del d20, 4+ = mancato, 3+ con
  Rigoletto I, sempre riuscita con l'Aspect, ignorata da True Strike / Unerring). Con un'area la casella c'è solo sul
  bersaglio dell'attacco, l'unico che tira l'Evasion. La nota "Evasion: … rolls 1d6" sotto Modifiers segue la casella.

## 16 ottobre 2026 — Stack Dice: bottone Use (versione 1.15.58)

### Round di debug del 16 ottobre, punto R57

- **Stack Dice** (Fool, p.149: "You can use this die when you gamble to make the gamble result 6, consuming the die"):
  per usare uno Stacked Die fuori dalla finestra del gamble bisognava spegnere il pallino a mano e niente lo diceva in
  chat → mancava un comando apposta → accanto ai pallini del tratto (tab Combat) c'è ora il bottone **Use**: toglie un
  dado e posta in chat "<nome> uses a Stacked Die: the gamble result is 6". È spento quando non ci sono dadi (o la scheda
  non è modificabile). La finestra del gamble di un'abilità continua a spendere il dado da sola quando si sceglie
  "Stacked Die": il bottone serve solo per un gamble risolto fuori da lì, quindi il dado non si scala due volte.

## 16 ottobre 2026 — Quaking Palm, Sidhe e Dark Sliver: bottone Track target (versione 1.15.57)

### Round di debug del 16 ottobre, punto R56

- **Quaking Palm** (Geomancer, p.221: "Set up lethal vibrations in a foe's body. When they end their next turn, they
  take 1 piercing damage…"): non c'era modo di segnare il personaggio colpito → il bottone **Track target** (R30) compare
  solo sulle abilità il cui testo dice "that foe's / that character's (next) turn", e Quaking Palm dice "When they end
  their next turn" → ora il bottone compare anche quando il testo annuncia un effetto ritardato sul bersaglio: "when they
  start/end their next turn, they…" oppure "at the start/end of their next turn, they…". Un semplice "until the end of
  their next turn" (una durata, es. Wish, Geyser, Mock) non conta. Le abilità con Mark restano escluse come prima.
- **Confronto su tutto il compendio Jobs** (271 voci): prima 8 abilità avevano il bottone (Gigantas Crusher, Chastise,
  Pyroclast, Showdown, Grand Banishment, The Tower, Great Giorgios, Assassinate), tutte lo tengono. Lo guadagnano 3:
  **Quaking Palm** (p.221), **Sidhe** (Warden, p.171: "At the end of their next turn, they take 6 damage") e **Dark
  Sliver** (Harvester, p.187: "If the foe is not occupying that space at the end of their next turn, they take 2
  piercing damage…"). Nessuna lo perde. Solo codice, nessun dato cambiato.

## 16 ottobre 2026 — Helix Heel: la prima riga è un Effect, non testo di colore (versione 1.15.56)

### Round di debug del 16 ottobre, punto R55

- **Helix Heel** (Geomancer, p.219: "Effect: Release a shockwave in a line 3 area effect, dealing 2 piercing damage to
  all foes."): la prima riga compariva in corsivo come testo di colore → il libro non ha testo di colore per questa
  abilità e apre subito con un Effect, ma nel compendio quella riga era salvata senza l'etichetta "Effect:" (stesso
  difetto di Massive Overhead, R8) → nel compendio Jobs la riga ha ora l'etichetta "Effect:", quindi la scheda e la chat
  mostrano tre blocchi Effect e niente corsivo. Il testo resta quello del libro. Bottone area (line 3) e tiro del danno
  (2 piercing) leggono come prima. La migrazione 28 fa lo stesso sulle copie già sulle schede e nella sidebar (solo
  quelle con il testo originale, non quelle modificate a mano).

## 16 ottobre 2026 — Eye of the Storm: blocchi Special, Area ed Effect come nel libro (versione 1.15.55)

### Round di debug del 16 ottobre, punto R54

- **Eye of the Storm** (Stormbender, p.236: "This attack has no attack space. Instead, the attack space is clear and
  exempt from this area. / Area effect: [D] / Effect: If an ally is in the center space, they may fly 4 …"): la riga
  "This attack has no attack space…" finiva nel testo di colore in corsivo, e l'Effect compariva attaccato alla riga
  Area ("Area: [D]. Effect: If an ally…"), senza etichetta propria né parole chiave evidenziate → il libro stampa quella
  riga di regole senza etichetta (dimentica il "Special:"), e nel compendio l'Effect era salvato dentro il campo
  dell'area → nel compendio Jobs la riga ha ora l'etichetta "Special:", l'Effect è un blocco suo e l'ordine è fissato a
  Special, Area ([D]), Effect, poi Infuse 3: AEONCLOUD. Il testo resta quello del libro. La migrazione 27 fa lo stesso
  sulle copie già sulle schede e nella sidebar (solo quelle con i testi originali, non quelle modificate a mano).

## 16 ottobre 2026 — Heave-Ho: l'Effect prima dell'Area (versione 1.15.54)

### Round di debug del 16 ottobre, punto R53

- **Heave-Ho** (Stormbender, p.234: "Effect: After the triggering ability resolves create a crashing wave in a medium
  blast area effect … Characters caught in the area are shoved 1, and foes become vulnerable"): la scheda e la card in
  chat mostravano il blocco Area prima dell'Effect che crea l'onda → il testo dell'area sta in un campo a parte e
  l'ordine di base mette l'Area prima dei blocchi scritti nella descrizione (giusto per abilità come Comet, p.128, che
  stampano l'Area per prima) → nel compendio Jobs Heave-Ho ha ora l'ordine dei blocchi fissato a "effect, area": Trigger,
  Effect, Area, Collide come nel libro. La migrazione 26 mette lo stesso ordine sulle copie di Heave-Ho già sulle schede
  e nella sidebar (solo se non hanno un ordine impostato a mano). Le altre abilità non cambiano.

## 16 ottobre 2026 — Stack Dice: il secondo dado si può alzare al capitolo 3 (versione 1.15.53)

### Round di debug del 16 ottobre, punto R51

- **Stack Dice** (Fool, p.149: "You can only hold on to one Stacked Die at once"; capitolo 3, Death's Apprentice:
  "You can hold on to 2 stacked dice at once"): al capitolo 3 la scheda mostrava due dadi ("0/2") ma il click sul
  secondo non lo accendeva → nel template ogni dado diceva il proprio massimo con `../trait.quick.max`, che dentro il
  ciclo dei dadi punta al posto sbagliato e restituisce vuoto: il click leggeva massimo 1 e si fermava a 1 → il
  massimo si legge direttamente da `trait.quick.max`, quindi al capitolo 3 si arriva a 2/2. Solo template, nessun dato
  cambiato.

## 16 ottobre 2026 — Keyword "summon" e nomi di combo / mastery non più evidenziati a sproposito (versione 1.15.52)

### Round di debug del 16 ottobre, punto R50

- **Morrigan** (Warden, p.171: "you summon a massive flock of winged beasts … Yourself, allies, and allied summons in
  range can dash 2"): il primo "summon" aveva il tooltip della keyword Summon, ma lo stormo non è un summon → la parola
  "summon" era evidenziata sempre, anche usata come verbo su una cosa che non è un personaggio summon (il manuale usa lo
  stesso verbo per oggetti e terreno: "Characters can often summon or create objects", p.89; i summon sono personaggi,
  p.95) → nei testi dei PG il verbo "summon a / the / two …" resta evidenziato solo se dopo c'è una creatura del
  compendio Summons ("summon a shadow", "summon two bombs", "summon the soul" del Severed Soul), o una cosa che il
  testo stesso dice essere una di queste ("A mote of life is a plant", Dark Sliver p.187). "allied summons" (il nome)
  resta evidenziato come prima. Oltre a Morrigan, perdono il tooltip solo oggetti e terreno: Aethershard, Geyser,
  Waterspout, Rampant Nail ("summon the nail"), la mastery di Rime ("summon a pit"), l'eldflame di Gigaflare / Enochian
  e la frase di colore di Paradiso nella scheda item. Foe, legend e trofei non cambiano: evocano creature del loro
  blocco statistiche, che non sono nel compendio Summons.
- **Death Blossom** (Shade, p.162: "COMBO: FLYING SLEEVES"): "Flying" del nome della combo aveva il tooltip di Flying →
  il nome all'inizio di combo, mastery e ultimate ("Flying Sleeves: …", "HADES — …") era letto come testo di regole →
  ora quel nome non riceve keyword (scheda PG, card in chat, scheda item). Un'etichetta di regole in quel punto
  ("Comeback: …") non è un nome e resta evidenziata. Nel compendio Jobs cambiano anche Massive Overhead (mastery "Blood
  Rush", perde "Rush") e Dark Knight (mastery "Infectious Hatred", perde "Hatred").
- Confronto prima/dopo su tutti i testi del compendio Jobs (copia del pack): cambiano solo i 12 testi elencati qui
  sopra; negli altri compendi nessun cambiamento. Solo codice, vale per le copie già sulle schede.

## 16 ottobre 2026 — Aree di Slay / Finishing Blow e aree "centered on them" sulla mappa (versione 1.15.51)

### Round di debug del 16 ottobre, punto R49

- **Death** (Fool, p.150: "Finishing blow or Slay: Character explodes in a large blast area effect centered on them"):
  "No way to easily place the large blast area effect from slay/finishing blow" → il bottone area leggeva i testi di
  talenti, mastery, combo, Charge e Heroic, ma non i blocchi che scattano dall'attacco (Exceed, Crit, Collide, Slay,
  Finishing Blow, Comeback); e una blast "centered on them" si piazzava a mano, entro il range dell'abilità (Death non
  ne ha: andava messa accanto a te) → ora quei blocchi sono letti e Death offre "Slay / Finishing Blow: Large Blast
  (target)" (stesso testo nei due blocchi, quindi una voce sola); un'area "centered on them / the character / your foe"
  va da sola sul token bersagliato (T), "centered on you" su di te. Con un token grande si clicca uno dei suoi spazi;
  senza un solo bersaglio c'è un avviso e la si piazza a mano. Il tiro d'attacco non la propone: non è l'area
  dell'attacco.
- Con gli stessi blocchi: Soul Shot ("Exceed / Finishing Blow: Large Blast (target)", p.158), Matsuri (Exceed, p.192:
  prima non aveva il bottone area), Gust ("Collide: Burst 1 (target)", p.234), Massive Overhead (ora ha il bottone per
  la Small Blast di Comeback / Heroic).
- "Centered on" letto anche dove c'era già un bottone: God Hand (mastery e combo), Ace (Talent I), Pyroclast, Chastise
  (combo), Midas (Talent II), Exorcism (Talent II), Nocturne, Symphony, Quaking Palm (Charge) vanno sul bersaglio;
  Aria e Dragon Dive su di te. Restano a mano le aree centrate su pit, oggetti o cose ("all pits in the area explode …
  centered on them" di Holy e Pandaemonium, Helix Heel, Geyser "centered on it").
- **"burst N (target)" nel testo**: era letto come un Burst N semplice (la parentesi chiudeva la parola) → ora l'Heroic
  di Land Waster è davvero "Burst 2 (target)" e BOULDER KICK di Dragon Dive "Burst 1 (target)".
- **Elden Rune** (p.209, ARKENRUNE "extend to a small blast area") ed **Eye of the Storm** (p.236): da verificare sulla
  build di Maar. Elden Rune offre già "Mastery: Small Blast" con la mastery sbloccata (si clicca lo spazio del PG);
  la mastery GREAT AEONCLOUD di Eye of the Storm crea un oggetto (resta in R33), e la Large Blast di AEONCLOUD è già
  offerta quando l'Infuse è armato (R47).
- Confronto prima/dopo su tutte le abilità del compendio Jobs (copia del pack, tutti i talenti e la mastery attivi):
  cambiano solo quelle elencate qui sopra. Solo codice, vale per le copie già sulle schede.

## 16 ottobre 2026 — Aure scritte nel testo: in alternativa, sul personaggio marcato, attorno a un terrain effect (versione 1.15.50)

### Round di debug del 16 ottobre, punto R48

- **Warding Bolts, mastery Phantom Bolts** (p.158: "You can cause the area to hover around you as an Aura 2 instead"):
  "No way to give self aura 2" → il bottone area leggeva nel testo solo Blast / Line / Arc / Burst, mai "aura N" →
  ora, con la mastery sbloccata, la finestra "which area?" offre "Text: Small Blast" e "Mastery: Aura 2"; l'Aura 2 va
  attorno a te, ti segue e resta per tutto il combattimento.
- **Fulminate** (p.226: "A character in range 6 is marked. The character gains aura 2 while marked"): "No way to apply
  the aura to the marked character" → l'abilità non aveva nemmeno il bottone area, e un'aura data a "the character"
  non era riconosciuta come data ad altri (R19b leggeva solo "that ally") → ora c'è il bottone area con Aura 2, che va
  attorno al token bersagliato (T) e lo segue, come l'alleato di Endless Battlement; con il talento scelto si aggiunge
  "Talent I: Aura 3" ("increase the area to 3") o "Talent II: Aura 1" ("condense the aura to 1"), e sopra l'aura
  piazzata + / − la cambiano (R32). L'aura non sparisce da sola quando il mark finisce: si toglie a mano.
- **Rampant Nail** (p.227: "Terrain effect: The spike has aura 2", lo spuntone in "a space in range"): "No way to give
  the aura to the area effect" → nessun bottone area per l'aura dello spuntone → ora il bottone area offre "Aura 2
  (terrain effect)": si clicca uno spazio entro range 3 (il centro dev'essere nel range) e l'aura resta lì, ferma, finché
  non la si toglie o non si usa di nuovo l'abilità (che la sostituisce, come un nuovo spuntone). Lo spuntone come
  oggetto resta in R33.
- **Heroic letto per le aree**: il testo Heroic non veniva letto dal bottone area → Rook ("increase aura to Aura 2",
  p.123) ora offre "Heroic: Aura 2" accanto alla sua Aura 1; per lo stesso motivo Land Waster offre "Heroic: Burst 2
  (target)".
- Confronto prima/dopo su tutte le abilità del compendio Jobs (copia del pack, tutti i talenti e la mastery attivi):
  cambiano solo Warding Bolts, Fulminate, Rampant Nail, Rook e Land Waster (Massive Overhead legge la Small Blast del
  suo Heroic, ma non ha il bottone area, quindi sulla scheda non cambia nulla). Non
  vengono lette come aure "aura 1 space" (il teleport di Fulminate) e l'aura di un oggetto (Spirit Shrine, "Object
  Effect: Aura 2", che resta in R33). Solo codice, vale per le copie già sulle schede.

## 16 ottobre 2026 — Le aree degli Infuse X crescono con l'Aether speso (versione 1.15.49)

### Round di debug del 16 ottobre, punto R47

- **Ätherwand, ÄTHERSTURM** (Infuse X, p.226: "Extend the area by 1 space for every Aether infused, up to a maximum of
  +3 spaces"): il bottone area proponeva solo Line 3 → la versione Infuse armata veniva letta solo se scriveva una
  forma ("Change area to Line 8"); "extend the area" non ne nomina nessuna e l'Aether speso non era usato → ora, con
  ÄTHERSTURM armato, l'area proposta per prima è la Line 3 allungata di uno spazio per Aether speso, al massimo +3
  (Line 4 / 5 / 6), con la scelta "Infuse X (N Aether)"; la Line 3 base resta nella lista.
- **Rime, MAGNARIME** (mastery Infuse X, p.233: "The area gains range 6 and becomes Arc 4, plus one per aether
  infused"): l'arco era sempre Arc 4, e veniva proposto anche senza la mastery armata → ora con MAGNARIME armata l'area
  è Arc 4 + Aether speso a range 6 (2 Aether: Arc 6), proposta per prima sia dal bottone area sia dall'Attack Roll.
  Le mastery che sono una versione Infuse (MAGNACRYO, MAGNAGEO, MAGNAPYRE, MAGNABIO, MAGNARIME, GREAT SPIRIT LANCE)
  cambiano l'area solo quando sono armate: prima la loro forma compariva come scelta "Mastery" anche senza spendere
  Aether.
- In generale la versione Infuse armata ora è la prima scelta della finestra "which area?" (prima era dopo la base).
- Controllo su tutte le versioni Infuse del compendio Jobs (script su una copia del pack, in
  `icon-compendium-audit/r47-area-sizes/`): cambiano solo ÄTHERSTURM e MAGNARIME; le altre forme fisse restano uguali.
  Il Talent II di Sturmreiten (una seconda Line 3 in un'altra direzione) è rimasto aperto come R47b. Solo codice,
  nessun dato cambiato.

## 16 ottobre 2026 — Il tiro del danno legge la versione Infuse armata (versione 1.15.48)

### Round di debug del 16 ottobre, punto R46

- **Cryo, Bio, Geo con l'Infuse o la mastery armata tirano il danno base**: con CRYOTIC armato ("increase damage to fray
  damage", p.234) il tiro restava a 1, con MAGNABIO (p.218) a [D]+fray, con MAGNAGEO (p.219) l'Area restava fray →
  il bottone Infuse spendeva l'Aether e cambiava l'area, ma il tiro del danno leggeva solo il testo base
  dell'abilità; il lavoro di R38b valeva solo per i Limit Break → ora, con una versione Infuse armata, il tiro usa le
  righe Hit / Miss / Area scritte nella versione (quelle che non scrive restano le base) oppure il suo "damage to …",
  che cambia tutti i danni dell'abilità. La card porta il nome della versione ("Bio — MAGNABIO").
- **MAGNACRYO** (p.234, Infuse X): Hit 2[D]+fray, Miss [D]+fray, Area [D]+fray; "bonus damage for every two aether
  spent" fa partire la finestra con un dado bonus ogni due Aether spesi (un [D] in più per ogni istanza di bonus damage,
  glossario p.102), con la nota del perché; e siccome la versione ha Hit e Miss, il bottone diventa Attack Roll invece
  di Auto-Hit.
- **EXCALIBUR di Nothung** (p.225, "All 1 piercing damage listed by this ability becomes divine"): il tipo non
  cambiava → la frase era scartata perché cambia il danno invece di aggiungerne → ora, con la mastery sbloccata, i
  danni da 1 piercing proposti dalla finestra (oggi il Talent I, "deals 1 piercing damage again") sono divine e la
  finestra spunta Divine invece di Pierce. Il danno dell'Effect e di GRAM non è ancora proposto in Other: annotato in
  TODO.
- Confronto su tutte le 144 abilità del compendio Jobs (script su una copia del pack, in
  `icon-compendium-audit/r46-infuse-damage/`): cambiano CRYOTIC e MAGNACRYO (Cryo), MAGNAGEO (Geo), MAGNABIO (Bio),
  MAGNAPYRE (Pyre), GREAT SPIRIT LANCE (Lance), AEONCLOUD (Eye of the Storm, "damage to [D]+fray": Area [D]+fray,
  p.236) e Nothung con mastery e Talent I. Le altre 22 versioni Infuse non toccano il danno e restano uguali. Senza
  Infuse armato nessuna abilità cambia. Solo codice, nessun dato cambiato.

## 16 ottobre 2026 — Niente "Hit (no damage)" sulle abilità che danneggiano solo con l'area (versione 1.15.47)

### Round di debug del 16 ottobre, punto R45

- **Dragon Dive e Bifröst propongono "Hit (no damage)"**: la finestra del tiro del danno apriva con la scelta Hit, senza
  danno, anche se l'abilità non è un attacco e tutto il suo danno sta nell'Area effect (Dragon Dive p.218, "dealing 2
  piercing damage to all characters"; Bifröst p.226, "dealing 2 piercing damage to all characters in the area") → la
  scelta Hit era mostrata sempre, anche vuota, e siccome è la prima era quella già selezionata → ora Hit compare solo se
  il colpo fa danno, se l'abilità è un attacco (il bersaglio può prendere solo gli status del colpo mentre l'area fa
  danno) o se l'abilità non ha nessun altro danno da proporre; altrimenti la finestra apre direttamente su Area. Il
  danno era letto bene: il problema era solo la scelta in più.
- Per i foe e le legend la finestra ora sa se l'azione è un attacco (tag attack o riga "On hit:"), con la stessa regola
  dei bottoni della scheda.
- Confronto su tutte le abilità dei compendi Jobs e Foe Abilities con il bottone Damage (1382, script su una copia dei
  pack): perdono la scelta "Hit (no damage)" 5 abilità dei Jobs (**Dragon Dive**, **Bifröst**, **Chaos Tarot**,
  **Justice**, **Comet**) e 83 azioni dei foe che fanno danno solo con l'area senza essere attacchi (Blunderbuss, Cut
  Through, Swing Sack, Soul Spark…). Nessun'altra cambia. Solo codice, nessun dato cambiato.

## 16 ottobre 2026 — Summon sui tratti che lo creano (versione 1.15.46)

### Round di debug del 16 ottobre, punto R44

- **Bound Spirit, Beast Master, Selkie e Cheap Trick senza summon**: i tratti evocano una creatura (Astral Seraph, Great
  Beast, Selkie, Bomb) ma sulla scheda non c'era il chip da trascinare sulla mappa come per le abilità → il chip summon
  (R7, R43) era calcolato solo per le abilità, i tratti avevano solo il bottone aura (R19c) → ora anche ogni tratto
  sbloccato mostra nell'intestazione, accanto al bottone aura, il chip del summon del proprio job che crea; si trascina
  sulla mappa come quello delle abilità.
- Si usa la stessa regola delle abilità (il nome subito dopo un verbo che lo mette in campo: Cheap Trick "leave a bomb
  in an adjacent space", p.149; Beast Master "summon a great beast in range 2", p.168), più una per i tratti che
  contengono la scheda della creatura e la nominano con un pronome o un nome corto: Selkie "summon it in range 3"
  (p.232) e Bound Spirit "place your seraph in range 2 from you" (p.155) contano perché il testo ha un verbo che la
  mette in campo e il profilo "Selkie — Size 1…" / "Astral Seraph — Size 1…". Serve il nome intero: "Beast" non scatta
  dentro "Great Beast — Size".
- Confronto su tutti i 95 tratti del compendio Jobs (script su una copia del pack): hanno il chip **Bound Spirit**
  (Astral Seraph), **Beast Master** (Great Beast), **Selkie** (Selkie), **Cheap Trick** (Bomb) e **Darkside** (Shadow,
  "you may leave a shadow", p.161). Restano senza chip Umbral Soul e Meld (scambiano posto con uno shadow, non lo
  creano), Tumbling, Gardener of Kin e Green Kenning (parlano dei summon in generale). I quattro summon esistono già
  nel compendio Summons. Solo codice, nessun dato cambiato.

## 16 ottobre 2026 — Summon solo sulle abilità che lo creano (versione 1.15.45)

### Round di debug del 16 ottobre, punto R43

- **Harrow e Shadow Play mostravano il summon Shadow**: Harrow dice solo "consume a shadow in range 2 of you" (Talent
  II, p.162), Shadow Play non nomina nessuno shadow fuori dal proprio nome ("At round 4 or later in combat, Shadow Play
  becomes a free action", p.163) → dal 1.15.9 (R7) un'abilità offriva il summon del proprio job ogni volta che il suo
  nome compariva nel testo, in qualunque modo → ora il summon compare solo se il nome viene subito dopo un verbo che lo
  mette in campo, con al massimo un articolo o un numero in mezzo: "summon a shadow", "summon +1 more beasts", "create a
  plant", "leave a bomb", "becoming a beast summon", thrall che "collapse into plants" (i thrall diventano piante,
  p.183). "consume a shadow", "shadows in range 2", "shadow clouds", "passes through a plant" non bastano più.
- Il testo letto ora comprende tutti i blocchi dell'abilità, non solo Effect / Hit / Miss / Area / Combo / talenti /
  mastery: anche Charge, Heroic, Exceed, Collide, Slay, Crit, Finishing Blow e Comeback. Così Umbra tiene lo Shadow
  grazie al suo "Finishing Blow: Summon a shadow adjacent to your target" (p.162), non più per il "consume a shadow" del
  Talent II.
- Confronto prima/dopo su tutte le abilità del compendio Jobs (script su una copia del pack):
  - **perdono il summon**: Harrow, Shadow Play, Nocturne ("shadow clouds", "shadow magic") e Assassinate ("the shadow
    of your foe") → Shadow; Fairy Ring → Plant (la mastery crea un oggetto Megamushroom che "counts as a plant" ma non
    sparisce quando perde la benedizione, quindi non è il summon Plant);
  - **cambia**: Harvest perde Plant (fa solo esplodere le piante che attraversa) e guadagna Thrall ("Slay: Summon a
    Thrall for each foe in the area");
  - **guadagnano il summon**: Underway → Beast (Charge: "Summon a beast each time you create an underway"), Heave-Ho →
    Salt Sprite (Collide: "Summon a salt sprite"), Cavaliere → Bomb (Slay e Finishing Blow: "Summon a bomb");
  - le altre 25 abilità con un summon restano uguali (fra queste Umbra, Umbral Echo, Nightmare, Apex, Morrigan,
    Gravebirth, Carnevale, Chaos Tarot con Wild Card e Master Card).
  Solo codice, nessun dato modificato: vale anche per le copie già sulle schede.

## 16 ottobre 2026 — Inflict per gli status dati a chi "finisce il turno" in un'area (versione 1.15.44)

### Round di debug del 16 ottobre, punto R42b

- **La mastery di Mist Strider non proponeva il Dazed**: "Foes that start their turn inside the area that end their
  turn outside of it take 2 damage and are dazed" (River Guardians, p.170) → la lettura del testo scarta uno status
  se prima, nella stessa frase, c'è una parola che vuol dire "togliere" ("ends the dazed", "removes", "cures"); fra
  queste c'era "end", e qui "end their turn" vuol dire solo "finire il turno" → "end / ends / ended / ending" seguito
  da "their / its / your / his / her / a / the turn" non conta più come "togliere": con la mastery sbloccata compare il
  bottone Inflict Dazed (gruppo "River Guardians").
- Confronto prima/dopo su tutte le abilità del compendio Jobs (base, combo, Talent I, Talent II, mastery): cambiano
  solo **Mist Strider** (mastery: Dazed) ed **Ätherwand** ("Foes that end their turn in the area are shattered",
  p.226: ora c'è l'Inflict Shattered nel gruppo "Terrain Effect", in tutte le versioni). Nessun'altra abilità cambia.
  Solo codice, nessun dato modificato: vale anche per le copie già sulle schede.

## 16 ottobre 2026 — Gain dei talenti con "one of them" e "Grant you and your ally" (versione 1.15.43)

### Round di debug del 16 ottobre, punto R42

- **Il Talent II di Shadow Play non proponeva l'Evasion**: "If you swap two allies, one of them can gain evasion
  until the start of their next turn" (p.163) → la lettura del testo cerca chi riceve lo status nella stessa parte
  di frase, e lì c'era solo "one of them": un pronome, che il sistema trattava come "qualcun altro" e quindi
  scartava → ora, quando chi riceve è "one of them" / "they" e prima nella frase sono nominati gli alleati, il
  bottone Gain va agli alleati (Evasion, fino all'inizio del loro turno successivo). Di riflesso compaiono anche i Gain
  Defiance di Crimson Bloom Talent I, Divine Aegis Talent II e della mastery di Wish ("they also gain defiance"),
  che parlano dell'alleato allo stesso modo.
- **Il Talent II di Blazing Bond non proponeva la Defiance**: "Comeback: Grant both you and your ally defiance when
  taking this action" (p.210) → il sistema riconosceva "grant" solo subito prima dello status ("grant you
  defiance"), non con chi riceve in mezzo ("grant both you and your ally …") → ora "grant" seguito da te e/o dagli
  alleati vale come Gain: due bottoni, uno su di te e uno sull'alleato. Non c'entrava la lettura di "also" corretta
  in R18 (Intimidate), che resta com'era.
- Il terzo caso del punto (Mist Strider, il dazed della mastery) ha una causa diversa e diventa R42b. Solo codice,
  nessun dato modificato: vale per le copie già sulle schede.

## 16 ottobre 2026 — Inflict solo sul bersaglio dell'attacco negli attacchi ad area (versione 1.15.42)

### Round di debug del 16 ottobre, punto R41

- **Lo status del bersaglio d'attacco veniva proposto a tutti quelli nell'area**: Maar segnalava che Blackstar
  ("Effect: Attack target is shattered.", p.212) e Drifting Leaf ("Effect: Foe is shattered.", p.227) mettevano i
  bottoni Shattered su ogni token dell'area → nel dialog dell'attacco si sceglie già il bersaglio d'attacco, e il
  d20 e l'Evasion andavano solo a lui, ma il riquadro Inflict della card d'attacco non lo sapeva: prendeva tutti i
  token bersagliati (quelli dentro l'area) e dava a ciascuno tutti i bottoni. Il manuale distingue le due cose:
  un'area applica il suo effetto "to all specified characters in the area" (p.94) e, negli attacchi ad area, "For a
  character in the attack space, make an attack … and apply the attack part of your ability instead of the area
  effect" (p.97) → ora, quando c'è un bersaglio d'attacco e altri token nell'area, la card d'attacco mette per
  primo il bersaglio d'attacco, segnato "(attack target)", con i bottoni di Hit / Miss / Crit / Exceed e delle frasi
  sul bersaglio ("Attack target is …", "Foe is …", "your foe", "the target"); gli altri, segnati "(area)", hanno solo
  il blocco Area e le frasi che parlano di tutti ("foes in the area", "all foes", "foes inside", come l'Exceed di
  Soul Shot), che restano anche al bersaglio d'attacco perché anche lui è nell'area; quello che il testo non chiarisce
  resta a tutti come prima. La regola legge il testo, non il nome: nel compendio Jobs cambia per Cryo, Demon Cutter,
  Sleight of Hand, Diablo, Bio, Blackstar, Lance, Soul Shot, Drifting Leaf (solo il bersaglio) e Chaos Tarot,
  Heave-Ho (solo l'area). Vale anche per le azioni dei Foe e dei Legend. Dove il bersaglio d'attacco non è stato
  scelto (Show in Chat, card Auto-hit) con più token bersagliati, i bottoni restano su tutti ma i gruppi solo per il
  bersaglio sono etichettati "attack target only". Solo codice, nessun dato modificato.

## 16 ottobre 2026 — Combo "instead of …" che sostituiscono solo una parte della base (versione 1.15.41)

### Round di debug del 16 ottobre, punto R40

- **Penumbra e Succubus stampavano anche la parte della base che sostituiscono**: Maar segnalava che il testo combo
  di Umbra non sostituiva l'effetto indicato e che quello di Incubus non toglieva il Mark dalla card in chat → R1
  (1.15.3) riconosceva solo le combo complete (nome in maiuscolo) e la frase "replace the base effect with"; queste
  due combo dicono invece "instead of …" e finivano intere in una riga "Combo — …" in cima, con sotto la base
  invariata. Nel libro: Penumbra (Shade, p.162) "Teleport your foe up to 3 spaces towards you instead of
  teleporting yourself" prende il posto dell'Effect "You may teleport 3 before the attack" (l'Effect "Your foe is
  blinded" resta); Succubus (p.164) "Instead of the mark, gain Effect: deal 3 damage…" toglie il blocco Mark →
  ora il testo combo viene letto così, in modo generico ma prudente: "Instead of the <blocco>, gain <Etichetta>: …"
  toglie il blocco della base con quel nome (solo se è un'etichetta del libro e se subito dopo c'è un blocco con
  etichetta) e, per Succubus, anche il tag Mark (niente bottone Mark con la combo armata); una combo senza blocchi
  che dice "instead of <verbo>-ing" sostituisce il primo blocco della base che parla di quel verbo ("teleporting"
  → l'Effect con "teleport"); se non ne trova nessuno resta in cima come prima. Vale per Show in Chat e per la card
  d'attacco con la combo armata. Combo toccate nel compendio Jobs: solo **Penumbra** (Umbra) e **Succubus**
  (Incubus). Controllate tutte le 17 combo del pack: le altre danno gli stessi blocchi e tag di prima (l'unica altra
  con "instead", DAWN di Dervish, "instead of the end", è una combo completa e non cambia). Solo codice, nessun dato
  modificato. Il barrato parziale sulla scheda resta da fare (voce "Emerso lavorando su R1 — barrato parziale").

## 16 ottobre 2026 — Testo dei Limit Break impaginato come nel libro (versione 1.15.40)

### Round di debug del 16 ottobre, punto R39

- **Formattazione dei Limit Break sbagliata**: Maar segnalava che "some of the formatting on them is off" → il
  riquadro Limit Break della scheda, la card di "Use Limit Break" e la scheda dell'oggetto mostravano il testo così
  com'era salvato: gli a capo sparivano (i due Effect di Helion, la tabella di Curtain Call, il paragrafo sui
  Legend di Gigantas Crusher finivano tutti attaccati), gli elenchi "•" di Lycanthropy e Split Heaven and Hell
  restavano una riga sola, nessuna etichetta era in grassetto e i tag ("Divine, Unerring, True Strike." di
  Gigaflare) stavano in testa all'effetto come una frase. In più, nel compendio sei Limit Break avevano perso
  parte dell'impaginazione del libro: l'etichetta "Effect:" di Gigaflare (p.208), Gran Levincross (p.224) ed
  Elemental (p.232), il secondo "Effect:" di Cataclysm (p.217), l'elenco dei santi di March of the Saints (p.176) e
  dei benefici di Elemental, e gli a capo di Gran Levincross, Cataclysm e Death Sentence (il "Summon effect:" del
  Severed Soul, p.184) → ora il testo di un Limit Break si legge come quello delle abilità: i tag su una riga loro
  sotto il nome, ogni blocco (Effect, Attack, Aura, Stance, Delay, Summon Effect, Infuse…) su un paragrafo suo con
  l'etichetta in grassetto, gli elenchi "•" una voce per riga, le parole chiave con il loro tooltip e [D] col dado
  del PG; il nome di una versione Infuse va nell'etichetta ("Infuse 6: TETRAFLARE"). La descrizione (Helion, Mock,
  Paradiso…) compare in corsivo sopra l'effetto. Nel compendio Jobs i sei testi hanno di nuovo etichette e righe
  del libro, sia nell'oggetto Limit Break sia nel job template; la migrazione 25 aggiorna le copie già sulle
  schede. Le parole non sono cambiate e Damage Roll, aree e bottoni Infuse leggono gli stessi valori di prima.
  L'Ultimate resta non mostrato sulla scheda (voce "Emerso lavorando su R37").

## 16 ottobre 2026 — Versioni Infuse dei Limit Break (versione 1.15.39)

### Round di debug del 16 ottobre, punto R38b

- **Versioni Infuse dei Limit Break non usabili**: Maar segnalava che Gigaflare (Enochian, p.208) non poteva usare
  la sua versione infusa, Tetraflare ("Infuse 6: TETRAFLARE — Deal [D]+fray twice instead"), né l'Ultimate Meteor;
  lo stesso per Gran Levincross (Spellblade: "Slay or Infuse 3: RAGNARÖK" e l'Ultimate "GÖTTERDÄMMERUNG — Infuse 6")
  → il riquadro Limit Break non aveva i bottoni Infuse che hanno le abilità (spesa dell'Aether, versione "armata"),
  e il Damage Roll di R37 tagliava via tutto quello che viene dopo "Infuse N:" → ora il riquadro ha un bottone per
  ogni versione Infuse (quelle dell'Ultimate dal capitolo 3, p.113), che funziona come quello delle abilità: spende
  l'Aether, arma la versione e posta il messaggio; ricliccarlo restituisce l'Aether. Con una versione armata:
  "Use Limit Break" posta anche il testo di quella versione e ne paga la Resolve se ne ha una sua (Meteor: "6
  resolve", il badge del riquadro mostra 6); il Damage Roll, quando la versione dice "instead", sostituisce il danno
  Hit (Tetraflare: Instances 2; Meteor: Instances 4) e la card si intitola "Gigaflare — TETRAFLARE". Le versioni che
  aggiungono danno dopo l'abilità vanno in Other: Götterdämmerung (2[D]+fray divine) quando è armata, Ragnarök
  ([D]+fray divine) sempre, perché la attiva anche lo Slay senza spendere Aether. Il "Special effect" di Meteor
  (pagare con la vita, "999 divine damage instead") è proposto in Other come "METEOR — Special effect" (999 divine,
  un clic); la morte del PG resta da applicare a mano. Nota: Meteor costa Infuse 8, ma l'Aether arriva al massimo a 6
  (dado d6, p.204), quindi con l'Aether normale il bottone avvisa che non basta; la strada del libro è il Special
  effect. Solo codice, nessun dato toccato.

## 16 ottobre 2026 — Aura e aree dei Limit Break sulla mappa (versione 1.15.38)

### Round di debug del 16 ottobre, punto R38

- **Aura dei Limit Break non piazzabile**: Maar segnalava che i Limit Break con effetti speciali non si potevano
  usare davvero, a partire dall'aura di Paradiso (Freelancer, p.155: "You gain Aura 2 until the end of your next
  turn") → il riquadro Limit Break della scheda aveva solo "Use Limit Break" e "Damage Roll": il bottone dell'area
  che hanno abilità e tratti non c'era, e nessuno leggeva tag e testo del Limit Break in cerca di un'area → ora,
  quando il Limit Break ha un'aura o un'area, accanto agli altri bottoni c'è il bottone dell'area (per esempio
  "Aura 2"), che la piazza sulla mappa come per le abilità: l'aura va attorno al token, lo segue e la sua durata è
  letta dal testo ("until the end of your next turn"), ricliccare la sostituisce. Letti allo stesso modo delle
  abilità: Paradiso, Elemental e High Prophecy (Aura 2), Death Sentence (Line 4), Split Heaven and Hell (Line 5 dal
  testo), Curtain Call (Line, lunghezza chiesta al piazzamento: dipende dal gamble), Cataclysm (Line larga 3 oppure
  il Medium Blast delle esplosioni, a scelta). Se il testo parla di tutto il campo di battaglia (Cataclysm) e non dà
  un range, l'area si piazza ovunque invece che accanto al PG. Dal capitolo 3 conta anche il testo dell'Ultimate.
  Le versioni Infuse (Tetraflare, Meteor, Ragnarök, Götterdämmerung) sono un'altra causa e restano al punto R38b.
  Solo codice, nessun dato toccato.

## 16 ottobre 2026 — Tiro del danno dei Limit Break (versione 1.15.37)

### Round di debug del 16 ottobre, punto R37

- **Limit Break senza tiro del danno**: Maar segnalava che diversi Limit Break che fanno danno non avevano il tiro
  del danno (Gigaflare, Enochian, p.208: "dealing [D]+fray divine damage to every character on the battlefield") →
  il riquadro Limit Break della scheda aveva solo "Use Limit Break", che spende la Resolve e posta il testo, ma
  nessun bottone di danno: il lettore del danno delle abilità non veniva mai chiamato sui Limit Break → ora, quando
  il testo del Limit Break contiene danno, accanto a "Use Limit Break" c'è "Damage Roll", con la stessa finestra e
  la stessa card delle abilità ([D] e fray del PG, Instances, Apply). Il primo danno dell'effetto (o le righe "On
  hit:" / "Miss:") è l'esito Hit; ogni altra frase con danno è proposta in Other (le esplosioni di Cataclysm,
  l'Exceed e il danno divino per alleato di Passage to the Afterlife); dal capitolo 3 anche quelle dell'Ultimate
  (p.113: "Upon entering chapter 3, you unlock the Ultimate limit break"), per esempio Dread Mock. Con il tag
  Divine tutto il danno parte già come divino (p.104); True Strike e Unerring dai tag come per le abilità; "three
  times" / "two more times" riempiono Instances; "Miss: Once." è il danno del colpo una volta sola. Le versioni
  Infuse (Tetraflare, Meteor, Ragnarök, Götterdämmerung) non sono lette: sono il punto R38. I danni in percentuale
  degli hp (Gigantas Crusher, Split Heaven and Hell) non si tirano.
- **Divine non più spuntato da solo sulle abilità**: nella 1.15.28 la regola che legge il tipo di danno accanto alla
  quantità ("1 divine damage", "[D]+fray divine damage") aveva perso due barre rovesciate, quindi Divine e Pierce
  non si spuntavano più da soli → regola corretta; legge anche "divine fray damage" e "2 additional divine damage".
  Solo codice, nessun dato toccato.

## 15 ottobre 2026 — Dimensione dell'aura con + e − (versione 1.15.36)

### Round di debug del 15 ottobre, punto R32

- **Cambiare la dimensione di un'aura già sulla mappa**: Maar chiedeva, per la mastery di Gentleness (Chanter,
  GENTLE PRAYER, p.179: "When the aura refreshes, you may increase or decrease the aura size by +1, to a maximum of 3
  or a minimum of 1. When you do, foes inside must save or be pacified"), gli stessi comandi + / − che allargano la
  Line mentre la si piazza → con il mouse sopra un'aura già piazzata, + la allarga di 1 e − la restringe di 1: le
  caselle si ridisegnano attorno al token che la porta (che continua a seguire), l'etichetta passa da "Aura 1" ad
  "Aura 2". I limiti sono quelli scritti nel testo dell'abilità quando l'aura viene piazzata ("maximum of 3 / minimum
  of 1": Gentleness con la mastery sbloccata va da 1 a 3), altrimenti da 1 a 5 come la larghezza della Line; al
  limite un avviso lo dice. A ogni cambio un avviso mostra la nuova dimensione e, se il testo la scrive, la frase
  che segue ("When you do, foes inside must save or be pacified"). Funziona su qualsiasi livello della mappa, solo
  per chi ha piazzato l'aura o per il GM; non mentre si scrive in un campo, non con il mouse su una scheda, non
  mentre si piazza un'altra area. Le aure piazzate prima di questa versione vanno da 1 a 5 (ripiazzarle per avere i
  limiti del testo). Durata (R3), aure lette dal testo (R19), aure sugli alleati (R19b) e dei tratti (R19c) non
  cambiano. Solo codice, nessun dato toccato.

## 15 ottobre 2026 — Mastery e talento in chat da soli (versione 1.15.35)

### Round di debug del 15 ottobre, punto R31

- **Postare solo la mastery o il talento**: Maar chiedeva un modo di mandare in chat la sola sotto-azione della
  mastery di Symphony (Chanter, CRESCENDO, p.179: "you can create a mote in range 5 as a free action as part of
  ending your turn") e il solo trigger della mastery di Spirit Shrine (Sealer, SPIRIT PATRONAGE, p.193: l'interrupt
  "Grace of the Spirits — Trigger: An ally in the aura is damaged by an foe's ability"), senza il resto del testo →
  nell'anteprima delle abilità sulla scheda PG, accanto all'etichetta "Mastery:" (solo se la mastery è sbloccata) e
  accanto a quella del talento scelto, c'è un piccolo bottone con l'icona del fumetto che posta una card con solo
  quel testo: titolo dell'abilità con sotto "Mastery: Crescendo" (il nome letto dalle maiuscole all'inizio del
  testo) o "Talent I", badge job / capitolo / Mastery, testo con le keyword e i tooltip come nelle altre card, e i
  bottoni Inflict / Gain se il testo nomina degli status. Vale per tutte le mastery e tutti i talenti; Show in Chat,
  combo alternativa (R28) e Dervish (R29) non cambiano. Solo codice, nessun dato toccato.

## 15 ottobre 2026 — Track target: un segno che non è un mark (versione 1.15.34)

### Round di debug del 15 ottobre, punto R30

- **Segno che non conta come mark**: Maar chiedeva un modo di segnare il personaggio scelto da Grand Banishment
  (Sealer, p.193: "choose a foe in range… Until the end of that foe's next turn, they take 3 divine damage…") e da
  The Tower (Seer, p.203: "At the end of that foe's turn, gamble…"), che non sono mark, senza che conti come mark →
  le abilità del PG il cui testo parla di "that foe's / that character's (next) turn" e che non hanno già il tag
  mark hanno un bottone **Track target** (icona a segnaposto): con un solo token targettato mette sul bersaglio un
  segno "Tracked — <abilità> (<PG>)" con il testo dell'abilità, che si vede come i mark (chip con ✕ sotto
  l'abilità, riga "Tracked: …" nel tab Conditions del bersaglio e nel pannello status del token) e si toglie allo
  stesso modo. Per le regole non è un mark (p.95, "a character can only mark another character with one mark at a
  time"): non rimpiazza i mark del PG sullo stesso bersaglio e non viene rimpiazzato da loro, non finisce quando il
  PG è sconfitto, non ha stack; un nuovo Track della stessa abilità sposta il segno. Finisce a fine combattimento come
  i mark. Oltre alle due abilità il bottone compare anche su Showdown, Assassinate, Great Giorgios e Pyroclast (stesso
  schema "alla fine del turno di quel nemico"). Solo codice, nessun dato toccato.

## 15 ottobre 2026 — Dervish: base e combo insieme con la mastery (versione 1.15.33)

### Round di debug del 15 ottobre, punto R29

- **Dervish con la mastery**: Maar chiedeva che, con la mastery sbloccata, la card in chat stampasse entrambi gli
  effetti, come comportamento predefinito. La mastery BEACON OF HOPE dice "You can empower this ability to gain both
  effects at once and automatically activate their charge effects. This also counts as spending a combo token,
  though you don't actually need to spend one" (p.178) → con la mastery sbloccata, **Show in Chat** di Dervish posta
  una card "Dervish + Dawn" con l'Effect e il Charge di Dervish e, sotto, il blocco "Dawn — Effect" (aura 1, +1 boon
  ai tiri salvezza), anche senza token combo; i bottoni Inflict prendono gli status di entrambe le versioni. Se il
  token è acceso viene speso come prima, se è spento resta spento. Sulla scheda, col token acceso, il testo base non
  è più barrato. Il comportamento è letto dal testo della mastery ("gain both effects"), non dal nome
  dell'abilità. Solo codice, nessun dato toccato.

## 15 ottobre 2026 — Combo alternativa data dalla mastery (versione 1.15.32)

### Round di debug del 15 ottobre, punto R28

- **Combo alternativa della mastery**: Maar chiedeva di poter usare la combo alternativa che quattro mastery
  aggiungono ("Gain an alternate combo ability. You can choose this ability or Fleet when you spend a token", p.177):
  Felicity → Fantasia (p.177), Rot → Regrowth (p.186), God Hand → Fists of Heaven and Hell (p.192), Justice → Gran
  Judicata (p.194); per Felicity con un menù allo Show in Chat → con la mastery sbloccata e il token combo armato, il
  primo clic su **Show in Chat**, **Attack** o **Damage** dell'abilità apre una finestra con due bottoni (la combo
  normale, es. "Fleet", e quella della mastery, es. "Fantasia"). La scelta vale per quell'uso: card in chat, card
  dell'attacco, danno, Inflict degli status, tag e area usano il testo della combo scelta al posto di quello normale,
  e il titolo diventa "Fantasia (Felicity combo)". La scelta si azzera quando il token si accende/spegne a mano, a
  fine turno e a fine combattimento, e dopo il tiro di danno del token speso. Il testo della combo alternativa è già
  nel campo mastery del compendio ("Combo: FANTASIA (2 actions) — …"): viene letto da lì, nessun dato toccato e
  nessuna migrazione.
- **Rot, mark per Regrowth**: Maar non poteva marcare un personaggio con Regrowth invece che con Regenerate → con la
  mastery sbloccata la scheda ha un terzo bottone **Mark target (Regrowth)**, accanto a quelli di Rot e di
  Regenerate; è un mark a parte (non sostituisce gli altri) con il testo di Regrowth, e compare nelle chip dei mark
  con "(Regrowth)".
- **Fists of Heaven and Hell con i talenti** (voce emersa da R16): la combo alternativa di God Hand "gains all talent
  effects of this ability" (p.192); la card dell'attacco aggiunge già il talento sbloccato a ogni versione
  dell'abilità, quindi anche a Fists of Heaven and Hell, senza altro codice.

## 15 ottobre 2026 — Damage Utility sulla scheda PG (versione 1.15.31)

### Round di debug del 15 ottobre, punto R27

- **Damage Utility**: Maar chiedeva la macro del danno anche in fondo alla scheda dei giocatori, col nome "Damage
  Utility", che funzionasse come la finestra del danno standard ma più modulare → in fondo al tab Combat della scheda
  PG c'è un riquadro **Damage Utility** con un bottone che apre la stessa finestra del danno delle abilità in
  modalità libera: niente abilità e niente scelta Hit/Crit/Miss/Area, solo i campi dell'esito "Other" (dadi del
  [D] del personaggio, danno fisso, + fray, area effect) con in più un campo **Source** facoltativo che finisce nel
  titolo della card ("Damage Utility — Counter damage"); sotto restano tutti i modificatori della finestra normale
  (bonus dice, flat, Instances ×N, Vulnerable, Resistance/Cover, Weakened, Pierce, Divine, True Strike, Unerring,
  Hatred) e la lista dei bersagli con la ✕. La card e i bottoni Apply sono quelli delle abilità (armatura, Vigor,
  mob, Dodge sull'area, istanze separate). Riusa la finestra esistente invece di copiarla; le finestre delle abilità
  non cambiano, salvo il suggerimento del campo Dice che ora dice anche quanto vale [D]. La macro "Apply Damage" del
  compendio resta com'è. Solo codice, nessun dato toccato.

## 15 ottobre 2026 — [D] mostrato con il dado del personaggio (versione 1.15.30)

### Round di debug del 15 ottobre, punto R26

- **[D] con i dadi veri**: Maar chiedeva che nelle card delle abilità "[D]" diventasse il dado di danno del personaggio
  ("2d10" si capisce subito, "2[D]" no), restando [D] prima della scelta del job o fuori dalla scheda di un personaggio,
  come fa già il damage roller → sulla scheda di un PG con almeno un job, i testi delle abilità (anteprima nel tab
  Combat, card di Show in Chat, card dell'attacco, compresi talento, mastery, combo e promemoria delle reliquie, e la
  riga Hit degli attacchi base) mostrano "[D]" come il dado del personaggio: "[D]+fray" → "d10+fray", "2[D]" → "2d10"
  (p.84: "if you're a Freelancer, [D] is 1d10"; p.91: "2[D] or 3[D], roll that many dice"). Passandoci sopra il
  mouse il tooltip dice "2[D] = 2d10 (your damage die is d10)" più la definizione del glossario. Un PG senza job, la
  scheda dell'item, il compendio e le schede di foe e legend restano con [D]. Le card già in chat non cambiano. Solo
  resa, nessun dato toccato.

## 15 ottobre 2026 — Bottone Gamble sulle abilità (versione 1.15.29)

### Round di debug del 15 ottobre, punto R25

- **Gamble cliccabile**: Maar chiedeva un bottone per il gamble sulle abilità che lo hanno (es. Riposte), con dadi da
  aggiungere o togliere al momento e spazio per i tratti del Fool che fissano il numero; Turz Ven ricordava che conta
  solo il dado più alto (3d6kh1, non 3d6) → sulle abilità col tag "gamble" o con la parola nel testo in gioco
  (descrizione, talento scelto, mastery sbloccata, combo) c'è un bottone **Gamble** nell'anteprima della scheda PG e
  nella card di Show in Chat (lì lo usa solo chi possiede il personaggio). Apre una finestra con: **Dice** (1 di
  default, +/−, fino a 10) per i dadi extra che dà l'abilità o un talento (Riposte Talent I: sacrifice 2 per 1 d6 in
  più, p.142); **Vigilance charges spent** solo dove il testo spende la Vigilance sul gamble (Dire Parry, p.142: un d6
  in più per carica), scalate dal tracker; **Result**: Roll (default), **Stacked Die** (solo se il Fool ne tiene uno:
  risultato 6 e il dado viene speso, Stack Dice p.149) oppure **Set the number** (1-6, per Silver Rabbit III p.250,
  Golden Mask p.340, Bend Fate p.199). Il tiro è 1d6 (gamble, p.148) o Nd6 tenendo il più alto, come la Vigilance
  (p.105). La card in chat mostra i dadi (il più alto evidenziato), il risultato e, se l'abilità ha una tabella 1-6
  (R11), la riga corrispondente. Solo codice.

## 15 ottobre 2026 — Più istanze dello stesso danno nel tiro del danno (versione 1.15.28)

### Round di debug del 15 ottobre, punto R24

- **Danno ripetuto ("3 damage, three times")**: Maar chiedeva che il damage roller gestisse le abilità che
  infliggono lo stesso danno più volte (es. Strongarm), fatte apposta per la sinergia con Vulnerable → la finestra
  del danno (PG, foe, legend) ha un nuovo campo **Instances ×N** tra i modificatori, precompilato quando il testo
  dell'esito scelto dice "twice" / "three times" / "N times" (Riddle del Pepperbox, p.302: "On hit: 3 damage, three
  times"; anche le scelte rapide di Other) e modificabile a mano (Strongarm Talent II, Chastise). Regola del libro
  (p.92): si tira una volta e si applica il totale N volte separate; armor (p.92, "each time that damage is applied"),
  weakened (p.92, "each time a character deals damage") e vulnerable (p.109: "3+1 and 3+1 = 8 damage, not 3+3+1=7")
  contano su ogni istanza. Quindi la card mostra il danno di una istanza (con +1 vulnerable / −2 weakened già dentro)
  e "× N instances"; il bottone diventa "Apply X ×N" e applica N volte di fila, togliendo l'armor e l'eventuale ½
  (Cover / Resistance) a ciascuna, con una sola nota riassuntiva in chat. Un mob perde un hit per istanza (p.291). Se
  il bersaglio va a 0 (o un PG prende una ferita) le istanze rimanenti non si applicano. Se l'Area si tira insieme
  all'attacco, ripete solo se è il suo testo a dirlo. Solo codice.

## 15 ottobre 2026 — Opzione "Other" nel tiro del danno per il danno delle mastery (versione 1.15.27)

### Round di debug del 15 ottobre, punto R23

- **Danno extra delle mastery e dei talenti**: Maar segnalava che con Harvest (Harvester) l'area della mastery si
  piazza ma il suo danno non si tira facilmente, e che con Draken Cross (Demon Slayer) i 2 danni divine della mastery
  si tirano solo mettendoli nel danno dell'area; Turz Ven proponeva un'opzione "Other" nel damage roller → la finestra
  del danno ha un nuovo esito **Other**, accanto a Hit / Crit / Miss / Area, su tutte le schede (PG, foe, legend).
  Scegliendolo si apre un pannello con: le righe di danno lette dal talento scelto e dalla mastery sbloccata come
  scelta rapida (Harvest Moon, p.186: "2 piercing damage in a small blast area effect"; Dark Wind Devil Blade, p.128:
  "take 2 divine damage"; Talent I di Draken Cross: "Deal fray damage again"), più i campi liberi Dice, Fixed damage,
  + Fray e Area effect. La scelta rapida riempie i campi e spunta Divine / Pierce secondo il testo; tutto resta
  modificabile. Bonus dice, Flat damage, Vulnerable, Resistance ecc. valgono come per gli altri esiti. La card in chat
  si intitola "<abilità> — Mastery damage" (o "Talent I damage", "Other damage"); con Area effect spuntato Dodge rende
  immuni al momento di Apply come per l'Area (p.144). Non vengono proposte le frasi che cambiano il danno invece di
  aggiungerne ("instead of", "increases by", "becomes"), né quella già usata come danno dell'Area (R21). Le abilità
  il cui unico danno sta nel talento o nella mastery (es. Rot con Talent II, Chastise) ora hanno il bottone Damage
  Roll. Più istanze dello stesso danno ("twice") restano per R24. Solo codice.

## 15 ottobre 2026 — Voce FAQ sulle difficoltà dei tiri narrativi (versione 1.15.26)

### Round di debug del 15 ottobre, punto R22

- **FAQ narrativa: difficoltà dei tiri**: Maar chiedeva di aggiungere alla FAQ narrativa le "difficoltà" dei dadi
  (Trivial, Risky/standard, Heroic) → nella Quick Guide, FAQ → Narrative, c'è una nuova voce "What are the difficulties
  of a narrative roll? Trivial, risky (standard), heroic?". La risposta usa le parole del manuale: il libro la chiama
  **risk** e ha tre livelli, controlled, risky (il default) e desperate (p.18), con conseguenze minori / medie /
  maggiori e strain 1, 2 o 4 (p.29); "trivial" e "heroic" come livelli di rischio non esistono: si tira solo quando
  l'esito è incerto (p.11), un compito senza conseguenze è un fortune roll (p.20), e un'azione eroica "beyond mortal
  limits" è una questione di effetto (superpowered, pp.18-19). La tab Narrative della guida aveva già la tabella dei
  rischi: non è cambiata. La ricerca della guida trova la voce con "trivial", "heroic", "desperate". Solo codice.

## 15 ottobre 2026 — Con la mastery di Dropkick il tiro del danno propone l'Area (versione 1.15.25)

### Round di debug del 15 ottobre, punto R21

- **Dropkick: con la mastery sbloccata il damage roller non offriva l'Area**: la mastery Giant Kicker (Colossus,
  p.136) dice "Dropkick gains true strike and a line 4 area effect that must include your target. The area deals fray
  damage to all characters other than your target", ma nella finestra del danno c'erano solo Hit e Crit → il danno
  dell'area veniva letto solo dal testo base dell'abilità (campo Area Effect o "Area Effect:" nella descrizione), mai
  dal talento scelto o dalla mastery sbloccata; Dropkick di base non ha area, quindi niente opzione Area → ora, se il
  testo base non ha danno d'area, si legge il talento scelto e la mastery sbloccata: la frase che nomina un "area
  effect" (o quella dopo) dà il danno dell'Area, con il tipo (piercing/divine) come per gli altri danni. Non vengono
  letti il danno "again" (una seconda istanza, è la richiesta R23/R24) né i testi che scrivono un'altra azione intera
  (combo alternativa di God Hand, infusioni Magna). Stessa causa sistemata anche per: Sow con Spectral Scythe (2
  piercing nell'arco), Pyroclast con Magmotic (2 piercing), Sidhe Talent II (2), Obsidian Flesh Talent II (2
  piercing), Upheaval Talent I (2), Wicked Sheath Talent II (2 per carica: si tira 2, il resto a mano), Exorcism
  Talent II (2 per carica, idem); Upheaval e Obsidian Flesh, che di base non fanno danno, con quel talento hanno il
  bottone Damage. Hit, Crit e Miss restano quelli di prima. Solo codice: nessun cambio al
  compendio, vale anche per le copie già sulle schede.

## 15 ottobre 2026 — L'Arc 4 della mastery di Sow si piazza dal bersaglio (versione 1.15.24)

### Round di debug del 15 ottobre, punto R20

- **Sow: l'Arc 4 della mastery non si poteva usare**: la mastery Spectral Scythe (Harvester, p.185) dice "Reap and
  Sow also create an arc 4 area effect drawn from your target as the origin space, that cannot include your
  target": è un'area **in più**, non sostituisce il bersaglio, e parte dal bersaglio, non da chi usa l'abilità. Tre
  cause: (1) con il combo token (REAP) i tag della combo non hanno l'arco, e il bottone area guardava solo i tag e il
  testo base, quindi spariva; lo stesso succedeva con le copie di Sow aggiunte prima dei tag delle mastery; (2) il
  primo spazio dell'arco doveva stare entro range 4 da chi usa Sow, quindi non si poteva disegnare oltre un bersaglio
  lontano; (3) il tiro d'attacco piazzava l'arco come area dell'attacco e sostituiva il bersaglio con chi stava
  nell'arco (che per regola non può contenerlo) → ora il bottone area legge anche il testo del talento scelto, della
  mastery sbloccata e della combo armata; un'area il cui testo dice "from your target as the origin" parte dal token
  bersagliato (primo spazio adiacente al bersaglio, p.97) e non può coprirlo né coprire chi la usa; senza un solo
  bersaglio un avviso e l'arco parte da chi lo usa come prima; il tiro d'attacco non la piazza più e tiene il
  bersaglio. La prima parte vale anche per le altre abilità con un'area scritta solo nel testo di un talento o di una
  mastery (es. Ace Talent I, Sidhe Talent II, Exorcism Talent II, Morrigan, Showdown): ora hanno il bottone area quando
  il talento è scelto o la mastery sbloccata. Solo codice: nessun cambio al compendio, vale anche per le copie già
  sulle schede.

## 15 ottobre 2026 — I tratti che danno un'aura hanno il bottone area (versione 1.15.23)

### Round di debug del 15 ottobre, punto R19c

- **L'aura di Shieldmaster e di Pelagic Rage non si poteva mettere sulla mappa**: i due tratti dicono "You have
  aura 1" (Shieldmaster, Bastion, p.121) e "You gain aura 2" (Pelagic Rage, Stormbender), ma sulla scheda del PG il
  tratto aveva solo il bottone chat → il bottone area esisteva solo per le abilità (legato ai loro tag) e i tratti non
  hanno tag → ora un tratto sbloccato il cui testo dà un'aura a chi lo possiede (stessa lettura del testo di R19)
  mostra nell'intestazione un bottone "Aura N" con lo stesso stile di quello delle abilità: piazza l'aura attorno al
  proprio token e la fa seguire il token. Ripremerlo sostituisce l'aura. La durata si legge dal testo come per le
  abilità (R3): nessuno dei due tratti ne scrive una, quindi l'aura resta finché non la si toglie. Un tratto ancora
  bloccato (capitolo non raggiunto) non ha il bottone. Solo codice: nessun cambio al compendio, vale anche per i
  tratti già sulle schede.

## 15 ottobre 2026 — L'aura di Endless Battlement va sull'alleato (versione 1.15.22)

### Round di debug del 15 ottobre, punto R19b

- **Endless Battlement metteva l'aura su chi usa la stance**: il libro dice "choose an ally in range 4. That ally
  gains aura 1 until the start of your next turn. The aura deactivates if your ally is out of range" (Bastion,
  p.123), ma il bottone area piazzava l'aura attorno al token di chi la usa e la faceva seguire quel token → il
  piazzamento delle aure (`placeAreaTemplate`) partiva sempre dal token di chi usa l'abilità e non aveva un modo per
  scegliere un alleato → ora, se il testo dell'abilità dice che un alleato riceve l'aura ("That ally gains aura 1"),
  l'aura va attorno al token dell'alleato bersagliato (target, tasto T) e segue lui quando si muove. La durata resta
  contata sui turni di chi usa la stance (R3). Senza un alleato bersagliato, o con più bersagli, l'aura resta attorno
  a chi la usa come prima, con un avviso che spiega di bersagliare l'alleato e ripiazzarla. Se l'alleato è oltre range
  4 compare un avviso ma l'aura si piazza lo stesso (con la mastery Perfect Battlement il range non conta e l'avviso
  non c'è). Le altre aure (Rook, Dervish, Gentleness…) restano attorno a chi le usa. Solo codice: nessun cambio al
  compendio né alle schede.

## 15 ottobre 2026 — Le aure scritte nel testo danno il tag e l'area (versione 1.15.21)

### Round di debug del 15 ottobre, punto R19

- **Aure di talenti, mastery e combo senza tag né bottone area**: il Talent I di Dervish (Chanter, Mendicant: "A
  swirling aura 1 of winds surrounds you…", p.178), la mastery Infectious Hatred di Dark Knight (Knave, Stalwart:
  "While in Dark Knight, you have Aura 1", p.143) e la combo Sweet Torment di Bleak Mercy (Knave: "…until the end of
  your next turn, gain aura 1", p.144) non davano il tag Aura né il bottone per piazzare l'aura → il bottone area e il
  tag vengono dai tag dell'abilità, e queste tre aure sono scritte solo nel testo del talento / della mastery / della
  combo, che non aveva una lista di tag sua → ora un talento scelto, una mastery sbloccata o la combo armata che danno
  un'aura a chi usa l'abilità ("you have aura N", "gain aura N", "aura N … surrounds you") aggiungono il tag Aura N
  (chip evidenziata con il testo nel tooltip) e quindi il bottone area, che la piazza attorno al token con la durata
  letta dal testo (R3). Vale anche per la combo DAWN di Dervish. Un'aura data a un altro ("That ally gains aura 1")
  non conta.
- **Endless Battlement chiedeva la dimensione dell'aura (proposta 3)**: il tag era solo "aura", senza numero, e la
  dimensione 1 è scritta nel testo ("That ally gains aura 1", p.123), quindi il piazzamento chiedeva quanti spazi
  proponendo 3 → ora un tag "aura" senza numero prende la dimensione dal testo dell'abilità (Aura 1) e non chiede
  niente; lo stesso per Rook (aura 1), Strength of the Pack (aura 2), Perseus (aura 1) e Nightmare (aura 2). Con la
  mastery di Endless Battlement la scelta non offre più anche un secondo "Base: Aura" uguale. Che l'aura vada
  sull'alleato e non su chi usa la stance è un difetto separato (R19b), come l'aura del tratto Shieldmaster (R19c).
  Solo codice: nessun cambio al compendio né alle schede, vale anche per le copie già sulle schede.

## 15 ottobre 2026 — La mastery di Intimidate propone Unstoppable (versione 1.15.20)

### Round di debug del 15 ottobre, punto R18

- **La mastery di Intimidate non proponeva Unstoppable**: con la mastery Iron Skull di Intimidate (Knave, Stalwart)
  sbloccata, "After Intimidate's stun triggers, also become unstoppable until the end of your next turn" (p.144), la
  card non mostrava né il bottone "Gain Unstoppable" per sé né la riga di promemoria → Unstoppable è già tra gli status
  che si possono guadagnare e la mastery viene letta, ma la frase dopo la virgola comincia con "also become": la
  lettura del testo riconosceva un ordine rivolto a chi usa l'abilità solo se iniziava con "gain / become…",
  eventualmente preceduto da "then", "and" o "you may", e non con "also", quindi non sapeva a chi dare lo status e lo
  scartava → ora "also" è accettato davanti al verbo (anche "then also", "you may also gain…"), e la mastery dà il
  bottone "Gain Unstoppable" su di sé con la durata "until the end of your next turn". La stessa causa colpiva il
  Talent II di Circle the Oak (Warden, Vagabond: "…also gain evasion until the end of your next turn", p.169), che ora
  dà il bottone "Gain Evasion". Controllate tutte le abilità di jobs, bond powers e relic: nessun'altra cambia. Solo
  codice: nessun cambio al compendio né alle schede, vale anche per le copie già sulle schede.

## 15 ottobre 2026 — Polaris può marcare un personaggio col Talent I (versione 1.15.19)

### Round di debug del 15 ottobre, punto R17

- **Polaris non dava il bottone Mark con il Talent I**: con il Talent I di Polaris (Seer, Mendicant) sbloccato,
  "You can cause one of your Polaris to follow a character as a mark instead of a space" (p.202), la scheda non
  mostrava il bottone Mark, quindi non si poteva marcare il personaggio da seguire → il bottone Mark compare solo
  se l'abilità ha il tag `mark`; Polaris ha "range-5, terrain-effect, gamble" e il Talent I non aveva una lista di
  tag sua, quindi il tag non arrivava mai → ora, quando il talento o la mastery sbloccati dicono che l'abilità
  diventa un mark ("as a mark", "making it a mark"), l'abilità riceve il tag Mark (chip evidenziata con il testo del
  talento nel tooltip) e il bottone Mark. Il tag resta anche con la mastery Moon Silver Princess sbloccata (che
  cambia i tag in free action). La stessa regola vale per la mastery Amico di Party Favor (Fool), "making it a mark",
  che aveva lo stesso difetto. Solo codice: nessun cambio al compendio né alle schede, vale anche per le copie già
  sulle schede.

## 15 ottobre 2026 — I talenti compaiono nella card dell'attacco (versione 1.15.18)

### Round di debug del 15 ottobre, punto R16

- **I talenti di God Hand non arrivavano nella card dell'attacco**: con il Talent I o II di God Hand (Sealer,
  Mendicant) sbloccato, tirando l'attacco di God Hand o della combo Devil Hand la card non mostrava né l'Exceed del
  Talent I ("Gain evasion until the end of your next turn") né lo Slay e i teleport a 2 del Talent II, anche se il
  libro dice "All versions of this ability gain…" (p.192) → la card dell'attacco era costruita solo con Hit, Miss,
  Exceed e Crit dell'abilità (o della combo): i talenti finivano nella card dello Show in Chat ma mai in quella del
  tiro, per nessuna abilità → ora il talento sbloccato entra nella card dell'attacco, sia della versione base sia
  della combo: se aggiunge un Hit / Miss / Exceed / Crit la riga va in quel riquadro con l'etichetta "Talent I:"
  (quindi l'Exceed del talento appare solo con 15+), il resto ("Increase teleports to 2", "Slay: …") ha un riquadro
  suo ("Talent II", "Slay (Talent II)"). Il comportamento delle combo complete (R1) non cambia. La combo alternativa
  della mastery, Fists of Heaven and Hell, non è ancora usabile dal sistema (punto R28): quando lo sarà, dovrà
  ricevere i talenti allo stesso modo. Solo codice: nessun cambio al compendio né alle schede.

## 15 ottobre 2026 — Il tiro del danno spunta Divine e Pierce dal testo (versione 1.15.17)

### Round di debug del 15 ottobre, punto R15

- **Gentleness non selezionava Divine**: aprendo il tiro del danno di Gentleness (Chanter, Mendicant) la casella
  Divine restava vuota, anche se il testo dice "take 1 divine damage" (p.179) → la lettura automatica del testo
  prendeva solo la quantità di danno (1) e ignorava il tipo; nel dialog Divine e Pierce non si spuntavano mai da
  soli per nessuna abilità → ora la lettura del danno ricorda anche il tipo scritto accanto alla quantità ("1 divine
  damage", "[D]+fray divine damage", "2 piercing damage"; non il danno "to you" come in Provoke) e il dialog spunta
  Divine o Pierce in base al risultato scelto (Hit / Miss / Area / versione combo); si può sempre togliere a mano.
  Vale per PG, foe e legend. Solo codice: nessun cambio al compendio né alle schede.

## 15 ottobre 2026 — Provoke propone il danno giusto (versione 1.15.16)

### Round di debug del 15 ottobre, punto R14

- **Provoke proponeva 1 danno invece di 2**: usando Provoke (Knave, Stalwart) il bottone del danno proponeva 1 danno
  → il testo dice "each adjacent foe deals 1 piercing damage to you […] You then deal 2 damage, once, for each foe
  that damaged you this way" (p.142): 1 è il danno che il PG subisce, 2 quello che infligge; la lettura automatica
  del danno prendeva il primo "N damage" del testo, cioè quello subito → ora un danno seguito da "to you" / "to
  yourself" viene saltato e la card propone 2. Solo codice: nessun cambio al compendio né alle schede, vale anche
  per le copie già sulle schede.

## 15 ottobre 2026 — Superbolide della Tower fedele al libro (versione 1.15.15)

### Round di debug del 15 ottobre, punto R13

- **La mastery della Tower raddoppiava il danno sbagliato**: la mastery Superbolide di The Tower (Seer, Mendicant)
  diceva che il personaggio scelto, a 25% hp o meno, "take double damage from the meteor effect", cioè dal meteorite
  della Tower stessa → il libro (p.203) dice "take double damage from Eclipse's meteor effect": strano, ma è scritto
  così; nel compendio dei job la parola "Eclipse's" era stata tolta → il compendio ora riporta la frase alla lettera
  del libro. Il sistema non automatizza il raddoppio (è solo testo), quindi non cambia nient'altro. Migrazione 24: le
  copie di The Tower già sulle schede e nella sidebar che hanno ancora il testo vecchio parola per parola vengono
  aggiornate; quelle modificate a mano no.

## 15 ottobre 2026 — Eclipse e Raging Wolf con gli elenchi a righe (versione 1.15.14)

### Round di debug del 15 ottobre, punto R12

- **Eclipse e Raging Wolf difficili da leggere**: in Eclipse (Seer, Mendicant) i due esiti della stella ("If there
  is, that character takes 2 divine damage…", "If there isn't, it explodes…") e la chiusura "Then, end the effect."
  uscivano attaccati in un unico paragrafo; in Raging Wolf (Colossus, Stalwart) il Comeback metteva le tre soglie di
  hp ("Bloodied:", "25% or lower:", "1 hp or lower:") in fila nella stessa frase, sulla scheda, nella card in chat e
  nella scheda dell'abilità → il libro stampa i due esiti di Eclipse come elenco puntato con "Then, end the effect."
  di nuovo a capo (p.203) e le tre soglie di Raging Wolf rientrate, una per riga (p.137); nel compendio dei job
  l'elenco era andato perso e il testo era su una riga sola → nel compendio ogni voce ora sta su una riga che inizia
  con "•" (come già in Lycanthropy e Split Heaven and Hell), e la resa mostra queste righe una sotto l'altra, con il
  pallino in oro e il nome della soglia in grassetto ("Bloodied:"); il testo dopo l'elenco torna normale. La resa
  vale anche per gli elenchi a capo già presenti (Lycanthropy, Split Heaven and Hell); i "•" scritti in linea nei
  testi dei foe restano come sono. Migrazione 23: le copie di Eclipse e Raging Wolf già sulle schede e nella
  sidebar che hanno ancora il testo vecchio parola per parola vengono aggiornate; quelle modificate a mano no.
  L'ordine dei blocchi di Raging Wolf (Special, Comeback, Heroic, Special) era già quello del libro.

## 15 ottobre 2026 — Tabelle 1-6 una riga per risultato (versione 1.15.13)

### Round di debug del 15 ottobre, punto R11

- **Tabelle poco leggibili**: in Monogatari (Chanter, Mendicant) e nell'Area Effect di Chaos Tarot (Seer,
  Mendicant) la tabella del gamble usciva come un unico blocco di testo ("…once per song. 1. A Tale of Fury: … 2. A
  Tale of Travels: … 3. …"), sulla scheda, nella card in chat e nella scheda dell'abilità → il libro stampa i sei
  risultati uno per riga (Monogatari p.179, Chaos Tarot p.201), mentre nel compendio il testo è su una riga sola e
  il sistema lo mostrava così com'era → la resa ora riconosce una tabella numerata (risultati 1, 2, 3… in ordine,
  almeno tre) nel testo semplice e la mostra una riga per risultato, con il numero in oro e il nome del risultato in
  grassetto ("A Tale of Fury:", "Lantern:"). Vale per tutte le tabelle del genere, anche per le azioni dei foe
  (Strange Brew dei Troll, Rummage di Collector e Shopkeep, Bend Fate del Diviner, Chaos beam del Pariah,
  Aetherstorm del Quintessent, Fae Thief e Sober Up delle Aesi). Correzione solo nella resa (`formatRollTables` in
  `module/helpers/enrich.mjs` + stile in `css/icon.css`): nessun dato cambiato, vale subito anche per le abilità
  già sulle schede, senza migrazione. I testi scritti a mano in HTML restano come sono.

## 15 ottobre 2026 — Sleight of Hand e Chaos Tarot senza le regole del Wild Card ripetute (versione 1.15.12)

### Round di debug del 15 ottobre, punto R10

- **Wild Card ripetuto per intero**: nell'anteprima di Sleight of Hand e Chaos Tarot (Seer, Mendicant), nella card in
  chat e nella scheda dell'abilità, dopo "summon a wild card" compariva tutto il blocco del Wild Card ("Wild Card —
  Size 1, intangible. Summon Effect: The card emits a small blast…" con le due note sulle catene e sugli effetti
  persistenti; in Chaos Tarot anche la regola del range 2) → il libro stampa il Wild Card una volta sola, nella
  sezione Summons del Seer (p.200), e le abilità dicono solo "Summon a wild card in range 2 of your foe" /
  "Summon: Then, summon a wild card in the area" (p.201); il compendio dei job aveva copiato quel blocco in fondo
  alla descrizione di entrambe → nel compendio dei job la descrizione finisce con la riga del summon, come nel libro.
  Le regole del Wild Card restano sull'attore Wild Card del compendio Summons, che il pannello dell'abilità già
  propone. Le copie già sulle schede (e tra gli oggetti del mondo) vengono corrette dalla migrazione 22, solo se hanno
  ancora il testo vecchio parola per parola.

## 15 ottobre 2026 — Fairy Ring: il trigger di Spirit Away al suo posto (versione 1.15.11)

### Round di debug del 15 ottobre, punto R9

- **Fairy Ring: "Trigger" in cima e "Spirit Away —" appeso**: nell'anteprima di Fairy Ring (Harvester, Mendicant),
  nella card in chat e nella scheda dell'abilità compariva in cima "Trigger: A foe enters or exits the area." come se
  fosse il trigger dell'abilità, e il nome "Spirit Away —" restava in fondo al blocco Terrain Effect → due cause:
  (1) nel compendio il trigger dell'interrupt concesso dall'anello era copiato anche nel campo "Interrupt Trigger"
  dell'abilità, che però costa 1 azione e non è un interrupt (p.187); (2) il sistema riconosce il blocco a partire
  dall'etichetta "Interrupt 2:", e il nome scritto prima ("Spirit Away —") finiva nel blocco precedente → nel
  compendio dei job il campo è vuoto (il trigger resta, giusto, dentro l'interrupt), e il nome dell'interrupt ora va
  nell'intestazione del suo blocco: "Spirit Away — Interrupt 2", con il tooltip della regola Interrupt. La stessa
  correzione sistema Gran Reversa ("Reverse Fate — Interrupt 1") e Drifting Leaf ("LEAF ON THE WIND — Interrupt 2"),
  che avevano lo stesso nome appeso. Le copie di Fairy Ring già sulle schede (e tra gli oggetti del mondo) vengono
  corrette dalla migrazione 21, solo se hanno ancora quel trigger parola per parola. Il testo resta quello del manuale
  (p.187: "While the ring is active, gain the following interrupt. The ring lasts until this ability is used
  again."): il documento di Maar ha le due frasi in ordine inverso, ma il libro le scrive così.

## 15 ottobre 2026 — Massive Overhead: la prima riga di regole fuori dal testo di colore (versione 1.15.10)

### Round di debug del 15 ottobre, punto R8

- **Massive Overhead: regole in corsivo**: nell'anteprima di Massive Overhead (Colossus, Stalwart), nella card in chat
  e nella scheda dell'abilità "End your turn. Your next attack strikes with such force that it deals bonus damage and
  creates a pit under its target after it resolves." compariva come frase di colore in corsivo, e solo "Special" come
  blocco di regole → nel libro (p.136) l'abilità non ha testo di colore e comincia direttamente con le regole; nel
  compendio quella riga era senza etichetta, e il sistema tratta come testo di colore tutto ciò che viene prima della
  prima etichetta ("Effect:", "Special Effect:", …) → nel compendio dei job la riga ora comincia con "Effect:" e il
  secondo blocco si chiama "Special Effect" come nel libro. Le copie già sulle schede dei PG (e tra gli oggetti del
  mondo) vengono corrette da una migrazione all'apertura del mondo, solo se hanno ancora il testo vecchio parola per
  parola: una copia modificata a mano resta com'è.

## 15 ottobre 2026 — Raging Wolf e altre abilità senza summon di un altro job (versione 1.15.9)

### Round di debug del 15 ottobre, punto R7

- **Raging Wolf offriva il Beast del Warden**: nell'anteprima di Raging Wolf (Colossus, Stalwart) compariva il summon
  "Beast" da trascinare sulla mappa → il sistema collega i summon cercandone il nome nel testo dell'abilità, e la
  mastery si chiama "Beast Within"; il controllo che doveva scartare i summon di un altro job non scartava mai niente
  (era sempre vero per costruzione) → ora un'abilità di un job offre solo i summon del proprio job. Nei compendi
  nessuna abilità evoca davvero il summon di un altro job, mentre lo stesso errore toccava anche Blackstar (Enochian,
  "Great Spirit Bomb" → Bomb del Fool) e Mist Strider (Warden, "whose form is shadow" → Shadow dello Shade). Le
  abilità senza job (create a mano) continuano a cercare tra tutti i summon. Nessun dato del pack modificato.

## 15 ottobre 2026 — Il testo di colore delle abilità senza tooltip delle keyword (versione 1.15.8)

### Round di debug del 15 ottobre, punto R6

- **Parole narrative scambiate per regole**: nella frase in corsivo all'inizio delle abilità alcune parole erano
  evidenziate con il tooltip di una regola — Battering Ram "send your target *flying*" (Flying), Six Hells Trigram
  "summon" (come il tipo di personaggio Summon), Revenge "your hands, feet, and *armor*" (Armor X) → il testo di colore
  passava dallo stesso arricchimento dei blocchi di regole, che cerca le keyword in tutto il testo senza distinguere
  la prosa dalle regole → il testo di colore ora viene mostrato senza tooltip delle keyword: nell'anteprima delle
  abilità sulla scheda del PG, nella card "Show in Chat" e nella scheda dell'abilità (dove solo la parte dopo il
  testo di colore, da "Effect:" in poi, ha i tooltip). I blocchi di regole (Effect, Talenti, Mastery, ecc.) non
  cambiano.

## 15 ottobre 2026 — Tooltip su Sacrifice, sui Blast e sul costo degli interrupt (versione 1.15.7)

### Round di debug del 15 ottobre, punto R5

- **Tag grigi senza spiegazione**: Dropkick mostrava "Sacrifice" grigio e senza tooltip, Comet "Medium Blast" grigio
  (lo stesso per Small/Large Blast e "Terrain Effect") → il grigio è il colore dei tag che il sistema non riconosce: le
  spiegazioni dei Blast esistevano solo con i nomi corti ("blast-m"), mentre i compendi scrivono i nomi come nel libro
  ("medium-blast"), e Sacrifice e Terrain Effect non avevano proprio una spiegazione → aggiunte le spiegazioni con i
  nomi usati dai compendi: Sacrifice X (p.103: si paga all'inizio, non si riduce, non porta sotto 1 HP), Small /
  Medium / Large Blast (p.98), Terrain Effect (p.95-96). Valgono anche per i tag dei foe con gli stessi nomi.
- **Catapult: "Interrupt 1" senza tooltip e "Interrupt 3" in più con la mastery**: il costo in cima alla card e
  all'anteprima era una scritta senza spiegazione; con la mastery spuntata ("Catapult becomes Interrupt 3", p.123) il
  costo restava "Interrupt 1" e compariva a parte un tag "Interrupt 3" → la mastery salva il nuovo numero come tag, e
  nessuno lo riportava sul costo → per le abilità interrupt il numero di usi va ora sul badge del costo (con il
  tooltip della regola; se viene da talento/mastery il badge è evidenziato e il tooltip dice da dove arriva) e non
  compare più come tag doppio. Vale anche per gli altri interrupt che avevano "Interrupt 1" ripetuto tra i tag.

## 15 ottobre 2026 — Talento e mastery chiesti per ogni abilità trascinata (versione 1.15.6)

### Round di debug del 15 ottobre, punto R4

- **Abilità aggiunte senza scegliere talento/mastery**: trascinando molte abilità dal compendio sulla scheda del PG,
  per alcune la finestra "Equip" (talento I/II, mastery) non compariva e l'abilità arrivava senza talento e senza
  mastery → la finestra partiva solo se l'abilità veniva lasciata esattamente sopra uno dei sei riquadri delle
  abilità; lasciata un po' più in là (nello spazio tra i riquadri, sul titolo, altrove nella scheda), cosa facile
  quando se ne aggiungono tante di fila, passava dalla via generica che la aggiungeva in silenzio, e finiva lo stesso
  nel primo riquadro libero (i riquadri mostrano le prime sei abilità, ovunque le si lasci) → ora la finestra compare
  per ogni abilità, dovunque la si lasci sulla scheda; "chiudi" annulla l'aggiunta. Se si lascia un altro oggetto
  mentre il precedente è ancora in corso (finestra aperta), una notifica dice di finire prima e riprovare, invece di
  ignorarlo senza dire niente.

## 15 ottobre 2026 — Avviso in chat quando un'aura scade (versione 1.15.5)

### Round di debug del 15 ottobre, punto R3

- **Aura scaduta senza avviso**: un'aura con una durata scritta (Rook "until the end of your next turn", Nightmare e
  High Prophecy "until the start of your next turn", Dawn, Sweet Torment, Paradiso, e le azioni dei foe come Hold the
  Line!, Fortress, Arkentech repulser shield) restava sulla mappa dopo la scadenza, senza nessun messaggio, e per
  toglierla bisognava andare sul livello dei template e cancellarla a mano → le aure non venivano mai tolte a fine
  turno (giusto, perché molte durano: stance, "while marked") e il sistema non leggeva la durata dal testo → ora,
  quando l'aura viene piazzata, il sistema cerca nel testo dell'abilità la frase che dà l'aura e il suo "until …"
  (stessa lettura degli status a tempo) e conta i turni; quando scade compare in chat "<nome>'s Aura N (abilità)
  ends — until …" con il bottone **Remove area**. L'aura non sparisce da sola: se la durata è stata allungata (Bleak
  Mercy Mastery, p.144: "lasts indefinitely") basta ignorare il messaggio. Le aure senza durata scritta (stance,
  oggetti, "while marked") restano come prima.

## 15 ottobre 2026 — Il vigor può superare il massimo (versione 1.15.4)

### Round di debug del 15 ottobre, punto R2

- **Vigor oltre il massimo**: scrivendo sulla scheda (PG, foe, legend) un vigor più alto del massimo (VIT), il valore
  tornava al massimo e i danni lo trattavano come tale → il sistema tagliava il vigor al massimo ogni volta che
  ricalcolava la scheda, e il campo aveva il massimo come limite; ma la Mastery di Gran Reversa (Misericordia, p.202)
  dice che il vigor che concede "can increase a character's total vigor over their maximum", senza un tetto (come
  il Mead e il Holy Blood, che danno 15 e 20 vigor "over the maximum") → ora il valore scritto a mano resta e assorbe
  i danni per intero; il limite normale vale solo quando il sistema dà vigor da solo (Recover, Regeneration), e
  queste fonti non abbassano più un vigor già sopra il massimo. Sulla scheda del PG le tacche in più compaiono in
  viola.

## 15 ottobre 2026 — Le combo non ereditano più la versione base (versione 1.15.3)

### Round di debug del 15 ottobre, punto R1

- **Combo con nome proprio (Charism, Dawn, Fleet, Purgatorio, Fortuna, Reap, Hades…)**: con il combo token la chat
  stampava la combo più il resto della base (Charge di Chastise / Dervish / Felicity / Pandaemonium / Holy, seal e
  Mark di Sow, effetti di Astra) e offriva i bottoni degli status della base → il sistema fondeva sempre la combo
  sulla base, tenendo i blocchi che la combo non riscrive; ma il manuale (p.173: "you use the combo version
  instead") stampa queste combo come abilità complete, sotto un nome in maiuscolo → ora una combo così sostituisce
  tutta la base: card della chat, card dell'attacco, bottoni degli status, danno e tag (Reap perde il Mark, Regenerate
  di Rot lo tiene perché ha il suo).
- **Bleak Mercy (Sweet Torment) e Revenge (Indignation)**: "replace the base effect with: …" finiva in cima come
  aggiunta e l'Effect della base restava → ora prende il posto dell'Effect della base; Hit, Miss e Heroic restano.
- **Low Blow sulla scheda**: con il token attivo il testo della base era barrato come se la combo lo sostituisse,
  mentre The Hook aggiunge soltanto → ora si barra solo per le combo complete.
- **Fortuna (Astra)**: la riga "Auto hit: [D]+fray" non era riconosciuta (finiva nella frase iniziale e la card
  dell'attacco restava senza Hit) → l'etichetta "Auto hit" con lo spazio ora è letta.

## 13 ottobre 2026 — Correzioni del playtest della 1.15.1 (versione 1.15.2)

### Playtest locale (Foundry locale, mondo "test", attori di prova poi cancellati)

- **Trofei impossibili da mettere sulla scheda**: trascinare un trofeo dal compendio, o premere "+ Custom trophy", non
  faceva niente (errore di validazione in console) → il campo "ability / trait" del trofeo è vuoto per tutti i trofei
  del manuale e il campo non accettava il valore vuoto → ora lo accetta. Era così dalla 1.18.0 interna.
- **Il limit break non aveva i bottoni degli status**: la card di Use Limit Break era solo testo, quindi Mock non
  offriva Slashed+ / Weakened+ / Hatred+ né la loro durata → ora la card ha i blocchi Inflict / Gain come le abilità.
- **"Until the end of your next turn" finiva un turno prima**: con un vecchio combat vuoto attivo nel mondo, la
  Hatred+ di Spite presa nel proprio turno durava fino alla fine di quel turno → il sistema guardava solo il primo
  combat attivo della scena per sapere di chi è il turno → ora guarda tutti i combat iniziati.
- **Combo dei foe e turni degli elite**: il secondo turno di un elite nello stesso round veniva preso per lo stesso
  turno del primo (nessun avviso per la parte fuori ordine, avviso sbagliato "different turns" fra due turni veri) →
  ora conta anche le attivazioni rimaste.
- **Finestra "Hatred of…"**: diceva sempre "ends at the end of their turn" anche per Spite e Dark Knight → ora mostra
  la durata dell'abilità ("until the end of your next turn", "ongoing").
- **Guida rapida**: aperta direttamente su una tab (es. FAQ), svuotare la ricerca riportava alla tab dell'apertura
  precedente → torna a quella aperta.

## 13 ottobre 2026 — Release 1.15.1

Prima release pubblicata dopo la 1.14.1. Contiene tutto quello che è descritto qui sotto, dalla voce "Feedback di
Maar, Sessione A" (9 ottobre) fino a "FAQ della guida divisa in Combat e Narrative": i numeri 1.15.0–1.20.2 delle
voci sono quelli delle build interne, mai pubblicate. Su GitHub si passa direttamente dalla 1.14.1 alla 1.15.1.

## 13 ottobre 2026 — FAQ della guida divisa in Combat e Narrative, quattro domande nuove (versione 1.20.2)

### Richiesta di Maar (FAQ Changes/Editions)

- **FAQ in un solo elenco**: le domande di combattimento e quelle narrative erano mescolate → la tab FAQ ora ha le
  sezioni Combat, Narrative e Character sheet, e la ricerca le attraversa tutte.
- **Domande nuove**, con le risposte scritte da Maar, parola per parola (scelta di Edoardo): "Am I my own Ally?" e
  "If I gamble with multiple die…" in Combat, "aid / set up" e "How does Second Wind work?" in Narrative.

## 13 ottobre 2026 — Niente più emoji nell'interfaccia (versione 1.20.1)

### Richiesta di Edoardo

- **Emoji nel sistema**: bottoni, card in chat, schede, guida e tour usavano emoji (🎯 🎲 💬 📐 💥 🔒 ⚡ ⚔ …), che
  si vedono diverse su ogni computer e non stanno con lo stile del sistema → sostituite dalle icone di Font Awesome
  che Foundry usa già ovunque (mirino per il Mark, dado per i tiri, fumetto per la chat, quadrato per le aree,
  lucchetto, fulmine per le combo…). Dove il testo non può contenere un'icona (etichette dei bottoni delle finestre,
  avvisi, voci dei menu a tendina) l'emoji è solo tolta; i bottoni Roll / Roll Attack / Roll Damage / Roll Save delle
  finestre hanno l'icona di Foundry accanto. Ripulito anche il compendio delle macro. Restano i simboli tipografici
  (frecce, ✕, ✓, ★, ●), che non sono emoji.

## 13 ottobre 2026 — Voci rimaste e resto del documento di Maar (versione 1.20.0, Sessioni E e F)

### Voci emerse lavorando (Sessione E)

- **Hatred+ con una durata**: Mock dava Slashed+, Weakened+ e Hatred+ "until the end of their next turn", Spite la
  Hatred+ "until the end of your next turn", ma restavano finché qualcuno non le toglieva a mano → la durata scritta
  nella frase dopo ("These effects continue…") non arrivava ai bottoni, e nessuno contava i turni → ora i bottoni
  portano la durata (⏳) e lo status, applicato, conta da solo i turni di chi lo subisce (o di chi usa l'abilità, se
  il testo dice "your") e sparisce al momento giusto, con una riga in chat. Su elite e legend Mock dura un turno in più
  (p.141). Vale per ogni status con "until the end / start of … turn", anche i Gain ("gain evasion until the start of
  your next turn").
- **Hatred+ guadagnata su se stessi**: Spite e la stance Dark Knight ("gain hatred+ of the closest foe") non avevano
  un bottone → il parser leggeva "foe" come aggettivo e scartava la frase, e le frasi delle stance erano saltate in
  blocco → ora c'è il bottone Gain; la finestra "Hatred of…" mette per primo il foe più vicino. Il tratto Spite, da
  💬, mostra i suoi Gain (solo quelli: gli altri status dei tratti dei PG sono condizioni).
- **Attacco ad area senza 📐**: premendo ⚔ senza aver piazzato l'area, si piazzava sempre quella dei tag → ora si apre
  la stessa scelta del 📐 (base, talento, combo, charge).
- **Domain su Sleight of Hand**: il promemoria scattava per la regola delle wild card ("…such as creating terrain
  effects", che è un esempio di cosa NON fanno) → frase esclusa. Chaos Tarot lo tiene: col 3 crea terreno difficile
  (p.250: "when you create a terrain effect").
- **Most relevant rules di Vagabond, Mendicant, Wright**: le liste erano vuote → copiate dalle pagine del manuale
  (p.146, p.173, p.205), senza ripetere i tratti di classe che hanno già la loro card.
- **Godly Smite**: il dado mantra si metteva e si spostava a mano → ora parte da 1 a inizio combat e sale di 1 a ogni
  round fino a 6 (p.191).
- **Outsider**: a fine interlude può prendere un oggetto dai kit degli altri bond del party (p.76) → bottone
  "+ From the party's kits" nel Loose Gear.
- **Summon**: tutti con l'omino grigio → ogni summon e oggetto ha un'icona di Foundry adatta (fuoco, zampa, ingranaggio…),
  anche quelli trascinati dal compendio Summons. Nuova macro "ICON: Copy Foe Summons" per i foe importati prima della
  1.8.0. Un giocatore che possiede il foe (co-GM) può trascinarne i summon: li piazza il GM.
- **Template**: la scheda Legend non accettava i template → ora accetta quelli di fazione e speciali (Titan Armament sui
  Jotunn), con i chip e la ✕ come sui foe; i job no. Nel compendio Foe Templates ci sono anche i 115 Unique, in
  "<Fazione> / Uniques" e "Uniques / Elites".

### Risposte di Edoardo alle domande per Maar

- **Trofei**: "Used this combat" e "In effect this combat" si spengono da soli a End Encounter ("this expedition" resta).
- **Gear kit, usi contati**: ogni oggetto del kit ha i suoi usi: "5 fire stones" ne ha 5, "Three free meals" 3, gli
  altri 1; Shift+clic dà una quantità a mano a qualunque oggetto. Clic = un uso, "−" lo ridà, a zero l'oggetto è
  barrato; New expedition li ricarica tutti.
- **Icone dei foe**: un'icona per fazione su tutti i 362 foe del compendio (e sui job template), con il token colorato
  della fazione in toni spenti. I foe già importati nei mondi non cambiano: si reimportano.

### Documento di Maar (Sessione F)

- **Bless del Mendicant**: niente modo di dare la blessing a un altro PG → bottone "🙏 Bless…" sul tratto: si sceglie
  il personaggio e riceve una carica Blessed (via GM se è di un altro giocatore). Nessuna automazione su da dove
  vengono le blessing, come chiesto.
- **Combo dei foe "1 poi 2"**: niente teneva il conto della sequenza → la parte che tocca è marcata "next", le altre
  sbiadite; usarne una (attacco, danno o 💬) fa avanzare la sequenza, che ricomincia dopo l'ultima parte (p.290).
  Fuori ordine o due parti nello stesso turno: solo un avviso. Clic sul chip "Combo N" per correggere; si azzera a
  fine combat.
- **Aree della guida sulla mappa**: nella tab Areas, ogni clip ha "📐 Try it on the map", che piazza quell'area dal
  token selezionato.
- **Rimozione dell'area**: la riga dell'area sulla card era piccola e il bottone restava dopo aver tolto l'area → testo
  più grande, bottone "🗑 Remove area", e quando l'area sparisce (bottone, Canc, inizio turno) la card dice "area
  removed".
- **Larghezza della Line**: le abilità Enochian che allargano la linea non avevano modo di farlo → durante il
  piazzamento di una Line, + e − cambiano la larghezza (1–5).

## 12 ottobre 2026 — Gear kit sulla scheda (versione 1.19.0, Sessione D)

### Richiesta di Maar

- **Il kit era solo un campo di testo**: trascinare un kit scriveva il nome in un campo e l'elenco degli oggetti nelle
  Notes → ora i kit sono **oggetti veri sulla scheda**, nella sezione Gear del tab narrativo, con i loro oggetti.
  Regole dal manuale:
  - il **kit base** è sempre con te (p.35): l'Adventurer's Kit, la versione Weathered dell'Elder (p.74), l'Outsider's
    Kit per l'Outsider (p.76); l'Highborn non ne ha (p.66);
  - dei kit del bond se ne **porta uno per expedition** (p.35), due per l'Highborn (p.66): si spunta quello che si
    porta, gli altri restano sulla scheda con l'elenco in breve;
  - gli oggetti del kit portato sono bottoni: un clic li segna **usati o persi** (barrati), e il bottone
    **↻ New expedition** li fa tornare tutti, perché a ogni expedition ci si rifornisce (p.35);
  - **+ Custom kit**: si scelgono 3 oggetti qualsiasi dai kit del bond (5 per l'Highborn) e diventano un kit a sé
    (p.35, p.66).
- **Kit scelti con il bond**: trascinando un bond sulla scheda arrivano da soli il kit base e tutti i kit del bond
  (cambiando bond, quelli vecchi se ne vanno; il custom resta). Nel wizard di creazione, al passo del Bond Power, si
  sceglie anche il kit da portare alla prima expedition. Per i personaggi già fatti c'è il bottone "+ <bond> kits".
  Il vecchio campo di testo, se aveva un valore, resta visibile come nota finché non lo si toglie.
- **Loose gear**: prima si fermava a 2 oggetti. Il manuale dice che se ne tengono quanti si vuole, ma se ne portano 2
  per expedition (p.36), 4 l'Outsider (p.76), +1 con il potere Resourceful (p.77) → ora la lista non ha limite e
  ogni oggetto ha la spunta "lo porto"; il titolo mostra "taken N/limite" (rosso se si supera). I loose gear già
  scritti diventano oggetti "portati" da soli.

## 12 ottobre 2026 — Trofei: compendio e scheda (versione 1.18.0, Sessione C)

### Richiesta di Maar

- **Compendio Trophies**: i trofei non esistevano nel sistema → nuovo tipo di oggetto "Trophy" e nuovo compendio con
  i 144 trofei del manuale, copiati dalle pagine del PDF (il testo estratto mescola le colonne delle tabelle):
  - i 20 **General Dungeon Trophies** della tabella d20 (pp.243-244), con il numero del d20;
  - le tabelle dei trofei delle 8 fazioni (Relict, Ruin Beast, Scavenger, Imperial, Demon, Lowlander, Jotunn, Hob);
  - i trofei di ogni legend, con il nome della legend;
  - i 2 trofei dell'avventura d'esempio "The Tower" (Helm of Mist, Dread Mace).

  Una cartella per fazione. Ogni trofeo ha la pagina, il testo "Uses" com'è stampato e il contatore pronto (3 usi,
  1 expedition, 3 combats; Scav Badge è "Unlimited"). Il manuale dice che un trofeo dà "un tratto o un'abilità"
  (p.242) ma non dice quale per ciascuno: il campo resta vuoto, si può impostare a mano.
- **Trofei sulla scheda del PG**: il tab "Relics" diventa "Relics & Trophies", con una sezione Trofei sotto le
  reliquie. Niente automazione, come chiesto: si trascina un trofeo dal compendio, oppure "+ Custom trophy" ne crea
  uno vuoto da compilare. Per ogni trofeo:
  - gli usi rimasti come quadratini, con − / + e il bottone **Use**: toglie un uso e manda la card in chat; a 0 il
    trofeo "si sbriciola" (p.242) e resta sbiadito finché non lo si toglie;
  - per quelli che durano un combat o un'expedition, la spunta **"In effect this combat / expedition"** (Use la
    accende da sola);
  - per quelli "1/battle" (Circlet of Command), la spunta **"Used this combat"**, e Use non riparte finché non la si
    toglie;
  - il contatore "N/3" nel titolo: un PG tiene tre trofei alla volta (p.242). Il quarto si può aggiungere, con un
    avviso.

## 12 ottobre 2026 — Un solo tiro salvezza quando fallire e riuscire danno status diversi (versione 1.17.10)

### Bug di Maar

- **Terrorize chiedeva due tiri salvezza (Blind+ e Blind) e superare il primo non dava Blind**: il testo ("must save
  or become blinded+ … On a successful save, they are only blinded") veniva letto come due status separati, ognuno
  con il suo bottone e il suo tiro. Il bottone Blind+ con il tiro riuscito non applicava niente, e Blind chiedeva un
  secondo tiro → ora i due esiti dello stesso tiro diventano un solo bottone ("🎲 Blind+ / Blind"): un tiro, e il
  risultato decide cosa applicare (fallito → Blind+, riuscito → Blind). Vale per tutte le abilità scritte così:
  Terrorize (Ghul, Wailer, Twinsoul, Stutterghast, Arc Ghul), Sticky Solution, Izuna Drop, Berserkgang, Enthrall e
  Hurl Self. Restano separate le abilità in cui il tiro riuscito lascia una scelta (Finish Off: "either slashed or
  weakened").

## 12 ottobre 2026 — Vigilance nelle regole dello Stalwart (versione 1.17.9)

### Bug di Maar

- **Le regole dello Stalwart non spiegavano Vigilance**: il riquadro "Relevant Rules" della scheda elencava Rush,
  Shove, Aura e altre parole chiave, ma non Vigilance, Rampart, Sturdy e True Strike, che il manuale mette tra le
  regole più importanti dello Stalwart (p.117) → aggiunte. Vigilance ha il testo di p.117 (cariche d6 fino a 6,
  si tira 1d6 per carica e si tiene il più alto: riduce il danno a un alleato in range 2 come armor, oppure
  danneggia un foe che rompe l'adiacenza) con le precisazioni di p.109 (è un effetto, non serve un interrupt e
  scatta anche se il foe viene spostato da altri).

## 12 ottobre 2026 — Spiegato perché dopo le slow turn apre un NPC (versione 1.17.8)

### Domanda di Maar

- **Dopo un round chiuso da slow turn il tracker indica che tocca agli NPC**: è la regola, non un bug. Il round
  successivo apre il lato opposto a quello che ha chiuso il round prima (p.87: "if the round ends with a player
  character turn, it will start with an npc turn"). Le slow turn sono quasi sempre dei PG e vengono per ultime,
  quindi il round dopo apre quasi sempre un NPC. L'indicazione resta un consiglio: qualunque pallino si può
  cliccare → aggiunta una spiegazione al passaggio del mouse sull'indicatore "PC/NPC PICKS NEXT" del tracker, con
  la pagina.

## 12 ottobre 2026 — Si scrive di nuovo nei campi delle finestre staccate con PopOut! (versione 1.17.7)

### Bug di Maar

- **Nelle finestre staccate con PopOut! non si riuscivano a cambiare i numeri**: PopOut! gira ogni tasto premuto
  nella finestra staccata alle scorciatoie di Foundry. Foundry però controlla se stai scrivendo guardando solo la
  finestra principale: non vede il campo attivo nella finestra staccata e fa partire le scorciatoie. I tasti 1–0
  lanciano le macro della barra e il numero non viene scritto; anche le frecce e le lettere delle scorciatoie
  (W A S D…) vengono mangiate → nelle finestre staccate i tasti premuti dentro un campo di testo o numerico restano
  alla finestra e non arrivano più alle scorciatoie, come succede nella finestra principale. Esc passa ancora.
  Vale per tutte le finestre del nuovo tipo (schede, dialoghi), anche quelle di Foundry.

## 12 ottobre 2026 — Controlli delle risorse solo sul tratto giusto (versione 1.17.6)

### Bug di Maar

- **Tutti i tratti di classe del Vagabond avevano il bottone del combo token**: il controllo rapido della risorsa di
  classe veniva messo su ogni tratto di classe, non solo su quello che la usa (lo stesso succedeva alle altre classi:
  Vigilance su Armor 2 e Rush, Blessing su Diaga e Succor, Aether su Slip e Aetherwall) → ora compare solo sul tratto
  che nomina la risorsa: Fortify (Vigilance), Bless (Blessing), Chain Reaction (Aether e power dice). Il Vagabond non
  ne ha più su nessun tratto: nessuno parla di combo, e l'interruttore COMBO resta sopra le abilità.

## 12 ottobre 2026 — Domain solo per le abilità che creano terreno o oggetti (versione 1.17.5)

### Bug di Maar

- **Helix Heel mostrava il promemoria di Domain**: la reliquia scatta "When you create a terrain effect or object"
  (p.250), ma il controllo bastava che il testo dicesse "object" o "terrain effect" da qualche parte. Helix Heel
  *usa* gli oggetti che ci sono già ("If an object is in the end space…"), non ne crea → ora serve che l'abilità ne
  crei uno: un tag terrain effect, un blocco "Object:" / "Terrain effect:", oppure un verbo di creazione (create,
  place, summon, raise, replace with, becomes…) seguito da object / terrain / pit / boulder / wall. Escono Helix Heel,
  Lance e Quaking Palm (usano oggetti senza crearne). Entrano 13 abilità che creano pit o terreno e prima erano
  ignorate: Massive Overhead, Valkyrie, Cryo, Chastise, Gigaton Whip, Pandaemonium, Pyre, Bio, Death Blossom, Rime,
  Blackstar, Deepwrath e Takedown.

## 12 ottobre 2026 — Riquadri di testo allargabili anche di lato (versione 1.17.4)

### Bug di Maar

- **I riquadri delle schede clock e foe si allungavano solo verso il basso**: Foundry e le nostre regole più vecchie
  li bloccavano in verticale. Nella 1.15.0 erano già diventati larghi quanto la scheda (prima erano di circa 20
  caratteri), ma restavano trascinabili solo in giù → ora tutti i riquadri di testo delle nostre schede (clock, foe,
  legend, item) si trascinano dall'angolo in entrambe le direzioni. Partono larghi quanto la loro riga e non escono
  dalla scheda: per averli ancora più larghi si allarga la finestra.

## 12 ottobre 2026 — Gli Infuse delle Mastery (versione 1.17.3)

### Bug di Maar

- **Lance non offriva Great Spirit Lance**: la seconda versione infusa di Lance è la sua Mastery ("GREAT SPIRIT LANCE:
  Infuse 6 — 2 actions, Attack, Line 10, Width 3…"), ma i bottoni ✨ Infuse leggevano solo i blocchi "Infuse N:" della
  descrizione → con la Mastery sbloccata, sul pannello compare un secondo bottone, **✨ Infuse 6 — GREAT SPIRIT
  LANCE**, che funziona come gli altri (spende l'Aether, posta il testo in chat, offre le sue aree sul 📐). Lo stesso
  vale per le altre sei Mastery scritte così: MAGNACRYO (Cryo), MAGNAGEO (Geo), MAGNAPYRE (Pyre), MAGNABIO (Bio),
  MAGNARIME (Rime) e TIDAL SMASH (Heave-Ho). Il danno della versione infusa si legge ancora dal testo, come per gli
  altri Infuse.

## 12 ottobre 2026 — Tracker: chi ha più turni chiude il turno con un bottone solo (versione 1.17.2)

### Bug di Maar

- **Con più turni, i nodi del tracker facevano cose diverse**: mentre un personaggio (o un Elite) era di turno, accanto
  a "■ End turn" restavano i "▶" dei turni ancora da fare; premerne uno chiudeva il turno e apriva subito il
  successivo, e i giocatori si confondevano → mentre il personaggio è di turno, i turni che gli restano si vedono
  ancora ma sbiaditi e non si possono premere. Si esce dal turno solo con "■ End turn"; il turno dopo si prende
  quando nessuno è attivo, come gli altri. Un Elite che vuole fare due turni di fila preme End turn e poi ▶ sulla
  stessa riga: gli effetti di fine turno si risolvono in mezzo come prima.

## 12 ottobre 2026 — Draken Cross: Small o Medium Blast col Talent II (versione 1.17.1)

### Bug di Maar

- **Draken Cross col Talent II non lasciava scegliere la Medium Blast**: il Talent II dice "Charge: Increase range to
  5, and all areas may be increased to medium blasts". Due difetti insieme: "medium blast**s**" al plurale non veniva
  letto (le copie dell'abilità senza i tag del talento offrivano solo Small Blast), e quando i tag del talento c'erano
  l'area diventava sempre Medium Blast range 5, anche fuori dalla Charge → ora 📐 offre tutte e due: "Base: Small
  Blast, range 3" e "Talent II: Medium Blast, range 5". Quando il talento vale solo su una Charge (o un Heroic,
  Exceed…), la versione base è la prima. In generale: se un talento, una mastery o una combo cambiano l'area, la
  base resta tra le scelte; un testo che cambia anche il range ("Increase range to 5") dà quel range alle sue aree.
- **Gli status del Talent I comparivano anche scegliendo il Talent II**: i talenti si escludono a vicenda (p.113,
  "pick either talent I or talent II"), ma i bottoni Inflict leggevano il Talent I anche con il II scelto → ora solo
  quello scelto.

## 12 ottobre 2026 — Più stance insieme (versione 1.17.0)

### Richiesta di Maar

- **Si poteva tenere una sola stance**: la regola generale è una alla volta (p.103), ma il tratto Martial Master del
  Knave ("You can take two stances at once", p.141) e l'Aspect della reliquia Byrax ("You can hold +1 more stance than
  normal", p.249) alzano il limite, fino a 3 → il numero massimo di stance ora si calcola da solo: 1, +1 se il PG ha
  Martial Master, +1 se ha Byrax all'Aspect. Accanto alla stance c'è un campo **Extra** per qualunque altro effetto
  che alzi il limite, senza tetto. Il bottone 🧘 di un'abilità aggiunge la stance alle altre finché c'è posto; a limite
  raggiunto sostituisce la più vecchia e lo dice. Ripremuto, toglie solo quella stance. Con più di una stance
  possibile la scheda mostra "Stances 2/3"; il segnalino sul token diventa "Stance: Rampage, Iron Wall".
- I personaggi che avevano già una stance la tengono: il campo è lo stesso (più nomi sono separati da " | "), non
  serve nessuna migrazione.

## 12 ottobre 2026 — Limit break: si sceglie quale Resolve spendere (versione 1.16.11)

### Bug di Maar

- **Il limit break prendeva sempre prima la Party Resolve**, e la personale solo quando quella era finita, senza
  chiedere → il manuale (p.99) dice che si può usare "any combination of party or personal resolve", e che la party è
  di tutto il gruppo e va usata col consenso degli altri. Ora, quando c'è una scelta da fare, "Use" apre un piccolo
  dialog: quanta Resolve prendere dalla party (il resto viene dalla personale), con il conto aggiornato mentre si
  cambia il numero. Parte usando prima la personale. Se c'è un solo modo di pagare (per esempio la party è a 0), il
  dialog non compare. In chat il messaggio del limit break dice come è stato pagato ("Resolve: 1 personal + 1 party").

## 12 ottobre 2026 — Il danno delle combo che aggiungono soltanto (versione 1.16.10)

### Bug di Maar

- **"Death Blossom does not deal damage"**: il calcolo del danno leggeva la combo come se sostituisse tutta
  l'abilità; Flying Sleeves cambia solo l'area e non ha una riga di danno, quindi per il programma la combo "non faceva
  danno" e il bottone Damage si rifiutava → la combo sostituisce solo le parti che riscrive (Hit, Miss, Area), il resto
  è quello dell'abilità base, come già sulle card. Valeva anche per Low Blow, Umbra, Revenge, Bleak Mercy e Chastise.
  Una combo che riscrive anche il Trigger è l'abilità scritta da capo e non eredita niente (Justice → Judgement, che
  nel manuale non fa danno). Senza combo token, su Maar il messaggio veniva dal token "ricordato" corretto nella 1.16.9.
- **Fortuna (Astra) tirava 0 dadi**: "Auto hit: [D]+fray", scritto staccato, non veniva letto (il
  programma cercava solo "autohit" attaccato) → ora tira [D]+fray. Sulle abilità base non cambia nessun danno (6066
  abilità e azioni controllate).

## 12 ottobre 2026 — Death Blossom: l'area giusta e il suo range (versione 1.16.9)

### Bug di Maar (con la foto di Death Blossom)

- **Senza combo token, 📐 di Death Blossom proponeva Arc 4 / Arc 8 invece di Burst 1**: Show in Chat con COMBO acceso
  spende il token e si ricorda su quale abilità l'ha speso, perché l'attacco e il danno arrivano dopo con clic
  separati. Quel ricordo si cancellava solo col tiro del danno o a fine combat: senza tirare il danno, l'abilità
  restava nella versione combo anche col token a 0 → ora si cancella anche quando si accende o spegne COMBO a mano e
  alla fine del turno del personaggio.
- **La versione combo perdeva il range** ("The first space of the arc must be in range"): i tag di Flying Sleeves
  (attack, arc-4, unerring) sostituivano quelli di Death Blossom e il "range 2" spariva, così l'arco doveva toccare il
  personaggio → quando una combo, un talento o una mastery cambiano i tag senza dare un range proprio, resta quello
  dell'abilità (p.97: un'area con un range si piazza ovunque entro quel range). Sistemato nel codice, quindi vale
  anche per le copie dell'abilità già nei mondi. Nel pack era l'unico caso.

## 12 ottobre 2026 — Il pannello dell'abilità segue la combo (versione 1.16.8)

### Bug di Maar

- **Il bottone 📐 non cambiava nome accendendo la combo** (Death Blossom → Flying Sleeves restava "Burst 1" invece di
  "Arc 4"): il pannello delle abilità controllava se la combo era attiva prima che la scheda avesse letto il combo
  token, quindi per il pannello la combo era sempre spenta → ora usa lo stesso controllo dei bottoni di attacco e Show
  in Chat (token tenuto, o appena speso su quell'abilità). Con la combo accesa il bottone dice "Arc 4" e i tag della
  combo sono evidenziati come "upgraded", come era previsto e non succedeva mai.
- **Il dialog per scegliere l'area offriva le forme della combo anche a combo spenta** (Death Blossom base proponeva
  Arc 4 e Arc 8) → le forme della combo compaiono solo quando la combo è attiva.

## 12 ottobre 2026 — Card delle versioni combo: nome e blocchi giusti (versione 1.16.7)

### Bug di Maar (con le foto di God Hand / Devil Hand)

- **La card "Show in Chat" della combo teneva il nome base**: si chiamava "God Hand" anche quando mostrava Devil Hand,
  e la prima riga diceva "⚡ ⚡ Combo — DEVIL HAND" (il fulmine doppio, il nome in maiuscolo) → ora il titolo è
  **Devil Hand**, con "God Hand combo" sotto; la riga della combo è "⚡ Combo — Devil Hand".
- **La card dell'attacco della combo era sbagliata**: tutto il testo di Devil Hand finiva in un unico blocco Hit, e
  Exceed restava quello di God Hand ("gain 3 vigor") → la card è costruita come lo Show in Chat: Hit, Miss, Exceed e
  Crit prendono il testo della combo dove la combo li riscrive (Exceed di Devil Hand: "Repeat the effect"), e le righe
  proprie della combo ("+1 boon", i due Effect) stanno sopra, ciascuna nel suo riquadro viola. Il titolo è "Devil Hand
  (God Hand combo)", come quello della card del danno. Le combo senza un nome proprio restano "Nome (Combo)".

## 12 ottobre 2026 — Bottoni degli status: versioni combo e status scritti come verbo (versione 1.16.6)

### Bug di Maar

- **God Hand non dava mai il bottone per Sealed**: il riconoscimento degli status leggeva solo la forma "è sealed /
  diventa sealed", non il verbo con il suo oggetto ("Seal your foe", "dazes its target", "Shatter attack target",
  "dazes or blinds them") → ora riconosce anche il verbo, ma solo se segue davvero un bersaglio (foe, target,
  character, them…). Non scatta con un nome ("a holy seal", "Intimidate's stun") né con una negazione ("it doesn't
  seal them"). Sui pack compaiono 53 bottoni nuovi (God Hand, Fairy Ring, Cryo, Demon Claw, Helix Heel, Intimidate,
  e tra i foe Ambush, Great Slice, Masamune/Muramasa, Shadow Scour, Snatch Memory, Swirling Elements…); nessun
  bottone che c'era prima sparisce.
- **Con la combo attiva sparivano gli status della versione base**: i bottoni della combo leggevano solo il testo
  della combo, anche quando la combo aggiunge soltanto qualcosa ("The Hook: Gains range 2 and effect: Shove…") → ora la
  versione combo è l'abilità con i blocchi che la combo riscrive, come già la mostra la scheda: i blocchi che la
  combo non nomina restano. Low Blow con The Hook tiene Hatred e Slashed, Umbra con Penumbra tiene Blind; Revenge con
  Indignation ("replaces the base effect") perde Unstoppable, come dice il testo.
- **Devil Hand non dà Sealed, ed è giusto**: nel manuale la combo di God Hand riscrive entrambi i blocchi Effect, e
  "Seal your foe" diventa l'esplosione in medium blast. Il Sealed c'è solo nella versione base.

## 12 ottobre 2026 — Con due GM i tiri automatici non escono più doppi (versione 1.16.5)

### Bug di Maar

- **Con un GM assistente collegato, ogni save automatico usciva due volte** (per PG e NPC): tutto quello che succede a
  fine turno (save, fine della Hatred, effetti di fine turno, promemoria delle reliquie) partiva da un controllo che
  chiedeva solo "sono un GM?", quindi lo eseguiva ogni GM collegato → ora lo esegue solo il GM "attivo" scelto da
  Foundry, come già facevano il relay dei giocatori e gli altri automatismi. Stessa correzione per l'annuncio del
  cambio di fase delle legend. L'inizio del combat non cambia: lo esegue solo chi preme Start, e così funziona anche
  quando lo preme il GM assistente.

## 12 ottobre 2026 — Vigilance: si tiene il dado più alto (versione 1.16.4)

### Bug di Maar

- **Spendere Vigilance sommava i dadi**: il bottone Spend tirava 1d6 per carica e scriveva in chat il totale ("the total
  reduces damage"), come se le cariche si sommassero → il manuale (p.105 e p.117) dice "rolling 1d6 per charge spent
  and picking the highest result": si tira un d6 per carica e si tiene **il più alto**. Più cariche aumentano la
  probabilità di fare 6, ma i dadi non si sommano. Il dialog ora lo dice, fa scegliere tra i due usi (ridurre il danno
  di un alleato entro range 2 "as if with armor", o fare danno a un foe che rompe l'adiacenza) e la chat riporta il
  dado più alto con l'uso scelto. Il tooltip della parola "Vigilance" e la descrizione dello status dicono la stessa
  cosa; la descrizione dello status parlava di "adjacent ally", ma il manuale dice range 2.

## 12 ottobre 2026 — Rot / Regenerate: il mark della combo (versione 1.16.3)

### Bug di Maar

- **Rot piazzava sempre il mark base, mai quello di Regenerate**: il bottone 🎯 leggeva solo il blocco "Mark:" della
  descrizione, e il testo della combo non veniva mai guardato → sul pannello di Rot c'è un secondo bottone,
  **🎯 Mark target (Regenerate)**, che piazza il mark della combo col suo testo (regeneration, defiance sotto il 25%).
  Il manuale dice che "può essere piazzato anche se Rot è già attivo", quindi è un mark a parte: non sposta né
  sostituisce quello di Rot. Sul pannello i due mark si distinguono, perché quello della combo ha "(Regenerate)"
  accanto al nome.

## 12 ottobre 2026 — Hatred+ resta oltre il turno (versione 1.16.2)

### Bug di Maar

- **Hatred+ spariva sempre a fine turno**: la Hatred inflitta come ongoing veniva salvata come tale, ma il controllo di
  fine turno la toglieva comunque, senza guardare il "+" → ora a fine turno finisce solo la Hatred normale (p.104).
  Quella ongoing resta finché la sua fonte non viene meno (p.94): si toglie a mano dalla tab Conditions, o sparisce
  a fine incontro. Anche il messaggio in chat lo dice ("Hatred+ of …", "doesn't end with the turn").

## 12 ottobre 2026 — Danno degli attacchi ad area (versione 1.16.1)

### Bug di Maar

- **Il danno di un attacco ad area andava a tutti come se fossero stati attaccati** (Pyre, Enochian): il dialog
  dell'attacco lasciava scegliere un solo bersaglio d'attacco, ma il dialog del danno non lo sapeva e metteva tutti i
  bersagli sulla stessa card di Hit → il dialog del danno ora ricorda il bersaglio scelto nell'attacco (si può
  cambiare) e, come dice il manuale a p.117, Hit / Crit / Miss vanno solo al bersaglio d'attacco, mentre gli altri
  ricevono una card "Area damage" a parte (solo se l'area fa danno).
- **Il ✕ nel dialog del danno non faceva niente**: i bottoni c'erano, ma non erano collegati a nessuna azione → ora
  tolgono il bersaglio dal tiro e dalla mappa, e la card del danno usa solo i bersagli rimasti nella lista.
- **Tolta l'area, i bersagli restavano**: il template selezionava i token dentro di sé, ma rimuoverlo non li
  deselezionava → quando un'area viene tolta (bottone 🗑, Delete sulla mappa, inizio del turno successivo), chi l'ha
  piazzata smette di bersagliare i token che c'erano dentro.

## 9 ottobre 2026 — Guida rapida: tab "Narrative" (versione 1.16.0)

### Richiesta di Maar

- **Il gioco narrativo confondeva i tavoli** (Aid o Set up, second wind, "exhausted", i rischi dei tiri) → nuova tab
  **Narrative** nella guida rapida, tra Turn e Areas, con la pagina del manuale per ogni parte: il tiro e la scala dei
  risultati (1-3, 4-5, 6, 6-6), il rischio (Controlled / Risky / Desperate con conseguenze e strain 1 / 2 / 4),
  l'effetto (da nessuno a superpowered), una tabella che mette a confronto Push, Aid, Set up, Tempt Fate e Team action
  con un riquadro "Aid or set up?", Effort / Exhausted / Second wind (con la differenza dal burden "exhausted"),
  Strain / Break / Burden e i tiri di fortuna. La ricerca della guida trova anche queste righe (es. "aid",
  "second wind").

## 9 ottobre 2026 — Feedback di Maar: tab, riquadri, planner, clock colorati, ranghi delle reliquie (versione 1.15.0)

### Bug (bassa priorità)

- **Tab della scheda PG "affondate"**: nella foto di Maar le tab scendevano sotto la linea dorata della barra, che
  passava a metà della tab attiva (succedeva a tutti, su Foundry 13 e 14) → la regola che azzera il layout dei pezzi
  della scheda valeva anche per la barra delle tab e ne toglieva l'impaginazione: le tab diventavano testo in riga, e
  il loro spazio interno sbordava sotto la linea. Lo stesso errore che il 9 settembre impilava il contenuto delle tab
  → la barra ha di nuovo la sua impaginazione, le tab poggiano sulla linea con il piccolo spazio tra l'una e l'altra
  che era previsto, e la prima tab è allineata al bordo sinistro del contenuto.
- **Riquadri allargabili solo in verticale** (scheda clock, scheda foe): i campi di testo lunghi non avevano una
  larghezza nostra e restavano alla misura di default del browser (circa 20 caratteri), mentre Foundry permette solo
  di allungarli verso il basso → ora sono larghi quanto la scheda; l'altezza si regola ancora trascinando l'angolo.

### Richieste

- **Bottoni dell'Encounter planner più grandi**: i bottoni piccoli (−/+, ✕, Elite, Load/Save…) sono più alti e larghi,
  con un testo più leggibile; più grandi anche Chat / Actors / Deploy.
- **Scheda clock più ariosa**: più spazio tra i clock e dentro ognuno; dimensione e colore sono scesi su una riga
  loro, perché la prima riga era troppo affollata.
- **Colore dei clock**: il selettore di colore c'era già, ma era un quadratino accanto al nome → ora ci sono quattro
  colori pronti con un clic (Progress verde, Danger rosso, Neutral oro, Mystery viola) più il selettore per un colore
  qualsiasi. Il colore arriva anche al clock sulla mappa e alla card in chat.
- **Ranghi delle reliquie sbloccati / bloccati**: le righe dei ranghi bloccati avevano già un segno nel codice, ma
  nessuno stile, quindi sembravano tutte uguali → ora i ranghi sbloccati hanno bordo dorato, sfondo e "✓ Unlocked",
  quelli bloccati sono sbiaditi con "🔒 Locked" (i bottoni Upgrade / +1 Dust restano ben visibili).

## 2 ottobre 2026 — Correzioni dal playtest locale (versione 1.14.1)

- **Gain vigilance mancante**: le card degli Stalwart non avevano il bottone per la vigilance ("Gain +1 vigilance",
  "gain vigilance +1 at the end of your turn") → il lettore del testo scartava "vigilance +1" scambiando il "+" per
  quello degli status continui, e non riconosceva "Gain +1 …" come rivolto a sé → ora legge entrambe le forme e il
  numero: "Vigilance +1" / "Vigilance +2" alzano il tracker di quel valore. Cambia solo per 15 testi dei compendi, tutti
  di Stalwart.
- **Nome lungo di un power die**: tagliato con i puntini, si portava via anche la dimensione del dado → ora si taglia
  solo il nome, "d12" resta visibile e il nome intero è nel tooltip.

## 2 ottobre 2026 — Status doppioni nascosti sui PG, il token segue i tracker della scheda (versione 1.14.0)

### Richiesta di Maar

- **Status doppioni**: Vigilance, Power Die, Bonus Damage e Marked esistevano sia come status sia nei sistemi della
  scheda, con due conteggi slegati → ora sui PG Vigilance, Power Die e Bonus Damage spariscono dalla tavolozza
  dell'HUD del token e dalla tab Conditions (si usano il tracker della tab Combat e il campo "Bonus dice" del dialog
  del danno); Marked sparisce per tutti, perché i mark per abilità lo sostituiscono. Foe e legend tengono Vigilance,
  Power Die e Bonus Damage: non hanno un tracker. Blessed resta per tutti.
- **Token legato alla scheda**: l'icona Vigilance / Power Die sul token del PG compare e sparisce da sola seguendo i
  tracker; nel pannello degli status i numeri sono quelli della scheda (Vigilance si cambia anche da lì). Il bottone
  "Gain" di un'abilità che dà vigilance aggiunge 1 al tracker invece di mettere uno status a parte.
- **Migrazione 19**: i PG che avevano questi status li ritrovano nei tracker (Vigilance, Power Die come "Power die
  d6"); Bonus Damage e Marked vengono tolti dai PG.

## 2 ottobre 2026 — Power die per tutte le classi, con nome; Godly Smite ha il suo dado (versione 1.13.0)

### Bug e richieste di Maar

- **Power die solo sul Wright**: Maar voleva tracciare i power die sulla scheda come vigilance, blessing, aether →
  il blocco "Power Dice" della tab Combat era scritto dentro la sezione del Wright, quindi le altre classi non lo
  vedevano e dovevano usare lo status "Power Die" sul token (un numero solo) → ora il blocco c'è per ogni classe,
  sotto le risorse di classe.
- **Power die con il nome**: un Knave può avere molti dadi insieme e non si capiva quale fosse quale → ogni dado ha
  un nome e una dimensione (d4–d12): "+ Die" li chiede insieme al valore di partenza, un clic sul nome li cambia, il
  dado non sale oltre la sua dimensione e il 🎲 tira il dado giusto. I dadi Wright di prima diventano "Power die d6".
- **Godly Smite senza dado**: il tratto del Sealer nel compendio ha il suo d6 (p.191), ma quando un PG prende il job i
  tratti vengono ricopiati dal job template, che conserva solo nome, testo e capitolo → il dado si perdeva per
  strada. Ora viene preso dal tratto del compendio alla creazione del PG, al drop del job e al cambio di job
  primario; la migrazione 18 lo aggiunge ai Sealer già esistenti.

## 1 ottobre 2026 — Quick Guide: aree divise per famiglia, origin/attack space, Line con range (versione 1.12.1)

### Novità (richieste di Maar)

- **Burst: origin space e attack space**: le didascalie dei Blast dicevano che il centro è l'attack space, quelle dei
  Burst non lo dicevano, e per Burst (target) è proprio la cosa da sapere → il manuale (p.97) dà la stessa regola ai
  due: "The origin space and attack space is the central space". Ora tutte e tre le didascalie Burst lo dicono, i
  Blast dicono "origin and attack space", Line e Arc dicono che l'attack space è un personaggio qualunque nell'area.
  La nota in fondo spiega cosa vuol dire (chi è nell'attack space subisce il tiro per colpire e la parte d'attacco,
  gli altri l'effetto d'area).
- **Esempio di Line con range**: c'era solo "Line 5" senza range, che parte accanto a chi la usa → nuova clip
  **Line 4, range 3**, registrata in Foundry come le altre: la linea parte da una casella qualsiasi nel range, che
  diventa l'origin space (p.97).
- **Titoletti per famiglia**: le 12 clip erano una griglia unica → ora sono divise sotto piccoli titoli Blast,
  Burst, Line, Arc, Aura.
- **Origin / attack space in evidenza** (richiesta di Edoardo, 2 ottobre): scritto solo nelle didascalie piccole si
  perdeva → sotto ogni titoletto c'è una riga a parte, con bordo oro, che dice quale casella è l'origin e l'attack
  space di quella famiglia (p.97); per Burst: "the central space — the space or character you pick for Burst
  (target), you for Burst (self)".
- **Movimento tutto in una volta**: la scheda Turn non diceva che lo standard move non si spezza → nuova riga nei
  Limits: se ti fermi per usare un'abilità il movimento finisce e le caselle non usate sono perse (p.88, "Movement
  can't be broken up").

## 1 ottobre 2026 — Mark che si impilano, level up, tour del GM, aree che si tolgono da sole (versione 1.12.0)

### Decisioni di Edoardo

- **Dust sui Burden: è regola del libro, non house rule**: l'impostazione la chiamava house rule ed era spenta →
  rileggendo il manuale, p.42 lo dice proprio nel paragrafo Heal Burdens ("You may also spend dust to tick
  additional segments on a burden clock… 2 dust will buy you 1 segment"), e p.242 lo ripete. La nota del TODO che
  parlava di un manuale incoerente era sbagliata: il testo estratto dal PDF è su due colonne, e la frase era stata
  attribuita al paragrafo delle Ambition → l'impostazione si chiama ora "Dust to heal Burdens during an Interlude
  (RAW, p.42)" ed è **accesa** di default, come Party Resolve. Nei mondi dove il GM l'aveva già salvata spenta,
  resta spenta. Il tour House Rules lo spiega così.

### Novità

- **Mark che si impilano**: il secondo mark di "Battalion of Limbs" (Royal Guard, p.332) sullo stesso personaggio
  sostituiva il primo, quindi gli stack (+3 danni l'uno) non si contavano → i mark il cui testo dice che si
  impilano ("stacks indefinitely", "for each stack of the mark": Battalion of Limbs, la Malice del Vessel Knight)
  ora aggiungono uno stack al mark che c'è già. Il numero si vede nel nome del mark (**Marked ×3 — …**), nei
  chip 🎯 sulla scheda di chi marca e nella lista dei mark della scheda Conditions. ✕ toglie il mark con tutti
  gli stack, come il tiro salvezza del libro.
- **Level up, "← Back" non cancella più le scelte del passo 2**: tornando al passo 1 e poi di nuovo avanti, le
  tendine delle azioni, le abilità e i talenti spuntati, la mastery, il relic e il bond power si azzeravano (si
  salvavano solo i campi del passo 1) → "← Back" ora si ricorda anche le scelte del passo 2 e le rimette al
  ritorno. Se nel passo 1 si cambia lavoro e un'abilità scelta non c'è più, quella scelta cade.
- **Tour per il GM "Foes & Encounters"** (Settings → Tours, solo GM): apre da solo la scheda di un foe (Class /
  Elite / Chapter, Foe Templates, azioni con Attack / Mark / area, Conditions), di un legend (fasi),
  l'Encounter Designer (party e budget, roster, salvataggio e Deploy) e la Clock Board (⤓ Map). Usa gli attori
  già nel mondo; se ne manca uno il passo compare al centro con la spiegazione.
- **Le aree si tolgono da sole**: i template delle aree restavano sulla mappa finché qualcuno non premeva
  🗑 area o finiva l'incontro → all'inizio del turno successivo di chi l'ha piazzata, l'area sparisce. Restano
  invece le **aure** (seguono il token) e gli **effetti terreno** (p.96: restano sul campo), riconosciuti dal tag
  o dalla scritta "terrain effect" nel testo dell'abilità. Copie dello stesso foe non si cancellano le aree a
  vicenda. Tornare indietro di un turno nel tracker non cancella niente.

- **Aree della Quick Guide registrate dal vero** (richiesta di Edoardo, stesso giorno): al posto dei disegni
  animati, ogni area ha una breve registrazione dello schermo di Foundry col piazzamento vero del sistema: il range
  in blu, l'anteprima che segue il mouse, il clic, i nemici dentro che diventano bersagli. La Line gira col mouse,
  gli Arc si dipingono una casella alla volta, l'Aura segue il PG mentre si muove. 11 clip WebM in loop, senza
  audio, circa 30 KB l'una (330 KB in tutto), in `assets/guide/areas/`. Chi ha chiesto al sistema operativo di
  ridurre le animazioni le vede ferme, con i comandi per farle partire. Approvate una per una da Edoardo.
- **Le aure non seguivano il token se il GM guardava un'altra scena** (trovato registrando le clip): l'aura viene
  spostata dal client del GM attivo, che però si fermava se la scena del token non era quella aperta sul suo
  schermo → l'aura restava indietro ogni volta che il GM era su un'altra scena mentre un giocatore si muoveva → il
  calcolo usa ora la griglia della scena del token, qualunque scena il GM stia guardando.

- **Ricerca nella lista PG dell'Encounter Designer** (TODO del 20 settembre): con decine di schede PG nel mondo
  trovare i giocatori veri nel passo 1 era scomodo → sopra i ritratti c'è una casella di ricerca (per nome o
  lavoro), che compare quando i PG sono più di 6. Chi è già nel party resta sempre in lista, e il testo cercato
  resta anche quando si aggiunge o toglie un PG.

- **I template di fazione e di cultura non si potevano applicare** (trovato provando il Villager): trascinando
  "Yeokin" o "Folk" dal compendio Foe Templates su un foe non succedeva niente, e in console c'era "foeClass: may
  not be a blank string" → nei dati del template il campo classe era vuoto per tutti i template che non cambiano
  classe (fazioni, Great Culture), e Foundry lo rifiutava → il campo accetta ora il valore vuoto. Provato in
  Foundry: Yeokin aggiunge Camaraderie, Folk aggiunge Kin, ✕ li toglie. Era così dalla 1.7.0, mai provata al tavolo.
- **Promemoria Great Culture sui foe Folk**: per p.302 un foe Folk è un foe base più il template Kin più la Great
  Culture di una delle sei culture, e nessun foe Folk del compendio ce l'ha già (Villager, Farmer, Acrobat…) → sulla
  scheda di un foe Folk senza template di cultura compare un riquadro che lo ricorda e dice di trascinare il template
  da Foe Templates; sparisce appena la cultura c'è. Anche il tour "Foes & Encounters" lo spiega.

- **Il token non seguiva la taglia del foe** (trovato nel playtest locale): trascinando il template Bouncer su uno
  Scrapper, o Jotunn su un foe di taglia 1, la taglia passava a 2 ma il token restava di una casella; idem cambiando
  Size a mano → la dimensione del token non veniva mai allineata (la 1.8.1 aveva corretto solo i dati del
  compendio) → quando cambia la taglia di un foe o di un legend cambiano anche il suo token di base e i suoi token
  già sulle scene. Provato: Bouncer 1×1 → 2×2 e ritorno, Size 3 → 3×3.
- **La carta del danno diceva "½" quando il danno non veniva dimezzato** (playtest locale): con Unerring il chip
  "Aetherwall ½" restava acceso anche se Apply toglieva il danno pieno (lo stesso per Cover con Unerring e Dodge con
  True Strike) → quei chip ora dicono "Aetherwall — ignored (Unerring)", "Dodge — ignored (True Strike)", spenti.
- **I dimezzamenti arrotondavano per difetto** (playtest locale): 11 danni contro Aetherwall toglievano 5 HP → il
  manuale arrotonda sempre per eccesso (p.86, "Round up to the nearest whole number"; Resistance "rounded up";
  l'esempio di p.106 porta 1.5 a 2) → Cover, Resistance, Aetherwall, Pacified e Hatred arrotondano per eccesso:
  11 dimezzato fa 6.

### Chiuso senza lavoro

- FAQ: le quattro risposte riformulate vanno bene perché vengono dal manuale. Gli otto fix del 30 agosto sono
  confermati. Scene senza griglia: non le usate, nessun lavoro.

## 1 ottobre 2026 — Quick Guide: aree illustrate, FAQ, bottone sulla scheda (versione 1.11.0)

### Novità (richieste di Maar)

- **Aree illustrate**: la guida (ex "Rules Reference", ora **Quick Guide**) ha una sezione **Areas** con un disegno
  per ogni area: Small / Medium / Large Blast, Burst 1 (target), Burst 1 e 2 (self), Line 5, Arc 3 / 4 / 5, Aura 2.
  Le caselle si accendono una dopo l'altra, come se l'area venisse piazzata, e ricominciano. I disegni usano le
  stesse funzioni e gli stessi colori del piazzamento sulla mappa, quindi non possono essere diversi da quello che si
  vede al tavolo; la casella d'attacco (Blast, Burst) è evidenziata, il raggio d'azione è in giallo tenue. Chi ha
  chiesto al sistema operativo di ridurre le animazioni le vede ferme.
- **Disegni delle aree che non comparivano** (segnalato da Edoardo il pomeriggio stesso): nella scheda Areas si
  vedevano solo titoli e testi → la guida passava il contenuto a Foundry come testo, e Foundry lo "ripulisce"
  togliendo i disegni SVG → ora il contenuto gli arriva già costruito, e Foundry lo lascia com'è.
- **Animazione delle aree rifatta** (Edoardo, stesso pomeriggio): le caselle comparivano e sparivano ognuna per
  conto suo, con dissolvenze e colori accesi semitrasparenti, tipo luci da discoteca → ora l'area si **propaga**
  dall'origine: anello dopo anello per Blast, Burst e Aura, casella dopo casella per Line e Arc. Ogni onda si accende
  di colpo, l'area intera resta accesa, poi si spegne tutta insieme e ricomincia. Niente dissolvenze; colori opachi
  e smorzati (ocra, mattone, ardesia, viola), a piena copertura.
- **Guida con la stessa grafica delle schede** (Edoardo, stesso pomeriggio): la guida era una finestra di dialogo
  generica, con colori e riquadri suoi → ora è una finestra costruita come le schede di PG e nemici: banda diagonale
  dorata nell'intestazione con titolo e ricerca, le stesse linguette (Turn · Areas · Glossary · FAQ), i contenuti
  nei riquadri delle sezioni. Si può ridimensionare; se è già aperta, riaprirla la porta in primo piano invece di
  aprirne una seconda.
- **Popup "vuoi aprire la Quick Guide?"** (Edoardo, stesso pomeriggio): a ogni aggiornamento del sistema, la prima
  volta che una persona (GM o giocatore) entra nel mondo le viene chiesto se vuole aprire la guida: "Open the Quick
  Guide" o "Not now". Esce una sola volta per versione, per ogni persona. Al primissimo ingresso c'è già la finestra
  di benvenuto, quindi il popup non esce e il benvenuto ha un bottone **Quick Guide** in più.
- **FAQ dei casi limite**: 11 domande e risposte di Maar in fondo alla guida, ognuna con la pagina del manuale. Le
  ho controllate tutte sul PDF: le pagine sono giuste. Quattro risposte sono riformulate per stare al testo del libro:
  ordine del danno (le aggiunte dell'attaccante vengono **prima**, non "nell'ordine che si preferisce", p.106); il
  Rampart blocca anche volo e teletrasporto, non solo il dash (p.104); remove-and-place non fa scattare ciò che
  reagisce al **movimento** (p.88); "+" come boon si scrive +1D e funziona diversamente in combattimento e in
  narrativa (p.12). Sulla domanda degli AP: la colonna "Total AP" di p.115 conta un AP di metà livello già al livello
  0, la regola di p.15 no — la scheda ha ragione.
- **Guida divisa in schede** (richiesta di Edoardo, stesso giorno): con aree e FAQ la finestra era diventata un
  unico scroll lunghissimo → quattro schede, **Turn · Areas · Glossary · FAQ**, una visibile alla volta, con
  un'altezza fissa così la finestra non cambia misura passando dall'una all'altra. La guida si riapre sull'ultima
  scheda usata. La **ricerca** vale per glossario e FAQ insieme: mentre si scrive mostra solo le righe trovate di
  entrambi; svuotandola si torna alla scheda di prima. Da macro: `game.icon.showReferenceGuide({ tab: "faq" })`.
- **Bottone "Quick Guide"** in alto a destra nella banda dell'intestazione della scheda PG, sopra il livello.
  Il bottone in Notes → Character Management si chiama ora "📖 Quick Guide"; tour First Steps e The Character Sheet
  aggiornati (un passo nuovo per il bottone).

## 1 ottobre 2026 — Tour guidati (versione 1.10.0)

### Novità

- **Tour guidati dell'interfaccia** (richiesta di Edoardo): Foundry ha già un sistema di "tour" (Settings → Tours)
  che evidenzia un pezzo dello schermo alla volta con un fumetto di spiegazione, ma il sistema non ne aveva → tre tour
  nella sezione "ICON 1.5": **First Steps** (Rules Reference, Actors, Encounter Designer per il GM, compendi, tracker,
  chat), **The Character Sheet** (apre da solo la scheda del proprio PG e la percorre tab per tab), **Combat** (turni
  alternati p.87, attivazioni, slow turn, Party Resolve p.99, pannello degli status, Apply del danno). Se un elemento
  non c'è (niente combat in corso, PG senza Limit Break, sidebar chiusa) il passo ripiega su un riquadro più grande o
  compare al centro, invece di interrompere il tour come fa Foundry di serie.
- **Tour House Rules** (solo GM, chiesto lo stesso giorno): apre da solo Configure Settings sulla sezione ICON 1.5 e
  spiega una per una le regole opzionali: Party Resolve +1 a round (che è RAW, p.99, ed è acceso di serie), Dust per
  curare i Burden nell'Interlude, tiri Heroic / Routine. Per la Dust il tour dice che il manuale non è coerente
  (p.42 contro p.242) invece di ripetere che non è RAW. Il tour First Steps ha un passo in più, solo per il GM, che
  rimanda qui.
- **Take the tour** nella guida di benvenuto (quella del primo avvio e del bottone ❔ Guide) avvia il primo tour.

## 30 settembre 2026 — Tab separate davvero, nomi dei tipi (versione 1.9.1)

### Bug

- **Le tab della scheda erano ancora attaccate** (richiesta di Maar, verificata da Edoardo in locale): le correzioni
  del 20 e del 22 settembre (divisori, poi una scatoletta per tab) non si erano mai viste → la barra delle tab è il
  template core di Foundry v13, le cui voci sono `<a data-tab>` **senza** la classe `item`, e il CSS colpiva
  `.tabs .item`: nessuna regola veniva applicata, restava lo stile core con le parole distribuite su tutta la
  riga → selettore `.tabs > [data-tab]`; tolti anche la distribuzione su tutta la larghezza, l'interlinea alta e il
  bordo superiore del core. Le schede PG, Foe, Legend e degli oggetti hanno ora le tab in scatolette separate,
  l'attiva dorata.
- **Tab coperte dalla banda dell'intestazione del PG**: la banda colorata della classe scende di 6px sulla barra e
  ne copriva la parte alta con il suo bordo diagonale → la barra delle tab sta sopra l'intestazione, con più spazio
  in alto; le scatolette poggiano sulla linea dorata invece di raddoppiarla.

### Piccole cose

- **Nomi leggibili dei tipi** nel menu "Create Actor / Create Item": "Clock Board" invece di "clock" (la lavagna degli
  orologi era difficile da trovare), "Player Character", "Foe Template" e così via.

## 30 settembre 2026 — Orologi sulla mappa (versione 1.9.0)

Richiesta di Maar: poter trascinare un orologio dalla lavagna degli orologi sulla scena e avere lì un orologio
visivo che si aggiorna insieme al foglio. Schema del mondo 16 → 17 (migrazione 17).

### Nuovo

- **Gettone "⤓ Map" su ogni orologio** della lavagna (solo per il GM): trascinato sulla scena crea un token 2×2
  che disegna l'orologio — un disco diviso in tanti spicchi quanti sono i segmenti, quelli riempiti nel colore
  dell'orologio, "valore/massimo" al centro, bordo dorato più acceso quando è pieno — con il nome dell'orologio
  sotto.
- **Si aggiorna da solo**: spostando l'orologio sul foglio (clic sui segmenti, + / −, cambio di taglia o di colore)
  il disegno sulla mappa cambia subito per tutti. Rinominando l'orologio cambia il nome del token; un orologio
  segreto (🙈) ha il token nascosto ai giocatori e torna visibile quando lo si rivela; togliendo l'orologio dalla
  lavagna spariscono anche i suoi token. Si possono mettere più token dello stesso orologio, anche su scene
  diverse. Doppio clic sul token apre la lavagna.
- **Ogni orologio ha un identificativo stabile** (migrazione 17 per quelli esistenti), così il token resta legato
  al suo orologio anche se ne vengono tolti altri sopra di lui nella lista.

### Richiesta già soddisfatta

- **Stacco visivo fra le tab della scheda** (Narrative / Combat / Conditions…): fatto nelle versioni 1.6.0
  (divisori e spazio) e 1.6.1 (ogni tab in una scatoletta con bordo, l'attiva dorata). Chi la chiede ancora ha
  una build precedente alla 1.6.1.

## 30 settembre 2026 — Unerring che ignora davvero Aetherwall (versione 1.8.4)

### Bug

- **Unerring non ignorava Aetherwall** (segnalazione di Maar): un personaggio con lo status **Unerring** (o un
  attacco con il tag unerring) colpiva un bersaglio con Aetherwall da oltre range 2 e il danno veniva dimezzato
  lo stesso → il calcolo all'Apply sa ignorare Aetherwall (glossario p.105: "Ignores cover and aetherwall"), ma
  lo sapeva solo se nel dialog del danno era stata spuntata a mano la casella "Unerring": né il tag
  dell'abilità né lo status sull'attaccante la spuntavano → ora il dialog apre con **Unerring** (e **True
  Strike**, stesso difetto contro Dodge) già spuntato quando l'abilità ha il tag o chi attacca ha lo status, con
  scritto il perché ("from the ability's tag" / "from your Unerring status"); in più la card del danno controlla
  di nuovo lo status di chi attacca, così vale anche se la casella è stata tolta per errore.

## 30 settembre 2026 — AP avanzati spendibili al level up (versione 1.8.3)

### Bug

- **Gli AP avanzati non si potevano spendere al level up** (segnalazione di Maar): PG che a metà barra prende l'AP
  di metà livello, non lo spende e poi sale di livello → il wizard lo segnala giustamente come "carried over",
  lascia spuntare l'abilità e il contatore "AP N left" lo conta, ma premendo Confirm compariva "You spent 1 AP
  (1 new abilities + 0 talents) but only earned 0 AP this level" e il level up si bloccava → il 22 settembre
  il riporto era stato aggiunto ai selettori e al contatore ma non al controllo finale, che confrontava la spesa
  solo con gli AP di questo livello → il controllo ora usa gli AP del livello più quelli avanzati, e l'errore
  (se si spende davvero troppo) dice quanti sono gli uni e gli altri.

## 30 settembre 2026 — Titan Armament completo, Foe Abilities senza doppioni, avviso di aggiornamento (versione 1.8.2)

- **Avviso dopo ogni aggiornamento** (richiesta di Edoardo): foe, legend, summon e item trascinati dai compendi
  sono copie e non ricevono le correzioni e le novità dei compendi (per esempio le classi corrette e i summon
  di oggi) → al primo avvio del mondo con una versione nuova, il GM vede una finestra "ICON 1.5 updated to X"
  che spiega di reimportare dai compendi foe, legend e item; le macro prese dal compendio si aggiornano già da
  sole. Compare una volta per versione; in un mondo nuovo e vuoto non compare.

- **Titan Armament dava gli HP ma non il turno in più**: il template aggiungeva il +50% di HP ma il tracker dava
  comunque 2 turni a un Jotunn Elite, mentre p.448 dice "take one extra turn a round" → il template ora imposta
  lo stesso segnale che già usava l'Encounter Designer (il tracker lo legge a ogni inizio round: un Jotunn Elite
  armato ha 3 turni); togliendo il template torna a 2.
- **Voci "Faction: …" tolte da Foe Abilities**: 39 voci (Kin/Monsters, meccaniche di fazione, Great Culture,
  Imperial Officer, Legacy of the Titans) con testo riassunto, doppioni meno precisi del compendio Foe
  Templates, che ha le stesse regole con il testo del libro → eliminate, insieme al file da cui erano state
  generate (`macros/faction-rules-data.mjs`, non era una macro e nessuno lo leggeva). Restano le voci generiche
  "<Classe> (class) — …" e "Universal Template — Elite".

## 30 settembre 2026 — Token della taglia giusta (versione 1.8.1)

### Bug

- **Jotunn con il token 1×1**: 18 Jotunn del compendio erano taglia 2 ma il loro token era di una casella → la
  taglia era giusta (Titanblood, p.448: "Increase size to 2 if not already 2"), il token non era stato
  allineato → token 2×2.
- **Bouncer e Scrapper con il token 2×2 a taglia 1** → per il Bouncer il libro dice "Prodigious size: Size 2"
  (p.367), quindi era sbagliata la taglia (ora 2, token già 2×2); lo Scrapper non ha nessuna riga di taglia,
  quindi era sbagliato il token (ora 1×1). Il controllo dei compendi non segnala più nessun errore grave
  (erano questi 20). I job template di questi foe sono stati ricostruiti con la taglia giusta. Solo i nuovi
  import: i token già sulle scene non cambiano.

## 30 settembre 2026 — Summon dei foe sulla loro scheda (versione 1.8.0)

Richiesta di Maar: i summon dei nemici attaccati alla scheda del foe che li evoca, invece che sparsi in un
compendio. Fino a oggi vivevano solo come testo dentro l'azione (Soul Spark nel Wraith, Scrap Turret nel
Junker…), e bisognava crearli a mano per metterli sulla mappa.

### Nuovo

- **Summon e oggetti letti dal libro**: 59 riquadri "Summon" / "Object" del Book of Foes (Soul Spark, Temple
  Bell, Crony, Cauldron, gli Automaton della Veridian Weapon, la corte della Majesty Demon…), con taglia,
  intangibile, HP e difesa quando il libro li dà, e il testo delle regole. Gli interrupt che nel PDF hanno la
  stessa grafica (Roppo, Decoy dello Scout…) sono esclusi.
- **Agganciati a chi li crea**: ogni summon va ai foe e alle legend della sua fazione che lo nominano nelle loro
  azioni, così anche le varianti hanno il summon della base (Arc Spectre, Chain Wraith… hanno Soul Spark). I
  casi ambigui sono fissati a mano (i due Torpedo diversi della Battle Wagon e dell'Azurian Weapon; "Memory"
  dell'Aesi, da non confondere con "Snatch Memory" degli Hob; la Bomb e il Mushroom dei Folk, che non sono
  quelli in vendita nel negozio dello Shopkeep). In tutto 85 agganci su 71 foe e legend.
- **Sezione "Summons & Objects"** in fondo alla scheda Foe (tab Stats & Abilities) e Legend (tab Combat): per ogni
  summon un gettone ⤓ da **trascinare sulla mappa**, la riga descrittiva con la pagina, il testo e il 💬 per
  mandarlo in chat. Il trascinamento (solo GM) crea l'attore Summon nella cartella "Foe Summons", con il foe
  come evocatore (la scheda del summon tira con il [D] e il fray del foe), e posa un token non collegato: più
  copie dello stesso summon hanno ognuna i propri HP. Il secondo trascinamento riusa lo stesso attore.
- **I job template portano i loro summon**: trascinare "Wraith" su un NPC aggiunge anche Soul Spark; togliendo
  il template sparisce.

Solo i nuovi import dal compendio hanno la sezione: i foe già nei mondi non cambiano.

## 30 settembre 2026 — Template da trascinare sui foe (versione 1.7.0)

Richiesta di Maar (lista del 30 settembre, prima voce ad alta priorità): il libro costruisce la maggior parte
dei foe mettendo dei template su un foe base (p.289, e p.315 per i Folk: *"use basic foes and apply the Kin
template and Great Culture trait of your choice"*), ma nel sistema bisognava ricopiare i tratti a mano, uno per
uno, dal compendio Foe Abilities.

### Nuovo

- **Compendio "Foe Templates"** (nuovo tipo di item `foe-template`), ordinato come il compendio Foes, con una
  cartella per fazione:
  - **9 template di fazione** (Folk, Relict, Ruin Beast, Scavenger, Imperial, Demon, Lowlander, Jotunn, Hob):
    le righe Kin / Monsters con motivazioni e fuga, più la meccanica di fazione (Legion of the Dead, Enrage,
    Valuables / Greed / Cut and Run, Chain of Command, Abyssal Legion con Devour, Blightland Survivalists,
    Legacy of the Titans, Nature Spirits). Il Jotunn rende anche Elite (HP doppi) e porta la taglia a 2, come
    dice p.448.
  - **6 Great Culture dei Folk** (Chronicler, Churner, Guilder, Islander, Leggio, Yeokin), p.315-322.
  - **2 template speciali che si sommano agli altri**: Imperial Officer (p.387) e Titan Armament (p.448, HP
    +50%; il terzo turno non è automatizzato).
  - **192 template di job**: ogni job di fazione e ogni sua variante (Wight, Arc Spectre, Troll…), con classe,
    statistiche e tutti i tratti e le azioni. Trascinato su un NPC qualsiasi lo trasforma in quel job; i
    tratti base della vecchia classe (Guard, Skirmisher/Dodge, Slip/Aetherwall, Mob, Diaga) vengono tolti.
  I testi di Kin / Monsters, Great Culture e Imperial Officer sono presi dal libro; tratti e azioni di fazione
  sono copiati dal compendio Foes, così un template di fazione e un job della stessa fazione non aggiungono
  due volte la stessa cosa.
- **Drop sulla scheda Foe**: nel riquadro Foe Builder c'è la riga **Templates** con i template applicati
  (colore per tipo). Un template può esserci una volta sola per tipo: una fazione, una Great Culture, un job
  (gli speciali si sommano). Se si trascina un secondo template dello stesso tipo, il sistema chiede conferma
  prima di sostituire il primo. La **✕** su un template lo toglie e rimette com'erano i campi che aveva
  cambiato, a meno che nel frattempo siano stati modificati a mano. Il nome apre l'item del template.
  Provato fuori da Foundry sui dati veri: applicare e poi togliere riporta il foe identico.

### Bug

- **La fazione dei foe importati spariva alla prima modifica**: la tendina Faction delle schede Foe e Legend
  salvava una chiave (`relict`) mentre il compendio, l'Encounter Designer e ora i template usano il nome
  (`Relict`) → un foe importato mostrava "—" e al primo salvataggio della scheda la fazione diventava vuota →
  la tendina salva il nome, riconosce le vecchie chiavi (e le riscrive come nome al salvataggio) e mantiene
  un valore fuori elenco come "Basic Jobs". Emerso lavorando ai template, che scrivono la fazione.

## 30 settembre 2026 — Classi dei foe e compendio riordinato (versione 1.6.2)

Lista di Maar: tanti foe con la classe sbagliata, summon e pezzi di legend trattati da foe, e il compendio
difficile da usare. Solo dati: nessun file di codice cambia, niente migrazione (i foe già importati nei mondi
restano come sono; valgono i re-import). Script e analisi in `icon-compendium-audit/foe-classes-2026-09/`.

### Bug

- **Classi sbagliate su 122 foe**: Wight e varianti erano Leader, la famiglia Wraith Leader, i Jotunn unici
  Artillery, e così via → il manuale non scrive mai a parole la classe di un job di fazione: la indica con il
  **colore dell'intestazione**, gli stessi colori delle classi dei PG (p.112, "same class (color)"): rosso
  Heavy, arancio Skirmisher, verde Leader, blu Artillery, grigio Mob. Il testo estratto perde i colori, quindi
  le classi erano state dedotte a occhio, e le varianti avevano seguito la base sbagliata → letto il colore
  sotto ognuna delle 775 intestazioni del capitolo (pp.287-501) e confrontato con i 376 foe del pack. Tutte le
  correzioni della lista di Maar sono confermate dal colore; in più sei casi che non aveva elencato (Brawler
  Heavy; Imperial Demolitionist e Imperial Spy Skirmisher; Cultist, Vile Darter e Giant Insect del Fetid Idol).
  Ogni foe che cambia classe prende le stat base della nuova (p.298), i tratti base (Guard / Skirmisher e Dodge
  / Slip e Aetherwall / Mob, e l'azione Diaga dei Leader) e perde quelli della vecchia; le voci specchiate nel
  compendio Foe Abilities seguono. Restano i valori stampati nel libro: HP (Arkitek 64, Kinfisher 64, i Jotunn
  Elite 56/80), Armor 10 del Megacrab, le stat proprie dei fedeli del Fetid Idol (che usano d8 e fray 3
  dell'idolo, p.440). Il VIT invece è sempre quello della classe (p.290). La regola "variante = classe della
  base" di luglio resta valida (p.314): era sbagliata la classe di molte basi. Controprova: dopo la
  correzione ognuna delle nove fazioni ha **esattamente 6 foe per classe** (il job e le sue 5 varianti), come
  dice p.314 ("a unique job for each class. Each has a number of variants"); prima gli Hob avevano 17
  Artillery e 2 Heavy.
  **Nota**: questo cambia anche la famiglia Slab dei Lowlander (Slab, Mule, Canker, Snork, Slaughterer →
  Heavy), che il 20 settembre si era deciso di lasciare Artillery perché "il manuale non dà le classi": il
  colore rosso delle intestazioni dice Heavy. Backup in `icon-compendium-audit/backups/foes.1790777974704`.
- **Goons e Villager erano foe normali** → sono mob (intestazione grigia, p.371 e p.322); Red Worm e Shinobi
  erano mob e sono Artillery e Skirmisher.
- **Summon nel compendio Foes**: Combat / Repair / Shield / Turret Automaton, Munition, Targeting Reticle,
  Torpedo e Soul Fragment sono riquadri di summon delle legend Veridian, Crimson e Azurian Weapon e
  Arkenlich, non job → tolti; il loro testo completo è già nella legend (controllato frase per frase).
- **Lord Evictor, Prelictor e Vexator** doppioni della legend **Dread Lords** (p.341), che li contiene già → tolti.
- **Guilder, Islander, Leggio non sono foe**: sono Great Culture dei Folk, da mettere su un foe base (p.315,
  "use basic foes and apply the Kin template and Great Culture trait of your choice") → tolti; le loro regole
  restano nel compendio Foe Abilities come "Faction: Folk — Great Culture: …".
- **Atrophic Grave e Churn Baron non erano Elite** pur stando nella sezione "Unique Elites" → Elite, HP 80
  stampato.

### Riorganizzazione

- **Compendio Foes per fazione**: ogni fazione ora ha Artillery / Heavy / Leader / Skirmisher (i job e le loro
  varianti), **Mobs**, **Uniques** (i foe unici con nome) e **Uniques / Elites**, come nello schema proposto da
  Maar. I Folk sono tutti unici (p.315) e stanno in Folk / Uniques; i fedeli del Fetid Idol in Lowlander /
  Legend Adds; Basic Jobs ed Elite Foes tengono le cartelle per classe ("Mob" diventa "Mobs"). Legends e Summons
  restano nei loro compendi. 376 → 362 foe.

## 22 settembre 2026 — Debug di Edoardo (versione 1.6.1)

Sette segnalazioni in fila: tre cose date per fatte che non lo erano del tutto, la lavagna degli orologi che
non si poteva usare e un ritocco alle tab. Schema del mondo 14 → 16 (migrazioni 15 e 16).

### Bug

- **Butcher nella cartella sbagliata**: il compendio Foes lo elencava ancora sotto `Lowlander / Artillery`
  pur avendo la scheda da Heavy → la correzione del 20 settembre aveva cambiato i dati dell'attore ma non il
  campo `folder`, e il pack è ordinato per fazione/classe → spostato in `Lowlander / Heavy`; il tratto Guard
  creato da quello script, finito in `Actions` perché copiava la cartella del primo item del Butcher, è
  passato in `Traits`. Lo script ora controlla i due pack da cima a fondo: unico attore fuori posto su 376.
- **Valori AP ancora più alti di uno oltre il livello 0**: la migrazione 12 poteva restituire il punto di metà
  barra solo ai PG rimasti a livello 0, perché il level up azzera il flag che lo registrava → il totale viene
  ricostruito da quello che il sistema concede davvero (2 della creazione, tabella p.241, +2 per ogni job in
  più, un punto per ogni livello completato) e chi ne ha esattamente uno in più lo restituisce (migrazione 15);
  chi non torna con i conti viene elencato in console e lasciato stare. Bottone sulla tab Notes per le schede
  importate dopo la migrazione.
- **Skill Rank sempre "OVER"**: il contatore confrontava i pallini spesi con `skillRanksTotal`, un accumulatore
  che cresce **solo** dentro il wizard del level up → un PG importato o costruito a mano restava fermo a 0 e
  leggeva "over" per sempre → il monte punti ora viene dal livello secondo la tabella p.241, con il bivio dei
  livelli 4/8 dedotto dai bond power sulla scheda; la migrazione 16 allinea i PG esistenti (non abbassa mai).
- **Scheda Clock inutilizzabile**: la testata non rispondeva ai click e il testo era tagliato a sinistra →
  `.icon-band` è lo sfondo diagonale (ha `pointer-events: none`, un `clip-path` e margini negativi di 12px) e
  il template ci aveva messo dentro titolo e bottone invece che sopra → testata rifatta come quelle di
  Foe/Legend/Summon. Nello stesso giro: gli orologi **segreti** non vengono più cancellati quando un giocatore
  con permesso di modifica tocca la lavagna (la sua form arrivava con dei buchi e l'ArrayField li leggeva come
  "cancellati"), i segmenti non sembrano più cliccabili a chi è in sola lettura, e una taglia fuori dalle
  standard non viene più riscritta.
- **Aetherwall mai attivo sui PG**: il dimezzamento automatico oltre range 2 scattava solo sui foe Artillery →
  il controllo leggeva `system.traits` e `foeClass`, che esistono solo sugli NPC, mentre Aetherwall è anche un
  tratto della classe **Wright** (p.113) e sui PG vive come item → ora riconosce entrambi. È *resistance*, non
  cover: dimezza qualsiasi cosa arrivi da oltre range 2, non solo gli attacchi a distanza. Verificato col
  de-columniser che il glossario (p.105) dice davvero "Unerring — Ignores cover and aetherwall": citazioni di
  pagina corrette (erano p.104, True Strike è p.117).
- **Avviso degli AP non spesi invisibile**: l'avviso c'era ma viveva dentro la sezione "New abilities" del
  passo 2 del wizard, che si apre sul passo 1 e che si nasconde quando non c'è più niente da prendere → ora
  compare nel passo 1 (riquadro nella griglia dei guadagni + paragrafo), nel riepilogo del passo 2 anche ai
  livelli che non danno AP, e sopra i selettori. La card di metà barra (7 XP) dice quanti punti restano in
  totale e dove spenderli, invece del solo "+1 AP granted".

### Interfaccia

- **Tab della scheda**: la linea sottile fra i nomi si leggeva ancora come una barra unica → ogni nome sta in
  una scatoletta con bordo su quattro lati, sfondo proprio e stacco fra una e l'altra; l'attiva è dorata con
  una barretta sopra, presente ma trasparente sulle inattive così non salta nulla cambiando tab. Vale per le
  schede PG, Foe, Legend e oggetti.

## 20 settembre 2026 — Debug + wishlist di Edoardo (versione 1.6.0)

Giornata lunga: dieci bug segnalati uno a uno, le quattordici richieste della wishlist e la pulizia dei dati
emersa lavorando. Schema del mondo 8 → 14 (migrazioni 9-14).

### Bug

- **Encounter Designer illeggibile con tanti PG**: con ~40 attori di tipo PG la finestra non scorreva e il passo
  "Encounter" spariva → la riga della party era `auto` nella griglia e la lista dei ritratti non aveva un box di
  scorrimento (le altre due liste sì), con `overflow: hidden` sulla finestra → i ritratti stanno in un riquadro
  alto ~4 righe che scorre, la riga dell'incontro ha un minimo garantito, e le posizioni di scorrimento non
  saltano più al re-render (`scrollable` sulle parti).
- **Abilità `multimark` senza il bottone 🎯**: 120 azioni di foe/legend non lo mostravano → il controllo cercava
  solo il tag esatto `mark` → `markFromTags()` riconosce anche `multimark`/`multi mark` e, come dice il manuale
  (p.95, "each ability typically places only one mark"), un'abilità multimark **non** cancella i mark che ha già
  piazzato. Tooltip nuovo sul chip.
- **Pallini del wizard di creazione finti**: si illuminavano al passaggio del mouse ma non facevano niente → la
  classe `.icon-dot` porta cursore e animazioni da elemento cliccabile, ma nel wizard nessuno li aveva collegati
  → cliccando il pallino N l'azione va a N (e ri-cliccando l'ultimo pieno torna indietro di uno, come sulla
  scheda); il 4° pallino è dichiaratamente inerte perché a livello 0 il cap è 3 (p.241).
- **Level up senza controlli**: si poteva confermare lasciando vuoto il dot d'azione o il Bond Power → il submit
  saltava i campi vuoti come fa con gli AP, che però sono un serbatoio e si spendono dopo → contatore "1 to pick"
  live, riepilogo rosso sopra il bottone e Confirm che rifiuta finché manca qualcosa (con eccezione quando non
  c'è davvero niente da scegliere).
- **Valori AP più alti di uno**: il bonus di metà barra (7 XP) veniva dato anche a livello 0 → il manuale lo dà
  "at level 1 and higher" (p.112) → dato solo dal livello 1; la migrazione 12 lo toglie ai PG ancora a livello 0.
- **Skill Rank sempre "OVER"**: il contatore confrontava tutti i pallini delle azioni con i soli dot dei level up
  → mancavano i 6 della creazione (2 del bond + 4 da distribuire, p.241) → inclusi nel totale, con la riga
  "(6 from creation + N from level ups)".
- **Tsunami senza template**: l'area (medium blast) sta nella prosa e non nei tag → il bottone 📐 leggeva solo i
  tag → `abilityArea()` legge anche il testo dell'abilità: 20 abilità (Fairy Ring, Ätherwand, Blood Grove, Party
  Favor…) ora hanno il template.
- **Tsunami, blocchi sbagliati**: "Infuse 1: STORMLASH" senza testo, la frase "All your Tsunamis disappear…"
  dentro Collide e Collide stampato due volte → un'unica descrizione lunga in cui "Free Action:" faceva da
  etichetta e il Collide era scritto sia nel testo sia nel campo → testo di p.233 e `blockOrder` fissato.
- **Finishing Blow senza tooltip**: le keyword nel testo hanno la regola al passaggio del mouse, le etichette dei
  blocchi no → i template stampavano l'etichetta nuda → ogni etichetta che è una regola (Finishing Blow, Charge,
  Exceed, Collide, Slay, Comeback, Stance, Mark, Infuse, Interrupt…) porta la sua spiegazione.
- **Formattazione di Blitz / Strafe Shot / Cryo / Battering Ram**: Cryo era già giusto (il lavoro sull'ordine dei
  blocchi non era mai stato rilasciato); Blitz stampava il blocco Slay due volte; Battering Ram e Strafe Shot
  avevano l'etichetta unita al contrario → il manuale non ha un ordine unico ("Collide or Heroic" su p.122,
  "Finishing blow or Exceed" su p.155) → 25 abilità riallineate confrontando il testo del manuale, verificando
  che le coppie restino su una riga sola.
- **Butcher (Lowlander) Artillery invece che Heavy**: è una variante Chapter 1+ dello Slab (p.430) e aveva
  ereditato la classe → statline Heavy di p.298 (VIT 10, HP 40, DEF 6, fray 4, d6, armor 2) e tratto Guard al
  posto di Slip/Aetherwall, specchiato nel pack `foe-abilities`; migrazione 9 per i Butcher già importati.
- **Testo del Salt Sprite dentro Rime (e Geyser)**: il riquadro "Summons" della job (p.232) era finito nel testo
  delle due abilità → le sue regole vivono già sull'attore Salt Sprite del pack `summons` → tolto, migrazione 10.
- **Sealed non bloccava niente**: un personaggio sealato poteva comunque infliggere status dai bottoni →
  `inflictStatus` guardava solo il bersaglio → controllo al click (p.104) più una riga rossa sulla card. Restano
  liberi il danno legato al save, i mark (non sono status, p.95) e il blocco "Gain".

### Richieste

- **Macro XP su PG scelti**: lista con le spunte nel dialog (i token selezionati partono spuntati), per
  aggiornare chi si è perso la fine sessione.
- **Reference a portata di mano**: bottone 📖 nella barra strumenti Token, per tutti, oltre al menu "..." della
  scheda.
- **Tab della scheda separate**: divisori, spazio e tab attiva con il suo sfondo.
- **Danno piatto** nel dialog del danno (il caso di Harden del Clot) e **tipi di danno**: Pierce, Divine, True
  Strike e Unerring fanno quello che dice p.104 (niente armor, niente dimezzamenti, ignorare Dodge, ignorare
  Cover), non sono promemoria.
- **AP avanzati al level up**: il budget include quelli rimasti dai livelli precedenti, con avviso.
- **Stance come i mark**: bottone 🧘 sull'abilità (una alla volta, p.104) e stance del bersaglio visibile nei
  dialog di tiro.
- **Finishing Blow automatico**: contro un bersaglio bloodied il dialog del danno parte col dado bonus.
- **Aetherwall automatico**: resistance misurata sulla distanza (p.298), con chip e nota; Unerring la ignora.
- **Summon trascinabili** dal pannello dell'abilità alla mappa.
- **Colore delle aure** per personaggio (scelto a mano o colore di classe).
- **Scheda Clock**: nuovo tipo di attore, lavagna di orologi con segmenti cliccabili, colore, nota, 💬 in chat e
  orologi segreti per il GM.
- **Infuse dei Wright**: bottone ✨ che scala l'Aether e arma la versione infusa (con rimborso e una sola attiva
  per volta), area della versione infusa proposta dal 📐, e **Alt** per piazzare un template fuori dal raggio.
- **Wild Card del Seer**: una carta toccata da un'area esplode, allarga l'area e sparisce, a catena (p.200).

### Pulizia dati

- Cinque abilità stampavano un trigger due volte (Terraforming, Helix Heel, Aethershard, Blazing Bond, Nothung),
  più Bifröst e Rampant Nail emersi dopo; **Geo** (p.218) e **The Tower** (p.203) avevano il `Terrain Effect:`
  incollato dentro il blocco Area; il riquadro "Summons" di altre quattro job stava in coda a un tratto
  (Darkside, Beast Master, Cheap Trick, Gardener of Kin).
- I 10 casi lasciati dal report del 13 settembre: nove erano già corretti (il report fondeva combo e talenti
  nell'abilità), solo **Raging Wolf** era fuori ordine (l'abilità scavalca il salto di pagina 137-138).
- Il parser riconosce `Infuse N or Slay` e `End your turn and gain Stance:` — senza il secondo, **Ace** perdeva
  la sua riga principale.
- **Refocus** non azzera più gli Skill Rank guadagnati salendo di livello; area letta dal testo anche per le
  azioni NPC; chip dei tag NPC con etichetta e tooltip come quelli dei PG.


## 11 settembre 2026 — Playtest di chiusura delle Sessioni 9-14 sul mondo di Maar (build 1.5.1)

- Chiuse anche le caselle rimaste delle Sessioni 1-8: jobs e burden che sopravvivono al form, Party Resolve +1 a inizio
  round (funziona; sul mondo di Maar la house rule `hrPartyResolveAutoIncrement` è spenta), Armor 2 del Warrior, power die
  su Odinforce / Godly Smite / card in chat; mark NPC, scheda item e avviso senza griglia già coperti dal giro esplorativo
  del 9 settembre. Restano solo i test che servono un secondo client o Maar.
- Spuntate le ultime caselle aperte dalla Sessione 9 in poi: auto-hit con Invoke (Attack, 17+) di Ape God (d20 tirato
  solo per l'invoke), relay giocatore → GM del blocco Inflict (già provato il 10 sera), card vecchie (pre-1.3.0) senza
  errori e Apply su un attore cancellato gestito con una notifica. I tre ✗ delle Sessioni 12-13 sono segnati come
  corretti dalla Sessione 14. Nessuna modifica al codice.

## 10 settembre 2026 — Sessione 14: fix dal playtest del 10 settembre (versione 1.5.1)

- **Playtest della Sessione 14** (stessa sera, build 1.5.1 caricata sul server di Maar): 11 caselle su 11 ok, nessun errore in
  console. Unico residuo cosmetico: le card d'attacco NPC mostrano i tag grezzi ("true-strike") invece dell'etichetta.
- **Il tag "true strike" di un'abilità non ignorava l'Evasion**: il Warrior con Cleave (true strike) faceva tirare il d6
  al PG → `ignoresEvasion(attacker)` guardava solo lo status sull'attaccante → ora riceve anche i tag dell'attacco
  (`tagKey` normalizza "True Strike" / `true-strike` / oggetti {raw,label}); `combatRoll` e il dialog d'attacco li
  passano; FoeSheet e LegendSheet passano `action.tags` a `combatRoll` (le card NPC mostrano quindi i chip dei tag).
  Nota "True Strike (tag)" / "Unerring (tag)" per distinguerlo dallo status (p.117).
- **"Applies to" nella tab Relics non compariva mai**: la riga cercava `relicReminders` sugli Item grezzi
  (`context.abilityItems`) → ora usa `context.abilityDetails`, che li hanno.
- **Card dei trait NPC senza blocco Inflict / Gain / Effects**: Titanfall dei Jotunn è un trait e il bottone "🎲 💥 6 / 3
  on a successful save" non era raggiungibile → `postNpcTraitCard` accetta `statusHtml`, FoeSheet e LegendSheet lo
  passano, `trait-card.hbs` lo rende.
- **Cosmetici del playtest**: etichetta "EVASION" che andava a capo nella chat stretta (`white-space: nowrap`); card
  "MISS — evaded" con il d20 in vista mentre la nota diceva "no attack roll" → riga dei dadi sbiadita e nota "the d20
  above doesn't count"; dialog d'attacco con Rigoletto Aspect attivo che diceva "rolls 1d6 (3+)" → "evades
  automatically (Rigoletto Aspect, this turn)"; riga "⚙ Dodge … no damage from Miss / Area" del dialog del danno ora
  visibile solo con esito Miss / Area; "Hold the Line!" dà anche Resistance nel blocco Gain (`GRANTABLE`); testi del
  save con danno ("Saved — reduced damage (…)", "Failed — full damage (…)", "Saved — no damage") al posto di "Damage:
  … avoided."; dialog d'attacco dei summon riscritto con `promptAttackMods` (stile PG/Foe, boon/curse dal summoner via
  l'opzione `modsActor`).

## 10 settembre 2026 — Playtest delle Sessioni 12 e 13 sul mondo di Maar (build 1.5.0)

- **Playtest in una sessione dedicata** su foundry.codrillo.it (scena "test", copie TEST poi cancellate): Sessione 12
  15/16 ok, Sessione 13 21/23 ok. Dettagli e caselle in `PLAYTEST.md` ("Esito playtest del 10 settembre 2026").
- **Bug trovati, non ancora corretti** (TODO Sessione 14): il tag `true strike` di un'abilità/azione non ignora
  l'Evasion (solo lo status lo fa); la riga "Applies to" della tab Relics non compare mai; le card dei trait NPC
  (💬 su un trait, es. Titanfall dei Jotunn) non hanno il blocco Inflict/Gain/Effects. Più sette ritocchi cosmetici.
- Nessuna modifica al codice: la build 1.5.0 caricata sul server è quella del commit di Sessione 13.

## 9 settembre 2026 — Sessione 13: tutti i follow-up delle sessioni 9-12 (versione 1.5.0)

- **Invoke (Gambit) delle reliquie** (follow-up Sessione 9): nella tab Relics ogni reliquia con "Invoke (Gambit)" in un
  rango sbloccato ha il riquadro "✦ Invoke Gambit" con il testo; il click posta la card in chat e conta l'uso per il
  combat corrente (p.114: una volta per combat; due per Sleipnir Aspect, Tower of Barbs Aspect e Ironsoul III con la
  nota "regain"); Hermes Aspect riscrive il gambit. Il conteggio è un flag sull'item legato all'id del combat, quindi si
  azzera da solo al combat successivo. `gambitInvokes()` in `relic-reminders.mjs`.
- **Promemoria delle reliquie legati al turno**: tabella `RELIC_TURN_REMINDERS` (Apophis I/II, Erenbrass I/II/III/Aspect,
  Ironsoul e Cloudpiercer Aspect, Mistborn III, Storm Lord I, Trollhide I/II, Byrax III, Scheherezade I, Wyrmtooth
  Aspect, Paleblood I) → il tracker posta una card "Start of turn" / "End of turn" / "Start of combat" / "End of round N"
  / "First turn of combat" per il PG interessato. Solo i PG con reliquie di quel tipo ricevono card.
- **Tab Relics: "Applies to"**: sotto ogni reliquia l'elenco delle abilità equipaggiate che hanno una sua riga ✦.
- **Titan Armament** (follow-up Sessione 10, p.448): bottone "Titan" nelle righe dei Jotunn dell'Encounter Designer →
  +1 punto, HP ×1.5, un turno in più (trait "Titan Armament" sull'attore creato e flag `extraTurns` letto da
  `IconCombat.turnsFor`); indicato nella card in chat.
- **Riserve proposte dal tracker**: al passaggio di round il GM riceve una card sussurrata "Reserves due — end of round
  N" con il bottone "Reveal reserves" per i token nascosti con riserva a quel round (una volta per round).
- **Nilfling**: il manuale (p.449, "Thinblood") conferma che non è Elite: il pack era giusto.
- **Showdown del Freelancer** (follow-up Sessione 11): "Choose a foe in range 3 and become immobile" non è più un
  Immobile da infliggere al nemico: l'oggetto dell'imperativo non è il soggetto di "become" → è un "Gain" su di sé.
- **Blocco "Gain"** sulle card: status positivi (o negativi su se stessi) che il testo dà all'utente ("gain evasion
  until the start of your next turn", "you are pacified", "Become intangible") o agli alleati ("allies in range 2 gain
  sturdy" → bottone "👥" applicato ai token targettati). Legge anche i trait/azioni NPC ("The Trooper and its allies
  … are sturdy and have counter"). Vocabolario `GRANTABLE` in `ability-statuses.mjs`.
- **Blocco "Effects"**: promemoria (chip, nessuna automazione) per gli effetti non-status letti dal testo: shove/pull
  N, "unable to … until …", "+N boon/curse on …" (non quelli del save, già gestiti), vigor, dash/rush/teleport/fly N,
  "take a wound". 2162 chip sul corpus dei pack.
- **Danno legato al save**: "must save or take 2[D]+fray and become stunned, or just fray on a successful save" → il
  bottone dello status porta "💥" e, dopo il save, posta la card del danno giusta (fallito: 2[D]+fray; riuscito: fray)
  con Apply solo per quel bersaglio; senza status ("must save or take 6 damage, or 3 on a successful save",
  Titanfall) c'è un bottone rosso "🎲 💥 6 / 3 on a successful save"; "twice" / "three times" → più card. [D]/fray
  dell'attaccante (i summon usano il summoner). `postSaveDamage()` in `inflict-status.mjs`,
  `targetsOverride` in `postAbilityDamageCard`.
- **Dodge sul save riuscito** (p.144): le card "Successful save" hanno esito `save-success` → Apply su un bersaglio
  con Dodge non toglie HP.
- **Rigoletto** (follow-up Sessione 12; la reliquia dell'evasion nel pack si chiama così, non "Spinning Top" come
  scritto nella Sessione 12 — corretto): II → nota "deal 2 damage to the attacker" quando evade il portatore o un
  alleato entro 2 spazi; III → il portatore con Evasion fa tirare l'evasion (solo con un 6) agli alleati entro 2
  spazi che non ce l'hanno; Aspect → il gambit "evasion always successful this turn" arma un flag per il round e il
  blocco Evasion mostra "✦ evaded (Rigoletto Aspect)" senza d6.
- **Evasion/Dodge condizionali dei foe**: i trait "Has Evasion while bloodied", "unless suffering from a status",
  "While in stealth, has evasion and dodge", "Dodge" vengono valutati dallo stato dell'attore (bloodied, stealth,
  flying, nessuno status negativo): l'evasion viene tirata e Dodge azzera i Miss senza mettere lo status a mano; le
  condizioni non leggibili restano chip ⚠.
- **Cover dalla mappa**: token adiacente a un muro (porte aperte escluse) → chip "Cover? wall" nei dialog e sulle
  righe della card del danno, solo promemoria (il lato dell'attacco non è calcolato).
- Restano in TODO le due domande per Maar (riuso degli attori del mondo nel deploy, icone token dei foe).

## 9 settembre 2026 — Sessione 12: automazione difensiva — Evasion, Dodge, Cover / Resistance (versione 1.4.0)

- **Evasion andava tirata a mano** (wishlist Maar: "automazione difensiva"): nuovo modulo
  `module/combat/defenses.mjs`. Quando si tira un attacco (PG, Foe, Legend, Summon), per ogni token targettato con
  lo status Evasion viene tirato 1d6 **prima** del d20 (p.146): con 4+ (3+ se il bersaglio ha la reliquia Spinning
  Top I+) l'attacco lo manca. La card d'attacco ha un blocco "Evasion" con il dado e l'esito per bersaglio; se
  tutti i bersagli evadono il risultato è "MISS — evaded" (niente tiro d'attacco: blocchi Hit/Exceed/Crit sbiaditi,
  Invoke delle reliquie non mostrati), altrimenti l'esito normale vale per gli altri e nel blocco Inflict le righe
  di chi ha evaso sono sbiadite. True Strike / Unerring sull'attaccante ignorano l'Evasion (p.117) con una nota.
  Gli auto-hit non passano dall'Evasion (p.113). Il dialog d'attacco avvisa ("⚙ Evasion: Warrior rolls 1d6…").
- **Cover / Resistance dimezzavano solo se l'attaccante ricordava di spuntare la casella**: ora "Apply" sulla card
  del danno legge gli status del bersaglio **in quel momento** (p.92: "cover is determined when and where damage is
  applied") e dimezza da solo, una volta sola, dopo l'armatura; la card "Damage Applied" dice "halved (Cover)".
  Se la casella "Resistance / Cover ½" era già spuntata sul tiro la card lo ricorda (`halvedOnRoll`) e Apply non
  dimezza due volte. Il bottone "½" resta l'override manuale. Vale anche per il relay giocatore → GM.
- **Dodge non faceva niente**: su una card di danno con esito Miss o Area, "Apply" su un bersaglio con Dodge non
  toglie HP e posta "no damage — Dodge — immune to damage from missed attacks / area effects" (p.144); il bottone
  diventa "✓ Dodged". (Il caso "successful saves" arriverà con il collegamento save → danno, già in TODO.)
- **Chip difensivi**: nei dialog d'attacco e del danno ogni bersaglio mostra i suoi status difensivi (Evasion N+,
  Dodge, Cover ½, Resistance ½, Stealth, Intangible) e, per Foe/Legend, un chip oro "⚠ Nome trait" per i trait
  che citano evasion/dodge/cover/resistance senza che lo status sia attivo (es. "Slippery: Has Evasion while
  bloodied"): promemoria per il GM di mettere lo status a mano. Sulla card del danno le righe dei bersagli hanno
  gli stessi chip (compatti), ricalcolati a ogni render.
- API per le macro: `game.icon.rollEvasion`, `defenseProfile`, `damageMitigation`. Verificato offline (Node, 28
  controlli su attori finti); il playtest in Foundry è in `PLAYTEST.md`.

## 9 settembre 2026 — Playtest delle sessioni 9 e 10: l'Encounter Designer non si apriva

- **Encounter Designer che non si apre** (`Cannot set property state of #<ApplicationV2> which has only a getter`):
  la finestra teneva i suoi dati in `this.state`, ma in Foundry v13 ApplicationV2 usa quel nome per il proprio stato
  di rendering (sola lettura) → rinominato `this.enc` in `module/apps/EncounterDesigner.mjs`. Il bug era invisibile
  nei controlli offline (Node non ha ApplicationV2).
- **Dopo "Clear" il campo di ricerca restava scritto** mentre il filtro era azzerato: AppV2 conserva il valore del
  campo a fuoco durante il re-render → il campo viene svuotato esplicitamente dopo il render.
- **Riga dell'encounter con il nome schiacciato a una lettera** ("W…"): i controlli (quantità, Elite, riserva, costo,
  ✕) occupavano tutta la larghezza → ora vanno a capo sotto il nome (CSS `flex-wrap`).
- **Token dei foe creati linkati**: `IconActor._preCreate` linka il token prototipo di ogni nuovo attore, quindi la
  riga `actorLink = false` del designer non aveva effetto; tolta, con un attore per corpo il token linkato è giusto.
- Playtest (sul mondo di Maar, scena "test", copie TEST cancellate a fine prova): Sessione 9 tutta
  verificata (reminder per rango, Invoke acceso su un 17 grezzo, soglie Aspect, attacco base, round 3/5); Sessione 10
  verificata per intero dopo il fix (party, budget, filtri, Elite, Legend, riserve, Random fill, salvataggi, chat,
  attori, deploy, Reveal reserves). Dettagli in `PLAYTEST.md`. Emerso: nel pack `foes` il Nilfling (Jotunn) non è
  segnato Elite, da verificare sul manuale (`TODO.md`).

## 9 settembre 2026 — Sessione 11: status inflitti letti dal testo, blocco "Inflict" sulle card, save 10+ (versione 1.3.0)

- **Infliggere uno status voleva dire leggere il testo, aprire la scheda del bersaglio e cliccare nella tab
  Conditions, tirando il save a mano** (wishlist Maar: "automazione effetti/save offensiva"): nuovo parser
  `module/combat/ability-statuses.mjs` che legge dal testo di abilità PG, action/interrupt/round action di Foe e
  Legend e azioni dei summon gli status negativi da infliggere ("[D]+fray and foe is dazed", "must save or be
  stunned", "become blinded+", "gain hatred of you") e da quale blocco vengono (Hit, Miss, Effect, Collide,
  Exceed, Chapter 2+, Talent I…). Riconosce le forme del manuale sui save: "save or …" (applicato se il save
  fallisce), "… on a successful save" (applicato se riesce, p.es. Swindle), "Foes can pass a save to avoid this
  effect", "+1 curse on the save", "Bloodied foes fail the save", il "+" degli ongoing. Ignora gli usi come
  aggettivo o condizione ("Dazed foes take fray damage", "against weakened or slashed foes", "if the target is
  stunned", "immune to…"), gli status su se stessi ("you are pacified", "the Cantrix is immobile") e sugli
  alleati, le righe delle statistiche dei summon. Verificato offline (Node) su 32 frasi campione e sull'intero
  corpus dei pack (1477 testi con status su 6257; script in `icon-compendium-audit/session11/`).
- **Blocco "Inflict" sulle card in chat**: card del tiro d'attacco (PG, Foe, Legend, Summon), card "Auto-hit",
  card 💬 delle abilità PG e delle action/interrupt/round action NPC. Una riga per token targettato (o "🎯 Current
  targets" se non c'era nessun target: applica a chi è targettato al momento del click), un bottone per status
  raggruppato per blocco di origine; sulla card d'attacco i gruppi degli esiti non raggiunti (Miss su un hit,
  Exceed sotto 15, Crit) restano cliccabili ma sbiaditi. "🎲" segna gli status con save, il bordo doppio quelli
  che si applicano su un save riuscito, il bordo oro gli ongoing "+". Talent/Mastery solo se sbloccati; con il
  Combo armato si legge il testo Combo.
- **Click → save → applica** (`module/combat/inflict-status.mjs`): senza save applica subito via `applyStatus`
  (già presente → "is already X", oppure upgrade a ongoing se il testo dice "+"); con save apre un dialog con la
  frase del testo, boons/curses (precompilati dal testo), una carica Blessed del bersaglio (+1 boon, consumata),
  la spunta "Automatic failure" già attiva quando il bersaglio è bloodied/… e il testo lo dice, e "Already
  rolled — failed/succeeded" per chi ha già tirato. Il save usa `saveRoll` (1d20 + boons − curses, 10+, p.94) con
  sottotitolo "Abilità — attaccante → bersaglio" e testi "Saved! X avoided." / "Failed — X applied." (quelli di
  fine turno restano "cleared / persists"). Hatred passa da `applyHatred` → "Hatred of <attaccante>" (p.104).
  Card blu "X is now Dazed — Haymaker (Brawler), save 7" e bottone "✓ Dazed" / "✓ saved" / "→ GM".
- **Giocatori senza permessi sul bersaglio**: il tiro avviene sul loro client, l'applicazione viene inoltrata al
  GM attivo via socket (`type: "inflictStatus"`, stesso canale dei mark; Hatred usa il relay dei mark).
- API per le macro: `game.icon.parseInflictedStatuses / abilityStatusEntries / npcActionStatusEntries /
  statusBlockHtml / inflictStatus`. Versione 1.3.0.
- **Playtest della sera stessa** (sul mondo di Maar, scena "test"): 14 controlli su 16 passati alla
  prima prova — applicazione diretta, save fallito/riuscito con carta "Save vs X" e sottotitolo, carica Blessed
  consumata (+2 nel totale), auto-fail sui bloodied con Hatred of <demone>, "pacified on a successful save",
  "Already rolled", upgrade a ongoing, riga "Current targets", gruppo Exceed sbiadito su un 14, nessun falso
  bottone su Farmer/Hessian/Cantrix. Non provati: relay da un secondo client, card Auto-hit. **Fix**: il simbolo
  "⚄" non esiste nel font della chat (quadratino) → 🎲.
- Noto (accettato): "Showdown" del Freelancer ("Choose a foe in range 3 and become immobile", riferito a sé)
  mostra un bottone Immobile di troppo; i danni "on a failed save" restano manuali (pipeline del danno).

## 9 settembre 2026 — Sessione 10: Encounter Designer (versione 1.2.0)

- **Preparare un incontro voleva dire contare a mano i punti del p.292 e importare i foe uno a uno dal compendio**
  (wishlist Maar: "scegli i PG, budget suggerito, pesca da fazioni/roster, toggle elite"): nuova finestra GM
  **Encounter Designer** (`module/apps/EncounterDesigner.mjs`, template in `templates/apps/encounter/`), aperta
  dal bottone "♞ Encounter" in cima alla sidebar Actors, dalla macro "ICON: Encounter Designer" (pack `macros`) o
  da `game.icon.openEncounterDesigner()`.
- **Party e budget**: si scelgono i PG (preselezionati quelli con token sulla scena) → budget = giocatori + 1
  (p.292), con la "one-fight rule" (2 × giocatori, resto in riserva), l'aggiustamento ±1-2 punti e il cap di
  capitolo (auto = capitolo più alto del party) che nasconde i foe delle varianti Ch2+/Ch3+. La banda mostra
  punti spesi / budget e i turni NPC contro i turni PG (l'action economy del p.292).
- **Roster**: tutti i 376 foe e 28 legend del compendio (più i foe già importati nel mondo) filtrati sul client per
  fazione, classe, capitolo, sorgente e testo (nome, fazione, trait) senza ri-render, quindi la ricerca non perde
  il focus. Costo in punti su ogni riga, 👁 per aprire la scheda, "+" o doppio click per aggiungere.
- **Incontro**: quantità per riga, bottone **Elite** (p.299: costo 2, HP ×2, 2 turni; bloccato sui Jotunn già
  Elite, sui mob e sui Legend), riserva "end of round 2/3", Legend = tutto il budget (uno solo), avvisi over
  budget. **🎲 Random fill** riempie i punti rimasti pescando a caso dalle righe visibili del roster (prima si
  filtra la fazione). Salvataggi per nome in un world setting (Save / Load / ✕ / New).
- **Uscite**: 💬 card sussurrata ai GM con la ripartizione; 📥 attori in una cartella "Encounter: <nome>" con un
  attore per corpo ("Warrior 1", "Warrior 2"), template Elite applicato (HP ×2, trait "Elite"), membri del mob =
  2 × giocatori (p.298) e HP del Legend scalati sui giocatori (50/giocatore, min 100); 🗺 Deploy = attori + token
  disposti in file al centro della vista + combat della scena con i foe "on map" (e i token del party, opzione
  "+ party"). Le riserve sono token nascosti fuori dal combat: il bottone "👁 Reveal reserves" sulla card li
  scopre e li mette nel tracker al momento giusto.
- Verificato offline (Node): formule del budget sugli esempi del p.292 (3 giocatori → 4 foe, 1 elite + 2 foe,
  1 legend) e compilazione dei sei template Handlebars. Emerso, in `TODO.md`: Titan Armament (+1 punto) come
  opzione sui Jotunn, riserve automatiche a fine round dal tracker.

## 9 settembre 2026 — Sessione 9: Relic integration (reminder sulle abilità, Invoke sugli attacchi)

- **Le reliquie stavano solo nella tab Relics e ci si dimenticava di applicarle** (wishlist Maar: "Byrax I →
  Whenever you refresh this stance, Dash 1"): nuovo modulo `module/combat/relic-reminders.mjs` con una tabella
  reliquia → rango → condizione → testo per tutte le 40 reliquie del pack. Sul pannello di ogni abilità (tab
  Combat) e sulla card 💬 in chat compaiono righe viola "✦ Byrax I: Whenever you refresh this stance, dash 1",
  solo per i ranghi sbloccati (`currentRank`) e solo sulle abilità che c'entrano (tag `stance`, attacchi, testo
  con "cure"/"shove"/"delay"/"teleport", blocco Charge/Slay/Exceed, versione Combo, range ≥ 3…). Alcuni testi
  cambiano col rango (Dominus I dash 2 → 4 al III, Huntress "you marked" → "any marked" ad Aspect, Skipjack I
  "Range N+1" calcolato dal tag).
- **Invoke (Attack, N+) sul tiro d'attacco** (p.245: conta il d20 grezzo, non il totale): la card del tiro mostra
  una riga per ogni reliquia con un Invoke d'attacco sbloccato, accesa in oro con l'effetto se il d20 raggiunge
  la soglia, grigia "not triggered" altrimenti. Le soglie abbassate dall'Aspect (Paleblood 16+ → 12+, Conquering
  King 18+ → 15+) vengono lette dal testo "becomes (Attack, N+)"; le note dell'Aspect di Ape God / Scheherezade /
  Silver Rabbit si aggiungono in corsivo quando scatta. Gli attacchi auto-hit tirano comunque 1d20 solo per il
  check (come dice il manuale) e gli attacchi base hanno le stesse righe.
- **Reminder legati al round** (Conquering King I/II, Domain e Skipjack Aspect, Arenheir III): sul pannello sono
  sempre visibili col prefisso "Round 5+"; sulla card del tiro compaiono solo quando il combat è a quel round,
  con il valore corrente ("Round 3: exceed on 13+, crit on 18+").
- Tutto è promemoria, niente automazione: i numeri di tiro e danno non cambiano. Foe, Legend e Summon non hanno
  reliquie → card invariate. Verificato offline (Node) su tutti i 40 relic del pack: 18 Invoke d'attacco letti
  correttamente ad Aspect, nessuna chiave della tabella fuori dal pack.
- Emerso, in `TODO.md`: Invoke Gambit con bottone e conteggio, promemoria di inizio/fine turno, elenco delle
  abilità toccate sotto ogni reliquia.

## 9 settembre 2026 — Residui del playtest: 2 fix

- **End encounter puliva i template della scena visualizzata**, non di quella del combat: se il GM guardava un'altra
  scena, spariva la roba sbagliata. Ora usa la scena del combat.
- **Wizard di creazione**: al Finalize le abilità scelte devono appartenere al job scelto (le card degli altri job sono
  nascoste, ma via DOM si potevano spuntare). Ora un errore chiaro invece di un PG incoerente.
- Verificati: Shift+rotella per il lato della Line larga, wizard di creazione completo, reset dei power die a fine
  combat, dialog danno senza bersaglio e sul Legend.

## 9 settembre 2026 — Socket di sistema mai attivato: i relay giocatore → GM non hanno mai funzionato

- **`system.json` non aveva `"socket": true`**: Foundry non inoltrava i messaggi `system.icon-system`, quindi tutto ciò
  che un giocatore manda al GM (Apply Damage su un token non suo, Party Resolve dal tracker, richiesta di
  attivazione, mark e Hatred su token del GM) arrivava alla notifica "sent to the GM" e poi nel vuoto. Trovato
  provando da un client Player con il GM collegato. Aggiunto `"socket": true`; versione del sistema → **1.1.0**.
  **Serve un riavvio di Foundry** (o Return to Setup e riapertura del mondo) perché il manifest venga riletto.
- **"▶ Take turn" mostrato come chevron** sul client Player: una regola più specifica del CSS dei pip lo
  riportava a 16×10 px senza testo. Regola dedicata con la stessa specificità.
- **Chip del mark sul client del marcatore**: quando il GM crea o toglie un mark per conto di un giocatore, la scheda
  del giocatore si aggiorna da sola (hook su create/deleteActiveEffect).
- Verificato con socket attivo, GM e Player insieme: mark, Apply Damage e Party Resolve da Player arrivano al GM.
- Verificato da Player: "▶ Take turn" attiva il turno e "■ End turn" lo chiude (permesso da Foundry v13 per il
  proprietario del combattente), dialog d'attacco con la DEF del bersaglio, target card.

## 9 settembre 2026 — Restyle dei dialog di Attack Roll e Damage Roll

- **Nuovo modulo `module/apps/roll-dialogs.mjs`**, condiviso da PG, Foe e Legend (prima ognuno aveva la sua copia
  con input inline senza stile): banda diagonale del colore della classe (rosso per gli NPC) con ritratto, nome
  dell'abilità, badge del costo e chip dei tag, e a destra il dado ("d20 · crit 20+ · exceed 15+", oppure
  "[D] d8 · fray 4").
- **Card "🎯 Target"** costruita dai token targettati: ritratto, nome, DEF / ARM / HP; con più bersagli si usa la DEF
  più bassa; senza bersagli un suggerimento ("hover + T").
- **Attack**: i modificatori automatici (status, dislivello) sono chip "⚙", boons e curses hanno gli stepper −/+,
  la Defense è precompilata; riga di anteprima live "1d20 + best of 2d6 vs DEF 6 — you need 6 or more…".
- **Damage**: l'esito è un controllo a segmenti (Hit / Crit / Miss / Area con la formula sotto), la versione Combo è
  un chip viola, le mitigazioni (Vulnerable +1, Resistance ½, Weakened −2, Hatred ½) sono chip attivabili,
  stepper per i bonus dice e anteprima "roll 3d8, keep 2 + fray 4 → ½ resistance". Il nome del bersaglio nella
  card viene dai token targettati (non c'è più il campo di testo).
- Foe e Legend passano ora dagli stessi dialog (anche con l'hint Hatred); i valori restituiti sono invariati,
  quindi `combatRoll` e la card del danno non cambiano.

## 9 settembre 2026 — Tracker: i pip di attivazione erano fuori dalla sidebar; "Round {round}"

- **Nessuno vedeva i pip di attivazione** (segnalazione di Edoardo: "i giocatori non hanno pulsanti per prendere il
  turno", e nemmeno il GM li aveva): i pip venivano renderizzati ma la colonna del nome, con i badge ⚡ e i
  controlli, non si restringeva e li spingeva oltre il bordo destro della sidebar (x = 1274 su una riga larga fino
  a 1278). Ora la colonna del nome può restringersi (nome con ellissi, controlli che vanno a capo) e il blocco dei
  pip non si comprime. Verificato sul combat di prova: click sul pip → Asteria attiva, "■" → turno chiuso.
- **"Round {round}" nell'intestazione del tracker**: il nostro helper Handlebars `localize` sovrascriveva quello di
  Foundry ignorando i parametri (`round=…`). Ora usa `game.i18n.format` quando ci sono parametri.

## 9 settembre 2026 — Playtest esplorativo: 4 fix e bottoni "Take turn" per i giocatori

- **Crash a fine round**: l'avviso "All activations are spent" usava `combat.combatants.every`, che le Collection di
  Foundry non hanno (errore in console a ogni fine turno con nessuno attivo). Ora `!some(...)`.
- **Hatred senza bersaglio** (applicato dal HUD core dei token o da mondi vecchi): il dialog del danno diceva
  "Hatred of ?" e pre-spuntava il ½. Ora non pre-spunta e invita ad applicarlo dalla tab Conditions per scegliere
  di chi; il messaggio di fine turno dice solo "Hatred ends".
- **HUD del token**: gli status ongoing mostrano il "+" anche nel pannello.
- **Tracker per i giocatori**: sulla riga del proprio combattente i pip diventano bottoni con etichetta
  "▶ Take turn" e "■ End turn" (il GM tiene i chevron compatti). Risponde alla segnalazione "i giocatori non hanno
  pulsanti per prendere il turno": i pip c'erano ma erano chevron di 16×10 px senza testo. Da confermare con un
  giocatore vero.

## 9 settembre 2026 — Playtest sul mondo di Maar: 9 fix

Primo playtest reale (sul mondo Jade Regent, scena di test con copie dei PG). Tutto il blocco
Hatred/Mark, i template di area e i dati delle sessioni 3-7 funzionano; questi i difetti trovati e corretti:

- **Schede con tutte le tab impilate** (Narrative, Combat, Conditions… una sotto l'altra, pre-esistente dal
  30 agosto): il reset `.icon.sheet [data-application-part]:not(header) { display:block }` aveva specificità più
  alta della regola che nasconde le tab. Aggiunta `.icon.sheet .icon-tab[data-tab]:not(.active) { display:none }`.
- **Template di area: targeting rotto in v13** (`game.user.updateTokenTargets` non esiste più): il template veniva
  creato ma i token non venivano targettati e il flusso si fermava. Ora `Token#setTarget`.
- **Click di piazzamento perso** se sotto il mouse c'era il ControlIcon di un template già sulla mappa: i listener
  di piazzamento sono in fase di cattura e fermano la propagazione del click.
- **Aura che non seguiva il token**: nell'hook `updateToken` di v13 la posizione nuova sta in `changed.x/y`, non
  in `tokenDoc.x`.
- **Keyword "take a wound" e "ongoing status" non evidenziate**: la lookup interna testava le regex con
  lookbehind/lookahead sulla sola parola. Nuovo campo `lookup` per quelle keyword.
- **Mark**: il chip "🎯 Bersaglio ✕" sul pannello del marcatore compariva solo al re-render (ora la scheda del
  marcatore si aggiorna da sola); il testo del mark segue anche etichette come "End your turn and Mark:".
- **"Rush X" ancora sui PG** (migrazione 4 non risultava applicata sul mondo di Maar): migrazione 5 lo rimuove
  per nome. Schema → 5.
- **Costo "2actions" grezzo** nei badge delle abilità, nel dialog d'attacco e nella card: ora "2 Actions",
  "Free Action", "Interrupt 1".
- Nota per Maar: le scene della campagna sono senza griglia; i template di area richiedono una griglia quadrata.

## 9 settembre 2026 — Sessione 8: Hatred "of X" e Mark per abilità (wishlist Maar)

- **Hatred era uno status anonimo con save a fine turno**: il manuale (p.104) lo definisce "Hatred of X: half
  damage to all foes other than X, ends at the end of your turn". Ora applicando Hatred (tab Conditions,
  `game.icon.applyStatus`) un dialog chiede di chi: lista dei token della scena con il target preselezionato,
  oppure un nome libero. L'effetto si chiama "Hatred of X" (scheda, HUD del token, chat), finisce da solo a
  fine turno del personaggio (niente save) e il dialog 💥 Damage propone "Hatred (½ vs others)" già spuntato
  quando il target non è X, con lo step "Hatred (½)" nella card. Nuovo modulo `module/combat/marks.mjs`.
- **Mark era solo un contatore "Marked: N"**: ora ogni abilità/azione con tag `mark` ha il bottone "🎯 Mark
  target" (PG, Foe, Legend): targetta un token e premi → sul bersaglio un effetto "Marked — Abilità
  (Marcatore)" con il testo del blocco "Mark:" (o della descrizione dell'azione), card in chat. Regole p.103
  applicate: un mark per abilità (ri-marcare un altro bersaglio sposta il mark), un mark per coppia
  marcatore→bersaglio (il nuovo sostituisce il vecchio), più marcatori diversi possono coesistere; i mark cadono
  quando il marcatore va a 0 HP e a fine combat. Si vedono come chip "🎯 Bersaglio ✕" sul pannello del
  marcatore, nella sezione "Marks on this character" della tab Conditions del bersaglio (testo + "End mark")
  e come righe nell'HUD del token. Il contatore generico "Marked" resta per i casi a mano.
- **Giocatori senza permessi sul bersaglio**: mark e Hatred passano dal GM attivo via socket (stesso canale
  del "Apply Damage").
- API macro: `game.icon.applyHatred(actor, { name, tokenId })`, `game.icon.applyMark({ source, target,
  abilityKey, abilityName, text })`, `game.icon.removeMark(effectUuid)`.

## 9 settembre 2026 — Sessione 7: tag override dei talenti, varianti di area, Aura, larghezza delle Line

- **"Tags when unlocked" compilati nel pack Jobs** per 21 abilità i cui talenti/mastery cambiano la riga dei tag
  in modo permanente o "at round 4+" (Umbra → Range 6 + Unerring, Harvest → Range 2, Valkyrie → Range 4,
  Sturmreiten → Arc 5, Perseus → Line 5, Endless Battlement → No Max Range + Interrupt 2, Sow → Arc 4, le
  mastery "becomes a free action", ecc.): i chip diventano oro con il testo del talento nel tooltip. Le
  condizioni Charge/Comeback/Sacrifice/Exceed NON sono tag: le legge il bottone 📐 (sotto). Script
  `icon-compendium-audit/tag-overrides/apply-tag-overrides.mjs`; vale per i re-import.
- **📐 con scelta della variante**: prima piazzava solo il pattern dei tag. Ora `areaVariants` legge anche il
  testo del Combo, del Charge e dei talenti/mastery sbloccati ("Area becomes Arc 4", "Increase area to Large
  Blast", "Exceed: Draw a line 4…") e, se c'è più di un pattern, un dialog chiede quale usare (Death Blossom:
  Burst 1 / Combo: Arc 4 / Combo: Arc 8; Pandaemonium: Medium Blast / Charge: Large Blast).
- **Line con larghezza** (tag `width-N`, p.97: "can gain width, adding it on either side"): Hellish Breath e
  Scouring beam ora si piazzano larghe; larghezza dispari centrata, pari con la colonna extra da un lato
  (Shift+rotella la sposta dall'altro).
- **Aura X come template** (tag `aura-N`, o `aura` con richiesta della taglia): "📐 Aura 2" piazza subito un
  quadrato oro attorno al token, senza target, e il template segue il token quando si muove (hook
  `preUpdateToken/updateToken` eseguito dal GM attivo, che può aggiornare i template di tutti). ⚔ ignora le
  aure. Rimosse a fine combat come gli altri template.
- **Tooltip mancanti sui tag** `width-N`, `interrupt-N`, `no-max-range`, `melee`.
- **Rimosso `templates/actor/legend-actions.hbs`**, non usato da nessuna sheet (LegendSheet usa `legend-combat.hbs`).
- **Famiglia Battle Demon → Heavy** (Battle, Starving, Gaping, Nail, Horn Demon; pack `foes` + specchio in
  `foe-abilities`): il manuale non assegna classi ai demoni (pp.406-427), quindi si segue la segnalazione di Maar
  come per l'Armor Demon: stat base Heavy p.298 (VIT 10, Def 6, Fray 4, d6, Armor 2), trait Guard, cartella
  "Demon › Heavy". Vale per i re-import.
- I template di area restano finché si tolgono a mano (🗑 area / End encounter): nessuna rimozione automatica.

## 9 settembre 2026 — Sessione 6: template Blast / Line / Arc / Burst con auto-target

- **Aree di effetto sulla mappa**: prima i tag "medium-blast", "line 4", "arc 6", "burst 2" erano solo chip
  informativi e i target andavano scelti a mano. Ora nel pannello di ogni abilità/azione con un tag di area
  compare il bottone "📐 Medium Blast" (PG, Foe e Legend): il pattern segue il mouse su una griglia evidenziata
  del colore dell'area, con l'alone blu del range attorno al token (o solo la corona adiacente se l'abilità
  non ha range, p.97); click per piazzare, tasto destro/Esc per annullare, rotella per ruotare una Line di
  90°. Le Arc si dipingono una casella alla volta (ortogonali, senza sovrapporsi né passare sul proprio
  token; Invio/tasto destro chiude prima). I Burst "(self)" si piazzano da soli attorno al token. Forme dal
  diagramma p.98: Small Blast = croce di 5, Medium = 3×3, Large = 5×5 senza angoli; Burst X = quadrato di
  raggio X (il range conta le diagonali, p.85).
- **Un template vero di Foundry, visibile a tutti**: l'area è un `MeasuredTemplate` con le caselle salvate nei
  flag; la nuova classe `IconMeasuredTemplate` (`module/canvas/area-templates.mjs`, registrata in `init`)
  disegna contorno, caselle e testo "Medium Blast · Nome" su ogni client; i template classici di Foundry
  restano invariati. I token nelle caselle diventano i target dell'utente (per i Burst il proprio token è
  escluso, p.97). Piazzare di nuovo la stessa abilità sostituisce il template precedente; "End encounter"
  li rimuove tutti.
- **⚔ Attack Roll integrato**: su un'abilità di area l'attacco chiede prima il piazzamento (o riusa il
  template già sulla mappa, rileggendo chi c'è dentro), poi apre il dialog con la Defense del target già
  compilata; la card in chat ha la riga "📐 Medium Blast · nomi dei target" e il bottone "🗑 area" che
  toglie il template (solo autore o GM). Anche gli autohit (Pandaemonium) passano dal piazzamento.
- Macro/API: `game.icon.placeAreaTemplate({ actor, area, abilityName, abilityKey })`,
  `game.icon.areaFromTags(tags)`, `game.icon.deleteAreaTemplates()`.

## 9 settembre 2026 — Sessione 4b: passata sui testi delle abilità, power die per talento, keyword

- **Etichette lunghe del manuale non riconosciute** ("End your turn and create a Terrain Effect:" di Eclipse,
  "End your turn and gain Delay:" di Morrigan/Aria, "…gain Terrain effect:" di Six Hells Trigram, "End your
  turn and Mark:" di Intimidate): finivano nel flavour in corsivo. Ora `parseAbilitySections` le conosce e le
  stampa come blocco; le etichette multi-parola tengono minuscole le parole di mezzo ("While in this Stance").
- **Flavour mancante nel pack Jobs** (Circle the Oak, Party Favor, Deus Ex Machina, Harrow, Exorcism, Spirit
  Shrine, Assassinate): ripristinato dal manuale. Spirit Shrine e Assassinate nel libro non hanno etichetta:
  aggiunto "Effect:" per separare flavour e regole, e per lo Shrine la riga "Object Effect: Aura 2" del libro.
  Script `icon-compendium-audit/session4b/fix-ability-texts.mjs`; vale per i re-import. Le 4 abilità
  d'attacco "senza blocchi" del report (Pandaemonium, Harvest, The Tower, Death Blossom) erano corrette: le
  regole stanno nei campi Hit/Miss/Area.
- **Power die che cambia con talento/mastery** (Gran Reversa Talent I → d6 da 6; Crimson Bloom Mastery →
  parte da 3): prima andava cambiato a mano nella scheda. Nuovi campi "Power die when unlocked" sotto Talent
  1/2/Mastery nella scheda dell'abilità (testo libero tipo "d6 starting at 6"); `powerDieView` applica
  l'override quando l'upgrade è sbloccato, quindi widget, cap del +, "Set out at N" e badge in chat seguono.
- **Keyword, falsi positivi**: "counter clockwise" (Strongarm) evidenziava Counter; "hatred of you after this
  ability resolves…" inghiottiva mezza frase; "wounds heal instantly"/"open wound"/"wounded" evidenziavano
  Wound; "ongoing effects" evidenziava Ongoing (+). Regex ristrette in `module/helpers/keywords.mjs`.
- Report rigenerato: `icon-compendium-audit/session4/format-report.md` (restano solo i casi legittimi:
  tabelle di Monogatari, "The effects:" di Terraforming, Eclipse senza flavour come nel libro).

## 7 settembre 2026 — Sessione 5: Level Up e Character Creation nello stile della scheda

- **Dialog rifatti con lo stesso linguaggio della scheda PG** ("Ink & Gold × Tactics"): banda diagonale nel
  colore della classe con il ritratto nella tacca, nome in IM Fell, blocco livello a destra ("3 → 4",
  "Level 0 · Ch 1"), rail degli step a chevron che si accende man mano, ogni passo come card numerata con
  titolo in display, footer sticky con riepilogo e bottone oro a taglio. CSS condiviso in un unico blocco
  `.icon-wizard*` in `css/icon.css` (rimosso il vecchio CSS delle liste a checkbox).
- **Character Creation**: bond, bond power, job e abilità sono card selezionabili (striscia del colore di
  classe, badge, prima frase del testo) invece di select e checkbox; le azioni primarie del bond sono pill;
  i 4 punti extra si assegnano con un allocatore a pallini (+/−, contatore "N left", cap 3 applicato dal
  vivo, riga dorata per l'azione primaria); scegliendo il job la banda prende il colore della classe e
  compare il nome del job; contatore "2 / 2" sulle abilità con blocco delle altre card. Il rail e le card
  diventano oro quando lo step è completo; il footer dice "N / 7 steps done". Il submit legge gli stessi
  campi di prima (gli input `distribution1..4` sono aggiornati dall'allocatore), quindi la logica di
  scrittura sulla scheda non è cambiata.
- **Level Up**: benefici come card "grant"; i bivi di L4/L8 (New Job / +1 Mastery, Bond Power / 2 Actions)
  sono card, e la scelta del nuovo job è una griglia di card di classe che compare solo con "New Job";
  nello stage 2 recap dorato con "← Change", abilità/mastery/reliquie/bond power come card con descrizione,
  contatore "AP N left" che conta anche i talenti e disabilita le card quando il budget è finito, riepilogo
  live nel footer. Finestre allargate a 740px.

## 7 settembre 2026 — Sessione 4: power die sulle abilità, blocchi e keyword nel testo delle abilità

- **Power die tracciabile sull'abilità** (Odinforce, Soul Blade, Gallows Humor, Exorcism…): prima esisteva
  solo la lista generica "Power Dice" del Wright nelle risorse di classe, scollegata dall'abilità. Ora ogni
  abilità e ogni trait ha un campo "Power die" (d4/d6/d8, "starts at N", valore corrente) nella scheda item,
  e nel pannello dell'abilità sulla scheda PG compare il widget "🎲 Power die dN": "Set out at N", −/+ (mai
  sopra la taglia del dado), 🎲 per tirarlo in chat, Discard; a 0 il dado viene scartato (glossario "Power
  Die"). La card in chat mostra il badge "🎲 d6: N" quando il dado è attivo; a fine combat i dadi si
  azzerano. Nel pack Jobs sono compilati 12 item (Soul Blade, Wicked Sheath, Gran Reversa, Sleight of Hand,
  Umbral Echo, Obsidian Flesh, Crimson Bloom, Odinforce, Rampant Nail, Gallows Humor, Exorcism, Godly Smite);
  per le copie già sui PG basta impostare il dado nella scheda dell'abilità.
- **Testo delle abilità a blocchi, in ordine di lettura**: la descrizione veniva stampata come un unico
  paragrafo, con al massimo un "Effect:" staccato. Ora `parseAbilitySections` riconosce i blocchi del
  manuale ("Effect:", "Stance:", "Mark:", "Refresh:", "Terrain Effect:", "Summon:", "Interrupt N:",
  "Infuse N:", "Special:", "Object:", …) e li stampa uno per riga con etichetta in oro, nell'ordine in cui
  sono scritti; il flavour resta in corsivo; per gli attacchi Hit → Miss → Area → blocchi, per le altre
  abilità blocchi → Area. Stesso ordine nel pannello della scheda PG e nella card 💬 in chat.
- **Card in chat senza Trigger/Effect** (regressione del round 4): dallo split Trigger/Effect la card
  "Show in Chat" stampava solo il flavour e Hit/Miss/Area. Ora stampa Trigger e tutti i blocchi.
- **Keyword con tooltip dentro il testo**: le parole di regola (status come slashed/weakened/stunned,
  rush N, shove N, dash, teleport, true strike, bloodied, gamble, aura N, sacrifice N, cure, bless, boon/curse,
  fray, [D], power die, interrupt N, …) vengono evidenziate in ogni testo arricchito (abilità, trait, azioni
  dei Foe, card in chat) con il tooltip preso dal glossario del Reference (`module/apps/reference.mjs`,
  unica fonte). Status in oro, altre keyword con sottolineatura a puntini (`module/helpers/keywords.mjs`).
- **Passata sui dati rimandata**: `icon-compendium-audit/session4/format-report.md` elenca per ogni abilità
  i blocchi riconosciuti e i casi da sistemare (etichette minuscole, etichette sconosciute, testi senza
  blocchi). È la Sessione 4b in TODO.

## 7 settembre 2026 — Sessione 3: Armor Demon, Rush X, Guard/Armor 2, cartelle nei compendi

- **Armor Demon segnato Leader invece di Heavy**: nel PDF (p.408) è una variante "Chapter 1+" del Battle
  Demon, senza classe scritta; nel pack `foes` era Leader. Ora è Heavy con le stat base p.298 (VIT 10,
  Def 6, Fray 4, d6, Armor 2) e il trait di classe Guard oltre a Sturdy. Vale per i re-import; le copie già
  nel mondo non cambiano.
- **"Rush X" come trait Stalwart con tracker Vigilance**: era nella lista dei trait di classe in
  `module/helpers/classes.mjs` (non nel pack), e ogni trait di classe Stalwart mostra i pip Vigilance.
  Rush è una keyword usata dentro le abilità, non un trait → tolto dai trait di classe e spostato tra le
  regole di classe (dropdown "Rules" nel tab Combat). Migrazione 4: il trait "Rush X" viene cancellato dai
  PG esistenti (solo quello con source "class").
- **Heavy senza Armor 2 / Rampart**: il trait di classe Heavy è Guard (p.298: "Has Rampart. Reduce all
  damage to self and allies in orthogonal spaces by 2, as if by armor"), ma nel pack tutti gli Heavy con
  Guard avevano Armor 0, quindi "Apply Damage" non bloccava nulla. Ora: stat base Heavy = Armor 2
  (anche per i foe nuovi e per "Apply base stats"); nel pack `foes` tutti i 50 foe con il trait Guard
  (Heavy, più Bouncer e Giant Insect) hanno Armor 2; chi "lacks the Guard trait" (Atrophic Grave,
  Battle Beetle, Beast spirit, Ooze) resta a 0; Lord Evictor resta a 2 (l'armor non si somma, p.98).
  Il Legend Dread Lords ("Sturdy, Rampart, Armor 2") passa ad Armor 2.
- **Cartelle nei compendi** (come Jobs / Foe Abilities): Bond Powers e Gear Kits per Bond (Adventurer's
  Kit alla radice), Relics per tipo di Invoke (Attack / Round / Gambit), Foes per Fazione › Classe,
  Legends per Fazione. Colori delle fazioni uguali a Foe Abilities. Script
  `icon-compendium-audit/session3/add-pack-folders.mjs` (idempotente).
- **Nuovo `PLAYTEST.md`**: ogni sessione ci scrive i test da fare, che si eseguono in una sessione di
  playtest separata in una sessione dedicata (contiene già i test delle Sessioni 1, 2 e 3).

## 7 settembre 2026 — Sessione 2: chat NPC, tag Draken Cross, Party Resolve sincronizzato

- **Round Action dei Legend (e dei Foe) non stampabili in chat**: mancava il bottone → nuovo 💬 accanto al
  nome di ogni Round Action (scheda Legend e Foe), che posta una card con nome, "Round Action — Round N+" ed
  effetto (`postNpcRoundActionCard` in `module/helpers/enrich.mjs`).
- **Azioni dei Legend senza tiro (es. Dread March dei Dread Lords) non stampabili in chat**: la scheda Legend
  aveva solo ⚔/💥 (visibili solo se l'azione ha un attacco/danno) e nessun 💬, mentre la scheda Foe lo aveva
  già → aggiunto il 💬 a tutte le azioni del Legend, con o senza tiro; la logica della card è ora condivisa
  (`postNpcActionCard`) tra Foe e Legend.
- **Draken Cross: scegliendo il talento il tag non diventava "Medium Blast"**: nel manuale è il Talent II
  ("Charge: Increase range to 5, and all areas may be increased to medium blasts") — non la mastery — e i tag
  delle abilità erano una lista fissa. Ora ogni abilità ha tre campi opzionali "Tags when unlocked" (Talent I,
  Talent II, Mastery; nella scheda item sotto ogni testo): se compilati, sostituiscono i tag quando quel
  talento/mastery è sbloccato. I tag nuovi appaiono in oro con tooltip "From Talent II: …" (scheda PG, card in
  chat e card del tiro). Draken Cross nel compendio Jobs ha già `Talent II → attack, range-5, medium-blast`
  (script `icon-compendium-audit/tag-overrides/apply-tag-overrides.mjs`). Nota: le copie di Draken Cross già
  importate sui PG non si aggiornano da sole: basta scrivere `attack, range-5, medium-blast` nel campo Talent II
  della scheda dell'abilità (o re-importarla).
- **Party Resolve dal tracker: non spendibile col Limit Break e non riflesso sulle schede PG**: c'erano due
  contatori separati — il flag sul combat (mostrato nel banner del tracker, senza modo di cambiarlo a mano) e
  il campo `resolve.party` di ogni PG (quello che il bottone "Use Limit Break" spende) — e si parlavano solo
  con l'incremento automatico a inizio round. Ora c'è un'unica funzione `IconCombat.setPartyResolve` che
  scrive il flag e allinea tutti i PG del combat: la usano i nuovi bottoni −/+ nel banner "Party Resolve" del
  tracker (anche i giocatori, inoltrati al GM), l'incremento di inizio round, e un hook che intercetta ogni
  modifica al Party Resolve fatta da una scheda PG (Use Limit Break, o editing a mano) e la propaga a combat e
  agli altri PG.
- **Party Resolve +1 a inizio round era segnato come house rule OFF**: è RAW (manuale p.99 "Party Resolve goes
  up by 1 at the start of each round in combat") → il setting è rinominato e ora è ON di default (la chiave
  interna resta la stessa, i mondi che l'avevano cambiato tengono la loro scelta).

## 7 settembre 2026 — Sessione 1: tag NPC cancellati, cap Aether, conferma End Encounter

- **NPC: modificare HP/Vigor/nome/size/classe cancellava i tag di tutte le abilità**: le action dei foe sono un
  `ArrayField` di oggetti e la scheda invia solo alcuni campi di ogni action come input (nome, costo, testi);
  i tag sono chip senza `<input>` → a ogni submit Foundry ricostruiva l'array dal form e la pulizia dei dati
  riempiva i campi mancanti con il valore iniziale (`tags: []`). Fix generico in `BaseActorSheet`
  (`_processFormData` + nuovo helper `module/helpers/form-arrays.mjs`): prima della pulizia, ogni elemento
  inviato viene fuso sopra quello già salvato allo stesso indice, così i campi non renderizzati conservano il
  valore. Copre foe e legend (actions, traits, interrupts) e la scheda PG (jobs, burdens, ambitions), che
  aveva lo stesso problema con un fix parziale scritto a mano, ora rimosso. Verificato con uno script Node
  che usa i DataField veri di Foundry: senza fix i tag spariscono, con il fix restano.
- **Aether sopra 6**: il contatore saliva senza limite → l'Aether è un power die d6 (manuale p.204). Ora
  +/- è bloccato a 0..6 (costante `CONFIG.ICON.rules.aetherMax`), con avviso quando si tenta di superarlo;
  `aether.max` di default passa da 10 a 6 e il promemoria in scheda dice "max 6".
- **End Encounter curava PRIMA della conferma**: il nostro `endCombat` faceva pulizia (vigor, heal post-combat,
  reset risorse di classe) e poi chiamava quello core, che apre il dialog di conferma → anche premendo "No"
  gli HP erano già stati ricaricati. Ora il dialog viene mostrato per primo e la pulizia + cancellazione del
  combat avvengono solo dopo il "Sì".

## 30 agosto 2026 — Feedback round 4 (Maar)

- **Burden/Ambition clock**: i segmenti non si coloravano mai (e il click andava sempre al primo burden):
  dentro l'`#each` annidato `../burden.clock.value` e `../i` sono lookup di contesto, non block-param →
  `undefined`. Ora i segmenti si riempiono e ogni clock risponde al proprio indice.
- **Aether**: si azzera a fine combattimento (manuale p.204 "All Aether disperses at the end of combat");
  il promemoria diceva il contrario. Azzerati a fine combat anche gli Stacked Dice del Fool.
- **Attacchi base**: badge "Range N" (range per classe: Stalwart 3 / Vagabond 4 / Mendicant 5 / Wright 6)
  accanto a Light/Heavy Attack e come tag nella card del tiro.
- **Dropdown che si chiudevano a ogni fine turno**: core ri-renderizza le schede di tutti i combattenti a
  ogni cambio turno; ora lo stato aperto/chiuso dei `<details>` sopravvive ai re-render (tutte le schede).
- **Pannello status del token**: ancorato al bordo sinistro reale della sidebar v13 (prima usava un
  `right` fisso e copriva le tab della sidebar); si riposiziona al collapse/expand e al resize.
- **Abilità**: il testo "Trigger:" e "Effect:" contenuto nella descrizione viene ora separato e
  stampato come nel manuale — Trigger prima di tutto (Heave-Ho non mostrava il trigger), Effect dopo
  Hit/Miss/Area per gli attacchi (Draken Cross) e prima dell'Area per le non-attacco.
- **Interrupt di Foe/Legend**: bottone 💬 per postarli in chat (nome, Interrupt N, Trigger, Effect).
- **Tracker**: le modifiche alle attivazioni persistono anche `max` (un combattente aggiunto a metà
  round aveva il max solo in memoria → conteggio pip sbagliato su altri client / al reload).

## 29 agosto 2026 — Restyle "Ink & Gold × Tactics"

Nuovo look scelto su canvas (mix delle direzioni A e C):
- **Header PG** a taglio diagonale nel colore della classe primaria: ritratto nella tacca scura, nome in
  *IM Fell English*, job primario ★ + secondario, kin/cultura compatti, livello grande a destra.
- **Blocco HP** con barra a 4 segmenti "tagliati" (ferite tratteggiate da destra) e **statistiche in griglia
  accanto** (VIT/DEF/SPD/ARM/FRAY/[D]/Level/Chapter); Vigor a tacche (una per punto).
- Sezioni/card più scure, trait e slot abilità con stripe del colore di classe e titoli in IM Fell.
- **Scheda Foe**: banda diagonale con l'accento della fazione/classe nell'header.
- **Chat**: card con testata scura, totale del tiro in "chip" oro tagliato (viola su crit, grigio su miss),
  danno in chip rosso, bottoni Apply/½ tagliati.
- **Combat tracker**: banner round oro a taglio, pip di attivazione a chevron colorati per fazione.
- Font display caricato da Google Fonts (fallback Palatino/Book Antiqua se offline).
- **Altre schede** (stesso linguaggio): header a banda diagonale per **Legend** (viola), **Summon** (blu),
  **Item** (colore di classe, oro se senza classe); il nome del **Foe** ora sta nella banda accanto al
  ritratto; dialog **Level Up** e **Character Creation** con testata oro e titolo in IM Fell.
  Fix tecnico: gli header che sono "part" AppV2 ricevevano `display:block` dal reset — ora il reset
  esclude gli `<header>` (`:not(header)`), così ogni header part tiene il proprio layout.
- Post-review: hint dei dialog non più neri su fondo scuro (colore scoperto solo nella testata), riga 2
  dell'header foe corretta anche per i mob, niente più gap sotto l'header foe, indicatore di focus sui
  campi nome nelle bande, CSS delle bande consolidato (un solo `.icon-band` con `--band`).

## 29 agosto 2026 (pomeriggio) — Summons compendium, gambit self-heal, barre HP token

- **Nuovo compendium "Summons"** (Actor, tipo summon): i 12 summon dei job PG trascritti a mano
  dal manuale — Bomb (Fool), Astral Seraph (Freelancer), Shadow (Shade), Great Beast + Beast (Warden),
  Thrall + Plant + Severed Soul (Harvester), Wild Card + Master Card (Seer), Selkie + Salt Sprite
  (Stormbender). Regola di evocazione nelle note, Summon Action/Effect nei campi. Trascina il PG sulla
  scheda del summon importato per collegarlo (compare nella sezione Summons del PG).
  Sorgente: `icon-compendium-audit/summons-pack/summons.json` + `build-summons-pack.mjs`.
- **Gambit del secondo job**: nuovo `ensureClassGambits()` condiviso (drop job, level-up, migrazione 2)
  e **self-heal all'apertura della scheda PG** — se manca il Gambit di una classe secondaria viene
  creato subito. Confronto classi case-insensitive (attori vecchi con "Wright" maiuscolo).
- **Barre HP dei token**: migrazione schema 3 imposta `bar1 = hp` (PG: `combat.hp`, sempre visibile;
  NPC: solo owner) su tutti gli attori senza barra **e sui token già piazzati nelle scene**.
  I summon intangibili non hanno HP → nessuna barra (voluto).
- **Colori cartelle del compendium Jobs**: Mendicant era blu e Wright verde (anche le sottocartelle job e
  "Abilities"). Ora Mendicant verde (#27ae60 / job #2ecc71) e Wright blu (#2980b9 / job #3498db).
- Colori classe: alias CSS per classi con iniziale maiuscola nei dati legacy.

## 29 agosto 2026 — Feedback round 3 (8 fix)

- **Doppio click sui trait**: un doppio click sui controlli rapidi dentro il box (pips Vigilance,
  +/− Blessing, dado Stacked…) non apre più la scheda dell'item.
- **Combo token**: la card combo in chat stampa anche il Talento equipaggiato (I/II) e la Mastery.
- **Checkbox Elite** ricentrata nel suo riquadro (glifo Foundry v13 centrato con grid).
- **Trait degli NPC in chat**: bottone 💬 sui trait di foe e legend nella scheda attore, e bottone
  "💬 Chat" nell'header della scheda item *foe-ability* / *trait* (funziona anche dal compendio).
- **Summon**: nuova sezione "Summons" nel tab Combat del PG che elenca i summon collegati
  (summonerActorId) con HP/on scene; click per aprire la scheda.
- **Fool — Stacked Dice**: pip 🎲 direttamente sul trait "Stack Dice" (nuova risorsa
  `classResources.stackedDice`); il cap passa a 2 automaticamente con Death's Apprentice sbloccato.
- **Barra HP a segmenti**: la barra è sempre larga 4×VIT; le ferite anneriscono i quarti da destra
  (come nel manuale) e il riempimento è calcolato sul max base. **Bloodied = 50% del max BASE**
  (`hp.bloodied` = ⌈4·VIT/2⌉, es. VIT 7 + 1 ferita → bloodied a 14, non a 11).
- **Seconda classe → Gambit**: bug root cause — `TraitData.source` non accettava `"gambit"`, quindi
  il trait Gambit falliva la validazione e non veniva mai creato. Aggiunto alla schema; il level-up
  (L4/L8 nuovo job) ora lo aggiunge come il drag-drop; **migrazione schema 2** aggiunge i Gambit
  mancanti ai PG multiclasse esistenti.

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

### 🐛 Scheda foe/legend
- **Il bottone ⚔ Attack compariva su TUTTE le azioni dei foe** (era la segnalazione di
  Maar): ora compare solo sulle azioni che sono attacchi (tag `attack` o riga "On hit:").
  Stesso fix sulle legend, dove inoltre il bottone 💥 Damage non compariva mai sulle
  azioni senza `damageMode` esplicito.

### ✨ Scheda PG — controlli di classe accanto alla class feature (richiesta Maar)
- Nel tratto di classe (Heroics / Aether / Blessing / Finishing Blow) compaiono ora i
  controlli rapidi della risorsa: **pip di Vigilance + Spend** (Stalwart), **Aether −/+,
  Power Dice con −/+/🎲 e "+ Die" / "🎲 Roll"** (Wright), **Blessing Tokens −/+**
  (Mendicant), **Combo Token** (Vagabond). Il blocco nel tab Combat resta invariato.

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
