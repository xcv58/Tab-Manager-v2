# Button Press Feedback Design

## Goal

Restore a sense of tactile responsiveness to app-owned buttons after the MUI removal, without reintroducing full ripple behavior or adding JavaScript-driven press effects.

## Scope

This design covers app-owned button primitives only:

- `packages/extension/src/js/components/ui/IconButton.tsx`
- `packages/extension/src/js/components/ui/ToggleGroup.tsx`

It intentionally excludes:

- switches
- checkboxes
- settings rows
- menus and menu items
- non-button clickable containers

Consumers that already use these primitives, such as toolbar icon buttons and segmented controls in settings, inherit the effect automatically.

## Constraints

- Use CSS-only press feedback for the safest rollout.
- Keep the motion subtle and fast.
- Preserve current hover, focus, selected, and disabled behavior.
- Respect reduced-motion preferences.
- Avoid introducing DOM wrappers or pseudo-ripple layers.
- Treat popup and settings surfaces as snapshot-sensitive; Linux visual verification remains the final visual gate.

## Recommended Approach

Apply a small press-scale animation to shared button primitives using `transform` and short transitions.

### Why this approach

- It restores responsiveness with minimal complexity.
- It keeps behavior centralized in shared primitives instead of patching individual callers.
- It avoids the maintenance burden of recreating MUI `ButtonBase` ripple behavior.
- It is safer than pseudo-element pulse effects across circular and pill-shaped controls.

## Interaction Design

### Icon buttons

`IconButton` should gain a brief scale-down on pointer press:

- add `transform` to the transition list
- apply a small `scale()` on `:active`
- keep the current hover and active color/background states
- do not animate when disabled

The effect should be restrained enough that toolbar and row action buttons feel responsive, not bouncy.

### Toggle buttons

`ToggleButton` inside `ToggleGroup` should receive the same press pattern with similarly subtle timing.

- selected state styling remains unchanged
- keyboard navigation and selection behavior remain unchanged
- the press animation should not make the selected pill appear to shift layout

## Reduced Motion

For reduced-motion users, preserve the pressed state behavior but minimize or eliminate animated transition timing on the transform. The controls should still feel correct without introducing extra motion.

## Implementation Plan

1. Add failing tests for shared primitive press feedback.
2. Update `IconButton` to include transform-based press feedback.
3. Update `ToggleButton` to include matching press feedback.
4. Re-run focused Jest coverage for the shared primitives and affected settings tests.
5. If local browser verification is performed, treat it as partial only; Linux visual verification is still pending for snapshot-sensitive surfaces.

## Testing Strategy

Primary unit coverage should focus on the shared primitives rather than every consuming component.

### `IconButton`

- applies press styling when active
- does not apply press animation when disabled

### `ToggleGroup` / `ToggleButton`

- applies press styling on toggle button press
- preserves selected-state styling
- preserves keyboard navigation and selection semantics

### Focused regression coverage

- existing settings dialog and toolbar tests should continue to pass where these controls are used

## Risks

### Overly strong motion

If the scale is too aggressive, compact icon buttons and segmented pills can feel jumpy or toy-like.

Mitigation:

- use a very small scale delta
- keep transition duration short

### Snapshot churn

Although this is primarily interaction polish, affected controls live in snapshot-sensitive views.

Mitigation:

- keep resting visuals unchanged
- call out Linux visual verification as pending unless explicitly run

### Inconsistent primitive coverage

If only some primitives get press feedback, the UI can feel uneven.

Mitigation:

- keep the first pass intentionally limited to actual button primitives
- expand later only if the result feels meaningfully incomplete

## Decision Summary

Proceed with CSS-only press feedback on actual button primitives only, starting with `IconButton` and `ToggleButton`, and do not attempt to restore full ripple behavior.
