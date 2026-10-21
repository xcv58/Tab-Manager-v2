# Local release coordination

A maintainer or local AI driver prepares a release. CI verifies a frozen
candidate and publishes only after the maintainer approves its package identity.
There is no mandatory bot release PR. Ordinary PR review and branch protection
still apply to source, version changes, and report commits.

## Responsibilities

| Location                      | Responsibility                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local                         | Version/changelog preparation, reviewing packages and preview, approving publication, pushing its tag through existing Git authentication, importing report JSON |
| CI: Prepare release candidate | Build frozen packages, run required checks, capture advisory measurements on separate runners                                                                    |
| CI: Publish reviewed release  | Verify approval and gates, publish GitHub assets, submit stores independently, archive receipts/evidence                                                         |
| Git                           | Source of truth for website report JSON, history, and release inventory                                                                                          |
| GitHub releases               | Durable packages, raw evidence, checksummed capture manifests, and store receipts                                                                                |
| Vercel                        | Existing Git integration builds the website from committed data                                                                                                  |

## Prepare and verify

```sh
pnpm release:releasability
pnpm release:prepare --version 3.0.1 --notes /absolute/path/release-notes.md
```

The preparation command updates the extension and Safari/native marketing
versions and prepends the reviewed changelog entry. It requires a clean tracked
working tree and a version newer than both the current version and 3.0.0. It
never commits, pushes, tags, or submits anything. Review and merge these source
changes through the normal repository process. The withdrawn manual 3.0.0 tag
must not be recreated; its source remains the historical comparison baseline.

After merging, freeze the reviewed current master commit:

```sh
pnpm release:verify --sha FULL_MASTER_COMMIT
# Optional: --no-benchmarks skips advisory runtime collection.
gh run list --workflow release-candidate.yml
pnpm release:review --run CANDIDATE_RUN_ID
```

The workflow is dispatched on master. Its preflight rejects arbitrary refs and
requires the expected candidate SHA to equal the master revision captured at
dispatch. All executable checkouts use that trusted `github.sha`, never an
arbitrary dispatch-input ref. If master moves before dispatch, preparation fails
early instead of building a different source. Existing frozen runs remain
reusable after master advances. It builds Chrome and
Firefox once and saves ZIP hashes plus the Firefox source archive in
`candidate.json`. Chrome/Firefox browser checks expand and exercise those exact
ZIPs. Unit checks and unsigned Safari Debug/Release compilation are also
required. Safari compilation is build evidence, not Safari browser acceptance.

Runtime benchmarks and packaged-size collection use separate runners and are
advisory. Required checks may finish while a benchmark is still running. The
local review prints every job outcome, the source SHA, the candidate manifest
SHA-256, and the directory containing downloaded packages. It also assembles an unpublished
local report from actual CI outcomes and whatever complete measurements are
available, using the shared interactive viewer. The command prints a local
preview command and URL. Missing benchmarks are explicit; rerun `release:review`
after measurements finish to refresh the preview without rebuilding the candidate.
This writes only ignored local output; it does not change the committed catalog.
Review source, packages and this preview before approving publication.

Reuse a previously prepared candidate by reviewing the same run; there is no
need to dispatch it again. Source, dependency, version, or build-config changes
require a new frozen candidate. Release-body text and report presentation edits
do not.

To retry failed candidate verification, choose **Re-run all jobs** in GitHub
Actions, or run:

```sh
gh run rerun CANDIDATE_RUN_ID
# After the required checks pass:
pnpm release:review --run CANDIDATE_RUN_ID
```

A full rerun keeps the original source revision and rebuilds the packages and
checks together in a new attempt. **Re-run failed jobs** and individual-job
reruns are unsupported: they can leave successful prerequisites in an earlier
attempt, so the new attempt may lack matching packages or required checks.
Packages, manifest, and required checks must all belong to the same attempt.
Review the new manifest and use its new digest for `--approve`; the previous
approval cannot be reused.

If packaging is still running, wait for it to finish before reviewing. Candidate
artifacts expire after 30 days; if the workflow can no longer be rerun, prepare a
new candidate.

