# Chrome Web Store Listing Source

This folder stores approved Chrome Web Store messaging and promo collateral for Tab Manager v2.

## Approved Summary

`Search, group, move, and clean up tabs across browser windows with a keyboard-first workflow`

This summary is mirrored in `../packages/extension/package.json` so production manifests inherit the same short description.

## Approved Description

```text
Tab Manager v2 turns crowded browser sessions into a searchable workspace.

See every tab across every window, find what you need fast, move matching tabs in bulk, manage native tab groups where supported by the browser, and clean up duplicates without window hopping.

Highlights

- Search open tabs by title or URL, with optional browser history results in the same search box
- Select matching tabs and move, group, or close them in bulk
- Manage native tab groups directly where supported by the browser: rename, recolor, collapse, and ungroup them in place
- Reorder tabs with drag and drop across windows from one focused view
- Highlight duplicate tabs and clean them up quickly, with an option to ignore URL hashes
- Stay on the keyboard with shortcuts, focus mode, and the command palette
- Adjust theme, tab width, font size, toolbar visibility, URL display, and more
- Support Firefox container-aware workflows when the browser exposes those APIs

Free and open source. Core functionality runs locally in your browser.

Open source: https://github.com/xcv58/Tab-Manager-v2
Support and issues: https://github.com/xcv58/Tab-Manager-v2/issues
```

## Messaging Pillars

- One searchable workspace for every tab across every window
- Bulk control instead of one-tab-at-a-time cleanup
- Native tab groups where supported by the browser, not an extension-only grouping system
- Keyboard-first speed without forcing jargon or setup complexity
- Free, open source, with core functionality running locally in the browser

## Tone Guidance

- Lead with relief, control, and clarity rather than generic efficiency claims.
- Prefer outcomes over feature labels when writing headlines and descriptions.
- Use `native tab groups` when that browser-level distinction matters.
- Avoid vague phrases such as `manage tabs efficiently`.

## Promo Assets

- `Small tile.png`: 440x280, PNG24, no alpha
- `Large tile.png`: 920x680, PNG24, no alpha
- `Marquee.png`: 1400x560, PNG24, no alpha
- `Marquee 1280x640.png`: 1280x640, PNG24, no alpha

## Source Screenshots

The artwork pulls from the current light-theme release screenshots in `../docs/assets/images/release-candidates/png`:

- `01-overview-groups-light.png`
- `02-group-editing-light.png`
- `03-search-groups-light.png`
- `05-keyboard-shortcuts-light.png`

## Regenerating Assets

Run:

```sh
./promotional_tiles/render.sh
```
