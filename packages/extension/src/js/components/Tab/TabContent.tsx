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
import Tooltip from 'components/ui/Tooltip'
import { TabProps } from 'components/types'
import HighlightNode from 'components/HighlightNode'
import { getNoun } from 'libs'
import { MIN_INTERACTIVE_ROW_HEIGHT } from 'libs/layoutMetrics'
import { normalizeTabTooltipUrlLines } from 'libs/tabTooltip'
import { useAppTheme } from 'libs/appTheme'
import TabDetailsTooltip from './TabDetailsTooltip'

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
    const { hoverStore, dragStore, shortcutStore, actionStore } = useStore()
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
    const theme = useAppTheme()
    const tooltipId = React.useId()
    const urlLines = normalizeTabTooltipUrlLines(userStore.tabTooltipUrlLines)
    const buttonRef = useRef(null)
    useEffect(() => {
      const button = buttonRef.current
      if (!isFocused && document.activeElement === button) {
        button.blur()
      }
    }, [isFocused])

    const { dragging } = dragStore
    const { hovered } = hoverStore
    const blocked =
      dragging ||
      userStore.dialogOpen ||
      shortcutStore?.dialogOpen ||
      (isHovered && (actionStore?.paletteOpen || Boolean(actionStore?.menu))) ||
      !userStore.showTabTooltip
    const open = !(faked || blocked || !isHovered || !hovered)
    useEffect(() => {
      if (blocked && isHovered && hovered) hoverStore.hideTooltip(props.tab.id)
    }, [blocked, isHovered, hovered, hoverStore, props.tab.id])
    const duplicateText =
      userStore.highlightDuplicatedTab && isDuplicated
        ? `${duplicatedTabCount} ${getNoun('tab', duplicatedTabCount)} share this page`
        : ''
    const onClick = useCallback(() => {
      activate({ origin: 'mouse', reveal: false })
    }, [activate])
    const onFocus = useCallback(() => {
      focus({
        origin: 'keyboard',
        reveal: false,
        moveDomFocus: false,
      })
    }, [focus])
    const closeTooltip = () => {
      hoverStore.hideTooltip(props.tab.id)
    }
    const tooltip = open && (
      <TabDetailsTooltip
        title={title}
        url={url}
        urlLines={urlLines}
        duplicateText={duplicateText}
        onClose={() => {
          closeTooltip()
          buttonRef.current?.focus()
        }}
        autoFocus={hoverStore.keyboardEntry}
      />
    )
    return (
      <Tooltip
        {...{ open, title: tooltip }}
        id={tooltipId}
        role="dialog"
        aria-label="Tab details"
        data-testid="tab-details-tooltip"
        disableInteractive={false}
        onInteractionStart={() => hoverStore.holdTooltip(props.tab.id)}
        onInteractionEnd={(nextTarget) => {
          const row = buttonRef.current?.closest('[data-testid^="tab-row-"]')
          hoverStore.releaseTooltip(
            props.tab.id,
            !!row?.contains(nextTarget as Node),
          )
        }}
        onClose={closeTooltip}
        style={
          {
            width: 'min(380px, calc(100vw - 16px))',
            maxWidth: 'calc(100vw - 16px)',
            padding: 0,
            borderRadius: 12,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.2)',
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            whiteSpace: 'normal',
            '--tab-details-accent': theme.palette.primary.main,
            '--tab-details-muted': theme.palette.text.secondary,
            '--tab-details-hover': theme.palette.action.hover,
          } as React.CSSProperties
        }
      >
        <button
          ref={buttonRef}
          tabIndex={-1}
          onClick={onClick}
          onAuxClick={onAuxClick}
          onFocus={onFocus}
          aria-haspopup="dialog"
          aria-controls={open ? tooltipId : undefined}
          aria-keyshortcuts="Alt+ArrowDown"
          onKeyDown={(event) => {
            if (
              event.altKey &&
              event.key === 'ArrowDown' &&
              userStore.showTabTooltip
            ) {
              event.preventDefault()
              event.stopPropagation()
              hoverStore.openTooltip(props.tab.id, true)
            }
          }}
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
