import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'

@inject('dragStore')
@observer
export default class TabTooltip extends React.Component {
  render () {
    const {
      children,
      faked,
      onMouseLeave,
      dragStore: { dragging },
      tab: { title, url, isHovered }
    } = this.props
    if (faked || dragging || !isHovered) {
      return children
    }
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
      <Tooltip open title={tooltip} onMouseLeave={onMouseLeave}>
        {children}
      </Tooltip>
    )
  }
}
