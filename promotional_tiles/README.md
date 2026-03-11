# Chrome Web Store Listing Source

This folder stores the Chrome Web Store collateral for Tab Manager v2.

## Summary

`Search, group, move, and clean up tabs across browser windows with a keyboard-first workflow`

This summary is mirrored in `../packages/extension/package.json` so production manifests inherit the same short description.

## Description

```text
Tab Manager v2 gives you a fast, keyboard-first view of every open tab across browser windows.

Search by title or URL, manage browser tab groups, move tabs between windows, clean up duplicates, and handle large browsing sessions without bouncing around the tab strip.

Highlights

- Search open tabs by title or URL, with optional browser history search from the same box
- Select matched tabs in bulk, move them between windows, or open them in a new window
- Create, rename, recolor, collapse, and ungroup browser tab groups when the browser API is available
- Reorder tabs with drag and drop and keep cross-window workflows in one place
- Highlight duplicate tabs and optionally ignore URL hashes while checking
- Use keyboard shortcuts, focus mode, and the command palette for fast navigation
- Customize theme, tab width, font size, toolbar visibility, URL display, and more
- Support Firefox container-aware workflows when the browser exposes those APIs

Open source: https://github.com/xcv58/Tab-Manager-v2
Support and issues: https://github.com/xcv58/Tab-Manager-v2/issues
```

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
