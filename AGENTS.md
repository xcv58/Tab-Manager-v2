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
