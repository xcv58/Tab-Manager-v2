import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'
import CloseButton from 'components/CloseButton'
import IconButton from 'components/ui/IconButton'
import { CloseIcon } from 'icons/materialIcons'
import { useAppTheme } from 'libs/appTheme'

export default observer(({ label }: { label?: string }) => {
  const store = useStore()
  const theme = useAppTheme()
  const { hasFocusedOrSelectedTab, remove } = store
  const count = store._getFocusedOrSelectedTab().length
  const title = `Close ${count} ${count === 1 ? 'tab' : 'tabs'}`
  return (
    <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
      <div className="flex">
        {label ? (
          <IconButton
            tone="danger"
            onClick={remove}
            disabled={!hasFocusedOrSelectedTab}
            aria-label={title}
            style={{
              width: 'auto',
              gap: 6,
              padding: '0 8px',
              height: 36,
              borderRadius: 6,
              color:
                theme.mode === 'dark'
                  ? theme.palette.danger.hoverColor
                  : theme.palette.danger.activeColor,
            }}
          >
            <CloseIcon fontSize={20} />
            <span>{label}</span>
          </IconButton>
        ) : (
          <CloseButton
            {...{
              onClick: remove,
              disabled: !hasFocusedOrSelectedTab,
              'aria-label': title,
            }}
          />
        )}
      </div>
    </Tooltip>
  )
})
