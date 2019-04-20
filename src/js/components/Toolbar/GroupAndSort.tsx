import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import FilterList from '@material-ui/icons/FilterList'
import IconButton from '@material-ui/core/IconButton'
import { TOOLTIP_DELAY } from 'libs'

@inject('arrangeStore')
@observer
export default class GroupAndSort extends React.Component {
  render () {
    const { groupTabs } = this.props.arrangeStore
    return (
      <Tooltip title='Group & Sort Tabs' enterDelay={TOOLTIP_DELAY}>
        <div>
          <IconButton onClick={() => groupTabs()}>
            <FilterList />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}
