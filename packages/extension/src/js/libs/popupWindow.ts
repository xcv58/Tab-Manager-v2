// Preserve Chrome's familiar starting size while keeping the whole window
// inside the available display. Existing manager windows are never resized.
type AvailableDisplay = {
  availWidth?: number
  availHeight?: number
  availLeft?: number
  availTop?: number
}

export const getPopupWindowBounds = (display: AvailableDisplay = {}) => {
  const available = (value: number | undefined, fallback: number) =>
    Number.isFinite(value) && value! > 0 ? value! : fallback
  const availWidth = available(display.availWidth, 1024)
  const availHeight = available(display.availHeight, 768)
  const availLeft = Number.isFinite(display.availLeft) ? display.availLeft! : 0
  const availTop = Number.isFinite(display.availTop) ? display.availTop! : 0
  const width = Math.floor(Math.min(availWidth, Math.max(1024, availWidth / 2)))
  const height = Math.floor(
    Math.min(availHeight, Math.max(768, availHeight / 2)),
  )
  return {
    width,
    height,
    left: Math.floor(availLeft + (availWidth - width) / 2),
    top: Math.floor(availTop + (availHeight - height) / 2),
  }
}
