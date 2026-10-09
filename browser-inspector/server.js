
const express = require('express');

const app = express();
const PORT = 3100;

app.set('trust proxy', false);

app.get('/api/info', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    network: {
      remoteAddress: req.socket.remoteAddress,
      remotePort: req.socket.remotePort,
      httpVersion: req.httpVersion,
      method: req.method,
      host: req.get('host'),
      protocol: req.protocol
    },
    userAgent: req.get('user-agent') || null,
    clientHints: {
      secChUa: req.get('sec-ch-ua') || null,
      secChUaMobile: req.get('sec-ch-ua-mobile') || null,
      secChUaPlatform: req.get('sec-ch-ua-platform') || null,
      secChUaFullVersionList:
        req.get('sec-ch-ua-full-version-list') || null
    },
    headers: req.headers,
    rawHeaders: req.rawHeaders
  });
});

// Richiediamo ulteriori Client Hints, se supportati.
app.use((req, res, next) => {
  res.setHeader(
    'Accept-CH',
    'Sec-CH-UA-Full-Version-List, Sec-CH-UA-Arch, Sec-CH-UA-Bitness, Sec-CH-UA-Platform-Version'
  );
  next();
});

app.get('/', (req, res) => {
  res.type('html').send(`
<!doctype html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Browser Inspector</title>
  <style>
    body {
      background: #0b1220;
      color: #e5e7eb;
      font: 15px system-ui, sans-serif;
      margin: 0;
      padding: 32px;
    }
    main { max-width: 1100px; margin: auto; }
    h1 { color: #60a5fa; }
    h2 { font-size: 18px; margin-top: 28px; }
    pre {
      background: #111c30;
      border: 1px solid #263850;
      border-radius: 10px;
      padding: 20px;
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .note { color: #94a3b8; }
  </style>
</head>
<body>
  <main>
    <h1>Browser Inspector</h1>
    <p class="note">Informazioni HTTP e JavaScript visibili a un sito.</p>

    <h2>Informazioni ricevute dal server</h2>
    <pre id="server">Caricamento...</pre>

    <h2>Informazioni JavaScript del browser</h2>
    <pre id="client">Caricamento...</pre>
  </main>

  <script>
    async function inspect() {
      const server = await fetch('/api/info').then(r => r.json());
      document.getElementById('server').textContent =
        JSON.stringify(server, null, 2);

      const client = {
        userAgent: navigator.userAgent,
        userAgentData: navigator.userAgentData
          ? {
              brands: navigator.userAgentData.brands,
              mobile: navigator.userAgentData.mobile,
              platform: navigator.userAgentData.platform,
              highEntropy: await navigator.userAgentData
                .getHighEntropyValues([
                  'architecture',
                  'bitness',
                  'fullVersionList',
                  'model',
                  'platformVersion',
                  'wow64'
                ]).catch(e => ({ error: e.message }))
            }
          : null,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        webdriver: navigator.webdriver,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory ?? null,
        maxTouchPoints: navigator.maxTouchPoints,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        screen: {
          width: screen.width,
          height: screen.height,
          availWidth: screen.availWidth,
          availHeight: screen.availHeight,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth
        },
        viewport: {
          width: innerWidth,
          height: innerHeight,
          devicePixelRatio: devicePixelRatio
        },
        timezone: Intl.DateTimeFormat()
          .resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        webGL: (() => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl');
          if (!gl) return null;

          const debug = gl.getExtension(
            'WEBGL_debug_renderer_info'
          );

          return {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            unmaskedVendor: debug
              ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)
              : null,
            unmaskedRenderer: debug
              ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
              : null
          };
        })()
      };

      document.getElementById('client').textContent =
        JSON.stringify(client, null, 2);
    }

    inspect().catch(err => {
      document.getElementById('client').textContent =
        err.stack || String(err);
    });
  </script>
</body>
</html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    'Browser Inspector: http://localhost:' + PORT
  );
});
