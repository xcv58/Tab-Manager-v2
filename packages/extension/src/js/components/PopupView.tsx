import React from 'react'
import { observer } from 'mobx-react-lite'
import Summary from 'components/Summary'
import OpenInTab from 'components/OpenInTab'
import ThemeToggle from 'components/ThemeToggle'
import { useStore } from './hooks/useStore'
import Loading from './Loading'
import AutocompleteSearch from './AutocompleteSearch'
import { openOrTogglePopup } from 'libs'

export default observer(() => {
  const { userStore } = useStore()
  if (!userStore.loaded) {
    return (
      <div className="flex-shrink-0 h-12">
        <Loading small />
      </div>
    )
  }
  return (
    <>
      <div className="flex items-center justify-center flex-shrink-0 h-12 px-1 text-3xl">
        <Summary />
        <AutocompleteSearch autoFocus open />
      </div>
      <div className="absolute bottom-0 flex items-center justify-end w-full ">
        <button
          className="absolute bottom-0 left-0 right-0 p-2 mx-auto"
          onClick={openOrTogglePopup}
        >
          Open full feature mode
        </button>
        <ThemeToggle />
        <OpenInTab />
      </div>
    </>
  )
})
