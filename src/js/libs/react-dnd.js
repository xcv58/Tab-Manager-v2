export const ItemTypes = {
  TAB: 'tab'
}

export const tabDropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  canDrop: monitor.canDrop(),
  isDragging: !!monitor.getItem(),
  isOver: monitor.isOver({ shallow: true })
})
