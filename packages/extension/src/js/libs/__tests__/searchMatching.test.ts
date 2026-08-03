import {
  adaptiveMatchSorter,
  getSearchMatchMode,
  matchItemsInMode,
  matchesSearchText,
  normalizeSearchTextWithOffsets,
} from 'libs/searchMatching'

let mockNormalizedInputLength = 0

jest.mock('remove-accents', () => {
  const removeAccents = jest.requireActual('remove-accents')
  return (text: string) => {
    mockNormalizedInputLength += text.length
    return removeAccents(text)
  }
})

describe('searchMatching', () => {
  const titles = [
    'Daily Interesting Science Course',
    'Project DISC notes',
    'Discord Guide',
  ]

  it('returns only ranked contiguous matches when at least one exists', () => {
    expect(adaptiveMatchSorter(titles, 'disc')).toEqual({
      items: ['Discord Guide', 'Project DISC notes'],
      mode: 'contiguous',
    })
  })

  it('falls back to fuzzy matching when no candidate contains the query', () => {
    const result = adaptiveMatchSorter(
      ['Daily Science Course', 'Documentation Search Console'],
      'dsc',
    )

    expect(result.mode).toBe('fuzzy')
    expect(result.items).toEqual([
      'Daily Science Course',
      'Documentation Search Console',
    ])
  })

  it('matches contiguous text case-insensitively', () => {
    expect(adaptiveMatchSorter(['Discord'], 'DISC')).toEqual({
      items: ['Discord'],
      mode: 'contiguous',
    })
  })

  it('uses match-sorter accent normalization in the contiguous phase', () => {
    expect(adaptiveMatchSorter(['Résumé Guide'], 'resume')).toEqual({
      items: ['Résumé Guide'],
      mode: 'contiguous',
    })
  })

  it('uses whole-string casing for context-sensitive Unicode matches', () => {
    expect(adaptiveMatchSorter(['ΟΣ'], 'ος')).toEqual({
      items: ['ΟΣ'],
      mode: 'contiguous',
    })
    expect(normalizeSearchTextWithOffsets('ΟΣ')).toEqual({
      text: 'ος',
      sourceRanges: [
        [0, 1],
        [1, 2],
      ],
    })
  })

  it('builds source offsets with linear normalization work', () => {
    const text = 'a'.repeat(50_000)
    mockNormalizedInputLength = 0

    const normalized = normalizeSearchTextWithOffsets(text)

    expect(mockNormalizedInputLength).toBe(text.length)
    expect(normalized.text).toHaveLength(text.length)
    expect(normalized.sourceRanges[normalized.sourceRanges.length - 1]).toEqual(
      [text.length - 1, text.length],
    )
  })

  it('uses only the configured search keys', () => {
    const items = [
      {
        title: 'Alpha',
        url: 'https://example.com/needle',
        groupTitle: 'Research',
      },
      {
        title: 'Needle notes',
        url: 'https://example.com/other',
        groupTitle: 'Docs',
      },
    ]

    expect(
      adaptiveMatchSorter(items, 'needle', { keys: ['title'] }).items,
    ).toEqual([items[1]])
    expect(
      adaptiveMatchSorter(items, 'research', { keys: ['groupTitle'] }).items,
    ).toEqual([items[0]])
  })

  it('selects one global mode that can be applied to separate sections', () => {
    const tabs = [{ title: 'Discord', url: '' }]
    const history = [
      { title: 'Daily Interesting Science Course', url: '', visitCount: 1 },
    ]
    const options = [...tabs, ...history]
    const mode = getSearchMatchMode(options, 'disc', {
      keys: ['title', 'url'],
    })

    expect(mode).toBe('contiguous')
    expect(
      matchItemsInMode(tabs, 'disc', mode, { keys: ['title', 'url'] }),
    ).toEqual(tabs)
    expect(
      matchItemsInMode(history, 'disc', mode, { keys: ['title', 'url'] }),
    ).toEqual([])
  })

  it('returns input order and no match mode for a blank query', () => {
    expect(adaptiveMatchSorter(titles, '  ')).toEqual({
      items: titles,
      mode: 'none',
    })
  })

  it('checks a field using the selected global mode', () => {
    expect(matchesSearchText('Daily Interesting Science Course', 'disc')).toBe(
      true,
    )
    expect(
      matchesSearchText(
        'Daily Interesting Science Course',
        'disc',
        'contiguous',
      ),
    ).toBe(false)
    expect(matchesSearchText('SearchDocs', 'docs', 'contiguous')).toBe(true)
    expect(matchesSearchText('', 'docs', 'contiguous')).toBe(false)
  })
})
