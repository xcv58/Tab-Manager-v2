import React from 'react'
import { observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'

@observer
export default class TabTooltip extends React.Component {
  state = { open: false }

  handleTooltipClose = () => {
    this.setState({ open: false })
  }

  handleTooltipOpen = () => {
    const { dragging } = this.props.dragStore
    if (!dragging) {
      this.setState({ open: true })
    }
  }

  render () {
    const { title, url } = this.props.tab
    const tooltip = (
      <div
        style={{
          whiteSpace: 'normal',
          wordBreak: 'break-all',
          wordWrap: 'break-word',
          maxWidth: '20rem'
        }}
      >
        <p>{title}</p>
        <p>{url}</p>
      </div>
    )
    return (
      <Tooltip
        title={tooltip}
        onClose={this.handleTooltipClose}
        onOpen={this.handleTooltipOpen}
        open={this.state.open}
        enterDelay={300}
        leaveDelay={300}
      >
        {this.props.children}
      </Tooltip>
    )
  }
}
