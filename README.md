# Tab Manager v2

[![CircleCI](https://circleci.com/gh/xcv58/Tab-Manager-v2.svg?style=svg)](https://circleci.com/gh/xcv58/Tab-Manager-v2)
[![Build Status](https://travis-ci.org/xcv58/Tab-Manager-v2.svg?branch=master)](https://travis-ci.org/xcv58/Tab-Manager-v2)
[![dependencies Status](https://david-dm.org/xcv58/Tab-Manager-v2/status.svg)](https://david-dm.org/xcv58/Tab-Manager-v2)
[![devDependencies Status](https://david-dm.org/xcv58/Tab-Manager-v2/dev-status.svg)](https://david-dm.org/xcv58/Tab-Manager-v2?type=dev)

[![Maintainability](https://api.codeclimate.com/v1/badges/37ba8a86e2a74b36c2a8/maintainability)](https://codeclimate.com/github/xcv58/Tab-Manager-v2/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/37ba8a86e2a74b36c2a8/test_coverage)](https://codeclimate.com/github/xcv58/Tab-Manager-v2/test_coverage)
[![codecov](https://codecov.io/gh/xcv58/Tab-Manager-v2/branch/master/graph/badge.svg)](https://codecov.io/gh/xcv58/Tab-Manager-v2)
[![Coverage Status](https://coveralls.io/repos/github/xcv58/Tab-Manager-v2/badge.svg?branch=master)](https://coveralls.io/github/xcv58/Tab-Manager-v2?branch=master)

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

Chrome Web Store: https://xcv58.xyz/tabs

Firefox Add-ons: https://addons.mozilla.org/en-US/firefox/addon/tab-manager-v2

Tab Manager v2 is Chrome Extension that helps you manage your Chrome tabs easily. It's a forked version of https://github.com/joshperry/Tab-Manager.

The Tab Manager v2 is completely rewritten by React, MobX, TypeScript, and has different features with original Tab Manager.

# Usage

There is a playlist contains how to videos: https://www.youtube.com/playlist?list=PLtWVZzutpoqLdwaoAVhQPGCXU9sLwT3S7

# Development

You should be familiar with [React](https://facebook.github.io/react/), [MobX](https://mobx.js.org/), and [Chrome Extension API](https://developers.chrome.com/extensions/api_index) to develop this extension.

You should run below commands after clone this repo:

```shell
yarn
yarn start
```

Then you can load the `build/` folder in chrome://extensions page, please follow the [Load the extension](https://developers.chrome.com/extensions/getstarted#unpacked).

## Test

```shell
yarn test
```

## Packaging

```shell
yarn deploy
```

# Distribute

Follow the official guide to distribute extension: https://developers.chrome.com/extensions/hosting.

You can download older versions from https://crx.dam.io/ext/nimllkpgmmbdglnjneeakdgcpkbgbfbp.html.

# Thanks

The default fav icon is made by [Lyolya](https://www.flaticon.com/authors/lyolya) from https://www.flaticon.com is licensed by [Creative Commons BY 3.0](http://creativecommons.org/licenses/by/3.0/)
