/**
 * Regenerates the marketing screenshots in docs/screenshots/.
 *
 * Loads the real built extension against an invented Gmail inbox
 * (scripts/screenshots/gmail-inbox.html), drives it through every filter, theme, layout and
 * showcased language, and captures the result. The filtering is genuine — Sift classifies the
 * fixture's rows with the same code path it runs against live Gmail — but no real mailbox is
 * ever involved.
 *
 * Usage:
 *   pnpm run build:chrome
 *   pnpm run screenshots:capture                # everything
 *   pnpm run screenshots:capture -- filter-     # only names starting "filter-"
 *
 * Every capture is 1280x800, so any two can be used as a matched before/after pair.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const ROOT = process.cwd();
const EXTENSION_PATH = path.join(ROOT, 'dist', 'chrome');
const FIXTURE_PATH = path.join(ROOT, 'scripts', 'screenshots', 'gmail-inbox.html');
const LOCALES_DIR = path.join(ROOT, 'src', '_locales');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'screenshots');

const VIEWPORT = { width: 1280, height: 800 };
const GMAIL_URL = 'https://mail.google.com/mail/u/0/#inbox';
// WHY '**' and not '*': in Playwright URL globs a single '*' does not match '/', so
// 'https://mail.google.com/*' silently fails on multi-segment paths and the navigation
// escapes to the real Gmail login page. Same trap as tests/e2e/fixtures/gmail-stub.js.
const GMAIL_ROUTE = 'https://mail.google.com/**';

/** Defaults the extension installs with, so each capture starts from a known state. */
const BASE_SETTINGS = {
  siftMode: 'ALL',
  siftTheme: 'system',
  siftDebug: false,
  siftShowButtonText: true,
  siftShowFavourites: true,
  siftShowAiNotetakers: false,
  siftShowDevNotifications: false,
  siftToolbarAlignment: 'center',
};

/**
 * Inbox captures. `rows` is asserted after each one — if the extension's classification changes,
 * or the fixture drifts, the run fails loudly rather than quietly publishing a wrong screenshot.
 */
const SHOTS = [
  // --- one per filter -----------------------------------------------------------------
  { name: 'filter-all', mode: 'ALL', rows: 26 },
  { name: 'filter-emails', mode: 'EMAIL', rows: 24 },
  { name: 'filter-calendar', mode: 'CALENDAR', rows: 2 },
  { name: 'filter-attachments', mode: 'ATTACH', rows: 8 },
  { name: 'filter-images', mode: 'IMAGE', rows: 2 },
  { name: 'filter-pdfs', mode: 'PDF', rows: 2 },
  { name: 'filter-docs', mode: 'DOCUMENT', rows: 2 },
  { name: 'filter-sheets', mode: 'SPREADSHEET', rows: 2 },
  { name: 'filter-slides', mode: 'PRESENTATION', rows: 2 },
  { name: 'filter-favourites', mode: 'FAVOURITES', rows: 2 },
  {
    name: 'filter-ai-notes',
    mode: 'AI_NOTETAKERS',
    rows: 2,
    settings: { siftShowAiNotetakers: true },
  },
  {
    name: 'filter-dev',
    mode: 'DEV_NOTIFICATIONS',
    rows: 2,
    settings: { siftShowDevNotifications: true },
  },

  // --- appearance & layout ------------------------------------------------------------
  { name: 'toolbar-icons-only', mode: 'ALL', rows: 26, settings: { siftShowButtonText: false } },
  { name: 'toolbar-centered', mode: 'ALL', rows: 26, settings: { siftToolbarAlignment: 'center' } },
  { name: 'toolbar-dark-theme', mode: 'ALL', rows: 26, settings: { siftTheme: 'dark' } },
  // Debug mode keeps every row on screen and tints the non-matching ones instead of hiding them,
  // so the assertion is the full 26 rather than the 2 the Calendar filter would normally leave.
  {
    name: 'debug-mode',
    mode: 'CALENDAR',
    rows: 26,
    settings: { siftDebug: true },
  },

  // --- localisation showcase ----------------------------------------------------------
  // The toolbar is fully localised; the surrounding Gmail replica stays in English.
  // Arabic additionally mirrors the whole layout.
  { name: 'locale-en-toolbar', mode: 'ALL', rows: 26, locale: 'en' },
  { name: 'locale-ar-toolbar', mode: 'ALL', rows: 26, locale: 'ar', uiLanguage: 'ar', rtl: true },
  { name: 'locale-zh-cn-toolbar', mode: 'ALL', rows: 26, locale: 'zh_CN', uiLanguage: 'zh-CN' },
  { name: 'locale-hi-toolbar', mode: 'ALL', rows: 26, locale: 'hi', uiLanguage: 'hi' },
];

