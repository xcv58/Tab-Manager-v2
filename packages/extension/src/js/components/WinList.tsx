import React, { useCallback, useLayoutEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import classNames from 'classnames'
import ReactResizeDetector from 'react-resize-detector'
import Loading from './Loading'
import { useStore } from './hooks/useStore'
import Window from './Window'
import { KeyboardArrowLeftIcon, ViewColumnIcon } from 'icons/materialIcons'
import { useAppTheme } from 'libs/appTheme'

const EMPTY_COLUMN_MIN_HEIGHT = 160

type EmptyColumnRelayoutProps = {
  columnCount: number
  endColumnIndex: number
  height: number
  left: number
  onRelayout: (event: React.MouseEvent<HTMLButtonElement>) => void
  startColumnIndex: number
  top: number
  width: number
}

const EmptyColumnRelayout = ({
  columnCount,
  endColumnIndex,
  height,
  left,
  onRelayout,
  startColumnIndex,
  top,
  width,
}: EmptyColumnRelayoutProps) => {
  const theme = useAppTheme()
  const isDark = theme.mode === 'dark'
  const emptyColumnLabel =
    columnCount === 1 ? 'Empty column' : `${columnCount} empty columns`
  const style = {
    '--empty-column-background-active': theme.palette.action.hover,
    '--empty-column-card-background': theme.palette.background.paper,
    '--empty-column-card-border': theme.palette.divider,
    '--empty-column-card-shadow': isDark
      ? '0 10px 24px rgba(0, 0, 0, 0.28)'
      : '0 10px 24px rgba(15, 23, 42, 0.1)',
    '--empty-column-card-shadow-hover': isDark
      ? '0 14px 30px rgba(0, 0, 0, 0.38)'
      : '0 14px 30px rgba(15, 23, 42, 0.16)',
    '--empty-column-focus-ring': theme.palette.primary.main,
    '--empty-column-helper-text': theme.palette.text.secondary,
    '--empty-column-icon-text': theme.palette.text.primary,
    '--empty-column-title-text': theme.palette.text.primary,
  } as React.CSSProperties

  return (
    <button
      type="button"
      data-empty-column-end={endColumnIndex}
      data-empty-column-start={startColumnIndex}
      data-testid={`empty-column-relayout-${startColumnIndex}`}
      className="empty-column-relayout absolute z-10 flex items-center justify-center text-center focus:outline-none"
      style={{
        ...style,
        left,
        top,
        height,
        width,
      }}
      onClick={onRelayout}
    >
      <span
        data-testid={`empty-column-relayout-card-${startColumnIndex}`}
        className="empty-column-relayout-card absolute flex max-w-56 flex-col items-center gap-1.5 rounded-xl border px-5 py-3"
        style={{ width: 'calc(100% - 32px)' }}
      >
        <span
          aria-hidden="true"
          className="empty-column-relayout-icon inline-flex h-10 items-center justify-center rounded-full px-2"
          style={{ backgroundColor: theme.palette.action.selected }}
        >
          <KeyboardArrowLeftIcon
            className="empty-column-relayout-arrow"
            fontSize={18}
          />
          <ViewColumnIcon fontSize={24} />
        </span>
        <span className="empty-column-relayout-title text-base font-semibold">
          {emptyColumnLabel}
        </span>
        <span className="empty-column-relayout-helper text-sm">
          Relayout all columns
        </span>
      </span>
    </button>
  )
}

export default observer(() => {
  const {
    windowStore,
    userStore,
    dragStore,
    searchStore,
    focusStore: { setContainerRef },
  } = useStore()
  const scrollbarRef = useRef<HTMLDivElement | null>(null)
  const onRelayout = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) =>
      windowStore.repackLayoutAndRevealActiveTab(
        event.detail === 0 ? 'keyboard' : 'mouse',
      ),
    [windowStore],
  )
  const onResize = useCallback(() => {
    if (!scrollbarRef.current) {
      return
    }
    const styles = window.getComputedStyle(scrollbarRef.current)
    const paddingX =
      parseFloat(styles.paddingLeft || '0') +
      parseFloat(styles.paddingRight || '0')
    const paddingY =
      parseFloat(styles.paddingTop || '0') +
      parseFloat(styles.paddingBottom || '0')
    const width = Math.max(scrollbarRef.current.clientWidth - paddingX, 0)
    const height = Math.max(scrollbarRef.current.clientHeight - paddingY, 0)
    windowStore.updateViewport(height, width)
    windowStore.updateScroll(
      scrollbarRef.current.scrollTop,
      scrollbarRef.current.scrollLeft,
    )
  }, [windowStore])
  const onScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      windowStore.updateScroll(
        event.currentTarget.scrollTop,
        event.currentTarget.scrollLeft,
      )
    },
    [windowStore],
  )
  const {
    initialLoading,
    visibleWindows,
    renderedColumnLayouts,
    totalContentWidth,
    totalContentHeight,
    pendingFocusedItemReveal,
    flushPendingFocusedItemReveal,
  } = windowStore
  const windowById = new Map(visibleWindows.map((win) => [win.id, win]))
  const showEmptyColumnRelayout =
    windowStore.layoutDirty && !dragStore?.dragging && !searchStore?.query

  useLayoutEffect(() => {
    setContainerRef(scrollbarRef)
    onResize()
    if (initialLoading || !pendingFocusedItemReveal) {
      return
    }
    let cancelled = false
    let frameId = 0
    let attempts = 0
    const tryFlushInitialReveal = () => {
      if (cancelled) {
        return
      }
      if (flushPendingFocusedItemReveal()) {
        return
      }
      if (!windowStore.pendingFocusedItemReveal || attempts >= 6) {
        return
      }
      attempts += 1
      frameId = window.requestAnimationFrame(tryFlushInitialReveal)
    }
    frameId = window.requestAnimationFrame(tryFlushInitialReveal)
    return () => {
      cancelled = true
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [
    flushPendingFocusedItemReveal,
    initialLoading,
    onResize,
    pendingFocusedItemReveal,
    setContainerRef,
    userStore.toolbarAutoHide,
    windowStore,
  ])

  const resizeDetector = (
    <ReactResizeDetector
      handleWidth
      handleHeight
      refreshMode="throttle"
      refreshOptions={{ leading: false, trailing: true }}
      refreshRate={64}
      onResize={onResize}
    />
  )
  if (initialLoading) {
    return (
      <div
        ref={scrollbarRef}
        className="flex items-center justify-center flex-auto overflow-hidden"
      >
        <Loading />
        {resizeDetector}
      </div>
    )
  }
  const columns = renderedColumnLayouts.map((column) => {
    const isEmpty = column.windows.length === 0
    const showRelayout = showEmptyColumnRelayout && isEmpty
    const columnHeight = showRelayout
      ? Math.max(totalContentHeight, EMPTY_COLUMN_MIN_HEIGHT)
      : column.height

    return (
      <div
        key={`window-column-${column.columnIndex}`}
        data-testid={`window-column-${column.columnIndex}`}
        className="absolute top-0"
        style={{
          left: column.left,
          width: column.width,
          minWidth: `${userStore.tabWidth}rem`,
          height: columnHeight,
        }}
      >
        {column.renderedWindows.map((layout) => {
          const win = windowById.get(layout.windowId)
          if (!win) {
            return null
          }
          return (
            <div
              key={win.id}
              className="absolute inset-x-0"
              style={{ top: layout.top }}
            >
              <Window width="100%" win={win} />
            </div>
          )
        })}
      </div>
    )
  })
  const emptyColumnRuns = showEmptyColumnRelayout
    ? renderedColumnLayouts.reduce<
        Array<{
          endColumnIndex: number
          left: number
          right: number
          startColumnIndex: number
        }>
      >((runs, column) => {
        if (column.windows.length > 0) {
          return runs
        }
        const previousRun = runs[runs.length - 1]
        const continuesPreviousRun =
          previousRun &&
          previousRun.endColumnIndex + 1 === column.columnIndex &&
          Math.abs(previousRun.right - column.left) < 1
        if (continuesPreviousRun) {
          previousRun.endColumnIndex = column.columnIndex
          previousRun.right = column.right
          return runs
        }
        runs.push({
          endColumnIndex: column.columnIndex,
          left: column.left,
          right: column.right,
          startColumnIndex: column.columnIndex,
        })
        return runs
      }, [])
    : []
  const relayoutHeight = Math.max(
    windowStore.height - 16,
    EMPTY_COLUMN_MIN_HEIGHT,
  )
  const relayoutColumnHeight = Math.max(
    totalContentHeight,
    EMPTY_COLUMN_MIN_HEIGHT,
  )
  const relayoutTop = Math.max(
    8,
    Math.min(
      windowStore.scrollTop + 8,
      relayoutColumnHeight - relayoutHeight - 8,
    ),
  )
  const emptyColumnActions = emptyColumnRuns.map((run) => (
    <EmptyColumnRelayout
      key={`empty-column-relayout-${run.startColumnIndex}-${run.endColumnIndex}`}
      columnCount={run.endColumnIndex - run.startColumnIndex + 1}
      endColumnIndex={run.endColumnIndex}
      height={relayoutHeight}
      left={run.left}
      onRelayout={onRelayout}
      startColumnIndex={run.startColumnIndex}
      top={relayoutTop}
      width={run.right - run.left}
    />
  ))
  return (
    <div
      ref={scrollbarRef}
      onScroll={onScroll}
      data-testid="window-list-scroll-container"
      className={classNames('relative flex-auto px-1 mb-0 mr-0', {
        'overflow-scroll': !userStore.autoFitColumns,
        'overflow-y-scroll overflow-x-hidden': userStore.autoFitColumns,
      })}
    >
      <div
        className="relative"
        style={{
          width: totalContentWidth,
          minHeight: totalContentHeight,
        }}
      >
        {columns}
        {emptyColumnActions}
      </div>
      {resizeDetector}
    </div>
  )
})
