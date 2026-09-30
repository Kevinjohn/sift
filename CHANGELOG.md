# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.12.0] - 2026-09-30

### Fixed

- **The Calendar filter stopped matching any invites after a Gmail update.** Gmail replaced the
  calendar-event row icon, previously an `<img src=".../mail/images/calendar...">`, with an inline
  Material SVG. The detector only knew the image form, so every invite was classified as ordinary
  mail and the Calendar view came up empty, with no error. The same update turned the paperclip
  icon into an SVG as well; attachment filtering kept working only because Gmail still sets the
  `byw` row class, while the `img.aSK` and `data-tooltip` checks matched nothing.

  Every icon check now accepts both forms: the calendar and paperclip icons are also matched by
  their locale-independent SVG path, and the localized "Calendar event", `.ics` and "Has
  attachment" labels are read from `alt` on SVGs as well as images. The calendar icon's
  `title="Has attachment"` is deliberately ignored, so invites are not counted as attachments.

### Changed

- **The toolbar is centred by default.** Start alignment remains available in the options page.
- **The extension name uses a colon instead of an em dash** ("Sift: A Filter Toolbar for Gmail")
  in every locale.
- **The icon's filter glyph is red instead of yellow**, and the marketing screenshots are
  regenerated to match.

## [2.11.0] - 2026-07-31

### Fixed

- **Every language except English still called the extension "Calendar Options".** The 2.9.0 Sift
  rebrand updated `extension_name` in all 25 locales but missed five other keys, so anyone whose
  browser resolved to a non-`en` bundle — including `en_GB` — opened the options page to a heading
  reading "Calendar Options" and a description referring to "the Gmail Calendar Options extension".
  The toolbar's own ARIA label and the browser-action tooltip carried the same stale wording.
  `label_toolbar`, `label_options`, `page_title`, `options_page_description` and
  `extension_action_title` are now translated in all 24 affected locales. `options_alignment_center`
  keeps its British "Centre" in `en_GB`.

### Added

- **Marketing screenshots are now reproducible.** `pnpm run screenshots:capture` drives the built
  extension against an invented Gmail replica (`scripts/screenshots/gmail-inbox.html`) and writes
  the full set in `docs/screenshots/` — one capture per filter, plus theme, layout, debug and
  language variants. The row count of every capture is asserted during the run, so a drift between
  the fixture and the extension's classification fails the run rather than publishing a misleading
  image. No real mailbox is involved.

## [2.10.2] - 2026-07-29

### Changed

- **The options page now holds a readable measure instead of stretching to the window.** Each
  setting is a `space-between` flex row, so on a full-width browser tab the label sat against the
  left edge and its checkbox or select against the right, with a lot of empty space between them —
  the further apart they got, the harder it was to be sure which control belonged to which label.
  The page is now capped at `45rem` and centred.

  The cap is expressed in `rem` rather than pixels on purpose: it is a measure for _text_, so it
  should follow whatever base font size the reader has configured. At a 24px root it opens out to
  1080px instead of squeezing the larger type into a 720px column, and at a 12px root it tightens to
  540px. A fixed `720px` would have quietly worked against anyone who had increased their default
  font size for legibility.

### Documentation

- **Added a "See It In Action" section to the README** with five screenshots: the toolbar in a full
  inbox, the Calendar, Attachments and PDFs filters narrowing that same inbox, and the options page.
  The repository described what the extension did without ever showing it.

  The screenshots are captures of the extension running against live Gmail, with sender names,
  subjects, previews, attachment filenames and label names replaced. The substitution deliberately
  left every signal the filters read — attachment file extensions, `.ics` markers, calendar icons,
  star state — untouched, and the visible-row counts were compared before and after to confirm the
  results are real rather than staged. The README says so explicitly, so nobody has to take the
  images on trust.

  Each image carries descriptive alt text stating both what is on screen and what the filter did,
  since the point being illustrated is the change in the list, which a filename cannot convey.

## [2.10.1] - 2026-07-29

### Fixed

- **A stale toolbar no longer pretends to work after the extension updates.** When the extension is
  updated or reloaded, already-open Gmail tabs keep running the previous content script. Its toolbar
  stayed fully interactive but was attached to a dead extension context: clicking a filter applied
  it optimistically, then threw `TypeError: Cannot read properties of undefined (reading
'getMessage')` from `refreshUI`, because an orphaned script has no `chrome.i18n`. The write had no
  live `chrome.storage` to reach either, so the chosen filter silently reverted on the next page
  load — the toolbar looked like it worked and did not.

  `selectMode` now checks `isExtensionContextInvalidated()` before touching state or the DOM, and
  the new `markToolbarStale` disables the filter buttons, removes them from the tab order and dims
  the bar, so it reads as "reload Gmail" rather than as working controls. `markToolbarStale` is
  deliberately DOM-only and calls no extension API, since it runs precisely when those APIs are
  gone; a test nulls `chrome` entirely to hold that line.

  Found by exercising the extension against real Gmail. Every automated gate was green throughout —
  an orphaned content script needs a real extension reload underneath a live page, which neither the
  unit suite nor Playwright can manufacture.

