
#!/usr/bin/env bash
set -Eeuo pipefail

export DISPLAY=:99

echo "[1/4] Avvio display virtuale..."
Xvfb :99 -screen 0 1920x1080x24 -ac &
XVFB_PID=$!

# Attende che il socket X11 sia disponibile
for i in $(seq 1 50); do
    if [ -S /tmp/.X11-unix/X99 ]; then
        break
    fi
    sleep 0.2
done

if [ ! -S /tmp/.X11-unix/X99 ]; then
    echo "ERRORE: Xvfb non disponibile"
    exit 1
fi

echo "[2/4] Avvio Openbox..."
openbox &
OPENBOX_PID=$!

echo "[3/4] Avvio server VNC..."
x11vnc \
    -display :99 \
    -localhost \
    -rfbport 5900 \
    -forever \
    -shared \
    -nopw \
    -noxdamage &
VNC_PID=$!

echo "[4/4] Avvio noVNC..."
websockify \
    --web=/usr/share/novnc \
    0.0.0.0:6080 \
    localhost:5900 &
NOVNC_PID=$!

shutdown() {
    echo "Arresto servizi grafici..."
    kill "$NOVNC_PID" "$VNC_PID" \
         "$OPENBOX_PID" "$XVFB_PID" 2>/dev/null || true
    wait 2>/dev/null || true
}

trap shutdown EXIT INT TERM

echo ""
echo "================================="
echo "  EDGE AUTOMATION READY"
echo "  http://localhost:6080/vnc.html"
echo "================================="
echo ""

# Mantiene il container attivo.
# Non avvia automaticamente l'automazione.
wait -n "$XVFB_PID" "$OPENBOX_PID" "$VNC_PID" "$NOVNC_PID"
echo "Un servizio grafico si è terminato."
