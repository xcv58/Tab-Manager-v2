import type { DemoScenarioId } from './scenarios'

export { demoScenarios } from './scenarios'
export type { DemoScenarioId } from './scenarios'

export type DemoTab = {
  id: number
  windowId: number
  index: number
  title: string
  url: string
  favIconUrl: string
  active: boolean
  highlighted: boolean
  pinned: boolean
  groupId: number
  audible: boolean
  discarded: boolean
  incognito: boolean
  status: 'loading' | 'complete'
  mutedInfo: { muted: boolean }
  cookieStoreId?: string
}

export type DemoWindow = {
  id: number
  tabs: DemoTab[]
  focused: boolean
  alwaysOnTop: boolean
  incognito: boolean
  type: 'normal' | 'popup'
  state: 'normal' | 'minimized' | 'maximized' | 'fullscreen'
  width: number
  height: number
  left: number
  top: number
}

export type DemoGroup = {
  id: number
  windowId: number
  title: string
  color: string
  collapsed: boolean
}

export type DemoHistoryItem = {
  id: string
  title: string
  url: string
  lastVisitTime: number
  visitCount: number
  typedCount: number
}

const samplePages = [
  ['Jenny', 'https://jenny.media/', 'J', '#6366f1'],
  ['Tab Manager v2', 'https://tab.jenny.media/', 'T', '#4f46e5'],
  ['ChatGPT', 'https://chatgpt.com/', 'C', '#059669'],
  ['Claude', 'https://claude.ai/login', 'C', '#c2410c'],
  ['Gemini', 'https://gemini.google.com/', 'G', '#2563eb'],
  ['Jenny TV - YouTube', 'https://www.youtube.com/@JennyTV1', 'Y', '#dc2626'],
  ['React documentation', 'https://react.dev/learn', 'R', '#0891b2'],
  [
    'TypeScript handbook',
    'https://www.typescriptlang.org/docs/handbook/',
    'T',
    '#2563eb',
  ],
  [
    'MDN Web Docs',
    'https://developer.mozilla.org/en-US/docs/Web',
    'M',
    '#334155',
  ],
  ['Tailwind CSS', 'https://tailwindcss.com/docs', 'T', '#0891b2'],
  [
    'GitHub - Tab Manager v2',
    'https://github.com/xcv58/Tab-Manager-v2',
    'G',
    '#475569',
  ],
  [
    'Playwright documentation',
    'https://playwright.dev/docs/intro',
    'P',
    '#16a34a',
  ],
  ['Hacker News', 'https://news.ycombinator.com/', 'H', '#ea580c'],
  ['BBC News', 'https://www.bbc.com/news', 'B', '#b91c1c'],
  ['The Guardian', 'https://www.theguardian.com/international', 'G', '#1d4ed8'],
  ['Wikipedia', 'https://en.wikipedia.org/wiki/Main_Page', 'W', '#64748b'],
  ['Internet Archive', 'https://archive.org/', 'A', '#475569'],
  ['OpenStreetMap', 'https://www.openstreetmap.org/', 'O', '#15803d'],
  ['Figma', 'https://www.figma.com/', 'F', '#9333ea'],
  ['Unsplash', 'https://unsplash.com/', 'U', '#334155'],
  ['Notion', 'https://www.notion.so/', 'N', '#475569'],
  ['Linear', 'https://linear.app/', 'L', '#6366f1'],
  ['Lobsters', 'https://lobste.rs/', 'L', '#dc2626'],
  ['web.dev', 'https://web.dev/learn/', 'W', '#2563eb'],
] as const

