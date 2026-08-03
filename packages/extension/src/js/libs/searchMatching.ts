import { matchSorter, rankings, type MatchSorterOptions } from 'match-sorter'
import removeAccents from 'remove-accents'

export type SearchMatchMode = 'none' | 'contiguous' | 'fuzzy'

export type SearchMatchOptions<Item> = Omit<
  MatchSorterOptions<Item>,
  'threshold'
>

export type SearchMatchResult<Item> = {
  items: Item[]
  mode: SearchMatchMode
}

const normalizeQuery = (query: string) => (query || '').trim()

export const normalizeSearchText = (text: string) =>
  removeAccents(text || '').toLowerCase()

const isCombiningMark = (character: string) => {
  const codePoint = character.codePointAt(0) || 0
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  )
}

export const normalizeSearchTextWithOffsets = (text: string) => {
  const sourceText = text || ''
  let normalizedText = ''
  const sourceRanges: Array<[number, number]> = []

  for (let sourceStart = 0; sourceStart < sourceText.length; ) {
    const firstCodePoint = sourceText.codePointAt(sourceStart)
    let sourceEnd =
      sourceStart + (firstCodePoint != null && firstCodePoint > 0xffff ? 2 : 1)

    while (sourceEnd < sourceText.length) {
      const nextCodePoint = sourceText.codePointAt(sourceEnd)
      const nextCharacter = String.fromCodePoint(nextCodePoint || 0)
      if (!isCombiningMark(nextCharacter)) {
        break
      }
      sourceEnd += nextCharacter.length
    }

    const normalizedSegment = normalizeSearchText(
      sourceText.slice(sourceStart, sourceEnd),
    )
    normalizedText += normalizedSegment
    for (let index = 0; index < normalizedSegment.length; index += 1) {
      sourceRanges.push([sourceStart, sourceEnd])
    }

    sourceStart = sourceEnd
  }

  return { text: normalizedText, sourceRanges }
}

export const matchItemsInMode = <Item>(
  items: ReadonlyArray<Item>,
  query: string,
  mode: SearchMatchMode,
  options: SearchMatchOptions<Item> = {},
): Item[] => {
  const normalizedQuery = normalizeQuery(query)
  if (!normalizedQuery || mode === 'none') {
    return [...items]
  }

  return matchSorter(items, normalizedQuery, {
    ...options,
    ...(mode === 'contiguous' ? { threshold: rankings.CONTAINS } : {}),
  })
}

export const getSearchMatchMode = <Item>(
  items: ReadonlyArray<Item>,
  query: string,
  options: SearchMatchOptions<Item> = {},
): SearchMatchMode => {
  const normalizedQuery = normalizeQuery(query)
  if (!normalizedQuery) {
    return 'none'
  }

  return matchSorter(items, normalizedQuery, {
    ...options,
    threshold: rankings.CONTAINS,
  }).length
    ? 'contiguous'
    : 'fuzzy'
}

export const adaptiveMatchSorter = <Item>(
  items: ReadonlyArray<Item>,
  query: string,
  options: SearchMatchOptions<Item> = {},
): SearchMatchResult<Item> => {
  const mode = getSearchMatchMode(items, query, options)
  return {
    items: matchItemsInMode(items, query, mode, options),
    mode,
  }
}

export const matchesSearchText = (
  text: string,
  query: string,
  mode?: SearchMatchMode,
) => {
  const normalizedText = (text || '').trim()
  const normalizedQuery = normalizeQuery(query)
  if (!normalizedText || !normalizedQuery) {
    return false
  }

  const effectiveMode =
    mode || getSearchMatchMode([normalizedText], normalizedQuery)
  return (
    matchItemsInMode([normalizedText], normalizedQuery, effectiveMode).length >
    0
  )
}
