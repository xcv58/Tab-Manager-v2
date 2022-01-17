import React from 'react'
import { render } from '@testing-library/react'
import Preview from 'components/Preview'
import * as StoreContext from 'components/hooks/useStore'

// TODO: Add real tab mock
const sources = []
const mockStore = {
  tabStore: { sources },
}

describe('Preview', () => {
  beforeEach(() => {
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)
  })

  it('render correct components', () => {
    const { container } = render(<Preview />)
    expect(container).toMatchSnapshot()
    expect(container.querySelector('div')).toBeInTheDocument()
  })
})
