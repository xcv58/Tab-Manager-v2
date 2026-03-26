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
import Tooltip from '@mui/material/Tooltip'
import { TabProps } from 'components/types'
import HighlightNode from 'components/HighlightNode'
import { getNoun } from 'libs'
import { MIN_INTERACTIVE_ROW_HEIGHT } from 'libs/layoutMetrics'

const TabContent = observer(
  (
    props: TabProps & {
      buttonClassName: string
      buttonStyle: React.CSSProperties
      content: ReactElement
      onAuxClick: (e: SyntheticEvent) => void
    },
  ) => {
    const { faked, buttonClassName, buttonStyle, content, onAuxClick } = props
    const { hoverStore, dragStore } = useStore()
    const {
      activate,
      title,
      url,
      focus,
      isFocused,
      isHovered,
      duplicatedTabCount,
      isDuplicated,
    } = props.tab
    const { userStore } = useStore()
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
    const duplicateText =
      userStore.highlightDuplicatedTab && isDuplicated
        ? `${duplicatedTabCount} ${getNoun('tab', duplicatedTabCount)} share this page`
        : ''
    const onClick = useCallback(() => {
      activate({ origin: 'mouse', reveal: false })
    }, [activate])
    const tooltip = open && (
      <div className="leading-tight break-all whitespace-normal">
        <p>{title}</p>
        <p style={{ opacity: 0.8 }}>{url}</p>
        {duplicateText ? (
          <p style={{ opacity: 0.72 }}>{duplicateText}</p>
        ) : null}
      </div>
    )
    return (
      <Tooltip {...{ open, title: tooltip }}>
        <button
          ref={buttonRef}
          onClick={onClick}
          onAuxClick={onAuxClick}
          onFocus={focus}
          className={buttonClassName}
          style={buttonStyle}
        >
          {content}
        </button>
      </Tooltip>
    )
  },
)

export default observer((props: TabProps) => {
  const { userStore } = useStore()
  const { faked } = props
  const { title, isMatched, query, removing, remove } = props.tab
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
      return <HighlightNode {...{ query, text }} />
    },
    [isMatched, query],
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
