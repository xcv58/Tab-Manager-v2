import React from 'react'
import { observer } from 'mobx-react-lite'
import { useDrop } from 'react-dnd'
import { ItemTypes } from 'libs/react-dnd'
import { useAppTheme } from 'libs/appTheme'
import { useStore } from 'components/hooks/useStore'
import { WinProps } from 'components/types'
import Tooltip from 'components/ui/Tooltip'
import type { WindowEdge } from 'stores/DragStore'

type Props = WinProps & { position: WindowEdge }

// A rounded, open ribbon; the bottom destination mirrors it vertically.
const INSERTION_RIBBON_PATH = [
  'M 4 8',
  'L 22.4 0.8',
  'Q 24 0 25.6 0.8',
  'L 44 8',
  'Q 45.8 8.7 45 10.6',
  'Q 44.3 12.3 42.6 11.6',
  'L 24.4 4.6',
  'Q 24 4.4 23.6 4.6',
  'L 5.4 11.6',
  'Q 3.7 12.3 3 10.6',
  'Q 2.2 8.7 4 8',
  'Z',
].join(' ')

export default observer(({ win, position }: Props) => {
  const theme = useAppTheme()
  const { dragStore, userStore } = useStore()
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    canDrop: () => win.canDrop,
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
  const classic = userStore.uiPreset === 'classic'
  const highContrast = userStore.increaseContrast
  const accent = beginning
    ? dark
      ? '96, 165, 250'
      : '37, 99, 235'
    : dark
      ? '94, 196, 186'
      : '13, 148, 136'
  const markerColor = win.canDrop
    ? `rgba(${accent}, ${active ? 1 : highContrast ? 0.75 : 0.45})`
    : theme.palette.text.secondary
  const tintOpacity =
    (active ? (dark ? 0.15 : 0.12) : dark ? 0.07 : 0.05) +
    (highContrast ? 0.04 : 0)
  const washStrength =
    (highContrast ? 0.24 : dark ? 0.2 : 0.16) * (classic ? 0.75 : 1)
  const gradient = `linear-gradient(to ${beginning ? 'bottom' : 'top'}, rgba(${accent}, ${washStrength}) 0px, rgba(${accent}, ${washStrength / 3}) 7px, rgba(${accent}, 0) 16px)`
  const washMask = `linear-gradient(to ${beginning ? 'right' : 'left'}, black 0%, black 55%, transparent 100%)`
  const hint = win.canDrop
    ? `Move to ${position}`
    : 'Cannot move tabs to this window'

  return (
    <Tooltip title={hint} open={isOver} placement="bottom">
      <div
        ref={drop}
        data-testid={`window-header-drop-${position}-${win.id}`}
        aria-label={`Move to ${position}`}
        className="relative min-w-0 flex-1"
        style={{
          cursor: win.canDrop ? 'move' : 'not-allowed',
          opacity: win.canDrop ? 1 : 0.5,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            backgroundColor: win.canDrop
              ? `rgba(${accent}, ${tintOpacity})`
              : theme.palette.action.hover,
            transition: 'background-color 140ms ease',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            backgroundImage: win.canDrop ? gradient : undefined,
            maskImage: washMask,
            WebkitMaskImage: washMask,
            opacity: active ? 1 : highContrast ? 0.7 : 0.45,
            transition: 'opacity 140ms ease',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10"
        >
          <svg
            className="absolute left-1/2 -translate-x-1/2"
            width="48"
            height="12"
            viewBox="0 0 48 12"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            style={{
              top: beginning ? 0 : undefined,
              bottom: beginning ? undefined : 0,
              maxWidth: '70%',
              color: markerColor,
              transition: 'color 140ms ease',
            }}
          >
            <g
              transform={beginning ? undefined : 'translate(0 12) scale(1 -1)'}
            >
              <path d={INSERTION_RIBBON_PATH} fill="currentColor" />
            </g>
          </svg>
        </div>
        {/* Keep the drop surface above the header controls and decoration. */}
        <div aria-hidden="true" className="absolute inset-0 z-30" />
      </div>
    </Tooltip>
  )
})
