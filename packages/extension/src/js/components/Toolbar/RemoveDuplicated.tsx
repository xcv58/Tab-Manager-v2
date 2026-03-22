import React from 'react'
import { observer } from 'mobx-react-lite'
import { DeleteSweepIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { TOOLTIP_DELAY, getNoun } from 'libs'
import { useStore } from 'components/hooks/useStore'

export default observer(() => {
  const { windowStore } = useStore()
  const { cleanDuplicatedTabs, getDuplicateTabsToRemoveCount } = windowStore
  const duplicatedTabsToRemoveCount = getDuplicateTabsToRemoveCount()
  const title = duplicatedTabsToRemoveCount
    ? `Clean ${duplicatedTabsToRemoveCount} duplicate ${getNoun(
        'tab',
        duplicatedTabsToRemoveCount,
      )}`
    : 'Clean duplicated tabs'
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
