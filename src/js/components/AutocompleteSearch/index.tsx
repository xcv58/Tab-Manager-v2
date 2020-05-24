import React, { useState, useEffect, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { TextField, Paper } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import ViewOnlyTab from 'components/Tab/ViewOnlyTab'
import { useStore } from 'components/StoreContext'
import { InputRefProps } from 'components/types'
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

const hasCommandPrefix = (value) => value.startsWith('>')

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

const AutocompleteSearch = observer((props: InputRefProps) => {
  const { inputRef, inputValue, setInput, isCommand } = props
  const options = useOptions(isCommand)
  console.log(options)
  const { userStore, searchStore } = useStore()
  const { query, startType, stopType } = searchStore

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
      // inputValue={query}
      inputValue={inputValue}
      disableListWrap
      PaperComponent={(props) => <Paper elevation={24}>{props.children}</Paper>}
      onFocus={() => {
        startType()
        setInput(query)
      }}
      onBlur={() => stopType()}
      onInputChange={(_, value, reason) => {
        if (reason !== 'reset') {
          setInput(value)
        }
      }}
      onChange={(_, option) => {
        if (isCommand) {
          option.command()
        } else {
          option.activate()
        }
        setInput('')
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

export default observer((props: InputRefProps) => {
  const { searchStore } = useStore()
  const { search, query } = searchStore
  const [inputValue, setInputValue] = useState('')
  const isCommand = hasCommandPrefix(inputValue)
  useEffect(() => {
    if (query && query !== inputValue) {
      setInputValue(query)
    }
  }, [query])
  const setInput = useCallback((value) => {
    setInputValue(value)
    if (hasCommandPrefix(value)) {
      search('')
    } else {
      search(value)
    }
  }, [])
  return (
    <AutocompleteSearch
      {...props}
      {...{
        inputValue,
        setInput,
        isCommand
      }}
    />
  )
})
