import React from 'react'
import { observer } from 'mobx-react-lite'
import Fade from '@material-ui/core/Fade'
import Slide from '@material-ui/core/Slide'
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft'
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight'
import IconButton from '@material-ui/core/IconButton'
import { useStore } from 'components/StoreContext'
import useReduceMotion from 'libs/useReduceMotion'
import { duration } from '@material-ui/core/styles/transitions'

const IndicatorIcon = ({ toolbarVisible }) => {
  if (toolbarVisible) {
    return <KeyboardArrowRight />
  }
  return <KeyboardArrowLeft />
}

export default observer(() => {
  const { userStore } = useStore()
  const { showToolbar, toolbarAutoHide, toolbarVisible } = userStore
  const reduceMotion = useReduceMotion()
  return (
    <Slide
      direction='up'
      in
      timeout={reduceMotion ? 1 : duration.enteringScreen}
    >
      <IconButton
        style={{
          opacity: toolbarAutoHide ? 1 : 0.2
        }}
        className='focus:outline-none'
        disabled={!toolbarAutoHide}
        onFocus={showToolbar}
        onMouseEnter={showToolbar}
        onClick={() => {
          const { hideToolbar, showToolbar } = userStore
          if (toolbarVisible) {
            hideToolbar()
          } else {
            showToolbar()
          }
        }}
        aria-label='Toggle toolbar'
      >
        <Fade in>
          <IndicatorIcon {...{ toolbarVisible }} />
        </Fade>
      </IconButton>
    </Slide>
  )
})
