import React from 'react'
import { observer } from 'mobx-react-lite'
import DragHandle from 'components/Tab/DragHandle'
import TabMenu from 'components/Tab/TabMenu'
import RowActionSlot from 'components/RowActionSlot'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from 'components/types'

export default observer((props: TabProps) => {
  const { dragStore } = useStore()
  const {
    faked,
    tab: { isFocused, isHovered },
  } = props
  const { dragging } = dragStore
  if (faked || dragging) {
    return null
  }
  const emphasizeTools = isHovered || isFocused
  return (
    <div className="flex h-10 shrink-0 items-center gap-0.5">
      <RowActionSlot visible={emphasizeTools}>
        <TabMenu {...props} />
      </RowActionSlot>
      <RowActionSlot visible={emphasizeTools}>
        <DragHandle />
      </RowActionSlot>
    </div>
  )
})
