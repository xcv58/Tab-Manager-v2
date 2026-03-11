import {
  filterCommandOptions,
  type CommandOption,
} from 'components/AutocompleteSearch/filterOptions'

describe('filterCommandOptions', () => {
  it('should match the same commands regardless of word order', () => {
    const options: CommandOption[] = [
      {
        name: 'Collapse all windows',
        shortcut: 'w c',
      },
      {
        name: 'Expand all windows',
        shortcut: 'w e',
      },
      {
        name: 'Open this window in new tab',
        shortcut: 'ctrl+o',
      },
      {
        name: 'Toggle collapse/expand for all windows',
        shortcut: 'w t',
      },
      {
        name: 'Toggle collapse/expand for current windows',
        shortcut: 'w w',
      },
    ]

    const expected = filterCommandOptions(options, 'expand window').map(
      ({ name }) => name,
    )
    const actual = filterCommandOptions(options, 'window expand').map(
      ({ name }) => name,
    )

    expect(actual).toEqual(expected)
    expect(actual).toEqual([
      'Expand all windows',
      'Toggle collapse/expand for all windows',
      'Toggle collapse/expand for current windows',
    ])
  })
})
