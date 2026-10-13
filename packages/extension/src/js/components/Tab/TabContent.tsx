import React, {
  useRef,
  useEffect,
  ReactElement,
  useCallback,
  SyntheticEvent,
} from 'react'
import { observer } from 'mobx-react-lite'
import Url from 'components/Tab/Url'
import { useStore } from 'components/hooks/useStore'
import { TabProps } from 'components/types'
import HighlightNode from 'components/HighlightNode'
import { MIN_INTERACTIVE_ROW_HEIGHT } from 'libs/layoutMetrics'
import TabDetailsAnchor from './TabDetailsAnchor'

const TabContent = observer(
  (
    props: TabProps & {
      buttonClassName: string
      buttonStyle: React.CSSProperties
      content: ReactElement
      onAuxClick: (e: SyntheticEvent) => void
    },
  ) => {
    const { buttonClassName, buttonStyle, content, onAuxClick } = props
    const { activate, focus, isFocused } = props.tab
    const buttonRef = useRef<HTMLButtonElement>(null)
    useEffect(() => {
      if (!isFocused && document.activeElement === buttonRef.current)
        buttonRef.current?.blur()
    }, [isFocused])
    const onClick = useCallback(
      () => activate({ origin: 'mouse', reveal: false }),
      [activate],
    )
    const onFocus = useCallback(
      () => focus({ origin: 'keyboard', reveal: false, moveDomFocus: false }),
      [focus],
    )
    return (
      <TabDetailsAnchor tab={props.tab} anchorRef={buttonRef}>
        <button
          ref={buttonRef}
          tabIndex={-1}
          onClick={onClick}
          onAuxClick={onAuxClick}
          onFocus={onFocus}
          className={buttonClassName}
          style={buttonStyle}
        >
          {content}
        </button>
      </TabDetailsAnchor>
    )
  },
)

export default observer((props: TabProps) => {
  const { userStore } = useStore()
  const { faked } = props
  const {
    title,
    isMatched,
    query,
    removing,
    remove,
    searchMatchMode = 'fuzzy',
  } = props.tab
  const onAuxClick = (event: SyntheticEvent) => {
    // Middle mouse button
    if (event.button === 1 && !removing) {
      remove()
    }
  }
  const { showUrl, highlightDuplicatedTab, uiPreset } = userStore
  const getHighlightNode = useCallback(
    (text) => {
      if (!isMatched || !query) {
        return text
      }
      return <HighlightNode query={query} text={text} mode={searchMatchMode} />
    },
    [isMatched, query, searchMatchMode],
  )
  const duplicated =
    uiPreset === 'classic' && highlightDuplicatedTab
      ? props.tab.isDuplicated
      : false
  const buttonClassName = duplicated
    ? 'group flex flex-col justify-center flex-1 h-12 overflow-hidden text-left m-0 rounded-sm text-base text-red-400'
    : 'group flex flex-col justify-center flex-1 h-12 overflow-hidden text-left m-0 rounded-sm text-base'
  const buttonStyle = {
    minHeight: MIN_INTERACTIVE_ROW_HEIGHT,
  }
  const content = (
    <>
      <div className="w-full min-w-0 overflow-hidden truncate">
        {getHighlightNode(title)}
      </div>
      {showUrl && <Url {...props} {...{ duplicated, getHighlightNode }} />}
    </>
  )
  if (faked) {
    return (
      <button
        className={buttonClassName}
        style={buttonStyle}
        onAuxClick={onAuxClick}
      >
        {content}
      </button>
    )
  }
  return (
    <TabContent
      {...props}
      {...{
        getHighlightNode,
        buttonClassName,
        buttonStyle,
        content,
        onAuxClick,
      }}
    />
  )
})
