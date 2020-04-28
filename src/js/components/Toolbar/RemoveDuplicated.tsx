import React from 'react'
import { observer } from 'mobx-react-lite'
import DeleteSweep from '@material-ui/icons/DeleteSweep'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

const TITLE = 'Clean duplicated tabs'

export default observer(() => {
  const { windowStore } = useStore()
  const { cleanDuplicatedTabs, duplicatedTabs } = windowStore
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div className='flex'>
        <IconButton
          onClick={cleanDuplicatedTabs}
          disabled={duplicatedTabs.length === 0}
          className='focus:outline-none'
          aria-label={TITLE}
        >
          <DeleteSweep />
        </IconButton>
      </div>
    </Tooltip>
  )
})
