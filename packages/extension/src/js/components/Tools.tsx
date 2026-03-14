import React from 'react'
import { observer } from 'mobx-react-lite'
import { useTheme as useMuiTheme } from '@mui/material/styles'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import ThemeToggle from 'components/ThemeToggle'
import SyncButton from './SyncButton'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'
import LayoutRepackIndicator from './LayoutRepackIndicator'

type Props = {
  showUtilityActions?: boolean
}

export default observer(({ showUtilityActions = true }: Props) => {
  const { userStore } = useStore()
  const theme = useMuiTheme()
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
        backgroundColor: theme.palette.background.paper,
        borderBottomColor: theme.palette.divider,
      }}
    >
      <Summary />
      <LayoutRepackIndicator />
      <AutocompleteSearch />
      {showUtilityActions && (
        <>
          <SyncButton />
          <ThemeToggle />
          <OpenInTab />
        </>
      )}
    </div>
  )
})
