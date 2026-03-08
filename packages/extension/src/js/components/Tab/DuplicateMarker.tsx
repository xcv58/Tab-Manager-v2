import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { useTheme } from 'components/hooks/useTheme'
import { TabProps } from 'components/types'

export default observer((props: TabProps) => {
  const { userStore } = useStore()
  const isDarkTheme = useTheme()
  const {
    tab: { isDuplicated },
  } = props
  const visible = userStore.highlightDuplicatedTab && isDuplicated
  const lineColor = isDarkTheme
    ? 'rgba(179, 197, 223, 0.5)'
    : 'rgba(100, 116, 139, 0.52)'

  return (
    <div className="flex h-10 w-2 shrink-0 items-center justify-end">
      <span
        data-testid={`tab-duplicate-marker-${props.tab.id}`}
        aria-hidden="true"
        className="block h-5 w-px rounded-full"
        style={{
          opacity: visible ? 1 : 0,
          backgroundColor: lineColor,
        }}
      />
    </div>
  )
})
