import React, { CSSProperties, useLayoutEffect, useRef, useState } from 'react'
import { useDragLayer } from 'react-dnd'
import DragPreview from './DragPreview'

const layerStyles: CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
}

const aboveCursorGap = 24
// Leave extra space for the native drag cursor below/right of its hotspot.
const belowCursorGap = 48
const viewportMargin = 8
type DragOffset = { x: number; y: number }
type ViewportSize = { width: number; height: number }

const getPreviewStyle = (
  initialOffset: DragOffset | null,
  currentOffset: DragOffset | null,
  previewHeight: number,
  viewportSize: ViewportSize,
): CSSProperties => {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    }
  }

  const { x, y } = currentOffset
  const fitsAbove = y - aboveCursorGap - previewHeight >= viewportMargin
  const fitsBelow =
    y + belowCursorGap + previewHeight <= viewportSize.height - viewportMargin
  // Percentages follow the badge's actual size even while its text wraps.
  const top = fitsAbove
    ? `calc(${y - aboveCursorGap}px - 100%)`
    : fitsBelow
      ? `${y + belowCursorGap}px`
      : `calc(${y}px - 50%)`
  let left = `clamp(8px, ${x + (fitsAbove ? 12 : 24)}px, calc(100vw - 100% - 8px))`
  let maxWidth = 'calc(100vw - 16px)'
  if (!fitsAbove && !fitsBelow) {
    // Keep the cursor clear when neither vertical position fits. Constrain
    // the width to the available side so the message wraps within the viewport.
    const leftSpace = x - aboveCursorGap - viewportMargin
    const rightSpace = viewportSize.width - x - belowCursorGap - viewportMargin
    const useLeft = leftSpace >= rightSpace
    left = useLeft
      ? `calc(${x - aboveCursorGap}px - 100%)`
      : `${x + belowCursorGap}px`
    maxWidth = `${Math.max(1, useLeft ? leftSpace : rightSpace)}px`
  }
  const transform = `translate(${left}, clamp(8px, ${top}, calc(100vh - 100% - 8px)))`
  return {
    transform,
    width: 'max-content',
    maxWidth,
    visibility: previewHeight > 0 ? 'visible' : 'hidden',
  }
}

export default () => {
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewHeight, setPreviewHeight] = useState(0)
  const [viewportSize, setViewportSize] = useState<ViewportSize>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  const { initialOffset, currentOffset, isDragging } = useDragLayer(
    (monitor) => ({
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getClientOffset(),
      isDragging: monitor.isDragging(),
    }),
  )

  useLayoutEffect(() => {
    const preview = previewRef.current
    if (!isDragging || !preview) return

    const measure = () => {
      setPreviewHeight(preview.getBoundingClientRect().height)
      setViewportSize((previous) => {
        const width = window.innerWidth
        const height = window.innerHeight
        return previous.width === width && previous.height === height
          ? previous
          : { width, height }
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(preview)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [isDragging])

  return (
    <div style={layerStyles}>
      {isDragging && (
        <div
          ref={previewRef}
          style={getPreviewStyle(
            initialOffset,
            currentOffset,
            previewHeight,
            viewportSize,
          )}
        >
          <DragPreview />
        </div>
      )}
    </div>
  )
}
