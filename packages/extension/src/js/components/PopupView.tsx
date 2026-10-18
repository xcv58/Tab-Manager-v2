import { isSafari } from 'libs/browserCapabilities'
import React from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import Summary from 'components/Summary'
import ThemeToggle from 'components/ThemeToggle'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'
import PopupActionsMenu from './PopupActionsMenu'
import { getUiColorTokens } from 'libs/uiColorTokens'

export default observer(({ autoFocus = true }: { autoFocus?: boolean }) => {
  const theme = useAppTheme()
  const { userStore } = useStore()
  const uiColors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
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
        className="search-header flex items-center justify-center shrink-0 h-12 border-b"
        style={{
          position: isSafari ? 'relative' : undefined,
          backgroundColor: uiColors.popupHeaderSurface,
          borderBottomColor: uiColors.popupHeaderBorderColor,
          borderBottom: isClassicUi ? 'none' : undefined,
        }}
      >
        <Summary />
        <AutocompleteSearch
          autoFocus={isSafari ? userStore.autoFocusSearch : autoFocus}
          open
          bottomInset={44}
        />
      </div>
      <div
        className="corner-dock absolute right-0 bottom-0 flex items-center gap-1 border px-2 py-1"
        style={{
          backgroundColor: uiColors.popupControlsSurface,
          borderColor: uiColors.popupControlsBorderColor,
          minHeight: 40,
          borderRight: 'none',
          borderBottom: 'none',
          borderTopLeftRadius: uiColors.toolbarShellBorderRadius,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <ThemeToggle />
        <PopupActionsMenu />
      </div>
    </>
  )
})
