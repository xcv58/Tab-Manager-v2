import React from 'react'
import Search from 'components/Search'
import Summary from 'components/Summary'
import ToolbarSwitch from 'components/Toolbar/ToolbarSwitch'

export default class Tools extends React.Component {
  render () {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flex: '0 0 auto',
        padding: '0 4px'
      }}>
        <Summary />
        <Search inputRef={this.props.inputRef} />
        <ToolbarSwitch />
      </div>
    )
  }
}
