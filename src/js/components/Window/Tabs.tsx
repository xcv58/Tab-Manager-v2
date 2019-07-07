import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import DraggableTab from 'components/Tab/DraggableTab'
import FlipMove from 'react-flip-move'
import { useStore } from 'components/StoreContext'

export default observer(props => {
  const { windowStore } = useStore()
  useEffect(() => {
    window.requestAnimationFrame(windowStore.windowMounted)
  }, [])

  const {
    win: { tabs },
    getScrollbars
  } = props
  const tabsView = tabs.map(tab => (
    <div key={tab.id}>
      <DraggableTab tab={tab} {...{ getScrollbars }} />
    </div>
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
