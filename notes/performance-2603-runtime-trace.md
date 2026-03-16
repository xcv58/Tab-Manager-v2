# Issue 2603 Runtime Trace Notes

Runtime profiling notes recorded on 2026-03-15 for [issue #2603](https://github.com/xcv58/Tab-Manager-v2/issues/2603).

This note supplements `notes/performance-2603-code-analysis.md` with browser-driven measurements.

## Scope

- Use the existing Chromium Playwright integration setup where possible.
- Use the separate Firefox Selenium addon harness for Firefox reproduction.
- Focus on high-signal actions:
  - popup open or reload
  - grouped workspace rendering
  - search response
  - grouped drag across windows

## Synthetic Workload

Primary workload used for the repeatable traces:

- 4 windows
- 50 tabs per window
- groups of 10 tabs
- total synthetic tabs: 200
- total synthetic groups: 20

We also did an earlier Chromium scaling pass at:

- 2 x 50 tabs
- 4 x 50 tabs
- 4 x 100 tabs

## Harness Notes

### Chromium

- Stable extension discovery came from the existing integration helper pattern:
  - open `chrome://inspect/#service-workers`
  - read the extension URL from the service worker listing
- Direct Playwright `serviceworker` waiting was flaky in local retries.
- Popup input selectors also drifted from earlier assumptions. The reliable local selector was:
  - `input[type="text"][placeholder*="Search"]`

### Firefox

- Firefox addon loading works through the separate Selenium harness and `build_firefox.zip`.
- The same generic search selector was needed there too.

## Trace Results

### 1. Chromium grouped-workspace render stabilizes quickly after popup reload

Medium grouped workload:

- browser: Chromium
- workload: 4 windows x 50 tabs, groups of 10
- measured state after reload:
  - `windows = 1`
  - `tabRows = 201`
  - `groupHeaders = 20`
- ready time for that stable state:
  - `53ms` in the cleanest local retry

Interpretation:

- On this machine, popup reload itself is not the dominant cost for a 200-tab grouped workspace.
- The synthetic probe flattened to one visible window card, so window-card count is not a reliable cross-browser metric here.
- Group and row counts are more trustworthy than window-card count in this setup.

### 2. Earlier Chromium coarse sampling showed the grouped DOM was already stable by the first 3s sample

Observed cases:

- 100 synthetic tabs -> `102` visible tab rows and `10` group headers
- 200 synthetic tabs -> `202` visible tab rows and `20` group headers
- 400 synthetic tabs -> `402` visible tab rows and `40` group headers

Interpretation:

- The popup was fully populated by the first 3s sample even at 400 grouped tabs.
- This is not a fine-grained profile, but it does suggest the regression is not simply "initial grouped rows never finish rendering" on this hardware.

### 3. Chromium grouped drag has measurable main-thread cost

Earlier Chromium drag probe on a grouped workload:

- attempted action:
  - drag a group header to a different window drop zone
- elapsed wall time:
  - `361.2ms`
- performance deltas:
  - `TaskDuration = 0.362`
  - `ScriptDuration = 0.059`
  - `LayoutDuration = 0`
  - `RecalcStyleDuration = 0.001`
  - `LayoutCount = 1`
  - `RecalcStyleCount = 2`
- long-task delta:
  - `count = 1`
  - `totalDuration = 60ms`
  - `maxDuration = 60ms`

Important caveat:

- This probe did not prove a successful cross-window move.
- The post-drop grouped-tab state still pointed at the source window in that run.
- So this is best treated as a "drag handler cost" signal, not a correctness-verified move benchmark yet.

### 4. Firefox grouped-workspace render also stabilizes quickly in the same synthetic shape

Latest Firefox run:

- browser: Firefox
- workload: 4 windows x 50 tabs, groups of 10
- measured state:
  - `windows = 1`
  - `tabRows = 202`
  - `groupHeaders = 20`
- ready time for that stable state:
  - `2ms`

Interpretation:

- As with Chromium, the popup DOM is present quickly once the extension page is loaded and refreshed.
- Firefox also flattened this synthetic setup to one visible window card in the popup, so window-card count is not a reliable browser-comparison metric here either.

### 5. The current synthetic search dataset is not a reliable benchmark

Across the final Chromium and Firefox retries:

- the search input accepted the typed value
- the visible grouped rows did not narrow
- group header counts stayed at `20`
- tab row counts stayed near `201` or `202`

Most likely explanation:

- the current synthetic URLs relied on URL fragments such as `about:blank#needle-target-...`
- this app does not appear to use that fragment shape as a searchable field in these runs

Implication:

- Do not use the current hash-fragment workload to measure search performance.
- Replace it with path-based URLs or deterministic tab titles before treating search timings as meaningful.

### 6. Firefox synthetic group drag is not yet a reliable benchmark

Latest Firefox drag probe:

- `dragTriggered = false`
- no successful post-drop move was observed

Interpretation:

- The Selenium JS-dispatched drag used here is not yet sufficient for validating grouped cross-window drag in Firefox.
- We can still use Firefox for popup-open and grouped-render reproduction, but not for drag performance claims yet.

## What The Runtime Data Says

### Stronger signals

- Popup reload and grouped DOM population are fast on this machine for a 200-tab grouped workload.
- Chromium drag handling still produces measurable main-thread work and a 60ms long task during an attempted grouped drag.
- The grouped-tab performance issue is more likely tied to interaction fan-out, larger real-world workspaces, browser-specific layout behavior, or repeated UI invalidation than to simple initial grouped-row creation alone.

### Weaker signals

- Search timing from the current synthetic workload is not trustworthy.
- Cross-window grouped drag correctness is not yet proven by the synthetic automation in either browser.
- Window-card counts are not comparable across the current Chromium and Firefox probes.

## Recommended Plan

### Phase 1. Fix the benchmark shape before using it to rank search work

- Replace hash-fragment synthetic URLs with path-based URLs or deterministic titles that the popup search definitely indexes.
- Keep using `tab-row-*`, `tab-group-header-*`, and `window-card-*` selectors rather than broad `tab-*` selectors.
- Add an explicit success assertion for grouped cross-window drag before using drag timing as a correctness benchmark.

### Phase 2. Prioritize the highest-likelihood performance wins from the code analysis

- Reduce hover and focus invalidation fan-out first.
- Trim per-row drag/drop and ref-registration work in hot row components.
- Audit and limit `scrollIntoView` behavior during focus movement.
- Reduce whole-workspace recomputation in duplicate detection, search derivation, and layout repacking.

Why this order:

- The runtime traces do not point to initial grouped render as the primary local bottleneck.
- The code analysis still points strongly to broad reactive invalidation and large interactive row trees as the more probable cost centers.

### Phase 3. Re-measure with hardened scenarios

- Chromium:
  - popup open or reload on medium and large grouped workloads
  - grouped drag with verified successful move
  - search with a benchmark dataset that definitely matches
- Firefox:
  - popup open or reload reproduction on the same workload
  - search only after the benchmark dataset is corrected

## Practical Next Step

The next highest-signal task is not a product code change yet. It is a benchmark hardening pass:

- build one deterministic search dataset that definitely matches
- build one deterministic grouped cross-window drag case that verifies the move succeeded

After that, the first code changes should target hover or focus fan-out and repeated per-row wiring work, because those remain the most plausible causes of whole-popup sluggishness on large real workspaces.

## Follow-up After Benchmark Hardening

Later on 2026-03-15, the Chromium benchmark harness was hardened and rerun after the hover or focus fan-out changes and the scroll-origin changes landed.

### Chromium benchmark results we now trust

- popup open, medium grouped workload:
  - `tabRows = 201`
  - `groupHeaders = 20`
  - stable in local reruns between `3ms` and `36ms`
- popup open, large grouped workload:
  - `tabRows = 401`
  - `groupHeaders = 40`
  - stable in local reruns between `5ms` and `39ms`
- exact grouped search on the medium workload:
  - deterministic query: `needle-target`
  - `tabRows = 8`
  - `groupHeaders = 8`
  - local reruns around `359ms` to `395ms`
- keyboard focus movement:
  - the hardened benchmark verified that `50` keyboard moves scroll the list as needed
  - the paired mouse-click check passed once the benchmark stopped relying on Playwright locator auto-scroll and clicked a fully visible row by viewport coordinates instead

### What changed in the benchmark

- Search now uses a local fixture server with deterministic path-based URLs and titles.
- The benchmark disables `showUrl`, `searchHistory`, `preserveSearch`, and `showUnmatchedTab` so the search scenario measures exact row narrowing rather than fuzzy URL or history behavior.
- Large grouped setup now retries transient `No tab with id` failures while Chrome is still settling tabs into groups.

### Remaining benchmark gap

- The grouped cross-window drag benchmark is still not reliable enough to treat as a correctness-verified performance measurement.
- The original local-fixture grouped workload collapsed into one effective browser window for drag purposes, so it could not expose a second drop target.
- A dedicated smaller `data:`-URL drag workload does expose multiple window cards and a visible target drop zone, but the drag action still does not complete a verified cross-window move under the current Chromium automation path.

### Updated interpretation

- Popup open and grouped render remain fast locally even on the larger grouped workload.
- Exact search is now benchmarked meaningfully and lands in the mid-hundreds of milliseconds on the medium grouped workload.
- The implemented focus-origin policy is testable and holds for keyboard reveal vs mouse click behavior in Chromium.
- The next benchmark hardening task is now much narrower:
  - make grouped cross-window drag complete reliably under automation
  - then use that scenario for timing
