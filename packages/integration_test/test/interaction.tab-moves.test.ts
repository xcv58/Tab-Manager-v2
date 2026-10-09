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

  for (const before of [true, false]) {
    test(`preserves a whole group moved ${before ? 'before' : 'after'} a grouped tab in another window`, async () => {
      const [source, destination] = await createWindows([
        ['A', 'B', 'C', 'D'],
        ['TargetA', 'TargetB', 'Tail'],
      ])
      const [sourceWindowId, destinationWindowId] = createdWindowIds
      const groupId = await page.evaluate(
        async ({
          source,
          destination,
          sourceWindowId,
          destinationWindowId,
        }) => {
          const groupId = await chrome.tabs.group({
            tabIds: source.slice(1, 3),
            createProperties: { windowId: sourceWindowId },
          })
          await chrome.tabGroups.update(groupId, {
            title: 'Keep me',
            color: 'blue',
          })
          await chrome.tabs.group({
            tabIds: destination.slice(0, 2),
            createProperties: { windowId: destinationWindowId },
          })
          return groupId
        },
        { source, destination, sourceWindowId, destinationWindowId },
      )
      expect(await readWindowOrder(sourceWindowId)).toEqual(source)
      expect(await readWindowOrder(destinationWindowId)).toEqual(destination)
      await reloadPopup()
      await selectTabs(source.slice(1, 3))
      const target = page.getByTestId(`tab-row-${destination[before ? 1 : 0]}`)
      await target.hover()
      await target.getByRole('button', { name: 'Tab actions' }).click()
      await page
        .getByRole('menuitem', {
          name: `Move selected ${before ? 'before' : 'after'} this tab`,
        })
        .click()
      const expected = before
        ? [...source.slice(1, 3), ...destination]
        : [...destination.slice(0, 2), ...source.slice(1, 3), destination[2]]
      await expect
        .poll(() => readWindowOrder(destinationWindowId))
        .toEqual(expected)
      const group = await page.evaluate(
        async (id) => chrome.tabGroups.get(id),
        groupId,
      )
      expect(group).toMatchObject({
        title: 'Keep me',
        color: 'blue',
        windowId: destinationWindowId,
      })
      expect(
        await page.evaluate(
          async (id) =>
            (await chrome.tabs.query({ groupId: id }))
              .sort((a, b) => a.index - b.index)
              .map((tab) => tab.id),
          groupId,
        ),
      ).toEqual(source.slice(1, 3))
      for (const id of source.slice(1, 3)) {
        await expect(
          page
            .getByTestId(`tab-row-${id}`)
            .getByRole('checkbox', { name: 'Toggle select' }),
        ).not.toBeChecked()
      }
    })
  }

  test('preserves multiple whole groups moved after an ungrouped tab across windows', async () => {
    const [source, destination] = await createWindows([
      ['A', 'B', 'C', 'D'],
      ['Target', 'Tail'],
    ])
    const [sourceWindowId, destinationWindowId] = createdWindowIds
    const groupIds = await page.evaluate(
      async ({ ids, windowId }) => {
        const first = await chrome.tabs.group({
          tabIds: ids.slice(0, 2),
          createProperties: { windowId },
        })
        const second = await chrome.tabs.group({
          tabIds: ids.slice(2, 4),
          createProperties: { windowId },
        })
        await chrome.tabGroups.update(first, { title: 'First', color: 'blue' })
        await chrome.tabGroups.update(second, { title: 'Second', color: 'red' })
        return [first, second]
      },
      { ids: source, windowId: sourceWindowId },
    )
    expect(await readWindowOrder(sourceWindowId)).toEqual(source)
    expect(await readWindowOrder(destinationWindowId)).toEqual(destination)
    await reloadPopup()
    await selectTabs(source)
    const target = page.getByTestId(`tab-row-${destination[0]}`)
    await target.getByRole('button', { name: /^Target/ }).focus()
    await page.keyboard.press('Alt+Shift+ArrowRight')
    await expect
      .poll(() => readWindowOrder(destinationWindowId))
      .toEqual([destination[0], ...source, destination[1]])
    const groups = await page.evaluate(
      async (ids) =>
        Promise.all(
          ids.map(async (id) => ({
            group: await chrome.tabGroups.get(id),
            tabs: (await chrome.tabs.query({ groupId: id }))
              .sort((a, b) => a.index - b.index)
              .map((tab) => tab.id),
          })),
        ),
      groupIds,
    )
    expect(groups[0]).toMatchObject({
      group: { title: 'First', color: 'blue', windowId: destinationWindowId },
      tabs: source.slice(0, 2),
    })
    expect(groups[1]).toMatchObject({
      group: { title: 'Second', color: 'red', windowId: destinationWindowId },
      tabs: source.slice(2, 4),
    })
    await expect(
      page.getByTestId(`window-title-${createdWindowIds[0]}`),
    ).toHaveCount(0)
  })

  test('keeps an unselected leading tab before a mixed pin and group relative move', async () => {
    const [source, destination] = await createWindows([
      ['Pin', 'A', 'B', 'Remain'],
      ['Lead', 'TargetA', 'TargetB', 'Tail'],
    ])
    const [sourceWindowId, destinationWindowId] = createdWindowIds
    const groupId = await page.evaluate(
      async ({ source, destination, sourceWindowId, destinationWindowId }) => {
        await chrome.tabs.update(source[0], { pinned: true })
        const groupId = await chrome.tabs.group({
          tabIds: source.slice(1, 3),
          createProperties: { windowId: sourceWindowId },
        })
        await chrome.tabGroups.update(groupId, {
          title: 'Keep me',
          color: 'blue',
        })
        await chrome.tabs.group({
          tabIds: destination.slice(1, 3),
          createProperties: { windowId: destinationWindowId },
        })
        return groupId
      },
      { source, destination, sourceWindowId, destinationWindowId },
    )
    expect(await readWindowOrder(sourceWindowId)).toEqual(source)
    expect(await readWindowOrder(destinationWindowId)).toEqual(destination)
    await reloadPopup()
    await selectTabs(source.slice(0, 3))
    await page
      .getByTestId(`tab-row-${destination[2]}`)
      .getByRole('button', { name: /^TargetB/ })
      .focus()
    await page.keyboard.press('m')
    await page.keyboard.press('Shift+P')
    await expect
      .poll(() => readWindowOrder(destinationWindowId))
      .toEqual([
        source[0],
        destination[0],
        source[1],
        source[2],
        ...destination.slice(1),
      ])
    expect(
      await page.evaluate(async (id) => chrome.tabGroups.get(id), groupId),
    ).toMatchObject({
      title: 'Keep me',
      color: 'blue',
      windowId: destinationWindowId,
    })
    expect(
      await page.evaluate(
        async (id) => (await chrome.tabs.get(id)).pinned,
        source[0],
      ),
    ).toBe(true)
  })
})
