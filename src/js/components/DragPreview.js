import React from 'react'
import { inject, observer } from 'mobx-react'
import DraggableTab from 'components/Tab/DraggableTab'
import { focusedColor } from 'libs/colors'

@inject('dragStore')
@inject('tabStore')
@observer
export default class DragPreview extends React.Component {
  render () {
    const {
      tabStore: { sources },
      dragStore: { dragging }
    } = this.props
    const head = dragging && (
      <h3>
        {sources.length} tab{sources.length > 1 && 's'}
      </h3>
    )
    const content = dragging && sources.map((tab) => (
      <DraggableTab key={tab.id} tab={tab} faked />
    ))
    return (
      <div
        id='dragPreview'
        style={{
          width: '64%',
          position: 'fixed',
          background: focusedColor,
          textAlign: 'center',
          top: 2048,
          left: 2048
        }}>
        {head}
        {content}
      </div>
    )
  }
}
