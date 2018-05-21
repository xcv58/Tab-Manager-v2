import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import { withTheme } from '@material-ui/core/styles'
import { TOOLTIP_DELAY } from 'libs'

@withTheme()
@inject('tabStore')
@observer
export default class Close extends React.Component {
  render () {
    const {
      remove,
      tabDescription,
      hasFocusedOrSelectedTab
    } = this.props.tabStore
    const style = {}
    if (hasFocusedOrSelectedTab) {
      style.color = this.props.theme.palette.secondary.main
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
  }
}
