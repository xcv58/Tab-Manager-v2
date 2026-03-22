import React from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import Fade from '@mui/material/Fade'
import Slide from '@mui/material/Slide'
import {
  KeyboardArrowLeftIcon,
  KeyboardArrowRightIcon,
} from 'icons/materialIcons'
import IconButton from 'components/ui/IconButton'
import { useStore } from 'components/hooks/useStore'
import { getUiColorTokens } from 'libs/uiColorTokens'
import useReduceMotion from 'libs/useReduceMotion'
import { defaultTransitionDuration } from 'libs/transition'

const IndicatorIcon = ({ toolbarVisible }: { toolbarVisible: boolean }) => {
  if (toolbarVisible) {
    return <KeyboardArrowRightIcon />
  }
  return <KeyboardArrowLeftIcon />
}

export default observer(() => {
  const theme = useAppTheme()
  const { userStore } = useStore()
  const uiColors = getUiColorTokens(theme.mode === 'dark', userStore.uiPreset)
  const isClassicUi = userStore.uiPreset === 'classic'
  const { showToolbar, toolbarAutoHide, toolbarVisible } = userStore
  const reduceMotion = useReduceMotion()
  return (
    <Slide
      direction="up"
      in
      timeout={reduceMotion ? 1 : defaultTransitionDuration.enter}
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
