export type OverlayPositionInput = {
  top: number
  left: number
  width: number
  height: number
  margin: number
}

const clampAxis = (
  value: number,
  size: number,
  viewportSize: number,
  margin: number,
) => {
  const max = Math.max(margin, viewportSize - size - margin)
  return Math.min(Math.max(value, margin), max)
}

export const clampOverlayPosition = ({
  top,
  left,
  width,
  height,
  margin,
}: OverlayPositionInput) => {
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth || 0
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight || 0

  return {
    top: clampAxis(top, height, viewportHeight, margin),
    left: clampAxis(left, width, viewportWidth, margin),
  }
}
