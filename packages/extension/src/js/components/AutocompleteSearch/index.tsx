import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore, useTabHeight } from 'components/hooks/useStore'
import { useSearchInputRef } from 'components/hooks/useSearchInputRef'
import { useOptions } from 'components/hooks/useOptions'
import TabOption from './TabOption'
import parse from 'autosuggest-highlight/parse'
import match from 'autosuggest-highlight/match'
import Shortcuts from 'components/Shortcut/Shortcuts'
import HistoryItemTab from 'components/Tab/HistoryItemTab'
import HighlightNode from 'components/HighlightNode'
import Tab from 'stores/Tab'
import { HistoryItem } from 'stores/SearchStore'
import { getNoun, openURL } from 'libs'
import { getChromeTabGroupColor } from 'libs/chromeTabGroupColors'
import { filterCommandOptions, type CommandOption } from './filterOptions'
import { useCombobox } from 'components/ui/Combobox'
import { VariableSizeList } from 'react-window'
import { useAppTheme } from 'libs/appTheme'
import { matchItemsInMode, type SearchMatchMode } from 'libs/searchMatching'
import ControlIconButton from 'components/ControlIconButton'
import { CloseIcon } from 'icons/materialIcons'
import { BrowserWindowIcon } from 'icons/actionIcons'
import { getWindowLabel } from 'libs/windowLabel'

const SEARCH_PLACEHOLDER = 'Search tabs or URLs'
const SEARCH_HINT = '/ search · > commands'
const SEARCH_FONT_SIZE = '0.8125rem'
const LISTBOX_MARGIN_TOP = 4

const commandFilter = (options, { inputValue }) => {
  return filterCommandOptions(options, inputValue.slice(1).trim())
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
    const groupTabs = groupedTabs.get(tab.groupId)
    if (groupTabs) groupTabs.push(tab)
    else groupedTabs.set(tab.groupId, [tab])
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
  const groupTitleCounts = new Map<string, number>()
  qualifyingGroupIds.forEach((groupId) => {
    const title = (
      tabGroupStore.getTabGroup(groupId)?.title || 'Unnamed group'
    ).toLowerCase()
    groupTitleCounts.set(title, (groupTitleCounts.get(title) || 0) + 1)
  })
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
        windowTitle:
          groupTitleCounts.get(
            (tabGroup?.title || 'Unnamed group').toLowerCase(),
          ) > 1
            ? getWindowLabel(tab.win)
            : undefined,
        color: tabGroup?.color,
        matchCount: matchedTabs.length,
      },
      ...matchedTabs,
    ]
  })

  return { items, sectionTabIds }
}

