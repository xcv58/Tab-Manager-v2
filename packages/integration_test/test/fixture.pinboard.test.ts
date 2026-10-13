import { test, expect } from '@playwright/test'
import { initBrowserWithExtension } from '../util'

test('Pinboard fixture retains browser tab metadata without network access', async () => {
  const { browserContext, page } = await initBrowserWithExtension({
    headless: true,
  })
  try {
    await browserContext.setOffline(true)
    const fixture = await browserContext.newPage()
    await fixture.goto('https://pinboard.in/')
    await expect(fixture).toHaveTitle(
      'Welcome to Pinboard—Social bookmarking for introverts!',
    )
    const readTab = () =>
      page.evaluate(async () => {
        const tabs = await chrome.tabs.query({})
        return tabs.find((tab) => tab.url === 'https://pinboard.in/')
      })
    await expect.poll(readTab).toMatchObject({
      url: 'https://pinboard.in/',
      title: 'Welcome to Pinboard—Social bookmarking for introverts!',
      favIconUrl: expect.stringMatching(/^data:image\/x-icon;base64,/),
    })
    const image = await fixture.evaluate(async () => {
      const icon = new Image()
      icon.src =
        document.querySelector<HTMLLinkElement>('link[rel="icon"]').href
      await icon.decode()
      return { width: icon.naturalWidth, height: icon.naturalHeight }
    })
    expect(image).toEqual({ width: 32, height: 32 })
  } finally {
    await browserContext.close()
  }
})
