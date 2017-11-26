import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'
import Checkbox from 'material-ui/Checkbox'

@inject('tabStore')
@observer
export default class SelectAll extends React.Component {
  selectAll = (e) => {
    e.target.blur()
    const {
      win: { allTabSelected, tabs },
      tabStore: { selectAll, unselectAll }
    } = this.props
    if (allTabSelected) {
      unselectAll(tabs)
    } else {
      selectAll(tabs)
    }
  }

  render () {
    const { allTabSelected, someTabSelected } = this.props.win
    const title = `${allTabSelected ? 'Unselect' : 'Select'} all tabs`
    return (
      <Tooltip title={title}>
        <Checkbox
          checked={allTabSelected}
          onChange={this.selectAll}
          indeterminate={someTabSelected}
        />
      </Tooltip>
    )
  }
}
