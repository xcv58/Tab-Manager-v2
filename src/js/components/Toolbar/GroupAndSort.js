import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'
import FilterList from '@material-ui/icons/FilterList'
import IconButton from 'material-ui/IconButton'

@inject('arrangeStore')
@observer
export default class GroupAndSort extends React.Component {
  render () {
    const { groupTabs } = this.props.arrangeStore
    return (
      <Tooltip title='Group & Sort Tabs' placement='left'>
        <div>
          <IconButton onClick={() => groupTabs()}>
            <FilterList />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}
