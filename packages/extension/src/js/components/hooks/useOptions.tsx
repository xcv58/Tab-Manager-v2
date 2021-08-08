import { useStore } from 'components/hooks/useStore'

export const useOptions = () => {
  const { windowStore, shortcutStore, searchStore } = useStore()
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
  console.log({ historyTabs: [...historyTabs] })
  return [...windowStore.tabs, ...historyTabs]
}
