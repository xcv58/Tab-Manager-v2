import React, { useRef, useEffect, ReactElement, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import Url from 'components/Tab/Url'
import { useStore } from 'components/StoreContext'
import Tooltip from '@material-ui/core/Tooltip'
import { TabProps } from 'components/types'
import { match } from 'fuzzyjs'

export const getParts = (source, matchResult) => {
  if (typeof source !== 'string' || !source.length) {
    return []
  }

  if (!matchResult || !matchResult.match || !matchResult.ranges.length) {
    return [{ text: source }]
  }

  const result = []
  let curIndex = 0

  for (const range of matchResult.ranges) {
    const { start, stop } = range
    if (curIndex < start) {
      result.push({ text: source.slice(curIndex, start) })
    }
    const text = source.slice(start, stop)
    result.push({ text, matched: true })
    curIndex = stop
  }
  result.push({ text: source.slice(curIndex) })
  return result.filter((x) => x.text)
}

const TabContent = observer(
  (props: TabProps & { buttonClassName: string; content: ReactElement }) => {
    const { faked, buttonClassName, content } = props
    const { hoverStore, dragStore } = useStore()
    const {
      activate,
      title,
      url,
      urlCount,
      focus,
      isFocused,
      isHovered
    } = props.tab
    const buttonRef = useRef(null)
    useEffect(() => {
      const button = buttonRef.current
      if (!isFocused && document.activeElement === button) {
        button.blur()
      }
    }, [isFocused])

    const { dragging } = dragStore
    const { hovered } = hoverStore
    const open = !(faked || dragging || !isHovered || !hovered)
    const tooltip = open && (
      <div className='leading-tight break-all whitespace-normal'>
        <p>{title}</p>
        <p style={{ opacity: 0.8 }}>{url}</p>
        {urlCount > 1 && <p>There is duplicated tab!</p>}
      </div>
    )
    return (
      <Tooltip {...{ open, title: tooltip }} interactive>
        <button
          ref={buttonRef}
          onClick={activate}
          onFocus={focus}
          className={buttonClassName}
        >
          {content}
        </button>
      </Tooltip>
    )
  }
)

export default observer((props: TabProps) => {
  const { userStore } = useStore()
  const { faked } = props
  const { title, urlCount, isMatched, query } = props.tab
  const { showUrl, highlightDuplicatedTab } = userStore
  const getHighlightNode = useCallback(
    (text) => {
      if (!isMatched || !query) {
        return text
      }
      const parts = getParts(text, match(query, text, { withRanges: true }))
      return (
        <div>
          {parts.map((part, index) => (
            <span
              key={index}
              className={classNames({ 'text-red-500 font-bold': part.matched })}
            >
              {part.text}
            </span>
          ))}
        </div>
      )
    },
    [isMatched, query]
  )
  const duplicated = highlightDuplicatedTab && urlCount > 1
  const buttonClassName = classNames(
    'group flex flex-col justify-center flex-1 h-12 overflow-hidden text-left m-0 rounded-sm text-base',
    {
      'text-red-400': duplicated
    }
  )
  const content = (
    <>
      <div className='w-full overflow-hidden truncate'>
        {getHighlightNode(title)}
      </div>
      {showUrl && <Url {...props} {...{ getHighlightNode, duplicated }} />}
    </>
  )
  if (faked) {
    return (
      <button className={buttonClassName} disabled>
        {content}
      </button>
    )
  }
  return (
    <TabContent
      {...props}
      {...{ getHighlightNode, buttonClassName, content }}
    />
  )
})
