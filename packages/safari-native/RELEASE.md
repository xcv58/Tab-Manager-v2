# Safari release automation

The production app is already public as [6758364114](https://apps.apple.com/us/app/tab-manager-v2/id6758364114).
Automation extends the existing frozen-candidate pipeline. It never builds during
delivery, automatically submits App Review after upload, or releases an approved
version. Keep #2685 open until an authorized end-to-end delivery has evidence.

## Environment prerequisites

All credentialed jobs use the existing **safari-app-store** GitHub environment.
Retain its master-only deployment branch policy, required reviewer `xcv58`,
self-review setting, and zero wait timer. PR/push Debug and Release compilation
jobs remain unsigned and receive no Apple secrets. Environment review is an
additional gate; administrators retain the existing GitHub bypass setting.

These environment secrets already exist:

| Secret            | Value                             |
| ----------------- | --------------------------------- |
| `ASC_KEY_ID`      | Tab Manager Releases team key ID  |
| `ASC_ISSUER_ID`   | Jenny Media LLC issuer ID         |
| `ASC_PRIVATE_KEY` | Full PEM text of that key's `.p8` |

Before the first **signed candidate**, an owner must provide the following
additional environment secrets. Export existing distribution identities with
their private keys; the workflow does not create/revoke certificates, register
identifiers, or change Developer Portal provisioning automatically.

| Secret                         | Value                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SAFARI_CERTIFICATES_P12`      | Base64 of a password-protected P12 containing exactly one Apple Distribution identity and one Mac Installer Distribution identity (certificate CN `3rd Party Mac Developer Installer`) for team `5736QK4NZX` |
| `SAFARI_CERTIFICATES_PASSWORD` | P12 export password                                                                                                                                                                                          |
| `SAFARI_APP_PROFILE`           | Base64 of the production Mac App Store distribution `.provisionprofile` for `com.xcv58.Tab-Manager-v2`                                                                                                       |
| `SAFARI_EXTENSION_PROFILE`     | Base64 of the production Mac App Store distribution `.provisionprofile` for `com.xcv58.Tab-Manager-v2.Extension`                                                                                             |

Both profiles must authorize App Group
`5736QK4NZX.com.xcv58.Tab-Manager-v2`, include the supplied application signing
certificate, and have at least 24 hours of validity when packaging begins.
Development, Developer ID, wildcard, and device-bound profiles are rejected.
The App Manager API key alone cannot replace these private signing identities.

Set environment **variable** `SAFARI_INTERNAL_GROUP_ID` to the UUID of the existing
internal TestFlight group for app 6758364114. No group or tester is created.
Delivery validates the group/app and signing expiry before starting transport.

Use `gh secret set NAME --repo xcv58/Tab-Manager-v2 --env safari-app-store`
with stdin/file redirection, never command-line secret values. For example,
base64-encode a profile locally and pipe it to `gh secret set`. Do not commit
credentials or place them in release artifacts. Configuring these prerequisites
does not authorize a candidate run, upload, or submission.

## Prepare a candidate without uploading

Prepare reviewed Safari What's New text as a JSON map using existing Apple
listing locales, for example `{"en-US":"Describe this version's Safari changes."}`.
Descriptions, screenshots, keywords, URLs, pricing and availability are preserved;
the promotion code only changes What's New, build selection and manual release.
New locales and listing/screenshots must be prepared manually in Apple.

```sh
pnpm release:prepare --version 3.0.2 --notes /absolute/path/changelog.md \
  --safari-notes /absolute/path/safari-notes.json
# Review/merge source, versions and the generated version-specific notes normally.
pnpm release:verify --sha FULL_REVIEWED_MASTER_SHA --safari
pnpm release:review --run CANDIDATE_RUN_ID
```

`--safari-notes` writes
`promotional_tiles/store-listings/releases/VERSION/safari-release.json`. Signed
candidate preparation requires that version's file; it never silently reuses
old Safari notes or assumes the shared browser changelog describes Safari.
Without `--safari`, candidate preparation retains the existing browser-only flow.
`release:verify` does run the existing required CI checks; dispatch only when the
maintainer authorizes verification.

The protected packaging job runs after unsigned Safari compilation. It selects
macOS 15, **Xcode 26.3 (17C529)** and checksum-pinned **XcodeGen 2.46.0**. A missing
or changed toolchain fails rather than silently using a new default. Web resources
are built before project generation. Distribution signing uses manual profiles
and an isolated temporary keychain. Normal completion/failure restores the
keychain search list and removes installed profiles/private material; GitHub's
ephemeral runner is discarded if the job is forcibly terminated.

Build allocation is serialized with every other Safari operation. The job reads
all macOS Apple builds, all Build Upload records (including pending/failed
uploads), and immutable reservations in the private draft release
`safari-build-ledger`. It reserves an integer above every observed number across
marketing versions before archiving. Do not publish/delete this ledger or run
manual uploads concurrently. Non-integer historical numbers require manual
reconciliation. A partial candidate rerun cannot reuse its reservation: choose
**Re-run all jobs**, then review and approve the new manifest digest.

The final schema-2 candidate includes:

- Browser packages, the exact signed `safari-app-store.pkg`, and
  `safari-archive.zip` containing the native archive and app/extension dSYMs.
- Frozen source/tag/version, allocated build, candidate run/attempt, package sizes
  and SHA-256, production identities, architecture/resource evidence, signing
  certificate fingerprints/expiry, profile UUIDs/expiry and toolchain versions.
- Reviewed localized Safari release notes. Both native targets and the web
  manifest must match the product version; both native builds must match the
  allocated build. Archive and exported payload are checked for universal
  arm64/x86_64 binaries, signatures, provisioning, entitlements and web resources.

Review `candidate.json`, both native outputs and the required checks locally.
Any changed source, signing input, native number, notes or package byte requires
a new candidate/digest approval. Historical schema-1 browser candidates remain
reviewable/retryable; Safari cannot be appended to a published candidate.

## Deliver the approved package to internal TestFlight

Only after separate authorization:

```sh
pnpm release:publish --run RUN --approve REVIEWED_CANDIDATE_SHA256 --stores safari
# Or explicitly select several stores: --stores chrome,firefox,edge,safari
```

The publisher rechecks source/tag, frozen-attempt gates and every package hash,
archives immutable packages/provenance on the version's GitHub release, and runs
selected stores independently. The Safari job requires environment approval,
downloads the approved bytes, and uploads the macOS `.pkg` with Xcode's `altool`.
It polls Apple processing for at most 30 minutes, then checks/adds that same build
to the existing internal group and confirms its internal beta state (up to five
more minutes). Transport acceptance, processing and tester access are separate
durable `store-safari-*` receipts. A Safari delivery failure does not prevent the
other selected stores from submitting.

On timeout/failure, rerun the same selected-store publication command. It first
queries Apple for that app/version/build and checks recorded build IDs. Accepted
uploads/builds resume processing/group checks without transport. If a prior
transport attempt has no observable Apple build/upload, stop, inspect Apple's
Build Uploads and the receipts, and wait for its outcome. Use `--reconciled` only
after confirming it was not accepted. This permits another transport attempt of
the **same** package, never a rebuild or new number. A manual-upload collision or
failed Apple build requires explicit reconciliation/new candidate; it is never
treated as proof of the approved package. Do not use a new candidate to conceal
an uncertain accepted upload.

## Prepare, review metadata, then submit separately

These commands dispatch the master-only **Safari App Store controls** workflow
and use the same environment/concurrency lock. No command releases a version.

```sh
pnpm release:review --tag v3.0.2
pnpm release:safari --tag v3.0.2 --approve CANDIDATE_DIGEST --action prepare
# Review the full draft, screenshots and review details in App Store Connect.
pnpm release:safari --tag v3.0.2 --approve CANDIDATE_DIGEST --action status
# Only after explicit App Review submission approval:
pnpm release:safari --tag v3.0.2 --approve CANDIDATE_DIGEST \
  --action submit --metadata-sha256 REVIEWED_APPLE_METADATA_DIGEST
```

`prepare` uses only the recorded processed Apple build, creates/reuses the matching
macOS version, sets `releaseType=MANUAL`, and writes the candidate's What's New
text into existing locales. It refuses an already selected different build,
another editable macOS version, or any active review. It never withdraws a
submission, clears listing fields, or replaces a build in review.

`status` is read-only in Apple and archives the current listing/build/review
state. Review the full listing in Apple as well as its snapshot. `submit` requires
that snapshot's digest, the candidate's exact notes, build and manual-release
setting. Any listing change invalidates metadata approval. Existing matching
submissions resume by recorded/verified submission identity; unrelated or
unresolved submissions stop for manual attention. A mutation whose identity
could not be durably recorded may also require manual reconciliation.

All stages append immutable receipts and a release report. Import later with
`pnpm release:reports --tag v3.0.2` through the usual reviewed Git process.
Submission, Apple approval and public availability remain separate; use status
and App Store verification to observe them. Public release stays a manual Apple
action until a future separately approved change enables it.

## Validation and rollout

Offline regression coverage is part of `pnpm test:release-metadata` and normal
branch CI. Run local suites only under the repository's human approval policy.
Unsigned CI cannot prove distribution signing, live upload acceptance, Safari
browser behavior or internal tester availability. Validate a signed candidate
first without uploading; then obtain separate authorization for delivery and
App Review. Do not close #2685 based on implementation alone.

API contracts: [Apple's OpenAPI specification](https://developer.apple.com/sample-code/app-store-connect/app-store-connect-openapi-specification.zip),
[builds](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-builds),
[App Review submissions](https://developer.apple.com/documentation/appstoreconnectapi/reviewsubmissions),
[manual release options](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option),
[GitHub macOS runner inventory](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-arm64-Readme.md).
