import { findLastVisibleOrLastTab, findFirstVisibleOrFirstTab } from './index'

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

export const tabSource = {
  beginDrag (props) {
    const {
      tab,
      dragStore: { dragStart }
    } = props
    dragStart(tab)
    return {}
  },
  endDrag (props) {
    props.dragStore.dragEnd()
  },
  isDragging (props) {
    return props.tab.isSelected
  }
}

export const tabTarget = {
  canDrop (props) {
    return props.tab.win.canDrop
  },
  drop (props) {
    const {
      tab,
      dragStore: { drop }
    } = props
    drop(tab)
  }
}

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
