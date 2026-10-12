# Performance, memory, and artifact work

Baseline: master `3cd88a06e2936a5764a96e0d353b3ed08a78aeaf` (2.7.2).
Working branch: `codex/performance-memory-size`.

## Completion ledger

| Requirement                            | Evidence needed                                                                                 | State                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Representative baseline and comparison | Identical simulated workloads; startup/render/search/drag/heap observations                     | Repeated runtime and GC-controlled heap comparison recorded             |
| Moment/runtime size                    | Equivalent relative-time behavior and production bundle comparison                              | Implemented; relative-time unit coverage and artifact comparison pass   |
| Router overhead                        | Popup/full-page query behavior without a routing dependency                                     | Implemented; URL-mode browser regression passes                         |
| Optional UI loading                    | Settings/help open, close, focus restoration and chunk inclusion                                | Implemented; local demo and browser settings checks pass                |
| Search work                            | Matching/ranking preserved; linear grouped-array construction; shared query work where possible | Implemented; unit coverage, runtime comparison, and browser checks pass |
| Drag virtualization                    | Bounded mounted rows, source remains mounted, successful tab and group moves                    | Native tab/group drags across virtual scroll boundaries pass            |
| Background icon updates                | Coalesced bursts, latest state wins, current/all/off modes preserved                            | Implemented; approved regression coverage passes                        |
| Model retention                        | Selections/focus reference current models after refresh; deleted groups pruned                  | Implemented; unit coverage and GC-controlled comparison recorded        |
| Tab history payload                    | Recent-tab cycling preserved with minimal persisted/live metadata                               | Implemented; approved history regressions pass                          |
| Demo parity                            | Production site build and local interactions; sample API stays isolated                         | Built; four appearance combinations and preference reload checked       |
| Reviewable PR                          | Before/after report, human verification, approved suites and Linux visuals                      | Pending                                                                 |

## Existing measurements

Released Chrome ZIP: 278,519 bytes; unpacked: 972,306 bytes.
Released Firefox ZIP: 279,351 bytes; unpacked: 975,630 bytes.
Chrome popup.js: 906,779 bytes; background.js: 32,316 bytes; CSS: 20,758 bytes.
An isolated production rebuild reproduced these three files byte-for-byte.
Omitting Moment locales alone reduced popup.js to 659,083 bytes.

The existing unpacked Chrome view (same JS/CSS as 2.7.2, manifest 2.7.1),
with 15 tabs in five windows, showed 88.4 MB renderer footprint and approximately
16.6 MB main / 2.4 MB background JavaScript heap. These are single observations,
not post-GC retained-heap measurements or evidence of a leak. DevTools affects
worker lifetime. They cannot be extrapolated to thousands of tabs.

## Verification boundaries

Builds and profiling are authorized by this goal. On October 12, the user
explicitly skipped reloading the extension in the personal Yihong profile and
approved unit/browser suites, Linux visual checks, and PR creation. Automated
browser validation uses disposable profiles. Linux visual verification is
required before calling snapshot-sensitive work complete. No merge, production
deployment, release, or store submission is authorized by this goal.

The profiling page is a separate build using real App/stores and the isolated
demo browser adapter. Its deterministic fixtures and measurement panel are not
part of the extension or public website bundles. React production profiling
adds overhead; compare only equal harnesses, viewport, and workloads. Heap API
figures are approximate; retained-memory conclusions need heap snapshots.

## Baseline UI observations

Chrome (Yihong), viewport 2320x989. Production React profiling bundle. One large
group in the source window and 12 ungrouped tabs in the destination. Native CUA
input/drag; no synthetic JavaScript-dispatched browser events. The profiler
changes startup overhead, so these timings apply to this harness.

| Source tabs | Total tabs | Startup ready (ms) | Largest initial React commit (ms) | Mounted tab rows |
| ----------- | ---------- | ------------------ | --------------------------------- | ---------------- |
| 100         | 112        | 177.2              | 12.7                              | 36               |
| 1000        | 1012       | 165.3              | 17.7                              | 36               |
| 5000        | 5012       | 341.1              | 81.7                              | 36               |

For the 1000-tab group drag, the move completed (two windows became one, total
tab count remained 1012). Peak mounted tab rows were 1012, largest drag React
commit 542.7 ms, total drag React render time 560.7 ms. The browser reported
three long tasks totaling 1819 ms, largest 1491 ms. Post-drop mounted rows: 24.

