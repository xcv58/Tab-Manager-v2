import { readFile, mkdir, copyFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import {
  json,
  summarizeRuntime,
  validateRecord,
  writeText,
  writeRecord,
} from './records.mjs'

export function recordReport(record, baseline) {
  validateRecord(record)
  const lines = [
    `# Performance record: ${record.source.label}`,
    '',
    `- Commit: ${record.source.commit}`,
    `- Run: ${record.id}`,
    `- Recorded: ${record.recordedAt}`,
    `- Status: ${record.source.status}`,
    `- Runner: ${record.provenance.runner}`,
    `- Source working tree dirty: ${record.source.dirty ? 'yes' : 'no'}`,
    '',
    'All timing differences are advisory. Missing measurements are not zero.',
    '',
  ]
  if (record.bundles.length) {
    lines.push(
      '## Exact packaged bundles',
      '',
      '| Browser | ZIP bytes | Unpacked bytes | Startup JS bytes | ZIP change vs baseline |',
      '| --- | ---: | ---: | ---: | ---: |',
    )
    for (const bundle of record.bundles) {
      const previous = baseline?.bundles.find(
        (item) => item.browser === bundle.browser,
      )
      const delta = previous
        ? `${((bundle.zip.bytes / previous.zip.bytes - 1) * 100).toFixed(2)}%`
        : 'Unavailable'
      const startupFiles = bundle.startupFiles ||
        bundle.summary.startupNames || ['popup.js']
      const startupJsBytes = bundle.files
        .filter(
          (file) =>
            startupFiles.includes(file.path) && file.path.endsWith('.js'),
        )
        .reduce((sum, file) => sum + file.bytes, 0)
      lines.push(
        `| ${bundle.browser} | ${bundle.zip.bytes} | ${bundle.summary.unpackedBytes} | ${startupJsBytes} | ${delta} |`,
      )
    }
    lines.push(
      '',
      `Baseline: ${baseline ? `${baseline.source.label} (${baseline.source.commit})` : 'No archived record for the resolved previous-release commit.'}`,
      '',
    )
  }
  if (record.runtime) {
    const summary = summarizeRuntime(record.runtime)
    lines.push(
      '## Chrome profiling fixtures',
      '',
      `Compatibility key: ${record.runtime.compatibilityKey}`,
      '',
      '| Total tabs | Runs | Startup median ms | Narrow search median ms | Broad search median ms | Startup heap bytes |',
      '| --- | ---: | ---: | ---: | ---: | ---: |',
    )
    for (const workload of summary.workloads)
      lines.push(
        `| ${workload.totalTabs} | ${workload.startup.count} | ${workload.startup.median.toFixed(1)} | ${workload.narrowSearch.median.toFixed(1)} | ${workload.broadSearch.median.toFixed(1)} | ${workload.startupHeap.median} |`,
      )
    if (summary.drag)
      lines.push(
        '',
        `Group drag: ${summary.drag.render.count} runs; median React rendering ${summary.drag.render.median.toFixed(1)} ms; peak mounted rows ${summary.drag.peakRows.median}.`,
        '',
        `Post-drag GC heap: ${summary.drag.postDropHeap.median} bytes. Post-scroll detached model DOM references: ${summary.drag.detachedReferences.median}.`,
      )
    lines.push(
      '',
      'These are production React profiling builds with simulated browser metadata. They do not measure native browser IPC, cold browser launch, renderer RSS, or website loading.',
      '',
    )
  }
  return lines.join('\n') + '\n'
}

export async function buildViewer(records, output) {
  if (!records.length) throw new Error('No performance records to visualize')
  for (const record of records) validateRecord(record)
  output = resolve(output)
  await mkdir(output, { recursive: true })
  const recordDirectory = join(output, 'records')
  await mkdir(recordDirectory, { recursive: true })
  const data = records.map((record) => ({
    ...record,
    runtimeSummary: summarizeRuntime(record.runtime),
  }))
  for (const record of records) await writeRecord(record, recordDirectory)
  const templateRoot = fileURLToPath(new URL('./viewer/', import.meta.url))
  const template = await readFile(join(templateRoot, 'index.html'), 'utf8')
  const embedded = json(data)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
  const html = template.replace(
    '<!-- PERFORMANCE_RECORDS -->',
    `<script id="performance-records" type="application/json">${embedded}</script>`,
  )
  await writeText(join(output, 'index.html'), html)
  for (const file of ['viewer.js', 'viewer.css'])
    await copyFile(join(templateRoot, file), join(output, file))
  await writeText(
    join(output, 'index.json'),
    json(
      records.map((record) => ({
        id: record.id,
        commit: record.source.commit,
        version: record.source.version,
        status: record.source.status,
        recordedAt: record.recordedAt,
        file: `records/${record.id}.json`,
      })),
    ),
  )
  return join(output, 'index.html')
}
