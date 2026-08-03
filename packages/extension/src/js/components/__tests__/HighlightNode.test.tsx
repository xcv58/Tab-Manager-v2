import React from 'react'
import { render, screen } from '@testing-library/react'
import HighlightNode, { getHighlightRanges } from 'components/HighlightNode'
import { getSearchMatchMode, matchItemsInMode } from 'libs/searchMatching'

describe('HighlightNode', () => {
  it('highlights one complete case-preserving substring in contiguous mode', () => {
    render(
      <HighlightNode
        query="disc"
        text="Open Discord Guide"
        mode="contiguous"
      />,
    )

    const highlights = screen.getAllByText('Disc')
    expect(highlights).toHaveLength(1)
    expect(highlights[0]).toHaveAttribute('data-search-highlight', 'contiguous')
  })

  it('highlights scattered characters only in fuzzy mode', () => {
    render(
      <HighlightNode query="dsc" text="Daily Science Course" mode="fuzzy" />,
    )

    expect(
      screen.getAllByText(/^[DSc]$/).map((highlight) => highlight.textContent),
    ).toEqual(['D', 'S', 'c'])
  })

  it('does not fuzzy-highlight a field during a contiguous search phase', () => {
    const { container } = render(
      <HighlightNode
        query="disc"
        text="Daily Interesting Science Course"
        mode="contiguous"
      />,
    )

    expect(container.querySelector('[data-search-highlight]')).toBeNull()
    expect(container).toHaveTextContent('Daily Interesting Science Course')
  })

  it('renders HTML-like content as text', () => {
    const { container } = render(
      <HighlightNode
        query="disc"
        text={'<script>Discord</script>'}
        mode="contiguous"
      />,
    )

    expect(container.querySelector('script')).toBeNull()
    expect(container).toHaveTextContent('<script>Discord</script>')
  })

  it('maps accent-insensitive contiguous matches back to the source text', () => {
    render(
      <HighlightNode query="resume" text="Résumé Guide" mode="contiguous" />,
    )

    const highlight = screen.getByText('Résumé')
    expect(highlight).toHaveAttribute('data-search-highlight', 'contiguous')
  })

  it('keeps source offsets correct when case folding changes text length', () => {
    render(
      <HighlightNode
        query="istanbul"
        text="İstanbul Guide"
        mode="contiguous"
      />,
    )

    expect(screen.getByText('İstanbul')).toHaveAttribute(
      'data-search-highlight',
      'contiguous',
    )
  })

  it('uses whole-string casing for context-sensitive Unicode matches', () => {
    render(<HighlightNode query="ος" text="ΟΣ" mode="contiguous" />)

    expect(screen.getByText('ΟΣ')).toHaveAttribute(
      'data-search-highlight',
      'contiguous',
    )
  })

  it('does not highlight a nonmatching field admitted by another search key', () => {
    const item = { title: 'ΟΣ', url: 'https://example.com/οσ' }
    const query = 'οσ'
    const keys = ['title', 'url']
    const mode = getSearchMatchMode([item], query, { keys })

    expect(mode).toBe('contiguous')
    expect(matchItemsInMode([item], query, mode, { keys })).toEqual([item])

    const { container } = render(
      <HighlightNode query={query} text={item.title} mode={mode} />,
    )
    expect(container.querySelector('[data-search-highlight]')).toBeNull()
  })

  it('maps expanded accent normalization back to one source character', () => {
    expect(getHighlightRanges('aesir', 'Æsir Guide', 'contiguous')).toEqual([
      [0, 4],
    ])
  })

  it('keeps combining-mark normalization mapped to one source segment', () => {
    expect(getHighlightRanges('x', 'X\u0301ylophone', 'contiguous')).toEqual([
      [0, 2],
    ])
  })

  it('returns no ranges for an unavailable match', () => {
    expect(getHighlightRanges('disc', 'Documentation', 'contiguous')).toEqual(
      [],
    )
    expect(getHighlightRanges('disc', 'Documentation', 'none')).toEqual([])
  })
})
