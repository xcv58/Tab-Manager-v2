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
  let preparedText = ''
  const preparedSourceRanges: Array<[number, number]> = []

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

    const preparedSegment = removeAccents(
      sourceText.slice(sourceStart, sourceEnd),
    )
    preparedText += preparedSegment
    for (let index = 0; index < preparedSegment.length; index += 1) {
      preparedSourceRanges.push([sourceStart, sourceEnd])
    }

    sourceStart = sourceEnd
  }

  // match-sorter lowercases the complete accent-normalized value. Doing the
  // same here preserves context-sensitive mappings such as Greek final sigma.
  const normalizedText = preparedText.toLowerCase()
  const sourceRanges: Array<[number, number]> = []
  for (let preparedStart = 0; preparedStart < preparedText.length; ) {
    const codePoint = preparedText.codePointAt(preparedStart)
    const preparedCharacter = String.fromCodePoint(codePoint || 0)
    const preparedEnd = preparedStart + preparedCharacter.length
    const startRange = preparedSourceRanges[preparedStart]
    const endRange = preparedSourceRanges[preparedEnd - 1]

    if (startRange && endRange) {
      const sourceRange: [number, number] = [startRange[0], endRange[1]]
      for (
        let index = 0;
        index < preparedCharacter.toLowerCase().length;
        index += 1
      ) {
        sourceRanges.push(sourceRange)
      }
    }

    preparedStart = preparedEnd
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
    sorter: (rankedItems) => rankedItems,
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
