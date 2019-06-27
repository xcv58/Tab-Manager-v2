import React from 'react'
import { observer } from 'mobx-react-lite'
import Tooltip from '@material-ui/core/Tooltip'
import OpenInNew from '@material-ui/icons/OpenInNew'
import IconButton from '@material-ui/core/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { dragStore, tabStore } = useStore()
  const { dropToNewWindow } = dragStore
  const { selection, tabDescription } = tabStore
  return (
    <Tooltip
      title={`Open ${tabDescription} in new window`}
      enterDelay={TOOLTIP_DELAY}
    >
      <div>
        <IconButton
          onClick={() => dropToNewWindow()}
          disabled={selection.size === 0}
        >
          <OpenInNew />
        </IconButton>
      </div>
    </Tooltip>
  )
})
