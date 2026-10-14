import { matchCommandItems } from '../commandMatching'

const commands = [
  { label: 'Sort tabs across windows', aliases: 'arrange' },
  { label: 'Move selected tabs', aliases: 'window group destination' },
  { label: 'Open Settings', aliases: 'preferences' },
]

it('matches command words in any order with the same ranking', () => {
  const keys = ['label', 'aliases']
  expect(matchCommandItems(commands, 'sort windows', keys)).toEqual([
    commands[0],
  ])
  expect(matchCommandItems(commands, 'windows sort', keys)).toEqual(
    matchCommandItems(commands, 'sort windows', keys),
  )
})

it('matches across labels and aliases, requiring every word', () => {
  expect(
    matchCommandItems(commands, 'move group', ['label', 'aliases']),
  ).toEqual([commands[1]])
  expect(
    matchCommandItems(commands, 'settings group', ['label', 'aliases']),
  ).toEqual([])
})

it('preserves original order for blank queries and equal ranks', () => {
  expect(matchCommandItems(commands, '  ', ['label'])).toBe(commands)
  const tied = [{ label: 'Move tabs' }, { label: 'Move tabs' }]
  expect(matchCommandItems(tied, 'move', ['label'])).toEqual(tied)
})
