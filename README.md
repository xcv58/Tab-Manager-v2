# Tab Manager v2

Tab Manager v2 turns crowded browser sessions into a searchable workspace. Find tabs across windows, move matching tabs in bulk, manage native tab groups where supported by the browser, and clean up duplicates without bouncing between browser windows.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/users/nimllkpgmmbdglnjneeakdgcpkbgbfbp)](https://chrome.google.com/webstore/detail/tab-manager-v2/nimllkpgmmbdglnjneeakdgcpkbgbfbp)
[![Mozilla Add-on](https://img.shields.io/amo/users/tab-manager-v2)](https://addons.mozilla.org/en-US/firefox/addon/tab-manager-v2/)
[![Node CI](https://github.com/xcv58/Tab-Manager-v2/actions/workflows/nodejs.yml/badge.svg)](https://github.com/xcv58/Tab-Manager-v2/actions/workflows/nodejs.yml)
[![codecov](https://codecov.io/gh/xcv58/Tab-Manager-v2/branch/master/graph/badge.svg)](https://codecov.io/gh/xcv58/Tab-Manager-v2)

## Install

- [Chrome Web Store](https://xcv58.xyz/tabs)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tab-manager-v2)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/idoifhgklnblomgoohijchjignpiddpb)

## Quick Start

- Open Tab Manager v2 from the browser toolbar, or open it in its own tab/window for a larger view.
- Press `/` to search all open tabs, `>` to open the command palette, and `?` to view shortcut help.
- Select matching tabs, then move, group, or close them in bulk.

## Why People Use It

- Find open tabs across all windows from one search box, with optional browser history search.
- Move, group, or close matching tabs in bulk instead of handling them one at a time.
- Manage browser-native tab groups directly where supported by the browser, including rename, recolor, collapse, and ungroup actions.
- Clean up duplicate tabs quickly, with an option to ignore URL hashes when checking.
- Stay on the keyboard with shortcuts, the command palette, and built-in shortcut help.
- Tune the interface with theme, tab width, font size, toolbar visibility, URL display, and more.
- Use Firefox container-aware workflows when the browser exposes those APIs.

## Useful Shortcuts

| Action                                    | Shortcut                         |
| ----------------------------------------- | -------------------------------- |
| Focus tab search                          | `/`                              |
| Open command palette                      | `>`                              |
| Move focus                                | `h`, `j`, `k`, `l` or arrow keys |
| Select focused tab                        | `x` or `Space`                   |
| Open selected tabs in a new window        | `Shift+N`                        |
| Create a new tab group from selected tabs | `Alt+Shift+G`                    |
| Toggle theme                              | `Ctrl+I`                         |
| Open settings                             | `Ctrl+,`                         |
| Show keyboard shortcut help               | `?`                              |

Shortcut behavior can vary slightly by platform and browser. Use the in-app shortcut help for the full list.

## Browser Support

| Browser | Status        | Notes                                                                      |
| ------- | ------------- | -------------------------------------------------------------------------- |
| Chrome  | Supported     | Full core workflow, including tab group integration                        |
| Edge    | Supported     | Chromium-based behavior; feature availability follows exposed browser APIs |
| Firefox | Supported     | Core workflow plus Firefox-specific container support                      |
| Safari  | Not supported | See the FAQ below for the limitation                                       |

## Privacy and Permissions

Tab Manager v2 uses browser APIs to read and organize your current tabs, windows, and optional history search results. Its core tab and window management stays in your browser, and the extension does not add analytics or tracking.

- `tabs`: read, move, group, select, and close tabs and windows
- `storage`: save settings and UI state
- `management`: look up installed extension metadata when showing `chrome-extension://` tabs
- `history`: support the optional "Include browser history in results" setting
- `tabGroups`: read and manage native tab groups on supported browsers
- `contextualIdentities` and `cookies`: enable Firefox container-related features

User preferences are stored in browser sync storage when available, with a local storage fallback. See [privacy_policy.md](privacy_policy.md) for the privacy policy.

## FAQ

### Why is Safari not supported?

Safari does not support the `tabs.move()` WebExtension API that Tab Manager v2 depends on for drag-and-drop reordering, moving tabs between windows, and sorting workflows. Those are core features rather than optional extras, so Safari support would be incomplete and misleading. The current investigation is tracked in [issue #2545](https://github.com/xcv58/Tab-Manager-v2/issues/2545).

### Does it work with browser tab groups?

Yes, where supported by the browser. Tab Manager v2 lets you manage native tab groups directly without leaving the extension.

### Can I rename windows?

Custom window names would only exist inside this extension and would duplicate browser-native grouping features. The current window title area is kept focused on window activation and summary, while labels belong to browser tab groups. If you want named buckets of tabs, use built-in tab groups and rename them from Tab Manager v2 where supported by the browser.

### Where are my settings stored?

Settings are stored in browser sync storage when the browser supports it. If sync storage is unavailable, Tab Manager v2 falls back to local storage so the extension still works.

### Do all features work the same way in every browser?

No. Core tab and window management works across Chrome, Edge, and Firefox, but some features depend on browser-specific APIs. Examples include Firefox containers and browser tab groups.

## Development

### Prerequisites

- Node.js
- `pnpm` 9.x

### Install dependencies

```shell
pnpm install
```

### Run the extension in development mode

```shell
pnpm start
```

This writes unpacked extension builds to:

- `packages/extension/build/build_chrome`
- `packages/extension/build/build_firefox`

Load the appropriate folder as an unpacked extension in your target browser.

### Run tests

Run the default local test pipeline:

```shell
pnpm test
```

This runs the extension unit tests plus the Chromium Playwright integration suite.

Run only the extension unit tests:

```shell
pnpm run test:unit
```

Run the Chromium Playwright integration suite, including the required Chrome extension build:

```shell
pnpm run test:integration
```

Watch a sped-up end-to-end suite run: [Integration test video](docs/assets/videos/tab-manager-v2-integration-test-suite.mp4).

Run the Playwright suite directly against an existing Chrome build:

```shell
pnpm run test:integration:run
```

Run the Firefox-specific coverage used in CI:

```shell
pnpm --filter tab-manager-v2 test:firefox
pnpm --filter integration-test-firefox test:firefox
```

### Build production bundles

```shell
pnpm build
```

This outputs packaged browser builds under `packages/extension/build/`.

## Repository Layout

- `packages/extension`: main extension source, assets, build scripts, and unit tests
- `packages/integration_test`: Playwright-based integration and visual regression tests
- `packages/integration_test_firefox`: Firefox-specific integration coverage

## Release Notes

- [packages/extension/CHANGELOG.md](packages/extension/CHANGELOG.md)

## Thanks

The default favicon is made by [Lyolya](https://www.flaticon.com/authors/lyolya) from [Flaticon](https://www.flaticon.com) and is licensed under [Creative Commons BY 3.0](http://creativecommons.org/licenses/by/3.0/).
