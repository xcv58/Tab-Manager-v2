import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import { OpenInNewIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

export default observer(({ label }: { label?: string }) => {
  const { dragStore, tabStore } = useStore()
  const { dropToNewWindow } = dragStore
  const { selection } = tabStore
  const title = `Move ${selection.size} selected ${selection.size === 1 ? 'tab' : 'tabs'} to a new window`
  return (
    <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={() => dropToNewWindow()}
          disabled={selection.size === 0 || !!dragStore.pendingWindowEdgeDrop}
          className="focus:outline-none"
          aria-label={title}
          style={
            label
              ? {
                  width: 'auto',
                  gap: 6,
                  padding: '0 8px',
                  height: 'auto',
                  minHeight: 36,
                  lineHeight: 1.3,
                  borderRadius: 6,
                }
              : undefined
          }
        >
          <OpenInNewIcon fontSize={20} />
          {label && <span className="toolbar-action-label">{label}</span>}
        </IconButton>
      </div>
    </Tooltip>
  )
})
