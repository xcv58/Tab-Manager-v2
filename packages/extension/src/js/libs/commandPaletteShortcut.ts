export const isMac = () =>
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

export const getCommandPaletteShortcut = () =>
  isMac() ? 'command+shift+k' : 'alt+shift+k'

export const getCommandPaletteShortcutLabel = () =>
  isMac() ? '⌘ Shift K' : 'Alt Shift K'

export const getCommandPaletteAriaShortcut = () =>
  isMac() ? 'Meta+Shift+K' : 'Alt+Shift+K'
