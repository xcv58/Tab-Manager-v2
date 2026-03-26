import React from 'react'
import { observer } from 'mobx-react-lite'
import { useTheme } from '@mui/material/styles'
import Fade from '@mui/material/Fade'
import Slide from '@mui/material/Slide'
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight'
import IconButton from '@mui/material/IconButton'
import { useStore } from 'components/hooks/useStore'
import { getUiColorTokens } from 'libs/uiColorTokens'
import useReduceMotion from 'libs/useReduceMotion'
import { duration } from '@mui/material'

const IndicatorIcon = ({ toolbarVisible }: { toolbarVisible: boolean }) => {
  if (toolbarVisible) {
    return <KeyboardArrowRight />
  }
  return <KeyboardArrowLeft />
}

export default observer(() => {
  const theme = useTheme()
  const { userStore } = useStore()
  const uiColors = getUiColorTokens(
    theme.palette.mode === 'dark',
    userStore.uiPreset,
  )
  const isClassicUi = userStore.uiPreset === 'classic'
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
          opacity: toolbarAutoHide ? (toolbarVisible ? 1 : 0.78) : 0.38,
          width: 44,
          height: 40,
          borderLeft:
            toolbarVisible && !isClassicUi
              ? `1px solid ${uiColors.toolbarShellBorderColor}`
              : undefined,
          borderRadius: 0,
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
