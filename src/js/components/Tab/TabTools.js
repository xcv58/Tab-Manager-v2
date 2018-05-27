import React from 'react'
import { inject, observer } from 'mobx-react'
import CloseButton from 'components/Tab/CloseButton'
import DragHandle from 'components/Tab/DragHandle'
import TabMenu from 'components/Tab/TabMenu'

@inject('dragStore')
@observer
export default class TabTools extends React.Component {
  render () {
    const {
      faked,
      dragStore: { dragging },
      tab: { isHovered }
    } = this.props
    if (faked || dragging || !isHovered) {
      return null
    }
    return (
      <div
        style={{
          display: 'flex',
          justifySelf: 'flex-end'
          // position: 'absolute',
          // right: 0
        }}
      >
        <DragHandle {...this.props} />
        <TabMenu {...this.props} />
        <CloseButton {...this.props} />
      </div>
    )
  }
}
