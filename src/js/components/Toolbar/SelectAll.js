import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from 'material-ui/Checkbox'
import Tooltip from 'material-ui/Tooltip'

@inject('searchStore')
@observer
export default class SelectAll extends React.Component {
  selectAll = e => {
    e.target.blur()
    const { allTabSelected, selectAll, unselectAll } = this.props.searchStore
    if (allTabSelected) {
      unselectAll()
    } else {
      selectAll()
    }
  }

  render () {
    const { allTabSelected, someTabSelected } = this.props.searchStore
    const title = (allTabSelected ? 'Unselect' : 'Select') + ' all tabs'
    return (
      <Tooltip title={title}>
        <div>
          <Checkbox
            color='primary'
            checked={allTabSelected}
            onChange={this.selectAll}
            indeterminate={someTabSelected}
          />
        </div>
      </Tooltip>
    )
  }
}