const getFilterOptions = (
  isCommand,
  tabGroupStore,
  groupedSectionTabIdsRef,
  searchMatchModeRef,
  searchStore,
) => {
  if (isCommand) {
    return (options, state) => {
      groupedSectionTabIdsRef.current = new Set()
      searchMatchModeRef.current = 'fuzzy'
      return commandFilter(options, state)
    }
  }
  return (options, { inputValue }) => {
    groupedSectionTabIdsRef.current = new Set()
    const tabs = options.filter((option) => !isHistoryItem(option))
    const history = options.filter(isHistoryItem)
    const trimmedValue = inputValue.trim()
    if (!trimmedValue) {
      searchMatchModeRef.current = 'none'
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
    const searchMatchMode = searchStore.getMatchModeForQuery(trimmedValue)
    searchMatchModeRef.current = searchMatchMode
    // match-sorter's default rank/key/value ordering is the same ordering the
    // dropdown used previously. Share this work with the debounced workspace.
    const matchedTabs = searchStore.inputMatchedTabs
    const { items: groupedTabs, sectionTabIds } = buildGroupedTabSections(
      matchedTabs,
      tabGroupStore,
      1,
    )
    groupedSectionTabIdsRef.current = sectionTabIds
    const matchedHistory = matchItemsInMode(
      history,
      trimmedValue,
      searchMatchMode,
      { keys: searchStore.tabSearchKeys },
    )
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

type DividerOption = {
  isDivider: boolean
  dividerType: 'history' | 'group'
  title: string
  groupId?: number
  color?: chrome.tabGroups.ColorEnum
  matchCount?: number
  windowTitle?: string
}

type SearchOption = HistoryItem | Tab | DividerOption | CommandOption

function isHistoryItem(option: SearchOption): option is HistoryItem {
  // Browser tab IDs are numeric; history IDs are strings. Visit counts are
  // optional API metadata, so zero/missing counts cannot identify the type.
  // Avoid subscribing the search component to every observable tab ID.
  if (option instanceof Tab) return false
  return 'id' in option && typeof option.id === 'string'
}

const renderTabOption = (
  tab: SearchOption,
  theme,
  groupedSectionTabIds,
  matchMode: SearchMatchMode,
  query: string,
) => {
  if (tab.isDivider) {
    if (tab.dividerType === 'group') {
      const groupColor = getChromeTabGroupColor(tab.color)
      return (
        <div
          className="flex items-center justify-between w-full h-full px-2 text-sm font-medium border-t"
          style={{ borderTopColor: theme.palette.divider }}
          data-testid={`search-group-header-${tab.groupId}`}
        >
          <div className="flex items-center min-w-0 gap-2 flex-1">
            <div
              className="inline-flex min-w-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold"
              title={tab.title}
              style={{
                backgroundColor: groupColor.line,
                color: groupColor.chipText,
                maxWidth: tab.windowTitle ? '55%' : '100%',
                flexShrink: tab.windowTitle ? 0 : undefined,
              }}
              data-testid={`search-group-header-chip-${tab.groupId}`}
            >
              <span className="truncate">
                <HighlightNode
                  query={query}
                  text={tab.title}
                  mode={matchMode}
                  inline
                />
              </span>
            </div>
            {tab.windowTitle && (
              <span
                className="inline-flex min-w-0 items-center gap-1 text-xs"
                style={{ color: theme.palette.text.secondary }}
                title={`Window: ${tab.windowTitle}`}
                data-testid={`search-group-window-${tab.groupId}`}
              >
                <BrowserWindowIcon
                  aria-hidden="true"
                  fontSize={14}
                  style={{ flexShrink: 0 }}
                />
                <span className="truncate">{tab.windowTitle}</span>
              </span>
            )}
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
  if (isHistoryItem(tab)) {
    return <HistoryItemTab tab={tab} matchMode={matchMode} />
  }
  return (
    <TabOption
      tab={tab}
      showInlineGroupBadge={!groupedSectionTabIds.has(tab.id)}
      matchMode={matchMode}
    />
  )
}

const renderCommand = (
  command: CommandOption,
  state: { inputValue: string },
) => {
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

type Props = {
  autoFocus?: boolean
  open?: boolean
  bottomInset?: number
  showResultMenu?: boolean
}

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

// Keep the virtual row component stable when its highlight or overlay changes.
// Remounting it would destroy an open search-result context menu.
const SearchResultRow = ({
  index,
  style,
  data,
}: {
  index: number
  style: React.CSSProperties
  data: any
}) => {
  const option = data.options[index]
  const itemProps = data.getItemProps({ index, item: option })
  const isHighlighted = data.highlightedIndex === index

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
      {data.isCommand
        ? renderCommand(option, { inputValue: data.query })
        : renderTabOption(
            option,
            data.theme,
            data.groupedSectionTabIds,
            data.searchMatchMode,
            data.query,
          )}
    </li>
  )
}

const AutocompleteSearch = observer((props: Props) => {
  const {
    autoFocus,
    open: propOpen,
    bottomInset = 0,
    showResultMenu = true,
  } = props
  const theme = useAppTheme()
  const searchInputRef = useSearchInputRef()
  const { userStore, searchStore, tabGroupStore, actionStore, hoverStore } =
    useStore()
  const { search, query, startType, stopType, isCommand } = searchStore
  const resultMenuEnabled = showResultMenu || isCommand
  const options = useOptions(resultMenuEnabled)
  const tabHeight = useTabHeight()
  const rootRef = useRef<HTMLDivElement>(null)
  const [dismissed, setDismissed] = useState(false)
  const isOpenControlled = propOpen !== undefined

  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(
    propOpen || false,
  )
  const [availableListHeight, setAvailableListHeight] = useState<number>(
    Number.POSITIVE_INFINITY,
  )
  const requestedOpen = isOpenControlled ? propOpen : uncontrolledIsOpen
  const isOpen = resultMenuEnabled && !dismissed && (requestedOpen || isCommand)
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      // The palette overlays this list. Keep its mounted rows and scroll offset.
      if (!nextOpen && actionStore.paletteOpen) return
      if (nextOpen) setDismissed(false)
      // The portal menu receives focus while its search result remains mounted.
      // Closing that result list would also unmount the menu being used.
      if (!nextOpen && actionStore.menu?.key.startsWith('search-tab-')) return
      if (
        !nextOpen &&
        hoverStore.hovered &&
        hoverStore.hoveredSurface === 'search'
      )
        return
      if (!isOpenControlled && (!nextOpen || resultMenuEnabled)) {
        setUncontrolledIsOpen(nextOpen)
      }
    },
    [actionStore, hoverStore, isOpenControlled, resultMenuEnabled],
  )

  useEffect(() => {
    hoverStore.hideTooltip(undefined, 'search')
  }, [query, hoverStore])
  useEffect(() => {
    if (!isOpen) hoverStore.hideTooltip(undefined, 'search')
  }, [isOpen, hoverStore])

  useEffect(() => {
    if (!isOpen || isOpenControlled) return
    const dismissOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        rootRef.current?.contains(target) ||
        target.closest?.('[data-tab-details-panel], [role="menu"]')
      )
        return
      hoverStore.hideTooltip(undefined, 'search')
      handleOpenChange(false)
    }
    document.addEventListener('mousedown', dismissOutside)
    return () => document.removeEventListener('mousedown', dismissOutside)
  }, [isOpen, isOpenControlled, hoverStore, handleOpenChange])

  const groupedSectionTabIdsRef = useRef(new Set())
  const searchMatchModeRef = useRef<SearchMatchMode>('none')
  const filterOptions = useMemo(
    () =>
      getFilterOptions(
        isCommand,
        tabGroupStore,
        groupedSectionTabIdsRef,
        searchMatchModeRef,
        searchStore,
      ),
    [isCommand, tabGroupStore, searchStore],
  )

  const filteredOptions = useMemo(() => {
    if (!resultMenuEnabled) {
      return []
    }
    return filterOptions(options, { inputValue: query })
  }, [options, query, filterOptions, resultMenuEnabled])

  const itemCount = filteredOptions.length

  const handleSelect = (option: SearchOption) => {
    if (!option || typeof option === 'string') return
    if ('isDivider' in option && option.isDivider) return

    if (isCommand && 'command' in option) {
      option.command()
    } else {
      if ('activate' in option && option.activate) {
        option.activate({ origin: 'search', reveal: true })
      } else if ('url' in option) {
        openURL(option.url)
      }
    }
    search('')
    handleOpenChange(false)
  }

  const {
    highlightedIndex,
    listRef,
    getRootProps,
    getInputProps,
    getListboxProps,
    getItemProps,
  } = useCombobox({
    items: filteredOptions,
    inputValue: query,
    onInputValueChange: (value) => {
      if (value.startsWith('>')) {
        actionStore.openPalette(value.slice(1).trimStart())
        return
      }
      setDismissed(false)
      search(value)
    },
    onSelect: handleSelect,
    isItemDisabled: useMemo(() => (item) => Boolean(item.isDivider), []),
    isOpen,
    onOpenChange: handleOpenChange,
  })

  const inputProps = getInputProps()
  const rootProps = getRootProps()
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

  const listHeight = getAutocompleteListHeight({
    itemCount,
    tabHeight,
    maxHeight: availableListHeight,
  })

  const handleEscape = () => {
    search('')
    setDismissed(true)
    handleOpenChange(false)
    searchInputRef.current?.blur()
  }

  return (
    <div
      {...rootProps}
      {...(actionStore.paletteOpen ? { inert: '' } : {})}
      aria-hidden={actionStore.paletteOpen || undefined}
      ref={(node) => {
        rootRef.current = node
        if (typeof rootProps.ref === 'function') {
          rootProps.ref(node)
        } else if (rootProps.ref) {
          rootProps.ref.current = node
        }
      }}
      style={{ position: 'relative', flex: '1 1 0%', minWidth: 0 }}
    >
      {/* Input Field */}
      <div
        data-testid="toolbar-search-input"
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
          ref={(node) => {
            searchInputRef.current = node
            if (typeof inputProps.ref === 'function') {
              inputProps.ref(node)
            } else if (inputProps.ref) {
              inputProps.ref.current = node
            }
          }}
          type="text"
          value={inputProps.value}
          onChange={inputProps.onChange}
          onKeyDown={(event) => {
            const highlighted = filteredOptions[highlightedIndex]
            if (
              event.altKey &&
              event.key === 'ArrowDown' &&
              highlighted instanceof Tab &&
              userStore.showTabTooltip
            ) {
              event.preventDefault()
              event.stopPropagation()
              hoverStore.openTooltip(highlighted.id, true, 'search')
              return
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              handleEscape()
              return
            }

            inputProps.onKeyDown(event)
          }}
          onKeyUp={(event) => {
            // Keep the full Escape press within search's two-step dismissal.
            if (event.key === 'Escape') event.stopPropagation()
          }}
          onFocus={() => {
            setDismissed(false)
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
        {query && (
          <ControlIconButton
            aria-label="Clear search"
            controlSize="compact"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              search('')
              setDismissed(true)
              handleOpenChange(false)
              searchInputRef.current?.focus()
            }}
            style={{ width: 24, minWidth: 24, height: 24, minHeight: 24 }}
          >
            <CloseIcon fontSize={16} />
          </ControlIconButton>
        )}
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
      {isOpen && (itemCount > 0 || query.trim()) && (
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
          {itemCount === 0 ? (
            <div
              role="status"
              className="px-3 py-4 text-sm"
              style={{ color: theme.palette.text.secondary }}
            >
              {isCommand ? 'No matching commands' : 'No matching tabs'}
            </div>
          ) : (
            <VariableSizeList
              ref={listRef}
              itemData={{
                options: filteredOptions,
                highlightedIndex,
                getItemProps,
                isCommand,
                query,
                theme,
                groupedSectionTabIds: groupedSectionTabIdsRef.current,
                searchMatchMode: searchMatchModeRef.current,
              }}
              height={listHeight}
              width="100%"
              innerElementType="ul"
              itemSize={() => tabHeight}
              overscanCount={5}
              itemCount={itemCount}
            >
              {SearchResultRow}
            </VariableSizeList>
          )}
        </div>
      )}
    </div>
  )
})

export default AutocompleteSearch
