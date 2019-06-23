import React from 'react'
import { observer } from 'mobx-react-lite'
import Refresh from '@material-ui/icons/Refresh'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { tabStore } = useStore()
  const { reload, hasFocusedOrSelectedTab } = tabStore
  return (
    <Tooltip title='Reload select tab(s)' enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton onClick={reload} disabled={!hasFocusedOrSelectedTab}>
          <Refresh />
        </IconButton>
      </div>
    </Tooltip>
  )
})
