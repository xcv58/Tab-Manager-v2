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

const getWindowTarget = (begin = false) => {
  const canDrop = props => props.win.canDrop
  const drop = (props, monitor) => {
    if (monitor.didDrop()) {
      return
    }
    const {
      win: { tabs },
      dragStore: { drop }
    } = props
    const func = begin ? findFirstVisibleOrFirstTab : findLastVisibleOrLastTab
    const tab = func(tabs)
    if (tab) {
      drop(tab, begin)
    }
  }
  return { canDrop, drop }
}

export const titleTarget = getWindowTarget(true)
export const windowTarget = getWindowTarget()
