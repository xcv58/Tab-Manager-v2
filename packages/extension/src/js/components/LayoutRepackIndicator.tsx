import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from 'components/ui/Tooltip'
import { ViewColumnIcon } from 'icons/materialIcons'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'

const TITLE = 'Refresh layout'

export default observer(() => {
  const { windowStore } = useStore()
  const theme = useAppTheme()
  const isDark = theme.mode === 'dark'

  if (!windowStore.layoutDirty) {
    return null
  }

  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <button
        type="button"
        onClick={() => windowStore.repackLayoutAndRevealActiveTab('mouse')}
        aria-label={TITLE}
        data-testid="layout-repack-button"
        className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap border focus:outline-none transition-colors duration-200"
        style={{
          marginLeft: 6,
          marginRight: 6,
          paddingLeft: 9,
          paddingRight: 9,
          height: 28,
          borderRadius: 10,
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          cursor: 'pointer',
          boxShadow: isDark
            ? '0 1px 2px rgba(0, 0, 0, 0.45)'
            : '0 1px 2px rgba(15, 23, 42, 0.08)',
        }}
        onMouseEnter={(e) => {
          const t = e.currentTarget
          t.style.borderColor = theme.palette.primary.light
          t.style.backgroundColor = isDark
            ? 'rgba(144, 202, 249, 0.12)'
            : 'rgba(25, 118, 210, 0.08)'
          t.style.color = theme.palette.text.primary
          t.style.boxShadow = isDark
            ? '0 2px 5px rgba(0, 0, 0, 0.5)'
            : '0 2px 6px rgba(15, 23, 42, 0.14)'
        }}
        onMouseLeave={(e) => {
          const t = e.currentTarget
          t.style.borderColor = theme.palette.divider
          t.style.backgroundColor = theme.palette.background.paper
          t.style.color = theme.palette.text.secondary
          t.style.boxShadow = isDark
            ? '0 1px 2px rgba(0, 0, 0, 0.45)'
            : '0 1px 2px rgba(15, 23, 42, 0.08)'
        }}
      >
        <span
          data-testid="layout-dirty-indicator"
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: theme.palette.warning.main,
            boxShadow: isDark
              ? '0 0 0 1px rgba(0, 0, 0, 0.45)'
              : '0 0 0 1px rgba(255, 255, 255, 0.9)',
          }}
        />
        <ViewColumnIcon fontSize={16} />
        <span
          style={{
            fontSize: '0.72rem',
            lineHeight: 1,
            letterSpacing: '0.01em',
            fontWeight: 700,
          }}
        >
          Relayout
        </span>
      </button>
    </Tooltip>
  )
})
