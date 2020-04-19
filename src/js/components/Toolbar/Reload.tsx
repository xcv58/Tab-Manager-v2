import React from 'react'
import { observer } from 'mobx-react-lite'
import Refresh from '@material-ui/icons/Refresh'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

const TITLE = 'Reload select tab(s)'

export default observer(() => {
  const { hasFocusedOrSelectedTab, reload } = useStore()
  return (
    <Tooltip title={TITLE} enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton
          onClick={reload}
          disabled={!hasFocusedOrSelectedTab}
          className='focus:outline-none'
          aria-label={TITLE}
        >
          <Refresh />
        </IconButton>
      </div>
    </Tooltip>
  )
})
