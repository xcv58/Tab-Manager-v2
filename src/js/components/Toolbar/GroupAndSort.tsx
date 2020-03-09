import React from 'react'
import { observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import FilterList from '@material-ui/icons/FilterList'
import IconButton from '@material-ui/core/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { arrangeStore } = useStore()

  const { groupTabs } = arrangeStore
  return (
    <Tooltip title='Group & Sort Tabs' enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton onClick={() => groupTabs()} className='focus:outline-none'>
          <FilterList />
        </IconButton>
      </div>
    </Tooltip>
  )
})
