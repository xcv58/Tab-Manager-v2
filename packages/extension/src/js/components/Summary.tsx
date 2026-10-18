import { isSafari } from 'libs/browserCapabilities'
import React, { useEffect } from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { getNoun } from 'libs'
import { useStore } from './hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { getUiColorTokens } from 'libs/uiColorTokens'

const Title = ({ title }) => {
  useEffect(() => {
    document.title = `${title} - Tab Manager v2`
  }, [title])
  return title
}

export default observer(() => {
  const { searchStore, tabStore, windowStore, userStore } = useStore()
  const theme = useAppTheme()
  const uiColors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const { windows, tabCount } = windowStore
  const { typing } = searchStore
  const selected = tabStore.selection.size
  const title = `${windows.length} ${getNoun(
    'window',
    windows.length,
  )}, ${tabCount} ${getNoun('tab', tabCount)}`
  return (
    <p
      className={classNames(
        'fixed top-0 left-0 z-10 flex items-center justify-center w-full p-0 text-sm leading-none whitespace-nowrap border-none pointer-events-none select-none',
        {
          'opacity-50': typing,
        },
      )}
      style={{
        color: uiColors.mutedText,
        position: isSafari ? 'absolute' : undefined,
      }}
    >
      <Title {...{ title }} />, {selected} {getNoun('tab', selected)} selected
    </p>
  )
})
