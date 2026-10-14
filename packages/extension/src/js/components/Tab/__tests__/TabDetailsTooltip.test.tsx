import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { writeToClipboard } from 'libs'
import TabDetailsTooltip from '../TabDetailsTooltip'

jest.mock('libs', () => ({ writeToClipboard: jest.fn() }))
const clipboard = writeToClipboard as jest.Mock

describe('Tab details tooltip', () => {
  beforeEach(() => {
    clipboard.mockReset()
    clipboard.mockResolvedValue(undefined)
  })
  afterEach(() => jest.restoreAllMocks())

  it('copies complete Unicode titles and long URLs, regardless of preview limits', async () => {
    const title = '研究 notes 🔎 '.repeat(500)
    const url = `https://example.com/?query=${'long-value-'.repeat(1500)}`
    render(
      <TabDetailsTooltip
        title={title}
        titleLines={1}
        url={url}
        urlLines={1}
        duplicateText=""
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Copy title' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Title copied'),
    )
    expect(clipboard).toHaveBeenLastCalledWith(title)
    fireEvent.click(screen.getByRole('button', { name: 'Copy URL' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('URL copied'),
    )
    expect(clipboard).toHaveBeenLastCalledWith(url)
    expect(screen.getByTestId('tab-tooltip-url')).toHaveTextContent(url)
  })

  it('expands clipped text without replacing or shortening its value', () => {
    jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(200)
    jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(60)
    const url = `https://example.com/?data=${'long'.repeat(300)}`
    render(
      <TabDetailsTooltip
        title="A long title"
        url={url}
        urlLines={3}
        duplicateText=""
      />,
    )
    const expand = screen.getByRole('button', { name: 'Show full URL' })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(expand)
    expect(screen.getByTestId('tab-tooltip-url')).not.toHaveClass(
      'line-clamp-3',
    )
    expect(screen.getByTestId('tab-tooltip-url').textContent).toBe(url)
    fireEvent.click(screen.getByRole('button', { name: 'Show less URL' }))
    expect(screen.getByTestId('tab-tooltip-url')).toHaveClass('line-clamp-3')
  })

  it('reports clipboard failure and keeps the text available for manual copying', async () => {
    clipboard.mockRejectedValue(new Error('Clipboard unavailable'))
    render(
      <TabDetailsTooltip
        title="Readable title"
        url="https://example.com/"
        urlLines={3}
        duplicateText=""
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Copy title' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Select the text'),
    )
    expect(screen.getByTestId('tab-tooltip-title')).toHaveTextContent(
      'Readable title',
    )
  })

  it('expands a limited title independently and restores its chosen line limit', () => {
    jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(300)
    jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(80)
    const title = 'A detailed research title 研究 🔎 '.repeat(50)
    render(
      <TabDetailsTooltip
        title={title}
        titleLines={5}
        url="https://example.test/"
        urlLines={1}
        duplicateText=""
      />,
    )
    const titleText = screen.getByTestId('tab-tooltip-title')
    expect(titleText).toHaveClass('line-clamp-5')
    fireEvent.click(screen.getByRole('button', { name: 'Show full title' }))
    expect(titleText).not.toHaveClass('line-clamp-5')
    expect(titleText.textContent).toBe(title)
    expect(screen.getByTestId('tab-tooltip-url')).toHaveClass('line-clamp-1')
    fireEvent.click(screen.getByRole('button', { name: 'Show less title' }))
    expect(titleText).toHaveClass('line-clamp-5')
  })

  it('keeps full-title mode untruncated while the URL retains its own limit', () => {
    render(
      <TabDetailsTooltip
        title={'Long title '.repeat(100)}
        titleLines="full"
        url="https://example.test/"
        urlLines={3}
        duplicateText=""
      />,
    )
    expect(screen.getByTestId('tab-tooltip-title')).not.toHaveClass(
      'line-clamp-3',
    )
    expect(screen.queryByRole('button', { name: 'Show full title' })).toBeNull()
    expect(screen.getByTestId('tab-tooltip-url')).toHaveClass('line-clamp-3')
  })
})
