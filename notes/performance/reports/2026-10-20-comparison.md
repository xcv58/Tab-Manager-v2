# Performance and bundle comparison: 2.7.2, 3.0.0, and master

Measured October 20, 2026. Relative to 2.7.2, master has a 68% larger download
but 30% smaller startup popup JavaScript. Its 5,000-tab search updates are
24–29% faster, and 1,000-tab group drags retain bounded rendering. The separate
Settings preview accounts for much of the download growth. Most of the runtime
improvements already exist in 3.0.0; master adds about 2.2% to its package size.

## Exact comparison

| Revision                   | Commit                                     | Source date |
| -------------------------- | ------------------------------------------ | ----------- |
| Latest 2.x release, v2.7.2 | `3cd88a06e2936a5764a96e0d353b3ed08a78aeaf` | October 11  |
| Store release 3.0.0        | `c2dea3aacb3c1fb871434bdcbbcf54019b03f602` | October 16  |
| Latest fetched master      | `3e7a511dd7197169d4288ac158c390ec9ee02e45` | October 19  |

Remote release tags were checked when adding the 2.x baseline; v2.7.2 remains
the latest 2.x release. It was published on GitHub on October 12. The current
`.github/release-automation.md` and `release-please-config.json` identify
`c2dea3aa` as the source of the manual 3.0.0 store rollout, whose GitHub release
and tag were withdrawn. The earlier version-bump commit `0567a4b7` is not that
store baseline. Both 3.0.0 and the frozen master source declare version 3.0.0.

All three revisions were exported with `git archive` into separate ignored
directories and installed independently with pnpm 10.32.1 using their frozen
lockfiles. All six Chrome/Firefox production builds passed. Node was 26.5.0 on
arm64 macOS 27.2. The 2.7.2 build uses its pinned Moment 2.31.0 and React Router
7.18.2; those dependencies are absent from 3.0/master. All three use React and
React DOM 18.3.1 and MobX 6.15.0, validated by the profiling builder.

The published 2.7.2 Chrome and Firefox ZIPs were downloaded and their SHA-256
values matched the release checksums. Every file in each rebuild is byte-for-byte
identical to the corresponding published archive: 21 files per browser, no
missing or differing files. The rebuilt ZIP sizes also match the published sizes.

## Production bundles

These are exact bytes from production source builds. ZIPs include every packaged
file, including lazy chunks and separate Settings preview assets. Packaging uses
the repository's `zip -X --compression-method deflate -9 --junk-paths` options.
The 3.0/master archives are unsigned source rebuilds, not downloaded store files.

| Artifact (bytes)               |   2.7.2 |     3.0.0 |    Master | Master vs 2.7.2 |
| ------------------------------ | ------: | --------: | --------: | --------------: |
| Chrome ZIP                     | 278,519 |   458,249 |   468,421 |         +68.18% |
| Firefox ZIP                    | 279,351 |   459,975 |   470,094 |         +68.28% |
| Chrome unpacked package        | 972,306 | 1,544,360 | 1,576,011 |         +62.09% |
| Firefox unpacked package       | 975,630 | 1,552,261 | 1,583,800 |         +62.34% |
| Chrome startup `popup.js`      | 906,779 |   627,789 |   638,637 |         -29.57% |
| Firefox startup `popup.js`     | 909,887 |   631,608 |   642,397 |         -29.40% |
| Chrome/Firefox `background.js` |  32,316 |    32,654 |    34,009 |          +5.24% |
| Chrome/Firefox `popup.css`     |  20,758 |    36,102 |    36,776 |         +77.17% |
| Chrome initial popup JS + CSS  | 927,537 |   663,891 |   675,413 |         -27.18% |
| Firefox initial popup JS + CSS | 930,645 |   667,710 |   679,173 |         -27.02% |
| Chrome Settings preview files  |       0 |   764,006 |   781,872 |    Added in 3.0 |

Compared with 3.0.0, master grows by 10,172 bytes (+2.22%) in the Chrome ZIP and
10,119 bytes (+2.20%) in Firefox. Chrome startup JS + CSS grows by 11,522 bytes
(+1.74%) and Firefox by 11,463 bytes (+1.72%).