Search query `Needle` matched 51 of 1012 tabs and 251 of 5012 tabs. Complete
observations: 1000-source input-to-workspace two-frame timing 350.7 ms; 5000-source
1057.9 ms, largest search React commit 179.6 ms, four long tasks totaling 931 ms.
These include the intentional 200 ms workspace debounce and subsequent browser
frame scheduling. Preliminary reads before the measurement completed were
discarded. Startup samples are individual observations, not p95 estimates.

The initial incorrectly styled profiling build and hash-only scenario switches
were discarded. The final harness runs use the extension's Tailwind config and
full document reloads; total tab counts and viewport were verified each time.
Used-heap values fluctuated widely before GC; do not use them to claim retained
memory improvements. Later GC-controlled snapshots are recorded below; these earlier heap API readings remain unsuitable for retained-memory claims.

## First implementation build

Both extension targets and the website build passed. Chrome startup popup.js
is 531489 bytes (previously 906779), with optional JS chunks of 6381 and 30118
bytes. All generated files together were 633464 bytes (previously 972306).
These numbers precede the shared-search change and final validation.
No test suites or Linux snapshots have been run. Relative-time cases and the
existing autocomplete fixture adaptation were authored for later approved runs.

## Final implementation build and package comparison

Both `pnpm build` (Chrome and Firefox) and `pnpm build:site` succeeded. Package
measurement uses the repository's `zip -X --compression-method deflate -9 -r
--junk-paths` options. All optional chunks are included. Version remains 2.7.2;
this work is not a release. The public website has not been deployed.

| Artifact                 | Released 2.7.2 (bytes) | Current (bytes) | Reduction |
| ------------------------ | ---------------------: | --------------: | --------: |
| Chrome ZIP               |                 278519 |          195299 |     29.9% |
| Firefox ZIP              |                 279351 |          196044 |     29.8% |
| Chrome unpacked          |                 972306 |          638821 |     34.3% |
| Firefox unpacked         |                 975630 |          642165 |     34.2% |
| Chrome startup popup.js  |                 906779 |          536615 |     40.8% |
| Firefox startup popup.js |                 909887 |          539743 |     40.7% |

Current background.js: 32545 bytes; popup.css: 20758 bytes. The background grew
229 bytes to add coalescing and serialize updates; CSS is unchanged. Optional
dialog chunks: 496.js (6382 bytes) and 906.js (30119 bytes). Router runtime/types
and Moment have been removed. Relative-time labels use a small local formatter.

## Repeated before/after profiling

Three alternating samples per implementation, Chrome Yihong, one source group
and 12 destination tabs, equal production React profiling builds. The 1000-source
and drag comparisons used 2320x989. The final 5000-source comparison used the same
2320x933 default viewport for both builds, with DevTools closed. Baseline source
was frozen with `git archive 3cd88a06` and rebuilt with the same entrypoint.
Results are medians, not p95 or production guarantees. Native CUA input was used;
no browser test suite ran.

The first frozen baseline accidentally linked cached Moment 2.30.1. Its repeated
comparisons were discarded and replaced with exact 2.31.0 runs. The profiling
builder now rejects mismatched pinned React, React DOM, MobX, Moment, or router
versions and displays the dependency versions/revision in its DOM panel. Reads
with differing viewports or an open DevTools panel were also discarded.

| Metric                                   | v2.7.2 baseline |  Current |
| ---------------------------------------- | --------------: | -------: |
| 1000-source startup ready                |        129.3 ms | 112.6 ms |
| 5000-source startup ready                |        354.7 ms | 321.7 ms |
| 1000-source search input paint           |         32.1 ms |  17.1 ms |
| 5000-source search input paint           |         78.1 ms |  42.8 ms |
| 1000-source search workspace update      |        311.2 ms | 269.8 ms |
| 5000-source search workspace update      |        436.9 ms | 340.0 ms |
| 1000-tab group drag peak mounted rows    |            1012 |       36 |
| 1000-tab group drag total React render   |        445.8 ms |  32.9 ms |
| 1000-tab group drag largest React render |        432.3 ms |  22.8 ms |
| 1000-tab group drag largest long task    |          720 ms |    94 ms |

Search `Needle` matched 51 and 251 tabs respectively in every accepted run.
Workspace timings include the unchanged 200 ms debounce and two animation
frames. An empty workspace query now avoids depending on live input, preventing
the first keystroke from invalidating every unfiltered row. Startup is a small
warm-cache sample; do not claim a reliable cold-start gain.

All six group drags completed, preserving 1012 tabs and reducing two windows to
one. An individual tab appended to the destination: header count changed 12 to
13, the moved tab was last, total remained 1012, and peak rows were 36. The
1000-source and drag timings precede the final history metadata and stale-owner
priority corrections; the final 5000-source runs include them. Their ordinary
fixtures contain neither zero-count history nor stale selected owners. Full
regression coverage still awaits human-approved suites.

Raw local observations: `/private/tmp/tab-manager-performance-audit/` contains
`search-comparisons.json`, `drag-comparisons.json`, `reference-comparisons.json`,
`final-artifacts.json`, both final ZIPs, and four demo appearance screenshots.
These local artifacts are not committed website content.

## Confirmed memory ownership fixes

Deep MobX observation copies ordinary React ref objects. A descriptive Node
diagnostic confirmed that clearing the original ref leaves the copied ref
holding its node. All three stored React ref types now use `observable.ref`:
tab/window/group nodes, the workspace container, and the search input.

After an identical eight-page scroll in a 1012-tab workspace, reachable model
refs held 38 detached DOM nodes in v2.7.2 and zero in the current build. Both
had 31 connected refs. After selecting one tab and invoking Sync All Windows,
v2.7.2 had one stale selected model and one detached ref; current had zero of
each and retained the selection. This confirms the ownership problem; it does
not quantify aggregate retained heap or prove there are no other leaks.

Snapshot refreshes reuse windows/tabs by ID and update the owner when tabs move.
Selected app-window owners are kept current while the app-window setting hides
them. Selection entries rebind to current models or disappear when the tab is
closed. Removed groups and absent groups prune cached rows. Tab history keeps
IDs only while preserving cycling order and live capacity; legacy metadata is
stripped on load. Regression cases are authored but have not been executed.

## Human verification gate and remaining work

Local demo: `http://127.0.0.1:8766/demo/workspace.html?not_popup=1`.
The final shared demo rendered in modern/classic and light/dark, retained the
chosen style/theme after reload, restored Settings focus after Escape, matched
group-title search, and exposed all four move commands. No adapter duplication
or new persisted setting was introduced. Browser-native background behavior
and Firefox runtime are still pending checks. The PR preview does not exist yet;
the public website remains unchanged.

