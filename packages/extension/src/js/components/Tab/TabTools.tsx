import React from 'react'
import { observer } from 'mobx-react-lite'
import DragHandle from 'components/Tab/DragHandle'
import TabMenu from 'components/Tab/TabMenu'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from 'components/types'

const IS_SAFARI = process.env.IS_SAFARI === 'true'

export default observer((props: TabProps) => {
  const { dragStore } = useStore()
  const {
    faked,
    tab: { isHovered },
  } = props
  const { dragging } = dragStore
  if (faked || dragging || !isHovered) {
    return null
  }
  return (
    <div className="flex items-center">
      {!IS_SAFARI && <DragHandle />}
      <TabMenu {...props} />
    </div>
  )
})
