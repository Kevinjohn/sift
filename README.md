# Sift: A Filter Toolbar for Gmail

A small toolbar for Gmail that narrows the message list with one click: calendar invites, regular
mail, attachments, starred messages, or a single attachment type. Everything runs in your browser;
it makes no network requests and collects nothing ([privacy](PRIVACY.md)).

I built it for myself. You're welcome to use it.

![Sift's toolbar above a Gmail inbox, with All selected.](docs/screenshots/filter-all.png)

## Install

- **Chrome / Edge:** the Chrome Web Store, or build it yourself (below).
- **Firefox:** addons.mozilla.org, or build it yourself.

Settings live on the extension's options page: button labels, alignment, theme, debug highlighting
and a couple of optional filters.

## Build it yourself

Needs Node 20+ and pnpm.

```bash
pnpm install
pnpm run build
```

Then load `dist/chrome/` via `chrome://extensions` → Developer mode → **Load unpacked**, or run
`pnpm run firefox:run` for Firefox. `pnpm run safari:convert` makes an Xcode project for Safari.

## Develop

```bash
pnpm test           # unit tests
pnpm run e2e        # Playwright against an offline Gmail fixture
pnpm run lint
pnpm run format
```

When Gmail changes its markup and a filter stops working, the selectors live in
[`src/modules/constants.js`](src/modules/constants.js) and the detectors in
[`src/modules/filter.js`](src/modules/filter.js). [`docs/notes/`](docs/notes/) has short notes on
the trickier bits.

## Licence

MIT © [Kevinjohn Gallagher](https://kevinjohngallagher.com). Third-party notices are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
