import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from '@material-ui/core/Tooltip'
import OpenInNew from '@material-ui/icons/OpenInNew'
import IconButton from '@material-ui/core/IconButton'
import { TOOLTIP_DELAY } from 'libs'

@inject('dragStore')
@inject('tabStore')
@observer
export default class NewWindow extends React.Component {
  render () {
    const { dropToNewWindow } = this.props.dragStore
    const { selection, tabDescription } = this.props.tabStore
    return (
      <Tooltip
        title={`Open ${tabDescription} in new window`}
        enterDelay={TOOLTIP_DELAY}
      >
        <div>
          <IconButton
            onClick={() => dropToNewWindow()}
            disabled={selection.size === 0}
          >
            <OpenInNew />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}
