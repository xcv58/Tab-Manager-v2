import React, { useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { TextField, Paper } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import ViewOnlyTab from 'components/Tab/ViewOnlyTab'
import { useStore } from 'components/StoreContext'
import { InputRefProps } from 'components/types'
import ListboxComponent from './ListboxComponent'
import matchSorter from 'match-sorter'
import Tab from 'stores/Tab'

const ARIA_LABLE = 'Search your tab title or URL ... (Press "/" to focus)'

const getOptionLabel = (option: Tab) => option.title + option.url

const getFilterOptions = (showUrl) => {
  return (options, { inputValue }) => {
    const keys = ['title']
    if (showUrl) {
      keys.push('url')
    }
    return matchSorter(options, inputValue, { keys })
  }
}

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

    const filterOptions = getFilterOptions(userStore.showUrl)

    return (
      <Autocomplete
        fullWidth
        blurOnSelect
        freeSolo
        selectOnFocus
        openOnFocus
        autoHighlight
        ref={inputRef}
        inputValue={query}
        disableListWrap
        PaperComponent={(props) => (
          <Paper elevation={24}>{props.children}</Paper>
        )}
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
        onChange={(_, tab) => {
          tab.activate()
          search('')
          forceUpdate()
        }}
        renderInput={(props) => (
          <Input
            {...props}
            autoFocus={initRender && userStore.autoFocusSearch}
          />
        )}
        getOptionLabel={getOptionLabel}
        options={windowStore.tabs}
        renderOption={renderTabOption}
        filterOptions={filterOptions}
        ListboxComponent={ListboxComponent}
      />
    )
  }
)

export default observer((props: InputRefProps) => {
  // The initRender make sure the auto focus will be set for only the first render. And following render has no autoFocus to be true.
  const [initRender, setInitRender] = useState(true)
  const [fake, setFake] = useState(false)
  const { query } = useStore().searchStore
  // The forceUpdate is to force render the Material UI Autocomplete because it wouldn't trigger onChange if select the same option again.
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
