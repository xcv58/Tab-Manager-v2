import React from 'react'
import { observer } from 'mobx-react-lite'
import Search, { InputRefProps } from 'components/Search'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import ThemeToggle from 'components/ThemeToggle'
import SyncButton from './SyncButton'
import { useStore } from './StoreContext'
import CommandPalette from './CommandPalette'
import Loading from './Loading'

export default observer((props: InputRefProps) => {
  const { userStore } = useStore()
  if (!userStore.loaded) {
    return (
      <div className='flex-shrink-0 h-12'>
        <Loading small />
      </div>
    )
  }
  return (
    <div className='flex items-center justify-center flex-shrink-0 h-12 px-1 text-3xl'>
      <Summary />
      <Search inputRef={props.inputRef} />
      <SyncButton />
      <ThemeToggle />
      <CommandPalette />
      <OpenInTab />
    </div>
  )
})
