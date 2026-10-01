# Release checklist

1. `pnpm run version:minor` (or `:patch` / `:major`), then `pnpm run format`.
2. Add a short entry to `CHANGELOG.md`.
3. `pnpm run build`, commit, push.
4. `git tag vX.Y.Z && git push --tags`.
5. `pnpm run release:build` → zips in `artifacts/{chrome,firefox,safari}/`.
6. Load `dist/chrome/` in Gmail and click through the filters. Check the console has no
   `Failed to find Gmail toolbar`.
7. Upload the zips:
   - Chrome: <https://chrome.google.com/webstore/devconsole> → Sift → Package → Upload new package
     → Submit for review.
   - Firefox: <https://addons.mozilla.org/developers/addons> → Sift → Upload New Version. It asks for
     source code because the build is minified: `git archive --format=zip -o source.zip vX.Y.Z`.
     Build instructions: `pnpm install --frozen-lockfile && pnpm run build:firefox`.

## Store description

Keep it plain prose. Chrome rejected a listing for a slash-separated list of filter names and
brands as keyword spam.

```
Sift adds a small toolbar to Gmail so you can narrow the message list you are already looking at with one click.

Show only calendar invites, only regular mail, only messages with attachments, only starred messages, or only messages with a particular kind of attachment such as a PDF or a spreadsheet. Click All to see everything again.

It works in your inbox, labels, sent mail and search results.

Everything happens inside your browser. Sift makes no network requests, collects no data and does not read the contents of your messages; it only looks at the icons and labels Gmail already shows in the list.

Optional extras in the settings page add filters for automated meeting-notes senders and developer notifications.
```

## Dashboard answers

- Single purpose: Adds a toolbar to Gmail that filters the visible message list by category.
- `storage`: Saves the selected filter and display preferences.
- `https://mail.google.com/*`: The toolbar is added to Gmail's message list; it does nothing on any
  other site.
- Data usage: no data collected. Privacy policy: the published `PRIVACY.md`.
