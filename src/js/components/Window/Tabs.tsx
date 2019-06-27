import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import FlipMove from 'react-flip-move'
import DraggableTab from 'components/Tab/DraggableTab'
import { useStore } from 'components/StoreContext'

export default observer(props => {
  const { windowStore } = useStore()
  useEffect(() => {
    window.requestAnimationFrame(windowStore.windowMounted)
  }, [])

  const {
    win: { tabs },
    getScrollbars,
    dragPreview
  } = props
  const tabsView = tabs.map(tab => (
    <DraggableTab key={tab.id} tab={tab} {...{ getScrollbars, dragPreview }} />
  ))
  return (
    <FlipMove
      duration={255}
      easing='ease-in-out'
      enterAnimation='accordionHorizontal'
      leaveAnimation='accordionHorizontal'
    >
      {tabsView}
    </FlipMove>
  )
})
