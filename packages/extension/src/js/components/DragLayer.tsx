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

const cursorGap = 24
const viewportMargin = 8
type DragOffset = { x: number; y: number }

const getPreviewStyle = (
  initialOffset: DragOffset | null,
  currentOffset: DragOffset | null,
  previewHeight: number,
): CSSProperties => {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    }
  }

  const { x, y } = currentOffset
  const fitsAbove = y - cursorGap - previewHeight >= viewportMargin
  // Percentages follow the badge's actual size even while its text wraps.
  const top = fitsAbove
    ? `calc(${y - cursorGap}px - 100%)`
    : `${y + cursorGap}px`
  const transform = `translate(clamp(8px, ${x + 12}px, calc(100vw - 100% - 8px)), clamp(8px, ${top}, calc(100vh - 100% - 8px)))`
  return {
    transform,
    width: 'max-content',
    maxWidth: 'calc(100vw - 16px)',
    visibility: previewHeight > 0 ? 'visible' : 'hidden',
  }
}

export default () => {
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewHeight, setPreviewHeight] = useState(0)
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
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(preview)
    return () => observer.disconnect()
  }, [isDragging])

  return (
    <div style={layerStyles}>
      {isDragging && (
        <div
          ref={previewRef}
          style={getPreviewStyle(initialOffset, currentOffset, previewHeight)}
        >
          <DragPreview />
        </div>
      )}
    </div>
  )
}
