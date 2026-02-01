import React, { useRef, useEffect } from 'react'
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

const IS_SAFARI = process.env.IS_SAFARI === 'true'

export default observer((props: WinProps & { className: string }) => {
  const nodeRef = useRef(null)
  const { className, win } = props
  const { tabs, activate, invisibleTabs, reload, hide, toggleHide, isFocused } =
    win
  const { length } = tabs
  const text = `${length} ${getNoun('tab', length)}`
  const invisibleLength = invisibleTabs.length
  const invisibleIndicator =
    invisibleLength > 0 && `/ ${invisibleLength} hidden`
  const reduceMotion = useReduceMotion()
  useEffect(() => {
    if (isFocused) {
      nodeRef.current.focus({ preventScroll: true })
      nodeRef.current.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
      })
    }
  }, [isFocused])
  useEffect(() => {
    win.setNodeRef(nodeRef)
  })
  return (
    <div
      tabIndex={-1}
      ref={nodeRef}
      className={classNames(
        'flex justify-between items-center font-bold border-0',
        className,
      )}
    >
      <SelectAll {...props} />
      <button
        onClick={activate}
        className="flex-auto overflow-hidden text-base text-left rounded-sm"
      >
        <h5 className="flex-auto text-2xl whitespace-nowrap">
          {text} {!hide && invisibleIndicator}
        </h5>
      </button>
      {!hide && (
        <>
          {!IS_SAFARI && <Sort {...props} />}
          <Reload {...{ reload }} />
        </>
      )}
      <CloseButton onClick={() => props.win.close()} />
      <HideToggle {...{ hide, toggleHide }} />
    </div>
  )
})
