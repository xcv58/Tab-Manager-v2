import React from 'react'
import classNames from 'classnames'
import { observer } from 'mobx-react-lite'
import { useDrop } from 'react-dnd'
import Tab from './Tab'
import { ItemTypes } from 'libs/react-dnd'
import DropIndicator from 'components/DropIndicator'
import { useStore } from 'components/hooks/useStore'
import { useAppTheme } from 'libs/appTheme'
import { TabProps } from 'components/types'

type DropPosition = 'before' | 'after' | 'into'

export default observer((props: TabProps) => {
  const { tab } = props
  const { dragStore, shortcutStore } = useStore()
  const theme = useAppTheme()
  const dropRef = React.useRef<HTMLDivElement | null>(null)
  const [dropPosition, setDropPosition] = React.useState<DropPosition>('before')

  const treeDropEnabled = () =>
    process.env.TARGET_BROWSER === 'firefox' && !!tab.treeInfo

  const getDropPosition = (y: number | undefined): DropPosition | undefined => {
    if (y == null || !dropRef.current) return
    const { top, height } = dropRef.current.getBoundingClientRect()
    const offset = y - top
    if (treeDropEnabled()) {
      if (offset < height / 4) return 'before'
      if (offset > (height * 3) / 4) return 'after'
      return 'into'
    }
    return offset <= height / 2 ? 'before' : 'after'
  }

  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    drop: (_, monitor) => {
      if (
        process.env.TARGET_BROWSER === 'firefox' &&
        (treeDropEnabled() || dropPosition === 'into')
      ) {
        // The browser delivers the final hover and drop before React rerenders.
        const position = treeDropEnabled()
          ? getDropPosition(monitor.getClientOffset()?.y)
          : 'into'
        if (position === 'into') {
          void dragStore.dropIntoTreeTab(tab).then((hint) => {
            if (hint) shortcutStore.showMoveHint(hint)
          })
        } else if (position) {
          void dragStore.drop(tab, position === 'before')
        }
        return
      }
      void dragStore.drop(tab, dropPosition === 'before')
    },
    hover: (_, monitor) => {
      const position = getDropPosition(monitor.getClientOffset()?.y)
      if (position) setDropPosition(position)
      if (process.env.TARGET_BROWSER === 'firefox') {
        const targetId = monitor.getHandlerId()
        if (!targetId) return
        if (position !== 'into') {
          dragStore.clearDropPreviewTarget(targetId)
          return
        }
        const plan = dragStore.getTreeDropPlan(tab)
        dragStore.setDropPreviewTarget({
          targetId,
          destination: 'tree',
          ...('blockedHint' in plan
            ? plan
            : {
                label:
                  plan.branch.length === 1
                    ? 'Nest 1 tab'
                    : `Nest branch · ${plan.branch.length} tabs`,
              }),
        })
      }
    },
    canDrop: () => tab.win.canDrop,
    collect: (monitor) => {
      return {
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver({ shallow: true }),
      }
    },
  })
  const { isOver, canDrop } = dropProps
  const setDropRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      dropRef.current = node
      drop(node)
    },
    [drop],
  )
  const previewBefore =
    canDrop && isOver && dropPosition === 'before' ? (
      <DropIndicator position="before" />
    ) : null
  const previewAfter =
    canDrop && isOver && dropPosition === 'after' ? (
      <DropIndicator position="after" />
    ) : null
  const previewInto =
    process.env.TARGET_BROWSER === 'firefox' &&
    canDrop &&
    isOver &&
    dropPosition === 'into' &&
    !('blockedHint' in dragStore.getTreeDropPlan(tab))
  return (
    <div
      ref={setDropRef}
      className={
        process.env.TARGET_BROWSER === 'firefox' ? 'relative' : undefined
      }
      data-tree-drop-into={previewInto ? 'true' : undefined}
    >
      {previewInto && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-20 pointer-events-none rounded-sm"
          style={{
            boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
          }}
        />
      )}
      {previewBefore}
      <Tab
        {...props}
        className={classNames({
          'bg-red-500 hover:bg-red-500': isOver && !canDrop,
        })}
      />
      {previewAfter}
    </div>
  )
})
