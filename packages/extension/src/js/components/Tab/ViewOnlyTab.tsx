import React from 'react'
import { observer } from 'mobx-react-lite'
import Icon from 'components/Tab/Icon'
import TabTools from 'components/Tab/TabTools'
import TabContent from 'components/Tab/TabContent'
import { TabProps } from 'components/types'
import PIN from './Pin'
import DuplicateMarker from './DuplicateMarker'
import ContainerOrGroupIndicator from './ContainerOrGroupIndicator'
import CloseButton from 'components/CloseButton'
import RowActionSlot from 'components/RowActionSlot'
import { MIN_INTERACTIVE_ROW_HEIGHT } from 'libs/layoutMetrics'

export default observer((props: TabProps) => {
  const { tab } = props
  const pin = tab.pinned && PIN

  const onRemove = (event: React.SyntheticEvent) => {
    event.stopPropagation()
    const { removing, remove } = tab
    if (!removing) {
      remove()
    }
  }

  return (
    <div tabIndex={-1} className="relative flex w-full">
      {pin}
      <Icon tab={tab} faked />
      <TabContent tab={tab} faked />
      <div
        className="flex h-10 shrink-0 items-center gap-0.5 pr-1"
        style={{ minHeight: MIN_INTERACTIVE_ROW_HEIGHT }}
      >
        <TabTools tab={tab} faked />
        <RowActionSlot>
          <CloseButton
            onClick={onRemove}
            disabled={tab.removing}
            size="compact"
          />
        </RowActionSlot>
        <DuplicateMarker tab={tab} faked />
      </div>
      <ContainerOrGroupIndicator
        groupId={tab.groupId}
        cookieStoreId={tab.cookieStoreId}
      />
    </div>
  )
})
