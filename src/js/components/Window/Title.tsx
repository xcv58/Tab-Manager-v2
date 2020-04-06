import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react'
import SelectAll from 'components/Window/SelectAll'
import Sort from 'components/Window/Sort'
import CloseButton from 'components/CloseButton'
import { getNoun } from 'libs'
import classNames from 'classnames'
import Reload from './Reload'
import HideToggle from './HideToggle'

export default observer((props) => {
  const nodeRef = useRef(null)
  const { className, win } = props
  const {
    tabs,
    activate,
    invisibleTabs,
    reload,
    hide,
    toggleHide,
    isFocused
  } = win
  const { length } = tabs
  const text = `${length} ${getNoun('tab', length)}`
  const invisibleLength = invisibleTabs.length
  const invisibleIndicator =
    invisibleLength > 0 && `/ ${invisibleLength} hidden`
  useEffect(() => {
    if (isFocused) {
      nodeRef.current.focus()
    }
  }, [isFocused])
  useEffect(() => win.setNodeRef(nodeRef))
  return (
    <div
      tabIndex={-1}
      ref={nodeRef}
      className={classNames(
        'flex justify-between items-center font-bold border-l-2 border-transparent',
        className
      )}
    >
      <SelectAll {...props} />
      <button
        onClick={activate}
        className='flex-auto overflow-hidden text-base text-left rounded-sm focus:outline-none focus:shadow-outline'
      >
        <h5 className='flex-auto text-2xl'>
          {text} {invisibleIndicator}
        </h5>
      </button>
      {!hide && (
        <div>
          <Sort {...props} />
          <Reload {...{ reload }} />
          <CloseButton onClick={() => props.win.close()} />
        </div>
      )}
      <HideToggle {...{ hide, toggleHide }} />
    </div>
  )
})
