import React from 'react'
import {
  normalizeSearchText,
  normalizeSearchTextWithOffsets,
  type SearchMatchMode,
} from 'libs/searchMatching'

const highlightClassName =
  'font-semibold underline decoration-2 underline-offset-2 decoration-current'

export const getHighlightRanges = (
  query: string,
  text: string,
  mode: SearchMatchMode,
): Array<[number, number]> => {
  const normalizedQuery = normalizeSearchText((query || '').trim())
  const { text: normalizedText, sourceRanges } =
    normalizeSearchTextWithOffsets(text)
  if (!normalizedQuery || !normalizedText || mode === 'none') {
    return []
  }

  if (mode === 'contiguous') {
    const index = normalizedText.indexOf(normalizedQuery)
    if (index < 0) {
      return []
    }
    const startRange = sourceRanges[index]
    const endRange = sourceRanges[index + normalizedQuery.length - 1]
    return startRange && endRange ? [[startRange[0], endRange[1]]] : []
  }

  const ranges: Array<[number, number]> = []
  let queryIndex = 0
  for (
    let textIndex = 0;
    textIndex < normalizedText.length && queryIndex < normalizedQuery.length;
    textIndex += 1
  ) {
    if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
      const sourceRange = sourceRanges[textIndex]
      const previousRange = ranges[ranges.length - 1]
      if (sourceRange) {
        if (
          previousRange &&
          sourceRange[0] < previousRange[1] &&
          sourceRange[1] >= previousRange[0]
        ) {
          previousRange[1] = Math.max(previousRange[1], sourceRange[1])
        } else {
          ranges.push([...sourceRange])
        }
      }
      queryIndex += 1
    }
  }

  return queryIndex === normalizedQuery.length ? ranges : []
}

export default function HighlightNode({
  query,
  text,
  mode = 'fuzzy',
  inline = false,
}: {
  query: string
  text: string
  mode?: SearchMatchMode
  inline?: boolean
}) {
  const ranges = getHighlightRanges(query, text, mode)
  if (!ranges.length) {
    return inline ? <span>{text}</span> : <div>{text}</div>
  }

  const children: React.ReactNode[] = []
  let textIndex = 0
  ranges.forEach(([start, end], rangeIndex) => {
    if (start > textIndex) {
      children.push(text.slice(textIndex, start))
    }
    children.push(
      <span
        className={highlightClassName}
        data-search-highlight={mode}
        key={`${start}-${end}-${rangeIndex}`}
      >
        {text.slice(start, end)}
      </span>,
    )
    textIndex = end
  })
  if (textIndex < text.length) {
    children.push(text.slice(textIndex))
  }

  return inline ? <span>{children}</span> : <div>{children}</div>
}
