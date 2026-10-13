import React from 'react'
import { observer } from 'mobx-react-lite'
import { useDrop } from 'react-dnd'
import { ItemTypes } from 'libs/react-dnd'
import { useAppTheme } from 'libs/appTheme'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import type { WindowEdge } from 'stores/DragStore'
import { getTabMoveDestinationHint } from 'libs/tabMovePlan'
import { getNoun } from 'libs'

type Props = WinProps & { position: WindowEdge; groupId?: number }

export default observer(({ win, position, groupId }: Props) => {
  const theme = useAppTheme()
  const { dragStore, userStore, tabStore, tabGroupStore } = useStore()
  const isGroup = groupId != null
  const moveGroups = isGroup && dragStore.movingWholeGroups
  const groupTitle = isGroup
    ? tabGroupStore.getTabGroup(groupId)?.title || 'Unnamed group'
    : ''
  const count = tabStore.selection.size
  const groupCount = moveGroups ? dragStore.wholeSelectedGroupIds.size : 0
  const otherTabCount = moveGroups
    ? tabStore.sources.filter(
        (tab) => !dragStore.wholeSelectedGroupIds.has(tab.groupId),
      ).length
    : 0
  const groupMoveLabel = `${groupCount} ${getNoun('group', groupCount)}${otherTabCount ? ` and ${otherTabCount} ${getNoun('tab', otherTabCount)}` : ''}`
  const label = isGroup
    ? moveGroups
      ? `Move ${groupMoveLabel} ${position === 'beginning' ? 'before' : 'after'} ${groupTitle}`
      : `Add ${count} ${getNoun('tab', count)} to ${position} of ${groupTitle}`
    : `Move to ${position}`
  const getBlockedHint = () =>
    isGroup
      ? dragStore.getGroupEdgeMoveHint(groupId)
      : getTabMoveDestinationHint(win, tabStore.selection.values())
  const blockedHint = getBlockedHint()
  const allowed = !blockedHint
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    canDrop: () => !getBlockedHint(),
    hover: (_, monitor) => {
      const targetId = monitor.getHandlerId()
      if (targetId) {
        dragStore.setDropPreviewTarget({
          targetId,
          destination: position,
          blockedHint: getBlockedHint(),
          label: isGroup ? label : undefined,
        })
      }
    },
    drop: (_, monitor) => {
      if (!monitor.didDrop()) {
        if (isGroup) dragStore.moveSelectedTabsToGroupEdge(groupId, position)
        else dragStore.moveSelectedTabsToWindowEdge(win.id, position)
      }
    },
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      isOver: monitor.isOver({ shallow: true }),
    }),
  })
  const { canDrop, isOver } = dropProps
  const active = canDrop && isOver
  const beginning = position === 'beginning'
  const dark = theme.mode === 'dark'
  const highContrast = userStore.increaseContrast
  const accent = beginning
    ? dark
      ? '96, 165, 250'
      : '37, 99, 235'
    : dark
      ? '94, 196, 186'
      : '13, 148, 136'
  const markerColor = allowed
    ? `rgba(${accent}, ${active || highContrast ? 1 : 0.9})`
    : theme.palette.text.secondary
  const labelColor = allowed
    ? dark
      ? beginning
        ? '#bfdbfe'
        : '#99f6e4'
      : beginning
        ? '#1d4ed8'
        : '#115e59'
    : theme.palette.text.secondary
  const tintOpacity =
    (active ? (dark ? 0.28 : 0.19) : dark ? 0.12 : 0.08) +
    (highContrast ? 0.07 : 0)

  return (
    <div
      ref={drop}
      data-testid={
        isGroup
          ? `group-header-drop-${position}-${groupId}`
          : `window-header-drop-${position}-${win.id}`
      }
      aria-label={blockedHint || label}
      className="window-header-drop-target relative min-w-0 font-semibold"
      data-position={position}
      style={{
        cursor: allowed ? 'move' : 'not-allowed',
        opacity: allowed ? 1 : 0.5,
        color: labelColor,
        backgroundColor: allowed
          ? `rgba(${accent}, ${tintOpacity})`
          : theme.palette.action.hover,
        boxShadow: allowed
          ? `inset 0 0 0 ${active ? 2 : 1}px rgba(${accent}, ${active ? 1 : highContrast ? 0.5 : 0.22})`
          : undefined,
        borderRadius:
          userStore.uiPreset === 'classic'
            ? 0
            : beginning
              ? '0.4rem 0 0 0.4rem'
              : '0 0.4rem 0.4rem 0',
      }}
    >
      <div
        aria-hidden="true"
        className="window-header-drop-label pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 whitespace-nowrap"
      >
        <svg
          className="h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: markerColor }}
        >
          <g transform={beginning ? undefined : 'translate(0 24) scale(1 -1)'}>
            <path d="M 3 16 L 12 9 L 21 16" />
          </g>
        </svg>
        {moveGroups ? (
          <span>{beginning ? 'Before' : 'After'}</span>
        ) : beginning ? (
          <>
            <span className="window-header-full-label">Beginning</span>
            <span className="window-header-compact-label">Start</span>
          </>
        ) : (
          <span>End</span>
        )}
      </div>
    </div>
  )
})
