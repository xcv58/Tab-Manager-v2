import React from 'react'
import { inject, observer } from 'mobx-react'
import Refresh from '@material-ui/icons/Refresh'
import IconButton from 'material-ui/IconButton'
import Tooltip from 'material-ui/Tooltip'
import { TOOLTIP_DELAY } from 'libs'

@inject('tabStore')
@observer
export default class Reload extends React.Component {
  render () {
    const { reload, hasFocusedOrSelectedTab } = this.props.tabStore
    return (
      <Tooltip title='Reload select tab(s)' enterDelay={TOOLTIP_DELAY}>
        <div>
          <IconButton onClick={reload} disabled={!hasFocusedOrSelectedTab}>
            <Refresh />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}
