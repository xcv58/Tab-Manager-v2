import React from 'react'
import { observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import { useTheme } from '@material-ui/styles'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

export default observer((props) => {
  const theme = useTheme()
  const { tabStore } = useStore()
  const { remove, tabDescription, hasFocusedOrSelectedTab } = tabStore
  const style = {}
  if (hasFocusedOrSelectedTab) {
    style.color = theme.palette.secondary.main
  }
  return (
    <Tooltip title={`Close ${tabDescription}`} enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton
          onClick={() => remove()}
          style={style}
          disabled={!hasFocusedOrSelectedTab}
          className='focus:outline-none'
        >
          <CloseIcon />
        </IconButton>
      </div>
    </Tooltip>
  )
})
