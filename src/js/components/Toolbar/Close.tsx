import React from 'react'
import { observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import { withTheme } from '@material-ui/core/styles'
import { TOOLTIP_DELAY } from 'libs'
import { useStore } from 'components/StoreContext'

const Close = observer(props => {
  const { tabStore } = useStore()
  const { remove, tabDescription, hasFocusedOrSelectedTab } = tabStore
  const style = {}
  if (hasFocusedOrSelectedTab) {
    style.color = props.theme.palette.secondary.main
  }
  return (
    <Tooltip title={`Close ${tabDescription}`} enterDelay={TOOLTIP_DELAY}>
      <div>
        <IconButton
          onClick={() => remove()}
          style={style}
          disabled={!hasFocusedOrSelectedTab}
        >
          <CloseIcon />
        </IconButton>
      </div>
    </Tooltip>
  )
})

export default withTheme(Close)
