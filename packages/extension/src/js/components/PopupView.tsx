import React from 'react'
import { observer } from 'mobx-react-lite'
import { useTheme as useMuiTheme } from '@mui/material/styles'
import Summary from 'components/Summary'
import ThemeToggle from 'components/ThemeToggle'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'
import LayoutRepackIndicator from './LayoutRepackIndicator'
import PopupActionsMenu from './PopupActionsMenu'

export default observer(() => {
  const theme = useMuiTheme()
  const { userStore } = useStore()
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
          backgroundColor: theme.palette.background.paper,
          borderBottomColor: theme.palette.divider,
        }}
      >
        <Summary />
        <LayoutRepackIndicator />
        <AutocompleteSearch autoFocus open />
      </div>
      <div
        className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full border px-1 py-1"
        style={{
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
      >
        <ThemeToggle />
        <PopupActionsMenu />
      </div>
    </>
  )
})
