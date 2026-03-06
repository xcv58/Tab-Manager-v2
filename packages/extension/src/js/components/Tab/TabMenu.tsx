import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Popover from '@mui/material/Popover'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { getNoun } from 'libs'
import { useTheme } from '@mui/material'
import Tab from 'stores/Tab'
import { useStore } from 'components/hooks/useStore'

interface IDivider {
  __typename: 'DIVIDER'
}
type Option = {
  __typename: 'OPTION'
} & {
  disabled?: boolean
} & {
  label: string
} & {
  onClick?: () => void
}
type OptionOrDivider = IDivider | Option

const DIVIDER: IDivider = { __typename: 'DIVIDER' }
const OPTION: Option = { __typename: 'OPTION', label: '' }
const CHROME_TAB_GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
]

export default observer((props: { tab: Tab }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const theme = useTheme()
  const { tabGroupStore, tabStore } = useStore()
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const getOnClick = (func) => () => {
    handleClose()
    if (func) {
      func()
    }
  }
  const getOptionTestId = (label: string) =>
    `tab-menu-option-${props.tab.id}-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}`
  const {
    closeOtherTabs,
    win,
    remove,
    groupTab,
    sameDomainTabs,
    pinned,
    togglePin,
    duplicatedTabCount,
    closeDuplicatedTab,
  } = props.tab
  const hasTabGroupsApi = !!tabGroupStore?.hasTabGroupsApi?.()
  const canMutateTabGroups = !!tabGroupStore?.canMutateGroups?.()
  const tabGroup = hasTabGroupsApi
    ? tabGroupStore.getTabGroup(props.tab.groupId)
    : null
  const selectedTabs = tabStore.sources
  const tabsForNewGroup = selectedTabs.length ? selectedTabs : [props.tab]
  const uniqueTabsForNewGroup = Array.from(
    new Map(tabsForNewGroup.map((tab) => [tab.id, tab])).values(),
  )
  const addableSelectedTabs = selectedTabs.filter(
    (tab) => tab.id !== props.tab.id && tab.groupId !== props.tab.groupId,
  )

  const options: (OptionOrDivider | false)[] = [
    {
      ...OPTION,
      label: pinned ? 'Unpin tab' : 'Pin tab',
      onClick: togglePin,
    },
    {
      ...OPTION,
      label: 'Close',
      onClick: remove,
    },
    {
      ...OPTION,
      label: 'Close other tabs',
      onClick: closeOtherTabs,
      disabled: win.tabs.length <= 1,
    },
  ]
  if (process.env.TARGET_BROWSER === 'firefox') {
    options.push(
      DIVIDER,
      {
        ...OPTION,
        label: `${
          props.tab.isSelected ? 'Unselect' : 'Select'
        } tabs in the same container`,
        onClick: () => {
          props.tab.selectTabsInSameContainer()
        },
      },
      {
        ...OPTION,
        label: 'Open same container tabs in a new window',
        onClick: () => {
          props.tab.openSameContainerTabs()
        },
      },
    )
  }
  if (canMutateTabGroups && uniqueTabsForNewGroup.length >= 2) {
    options.push(DIVIDER, {
      ...OPTION,
      label: `Create new group from ${uniqueTabsForNewGroup.length} selected ${getNoun(
        'tab',
        uniqueTabsForNewGroup.length,
      )}`,
      onClick: () => {
        tabGroupStore.createGroup(uniqueTabsForNewGroup.map((tab) => tab.id))
        tabStore.unselectAll()
      },
    })
  }
  if (canMutateTabGroups && tabGroup) {
    options.push(
      DIVIDER,
      {
        ...OPTION,
        label: tabGroup.collapsed ? 'Expand group' : 'Collapse group',
        onClick: () => tabGroupStore.toggleCollapsed(props.tab.groupId),
      },
      {
        ...OPTION,
        label: 'Rename group',
        onClick: () => {
          if (!window.prompt) {
            return
          }
          const title =
            window.prompt('Rename group', tabGroup.title || '') || ''
          tabGroupStore.renameGroup(props.tab.groupId, title)
        },
      },
      {
        ...OPTION,
        label: 'Change group color',
        onClick: () => {
          if (!window.prompt) {
            return
          }
          const value = (window.prompt(
            `Set group color (${CHROME_TAB_GROUP_COLORS.join(', ')})`,
            tabGroup.color || 'grey',
          ) || '') as chrome.tabGroups.ColorEnum
          if (!CHROME_TAB_GROUP_COLORS.includes(value)) {
            return
          }
          tabGroupStore.recolorGroup(props.tab.groupId, value)
        },
      },
      addableSelectedTabs.length > 0 && {
        ...OPTION,
        label: `Add ${addableSelectedTabs.length} selected ${getNoun(
          'tab',
          addableSelectedTabs.length,
        )} to this group`,
        onClick: () =>
          tabGroupStore.addTabsToGroup(
            addableSelectedTabs.map((tab) => tab.id),
            props.tab.groupId,
          ),
      },
      {
        ...OPTION,
        label: 'Remove this tab from group',
        onClick: () => tabGroupStore.ungroupTab(props.tab.id),
      },
      {
        ...OPTION,
        label: 'Ungroup tabs',
        onClick: () => tabGroupStore.ungroup(props.tab.groupId),
      },
    )
  }
  if (sameDomainTabs && sameDomainTabs.length > 1) {
    options.push(DIVIDER, {
      ...OPTION,
      label: `Cluster ${sameDomainTabs.length} same domain ungrouped tabs to this window`,
      onClick: groupTab,
    })
  }
  if (duplicatedTabCount > 1) {
    options.push(DIVIDER, {
      ...OPTION,
      label: `Close other ${duplicatedTabCount - 1} duplicated ${getNoun(
        'tab',
        duplicatedTabCount - 1,
      )}`,
      onClick: closeDuplicatedTab,
    })
  }

  const content = options
    .filter((option): option is OptionOrDivider => !!option)
    .map((option, i) => {
      if (option.__typename === 'DIVIDER') {
        return <Divider key={i} />
      }
      const { label, onClick, disabled } = option
      return (
        <MenuItem
          key={label}
          disabled={disabled}
          onClick={getOnClick(onClick)}
          data-testid={getOptionTestId(label)}
        >
          {label}
        </MenuItem>
      )
    })
  return (
    <>
      <IconButton
        onClick={handleClick}
        className="focus:outline-none"
        data-testid={`tab-menu-${props.tab.id}`}
      >
        <MoreVertIcon />
      </IconButton>
      <Popover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        onClose={handleClose}
        style={{ zIndex: theme.zIndex.tooltip + 1 }}
        PaperProps={{
          style: {
            minWidth: 200,
          },
        }}
      >
        {content}
      </Popover>
    </>
  )
})
