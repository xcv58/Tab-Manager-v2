import { formatTabExport, type TabExportRecord } from '../tabExport'

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
