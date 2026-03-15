# AMO Source Code Review

This file is included in the Firefox source archive that is uploaded alongside
the built add-on package for AMO review.

## Build environment

- Node.js 24
- pnpm 9

## Install dependencies

```bash
pnpm install --frozen-lockfile
```

## Build the Firefox package

```bash
pnpm --filter tab-manager-v2 build:firefox
pnpm --filter tab-manager-v2 zip:firefox
```

The packaged Firefox add-on is created at:

- `packages/extension/build/build_firefox/`
- `packages/extension/build/build_firefox.zip`

## Source archive

The AMO source archive is generated from the current git tree with:

```bash
git archive --format=zip --output packages/extension/build/build_firefox_source.zip HEAD
```

That archive intentionally includes this file plus the full repository sources,
lockfile, and build configuration that are needed to reproduce the Firefox
build.
