import React from 'react'
import { inject, observer } from 'mobx-react'
import Fade from 'material-ui/transitions/Fade'
import Slide from 'material-ui/transitions/Slide'
import KeyboardArrowLeft from 'material-ui-icons/KeyboardArrowLeft'
import KeyboardArrowRight from 'material-ui-icons/KeyboardArrowRight'
import IconButton from 'material-ui/IconButton'

const IndicatorIcon = ({ toolbarVisible }) => {
  if (toolbarVisible) {
    return (
      <KeyboardArrowRight />
    )
  }
  return (
    <KeyboardArrowLeft />
  )
}

@inject('userStore')
@observer
export default class ToolbarIndicator extends React.Component {
  onClick = () => {
    const {
      hideToolbar, showToolbar, toolbarVisible
    } = this.props.userStore
    if (toolbarVisible) {
      hideToolbar()
    } else {
      showToolbar()
    }
  }

  render () {
    const {
      showToolbar, toolbarAutoHide, toolbarVisible
    } = this.props.userStore
    return (
      <Slide direction='up' in>
        <IconButton
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
