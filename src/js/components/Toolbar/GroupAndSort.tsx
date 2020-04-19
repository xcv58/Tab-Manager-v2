import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@material-ui/core/Tooltip'
import FilterList from '@material-ui/icons/FilterList'
import IconButton from '@material-ui/core/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

const TITLE = 'Group & Sort Tabs'

export default observer(() => {
  const { arrangeStore } = useStore()

  const { groupTabs } = arrangeStore
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton
          onClick={() => groupTabs()}
          className='focus:outline-none'
          aria-label={TITLE}
        >
          <FilterList />
        </IconButton>
      </div>
    </Tooltip>
  )
})
