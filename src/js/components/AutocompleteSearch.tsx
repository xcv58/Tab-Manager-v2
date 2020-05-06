import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from './StoreContext'
import { TextField } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { InputRefProps } from './types'
import ViewOnlyTab from './Tab/ViewOnlyTab'

const ARIA_LABLE = 'Search your tab title... (Press "/" to focus)'

const renderTabOption = (tab) => {
  return <ViewOnlyTab tab={tab} />
}

export default observer(({ inputRef }: InputRefProps) => {
  const { userStore, searchStore, windowStore } = useStore()
  const { search, query, startType, stopType } = searchStore
  return (
    <Autocomplete
      fullWidth
      blurOnSelect
      freeSolo
      selectOnFocus
      openOnFocus={!userStore.autoFocusSearch}
      autoHighlight
      ref={inputRef}
      options={windowStore.tabs}
      inputValue={query}
      onFocus={() => {
        search(query)
        startType()
      }}
      onBlur={() => stopType()}
      onInputChange={(_, value, reason) => {
        if (reason !== 'reset' || !value) {
          search(value)
        }
      }}
      getOptionLabel={(option) => option.title + option.url}
      renderOption={renderTabOption}
      onChange={(_, value) => {
        value.activate()
      }}
      renderInput={(params) => {
        return (
          <TextField
            {...params}
            autoFocus={userStore.autoFocusSearch}
            placeholder={ARIA_LABLE}
            variant='standard'
          />
        )
      }}
    />
  )
})