The initial popup HTML references only `popup.js` and `popup.css`. The Settings
preview is a separate packaged UI with an isolated demo API adapter, added after
2.7.2. On master its Chrome files total 781,872 bytes and are loaded separately
from initial popup startup. Excluding those files, the remaining Chrome package
is 794,139 bytes, 18.3% smaller than 2.7.2; this subtraction is explanatory and
is not the actual download size. All preview assets remain included in the ZIP
totals above. The new Safari distribution has no 2.x/3.0 baseline and is excluded.

## Runtime method

The existing standalone production React profiling harness ran in disposable
headless Google Chrome 155.0.8059.85 at 2320×989. It uses real App/components/stores
and each revision's isolated demo browser adapter. All versions used the same
profiling entrypoint, generated tab metadata, queries, and default preferences.
The modern profiling builder selects 2.7.2 through `PROFILE_SOURCE_ROOT` and
validates its dependency versions; no production source was patched.

Each fixture has one group of 100, 1,000, or 5,000 source tabs and 12 destination
tabs in another window. `Needle` matches 6, 51, or 251 tabs; `Work` matches 106,
961, or 4,761. Counts matched in every measured run. All versions mounted 36
workspace tab rows at startup.

All three versions were rerun together: seven measured fresh-page runs per
version/workload after one untimed warmup each, with revision order rotated
through all six permutations. These 63 samples supersede the earlier two-version
timing medians. The original run is preserved under `initial-two-way/`.
The browser process was reused, with separate contexts per revision. Request
routing blocked external requests and disabled HTTP caching. This measures local
page startup and UI interaction with simulated metadata, not a cold browser
launch, native popup opening, or website-loading benchmark.

Search inserts the whole query in one operation. Input paint is measured after
two animation frames; workspace update also includes the unchanged 200 ms
debounce. Each query is cleared and settled before the next. JavaScript heap
uses CDP `HeapProfiler.collectGarbage` followed by `Runtime.getHeapUsage`.
React profiling adds overhead, so only these matched harness runs are comparable.

## Runtime results

All timings are medians in milliseconds. Total tabs include the 12 destination
tabs. The same Chrome session measured all three versions.

| Metric (ms)               | Total tabs | 2.7.2 | 3.0.0 | Master |
| ------------------------- | ---------: | ----: | ----: | -----: |
| Startup ready             |        112 |  99.9 | 101.1 |   98.4 |
| Startup ready             |      1,012 | 149.3 | 144.4 |  147.3 |
| Startup ready             |      5,012 | 457.0 | 397.1 |  398.4 |
| `Needle` input paint      |        112 |  28.0 |  26.4 |   24.9 |
| `Needle` input paint      |      1,012 |  37.2 |  32.6 |   37.5 |
| `Needle` input paint      |      5,012 |  61.5 |  57.8 |   59.0 |
| `Needle` workspace update |        112 | 220.3 | 219.6 |  219.3 |
| `Needle` workspace update |      1,012 | 245.2 | 222.3 |  231.7 |
| `Needle` workspace update |      5,012 | 391.4 | 299.0 |  296.2 |
| `Work` workspace update   |        112 | 224.3 | 220.0 |  234.0 |
| `Work` workspace update   |      1,012 | 247.0 | 231.5 |  228.1 |
| `Work` workspace update   |      5,012 | 440.7 | 307.6 |  311.9 |

Master's 5,012-tab search workspace updates are 24.3% faster for `Needle` and
29.2% faster for `Work` than 2.7.2. Both queries improved in every one of the seven
matched runs. Median paired differences were -84.0 ms and -126.3 ms respectively.
At 1,012 tabs, the corresponding median improvements are 5.5% and 7.7%.

The 5,012-tab startup median is 12.8% lower than 2.7.2, but sample ranges overlap:
2.7.2 was 408.7–637.0 ms and master 375.3–499.1 ms. At 112 and 1,012 tabs,
startup medians differ by only -1.5 ms and -2.0 ms. Do not infer a reliable
cold-start improvement from these local samples.

