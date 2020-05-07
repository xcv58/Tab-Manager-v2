import React, { useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { TextField, Paper } from '@material-ui/core'
import Autocomplete, {
  createFilterOptions
} from '@material-ui/lab/Autocomplete'
import ViewOnlyTab from 'components/Tab/ViewOnlyTab'
import { useStore } from 'components/StoreContext'
import { InputRefProps } from 'components/types'
import ListboxComponent from './ListboxComponent'
import Tab from 'stores/Tab'

const ARIA_LABLE = 'Search your tab title or URL ... (Press "/" to focus)'

const filterOptions = createFilterOptions({ limit: 100 })

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
          forceUpdate()
        }}
        renderInput={(props) => (
          <Input
            {...props}
            autoFocus={initRender && userStore.autoFocusSearch}
          />
        )}
        getOptionLabel={(option: Tab) => option.title + option.url}
        options={windowStore.tabs}
        renderOption={renderTabOption}
        filterOptions={filterOptions}
        ListboxComponent={ListboxComponent}
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
