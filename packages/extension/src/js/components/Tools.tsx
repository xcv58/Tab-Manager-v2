import React from 'react'
import { observer } from 'mobx-react-lite'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import ThemeToggle from 'components/ThemeToggle'
import SyncButton from './SyncButton'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'

export default observer(() => {
  const { userStore } = useStore()
  if (!userStore.loaded) {
    return (
      <div className="h-12 shrink-0">
        <Loading small />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center h-12 px-1 text-3xl shrink-0">
      <Summary />
      <AutocompleteSearch />
      <SyncButton />
      <ThemeToggle />
      <OpenInTab />
    </div>
  )
})
