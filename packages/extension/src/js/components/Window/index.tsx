import React, { CSSProperties } from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import classNames from 'classnames'
import DroppableTitle from './DroppableTitle'
import Tabs from './Tabs'
import { useStore, useTabHeight } from 'components/hooks/useStore'
import Loading from 'components/Loading'
import { WinProps } from 'components/types'
import WindowDropZone from './WindowDropZone'
import { getUiColorTokens } from 'libs/uiColorTokens'

export default observer((props: WinProps & { width: string }) => {
  const theme = useAppTheme()
  const { userStore } = useStore()
  const uiColors = getUiColorTokens(theme.mode === 'dark', userStore.uiPreset)
  const tabHeight = useTabHeight()
  const { win, width } = props
  const { showTabs, visibleLength, lastFocused } = win
  const isClassicUi = userStore.uiPreset === 'classic'
  const style: CSSProperties = {
    minWidth: `${userStore.tabWidth}rem`,
    width,
    height: 'fit-content',
    boxSizing: 'border-box',
    padding: `0px 1px ${tabHeight}px 1px`,
  }
  if (!win.visibleLength) {
    return null
  }
  return (
    <div style={style} data-testid={`window-card-${win.id}`}>
      <div
        className={classNames('relative overflow-hidden border', {
          'rounded-t-lg': !isClassicUi,
        })}
        style={{
          backgroundColor: uiColors.windowCardSurface,
          borderColor: isClassicUi
            ? 'transparent'
            : uiColors.windowCardBorderColor,
          borderRadius: isClassicUi ? 0 : undefined,
          boxShadow: isClassicUi
            ? lastFocused
              ? uiColors.windowCardShadowFocused
              : uiColors.windowCardShadow
            : undefined,
        }}
      >
        <DroppableTitle {...props} />
        {showTabs && (
          <div>
            <Tabs {...props} />
          </div>
        )}
        {!showTabs && (
          <div style={{ height: tabHeight * (visibleLength - 2) }}>
            <Loading small />
          </div>
        )}
        <WindowDropZone win={win} position="bottom" />
      </div>
    </div>
  )
})
