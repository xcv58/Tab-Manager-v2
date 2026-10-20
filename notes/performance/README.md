# Performance history

The archive stores measurements. The public website and offline viewer are
generated from the same records and chart code. Neither is included in the
extension package.

## Website page

The website's **Performance** footer link opens `/performance/`. Its main
view is **Release history**, showing every archived release. Use **History range**
for all versions, the latest 10, or an inclusive custom range. Enable
**Include development versions** to inspect archived candidate commits. The
page identifies the frozen master snapshot rather than treating it as a release.
Version, baseline, browser, measurement series, workload, and development-version
visibility, history range, and comparison disclosure are preserved in the URL.
Select any chart point (mouse or keyboard) or version in **Releases at a glance**
to inspect it. **Compare two versions** exposes the highlighted version and its
baseline; initially these are the latest measured release and its predecessor.
The release table shows all six metrics and their changes from each version's
preceding archived release, even if that preceding version is outside the range.
Package evidence distinguishes original published ZIPs from source rebuilds.

`pnpm build:site` builds the page into `dist/site/performance/`, using the shared
site navigation and theme. It reads only checked-in archive records and excludes
dirty working-tree captures. A release's archive PR must be reviewed and merged
before its records appear in the next website build. Missing runtime measurements
remain unavailable; exact bundle sizes can be published independently.

To preview the complete website locally:

```sh
pnpm build:site
node scripts/preview-release-media.mjs dist/site 8781
```

Open **http://127.0.0.1:8781/performance/**. The comparison report is in English;
the shared navigation keeps the website's language and appearance controls.
The generated page embeds summaries; complete raw records are downloadable
from its evidence links. No measurements run during the website build.

## Visualize the archived versions

From the repository root, with Node.js 24+ and the pinned pnpm installed:

```sh
pnpm performance:preview
```

Open **http://127.0.0.1:8780/**. Choose the version, baseline, package browser,
runtime series, and workload. Changes to the controls are reflected in the URL.
The developer viewer includes candidate versions by default; use its checkbox to
show releases only.
The browser does not need network access to render the report. Stop the local
server with Ctrl+C.

For an offline copy:

```sh
pnpm performance:build
open dist/performance/index.html
```

Keep `index.html`, `viewer.js`, `viewer.css`, and `records/` together when copying
the generated folder. No dev server, external chart library, or browser API
permissions are required. Evidence links open the full raw JSON record; commit
links point to GitHub. The viewer generates its own `index.json` and discovers
archived records automatically, so a new version needs no chart-code changes.

The archive covers all seven published releases from v2.6.0 through v2.7.2,
the manual 3.0.0 store source, and the unreleased master snapshot at `3e7a511d`.
See [the historical backfill](reports/2026-10-20-release-history.md) and
[the original three-version comparison](reports/2026-10-20-comparison.md).

## Read a new CI run before merging its archive PR

Download the `performance-runtime-<run>-<attempt>` artifact from **Advisory
Performance History** in GitHub Actions. Its `viewer/` folder is ready to open
offline. To combine its records with the checked-out history:

```sh
pnpm performance:preview --input /path/to/downloaded-artifact/runs
```

For bundle-only records attached to a release:

```sh
gh release download vX.Y.Z --pattern 'bundle-*.json' --dir .tmp/performance-import
pnpm performance:preview --input .tmp/performance-import
```

These commands visualize additional records without changing the archive.

## Preserve a measurement

`runs/<id>.json` is one immutable record per frozen source commit and capture
run. Records contain source/version/status, exact ZIP and file hashes, raw
observations, provenance, and the runtime compatibility key. A rerun gets a new
ID. Reimporting identical JSON is harmless; an existing ID with different data
is rejected. Missing metrics stay unavailable rather than becoming zero.

To archive downloaded records locally, then review the resulting data change:

```sh
pnpm performance:archive --input /path/to/downloaded-artifact/runs
pnpm performance:build
git diff --stat
```

Commit the added records in a data-only PR. `dist/` and `.tmp/` remain generated
and ignored. Do not commit browser profiles, ZIPs, screenshots, or heap snapshots.

The October 20 audit was imported retrospectively. Its original observations
are preserved in the three records, and the original capture/harness sources
are archived as text in `audits/2026-10-20/`. Their hashes were computed at
archival, not signed during the original measurement. Concrete fixture hashes
and CPU model were not captured then. That audit is its own runtime series and
is never silently joined with future captures.

## Collect exact bundle sizes

```sh
pnpm build
pnpm zip
pnpm performance:collect
pnpm performance:preview --input .tmp/performance-results/runs
```

The collector checks that every ZIP entry matches its unpacked build, including
the manifest version. It records the complete download plus startup assets and
separate Settings preview assets. Stale ZIPs fail collection. Working-tree
captures are marked dirty and are not merged with clean commit measurements.

## Run an advisory runtime comparison

