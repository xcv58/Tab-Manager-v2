import React from 'react'
import { render, screen } from '@testing-library/react'
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
