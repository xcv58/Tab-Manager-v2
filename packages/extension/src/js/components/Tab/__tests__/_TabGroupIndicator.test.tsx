import React from 'react'
import * as StoreContext from 'components/hooks/useStore'
import TabGroupIndicator from '../_TabGroupIndicator'
import { render } from '@testing-library/react'

const VALID_GROUP_ID = 42
const VALID_TAB_ID = 7

const mockStore = {
  tabGroupStore: {
    isNoGroupId: (groupId) => groupId === -1,
    getTabGroup: (groupId) => {
      if (groupId === VALID_GROUP_ID) {
        return { color: 'blue' }
      }
      return null
    },
  },
}

describe('TabGroupIndicator', () => {
  beforeEach(() => {
    jest.spyOn(StoreContext, 'useStore').mockImplementation(() => mockStore)
  })

  it('render valid content if groupId is valid', () => {
    const { container } = render(
      <TabGroupIndicator
        {...({ id: VALID_TAB_ID, groupId: VALID_GROUP_ID } as any)}
      />,
    )
    expect(container).toMatchSnapshot()
  })

  it('render null for invalid groupId', () => {
    const { container } = render(
      <TabGroupIndicator {...({ groupId: -1 } as any)} />,
    )
    expect(container).toMatchSnapshot()
  })
})
