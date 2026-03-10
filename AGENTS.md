## Visual Snapshot Policy

Changes to popup UI layout, spacing, icons, hover states, or controls are
snapshot-sensitive. Assume Playwright snapshots may differ between macOS and
Linux.

Snapshot-sensitive areas include:

- `packages/extension/src/js/components/**`
- `packages/integration_test/test/views.test.ts`
- `packages/integration_test/test/views.test.ts-snapshots/**`

Required agent behavior:

- Do not treat local macOS visual verification as sufficient.
- Do not say the task is fully verified until Linux visual checks pass, or
  explicitly state that Linux CI is still pending.
- If the user does not want a local Linux or Docker run, prefer creating a
  draft PR first and wait for Ubuntu CI before considering the work complete.
- When CI fails only on Linux snapshots, treat that as expected follow-up work
  and refresh the affected `chromium-linux` baselines.
- When touching snapshot-sensitive areas, call out Linux-only snapshot risk in
  the plan before implementation or before marking the task done.

## Release Screenshots

To retake the release screenshots:

1. Build the Chrome extension with `pnpm --filter tab-manager-v2 build:chrome`.
2. Run `pnpm capture:release-screenshots`.
3. Collect the exported assets from
   `docs/assets/images/release-candidates/`.

The capture script lives at
`packages/integration_test/scripts/capture-release-screenshots.mjs`.

Release screenshot rules:

- Use real public URLs only. The scripted set includes `https://jenny.media/`,
  `https://tab.jenny.media/`, `https://chatgpt.com/`,
  `https://claude.ai/login`, `https://gemini.google.com/`,
  `https://www.youtube.com/@JennyTV1`, plus a mix of docs, community, and
  news sites.
- The script generates light and dark variants for every shot with
  `-light.png` and `-dark.png` suffixes.
- Export at `1280x800` as PNG24 with alpha removed so the files are valid for
  Chrome Web Store submission.
- The current Chrome Web Store shortlist is the light-theme set for
  `01-overview-groups`, `02-group-editing`, `03-search-groups`,
  `05-keyboard-shortcuts`, and `06-grouped-tabs-focus`.
