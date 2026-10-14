import React from 'react'
import { observable, runInAction } from 'mobx'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import AutocompleteSearch from '../index'
import { useOptions } from 'components/hooks/useOptions'
import { useStore, useTabHeight } from 'components/hooks/useStore'
import { getSearchMatchMode, matchItemsInMode } from 'libs/searchMatching'

jest.mock('components/hooks/useOptions', () => ({
  useOptions: jest.fn(),
}))

jest.mock('components/hooks/useStore', () => ({
  useStore: jest.fn(),
  useTabHeight: jest.fn(),
}))

jest.mock('../TabOption', () => ({
  __esModule: true,
  default: ({ tab }) => (
    <div tabIndex={-1} data-testid={`search-tab-row-${tab.id}`}>
      {tab.title}
    </div>
  ),
}))

jest.mock('components/Tab/HistoryItemTab', () => ({
  __esModule: true,
  default: ({ tab }) => <div>{tab.title}</div>,
}))

jest.mock('components/Shortcut/Shortcuts', () => ({
  __esModule: true,
  default: () => <span>Shortcut</span>,
}))

jest.mock('react-window', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react')

  return {
    VariableSizeList: ReactActual.forwardRef(
      (
        {
          children,
          height,
          innerElementType = 'div',
          itemCount,
          itemData,
        }: {
          children: (props: any) => React.ReactNode
          height: number
          innerElementType?: keyof JSX.IntrinsicElements
          itemCount: number
          itemData: any
        },
        ref,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          scrollToItem: jest.fn(),
        }))

        const InnerElement = innerElementType

        return (
          <div data-testid="virtual-list" style={{ height }}>
            <InnerElement>
              {Array.from({ length: itemCount }, (_, index) => (
                <ReactActual.Fragment key={index}>
                  {children({
                    index,
                    data: itemData,
                    style: { top: index * 40, height: 40 },
                  })}
                </ReactActual.Fragment>
              ))}
            </InnerElement>
          </div>
        )
      },
    ),
  }
})

const mockUseOptions = useOptions as jest.Mock
const mockUseStore = useStore as jest.Mock
const mockUseTabHeight = useTabHeight as jest.Mock

const defaultOptions = [
  {
    id: 1,
    title: 'Alpha tab',
    url: 'https://alpha.example.com',
    groupId: -1,
    activate: jest.fn(),
  },
  {
    id: 2,
    title: 'Beta tab',
    url: 'https://beta.example.com',
    groupId: -1,
    activate: jest.fn(),
  },
]

const renderAutocompleteSearch = ({
  initialQuery = '',
  options = defaultOptions,
  open,
  bottomInset,
  showResultMenu,
}: {
  initialQuery?: string
  options?: any[]
  open?: boolean
  bottomInset?: number
  showResultMenu?: boolean
} = {}) => {
  const startType = jest.fn()
  const stopType = jest.fn()
  const setSearchEl = jest.fn()
  const openPalette = jest.fn()
  const actionStore = observable({
    paletteOpen: false,
    menu: null,
    openPalette,
  })

  const Wrapper = () => {
    const queryState = React.useMemo(
      () => observable({ query: initialQuery }),
      [initialQuery],
    )
    const userStore = React.useMemo(
      () => ({
        autoFocusSearch: false,
        showUrl: true,
      }),
      [],
    )

    const searchStore = React.useMemo(
      () => ({
        get query() {
          return queryState.query
        },
        get isCommand() {
          return queryState.query.startsWith('>')
        },
        search: (nextValue: string) =>
          runInAction(() => {
            queryState.query = nextValue
          }),
        getMatchModeForQuery: (nextValue: string) =>
          getSearchMatchMode(options, nextValue, {
            keys: ['title', 'url'],
          }),
        tabSearchKeys: ['title', 'url'],
        get inputMatchedTabs() {
          const query = queryState.query
          return matchItemsInMode(
            options.filter((option) => typeof option.id === 'number'),
            query,
            getSearchMatchMode(options, query, { keys: ['title', 'url'] }),
            { keys: ['title', 'url'] },
          )
        },
        setSearchEl,
        startType,
        stopType,
      }),
      [options, queryState],
    )

    mockUseStore.mockImplementation(() => ({
      userStore,
      searchStore,
      actionStore,
      hoverStore: {
        hovered: false,
        hoveredSurface: 'list',
        hideTooltip: jest.fn(),
        openTooltip: jest.fn(),
      },
      tabGroupStore: {
        hasTabGroupsApi: () => false,
      },
    }))

    mockUseOptions.mockImplementation(() => options)
    mockUseTabHeight.mockReturnValue(40)

    return (
      <AppThemeContext.Provider value={lightAppTheme}>
        <AutocompleteSearch
          {...(open !== undefined ? { open } : {})}
          bottomInset={bottomInset}
          showResultMenu={showResultMenu}
        />
      </AppThemeContext.Provider>
    )
  }

  return { ...render(<Wrapper />), openPalette, actionStore }
}

