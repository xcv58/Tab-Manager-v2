import React from 'react'
import { inject, observer } from 'mobx-react'
import Checkbox from 'material-ui/Checkbox'
import Tooltip from 'material-ui/Tooltip'

@inject('searchStore')
@inject('tabStore')
@observer
export default class Toolbar extends React.Component {
  selectAll = (e) => {
    e.target.blur()
    const {
      searchStore: { allTabSelected, selectAll },
      tabStore: { unselectAll }
    } = this.props
    if (allTabSelected) {
      unselectAll()
    } else {
      selectAll()
    }
  }

  render () {
    const { allTabSelected } = this.props.searchStore
    return (
      <div style={{
        display: 'flex'
      }}>
        <Tooltip title='Select/Unselect all tabs'>
          <Checkbox
            checked={allTabSelected}
            onChange={this.selectAll}
          />
        </Tooltip>
      </div>
    )
  }
}
