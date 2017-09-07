import React from 'react'
import MuiCheckbox from 'material-ui/Checkbox'

export default class Checkbox extends React.Component {
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
      tabStore: { selection }
    } = this.props
    const selected = selection.has(id)
    return (
      <MuiCheckbox
        checked={selected}
        onChange={this.select}
        onFocus={this.onFocus}
        style={{
          width: '1rem',
          height: '1rem',
          padding: 4
        }}
      />
    )
  }
}