### Internal

- **Extracted the filter mode's write path into `src/modules/mode.js`.** `selectMode`, the
  serialised persistence queue and the local write-ID bookkeeping are one unit — a caller that
  bumped the queue's epoch without owning the queue could silently drop a write — so they now live
  behind three verbs (`selectMode`, `consumeLocalModeWrite`, `supersedeQueuedModeWrites`) instead of
  as loose module state in `contentScript.js`, which is back to being wiring.
- **Covered the optimistic-update rollback, which was previously untestable.** Rolling back a failed
  mode write depends on reading the `currentMode` binding that `setCurrentMode` just mutated, and
  the contentScript suite mocks the state module — where `currentMode` is a frozen literal in the
  mock namespace, so the guard is permanently false and the branch never ran. `tests/mode.test.js`
  exercises the real state module; both the rollback and its stale-mode guard now fail the suite
  when broken. Coverage floors: `mode.js` pinned at 100% statements/branches/lines,
  `contentScript.js` raised to 88/90/70/90.
- **Documented how to detect Gmail selector drift** in `docs/notes/gmail-selector-drift.md`, with a
  console check for the toolbar candidates and instructions to update the e2e fixture alongside the
  selectors. Added it to the Chrome section of the release checklist. Gmail's markup change in
  2.10.0 was invisible to CI because the fixture described a Gmail that no longer existed.

## [2.10.0] - 2026-07-29

### Fixed

- **The toolbar no longer depends on the mutation observer to appear.** Gmail dropped both
  `role="toolbar"` and the `.G6` class from its action bar, which left all four of the extension's
  toolbar selectors matching nothing. `waitForGmailToolbar` therefore rejected after ten seconds on
  every page load, and because that rejection happens inside `main()`, the whole initial setup —
  `injectToolbar`, `refreshUI`, `waitForMessageTable`, `applyFilter` and `observeMessageList` — was
  skipped. The extension only kept working because the toolbar observer queries the `.aeH` header
  directly and re-injected on the next DOM mutation, which is also why the toolbar visibly lagged on
  load. A page load quiet enough not to trigger a `childList` mutation would have left no toolbar at
  all.

  Added `gmailToolbarMain` (`.aeH [gh="tm"]`) as the primary selector. `gh="tm"` is Gmail's own
  long-lived hook for the main toolbar, is not locale-dependent, and is structurally guaranteed to
  sit inside the `.aeH` header that injection targets. The previous selectors are retained as
  fallbacks for older Gmail.

- **Toolbar lookup no longer dead-ends on the first matching selector.** The lookup took the first
  selector that matched anything, then required that element to have an `.aeH` ancestor. Gmail
  renders around twenty `[role="toolbar"]` elements, nearly all of them outside `.aeH`, so a match
  in the wrong place made `closest()` return null — and the poll retried that same element every
  100ms until timeout instead of trying the remaining candidates. Lookup now walks every candidate
  and returns the first that actually resolves to a header, exposed as `findGmailToolbarHeader`.

### Internal

- The Playwright Gmail fixture now mirrors Gmail's current action-bar markup (`gh="tm"`, no
  `role="toolbar"`, no `.G6`). It previously used the older structure, so the e2e suite stayed green
  against selectors that had already stopped matching real Gmail — the reason this reached
  production. With the fixture updated, reverting the selector fix fails five e2e specs.
- The toolbar observer deliberately continues to query `.aeH` directly rather than sharing the
  candidate chain. That asymmetry is what kept the extension usable through this Gmail change;
  unifying the two would turn a logged warning into a completely dead toolbar. Commented in place.

## [2.9.0] - 2026-07-29

### Changed

- **Rebranding**: The extension is now "Sift — A Filter Toolbar for Gmail". Google's branding rules
  do not permit a Google trademark as the leading word in a third-party product name, which would
  have blocked Chrome Web Store submission. Because nothing had been published yet, the rename was
  applied throughout rather than layered on top of the old identifiers:
  - npm package name is now `sift`.
  - Release archives are named `sift-<browser>-v<version>.zip`.
  - The Safari wrapper app is generated as `Sift` with bundle identifier
    `com.kevinjohngallagher.Sift`.
  - The Firefox gecko ID is now `sift@kevinjohngallagher.com`. Firefox treats this as a new add-on,
    so a locally installed copy under the old ID must be removed.
