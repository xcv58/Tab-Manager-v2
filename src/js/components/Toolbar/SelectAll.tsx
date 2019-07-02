import React from 'react'
import { observer } from 'mobx-react'
import Checkbox from '@material-ui/core/Checkbox'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { searchStore } = useStore()
  const { allTabSelected, someTabSelected } = searchStore
  const title = (allTabSelected ? 'Unselect' : 'Select') + ' all tabs'
  return (
    <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
      <div>
        <Checkbox
          color='primary'
          checked={allTabSelected}
          onChange={e => {
            e.target.blur()
            const { selectAll, unselectAll } = searchStore
            if (allTabSelected) {
              unselectAll()
            } else {
              selectAll()
            }
          }}
          indeterminate={someTabSelected}
          inputProps={{ 'aria-label': title }}
        />
      </div>
    </Tooltip>
  )
})
