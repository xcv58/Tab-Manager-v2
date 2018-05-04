export const ItemTypes = {
  TAB: 'tab'
}

export const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  canDrop: monitor.canDrop(),
  isDragging: !!monitor.getItem(),
  isOver: monitor.isOver({ shallow: true })
})
