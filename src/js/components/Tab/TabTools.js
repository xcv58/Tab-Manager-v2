import React from 'react'
import { inject, observer } from 'mobx-react'
import CloseButton from 'components/Tab/CloseButton'
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
          position: 'absolute',
          right: 0
        }}
      >
        <TabMenu {...this.props} />
        <CloseButton {...this.props} />
      </div>
    )
  }
}
