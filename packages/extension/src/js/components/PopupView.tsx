import React from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import Summary from 'components/Summary'
import ThemeToggle from 'components/ThemeToggle'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'
import LayoutRepackIndicator from './LayoutRepackIndicator'
import PopupActionsMenu from './PopupActionsMenu'
import { getUiColorTokens } from 'libs/uiColorTokens'

export default observer(() => {
  const theme = useAppTheme()
  const { userStore } = useStore()
  const uiColors = getUiColorTokens(theme.mode === 'dark', userStore.uiPreset)
  const isClassicUi = userStore.uiPreset === 'classic'
  if (!userStore.loaded) {
    return (
      <div className="shrink-0 h-12">
        <Loading small />
      </div>
    )
  }
  return (
    <>
      <div
        className="flex items-center justify-center shrink-0 h-12 px-1 text-3xl border-b"
        style={{
          backgroundColor: uiColors.popupHeaderSurface,
          borderBottomColor: uiColors.popupHeaderBorderColor,
          borderBottom: isClassicUi ? 'none' : undefined,
        }}
      >
        <Summary />
        <LayoutRepackIndicator />
        <AutocompleteSearch autoFocus open />
      </div>
      <div
        className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full border px-1 py-1"
        style={{
          backgroundColor: uiColors.popupControlsSurface,
          borderColor: uiColors.popupControlsBorderColor,
          borderRadius: uiColors.popupControlsBorderRadius,
        }}
      >
        <ThemeToggle />
        <PopupActionsMenu />
      </div>
    </>
  )
})