- **Storage keys renamed.** Every key was namespaced under `sift`, replacing the `gmailCal` prefix
  left over from when the extension only showed, hid, or highlighted calendar invites, and the
  unprefixed `showButtonText` / `showFavourites` / `showAiNotetakers` / `showDevNotifications` /
  `toolbarAlignment` keys.

  | Was                      | Now                        |
  | ------------------------ | -------------------------- |
  | `gmailCalMode`           | `siftMode`                 |
  | `gmailCalDebug`          | `siftDebug`                |
  | `gmailCalTheme`          | `siftTheme`                |
  | `gmailCalModeWriteId`    | `siftModeWriteId`          |
  | `gmailCalOptionsWriteId` | `siftOptionsWriteId`       |
  | `showButtonText`         | `siftShowButtonText`       |
  | `showFavourites`         | `siftShowFavourites`       |
  | `showAiNotetakers`       | `siftShowAiNotetakers`     |
  | `showDevNotifications`   | `siftShowDevNotifications` |
  | `toolbarAlignment`       | `siftToolbarAlignment`     |

  This is a cold rename with no compatibility shim, because there are no installs to migrate. Any
  locally installed copy loses its saved preferences once and falls back to defaults.

- `KEY_MODE` and `KEY_DEBUG` moved from `state.js` to `constants.js`, where every other storage key
  already lived, so the background service worker imports them instead of repeating the literals.
  `contentScript.js` imports them from `constants.js` too, leaving one canonical path per key.
- The debug key in `options.js` now flows through `KEY_DEBUG` instead of being repeated as a bare
  `'siftDebug'` literal in four places.
- Manifests now declare `homepage_url`.

### Fixed

- `storageGet` and `storageSet` are `async` again. Resolving the storage backend dereferences
  `chrome.storage`, which Firefox strips from an orphaned content script after an extension update;
  without `async` that TypeError is thrown synchronously, and `loadState()` attaches its fail-safe
  `.catch` to the returned promise rather than wrapping the call — so the safe defaults were skipped
  and content-script initialisation aborted with an unhandled rejection instead of degrading
  gracefully.

### Added

- Clicking the browser toolbar icon opens the options page. The manifest declares an action with no
  popup, so previously the icon was a dead click. Failures are reported from both the throw and the
  promise-rejection path, since `openOptionsPage()` returns a promise under MV3.
- `PRIVACY.md`, documenting that the extension collects, stores, and transmits no user data, and
  enumerating the display preferences it keeps in extension storage. Required for Chrome Web Store
  submission because the extension runs on Gmail.
- A Chrome Web Store listing section in `docs/release-checklist.md` covering asset specifications,
  permission justifications, and the data usage certification.

### Removed

- The legacy `storage.local` to `storage.sync` recovery path in `storageGet`. It existed to carry
  preferences written by an older local-only build into sync storage, along with the defensive
  re-read, one-time cleanup, and best-effort write-failure handling that made it safe. With no
  installs in existence it could never fire. `storageGet` is now a single read from the active
  backend, and the `removeFromStorage` and `getRequestedKeys` helpers it needed are gone with it.
  Six tests covering the migration were removed; `storage.js` remains at 100% coverage.
- The `chrome.runtime.onMessage` handler in the content script, along with its `setMode` and
  `refreshFilter` branches. Nothing in the extension ever sent those messages — only tests did — so
  roughly 30 lines of validation and response logic were being maintained for a path that could not
  execute. The behaviour those tests covered indirectly (click-driven mode changes, persistence,
  and the optional-mode fallback) is now driven through real toolbar clicks instead.
- A stray `console.log` emitted on install.

## [2.8.0] - 2026-07-27

### Fixed

- Rapid filter changes and options edits can no longer be overwritten by delayed storage
  acknowledgements. Writes now carry per-writer transaction identifiers, options persist only the
  fields that actually changed, obsolete queued writes are skipped, and genuine changes from other
  tabs remain authoritative.
- Preference migration now fails open when the defensive sync-storage re-read is temporarily
  unavailable, preserving recovered legacy values without attempting a potentially destructive
  migration.
- Message filtering now hides rows with an extension-owned CSS class instead of rewriting Gmail's
  inline `display` style, so Gmail can update row presentation while a filter is active without the
  extension restoring stale style data later.
- Calendar-invite detection now recognises realistic `.ics` filenames followed by punctuation or
  query text while rejecting lookalike extensions such as `.icsx`, `.ics.gz`, and `.ics-copy`.
- Message-list observers now react when Gmail updates attachment and message metadata attributes,
  disconnect cleanly when lists disappear, and cancel obsolete toolbar mutation work when the
  observer is replaced.
