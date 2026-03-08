export const MIN_INTERACTIVE_ROW_HEIGHT = 40

export const getWindowRowHeight = (fontSize: number) =>
  Math.max(fontSize * 3, MIN_INTERACTIVE_ROW_HEIGHT)
