import React from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from 'components/hooks/useStore'
import { ChevronRightIcon, ExpandMoreIcon } from 'icons/materialIcons'
import { TabProps } from 'components/types'

// Pixels per Tree Style Tab level. Deep trees are capped so narrow columns
// keep room for the title.
export const TREE_INDENT_STEP = 14
export const TREE_MAX_INDENT_LEVEL = 8
const TWISTY_WIDTH = 18

// Indentation spacer plus expand/collapse twisty, shown only when the
// optional Tree Style Tab integration is connected.
export default observer(({ tab, disableSequentialFocus }: TabProps) => {
  const { treeStyleTabStore } = useStore()
  if (!treeStyleTabStore?.active) {
    return null
  }
  const info = tab.treeInfo
  const level = Math.min(info?.indent || 0, TREE_MAX_INDENT_LEVEL)
  const hasChildren = !!info?.hasChildren
  const collapsed = !!info?.subtreeCollapsed
  const label = collapsed ? 'Expand tree' : 'Collapse tree'
  return (
    <div
      className="flex items-center self-stretch shrink-0"
      data-testid={`tab-tree-indent-${tab.id}`}
      data-tree-level={info?.indent || 0}
      style={{ paddingLeft: level * TREE_INDENT_STEP }}
    >
      {hasChildren ? (
        <button
          type="button"
          aria-label={label}
          aria-expanded={!collapsed}
          title={label}
          tabIndex={disableSequentialFocus ? -1 : undefined}
          className="flex items-center justify-center p-0 border-0 bg-transparent cursor-pointer opacity-70 hover:opacity-100 rounded"
          style={{
            width: TWISTY_WIDTH,
            height: TWISTY_WIDTH,
            color: 'inherit',
          }}
          onClick={(event) => {
            event.stopPropagation()
            tab.toggleTreeCollapsed()
          }}
        >
          {collapsed ? (
            <ChevronRightIcon fontSize={16} />
          ) : (
            <ExpandMoreIcon fontSize={16} />
          )}
        </button>
      ) : (
        <span aria-hidden="true" style={{ width: TWISTY_WIDTH }} />
      )}
    </div>
  )
})