- Installation timing now measures the actual default-preference write and reports the no-op case
  separately instead of logging unrelated promise-chain time.
- Options-page labels use logical spacing in right-to-left locales, and the page now includes a
  mobile viewport declaration and extension icon.
- The Lighthouse audit always closes its local server when Chrome fails to launch and no longer
  supplies conflicting remote-debugging flags.

### Build and release

- Added release-package inventory checks for manifests, options dependencies, styles, locales,
  licences, notices, and directly referenced assets across Chrome, Firefox, and Safari archives.
- Added `pnpm run verify:dist` so CI rejects stale, modified, deleted, or untracked generated browser
  distributions, plus `pnpm run release:verify` to package and inspect an existing verified build
  without rebuilding Chrome and Firefox twice.
- Batch file updates now reject duplicate destinations, preserve existing file permissions, use
  collision-resistant temporary names, and roll back completed replacements if a later rename
  fails.
- Browser builds now include the project licence, and the release tooling verifies that every
  manifest version matches `package.json`.
- Added a tracked vector icon source, reproducible icon-regeneration instructions, and refreshed
  raster icons for all supported sizes.
- Environment validation now checks the Playwright Chromium executable actually used by the E2E
  suite, while CI boolean parsing correctly treats `CI=0` and `CI=false` as local execution.

### Documentation and quality

- Added a repository-wide Markdown link validator covering nested destinations, optional titles,
  reference-style links, URL-encoded paths, local fragments, and fenced-code exclusions; repaired
  broken issue-template and pull-request-template links discovered by the check.
- Expanded CI to run the complete linter, documentation validation, generated-distribution checks,
  and release-package verification.
- Updated filtering, storage, browser compatibility, icon maintenance, testing, and release
  documentation to match shipped behaviour and current commands.
- Strengthened keyboard-focus and live-region E2E assertions and added regression coverage for
  storage races, migration failures, metadata mutations, ICS edge cases, atomic file writes,
  documentation links, distribution drift, and release archive contents. The unit suite now
  contains 231 tests.

## [2.7.2] - 2026-07-25

### Fixed

- Windows High Contrast mode now applies to the filter toolbar and the options page. The
  high-contrast colour block was written for a bare `:root`, but the theme blocks it needed to
  override are attribute-qualified and therefore more specific — and the theme attribute is always
  present, so those blocks always won. High-contrast users got the extension's hardcoded greys
  (`#f1f3f4` background, `#202124` text) instead of their chosen system colours, in both light and
  dark high-contrast themes.
- The orphaned-content-script guard no longer reports a dead context as live when the browser has
  removed the extension API object outright, rather than merely clearing its id. Firefox can do
  this after an update; the guard's `!!runtime && !runtime.id` test read the missing object as
  "valid", which would have let toolbar injection proceed far enough to empty the toolbar wrapper
  before failing on its first extension API call, leaving an open Gmail tab with no filter bar
  until it was reloaded.

### Internal

- Both changes came out of a full-source review pass. The rest of that pass's findings were
  deliberately not acted on: they described plausible failures derived from reading code rather
  than observed ones, and several could not be verified without a browser. Changing working code
  on that basis was judged the larger risk. See the review notes for the unactioned candidates —
  the page-wide `.G-atb` padding and the inline `display` handling in `applyFilter` are the two
  most likely to be worth revisiting, and both can be settled by inspection in DevTools.

## [2.7.1] - 2026-07-24

### Internal

- Repaired the end-to-end test suite, which had been silently failing everywhere: the Gmail route
  stub's URL glob never matched multi-segment paths (Playwright's `*` does not match `/`), so every
  spec escaped to the real Gmail sign-in page — locally hanging for ~30 minutes and failing in CI.
- Fixed four long-broken spec assertions exposed once the stub engaged: `chrome.i18n` lookups from
  the page's main world, hidden buttons skewing the toolbar wrap measurement, a wrapper-position
  selector anchored to the wrong element, and an alignment class that never existed.
- Non-English locale assertions now skip on macOS, where Chromium ignores `--lang`; CI covers them.
- Local suite result: 20 passed, 5 skipped in ~13 seconds. No extension code changed.

## [2.7.0] - 2026-07-24

### Fixed

- Options page no longer risks wiping saved preferences: controls stay disabled until stored
  settings finish loading, saves are blocked before restore completes, and failed loads retry
  automatically with backoff instead of leaving the page unusable.
- Extension updates no longer leave a blank toolbar in open Gmail tabs: orphaned content scripts
  detect the invalidated context before touching the DOM, and the new script repairs a gutted
  toolbar wrapper.
- "Match system theme" now follows Gmail's actual rendered theme (very common: light OS with dark
  Gmail) and keeps tracking OS and Gmail theme changes live, instead of sampling once at load.
