import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StoreContext } from 'components/hooks/useStore'
import WinList from '../WinList'

jest.mock('react-resize-detector', () => () => null)
jest.mock('components/Window', () => (props) => (
  <div data-testid={`window-${props.win.id}`} />
))

const makePendingKeyboardFocusStore = ({
  fallbackPendingKeyboardFocusVerification,
  flushPendingKeyboardFocusVerification,
}: {
  fallbackPendingKeyboardFocusVerification: jest.Mock
  flushPendingKeyboardFocusVerification: jest.Mock
}) =>
  ({
    windowStore: {
      initialLoading: false,
      updateViewport: jest.fn(),
      updateScroll: jest.fn(),
      visibleWindows: [{ id: 1 }],
      renderedColumnLayouts: [
        {
          columnIndex: 0,
          left: 0,
          right: 320,
          width: 320,
          height: 120,
          windows: [{ windowId: 1 }],
          renderedWindows: [{ windowId: 1, top: 0 }],
        },
      ],
      totalContentWidth: 320,
      totalContentHeight: 120,
      layoutDirty: false,
      pendingKeyboardFocusVerification: { id: 11 },
      fallbackPendingKeyboardFocusVerification,
      flushPendingKeyboardFocusVerification,
    },
    userStore: {
      tabWidth: 20,
      toolbarAutoHide: false,
      autoFitColumns: false,
    },
    focusStore: {
      setContainerRef: jest.fn(),
    },
  }) as any

