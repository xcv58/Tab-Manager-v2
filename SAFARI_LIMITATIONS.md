# Safari Limitations

The Safari version of Tab Manager v2 has some features disabled compared to the Chrome and Firefox versions. This is due to limitations in Safari's WebExtensions API support.

## Disabled Features

### Drag and Drop

Safari does not support `browser.tabs.move()`, which is required to reorder or move tabs between windows via drag and drop. As a result, the following are hidden:

- **Drag handle** on individual tabs
- **Drop targets** on windows and the toolbar
- **Drag layer** (visual preview while dragging)

### Sort and Group

Because tabs cannot be moved programmatically, sorting and grouping features are non-functional:

- **Sort button** on window title bars
- **Group & Sort** toolbar button
- **"Group N same domain tabs to this window"** context menu item

### New Window

- **New Window** toolbar button (opening selected tabs in a new window)

### Keyboard Shortcuts

The following shortcuts are removed since their underlying actions are unsupported:

| Shortcut       | Action                                |
| -------------- | ------------------------------------- |
| `Ctrl+S`       | Sort tabs                             |
| `Shift+Ctrl+S` | Group and sort tabs                   |
| `Ctrl+G`       | Group same domain tabs to this window |
| `Shift+N`      | Open selected tab(s) in a new window  |

### Tab Icons

Safari does not reliably return `favIconUrl` for tabs. The **Show Tab Icon** setting is disabled and hidden from the settings dialog.

## Implementation

These features are conditionally excluded at build time using the `IS_SAFARI` environment variable set by webpack's `DefinePlugin`. The Safari build produces a bundle that omits the unsupported UI elements entirely rather than showing non-functional controls.
