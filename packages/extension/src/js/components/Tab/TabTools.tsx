import React from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import DragHandle from 'components/Tab/DragHandle'
import TabMenu from 'components/Tab/TabMenu'
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
    <div className="flex h-10 items-center gap-0.5">
      <div
        className={classNames('shrink-0 transition-opacity duration-150', {
          'opacity-100': emphasizeTools,
          'pointer-events-none opacity-0': !emphasizeTools,
        })}
      >
        <TabMenu {...props} />
      </div>
      <DragHandle
        className={classNames({
          'opacity-100 pointer-events-auto': emphasizeTools,
          'opacity-0 pointer-events-none': !emphasizeTools,
        })}
      />
    </div>
  )
})
