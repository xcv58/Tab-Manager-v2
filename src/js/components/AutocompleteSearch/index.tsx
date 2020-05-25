import React from 'react'
import { observer } from 'mobx-react-lite'
import { TextField, Paper } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import ViewOnlyTab from 'components/Tab/ViewOnlyTab'
import { useStore } from 'components/hooks/useStore'
import { useSearchInputRef } from 'components/hooks/useSearchInputRef'
import { useOptions } from 'components/hooks/useOptions'
import ListboxComponent from './ListboxComponent'
import matchSorter from 'match-sorter'

const ARIA_LABLE =
  'Search your tab title or URL ... (Press "/" to focus, ">" to search commands)'

const commandFilter = (options, { inputValue }) => {
  const keys = ['name', 'shortcut']
  return matchSorter(options, inputValue.slice(1).trim(), { keys })
}

const getFilterOptions = (showUrl, isCommand) => {
  if (isCommand) {
    return commandFilter
  }
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

const Shortcut = ({ shortcut }) => (
  <kbd className='text-white bg-blue-500 shortcut'>{shortcut}</kbd>
)

const Command = (props) => {
  const { shortcut } = props
  const shortcuts = Array.isArray(shortcut) ? (
    <div>
      {shortcut.map((x) => (
        <Shortcut key={x} shortcut={x} />
      ))}
    </div>
  ) : (
    <Shortcut shortcut={shortcut} />
  )
  return (
    <div className='flex justify-between w-full px-4'>
      <span>{props.name}</span>
      {shortcuts}
    </div>
  )
}

const Input = (props) => (
  <TextField fullWidth placeholder={ARIA_LABLE} variant='standard' {...props} />
)

const AutocompleteSearch = observer(() => {
  const searchInputRef = useSearchInputRef()
  const options = useOptions()
  const { userStore, searchStore } = useStore()
  const { search, query, startType, stopType, isCommand } = searchStore

  const filterOptions = getFilterOptions(userStore.showUrl, isCommand)

  return (
    <Autocomplete
      fullWidth
      blurOnSelect
      freeSolo
      selectOnFocus
      openOnFocus
      autoHighlight
      ref={searchInputRef}
      inputValue={query}
      disableListWrap
      PaperComponent={(props) => <Paper elevation={24}>{props.children}</Paper>}
      onFocus={() => {
        startType()
      }}
      onBlur={() => stopType()}
      onInputChange={(_, value, reason) => {
        if (reason !== 'reset') {
          search(value)
        }
      }}
      onChange={(_, option) => {
        if (isCommand) {
          option.command()
        } else {
          option.activate()
          search('')
        }
      }}
      renderInput={(props) => (
        <Input {...props} autoFocus={userStore.autoFocusSearch} />
      )}
      options={options}
      getOptionLabel={(option) => option.name + option.title + option.url}
      renderOption={isCommand ? Command : renderTabOption}
      filterOptions={filterOptions}
      ListboxComponent={ListboxComponent}
    />
  )
})

export default AutocompleteSearch
