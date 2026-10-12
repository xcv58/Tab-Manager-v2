import React, { CSSProperties } from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'
import { useStore } from './hooks/useStore'
import ViewOnlyTab from './Tab/ViewOnlyTab'

export default observer((props: { style?: CSSProperties }) => {
  const theme = useAppTheme()
  const { tabStore, userStore } = useStore()
  const colors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const { sources } = tabStore
  const content = sources.map((tab) => <ViewOnlyTab key={tab.id} tab={tab} />)
  return (
    <div
      style={{
        ...props.style,
        opacity: 0.8,
        backgroundColor: colors.windowCardSurface,
        color: colors.primaryText,
      }}
    >
      {content}
    </div>
  )
})
