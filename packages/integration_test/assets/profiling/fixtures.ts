import {
  createDemoFixture as originalFixture,
  createDemoWindow,
  createSampleTab,
  type DemoScenarioId,
} from '../../../extension/src/js/demo/fixtures'

export * from '../../../extension/src/js/demo/fixtures'

let fixtureIdentity = ''
export const getProfileFixtureIdentity = () => fixtureIdentity

export const createDemoFixture = (scenario: DemoScenarioId) => {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const count = Number(params.get('tabs'))
  if (!Number.isInteger(count) || count < 1 || count > 5000) {
    return originalFixture(scenario)
  }
  const grouped = params.get('grouped') === '1'
  const history = originalFixture('workspace').history
  if (params.get('zeroHistory') === '1') {
    history.push({
      id: 'profile-zero-history',
      title: 'Zero visit history',
      url: 'https://tab.jenny.media/?profile-history=zero',
      lastVisitTime: Date.now() - 3600000,
      visitCount: 0,
      typedCount: 0,
    })
  }
  let nextTabId = 1
  const windows = [count, 12].map((tabCount, windowIndex) => {
    const windowId = windowIndex + 1
    const tabs = Array.from({ length: tabCount }, (_, index) => {
      const tab = createSampleTab(nextTabId++, windowId, index)
      tab.title = `${index % 20 === 0 ? 'Needle target' : 'Work item'} ${index + 1} · ${tab.title}`
      tab.url = `https://tab.jenny.media/?profile-window=${windowId}&item=${index + 1}`
      tab.groupId = grouped && windowIndex === 0 ? 101 : -1
      return tab
    })
    const win = createDemoWindow(windowId, tabs)
    win.focused = windowIndex === 0
    return win
  })
  const fixture = {
    windows,
    groups: grouped
      ? [
          {
            id: 101,
            windowId: 1,
            title: 'Profile group',
            color: 'blue',
            collapsed: false,
          },
        ]
      : [],
    history,
    nextTabId,
    nextWindowId: 3,
    nextGroupId: 102,
  }
  // Exclude clock-relative timestamps, but include all matching/rendering input.
  // The runner rejects comparisons when concrete fixture metadata differs.
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical)
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !['lastAccessed', 'lastVisitTime'].includes(key))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, canonical(item)]),
      )
    return value
  }
  fixtureIdentity = JSON.stringify(canonical(fixture))
  return fixture
}
