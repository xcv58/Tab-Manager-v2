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
        style={{
          left: 'unset',
          right: 0,
          margin: 'auto'
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        SnackbarContentProps={{
          style: {
            fontSize: '1.5rem',
            padding: '0 2rem',
            justifyContent: 'center',
            textTransform: 'capitalize',
            background: 'rgba(0, 0, 0, 0.618)'
          }
        }}
        transition={Fade}
        open={toastOpen}
        message={combo}
      />
    )
  }
}
