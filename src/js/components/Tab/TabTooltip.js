import React from 'react'
import { observer } from 'mobx-react'

@observer
export default class TabTooltip extends React.Component {
  render () {
    const { title, url } = this.props.tab
    return (
      <div style={{
        whiteSpace: 'normal',
        wordBreak: 'break-all',
        wordWrap: 'break-word',
        maxWidth: '20rem'
      }}>
        <p>{title}</p>
        <p>{url}</p>
      </div>
    )
  }
}
