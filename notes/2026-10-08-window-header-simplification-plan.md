# Window header simplification

Approved by the user after two independent design reviews.

## Intended experience

`Select all | clickable tab count | Collapse/Expand | Window actions | Close`

- Keep title activation and the checkbox alignment with tab rows.
- Always show Collapse/Expand, menu, and Close in that order.
- Remove Sort and Reload buttons and their slots, recovering about 60px.
- Put “Sort tabs in this window” and “Reload all tabs in this window” first
  in the menu. Preserve their previous availability while collapsed.
- Separate the selected-tab moves with a divider, and explicitly identify
  this window as the destination. These commands use the global selection.
- Keep general window commands independent of selection and move eligibility.
- Give Collapse/Expand state-specific labels/tooltips and `aria-expanded`.
- Give Close the “Close window” label/tooltip.
- Preserve shared menu keyboard navigation, dismissal, and focus restoration.
- Preserve the temporary Beginning/End targets shown during dragging.
- Keep global shortcuts separate from these window-scoped commands.

## Implementation and verification

1. Update the three header/menu/control components and relevant regression
   coverage, including integration interactions and existing capture-script
   selectors that use removed buttons. Do not run the video capture flow.
2. Replace the obsolete direct Sort/Reload icon atom checks with compact-header
   and menu behavior checks; retain broader header visual coverage.
3. Run `pnpm build`, with isolated outputs and stable source inputs. Do not run
   local unit/integration tests or snapshot refreshes under repository policy.
4. Refresh the six existing light/dark PR illustrations from the built Chrome
   extension in an isolated browser profile with public URLs.
5. Obtain a fresh independent review, address accepted findings, then update
   PR #2659 and wait for Ubuntu CI.

This is snapshot-sensitive UI work. macOS screenshots do not establish Linux
visual correctness. Linux CI may require `chromium-linux` baseline updates;
any local Linux run or baseline refresh requires human approval.

Browser move logic, global shortcuts, shared menu behavior, public docs,
release artwork, and feature-video generation/assets are outside this change.
