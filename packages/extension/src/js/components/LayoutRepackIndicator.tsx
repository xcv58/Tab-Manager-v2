import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import { ViewColumnIcon } from 'icons/materialIcons'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'

const TITLE = 'Relayout all columns'

export default observer(({ enabled }: { enabled: boolean }) => {
  const { windowStore } = useStore()
  const theme = useAppTheme()
  const isDark = theme.mode === 'dark'

  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <button
        type="button"
        onClick={(event) => {
          if (!enabled) return
          windowStore.repackLayoutAndRevealActiveTab(
            event.detail === 0 ? 'keyboard' : 'mouse',
          )
        }}
        aria-label={TITLE}
        aria-disabled={!enabled || undefined}
        data-testid="layout-repack-button"
        className="header-relayout-button inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap border focus:outline-none focus:ring transition-colors duration-200"
        style={
          {
            '--relayout-border': theme.palette.divider,
            '--relayout-background': theme.palette.background.paper,
            '--relayout-color': theme.palette.text.secondary,
            '--relayout-hover-border': theme.palette.primary.light,
            '--relayout-hover-background': isDark
              ? 'rgba(144, 202, 249, 0.12)'
              : 'rgba(25, 118, 210, 0.08)',
            '--relayout-hover-color': theme.palette.text.primary,
          } as React.CSSProperties
        }
      >
        <span
          data-testid="layout-dirty-indicator"
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            flexShrink: 0,
            borderRadius: '50%',
            backgroundColor: theme.palette.warning.main,
          }}
        />
        <ViewColumnIcon fontSize={16} />
        <span className="header-relayout-label">Relayout</span>
      </button>
    </Tooltip>
  )
})
