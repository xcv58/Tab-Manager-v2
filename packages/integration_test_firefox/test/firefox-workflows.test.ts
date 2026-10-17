import { createServer } from 'node:http'
import { By, Key, WebDriver, until } from 'selenium-webdriver'
import {
  SEARCH_INPUT_SELECTOR,
  FirefoxExtensionSession,
  clearExtensionStorage,
  clickByTestId,
  closeBrowserWithExtension,
  closeNonExtensionTabs,
  executeInExtension,
  getGroupMembers,
  getTabGroup,
  initBrowserWithExtension,
  openPages,
  saveFirefoxDiagnostics,
  waitForCss,
  waitForTestIdCount,
  waitForText,
} from '../util'

const describeFirefox =
  process.env.FIREFOX_E2E === '1' ? describe : describe.skip
const selectionSearch = '[data-selection-action-search]'

describeFirefox('Firefox container, editor, and keyboard workflows', () => {
  const hits = new Map<string, number>()
  const server = createServer((request, response) => {
    const url = request.url || '/'
    hits.set(url, (hits.get(url) || 0) + 1)
    response.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store',
    })
    response.end(
      '<title>Firefox workflow fixture</title><p>Local sample page</p>',
    )
  })
  let baseURL: string
  let session: FirefoxExtensionSession
  let driver: WebDriver
  let serial = 0
  const urls = (name: string, count = 2) =>
    Array.from(
      { length: count },
      (_, index) => `${baseURL}/${name}-${++serial}-${index}`,
    )
  const row = (id: number) => `[data-testid="tab-row-${id}"]`
  const keys = async (...values: string[]) => {
    await driver
      .actions()
      .sendKeys(...values)
      .perform()
  }
  const shortcut = async (key: string, ...modifiers: string[]) => {
    const action = driver.actions()
    for (const modifier of modifiers) action.keyDown(modifier)
    action.sendKeys(key)
    for (const modifier of [...modifiers].reverse()) action.keyUp(modifier)
    await action.perform()
  }
  const focus = async (selector: string) => {
    // Installing the add-on opens a welcome tab. Explicitly activate the
    // WebDriver document so native keyboard events target this UI instance.
    await executeInExtension(driver, async () => {
      const tab = await browser.tabs.getCurrent()
      if (!tab?.id) throw new Error('Missing extension tab')
      if (!tab.active) await browser.tabs.update(tab.id, { active: true })
      const win = await browser.windows.get(tab.windowId)
      if (!win.focused)
        await browser.windows.update(tab.windowId, { focused: true })
    })
    const element = await driver.wait(
      until.elementLocated(By.css(selector)),
      10000,
    )
    if (selector === SEARCH_INPUT_SELECTOR) await element.click()
    else
      await driver.executeScript(
        'arguments[0].focus({preventScroll:true})',
        element,
      )
    await driver.wait(
      async () =>
        driver.executeScript(
          'return document.activeElement?.matches(arguments[0]) || false',
          selector,
        ),
      10000,
      `Could not focus ${selector}`,
    )
    return element
  }
  const expectFocus = async (selector: string) => {
    await driver.wait(
      async () =>
        driver.executeScript(
          'return document.activeElement?.matches(arguments[0]) || false',
          selector,
        ),
      10000,
      `Expected focus on ${selector}`,
    )
  }
  const expectChecked = async (id: number, checked: boolean) => {
    await driver.wait(
      async () =>
        (await driver
          .findElement(By.css(`${row(id)} input[type="checkbox"]`))
          .isSelected()) === checked,
      10000,
      `Expected tab ${id} checked=${checked}`,
    )
  }
  const dismissSearchResults = async () => {
    const search = await driver.findElement(By.css(SEARCH_INPUT_SELECTOR))
    if ((await search.getAttribute('aria-expanded')) === 'true') {
      await driver
        .findElement(By.css('[data-testid="window-list-scroll-container"]'))
        .click()
      await driver.wait(
        async () => (await search.getAttribute('aria-expanded')) === 'false',
        10000,
      )
    }
  }
  const select = async (id: number) => {
    await dismissSearchResults()
    const checkbox = await driver.findElement(
      By.css(`${row(id)} input[type="checkbox"]`),
    )
    await driver.actions().move({ origin: checkbox }).perform()
    await driver.wait(
      async () =>
        driver.executeScript((element: HTMLInputElement) => {
          const rect = element.getBoundingClientRect()
          return (
            document.elementFromPoint(
              rect.left + rect.width / 2,
              rect.top + rect.height / 2,
            ) === element
          )
        }, checkbox),
      5000,
    )
    await checkbox.click()
    await expectChecked(id, true)
  }
  const focusActions = async () => {
    await shortcut('f', Key.CONTROL, Key.SHIFT)
    await expectFocus(selectionSearch)
    return await waitForCss(driver, selectionSearch)
  }
  const menuItem = async (label: string) => {
    const element = await driver.wait(async () => {
      const items = await driver.findElements(By.css('[role="menuitem"]'))
      for (const item of items)
        if ((await item.getText()).trim() === label) return item
      return false
    }, 10000)
    if (!element) throw new Error(`Menu item not found: ${label}`)
    return element
  }
  const fixtureTabs = async (pages: string[]) => {
    await openPages(driver, pages)
    const readTabs = () =>
      executeInExtension(
        driver,
        async (pages) =>
          (await browser.tabs.query({})).filter((tab) =>
            pages.includes(tab.url || ''),
          ),
        pages,
      )
    // tabs.create resolves before Firefox has committed the navigation URL.
    await driver.wait(async () => {
      const current = await readTabs()
      return (
        current.length === pages.length &&
        current.every((tab) => tab.status === 'complete')
      )
    }, 10000)
    const tabs = await readTabs()
    expect(tabs).toHaveLength(pages.length)
    await driver.get(session.extensionURL)
    for (const tab of tabs) await waitForCss(driver, row(tab.id!))
    return tabs
  }
  const container = async (name: string, color = 'blue') => {
    const identity = await executeInExtension(
      driver,
      async ({ name, color }) =>
        browser.contextualIdentities.create({ name, color, icon: 'briefcase' }),
      { name, color },
    )
    return identity
  }

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing fixture port')
    baseURL = `http://127.0.0.1:${address.port}`
  })
  beforeEach(async () => {
    // Container organization can adopt the WebDriver tab into another window.
    // Start each workflow in a fresh profile rather than reusing a stale handle.
    session = await initBrowserWithExtension()
    driver = session.driver
    await driver.get(session.extensionURL)
    await clearExtensionStorage(driver)
    await closeNonExtensionTabs(driver, session.extensionOrigin)
    await driver.get(session.extensionURL)
    await waitForCss(driver, SEARCH_INPUT_SELECTOR)
  })
  afterEach(async () => {
    try {
      await saveFirefoxDiagnostics(
        driver,
        expect.getState().currentTestName || 'workflows',
      )
    } finally {
      if (session) await closeBrowserWithExtension(session)
    }
  })
  afterAll(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('selects only the matching container across windows from the menu and toggles it with Alt+X', async () => {
    const identity = await container('Selection container')
    const pages = urls('container-selection', 3)
    const ids = await executeInExtension(
      driver,
      async ({ pages, cookieStoreId }) => {
        const first = await browser.tabs.create({
          url: pages[0],
          cookieStoreId,
          active: false,
        })
        const otherWindow = await browser.windows.create({
          url: pages[2],
          focused: false,
        })
        const second = await browser.tabs.create({
          windowId: otherWindow.id,
          url: pages[1],
          cookieStoreId,
          active: false,
        })
        return [first.id!, second.id!, otherWindow.tabs![0].id!]
      },
      { pages, cookieStoreId: identity.cookieStoreId },
    )
    await driver.get(session.extensionURL)
    const firstRow = await waitForCss(driver, row(ids[0]))
    await driver.actions().contextClick(firstRow).perform()
    await (await menuItem('Select tabs in the same container')).click()
    await expectChecked(ids[0], true)
    await expectChecked(ids[1], true)
    await expectChecked(ids[2], false)
    await focus(row(ids[0]))
    await shortcut('x', Key.ALT)
    for (const id of ids) await expectChecked(id, false)
    expect(
      await driver.executeScript(
        () =>
          document.querySelectorAll(
            '[data-testid^="tab-row-"] input[type="checkbox"]:checked',
          ).length,
      ),
    ).toBe(0)
  })

  it('organizes containers across windows without mixing identities or losing tabs', async () => {
    const first = await container('Work container')
    const second = await container('Personal container', 'green')
    const pages = urls('container-organize', 6)
    const before = await executeInExtension(
      driver,
      async ({ pages, cookies }) => {
        for (let index = 0; index < 2; index += 1) {
          const win = await browser.windows.create({
            url: pages[index * 3],
            focused: false,
          })
          for (let cookie = 0; cookie < 2; cookie += 1) {
            await browser.tabs.create({
              windowId: win.id,
              url: pages[index * 3 + cookie + 1],
              cookieStoreId: cookies[cookie],
              active: false,
            })
          }
        }
        return (await browser.tabs.query({})).filter((tab) =>
          pages.includes(tab.url || ''),
        )
      },
      { pages, cookies: [first.cookieStoreId, second.cookieStoreId] },
    )
    await driver.get(session.extensionURL)
    await waitForCss(driver, row(before[0].id!))
    await focus(row(before[0].id!))
    await shortcut('c', Key.ALT)
    await driver.wait(async () => {
      const after = await executeInExtension(
        driver,
        async (pages) =>
          (await browser.tabs.query({})).filter((tab) =>
            pages.includes(tab.url || ''),
          ),
        pages,
      )
      return [first, second].every((identity) => {
        const tabs = after.filter(
          (tab) => tab.cookieStoreId === identity.cookieStoreId,
        )
        return (
          tabs.length === 2 &&
          new Set(tabs.map((tab) => tab.windowId)).size === 1
        )
      })
    }, 30000)
    const after = await executeInExtension(
      driver,
      async (ids) => Promise.all(ids.map((id) => browser.tabs.get(id))),
      before.map((tab) => tab.id!),
    )
    for (const old of before) {
      const current = after.find((tab) => tab.id === old.id)!
      expect(current.cookieStoreId).toBe(old.cookieStoreId)
    }
  })

  it('reflects container color changes in existing rows without reloading the extension', async () => {
    const identity = await container('Original container')
    const [url] = urls('container-update', 1)
    const tab = await executeInExtension(
      driver,
      async ({ url, cookieStoreId }) =>
        browser.tabs.create({ url, cookieStoreId, active: false }),
      { url, cookieStoreId: identity.cookieStoreId },
    )
    await driver.get(session.extensionURL)
    const indicator = `${row(tab.id!)} hr`
    await waitForCss(driver, indicator)
    const before = await driver
      .findElement(By.css(indicator))
      .getCssValue('border-top-color')
    const updated = await executeInExtension(
      driver,
      async (cookieStoreId) =>
        browser.contextualIdentities.update(cookieStoreId, {
          name: 'Renamed container',
          color: 'red',
        }),
      identity.cookieStoreId,
    )
    expect(updated.name).toBe('Renamed container')
    await driver.wait(
      async () =>
        (await driver
          .findElement(By.css(indicator))
          .getCssValue('border-top-color')) !== before,
      10000,
    )
    const color = await driver
      .findElement(By.css(indicator))
      .getCssValue('border-top-color')
    const expected = await driver.executeScript(
      'const el = document.createElement("span"); el.style.color=arguments[0]; document.body.append(el); const value=getComputedStyle(el).color; el.remove(); return value;',
      updated.colorCode,
    )
    expect(color).toBe(expected)
  })

  it('creates a native group through the command palette and edits its name and color through the group editor', async () => {
    const tabs = await fixtureTabs(urls('group-editor'))
    for (const tab of tabs) await select(tab.id!)
    await focus(row(tabs[0].id!))
    await shortcut('k', Key.ALT)
    const search = await waitForCss(
      driver,
      '[data-testid="command-palette"] input[role="combobox"]',
    )
    await search.sendKeys('create a group')
    const create = await driver.wait(
      async () => {
        for (const option of await driver.findElements(
          By.css('[data-testid="command-palette"] [role="option"]'),
        )) {
          if (
            (await option.getText()).startsWith(
              'Create a group from 2 selected tabs',
            )
          )
            return option
        }
        return false
      },
      10000,
      'Create-group command missing',
    )
    if (!create) throw new Error('Missing create-group command')
    await create.click()
    let groupId = -1
    await driver.wait(async () => {
      const current = await executeInExtension(
        driver,
        async (ids) => Promise.all(ids.map((id) => browser.tabs.get(id))),
        tabs.map((tab) => tab.id!),
      )
      groupId = current[0].groupId ?? -1
      return groupId !== -1 && current.every((tab) => tab.groupId === groupId)
    }, 10000)
    await waitForTestIdCount(driver, 'command-palette', 0)
    await expectFocus(row(tabs[0].id!))
    await dismissSearchResults()
    const header = await waitForCss(
      driver,
      `[data-testid="tab-group-header-${groupId}"]`,
    )
    await driver.actions().move({ origin: header }).perform()
    await clickByTestId(driver, `tab-group-menu-${groupId}`)
    await clickByTestId(driver, `tab-group-menu-rename-${groupId}`)
    const name = await waitForCss(
      driver,
      `[data-testid="tab-group-editor-title-${groupId}"]`,
    )
    await expectFocus(`[data-testid="tab-group-editor-title-${groupId}"]`)
    await name.sendKeys('Edited in Firefox')
    expect(await name.getAttribute('value')).toBe('Edited in Firefox')
    // Moving to a color control commits the name through the editor's blur
    // handler without depending on whether Firefox focuses clicked buttons.
    await name.sendKeys(Key.TAB)
    await driver.wait(
      async () =>
        (await getTabGroup(driver, groupId)).title === 'Edited in Firefox',
      10000,
    )
    await clickByTestId(driver, `tab-group-editor-color-${groupId}-red`)
    await driver.wait(
      async () => (await getTabGroup(driver, groupId)).color === 'red',
      10000,
    )
    await keys(Key.ESCAPE)
    await waitForTestIdCount(driver, `tab-group-editor-${groupId}`, 0)
    await waitForText(
      driver,
      `[data-testid="tab-group-title-${groupId}"]`,
      'Edited in Firefox',
    )
    const group = await getTabGroup(driver, groupId)
    expect(group.title).toBe('Edited in Firefox')
    expect(group.color).toBe('red')
    expect((await getGroupMembers(driver, groupId)).tabIds.sort()).toEqual(
      tabs.map((tab) => tab.id!).sort(),
    )
  })

  it('focuses toolbar actions and returns to the caller with Escape, including backing out of formats', async () => {
    const [tab] = await fixtureTabs(urls('toolbar-focus', 1))
    await focus(SEARCH_INPUT_SELECTOR)
    await shortcut('f', Key.CONTROL, Key.SHIFT)
    await expectFocus('[data-toolbar-base] button[aria-label="Settings"]')
    await keys(Key.ESCAPE)
    await expectFocus(SEARCH_INPUT_SELECTOR)
    await select(tab.id!)
    await focus(SEARCH_INPUT_SELECTOR)
    const search = await focusActions()
    await search.sendKeys('export')
    await driver.wait(
      async () =>
        (
          await driver
            .findElement(By.css('[data-selection-palette] [role="option"]'))
            .getText()
        ).startsWith('Export'),
      10000,
    )
    await keys(Key.ENTER)
    await driver.wait(
      async () =>
        (await driver
          .findElement(By.css(selectionSearch))
          .getAttribute('aria-label')) === 'Search selection formats',
      10000,
    )
    await keys(Key.ESCAPE)
    expect(
      await driver
        .findElement(By.css(selectionSearch))
        .getAttribute('aria-label'),
    ).toBe('Search selected-tab actions')
    await keys(Key.ESCAPE)
    await expectFocus(SEARCH_INPUT_SELECTOR)
    await expectChecked(tab.id!, true)
  })

  it('routes Ctrl+R and Ctrl+U from selection search to selected tabs without triggering browser commands', async () => {
    const pages = urls('modifier-actions')
    const tabs = await fixtureTabs(pages)
    await driver.wait(
      async () =>
        executeInExtension(
          driver,
          async (ids) =>
            (await Promise.all(ids.map((id) => browser.tabs.get(id)))).every(
              (tab) => tab.status === 'complete',
            ),
          tabs.map((tab) => tab.id!),
        ),
      10000,
    )
    const originalHandles = await driver.getAllWindowHandles()
    const before = hits.get(new URL(pages[0]).pathname) || 0
    const otherBefore = hits.get(new URL(pages[1]).pathname) || 0
    await driver.executeScript('window.__firefoxWorkflowDocument = "original"')
    await select(tabs[0].id!)
    const search = await focusActions()
    await search.sendKeys('copy as')
    await driver.wait(
      async () =>
        (
          await driver
            .findElement(By.css('[data-selection-palette] [role="option"]'))
            .getText()
        ).startsWith('Copy as'),
      10000,
    )
    await keys(Key.ENTER)
    await driver.wait(
      async () =>
        (await driver
          .findElement(By.css(selectionSearch))
          .getAttribute('aria-label')) === 'Search selection formats',
      10000,
    )
    await shortcut('r', Key.CONTROL)
    await driver.wait(
      () => (hits.get(new URL(pages[0]).pathname) || 0) > before,
      10000,
    )
    await expectChecked(tabs[0].id!, false)
    expect(hits.get(new URL(pages[1]).pathname)).toBe(otherBefore)
    expect(
      await driver.executeScript('return window.__firefoxWorkflowDocument'),
    ).toBe('original')
    expect(await driver.getCurrentUrl()).toBe(session.extensionURL)
    await select(tabs[0].id!)
    await focusActions()
    await shortcut('u', Key.CONTROL)
    await expectChecked(tabs[0].id!, false)
    await expectChecked(tabs[1].id!, true)
    await expectFocus(selectionSearch)
    expect(await driver.getCurrentUrl()).toBe(session.extensionURL)
    expect((await driver.getAllWindowHandles()).sort()).toEqual(
      originalHandles.sort(),
    )
  })

  it('dismisses a search result context menu with Escape, then clears the search on the next Escape', async () => {
    const pages = urls('escape-search', 1)
    await fixtureTabs(pages)
    const search = await focus(SEARCH_INPUT_SELECTOR)
    await search.sendKeys(new URL(pages[0]).pathname.slice(1))
    const result = await waitForCss(driver, '[role="listbox"] [role="option"]')
    await driver.actions().contextClick(result).perform()
    await waitForCss(driver, '[role="menu"]')
    await keys(Key.ESCAPE)
    await driver.wait(
      async () =>
        (await driver.findElements(By.css('[role="menu"]'))).length === 0,
      10000,
      'Context menu did not dismiss',
    )
    expect(await search.getAttribute('value')).not.toBe('')
    await keys(Key.ESCAPE)
    await driver.wait(
      async () => (await search.getAttribute('value')) === '',
      10000,
      'Second Escape did not clear search',
    )
    expect(await search.getAttribute('aria-expanded')).toBe('false')
  })
})
