import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from './Checkbox'
import Icon from './Icon'

@inject('searchStore')
@inject('tabStore')
@observer
export default class Tab extends React.Component {
  onClick = () => {
    this.props.searchStore.focus(this.props)
    this.props.tabStore.activate(this.props)
  }

  render () {
    const { title } = this.props
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap'
      }}>
        <Checkbox {...this.props} />
        <Icon {...this.props} />
        <div
          onClick={this.onClick}
          style={{
            marginLeft: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
          {title}
        </div>
      </div>
    )
  }
}
