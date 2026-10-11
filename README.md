# Edge Automator Docker

Ambiente Docker per eseguire automazioni Node.js con Playwright e Microsoft Edge Stable per Linux. Edge usa un display virtuale Xvfb; noVNC permette di vedere e controllare il browser da una pagina web.

Il profilo Edge conserva sessioni e cookie nel volume Docker `edge-profile`. Screenshot e risultati vengono salvati in `data/`.

## Container Docker

Il `Dockerfile` costruisce l'immagine Linux che contiene Node.js, Microsoft Edge e i servizi necessari a mostrare il browser su un desktop virtuale. `compose.yaml` crea il container a partire da questa immagine e configura rete, volumi e variabili d'ambiente. All'avvio viene eseguito `start.sh`, che prepara il desktop; l'automazione Playwright viene lanciata separatamente con i comandi della sezione Avvio.

### Immagine di base e variabili d'ambiente

`FROM node:22-bookworm` usa l'immagine ufficiale di Node.js 22 basata su Debian 12, nome in codice Bookworm. Node.js esegue gli script JavaScript; npm installa le loro dipendenze e npx permette di invocare strumenti distribuiti come pacchetti npm. L'immagine fornisce anche l'utente `node`, usato per eseguire i processi del container senza privilegi root.

Il Dockerfile imposta tre variabili:

- `DEBIAN_FRONTEND=noninteractive` configura gli strumenti di installazione Debian affinché non richiedano risposte interattive durante la build.
- `DISPLAY=:99` indica ai programmi grafici il display X11 a cui collegarsi. Il numero 99 identifica il display virtuale creato da Xvfb.
- `HOME=/home/node` indica la directory personale dell'utente che eseguirà i servizi e il browser.

### Pacchetti di sistema

| Pacchetto | Cos'è e a cosa serve nel container |
| --- | --- |
| `bash` | Interprete di comandi che esegue `start.sh`. Lo script usa funzionalità Bash, tra cui `pipefail` e `wait -n`, per gestire errori e processi. |
| `xvfb` | X Virtual Framebuffer: un server grafico X11 che mantiene lo schermo in memoria. Fornisce a Edge un display senza richiedere un monitor fisico. |
| `xauth` | Strumento per gestire le credenziali di accesso ai display X11. È installato, ma lo script attuale avvia Xvfb con `-ac`, disabilitando il controllo di accesso X11, e non configura credenziali tramite xauth. |
| `x11vnc` | Server VNC che condivide un display X11 esistente. Legge il desktop di Xvfb e permette ai client di visualizzarlo e inviare input di mouse e tastiera. |
| `openbox` | Window manager per X11. Gestisce le finestre del browser, il loro posizionamento e il focus sul desktop virtuale. |
| `novnc` | Client VNC scritto in JavaScript, utilizzabile da una pagina web. Il pacchetto fornisce i file dell'interfaccia, serviti da `/usr/share/novnc`. |
| `websockify` | Ponte tra WebSocket e TCP. Riceve la connessione WebSocket del client noVNC e inoltra il traffico al server VNC; nello script serve anche i file web di noVNC. |
| `ca-certificates` | Raccolta di certificati delle autorità di certificazione riconosciute dal sistema. Fornisce la base di fiducia per i client HTTPS che usano l'archivio di certificati di sistema. |
| `fonts-liberation` | Famiglia di font con metriche compatibili con caratteri comuni come Arial, Times New Roman e Courier New. Offre font locali per il rendering delle pagine web e degli screenshot. |

### Microsoft Edge e Playwright

`WORKDIR /app` imposta la directory di lavoro delle istruzioni successive e del processo avviato nel container.

Il comando `npx playwright install --with-deps msedge` invoca la CLI di Playwright per installare Microsoft Edge Stable per Linux. L'opzione `--with-deps` installa anche le librerie di sistema richieste dal browser, tra cui componenti grafici, audio e font. L'elenco preciso delle dipendenze aggiuntive dipende dalla versione della CLI Playwright e dalla distribuzione Linux; non è fissato esplicitamente nel Dockerfile.

**Microsoft Edge** è il browser che esegue le pagine web. **Playwright** è la libreria Node.js con cui gli script aprono il browser, navigano, interagiscono con gli elementi delle pagine e producono screenshot. Lo script del progetto seleziona Edge con `channel: 'msedge'` e usa `headless: false` per mostrarne le finestre sul display virtuale.

