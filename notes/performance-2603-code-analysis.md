# Issue 2603 Performance Notes

Static code-level analysis recorded on 2026-03-15 for [issue #2603](https://github.com/xcv58/Tab-Manager-v2/issues/2603).

This note captures findings from source inspection only. It does not replace runtime profiling in Chromium or Firefox.

## Scope

- Review popup rendering, selection, drag-and-drop, search, duplicate detection, and layout repacking paths.
- Focus on overall performance risk, not only grouped-tab regressions.
- Separate code-reading findings from profiler-based conclusions.

## Recent Fix

- Commit `42d0e87a` reduces repeated grouped-tab lookups by indexing tabs per window and reusing that index when building grouped rows.

## Findings

### 1. Full popup render scale is still the largest overall risk

- The popup still renders the full visible window and tab tree at once.
- `packages/extension/src/js/components/WinList.tsx`
- `packages/extension/src/js/components/Window/Tabs.tsx`
- Each tab also wires drag and drop behavior.
- `packages/extension/src/js/components/Tab/DraggableTab.tsx`
- `packages/extension/src/js/components/Tab/DroppableTab.tsx`
- Group headers do the same for grouped workflows.
- `packages/extension/src/js/components/TabGroup/GroupRow.tsx`

Why it matters:

- A workspace with thousands of tabs produces a very large DOM and a very large number of drag/drop subscriptions.
- Even if individual rows are cheap, the aggregate cost is high.

### 2. Hover and focus state likely fan out across too many rows

- Hover is tracked globally by one `hoveredTabId`.
- `packages/extension/src/js/stores/HoverStore.tsx`
- Focus is tracked globally by one `focusedItem`.
- `packages/extension/src/js/stores/Focusable.tsx`
- Tab rows, tab tools, window headers, and group headers all derive UI state from those shared observables.
- `packages/extension/src/js/stores/Tab.tsx`
- `packages/extension/src/js/components/Tab/Tab.tsx`
- `packages/extension/src/js/components/Tab/TabTools.tsx`
- `packages/extension/src/js/components/Window/Title.tsx`
- `packages/extension/src/js/components/TabGroup/GroupRow.tsx`

Why it matters:

- Simple pointer movement or keyboard focus changes can invalidate a large observer graph.
- That is especially risky when the list is large and interactive chrome changes on hover.

### 3. Several hot components do avoidable work on every render

- Drag preview setup runs on every render in the tab drag wrapper.
- `packages/extension/src/js/components/Tab/DraggableTab.tsx`
- The tab drop target is connected during render.
- `packages/extension/src/js/components/Tab/DroppableTab.tsx`
- Some node-ref registration effects run without dependency arrays.
- `packages/extension/src/js/components/Tab/Tab.tsx`
- `packages/extension/src/js/components/Window/Title.tsx`
- `packages/extension/src/js/components/TabGroup/GroupRow.tsx`

Why it matters:

- This is not the main bottleneck by itself.
- It does add repeated per-row overhead that compounds at large scale.

### 4. Duplicate-tab derivations are still rebuilt broadly

- The flattened tab list is rebuilt from visible windows.
- `packages/extension/src/js/stores/WindowStore.tsx`
- Duplicate fingerprints are rebuilt from that flattened list.
- `packages/extension/src/js/stores/WindowStore.tsx`
- Duplicate counts are requested by multiple UI entry points.
- `packages/extension/src/js/components/PopupActionsMenu.tsx`
- `packages/extension/src/js/components/Toolbar/RemoveDuplicated.tsx`
- Group headers also ask for duplicate counts within a group.
- `packages/extension/src/js/components/TabGroup/GroupRow.tsx`

Why it matters:

- Duplicate-related work scales with the total tab set.
- It is likely acceptable on small workspaces and increasingly expensive on large ones.

### 5. Search still performs whole-workspace fuzzy matching

- Search uses `matchSorter` across all tabs.
- `packages/extension/src/js/stores/SearchStore.tsx`
- Search updates also trigger layout repacking.
- `packages/extension/src/js/stores/SearchStore.tsx`

Why it matters:

- Fuzzy search across thousands of tabs can be expensive by itself.
- Repacking layout in response to search makes the cost more visible.

### 6. Layout repacking remains a broad operation

- Layout dirty checks compare rendered and computed column layouts.
- `packages/extension/src/js/stores/WindowStore.tsx`
- Repacking recomputes layout from all visible windows.
- `packages/extension/src/js/stores/WindowStore.tsx`
- Search, resize, tab events, and group changes can all trigger repacks.
- `packages/extension/src/js/stores/SearchStore.tsx`
- `packages/extension/src/js/stores/WindowStore.tsx`

Why it matters:

- This keeps the popup responsive to changes, but it also increases whole-view work during interaction.

### 7. Scroll and focus behavior may explain the "jump" complaint

- Focused tab rows scroll themselves into view.
- `packages/extension/src/js/components/Tab/Tab.tsx`
- Group headers also scroll themselves into view.
- `packages/extension/src/js/components/TabGroup/GroupRow.tsx`
- Window headers do the same.
- `packages/extension/src/js/components/Window/Title.tsx`

Why it matters:

- In long lists, repeated `scrollIntoView` calls can feel like anchor jumps.
- Smooth scrolling can make the effect feel even heavier during keyboard navigation.

## Firefox Test Harness Notes

- The main Playwright integration suite is Chromium-only today.
- `packages/integration_test/playwright.config.ts`
- The Firefox Playwright project is commented out there.
- The repo does still have Firefox extension integration coverage, but it is separate.
- `packages/integration_test_firefox/package.json`
- `packages/integration_test_firefox/util.ts`
- That Firefox harness uses Selenium WebDriver plus geckodriver and installs the built Firefox extension as a temporary addon from `build_firefox.zip`.

Implication:

- The current integration framework can help with high-signal performance investigation in Chromium right away.
- Firefox extension investigation is possible, but not through the Playwright integration package as currently configured.

## Best Next Step

Use the integration framework to create repeatable large-workspace scenarios, then collect runtime traces for:

- popup open
- search input updates
- multi-select
- drag and drop

Run that first in Chromium through the existing Playwright path, then mirror the most relevant cases in the separate Firefox Selenium harness.
