import { useStore } from 'components/hooks/useStore'

const EMPTY_OPTIONS: never[] = []

export const useOptions = (enabled = true) => {
  const { windowStore, shortcutStore, searchStore } = useStore()
  if (!enabled) {
    return EMPTY_OPTIONS
  }
  if (searchStore.isCommand) {
    const { shortcuts } = shortcutStore
    return shortcuts
      .map(([shortcut, command, name, hideFromCommand]) => {
        if (typeof name !== 'string' || hideFromCommand) {
          return null
        }
        return { name, shortcut, command }
      })
      .filter((x) => x)
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  const { historyTabs } = searchStore
  return [...windowStore.tabs, ...historyTabs]
}