Human review and approval for unit/browser/Linux visual checks were requested.
No test suites, Linux baseline refreshes, new PR, push, merge, or release have
occurred. Remaining work includes approved regressions and Linux visuals,
native browser/background/history coverage, scroll-during-drag acceptance,
broader memory/runtime acceptance, and the reviewable draft PR. These gates
require human input; leave them pending rather than treating them as accepted.

Reproduce the current profiling build (standalone, not shipped):

```sh
NODE_ENV=production TARGET_BROWSER=chrome node packages/extension/utils/profile.js
```

Output defaults to `.tmp/performance/current`. Serve it locally and open
`index.html?not_popup=1#scenario=single-window&tabs=1000&grouped=1`.
Use 100, 1000, or 5000 source tabs and fully reload after changing the hash.
`PROFILE_SOURCE_ROOT` selects a separately checked out baseline extension root
with its dependencies installed; `PROFILE_OUTPUT` selects a distinct output.
Reset measurements before an interaction and wait for the DOM metrics panel
to finish before reading it. Inspect retained references only on demand to
avoid adding an O(tabs) scan to every measurement frame.

## GC-controlled memory observation

Both saved heap snapshots represent 1012 tabs in two windows, viewport
1266x933, a verified scrollTop of 7464 after eight pages, 29 mounted rows, and
30 connected model refs. Chrome DevTools Memory was opened for each target;
Collect garbage and Take heap snapshot were used. The first snapshot preceded
the final stale-owner preference and history-type corrections, which do not
change this empty-selection, unfiltered fixture. A broader long-run leak test
has not been performed.

