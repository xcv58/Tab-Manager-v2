export const TAB_MOVE_SHORTCUTS = {
  beginning: ['m g g', 'alt+shift+up'],
  end: ['m shift+g', 'alt+shift+down'],
  before: ['m shift+p', 'alt+shift+left'],
  after: ['m p', 'alt+shift+right'],
} as const

export type TabMovePosition = keyof typeof TAB_MOVE_SHORTCUTS

export const TAB_MOVE_LABELS: Record<TabMovePosition, string> = {
  beginning: 'Move selected to window beginning',
  end: 'Move selected to window end',
  before: 'Move selected before focused tab',
  after: 'Move selected after focused tab',
}

const vimLabels: Record<string, string> = {
  'm g g': 'm → g → g',
  'm shift+g': 'm → G',
  'm shift+p': 'm → P',
  'm p': 'm → p',
}

const arrows: Record<string, string> = {
  'alt+shift+up': '↑',
  'alt+shift+down': '↓',
  'alt+shift+left': '←',
  'alt+shift+right': '→',
}

export const isTabMoveShortcut = (shortcut: string) =>
  shortcut in vimLabels || shortcut in arrows

export const formatTabMoveShortcut = (shortcut: string) => {
  if (vimLabels[shortcut]) {
    return vimLabels[shortcut]
  }
  if (arrows[shortcut]) {
    const modifier =
      typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
        ? 'Option'
        : 'Alt'
    return `${modifier}+Shift+${arrows[shortcut]}`
  }
  return shortcut
}

export const getTabMoveAriaShortcut = (position: TabMovePosition) =>
  `Alt+Shift+Arrow${
    { beginning: 'Up', end: 'Down', before: 'Left', after: 'Right' }[position]
  }`
