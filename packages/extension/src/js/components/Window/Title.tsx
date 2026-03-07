import React, { useRef, useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
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
  children,
}: {
  visible: boolean
  children: React.ReactNode
}) => (
  <div
    aria-hidden={!visible}
    className={classNames('shrink-0 items-center', {
      hidden: !visible,
      flex: visible,
    })}
  >
    {children}
  </div>
)

export default observer((props: WinProps & { className: string }) => {
  const nodeRef = useRef(null)
  const titleButtonRef = useRef<HTMLButtonElement | null>(null)
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
  const titleTextNode = (
    <div className="flex-auto text-2xl whitespace-nowrap">
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
        'flex justify-between items-center font-bold border-0 px-1',
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
        backgroundColor: isDarkTheme ? '#2d2f33' : '#ffffff',
      }}
    >
      <WindowControlSlot visible={showWindowControls}>
        <SelectAll {...props} />
      </WindowControlSlot>
      <button
        ref={titleButtonRef}
        onClick={activate}
        className={classNames(
          'flex-auto overflow-hidden text-base text-left rounded-sm',
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
          <WindowControlSlot visible={showWindowControls}>
            <Sort {...props} />
          </WindowControlSlot>
          <WindowControlSlot visible={showWindowControls}>
            <Reload {...{ reload }} />
          </WindowControlSlot>
        </>
      )}
      <WindowControlSlot visible={showWindowControls}>
        <CloseButton onClick={() => props.win.close()} />
      </WindowControlSlot>
      <WindowControlSlot visible={showWindowControls}>
        <HideToggle
          {...{
            hide,
            toggleHide,
          }}
        />
      </WindowControlSlot>
    </div>
  )
})
