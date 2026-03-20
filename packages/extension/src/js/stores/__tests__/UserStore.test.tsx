import UserStore, { stripLegacySettings } from 'stores/UserStore'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('UserStore', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('should always set loaded even when settings read fails', async () => {
    const initSearch = jest.fn()
    const userStore = new UserStore({
      searchStore: {
        init: initSearch,
      },
    } as any)
    await flush()

    userStore.loaded = false
    initSearch.mockClear()
    jest
      .spyOn(userStore, 'readSettings')
      .mockRejectedValueOnce(new Error('settings read failed'))

    await expect(userStore.init()).resolves.toBeUndefined()

    expect(userStore.loaded).toBe(true)
    expect(initSearch).toHaveBeenCalledTimes(1)
  })

  it('should repack layout when tab width or font size changes', async () => {
    const repackLayout = jest.fn()
    const userStore = new UserStore({
      searchStore: {
        init: jest.fn(),
      },
      windowStore: {
        repackLayout,
      },
    } as any)
    await flush()

    repackLayout.mockClear()

    userStore.updateTabWidth(24)
    userStore.updateFontSize(16)

    expect(repackLayout).toHaveBeenCalledTimes(2)
    expect(repackLayout).toHaveBeenNthCalledWith(1, 'settings-change')
    expect(repackLayout).toHaveBeenNthCalledWith(2, 'settings-change')
  })

  it('should repack layout after loading stored font size or tab width', async () => {
    const repackLayout = jest.fn()
    const userStore = new UserStore({
      searchStore: {
        init: jest.fn(),
      },
      windowStore: {
        repackLayout,
      },
    } as any)
    await flush()

    repackLayout.mockClear()
    jest.spyOn(userStore, 'readSettings').mockResolvedValueOnce({
      fontSize: 10,
      tabWidth: 24,
    })

    await userStore.init()

    expect(repackLayout).toHaveBeenCalledTimes(1)
    expect(repackLayout).toHaveBeenCalledWith('settings-change')
  })

  it('should repack layout when toggling unmatched tabs visibility', async () => {
    const repackLayout = jest.fn()
    const userStore = new UserStore({
      searchStore: {
        init: jest.fn(),
      },
      windowStore: {
        repackLayout,
      },
    } as any)
    await flush()

    repackLayout.mockClear()

    userStore.toggleShowUnmatchedTab()

    expect(repackLayout).toHaveBeenCalledTimes(1)
    expect(repackLayout).toHaveBeenCalledWith('filter-change')
  })

  it('should strip the legacy groupByDomain setting', () => {
    const { settings, legacyKeys } = stripLegacySettings({
      groupByDomain: true,
      showUrl: false,
    })

    expect(settings.showUrl).toBe(false)
    expect(settings.uiPreset).toBe('modern')
    expect(settings).not.toHaveProperty('groupByDomain')
    expect(legacyKeys).toEqual(['groupByDomain'])
  })

  it('should normalize invalid uiPreset values back to modern', () => {
    const { settings } = stripLegacySettings({
      uiPreset: 'retro',
    })

    expect(settings.uiPreset).toBe('modern')
  })

  it('should remove legacy settings after normalization', async () => {
    const userStore = new UserStore({
      searchStore: {
        init: jest.fn(),
      },
    } as any)
    await flush()
    const clearLegacySettings = jest
      .spyOn(userStore, 'clearLegacySettings')
      .mockResolvedValueOnce()

    const settings = userStore.normalizeStoredSettings(
      {
        groupByDomain: true,
        showUrl: false,
      },
      'sync',
    )

    expect(settings.showUrl).toBe(false)
    expect(clearLegacySettings).toHaveBeenCalledWith(['groupByDomain'], 'sync')
  })

  it('should blur focused content when opening the dialog and restore it on close', async () => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    document.body.innerHTML = '<button id="trigger">Open</button>'
    const trigger = document.getElementById('trigger') as HTMLButtonElement
    trigger.focus()

    const userStore = new UserStore({
      searchStore: {
        init: jest.fn(),
      },
    } as any)
    await flush()

    userStore.openDialog()
    expect(userStore.dialogOpen).toBe(true)
    expect(document.activeElement).toBe(document.body)

    userStore.closeDialog()
    expect(userStore.dialogOpen).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('should persist interface style selection', async () => {
    const userStore = new UserStore({
      searchStore: {
        init: jest.fn(),
      },
    } as any)
    await flush()
    const save = jest.spyOn(userStore, 'save').mockImplementation(() => {})

    userStore.selectUiPreset('classic')

    expect(userStore.uiPreset).toBe('classic')
    expect(save).toHaveBeenCalledTimes(1)
  })
})
