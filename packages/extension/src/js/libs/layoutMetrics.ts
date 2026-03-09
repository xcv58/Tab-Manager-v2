export const MIN_INTERACTIVE_ROW_HEIGHT = 30
export const DEFAULT_CONTROL_SIZE = 30
export const COMPACT_ACTION_SLOT_HEIGHT = 30

export const getWindowRowHeight = (fontSize: number) =>
  Math.max(fontSize * 3, MIN_INTERACTIVE_ROW_HEIGHT)