| Heap snapshot observation |       Baseline |      Candidate |
| ------------------------- | -------------: | -------------: |
| Total snapshot self-size  | 63843687 bytes | 46421680 bytes |
| Snapshot nodes            |        1097595 |         804172 |
| Window models             |              4 |              2 |
| Tab models                |           2024 |           1012 |
| Detached model node refs  |             37 |              0 |

The snapshot total fell by 17.4 MB (27.3%) in this one matched workload. The
model counts were obtained by scanning object property signatures, requiring
`store` plus tab/window-specific methods to exclude annotation dictionaries.
They show an extra complete set of window/tab models in the baseline. The
whole difference must not be attributed solely to Moment or detached DOM refs,
and snapshot self-size is not renderer RSS, peak memory, or a leak-free claim.

Local exports were saved outside the repository/public site during profiling:
`baseline-1000-after-scroll.heapsnapshot` (129168007 bytes),
`current-1000-after-scroll.heapsnapshot` (90573383 bytes),
`heap-summary.json`, and `heap-model-counts.json`, all under
`/private/tmp/tab-manager-performance-audit/`. Do not commit or upload the raw
snapshots as part of the PR. The report contains aggregate results only.

## Additional confirmed parity fixes

Native-style moves and closes were reproduced through isolated demo API calls
in the profiling page. Baseline moves left one stale selected model, one detached
ref, and an obsolete focused model; closes also retained the old focus. Current
moves rebind selection/focus, and closes clear obsolete focus/pending keyboard
verification. Both current observations had zero detached refs and current focus.
A stale selected owner from another window now cannot replace the displayed
model during a snapshot refresh. These scenarios have approved passing unit
regressions.

A zero-visit history record was displayed by the baseline but disappeared with
shared matching. Classification now uses the history item's string ID rather
than a truthy visit count; real Tab instances take a fast path to avoid observing
all tab IDs. This follows the [Chrome history API contract](https://developer.chrome.com/docs/extensions/reference/api/history#type-HistoryItem),
which declares string history IDs and optional visit counts. The fixture now
renders under History with `an hour ago` and `0 / 0`. Selecting it raised the
simulated tab count from 112 to 113 while real managed Chrome tabs stayed at
three. Zero and missing visit counts also have approved passing regression
coverage.

Final review packages are `review-chrome.zip` and `review-firefox.zip` in the
local artifact directory. Their file lists match the corresponding final build
exactly, including the optional chunks. Both still embed version 2.7.2. The
implementation was committed as `f0b3806e`; test fixtures and validation notes
are being finalized for the PR. No production deployment or release has occurred.

## Approved validation on October 12

- Chrome and Firefox-adapter unit suites: 69 suites, 496 passed tests, 2 skipped
  tests, and all 23 unit snapshots passed in each run.
- Linux unit suite: the same 69 suites, 496 passed tests, 2 skipped tests, and
  23 snapshots passed with Node 24.13.0 and pnpm 10.32.1.
- Both extension builds and the production website/demo build pass.
- Lint for all 31 changed source files passes without warnings. The two
  validation test files also pass lint. Repository-wide `pnpm lint` includes
  generated `dist/site` files and existing release-script lint configuration
  errors; that broader tooling issue is outside this performance change.
- Updated two legacy layout fixtures to use real Window models, with an
  identity-preservation assertion during refresh.
- Added native tab/group drag tests with 80 tabs. They scroll the source out of
  view during an active browser drag, assert that the original draggable DOM
  node stays connected and fewer than 45 tab rows remain mounted, and verify
  exact tab order and preserved group membership after the drop. They wait for
  the visible after-tab indicator before releasing the mouse. Both pass.
- The first Linux browser run passed 131 tests, with two screenshot failures,
  one skipped test, and five tests omitted by serial failure handling. Both
  failures reproduce unchanged on released master: a 55-to-52-pixel tooltip
  width and a 306-to-284-pixel tab-menu width. The official Playwright Noble
  container was missing DejaVu Sans and used WenQuanYi as its system-ui font.
  Installing the standard Ubuntu `fonts-dejavu-core` package in the disposable
  container restores the existing baselines. Both affected screenshot tests
  pass without any baseline changes. A complete Linux browser rerun is pending.
- Personal-profile reload/manual acceptance is skipped at the user's request.
  Firefox runtime testing and a long-running leak investigation remain outside
  the verified evidence; Firefox production build and adapter unit coverage
  are confirmed.
