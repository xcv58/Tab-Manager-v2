# Auto-Fit Columns Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `Auto-fit columns` layout mode that fits window columns to the available width without horizontal scrolling while still honoring `Minimum tab width`.

**Architecture:** Extend the existing persisted settings with a new boolean layout preference, then branch the window layout algorithm in `WindowStore` so packed columns remain the default and auto-fit columns become an alternate width-driven layout. Keep the current window-card rendering model and virtualization, but ensure auto-fit mode computes only on-screen columns, hides horizontal overflow, and refreshes when width or minimum tab width changes.

**Tech Stack:** React 18, MobX stores, Jest + Testing Library, Playwright integration tests, Chrome extension build pipeline

---

## Reference Spec

- `notes/2026-03-25-auto-fit-columns-spec.md`

## Snapshot Risk

- This work touches snapshot-sensitive UI in `packages/extension/src/js/components/**`.
- Local macOS visual verification is not sufficient.
- Do not mark the work fully verified until Linux snapshot coverage passes in CI or via a Linux-equivalent run.
- If Ubuntu CI fails only on snapshot drift, refresh the affected `chromium-linux` baselines as follow-up work.

## File Structure

- Modify: `packages/extension/src/js/stores/UserStore.tsx`
  - Add persisted `autoFitColumns` state, toggle action, and repack trigger.
- Modify: `packages/extension/src/js/stores/__tests__/UserStore.test.tsx`
  - Cover persistence and repack behavior for the new setting.
- Modify: `packages/extension/src/js/components/Toolbar/SettingsDialog.tsx`
  - Add the new settings row under the `View` panel with approved copy.
- Modify: `packages/extension/src/js/stores/WindowStore.tsx`
  - Branch column-count and layout computation between packed and auto-fit modes.
- Modify: `packages/extension/src/js/stores/__tests__/WindowStore.test.tsx`
  - Cover width-driven column count, `Minimum tab width` behavior, and no-overflow math.
- Modify: `packages/extension/src/js/components/WinList.tsx`
  - Hide horizontal overflow in auto-fit mode while preserving current behavior when the setting is off.
- Modify: `packages/extension/src/js/components/__tests__/WinList.test.tsx`
  - Assert the scroll container switches to the correct overflow behavior in auto-fit mode.
- Modify if needed: `packages/extension/src/js/stores/FocusStore.tsx`
  - Only if auto-fit mode exposes a keyboard-navigation regression.
- Modify if needed: `packages/extension/src/js/stores/__tests__/FocusStore.test.tsx`
  - Add regression coverage only if focus behavior changes.
- Modify: `packages/integration_test/test/interaction.test.ts`
  - Add viewport-resize and no-horizontal-scroll behavior coverage.
- Modify if snapshots change: `packages/integration_test/test/views.test.ts`
  - Update or extend settings/popup snapshot coverage only if the new setting row or layout visuals are intentionally captured.
- Modify if snapshots change: `packages/integration_test/test/views.test.ts-snapshots/**`
  - Refresh macOS and Linux baselines only when required.

### Task 1: Add the persisted setting and settings copy

**Files:**

- Modify: `packages/extension/src/js/stores/UserStore.tsx`
- Modify: `packages/extension/src/js/stores/__tests__/UserStore.test.tsx`
- Modify: `packages/extension/src/js/components/Toolbar/SettingsDialog.tsx`

- [ ] **Step 1: Add the new stored setting shape**

Update `packages/extension/src/js/stores/UserStore.tsx` to add `autoFitColumns`
to:

- `DEFAULT_SETTINGS`
- the observable field list
- the class fields
- any save/load normalization paths that rely on `DEFAULT_SETTINGS`

Keep the initial value `false` so current behavior remains unchanged.

- [ ] **Step 2: Add a dedicated toggle action**

Add `toggleAutoFitColumns()` in
`packages/extension/src/js/stores/UserStore.tsx` that:

- flips `this.autoFitColumns`
- calls `this.store.windowStore?.repackLayout?.('settings-change')`
- persists via `save()`

Match the existing style used by `toggleShowUnmatchedTab()` and
`updateTabWidth()`.

- [ ] **Step 3: Write the failing store tests**

Add Jest coverage in
`packages/extension/src/js/stores/__tests__/UserStore.test.tsx` for:

- default value is `false`
- toggling the setting calls `repackLayout('settings-change')`
- toggling the setting persists through `save()`

Run:

```bash
pnpm --filter tab-manager-v2 exec jest --maxWorkers=1 packages/extension/src/js/stores/__tests__/UserStore.test.tsx
```

Expected: FAIL until the new setting and action exist.

- [ ] **Step 4: Implement the settings row**

Add a new `SettingsSwitchOption` entry in
`packages/extension/src/js/components/Toolbar/SettingsDialog.tsx` under the
existing `View` panel with:

- title: `Auto-fit columns`
- description: `Avoid horizontal scrolling by fitting columns to the window.`
- `checked={autoFitColumns}`
- `onChange={toggleAutoFitColumns}`