## Approve and publish

```sh
pnpm release:publish --run CANDIDATE_RUN_ID --approve REVIEWED_CANDIDATE_SHA256
# Optional: --notes /absolute/path/github-release-body.md
```

`--approve` must match the digest saved by `release:review`. This command is the
publication approval, including its version tag push; there is no repeated
approval prompt during preparation.
The trusted default-branch publisher rechecks the exact run/attempt, manifest,
package hashes, packaged versions, required job outcomes, and master ancestry.
Before dispatch, the local command rechecks the approved manifest, exact package
hashes and required CI gates (or durable publication receipts for an existing
release), checks source ancestry/version, and pushes the final version tag through
the repository's existing Git/SSH authentication. It reuses a matching tag and
rejects a conflicting one; tags are never force-pushed or automatically deleted.
It validates the fetch URL and every resolved push URL, requiring one push
destination in the release repository. Checks and publication use that validated
remote. Automatic tag following is disabled so only the explicitly approved
version tag is published.
No additional token or approval step is needed. If dispatch fails after the push,
rerun the same approved command to reuse the tag.

CI requires that existing tag to identify the reviewed commit, rechecking it
before publishing. This lets a frozen candidate remain publishable after master
advances with workflow edits. It refuses an older stable version. It creates a
draft,
uploads verified files without overwriting, and publishes the GitHub release
before store submission. An interrupted draft can resume from the same reviewed
candidate. The release tag identifies the tested application commit.

Wait for the current GitHub publication job to finish before starting another
publication. CI also queues that job behind a repository-wide lock, covering
the release inventory, version guard, uploads and publication so an older
version cannot finish last and become Latest. Preparation and verification can
overlap; store jobs retain their independent product-wide locks.

If GitHub leaves an empty `starter` asset after an upload failure, retrying
rechecks its state and removes it only when it is still empty and owned by the
trusted publisher. Completed assets remain immutable. Each invocation makes
one cleanup/upload attempt; another failure stops with an error. The same
recovery applies before reading an incomplete publication receipt.

Chrome, Firefox, and Edge jobs run independently using the saved packages. Each
store has one product-wide concurrency lock across all release tags. Up to 100
waiting jobs queue without replacing earlier pending jobs; active submissions
are never automatically cancelled. Queue order follows when jobs begin waiting,
so it does not guarantee version order. Store credentials remain in the existing `chrome-web-store`, `firefox-amo`, and
`edge-addons` GitHub environments. This flow needs no local store credentials,
Release Please token, Vercel token, deployment hook, or custom website deploy job.
The manual workflows become available after their definitions reach master.

## Resume and reconcile

```sh
# Retry only Edge; successful Chrome/Firefox submissions are untouched.
pnpm release:publish --run CANDIDATE_RUN_ID --approve REVIEWED_CANDIDATE_SHA256 --stores edge
```

The publisher skips stores with an archived successful submission for these
exact packages. Store attempt receipts are uploaded before submission and after
available API checkpoints, including Edge operation IDs and Chrome responses.
Successful receipts require acceptance evidence for the candidate version and
package hash. Chrome waits for upload processing to succeed and verifies the
submitted version; `PENDING_REVIEW` is already sufficient and does not wait for
store approval. Edge requires explicit successful upload and submission
operations with matching IDs. Firefox uses the audited, pinned `web-ext` 10.6.0
submission contract with `--approval-timeout 0`; review and signed download remain
separate. A tool upgrade requires checking that contract before updating it.
An older `submitted` receipt without acceptance evidence remains unknown, so a
maintainer can reconcile it and retry instead of being permanently skipped.
A failure, timeout, or interruption is an **uncertain outcome**, not permission
to resubmit. First inspect the store dashboard and archived operation/status
receipts. If the attempt is confirmed unfinished and a new submission is needed,
repeat the command with `--reconciled`. A journal upload failure stops the next
store operation. An empty, trusted `starter` receipt is retained as an unknown
attempt: it does not crash receipt parsing, and retry still requires checking the
store and explicitly using `--reconciled`. Completed malformed or mismatched
receipts remain errors. There is no blind automatic retry after an ambiguous
response.

