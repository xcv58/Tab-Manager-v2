import React from 'react'
import { inject, observer } from 'mobx-react'
import { withStyles } from 'material-ui/styles'
import Snackbar from 'material-ui/Snackbar'
import Fade from 'material-ui/transitions/Fade'

export const styles = (theme: Object) => ({
  paper: {
    width: '100%'
  }
})

@inject('shortcutStore')
@observer
class Hint extends React.Component {
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
            fontSize: '8.5rem',
            padding: '0 2rem',
            justifyContent: 'center',
            textTransform: 'capitalize',
            background: '#FF0000'
            // background: 'rgba(0, 0, 0, 0.0618)'
          }
        }}
        transition={Fade}
        open={toastOpen}
        message={combo}
      />
    )
  }
}

export default withStyles(styles)(Hint)