/** Options-page captures. */
const OPTIONS_SHOTS = [
  { name: 'options-light', colorScheme: 'light' },
  { name: 'options-dark', colorScheme: 'dark' },
  { name: 'locale-en-options', colorScheme: 'light', locale: 'en' },
  { name: 'locale-ar-options', colorScheme: 'light', locale: 'ar', uiLanguage: 'ar' },
  { name: 'locale-zh-cn-options', colorScheme: 'light', locale: 'zh_CN', uiLanguage: 'zh-CN' },
  { name: 'locale-hi-options', colorScheme: 'light', locale: 'hi', uiLanguage: 'hi' },
];

function ensureBuild() {
  if (!fs.existsSync(path.join(EXTENSION_PATH, 'manifest.json'))) {
    throw new Error(
      `Extension build not found at ${EXTENSION_PATH}\nRun \`pnpm run build:chrome\` first.`,
    );
  }
}

/**
 * Returns a path to an extension directory that will render in `locale`.
 *
 * WHY the copy: Chromium on macOS picks its extension message bundle from the *system* locale and
 * ignores --lang (see tests/e2e/i18n-options-page.spec.js), so there is no flag that makes
 * chrome.i18n.getMessage() return Arabic here. Overwriting the English bundles in a throwaway copy
 * of the build makes getMessage() serve the real, unmodified `ar` bundle. Nothing is translated or
 * faked on the fly — the strings are exactly the ones shipped in src/_locales/<locale>.
 *
 * --lang is still passed, because getUILanguage() *does* honour it, and that is what
 * options.js reads to decide `dir="rtl"`.
 */
function extensionForLocale(locale) {
  if (!locale || locale === 'en') return { dir: EXTENSION_PATH, cleanup: () => {} };

  const source = path.join(LOCALES_DIR, locale, 'messages.json');
  if (!fs.existsSync(source)) throw new Error(`No such locale bundle: ${locale}`);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), `sift-${locale}-`));
  fs.cpSync(EXTENSION_PATH, temp, { recursive: true });
  const messages = fs.readFileSync(source, 'utf8');
  // Overwrite every English bundle, since we cannot predict which one the OS resolves to.
  for (const name of ['en', 'en_GB']) {
    const target = path.join(temp, '_locales', name, 'messages.json');
    if (fs.existsSync(target)) fs.writeFileSync(target, messages);
  }
  return { dir: temp, cleanup: () => fs.rmSync(temp, { recursive: true, force: true }) };
}

