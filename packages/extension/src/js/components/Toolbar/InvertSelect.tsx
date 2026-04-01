import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import { FlipIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Inverse select tabs'

export default observer(() => {
  const { searchStore } = useStore()
  const { invertSelect, matchedTabs } = searchStore
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={invertSelect}
          disabled={matchedTabs.length === 0}
          className="focus:outline-none"
          aria-label={TITLE}
        >
          <FlipIcon />
        </IconButton>
      </div>
    </Tooltip>
  )
})
