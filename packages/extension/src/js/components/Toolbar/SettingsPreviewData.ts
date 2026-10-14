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
  ['Project notes', 'https://notes.example.test/project', 'N', '#0891b2'],
  ['Team roadmap', 'https://plans.example.test/roadmap', 'P', '#2563eb'],
  ['Reference library', 'https://library.example.test/', 'L', '#475569'],
  ['Layout guide', 'https://guides.example.test/layout', 'G', '#0891b2'],
  ['Design review', 'https://design.example.test/review', 'D', '#9333ea'],
  ['Color palette ideas', 'https://design.example.test/colors', 'C', '#7c3aed'],
  ['Interface notes', 'https://notes.example.test/interface', 'N', '#475569'],
  ['Project updates', 'https://updates.example.test/project', 'U', '#475569'],
  ['Testing guide', 'https://guides.example.test/testing', 'G', '#16a34a'],
  [
    'Getting started',
    'https://guides.example.test/getting-started',
    'G',
    '#2563eb',
  ],
  ['Workspace handbook', 'https://handbook.example.test/', 'H', '#4f46e5'],
  ['Daily reading', 'https://reading.example.test/daily', 'R', '#ea580c'],
  ['Knowledge base', 'https://library.example.test/topics', 'L', '#64748b'],
  ['Research archive', 'https://archive.example.test/research', 'A', '#475569'],
  ['Platform news', 'https://news.example.test/platform', 'N', '#0891b2'],
  ['Trip planner', 'https://maps.example.test/trip', 'M', '#15803d'],
  ['Project plan', 'https://plans.example.test/project', 'P', '#475569'],
  ['Release checklist', 'https://plans.example.test/release', 'P', '#6366f1'],
  ['Team reference links', 'https://library.example.test/team', 'L', '#6366f1'],
  [
    'Scripting reference',
    'https://guides.example.test/scripting',
    'G',
    '#ca8a04',
  ],
  ['Style reference', 'https://guides.example.test/styles', 'G', '#2563eb'],
  [
    'Document templates',
    'https://notes.example.test/templates',
    'N',
    '#ea580c',
  ],
  [
    'Accessibility guide',
    'https://guides.example.test/accessibility',
    'G',
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
      title: 'Music player · App window',
      url: 'https://music.example.test/',
      iconUrl: previewIcon('M', '#dc2626'),
    },
    {
      id: 9331,
      title: 'Music library',
      url: 'https://music.example.test/library',
      iconUrl: previewIcon('M', '#dc2626'),
    },
  ],
}
