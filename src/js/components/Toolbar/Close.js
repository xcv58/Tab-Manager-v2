import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from 'material-ui/IconButton'
import { withTheme } from 'material-ui/styles'
import { TOOLTIP_DELAY } from 'libs'

@withTheme()
@inject('tabStore')
@observer
export default class Close extends React.Component {
  render () {
    const { remove, tabDescription } = this.props.tabStore
    return (
      <Tooltip title={`Close ${tabDescription}`} enterDelay={TOOLTIP_DELAY}>
        <div>
          <IconButton
            onClick={() => remove()}
            style={{
              color: this.props.theme.palette.secondary.main
            }}
          >
            <CloseIcon />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}
