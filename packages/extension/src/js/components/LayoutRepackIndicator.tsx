import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@mui/material/Tooltip'
import ViewColumn from '@mui/icons-material/ViewColumn'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/hooks/useStore'

const TITLE = 'Refresh layout'

export default observer(() => {
  const { windowStore } = useStore()

  if (!windowStore.layoutDirty) {
    return null
  }

  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <button
        onClick={() => windowStore.repackLayout('manual')}
        aria-label={TITLE}
        data-testid="layout-repack-button"
        className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded border border-amber-300 bg-amber-100 px-1.5 text-[9px] font-normal leading-none text-amber-900 hover:bg-amber-200"
      >
        <span
          data-testid="layout-dirty-indicator"
          className="h-1.5 w-1.5 rounded-full bg-orange-500"
          aria-hidden="true"
        />
        <ViewColumn sx={{ fontSize: 16 }} />
        Relayout
      </button>
    </Tooltip>
  )
})
