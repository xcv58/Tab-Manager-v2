import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import DraggableTab from 'components/Tab/DraggableTab'
import { useStore } from 'components/StoreContext'

export default observer((props) => {
  const { windowStore } = useStore()
  useEffect(() => {
    window.requestAnimationFrame(windowStore.windowMounted)
  }, [])

  const { win } = props
  if (win.hide) {
    return null
  }
  return win.tabs
    .filter((x) => x.isVisible)
    .map((tab) => <DraggableTab key={tab.id} tab={tab} />)
})
