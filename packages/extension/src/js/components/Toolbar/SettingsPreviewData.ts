import type { PreviewConfig } from './TabRowPreview'

// Local-only examples; previews never fetch favicons or operate on browser tabs.
export const previewIcon = (letter: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="7" fill="${color}"/><text x="16" y="22" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="white">${letter}</text></svg>`,
  )}`

export type PreviewWindow = {
  id: number
  recent: number
  tabs: Pick<PreviewConfig, 'id' | 'title' | 'url' | 'iconUrl'>[]
  app?: boolean
}

const pages = [
  ['React documentation', 'https://react.dev/learn', 'R', '#0891b2'],
  [
    'TypeScript handbook',
    'https://www.typescriptlang.org/docs/',
    'T',
    '#2563eb',
  ],
  ['MDN Web Docs', 'https://developer.mozilla.org/', 'M', '#475569'],
  ['CSS layout guide', 'https://web.dev/learn/css/', 'C', '#0891b2'],
  ['Figma design review', 'https://www.figma.com/', 'F', '#9333ea'],
  [
    'Color palette ideas',
    'https://developer.mozilla.org/en-US/docs/Web/CSS/color',
    'C',
    '#7c3aed',
  ],
  [
    'Interface notes',
    'https://github.com/xcv58/Tab-Manager-v2/issues',
    'G',
    '#475569',
  ],
  [
    'Tab Manager pull requests',
    'https://github.com/xcv58/Tab-Manager-v2/pulls',
    'G',
    '#475569',
  ],
  [
    'Playwright documentation',
    'https://playwright.dev/docs/intro',
    'P',
    '#16a34a',
  ],
  [
    'Chrome extension guide',
    'https://developer.chrome.com/docs/extensions',
    'C',
    '#2563eb',
  ],
  ['Project documentation', 'https://tab.jenny.media/', 'T', '#4f46e5'],
  ['Hacker News', 'https://news.ycombinator.com/', 'H', '#ea580c'],
  ['Wikipedia', 'https://en.wikipedia.org/', 'W', '#64748b'],
  ['Internet Archive', 'https://archive.org/', 'A', '#475569'],
  ['Web platform news', 'https://web.dev/blog/', 'W', '#0891b2'],
  ['OpenStreetMap', 'https://www.openstreetmap.org/', 'O', '#15803d'],
  ['Notion project plan', 'https://www.notion.so/', 'N', '#475569'],
  ['Linear roadmap', 'https://linear.app/', 'L', '#6366f1'],
  ['Team reference links', 'https://jenny.media/', 'J', '#6366f1'],
  [
    'JavaScript reference',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    'J',
    '#ca8a04',
  ],
  [
    'CSS reference',
    'https://developer.mozilla.org/en-US/docs/Web/CSS',
    'C',
    '#2563eb',
  ],
  [
    'HTML reference',
    'https://developer.mozilla.org/en-US/docs/Web/HTML',
    'H',
    '#ea580c',
  ],
  [
    'Accessibility guide',
    'https://developer.mozilla.org/en-US/docs/Web/Accessibility',
    'A',
    '#059669',
  ],
] as const

const makeTabs = (start: number, count: number) =>
  pages
    .slice(start, start + count)
    .map(([title, url, letter, color], index) => ({
      id: 9300 + start + index,
      title,
      url,
      iconUrl: previewIcon(letter, color),
    }))

export const previewWindows: PreviewWindow[] = [
  { id: 930, recent: 2, tabs: makeTabs(0, 4) },
  { id: 931, recent: 6, tabs: makeTabs(4, 3) },
  { id: 932, recent: 4, tabs: makeTabs(7, 4) },
  { id: 933, recent: 1, tabs: makeTabs(11, 5) },
  { id: 934, recent: 5, tabs: makeTabs(16, 3) },
  { id: 935, recent: 3, tabs: makeTabs(19, 4) },
]

export const previewAppWindow: PreviewWindow = {
  id: 936,
  recent: 7,
  app: true,
  tabs: [
    {
      id: 9330,
      title: 'YouTube Music · App window',
      url: 'https://music.youtube.com/',
      iconUrl: previewIcon('M', '#dc2626'),
    },
    {
      id: 9331,
      title: 'Music library',
      url: 'https://music.youtube.com/library',
      iconUrl: previewIcon('M', '#dc2626'),
    },
  ],
}
