import { isPopupMode } from './popupMode'
import { getCommandPaletteShortcut } from './commandPaletteShortcut'

export const isLitePopupMode = (enabled: boolean) =>
  !!enabled && typeof window !== 'undefined' && isPopupMode()

export const isLiteShortcut = (shortcut: string) =>
  new Set([
    'escape',
    '/',
    '>',
    getCommandPaletteShortcut(),
    'command+shift+p',
    'enter',
    'ctrl+enter',
    'ctrl+o',
    'ctrl+i',
    'ctrl+,',
    '?',
    'ctrl+/',
    'p',
    'ctrl+p',
    'r',
    'ctrl+r',
    'd d',
    'c c',
    'c t',
    'alt+down',
  ]).has(shortcut)
