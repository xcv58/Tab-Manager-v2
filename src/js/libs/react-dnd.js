import { findLastVisibleOrLastTab, findFirstVisibleOrFirstTab } from 'libs'

export const ItemTypes = {
  TAB: 'tab'
}

export const tabDropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  canDrop: monitor.canDrop(),
  isDragging: !!monitor.getItem(),
  isOver: monitor.isOver({ shallow: true })
})

const canDrop = props => props.win.canDrop

const getTargetTab = (tabs, begin) => {
  if (begin) {
    return findFirstVisibleOrFirstTab(tabs)
  }
  return findLastVisibleOrLastTab(tabs)
}

const getWindowTarget = (begin = false) => {
  const drop = (props, monitor) => {
    if (monitor.didDrop()) {
      return
    }
    const tab = getTargetTab(props.win.tabs, begin)
    if (tab) {
      props.dragStore.drop(tab, begin)
    }
  }
  return { canDrop, drop }
}

export const titleTarget = getWindowTarget(true)
export const windowTarget = getWindowTarget()
