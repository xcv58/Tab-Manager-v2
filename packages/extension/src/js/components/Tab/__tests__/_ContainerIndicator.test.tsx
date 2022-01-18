import React from 'react'
import * as StoreContext from 'components/hooks/useStore'
import ContainerIndicator from '../_ContainerIndicator'
import { render } from '@testing-library/react'

const VALID_COOKIE_STORE_ID = '42'
const props = {
  cookieStoreId: VALID_COOKIE_STORE_ID,
}

const mockStore = {
  containerStore: {
    getContainer: (cookieStoreId) => {
      if (cookieStoreId === VALID_COOKIE_STORE_ID) {
        return { colorCode: '#ff0000' }
      }
    },
  },
}

describe('ContainerIndicator', () => {
  beforeEach(() => {
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)
  })

  it('render valid content if cookieStoreId is valid', () => {
    const { container } = render(<ContainerIndicator {...props} />)
    expect(container).toMatchSnapshot()
  })

  it('render null for invalid cookieStoreId', () => {
    const { container } = render(<ContainerIndicator cookieStoreId="" />)
    expect(container).toMatchSnapshot()
  })
})
