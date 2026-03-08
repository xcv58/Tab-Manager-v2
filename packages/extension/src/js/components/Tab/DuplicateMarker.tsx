import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { useTheme } from 'components/hooks/useTheme'
import { TabProps } from 'components/types'

export default observer((props: TabProps) => {
  const { userStore } = useStore()
  const isDarkTheme = useTheme()
  const {
    tab: { isDuplicated, isHovered, isFocused, isSelected },
  } = props
  const visible = userStore.highlightDuplicatedTab && isDuplicated
  const emphasizeMarker = isHovered || isFocused || isSelected
  const lineColor = isDarkTheme
    ? emphasizeMarker
      ? 'rgba(191, 205, 229, 0.96)'
      : 'rgba(179, 197, 223, 0.8)'
    : emphasizeMarker
      ? 'rgba(71, 85, 105, 0.88)'
      : 'rgba(100, 116, 139, 0.72)'

  return (
    <div
      className="flex h-10 shrink-0 items-center justify-end"
      style={{ width: 4, paddingRight: 1 }}
    >
      <span
        data-testid={`tab-duplicate-marker-${props.tab.id}`}
        aria-hidden="true"
        className="block rounded-full transition-opacity duration-150"
        style={{
          opacity: visible ? 1 : 0,
          backgroundColor: lineColor,
          width: 2,
          height: 11,
        }}
      />
    </div>
  )
})
