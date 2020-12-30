import React, { useRef, useEffect, ReactElement, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { match } from 'fuzzy'
import classNames from 'classnames'
import Url from 'components/Tab/Url'
import { useStore } from 'components/hooks/useStore'
import Tooltip from '@material-ui/core/Tooltip'
import { TabProps } from 'components/types'

const pre = "<span class='text-red-500'>"
const post = '</span>'

const TabContent = observer(
  (props: TabProps & { buttonClassName: string; content: ReactElement }) => {
    const { faked, buttonClassName, content } = props
    const { hoverStore, dragStore } = useStore()
    const {
      activate,
      title,
      url,
      isDuplicated,
      focus,
      isFocused,
      isHovered,
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
      <div className="leading-tight break-all whitespace-normal">
        <p>{title}</p>
        <p style={{ opacity: 0.8 }}>{url}</p>
        {isDuplicated && <p>There is duplicated tab!</p>}
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
  const { title, isDuplicated, isMatched, query } = props.tab
  const { showUrl, highlightDuplicatedTab } = userStore
  const getHighlightNode = useCallback(
    (text) => {
      if (!isMatched || !query) {
        return text
      }
      const result = match(query, text, { pre, post })
      if (!result) {
        return <div>{text}</div>
      }
      return <div dangerouslySetInnerHTML={{ __html: result.rendered }} />
    },
    [isMatched, query]
  )
  const duplicated = highlightDuplicatedTab && isDuplicated
  const buttonClassName = classNames(
    'group flex flex-col justify-center flex-1 h-12 overflow-hidden text-left m-0 rounded-sm text-base',
    {
      'text-red-400': duplicated,
    }
  )
  const content = (
    <>
      <div className="w-full overflow-hidden truncate">
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
