import React from 'react'
import { observer } from 'mobx-react-lite'
import Checkbox from '@material-ui/core/Checkbox'
import Tooltip from '@material-ui/core/Tooltip'

export default observer(({ win }) => {
  const {
    allTabSelected,
    someTabSelected,
    disableSelectAll,
    toggleSelectAll
  } = win
  const title = `${allTabSelected ? 'Unselect' : 'Select'} all tabs`
  return (
    <Tooltip title={title}>
      <Checkbox
        color='primary'
        inputProps={{
          'aria-label': title
        }}
        disabled={disableSelectAll}
        checked={allTabSelected}
        onChange={(e) => {
          e.target.blur()
          toggleSelectAll()
        }}
        indeterminate={someTabSelected || disableSelectAll}
      />
    </Tooltip>
  )
})
