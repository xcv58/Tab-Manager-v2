import React, { useRef, useState, useMemo, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore, useTabHeight } from 'components/hooks/useStore'
import { useSearchInputRef } from 'components/hooks/useSearchInputRef'
import { useOptions } from 'components/hooks/useOptions'
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
import { useCombobox } from 'components/ui/Combobox'
import { VariableSizeList } from 'react-window'
import { useAppTheme } from 'libs/appTheme'

const SEARCH_PLACEHOLDER = 'Search tabs or URLs'
const SEARCH_HINT = '/ focus · > commands'
const SEARCH_FONT_SIZE = '0.8125rem'
const LISTBOX_MARGIN_TOP = 4

const commandFilter = (options, { inputValue }) => {
  return filterCommandOptions(options, inputValue.slice(1).trim())
}

function sortRankedValues(a, b, baseSort): number {
  const aFirst = -1
  const bFirst = 1
  const { rank: aRank, keyIndex: aKeyIndex } = a
  const { rank: bRank, keyIndex: bKeyIndex } = b
  const same = aRank === bRank
  if (same) {
    if (aKeyIndex === bKeyIndex) {
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
  | any // for commands

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
    <div className="flex justify-between w-full px-4 h-full items-center">
      <span>
        {parts.map((part, index) => (
          <span key={index} style={{ fontWeight: part.highlight ? 700 : 400 }}>
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

type Props = { autoFocus?: boolean; open?: boolean; bottomInset?: number }

const LISTBOX_PADDING = 8

export const getAutocompleteListHeight = ({
  itemCount,
  tabHeight,
  maxHeight = Number.POSITIVE_INFINITY,
}: {
  itemCount: number
  tabHeight: number
  maxHeight?: number
}) => {
  if (!itemCount) {
    return 0
  }

  const naturalHeight =
    Math.min(20, itemCount) * tabHeight + 2 * LISTBOX_PADDING
  const minimumHeight = tabHeight + 2 * LISTBOX_PADDING
  const cappedHeight = Math.min(naturalHeight, maxHeight)

  if (Number.isFinite(maxHeight)) {
    return Math.max(0, cappedHeight)
  }

  return Math.max(minimumHeight, cappedHeight)
}

const AutocompleteSearch = observer((props: Props) => {
  const { autoFocus, open: propOpen, bottomInset = 0 } = props
  const theme = useAppTheme()
  const searchInputRef = useSearchInputRef()
  const options = useOptions()
  const { userStore, searchStore, tabGroupStore } = useStore()
  const { search, query, startType, stopType, isCommand } = searchStore
  const tabHeight = useTabHeight()
  const rootRef = useRef<HTMLDivElement>(null)

  const [isOpen, setIsOpen] = useState(propOpen || false)
  const [availableListHeight, setAvailableListHeight] = useState<number>(
    Number.POSITIVE_INFINITY,
  )

  useEffect(() => {
    if (propOpen !== undefined) setIsOpen(propOpen)
  }, [propOpen])

  const groupedSectionTabIdsRef = useRef(new Set())
  const filterOptions = useMemo(
    () =>
      getFilterOptions(
        userStore.showUrl,
        isCommand,
        tabGroupStore,
        groupedSectionTabIdsRef,
      ),
    [userStore.showUrl, isCommand, tabGroupStore],
  )

  const filteredOptions = useMemo(() => {
    return filterOptions(options, { inputValue: query })
  }, [options, query, filterOptions])

  const itemCount = filteredOptions.length

  const handleSelect = (option: any) => {
    if (!option || typeof option === 'string') return
    if (option.isDivider) return

    if (isCommand) {
      option.command()
    } else {
      if (option.activate) {
        option.activate({ origin: 'search', reveal: true })
      } else {
        openURL(option.url)
      }
    }
    search('')
    setIsOpen(false)
  }

  const {
    highlightedIndex,
    listRef,
    getInputProps,
    getListboxProps,
    getItemProps,
  } = useCombobox({
    items: filteredOptions,
    inputValue: query,
    onInputValueChange: search,
    onSelect: handleSelect,
    isItemDisabled: useMemo(() => (item) => Boolean(item.isDivider), []),
    isOpen,
    onOpenChange: setIsOpen,
  })

  const inputProps = getInputProps()
  const listboxProps = getListboxProps()

  useEffect(() => {
    if (!bottomInset) {
      setAvailableListHeight(Number.POSITIVE_INFINITY)
      return
    }

    const updateAvailableHeight = () => {
      if (!rootRef.current) {
        return
      }

      const rect = rootRef.current.getBoundingClientRect()
      const nextHeight =
        window.innerHeight - rect.bottom - bottomInset - LISTBOX_MARGIN_TOP

      setAvailableListHeight(Math.max(0, nextHeight))
    }

    updateAvailableHeight()
    window.addEventListener('resize', updateAvailableHeight)

    return () => {
      window.removeEventListener('resize', updateAvailableHeight)
    }
  }, [bottomInset, isOpen, itemCount, query])

  // Inner row renderer for the virtualized list
  const Row = ({ index, style }: any) => {
    const option = filteredOptions[index]
    const itemProps = getItemProps({ index, item: option })
    const isHighlighted = highlightedIndex === index

    return (
      <li
        {...itemProps}
        style={{
          ...style,
          top: Number(style.top) + LISTBOX_PADDING,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          cursor: option.isDivider ? 'default' : 'pointer',
          backgroundColor: isHighlighted
            ? 'var(--dropdown-hover-bg, rgba(0,0,0,0.08))'
            : 'transparent',
          opacity: option.isDivider ? 1 : undefined,
        }}
      >
        {isCommand
          ? renderCommand(option, { inputValue: query })
          : renderTabOption(option, theme, groupedSectionTabIdsRef.current)}
      </li>
    )
  }

  const listHeight = getAutocompleteListHeight({
    itemCount,
    tabHeight,
    maxHeight: availableListHeight,
  })

  const handleEscape = () => {
    search('')
    setIsOpen(false)
    searchInputRef.current?.blur()
  }

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', flex: '1 1 0%', minWidth: 0 }}
    >
      {/* Input Field */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minWidth: 0,
          borderBottom: '1px solid',
          borderColor: 'var(--input-border, rgba(0,0,0,0.42))',
          position: 'relative',
        }}
        onClick={() => {
          inputProps.onFocus()
          searchInputRef.current?.focus()
        }}
      >
        <input
          ref={searchInputRef}
          type="text"
          value={inputProps.value}
          onChange={inputProps.onChange}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              handleEscape()
              return
            }

            inputProps.onKeyDown(event)
          }}
          onFocus={() => {
            startType()
            inputProps.onFocus()
          }}
          onBlur={(e) => {
            stopType()
            inputProps.onBlur(e as any)
          }}
          autoFocus={autoFocus || userStore.autoFocusSearch}
          placeholder={SEARCH_PLACEHOLDER}
          aria-activedescendant={inputProps['aria-activedescendant']}
          aria-autocomplete={inputProps['aria-autocomplete']}
          aria-expanded={inputProps['aria-expanded']}
          role={inputProps.role}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            color: theme.palette.text.primary,
            fontSize: SEARCH_FONT_SIZE,
            padding: '4px 0 5px',
            outline: 'none',
          }}
        />
        {!query && (
          <span
            className="pr-2 whitespace-nowrap select-none"
            style={{
              color: theme.palette.text.secondary,
              opacity: 0.8,
              fontSize: SEARCH_FONT_SIZE,
            }}
          >
            {SEARCH_HINT}
          </span>
        )}
      </div>

      {/* Dropdown Paper */}
      {isOpen && itemCount > 0 && (
        <div
          {...listboxProps}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            marginTop: LISTBOX_MARGIN_TOP,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border:
              theme.mode === 'dark'
                ? `1px solid ${theme.palette.divider}`
                : undefined,
            borderRadius: 4,
            boxShadow:
              '0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12)',
          }}
        >
          <VariableSizeList
            ref={listRef}
            itemData={filteredOptions}
            height={listHeight}
            width="100%"
            innerElementType="ul"
            itemSize={() => tabHeight}
            overscanCount={5}
            itemCount={itemCount}
          >
            {Row}
          </VariableSizeList>
        </div>
      )}
    </div>
  )
})

export default AutocompleteSearch
