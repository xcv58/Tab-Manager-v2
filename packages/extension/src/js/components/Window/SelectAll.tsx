import React from 'react'
import { observer } from 'mobx-react-lite'
import { Checkbox } from '@material-tailwind/react'
import { Tooltip } from '@material-tailwind/react'

export default observer(({ win }) => {
  const { allTabSelected, someTabSelected, disableSelectAll, toggleSelectAll } =
    win
  const title = `${allTabSelected ? 'Unselect' : 'Select'} all tabs`
  return (
    <Tooltip content={title}>
      <div className="flex justify-center w-12">
        <Checkbox
          disabled={disableSelectAll}
          checked={allTabSelected}
          onChange={(e) => {
            e.target.blur()
            toggleSelectAll()
          }}
          indeterminate={someTabSelected || disableSelectAll}
        />
      </div>
    </Tooltip>
  )
})
