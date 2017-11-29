import React from 'react'
import { inject, observer } from 'mobx-react'
import KeyboardArrowLeft from 'material-ui-icons/KeyboardArrowLeft'
import IconButton from 'material-ui/IconButton'
import SelectAll from './SelectAll'
import Close from './Close'
import NewWindow from './NewWindow'
import GroupAndSort from './GroupAndSort'

@inject('userStore')
@observer
export default class Toolbar extends React.Component {
  render () {
    const {
      hideToolbar, showToolbar, toolbarAutoHide, toolbarVisible
    } = this.props.userStore
    if (toolbarAutoHide && !toolbarVisible) {
      return (
        <div
          onFocus={showToolbar}
          onMouseEnter={showToolbar}
          style={{
            width: 'fit-content',
            position: 'fixed',
            bottom: 0,
            right: 0
          }}
        >
          <IconButton>
            <KeyboardArrowLeft />
          </IconButton>
        </div>
      )
    }
    return (
      <div
        onMouseEnter={showToolbar}
        onMouseLeave={hideToolbar}
        style={{ display: 'flex' }}
      >
        <GroupAndSort />
        <SelectAll />
        <NewWindow />
        <Close />
      </div>
    )
  }
}
