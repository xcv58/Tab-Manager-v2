import React from 'react'
import { inject, observer } from 'mobx-react'
import SortIcon from 'material-ui-icons/Sort'
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
        <IconButton
          style={iconStyle}
          onClick={sortTabs}>
          <SortIcon />
        </IconButton>
      </div>
    )
  }
}
