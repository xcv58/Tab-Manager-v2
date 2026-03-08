# Design Refresh Plan

Date: 2026-03-07

This document records the agreed design changes for the current UI refresh so the work can continue without relying on chat context.

## Agreed Direction

- Keep the flat canvas. Do not reintroduce window shadows.
- Improve hierarchy with tone and boundary, not depth.
- Shorten the search placeholder. Move power-user hints into a quieter secondary hint.
- Use one blue family for focus and selection.
- Use typography, not a separate accent color, for search matches.
- Treat duplicate tabs as a relationship, not an error. Do not use red text for duplicate state.
- Reserve red for destructive actions.
- Align drag and drop with the focus/selection language, except for special destination states such as opening in a new window.
- Keep secondary controls hidden when appropriate, but leave a persistent lightweight affordance so action areas remain discoverable.
- Keep tooltip behavior predictable. Do not make tooltip visibility depend on truncation.
- Remove redundant tooltip state text when the same information is already visible in the row.

## Interaction Rules

### Window headers

- Keep hover-revealed controls for dense actions such as sort and reload.
- Add one stable, always-visible affordance so the header reads as interactive even before hover or focus.
- Make the header plane slightly more distinct than the rows below it.

### Toolbar

- Auto-hide may remain an option.
- The collapsed toolbar state should read as a collapsed structure, not a floating icon.
- Use an anchored handle, pill, or short rail that visually attaches to the bottom edge.

### Drag handles

- Use the same principle for tab and group drag handles.
- Group drag handles should remain faintly visible and become fully visible on hover or focus.
- Tab drag handles should follow the same rule, but with a softer always-visible treatment because tab rows are denser.

### Popup mode

- Lite mode should focus on search and switch.
- Replace the prominent bottom "open full feature mode" action with a smaller overflow or action cluster.

### Menus

- Keep tab menus limited to tab-local actions.
- Move group-wide actions to group-level menus and editors.
- Move selection-wide actions to the toolbar or command palette.

### Settings

- Reorganize settings into:
  - Search
  - Appearance
  - Behavior
  - Advanced
- Advanced options should be visually demoted or collapsed by default.
- Rewrite technical labels into plain language.

## Planned Changes

1. Define the visual grammar in theme and shared component styles.
   - Surface hierarchy for page, window, and header planes
   - Divider and boundary strength
   - Blue state family for focus and selection
   - Duplicate marker treatment
   - Drag and drop color rules

2. Update the app shell and overall hierarchy.
   - Short search placeholder
   - Secondary search hint for `/` and `>`
   - Slight page vs window tone separation
   - Slightly stronger window boundaries
   - Slightly more distinct window headers
   - Stable window-header affordance
   - Anchored collapsed-toolbar handle

3. Unify row and group states.
   - Search match typography
   - Focus and selection consistency
   - Duplicate marker instead of red text
   - Persistent subtle drag handles for tabs and groups
   - Tooltip cleanup

4. Rework settings information architecture and copy.
   - New section grouping
   - Plain-language labels
   - Demoted advanced settings

5. Simplify action placement.
   - Reduce tab menu to tab-local actions
   - Keep group-wide actions in group menus
   - Move popup secondary actions into a small overflow cluster

6. Verify against existing snapshot coverage and adjust contrast and spacing as needed.

## Files Likely To Change

- `packages/extension/src/js/libs/themes.tsx`
- `packages/extension/src/js/components/AutocompleteSearch/index.tsx`
- `packages/extension/src/js/components/Window/Title.tsx`
- `packages/extension/src/js/components/Toolbar/Toolbar.tsx`
- `packages/extension/src/js/components/Toolbar/ToolbarIndicator.tsx`
- `packages/extension/src/js/components/Tab/Tab.tsx`
- `packages/extension/src/js/components/Tab/TabContent.tsx`
- `packages/extension/src/js/components/Tab/TabMenu.tsx`
- `packages/extension/src/js/components/TabGroup/GroupRow.tsx`
- `packages/extension/src/js/components/Toolbar/SettingsDialog.tsx`
- `packages/extension/src/js/components/PopupView.tsx`

## Explicit Non-Decisions

- Do not add shadows back to windows.
- Do not make tooltips appear only for truncated content.
- Do not keep duplicate state styled as an error.
