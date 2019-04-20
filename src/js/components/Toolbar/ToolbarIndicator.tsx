import React from 'react'
import { inject, observer } from 'mobx-react'
import Fade from '@material-ui/core/Fade'
import Slide from '@material-ui/core/Slide'
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft'
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight'
import IconButton from '@material-ui/core/IconButton'

const IndicatorIcon = ({ toolbarVisible }) => {
  if (toolbarVisible) {
    return <KeyboardArrowRight />
  }
  return <KeyboardArrowLeft />
}

@inject('userStore')
@observer
class ToolbarIndicator extends React.Component {
  onClick = () => {
    const { hideToolbar, showToolbar, toolbarVisible } = this.props.userStore
    if (toolbarVisible) {
      hideToolbar()
    } else {
      showToolbar()
    }
  }

  render () {
    const {
      showToolbar,
      toolbarAutoHide,
      toolbarVisible
    } = this.props.userStore
    return (
      <Slide direction='up' in>
        <IconButton
          style={{
            opacity: toolbarAutoHide ? 1 : 0.2
          }}
          disabled={!toolbarAutoHide}
          onFocus={showToolbar}
          onMouseEnter={showToolbar}
          onClick={this.onClick}
        >
          <Fade in>
            <IndicatorIcon {...{ toolbarVisible }} />
          </Fade>
        </IconButton>
      </Slide>
    )
  }
}

export default ToolbarIndicator
