import { formatTabMoveShortcut, isTabMoveShortcut } from './tabMoveShortcuts'

export const formatShortcutLabel = (shortcut: string) => {
  if (isTabMoveShortcut(shortcut)) return formatTabMoveShortcut(shortcut)
  const isMac =
    typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
  const names: Record<string, string> = {
    command: isMac ? '⌘' : 'Meta',
    meta: isMac ? '⌘' : 'Meta',
    ctrl: 'Ctrl',
    control: 'Ctrl',
    alt: isMac ? 'Option' : 'Alt',
    shift: 'Shift',
    enter: 'Enter',
    return: 'Enter',
    escape: 'Esc',
    esc: 'Esc',
    space: 'Space',
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    tab: 'Tab',
  }
  const modifierOrder = ['ctrl', 'control', 'command', 'meta', 'alt', 'shift']
  const chord = (value: string) =>
    value
      .split('+')
      .sort((a, b) => {
        const aIndex = modifierOrder.indexOf(a.toLowerCase())
        const bIndex = modifierOrder.indexOf(b.toLowerCase())
        return (
          (aIndex < 0 ? modifierOrder.length : aIndex) -
          (bIndex < 0 ? modifierOrder.length : bIndex)
        )
      })
      .map((key) => names[key.toLowerCase()] || key.toUpperCase())
      .join('+')
  return shortcut.includes(' ')
    ? shortcut
        .split(' ')
        .map((key) => (key.includes('+') ? chord(key) : key))
        .join(' → ')
    : chord(shortcut)
}
