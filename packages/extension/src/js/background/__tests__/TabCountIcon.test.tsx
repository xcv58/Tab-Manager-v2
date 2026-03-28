const addCreatedListener = jest.fn()
const addRemovedListener = jest.fn()
const addAttachedListener = jest.fn()
const addDetachedListener = jest.fn()
const addFocusChangedListener = jest.fn()
const addWindowRemovedListener = jest.fn()
const addStorageChangedListener = jest.fn()

jest.mock('libs', () => ({
  browser: {
    tabs: {
      onCreated: { addListener: addCreatedListener },
      onRemoved: { addListener: addRemovedListener },
      onAttached: { addListener: addAttachedListener },
      onDetached: { addListener: addDetachedListener },
    },
    windows: {
      onFocusChanged: { addListener: addFocusChangedListener },
      onRemoved: { addListener: addWindowRemovedListener },
    },
    storage: {
      onChanged: { addListener: addStorageChangedListener },
    },
  },
}))

jest.mock('libs/verify', () => ({
  setBrowserIcon: jest.fn(() => Promise.resolve()),
}))

import TabCountIcon from '../TabCountIcon'
import { setBrowserIcon } from 'libs/verify'

describe('TabCountIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('refreshes the browser icon when tab or window events fire', async () => {
    new TabCountIcon()

    const createdListener = addCreatedListener.mock.calls[0][0]
    const removedListener = addRemovedListener.mock.calls[0][0]
    const attachedListener = addAttachedListener.mock.calls[0][0]
    const detachedListener = addDetachedListener.mock.calls[0][0]
    const focusListener = addFocusChangedListener.mock.calls[0][0]
    const windowRemovedListener = addWindowRemovedListener.mock.calls[0][0]

    await createdListener({ id: 1 })
    await removedListener(1)
    await attachedListener(1, { newWindowId: 2 })
    await detachedListener(1, { oldWindowId: 2 })
    await focusListener(2)
    await windowRemovedListener(2)

    expect(setBrowserIcon).toHaveBeenCalledTimes(6)
  })

  it('refreshes the browser icon only for relevant local storage changes', async () => {
    new TabCountIcon()

    const storageListener = addStorageChangedListener.mock.calls[0][0]

    await storageListener(
      {
        actionTabCountMode: {
          oldValue: 'off',
          newValue: 'allWindows',
        },
      },
      'local',
    )

    expect(setBrowserIcon).toHaveBeenCalledTimes(1)

    await storageListener(
      {
        actionTabCountMode: {
          oldValue: 'off',
          newValue: 'currentWindow',
        },
      },
      'sync',
    )

    expect(setBrowserIcon).toHaveBeenCalledTimes(2)

    await storageListener(
      {
        preserveSearch: {
          oldValue: true,
          newValue: false,
        },
      },
      'local',
    )

    expect(setBrowserIcon).toHaveBeenCalledTimes(2)
  })
})
