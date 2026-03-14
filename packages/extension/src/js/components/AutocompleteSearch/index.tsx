import React, { useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { TextField, Paper } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { useTheme } from '@mui/material/styles'
import { useStore } from 'components/hooks/useStore'
import { useSearchInputRef } from 'components/hooks/useSearchInputRef'
import { useOptions } from 'components/hooks/useOptions'
import ListboxComponent from './ListboxComponent'
import TabOption from './TabOption'
import { matchSorter, defaultBaseSortFn } from 'match-sorter'
import parse from 'autosuggest-highlight/parse'
import match from 'autosuggest-highlight/match'
import Shortcuts from 'components/Shortcut/Shortcuts'
import HistoryItemTab from 'components/Tab/HistoryItemTab'
import Tab from 'stores/Tab'
import { HistoryItem, getTabSearchKeys } from 'stores/SearchStore'
import { getNoun, openURL } from 'libs'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'
import { filterCommandOptions } from './filterOptions'

const SEARCH_PLACEHOLDER = 'Search tabs or URLs'
const SEARCH_HINT = '/ focus · > commands'

const commandFilter = (options, { inputValue }) => {
  return filterCommandOptions(options, inputValue.slice(1).trim())
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

const buildGroupedTabSections = (
  tabs,
  tabGroupStore,
  minGroupMatchCount = 2,
) => {
  const sectionTabIds = new Set()

  if (!tabGroupStore?.hasTabGroupsApi?.()) {
    return { items: tabs, sectionTabIds }
  }

  const groupedTabs = new Map()
  tabs.forEach((tab) => {
    if (tabGroupStore.isNoGroupId(tab.groupId)) {
      return
    }
    const tabGroup = tabGroupStore.getTabGroup(tab.groupId)
    if (!tabGroup) {
      return
    }
    groupedTabs.set(tab.groupId, [...(groupedTabs.get(tab.groupId) || []), tab])
  })

  const qualifyingGroupIds = new Set(
    Array.from(groupedTabs.entries())
      .filter(([, groupTabs]) => groupTabs.length >= minGroupMatchCount)
      .map(([groupId]) => groupId),
  )
  if (!qualifyingGroupIds.size) {
    return { items: tabs, sectionTabIds }
  }

  const emittedGroupIds = new Set()
  const items = tabs.flatMap((tab) => {
    if (!qualifyingGroupIds.has(tab.groupId)) {
      return [tab]
    }
    if (emittedGroupIds.has(tab.groupId)) {
      return []
    }

    emittedGroupIds.add(tab.groupId)
    const tabGroup = tabGroupStore.getTabGroup(tab.groupId)
    const matchedTabs = groupedTabs.get(tab.groupId) || []
    matchedTabs.forEach((groupTab) => {
      sectionTabIds.add(groupTab.id)
    })
    return [
      {
        isDivider: true,
        dividerType: 'group',
        groupId: tab.groupId,
        title: tabGroup?.title || 'Unnamed group',
        color: tabGroup?.color,
        matchCount: matchedTabs.length,
      },
      ...matchedTabs,
    ]
  })

  return { items, sectionTabIds }
}

const getFilterOptions = (
  showUrl,
  isCommand,
  tabGroupStore,
  groupedSectionTabIdsRef,
) => {
  if (isCommand) {
    return (options, state) => {
      groupedSectionTabIdsRef.current = new Set()
      return commandFilter(options, state)
    }
  }
  return (options, { inputValue }) => {
    groupedSectionTabIdsRef.current = new Set()
    const tabs = options.filter((option) => !option.visitCount)
    const history = options.filter((option) => option.visitCount)
    const trimmedValue = inputValue.trim()
    if (!trimmedValue) {
      const { items: groupedTabs, sectionTabIds } = buildGroupedTabSections(
        tabs,
        tabGroupStore,
        1,
      )
      groupedSectionTabIdsRef.current = sectionTabIds
      if (history.length) {
        return [
          ...groupedTabs,
          {
            isDivider: true,
            dividerType: 'history',
            title: 'History',
          },
          ...history,
        ]
      }
      return groupedTabs
    }
    const keys = getTabSearchKeys({
      showUrl,
      hasTabGroupsApi: !!tabGroupStore?.hasTabGroupsApi?.(),
    })
    const matchedTabs = matchSorter(tabs, inputValue, {
      keys,
      sorter: (rankedItems) =>
        rankedItems.sort((a, b) => sortRankedValues(a, b, defaultBaseSortFn)),
    })
    const { items: groupedTabs, sectionTabIds } = buildGroupedTabSections(
      matchedTabs,
      tabGroupStore,
      1,
    )
    groupedSectionTabIdsRef.current = sectionTabIds
    const matchedHistory = matchSorter(history, inputValue, { keys })
    if (matchedHistory.length) {
      return [
        ...groupedTabs,
        {
          isDivider: true,
          dividerType: 'history',
          title: 'History',
        },
        ...matchedHistory,
      ]
    }
    return groupedTabs
  }
}

type SearchOption =
  | HistoryItem
  | Tab
  | {
      isDivider: boolean
      dividerType: 'history' | 'group'
      title: string
      groupId?: number
      color?: chrome.tabGroups.ColorEnum
      matchCount?: number
    }

const renderTabOption = (tab: SearchOption, theme, groupedSectionTabIds) => {
  if (tab.isDivider) {
    if (tab.dividerType === 'group') {
      const groupColor = getChromeTabGroupColor(tab.color)
      return (
        <div
          className="flex items-center justify-between w-full h-full px-2 text-sm font-medium border-t"
          style={{ borderTopColor: theme.palette.divider }}
          data-testid={`search-group-header-${tab.groupId}`}
        >
          <div className="flex items-center min-w-0 gap-2">
            <div
              className="inline-flex min-w-0 max-w-full items-center rounded-md px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: groupColor.line,
                color: groupColor.chipText,
              }}
              data-testid={`search-group-header-chip-${tab.groupId}`}
            >
              <span className="truncate">{tab.title}</span>
            </div>
          </div>
          <div
            className="ml-2 text-xs shrink-0 opacity-70"
            style={{ color: theme.palette.text.secondary }}
          >
            {tab.matchCount} {getNoun('tab', tab.matchCount)}
          </div>
        </div>
      )
    }
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
  return (
    <TabOption
      tab={tab}
      showInlineGroupBadge={!groupedSectionTabIds.has(tab.id)}
    />
  )
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

type Props = { autoFocus?: boolean; open?: boolean }

const AutocompleteSearch = observer((props: Props) => {
  const { autoFocus, open } = props
  const theme = useTheme()
  const searchInputRef = useSearchInputRef()
  const options = useOptions()
  const { userStore, searchStore, tabGroupStore } = useStore()
  const { search, query, startType, stopType, isCommand } = searchStore
  const groupedSectionTabIdsRef = useRef(new Set())
  const filterOptions = getFilterOptions(
    userStore.showUrl,
    isCommand,
    tabGroupStore,
    groupedSectionTabIdsRef,
  )

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
        <Paper
          elevation={24}
          sx={{
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border:
              theme.palette.mode === 'dark'
                ? `1px solid ${theme.palette.divider}`
                : undefined,
          }}
        >
          <div>{props.children}</div>
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
        <TextField
          {...props}
          fullWidth
          autoFocus={autoFocus || userStore.autoFocusSearch}
          placeholder={SEARCH_PLACEHOLDER}
          variant="standard"
          InputProps={{
            ...props.InputProps,
            endAdornment: (
              <>
                {!query && (
                  <span
                    className="pr-2 text-[0.72rem] whitespace-nowrap select-none"
                    style={{
                      color: theme.palette.text.secondary,
                      opacity: 0.8,
                    }}
                  >
                    {SEARCH_HINT}
                  </span>
                )}
                {props.InputProps?.endAdornment}
              </>
            ),
          }}
        />
      )}
      options={options}
      getOptionLabel={(option) =>
        [
          option.name,
          option.title,
          option.url,
          option.visitCount ? '' : option.groupTitle,
        ]
          .filter(Boolean)
          .join(' ')
      }
      getOptionDisabled={(option) => option.isDivider}
      renderOption={(props, option, state) => (
        <li
          {...props}
          style={
            option.isDivider
              ? {
                  ...props.style,
                  opacity: 1,
                }
              : props.style
          }
        >
          {isCommand
            ? renderCommand(option, state)
            : renderTabOption(option, theme, groupedSectionTabIdsRef.current)}
        </li>
      )}
      filterOptions={filterOptions}
      ListboxComponent={ListboxComponent}
    />
  )
})

export default AutocompleteSearch