// All favicons are local SVG data, so exploring the demo makes no requests to
// sample sites and still works without an internet connection.
export const createDemoIcon = (letter: string, color = '#6366f1') =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${color}"/><text x="16" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="white">${letter}</text></svg>`,
  )}`

export const createSampleTab = (
  id: number,
  windowId: number,
  index: number,
  pageIndex = index,
): DemoTab => {
  const [title, url, letter, color] =
    samplePages[pageIndex % samplePages.length]
  return {
    id,
    windowId,
    index,
    title,
    url,
    favIconUrl: createDemoIcon(letter, color),
    active: index === 0,
    highlighted: index === 0,
    pinned: false,
    groupId: -1,
    audible: false,
    discarded: false,
    incognito: false,
    status: 'complete',
    mutedInfo: { muted: false },
  }
}

export const createDemoWindow = (
  id: number,
  tabs: DemoTab[] = [],
): DemoWindow => ({
  id,
  tabs,
  focused: false,
  alwaysOnTop: false,
  incognito: false,
  type: 'normal',
  state: 'normal',
  width: 1280,
  height: 800,
  left: 0,
  top: 0,
})

type FixtureGroupSpec = {
  start: number
  length: number
  title?: string
  collapsed?: boolean
}

const groupNames = [
  'AI tools',
  'Development',
  'Reading',
  'Research',
  'Design review',
  'Later',
  'Planning',
  'Reference',
  'Writing',
  'Media',
  'Inbox',
  'Project notes',
]
const groupColors = [
  'blue',
  'purple',
  'green',
  'orange',
  'cyan',
  'pink',
  'red',
  'yellow',
  'grey',
]

const getWindowTabCounts = (scenario: DemoScenarioId): number[] => {
  switch (scenario) {
    case 'empty':
      return []
    case 'one-tab':
      return [1]
    case 'duplicates':
      return [8, 8, 8]
    case 'large':
    case 'ungrouped':
      return Array(6).fill(20)
    case 'many-windows':
      return Array.from(
        { length: 20 },
        (_, index) => [1, 3, 5, 8, 14][index % 5],
      )
    case 'uneven-windows':
      return [100, 2, 3, 3, 4, 4, 5, 7]
    case 'dense-groups':
      return Array(4).fill(24)
    case 'sparse-groups':
      return Array(8).fill(14)
    case 'single-window':
      return [240]
    case 'mixed-states':
      return [14, 14, 14]
    case 'stress':
      return Array(50).fill(30)
    default:
      return [10, 10, 10]
  }
}

const getPinnedCount = (
  scenario: DemoScenarioId,
  tabCount: number,
  windowIndex: number,
) => {
  if (scenario === 'one-tab') return 0
  if (scenario === 'many-windows')
    return tabCount < 5 ? 0 : tabCount >= 14 ? 2 : 1
  if (scenario === 'uneven-windows')
    return windowIndex === 0 ? 3 : tabCount > 3 ? 1 : 0
  if (scenario === 'single-window') return 3
  if (
    scenario === 'dense-groups' ||
    scenario === 'mixed-states' ||
    scenario === 'stress'
  )
    return 2
  if (scenario === 'ungrouped') return windowIndex % 2 === 0 ? 3 : 1
  return 1
}

const getGroupSpecs = (
  scenario: DemoScenarioId,
  windowIndex: number,
  tabCount: number,
): FixtureGroupSpec[] => {
  switch (scenario) {
    case 'empty':
    case 'one-tab':
    case 'ungrouped':
      return []
    case 'many-windows':
      return tabCount < 8
        ? []
        : [
            { start: 2, length: 3 },
            {
              start: 6,
              length: tabCount === 8 ? 2 : 4,
              collapsed: windowIndex % 3 === 0,
            },
          ]
    case 'uneven-windows':
      if (windowIndex === 0)
        return Array.from({ length: 5 }, (_, index) => ({
          start: 4 + index * 18,
          length: 14,
          title: `${groupNames[index]} in the large window`,
          collapsed: index === 3,
        }))
      return tabCount >= 5 ? [{ start: 1, length: 3 }] : []
    case 'dense-groups':
      return [
        { start: 2, length: 1, title: windowIndex % 2 === 0 ? '' : 'One task' },
        { start: 3, length: 2, title: 'Quick review', collapsed: true },
        { start: 5, length: 3, title: 'Research' },
        { start: 8, length: 4, title: windowIndex === 1 ? '' : 'Project work' },
        {
          start: 12,
          length: 6,
          title: 'Design review',
          collapsed: windowIndex % 2 === 0,
        },
        { start: 18, length: 6, title: 'Reference and reading' },
      ]
    case 'sparse-groups':
      return windowIndex === 1 || windowIndex === 6
        ? [{ start: 4, length: 3, title: 'Occasional research' }]
        : []
    case 'single-window':
      return Array.from({ length: 12 }, (_, index) => ({
        start: 3 + index * 19,
        length: 18,
        title: `${groupNames[index]} ${index + 1}`,
        collapsed: index % 4 === 3,
      }))
    case 'mixed-states':
      return [
        { start: 3, length: 4, title: 'Apps and media' },
        { start: 8, length: 4, title: 'Documentation and reading' },
      ]
    case 'stress':
      return [
        { start: 2, length: 6, title: `Project ${windowIndex + 1}` },
        { start: 10, length: 6, title: `Research ${windowIndex + 1}` },
        {
          start: 20,
          length: 8,
          title: `Review ${windowIndex + 1}`,
          collapsed: windowIndex % 5 === 0,
        },
      ]
    default:
      return [
        { start: 2, length: scenario === 'large' ? 4 : 3 },
        {
          start: 6,
          length: scenario === 'large' ? 4 : Math.min(3, tabCount - 6),
        },
      ]
  }
}

const applyMixedTabStates = (
  tab: DemoTab,
  index: number,
  windowIndex: number,
) => {
  switch (index) {
    case 2:
      tab.title = `Active workspace • 工作区 • ワークスペース ${windowIndex + 1}`
      break
    case 3:
      tab.status = 'loading'
      tab.title = `Loading sample • ${tab.title}`
      break
    case 4:
      tab.audible = true
      tab.title = `Audio playing sample • ${tab.title}`
      break
    case 5:
      tab.mutedInfo.muted = true
      tab.title = `Muted audio sample • ${tab.title}`
      break
    case 6:
      tab.discarded = true
      tab.title = `Sleeping sample • ${tab.title}`
      break
    case 7:
      // Empty favicon data exercises the extension's bundled fallback icon.
      tab.favIconUrl = ''
      tab.title = `Fallback icon • ${tab.title}`
      break
    case 8:
      tab.title =
        'Research notebook • 工作笔记 • 調査メモ • خطة البحث — comparing documentation, project discussions, reference material, and saved reading across a long browser session'
      break
    case 9:
      tab.title = `Résumé and accessibility notes • ${tab.title}`
      break
    case 10:
      tab.title = `设计评审与产品笔记 • ${tab.title}`
      break
    case 11:
      tab.title = `Project notes with a long URL • ${tab.title}`
      tab.url +=
        '&topic=layout-and-keyboard-navigation&source=sample-workspace&view=detailed-reference'
      break
    default:
      break
  }
}

export const createDemoFixture = (scenario: DemoScenarioId) => {
  const windows: DemoWindow[] = []
  const groups: DemoGroup[] = []
  let nextTabId = 1
  let nextGroupId = 101
  const windowTabCounts = getWindowTabCounts(scenario)
  const useDistinctWorkItems =
    scenario !== 'workspace' &&
    scenario !== 'duplicates' &&
    scenario !== 'one-tab'
  let pageOffset = 0
  for (
    let windowIndex = 0;
    windowIndex < windowTabCounts.length;
    windowIndex += 1
  ) {
    const tabCount = windowTabCounts[windowIndex]
    const windowId = windowIndex + 1
    const pinnedCount = getPinnedCount(scenario, tabCount, windowIndex)
    const activeIndex = scenario === 'mixed-states' ? 2 : 0
    const tabs = Array.from({ length: tabCount }, (_, index) => {
      const pageIndex =
        scenario === 'duplicates' ? index % 5 : pageOffset + index
      const tab = createSampleTab(nextTabId++, windowId, index, pageIndex)
      tab.pinned = index < pinnedCount
      tab.active = index === activeIndex
      tab.highlighted = tab.active
      if (useDistinctWorkItems) {
        // Distinct work items retain real public hostnames and useful search
        // terms, without loading their URLs.
        tab.title = `${tab.title} · workspace ${windowId}, item ${index + 1}`
        tab.url += `${tab.url.includes('?') ? '&' : '?'}demo-item=${tab.id}`
      }
      if (scenario === 'duplicates' && index >= 5) {
        tab.url += index === 7 ? '#overview' : ''
      }
      if (scenario === 'mixed-states')
        applyMixedTabStates(tab, index, windowIndex)
      return tab
    })
    const win = createDemoWindow(windowId, tabs)
    win.focused = windowIndex === 0
    win.width = [1280, 960, 1440, 1920][windowIndex % 4]
    win.height = [800, 720, 900][windowIndex % 3]
    win.left = (windowIndex % 4) * 24
    win.top = (windowIndex % 3) * 18
    windows.push(win)
    const specs = getGroupSpecs(scenario, windowIndex, tabCount)
    specs.forEach((spec, groupIndex) => {
      const group: DemoGroup = {
        id: nextGroupId++,
        windowId,
        title:
          spec.title ??
          groupNames[(windowIndex * 2 + groupIndex) % groupNames.length],
        color: groupColors[(windowIndex + groupIndex) % groupColors.length],
        collapsed: spec.collapsed ?? false,
      }
      groups.push(group)
      tabs.slice(spec.start, spec.start + spec.length).forEach((tab) => {
        tab.groupId = group.id
      })
    })
    pageOffset += tabCount
  }
  const now = Date.now()
  const history: DemoHistoryItem[] = [
    {
      id: 'history-1',
      title: 'React - Thinking in React',
      url: 'https://react.dev/learn/thinking-in-react',
      lastVisitTime: now - 3600000,
      visitCount: 6,
      typedCount: 2,
    },
    {
      id: 'history-2',
      title: 'MDN - CSS Grid layout',
      url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout',
      lastVisitTime: now - 7200000,
      visitCount: 4,
      typedCount: 1,
    },
    {
      id: 'history-3',
      title: 'GitHub - Tab Manager v2 issues',
      url: 'https://github.com/xcv58/Tab-Manager-v2/issues',
      lastVisitTime: now - 10800000,
      visitCount: 8,
      typedCount: 3,
    },
    {
      id: 'history-4',
      title: 'BBC - Technology news',
      url: 'https://www.bbc.com/news/technology',
      lastVisitTime: now - 86400000,
      visitCount: 3,
      typedCount: 1,
    },
  ]
  return {
    windows,
    groups,
    history,
    nextTabId,
    nextGroupId,
    nextWindowId: windowTabCounts.length + 1,
  }
}
