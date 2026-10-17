import React from 'react'
import { observer } from 'mobx-react-lite'
import { DeleteSweepIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import Tooltip from 'components/ui/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

export default observer(() => {
  const { windowStore } = useStore()
  const { cleanDuplicatedTabs, getDuplicateTabsToRemoveCount } = windowStore
  const duplicatedTabsToRemoveCount = getDuplicateTabsToRemoveCount()
  const title = `Close ${duplicatedTabsToRemoveCount} duplicate ${duplicatedTabsToRemoveCount === 1 ? 'tab' : 'tabs'}`
  return (
    <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={cleanDuplicatedTabs}
          disabled={duplicatedTabsToRemoveCount === 0}
          className="focus:outline-none"
          aria-label={title}
        >
          <DeleteSweepIcon />
        </IconButton>
      </div>
    </Tooltip>
  )
})
