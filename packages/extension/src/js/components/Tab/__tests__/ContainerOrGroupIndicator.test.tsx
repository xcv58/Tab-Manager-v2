import React from 'react'
import { render } from '@testing-library/react'
import * as StoreContext from 'components/hooks/useStore'
import ContainerOrGroupIndicator from '../ContainerOrGroupIndicator'

describe('ContainerOrGroupIndicator', () => {
  const originalTargetBrowser = process.env.TARGET_BROWSER

  afterEach(() => {
    process.env.TARGET_BROWSER = originalTargetBrowser
    jest.restoreAllMocks()
  })

  it('should prefer tab group indicator for grouped tab', () => {
    process.env.TARGET_BROWSER = 'firefox'
    jest.spyOn(StoreContext, 'useStore').mockImplementation(
      () =>
        ({
          tabGroupStore: {
            hasTabGroupsApi: () => true,
            isNoGroupId: (groupId) => groupId === -1,
            getTabGroup: () => ({ color: 'blue' }),
          },
          containerStore: {
            getContainer: () => ({ colorCode: '#ff0000' }),
          },
        }) as any,
    )

    const { container } = render(
      <ContainerOrGroupIndicator groupId={7} cookieStoreId="42" />,
    )

    expect(container.firstChild).toHaveStyle({
      bottom: '3px',
    })
  })

  it('should render container indicator for ungrouped firefox tab', () => {
    process.env.TARGET_BROWSER = 'firefox'
    jest.spyOn(StoreContext, 'useStore').mockImplementation(
      () =>
        ({
          tabGroupStore: {
            hasTabGroupsApi: () => true,
            isNoGroupId: (groupId) => groupId === -1,
            getTabGroup: () => null,
          },
          containerStore: {
            getContainer: () => ({ colorCode: '#ff0000' }),
          },
        }) as any,
    )

    const { container } = render(
      <ContainerOrGroupIndicator groupId={-1} cookieStoreId="42" />,
    )

    expect(container.firstChild).toHaveStyle({
      bottom: '2px',
    })
  })

  it('should render null when neither group nor container applies', () => {
    process.env.TARGET_BROWSER = 'chrome'
    jest.spyOn(StoreContext, 'useStore').mockImplementation(
      () =>
        ({
          tabGroupStore: {
            hasTabGroupsApi: () => false,
            isNoGroupId: () => true,
            getTabGroup: () => null,
          },
        }) as any,
    )

    const { container } = render(
      <ContainerOrGroupIndicator groupId={-1} cookieStoreId="42" />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
