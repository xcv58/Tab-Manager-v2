import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from 'components/types'
import { DEFAULT_CONTROL_SIZE } from 'libs/layoutMetrics'

const ARIA_LABEL = 'Toggle select'
const CONTROL_SLOT_CLASS =
  'group relative flex h-10 w-10 shrink-0 items-center justify-center'
const CONTROL_LAYER_CLASS =
  'absolute inset-0 flex items-center justify-center transition-opacity duration-150'
const CONTROL_SX = {
  width: DEFAULT_CONTROL_SIZE,
  height: DEFAULT_CONTROL_SIZE,
  p: 0.625,
  m: 0,
  '& .MuiSvgIcon-root': {
    fontSize: 20,
  },
}

export const Icon = observer((props: TabProps) => {
  const { userStore } = useStore()
  const { focus, select, iconUrl, isSelected, bulkSelect } = props.tab
  const checkbox = (
    <Checkbox
      color="primary"
      checked={isSelected}
      sx={CONTROL_SX}
      inputProps={{
        'aria-label': ARIA_LABEL,
      }}
      onClick={(e) => {
        if (process.env.TARGET_BROWSER === 'firefox') {
          if (e.altKey) {
            return props.tab.selectTabsInSameContainer()
          }
        }
        if (isSelected || !e.shiftKey) {
          select()
        } else {
          bulkSelect()
        }
      }}
    />
  )
  if (!userStore.showTabIcon) {
    return (
      <div
        className={CONTROL_SLOT_CLASS}
        style={{ width: DEFAULT_CONTROL_SIZE, height: DEFAULT_CONTROL_SIZE }}
      >
        {checkbox}
      </div>
    )
  }
  return (
    <div
      className={CONTROL_SLOT_CLASS}
      style={{ width: DEFAULT_CONTROL_SIZE, height: DEFAULT_CONTROL_SIZE }}
    >
      <div
        className={classNames(CONTROL_LAYER_CLASS, {
          'pointer-events-none opacity-0': isSelected,
          'opacity-100 group-hover:pointer-events-none group-hover:opacity-0':
            !isSelected,
        })}
      >
        <IconButton
          aria-label={ARIA_LABEL}
          className="focus:outline-none focus:ring"
          onClick={select}
          onFocus={focus}
          sx={CONTROL_SX}
        >
          <img
            className="w-6 h-6"
            style={{ width: 20, height: 20 }}
            src={iconUrl}
          />
        </IconButton>
      </div>
      <div
        className={classNames(CONTROL_LAYER_CLASS, {
          'opacity-100': isSelected,
          'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100':
            !isSelected,
        })}
      >
        {checkbox}
      </div>
    </div>
  )
})

export default observer((props: TabProps) => {
  const { faked, tab } = props
  if (!faked) {
    return <Icon tab={tab} />
  }
  const { iconUrl } = tab
  return (
    <div
      className={CONTROL_SLOT_CLASS}
      style={{ width: DEFAULT_CONTROL_SIZE, height: DEFAULT_CONTROL_SIZE }}
    >
      <IconButton
        disabled
        aria-label={ARIA_LABEL}
        className="focus:outline-none focus:ring"
        sx={CONTROL_SX}
      >
        <img
          className="w-6 h-6"
          style={{ width: 20, height: 20 }}
          src={iconUrl}
        />
      </IconButton>
    </div>
  )
})
