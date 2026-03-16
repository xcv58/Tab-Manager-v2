import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import DraggableTab from 'components/Tab/DraggableTab'
import { useStore, useTabHeight } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import GroupRow from 'components/TabGroup/GroupRow'

export default observer((props: WinProps) => {
  const { windowStore } = useStore()
  const rowHeight = useTabHeight()
  useEffect(() => {
    window.requestAnimationFrame(windowStore.windowMounted)
  }, [])

  const { win } = props
  if (win.hide) {
    return null
  }
  const { start, end } = windowStore.getVisibleRowRange(win)
  const visibleRows = win.rows.slice(start, end)
  const beforeHeight = start * rowHeight
  const afterHeight = Math.max(0, (win.rows.length - end) * rowHeight)
  const content = visibleRows.map((row) => {
    if (row.kind === 'group') {
      return <GroupRow key={`group-${row.groupId}`} row={row} win={win} />
    }
    const tab = win.getTabById(row.tabId)
    if (!tab) {
      return null
    }
    return <DraggableTab key={tab.id} tab={tab} />
  })
  return (
    <>
      {beforeHeight > 0 && <div style={{ height: beforeHeight }} />}
      {content}
      {afterHeight > 0 && <div style={{ height: afterHeight }} />}
    </>
  )
})
