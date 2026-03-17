import React from 'react'
import { render } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import WinList from '../WinList'

jest.mock('react-resize-detector', () => () => null)
jest.mock('components/Window', () => (props) => (
  <div data-testid={`window-${props.win.id}`} />
))

describe('WinList', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('remeasures height when loading completes and toolbar reservation changes', () => {
    const updateViewport = jest.fn()
    const updateScroll = jest.fn()
    const setContainerRef = jest.fn()
    const computedStyleSpy = jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        paddingLeft: '0',
        paddingRight: '0',
        paddingTop: '0',
        paddingBottom: '0',
      } as CSSStyleDeclaration)
    const makeStore = (initialLoading: boolean, toolbarAutoHide: boolean) =>
      ({
        windowStore: {
          initialLoading,
          updateViewport,
          updateScroll,
          visibleWindows: [{ id: 1 }],
          renderedColumnLayouts: [
            {
              columnIndex: 0,
              left: 0,
              width: 320,
              height: 120,
              renderedWindows: [
                {
                  windowId: 1,
                  top: 0,
                },
              ],
            },
          ],
          totalContentWidth: 320,
          totalContentHeight: 120,
        },
        userStore: {
          tabWidth: 20,
          toolbarAutoHide,
        },
        focusStore: {
          setContainerRef,
        },
      }) as any
    const clientHeightSpy = jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(420)
    const clientWidthSpy = jest
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(0)

    const { rerender } = render(
      <StoreContext.Provider value={makeStore(true, false)}>
        <WinList />
      </StoreContext.Provider>,
    )

    expect(updateViewport).toHaveBeenCalledTimes(1)
    expect(updateViewport).toHaveBeenLastCalledWith(420, 0)
    expect(updateScroll).toHaveBeenCalledTimes(1)
    expect(updateScroll).toHaveBeenLastCalledWith(0, 0)

    rerender(
      <StoreContext.Provider value={makeStore(false, false)}>
        <WinList />
      </StoreContext.Provider>,
    )

    expect(updateViewport).toHaveBeenCalledTimes(2)
    expect(updateViewport).toHaveBeenLastCalledWith(420, 0)
    expect(updateScroll).toHaveBeenCalledTimes(2)
    expect(updateScroll).toHaveBeenLastCalledWith(0, 0)

    rerender(
      <StoreContext.Provider value={makeStore(false, true)}>
        <WinList />
      </StoreContext.Provider>,
    )

    expect(updateViewport).toHaveBeenCalledTimes(3)
    expect(updateViewport).toHaveBeenLastCalledWith(420, 0)
    expect(updateScroll).toHaveBeenCalledTimes(3)
    expect(updateScroll).toHaveBeenLastCalledWith(0, 0)

    computedStyleSpy.mockRestore()
    clientHeightSpy.mockRestore()
    clientWidthSpy.mockRestore()
  })
})
