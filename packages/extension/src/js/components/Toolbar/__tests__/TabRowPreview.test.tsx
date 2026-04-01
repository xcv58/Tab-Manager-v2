import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import TabRowPreview from '../TabRowPreview'

describe('TabRowPreview', () => {
  it('removes preview row controls from the sequential tab order', async () => {
    render(
      <TabRowPreview
        config={{
          id: 1,
          title: 'Preview tab',
          url: 'https://example.com/preview',
          showDuplicateMarker: true,
          showTabIcon: true,
          showUrl: true,
        }}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: 'Toggle select' }),
      ).toHaveAttribute('tabindex', '-1')
    })

    expect(screen.getByRole('button', { name: 'Tab actions' })).toHaveAttribute(
      'tabindex',
      '-1',
    )
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute(
      'tabindex',
      '-1',
    )
  })
})
