import React from 'react'
import * as StoreContext from 'components/hooks/useStore'
import { render } from 'enzyme'
import ContainerIndicator from '../_ContainerIndicator'

const VALID_COOKIE_STORE_ID = '42'
const props = {
  cookieStoreId: VALID_COOKIE_STORE_ID
}

const mockStore = {
  containerStore: {
    getContainer: (cookieStoreId) => {
      if (cookieStoreId === VALID_COOKIE_STORE_ID) {
        return { colorCode: '#ff0000' }
      }
    }
  }
}

describe('ContainerIndicator', () => {
  beforeEach(() => {
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)
  })

  it('render valid content if cookieStoreId is valid', () => {
    const el = render(<ContainerIndicator {...props} />)
    expect(el).toMatchSnapshot()
  })

  it('render null for invalid cookieStoreId', () => {
    const el = render(<ContainerIndicator cookieStoreId='' />)
    expect(el).toMatchSnapshot()
  })
})
