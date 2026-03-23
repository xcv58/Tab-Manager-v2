import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ToggleButton, ToggleGroup } from '../ToggleGroup'

describe('ToggleGroup', () => {
  it('renders a keyboard-navigable radio group with roving tab focus', () => {
    const Example = () => {
      const [value, setValue] = React.useState('modern')

      return (
        <ToggleGroup
          value={value}
          aria-label="Choose interface style"
          onChange={(nextValue) => {
            if (nextValue) {
              setValue(nextValue)
            }
          }}
        >
          <ToggleButton value="modern">Modern</ToggleButton>
          <ToggleButton value="classic">Classic</ToggleButton>
        </ToggleGroup>
      )
    }

    render(<Example />)

    const group = screen.getByRole('radiogroup', {
      name: 'Choose interface style',
    })
    const radios = screen.getAllByRole('radio')

    expect(group).toBeInTheDocument()
    expect(radios[0]).toHaveAttribute('tabindex', '0')
    expect(radios[1]).toHaveAttribute('tabindex', '-1')

    radios[0].focus()
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' })

    expect(radios[1]).toHaveFocus()
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
    expect(radios[1]).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(radios[1], { key: 'ArrowLeft' })

    expect(radios[0]).toHaveFocus()
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
  })
})
