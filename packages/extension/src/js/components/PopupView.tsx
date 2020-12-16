import React from 'react'
import { observer } from 'mobx-react-lite'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import ThemeToggle from 'components/ThemeToggle'
import Shortcut from 'components/Shortcut'
import Toolbar from 'components/Toolbar'
import SettingsDialog from 'components/Toolbar/SettingsDialog'
import { useThemeClassNames } from './hooks/useTheme'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'

export default observer(() => {
  const { userStore } = useStore()
  const className = useThemeClassNames()
  if (!userStore.loaded) {
    return (
      <div className='flex-shrink-0 h-12'>
        <Loading small />
      </div>
    )
  }
  return (
    <main className={className}>
      <div className='flex items-center justify-center flex-shrink-0 h-12 px-1 text-3xl'>
        <Summary />
        <AutocompleteSearch autoFocus open />
      </div>
      <div className='absolute bottom-0 left-0 flex'>
        <ThemeToggle />
        <OpenInTab />
      </div>
      <Toolbar />
      <Shortcut />
      <SettingsDialog />
    </main>
  )
})
