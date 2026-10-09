
FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV HOME=/home/node

# Ambiente grafico + server VNC
RUN apt-get update && apt-get install -y \
    bash \
    xvfb \
    xauth \
    x11vnc \
    openbox \
    novnc \
    websockify \
    ca-certificates \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Microsoft Edge Stable e dipendenze Linux
RUN npx playwright install --with-deps msedge

# Avvio dei servizi grafici
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Directory persistenti
RUN mkdir -p \
    /home/node/edge-profile \
    && chown -R node:node \
       /home/node/edge-profile

USER node

EXPOSE 6080

CMD ["/bin/bash", "/usr/local/bin/start.sh"]