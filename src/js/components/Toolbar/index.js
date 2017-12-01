import React from 'react'
import { inject, observer } from 'mobx-react'
import Toolbar from './Toolbar'
import ToolbarIndicator from './ToolbarIndicator'

@inject('userStore')
@observer
export default class ToolbarWrapper extends React.Component {
  render () {
    const {
      lazyHideToolbar, showToolbar
    } = this.props.userStore
    return (
      <div onMouseEnter={showToolbar}
        onMouseLeave={lazyHideToolbar}
        style={{
          display: 'flex',
          width: 'fit-content',
          position: 'fixed',
          bottom: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)'
        }}
      >
        <Toolbar />
        <ToolbarIndicator />
      </div>
    )
  }
}