Master remains close to 3.0.0: startup medians differ by -2.7, +2.9, and +1.3 ms.
At 1,012 tabs, narrow-search input paint increased from 32.6 to 37.5 ms; all seven
paired samples were slower, with a +2.8 ms median paired difference. Other
3.0/master search differences are small and affected by debounce/frame scheduling.
The earlier two-version 5,012-tab startup gap did not persist in this rerun.
Seven samples do not support a reliable p95 estimate, and no intermediate-commit
CPU trace was taken to attribute a timing difference to an individual change.

## Memory at startup and after scrolling

Post-GC startup JavaScript heap, decimal MB:

| Total tabs |  2.7.2 |  3.0.0 | Master |
| ---------- | -----: | -----: | -----: |
| 112        |  9.275 |  9.531 |  9.589 |
| 1,012      | 25.056 | 25.451 | 25.505 |
| 5,012      | 95.099 | 96.130 | 96.235 |

Startup heap is slightly higher in the newer versions: master is +0.313 MB,
+0.449 MB, and +1.137 MB versus 2.7.2. These fixtures therefore do not show a
general startup-memory reduction. Master remains only 0.055–0.105 MB above 3.0.0.

A separate three-run workload per version scrolls the 1,012-tab workspace by
eight viewport heights, then inspects model references and forces GC. The newer
UI has a two-pixel shorter scroll viewport; recorded final scrollTop is 7,245
pixels for 2.7.2 and 7,229 for both newer versions. The raw records preserve exact
positions and visible-reference counts, rather than assuming identical layouts.

| After eight pages of scrolling |  2.7.2 |  3.0.0 | Master |
| ------------------------------ | -----: | -----: | -----: |
| Post-GC JS heap (MB)           | 26.311 | 25.619 | 25.680 |
| Detached model DOM references  |    180 |      0 |      0 |
| Connected model DOM references |     32 |     31 |     31 |

All three 2.7.2 samples retained 180 detached model DOM references; all six newer
samples retained zero. Master uses 2.4% less post-scroll JS heap than 2.7.2 in
this workload. The extra visible row in 2.7.2 prevents attributing the whole heap
difference to one mechanism, but the detached-reference ownership difference is
explicitly observed. This is not browser RSS or a long-run leak-free claim.

## Group drag

After the scroll measurement, each page was reloaded before a native mouse drag
of the entire 1,000-tab group into the second window. There were three drags per
version in rotating order. All nine completed, leaving one window and exactly
1,012 tabs. These use the demo API adapter; native browser tab-transfer latency
is not measured. No test suite or synthetic DOM drag event was used.

| Group-drag metric, median                |  2.7.2 |  3.0.0 | Master |
| ---------------------------------------- | -----: | -----: | -----: |
| Peak mounted workspace rows              |   1012 |     36 |     36 |
| React render time while dragging (ms)    |  106.4 |    7.3 |    6.3 |
| Largest React render while dragging (ms) |   88.4 |    5.0 |    4.5 |
| Largest long task during drag/drop (ms)  |    251 |     77 |     76 |
| Post-GC JS heap after drop (MB)          | 46.004 | 26.978 | 27.139 |
| Detached model DOM references after drop |      1 |      0 |      0 |

Compared with 2.7.2, master reduces median React render time during drag by 94.1%
and the largest drag/drop long task by 69.7%. The 2.7.2 long-task range was
250–258 ms, versus 76–82 ms on master. Its peak mounted rows fell from 1,012 to 36. Both newer versions preserve virtualization during a drag; 2.7.2 renders
the entire source window while dragging.

Post-GC heap after the completed drag is 41.0% lower on master than 2.7.2 in
this matched workload. This is a phase-specific result, not a general memory
percentage. Startup heap, post-scroll heap, and post-drop heap are separate
observations. The 3.0/master drag differences are small relative to the large
improvement over 2.7.2 and the three-sample measurement limits.

## Source-backed interpretation and remaining native costs

