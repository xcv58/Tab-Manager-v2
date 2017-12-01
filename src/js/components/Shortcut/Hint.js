import React from 'react'
import { inject, observer } from 'mobx-react'
import Snackbar from 'material-ui/Snackbar'
import Fade from 'material-ui/transitions/Fade'

@inject('shortcutStore')
@observer
export default class Hint extends React.Component {
  render () {
    const { combo, toastOpen } = this.props.shortcutStore
    return (
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transition={Fade}
        open={toastOpen}
        message={combo}
      />
    )
  }
}
