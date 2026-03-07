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
      style={{
        backgroundColor: isDarkTheme ? '#2d2f33' : '#ffffff',
      }}
    >
      <SelectAll {...props} />
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
          <Sort {...props} />
          <Reload {...{ reload }} />
        </>
      )}
      <CloseButton onClick={() => props.win.close()} />
      <HideToggle
        {...{
          hide,
          toggleHide,
        }}
      />
    </div>
  )
})
