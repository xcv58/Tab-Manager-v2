import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from 'material-ui/Checkbox'
import Tooltip from 'material-ui/Tooltip'

@inject('tabStore')
@observer
export default class SelectAll extends React.Component {
  selectAll = e => {
    e.target.blur()
    const {
      win: { allTabSelected, matchedTabs },
      tabStore: { selectAll, unselectAll }
    } = this.props
    if (allTabSelected) {
      unselectAll(matchedTabs)
    } else {
      selectAll(matchedTabs)
    }
  }

  render () {
    const { allTabSelected, someTabSelected } = this.props.win
    const title = `${allTabSelected ? 'Unselect' : 'Select'} all tabs`
    return (
      <Tooltip title={title}>
        <Checkbox
          color='primary'
          checked={allTabSelected}
          onChange={this.selectAll}
          indeterminate={someTabSelected}
        />
      </Tooltip>
    )
  }
}
