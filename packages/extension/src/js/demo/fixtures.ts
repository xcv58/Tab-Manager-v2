export type DemoScenarioId = 'workspace' | 'duplicates' | 'large' | 'empty'

export const demoScenarios: Array<{
  id: DemoScenarioId
  label: string
  description: string
}> = [
  {
    id: 'workspace',
    label: 'Everyday workspace',
    description:
      'Three windows with groups, pinned tabs, and a few duplicates.',
  },
  {
    id: 'duplicates',
    label: 'Duplicate cleanup',
    description: 'Repeated URLs and hash variants to try the cleanup settings.',
  },
  {
    id: 'large',
    label: '120 tabs',
    description:
      'Six windows for search, bulk actions, and layout exploration.',
  },
  {
    id: 'empty',
    label: 'Empty workspace',
    description: 'Start fresh and add sample tabs.',
  },
]

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

export const createDemoFixture = (scenario: DemoScenarioId) => {
  const windows: DemoWindow[] = []
  const groups: DemoGroup[] = []
  let nextTabId = 1
  let nextGroupId = 101
  const windowCount = scenario === 'empty' ? 0 : scenario === 'large' ? 6 : 3
  const tabCount =
    scenario === 'large' ? 20 : scenario === 'duplicates' ? 8 : 10
  for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
    const windowId = windowIndex + 1
    const tabs = Array.from({ length: tabCount }, (_, index) => {
      const pageIndex =
        scenario === 'duplicates' ? index % 5 : windowIndex * tabCount + index
      const tab = createSampleTab(nextTabId++, windowId, index, pageIndex)
      tab.pinned = index === 0
      if (scenario === 'large') {
        // Distinct work items retain real public hostnames and useful search
        // terms, without loading their URLs.
        tab.title = `${tab.title} · workspace ${windowId}, item ${index + 1}`
        tab.url += `${tab.url.includes('?') ? '&' : '?'}demo-item=${tab.id}`
      }
      if (scenario === 'duplicates' && index >= 5) {
        tab.url += index === 7 ? '#overview' : ''
      }
      return tab
    })
    const win = createDemoWindow(windowId, tabs)
    win.focused = windowIndex === 0
    windows.push(win)
    const groupNames =
      windowIndex === 0
        ? ['AI tools', 'Development']
        : windowIndex === 1
          ? ['Reading', 'Research']
          : ['Projects', 'Later']
    const colors = ['blue', 'purple', 'green', 'orange', 'cyan', 'pink']
    for (let groupIndex = 0; groupIndex < 2; groupIndex += 1) {
      const start = groupIndex === 0 ? 2 : 6
      const end =
        scenario === 'large' ? start + 4 : Math.min(start + 3, tabs.length)
      if (end <= start) continue
      const group: DemoGroup = {
        id: nextGroupId++,
        windowId,
        title: groupNames[groupIndex],
        color: colors[(windowIndex + groupIndex) % colors.length],
        collapsed: false,
      }
      groups.push(group)
      tabs.slice(start, end).forEach((tab) => {
        tab.groupId = group.id
      })
    }
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
    nextWindowId: windowCount + 1,
  }
}
