import React from 'react'
import { inject, observer } from 'mobx-react'
import IconButton from 'material-ui/IconButton'

const buttonWidth = '2.5rem'
const iconWidth = '1.5rem'

@inject('searchStore')
@inject('tabStore')
@observer
export default class Icon extends React.Component {
  onClick = () => {
    this.onFocus()
    this.props.tabStore.activate(this.props.tab)
  }

  select = () => {
    this.onFocus()
    this.props.tabStore.select(this.props.tab)
  }

  onFocus = () => {
    this.props.searchStore.focus(this.props.tab)
  }

  render () {
    const { iconUrl } = this.props.tab
    return (
      <IconButton
        onClick={this.select}
        onFocus={this.onFocus}
        style={{
          width: buttonWidth,
          height: buttonWidth
        }}>
        <img src={iconUrl}
          style={{
            width: iconWidth,
            height: iconWidth
          }}
        />
      </IconButton>
    )
  }
}
