import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'
import CloseButton from 'components/CloseButton'
import IconButton from 'components/ui/IconButton'
import { CloseIcon } from 'icons/materialIcons'
import { useAppTheme } from 'libs/appTheme'

export default observer(
  ({
    label,
    focusedOnly = false,
  }: {
    label?: string
    focusedOnly?: boolean
  }) => {
    const store = useStore()
    const theme = useAppTheme()
    const { hasFocusedOrSelectedTab, remove } = store
    const count = store._getFocusedOrSelectedTab().length
    const selectionActive = focusedOnly && store.tabStore.selection.size > 0
    const disabled = selectionActive || !hasFocusedOrSelectedTab
    const title = selectionActive
      ? 'Close selected tabs from the selection palette'
      : `Close ${count} ${count === 1 ? 'tab' : 'tabs'}`
    return (
      <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
        <div className="flex">
          {label ? (
            <IconButton
              tone="danger"
              onClick={remove}
              disabled={disabled}
              aria-label={title}
              style={{
                width: 'auto',
                minWidth: 64,
                gap: 6,
                padding: '0 8px',
                height: 'auto',
                minHeight: 36,
                lineHeight: 1.3,
                fontVariantNumeric: 'tabular-nums',
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
                disabled,
                'aria-label': title,
              }}
            />
          )}
        </div>
      </Tooltip>
    )
  },
)
