import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useCombobox } from '../Combobox'

const ExampleCombobox = ({ label }: { label: string }) => {
  const [inputValue, setInputValue] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(true)
  const items = React.useMemo(() => ['Alpha', 'Beta'], [])

  const { getInputProps, getItemProps, getListboxProps } = useCombobox({
    items,
    inputValue,
    onInputValueChange: setInputValue,
    onSelect: () => {},
    isOpen,
    onOpenChange: setIsOpen,
  })

  return (
    <div>
      <input aria-label={label} {...getInputProps()} />
      <ul {...getListboxProps()}>
        {items.map((item, index) => (
          <li key={item} {...getItemProps({ index, item })}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

describe('useCombobox', () => {
  it('generates distinct ids for multiple combobox instances', () => {
    render(
      <>
        <ExampleCombobox label="First combobox" />
        <ExampleCombobox label="Second combobox" />
      </>,
    )

    const [firstInput, secondInput] = screen.getAllByRole('combobox')
    const listboxes = screen.getAllByRole('listbox')
    const options = screen.getAllByRole('option')

    expect(listboxes).toHaveLength(2)
    expect(listboxes[0].id).not.toBe(listboxes[1].id)

    const optionIds = options.map((option) => option.id)
    expect(new Set(optionIds).size).toBe(optionIds.length)

    expect(firstInput).toHaveAttribute(
      'aria-activedescendant',
      options[0].getAttribute('id'),
    )
    expect(secondInput).toHaveAttribute(
      'aria-activedescendant',
      options[2].getAttribute('id'),
    )
  })
})

type Result = { id: string; disabled?: boolean }
const ResultCombobox = ({
  items,
  onSelect,
  onItemFocus,
  resultNavigation = true,
}: {
  items: Result[]
  onSelect: (item: Result) => void
  onItemFocus: (item: Result | null) => void
  resultNavigation?: boolean
}) => {
  const combo = useCombobox({
    items,
    inputValue: '',
    onInputValueChange: () => {},
    onSelect,
    onItemFocus,
    isOpen: true,
    resultNavigation,
    getItemKey: (item) => item.id,
    isItemDisabled: (item) => !!item.disabled,
  })
  return (
    <div {...combo.getRootProps()}>
      <input aria-label="Search" {...combo.getInputProps()} />
      <button>Elsewhere</button>
      <ul {...combo.getListboxProps()}>
        {items.map((item, index) => (
          <li key={item.id} {...combo.getItemProps({ index, item })}>
            {item.id}
            <button aria-label={`Close ${item.id}`}>Close</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

describe('result-owned keyboard focus', () => {
  const items: Result[] = [
    { id: 'Alpha' },
    { id: 'Group', disabled: true },
    { id: 'Beta' },
    { id: 'Gamma' },
  ]
  const setup = () => {
    const onSelect = jest.fn()
    const onItemFocus = jest.fn()
    const props = { items, onSelect, onItemFocus }
    return {
      ...render(<ResultCombobox {...props} />),
      props,
      onSelect,
      onItemFocus,
    }
  }
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = jest.fn()
  })

  it('navigates focused rows, skips headers, and runs the highlighted result', () => {
    const { onSelect, onItemFocus } = setup()
    const options = screen.getAllByRole('option')
    act(() => options[0].focus())
    fireEvent.keyDown(options[0], { key: 'ArrowDown' })
    expect(options[2]).toHaveFocus()
    expect(options[2]).toHaveAttribute('aria-selected', 'true')
    expect(onItemFocus).toHaveBeenLastCalledWith(items[2])
    fireEvent.keyDown(options[2], { key: 'ArrowUp' })
    expect(options[0]).toHaveFocus()
    fireEvent.keyDown(options[0], { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(items[0])
  })

  it.each([
    ['Alpha', ['Beta', 'Gamma'], 'Beta'],
    ['Beta', ['Alpha', 'Gamma'], 'Gamma'],
    ['Gamma', ['Alpha', 'Beta'], 'Beta'],
  ])(
    'restores focus after removing %s using the result order',
    (id, remaining, expected) => {
      const { rerender, props, onItemFocus } = setup()
      const row = screen
        .getAllByRole('option')
        .find((node) => node.dataset.resultKey === id)!
      act(() => row.focus())
      rerender(
        <ResultCombobox
          {...props}
          items={items.filter((item) => remaining.includes(item.id))}
        />,
      )
      const next = screen
        .getAllByRole('option')
        .find((node) => node.dataset.resultKey === expected)!
      expect(next).toHaveFocus()
      expect(next).toHaveAttribute('aria-selected', 'true')
      expect(onItemFocus).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: expected }),
      )
    },
  )

  it('keeps keyboard focus in the empty list after the last result is removed', () => {
    const { rerender, props, onItemFocus } = setup()
    act(() => screen.getAllByRole('option')[0].focus())
    rerender(<ResultCombobox {...props} items={[]} />)
    expect(screen.getByRole('listbox')).toHaveFocus()
    expect(onItemFocus).toHaveBeenLastCalledWith(null)
  })

  it('does not steal focus after the user chooses a different control', () => {
    const { rerender, props } = setup()
    act(() => screen.getAllByRole('option')[0].focus())
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus())
    rerender(<ResultCombobox {...props} items={items.slice(2)} />)
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
  })

  it('keeps Enter on nested buttons and modified arrows available to their own handlers', () => {
    const { onSelect } = setup()
    const button = screen.getByRole('button', { name: 'Close Alpha' })
    act(() => button.focus())
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.keyDown(button, { key: 'ArrowDown', ctrlKey: true })
    expect(button).toHaveFocus()
  })

  it('preserves input-owned navigation for ordinary comboboxes', () => {
    const onSelect = jest.fn()
    render(
      <ResultCombobox
        items={items}
        resultNavigation={false}
        onSelect={onSelect}
        onItemFocus={jest.fn()}
      />,
    )
    const input = screen.getByRole('combobox')
    act(() => input.focus())
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveFocus()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(items[2])
  })
})
