# Release Automation

This repository uses `release-please` to turn releasable commits on `master`
into a single release PR. Merging that PR creates the Git tag and GitHub
Release, then the publish workflow rebuilds the extension on Ubuntu, reruns the
Linux Playwright gate, and submits the release to Chrome, Firefox, and Edge.

## Flow

1. Merge releasable commits such as `fix:` or `feat:` into `master`.
2. `.github/workflows/release-please.yml` opens or updates one release PR.
3. Merge the release PR after the Linux CI gate passes.
4. The same workflow detects that a GitHub Release was created, rebuilds on
   Ubuntu, and runs `pnpm run publish-extension`.

## Required repository settings

- `Settings > Actions > General > Workflow permissions`: allow read and write.
- `Settings > Actions > General > Allow GitHub Actions to create and approve
  pull requests`: enabled.

## Required secrets

- `RELEASE_PLEASE_TOKEN`: recommended PAT or GitHub App token for
  `release-please`. Without it, release PR updates created with
  `GITHUB_TOKEN` will not trigger follow-up CI on the release branch.
- `EXTENSION_ID`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `REFRESH_TOKEN`
- `WEB_EXT_API_KEY`
- `WEB_EXT_API_SECRET`
- `EDGE_PRODUCT_ID`
- `EDGE_CLIENT_ID`
- `EDGE_CLIENT_SECRET`
- `EDGE_ACCESS_TOKEN_URL`

## Notes

- The publish workflow intentionally reruns on Ubuntu before store submission,
  because popup and snapshot-sensitive UI verification in this repository must
  be trusted on Linux rather than local macOS runs.
- Firefox submission is asynchronous from CI's point of view. A successful
  workflow means the package was submitted, not necessarily that AMO review has
  completed.
