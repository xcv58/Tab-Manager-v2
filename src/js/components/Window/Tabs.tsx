import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import DraggableTab from 'components/Tab/DraggableTab'
import { useStore } from 'components/StoreContext'
import Tab from 'components/Tab/Tab'

export default observer(props => {
  const { userStore, windowStore } = useStore()
  useEffect(() => {
    window.requestAnimationFrame(windowStore.windowMounted)
  }, [])

  const {
    win: { tabs },
    getScrollbars
  } = props
  const tabsView = tabs.map(tab =>
    userStore.enableDragDrop ? (
      <DraggableTab key={tab.id} tab={tab} {...{ getScrollbars }} />
    ) : (
      <Tab key={tab.id} tab={tab} {...{ getScrollbars }} />
    )
  )
  return <>{tabsView}</>
})
