# Dependency security follow-up — October 16, 2026

This follow-up keeps the website review in draft PR #2681. It adds two pnpm
patches without changing dependency versions, extension behavior, the existing
image-size/node-forge patches, or audit exclusions.

## Floating-point formatting

[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
affects sprintf-js through its latest published release, 1.1.3. There is no
published fix. The locked 1.0.3 copy is reached through Jest's coverage tooling:
`jest → @jest/core → @jest/transform → babel-plugin-istanbul →
@istanbuljs/load-nyc-config → js-yaml 3 → argparse 1 → sprintf-js`.

The patch bounds precision before the native formatting calls: 0–100 digits
for exponential/fixed formatting and 1–100 significant digits for general
formatting. Oversized precision, including digit strings that become Infinity,
now produces bounded output instead of an uncaught RangeError. Zero significant
digits becomes one. Supported precision, omitted precision, string truncation,
other placeholders and unsupported negative-precision syntax retain their
existing behavior. The patch covers the `src/sprintf.js` Node entry point used
by argparse; no browser bundle uses this dependency path.

## Brace-pattern recursion

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
affects braces through 3.0.3 and has no published fixed release. The published
8,003-character reproduction can exhaust the Node stack in compilation/expansion
(the exact failure depends on runtime stack/JIT state), despite staying below the package's 10,000-character limit. Multiple build,
lint, watch and test tools retain this package; upgrading only the Jest lint
plugin does not remove those paths.

The patch sets a shared maximum AST depth of 128 for compile, expand and
stringify. It checks terminal children and preserves the depth when expansion
hands an invalid/range node to stringify, including callers supplying an AST
directly. Excess nesting is rejected with a controlled SyntaxError, matching
the package's existing input-length validation policy. Invalid patterns can
still produce normal validation errors; the fix prevents native stack
exhaustion. Ordinary alternatives, ranges, escapes, file patterns and valid
nesting within the limit keep their prior results. A failure does not retain a
counter that affects later calls.

Tailwind is declared as an extension dependency, so production-only version
audits also report braces. Tailwind is invoked by the webpack PostCSS loader
when building CSS, rather than imported by the extension's browser JavaScript.
The patch nevertheless covers all locked braces consumers, including chokidar
and micromatch, rather than excluding production-labelled audit paths.

## Audit interpretation and removal

Version scanners still report the three unchanged upstream versions:

- node-forge 1.4.0, GHSA-86w9-cpqp-85rv: existing local RSA validation patch.
- sprintf-js 1.0.3, GHSA-hp3w-g68c-fv3c: precision patch added here.
- braces 3.0.3, GHSA-vfj7-8cjw-p6xm: recursion guard added here.

These are tested local mitigations, not upstream fixed releases. No new audit
ignore or alert dismissal hides them. The inherited image-size exclusions and
patch remain unchanged. GitHub's default-branch alerts are separate from this
unmerged draft and may remain open even after a merge because their detection
uses package versions.

Remove each local patch only after a compatible upstream release includes its
fix or the dependency is removed. Re-run the focused exploit and compatibility
regressions when changing those dependency paths.

## Validation

The focused `pnpm test:dependency-security` command resolves the actual consumer
entry points and covers RSA validation, numeric-format boundaries/adversarial
precision, argparse help/options, the js-yaml CLI, brace string/AST limits,
post-failure recovery and micromatch/fast-glob file patterns. Node 24 is used for
local checks, along with a frozen-lockfile install, `pnpm build`, and
`pnpm build:site`. Linux CI, including its existing visual checks, remains a
separate gate after the branch is pushed. No snapshots or generated builds are
committed, and no publication or merge is part of this follow-up.
