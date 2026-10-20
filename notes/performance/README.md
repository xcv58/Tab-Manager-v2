# Release reports

The website's **Release reports** footer link opens `/reports/`. It is not a
primary navigation item. The default view is the release history: interactive
bundle/startup/search/drag/heap charts, history ranges, and version comparison.
Hover, tap, or focus a chart to inspect a point; arrow keys browse and Enter
selects it. Measurement captures and test/build evidence have their own selectors.
Shared URLs pin the selected capture IDs as well as versions, protocol, and workload.

## Sources of truth

- `notes/performance/runs/` is the frozen historical seed: 19 original records,
  eight releases from v2.6.0 through the manual 3.0.0 baseline, plus the collected
  master snapshot. Keep their bytes, record IDs, hashes, timestamps, and raw
  samples unchanged. No historical remeasurement or CI attestation is implied.
- New reports are uniquely named **assets on the existing app release**. There
  are no companion release tags, routine report commits, or archive PRs.
- A `release-report-RUN-ATTEMPT.manifest.json` file commits each capture. It is
  published last, after its inventory of metric JSON, typed checks JSON, and
  durable diagnostic evidence has been validated and uploaded. Each file has
  a byte length and SHA-256. Never overwrite a previous capture.
- The GitHub app-release inventory is independent of metric/report assets. An
  app release with no report still appears with unavailable measurements and
  **Not archived** verification. Seed-only manual 3.0.0 is retained even though
  it has no matching GitHub release.

The manifest records the subject release SHA separately from the publisher SHA,
workflow run and attempt. The loader verifies the publisher against the archived receipt from a trusted
`master` workflow and the subject against the release tag. The manifest must
have been uploaded by the workflow bot; loading does not depend on Actions
retaining the original run. Checksums detect
inconsistent assets; they are not a cryptographic attestation. Repository owners
can still modify release assets; back up important published snapshots separately.

## Static loading and offline use

The browser receives embedded summaries and static record/snapshot downloads from
the website. It never requests GitHub to load or compare report data. Explicit
source, manifest, workflow, and diagnostic links open GitHub only when selected.

`pnpm build:site` merges the frozen seed with a validated catalog at **build time**:

- Local default: seed only, with no network dependency.
- Automatic Vercel PR preview: fetch current app releases and report assets during
  the build; any download/schema/hash/provenance failure fails the build.
- Production: the coordinated workflow fetches a complete catalog with its
  read-only GitHub token, then builds with `REPORTS_SNAPSHOT` pointing to that
  pinned file. There is no second download during the build.
- Reproduce a published site: download `/reports/snapshot.json`, then run
  `REPORTS_SNAPSHOT=/absolute/path/snapshot.json pnpm build:site`.

To fetch a fresh snapshot locally (optional `GH_TOKEN` for API rate limits):

```shell
mkdir -p .tmp/reports
node scripts/reports/catalog.mjs .tmp/reports/snapshot.json
REPORTS_SNAPSHOT="$PWD/.tmp/reports/snapshot.json" pnpm build:site
```

Serve `dist/site/` with the existing site preview command or a static server and
open `/reports/`. The full catalog has a SHA-256 displayed under **Measurement
captures**. Store that JSON with a deployment backup to preserve the exact view.
The loader retains all historical seed records and rejects conflicting record IDs.
A failed build does not replace the currently published production site.

For a metrics-only offline viewer using the same charts:

```shell
pnpm performance:preview
pnpm performance:build
```

The preview opens at `http://127.0.0.1:8780/`; the generated offline viewer is
`dist/performance/index.html`. `performance:preview --input PATH` can include
additional downloaded **metric records**, not report manifests or checks files.

## Verification evidence

Diagnostic ZIPs larger than 100 MB are explicitly listed as unavailable in the
manifest; check outcomes remain archived even if a trace is too large.

The report archives exact-revision, latest-attempt Node and Safari workflow
outcomes, including failed/cancelled/skipped checks, and the release gate and
advisory benchmark job outcomes. An unfinished workflow is pending; a missing
exact-revision run is missing. It never selects an older passing run to hide a
newer failure. Diagnostic metadata and available structured-result/browser
artifacts are attached to the app release rather than relying on Actions' short
retention window.

Unit tests and Playwright produce structured JSON. Firefox already produces
Jest JSON. Counts are shown only from those files; retries are counted once using
the final Playwright outcome, with flaky tests separate. Different Node matrix
environments are separate rows, never a fabricated grand total. Status-only
checks have **Counts not archived**. Safari compilation/resource checks are
**build** evidence and lint is separate; neither implies a Safari browser test.
Historical releases show **Not archived** for tests/builds unless actual evidence
for their exact revision is subsequently archived.

Advisory benchmark failure does not block store submissions. A report containing
only checks and failed/missing benchmark outcomes is valid. Partial runtime
measurements are never inserted as successful numeric chart data. The existing
3.0.0 release policy and original extension ZIP checksums remain separate.

## Release and publication flow

`Release Please` still creates the app release and builds/packages the extension.
Store submissions depend on the required release gate/package build, not on the
advisory benchmark. Bundle measurement is a separate advisory job so it cannot hold up a store
submission. After bundle collection and advisory runtime finish, the
trusted **Publish release report** job captures CI evidence and uploads a manifest
last, even when a required build or advisory benchmark failed.

One **Publish website** job runs at the end, after report publication and the
store summary. Ordinary `master` changes without an app release use that same
website job. Automatic production Git deployments are disabled only for `master`
in `vercel.json` to avoid an early stale build followed by a second publication;
automatic PR previews stay enabled. Production publication builds once using the
pinned catalog and deploys that prebuilt output. This PR does not itself deploy
the production website.

**Required setup before merging:** configure a Vercel deployment token in the
GitHub `website-production` environment as `VERCEL_TOKEN`, scoped to the existing
`tab-manager-v2` project/team. Set any desired environment protection/approvers.
The workflow fails explicitly if the token is missing. Do not merge the production
coordination change until this is configured, because automatic `master` deploys
will then be disabled. Project/team IDs are already pinned in the workflow. Enter
the secret directly in GitHub; do not put tokens in source or issue/PR comments.
Vercel PR builds may optionally have a read-only `GH_TOKEN` to avoid public API
rate limits; it must never be embedded into generated site files.

To refresh after a later evidence capture/backfill, dispatch **Refresh release
reports** on `master`. Leave the release tag empty for a website-only refresh;
provide an existing app release tag to append its latest available CI evidence
before rebuilding. This never reruns old benchmarks or changes earlier reports.
To capture fresh runtime measurements first, dispatch **Advisory Performance
History** with the desired frozen release ref, then use its run ID in the refresh
workflow. Preserve the downloaded metric records and original diagnostic evidence.
A refresh must target an existing app release, not invent a release for manual 3.0.

## Collecting measurements manually

These commands perform benchmarks/builds rather than a unit/integration test
suite; run them deliberately. Frozen sources, fixture/browser/harness hashes,
runner, raw samples and capture dates remain in the records. Runtime values from
different compatibility keys are never silently connected as one chart series.

```shell
pnpm build
pnpm zip
pnpm performance:collect --id local-package-capture
pnpm performance:compare --head master --base auto --reference c2dea3aacb3c1fb871434bdcbbcf54019b03f602 --output .tmp/performance-results
pnpm performance:preview --input .tmp/performance-results/runs
```

The pre-existing historical JSON files are sufficient for the migration; do not
run the backfill scripts again just to move storage. The manual
`performance:archive` command remains available for explicitly reviewed local
imports. CI no longer opens automatic data-only archive PRs.
