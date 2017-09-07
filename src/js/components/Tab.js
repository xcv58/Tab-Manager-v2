import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from 'material-ui/Checkbox'

@inject('searchStore')
@inject('tabStore')
@observer
export default class Tab extends React.Component {
  onClick = () => {
    this.onFocus()
    this.props.tabStore.activate(this.props)
  }

  select = () => {
    this.onFocus()
    this.props.tabStore.select(this.props)
  }

  onFocus = () => {
    this.props.searchStore.focus(this.props)
  }

  render () {
    const {
      id,
      title,
      tabStore: { selection }
    } = this.props
    const selected = selection.has(id)
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap'
      }}>
        <Checkbox
          checked={selected}
          onChange={this.select}
          onFocus={this.onFocus}
          style={{
            width: '1rem',
            height: '1rem',
            padding: 4
          }}
        />
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
