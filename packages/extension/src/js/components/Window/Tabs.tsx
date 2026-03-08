import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import DraggableTab from 'components/Tab/DraggableTab'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import GroupRow from 'components/TabGroup/GroupRow'

export default observer((props: WinProps) => {
  const { windowStore } = useStore()
  useEffect(() => {
    window.requestAnimationFrame(windowStore.windowMounted)
  }, [])

  const { win } = props
  if (win.hide) {
    return null
  }
  const content = win.rows.map((row) => {
    if (row.kind === 'group') {
      return <GroupRow key={`group-${row.groupId}`} row={row} win={win} />
    }
    const tab = win.getTabById(row.tabId)
    if (!tab) {
      return null
    }
    return <DraggableTab key={tab.id} tab={tab} />
  })
  return <>{content}</>
})
