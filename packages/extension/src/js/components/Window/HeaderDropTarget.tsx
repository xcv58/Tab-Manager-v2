import React from 'react'
import { observer } from 'mobx-react-lite'
import { useDrop } from 'react-dnd'
import { ItemTypes } from 'libs/react-dnd'
import { useAppTheme } from 'libs/appTheme'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import type { WindowEdge } from 'stores/DragStore'
import { getTabMoveDestinationHint } from 'libs/tabMovePlan'

type Props = WinProps & { position: WindowEdge }

export default observer(({ win, position }: Props) => {
  const theme = useAppTheme()
  const { dragStore, userStore, tabStore } = useStore()
  const blockedHint = getTabMoveDestinationHint(
    win,
    tabStore.selection.values(),
  )
  const allowed = !blockedHint
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    canDrop: () => !getTabMoveDestinationHint(win, tabStore.selection.values()),
    hover: (_, monitor) => {
      const targetId = monitor.getHandlerId()
      if (targetId) {
        dragStore.setDropPreviewTarget({
          targetId,
          destination: position,
          blockedHint: getTabMoveDestinationHint(
            win,
            tabStore.selection.values(),
          ),
        })
      }
    },
    drop: (_, monitor) => {
      if (!monitor.didDrop()) {
        dragStore.moveSelectedTabsToWindowEdge(win.id, position)
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
      data-testid={`window-header-drop-${position}-${win.id}`}
      aria-label={blockedHint || `Move to ${position}`}
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
          className="h-6 w-6 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: markerColor }}
        >
          <g transform={beginning ? undefined : 'translate(0 24) scale(1 -1)'}>
            <path d="M 3 16 L 12 9 L 21 16" />
          </g>
        </svg>
        {beginning ? (
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
