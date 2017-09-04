import React from 'react'
import { inject, observer } from 'mobx-react'
import SortIcon from 'material-ui-icons/Sort'
import IconButton from 'material-ui/IconButton'

@inject('windowStore')
@observer
export default class Tools extends React.Component {
  onClick = (e) => {
    this.props.windowStore.deduplicate()
  }

  render () {
    const { windowStore: { duplicatedTabsCount } } = this.props
    return (
      <div>
        <IconButton
          disabled={duplicatedTabsCount === 0}
          onClick={this.onClick}>
          <SortIcon />
        </IconButton>
      </div>
    )
  }
}
