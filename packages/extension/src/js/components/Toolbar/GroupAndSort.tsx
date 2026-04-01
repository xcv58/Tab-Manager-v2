import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import { FilterListIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Cluster Ungrouped & Sort Tabs'

export default observer(() => {
  const { arrangeStore } = useStore()

  const { groupTabs } = arrangeStore
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={() => groupTabs()}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <FilterListIcon />
        </IconButton>
      </div>
    </Tooltip>
  )
})
