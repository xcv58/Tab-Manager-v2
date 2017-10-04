import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'
import FilterList from 'material-ui-icons/FilterList'
import IconButton from 'material-ui/IconButton'

const iconStyle = {
  width: '2rem',
  height: '2rem'
}

@inject('arrangeStore')
@observer
export default class Tools extends React.Component {
  render () {
    const { arrangeStore: { sortTabs } } = this.props
    return (
      <div style={{
        display: 'flex'
      }}>
        <Tooltip title='Group & Sort Tabs' placement='left'>
          <IconButton
            style={iconStyle}
            onClick={() => sortTabs()}>
            <FilterList />
          </IconButton>
        </Tooltip>
      </div>
    )
  }
}
