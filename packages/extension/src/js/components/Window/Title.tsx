import React, { useRef, useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useTheme as useMuiTheme } from '@mui/material/styles'
import SelectAll from 'components/Window/SelectAll'
import Sort from 'components/Window/Sort'
import CloseButton from 'components/CloseButton'
import { getNoun } from 'libs'
import classNames from 'classnames'
import Reload from './Reload'
import HideToggle from './HideToggle'
import { WinProps } from 'components/types'
import useReduceMotion from 'libs/useReduceMotion'
import { useTheme } from 'components/hooks/useTheme'
import Tooltip from '@mui/material/Tooltip'

const WindowControlSlot = ({
  visible,
  idleOpacity = 0,
  children,
}: {
  visible: boolean
  idleOpacity?: number
  children: React.ReactNode
}) => (
  <div
    aria-hidden={!visible && idleOpacity === 0}
    className={classNames(
      'flex h-10 w-10 shrink-0 items-center justify-center transition-opacity duration-150',
      {
        'visible pointer-events-auto opacity-100': visible,
        'visible pointer-events-auto': !visible && idleOpacity > 0,
        'invisible pointer-events-none opacity-0':
          !visible && idleOpacity === 0,
      },
    )}
    style={!visible && idleOpacity > 0 ? { opacity: idleOpacity } : undefined}
  >
    {children}
  </div>
)

export default observer((props: WinProps & { className: string }) => {
  const nodeRef = useRef(null)
  const titleButtonRef = useRef<HTMLButtonElement | null>(null)
  const theme = useMuiTheme()
  const isDarkTheme = useTheme()
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
  const showWindowControls = isHeaderHovered || isHeaderFocusWithin || isFocused
  const needsTooltip =
    !hide && invisibleLength > 0 && titleDisplayMode !== 'full'
  const reduceMotion = useReduceMotion()
  useEffect(() => {
    if (isFocused) {
      nodeRef.current.focus({ preventScroll: true })
      nodeRef.current.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
      })
    }
  }, [isFocused, reduceMotion])
  useEffect(() => {
    win.setNodeRef(nodeRef)
  })
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
  const headerSurface = theme.palette.mode === 'dark' ? '#343941' : '#f8fafc'
  const titleTextNode = (
    <div className="flex-auto overflow-hidden text-2xl leading-none whitespace-nowrap">
      {text}
      {hiddenText}
    </div>
  )
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
      }}
    >
      <SelectAll {...props} />
      <button
        ref={titleButtonRef}
        onClick={activate}
        className={classNames(
          'flex h-10 flex-auto items-center overflow-hidden text-base text-left rounded-sm',
          {
            'text-gray-900': !isDarkTheme,
            'text-gray-100': isDarkTheme,
          },
        )}
      >
        {needsTooltip ? (
          <Tooltip title={fullTitleText}>
            <div>{titleTextNode}</div>
          </Tooltip>
        ) : (
          titleTextNode
        )}
      </button>
      {!hide && (
        <>
          <WindowControlSlot visible={showWindowControls} idleOpacity={0.38}>
            <Sort {...props} />
          </WindowControlSlot>
          <WindowControlSlot visible={showWindowControls}>
            <Reload {...{ reload }} />
          </WindowControlSlot>
        </>
      )}
      <HideToggle
        {...{
          hide,
          toggleHide,
        }}
      />
      <WindowControlSlot visible={showWindowControls}>
        <CloseButton onClick={() => props.win.close()} />
      </WindowControlSlot>
    </div>
  )
})
