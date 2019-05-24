import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from '@material-ui/core/Checkbox'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'

@inject('searchStore')
@observer
class SelectAll extends React.Component {
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
      <Tooltip title={title} enterDelay={TOOLTIP_DELAY}>
        <div>
          <Checkbox
            color='primary'
            checked={allTabSelected}
            onChange={this.selectAll}
            indeterminate={someTabSelected}
            inputProps={{ 'aria-label': title }}
          />
        </div>
      </Tooltip>
    )
  }
}

export default SelectAll
