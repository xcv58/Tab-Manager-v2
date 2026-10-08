// Demo-only configuration. Sample browser state never enters web storage.
const storageKey = 'tab-manager-v2:demo-preferences:v1'
const booleanKeys = [
  'showAppWindow',
  'showShortcutHint',
  'showUnmatchedTab',
  'autoFitColumns',
  'litePopupMode',
  'toolbarAutoHide',
  'highlightDuplicatedTab',
  'highlightActiveTabsInAllWindows',
  'increaseContrast',
  'showTabTooltip',
  'preserveSearch',
  'searchHistory',
  'showSearchResultMenu',
  'showUrl',
  'autoFocusSearch',
  'ignoreHash',
  'showTabIcon',
] as const
const enumValues: Record<string, readonly string[]> = {
  uiPreset: ['modern', 'classic'],
  actionTabCountMode: ['off', 'currentWindow', 'allWindows'],
  windowOrder: ['default', 'lastUsed'],
}

const numberRanges: Array<[string, number, number]> = [
  ['fontSize', 6, 36],
  ['tabWidth', 15, 50],
]

const sanitizePreferences = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const settings: Record<string, unknown> = {}
  booleanKeys.forEach((key) => {
    if (typeof source[key] === 'boolean') settings[key] = source[key]
  })
  Object.entries(enumValues).forEach(([key, values]) => {
    if (typeof source[key] === 'string' && values.includes(source[key]))
      settings[key] = source[key]
  })
  numberRanges.forEach(([key, min, max]) => {
    const value = source[key]
    if (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= min &&
      value <= max
    )
      settings[key] = value
  })
  return settings
}

export const readDemoPreferences = (): Record<string, unknown> => {
  try {
    const saved = JSON.parse(
      window.sessionStorage.getItem(storageKey) || 'null',
    )
    return saved?.version === 1 ? sanitizePreferences(saved.settings) : {}
  } catch {
    return {}
  }
}

export const clearDemoPreferences = () => {
  try {
    window.sessionStorage.removeItem(storageKey)
  } catch {
    // The demo still works when the browser denies storage access.
  }
}

export const saveDemoPreferences = (value: Record<string, unknown>) => {
  const settings = sanitizePreferences(value)
  if (!Object.keys(settings).length) return clearDemoPreferences()
  try {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ version: 1, settings }),
    )
  } catch {
    // Preserve the running workspace when storage is denied or full.
  }
}
