import React from 'react'
import { observer } from 'mobx-react-lite'
import Checkbox from 'components/ui/Checkbox'
import Tooltip from 'components/ui/Tooltip'
import { DEFAULT_CONTROL_SIZE } from 'libs/layoutMetrics'

export default observer(({ win }: { win: any }) => {
  const { allTabSelected, someTabSelected, disableSelectAll, toggleSelectAll } =
    win
  const title = `${allTabSelected ? 'Unselect' : 'Select'} all tabs`
  return (
    <Tooltip title={title}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center"
        style={{ width: DEFAULT_CONTROL_SIZE, height: DEFAULT_CONTROL_SIZE }}
      >
        <Checkbox
          aria-label={title}
          disabled={disableSelectAll}
          checked={allTabSelected}
          onChange={(e) => {
            e.target.blur()
            toggleSelectAll()
          }}
          indeterminate={someTabSelected || disableSelectAll}
        />
      </span>
    </Tooltip>
  )
})
