import React, { useRef, useEffect } from 'react'
import { observer } from 'mobx-react'
import { match } from 'fuzzy'
import classNames from 'classnames'
import { highlightBorderColor } from 'libs/colors'
import Url from 'components/Tab/Url'
import { useStore } from 'components/StoreContext'
import Tooltip from '@material-ui/core/Tooltip'

const pre = `<span style='color:${highlightBorderColor}'>`
const post = '</span>'

export default observer(props => {
  const { hoverStore, dragStore, userStore } = useStore()
  const { faked } = props
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
  const { showUrl, highlightDuplicatedTab } = userStore
  const getHighlightNode = text => {
    const {
      tab: { isMatched, query }
    } = props
    if (!isMatched || !query) {
      return text
    }
    const result = match(query, text, { pre, post })
    if (!result) {
      return <div>{text}</div>
    }
    return <div dangerouslySetInnerHTML={{ __html: result.rendered }} />
  }
  useEffect(() => {
    const button = buttonRef.current
    if (!isFocused && document.activeElement === button) {
      button.blur()
    }
  }, [isFocused])
  const duplicated = highlightDuplicatedTab && urlCount > 1

  const { dragging } = dragStore
  const { hovered } = hoverStore
  const open = !(faked || dragging || !isHovered || !hovered)
  const tooltip = (
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
        className={classNames(
          'group flex flex-col items-start flex-1 h-12 overflow-hidden text-left focus:outline-none focus:shadow-outline m-0 rounded-sm',
          {
            'text-red-400': duplicated
          }
        )}
      >
        <div className='w-full overflow-hidden truncate'>
          {getHighlightNode(title)}
        </div>
        {showUrl && (
          <Url
            {...props}
            getHighlightNode={getHighlightNode}
            duplicated={duplicated}
          />
        )}
      </button>
    </Tooltip>
  )
})
