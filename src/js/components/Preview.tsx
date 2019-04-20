import React from 'react'
import { inject, observer } from 'mobx-react'
import Tab from 'components/Tab/Tab'
import { focusedColor } from 'libs/colors'

const style = {
  opacity: 0.5,
  background: focusedColor
}

@inject('tabStore')
@observer
class Preview extends React.Component<any> {
  render () {
    const {
      tabStore: { sources }
    } = this.props
    const content = sources.map(tab => <Tab key={tab.id} tab={tab} faked />)
    return <div style={{ ...style, ...this.props.style }}>{content}</div>
  }
}

export default Preview
