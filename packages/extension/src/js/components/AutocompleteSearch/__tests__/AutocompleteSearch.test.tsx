import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppThemeContext, lightAppTheme } from 'libs/appTheme'
import AutocompleteSearch from '../index'
import { useOptions } from 'components/hooks/useOptions'
import { useStore, useTabHeight } from 'components/hooks/useStore'

jest.mock('components/hooks/useOptions', () => ({
  useOptions: jest.fn(),
}))

jest.mock('components/hooks/useStore', () => ({
  useStore: jest.fn(),
  useTabHeight: jest.fn(),
}))

jest.mock('../TabOption', () => ({
  __esModule: true,
  default: ({ tab }) => <div>{tab.title}</div>,
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
        }: {
          children: (props: any) => React.ReactNode
          height: number
          innerElementType?: keyof JSX.IntrinsicElements
          itemCount: number
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
  open = true,
  bottomInset,
}: {
  initialQuery?: string
  options?: any[]
  open?: boolean
  bottomInset?: number
} = {}) => {
  const startType = jest.fn()
  const stopType = jest.fn()
  const setSearchEl = jest.fn()

  const Wrapper = () => {
    const [query, setQuery] = React.useState(initialQuery)
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
          return query
        },
        get isCommand() {
          return query.startsWith('>')
        },
        search: (nextValue: string) => setQuery(nextValue),
        setSearchEl,
        startType,
        stopType,
      }),
      [query],
    )

    mockUseStore.mockImplementation(() => ({
      userStore,
      searchStore,
      tabGroupStore: {
        hasTabGroupsApi: () => false,
      },
    }))

    mockUseOptions.mockImplementation(() => options)
    mockUseTabHeight.mockReturnValue(40)

    return (
      <AppThemeContext.Provider value={lightAppTheme}>
        <AutocompleteSearch open={open} bottomInset={bottomInset} />
      </AppThemeContext.Provider>
    )
  }

  return render(<Wrapper />)
}

describe('AutocompleteSearch', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('moves the highlighted result with arrow keys', async () => {
    renderAutocompleteSearch({ initialQuery: 'tab' })

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

  it('clears and dismisses the search field when Escape is pressed', async () => {
    renderAutocompleteSearch({ initialQuery: 'alpha' })

    const input = screen.getByRole('combobox')
    input.focus()

    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(input).toHaveValue('')
    })

    await waitFor(() => {
      expect(input).not.toHaveFocus()
    })
  })

  it('uses the same smaller font size for the input text and the search hint', () => {
    renderAutocompleteSearch()

    const input = screen.getByRole('combobox')
    const hint = screen.getByText('/ focus · > commands')

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
