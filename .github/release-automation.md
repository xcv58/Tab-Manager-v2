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
   Ubuntu, uploads release artifacts, and runs `pnpm run publish-extension`.

## Required repository settings

- `Settings > Actions > General > Workflow permissions`: allow read and write.
- `Settings > Actions > General > Allow GitHub Actions to create and approve
  pull requests`: enabled.
- `Settings > Secrets and variables > Actions`: add the secrets listed below.

## Required secrets

- `RELEASE_PLEASE_TOKEN`: recommended PAT or GitHub App token for
  `release-please`. Without it, release PR updates created with
  `GITHUB_TOKEN` will not trigger follow-up CI on the release branch.
- `EXTENSION_ID`
- `CHROME_PUBLISHER_ID`
- `CHROME_SERVICE_ACCOUNT_JSON`
- `WEB_EXT_API_KEY`
- `WEB_EXT_API_SECRET`
- `EDGE_PRODUCT_ID`
- `EDGE_CLIENT_ID`
- `EDGE_API_KEY`

## Local bootstrap flow

1. Copy [.env.release.example](/Users/xcv58/.codex/worktrees/4ec7/Tab-Manager-v2/.env.release.example) to `.env.release.local`.
2. Fill in the values in `.env.release.local`.
3. Download the Chrome service account JSON key and set
   `CHROME_SERVICE_ACCOUNT_JSON_FILE` to its local path.
4. Run `pnpm sync:release-secrets` to upload the values into GitHub Actions
   secrets for the current repository.
5. Delete or rotate the local file if you do not want to keep the credentials
   on disk after bootstrap.

The local file is gitignored. Keep it uncommitted and do not paste it into PRs,
issues, or workflow logs.

## How to obtain the credentials

### GitHub

- `RELEASE_PLEASE_TOKEN`
  Create a fine-grained personal access token at
  `GitHub > Settings > Developer settings > Personal access tokens`.
  Grant repository access to `xcv58/Tab-Manager-v2` and repository permissions
  for `Contents`, `Pull requests`, and `Issues`.

### Chrome Web Store

- `EXTENSION_ID`
  The current public listing ID is
  `nimllkpgmmbdglnjneeakdgcpkbgbfbp`.
- `CHROME_PUBLISHER_ID`
  Open the Chrome Web Store Developer Dashboard, switch to the correct
  publisher if needed, and copy the Publisher ID from the Account section.
- `CHROME_SERVICE_ACCOUNT_JSON`
  1. Open Google Cloud Console and create or select a project.
  2. Enable the Chrome Web Store API for that project.
  3. Create a service account.
  4. Create a JSON key for the service account and download it.
  5. In the Chrome Web Store Developer Dashboard, add the service account email
     so it can manage your items.
  6. Paste the full JSON key contents into the GitHub Actions secret named
     `CHROME_SERVICE_ACCOUNT_JSON`, or set
     `CHROME_SERVICE_ACCOUNT_JSON_FILE` in `.env.release.local` and let
     `pnpm sync:release-secrets` upload it for you.

### Firefox AMO

- `WEB_EXT_API_KEY`
- `WEB_EXT_API_SECRET`
  1. Sign in to AMO with the developer account that owns the add-on.
  2. Open the API credentials page.
  3. Create a credential pair and copy the key and secret into GitHub.

The repository already defines a stable Gecko ID in
`packages/extension/src/manifest.json`, so updates will continue to target the
existing AMO listing. The release workflow also uploads
`packages/extension/build/build_firefox_source.zip`, which is created from the
current git tree and includes `AMO_SOURCE_CODE_REVIEW.md` for reviewer build
instructions.

### Microsoft Edge Add-ons

- `EDGE_PRODUCT_ID`
  Find this in Partner Center for the existing extension. The public store URL
  slug is not the product ID; Partner Center shows the actual product GUID.
- `EDGE_CLIENT_ID`
- `EDGE_API_KEY`
  1. Sign in to Partner Center with the developer account that owns the
     extension.
  2. Open `Microsoft Edge program > Publish API`.
  3. Enable the new experience if prompted.
  4. Click `Create API credentials`.
  5. Copy the Client ID and API key into GitHub.

## Notes

- The publish workflow intentionally reruns on Ubuntu before store submission,
  because popup and snapshot-sensitive UI verification in this repository must
  be trusted on Linux rather than local macOS runs.
- Firefox submission is asynchronous from CI's point of view. A successful
  workflow means the package was submitted, not necessarily that AMO review has
  completed.
- Chrome publishing now uses the Chrome Web Store API v2 with a service
  account, rather than the older refresh-token flow.
- The bootstrap helper script reads `.env.release.local` locally, then writes
  values into GitHub Actions secrets. CI still reads secrets from GitHub rather
  than from any checked-in env file.