- Multiple Inboxes: new mail arriving in the second and later inbox sections is now filtered —
  previously only the first message list was observed.
- Filter mode changes now sync across open Gmail tabs, and the one-time preference migration
  cleans up its legacy keys without echoing "reset to defaults" events into open pages.
- Gmail tabs opened in the background no longer log a spurious "toolbar not found" timeout.
- AI & Transcription filter no longer misclassifies people whose names contain a product word
  (e.g. a colleague named Claude), while still matching real senders like "Microsoft 365 Copilot"
  and "Fathom AI Notetaker".
- Attachment detection gained a locale-aware tooltip fallback, and the toolbar gained a
  locale-independent structural fallback selector for non-English Gmail.

### Accessibility

- Keyboard focus survives Gmail-triggered toolbar rebuilds instead of dropping to the page.
- Screen readers only hear filter announcements when the filter actually changes.
- Arrow-key navigation is now RTL-aware and supports Home/End/Up/Down per the ARIA radiogroup
  pattern; icon-only buttons show native hover tooltips.
- Debug-mode row highlighting follows the active theme (and forced-colors mode).

### Security & privacy

- Removed the unused `web_accessible_resources` font entry and the orphaned `.woff2` file from
  shipped packages, eliminating an extension-fingerprinting probe surface.
- Added the explicit extension-pages CSP to the Safari manifest for parity with Chrome/Firefox.
- Scoped `color-scheme` to extension surfaces so the extension no longer alters scrollbar and
  form-control rendering across the whole Gmail page.

### Internal

- Migrated to ESLint 9 flat config; Prettier formatting now enforced in CI and pre-commit.
- Unit suite grew from 162 to 200 tests with a dedicated coverage floor for the core filter
  module; Playwright runs are capped locally (5-minute global timeout, fail-fast) so a broken
  local environment cannot hang for half an hour.
- Removed the unused `options_debug` locale key and added options status + attachment tooltip
  strings across all 25 locales; the locale linter now tolerates stray files like `.DS_Store`.
- Moved internal working notes out of the repository root and untracked husky's generated files.

## [2.6.1] - 2026-07-24

### Fixed

- Pinned pnpm to 11.7.0 so GitHub Actions can install dependencies instead of failing during
  package-manager setup.

## [2.6.0] - 2026-07-23

### Launch hardening

- Changed Chrome locale directories to supported base or special-region codes, added locale
  schema validation, and completed translations for experimental settings.
- Preserved user preferences during extension updates and seeded only missing defaults on first
  install.
- Made calendar and favourites detection independent of Gmail's display language.
- Validated all incoming filter modes and made storage failures roll back cleanly instead of
  leaving UI and persisted state out of sync.
- Restored icon-only mode after Gmail toolbar reinjection and made message-list observation
  subtree-aware and idempotent.
- Standardised development and release automation on pnpm with a frozen lockfile.
- Enabled the Playwright CI workflow, pinned third-party GitHub Actions to immutable commits, and
  made the changelog check read-only.
- Added verified Chrome, Firefox, and Safari release packaging, including Firefox `web-ext` linting
  and packaging.
- Added Material Symbols licence and notice files to source and packaged builds.

### Security & Privacy

- **Icon font is now bundled locally**: The toolbar's Material Symbols Outlined font (subsetted to only the 12 glyphs used) ships inside the extension instead of being loaded from the Google Fonts CDN on every Gmail page load. The extension now makes zero external network requests.
- **Tightened Content Security Policy**: Removed unneeded `fonts.googleapis.com`/`fonts.gstatic.com` allowances and the `sandbox` CSP block from the Chrome and Firefox manifests.
- Removed the unused, never-referenced `Material Icons` font files that previously shipped in all builds.

### Performance

- **Debounced the document-wide toolbar observer**: Gmail's constant DOM mutations no longer trigger selector queries, observer re-attachment, and filter re-application on every mutation (now batched at 200 ms).
- **`waitForMessageTable()` now times out after 15 s** instead of polling via `requestAnimationFrame` forever when no email rows exist (empty inbox or changed Gmail markup); the body observer still picks up rows that appear later.
- `waitForGmailToolbar()` now stops its polling loop after the 10 s timeout fires instead of continuing to poll.

### Fixed

- **Keyboard navigation skips hidden filter buttons**: Arrow keys can no longer focus and activate an invisible filter button (Favourites/AI/Dev when disabled in options).
- Runtime callers can select valid hidden modes without enabling their toolbar buttons.
- Safari upgrades recover existing preferences from local storage before moving them to sync
  storage.
- Disabling the active optional filter now remains on All if persisting that reset fails.
- Calendar and Drive attachment detection no longer over-matches unrelated relative URLs or
  image paths.
