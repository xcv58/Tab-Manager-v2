import { matchSorter } from 'match-sorter'

export type CommandOption = {
  name: string
  shortcut?: string | string[]
  command: () => void
}

const COMMAND_KEYS = ['name', 'shortcut']

const getCommandQueryTerms = (query: string) =>
  query.trim().split(/\s+/).filter(Boolean)

const getCommandRankMaps = (options: CommandOption[], terms: string[]) =>
  terms.map((term) => {
    const matches = matchSorter(options, term, {
      keys: COMMAND_KEYS,
    })
    return new Map(matches.map((option, index) => [option, index]))
  })

export const filterCommandOptions = (
  options: CommandOption[],
  query: string,
) => {
  const terms = getCommandQueryTerms(query)
  if (!terms.length) {
    return options
  }

  const rankMaps = getCommandRankMaps(options, terms)
  return options
    .filter((option) => rankMaps.every((rankMap) => rankMap.has(option)))
    .sort((a, b) => {
      const rankA = rankMaps.reduce((sum, rankMap) => sum + rankMap.get(a), 0)
      const rankB = rankMaps.reduce((sum, rankMap) => sum + rankMap.get(b), 0)
      if (rankA !== rankB) {
        return rankA - rankB
      }
      return a.name.localeCompare(b.name)
    })
}
