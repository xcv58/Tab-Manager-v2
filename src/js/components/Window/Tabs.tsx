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
    getScrollbars
  } = props
  const tabsView = tabs.map(tab => (
    <DraggableTab key={tab.id} tab={tab} {...{ getScrollbars }} />
  ))
  return <>{tabsView}</>
})
