# Edge Automator Docker

Ambiente Docker per eseguire automazioni Node.js con Playwright e Microsoft Edge Stable per Linux. Edge usa un display virtuale Xvfb; noVNC permette di vedere e controllare il browser da una pagina web.

Il profilo Edge conserva sessioni e cookie nel volume Docker `edge-profile`. Screenshot e risultati vengono salvati in `data/`.

## Requisiti

Docker con Docker Compose e Node.js per il Browser Inspector locale. Su Mac Apple Silicon il container viene eseguito in emulazione tramite `linux/amd64`.

## Avvio

Avvia l'ambiente grafico e installa le dipendenze dell'automazione:

```bash
docker compose up -d --build
docker compose exec edge-automation npm ci --prefix /app/src
```

Lo script di esempio visita il Browser Inspector, un server locale che mostra gli header HTTP e le proprietà del browser. Avvialo in un altro terminale:

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

## Stato del progetto

Edge, Playwright, il display virtuale e il salvataggio degli screenshot sono stati verificati. La verifica completa di noVNC resta da confermare. API, scheduler e coda dei task sono sviluppi previsti.

Esegui una sola automazione alla volta per evitare conflitti sul profilo Edge. Per fermare l'ambiente usa `docker compose down`; aggiungere `-v` elimina anche il profilo persistente.
