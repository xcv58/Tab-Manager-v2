import React from 'react'
import { inject, observer } from 'mobx-react'
import Slide from 'material-ui/transitions/Slide'
import KeyboardArrowLeft from 'material-ui-icons/KeyboardArrowLeft'
import KeyboardArrowRight from 'material-ui-icons/KeyboardArrowRight'
import IconButton from 'material-ui/IconButton'

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
    if (!toolbarAutoHide) {
      return null
    }
    const Icon = toolbarVisible ? KeyboardArrowRight : KeyboardArrowLeft
    return (
      <Slide direction='up' in>
        <IconButton
          onFocus={showToolbar}
          onMouseEnter={showToolbar}
          onClick={this.onClick}
        >
          <Icon />
        </IconButton>
      </Slide>
    )
  }
}
