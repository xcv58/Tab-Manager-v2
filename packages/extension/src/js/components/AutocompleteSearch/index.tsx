import React from 'react'
import { useTextClasses } from '../hooks/useTheme'
import { observer } from 'mobx-react-lite'
import { TextField, Paper } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import ViewOnlyTab from 'components/Tab/ViewOnlyTab'
import { useStore } from 'components/hooks/useStore'
import { useSearchInputRef } from 'components/hooks/useSearchInputRef'
import { useOptions } from 'components/hooks/useOptions'
import ListboxComponent from './ListboxComponent'
import { matchSorter, defaultBaseSortFn } from 'match-sorter'
import parse from 'autosuggest-highlight/parse'
import match from 'autosuggest-highlight/match'
import Shortcuts from 'components/Shortcut/Shortcuts'
import HistoryItemTab from 'components/Tab/HistoryItemTab'
import Tab from 'stores/Tab'
import { HistoryItem } from 'stores/SearchStore'
import { openURL } from 'libs'

const ARIA_LABLE =
  'Search your tab title or URL ... (Press "/" to focus, ">" to search commands)'

const commandFilter = (options, { inputValue }) => {
  const keys = ['name', 'shortcut']
  return matchSorter(options, inputValue.slice(1).trim(), { keys })
}

/**
 * Copy from https://github.com/kentcdodds/match-sorter/blob/fba154b12ff594e688d0c3f6abc64d22622b6919/src/index.ts#L312
 * Since it's not exposed via the package.
 *
 * Sorts items that have a rank, index, and keyIndex
 * @param {Object} a - the first item to sort
 * @param {Object} b - the second item to sort
 * @return {Number} -1 if a should come first, 1 if b should come first, 0 if equal
 */
function sortRankedValues(a, b, baseSort): number {
  const aFirst = -1
  const bFirst = 1
  const { rank: aRank, keyIndex: aKeyIndex } = a
  const { rank: bRank, keyIndex: bKeyIndex } = b
  const same = aRank === bRank
  if (same) {
    if (aKeyIndex === bKeyIndex) {
      // use the base sort function as a tie-breaker
      return baseSort(a, b)
    } else {
      return aKeyIndex < bKeyIndex ? aFirst : bFirst
    }
  } else {
    return aRank > bRank ? aFirst : bFirst
  }
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
    return matchSorter(options, inputValue, {
      keys,
      sorter: (rankedItems) => {
        const tabs = rankedItems
          .filter((x) => !x.item.visitCount)
          .sort((a, b) => sortRankedValues(a, b, defaultBaseSortFn))
        const history = rankedItems.filter((x) => x.item.visitCount)
        if (history.length) {
          return [
            ...tabs,
            {
              rankedValue: '',
              item: { isDivider: true, title: 'History' },
            },
            ...history,
          ]
        }
        return rankedItems
      },
    })
  }
}

type TabOption = HistoryItem | Tab | { isDivider: boolean; title: string }

const renderTabOption = (tab: TabOption) => {
  if (tab.isDivider) {
    return (
      <div className="flex items-center justify-between w-full h-full pl-2 font-bold border-t-2">
        <div className="text-lg">{tab.title}</div>
        <div className="text-sm text-right">
          <div>Last visited time</div>
          <div>Typed visits / All visits</div>
        </div>
      </div>
    )
  }
  if (tab.visitCount) {
    return <HistoryItemTab tab={tab} />
  }
  return <ViewOnlyTab tab={tab} />
}

const renderCommand = (command, state) => {
  const { shortcut } = command
  const matches = match(command.name, state.inputValue.slice(1))
  const parts = parse(command.name, matches)
  return (
    <div className="flex justify-between w-full px-4">
      <span>
        {parts.map((part, index) => (
          <span
            key={index}
            className={part.highlight ? 'font-bold' : 'font-normal'}
          >
            {part.text}
          </span>
        ))}
      </span>
      <div>
        <Shortcuts shortcut={shortcut} />
      </div>
    </div>
  )
}

const Input = (props) => (
  <TextField fullWidth placeholder={ARIA_LABLE} variant="standard" {...props} />
)

type Props = { autoFocus?: boolean; open?: boolean }

const AutocompleteSearch = observer((props: Props) => {
  const { autoFocus, open } = props
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
      includeInputInList
      ref={searchInputRef}
      inputValue={query}
      value={query}
      disableListWrap
      PaperComponent={(props) => (
        <Paper elevation={24}>
          <div className={useTextClasses()}>{props.children}</div>
        </Paper>
      )}
      open={open}
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
        if (!option || typeof option === 'string') {
          return
        }
        if (option.isDivider) {
          return
        }
        if (isCommand) {
          option.command()
        } else {
          if (option.activate) {
            option.activate()
          } else {
            openURL(option.url)
          }
        }
        search('')
      }}
      renderInput={(props) => (
        <Input {...props} autoFocus={autoFocus || userStore.autoFocusSearch} />
      )}
      options={options}
      getOptionLabel={(option) =>
        `${option.name} ${option.title} ${option.url}`
      }
      getOptionDisabled={(option) => option.isDivider}
      renderOption={(props, option, state) => (
        <li {...props}>
          {isCommand ? renderCommand(option, state) : renderTabOption(option)}
        </li>
      )}
      filterOptions={filterOptions}
      ListboxComponent={ListboxComponent}
    />
  )
})

export default AutocompleteSearch
