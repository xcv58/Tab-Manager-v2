import { useRef, useEffect } from 'react'
import { useStore } from 'components/hooks/useStore'

export const useSearchInputRef = () => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { searchStore } = useStore()
  const { setSearchEl } = searchStore

  useEffect(() => setSearchEl(searchInputRef))
  return searchInputRef
}
