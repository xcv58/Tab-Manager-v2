# Safari shared-UI prototype

The Safari toolbar popup, separate manager window and browser-tab workspace use the extension's shared React components. The containing macOS app provides setup instructions. This is a development prototype being prepared for TestFlight; it is not an approved public App Store release.

## Build and enable

From the repository root, run `pnpm build:safari:app`. It builds the Safari web assets, generates the Xcode project with XcodeGen, performs a clean native Debug build and verifies its signature. It requires Xcode, XcodeGen and a configured Apple Development identity for the team in `project.yml`. The local output is `.tmp/safari-native-derived/Build/Products/Debug/TabManagerSafariPrototype.app`.

Open the app and enable Tab Manager v2 in Safari Settings for the desired profile. Safari asks for website access separately when needed. Use the toolbar icon or Control+W for the popup, Control+T for a separate manager window, Control+O for a browser tab, and Option+B to cycle recently used open tabs. First installation opens the full browser-tab view; ordinary updates do not intentionally open it.

Command+R reloads the Tab Manager view, including the separate window. Control+R reloads the selected or focused Safari tabs.

The native project consumes `packages/extension/build/build_safari` as resources. Rebuild the web bundle before regenerating the Xcode project. Do not copy JavaScript into an already signed app. Generated Xcode projects, built apps and capture/observation output are local artifacts.

## App identity

Production builds reuse App Store Connect app `6758364114`, with Safari version **3.0.0 (14)**. The earlier draft was 1.0 and its last TestFlight build was 13. The original app and extension IDs are preserved in the Release configuration. Debug keeps its existing development identity.

| Setting             | Debug                                            | Release                               |
| ------------------- | ------------------------------------------------ | ------------------------------------- |
| App bundle ID       | `com.xcv58.TabManagerSafariPrototype`            | `com.xcv58.Tab-Manager-v2`            |
| Extension bundle ID | `com.xcv58.TabManagerSafariPrototype.Bridge`     | `com.xcv58.Tab-Manager-v2.Extension`  |
| App Group           | `5736QK4NZX.com.xcv58.TabManagerSafariPrototype` | `5736QK4NZX.com.xcv58.Tab-Manager-v2` |
| Setup URL scheme    | `tabmanager-safari-prototype`                    | `tab-manager-v2`                      |

`Config/Debug.xcconfig` and `Config/Release.xcconfig` are the identity sources of truth. Native setup/bridge code reads the resolved identity from its own bundle plist; the Safari web build reads the matching URL scheme from the same config file.

`pnpm build:safari:app` still defaults to Debug. To select production identities for web and native builds together, set `SAFARI_BUILD_CONFIGURATION=Release`. The same variable applies to `pnpm build:safari`. Rebuild the web assets for the selected configuration before compiling in Xcode; otherwise the setup URL may point at the other channel.

The host app, extension and web manifest use marketing version 3.0.0; both native targets use build 14. Release uses automatic provisioning and is re-signed with Apple Distribution during App Store export; Debug retains development signing. The restored Mac app icon comes from the original Safari app assets. Building or uploading does not enable the production extension or grant Safari website access.

Marketing versions follow the shared product version, even when Safari has fewer supported features. Increment the native build for every uploaded candidate. Archive and export with the Release configuration; verify both bundle identifiers, matching versions/build numbers, provisioning profiles and signatures before uploading. TestFlight upload, beta availability, App Review and public release are separate steps. Keep App Store release set to manual.

## Manual TestFlight package

Build the Release web bundle and regenerate the project before archiving. Automatic provisioning requires the owner's approval to update signing assets in Apple Developer.

```sh
SAFARI_BUILD_CONFIGURATION=Release pnpm build:safari
xcodegen generate --spec packages/safari-native/project.yml
xcodebuild -project packages/safari-native/TabManagerSafariPrototype.xcodeproj \
  -scheme TabManagerSafariPrototype -configuration Release \
  -destination 'generic/platform=macOS' \
  -archivePath .tmp/safari-testflight-3.0.0-14.xcarchive \
  -allowProvisioningUpdates archive
xcodebuild -exportArchive \
  -archivePath .tmp/safari-testflight-3.0.0-14.xcarchive \
  -exportOptionsPlist packages/safari-native/Config/ExportOptions.plist \
  -exportPath .tmp/safari-testflight-3.0.0-14-export \
  -allowProvisioningUpdates
```

The export configuration preserves the chosen version/build and exports locally. Upload only the verified signed package to app `6758364114`. Confirm processing and internal-test availability in TestFlight separately; these commands do not submit App Review or publish a version.

## Supported scope

- Search and manage tabs in normal windows in the current Safari profile, using only active tab groups Safari exposes.
- Select tabs, pin/unpin, reload, close, copy and export with the shared controls and settings.
- Check and serialize mutations, show aggregate progress and stop between tabs. Command-period or Control-period invokes the same cancellation helper as Stop.
- Close individual or selected tabs directly, as in Chrome. Tab actions use current-session tab and window IDs; missing URL access does not block actions on Start Pages or other tabs. Disclosed URLs provide an additional changed-tab check.
- Close an entire browser window directly, as in Chrome, including any inactive tab groups Safari keeps in that window.
- Store settings locally and use generic local tab icons. No external favicon service is used.

Private browsing is deliberately excluded from both reads and mutations. Moving/reordering tabs, moving selected tabs into new windows, sorting/clustering, native tab-group management, browser history search, address-bar keywords, browser-synced preferences and Chrome-style app-window enumeration are unavailable and hidden. Titles and URLs depend on Safari's website-access permissions. The host app does not poll or maintain a separate native tab overview.

## Verification and release boundary

Chrome/Firefox extension builds, the website build and the signed Safari Debug build passed locally. Manual Safari checks covered the popup and full views, standalone-window reuse, recent-tab cycling, focus-on-open preferences, duplicate cleanup, close confirmation, whole-window closing and bulk cancellation. The latest cycling check completed 18 consecutive switches over a known four-tab history with repeated wraps. Stop was exercised through its shared keyboard handler; a live mouse click during a long batch remains a manual follow-up.

The old native-workspace observation was abandoned and does not establish reliability of this architecture. Tests, CI, Linux visual checks and broader lifecycle/profile acceptance remain pending. Historical prototype-only tests are not coverage for the current shared Safari UI. This PR adds no automatic release or publishing workflow. The first 3.0.0 (14) candidate is prepared for a manual TestFlight upload; broader acceptance and App Store listing preparation remain separate from uploading it.
