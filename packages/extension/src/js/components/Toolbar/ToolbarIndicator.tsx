import React from 'react'
import { observer } from 'mobx-react-lite'
import Fade from '@mui/material/Fade'
import Slide from '@mui/material/Slide'
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'
import IconButton from '@mui/material/IconButton'
import { useStore } from 'components/hooks/useStore'
import useReduceMotion from 'libs/useReduceMotion'
import { duration } from '@mui/material'

const IndicatorIcon = ({ toolbarVisible }: { toolbarVisible: boolean }) => {
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
      direction="up"
      in
      timeout={reduceMotion ? 1 : duration.enteringScreen}
    >
      <IconButton
        style={{
          opacity: toolbarAutoHide ? 1 : 0.2,
        }}
        className="focus:outline-none"
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
        aria-label="Toggle toolbar"
      >
        <Fade in>
          <div>
            <IndicatorIcon {...{ toolbarVisible }} />
          </div>
        </Fade>
      </IconButton>
    </Slide>
  )
})
