import React, { useState, useCallback } from 'react'
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

const Input = (props) => (
  <TextField fullWidth placeholder={ARIA_LABLE} variant='standard' {...props} />
)

const AutocompleteSearch = observer(
  (props: InputRefProps & { forceUpdate: Function }) => {
    const { inputRef, forceUpdate } = props
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
          startType()
          search(query)
        }}
        onBlur={() => stopType()}
        onInputChange={(_, value, reason) => {
          if (reason !== 'reset') {
            search(value)
          }
        }}
        getOptionLabel={(option) => option.title + option.url}
        renderOption={renderTabOption}
        onChange={(_, tab) => {
          tab.activate()
          forceUpdate()
        }}
        renderInput={Input}
      />
    )
  }
)

export default observer((props: InputRefProps) => {
  const [fake, setFake] = useState(false)
  const { query } = useStore().searchStore
  const forceUpdate = useCallback(() => {
    setFake(true)
    setTimeout(() => setFake(false), 0)
  }, [])
  if (fake) {
    return <Input value={query} />
  }
  return <AutocompleteSearch {...props} forceUpdate={forceUpdate} />
})
