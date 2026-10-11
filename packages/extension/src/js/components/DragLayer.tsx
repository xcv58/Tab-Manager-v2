import React, { CSSProperties } from 'react'
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

const getPreviewStyle = (initialOffset, currentOffset) => {
  if (!initialOffset || !currentOffset) {
    return {
      display: 'none',
    }
  }

  const { x, y } = currentOffset

  const transform = `translate(clamp(8px, ${x + 12}px, calc(100vw - 100% - 8px)), clamp(8px, ${y + 12}px, calc(100vh - 100% - 8px)))`
  return {
    transform,
    width: 'max-content',
    maxWidth: 'calc(100vw - 16px)',
  }
}

export default () => {
  const { initialOffset, currentOffset, isDragging } = useDragLayer(
    (monitor) => ({
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getClientOffset(),
      isDragging: monitor.isDragging(),
    }),
  )
  return (
    <div style={layerStyles}>
      {isDragging && (
        <div style={getPreviewStyle(initialOffset, currentOffset)}>
          <DragPreview />
        </div>
      )}
    </div>
  )
}
