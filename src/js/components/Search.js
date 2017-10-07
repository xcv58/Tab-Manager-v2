import React from 'react'
import { inject, observer } from 'mobx-react'
import Input from 'material-ui/Input'

@inject('searchStore')
@observer
export default class Search extends React.Component {
  onChange = (e) => {
    this.props.searchStore.search(e.target.value)
  }

  onFocus = () => {
    const { searchStore: { search, query, startType } } = this.props
    search(query)
    startType()
  }

  onBlur = () => {
    this.props.searchStore.stopType()
  }

  render () {
    const { inputRef, searchStore: { query } } = this.props
    return (
      <Input
        fullWidth
        inputProps={{ ref: inputRef }}
        placeholder='Search your tab title...'
        onChange={this.onChange}
        onFocus={this.onFocus}
        onBlur={this.onBlur}
        value={query}
      />
    )
  }
}