async function launch({ extensionDir, colorScheme = 'light', uiLanguage = 'en-US' }) {
  const context = await chromium.launchPersistentContext('', {
    headless: false, // Chrome MV3 extensions need a headed context
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      `--lang=${uiLanguage}`,
      '--hide-scrollbars',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  return { context, worker, extensionId: worker.url().split('/')[2] };
}

/** Writes the extension's own settings, exactly as the options page would. */
async function applySettings(worker, settings) {
  await worker.evaluate(async (values) => {
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(values);
  }, settings);
}

async function visibleRowCount(page) {
  return page.evaluate(
    () =>
      Array.from(document.querySelectorAll('.UI tr.zA')).filter(
        (row) => getComputedStyle(row).display !== 'none',
      ).length,
  );
}

async function captureInbox(shot, html) {
  const { dir: extensionDir, cleanup } = extensionForLocale(shot.locale);
  const { context, worker } = await launch({
    extensionDir,
    colorScheme: shot.settings?.siftTheme === 'dark' ? 'dark' : 'light',
    uiLanguage: shot.uiLanguage,
  });

  try {
    await applySettings(worker, { ...BASE_SETTINGS, ...shot.settings, siftMode: shot.mode });

    const page = await context.newPage();
    await page.setViewportSize(VIEWPORT);
    await page.route(GMAIL_ROUTE, async (route) => {
      if (route.request().resourceType() === 'document') {
        await route.fulfill({ status: 200, body: html, contentType: 'text/html' });
      } else {
        await route.fulfill({ status: 204, body: '' });
      }
    });

    await page.goto(GMAIL_URL);
    await page.waitForSelector('.gcal-filter-bar', { timeout: 15000 });

    if (shot.rtl) {
      // Mirror the replica, as Gmail itself does for right-to-left locales.
      //
      // WHY this flips body's children rather than <html> or <body>: setting dir="rtl" at document
      // level makes the renderer paint nothing at all in a headed context with the extension
      // loaded on macOS. Every element keeps correct geometry and computed visibility, but the
      // capture comes back blank, and it does not recover even after the extension's stylesheet
      // and injected toolbar are removed — so it is a Chromium compositing bug, not a Sift one.
      // Flipping one level down produces identical mirroring and paints correctly.
      await page.evaluate((locale) => {
        for (const element of document.body.children) {
          element.setAttribute('dir', 'rtl');
          element.setAttribute('lang', locale);
        }
      }, shot.locale);
    }

    // The mode is seeded in storage, but click through anyway so the capture exercises the same
    // path a user takes, and so the selected button carries its active styling.
    await page.click(`#filter-${shot.mode}`);
    await page.waitForFunction(
      (mode) => document.querySelector(`#filter-${mode}`)?.getAttribute('aria-checked') === 'true',
      shot.mode,
    );
    await page.evaluate(() => document.fonts.ready);

    const rows = await visibleRowCount(page);
    if (rows !== shot.rows) {
      throw new Error(
        `${shot.name}: expected ${shot.rows} visible rows, found ${rows}. ` +
          'The fixture and the extension have drifted apart — fix before publishing.',
      );
    }

    await page.screenshot({ path: path.join(OUTPUT_DIR, `${shot.name}.png`) });
    console.log(`✓ ${shot.name}.png (${rows} rows visible)`);
  } finally {
    await context.close();
    cleanup();
  }
}

async function captureOptions(shot) {
  const { dir: extensionDir, cleanup } = extensionForLocale(shot.locale);
  const { context, extensionId } = await launch({
    extensionDir,
    colorScheme: shot.colorScheme,
    uiLanguage: shot.uiLanguage,
  });

  try {
    const page = await context.newPage();
    await page.setViewportSize(VIEWPORT);
    await page.emulateMedia({ colorScheme: shot.colorScheme });
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('fieldset', { timeout: 10000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `${shot.name}.png`) });
    console.log(`✓ ${shot.name}.png`);
  } finally {
    await context.close();
    cleanup();
  }
}

async function main() {
  ensureBuild();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const html = fs.readFileSync(FIXTURE_PATH, 'utf8');

  // `pnpm run … -- filter-` forwards the literal '--' too, so skip it.
  const filter = process.argv.slice(2).find((arg) => arg !== '--');
  const match = (name) => !filter || name.startsWith(filter);

  const inbox = SHOTS.filter((shot) => match(shot.name));
  const options = OPTIONS_SHOTS.filter((shot) => match(shot.name));

  for (const shot of inbox) await captureInbox(shot, html);
  for (const shot of options) await captureOptions(shot);

  const total = inbox.length + options.length;
  console.log(`\nWrote ${total} screenshot${total === 1 ? '' : 's'} to docs/screenshots/`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
