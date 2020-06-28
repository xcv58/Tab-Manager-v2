import { render } from '@testing-library/react'
import Url from 'components/Tab/Url'

const props = {
  tab: { url: 'url' },
  getHighlightNode: jest.fn((x) => x)
}

describe('Url', () => {
  it('render correct components', () => {
    const { container, getByText } = render(<Url {...props} />)
    expect(getByText(/url/i)).toBeInTheDocument()
    expect(getByText(/url/i)).toHaveClass(
      'w-full overflow-hidden truncate text-xs opacity-75 group-hover:opacity-100'
    )
    expect(container).toMatchSnapshot()
  })

  it('render getHighlightNode(url) as children', () => {
    const getHighlightNode = jest.fn((x) => 'test')
    const { container, getByText } = render(
      <Url {...props} getHighlightNode={getHighlightNode} />
    )
    expect(getByText(/test/i)).toBeInTheDocument()
    expect(container).toMatchSnapshot()
  })
})
