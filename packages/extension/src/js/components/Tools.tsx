import { isSafari } from 'libs/browserCapabilities'
import React from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import Summary from 'components/Summary'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'
import HeaderActions from './HeaderActions'
import { getUiColorTokens } from 'libs/uiColorTokens'

type Props = {
  showSearchResultMenu: boolean
}

export default observer(({ showSearchResultMenu }: Props) => {
  const { userStore } = useStore()
  const theme = useAppTheme()
  const uiColors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
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
      className="search-header flex items-center justify-center h-12 shrink-0 border-b"
      style={{
        position: isSafari ? 'relative' : undefined,
        backgroundColor: uiColors.popupHeaderSurface,
        borderBottomColor: uiColors.popupHeaderBorderColor,
        borderBottom: isClassicUi ? 'none' : undefined,
      }}
    >
      <Summary />
      <AutocompleteSearch showResultMenu={showSearchResultMenu} />
      <HeaderActions />
    </div>
  )
})
