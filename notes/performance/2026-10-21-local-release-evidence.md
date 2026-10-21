# Local 3.0.1 release performance evidence

Capture: `local-release-mac-01-2026-10-21T21-16-19-381Z`.
Collector: `1c0b2ab6c8e9929ea3470529a2712c8dd80b9679`.
Target: `dc1f386c851921f24023037c2a5c0ea0911eb929` (3.0.1).
Previous release and fixed reference:
`c2dea3aacb3c1fb871434bdcbbcf54019b03f602` (manual 3.0.0).

The downloaded published packages matched candidate run `39534365390`, attempt 1,
and candidate SHA-256
`5a1d4b4e6256e6c0d7ebf62b4c22242dd96ae3a461bfbceea8f00336750c0ce6`.
Chrome ZIP: 472,024 bytes; Firefox ZIP: 473,676 bytes. Their exact hashes and
per-file inventories are preserved in the raw bundle record and capture manifest.
The Firefox source archive was verified too. Store packages were not rebuilt.

## Protocol and results

Protocol `release-mac-01-v1`: Apple M5 Pro, 18 logical cores, 64 GiB RAM,
Node 26.5.0, Playwright 1.58.2, bundled headless Chromium 145.0.7632.6.
Seven interleaved samples per source/workload after warmup and three group-drag
and scroll samples per source. Each fixture adds 12 destination tabs. External
requests were blocked. AC power was checked before/after and during sampling.

| Source tabs | 3.0.0 startup median | 3.0.1 startup median | 3.0.0 narrow search | 3.0.1 narrow search | 3.0.0 broad search | 3.0.1 broad search |
| ----------- | -------------------: | -------------------: | ------------------: | ------------------: | -----------------: | -----------------: |
| 100         |              95.3 ms |              96.8 ms |            213.1 ms |            215.6 ms |           214.5 ms |           214.8 ms |
| 1,000       |             151.3 ms |             149.1 ms |            220.0 ms |            220.4 ms |           218.0 ms |           220.9 ms |
| 5,000       |             383.0 ms |             395.4 ms |            299.6 ms |            289.3 ms |           302.3 ms |           313.1 ms |

At 5,000 source tabs the observed startup difference is about +12.4 ms (+3.2%).
The result is advisory: one matched capture does not establish a sustained
regression or a universal browser performance claim. Group-drag React rendering
medians were 6.7 ms and 6.9 ms, with 36 peak mounted rows for both sources.
Both had zero detached model DOM references after scrolling. Post-drag GC heap
was 27,654,680 and 27,832,216 bytes, respectively.

Chrome and Firefox ZIP sizes increased about 3.0% versus the existing archived
3.0.0 bundle measurement. That bundle baseline is preserved historical evidence;
the runtime baseline above was freshly measured alongside the target.

These are production React profiling builds with simulated browser metadata.
They do not measure native Safari/Firefox performance, browser IPC, cold browser
launch, renderer RSS or website loading. This is a new comparison series because
its pinned browser/protocol/harness differ from historical captures.
Before/after one-minute system load was about 7.55/7.96; available free memory
reported by macOS was about 3.14 GB/0.22 GB. These conditions are recorded rather
than presented as proof that the whole Mac was idle or free of memory pressure.

## Setup and validation

The first attempt stopped before timing collection because the pinned Playwright
headless shell was missing. Its partial output remains local and was not imported.
Browser installation stalled extracting under Node 26; installing the same pinned
browser with Node 24 succeeded. The actual collector still ran with Node 26.5.0.
No incomplete timing attempt was substituted for this complete capture.

The capture importer validated raw bytes, complete sample counts, common runtime
compatibility key, hardware/tool protocol, exact frozen package identity and clean
source before import. Original run JSON and capture bytes are immutable; formatting
excludes these directories. The 19 historical records remain unchanged.

The live Actions artifact download that previously returned HTTP 415 now returned
a valid 1,561,873-byte ZIP with the corrected Accept header. This read-only check
did not run the release publisher.

## Remaining publication step

After the tooling/data PR is approved and merged, append evidence with the original
run/digest and `--stores none`, then import the resulting combined report through
a normal data PR. The trusted-master evidence publisher cannot use this branch
until merge. Do not rebuild packages, recreate tags or resubmit stores to recover
the report. Existing production/store review state is independent of these metrics.
