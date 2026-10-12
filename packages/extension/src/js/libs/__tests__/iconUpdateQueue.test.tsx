const mockLocalGet = jest.fn()
const mockSetIcon = jest.fn(() => Promise.resolve())
const mockSetTitle = jest.fn(() => Promise.resolve())

jest.mock('libs', () => ({
  browser: {
    storage: {
      local: { get: mockLocalGet },
      sync: {
        get: jest.fn(() => Promise.resolve({ actionTabCountMode: 'off' })),
      },
    },
    action: { setIcon: mockSetIcon, setTitle: mockSetTitle },
  },
}))

it('shares concurrent refreshes and applies the latest theme instead of an obsolete result', async () => {
  let releaseFirst: (value: { systemTheme: string }) => void
  mockLocalGet
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseFirst = resolve
        }),
    )
    .mockResolvedValue({ systemTheme: 'dark' })
  const { setBrowserIcon } = await import('../verify')
  const first = setBrowserIcon()
  const latest = setBrowserIcon()
  expect(latest).toBe(first)
  releaseFirst({ systemTheme: 'light' })
  await latest
  expect(mockSetIcon).toHaveBeenCalledTimes(1)
  expect(mockSetIcon).toHaveBeenLastCalledWith({ path: 'icon-128-dark.png' })
  mockLocalGet.mockResolvedValue({ systemTheme: 'light' })
  await setBrowserIcon()
  expect(mockSetIcon).toHaveBeenCalledTimes(2)
  expect(mockSetIcon).toHaveBeenLastCalledWith({ path: 'icon-128.png' })
})
