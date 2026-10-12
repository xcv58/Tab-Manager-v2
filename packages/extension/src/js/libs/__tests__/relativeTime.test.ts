import { formatRelativeTime } from '../relativeTime'

const now = Date.UTC(2026, 9, 12, 12)

describe('history relative timestamps', () => {
  it.each([
    [0, 'a few seconds ago'],
    [30000, 'a few seconds ago'],
    [45000, 'a minute ago'],
    [5 * 60000, '5 minutes ago'],
    [3600000, 'an hour ago'],
    [3 * 3600000, '3 hours ago'],
    [86400000, 'a day ago'],
    [7 * 86400000, '7 days ago'],
    [-5 * 60000, 'in 5 minutes'],
  ])('formats a visit %s milliseconds ago', (elapsed, label) => {
    expect(formatRelativeTime(now - elapsed, now)).toBe(label)
  })

  it('handles missing and invalid browser timestamps', () => {
    expect(formatRelativeTime(undefined, now)).toBe('a few seconds ago')
    expect(formatRelativeTime(Number.NaN, now)).toBe('Invalid date')
    expect(formatRelativeTime(Number.POSITIVE_INFINITY, now)).toBe(
      'Invalid date',
    )
  })

  it.each([
    [new Date(2026, 0, 31, 12), new Date(2026, 1, 28, 12), 'a month ago'],
    [new Date(2024, 1, 29, 12), new Date(2025, 1, 28, 12), 'a year ago'],
    [new Date(2026, 0, 1, 12), new Date(2026, 2, 1, 12), '2 months ago'],
  ])('handles calendar boundaries from %s to %s', (visit, current, label) => {
    expect(formatRelativeTime(visit.getTime(), current.getTime())).toBe(label)
  })
})