Il comando npx eseguito durante la build non sostituisce l'installazione delle dipendenze dell'applicazione in `/app/src`. Il Dockerfile attuale copia soltanto `start.sh`; il codice viene fornito dal volume configurato in Compose e Playwright viene installato per quel codice con `npm ci --prefix /app/src`. Inoltre, il comando npx della build non specifica una versione di Playwright, mentre `npm ci` usa il lockfile presente in `src/`.

### Script di avvio e utente

Lo script avvia i servizi in questo ordine:

1. **Xvfb** crea il display `:99` con risoluzione 1920 × 1080 e profondità colore di 24 bit. Lo script attende fino a circa 10 secondi che compaia il socket X11 e termina con errore se non è disponibile.
2. **Openbox** gestisce le finestre sul display virtuale.
3. **x11vnc** condivide il display sulla porta 5900, accessibile soltanto dal localhost del container. Le opzioni `-forever` e `-shared` mantengono il servizio dopo una disconnessione e consentono connessioni condivise; `-nopw` abilita l'accesso senza password VNC.
4. **websockify** ascolta sulla porta 6080 di tutte le interfacce del container, serve i file di noVNC e inoltra le connessioni al server VNC su `localhost:5900`.

Bash attende la terminazione di uno dei quattro servizi. Una trap gestisce l'uscita e i segnali INT e TERM, terminando i processi grafici avviati dallo script. Edge viene aperto dall'automazione, quindi il solo avvio del container prepara il desktop senza aprire il browser.

Il percorso della connessione al desktop è:

```text
Browser dell'utente → noVNC/websockify :6080 → x11vnc :5900 → Xvfb :99
                                                              ↑
                                                    Openbox e Microsoft Edge
```

### Configurazione di Docker Compose

Il servizio `edge-automation` usa `build: .` per costruire l'immagine dal Dockerfile nella directory del progetto. `container_name` assegna al container il nome fisso `edge-automation`.

- `platform: linux/amd64` seleziona l'architettura AMD64 richiesta dall'installazione Edge usata nel progetto. Su Mac Apple Silicon Docker Desktop esegue il container tramite emulazione.
- `127.0.0.1:6080:6080` pubblica noVNC soltanto sull'interfaccia loopback dell'host. Il desktop è raggiungibile localmente; l'accesso remoto richiede un tunnel o un proxy configurato separatamente. La porta VNC 5900 non è pubblicata.

I tre mount hanno scopi diversi:

| Mount | Contenuto e persistenza |
| --- | --- |
| `./src:/app/src` | Bind mount del codice e delle dipendenze dell'automazione. Le modifiche ai file sull'host sono visibili nel container. |
| `edge-profile:/home/node/edge-profile` | Volume Docker che conserva il profilo Edge anche quando il container viene ricreato. Due istanze indipendenti di Edge non devono usare contemporaneamente lo stesso profilo. |
| `./data:/app/data` | Bind mount degli output, consultabili direttamente nella directory `data/` dell'host. I permessi devono consentire all'utente `node` di scrivere. |

Il profilo contiene dati di sessione sensibili. La configurazione attuale fornisce noVNC senza autenticazione applicativa e senza TLS, con accesso limitato al localhost dell'host dalla regola di pubblicazione. Un'eventuale esposizione remota deve proteggere sia la pagina web sia la connessione WebSocket.

## Requisiti

Docker con Docker Compose e Node.js per il Browser Inspector locale. Su Mac Apple Silicon il container viene eseguito in emulazione tramite `linux/amd64`.

## Avvio

Avvia l'ambiente grafico e installa le dipendenze dell'automazione:

```bash
docker compose up -d --build
docker compose exec edge-automation npm ci --prefix /app/src
```

Lo script di esempio visita il Browser Inspector, un server locale che mostra gli header HTTP e le proprietà del browser inviate al server. Avvialo in un altro terminale:

```bash
cd browser-inspector
npm ci
node server.js
```

Apri [noVNC](http://localhost:6080/vnc.html), connettiti al desktop ed esegui l'automazione:

```bash
docker compose exec edge-automation node /app/src/automation.js
```

Lo script raggiunge `http://host.docker.internal:3100`, salva `data/screenshots/test.png` e chiude Edge dopo 30 secondi. Per automatizzare altri siti, modifica `src/automation.js`.

## File principali

- `Dockerfile` e `compose.yaml`: immagine, servizi e volumi Docker.
- `start.sh`: avvio di Xvfb, Openbox, VNC e noVNC.
- `src/automation.js`: automazione Playwright di esempio.
- `browser-inspector/`: server di diagnostica del browser.
- `data/`: output accessibili anche dall'host.
