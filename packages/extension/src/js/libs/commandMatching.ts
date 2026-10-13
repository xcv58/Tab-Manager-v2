import { matchSorter, type MatchSorterOptions } from 'match-sorter'

/** Match every word independently, so query order does not change results. */
export const matchCommandItems = <T>(
  items: T[],
  query: string,
  keys: MatchSorterOptions<T>['keys'],
) => {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return items
  const ranks = terms.map(
    (term) =>
      new Map(
        matchSorter(items, term, {
          keys,
          baseSort: (a, b) => a.index - b.index,
        }).map((item, index) => [item, index]),
      ),
  )
  // Stable ties retain the command/section order supplied by the store.
  return items
    .filter((item) => ranks.every((rank) => rank.has(item)))
    .sort(
      (a, b) =>
        ranks.reduce((sum, rank) => sum + rank.get(a)!, 0) -
        ranks.reduce((sum, rank) => sum + rank.get(b)!, 0),
    )
}
