import React, { useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from './StoreContext'
import { TextField } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { InputRefProps } from './types'
import ViewOnlyTab from './Tab/ViewOnlyTab'

const ARIA_LABLE = 'Search your tab title or URL ... (Press "/" to focus)'

const renderTabOption = (tab) => {
  return <ViewOnlyTab tab={tab} />
}

const Input = (props) => (
  <TextField fullWidth placeholder={ARIA_LABLE} variant='standard' {...props} />
)

const AutocompleteSearch = observer(
  (props: InputRefProps & { forceUpdate: Function; initRender: boolean }) => {
    const { inputRef, initRender, forceUpdate } = props
    const { userStore, searchStore, windowStore } = useStore()
    const { search, query, startType, stopType } = searchStore
    return (
      <Autocomplete
        fullWidth
        blurOnSelect
        freeSolo
        selectOnFocus
        openOnFocus
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
        renderInput={(props) => (
          <Input
            {...props}
            autoFocus={initRender && userStore.autoFocusSearch}
          />
        )}
      />
    )
  }
)

export default observer((props: InputRefProps) => {
  const [initRender, setInitRender] = useState(true)
  const [fake, setFake] = useState(false)
  const { query } = useStore().searchStore
  const forceUpdate = useCallback(() => {
    setInitRender(false)
    setFake(true)
    setTimeout(() => setFake(false), 0)
  }, [])
  if (fake) {
    return <Input value={query} />
  }
  return <AutocompleteSearch {...props} {...{ initRender, forceUpdate }} />
})
