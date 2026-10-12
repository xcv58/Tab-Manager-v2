import React from 'react'
import { observer } from 'mobx-react-lite'
import { RefreshIcon } from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import Tooltip from 'components/ui/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

export default observer(({ label }: { label?: string }) => {
  const store = useStore()
  const { hasFocusedOrSelectedTab, reload } = store
  const count = store._getFocusedOrSelectedTab().length
  const title = `Reload ${count} ${count === 1 ? 'tab' : 'tabs'}`
  return (
    <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        <IconButton
          onClick={reload}
          disabled={!hasFocusedOrSelectedTab}
          className="focus:outline-none"
          aria-label={title}
          style={
            label
              ? {
                  width: 'auto',
                  gap: 6,
                  padding: '0 8px',
                  height: 36,
                  borderRadius: 6,
                }
              : undefined
          }
        >
          <RefreshIcon fontSize={20} />
          {label && <span className="toolbar-action-label">{label}</span>}
        </IconButton>
      </div>
    </Tooltip>
  )
})
