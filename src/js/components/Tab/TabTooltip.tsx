import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'

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
      tab: { title, url, isHovered, urlCount }
    } = this.props
    if (faked || dragging || !isHovered || !hovered) {
      return children
    }
    const tooltip = (
      <div
        style={{
          fontSize: '1rem',
          lineHeight: '1.2rem',
          userSelect: 'text',
          whiteSpace: 'normal',
          wordBreak: 'break-all',
          wordWrap: 'break-word',
          maxWidth: '90vw'
        }}
      >
        {urlCount > 1 && <p>There is duplicated tab!</p>}
        <p>{title}</p>
        <p>{url}</p>
      </div>
    )
    return (
      <Tooltip open title={tooltip}>
        {children}
      </Tooltip>
    )
  }
}
