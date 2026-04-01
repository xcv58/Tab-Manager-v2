import React from 'react'
import { render, screen } from '@testing-library/react'
import { useStore } from 'components/hooks/useStore'
import TabOption from '../TabOption'

jest.mock('components/ui/Tooltip', () => ({ children }) => <>{children}</>)
jest.mock('components/CloseButton', () => ({ onClick }) => (
  <button onClick={onClick}>close</button>
))
jest.mock('components/HighlightNode', () => ({ text }) => <>{text}</>)
jest.mock('components/RowActionSlot', () => ({ children }) => <>{children}</>)
jest.mock('components/RowActionRail', () => ({ children, tail }) => (
  <>
    {children}
    {tail}
  </>
))
jest.mock('components/Tab/ContainerOrGroupIndicator', () => () => null)
jest.mock('components/Tab/DuplicateMarker', () => () => null)
jest.mock('components/Tab/Icon', () => () => null)
jest.mock('components/Tab/TabTools', () => () => null)
jest.mock('components/hooks/useStore', () => ({
  useStore: jest.fn(),
}))

const mockUseStore = useStore as jest.Mock

const createTab = (overrides = {}) => ({
  id: 1,
  title: 'Docs tab',
  url: 'https://example.com/docs',
  groupId: -1,
  groupTitle: '',
  pinned: false,
  removing: false,
  remove: jest.fn(),
  ...overrides,
})

describe('AutocompleteSearch TabOption', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders ungrouped tabs without an inline group chip', () => {
    mockUseStore.mockReturnValue({
      searchStore: { query: '' },
      userStore: { showUrl: false, uiPreset: 'modern' },
      tabGroupStore: {
        hasTabGroupsApi: () => true,
        isNoGroupId: (groupId: number) => groupId === -1,
        getTabGroup: () => null,
      },
    })

    render(<TabOption tab={createTab()} />)

    expect(screen.getByText('Docs tab')).toBeInTheDocument()
    expect(
      screen.queryByTestId('search-tab-group-chip-1'),
    ).not.toBeInTheDocument()
  })

  it('renders the inline group chip for grouped tabs', () => {
    mockUseStore.mockReturnValue({
      searchStore: { query: '' },
      userStore: { showUrl: false, uiPreset: 'modern' },
      tabGroupStore: {
        hasTabGroupsApi: () => true,
        isNoGroupId: (groupId: number) => groupId === -1,
        getTabGroup: () => ({
          id: 42,
          color: 'blue',
          title: 'Docs group',
        }),
      },
    })

    render(
      <TabOption
        tab={createTab({
          id: 2,
          groupId: 42,
          groupTitle: 'Docs group',
        })}
      />,
    )

    expect(screen.getByTestId('search-tab-group-chip-2')).toHaveTextContent(
      'Docs group',
    )
    expect(screen.getByTestId('search-tab-group-chip-2')).toHaveStyle({
      backgroundColor: '#1a73e8',
      color: '#ffffff',
    })
  })
})