- Active filters are re-applied when Gmail re-injects the toolbar without replacing the message
  list.
- Options-page theme changes render immediately while their storage write is pending.
- `pnpm run audit:options` now targets `dist/chrome/options.html` (was broken since the per-browser build split).
- Changelog GitHub workflow: `printf` instead of `echo "\n..."` (which wrote a literal `\n`), and it now checks out and pushes `main` instead of failing on a detached tag HEAD.
- Pre-commit hook now runs on all platforms with pnpm available (previously it silently skipped everywhere except WSL, letting lint failures reach the repo).
- Fixed 3 ESLint errors in test files (unused variables) that the skipped hook had let through.

### Open-source readiness

- Added CI workflow (lint, locale validation, unit tests, both browser builds, Firefox add-on lint) for pushes and pull requests.
- Added `license`, `author`, `repository`, `keywords`, and `engines` metadata to `package.json`.
- Untracked internal working notes (`_todo/`, `_scratchpad/`), local Claude settings, and `.DS_Store` files; fixed `.gitignore` casing.
- Fixed placeholder `YOUR_USERNAME` links in `.github/config.yml`, the reversed/broken licence link in the README, stale module paths and function names across README and docs, and the duplicate "How It Works" heading.

### Changed

- **Button Labels**: Shortened English toolbar button labels for better UI density
  - "Everything" → "All", "Documents" → "Docs", "Spreadsheets" → "Sheets", "Presentations" → "Slides", "AI & Transcription" → "AI & Notes"
  - Updated in both `en` and `en_GB` locales

### Added

- **Dev Notifications Filter** _(experimental)_: New filter button to show only GitHub and GitLab notification emails
  - Detects sender email domains (`github.com`, `gitlab.com`) for reliable matching
  - Hidden by default – enable via Options > Experimental > "Show Dev Notifications button"
  - Button label: "Dev" with `code` Material Symbol icon
  - Full unit test coverage for detection logic (GitLab, GitHub, regular sender, case-insensitive)
  - Added to all 27 locale files

### Build compatibility

- **Build System**: Content scripts are now built as self-contained IIFE bundles across all browsers
  - Fixes "Cannot use import statement outside a module" error in Chrome, Firefox, and Safari
  - Content scripts don't support ES modules in any browser; `"type": "module"` in `content_scripts` was silently ignored
  - Removed invalid `"type": "module"` from Chrome manifest `content_scripts` field
  - Background code is bundled separately into one self-contained script for all browsers
  - Chrome and Firefox load that bundle as a module; Safari loads it as a compatible classic
    background script

## [2.5.3] - 2025-10-06

### Code Quality

- **Variable Naming**: Improved variable naming for better code clarity and maintainability
  - Renamed `btn` → `filterButton` in contentScript.js and toolbar.js for clearer button references
  - Renamed `res` → `storageData` in state.js and options.js for more descriptive storage callbacks
  - Renamed `waitForGmailChrome` → `waitForGmailToolbar` in observers.js and all references - removes misleading "Chrome" from cross-browser function name
  - Updated all test files to reflect new naming conventions
  - All 115 unit tests passing with no breaking changes

## [2.5.2] - 2025-10-06

### Documentation

- **Code Comments**: Added strategic "WHY" comments to preserve architectural knowledge
  - Toolbar sibling placement strategy (toolbar.js) - prevents toolbar destruction during Gmail DOM updates
  - Observer idempotency pattern (observers.js) - handles Gmail's SPA navigation safely
  - Body-level observer strategy (observers.js) - stable parent survives DOM replacements
  - Toolbar re-injection safety net (observers.js) - handles edge cases during pagination
  - Favourites mode reset logic (contentScript.js) - prevents users stuck in hidden filter mode
  - Attachment filter business logic (filter.js) - calendar invites excluded from attachment view
  - Debounced filter optimization (observers.js) - performance during rapid DOM mutations
  - Browser-specific build strategy (vite.config.mjs) - Firefox vs Chrome manifest differences
  - All comments reference `_remember_*.md` lessons learned documents where applicable

## [2.5.0] - 2025-10-02

### Changed

- **Build System**: Split build output into browser-specific directories
  - Chrome builds to `dist/chrome/`, Firefox builds to `dist/firefox/`
  - `npm run build` now builds both browsers simultaneously
  - Prevents manifest conflicts when testing multiple browsers
  - Updated all tooling: Vite config, npm scripts, Playwright fixtures, release script
  - **BREAKING CHANGE**: Extension loading paths changed from `dist/` to `dist/chrome/` or `dist/firefox/`
  - Both browser builds can now coexist without conflicts

### Documentation

