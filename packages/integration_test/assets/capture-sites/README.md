# Local sample websites for marketing captures

`catalog.json` is the shared source for fictional page titles and URLs used by
release screenshots, Chrome/Firefox/Edge listing captures, and feature videos.
The pages run in real browser tabs beside the real built extension.

`../../scripts/capture-sites.mjs` starts an HTTP forward proxy bound to loopback.
It serves only known `http://*.example.test/` pages and bundled PNG favicons.
Unknown URLs and HTTPS tunnels are rejected; requests are never forwarded to
the internet. Browser proxy settings apply only to disposable capture profiles.
The reserved `.test` URLs do not require DNS changes, a certificate, or a fixed
local port. No changes are made to personal browser profiles.

Add a unique catalogue key, a `.example.test` HTTP URL, and a readable title for
new pages. Reuse an existing URL to demonstrate duplicate tabs. Favicons are
local monograms with a consistent color per fictional website. Their SVG
sources and PNG exports live together in `icons/`. Regenerate them with
`TMV2_TEST_BROWSER_PATH=/path/to/chrome pnpm --filter integration-test exec node
scripts/render-capture-icons.mjs` when changing the catalogue’s websites or icon
style.

Run the focused fixture checks with:

```sh
node --test packages/integration_test/scripts/capture-sites.test.mjs
```

Keep separately authorized live-site smoke checks outside marketing recordings.
The 1,024-tab video demonstrates Tab Manager's interface with local sample pages
and unloaded background tabs; it is not a website-loading benchmark.
