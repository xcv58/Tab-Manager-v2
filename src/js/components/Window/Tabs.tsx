import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
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
  // TODO: The FlipMove will lead to zombie tabs after drag tab(s) to another window
  return <>{tabsView}</>
})
