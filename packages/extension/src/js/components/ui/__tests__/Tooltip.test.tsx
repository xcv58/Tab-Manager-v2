import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tooltip from '../Tooltip'

const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  })
}

describe('Tooltip', () => {
  it('renders when controlled open is true', async () => {
    const { rerender } = render(
      <Tooltip open title="Tab tooltip">
        <button type="button">Tab row</button>
      </Tooltip>,
    )

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Tab tooltip')

    rerender(
      <Tooltip open={false} title="Tab tooltip">
        <button type="button">Tab row</button>
      </Tooltip>,
    )

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  it('still supports hover-driven visibility when uncontrolled', async () => {
    render(
      <Tooltip title="Hover tooltip">
        <button type="button">Hover target</button>
      </Tooltip>,
    )

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Hover target' }))

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Hover tooltip',
    )
  })

  it('clamps a bottom tooltip away from the left viewport edge', async () => {
    setViewportSize(160, 120)

    render(
      <Tooltip open title="Edge tooltip">
        <button
          type="button"
          ref={(node) => {
            if (node) {
              node.getBoundingClientRect = () =>
                ({
                  x: 0,
                  y: 12,
                  top: 12,
                  left: 0,
                  bottom: 32,
                  right: 20,
                  width: 20,
                  height: 20,
                  toJSON: () => ({}),
                }) as DOMRect
            }
          }}
        >
          Edge target
        </button>
      </Tooltip>,
    )

    const tooltip = await screen.findByRole('tooltip')
    jest.spyOn(tooltip, 'getBoundingClientRect').mockReturnValue({
      x: 8,
      y: 40,
      top: 40,
      left: 8,
      bottom: 70,
      right: 108,
      width: 100,
      height: 30,
      toJSON: () => ({}),
    } as DOMRect)

    fireEvent(window, new Event('resize'))

    await waitFor(() => {
      expect(tooltip).toHaveStyle('left: 8px')
      expect(tooltip).toHaveStyle('top: 40px')
      expect(tooltip).toHaveStyle('transform: none')
    })
  })
})
