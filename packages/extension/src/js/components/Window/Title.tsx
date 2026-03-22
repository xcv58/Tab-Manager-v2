import React, { useRef, useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from 'libs/appTheme'
import SelectAll from 'components/Window/SelectAll'
import Sort from 'components/Window/Sort'
import CloseButton from 'components/CloseButton'
import RowActionSlot from 'components/RowActionSlot'
import RowActionRail from 'components/RowActionRail'
import { getNoun } from 'libs'
import classNames from 'classnames'
import Reload from './Reload'
import HideToggle from './HideToggle'
import { WinProps } from 'components/types'
import { useTheme } from 'components/hooks/useTheme'
import { useStore } from 'components/hooks/useStore'
import Tooltip from '@mui/material/Tooltip'
import { MIN_INTERACTIVE_ROW_HEIGHT } from 'libs/layoutMetrics'
import { getUiColorTokens } from 'libs/uiColorTokens'

export default observer((props: WinProps & { className: string }) => {
  const nodeRef = useRef(null)
  const titleButtonRef = useRef<HTMLButtonElement | null>(null)
  const { focusStore, userStore } = useStore()
  const theme = useAppTheme()
  const isDarkTheme = useTheme()
  const uiColors = getUiColorTokens(theme.mode === 'dark', userStore.uiPreset)
  const isClassicUi = userStore.uiPreset === 'classic'
  const { className, win } = props
  const { tabs, activate, invisibleTabs, reload, hide, toggleHide, isFocused } =
    win
  const { length } = tabs
  const text = `${length} ${getNoun('tab', length)}`
  const invisibleLength = invisibleTabs.length
  const [titleDisplayMode, setTitleDisplayMode] = useState<
    'full' | 'compact' | 'minimal'
  >('full')
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)
  const [isHeaderFocusWithin, setIsHeaderFocusWithin] = useState(false)
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
  const emphasizeWindowControls =
    isClassicUi || isHeaderHovered || isHeaderFocusWithin || isFocused
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
  const onTitleFocus = React.useCallback(() => {
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
      data-testid={`window-title-${win.id}`}
      className={classNames(
        'flex min-h-10 items-center justify-between font-bold border-0 border-b',
        { 'text-gray-100': isDarkTheme, 'text-gray-900': !isDarkTheme },
        className,
      )}
      onMouseEnter={() => setIsHeaderHovered(true)}
      onMouseLeave={() => setIsHeaderHovered(false)}
      onFocusCapture={() => setIsHeaderFocusWithin(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null
        if (!event.currentTarget.contains(nextTarget)) {
          setIsHeaderFocusWithin(false)
        }
      }}
      style={{
        backgroundColor: headerSurface,
        borderColor: theme.palette.divider,
        borderBottom: isClassicUi ? 'none' : undefined,
        minHeight: MIN_INTERACTIVE_ROW_HEIGHT,
      }}
    >
      <div
        className="flex min-h-10 w-full items-center justify-between pl-1"
        style={{ minHeight: MIN_INTERACTIVE_ROW_HEIGHT }}
      >
        <SelectAll {...props} />
        <button
          ref={titleButtonRef}
          onClick={onTitleClick}
          onFocus={onTitleFocus}
          className={classNames(
            'flex h-10 flex-auto items-center overflow-hidden text-base text-left rounded-sm',
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
          <RowActionSlot visible={!hide}>
            {!hide && <Sort {...props} />}
          </RowActionSlot>
          <RowActionSlot visible={emphasizeWindowControls && !hide}>
            {!hide && <Reload {...{ reload }} />}
          </RowActionSlot>
          <RowActionSlot visible={emphasizeWindowControls}>
            <HideToggle
              {...{
                hide,
                toggleHide,
              }}
            />
          </RowActionSlot>
          <RowActionSlot visible>
            <CloseButton
              onClick={() => props.win.close()}
              size="compact"
              tone="danger"
            />
          </RowActionSlot>
        </RowActionRail>
      </div>
    </div>
  )
})
