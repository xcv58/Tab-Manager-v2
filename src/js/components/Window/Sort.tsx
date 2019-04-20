import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import SortIcon from '@material-ui/icons/Sort'
import IconButton from '@material-ui/core/IconButton'

@inject('arrangeStore')
@observer
class Sort extends React.Component {
  render () {
    const {
      win: { id },
      arrangeStore: { sortTabs }
    } = this.props
    return (
      <Tooltip title='Sort Tabs'>
        <IconButton onClick={() => sortTabs(id)}>
          <SortIcon />
        </IconButton>
      </Tooltip>
    )
  }
}

export default Sort
