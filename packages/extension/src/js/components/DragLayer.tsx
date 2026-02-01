import React, { CSSProperties } from 'react'
import { useDragLayer } from 'libs/react-dnd'
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

  const transform = `translate(${x}px, ${y}px)`
  return {
    transform,
    WebkitTransform: transform,
  }
}

const IS_SAFARI = process.env.IS_SAFARI === 'true'

export default () => {
  if (IS_SAFARI) {
    return null
  }
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
