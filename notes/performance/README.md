# Release reports

The **Release reports** footer entry opens `/reports/`. Release history is the
main view; there is no top-navigation link. Bundle size, startup, search, drag,
and heap charts are interactive. Hover/tap to inspect, use arrow keys to browse,
and Enter to select. Filter the history range, browser, workload and protocol,
or select a target and baseline. Shared URLs pin measurement/evidence captures.

## Storage and loading

- `notes/performance/runs/`: immutable full measurement records, including all
  19 original records covering v2.6.0 onward, the manual 3.0.0 baseline, and the
  collected master snapshot. Preserve original bytes and provenance.
- `notes/release-reports/history.json`: byte lengths and SHA-256 receipts for
  the 19 frozen historical records; every website build rejects changes.
- `notes/release-reports/catalog.json`: reviewed published-release inventory
  and the list of evidence captures. An inventory release can lack metrics.
- `notes/release-reports/reports/`: immutable compact evidence captures, typed
  checks/counts, metric IDs/hashes, and links to durable GitHub release assets.
- `notes/performance/captures/`: reviewed local capture manifests tying complete
  paired measurements to frozen release packages and the benchmark protocol.
- `notes/performance/protocol.json`: designated machine, toolchain and sample
  configuration. A changed environment is a distinct comparison series.
- GitHub app releases: packages, large raw archives, publisher receipts and
  store submission journals. No companion tags or report-only releases.

Git is the website's source of truth. `pnpm build:site` validates these committed
files, embeds summaries, and copies full record downloads into `dist/site/reports`.
Local, PR-preview and production builds take the same offline data path. Neither
website builds nor report browsing fetch GitHub releases or need GitHub/Vercel
credentials. Explicit evidence links open GitHub when selected. The output
`/reports/snapshot.json` and its displayed SHA-256 identify the deployed catalog;
check out its deployment's Git commit to reproduce the build.

## View and update

```sh
pnpm reports:validate
pnpm build:site
pnpm preview:release-media
# Open http://127.0.0.1:8777/reports/
```

After a release or a later evidence capture, import deliberately on the local
machine using an existing `gh` login:

```sh
pnpm release:reports --tag v3.0.1
pnpm reports:validate
pnpm build:site
```

Review and commit/push the resulting JSON through ordinary repository rules.
Vercel's existing Git integration updates the page. Report-only imports do not
start another release or benchmark. See `.github/release-automation.md` for the
candidate/approval/publication commands and how to append late measurements.

The importer checks release/tag identity, archived trusted publisher receipts,
checksums, schemas, and immutable IDs. It never overwrites an old capture or
remeasures historical releases. GitHub release assets alone do not update the
website: the reviewed JSON import commit does.

## Evidence and comparability

Failed, cancelled, skipped, pending and missing checks remain explicit.
Structured Jest/Playwright results supply counts; retries count once, flaky
outcomes remain separate, and environments are never added into a misleading
total. Status-only checks show **Counts not archived**. Safari compilation is
build evidence, not Safari browser testing. Historical verification remains
**Not archived** where original evidence was not preserved.

Benchmarks are advisory and run locally on the designated Mac. CI verifies
application correctness and validates/archives reviewed local results. A late
capture is appended; a missing measurement is not zero. Captures retain browser,
fixture, harness and toolchain identities, raw samples, runner and timestamps.
Different compatibility keys are not silently connected into a timing series.
The profiling fixture measures production React behavior with simulated browser
metadata, not native IPC, renderer RSS, cold browser launch, or website loading.

## Manual measurements and offline viewer

For release evidence, use the standard local command from a clean committed
worktree on the Mac described by `protocol.json`, connected to AC power:

```sh
# One-time browser setup (using a supported installer Node version):
pnpm --filter integration-test exec playwright install chromium --only-shell
# Measurements themselves must use the Node version pinned in protocol.json:
pnpm release:performance --run CANDIDATE_RUN_ID --import
# Or recover an existing release instead of its expiring Actions artifact:
pnpm release:performance --tag v3.0.1 --import
```

This downloads and verifies exact packages, measures ZIP contents locally, and
reruns target/baseline/reference UI workloads in the same session. The standard
command first fetches existing published tags from the canonical repository so
a stale checkout cannot silently choose an older release baseline. It does not
publish tags or overwrite conflicting local tags. The standard
protocol uses 100, 1,000 and 5,000 source tabs (plus 12 destination tabs), seven
samples per workload after warmup, and three group-drag/scroll samples. Raw
samples, machine/tool versions, source/package/harness hashes and before/after
conditions stay in the immutable records. A machine-wide lock prevents concurrent
standard captures. Keep other heavy work off the benchmark Mac while it runs.
The raw run and capture directories are excluded from formatting so commit hooks
cannot invalidate their original checksums.

Review the generated `review.md` and `viewer/` before committing imported JSON.
The release publisher only archives matching captures after their PR is merged.
To validate/import an already completed capture without measuring again:

```sh
pnpm release:performance --input /absolute/path/to/capture.json --import
```

Data review and import do not publish an app release or resubmit a store. Follow
`.github/release-automation.md` to append evidence to an existing release and
import its combined report. Historical captures and their provenance stay intact.

The lower-level commands below remain available for local investigations. Their
results do not become standard release evidence without a valid local capture.

These commands deliberately perform builds and benchmarks, not a test suite:

```sh
pnpm build
pnpm zip
pnpm performance:collect --id local-package-capture
pnpm performance:compare --head master --base auto --reference c2dea3aacb3c1fb871434bdcbbcf54019b03f602 --output .tmp/performance-results
pnpm performance:preview --input .tmp/performance-results/runs
```

`pnpm performance:preview` serves the archived metric viewer on port 8780;
`pnpm performance:build` writes `dist/performance/index.html`.
`performance:archive --input PATH` remains available for explicitly reviewed
local metric imports. Do not rerun historical backfills just to migrate storage.
