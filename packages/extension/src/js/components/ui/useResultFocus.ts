import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type React from 'react'

// Opt-in DOM navigation for comboboxes whose results can receive real focus.
// Input-owned comboboxes keep their existing aria-activedescendant behavior.
export const useResultFocus = <T>({
  enabled,
  items,
  getKey,
  isDisabled,
  rootRef,
  listboxRef,
  getItemId,
  highlightItem,
  onItemFocus,
}: {
  enabled: boolean
  items: T[]
  getKey: (item: T) => string | number
  isDisabled: (item: T) => boolean
  rootRef: React.MutableRefObject<HTMLElement | null>
  listboxRef: React.MutableRefObject<HTMLElement | null>
  getItemId: (index: number) => string
  highlightItem: (index: number) => void
  onItemFocus?: (item: T | null) => void
}) => {
  const focused = useRef<{
    key: string | number
    element: HTMLElement
  } | null>(null)
  const previousItems = useRef(items)
  const frame = useRef(0)
  const cancelPendingFocus = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = 0
  }, [])
  const releaseFocus = useCallback(() => {
    cancelPendingFocus()
    focused.current = null
  }, [cancelPendingFocus])

  const focusList = useCallback(() => {
    releaseFocus()
    onItemFocus?.(null)
    const target = listboxRef.current || rootRef.current
    target?.focus({ preventScroll: true })
  }, [releaseFocus, onItemFocus, listboxRef, rootRef])

  const focusItem = useCallback(
    (index: number) => {
      if (!enabled || !items[index] || isDisabled(items[index])) return false
      cancelPendingFocus()
      const key = getKey(items[index])
      const previousActive = document.activeElement
      highlightItem(index) // Also scrolls an unmounted virtual row into view.
      const apply = (attempt = 0) => {
        frame.current = 0
        const active = document.activeElement
        if (active !== previousActive && active !== document.body) return
        const node = document.getElementById(getItemId(index))
        // Index-based DOM ids can briefly refer to the old virtual row.
        if (node?.dataset.resultKey === String(key)) {
          node.focus({ preventScroll: true })
        } else if (attempt < 10) {
          frame.current = requestAnimationFrame(() => apply(attempt + 1))
        }
      }
      apply()
      return true
    },
    [
      enabled,
      items,
      isDisabled,
      cancelPendingFocus,
      getKey,
      highlightItem,
      getItemId,
    ],
  )

  const onFocus = (index: number, event: React.FocusEvent<HTMLElement>) => {
    if (!enabled || isDisabled(items[index])) return
    focused.current = {
      key: getKey(items[index]),
      element: event.currentTarget,
    }
    highlightItem(index)
    onItemFocus?.(items[index])
  }

  const hasFocus = useCallback(() => focused.current !== null, [])

  useEffect(() => {
    if (!enabled) {
      releaseFocus()
      return
    }
    const preserveMenu = (target: Element) =>
      !!target.closest('[role="menu"], [data-tab-details-panel]')
    const onFocusOutside = (event: FocusEvent) => {
      const target = event.target as Element
      if (!listboxRef.current?.contains(target) && !preserveMenu(target))
        releaseFocus()
    }
    const onPointerOutside = (event: PointerEvent) => {
      cancelPendingFocus()
      const target = event.target as Element
      if (!listboxRef.current?.contains(target) && !preserveMenu(target))
        releaseFocus()
    }
    // Any new key cancels an outstanding scroll/mount request; its own handler
    // can make a fresh one. Never move focus after the user starts elsewhere.
    document.addEventListener('keydown', cancelPendingFocus, true)
    document.addEventListener('focusin', onFocusOutside, true)
    document.addEventListener('pointerdown', onPointerOutside, true)
    return () => {
      cancelPendingFocus()
      document.removeEventListener('keydown', cancelPendingFocus, true)
      document.removeEventListener('focusin', onFocusOutside, true)
      document.removeEventListener('pointerdown', onPointerOutside, true)
    }
  }, [enabled, releaseFocus, cancelPendingFocus, listboxRef])

  useLayoutEffect(() => {
    const previous = previousItems.current
    previousItems.current = items
    const current = focused.current
    if (
      !enabled ||
      !current ||
      items.some((item) => getKey(item) === current.key)
    )
      return
    cancelPendingFocus()
    const active = document.activeElement
    if (active !== document.body && !current.element.contains(active)) {
      releaseFocus()
      return
    }
    const oldIndex = previous.findIndex((item) => getKey(item) === current.key)
    const candidates = [
      ...previous.slice(oldIndex + 1),
      ...previous.slice(0, oldIndex).reverse(),
    ]
    const available = new Map(items.map((item, index) => [getKey(item), index]))
    const nextIndex = candidates
      .map((item) => available.get(getKey(item)))
      .find((index) => index !== undefined && !isDisabled(items[index]))
    if (nextIndex !== undefined) focusItem(nextIndex)
    else focusList()
  }, [
    enabled,
    items,
    getKey,
    isDisabled,
    focusItem,
    focusList,
    cancelPendingFocus,
    releaseFocus,
  ])

  return { focusItem, focusList, onFocus, hasFocus }
}
