export type ChromeTabGroupColorMeta = {
  chipText: string
  line: string
}

export const CHROME_TAB_GROUP_COLOR_ORDER: chrome.tabGroups.ColorEnum[] = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
]

const DEFAULT_COLOR: ChromeTabGroupColorMeta = {
  chipText: '#ffffff',
  line: '#5f6368',
}

const COLOR_MAP: Record<chrome.tabGroups.ColorEnum, ChromeTabGroupColorMeta> = {
  grey: {
    chipText: '#ffffff',
    line: '#5f6368',
  },
  blue: {
    chipText: '#ffffff',
    line: '#1a73e8',
  },
  red: {
    chipText: '#ffffff',
    line: '#d93025',
  },
  yellow: {
    chipText: '#202124',
    line: '#f9ab00',
  },
  green: {
    chipText: '#ffffff',
    line: '#188038',
  },
  pink: {
    chipText: '#ffffff',
    line: '#c52287',
  },
  purple: {
    chipText: '#ffffff',
    line: '#9334e6',
  },
  cyan: {
    chipText: '#ffffff',
    line: '#0b7d88',
  },
  orange: {
    chipText: '#202124',
    line: '#fa903e',
  },
}

export const getChromeTabGroupColor = (
  color?: string,
): ChromeTabGroupColorMeta => {
  const colorId = color as chrome.tabGroups.ColorEnum
  return COLOR_MAP[colorId] || DEFAULT_COLOR
}
