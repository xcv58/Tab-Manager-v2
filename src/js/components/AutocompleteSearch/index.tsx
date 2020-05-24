import React, { useEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { TextField, Paper } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import ViewOnlyTab from 'components/Tab/ViewOnlyTab'
import { useStore } from 'components/StoreContext'
import ListboxComponent from './ListboxComponent'
import matchSorter from 'match-sorter'

const ARIA_LABLE = 'Search your tab title or URL ... (Press "/" to focus)'

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

const Shortcut = ({ shortcut }) => <kbd className='shortcut'>{shortcut}</kbd>

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
    <div className='flex justify-between w-full'>
      <span className='pl-4'>{props.name}</span>
      {shortcuts}
    </div>
  )
}

const Input = (props) => (
  <TextField fullWidth placeholder={ARIA_LABLE} variant='standard' {...props} />
)

const useOptions = (isCommand) => {
  const { windowStore, shortcutStore } = useStore()
  if (isCommand) {
    const { shortcuts } = shortcutStore
    return shortcuts
      .map(([shortcut, command, name, hideFromCommand]) => {
        if (typeof name !== 'string' || hideFromCommand) {
          return
        }
        return { name, shortcut, command }
      })
      .filter((x) => x)
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  return windowStore.tabs
}

const AutocompleteSearch = observer(() => {
  const inputRef = useRef<HTMLInputElement>(null)
  const { userStore, searchStore } = useStore()
  const {
    search,
    query,
    startType,
    stopType,
    isCommand,
    setSearchEl
  } = searchStore
  const options = useOptions(isCommand)

  useEffect(() => setSearchEl(inputRef))
  const filterOptions = getFilterOptions(userStore.showUrl, isCommand)

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
      PaperComponent={(props) => <Paper elevation={24}>{props.children}</Paper>}
      onFocus={() => {
        startType()
        // search(query)
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
        }
        search('')
      }}
      renderInput={(props) => (
        <Input {...props} autoFocus={userStore.autoFocusSearch} />
      )}
      options={options}
      renderOption={isCommand ? Command : renderTabOption}
      filterOptions={filterOptions}
      ListboxComponent={ListboxComponent}
    />
  )
})

export default AutocompleteSearch
