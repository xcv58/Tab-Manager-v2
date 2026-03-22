import React from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import ThemeToggle from 'components/ThemeToggle'
import SyncButton from './SyncButton'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'
import LayoutRepackIndicator from './LayoutRepackIndicator'
import { getUiColorTokens } from 'libs/uiColorTokens'

export default observer(() => {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const uiColors = getUiColorTokens(theme.mode === 'dark', userStore.uiPreset)
  const isClassicUi = userStore.uiPreset === 'classic'
  if (!userStore.loaded) {
    return (
      <div className="h-12 shrink-0">
        <Loading small />
      </div>
    )
  }
  return (
    <div
      className="flex items-center justify-center h-12 px-1 text-3xl shrink-0 border-b"
      style={{
        backgroundColor: uiColors.popupHeaderSurface,
        borderBottomColor: uiColors.popupHeaderBorderColor,
        borderBottom: isClassicUi ? 'none' : undefined,
      }}
    >
      <Summary />
      <LayoutRepackIndicator />
      <AutocompleteSearch />
      <SyncButton />
      <ThemeToggle />
      <OpenInTab />
    </div>
  )
})