Keep the current settings organization intact.

- [ ] **Step 5: Re-run the targeted store test**

Run:

```bash
pnpm --filter tab-manager-v2 exec jest --maxWorkers=1 packages/extension/src/js/stores/__tests__/UserStore.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the settings-only slice**

```bash
git add packages/extension/src/js/stores/UserStore.tsx \
  packages/extension/src/js/stores/__tests__/UserStore.test.tsx \
  packages/extension/src/js/components/Toolbar/SettingsDialog.tsx
git commit -m "feat: add auto-fit columns setting"
```

### Task 2: Implement width-driven auto-fit layout in the window store

**Files:**

- Modify: `packages/extension/src/js/stores/WindowStore.tsx`
- Modify: `packages/extension/src/js/stores/__tests__/WindowStore.test.tsx`

- [ ] **Step 1: Add a helper for the maximum fitting column count**

In `packages/extension/src/js/stores/WindowStore.tsx`, add a helper that
derives the auto-fit column count from:

- current measured width
- `minColumnWidthPx`

Use the largest integer count that still keeps every column at or above the
minimum width. Guard `0` and negative widths by falling back to `1`.

- [ ] **Step 2: Preserve packed mode as the existing code path**

Extract the current height-driven layout logic into a named helper such as
`computePackedColumnLayout()` so the current behavior stays readable and
unchanged when `autoFitColumns` is `false`.

- [ ] **Step 3: Add the auto-fit layout branch**

Add a second helper such as `computeAutoFitColumnLayout()` in
`packages/extension/src/js/stores/WindowStore.tsx` that:

- uses the width-derived column count
- assigns every visible window to one of those columns
- keeps output deterministic across repeated repacks
- returns a `layout`/`columnCount` pair in the same format as packed mode

Start with a straightforward deterministic distribution strategy; avoid adding
new user-facing modes or heuristics beyond what is needed for auto-fit.

- [ ] **Step 4: Make the column width math overflow-safe**

Adjust the width calculation in `packages/extension/src/js/stores/WindowStore.tsx`
so auto-fit mode cannot round up into a horizontal overflow. In particular:

- do not allow `columnWidthPx * columnCount` to exceed the measured container
  width by rounding error
- keep honoring `minColumnWidthPx`

If needed, use `Math.floor()` or an equivalent clamp in the auto-fit branch.

- [ ] **Step 5: Keep total content width on-screen in auto-fit mode**

Update `totalContentWidth`-related logic so auto-fit mode never creates extra
off-screen canvas width. Packed mode should keep the current behavior.

- [ ] **Step 6: Write failing layout-policy tests**

Add Jest coverage in
`packages/extension/src/js/stores/__tests__/WindowStore.test.tsx` for:

- packed mode still uses the current height-driven layout
- auto-fit mode chooses `1` column when only one minimum-width column fits
- auto-fit mode increases column count as width increases
- increasing `tabWidth` reduces the computed auto-fit column count
- auto-fit mode never reports total content width wider than the viewport
- resize-triggered repacks still work in auto-fit mode

Run:

```bash
pnpm --filter tab-manager-v2 exec jest --maxWorkers=1 packages/extension/src/js/stores/__tests__/WindowStore.test.tsx
```

Expected: FAIL until the new layout branch and width math are implemented.

- [ ] **Step 7: Implement the minimal store changes to satisfy the tests**

Update `packages/extension/src/js/stores/WindowStore.tsx` only as needed to
make the new auto-fit tests pass while preserving existing packed-mode
expectations.

- [ ] **Step 8: Re-run the targeted layout-policy test file**

Run:

```bash
pnpm --filter tab-manager-v2 exec jest --maxWorkers=1 packages/extension/src/js/stores/__tests__/WindowStore.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit the layout-store slice**

```bash
git add packages/extension/src/js/stores/WindowStore.tsx \
  packages/extension/src/js/stores/__tests__/WindowStore.test.tsx
git commit -m "feat: add auto-fit window layout"
```

### Task 3: Lock the scroll-container behavior to vertical scrolling in auto-fit mode

**Files:**

- Modify: `packages/extension/src/js/components/WinList.tsx`
- Modify: `packages/extension/src/js/components/__tests__/WinList.test.tsx`

- [ ] **Step 1: Add the failing render test**

Extend `packages/extension/src/js/components/__tests__/WinList.test.tsx` to
cover both modes:

- packed mode keeps the existing scroll behavior
- auto-fit mode hides horizontal overflow and keeps vertical scrolling enabled

Run:

```bash
pnpm --filter tab-manager-v2 exec jest --maxWorkers=1 packages/extension/src/js/components/__tests__/WinList.test.tsx
```

Expected: FAIL until the component reads the new setting.

- [ ] **Step 2: Update the scroll container classes**

In `packages/extension/src/js/components/WinList.tsx`, branch the scroll
container class name or inline styles based on `userStore.autoFitColumns`:

