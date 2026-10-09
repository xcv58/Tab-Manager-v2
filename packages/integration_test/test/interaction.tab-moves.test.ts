import { test, expect } from '@playwright/test'
import type { Page, ChromiumBrowserContext } from 'playwright'
import {
  initBrowserWithExtension,
  startIntegrationFixtureServer,
  createWindowsWithTabs,
  type IntegrationFixtureServer,
} from '../util'

let page: Page
let browserContext: ChromiumBrowserContext
let fixtureServer: IntegrationFixtureServer
let createdWindowIds: number[] = []

const createWindows = async (titles: string[][]) => {
  createdWindowIds = await createWindowsWithTabs(
    page,
    titles.map((windowTitles, windowIndex) =>
      windowTitles.map(
        (title) =>
          `${fixtureServer.baseUrl}/${windowIndex}/${title}?title=${title}`,
      ),
    ),
  )
  await expect
    .poll(() =>
      page.evaluate(async (windowIds) => {
        const tabs = await chrome.tabs.query({})
        return tabs
          .filter((tab) => windowIds.includes(tab.windowId))
          .every((tab) => tab.status === 'complete')
      }, createdWindowIds),
    )
    .toBe(true)
  return page.evaluate(
    async (windowIds) =>
      Promise.all(
        windowIds.map(async (windowId) =>
          (await chrome.tabs.query({ windowId }))
            .sort((a, b) => a.index - b.index)
            .map((tab) => tab.id),
        ),
      ),
    createdWindowIds,
  )
}

const reloadPopup = async () => {
  await page.bringToFront()
  await page.reload()
  for (const windowId of createdWindowIds) {
    await expect(page.getByTestId(`window-title-${windowId}`)).toBeVisible()
  }
}

const selectTabs = async (tabIds: number[]) => {
  for (const tabId of tabIds) {
    const row = page.getByTestId(`tab-row-${tabId}`)
    const checkbox = row.getByRole('checkbox', { name: 'Toggle select' })
    // Native focus reveals the checkbox above the tab's favicon.
    await checkbox.focus()
    await checkbox.check()
  }
}

const readWindowOrder = (windowId: number) =>
  page.evaluate(
    async (id) =>
      (await chrome.tabs.query({ windowId: id }))
        .sort((a, b) => a.index - b.index)
        .map((tab) => tab.id),
    windowId,
  )

test.describe('Selected tab move regressions', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeAll(async () => {
    fixtureServer = await startIntegrationFixtureServer()
    const init = await initBrowserWithExtension()
    browserContext = init.browserContext
    page = init.page
  })
  test.afterEach(async () => {
    await page.evaluate(async (windowIds) => {
      for (const id of windowIds) {
        try {
          await chrome.windows.remove(id)
        } catch {
          // A source window closes automatically when its last tab moves.
        }
      }
    }, createdWindowIds)
    createdWindowIds = []
  })
  test.afterAll(async () => {
    await browserContext?.close()
    await fixtureServer?.close()
  })

  for (const method of ['menu', 'combination', 'vim'] as const) {
    for (const before of [true, false]) {
      test(`keeps nonadjacent tabs together ${before ? 'before' : 'after'} a later tab using ${method}`, async () => {
        const [ids] = await createWindows([['A', 'B', 'C', 'D', 'E', 'F']])
        const windowId = createdWindowIds[0]
        await reloadPopup()
        await selectTabs([ids[1], ids[3]])
        const destination = page.getByTestId(`tab-row-${ids[5]}`)
        if (method === 'menu') {
          await destination.hover()
          await destination.getByRole('button', { name: 'Tab actions' }).click()
          await page
            .getByRole('menuitem', {
              name: `Move selected ${before ? 'before' : 'after'} this tab`,
            })
            .click()
        } else {
          await destination.getByRole('button', { name: /^F/ }).focus()
          if (method === 'combination') {
            await page.keyboard.press(
              `Alt+Shift+Arrow${before ? 'Left' : 'Right'}`,
            )
          } else {
            await page.keyboard.press('m')
            await page.keyboard.press(before ? 'Shift+P' : 'p')
          }
        }
        const expected = before
          ? [ids[0], ids[2], ids[4], ids[1], ids[3], ids[5]]
          : [ids[0], ids[2], ids[4], ids[5], ids[1], ids[3]]
        await expect.poll(() => readWindowOrder(windowId)).toEqual(expected)
      })
    }
  }

  test('uses the expanded window as the shortcut destination', async () => {
    const [source, destination] = await createWindows([
      ['A', 'B', 'C', 'D'],
      ['Target'],
    ])
    const [sourceWindowId, destinationWindowId] = createdWindowIds
    await reloadPopup()
    const header = page.getByTestId(`window-title-${destinationWindowId}`)
    await header.getByRole('button', { name: 'Collapse window' }).click()
    await selectTabs([source[1], source[3]])
    await header.getByRole('button', { name: 'Expand window' }).click()
    await expect(
      header.getByRole('button', { name: 'Collapse window' }),
    ).toBeFocused()
    await page.keyboard.press('Alt+Shift+ArrowDown')
    await expect
      .poll(() => readWindowOrder(destinationWindowId))
      .toEqual([...destination, source[1], source[3]])
    expect(await readWindowOrder(sourceWindowId)).toEqual([
      source[0],
      source[2],
    ])
  })
})
