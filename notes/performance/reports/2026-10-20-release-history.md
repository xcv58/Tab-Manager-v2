# Release history backfill since v2.6.0

This report covers every published stable release from v2.6.0 through v2.7.2, the manual 3.0.0 store source, and the already archived master snapshot. Original package measurements and newly captured historical-source timings are separate evidence.

Runtime capture: 2026-10-20T16:26:21.438Z. Chrome 155.0.8059.85, darwin/arm64, Node v26.5.0, viewport 2320×989, headless. Hardware: Apple M5 Pro; 18 logical cores; 68719476736 bytes RAM.

## Package sizes

The fourteen original 2.x ZIPs were downloaded from GitHub Releases and verified against GitHub asset digests, published SHA256SUMS, ZIP CRCs, and manifest/source versions. File inventories and hashes are in the archived records. The withdrawn 3.0.0 GitHub release has no remaining assets; its package sizes remain the previously measured source rebuild. The master snapshot is also a source rebuild.

| Version                    | Source commit                                                                                       | Chrome ZIP bytes | Firefox ZIP bytes | Chrome startup JS bytes | Package evidence                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------- | ---------------: | ----------------: | ----------------------: | --------------------------------------------------------------------------- |
| 2.6.0                      | [060bf9f4](https://github.com/xcv58/Tab-Manager-v2/commit/060bf9f4ed7bcf47d5f34cf7de69d993cdac5698) |           269469 |            270268 |                  879489 | [Original published ZIPs](../runs/published-history-2026-10-20-v2.6.0.json) |
| 2.6.1                      | [7f2cd7a1](https://github.com/xcv58/Tab-Manager-v2/commit/7f2cd7a1651f8e09213eb3c0b27a3ed6ecf6c2a8) |           269761 |            270607 |                  880592 | [Original published ZIPs](../runs/published-history-2026-10-20-v2.6.1.json) |
| 2.6.2                      | [efbbd7ff](https://github.com/xcv58/Tab-Manager-v2/commit/efbbd7ff33a24a44086835bb83622d445571873e) |           270767 |            271616 |                  882349 | [Original published ZIPs](../runs/published-history-2026-10-20-v2.6.2.json) |
| 2.6.3                      | [81f86f8e](https://github.com/xcv58/Tab-Manager-v2/commit/81f86f8e2e610e33c712a0f0ad2daae164f1f7e5) |           271065 |            271907 |                  883520 | [Original published ZIPs](../runs/published-history-2026-10-20-v2.6.3.json) |
| 2.7.0                      | [486f9687](https://github.com/xcv58/Tab-Manager-v2/commit/486f96876e36e844b0ebe5acdf260e103c4f8c7b) |           277186 |            278013 |                  903529 | [Original published ZIPs](../runs/published-history-2026-10-20-v2.7.0.json) |
| 2.7.1                      | [90aa8ca4](https://github.com/xcv58/Tab-Manager-v2/commit/90aa8ca4ce6237f453237b0a9e5aadcb25ce41dd) |           278453 |            279249 |                  906893 | [Original published ZIPs](../runs/published-history-2026-10-20-v2.7.1.json) |
| 2.7.2                      | [3cd88a06](https://github.com/xcv58/Tab-Manager-v2/commit/3cd88a06e2936a5764a96e0d353b3ed08a78aeaf) |           278519 |            279351 |                  906779 | [Original published ZIPs](../runs/published-history-2026-10-20-v2.7.2.json) |
| 3.0.0                      | [c2dea3aa](https://github.com/xcv58/Tab-Manager-v2/commit/c2dea3aacb3c1fb871434bdcbbcf54019b03f602) |           458249 |            459975 |                  627789 | [Source rebuild](../runs/2026-10-20-macos-c2dea3aa.json)                    |
| 3.0.0 candidate @ 3e7a511d | [3e7a511d](https://github.com/xcv58/Tab-Manager-v2/commit/3e7a511dd7197169d4288ac158c390ec9ee02e45) |           468421 |            470094 |                  638637 | [Source rebuild](../runs/2026-10-20-macos-3e7a511d.json)                    |

## Present-day runtime measurements of frozen releases

These are measurements captured on the date above, not timings observed on the historical release dates. The series is separate from the original three-version audit. Local workstation load is not controlled like dedicated benchmark hardware; observed ranges and raw samples remain available, and timing changes are advisory.

| Version                    | Startup, 5,012 tabs ms | Narrow search ms | Broad search ms | Group drag rendering ms | Post-drag JS heap MB | Peak mounted rows | Raw observations                                                 |
| -------------------------- | ---------------------: | ---------------: | --------------: | ----------------------: | -------------------: | ----------------: | ---------------------------------------------------------------- |
| 2.6.0                      |                  743.3 |            538.6 |           522.8 |                   119.6 |                 46.6 |              1012 | [JSON](../runs/release-runtime-history-2026-10-20-060bf9f4.json) |
| 2.6.1                      |                  823.5 |            587.5 |           540.7 |                   126.7 |                 46.6 |              1012 | [JSON](../runs/release-runtime-history-2026-10-20-7f2cd7a1.json) |
| 2.6.2                      |                  670.6 |            481.6 |           540.7 |                   126.2 |                 46.6 |              1012 | [JSON](../runs/release-runtime-history-2026-10-20-efbbd7ff.json) |
| 2.6.3                      |                  744.1 |            471.7 |           521.3 |                   135.7 |                 46.6 |              1012 | [JSON](../runs/release-runtime-history-2026-10-20-81f86f8e.json) |
| 2.7.0                      |                  682.2 |            481.3 |           529.8 |                   270.3 |                 46.9 |              1012 | [JSON](../runs/release-runtime-history-2026-10-20-486f9687.json) |
| 2.7.1                      |                  800.1 |            684.2 |           550.1 |                   220.7 |                 46.8 |              1012 | [JSON](../runs/release-runtime-history-2026-10-20-90aa8ca4.json) |
| 2.7.2                      |                  701.7 |            488.0 |           492.2 |                   250.3 |                 46.8 |              1012 | [JSON](../runs/release-runtime-history-2026-10-20-3cd88a06.json) |
| 3.0.0                      |                  780.5 |            347.8 |           393.9 |                     7.7 |                 27.8 |                36 | [JSON](../runs/release-runtime-history-2026-10-20-c2dea3aa.json) |
| 3.0.0 candidate @ 3e7a511d |                  743.8 |            354.8 |           394.9 |                    23.9 |                 27.8 |                36 | [JSON](../runs/release-runtime-history-2026-10-20-3e7a511d.json) |

## Capture protocol and verification

- Each frozen source export used its own locked dependencies and original UI/stores. A common simulated browser adapter and fixture generator supplied identical tab metadata, including versions before the website demo existed. No release UI or store implementation was substituted.
- All nine profiling builds finished before timing began. The same browser process, viewport, cache policy, external-request blocking, and profiling harness were used throughout. Per-case warmups preceded seven measured samples at 112, 1,012, and 5,012 total tabs. Revision order alternated forward and reverse.
- Each version also completed three eight-viewport scroll/GC workloads and three native mouse group drags of the 1,000-tab group, preserving 1,012 tabs and ending in one window. Drag rendering, peak rows, post-GC heap, and model DOM references are retained in the records.
- The manual 3.0.0 source was the fixed reference. Future release captures measure that same reference alongside the candidate and its preceding release, deduplicating identical source commits.
- Concrete fixture fingerprints matched across all nine versions. Capture records identify the browser, hardware, frozen lockfiles, profile output files, and every harness source hash. The recorded harness hashes were checked against the committed source prepared for this PR.
- All 189 measured startup/search observations and 27 drag/scroll observations completed with no profiling-page errors. Reduced smoke captures remain outside the archive.
- Search timings include debounce. Heap uses Chromium GC measurements; native browser IPC, website loading, cold browser launch, and renderer RSS are not measured. Whiskers are observed minima/maxima rather than confidence intervals.

Runtime compatibility key: `b98e9e1b0f08c47bb28584fd35c46ba24d219b6aa79ac3404af0624e4692ea88`.

Use the website Performance link or `pnpm performance:preview` for the full release history, range filters, selectable points, per-release table, and two-version comparisons. See [the usage guide](../README.md).
