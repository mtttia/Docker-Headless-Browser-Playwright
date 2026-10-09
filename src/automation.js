
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const profileDir = '/home/node/edge-profile';

await fs.mkdir('/app/data/screenshots', {
  recursive: true
});

const context = await chromium.launchPersistentContext(
  profileDir,
  {
    channel: 'msedge',
    headless: false,
    viewport: {
      width: 1920,
      height: 1080
    },
    locale: 'it-IT'
  }
);

try {
  const page = context.pages()[0] ||
    await context.newPage();

  await page.goto('http://host.docker.internal:3100', {
    waitUntil: 'domcontentloaded'
  });

  await page.screenshot({
    path: '/app/data/screenshots/test.png',
    fullPage: true
  });
  console.log('Browser:', context.browser()?.version());
  console.log('Titolo:', await page.title());

  console.log('Screenshot salvato!');

  await page.waitForTimeout(30000)
} finally {
  await context.close();
}