const mockAnimationFrameQueue = () => {
  let nextFrameId = 1
  const callbacks = new Map<number, FrameRequestCallback>()
  const requestSpy = jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback: FrameRequestCallback) => {
      const frameId = nextFrameId
      nextFrameId += 1
      callbacks.set(frameId, callback)
      return frameId
    })
  const cancelSpy = jest
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation((frameId: number) => {
      callbacks.delete(frameId)
    })
  const runNext = () => {
    const next = callbacks.entries().next().value as
      | [number, FrameRequestCallback]
      | undefined
    if (!next) {
      throw new Error('Expected a pending animation frame')
    }
    const [frameId, callback] = next
    callbacks.delete(frameId)
    act(() => callback(frameId * 16))
  }
  return {
    callbacks,
    cancelSpy,
    requestSpy,
    runNext,
  }
}

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
              windows: [{ windowId: 1 }],
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

  it('flushes the pending focused-item reveal only after loading completes', () => {
    const updateViewport = jest.fn()
    const updateScroll = jest.fn()
    const setContainerRef = jest.fn()
    const flushPendingFocusedItemReveal = jest.fn(() => true)
    const computedStyleSpy = jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        paddingLeft: '0',
        paddingRight: '0',
        paddingTop: '0',
        paddingBottom: '0',
      } as CSSStyleDeclaration)
    const rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0)
        return 1
      })
    const cancelAnimationFrameSpy = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined)
    const clientHeightSpy = jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(420)
    const clientWidthSpy = jest
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(320)
    const makeStore = (initialLoading: boolean) =>
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
              windows: [{ windowId: 1 }],
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
          pendingFocusedItemReveal: true,
          flushPendingFocusedItemReveal,
        },
        userStore: {
          tabWidth: 20,
          toolbarAutoHide: false,
        },
        focusStore: {
          setContainerRef,
        },
      }) as any

    const { rerender } = render(
      <StoreContext.Provider value={makeStore(true)}>
        <WinList />
      </StoreContext.Provider>,
    )

    expect(flushPendingFocusedItemReveal).not.toHaveBeenCalled()

    rerender(
      <StoreContext.Provider value={makeStore(false)}>
        <WinList />
      </StoreContext.Provider>,
    )

    expect(flushPendingFocusedItemReveal).toHaveBeenCalledTimes(1)

    computedStyleSpy.mockRestore()
    rafSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()
    clientHeightSpy.mockRestore()
    clientWidthSpy.mockRestore()
  })

  it('retries pending keyboard focus until the target receives focus', () => {
    const flushPendingKeyboardFocusVerification = jest
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const fallbackPendingKeyboardFocusVerification = jest.fn()
    const frames = mockAnimationFrameQueue()

    render(
      <StoreContext.Provider
        value={makePendingKeyboardFocusStore({
          fallbackPendingKeyboardFocusVerification,
          flushPendingKeyboardFocusVerification,
        })}
      >
        <WinList />
      </StoreContext.Provider>,
    )

    expect(frames.callbacks.size).toBe(1)
    frames.runNext()
    expect(flushPendingKeyboardFocusVerification).toHaveBeenCalledTimes(1)
    expect(frames.callbacks.size).toBe(1)

    frames.runNext()
    expect(flushPendingKeyboardFocusVerification).toHaveBeenCalledTimes(2)
    expect(fallbackPendingKeyboardFocusVerification).not.toHaveBeenCalled()
    expect(frames.callbacks.size).toBe(0)
  })

  it('falls back after pending keyboard focus exhausts its retry budget', () => {
    const flushPendingKeyboardFocusVerification = jest.fn(() => false)
    const fallbackPendingKeyboardFocusVerification = jest.fn()
    const frames = mockAnimationFrameQueue()

    render(
      <StoreContext.Provider
        value={makePendingKeyboardFocusStore({
          fallbackPendingKeyboardFocusVerification,
          flushPendingKeyboardFocusVerification,
        })}
      >
        <WinList />
      </StoreContext.Provider>,
    )

    for (let attempt = 0; attempt < 7; attempt += 1) {
      frames.runNext()
    }

    expect(flushPendingKeyboardFocusVerification).toHaveBeenCalledTimes(7)
    expect(fallbackPendingKeyboardFocusVerification).toHaveBeenCalledTimes(1)
    expect(frames.callbacks.size).toBe(0)
  })

  it('cancels pending keyboard-focus verification when WinList unmounts', () => {
    const flushPendingKeyboardFocusVerification = jest.fn(() => false)
    const fallbackPendingKeyboardFocusVerification = jest.fn()
    const frames = mockAnimationFrameQueue()

    const { unmount } = render(
      <StoreContext.Provider
        value={makePendingKeyboardFocusStore({
          fallbackPendingKeyboardFocusVerification,
          flushPendingKeyboardFocusVerification,
        })}
      >
        <WinList />
      </StoreContext.Provider>,
    )
    const pendingCallback = frames.callbacks.values().next()
      .value as FrameRequestCallback

    unmount()

    expect(frames.cancelSpy).toHaveBeenCalledTimes(1)
    expect(frames.callbacks.size).toBe(0)
    act(() => pendingCallback(16))
    expect(flushPendingKeyboardFocusVerification).not.toHaveBeenCalled()
    expect(fallbackPendingKeyboardFocusVerification).not.toHaveBeenCalled()
  })

  it('uses vertical-only scrolling when auto-fit columns is enabled', () => {
    const computedStyleSpy = jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        paddingLeft: '0',
        paddingRight: '0',
        paddingTop: '0',
        paddingBottom: '0',
      } as CSSStyleDeclaration)
    const clientHeightSpy = jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(420)
    const clientWidthSpy = jest
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(320)

    render(
      <StoreContext.Provider
        value={
          {
            windowStore: {
              initialLoading: false,
              updateViewport: jest.fn(),
              updateScroll: jest.fn(),
              visibleWindows: [{ id: 1 }],
              renderedColumnLayouts: [
                {
                  columnIndex: 0,
                  left: 0,
                  width: 320,
                  height: 120,
                  windows: [{ windowId: 1 }],
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
              toolbarAutoHide: false,
              autoFitColumns: true,
            },
            focusStore: {
              setContainerRef: jest.fn(),
            },
          } as any
        }
      >
        <WinList />
      </StoreContext.Provider>,
    )

    const scrollContainer = screen.getByTestId('window-list-scroll-container')
    expect(scrollContainer).toHaveClass('overflow-y-scroll')
    expect(scrollContainer).toHaveClass('overflow-x-hidden')
    expect(scrollContainer).not.toHaveClass('overflow-scroll')

    computedStyleSpy.mockRestore()
    clientHeightSpy.mockRestore()
    clientWidthSpy.mockRestore()
  })

  it('offers the entire empty column as a relayout action when layout is dirty', () => {
    const repackLayoutAndRevealActiveTab = jest.fn(() => true)
    const store = {
      windowStore: {
        initialLoading: false,
        updateViewport: jest.fn(),
        updateScroll: jest.fn(),
        visibleWindows: [{ id: 1 }],
        renderedColumnLayouts: [
          {
            columnIndex: 0,
            left: 0,
            right: 320,
            width: 320,
            height: 120,
            windows: [{ windowId: 1 }],
            renderedWindows: [{ windowId: 1, top: 0 }],
          },
          {
            columnIndex: 1,
            left: 320,
            right: 640,
            width: 320,
            height: 0,
            windows: [],
            renderedWindows: [],
          },
        ],
        totalContentWidth: 640,
        totalContentHeight: 420,
        height: 420,
        scrollTop: 0,
        layoutDirty: true,
        repackLayoutAndRevealActiveTab,
      },
      userStore: {
        tabWidth: 20,
        toolbarAutoHide: false,
        autoFitColumns: false,
      },
      dragStore: {
        dragging: false,
      },
      searchStore: {
        query: '',
      },
      focusStore: {
        setContainerRef: jest.fn(),
      },
    } as any

    render(
      <StoreContext.Provider value={store}>
        <WinList />
      </StoreContext.Provider>,
    )

    const relayout = screen.getByRole('button', {
      name: 'Empty column Relayout all columns',
    })
    expect(relayout).toHaveTextContent('Empty column')
    expect(relayout).toHaveTextContent('Relayout all columns')
    expect(screen.getByTestId('empty-column-relayout-card-1')).toBeVisible()
    expect(screen.getByTestId('window-column-1')).toHaveStyle({
      height: '420px',
    })

    fireEvent.click(relayout, { detail: 1 })

    expect(repackLayoutAndRevealActiveTab).toHaveBeenCalledTimes(1)
    expect(repackLayoutAndRevealActiveTab).toHaveBeenCalledWith('mouse')

    repackLayoutAndRevealActiveTab.mockClear()
    fireEvent.click(relayout, { detail: 0 })

    expect(repackLayoutAndRevealActiveTab).toHaveBeenCalledTimes(1)
    expect(repackLayoutAndRevealActiveTab).toHaveBeenCalledWith('keyboard')
  })

  it('combines adjacent empty columns into one relayout action', () => {
    const store = {
      windowStore: {
        initialLoading: false,
        updateViewport: jest.fn(),
        updateScroll: jest.fn(),
        visibleWindows: [{ id: 1 }],
        renderedColumnLayouts: [
          {
            columnIndex: 0,
            left: 0,
            right: 320,
            width: 320,
            height: 120,
            windows: [{ windowId: 1 }],
            renderedWindows: [{ windowId: 1, top: 0 }],
          },
          {
            columnIndex: 1,
            left: 320,
            right: 640,
            width: 320,
            height: 0,
            windows: [],
            renderedWindows: [],
          },
          {
            columnIndex: 2,
            left: 640,
            right: 960,
            width: 320,
            height: 0,
            windows: [],
            renderedWindows: [],
          },
        ],
        totalContentWidth: 960,
        totalContentHeight: 420,
        height: 420,
        scrollTop: 0,
        layoutDirty: true,
        repackLayoutAndRevealActiveTab: jest.fn(),
      },
      userStore: {
        tabWidth: 20,
        toolbarAutoHide: false,
        autoFitColumns: false,
      },
      dragStore: {
        dragging: false,
      },
      searchStore: {
        query: '',
      },
      focusStore: {
        setContainerRef: jest.fn(),
      },
    } as any

    render(
      <StoreContext.Provider value={store}>
        <WinList />
      </StoreContext.Provider>,
    )

    const relayoutActions = screen.getAllByRole('button', {
      name: '2 empty columns Relayout all columns',
    })
    expect(relayoutActions).toHaveLength(1)
    expect(relayoutActions[0]).toHaveTextContent('2 empty columns')
    expect(relayoutActions[0]).toHaveTextContent('Relayout all columns')
    expect(relayoutActions[0]).toHaveStyle({
      left: '320px',
      width: '640px',
    })
    expect(relayoutActions[0]).toHaveAttribute('data-empty-column-start', '1')
    expect(relayoutActions[0]).toHaveAttribute('data-empty-column-end', '2')
  })

  it('keeps a virtualized empty run identity stable while clipping its geometry', () => {
    const columnLayoutsWithPosition = [
      {
        columnIndex: 0,
        left: 0,
        right: 320,
        width: 320,
        height: 120,
        windows: [{ windowId: 1 }],
        renderedWindows: [{ windowId: 1, top: 0 }],
      },
      ...[1, 2, 3, 4].map((columnIndex) => ({
        columnIndex,
        left: columnIndex * 320,
        right: (columnIndex + 1) * 320,
        width: 320,
        height: 0,
        windows: [],
        renderedWindows: [],
      })),
    ]
    const store = {
      windowStore: {
        initialLoading: false,
        updateViewport: jest.fn(),
        updateScroll: jest.fn(),
        visibleWindows: [{ id: 1 }],
        columnLayoutsWithPosition,
        renderedColumnLayouts: columnLayoutsWithPosition.slice(1, 3),
        totalContentWidth: 1600,
        totalContentHeight: 420,
        height: 420,
        scrollTop: 0,
        layoutDirty: true,
        repackLayoutAndRevealActiveTab: jest.fn(),
      },
      userStore: {
        tabWidth: 20,
        toolbarAutoHide: false,
        autoFitColumns: false,
      },
      dragStore: {
        dragging: false,
      },
      searchStore: {
        query: '',
        _query: '',
      },
      focusStore: {
        setContainerRef: jest.fn(),
      },
    } as any

    const { rerender } = render(
      <StoreContext.Provider value={store}>
        <WinList />
      </StoreContext.Provider>,
    )

    const relayout = screen.getByRole('button', {
      name: '4 empty columns Relayout all columns',
    })
    expect(relayout).toHaveStyle({ left: '320px', width: '640px' })
    relayout.focus()
    expect(relayout).toHaveFocus()

    const scrolledStore = {
      ...store,
      windowStore: {
        ...store.windowStore,
        renderedColumnLayouts: columnLayoutsWithPosition.slice(2, 4),
      },
    } as any
    rerender(
      <StoreContext.Provider value={scrolledStore}>
        <WinList />
      </StoreContext.Provider>,
    )

    const scrolledRelayout = screen.getByRole('button', {
      name: '4 empty columns Relayout all columns',
    })
    expect(scrolledRelayout).toBe(relayout)
    expect(scrolledRelayout).toHaveFocus()
    expect(scrolledRelayout).toHaveStyle({ left: '640px', width: '640px' })
    expect(scrolledRelayout).toHaveAttribute('data-empty-column-start', '1')
    expect(scrolledRelayout).toHaveAttribute('data-empty-column-end', '4')
  })

  it.each([
    ['clean layout', false, false, '', ''],
    ['active drag', true, true, '', ''],
    ['immediate search query', true, false, 'docs', ''],
    ['applied search query', true, false, '', 'docs'],
  ])(
    'does not offer empty-column relayout for %s',
    (_, layoutDirty, dragging, query, appliedQuery) => {
      render(
        <StoreContext.Provider
          value={
            {
              windowStore: {
                initialLoading: false,
                updateViewport: jest.fn(),
                updateScroll: jest.fn(),
                visibleWindows: [{ id: 1 }],
                renderedColumnLayouts: [
                  {
                    columnIndex: 0,
                    left: 0,
                    width: 320,
                    height: 0,
                    windows: [],
                    renderedWindows: [],
                  },
                ],
                totalContentWidth: 320,
                totalContentHeight: 420,
                height: 420,
                scrollTop: 0,
                layoutDirty,
                repackLayoutAndRevealActiveTab: jest.fn(),
              },
              userStore: {
                tabWidth: 20,
                toolbarAutoHide: false,
                autoFitColumns: false,
              },
              dragStore: {
                dragging,
              },
              searchStore: {
                query,
                _query: appliedQuery,
              },
              focusStore: {
                setContainerRef: jest.fn(),
              },
            } as any
          }
        >
          <WinList />
        </StoreContext.Provider>,
      )

      expect(
        screen.queryByRole('button', { name: /Relayout all columns/ }),
      ).toBeNull()
    },
  )
})
