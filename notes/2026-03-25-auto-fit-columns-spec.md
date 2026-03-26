# Auto-Fit Columns Layout Spec

Date: 2026-03-25

Issue: https://github.com/xcv58/Tab-Manager-v2/issues/2615

## Goal

Add an optional layout mode that avoids horizontal scrolling by fitting window
columns to the available width.

## Approved UX Copy

- Title: `Auto-fit columns`
- Description: `Avoid horizontal scrolling by fitting columns to the window.`

## Requirements

- Add a new optional setting that applies everywhere, not only in popup mode.
- Keep the current packed-column layout available when the setting is off.
- When `Auto-fit columns` is on, calculate the number of visible columns from
  the available width.
- In auto-fit mode, do not require horizontal scrolling.
- In auto-fit mode, keep browser windows grouped as separate window cards. Do
  not flatten all tabs into one undifferentiated list.
- Honor the existing `Minimum tab width` preference when computing columns.
- Recompute the column count as the available width changes.
- Recompute the column count as `Minimum tab width` changes.

## Non-Goals

- Do not remove the current packed-column behavior.
- Do not add popup-only behavior for this setting.
- Do not change window grouping semantics.
- Do not claim visual verification is complete until Linux snapshot checks pass
  in CI or an equivalent Linux run.

## Key Implementation Notes

- The layout policy changes belong in the window layout store, not only in CSS.
- Width math must not round up into a 1px overflow that reintroduces horizontal
  scrolling.
- This touches snapshot-sensitive UI, so Linux-only snapshot drift remains a
  likely follow-up even if local macOS checks look good.
