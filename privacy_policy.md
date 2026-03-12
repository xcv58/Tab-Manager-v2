# Privacy Policy

Effective date: March 11, 2026

Tab Manager v2 is a browser extension for managing tabs and windows. Its core functionality runs locally in your browser. We do not operate an account system, do not send your tab, window, history, or settings data to our own servers, and do not include analytics or advertising trackers.

## What the extension accesses

To provide its features, the extension may access:

- open tabs and windows
- native tab groups on browsers that support them
- browser history results when you enable the "Include browser history in results" setting
- Firefox container identities and related cookie-store information for container-aware features
- installed extension metadata for `chrome-extension://` pages so the UI can show the correct icon

## What the extension stores in your browser

Tab Manager v2 stores data in browser `storage.sync` when available, with `storage.local` as a fallback.

Stored data may include:

- user settings such as theme, font size, tab width, toolbar behavior, and search preferences
- local UI state such as hidden windows, popup placement, last focused window, and popup active state
- preserved search text and the last command, when those features are enabled
- recent tab history used for the "last active tab" shortcut
- display information such as screen bounds and detected system theme, used to size and place the popup window

If your browser sync service is enabled, settings saved through `storage.sync` may be synchronized by your browser vendor under that vendor's privacy policy.

## Permissions

The extension requests these permissions to support its features:

- `tabs`: read and manage open tabs and windows
- `storage`: save settings and UI state
- `management`: look up installed extension metadata for `chrome-extension://` tabs
- `history`: support the optional browser history search feature
- `tabGroups`: read and manage native tab groups on supported browsers
- `contextualIdentities` and `cookies`: support Firefox container-aware features

## Network and third parties

Tab Manager v2 does not send your browsing data to Tab Manager v2 servers because no such service is used for core functionality.

The extension and docs include links to third-party sites such as browser stores, GitHub, and support pages. If you open those links, your interaction with those sites is governed by their privacy policies.

The extension popup currently references Google Fonts. When your browser loads that stylesheet or related font assets, those requests are made directly to Google and are governed by Google's privacy policy.

## Data retention and control

Data stored by the extension remains in your browser storage until you change it, clear extension/browser storage, or uninstall the extension.

You can disable the browser history search feature in settings if you do not want history results included in search.

## Contact

If you have privacy questions or want to report an issue, open an issue at <https://github.com/xcv58/Tab-Manager-v2/issues>.
