import React from 'react'
import { inject, observer } from 'mobx-react'
import Snackbar from '@material-ui/core/Snackbar'
import Typography from '@material-ui/core/Typography'
import Fade from '@material-ui/core/Fade'

@inject('shortcutStore')
@observer
export default class Hint extends React.Component {
  render () {
    const { combo, toastOpen } = this.props.shortcutStore
    return (
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center'
        }}
        TransitionComponent={Fade}
        open={toastOpen}
        message={<Typography variant='h6'>{combo}</Typography>}
      />
    )
  }
}
