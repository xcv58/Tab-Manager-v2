import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import DraggableTab from 'components/Tab/DraggableTab'
import { useStore, useTabHeight } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import GroupRow from 'components/TabGroup/GroupRow'

export default observer((props: WinProps) => {
  const { windowStore, dragStore } = useStore()
  const rowHeight = useTabHeight()
  useEffect(() => {
    window.requestAnimationFrame(windowStore.windowMounted)
  }, [])

  const { win } = props
  if (win.hide) {
    return null
  }
  const { start, end } = windowStore.getVisibleRowRange(win)
  const rows = win.rows
  const indices = new Set<number>()
  for (let index = start; index < end; index += 1) indices.add(index)
  const pinnedIndex =
    dragStore?.dragOriginWindowId === win.id ? dragStore.dragOriginRowIndex : -1
  if (pinnedIndex >= 0 && pinnedIndex < rows.length) indices.add(pinnedIndex)
  const content: React.ReactNode[] = []
  let nextIndex = 0
  // Keep only the native drag source mounted outside the viewport. All rows
  // remain siblings with stable keys, so crossing a virtual boundary does not
  // replace the source DOM node or cancel its browser drag session.
  Array.from(indices)
    .sort((a, b) => a - b)
    .forEach((index) => {
      if (index > nextIndex) {
        content.push(
          <div
            key={`spacer-${nextIndex}-${index}`}
            style={{ height: (index - nextIndex) * rowHeight }}
          />,
        )
      }
      nextIndex = index + 1
      const row = rows[index]
      if (row.kind === 'group') {
        content.push(
          <GroupRow key={`group-${row.groupId}`} row={row} win={win} />,
        )
        return
      }
      const tab = win.getTabById(row.tabId)
      if (!tab) {
        return
      }
      content.push(<DraggableTab key={tab.id} tab={tab} />)
    })
  if (nextIndex < rows.length) {
    content.push(
      <div
        key={`spacer-${nextIndex}-${rows.length}`}
        style={{ height: (rows.length - nextIndex) * rowHeight }}
      />,
    )
  }
  return <>{content}</>
})
