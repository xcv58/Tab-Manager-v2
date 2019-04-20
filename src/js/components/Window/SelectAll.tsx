import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from '@material-ui/core/Checkbox'
import Tooltip from '@material-ui/core/Tooltip'

@inject('tabStore')
@observer
export default class SelectAll extends React.Component {
  onChange = e => {
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
    const { allTabSelected, someTabSelected, disableSelectAll } = this.props.win
    const title = `${allTabSelected ? 'Unselect' : 'Select'} all tabs`
    return (
      <Tooltip title={title}>
        <Checkbox
          color='primary'
          disabled={disableSelectAll}
          checked={allTabSelected}
          onChange={this.onChange}
          indeterminate={someTabSelected || disableSelectAll}
        />
      </Tooltip>
    )
  }
}
