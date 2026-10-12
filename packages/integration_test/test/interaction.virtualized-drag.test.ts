import { test, expect } from '@playwright/test'
import { initBrowserWithExtension } from '../util'

for (const kind of ['tab', 'group'] as const) {
  test(`keeps a native ${kind} drag alive across virtual scroll boundaries`, async () => {
    test.setTimeout(120000)
    const { browserContext, page } = await initBrowserWithExtension()
    try {
      const setup = await page.evaluate(async (kind) => {
        const currentWindow = await chrome.windows.getCurrent()
        const ids: number[] = []
        for (let index = 0; index < 80; index += 1) {
          const tab = await chrome.tabs.create({
            windowId: currentWindow.id,
            active: false,
            url: `data:text/html,<title>Virtual tab ${index}</title>`,
          })
          ids.push(tab.id!)
        }
        const groupId =
          kind === 'group'
            ? await chrome.tabs.group({ tabIds: ids.slice(0, 3) })
            : -1
        if (groupId !== -1) {
          await chrome.tabGroups.update(groupId, {
            title: 'Virtual source',
            collapsed: false,
          })
        }
        return { ids, groupId, windowId: currentWindow.id! }
      }, kind)
      await page.bringToFront()
      await page.reload()
      const source =
        kind === 'group'
          ? page.getByTestId(`tab-group-header-${setup.groupId}`)
          : page.getByTestId(`tab-row-${setup.ids[0]}`)
      await expect(source).toBeVisible()
      await source.hover()
      const handle =
        kind === 'group'
          ? page.getByTestId(`tab-group-drag-handle-${setup.groupId}`)
          : source.getByLabel('Drag tab', { exact: true })
      await expect(handle).toBeVisible()
      const dragSource = await handle.evaluateHandle((node) =>
        node.closest('[draggable="true"]'),
      )
      const box = await handle.boundingBox()
      expect(box).not.toBeNull()
      const sourceX = box!.x + box!.width / 2
      const sourceY = box!.y + box!.height / 2
      await page.mouse.move(sourceX, sourceY)
      await page.mouse.down()
      try {
        await page.mouse.move(sourceX + 100, sourceY + 30, { steps: 12 })
        await expect(page.getByTestId('drag-action-preview')).toBeVisible()
        const scrollContainer = page.getByTestId('window-list-scroll-container')
        await scrollContainer.evaluate((node) => {
          node.scrollTop = node.scrollHeight
        })
        await expect
          .poll(() => scrollContainer.evaluate((node) => node.scrollTop))
          .toBeGreaterThan(1000)
        const target = page.getByTestId(`tab-row-${setup.ids.at(-1)}`)
        await expect(target).toBeVisible()
        expect(await dragSource.evaluate((node) => node?.isConnected)).toBe(
          true,
        )
        expect(
          await page.locator('[data-testid^="tab-row-"]').count(),
        ).toBeLessThan(45)
        const targetBox = await target.boundingBox()
        expect(targetBox).not.toBeNull()
        await page.mouse.move(
          targetBox!.x + 16,
          targetBox!.y + targetBox!.height * 0.75,
          { steps: 16 },
        )
        // Chromium needs a subsequent move within the target to emit dragover.
        await page.mouse.move(
          targetBox!.x + 20,
          targetBox!.y + targetBox!.height * 0.75,
          { steps: 2 },
        )
        await expect(
          target.locator('xpath=..').locator('hr.border-t-2'),
        ).toBeAttached({ timeout: 5000 })
      } finally {
        await page.mouse.up()
      }
      const movedCount = kind === 'group' ? 3 : 1
      const expectedIds = [
        ...setup.ids.slice(movedCount),
        ...setup.ids.slice(0, movedCount),
      ]
      await expect
        .poll(() =>
          page.evaluate(async ({ ids, windowId }) => {
            const tabs = await chrome.tabs.query({ windowId })
            return tabs
              .filter((tab) => ids.includes(tab.id!))
              .sort((left, right) => left.index - right.index)
              .map((tab) => tab.id)
          }, setup),
        )
        .toEqual(expectedIds)
      if (kind === 'group') {
        const groupTabIds = await page.evaluate(async (groupId) => {
          const tabs = await chrome.tabs.query({ groupId })
          return tabs
            .sort((left, right) => left.index - right.index)
            .map((tab) => tab.id)
        }, setup.groupId)
        expect(groupTabIds).toEqual(setup.ids.slice(0, 3))
      }
    } finally {
      await browserContext.close()
    }
  })
}
