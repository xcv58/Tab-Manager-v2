import React from 'react'
import * as StoreContext from 'components/hooks/useStore'
import ContainerIndicator from '../_ContainerIndicator'
import { act, render } from '@testing-library/react'
import { observable, runInAction } from 'mobx'

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
  it('updates an existing indicator when its container changes and removes it when the identity disappears', () => {
    const containers = observable.map([
      [VALID_COOKIE_STORE_ID, { colorCode: '#ff0000' }],
    ])
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => ({
      containerStore: { getContainer: (id) => containers.get(id) },
    }))
    const { container } = render(<ContainerIndicator {...props} />)
    expect(container.querySelector('hr')).toHaveStyle({
      borderColor: '#ff0000',
    })
    act(() =>
      runInAction(() =>
        containers.set(VALID_COOKIE_STORE_ID, { colorCode: '#0000ff' }),
      ),
    )
    expect(container.querySelector('hr')).toHaveStyle({
      borderColor: '#0000ff',
    })
    act(() => runInAction(() => containers.delete(VALID_COOKIE_STORE_ID)))
    expect(container.querySelector('hr')).toBeNull()
  })
})
