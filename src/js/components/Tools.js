import React from 'react'
import { inject, observer } from 'mobx-react'
import SortIcon from 'material-ui-icons/Sort'
import FormatListBulleted from 'material-ui-icons/FormatListBulleted'
import IconButton from 'material-ui/IconButton'

const iconStyle = {
  width: '2rem',
  height: '2rem'
}

@inject('windowStore')
@observer
export default class Tools extends React.Component {
  onClick = (e) => {
    this.props.windowStore.groupDuplicateTabs()
  }

  render () {
    const { windowStore: { duplicatedTabsCount, sortInWindow } } = this.props
    return (
      <div style={{
        display: 'flex'
      }}>
        <IconButton
          style={iconStyle}
          onClick={sortInWindow}>
          <SortIcon />
        </IconButton>
        <IconButton
          style={iconStyle}
          disabled={duplicatedTabsCount === 0}
          onClick={this.onClick}>
          <FormatListBulleted />
        </IconButton>
      </div>
    )
  }
}