- packed mode: keep current horizontal + vertical scroll behavior
- auto-fit mode: use vertical scrolling and hide horizontal overflow

Do not change the measurement logic or virtualization hooks unless the new test
reveals a real need.

- [ ] **Step 3: Re-run the component test**

Run:

```bash
pnpm --filter tab-manager-v2 exec jest --maxWorkers=1 packages/extension/src/js/components/__tests__/WinList.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit the container-behavior slice**

```bash
git add packages/extension/src/js/components/WinList.tsx \
  packages/extension/src/js/components/__tests__/WinList.test.tsx
git commit -m "test: lock auto-fit scroll container behavior"
```

### Task 4: Add browser-level coverage for width changes and no-horizontal-scroll behavior

**Files:**

- Modify: `packages/integration_test/test/interaction.test.ts`
- Modify if needed: `packages/integration_test/test/views.test.ts`
- Modify if needed: `packages/integration_test/test/views.test.ts-snapshots/**`

- [ ] **Step 1: Add a no-horizontal-scroll interaction test**

In `packages/integration_test/test/interaction.test.ts`, add a Playwright test
that:

- enables `autoFitColumns` through extension storage
- creates enough windows/tabs to require multiple columns
- uses a wide viewport
- asserts the scroll container does not need horizontal scrolling

Suggested assertion shape:

```ts
const metrics = await page
  .getByTestId('window-list-scroll-container')
  .evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }))
expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
```

- [ ] **Step 2: Add a responsive resize test**

In the same Playwright file, add a test that:

- enables `autoFitColumns`
- starts at a wide viewport and records the rendered column count from
  `[data-testid^="window-column-"]`
- narrows the viewport with `page.setViewportSize(...)`
- waits for layout stabilization
- asserts the rendered column count decreases without introducing horizontal
  overflow

- [ ] **Step 3: Add a `Minimum tab width` regression test**

Still in `packages/integration_test/test/interaction.test.ts`, add coverage that:

- enables `autoFitColumns`
- changes `tabWidth` through storage or settings
- verifies a larger minimum width reduces the number of rendered columns

- [ ] **Step 4: Add visual coverage only if it earns its keep**

If the settings row or resulting layout needs snapshot coverage, update
`packages/integration_test/test/views.test.ts` deliberately and refresh
snapshots. If the interaction tests fully cover the behavior and no snapshot is
required, keep `views.test.ts` unchanged to minimize unnecessary visual churn.

- [ ] **Step 5: Run the targeted Playwright coverage**

Run:

```bash
pnpm --filter tab-manager-v2 build:chrome
pnpm --filter integration-test exec playwright test test/interaction.test.ts
```

Expected: PASS for the new interaction tests on the local platform.

- [ ] **Step 6: Commit the browser-level coverage**

```bash
git add packages/integration_test/test/interaction.test.ts \
  packages/integration_test/test/views.test.ts \
  packages/integration_test/test/views.test.ts-snapshots
git commit -m "test: cover auto-fit columns layout"
```

Only include the snapshot paths if they actually changed.

### Task 5: Verify the whole slice and prepare Linux snapshot follow-up

**Files:**

- Modify if needed: `packages/integration_test/test/views.test.ts-snapshots/**`

- [ ] **Step 1: Run the focused unit suite**

Run:

```bash
pnpm --filter tab-manager-v2 exec jest --maxWorkers=1 \
  packages/extension/src/js/stores/__tests__/UserStore.test.tsx \
  packages/extension/src/js/stores/__tests__/WindowStore.test.tsx \
  packages/extension/src/js/components/__tests__/WinList.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run any extra regression tests touched during implementation**

If `FocusStore.tsx` or its tests changed, run:

```bash
pnpm --filter tab-manager-v2 exec jest --maxWorkers=1 packages/extension/src/js/stores/__tests__/FocusStore.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run the targeted browser verification**

Run:

```bash
pnpm --filter tab-manager-v2 build:chrome
pnpm --filter integration-test exec playwright test test/interaction.test.ts
```

Expected: PASS locally.

- [ ] **Step 4: Run snapshot coverage only if it changed**

If `views.test.ts` changed, run:

```bash
pnpm --filter integration-test exec playwright test test/views.test.ts
```

Expected: local PASS, with the understanding that Linux-specific snapshot drift
may still show up later.

- [ ] **Step 5: Record Linux verification status accurately**

Before merging or declaring the feature done:

- note whether Linux snapshots were run locally
- if not, say that Ubuntu CI is still pending
- if CI fails only on Linux snapshot baselines, refresh the affected
  `chromium-linux` snapshots and rerun the visual test

- [ ] **Step 6: Commit the verification or snapshot follow-up**

```bash
git add packages/integration_test/test/views.test.ts-snapshots
git commit -m "test: refresh auto-fit layout snapshots"
```

Only create this commit if snapshot files actually changed.
