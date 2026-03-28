import { useState, useEffect, useCallback, useRef, useId } from 'react'

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
}: UseComboboxProps<T>) {
  const comboboxId = useId()
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const listRef = useRef<VirtualListRef | null>(null)
  const previousInputValueRef = useRef(inputValue)
  const previousIsOpenRef = useRef(isOpen)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      return
    }

    const inputValueChanged = previousInputValueRef.current !== inputValue
    const justOpened = !previousIsOpenRef.current && isOpen

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
  }, [
    items,
    inputValue,
    isOpen,
    autoHighlight,
    firstEnabledIndex,
    isItemDisabled,
  ])

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

  const getRootProps = () => ({
    // Container props if needed
  })

  const getInputProps = () => ({
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
    role: 'listbox',
    id: listboxId,
  })

  const getItemProps = ({ index, item }: { index: number; item: T }) => {
    const disabled = isItemDisabled(item)
    return {
      id: getItemId(index),
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
    highlightedIndex,
    listRef,
    getRootProps,
    getInputProps,
    getListboxProps,
    getItemProps,
  }
}
