# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.7.1](https://github.com/xcv58/Tab-Manager-v2/compare/v1.7.0...v1.7.1) (2020-04-01)

### Bug Fixes

- Add option to hide tab icon, fix [#196](https://github.com/xcv58/Tab-Manager-v2/issues/196) ([937c575](https://github.com/xcv58/Tab-Manager-v2/commit/937c57513863b32ec9365699a84f95e3a80c160c))
- Lose focus of search box during typing ([9df40c0](https://github.com/xcv58/Tab-Manager-v2/commit/9df40c026561df405d49cedfdf47b8b2d2a51de4))

## [1.7.0](https://github.com/xcv58/Tab-Manager-v2/compare/v1.6.6...v1.7.0) (2020-03-30)

### Features

- Redesign the focused tab style to native focus style instead of the left indicator ([df64689](https://github.com/xcv58/Tab-Manager-v2/commit/df64689a5889f79d83d3d949ed11aaa22443c0d9))

### Bug Fixes

- **deps:** pin dependencies ([1964295](https://github.com/xcv58/Tab-Manager-v2/commit/196429514771b730d64f715a21b31f1b8ba7984f))
- The popup mode can't recognize correct last focused window because the Tab.pendingUrl since Chrome 79 ([be228c7](https://github.com/xcv58/Tab-Manager-v2/commit/be228c7cd7665670996ddcaa5b4027eb532db954))

### [1.6.6](https://github.com/xcv58/Tab-Manager-v2/compare/v1.6.5...v1.6.6) (2020-03-28)

### Bug Fixes

- Remove custom scrollbar since the implementation is Non-standard and causes ugly empty space on the right [#308](https://github.com/xcv58/Tab-Manager-v2/issues/308) ([4bf0d32](https://github.com/xcv58/Tab-Manager-v2/commit/4bf0d3248c7dde846e9b5d0aa621530a716f2ec3))
- Remove focus border for ToolbarIndicator ([1918b14](https://github.com/xcv58/Tab-Manager-v2/commit/1918b14f4e5f0f442a06b1f5ef7ce887e8649110))
- Shortcut doesn't work when the checkbox or switch is focused ([d85f8a9](https://github.com/xcv58/Tab-Manager-v2/commit/d85f8a9194ed8c146666975d489bd335363fc391))

### [1.6.5](https://github.com/xcv58/Tab-Manager-v2/compare/v1.6.4...v1.6.5) (2020-03-25)

### Bug Fixes

- Add version to settings dialog ([6d4c418](https://github.com/xcv58/Tab-Manager-v2/commit/6d4c4183d5424c22c1db5bab60a8e37ddfbd3f62))

### [1.6.4](https://github.com/xcv58/Tab-Manager-v2/compare/v1.6.3...v1.6.4) (2020-03-24)

### Bug Fixes

- Create a new window causes duplicated window on UI ([1ae2ca7](https://github.com/xcv58/Tab-Manager-v2/commit/1ae2ca77dfb382e93510d6752d9e1c212d8da35b))

### [1.6.3](https://github.com/xcv58/Tab-Manager-v2/compare/v1.6.2...v1.6.3) (2020-03-24)

### Features

- Use React Concurrent mode ([#311](https://github.com/xcv58/Tab-Manager-v2/issues/311)) ([ff11600](https://github.com/xcv58/Tab-Manager-v2/commit/ff11600283022a2a176a83d96c11f1ba0f4608df))

### Bug Fixes

- Shift+N / Drag to create new window causes stale UI ([219f247](https://github.com/xcv58/Tab-Manager-v2/commit/219f247c45b56366d8be714c37ee637be73d878c))

### [1.6.2](https://github.com/xcv58/Tab-Manager-v2/compare/v1.6.1...v1.6.2) (2020-03-22)

### Bug Fixes

- Change the setting name 'Tab Width' -> 'Minimum Tab Width' ([35f97ff](https://github.com/xcv58/Tab-Manager-v2/commit/35f97ffe67f3db4d71dd16de863756dd03c6a0f0))

### [1.6.1](https://github.com/xcv58/Tab-Manager-v2/compare/v1.6.0...v1.6.1) (2020-03-20)

### Bug Fixes

- Closing window/tab causes empty column ([a38ee4a](https://github.com/xcv58/Tab-Manager-v2/commit/a38ee4aed8e7ca06b2492c505035133a5fb77afa))
- Reduce the max height for column ([0821a05](https://github.com/xcv58/Tab-Manager-v2/commit/0821a056d1ab44fd5ad9b12f1fae6182c0dd910f))

## [1.6.0](https://github.com/xcv58/Tab-Manager-v2/compare/v1.5.3...v1.6.0) (2020-03-19)

### Features

- Add option to update tab width ([9afa65e](https://github.com/xcv58/Tab-Manager-v2/commit/9afa65e85b7dc02e5e759439e61db1a73715a752))

### Bug Fixes

- Make the html loading spinner has the same position as React one ([8988808](https://github.com/xcv58/Tab-Manager-v2/commit/89888089f6a9369f43698309525726fd5601aa56))
- The loading spinner is too large for single tab window ([eb24ed3](https://github.com/xcv58/Tab-Manager-v2/commit/eb24ed3fdb76b8ee1f641584e210257552267a18))

### [1.5.3](https://github.com/xcv58/Tab-Manager-v2/compare/v1.5.2...v1.5.3) (2020-03-15)

### Bug Fixes

- Make the loading spinner of tabs has the same height of actual tabs ([b145745](https://github.com/xcv58/Tab-Manager-v2/commit/b145745b58b37d90dd5cba39662e72b01703f325))

### [1.5.2](https://github.com/xcv58/Tab-Manager-v2/compare/v1.5.1...v1.5.2) (2020-03-13)

### Bug Fixes

- Display Tab Icon as checkbox only when hover on the icon instead of the tab ([1de65c7](https://github.com/xcv58/Tab-Manager-v2/commit/1de65c7833368334b21cc1f587ebfa70b26a29ac))
- Don't show all tabs after clear search with show unmatched tab disabled fix [#310](https://github.com/xcv58/Tab-Manager-v2/issues/310) ([f48fc1f](https://github.com/xcv58/Tab-Manager-v2/commit/f48fc1f4235012cb19f50758f4e3d5683e736a19))

### [1.5.1](https://github.com/xcv58/Tab-Manager-v2/compare/v1.5.0...v1.5.1) (2020-03-11)

### Bug Fixes

- Add tabs.onAttached and tab.onDetached handler; Optimize the performance for close a window ([ceef047](https://github.com/xcv58/Tab-Manager-v2/commit/ceef047d5e0ab691c340f8d245e9a0daf9ea9a10))
- Drop tab area on the bottom of window is too small ([a4d418c](https://github.com/xcv58/Tab-Manager-v2/commit/a4d418c9390cfc41cb2932903e183a5558031877))
- Minor bug in move tabs between window and new window ([c1aade6](https://github.com/xcv58/Tab-Manager-v2/commit/c1aade636236ac20955183e9718dd7e2847d789e))

## [1.5.0](https://github.com/xcv58/Tab-Manager-v2/compare/v1.4.0...v1.5.0) (2020-03-09)

### Features

- Append (Press "/" to focus) for search input hint ([28a95f8](https://github.com/xcv58/Tab-Manager-v2/commit/28a95f882e6da0758945e4cfc5554adf067dd651))
- Use Tailwind to improve design and performance ([#309](https://github.com/xcv58/Tab-Manager-v2/issues/309)) ([27d136a](https://github.com/xcv58/Tab-Manager-v2/commit/27d136a237d83e20bca8fc43555b78d10db65f27))

## [1.4.0](https://github.com/xcv58/Tab-Manager-v2/compare/v1.3.1...v1.4.0) (2020-02-19)

### Features

- Add shift+n to open all selected tab(s) in a new window ([09861a4](https://github.com/xcv58/Tab-Manager-v2/commit/09861a4f03c9891410bd7af0eaa1521a28ad1944))

### Bug Fixes

- Make hotkey dialog responsive and add close button ([aa1f8fb](https://github.com/xcv58/Tab-Manager-v2/commit/aa1f8fb5e611d2090914ffbbefaaf960d5ead45e))
- User can't select text ([0236cf0](https://github.com/xcv58/Tab-Manager-v2/commit/0236cf0282ff3c06d31e91ac171d2ab30ebb7ed5))

### [1.3.1](https://github.com/xcv58/Tab-Manager-v2/compare/v1.3.0...v1.3.1) (2020-02-07)

### Bug Fixes

- Remove unnecessary content_security_policy ([61d496f](https://github.com/xcv58/Tab-Manager-v2/commit/61d496f32168f8314042f762f8493c08970425c7))

## [1.3.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.14...v1.3.0) (2019-12-09)

### Features

- Add "Close other tabs" for each tab, use Discriminated Unions to improve type check ([d1ded8c](https://github.com/xcv58/Tab-Manager-v2/commit/d1ded8cd5f7dc568ec69b799839c068dd4a674d0))
- Don't show window if it has no visible tabs ([2c953ff](https://github.com/xcv58/Tab-Manager-v2/commit/2c953ff016d2ccd3c817371e8835d8646e042ca9))
- Press space to select/unselect tab ([e02ae11](https://github.com/xcv58/Tab-Manager-v2/commit/e02ae11f6d7e04093dcb77465038e6ef52cf4972))

### Bug Fixes

- Bump version for Firefox release ([866cb7b](https://github.com/xcv58/Tab-Manager-v2/commit/866cb7b848cc3f50d9636ba3983847d6bab518aa))
- Optimize style for the ordinary tooltip and tab tooltip ([2511647](https://github.com/xcv58/Tab-Manager-v2/commit/2511647b15ea198cd1ac5c88c62c645c3d5f56aa))
- Shortcut hint text is hard to see in dark theme ([bfd8438](https://github.com/xcv58/Tab-Manager-v2/commit/bfd84387b03d2d3113472cbab869c29d819cf131))
- Some windows/tabs doesn't appear when show unmatched tab disabled ([eef4f3a](https://github.com/xcv58/Tab-Manager-v2/commit/eef4f3a7cbc563eeeea1347ebd1a1cf446004744))
- Tab Tooltip disappear ([e181cd3](https://github.com/xcv58/Tab-Manager-v2/commit/e181cd367f02cf8f2ce3409b0819b882852daf1b))
- The tab menu behinds the tab tooltip ([de22147](https://github.com/xcv58/Tab-Manager-v2/commit/de221470511049b868aef4a282de48291ff39e43))
- Use use-system-theme to detect system theme change and remove the ThemeStore ([b818434](https://github.com/xcv58/Tab-Manager-v2/commit/b818434199e788391b5408d46b39d503204f1759))

### [1.2.2](https://github.com/xcv58/Tab-Manager-v2/compare/v1.2.1...v1.2.2) (2019-12-03)

### Bug Fixes

- Use use-system-theme to detect system theme change and remove the ThemeStore ([b818434](https://github.com/xcv58/Tab-Manager-v2/commit/b818434199e788391b5408d46b39d503204f1759))

### [1.2.1](https://github.com/xcv58/Tab-Manager-v2/compare/v1.2.0...v1.2.1) (2019-11-21)

### Bug Fixes

- Shortcut hint text is hard to see in dark theme ([bfd8438](https://github.com/xcv58/Tab-Manager-v2/commit/bfd84387b03d2d3113472cbab869c29d819cf131))

## [1.2.0](https://github.com/xcv58/Tab-Manager-v2/compare/v1.1.0...v1.2.0) (2019-11-09)

### Features

- Add "Close other tabs" for each tab, use Discriminated Unions to improve type check ([d1ded8c](https://github.com/xcv58/Tab-Manager-v2/commit/d1ded8c))

## [1.1.0](https://github.com/xcv58/Tab-Manager-v2/compare/v1.0.2...v1.1.0) (2019-11-03)

### Bug Fixes

- Some windows/tabs doesn't appear when show unmatched tab disabled ([eef4f3a](https://github.com/xcv58/Tab-Manager-v2/commit/eef4f3a))

### Features

- Don't show window if it has no visible tabs ([2c953ff](https://github.com/xcv58/Tab-Manager-v2/commit/2c953ff))

### [1.0.2](https://github.com/xcv58/Tab-Manager-v2/compare/v1.0.1...v1.0.2) (2019-11-01)

### Bug Fixes

- The tab menu behinds the tab tooltip ([de22147](https://github.com/xcv58/Tab-Manager-v2/commit/de22147))

### [1.0.1](https://github.com/xcv58/Tab-Manager-v2/compare/v1.0.0...v1.0.1) (2019-10-21)

### Bug Fixes

- Optimize style for the ordinary tooltip and tab tooltip ([2511647](https://github.com/xcv58/Tab-Manager-v2/commit/2511647))

## [1.0.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.15...v1.0.0) (2019-10-18)

### Bug Fixes

- Tab Tooltip disappear ([e181cd3](https://github.com/xcv58/Tab-Manager-v2/commit/e181cd3))

### [0.21.15](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.14...v0.21.15) (2019-10-15)

### Features

- Press space to select/unselect tab ([e02ae11](https://github.com/xcv58/Tab-Manager-v2/commit/e02ae11))

### [0.21.14](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.13...v0.21.14) (2019-09-23)

### Features

- Add Shift+X to select focused window, Alt+D to close focused window ([bdfe751](https://github.com/xcv58/Tab-Manager-v2/commit/bdfe751))

### [0.21.13](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.12...v0.21.13) (2019-09-19)

### Bug Fixes

- Firefox publish pipeline ([47b3378](https://github.com/xcv58/Tab-Manager-v2/commit/47b3378))
- Remove backspace to close tab shortcut ([9c680a5](https://github.com/xcv58/Tab-Manager-v2/commit/9c680a5))
- The Ctrl+B does not work ([7879089](https://github.com/xcv58/Tab-Manager-v2/commit/7879089))

### [0.21.12](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.11...v0.21.12) (2019-09-15)

### Features

- Add Ctrl+g shortcut to group the same domain tabs to current window ([cbdd814](https://github.com/xcv58/Tab-Manager-v2/commit/cbdd814))

### [0.21.11](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.10...v0.21.11) (2019-09-12)

### Bug Fixes

- Hit enter would trigger both focused element and activate selected tab ([04a042d](https://github.com/xcv58/Tab-Manager-v2/commit/04a042d))

### [0.21.10](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.9...v0.21.10) (2019-09-08)

### Bug Fixes

- Lose focus of search box during typing ([2195efc](https://github.com/xcv58/Tab-Manager-v2/commit/2195efc))

### [0.21.9](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.8...v0.21.9) (2019-08-31)

### Bug Fixes

- Move window select button to left, align with select tab button ([89bf756](https://github.com/xcv58/Tab-Manager-v2/commit/89bf756))

### [0.21.8](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.7...v0.21.8) (2019-08-24)

### Bug Fixes

- Enter/Space jump to stale tab instead of current selected tab ([9f91586](https://github.com/xcv58/Tab-Manager-v2/commit/9f91586))

### [0.21.7](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.6...v0.21.7) (2019-08-12)

### Bug Fixes

- Click clear button to clear search text will keep focus on the search box ([9d065b3](https://github.com/xcv58/Tab-Manager-v2/commit/9d065b3))

### [0.21.6](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.5...v0.21.6) (2019-08-11)

### Bug Fixes

- The clear button not appear on Windows ([a5fb3ec](https://github.com/xcv58/Tab-Manager-v2/commit/a5fb3ec))

### [0.21.5](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.4...v0.21.5) (2019-08-10)

### Bug Fixes

- Make lazy loading for Tools only instead of the entire view ([fd1c89c](https://github.com/xcv58/Tab-Manager-v2/commit/fd1c89c))

### [0.21.4](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.3...v0.21.4) (2019-08-10)

### Bug Fixes

- Auto Focus Search Box option doesn't work ([f959bbb](https://github.com/xcv58/Tab-Manager-v2/commit/f959bbb))
- Sort command by name in Command Palette ([8510d06](https://github.com/xcv58/Tab-Manager-v2/commit/8510d06))

### Features

- Add a clear button for search box ([9edf863](https://github.com/xcv58/Tab-Manager-v2/commit/9edf863))

### [0.21.3](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.2...v0.21.3) (2019-07-28)

### Bug Fixes

- Close tab/window does not update the column view ([f1dfba5](https://github.com/xcv58/Tab-Manager-v2/commit/f1dfba5))

### [0.21.2](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.1...v0.21.2) (2019-07-25)

### Bug Fixes

- Toggle pin does not update on UI ([b7bb1d7](https://github.com/xcv58/Tab-Manager-v2/commit/b7bb1d7))

### [0.21.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.21.0...v0.21.1) (2019-07-21)

## [0.21.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.20.4...v0.21.0) (2019-07-10)

### Features

- Close popup window after open a tab or open the tab manager in new tab. (This feature for Firefox only, Chrome supports this naturally) ([5a30065](https://github.com/xcv58/Tab-Manager-v2/commit/5a30065))

### [0.20.4](https://github.com/xcv58/Tab-Manager-v2/compare/v0.20.3...v0.20.4) (2019-07-09)

### Bug Fixes

- Bring back the tab add/change/close animation ([4a146d2](https://github.com/xcv58/Tab-Manager-v2/commit/4a146d2))

### [0.20.3](https://github.com/xcv58/Tab-Manager-v2/compare/v0.20.2...v0.20.3) (2019-07-04)

### Bug Fixes

- Drag preview has stale view ([4fe312f](https://github.com/xcv58/Tab-Manager-v2/commit/4fe312f))
- Tab Icon and checkbox have different size and hover icon will make tab content jump ([31838a5](https://github.com/xcv58/Tab-Manager-v2/commit/31838a5))

### [0.20.2](https://github.com/xcv58/Tab-Manager-v2/compare/v0.20.1...v0.20.2) (2019-06-25)

### Bug Fixes

- Incorrect drag preview when drag tab(s) ([0b12874](https://github.com/xcv58/Tab-Manager-v2/commit/0b12874))

### [0.20.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.9...v0.20.1) (2019-06-11)

### Bug Fixes

- Stale window count ([2ef2005](https://github.com/xcv58/Tab-Manager-v2/commit/2ef2005))

## [0.20.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.18.4...v0.20.0) (2019-05-24)

### Bug Fixes

- Add reload button for individual window ([35774e6](https://github.com/xcv58/Tab-Manager-v2/commit/35774e6))
- Auto release on CI ([#251](https://github.com/xcv58/Tab-Manager-v2/issues/251)) ([cf03e9b](https://github.com/xcv58/Tab-Manager-v2/commit/cf03e9b))
- Click/Enter to open a tab within the extension doesn't work in Firefox ([a3689ab](https://github.com/xcv58/Tab-Manager-v2/commit/a3689ab))
- Close tab after sync all tabs leads to zombie tab ([9199fad](https://github.com/xcv58/Tab-Manager-v2/commit/9199fad))
- Crash issue in set icon for tab ([c867d50](https://github.com/xcv58/Tab-Manager-v2/commit/c867d50))
- Make the windows/tabs information at the left most of the html page title ([86fa2ea](https://github.com/xcv58/Tab-Manager-v2/commit/86fa2ea))
- Open popup via the keyboard (Alt-T) doesn't work in Firefox ([9930549](https://github.com/xcv58/Tab-Manager-v2/commit/9930549))
- Remove appear animation to make the UI feel fast ([4c4b02a](https://github.com/xcv58/Tab-Manager-v2/commit/4c4b02a))
- Tune the tab sort criteria ([e5f7991](https://github.com/xcv58/Tab-Manager-v2/commit/e5f7991))
- Update the shortcut for last active tab Ctrl+B -> Alt+B ([483f589](https://github.com/xcv58/Tab-Manager-v2/commit/483f589))
- Update the tab title to include how many windows/tabs ([f929d7e](https://github.com/xcv58/Tab-Manager-v2/commit/f929d7e))
- Upgrade material-ui@4.0.0 ([f099aa4](https://github.com/xcv58/Tab-Manager-v2/commit/f099aa4))

### Features

- Add sync button and `s` as shortcut to reload data for all winodws ([4d83b71](https://github.com/xcv58/Tab-Manager-v2/commit/4d83b71)), closes [#248](https://github.com/xcv58/Tab-Manager-v2/issues/248)

### [0.19.9](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.8...v0.19.9) (2019-05-24)

### Bug Fixes

- Upgrade material-ui@4.0.0 ([f099aa4](https://github.com/xcv58/Tab-Manager-v2/commit/f099aa4))

### [0.19.8](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.7...v0.19.8) (2019-05-16)

### Bug Fixes

- Click/Enter to open a tab within the extension doesn't work in Firefox ([a3689ab](https://github.com/xcv58/Tab-Manager-v2/commit/a3689ab))
- Open popup via the keyboard (Alt-T) doesn't work in Firefox ([9930549](https://github.com/xcv58/Tab-Manager-v2/commit/9930549))
- Update the shortcut for last active tab Ctrl+B -> Alt+B ([483f589](https://github.com/xcv58/Tab-Manager-v2/commit/483f589))

### [0.19.7](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.6...v0.19.7) (2019-05-12)

### Bug Fixes

- Make the windows/tabs information at the left most of the html page title ([86fa2ea](https://github.com/xcv58/Tab-Manager-v2/commit/86fa2ea))

### [0.19.6](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.5...v0.19.6) (2019-05-07)

### Bug Fixes

- Close tab after sync all tabs leads to zombie tab ([9199fad](https://github.com/xcv58/Tab-Manager-v2/commit/9199fad))

### [0.19.5](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.4...v0.19.5) (2019-05-06)

### [0.19.4](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.3...v0.19.4) (2019-05-05)

### Bug Fixes

- Update the tab title to include how many windows/tabs ([f929d7e](https://github.com/xcv58/Tab-Manager-v2/commit/f929d7e))

## [0.19.3](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.2...v0.19.3) (2019-05-04)

### Bug Fixes

- Add reload button for individual window ([35774e6](https://github.com/xcv58/Tab-Manager-v2/commit/35774e6))

## [0.19.2](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.1...v0.19.2) (2019-05-02)

### Bug Fixes

- Remove appear animation to make the UI feel fast ([4c4b02a](https://github.com/xcv58/Tab-Manager-v2/commit/4c4b02a))

## [0.19.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.19.0...v0.19.1) (2019-04-30)

### Bug Fixes

- Auto release on CI ([#251](https://github.com/xcv58/Tab-Manager-v2/issues/251)) ([cf03e9b](https://github.com/xcv58/Tab-Manager-v2/commit/cf03e9b))

# [0.19.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.18.7...v0.19.0) (2019-04-26)

### Bug Fixes

- Crash issue in set icon for tab ([c867d50](https://github.com/xcv58/Tab-Manager-v2/commit/c867d50))

### Features

- Add sync button and `s` as shortcut to reload data for all winodws ([4d83b71](https://github.com/xcv58/Tab-Manager-v2/commit/4d83b71)), closes [#248](https://github.com/xcv58/Tab-Manager-v2/issues/248)

## [0.18.7](https://github.com/xcv58/Tab-Manager-v2/compare/v0.18.6...v0.18.7) (2019-04-19)

### Bug Fixes

- Fix gg/G for first/last tab in column ([1826f62](https://github.com/xcv58/Tab-Manager-v2/commit/1826f62))

<a name="0.18.6"></a>

## [0.18.6](https://github.com/xcv58/Tab-Manager-v2/compare/v0.18.3...v0.18.6) (2019-01-27)

### Bug Fixes

- Can't save setting caused by chrome-extension-async issue ([93e9caf](https://github.com/xcv58/Tab-Manager-v2/commit/93e9caf))
- Tune the tab sort criteria ([e5f7991](https://github.com/xcv58/Tab-Manager-v2/commit/e5f7991))

<a name="0.18.4"></a>

## [0.18.4](https://github.com/xcv58/Tab-Manager-v2/compare/v0.18.0...v0.18.4) (2019-01-11)

### Bug Fixes

- Can't save setting caused by chrome-extension-async issue ([93e9caf](https://github.com/xcv58/Tab-Manager-v2/commit/93e9caf))
- Crash after close some tabs ([#237](https://github.com/xcv58/Tab-Manager-v2/issues/237)) ([04c318a](https://github.com/xcv58/Tab-Manager-v2/commit/04c318a))
- Double scrollbar thumb on Windows ([#238](https://github.com/xcv58/Tab-Manager-v2/issues/238)) ([5a45411](https://github.com/xcv58/Tab-Manager-v2/commit/5a45411))
- Windows has overlap at the right edge ([d54a77d](https://github.com/xcv58/Tab-Manager-v2/commit/d54a77d))

<a name="0.18.3"></a>

## [0.18.3](https://github.com/xcv58/Tab-Manager-v2/compare/v0.18.1...v0.18.3) (2018-10-24)

### Bug Fixes

- Double scrollbar thumb on Windows ([#238](https://github.com/xcv58/Tab-Manager-v2/issues/238)) ([5a45411](https://github.com/xcv58/Tab-Manager-v2/commit/5a45411))

<a name="0.18.2"></a>

## [0.18.2](https://github.com/xcv58/Tab-Manager-v2/compare/v0.14.3...v0.18.2) (2018-10-19)

### Bug Fixes

- Windows has overlap at the right edge ([d54a77d](https://github.com/xcv58/Tab-Manager-v2/commit/d54a77d))
- Try to eliminate crash on Windows ([8e8d7a1](https://github.com/xcv58/Tab-Manager-v2/commit/8e8d7a1))

<a name="0.18.1"></a>

## [0.18.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.18.0...v0.18.1) (2018-10-17)

### Bug Fixes

- Crash after close some tabs ([#237](https://github.com/xcv58/Tab-Manager-v2/issues/237)) ([04c318a](https://github.com/xcv58/Tab-Manager-v2/commit/04c318a))

<a name="0.18.0"></a>

# [0.18.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.14.5...v0.18.0) (2018-09-15)

### Bug Fixes

- Add theme toggle button on main page ([8741e27](https://github.com/xcv58/Tab-Manager-v2/commit/8741e27)), closes [#227](https://github.com/xcv58/Tab-Manager-v2/issues/227)
- chrome.management.get is not a function ([3be1389](https://github.com/xcv58/Tab-Manager-v2/commit/3be1389))
- Drag & drop tab will close the original window ([#230](https://github.com/xcv58/Tab-Manager-v2/issues/230)) ([8bfd344](https://github.com/xcv58/Tab-Manager-v2/commit/8bfd344))
- Esc doesn't dismiss Settings dialog ([64ec9af](https://github.com/xcv58/Tab-Manager-v2/commit/64ec9af))

### Features

- Add close button for Window ([98e27bf](https://github.com/xcv58/Tab-Manager-v2/commit/98e27bf)), closes [#226](https://github.com/xcv58/Tab-Manager-v2/issues/226)
- Add Dark Theme ([#223](https://github.com/xcv58/Tab-Manager-v2/issues/223)) ([91acd6c](https://github.com/xcv58/Tab-Manager-v2/commit/91acd6c))
- Always show close button and make it smaller ([5b2ea17](https://github.com/xcv58/Tab-Manager-v2/commit/5b2ea17)), closes [#224](https://github.com/xcv58/Tab-Manager-v2/issues/224)

<a name="0.17.1"></a>

## [0.17.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.17.0...v0.17.1) (2018-09-13)

### Bug Fixes

- chrome.management.get is not a function ([3be1389](https://github.com/xcv58/Tab-Manager-v2/commit/3be1389))

<a name="0.17.0"></a>

# [0.17.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.16.0...v0.17.0) (2018-09-13)

### Bug Fixes

- Add theme toggle button on main page ([8741e27](https://github.com/xcv58/Tab-Manager-v2/commit/8741e27)), closes [#227](https://github.com/xcv58/Tab-Manager-v2/issues/227)

### Features

- Add close button for Window ([98e27bf](https://github.com/xcv58/Tab-Manager-v2/commit/98e27bf)), closes [#226](https://github.com/xcv58/Tab-Manager-v2/issues/226)

<a name="0.16.0"></a>

# [0.16.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.15.0...v0.16.0) (2018-09-09)

### Features

- Always show close button and make it smaller ([5b2ea17](https://github.com/xcv58/Tab-Manager-v2/commit/5b2ea17)), closes [#224](https://github.com/xcv58/Tab-Manager-v2/issues/224)

<a name="0.15.0"></a>

# [0.15.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.14.5...v0.15.0) (2018-09-05)

### Bug Fixes

- Esc doesn't dismiss Settings dialog ([64ec9af](https://github.com/xcv58/Tab-Manager-v2/commit/64ec9af))

### Features

- Add Dark Theme ([#223](https://github.com/xcv58/Tab-Manager-v2/issues/223)) ([91acd6c](https://github.com/xcv58/Tab-Manager-v2/commit/91acd6c))

<a name="0.14.5"></a>

## [0.14.5](https://github.com/xcv58/Tab-Manager-v2/compare/v0.14.4...v0.14.5) (2018-08-21)

### Bug Fixes

- Change the column max height to 1.0 ([#221](https://github.com/xcv58/Tab-Manager-v2/issues/221)) ([093815c](https://github.com/xcv58/Tab-Manager-v2/commit/093815c))
- Upgrade babel & packages ([af62b49](https://github.com/xcv58/Tab-Manager-v2/commit/af62b49))

<a name="0.14.4"></a>

## [0.14.4](https://github.com/xcv58/Tab-Manager-v2/compare/v0.14.3...v0.14.4) (2018-08-07)

### Bug Fixes

- Upgrade packages ([#218](https://github.com/xcv58/Tab-Manager-v2/issues/218)) ([08a9da3](https://github.com/xcv58/Tab-Manager-v2/commit/08a9da3))

<a name="0.14.3"></a>

## [0.14.3](https://github.com/xcv58/Tab-Manager-v2/compare/v0.14.2...v0.14.3) (2018-07-23)

<a name="0.14.2"></a>

## [0.14.2](https://github.com/xcv58/Tab-Manager-v2/compare/v0.14.0...v0.14.2) (2018-07-23)

### Bug Fixes

- Remove management permission ([3999b6a](https://github.com/xcv58/Tab-Manager-v2/commit/3999b6a))

<a name="0.14.1"></a>

## [0.14.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.14.0...v0.14.1) (2018-06-17)

### Bug Fixes

- gg/G will move focus in current column ([9ae2c77](https://github.com/xcv58/Tab-Manager-v2/commit/9ae2c77))
- Horizontal doesn't work if window is too thin ([15bd9c6](https://github.com/xcv58/Tab-Manager-v2/commit/15bd9c6))
- Horizontal navigation does not work as expected when unmatched tab(s) is hidden ([5a0e0c4](https://github.com/xcv58/Tab-Manager-v2/commit/5a0e0c4))
- Use d d instead of ctrl+d to close tab(s) ([7d4222a](https://github.com/xcv58/Tab-Manager-v2/commit/7d4222a))

<a name="0.14.0"></a>

# [0.14.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.13.1...v0.14.0) (2018-05-28)

### Bug Fixes

- Upgrade dependencies ([#198](https://github.com/xcv58/Tab-Manager-v2/issues/198)) ([cb90805](https://github.com/xcv58/Tab-Manager-v2/commit/cb90805))
- Upgrade to babel 7 ([#199](https://github.com/xcv58/Tab-Manager-v2/issues/199)) ([2bd97c7](https://github.com/xcv58/Tab-Manager-v2/commit/2bd97c7))

### Features

- Add DragHandle for Tab ([#200](https://github.com/xcv58/Tab-Manager-v2/issues/200)) ([c5acae7](https://github.com/xcv58/Tab-Manager-v2/commit/c5acae7))

<a name="0.13.1"></a>

## [0.13.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.13.0...v0.13.1) (2018-05-22)

### Bug Fixes

- Upgrade to Material-UI v1 ([629ae15](https://github.com/xcv58/Tab-Manager-v2/commit/629ae15))

<a name="0.13.0"></a>

# [0.13.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.12.0...v0.13.0) (2018-05-18)

### Features

- Enable offline support ([76fe4cb](https://github.com/xcv58/Tab-Manager-v2/commit/76fe4cb))

<a name="0.12.0"></a>

# [0.12.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.11.1...v0.12.0) (2018-05-14)

### Features

- Add Clean duplicated tabs button ([#190](https://github.com/xcv58/Tab-Manager-v2/issues/190)) ([83b7f62](https://github.com/xcv58/Tab-Manager-v2/commit/83b7f62))

<a name="0.11.1"></a>

## [0.11.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.11.0...v0.11.1) (2018-05-14)

### Bug Fixes

- Show empty column if the first window is too large ([2251ced](https://github.com/xcv58/Tab-Manager-v2/commit/2251ced))

<a name="0.11.0"></a>

# [0.11.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.10.0...v0.11.0) (2018-05-14)

### Bug Fixes

- Add Ripple effect for Tab & Window Title ([#186](https://github.com/xcv58/Tab-Manager-v2/issues/186)) ([e010870](https://github.com/xcv58/Tab-Manager-v2/commit/e010870))
- Toggle pin will keep the order of tabs ([ca194fa](https://github.com/xcv58/Tab-Manager-v2/commit/ca194fa))

### Features

- Add Auto Focus Search Box option ([#188](https://github.com/xcv58/Tab-Manager-v2/issues/188)) ([cac74f6](https://github.com/xcv58/Tab-Manager-v2/commit/cac74f6))

<a name="0.10.0"></a>

# [0.10.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.9.3...v0.10.0) (2018-05-13)

### Bug Fixes

- Tune sort by different criteria ([#183](https://github.com/xcv58/Tab-Manager-v2/issues/183)) ([03e51f8](https://github.com/xcv58/Tab-Manager-v2/commit/03e51f8))
- Turn off transparency when hover toolbar ([#179](https://github.com/xcv58/Tab-Manager-v2/issues/179)) ([8b9fc92](https://github.com/xcv58/Tab-Manager-v2/commit/8b9fc92))

### Features

- Add refresh button & shortcut to refresh tab ([#178](https://github.com/xcv58/Tab-Manager-v2/issues/178)) ([151f44f](https://github.com/xcv58/Tab-Manager-v2/commit/151f44f))
- Add show Url option ([#180](https://github.com/xcv58/Tab-Manager-v2/issues/180)) ([7fbb638](https://github.com/xcv58/Tab-Manager-v2/commit/7fbb638))
- Add close other duplicated tabs in TabMenu ([#184](https://github.com/xcv58/Tab-Manager-v2/issues/184)) ([eedb0f6](https://github.com/xcv58/Tab-Manager-v2/commit/eedb0f6))
- Add menu for each tab to group tabs of the same domain ([#181](https://github.com/xcv58/Tab-Manager-v2/issues/181)) ([417c9a9](https://github.com/xcv58/Tab-Manager-v2/commit/417c9a9))

<a name="0.9.3"></a>

## [0.9.3](https://github.com/xcv58/Tab-Manager-v2/compare/v0.9.2...v0.9.3) (2018-05-11)

### Bug Fixes

- Hover tab to show checkbox ([#176](https://github.com/xcv58/Tab-Manager-v2/issues/176)) ([bac5e4b](https://github.com/xcv58/Tab-Manager-v2/commit/bac5e4b)), closes [#172](https://github.com/xcv58/Tab-Manager-v2/issues/172)

<a name="0.9.2"></a>

## [0.9.2](https://github.com/xcv58/Tab-Manager-v2/compare/v0.9.1...v0.9.2) (2018-05-10)

### Bug Fixes

- Batch close tabs cause lag and inconsistent UI ([#171](https://github.com/xcv58/Tab-Manager-v2/issues/171)) ([ca06845](https://github.com/xcv58/Tab-Manager-v2/commit/ca06845))
- Organize windows based on 1.6 \* height instead of the longest window ([20e70f8](https://github.com/xcv58/Tab-Manager-v2/commit/20e70f8))

<a name="0.9.1"></a>

## [0.9.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.9.0...v0.9.1) (2018-05-09)

### Bug Fixes

- Fix horizontal navigation align issue ([#170](https://github.com/xcv58/Tab-Manager-v2/issues/170)) ([2181819](https://github.com/xcv58/Tab-Manager-v2/commit/2181819))

<a name="0.9.0"></a>

# [0.9.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.8.2...v0.9.0) (2018-05-08)

### Features

- Add Masonry view ([#168](https://github.com/xcv58/Tab-Manager-v2/issues/168)) ([175262e](https://github.com/xcv58/Tab-Manager-v2/commit/175262e)), closes [#148](https://github.com/xcv58/Tab-Manager-v2/issues/148)

<a name="0.8.2"></a>

## [0.8.2](https://github.com/xcv58/Tab-Manager-v2/compare/v0.8.1...v0.8.2) (2018-05-07)

### Bug Fixes

- Can not drop to the end of window with a lot of tabs ([72442b8](https://github.com/xcv58/Tab-Manager-v2/commit/72442b8))

<a name="0.8.1"></a>

## [0.8.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.8.0...v0.8.1) (2018-05-06)

### Bug Fixes

- Add `Ctrl+,` to toggle Settings ([#166](https://github.com/xcv58/Tab-Manager-v2/issues/166)) ([025c09c](https://github.com/xcv58/Tab-Manager-v2/commit/025c09c))
- Add Show Shortcut Hint option ([#165](https://github.com/xcv58/Tab-Manager-v2/issues/165)) ([1eb8548](https://github.com/xcv58/Tab-Manager-v2/commit/1eb8548))
- Reduce bundle size ([#167](https://github.com/xcv58/Tab-Manager-v2/issues/167)) ([8384ef0](https://github.com/xcv58/Tab-Manager-v2/commit/8384ef0))

<a name="0.8.0"></a>

# [0.8.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.7.0...v0.8.0) (2018-05-06)

### Features

- Add Show Unmatched Tab option ([#164](https://github.com/xcv58/Tab-Manager-v2/issues/164)) ([633bd61](https://github.com/xcv58/Tab-Manager-v2/commit/633bd61))

<a name="0.7.0"></a>

# [0.7.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.6.3...v0.7.0) (2018-05-04)

### Bug Fixes

- Removed tab(s) show up during drag & drop ([#159](https://github.com/xcv58/Tab-Manager-v2/issues/159)) ([3ca2ab9](https://github.com/xcv58/Tab-Manager-v2/commit/3ca2ab9))

### Features

- Add Settings to preserve search, highlight duplicated tabs, show tooltip for tab ([#163](https://github.com/xcv58/Tab-Manager-v2/issues/163)) ([4753a00](https://github.com/xcv58/Tab-Manager-v2/commit/4753a00))
- Async render window/tab to make first render smooth ([#158](https://github.com/xcv58/Tab-Manager-v2/issues/158)) ([979c9da](https://github.com/xcv58/Tab-Manager-v2/commit/979c9da))
- Disable drop for popup and devtools window ([#162](https://github.com/xcv58/Tab-Manager-v2/issues/162)) ([35b7d95](https://github.com/xcv58/Tab-Manager-v2/commit/35b7d95))

<a name="0.6.3"></a>

## [0.6.3](https://github.com/xcv58/Tab-Manager-v2/compare/v0.6.1...v0.6.3) (2018-05-03)

### Bug Fixes

- Optimize performance in various ways ([#157](https://github.com/xcv58/Tab-Manager-v2/issues/157)) ([10e7d00](https://github.com/xcv58/Tab-Manager-v2/commit/10e7d00)), closes [#93](https://github.com/xcv58/Tab-Manager-v2/issues/93)

### Features

- Highlight duplicated tabs ([#156](https://github.com/xcv58/Tab-Manager-v2/issues/156)) ([d766fc3](https://github.com/xcv58/Tab-Manager-v2/commit/d766fc3)), closes [#151](https://github.com/xcv58/Tab-Manager-v2/issues/151)
- Add inline close button ([#155](https://github.com/xcv58/Tab-Manager-v2/issues/155)) ([9444bc4](https://github.com/xcv58/Tab-Manager-v2/commit/9444bc4))

<a name="0.6.2"></a>

## [0.6.2](https://github.com/xcv58/Tab-Manager-v2/compare/v0.4.9...v0.6.2) (2018-05-02)

### Features

- Highlight duplicated tabs ([#156](https://github.com/xcv58/Tab-Manager-v2/issues/156)) ([d766fc3](https://github.com/xcv58/Tab-Manager-v2/commit/d766fc3)), closes [#151](https://github.com/xcv58/Tab-Manager-v2/issues/151)
- Add inline close button ([#155](https://github.com/xcv58/Tab-Manager-v2/issues/155)) ([9444bc4](https://github.com/xcv58/Tab-Manager-v2/commit/9444bc4))
- Add selectable tooltip without performance issue ([#150](https://github.com/xcv58/Tab-Manager-v2/issues/150)) ([13f5d72](https://github.com/xcv58/Tab-Manager-v2/commit/13f5d72))
- use equal width for window ([#146](https://github.com/xcv58/Tab-Manager-v2/issues/146)) ([b40e758](https://github.com/xcv58/Tab-Manager-v2/commit/b40e758))
- Use Use custom onRemoved to fix removed tabs jump back issue ([#149](https://github.com/xcv58/Tab-Manager-v2/issues/149)) ([9a201e0](https://github.com/xcv58/Tab-Manager-v2/commit/9a201e0))

<a name="0.6.1"></a>

## [0.6.1](https://github.com/xcv58/Tab-Manager-v2/compare/v0.5.8...v0.6.1) (2018-04-27)

### Features

- Add selectable tooltip without performance issue ([#150](https://github.com/xcv58/Tab-Manager-v2/issues/150)) ([13f5d72](https://github.com/xcv58/Tab-Manager-v2/commit/13f5d72))
- Use equal width for window ([#146](https://github.com/xcv58/Tab-Manager-v2/issues/146)) ([b40e758](https://github.com/xcv58/Tab-Manager-v2/commit/b40e758))
- Use custom `onRemoved` to fix removed tabs jump back issue ([#149](https://github.com/xcv58/Tab-Manager-v2/issues/149)) ([9a201e0](https://github.com/xcv58/Tab-Manager-v2/commit/9a201e0))

<a name="0.6.0"></a>

# [0.6.0](https://github.com/xcv58/Tab-Manager-v2/compare/v0.5.9...v0.6.0) (2018-04-21)

### Features

- use equal width for window ([#146](https://github.com/xcv58/Tab-Manager-v2/issues/146)) ([b40e758](https://github.com/xcv58/Tab-Manager-v2/commit/b40e758))

<a name="0.5.9"></a>

## [0.5.9](https://github.com/xcv58/Tab-Manager-v2/compare/v0.5.8...v0.5.9) (2018-04-19)

<a name="0.5.8"></a>

## [0.5.8](https://github.com/xcv58/Tab-Manager-v2/compare/v0.5.7...v0.5.8) (2018-04-18)

<a name="0.5.7"></a>

## [0.5.7](https://github.com/xcv58/Tab-Manager-v2/compare/v0.5.6...v0.5.7) (2018-04-16)

<a name="0.5.6"></a>

## [0.5.6](https://github.com/xcv58/Tab-Manager-v2/compare/v0.5.5...v0.5.6) (2018-04-12)
