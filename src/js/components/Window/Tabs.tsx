import React, { useEffect } from 'react'
import { observer } from 'mobx-react'
import DraggableTab from 'components/Tab/DraggableTab'
import { useStore } from 'components/StoreContext'

export default observer((props) => {
  const { windowStore } = useStore()
  useEffect(() => {
    window.requestAnimationFrame(windowStore.windowMounted)
  }, [])
  return props.win.tabs
    .filter((x) => x.isVisible)
    .map((tab) => <DraggableTab key={tab.id} tab={tab} />)
})
