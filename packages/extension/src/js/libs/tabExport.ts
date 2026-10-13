export type TabCopyFormat =
  | 'url'
  | 'title'
  | 'title-url'
  | 'csv'
  | 'tsv'
  | 'json'
  | 'markdown'
export type TabFileFormat = 'csv' | 'json'

type ExportTab = {
  id: number
  title: string
  url: string
  windowId: number
  index: number
  groupId?: number
  pinned?: boolean
}

export type ExportWindow = { id: number; title: string }
export type ExportGroup = {
  id: number
  title?: string
  color: string
  collapsed: boolean
}

export type TabExportRecord = {
  title: string
  url: string
  window_id: number
  window_context: string
  tab_index: number
  group_id: number | null
  group_name: string
  group_color: string
  group_collapsed: boolean | null
  pinned: boolean
}

export const createTabExportRecords = (
  tabs: ExportTab[],
  windows: ExportWindow[],
  groups: Map<number, ExportGroup>,
): TabExportRecord[] => {
  const windowOrder = new Map(windows.map((win, index) => [win.id, index]))
  const windowTitles = new Map(windows.map((win) => [win.id, win.title]))
  return tabs
    .slice()
    .sort(
      (a, b) =>
        (windowOrder.get(a.windowId) ?? Number.MAX_SAFE_INTEGER) -
          (windowOrder.get(b.windowId) ?? Number.MAX_SAFE_INTEGER) ||
        a.windowId - b.windowId ||
        a.index - b.index,
    )
    .map((tab) => {
      const group = groups.get(tab.groupId)
      return {
        title: tab.title || '',
        url: tab.url || '',
        window_id: tab.windowId,
        window_context: windowTitles.get(tab.windowId) || 'Window',
        tab_index: tab.index,
        group_id: group?.id ?? null,
        group_name: group?.title || '',
        group_color: group?.color || '',
        group_collapsed: group?.collapsed ?? null,
        pinned: Boolean(tab.pinned),
      }
    })
}

const columns: Array<keyof TabExportRecord> = [
  'title',
  'url',
  'window_id',
  'window_context',
  'tab_index',
  'group_id',
  'group_name',
  'group_color',
  'group_collapsed',
  'pinned',
]

const delimitedCell = (value: unknown, delimiter: ',' | '\t') => {
  let text = value == null ? '' : String(value)
  // Spreadsheet text must stay literal even when a page's title starts with
  // a formula marker. JSON retains the original strings without this prefix.
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return text.includes(delimiter) || /["\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text
}

export const formatTabExport = (
  records: TabExportRecord[],
  format: TabCopyFormat,
): string => {
  if (format === 'url') return records.map((tab) => tab.url).join('\n')
  if (format === 'title') return records.map((tab) => tab.title).join('\n')
  if (format === 'title-url')
    return records.map((tab) => `${tab.title}\n${tab.url}`).join('\n\n')
  if (format === 'markdown') {
    return records
      .map((tab) => {
        const title = (tab.title || tab.url)
          .replace(/[\\[\]`*_<>]/g, '\\$&')
          .replace(/[\r\n]+/g, ' ')
        const url = tab.url.replace(/[\s<>\\]/g, (character) =>
          encodeURIComponent(character),
        )
        return `- [${title}](<${url}>)`
      })
      .join('\n')
  }
  if (format === 'json') {
    const windows = new Map<
      number,
      { id: number; context: string; tabs: unknown[] }
    >()
    for (const tab of records) {
      let win = windows.get(tab.window_id)
      if (!win) {
        win = { id: tab.window_id, context: tab.window_context, tabs: [] }
        windows.set(win.id, win)
      }
      win.tabs.push({
        title: tab.title,
        url: tab.url,
        index: tab.tab_index,
        pinned: tab.pinned,
        group:
          tab.group_id == null
            ? null
            : {
                id: tab.group_id,
                name: tab.group_name,
                color: tab.group_color,
                collapsed: tab.group_collapsed,
              },
      })
    }
    return JSON.stringify(
      {
        schemaVersion: 1,
        tabCount: records.length,
        windows: Array.from(windows.values()),
      },
      null,
      2,
    )
  }
  const delimiter = format === 'tsv' ? '\t' : ','
  return [
    columns.join(delimiter),
    ...records.map((tab) =>
      columns
        .map((column) => delimitedCell(tab[column], delimiter))
        .join(delimiter),
    ),
  ].join('\r\n')
}

export const downloadTabExport = (text: string, format: TabFileFormat) => {
  const blob = new Blob([format === 'csv' ? '\uFEFF' : '', text], {
    type:
      format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tab-manager-tabs-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    // Give the browser time to consume the Blob before releasing its memory.
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
}
