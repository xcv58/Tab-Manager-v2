import React from 'react'
import { observer } from 'mobx-react'
import DeleteSweep from '@material-ui/icons/DeleteSweep'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { windowStore } = useStore()
  const { cleanDuplicatedTabs, duplicatedTabs } = windowStore
  return (
    <Tooltip title='Clean duplicated tabs' enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton
          onClick={cleanDuplicatedTabs}
          disabled={duplicatedTabs.length === 0}
          className='focus:outline-none'
        >
          <DeleteSweep />
        </IconButton>
      </div>
    </Tooltip>
  )
})
