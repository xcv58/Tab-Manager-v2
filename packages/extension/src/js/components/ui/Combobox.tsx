import React, { useState, useEffect, useCallback, useRef } from 'react'

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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const listRef = useRef<any>(null) // To be attached to virtualization list if needed

  // Reset highlight when items or input change
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1)
      return
    }
    if (autoHighlight) {
      const firstValidIndex = items.findIndex((item) => !isItemDisabled(item))
      setHighlightedIndex(firstValidIndex >= 0 ? firstValidIndex : -1)
    } else {
      setHighlightedIndex(-1)
    }
  }, [items, inputValue, isOpen, isItemDisabled, autoHighlight])

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
        if (listRef.current?.scrollToItem) {
          listRef.current.scrollToItem(nextIndex)
        } else if (listRef.current?.scrollIntoView) {
          // Fallback if it's a DOM node (though usually we use virtualized)
          const el = document.getElementById(`combobox-item-${nextIndex}`)
          if (el) el.scrollIntoView({ block: 'nearest' })
        }
      }
    },
    [items, isItemDisabled, highlightedIndex],
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
        } else {
          highlightItem(highlightedIndex + 1)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (isOpen) {
          highlightItem(highlightedIndex - 1)
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
      setTimeout(() => {
        if (onOpenChange) onOpenChange(false)
      }, 150)
    },
    'aria-activedescendant':
      highlightedIndex >= 0 ? `combobox-item-${highlightedIndex}` : undefined,
    'aria-autocomplete': 'list' as const,
    'aria-expanded': isOpen,
    role: 'combobox',
  })

  const getListboxProps = () => ({
    role: 'listbox',
    id: 'combobox-listbox',
  })

  const getItemProps = ({ index, item }: { index: number; item: T }) => {
    const disabled = isItemDisabled(item)
    return {
      id: `combobox-item-${index}`,
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
