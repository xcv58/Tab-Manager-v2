import React from 'react'
import { inject, observer } from 'mobx-react'
import DraggableTab from './Tab/DraggableTab'
import { blue } from 'material-ui/colors'

@inject('dragStore')
@inject('tabStore')
@observer
export default class DragPreview extends React.Component {
  render () {
    const {
      tabStore: { sources },
      dragStore: { dragging },
      setDragPreview
    } = this.props
    const head = dragging && (
      <h3>
        {sources.length} tab{sources.length > 1 && 's'}
        <br />
        drop out ➤ new window
      </h3>
    )
    const content = dragging && sources.map((tab) => (
      <DraggableTab key={tab.id} {...tab} faked />
    ))
    return (
      <div
        ref={setDragPreview}
        style={{
          width: '64%',
          position: 'fixed',
          background: blue[100],
          textAlign: 'center',
          top: 2048
        }}>
        {head}
        {content}
      </div>
    )
  }
}