After installing workspace dependencies and Playwright Chromium:

```sh
pnpm --filter integration-test exec playwright install chromium
pnpm performance:compare --head HEAD --base auto
pnpm performance:preview --input .tmp/performance-results/runs
```

`auto` finds the release preceding the candidate, excluding the candidate's own
tag, and honors the manual 3.0.0 bootstrap commit. It does not recreate withdrawn
tags. Override it with an exact release ref when appropriate:

```sh
pnpm performance:compare --head 3e7a511d --base v2.7.2
```

The command exports each commit with `git archive`, installs each frozen
lockfile independently, and builds a common production React profiling harness.
It runs seven alternating samples at 112, 1,012, and 5,012 total tabs, then three
scroll/GC and native mouse group-drag observations per revision. The actual
fixture fingerprints must agree. Both versions use the same browser process,
viewport, harness, external-request blocking, and HTTP-cache policy. The common
simulated browser adapter is part of the profiling harness, including for releases
that predate the website demo. The frozen version's UI and stores remain intact.

Every capture also measures a fixed reference: the manual 3.0.0 source at
`c2dea3aacb3c1fb871434bdcbbcf54019b03f602`. Duplicate revisions are measured only
once per run. Override `--reference REF` explicitly if a future benchmark protocol
needs another reference. The recorded reference and harness/environment changes
remain visible; measurements from different series are never joined silently.

Optional capture controls:

```sh
pnpm performance:compare --head HEAD --base auto --samples 1 --drag-samples 0 --tabs 100
pnpm performance:compare --head HEAD --base auto --executable '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

A reduced sample count is a smoke capture, not a substitute for the default
comparison. The full sample counts are always recorded. Runtime measurements
are simulations of the tab-management UI, not native browser IPC, cold browser
launch, website loading, renderer RSS, or proof of leak-free behavior. Min/max
whiskers are observed ranges, not confidence intervals or p95 estimates.

Browser/runner/toolchain/harness/fixture changes create separate series. The
viewer only computes runtime deltas inside the selected series and workload.
Bundle records and runtime records can be from different captures of the same
clean commit; both evidence links and capture dates are shown. No numeric
performance thresholds block publishing in this initial implementation.

## Backfill release history

Original published ZIPs can be inspected independently of rebuilding source:

```sh
pnpm performance:backfill --since 2.6.0 --output .tmp/performance-backfill
pnpm performance:archive --input .tmp/performance-backfill/runs
```

This reads all matching non-prerelease GitHub releases, verifies the tag's source
version, downloads the two original packages, and checks GitHub asset digests,
published checksums, manifest versions, and ZIP entry CRCs. The archived record
identifies the release, assets, URLs, publication dates, and backfill date.
The manual 3.0.0 release has no remaining GitHub assets; its existing source-build
measurements remain explicitly identified as a rebuild.

To remeasure a complete history in one compatible runtime series:

```sh
pnpm performance:compare --base c2dea3aa --reference c2dea3aa \
  --revisions v2.6.0,v2.6.1,v2.6.2,v2.6.3,v2.7.0,v2.7.1,v2.7.2,3e7a511d \
  --output .tmp/performance-runtime-backfill
pnpm performance:archive --input .tmp/performance-runtime-backfill/runs
```

All frozen sources are built before timing begins. Captures use one browser and
the same adapter, concrete fixture fingerprints, viewport, warmups, and repeated
workloads. Observations alternate forward and reverse revision order. Historical
timings are measured today, never presented as observations from the original
publication dates. Defaults remain seven samples per workload and three drags;
the reduced smoke records are not part of the committed history.

## Release integration

The release build collects bundle sizes from the exact already-built ZIPs.
Its JSON and Markdown reports are checksummed, uploaded with the release build,
and attached to the GitHub release. A separate job opens a draft, data-only PR
to preserve those records in Git.

The release also calls **Advisory Performance History**, a separate workflow
that compares the tag against the previous release and opens its own data-only
archive PR. Complete runtime records and Markdown reports are also attached to
the candidate's GitHub release. Store publishing jobs do not depend on runtime
or archive jobs.
Capture failures upload diagnostics and do not create partial successful
records. Archive PRs require human review and are never auto-merged.

After this tooling is merged, a manual run is available in GitHub Actions →
**Advisory Performance History** → **Run workflow**. Set `head` to the candidate
ref and `base` to `auto` or an explicit ref. No release is created by that manual
workflow. A runtime viewer is included in its downloadable artifact.

Archive jobs prefer `RELEASE_PLEASE_TOKEN`, matching the release bot setup, with
`GITHUB_TOKEN` as a fallback. The token/repository settings must allow pushing
an archive branch and opening a PR. If PR creation is unavailable, the immutable
JSON remains in the release assets or workflow artifact for manual import.
Workflow artifacts use 30-day retention; Git records and release attachments
are the long-term copies.
