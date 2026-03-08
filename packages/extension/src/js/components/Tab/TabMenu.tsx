import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Popover from '@mui/material/Popover'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { getNoun } from 'libs'
import { useTheme } from '@mui/material'
import Tab from 'stores/Tab'
import { useStore } from 'components/hooks/useStore'
import ControlIconButton from 'components/ControlIconButton'

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

export default observer((props: { tab: Tab }) => {
  const [anchorEl, setAnchorEl] = useState(null)
  const theme = useTheme()
  const { tabGroupStore } = useStore()
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
      disabled: (win?.tabs?.length ?? 0) <= 1,
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
  if (canMutateTabGroups && tabGroup) {
    options.push(DIVIDER, {
      ...OPTION,
      label: 'Remove this tab from group',
      onClick: () => tabGroupStore.ungroupTab(props.tab.id),
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
      <ControlIconButton
        onClick={handleClick}
        controlSize="compact"
        aria-label="Tab actions"
        data-testid={`tab-menu-${props.tab.id}`}
      >
        <MoreVertIcon fontSize="small" />
      </ControlIconButton>
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
