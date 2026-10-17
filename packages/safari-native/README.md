# Safari shared-UI prototype

The Safari toolbar popup, separate manager window and browser-tab workspace use the extension's shared React components. The containing macOS app provides setup instructions. This is a development prototype, not a distributable App Store package.

## Build and enable

From the repository root, run `pnpm build:safari:app`. It builds the Safari web assets, generates the Xcode project with XcodeGen, performs a clean native Debug build and verifies its signature. It requires Xcode, XcodeGen and a configured Apple Development identity for the team in `project.yml`. The local output is `.tmp/safari-native-derived/Build/Products/Debug/TabManagerSafariPrototype.app`.

Open the app and enable Tab Manager v2 — Safari Prototype in Safari Settings for the desired profile. Safari asks for website access separately when needed. Use the toolbar icon or Control+W for the popup, Control+T for a separate manager window, Control+O for a browser tab, and Option+B to cycle recently used open tabs. First installation opens the full browser-tab view; ordinary updates do not intentionally open it.

The native project consumes `packages/extension/build/build_safari` as resources. Rebuild the web bundle before regenerating the Xcode project. Do not copy JavaScript into an already signed app. Generated Xcode projects, built apps and capture/observation output are local artifacts.

## App identity

Production builds reuse App Store Connect app `6758364114`, whose existing macOS version is 1.0 and latest inspected TestFlight build is 13. The original app and extension IDs are preserved in the Release configuration. Debug keeps its existing development identity.

| Setting             | Debug                                            | Release                               |
| ------------------- | ------------------------------------------------ | ------------------------------------- |
| App bundle ID       | `com.xcv58.TabManagerSafariPrototype`            | `com.xcv58.Tab-Manager-v2`            |
| Extension bundle ID | `com.xcv58.TabManagerSafariPrototype.Bridge`     | `com.xcv58.Tab-Manager-v2.Extension`  |
| App Group           | `5736QK4NZX.com.xcv58.TabManagerSafariPrototype` | `5736QK4NZX.com.xcv58.Tab-Manager-v2` |
| Setup URL scheme    | `tabmanager-safari-prototype`                    | `tab-manager-v2`                      |

`Config/Debug.xcconfig` and `Config/Release.xcconfig` are the identity sources of truth. Native setup/bridge code reads the resolved identity from its own bundle plist; the Safari web build reads the matching URL scheme from the same config file.

`pnpm build:safari:app` still defaults to Debug. To select production identities for web and native builds together, set `SAFARI_BUILD_CONFIGURATION=Release`. The same variable applies to `pnpm build:safari`. Rebuild the web assets for the selected configuration before compiling in Xcode; otherwise the setup URL may point at the other channel.

This is identity configuration only: the existing development signing configuration, prototype display names, native/web version 0.1.0 and native build 3 remain unchanged pending the release/versioning decision. These values are not an upload candidate for the existing App Store version. Production App Group provisioning and distribution signing remain to be checked before any upload. No production app is enabled or granted Safari access by this change.

## Supported scope

- Search and manage tabs in normal windows in the current Safari profile, using only active tab groups Safari exposes.
- Select tabs, pin/unpin, reload, close, copy and export with the shared controls and settings.
- Check and serialize mutations, show aggregate progress and stop between tabs. Command-period or Control-period invokes the same cancellation helper as Stop.
- Close an entire browser window only after separate confirmation, warning that Safari may have undisplayed tabs.
- Store settings locally and use generic local tab icons. No external favicon service is used.

Private browsing is deliberately excluded from both reads and mutations. Moving/reordering tabs, moving selected tabs into new windows, sorting/clustering, native tab-group management, browser history search, address-bar keywords, browser-synced preferences and Chrome-style app-window enumeration are unavailable and hidden. Titles and URLs depend on Safari's website-access permissions. The host app does not poll or maintain a separate native tab overview.

## Verification and release boundary

Chrome/Firefox extension builds, the website build and the signed Safari Debug build passed locally. Manual Safari checks covered the popup and full views, standalone-window reuse, recent-tab cycling, focus-on-open preferences, duplicate cleanup, close confirmation, whole-window closing and bulk cancellation. The latest cycling check completed 18 consecutive switches over a known four-tab history with repeated wraps. Stop was exercised through its shared keyboard handler; a live mouse click during a long batch remains a manual follow-up.

The old native-workspace observation was abandoned and does not establish reliability of this architecture. Tests, CI, Linux visual checks and broader lifecycle/profile acceptance remain pending. Historical prototype-only tests are not coverage for the current shared Safari UI. This PR adds no release, App Store upload or publishing automation. Production bundle identity is configured; production branding, distribution signing, versioning and the update pipeline still need to be completed before distribution.
