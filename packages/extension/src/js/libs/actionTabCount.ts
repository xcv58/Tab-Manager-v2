export const ACTION_TAB_COUNT_MODES = [
  'off',
  'currentWindow',
  'allWindows',
] as const

export type ActionTabCountMode = (typeof ACTION_TAB_COUNT_MODES)[number]

export const DEFAULT_ACTION_TAB_COUNT_MODE: ActionTabCountMode = 'off'

export const normalizeActionTabCountMode = (
  value: unknown,
): ActionTabCountMode => {
  if (
    typeof value === 'string' &&
    ACTION_TAB_COUNT_MODES.includes(value as ActionTabCountMode)
  ) {
    return value as ActionTabCountMode
  }

  return DEFAULT_ACTION_TAB_COUNT_MODE
}
