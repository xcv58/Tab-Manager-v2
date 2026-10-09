import React, { useRef, useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import SelectAll from 'components/Window/SelectAll'
import CloseButton from 'components/CloseButton'
import RowActionSlot from 'components/RowActionSlot'
import RowActionRail from 'components/RowActionRail'
import { getNoun } from 'libs'
import classNames from 'classnames'
import HideToggle from './HideToggle'
import WindowActionsMenu from './WindowActionsMenu'
import { WinProps } from 'components/types'
import { useTheme } from 'components/hooks/useTheme'
import { useStore } from 'components/hooks/useStore'
import Tooltip from 'components/ui/Tooltip'
import { MIN_INTERACTIVE_ROW_HEIGHT } from 'libs/layoutMetrics'
import { getUiColorTokens } from 'libs/uiColorTokens'

type Props = WinProps & { className: string; dropOverlay?: boolean }

export default observer((props: Props) => {
  const nodeRef = useRef(null)
  const titleButtonRef = useRef<HTMLButtonElement | null>(null)
  const { focusStore, userStore } = useStore()
  const theme = useAppTheme()
  const isDarkTheme = useTheme()
  const uiColors = getUiColorTokens(
    theme.mode === 'dark',
    userStore.uiPreset,
    userStore.increaseContrast,
  )
  const isClassicUi = userStore.uiPreset === 'classic'
  const { className, win, dropOverlay = false } = props
  const { tabs, activate, invisibleTabs, hide, toggleHide, isFocused } = win
  const { length } = tabs
  const text = `${length} ${getNoun('tab', length)}`
  const invisibleLength = invisibleTabs.length
  const [titleDisplayMode, setTitleDisplayMode] = useState<
    'full' | 'compact' | 'minimal'
  >('full')
  const hiddenText = useMemo(() => {
    if (hide || invisibleLength <= 0) {
      return ''
    }
    if (titleDisplayMode === 'full') {
      return ` / ${invisibleLength} hidden`
    }
    if (titleDisplayMode === 'compact') {
      return ` · ${invisibleLength}h`
    }
    return ''
  }, [hide, invisibleLength, titleDisplayMode])
  const fullTitleText = useMemo(() => {
    if (hide || invisibleLength <= 0) {
      return text
    }
    return `${text} / ${invisibleLength} hidden`
  }, [hide, invisibleLength, text])
  const needsTooltip =
    !hide && invisibleLength > 0 && titleDisplayMode !== 'full'
  useEffect(() => {
    if (isFocused && nodeRef.current) {
      if (win.shouldMoveDomFocus) {
        nodeRef.current.focus({ preventScroll: true })
      }
      if (
        win.shouldMoveDomFocus &&
        win.shouldRevealOnFocus &&
        focusStore.shouldRevealNode(nodeRef.current)
      ) {
        nodeRef.current.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'nearest',
        })
      }
    }
  }, [
    focusStore,
    isFocused,
    win.focusRequestId,
    win.shouldMoveDomFocus,
    win.shouldRevealOnFocus,
  ])
  useEffect(() => {
    win.setNodeRef(nodeRef)
  }, [win])
  useEffect(() => {
    const updateTitleMode = () => {
      const width = titleButtonRef.current?.clientWidth ?? 0
      if (width <= 0) {
        return
      }
      if (width < 170) {
        setTitleDisplayMode('minimal')
        return
      }
      if (width < 235) {
        setTitleDisplayMode('compact')
        return
      }
      setTitleDisplayMode('full')
    }
    updateTitleMode()
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateTitleMode)
      if (titleButtonRef.current) {
        observer.observe(titleButtonRef.current)
      }
      return () => observer.disconnect()
    }
    window.addEventListener('resize', updateTitleMode)
    return () => window.removeEventListener('resize', updateTitleMode)
  }, [])
  const headerSurface = uiColors.headerSurface
  const titleTextNode = (
    <div className="flex-auto overflow-hidden text-2xl leading-none whitespace-nowrap">
      {text}
      {hiddenText}
    </div>
  )
  const onHeaderFocus = React.useCallback(() => {
    if (win.isFocused) {
      return
    }
    focusStore.focus(win, {
      origin: 'keyboard',
      reveal: false,
      moveDomFocus: false,
    })
  }, [focusStore, win])
  const onTitleClick = React.useCallback(() => {
    activate({ origin: 'mouse', reveal: false })
  }, [activate])
  return (
    <div
      tabIndex={-1}
      ref={nodeRef}
      onFocusCapture={onHeaderFocus}
      data-testid={`window-title-${win.id}`}
      className={classNames(
        'flex min-h-10 items-center justify-between font-bold border-0 border-b',
        { 'text-gray-100': isDarkTheme, 'text-gray-900': !isDarkTheme },
        className,
      )}
      style={{
        backgroundColor: dropOverlay ? 'transparent' : headerSurface,
        borderColor: dropOverlay ? 'transparent' : theme.palette.divider,
        borderBottom: isClassicUi ? 'none' : undefined,
        minHeight: MIN_INTERACTIVE_ROW_HEIGHT,
      }}
    >
      <div
        className="flex min-h-10 w-full items-center justify-between"
        style={{ minHeight: MIN_INTERACTIVE_ROW_HEIGHT }}
      >
        <SelectAll {...props} />
        <button
          ref={titleButtonRef}
          onClick={onTitleClick}
          className={classNames(
            'flex h-10 flex-auto items-center overflow-hidden pl-1 text-base text-left rounded-sm',
            {
              'text-gray-900': !isDarkTheme,
              'text-gray-100': isDarkTheme,
            },
          )}
          style={{ minHeight: MIN_INTERACTIVE_ROW_HEIGHT }}
        >
          {needsTooltip ? (
            <Tooltip title={fullTitleText}>
              <div>{titleTextNode}</div>
            </Tooltip>
          ) : (
            titleTextNode
          )}
        </button>
        <RowActionRail>
          <RowActionSlot visible>
            <HideToggle
              {...{
                hide,
                toggleHide,
              }}
            />
          </RowActionSlot>
          <RowActionSlot visible>
            <WindowActionsMenu win={win} />
          </RowActionSlot>
          <RowActionSlot visible>
            <Tooltip title="Close window">
              <span className="inline-flex">
                <CloseButton
                  onClick={() => props.win.close()}
                  aria-label="Close window"
                  size="compact"
                  tone="danger"
                />
              </span>
            </Tooltip>
          </RowActionSlot>
        </RowActionRail>
      </div>
    </div>
  )
})
