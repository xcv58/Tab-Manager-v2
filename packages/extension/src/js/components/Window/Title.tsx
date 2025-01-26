import React, { useRef, useEffect, useState } from 'react'
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

export const Title = (props) => {
  const { title, text, invisibleIndicator, hide } = props

  return (
    <h5 className="flex-auto text-2xl whitespace-nowrap">
      {title ? title : text} {!hide && invisibleIndicator}
    </h5>
  )
}
export const EditableTitle = observer((props: WinProps) => {
  const { win } = props
  const { tabs, invisibleTabs, hide, title, setTitle } = win
  const { length } = tabs
  const text = `${length} ${getNoun('tab', length)}`
  const invisibleLength = invisibleTabs.length
  const invisibleIndicator =
    invisibleLength > 0 && `/ ${invisibleLength} hidden`

  const [editing, setEditing] = useState<boolean>(false)
  const [value, setValue] = useState<string>(title || text)
  useEffect(() => {
    setValue(title || text)
  }, [title, text])

  return (
    <div
      className="flex-auto overflow-hidden text-base text-left rounded-sm"
      onClick={() => {
        setEditing((x) => !x)
      }}
    >
      {editing ? (
        <input
          autoFocus
          onChange={(e) => {
            setValue(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setTitle(value)
              setEditing(false)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
            }
          }}
          value={value}
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : (
        <Title {...{ text, title, invisibleIndicator, hide }} />
      )}
    </div>
  )
})

export default observer((props: WinProps & { className: string }) => {
  const nodeRef = useRef(null)
  const { className, win } = props
  const { reload, hide, toggleHide, isFocused } = win
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
      <EditableTitle {...props} />
      {!hide && (
        <>
          <Sort {...props} />
          <Reload {...{ reload }} />
        </>
      )}
      <CloseButton onClick={() => props.win.close()} />
      <HideToggle {...{ hide, toggleHide }} />
    </div>
  )
})
