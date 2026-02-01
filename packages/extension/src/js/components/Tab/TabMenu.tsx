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
  const options: OptionOrDivider[] = [
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
  if (
    process.env.IS_SAFARI !== 'true' &&
    sameDomainTabs &&
    sameDomainTabs.length > 1
  ) {
    options.push(DIVIDER, {
      ...OPTION,
      label: `Group ${sameDomainTabs.length} same domain tabs to this window`,
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

  const content = options.map((option, i) => {
    if (option.__typename === 'DIVIDER') {
      return <Divider key={i} />
    }
    const { label, onClick, disabled } = option
    return (
      <MenuItem key={label} disabled={disabled} onClick={getOnClick(onClick)}>
        {label}
      </MenuItem>
    )
  })
  return (
    <>
      <IconButton onClick={handleClick} className="focus:outline-none">
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
