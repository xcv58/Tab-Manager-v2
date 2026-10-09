# Dependency security update

GitHub listed 42 open Dependabot alerts across 21 packages on October 9, 2026. The lockfile preceded PRs #2659 and #2660; those PRs changed package
scripts without changing dependency versions. This update addresses the full
current backlog rather than assuming which seven alerts an email referred to.

## Published updates

The following versions fall outside the affected ranges in 40 of the 42
alerts. Transitive overrides keep compatible major versions where a fix exists.

| Package                    | Resolved version  |
| -------------------------- | ----------------- |
| `@humanfs/node`            | 0.16.8            |
| `adm-zip`                  | 0.6.1             |
| `baseline-browser-mapping` | 2.11.0            |
| `brace-expansion`          | 1.1.21 and 5.0.12 |
| `browserslist`             | 4.28.7            |
| `compression`              | 1.8.2             |
| `fast-uri`                 | 3.1.8             |
| `handlebars`               | 4.7.10            |
| `http-cache-semantics`     | 4.3.0             |
| `js-yaml`                  | 3.15.2 and 4.3.2  |
| `moment`                   | 2.31.0            |
| `postcss-selector-parser`  | 7.1.6             |
| `proxy-addr`               | 2.0.8             |
| `qs`                       | 6.16.0            |
| `shell-quote`              | 1.11.0            |
| `source-map-js`            | 1.2.2             |
| `svgo`                     | 4.1.0             |
| `undici`                   | 7.29.1            |
| `webpack-dev-middleware`   | 7.4.6             |

`postcss-selector-parser` must move from the affected 6.x branch to 7.1.6.
It is used by Tailwind and other CSS build tools, so Linux visual snapshots
remain an explicit CI check. `adm-zip` moves from 0.6.0 to 0.6.1.
`moment` is the only changed direct extension runtime dependency.

## Node-forge backport

[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
has no published fixed version. The pnpm patch backports the `lib/rsa.js`
change from [upstream PR #1152](https://github.com/digitalbazaar/forge/pull/1152):
reject extra ASN.1 children inside the nested DigestAlgorithm sequence,
including when optional NULL parameters are absent.

The affected dependency path is `web-ext` → `@devicefarmer/adbkit` →
`node-forge`. This repository uses its Node entry point, not the distributed
browser bundles; the patch covers that Node implementation. CI resolves the
same dependency path and checks valid signatures, altered messages, optional
NULL parameters, and malformed signatures with extra nested children.

Remove this patch once a published upstream release includes the fix. Version
scanners will still flag 1.4.0 because they do not account for the local patch.

## Remaining disputed alerts

[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
affects `sprintf-js`, including its latest 1.1.3 release. It reports a
`RangeError` when an invalid floating-point precision appears in a format
string. The [upstream discussion](https://github.com/alexei/sprintf.js/issues/237)
disputes this classification and requests withdrawal; there is no published fix.

Here it is pulled in by Jest/Istanbul's `js-yaml` 3.x CLI dependency on
`argparse` 1.x. The YAML CLI defines fixed help and usage strings. YAML input
is parsed as data, not passed to `sprintf` as a format string. Neither this CLI
nor `sprintf-js` is bundled into the extension. No override or audit ignore is
added to conceal this alert. Reassess if upstream publishes a fix or withdraws
the advisory, or if the dependency becomes part of a user-controlled template
rendering path.

A fresh registry audit also reports
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
for `braces` 3.0.3; this was not in the original 42-alert GitHub snapshot.
There is no fixed release. The [upstream maintainer disputes the report](https://github.com/micromatch/braces/issues/70#issuecomment-5995348316).
The reported trigger is an attacker-controlled, deeply nested glob pattern.
Here the dependency is used by developer tooling to process repository and
configured build/test glob patterns. The extension does not pass browser tab
data or user searches into this package. This alert also remains visible and
unignored pending an upstream resolution.

The audit additionally found
[GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj),
which requires `fast-uri` 3.1.8 instead of 3.1.7. The override includes this
newer same-major fix.

## Verification

Default local verification is dependency installation, security audit, and
`pnpm build`. The RSA regression and existing unit/integration tests run in
GitHub's Node 24/25 Ubuntu CI. Local tests and snapshot refreshes require human
approval under `AGENTS.md`. Version-based auditing will still report node-forge
(patched locally), sprintf-js, and braces; no alerts are dismissed or new audit
ignores added by this change.
