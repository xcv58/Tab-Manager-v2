import React from 'react'
import { observer } from 'mobx-react-lite'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import ThemeToggle from 'components/ThemeToggle'
import GroupAndSort from 'components/Toolbar/GroupAndSort'
import Settings from 'components/Toolbar/Settings'
import Help from 'components/Toolbar/Help'
import VerticalDivider from 'components/Toolbar/VerticalDivider'
import RemoveDuplicated from 'components/Toolbar/RemoveDuplicated'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'
import { openOrTogglePopup } from 'libs'
import LayoutRepackIndicator from './LayoutRepackIndicator'
import { useTheme } from './hooks/useTheme'

export default observer(() => {
  const { userStore } = useStore()
  const isDarkTheme = useTheme()
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
          backgroundColor: isDarkTheme ? '#2d2f33' : '#ffffff',
          borderBottomColor: isDarkTheme
            ? 'rgba(238, 241, 245, 0.08)'
            : 'rgba(17, 24, 39, 0.1)',
        }}
      >
        <Summary />
        <LayoutRepackIndicator />
        <AutocompleteSearch autoFocus open />
      </div>
      <div className="absolute bottom-0 flex items-center justify-end w-full ">
        <button
          className="absolute bottom-0 left-0 right-0 p-2 mx-auto opacity-50 hover:opacity-100"
          onClick={openOrTogglePopup}
        >
          Open full feature mode
        </button>
        <ThemeToggle />
        <Settings />
        <Help />
        <VerticalDivider />
        <GroupAndSort />
        <RemoveDuplicated />
        <VerticalDivider />
        <OpenInTab />
      </div>
    </>
  )
})
