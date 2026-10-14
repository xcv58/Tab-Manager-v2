import { Buffer } from 'node:buffer'
import {
  downloadTabExport,
  formatTabExport,
  type TabExportRecord,
} from '../tabExport'

const record: TabExportRecord = {
  title: '&copy; &amp; &#35; reference [notes]',
  url: 'https://example.test/?q=&copy;&name=&#35;&encoded=%26copy%3B',
  window_id: 1,
  window_context: 'Reference window',
  tab_index: 0,
  group_id: null,
  group_name: '',
  group_color: '',
  group_collapsed: null,
  pinned: false,
}

test('Markdown keeps entity-shaped title and URL text literal', () => {
  expect(formatTabExport([record], 'markdown')).toBe(
    '- [\\&copy; \\&amp; \\&#35; reference \\[notes\\]](<https://example.test/?q=&amp;copy;&amp;name=&amp;#35;&amp;encoded=%26copy%3B>)',
  )
  expect(formatTabExport([{ ...record, title: '' }], 'markdown')).toContain(
    '\\&copy;',
  )
})

test('Markdown escaping leaves the original values in plain text and JSON', () => {
  expect(formatTabExport([record], 'title-url')).toBe(
    record.title + '\n' + record.url,
  )
  const exported = JSON.parse(formatTabExport([record], 'json'))
  expect(exported.windows[0].tabs[0]).toMatchObject({
    title: record.title,
    url: record.url,
  })
  expect(record.url).toContain('&copy;')
})

describe('file downloads', () => {
  const originals = ['createObjectURL', 'revokeObjectURL'].map((key) => ({
    key,
    descriptor: Object.getOwnPropertyDescriptor(URL, key),
  }))
  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:tab-export'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    })
  })
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })
  afterAll(() => {
    for (const { key, descriptor } of originals) {
      if (descriptor) Object.defineProperty(URL, key, descriptor)
      else Reflect.deleteProperty(URL, key)
    }
  })

  test.each([
    ['csv', 'csv', 'text/csv;charset=utf-8', true],
    ['tsv', 'tsv', 'text/tab-separated-values;charset=utf-8', true],
    ['json', 'json', 'application/json;charset=utf-8', false],
    ['markdown', 'md', 'text/markdown;charset=utf-8', false],
  ] as const)(
    'downloads %s with its file extension, MIME type and complete UTF-8 data',
    async (format, extension, mimeType, spreadsheet) => {
      const text = formatTabExport(
        [{ ...record, title: '研究 • résumé [notes]' }],
        format,
      )
      let filename = ''
      let href = ''
      jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          expect(this.isConnected).toBe(true)
          filename = this.download
          href = this.href
        })
      const schedule = jest.spyOn(globalThis, 'setTimeout')

      downloadTabExport(text, format)

      expect(filename).toMatch(
        new RegExp(`^tab-manager-tabs-.+\\.${extension}$`),
      )
      expect(href).toBe('blob:tab-export')
      expect(document.querySelector('a[download]')).toBeNull()
      expect(URL.revokeObjectURL).not.toHaveBeenCalled()
      const cleanupIndex = schedule.mock.calls.findIndex(
        ([, delay]) => delay === 60000,
      )
      expect(cleanupIndex).toBeGreaterThanOrEqual(0)
      clearTimeout(schedule.mock.results[cleanupIndex].value)

      const blob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob
      expect(blob.type).toBe(mimeType)
      const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(blob)
      })
      expect(Buffer.from(bytes).toString('utf8')).toBe(
        (spreadsheet ? '\uFEFF' : '') + text,
      )
      const cleanup = schedule.mock.calls[cleanupIndex][0]
      if (typeof cleanup === 'function') cleanup()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:tab-export')
    },
  )
})
