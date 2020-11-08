import React from 'react'
import { render } from '@testing-library/react'
import SponsorButton from '../SponsorButton'

describe('SponsorButton', () => {
  it('render correct components', () => {
    const { container, getByText } = render(<SponsorButton />)
    expect(getByText(/Sponsor/i)).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })

  it('render correct URL', () => {
    const { getByRole } = render(<SponsorButton />)
    expect(getByRole('link')).toBeInTheDocument()
    expect(getByRole('link')).toHaveAttribute(
      'href',
      'https://github.com/sponsors/xcv58'
    )
    expect(getByRole('link')).toHaveAttribute('target', '_blank')
  })
})
