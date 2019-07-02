import React from 'react'
import { observer } from 'mobx-react'
import Checkbox from '@material-ui/core/Checkbox'
import Tooltip from '@material-ui/core/Tooltip'
import { useStore } from 'components/StoreContext'

export default observer(({ win }) => {
  const { tabStore } = useStore()
  const { allTabSelected, someTabSelected, disableSelectAll } = win
  const title = `${allTabSelected ? 'Unselect' : 'Select'} all tabs`
  return (
    <Tooltip title={title}>
      <Checkbox
        color='primary'
        disabled={disableSelectAll}
        checked={allTabSelected}
        onChange={e => {
          e.target.blur()
          const { allTabSelected, matchedTabs } = win
          const { selectAll, unselectAll } = tabStore
          if (allTabSelected) {
            unselectAll(matchedTabs)
          } else {
            selectAll(matchedTabs)
          }
        }}
        indeterminate={someTabSelected || disableSelectAll}
      />
    </Tooltip>
  )
})