On a new machine or after losing the ignored local review state, run
`pnpm release:review --tag v3.0.1` to recover and verify the published packages,
original candidate run ID, manifest digest, and archived successful gate receipt.
Use that run ID and digest for a selected-store retry.

Published retries download GitHub release packages and the archived gate receipt;
they do not depend on expired Actions artifacts and never rebuild the app.
Firefox signing can produce different bytes: signed outputs are archived with
separate hashes, linked to the verified unsigned input and source archive.
Successful submission means review is pending, not that the store is live.

## Archive late measurements and import the report

Publication archives available typed check outcomes, structured test counts,
raw diagnostic archives up to 100 MB each, metric records, and publisher receipts.
Missing or pending benchmarks stay explicit. Checks/evidence capture failure does
not resubmit stores or undo an existing release. Append evidence using:

```sh
pnpm release:publish --run CANDIDATE_RUN_ID --approve REVIEWED_CANDIDATE_SHA256 --stores none
# For a separate completed Advisory Performance History run, add --metric-run ID.
pnpm release:reports --tag v3.0.1
pnpm reports:validate
pnpm build:site
pnpm preview:release-media
```

`--stores none` still publishes the GitHub release if it has not been published;
after publication it only validates the saved release and appends available
evidence. An appended capture never replaces an earlier capture.

Advisory runtime runs freeze the target, baseline and reference to full commit
SHAs before dependency/browser setup, and archive a small source receipt before
measuring. The measurement command uses those frozen SHAs. Before attaching a
late run's outcomes, the publisher verifies its receipt against the selected
release's source commit, the exact run/attempt and the workflow controller SHA.
A failed or cancelled run can therefore retain correctly attributed outcomes.
If no current source receipt is available, the report records unavailable
evidence and omits that run's outcomes and measurements. A mismatched or malformed
receipt is rejected. The workflow's controller SHA alone is not evidence of which
application revision was benchmarked.

The explicit local import validates release/tag identity, trusted publisher
receipts, file sizes/SHA-256, schema, and immutable record IDs before writing
reviewable JSON under `notes/release-reports/` and `notes/performance/runs/`.
Known empty, trusted `starter` report manifests are skipped with a warning; they
never hide a later complete capture. Completed manifests and all referenced
evidence must be uploaded, nonempty, and pass validation. Evidence capture also
records incomplete store receipts as unavailable, with an unknown store outcome
unless a validated successful submission for the exact packages was archived.
An existing release without archived metrics can still be imported into the
inventory. Review the diff and commit/push through normal repository rules.
Every branch push, including a report-data import, runs the normal application
CI and website build. Version tag pushes do not repeat the already completed
candidate verification or start another publication workflow. There is no
path-based application verification bypass. No bot opens a follow-up PR.

Open `http://127.0.0.1:8777/reports/` after the default preview command. Hover or
tap charts for details; use arrow keys to browse and Enter to select. Choose a
release, baseline, workload and compatible measurement series. Shared links pin
version and capture IDs so later captures or releases do not silently change the
comparison. When restoring a saved Latest 10 comparison whose archived target or
baseline has moved outside that window, the page expands to All releases and
retains both selections. Choosing Latest 10 explicitly still shows a rolling
window.

Vercel builds every environment from the same committed catalog. The browser
loads embedded data and same-site static downloads; GitHub links are explicit
evidence/download links only. No GitHub credentials or release API requests are
needed by the website build or by report browsing. Ordinary Git deployments can
occur before and after report finalization; there is no special single-build
coordination. Verify the deployment commit and store submission receipts, and
check store approval/public availability separately.

## Historical data

Preserve all 19 collected records byte-for-byte, covering v2.6.0 onward, the
manual 3.0.0 baseline, and the collected master snapshot. Capture times, release
dates, protocol keys, source hashes, and raw samples remain unchanged. Missing
historical checks remain **Not archived**; migration does not rerun old tests or
invent old passes. See `notes/performance/README.md` for visualization details.
