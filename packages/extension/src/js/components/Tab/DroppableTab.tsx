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

export default observer((props: TabProps) => {
  const { tab } = props
  const { dragStore, treeStyleTabStore } = useStore()
  const theme = useAppTheme()
  const treeDropEnabled = !!treeStyleTabStore?.active
  const dropRef = React.useRef<HTMLDivElement | null>(null)
  const [dropPosition, setDropPosition] = React.useState<
    'before' | 'after' | 'into'
  >('before')
  const [dropProps, drop] = useDrop({
    accept: ItemTypes.TAB,
    drop: () => {
      if (dropPosition === 'into') {
        void dragStore.dropIntoTreeTab(tab)
        return
      }
      dragStore.drop(tab, dropPosition === 'before')
    },
    hover: (_, monitor) => {
      const node = dropRef.current
      const clientOffset = monitor.getClientOffset()
      if (!node || !clientOffset) {
        return
      }
      const rect = node.getBoundingClientRect()
      const offsetY = clientOffset.y - rect.top
      // With Tree Style Tab connected, the middle half of the row nests the
      // dragged tabs under this tab; the outer quarters still reorder.
      const nextPosition = treeDropEnabled
        ? offsetY < rect.height / 4
          ? 'before'
          : offsetY > (rect.height * 3) / 4
            ? 'after'
            : 'into'
        : offsetY <= rect.height / 2
          ? 'before'
          : 'after'
      setDropPosition((previousPosition) => {
        return previousPosition === nextPosition
          ? previousPosition
          : nextPosition
      })
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
    canDrop && isOver && dropPosition === 'into' && !tab.isSelected
  return (
    <div
      ref={setDropRef}
      className="relative"
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
