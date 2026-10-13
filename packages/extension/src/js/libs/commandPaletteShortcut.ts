export const isMac = () =>
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

export const getCommandPaletteShortcut = () => (isMac() ? 'command+k' : 'alt+k')

export const getCommandPaletteShortcutLabel = () => (isMac() ? '⌘K' : 'Alt+K')

export const getCommandPaletteAriaShortcut = () =>
  isMac() ? 'Meta+K' : 'Alt+K'
