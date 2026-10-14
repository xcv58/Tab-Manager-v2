import { NOT_POPUP } from 'libs'
import { getCommandPaletteShortcut } from './commandPaletteShortcut'

export const isLitePopupMode = (enabled: boolean) =>
  !!enabled &&
  typeof window !== 'undefined' &&
  !new URLSearchParams(window.location.search).has(NOT_POPUP)

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