- **Contributor documentation**: Updated loading instructions for new browser-specific directories
  - Chrome/Edge: Load `dist/chrome/` folder
  - Firefox: Load `dist/firefox/manifest.json`
  - Added note about simultaneous builds
- **README.md**: Updated all references to use browser-specific paths
  - Quick Start sections updated for both browsers
  - Building for Production sections clarified
  - Project Structure diagram updated

## [2.4.0] - 2025-10-02

### Changed

- **Rebranding**: Updated extension name from "Gmail Calendar Options" to "Gmail Filter Toolbar"
  - Updated extension name across all 27 locales
  - Updated extension description to "Filter Gmail by calendar invites, attachment type, AI notes, or regular mail."
  - Updated console logs and fallback text in options.js and background.js
  - Name now accurately reflects the full filtering capabilities beyond just calendars

### Documentation

- **Contributor documentation**: Added a critical warning about browser-specific builds
  - Clarified that `dist/` folder only works for ONE browser at a time
  - Chrome requires `npm run build:chrome` (uses `src/manifest.json`)
  - Firefox requires `npm run build:firefox` (uses `src/manifest.firefox.json`)
  - Added separate loading instructions for Chrome/Edge and Firefox
  - Prevents manifest compatibility errors when switching between browsers

## [2.3.2] - 2025-10-02

### Fixed

- **Firefox Build**: Ensured Firefox build has complete parity with Chrome v2.3.1
  - Verified Firefox-specific manifest (`browser_specific_settings` with gecko ID)
  - Confirmed AI & Transcription feature properly bundled
  - Verified experimental features section in options page
  - All recent features (AI filter, options refactor, styling) included

## [2.3.1] - 2025-10-02

### Fixed

- **Tests**: Updated contentScript integration test mocks to include new AI & Transcription exports
  - Added `showAiNotetakersButton` and `setShowAiNotetakersButton` to state.js mock
  - Added `updateAiNotetakersVisibility` to toolbar.js mock
  - Added `AI_NOTETAKERS` to MODES enum in mock
  - All 115 unit tests now pass

## [2.3.0] - 2025-10-02

### Added

- **Experimental AI & Transcription Filter**: New filter to show emails from AI services and transcription tools
  - Detects emails from Gemini, ChatGPT, Claude, Copilot, Otter.ai, Fathom, and Fireflies.ai
  - Optional feature disabled by default - enable in options page under "Experimental" section
  - Button appears at the end of the toolbar (after Presentations filter)
  - Uses smart_toy Material Icon
  - Robust sender detection with multiple fallback selectors for Gmail DOM compatibility
  - Localized with `btn_ai_notetakers` and `options_show_ai_notetakers` i18n keys
  - Real-time visibility toggle from options page
  - Automatically switches to "Everything" filter if disabled while active

### Technical

- Added `AI_NOTETAKERS` mode to filter modes enum
- Added `AI_NOTETAKER_PATTERNS` regex array for sender matching
- Added `showAiNotetakersButton` state variable and storage key
- Added `isAiNotetakerRow()` detection function with fallback selectors
- Added `updateAiNotetakersVisibility()` toolbar function
- Default value set to `false` in background.js on extension install
- Unit tests added for AI notetaker detection function

## [2.2.2] - 2025-10-02

### Changed

- **Code Quality**: Removed inline styles from options page HTML
  - Moved `margin-bottom`, `font-style`, and `line-height` from inline styles to options.css
  - All styling now properly separated into stylesheets

## [2.2.1] - 2025-10-02

### Changed

- **UI Polish**: Improved options page spacing
  - Changed fieldset padding from all sides to top-only (`padding-top: 1em`)
  - Added bottom margin to fieldsets (`margin-bottom: 1rem`)
  - Removed font-size override from experimental description text for consistency

## [2.2.0] - 2025-10-02

### Added

- **Experimental Features Section**: Added new "Experimental" section to options page
  - Empty section with descriptive text indicating features are in active testing
  - Localized with `experimental_legend` and `experimental_description` i18n keys
  - CSS styling for experimental description text
  - Prepares UI for upcoming experimental feature toggles (Phase 4)

### Changed

- **Documentation**: Added JSDoc `@stable` annotations to all existing features in preparation for experimental feature introduction
  - Annotated storage keys, enums, and configuration objects in `constants.js`
  - Annotated state variables and storage keys in `state.js`
  - Annotated filter detection functions in `filter.js`
- **Documentation**: Documented a proposed feature-flag system for scaling experimental features

## [2.1.0] - 2025-10-02

### Changed

