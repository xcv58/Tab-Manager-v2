import React from 'react'
import { inject, observer } from 'mobx-react'
import { focusedColor } from 'libs/colors'

@inject('tabStore')
@observer
export default class DragPreview extends React.Component {
  render () {
    const {
      tabStore: { sources }
    } = this.props
    const head = (
      <h3>
        {sources.length} tab{sources.length > 1 && 's'}
      </h3>
    )
    return (
      <div
        id='dragPreview'
        style={{
          width: '10rem',
          position: 'fixed',
          background: focusedColor,
          textAlign: 'center',
          top: -512,
          left: 4096
        }}
      >
        {head}
      </div>
    )
  }
}
