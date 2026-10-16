import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import { FlipIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

export default observer(() => {
  const { searchStore } = useStore()
  const { invertSelect, matchedTabs } = searchStore
  const title = searchStore.queryActive
    ? 'Invert matching tab selection'
    : 'Invert tab selection'
  return (
    <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={invertSelect}
          disabled={matchedTabs.length === 0}
          className="focus:outline-none"
          aria-label={title}
          style={{
            width: 'auto',
            gap: 6,
            padding: '0 8px',
            height: 'auto',
            minHeight: 36,
            lineHeight: 1.3,
            borderRadius: 6,
          }}
        >
          <FlipIcon fontSize={20} />
          <span>Invert</span>
        </IconButton>
      </div>
    </Tooltip>
  )
})