- The 2.7.2 → 3.0 changes remove Moment/router runtime dependencies, share search
  work, preserve source-window virtualization during drag, and keep React refs
  under `observable.ref`. Those changes align with smaller startup JS, faster
  large searches, bounded drag rendering, and the observed ownership fix. This
  comparison does not isolate the contribution of each change.
- Since 3.0, `background/TabHistory.tsx` adds
  `browser.windows.getAll({ populate: true })` and constructs an all-tab map
  for every recent-tab shortcut invocation. Earlier versions choose a target
  from cached history. Master serializes rapid invocations for correctness, so
  each queued press pays the new read and O(open tabs) processing. Its native IPC
  and rapid-key-repeat latency remain unmeasured by this UI harness.
- Firefox group transfers add group/member reads and may move the active member
  aside and back to preserve unloaded tabs and ordering. The native cost of
  those correctness fixes is not timed here.
- Shared search focus/navigation and Safari capability/state handling add code
  after 3.0. Bundle deltas do not establish each feature's exact contribution.

## Evidence and reproduction

The durable copy of this audit is now in `notes/performance/runs/`, with one
record per measured source commit. Those records preserve all raw runtime and
drag observations and complete package-file inventories. The original capture
and profiling sources are saved as text in `notes/performance/audits/2026-10-20/`.
See [the archive instructions](../README.md) for the generated history viewer
and reusable capture commands. A new capture uses a new run ID and runtime
series; it does not overwrite these observations.

Local generated evidence remains in `.tmp/performance-comparison/`:

- `bundle-sizes.json`: all files, raw/gzip bytes, and SHA-256 for six builds.
- `published-2.7.2/`: published ZIPs, checksums, and `rebuild-verification.json`.
- `runtime-raw.json`, `runtime-summary.json`: all 63 measured samples,
  environment, minima/maxima, and medians; zero page errors.
- `drag-raw.json`, `drag-summary.json`: nine scroll/GC observations and nine
  completed drags, with exact positions and reference counts; zero page errors.
- `legacy-*.zip`, `release-*.zip`, `master-*.zip`: the six measured packages.
- `measure-bundles.cjs`, `profile-runtime.cjs`, `profile-drag.cjs`,
  `summarize.cjs`: local measurement drivers; Playwright is used directly
  without its test runner.
- `legacy-drag-*.png`, `release-drag-*.png`, `master-drag-*.png`: post-drop
  captures. The final legacy and master captures were visually inspected.
- `initial-two-way/`: preserved original observations and report.

Source directories `legacy/`, `release/`, and `master/` were installed using
`pnpm install --frozen-lockfile --ignore-scripts --offline`, then `pnpm build`.
From the isolated master source root, the additional 2.7.2 profiling build used:

```sh
NODE_ENV=production TARGET_BROWSER=chrome \
  PROFILE_REVISION=3cd88a06e2936a5764a96e0d353b3ed08a78aeaf \
  PROFILE_SOURCE_ROOT=../legacy/packages/extension \
  PROFILE_OUTPUT=../../../profile-legacy \
  node packages/extension/utils/profile.js
```

For 3.0/master, the profiling builder runs from its own source root with the
appropriate full revision and `PROFILE_OUTPUT=../../../profile-release` or
`../../../profile-master`, omitting `PROFILE_SOURCE_ROOT`.

From the main repository root, the generated drivers can be rerun with:

```sh
node .tmp/performance-comparison/measure-bundles.cjs
node .tmp/performance-comparison/profile-runtime.cjs
node .tmp/performance-comparison/summarize.cjs
node .tmp/performance-comparison/profile-drag.cjs
```

Run runtime and drag profiling sequentially to avoid timing interference.
Generated sources, archives, browser profiles, and raw observations remain
ignored and local. No application source, tracked version, public website,
personal browser profile, or remote branch changed. No unit/integration suites,
Linux visual checks, snapshot refreshes, or video-capture flows ran. Native
popup/background latency, Firefox/Safari runtime, Linux visual verification,
and production website status remain outside these measurements.
