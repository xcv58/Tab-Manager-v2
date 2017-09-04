import React from 'react'
import { inject, observer } from 'mobx-react'
import SortIcon from 'material-ui-icons/Sort'
import IconButton from 'material-ui/IconButton'

@inject('windowStore')
@observer
export default class Search extends React.Component {
  onClick = (e) => {
    this.props.windowStore.sortTabs()
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
    return (
      <div>
        <IconButton onClick={this.onClick}>
          <SortIcon />
        </IconButton>
      </div>
    )
  }
}