describe('AutocompleteSearch', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('moves the highlighted result with arrow keys', async () => {
    renderAutocompleteSearch({ initialQuery: 'tab', open: true })

    const input = screen.getByRole('combobox')

    await waitFor(() => {
      expect(screen.getAllByRole('option')[0]).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    fireEvent.keyDown(input, { key: 'ArrowDown' })

    await waitFor(() => {
      expect(screen.getAllByRole('option')[1]).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
  })

  it('shows only contiguous matches and ranks stronger text matches first', async () => {
    renderAutocompleteSearch({
      initialQuery: 'abc',
      open: true,
      options: [
        { id: 5, title: 'Archive big context', url: '', groupId: -1 },
        { id: 4, title: 'Alpha Beta Charlie', url: '', groupId: -1 },
        { id: 3, title: 'Project abc notes', url: '', groupId: -1 },
        { id: 2, title: 'abc project', url: '', groupId: -1 },
        { id: 1, title: 'abc', url: '', groupId: -1 },
      ],
    })

    expect(
      (await screen.findAllByRole('option')).map((option) =>
        option.textContent?.trim(),
      ),
    ).toEqual(['abc', 'abc project', 'Project abc notes'])
  })

  it('falls back to fuzzy matches when no contiguous match exists', async () => {
    renderAutocompleteSearch({
      initialQuery: 'abc',
      open: true,
      options: [
        { id: 2, title: 'Archive big context', url: '', groupId: -1 },
        { id: 1, title: 'Alpha Beta Charlie', url: '', groupId: -1 },
      ],
    })

    expect(
      (await screen.findAllByRole('option')).map((option) =>
        option.textContent?.trim(),
      ),
    ).toEqual(['Alpha Beta Charlie', 'Archive big context'])
  })

  it('uses one adaptive match mode when history has the only contiguous match', async () => {
    renderAutocompleteSearch({
      initialQuery: 'disc',
      open: true,
      options: [
        {
          id: 1,
          title: 'Daily Interesting Science Course',
          url: '',
          groupId: -1,
        },
        {
          id: 'history-1',
          title: 'Discord',
          url: '',
          visitCount: 1,
        },
      ],
    })

    const optionTexts = (await screen.findAllByRole('option')).map((option) =>
      option.textContent?.trim(),
    )
    expect(optionTexts).toHaveLength(2)
    expect(optionTexts[0]).toContain('History')
    expect(optionTexts[1]).toBe('Discord')
    expect(optionTexts.join(' ')).not.toContain(
      'Daily Interesting Science Course',
    )
  })

  it('restores both tab and history results during fuzzy fallback', async () => {
    renderAutocompleteSearch({
      initialQuery: 'dsc',
      open: true,
      options: [
        { id: 1, title: 'Discord', url: '', groupId: -1 },
        {
          id: 'history-1',
          title: 'Daily Science Course',
          url: '',
          visitCount: 1,
        },
      ],
    })

    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('Discord')
    expect(options[1]).toHaveTextContent('History')
    expect(options[2]).toHaveTextContent('Daily Science Course')
  })

  it.each([0, undefined])(
    'keeps history results with visitCount=%s',
    async (visitCount) => {
      renderAutocompleteSearch({
        initialQuery: 'zero history',
        open: true,
        options: [
          { id: 1, title: 'Browser tab', url: '', groupId: -1 },
          { id: 'history-zero', title: 'Zero history', url: '', visitCount },
        ],
      })
      const options = await screen.findAllByRole('option')
      expect(options).toHaveLength(2)
      expect(options[0]).toHaveTextContent('History')
      expect(options[1]).toHaveTextContent('Zero history')
    },
  )

  it('clears search and leaves the input with one Escape', async () => {
    renderAutocompleteSearch({ initialQuery: 'alpha', open: undefined })

    const input = screen.getByRole('combobox')
    act(() => input.focus())

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-expanded', 'false')
    })
    await waitFor(() => {
      expect(input).toHaveValue('')
    })

    await waitFor(() => {
      expect(input).not.toHaveFocus()
    })
  })

  it.each([undefined, true])(
    'clears and dismisses search from a focused result (controlled open: %s)',
    async (open) => {
      renderAutocompleteSearch({ initialQuery: 'alpha', open })
      const input = screen.getByRole('combobox')
      act(() => input.focus())
      const result = await screen.findByTestId('search-tab-row-1')
      act(() => result.focus())
      expect(result).toHaveFocus()

      fireEvent.keyDown(result, { key: 'Escape' })
      fireEvent.keyUp(result, { key: 'Escape' })

      expect(input).toHaveValue('')
      expect(input).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(input).not.toHaveFocus()
    },
  )

  it('keeps the same list mounted while the palette overlays search', async () => {
    const { actionStore } = renderAutocompleteSearch({ initialQuery: 'alpha' })
    const input = screen.getByRole('combobox')
    act(() => input.focus())
    const list = await screen.findByTestId('virtual-list')
    list.scrollTop = 100
    act(() => {
      actionStore.paletteOpen = true
    })
    expect(list.isConnected).toBe(true)
    expect(list.closest('[inert]')).not.toBeNull()
    fireEvent.blur(input)
    await new Promise((resolve) => setTimeout(resolve, 180))
    expect(list.isConnected).toBe(true)
    act(() => {
      actionStore.paletteOpen = false
    })
    expect(screen.getByTestId('virtual-list')).toBe(list)
    expect(list.scrollTop).toBe(100)
    expect(input).toHaveValue('alpha')
  })

  it('keeps the result list open when open is controlled by the parent', async () => {
    renderAutocompleteSearch({ initialQuery: 'tab', open: true })

    const options = await screen.findAllByRole('option')

    fireEvent.click(options[0])

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(defaultOptions.length)
    })

    expect(defaultOptions[0].activate).toHaveBeenCalledWith({
      origin: 'search',
      reveal: true,
    })
  })

  it('hides ordinary tab results when the result menu is disabled', () => {
    renderAutocompleteSearch({
      initialQuery: 'tab',
      open: true,
      showResultMenu: false,
    })

    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByRole('option')).toBeNull()
  })

  it('keeps > as an alias for the dedicated palette when search results are disabled', () => {
    const { openPalette } = renderAutocompleteSearch({
      initialQuery: 'research',
      showResultMenu: false,
    })

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: '>export csv' },
    })

    expect(openPalette).toHaveBeenCalledWith('export csv')
    expect(screen.getByRole('combobox')).toHaveValue('research')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('uses the same smaller font size for the input text and the search hint', () => {
    renderAutocompleteSearch()

    const input = screen.getByRole('combobox')
    const hint = screen.getByText('/ search · > commands')

    expect(input).toHaveStyle('font-size: 0.8125rem')
    expect(hint).toHaveStyle('font-size: 0.8125rem')
  })

  it('uses a flexing root so the search field does not overlap the toolbar summary', () => {
    renderAutocompleteSearch()

    const input = screen.getByRole('combobox')
    const root = input.parentElement?.parentElement

    expect(root).toHaveStyle('flex: 1 1 0%')
    expect(root).toHaveStyle('min-width: 0')
  })

  it('caps the lite popup result list height to the exact available space above the bottom controls', async () => {
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 240,
    })

    const originalGetBoundingClientRect =
      HTMLDivElement.prototype.getBoundingClientRect
    HTMLDivElement.prototype.getBoundingClientRect = function () {
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 120,
        right: 320,
        width: 320,
        height: 120,
        toJSON: () => ({}),
      } as DOMRect
    }

    renderAutocompleteSearch({
      initialQuery: 'tab',
      open: true,
      bottomInset: 64,
      options: new Array(12).fill(null).map((_, index) => ({
        id: index + 1,
        title: `Tab ${index + 1}`,
        url: `https://example.com/${index + 1}`,
        groupId: -1,
        activate: jest.fn(),
      })),
    })

    const virtualList = await screen.findByTestId('virtual-list')
    expect(virtualList).toHaveStyle('height: 52px')

    HTMLDivElement.prototype.getBoundingClientRect =
      originalGetBoundingClientRect
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
  })
})
