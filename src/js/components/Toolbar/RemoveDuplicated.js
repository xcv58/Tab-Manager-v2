import React from 'react'
import { inject, observer } from 'mobx-react'
import DeleteSweep from '@material-ui/icons/DeleteSweep'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'
import { TOOLTIP_DELAY } from 'libs'

@inject('windowStore')
@observer
export default class RemoveDuplicated extends React.Component {
  render () {
    const { cleanDuplicatedTabs, duplicatedTabs } = this.props.windowStore
    return (
      <Tooltip title='Clean duplicated tabs' enterDelay={TOOLTIP_DELAY}>
        <div>
          <IconButton
            onClick={cleanDuplicatedTabs}
            disabled={duplicatedTabs.length === 0}
          >
            <DeleteSweep />
          </IconButton>
        </div>
      </Tooltip>
    )
  }
}
