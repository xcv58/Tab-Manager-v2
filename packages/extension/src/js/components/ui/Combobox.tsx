import { useState, useEffect, useCallback, useRef, useId } from 'react'
import { useResultFocus } from './useResultFocus'

/** Minimal interface for a virtualized list ref (e.g. react-window FixedSizeList). */
export interface VirtualListRef {
  scrollToItem: (index: number) => void
}

export interface UseComboboxProps<T> {
  items: T[]
  inputValue: string
  onInputValueChange: (value: string) => void
  onSelect: (item: T) => void
  isItemDisabled?: (item: T) => boolean
  isOpen: boolean
  onOpenChange?: (isOpen: boolean) => void
  autoHighlight?: boolean
  /** Reset keyboard navigation when switching to a different list scope. */
  highlightResetKey?: string
  /** Let result rows own keyboard focus as well as the input. */
  resultNavigation?: boolean
  getItemKey?: (item: T) => string | number
  onItemFocus?: (item: T | null) => void
}

export function useCombobox<T>({
  items,
  inputValue,
  onInputValueChange,
  onSelect,
  isItemDisabled = () => false,
  isOpen,
  onOpenChange,
  autoHighlight = true,
  highlightResetKey,
  resultNavigation = false,
  getItemKey,
  onItemFocus,
}: UseComboboxProps<T>) {
  const comboboxId = useId()
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const listRef = useRef<VirtualListRef | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  const listboxRef = useRef<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isOpenRef = useRef(isOpen)
  const previousInputValueRef = useRef(inputValue)
  const previousIsOpenRef = useRef(isOpen)
  const previousHighlightResetKeyRef = useRef(highlightResetKey)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preserveBlurFocusRef = useRef(false)
  const getItemId = useCallback(
    (index: number) => `${comboboxId}-item-${index}`,
    [comboboxId],
  )
  const listboxId = `${comboboxId}-listbox`
  const firstEnabledIndex = useCallback(() => {
    return items.findIndex((item) => !isItemDisabled(item))
  }, [items, isItemDisabled])
  const lastEnabledIndex = useCallback(() => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (!isItemDisabled(items[index])) {
        return index
      }
    }
    return -1
  }, [items, isItemDisabled])

  // Reset highlight when items or input change
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1)
      previousInputValueRef.current = inputValue
      previousIsOpenRef.current = isOpen
      previousHighlightResetKeyRef.current = highlightResetKey
      return
    }

    const inputValueChanged = previousInputValueRef.current !== inputValue
    const justOpened = !previousIsOpenRef.current && isOpen
    const scopeChanged =
      previousHighlightResetKeyRef.current !== highlightResetKey

    if (autoHighlight) {
      const firstValidIndex = firstEnabledIndex()

      setHighlightedIndex((currentIndex) => {
        const currentItem =
          currentIndex >= 0 && currentIndex < items.length
            ? items[currentIndex]
            : undefined
        const shouldResetHighlight =
          inputValueChanged ||
          justOpened ||
          scopeChanged ||
          currentItem == null ||
          isItemDisabled(currentItem)

        if (!shouldResetHighlight) {
          return currentIndex
        }

        return firstValidIndex >= 0 ? firstValidIndex : -1
      })
    } else {
      setHighlightedIndex(-1)
    }

    previousInputValueRef.current = inputValue
    previousIsOpenRef.current = isOpen
    previousHighlightResetKeyRef.current = highlightResetKey
  }, [
    items,
    inputValue,
    isOpen,
    autoHighlight,
    firstEnabledIndex,
    isItemDisabled,
    highlightResetKey,
  ])

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current != null) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const highlightItem = useCallback(
    (index: number) => {
      let nextIndex = index
      if (nextIndex < 0) nextIndex = 0
      if (nextIndex >= items.length) nextIndex = items.length - 1

      // Find nearest non-disabled item
      const direction = index >= highlightedIndex ? 1 : -1
      while (
        nextIndex >= 0 &&
        nextIndex < items.length &&
        isItemDisabled(items[nextIndex])
      ) {
        nextIndex += direction
      }

      if (
        nextIndex >= 0 &&
        nextIndex < items.length &&
        !isItemDisabled(items[nextIndex])
      ) {
        setHighlightedIndex(nextIndex)
        if (listRef.current) {
          listRef.current.scrollToItem(nextIndex)
        } else {
          const el = document.getElementById(getItemId(nextIndex))
          if (el) el.scrollIntoView({ block: 'nearest' })
        }
      }
    },
    [getItemId, items, isItemDisabled, highlightedIndex],
  )

  const resultFocus = useResultFocus({
    enabled: resultNavigation && isOpen,
    items,
    getKey: getItemKey || getItemIdForIndex,
    isDisabled: isItemDisabled,
    rootRef,
    listboxRef,
    getItemId,
    highlightItem,
    onItemFocus,
  })

  function getItemIdForIndex(item: T) {
    return items.indexOf(item)
  }

  const preservePopupInteraction = useCallback((target: EventTarget | null) => {
    const element = target as HTMLElement | null
    if (!element) {
      return false
    }
    // Portal tab details need real focus and native text selection. Keeping
    // input focus here would prevent selecting/copying text inside that panel.
    if (element.closest('[data-tab-details-panel]')) {
      preserveBlurFocusRef.current = false
      return false
    }

    preserveBlurFocusRef.current =
      isOpenRef.current && element.closest('[role="option"]') == null

    return preserveBlurFocusRef.current
  }, [])

  const getRootProps = () => ({
    ref: rootRef,
    tabIndex: resultNavigation ? -1 : undefined,
  })

  const getInputProps = () => ({
    ref: inputRef,
    value: inputValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      onInputValueChange(e.target.value)
      if (onOpenChange && !isOpen) {
        onOpenChange(true)
      }
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!isOpen && onOpenChange) {
          onOpenChange(true)
          const nextIndex =
            highlightedIndex >= 0 ? highlightedIndex + 1 : firstEnabledIndex()
          if (nextIndex >= 0) {
            setHighlightedIndex(nextIndex)
          }
        } else {
          highlightItem(highlightedIndex + 1)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (isOpen) {
          highlightItem(highlightedIndex - 1)
        } else if (onOpenChange) {
          onOpenChange(true)
          const nextIndex =
            highlightedIndex >= 0 ? highlightedIndex - 1 : lastEnabledIndex()
          if (nextIndex >= 0) {
            setHighlightedIndex(nextIndex)
          }
        }
      } else if (e.key === 'Enter') {
        if (
          isOpen &&
          highlightedIndex >= 0 &&
          highlightedIndex < items.length
        ) {
          e.preventDefault()
          onSelect(items[highlightedIndex])
        }
      } else if (e.key === 'Escape') {
        if (isOpen && onOpenChange) {
          onOpenChange(false)
        }
      }
    },
    onFocus: () => {
      if (onOpenChange) onOpenChange(true)
    },
    onBlur: () => {
      // Need a slight delay to allow click events on items to fire
      if (blurTimeoutRef.current != null) {
        clearTimeout(blurTimeoutRef.current)
      }
      blurTimeoutRef.current = setTimeout(() => {
        blurTimeoutRef.current = null
        if (preserveBlurFocusRef.current) {
          preserveBlurFocusRef.current = false
          if (isOpenRef.current) {
            inputRef.current?.focus({ preventScroll: true })
            return
          }
        }
        const activeElement = document.activeElement as HTMLElement | null
        if (activeElement && rootRef.current?.contains(activeElement)) {
          return
        }
        if (onOpenChange) onOpenChange(false)
      }, 150)
    },
    'aria-activedescendant':
      highlightedIndex >= 0 ? getItemId(highlightedIndex) : undefined,
    'aria-autocomplete': 'list' as const,
    'aria-expanded': isOpen,
    role: 'combobox',
  })

  const getListboxProps = () => ({
    ref: listboxRef,
    tabIndex: resultNavigation ? -1 : undefined,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (
        !resultNavigation ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return
      const target = event.target as HTMLElement
      if (
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="menu"], [role="dialog"]',
        )
      )
        return
      const option = target.closest('[role="option"]')
      const index = items.findIndex(
        (_, index) => getItemId(index) === option?.id,
      )
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        const direction = event.key === 'ArrowDown' ? 1 : -1
        let next =
          index < 0 ? (direction > 0 ? 0 : items.length - 1) : index + direction
        while (next >= 0 && next < items.length && isItemDisabled(items[next]))
          next += direction
        resultFocus.focusItem(next)
      } else if (
        event.key === 'Enter' &&
        !target.closest('button, a') &&
        index >= 0 &&
        !isItemDisabled(items[index])
      ) {
        event.preventDefault()
        event.stopPropagation()
        onSelect(items[index])
      }
    },
    role: 'listbox',
    id: listboxId,
    onPointerDownCapture: (event: React.PointerEvent<HTMLElement>) => {
      // Keep input focus through option clicks. Blurring can exit command
      // mode and replace the option before its click handler executes.
      const preserveInteraction = preservePopupInteraction(event.target)
      if (
        (event.target as HTMLElement).closest?.('[role="option"]') ||
        preserveInteraction
      ) {
        event.preventDefault()
      }
    },
    onMouseDownCapture: (event: React.MouseEvent<HTMLElement>) => {
      const preserveInteraction = preservePopupInteraction(event.target)
      if (
        (event.target as HTMLElement).closest?.('[role="option"]') ||
        preserveInteraction
      ) {
        event.preventDefault()
      }
    },
  })

  const getItemProps = ({ index, item }: { index: number; item: T }) => {
    const disabled = isItemDisabled(item)
    return {
      id: getItemId(index),
      'data-result-key': getItemKey ? getItemKey(item) : index,
      tabIndex: resultNavigation && !disabled ? -1 : undefined,
      onFocus: (event: React.FocusEvent<HTMLElement>) =>
        resultFocus.onFocus(index, event),
      role: 'option',
      'aria-selected': highlightedIndex === index,
      'aria-disabled': disabled,
      onClick: () => {
        if (!disabled) {
          onSelect(item)
        }
      },
      onMouseEnter: () => {
        if (!disabled) {
          setHighlightedIndex(index)
        }
      },
    }
  }

  return {
    focusItem: resultFocus.focusItem,
    focusList: resultFocus.focusList,
    hasResultFocus: resultFocus.hasFocus,
    highlightedIndex,
    listRef,
    getRootProps,
    getInputProps,
    getListboxProps,
    getItemProps,
  }
}
