import React from 'react'
import { inject, observer } from 'mobx-react'
import Tooltip from 'material-ui/Tooltip'
import CloseIcon from 'material-ui-icons/Close'
import IconButton from 'material-ui/IconButton'

@inject('searchStore')
@inject('tabStore')
@observer
export default class Close extends React.Component {
  render () {
    const { closeAllTitle, remove } = this.props.tabStore
    return (
      <Tooltip title={closeAllTitle}>
        <IconButton onClick={() => remove()}>
          <CloseIcon />
        </IconButton>
      </Tooltip>
    )
  }
}