- **UI Update**: Changed active button color from Google Blue to Gmail Red (#d93025 in light mode, #f28b82 in dark mode) for better brand consistency

## [2.0.1] - 2025-10-01

### Changed

- **Branding Update**: Rebranded extension from "Gmail Calendar Options" to "Gmail Filter Toolbar" to better reflect expanded functionality
  - Updated extension name, description, and all user-facing strings
  - Package name updated to `sift`
  - Emphasizes email filtering capabilities (calendar invites, attachments, starred messages, regular mail)
- **Documentation**: Improved descriptions of filtering functionality and cross-browser compatibility

## [2.0.0] - 2025-10-01

### Added

- **Firefox Support**: Full Mozilla Firefox compatibility (Firefox ≥ 121)
  - Firefox-specific manifest with gecko ID `sift@kevinjohngallagher.com`
  - Dual background script declaration (service_worker + scripts)
  - Cross-browser build system with environment-based manifest selection
- **Multi-Browser Build System**:
  - `npm run build:chrome` - Build Chrome/Edge version
  - `npm run build:firefox` - Build Firefox version
  - `npm run firefox:run` - Launch Firefox with extension for testing
  - `npm run firefox:lint` - Validate Firefox extension
  - `npm run firefox:package` - Create AMO-ready ZIP package
- **Distribution Scripts**:
  - `npm run release:build` - Build packages for both browsers
  - `npm run version:major/minor/patch` - Automated version management
  - Dual-browser release packaging with validation
- **Development Tools**:
  - `web-ext` integration for Firefox development workflow
  - `cross-env` for cross-platform environment variables
  - Automated manifest switching based on target browser

### Changed

- **Build System**: Vite config now uses `BROWSER` environment variable to select appropriate manifest
- **Pre-commit Hooks**: Now only run in WSL environment (skip on Windows Git GUI)
- **Test Coverage**: Excluded optional `browser-polyfill.js` from coverage requirements
- **Documentation**: Added comprehensive Firefox support documentation

### Technical

- All `chrome.*` APIs verified compatible with Firefox (no code changes required)
- Firefox uses background scripts instead of service workers (transparent to functionality)
- Optional browser API polyfill created for future compatibility
- Firefox manifest excludes Chrome-specific properties (`type: "module"` in content_scripts, CSP sandbox)

### Breaking Changes

- Major version bump due to significant new browser support and build system changes
- No breaking changes to existing Chrome/Edge functionality

## [1.1.1] - 2025-09-30

- docs: add `AGENTS.md` contributor guide for automation collaborators.
- i18n: add Hindi, Arabic, and Simplified Chinese locales; complete translations across existing language bundles.
- chore: bump extension version to 1.1.1.

## [1.1.0] - 2025-09-30

- feat: Dynamically set HTML lang attribute based on browser locale in options page.
- docs: Add future i18n roadmap items for completing translations and adding language switching UI.

## [1.0.0] - 2025-09-30

- chore: Major version bump to 1.0.0 marking stable release.
- test: Complete E2E test suite with 7 specs and Page Object Model pattern.
- test: Add WSL2-aware test infrastructure with automatic skip detection.
- test: Achieve 98.67% unit test coverage across 106 tests.
- chore: Implement automated pre-commit hooks (ESLint + unit tests).
- fix: Resolve ESLint errors in test files.
- fix: Update Husky pre-commit hook for v10 compatibility.
- fix: Make pre-commit hook resilient to npm PATH issues.
- chore: Add test artifacts to .gitignore.

## [0.1.0] - 2025-07-08

- feat: Implement granular attachment filtering (images, PDFs, documents, spreadsheets, presentations).
- feat: Move Favourites button to the end of the toolbar.
- fix: Refine Google Drive attachment identification to prevent false positives.
- fix: Include Google Docs in the general attachment filter.
- refactor: Remove "only" from all button labels in locales JSON.

## [0.0.13] - 2025-07-07

- feat: Add option to show/hide text on filter buttons.
- chore: Version bump to 0.0.13

## [0.0.12] - 2025-07-07

- chore: Version bump to 0.0.12

## [0.0.11] - 2025-07-07

- feat: Add new languages and linting for language files.
- refactor: Remove redundant files and clean up CSS.
- docs: Enhance contribution and security guidelines.

## [0.0.10] - 2025-07-05

- feat: Implement CTO review feedback up to Section 7 and revert Section 8 changes.

## [0.0.9] - 2025-07-05

- feat: Improve accessibility and fix pagination filter bug

## [0.0.5] - 2025-07-03

- chore(release): prepare for v0.0.5 release

## [0.0.4] - 2025-07-03

- chore: Update version to 0.0.4

## [0.0.3] - 2025-07-03

- fix: Correct manifest version to 0.0.3 (Chrome Web Store compatible)

## [0.0.2] - 2025-07-02

- refactor: Modularise contentScript.js

## [0.0.1] - 2025-07-02

- docs: Update and enhance README

## [0.0.0] - 2025-06-20

- Initial release.
