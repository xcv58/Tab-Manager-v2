import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'

@inject('dragStore')
@inject('hoverStore')
@observer
export default class TabTooltip extends React.Component {
  render () {
    const {
      children,
      faked,
      dragStore: { dragging },
      hoverStore: { hovered },
      tab: { title, url, isHovered }
    } = this.props
    if (faked || dragging || !isHovered || !hovered) {
      return children
    }
    const tooltip = (
      <div
        style={{
          userSelect: 'text',
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
      <Tooltip open title={tooltip} style={{ overflow: 'hidden', flex: 1 }}>
        {children}
      </Tooltip>
    )
  }
}
