import type React from 'react'
import { useCallback, useEffect } from 'react'
import { useStore } from './useStore'
import type Focusable from 'stores/Focusable'
import type ActionStore from 'stores/ActionStore'

export const contextMenuHandlers = (
  store: ActionStore,
  key: string,
  target: Focusable,
  disabled = false,
) => {
  const canOpen = (element: HTMLElement, eventTarget: EventTarget) =>
    !disabled &&
    eventTarget instanceof Element &&
    element.contains(eventTarget) &&
    !eventTarget.closest(
      'input:not([type="checkbox"]), textarea, select, [contenteditable]:not([contenteditable="false"]), [role="menu"], [role="dialog"]',
    )
  return {
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
      // React portal events bubble through the row. Preserve native menus in
      // the selectable tooltip, editors and other content outside the row DOM.
      if (!canOpen(event.currentTarget, event.target)) return
      event.preventDefault()
      event.stopPropagation()
      store.openMenu(
        {
          key,
          element: event.currentTarget,
          position: { top: event.clientY, left: event.clientX },
        },
        target,
      )
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (
        event.key !== 'ContextMenu' &&
        !(event.key === 'F10' && event.shiftKey)
      )
        return
      if (!canOpen(event.currentTarget, event.target)) return
      event.preventDefault()
      event.stopPropagation()
      store.openMenu({ key, element: event.currentTarget }, target)
    },
  }
}

export const useActionMenu = (key: string, target?: Focusable) => {
  const { actionStore } = useStore()
  useEffect(
    () => () => {
      if (actionStore.menu?.key === key) actionStore.closeMenu()
    },
    [actionStore, key],
  )
  // A keyed observable map updates only the menus that open/close, even in a
  // workspace with thousands of rows. Read global ownership only on dismissal.
  const anchor = actionStore.menuAnchors.get(key)
  const restoreFocus = useCallback(
    () =>
      !actionStore.paletteOpen &&
      (!actionStore.menu || actionStore.menu.key === key),
    [actionStore, key],
  )
  return {
    anchorEl: anchor?.element ?? null,
    anchorPosition: anchor?.position,
    open: Boolean(anchor),
    onClose: () => {
      if (actionStore.menu?.key === key) actionStore.closeMenu()
    },
    restoreFocus,
    onOpen: (event: React.MouseEvent<HTMLElement>) =>
      actionStore.openMenu({ key, element: event.currentTarget }, target),
  }
}
