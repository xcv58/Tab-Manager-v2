import React from 'react'
import { inject, observer } from 'mobx-react'
import DraggableTab from './Tab/DraggableTab'

@inject('tabStore')
@observer
export default class DragPreview extends React.Component {
  render () {
    const { tabStore: { sources }, setDragPreview } = this.props
    const content = sources.map((tab) => (
      <DraggableTab key={tab.id} {...tab} faked />
    ))
    return (
      <div
        ref={setDragPreview}
        style={{
          position: 'fixed',
          top: 2048
        }}>
        {content}
      </div>
    )
  }
}
