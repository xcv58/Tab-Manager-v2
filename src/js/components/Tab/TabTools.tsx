import React from 'react'
import { observer } from 'mobx-react-lite'
import DragHandle from 'components/Tab/DragHandle'
import TabMenu from 'components/Tab/TabMenu'
import { useStore } from 'components/StoreContext'
import { TabProps } from 'components/types'

export default observer((props: TabProps & { faked?: boolean }) => {
  const { dragStore } = useStore()
  const {
    faked,
    tab: { isHovered }
  } = props
  const { dragging } = dragStore
  if (faked || dragging || !isHovered) {
    return null
  }
  return (
    <div className='flex'>
      <DragHandle />
      <TabMenu {...props} />
    </div>
  )
})
