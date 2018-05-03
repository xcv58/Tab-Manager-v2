import React from 'react'
import { inject, observer } from 'mobx-react'
import FlipMove from 'react-flip-move'
import DraggableTab from 'components/Tab/DraggableTab'

@inject('windowStore')
@observer
export default class Tabs extends React.Component {
  componentDidMount () {
    const {
      windowStore: { windowMounted },
      index
    } = this.props
    window.requestAnimationFrame(() => {
      windowMounted(index)
    })
  }

  render () {
    const {
      win: { tabs },
      getScrollbars,
      dragPreview
    } = this.props
    const tabsView = tabs.map(tab => (
      <DraggableTab
        key={tab.id}
        tab={tab}
        {...{ getScrollbars, dragPreview }}
      />
    ))
    return (
      <FlipMove
        duration={255}
        easing='ease-in-out'
        appearAnimation='accordionHorizontal'
        enterAnimation='accordionHorizontal'
        leaveAnimation='accordionHorizontal'
      >
        {tabsView}
      </FlipMove>
    )
  }
}
