import React from 'react'
import { observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import Flip from '@material-ui/icons/Flip'
import IconButton from '@material-ui/core/IconButton'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

export default observer(() => {
  const { searchStore } = useStore()
  const { invertSelect } = searchStore
  return (
    <Tooltip title={`Inverse select tabs`} enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton onClick={invertSelect}>
          <Flip />
        </IconButton>
      </div>
    </Tooltip>
  )
})
