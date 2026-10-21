/* global document, window, ResizeObserver, URL, history */
;(() => {
  const catalog = JSON.parse(
    document.getElementById('performance-records').textContent,
  )
  const data = catalog.records
  const byId = (id) => document.getElementById(id)
  const evidenceURL = (value) => {
    try {
      const url = new URL(value)
      const prefix = '/xcv58/Tab-Manager-v2/'
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'github.com' ||
        url.username ||
        url.password ||
        !url.pathname.startsWith(prefix)
      )
        return null
      // Reconstruct from a fixed origin and escaped path segments. Report data
      // is never interpreted as a javascript: URL, HTML, or another origin.
      return `https://github.com/xcv58/Tab-Manager-v2/${url.pathname
        .slice(prefix.length)
        .split('/')
        .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
        .join('/')}`
    } catch {
      return null
    }
  }
  const namespace = 'http://www.w3.org/2000/svg'
  const sourceKey = (record) =>
    record.source.dirty
      ? `${record.source.commit}-${record.id}`
      : record.source.commit
  const map = new Map()
  for (const record of [...data].sort(
    (a, b) =>
      Date.parse(a.recordedAt) - Date.parse(b.recordedAt) ||
      a.id.localeCompare(b.id),
  )) {
    const key = sourceKey(record)
    if (!map.has(key)) map.set(key, { key, records: [] })
    const entry = map.get(key)
    entry.records.push(record)
    if (
      !entry.source ||
      record.source.status === 'released' ||
      entry.source.status !== 'released'
    )
      entry.source = record.source
  }
  for (const release of catalog.inventory || []) {
    if (!map.has(release.commit))
      map.set(release.commit, { key: release.commit, records: [], source: {} })
    // Measurements are captured before publication. The reviewed release
    // inventory promotes that source into history without rewriting its records.
    const entry = map.get(release.commit)
    entry.source = {
      ...entry.source,
      commit: release.commit,
      version: release.version,
      status: 'released',
      committedAt: entry.source.committedAt || release.releasedAt,
      publishedAt: release.releasedAt,
      label: release.tag,
      tag: release.tag,
      dirty: false,
    }
  }
  for (const source of catalog.candidates || []) {
    if (!map.has(source.commit))
      map.set(source.commit, { key: source.commit, records: [], source })
  }
  if (catalog.preview) {
    document.querySelector('.performance-viewer h1').textContent =
      'Candidate performance preview'
    document.querySelector('.performance-viewer .description').textContent =
      `Unpublished performance preview. Available measurements are shown; publication still requires approval.${catalog.previewWarnings?.length ? ' Some measurements are unavailable.' : ''}`
  }
  const allEntries = [...map.values()].sort(
    (a, b) =>
      Date.parse(a.source.committedAt) - Date.parse(b.source.committedAt) ||
      a.key.localeCompare(b.key),
  )
  let entries = allEntries
  let eligibleEntries = allEntries
  const groups = new Map()
  const controls = {
    candidates: byId('candidates'),
    range: byId('range'),
    from: byId('from'),
    to: byId('to'),
    target: byId('target'),
    baseline: byId('baseline'),
    browser: byId('browser'),
    series: byId('series'),
    workload: byId('workload'),
  }
  const option = (select, value, label) => {
    const node = document.createElement('option')
    node.value = value
    node.textContent = label
    select.append(node)
  }
  const entryLabel = (entry) =>
    `${entry.source.status === 'released' ? entry.source.version : `${entry.source.version} candidate @ ${entry.source.commit.slice(0, 8)}`}${entry.source.dirty ? ' (working tree)' : ''}`
  const query = new URL(window.location.href).searchParams
  controls.range.value = ['all', 'latest', 'custom'].includes(
    query.get('range'),
  )
    ? query.get('range')
    : 'all'
  byId('measurement-settings').open = query.get('setup') === '1'
  const requestedDevelopment = ['target', 'baseline'].some((name) => {
    const entry = map.get(query.get(name))
    return entry && entry.source.status !== 'released'
  })
  controls.candidates.checked = query.has('candidates')
    ? query.get('candidates') === '1'
    : document.body.dataset.performanceView !== 'public' || requestedDevelopment
  controls.candidates.closest('label').hidden = allEntries.every(
    (entry) => entry.source.status === 'released',
  )
  controls.browser.value =
    query.get('browser') === 'firefox' ? 'firefox' : 'chrome'
  const chooseBaseline = (preferred) => {
    const target = map.get(controls.target.value)
    controls.baseline.replaceChildren()
    for (const entry of entries.filter((entry) => entry.key !== target.key))
      option(controls.baseline, entry.key, entryLabel(entry))
    if (!controls.baseline.options.length) {
      option(controls.baseline, '', 'No baseline')
      controls.baseline.disabled = true
      return
    }
    controls.baseline.disabled = false
    const previous = entries
      .slice(0, entries.indexOf(target))
      .filter((entry) => entry.source.status === 'released')
      .at(-1)
    controls.baseline.value = entries.some(
      (entry) => entry.key === preferred && entry.key !== target.key,
    )
      ? preferred
      : previous?.key || controls.baseline.options[0].value
  }
  const readableDate = (value) =>
    new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  const machineName = (environment) =>
    environment.platform === 'darwin'
      ? 'Mac'
      : environment.platform === 'linux'
        ? 'Linux'
        : environment.platform === 'win32'
          ? 'Windows'
          : 'Archived run'
  const chooseSeries = (preferred) => {
    groups.clear()
    for (const record of entries
      .flatMap((entry) => entry.records)
      .filter((record) => record.runtime))
      groups.set(record.runtime.compatibilityKey, record.runtime.environment)
    const current = controls.series.value
    controls.series.replaceChildren()
    const labels = new Map()
    for (const [key, env] of groups) {
      const observations = entries
        .flatMap((entry) => entry.records)
        .filter((record) => record.runtime?.compatibilityKey === key)
      const coverage = entries.filter((entry) =>
        entry.records.some(
          (record) => record.runtime?.compatibilityKey === key,
        ),
      ).length
      const label = `${machineName(env)} · ${readableDate(observations.at(-1).recordedAt)} · Chromium ${env.browser.split('.')[0]} · ${coverage} comparable version${coverage === 1 ? '' : 's'}`
      const occurrence = (labels.get(label) || 0) + 1
      labels.set(label, occurrence)
      option(
        controls.series,
        key,
        `${label}${occurrence > 1 ? ` · Set ${occurrence}` : ''}`,
      )
    }
    if (!groups.size) option(controls.series, '', 'No runtime measurements')
    controls.series.disabled = !groups.size
    const runtimes = map
      .get(controls.target.value)
      .records.filter((record) => record.runtime)
      .reverse()
    const baseSeries = new Set(
      map
        .get(controls.baseline.value)
        ?.records.filter((record) => record.runtime)
        .map((record) => record.runtime.compatibilityKey),
    )
    const common = runtimes.filter((record) =>
      baseSeries.has(record.runtime.compatibilityKey),
    )
    controls.series.value = groups.has(preferred)
      ? preferred
      : common.find((record) => record.runtime.compatibilityKey === current)
          ?.runtime.compatibilityKey ||
        common[0]?.runtime.compatibilityKey ||
        runtimes[0]?.runtime.compatibilityKey ||
        groups.keys().next().value ||
        ''
  }
  const setWorkloads = (preferred) => {
    const workloads = entries
      .flatMap((entry) => entry.records)
      .filter(
        (record) => record.runtime?.compatibilityKey === controls.series.value,
      )
      .flatMap((record) => record.runtimeSummary.workloads)
    const values = [
      ...new Set(workloads.map((workload) => workload.sourceTabs)),
    ].sort((a, b) => a - b)
    controls.workload.replaceChildren()
    for (const value of values)
      option(
        controls.workload,
        String(value),
        `${value.toLocaleString()} source tabs`,
      )
    if (!values.length) option(controls.workload, '', 'Not measured')
    controls.workload.disabled = !values.length
    controls.workload.value = values.includes(Number(preferred))
      ? String(preferred)
      : String(values.at(-1) || '')
  }
  const updateVersions = (
    target,
    baseline,
    series,
    workload,
    from = controls.from.value,
    to = controls.to.value,
    { changedEndpoint, restorePins = false } = {},
  ) => {
    eligibleEntries = allEntries.filter(
      (entry) =>
        controls.candidates.checked || entry.source.status === 'released',
    )
    if (!eligibleEntries.length) {
      controls.candidates.checked = true
      eligibleEntries = allEntries
    }
    for (const control of [controls.from, controls.to]) {
      control.replaceChildren()
      for (const entry of eligibleEntries)
        option(control, entry.key, entryLabel(entry))
    }
    let start = eligibleEntries.findIndex((entry) => entry.key === from)
    let end = eligibleEntries.findIndex((entry) => entry.key === to)
    if (start < 0) start = 0
    if (end < 0) end = eligibleEntries.length - 1
    if (start > end) {
      if (changedEndpoint === 'from') end = start
      else if (changedEndpoint === 'to') start = end
      else [start, end] = [end, start]
    }
    controls.from.value = eligibleEntries[start].key
    controls.to.value = eligibleEntries[end].key
    entries =
      controls.range.value === 'latest'
        ? eligibleEntries.slice(-10)
        : controls.range.value === 'custom'
          ? eligibleEntries.slice(start, end + 1)
          : eligibleEntries
    // Saved version/capture pins outlive a rolling history window. Restore the
    // archived comparison first; explicit range changes keep their usual behavior.
    if (
      restorePins &&
      controls.range.value === 'latest' &&
      [target, baseline].some(
        (key) =>
          eligibleEntries.some((entry) => entry.key === key) &&
          !entries.some((entry) => entry.key === key),
      )
    ) {
      controls.range.value = 'all'
      entries = eligibleEntries
    }
    byId('custom-range').hidden = controls.range.value !== 'custom'
    controls.target.replaceChildren()
    for (const entry of entries)
      option(controls.target, entry.key, entryLabel(entry))
    controls.target.value = entries.some((entry) => entry.key === target)
      ? target
      : entries.at(-1).key
    chooseBaseline(baseline)
    chooseSeries(series)
    setWorkloads(workload)
  }
  updateVersions(
    query.get('target'),
    query.get('baseline'),
    query.get('series'),
    query.get('tabs'),
    query.get('from'),
    query.get('to'),
    { restorePins: true },
  )
  const captureSelections = new Map()
  const captureInputs = [
    ['target-bundle', 'target', 'bundle'],
    ['baseline-bundle', 'baseline', 'bundle'],
    ['target-runtime', 'target', 'runtime'],
    ['baseline-runtime', 'baseline', 'runtime'],
  ]
  // Runtime pins belong to a measurement series, including when inspecting a
  // version automatically selects another series. Keep missing URL pins within
  // their requested series instead of replacing them with a different capture.
  const captureKey = (entry, kind) =>
    `${entry?.key}:${kind}${kind === 'runtime' ? `:${controls.series.value}` : ''}`
  for (const [id, side, kind] of captureInputs) {
    if (query.get(id))
      captureSelections.set(
        captureKey(map.get(controls[side].value), kind),
        query.get(id),
      )
  }
  const eligibleCaptures = (entry, kind) =>
    entry?.records.filter((record) =>
      kind === 'bundle'
        ? record.bundles.some(
            (bundle) => bundle.browser === controls.browser.value,
          )
        : record.runtime?.compatibilityKey === controls.series.value,
    ) || []
  const captureFor = (entry, kind) => {
    const records = eligibleCaptures(entry, kind)
    const selected = captureSelections.get(captureKey(entry, kind))
    return selected
      ? records.find((record) => record.id === selected)
      : records.at(-1)
  }
  const bundleFor = (entry) => captureFor(entry, 'bundle')
  const runtimeFor = (entry) => captureFor(entry, 'runtime')
  function syncCaptures() {
    let missing = false
    for (const [, side, kind] of captureInputs) {
      const entry = map.get(controls[side].value)
      const records = eligibleCaptures(entry, kind)
      const selected =
        captureSelections.get(captureKey(entry, kind)) || records.at(-1)?.id
      if (selected) {
        captureSelections.set(captureKey(entry, kind), selected)
        if (!records.some((record) => record.id === selected)) missing = true
      }
    }
    byId('capture-notice').hidden = !missing
    byId('snapshot-download').hidden = !catalog.digest
  }
  const reportSelections = new Map()
  if (query.get('report'))
    reportSelections.set(controls.target.value, query.get('report'))
  const reportFor = (entry) => {
    const reports = (catalog.reports || [])
      .filter((report) => report.source.commit === entry.key)
      .sort(
        (a, b) =>
          Date.parse(a.recordedAt) - Date.parse(b.recordedAt) ||
          a.id.localeCompare(b.id),
      )
    const requested = reportSelections.get(entry.key)
    return requested
      ? reports.find((report) => report.id === requested)
      : reports.at(-1)
  }
  const workloadFor = (entry) =>
    runtimeFor(entry)?.runtimeSummary.workloads.find(
      (workload) => workload.sourceTabs === Number(controls.workload.value),
    )
  const constant = (value) =>
    Number.isFinite(value)
      ? { median: value, min: value, max: value, count: 1 }
      : null
  const percentChange = (value, baseline) => {
    const rounded = Number(((value / baseline - 1) * 100).toFixed(1))
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`
  }
  const initialJavaScript = (entry) => {
    const bundle = bundleFor(entry)?.bundles.find(
      (item) => item.browser === controls.browser.value,
    )
    if (!bundle) return null
    const files = bundle.startupFiles ||
      bundle.summary.startupNames || ['popup.js']
    return constant(
      bundle.files
        .filter(
          (file) => files.includes(file.path) && file.path.endsWith('.js'),
        )
        .reduce((total, file) => total + file.bytes, 0) / 1000,
    )
  }
  const dragWorkload = (entry) => {
    const counts = [
      ...new Set(
        (entry ? [entry] : entries).flatMap(
          (item) => runtimeFor(item)?.runtimeSummary.drag?.tabCounts || [],
        ),
      ),
    ].sort((a, b) => a - b)
    return counts.length
      ? `${counts.map((count) => count.toLocaleString()).join(' / ')} tabs`
      : 'Workload unavailable'
  }
  const definitions = [
    {
      title: 'Download size',
      unit: 'kB',
      subtitle: () =>
        `Complete ${controls.browser.value === 'chrome' ? 'Chrome' : 'Firefox'} ZIP`,
      get: (entry) =>
        constant(
          bundleFor(entry)?.bundles.find(
            (bundle) => bundle.browser === controls.browser.value,
          ).zip.bytes / 1000,
        ),
    },
    {
      title: 'Startup JavaScript',
      unit: 'kB',
      subtitle: () =>
        `Initial popup scripts · ${controls.browser.value === 'chrome' ? 'Chrome' : 'Firefox'}`,
      get: initialJavaScript,
    },
    {
      title: 'Startup time',
      unit: 'ms',
      subtitle: () =>
        `${controls.workload.selectedOptions[0]?.textContent || 'No workload'} · simulated workspace`,
      get: (entry) => workloadFor(entry)?.startup,
    },
    {
      title: 'Search response',
      unit: 'ms',
      subtitle: () =>
        `${controls.workload.selectedOptions[0]?.textContent || 'No workload'} · matching results · includes debounce`,
      get: (entry) => workloadFor(entry)?.narrowSearch,
    },
    {
      title: 'Group-drag rendering',
      unit: 'ms',
      subtitle: (entry) => `${dragWorkload(entry)} · React render time`,
      get: (entry) => runtimeFor(entry)?.runtimeSummary.drag?.render,
    },
    {
      title: 'JS heap after group drag',
      unit: 'MB',
      subtitle: (entry) => `${dragWorkload(entry)} · after garbage collection`,
      get: (entry) => {
        const value = runtimeFor(entry)?.runtimeSummary.drag?.postDropHeap
        return value
          ? {
              ...value,
              median: value.median / 1e6,
              min: value.min / 1e6,
              max: value.max / 1e6,
            }
          : null
      },
    },
  ]
  const plots = definitions
    .filter((_, index) => [0, 2, 3].includes(index))
    .map((definition) => {
      const figure = document.createElement('figure')
      figure.className = 'plot'
      const header = document.createElement('div')
      header.className = 'plot-header'
      const title = document.createElement('h3')
      title.textContent = definition.title
      const delta = document.createElement('span')
      delta.className = 'delta'
      const caption = document.createElement('figcaption')
      const value = document.createElement('p')
      value.className = 'comparison-value'
      const selectedValue = document.createElement('strong')
      const baselineValue = document.createElement('small')
      baselineValue.className = 'baseline-value'
      value.append(selectedValue, delta, baselineValue)
      const svg = document.createElementNS(namespace, 'svg')
      svg.classList.add('chart')
      svg.setAttribute('role', 'group')
      header.append(title)
      figure.append(header, value, caption, svg)
      byId('charts').append(figure)
      return {
        definition,
        figure,
        delta,
        caption,
        svg,
        selectedValue,
        baselineValue,
        isBundle: definitions.indexOf(definition) < 2,
      }
    })
  const tooltip = byId('chart-tooltip')
  const reportRoot = byId('main-content')
  let preview = null
  const svgNode = (parent, type, attrs = {}, text) => {
    const node = document.createElementNS(namespace, type)
    for (const [key, value] of Object.entries(attrs))
      node.setAttribute(key, value)
    if (text !== undefined) node.textContent = text
    parent.append(node)
    return node
  }
  function draw(plot) {
    const { definition, svg, delta, caption, selectedValue, baselineValue } =
      plot
    const target = map.get(controls.target.value),
      base = map.get(controls.baseline.value)
    const width = svg.getBoundingClientRect().width,
      height = 218
    const values = entries
      .map((entry) => ({ entry, stat: definition.get(entry) }))
      .filter((point) => plot.isBundle || point.stat)
      .map((point, index) => ({ ...point, index }))
    plot.points = []
    const targetStat = definition.get(target),
      baseStat = definition.get(base)
    const format = (stat) =>
      stat
        ? `${stat.median.toLocaleString(undefined, { maximumFractionDigits: definition.unit === 'ms' ? 0 : 1 })} ${definition.unit}`
        : 'Unavailable in this set'
    selectedValue.textContent = format(targetStat)
    baselineValue.textContent = `${base ? entryLabel(base) : 'Baseline'}: ${format(baseStat)}`
    delta.textContent =
      targetStat && baseStat && baseStat.median > 0
        ? `${targetStat.median - baseStat.median > 0 ? '+' : ''}${(targetStat.median - baseStat.median).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${definition.unit} (${percentChange(targetStat.median, baseStat.median)})`
        : 'No comparable measurement'
    caption.textContent = definition.subtitle()
    // Navigation or a hidden layout can briefly report a zero-width chart.
    // ResizeObserver will redraw it when it has usable space again.
    if (width < 100) return
    svg.replaceChildren()
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    svg.setAttribute(
      'aria-label',
      `${definition.title}: ${entryLabel(target)} ${format(targetStat)}; baseline ${base ? entryLabel(base) : 'unavailable'} ${format(baseStat)}`,
    )
    svgNode(
      svg,
      'desc',
      {},
      `${definition.title}, ${definition.unit}. ${values.map(({ entry, stat }) => `${entryLabel(entry)}: ${stat ? `${stat.median.toFixed(1)}, range ${stat.min.toFixed(1)} to ${stat.max.toFixed(1)}, ${stat.count} observation(s)` : 'not measured'}`).join('; ')}`,
    )
    const left = 52,
      right = width - 10,
      top = 12,
      bottom = 152
    plot.bounds = { left, right, top, bottom }
    const valid = values.filter((point) => point.stat)
    if (!valid.length) {
      svgNode(
        svg,
        'text',
        {
          class: 'empty',
          x: (left + right) / 2,
          y: 90,
          'text-anchor': 'middle',
        },
        'No measurements in this series',
      )
      return
    }
    const max = Math.max(...valid.map((point) => point.stat.max)) || 1
    const rough = (max * 1.24) / 3,
      power = 10 ** Math.floor(Math.log10(rough)),
      step = [1, 2, 5, 10].find((value) => value * power >= rough) * power,
      ceiling = Math.ceil((max * 1.24) / step) * step
    const x = (index) =>
      values.length === 1
        ? (left + right) / 2
        : left + 18 + ((right - left - 36) * index) / (values.length - 1)
    const y = (value) => bottom - 5 - ((bottom - top - 10) * value) / ceiling
    plot.points = values.map((point) => ({
      ...point,
      x: x(point.index),
      y: point.stat ? y(point.stat.median) : (top + bottom) / 2,
    }))
    const selected = plot.points.find((point) => point.entry.key === target.key)
    if (selected)
      svgNode(svg, 'line', {
        class: 'selection-guide',
        x1: selected.x,
        x2: selected.x,
        y1: top,
        y2: bottom,
      })
    for (let tick = 0; tick <= ceiling + step * 0.01; tick += step) {
      const pos = y(tick)
      svgNode(svg, 'line', {
        class: 'grid',
        x1: left,
        x2: right,
        y1: pos,
        y2: pos,
      })
      svgNode(
        svg,
        'text',
        { x: left - 8, y: pos + 4, 'text-anchor': 'end' },
        tick >= 1000
          ? `${tick / 1000}k`
          : Number(tick.toPrecision(4)).toString(),
      )
    }
    svgNode(
      svg,
      'text',
      {
        x: 10,
        y: (top + bottom) / 2,
        transform: `rotate(-90 10 ${(top + bottom) / 2})`,
        'text-anchor': 'middle',
      },
      definition.unit,
    )
    const stride = Math.max(1, Math.ceil(values.length / (width < 400 ? 3 : 5)))
    const axisLabels = new Map()
    const lanes = [[], []]
    // Endpoints and the inspected release take priority over intermediate labels.
    // Use two rows and omit lower-priority labels when a chart becomes dense.
    for (const index of new Set([
      0,
      values.length - 1,
      values.findIndex((point) => point.entry.key === target.key),
      values.findIndex((point) => point.entry.key === base?.key),
      ...values
        .filter((point) => point.index % stride === 0)
        .map((point) => point.index),
    ])) {
      if (index < 0) continue
      const entry = values[index].entry
      const label =
        entry.source.status === 'released'
          ? entry.source.version
          : `${entry.source.commit.slice(0, 7)}*`
      const anchor =
        index === 0 ? 'start' : index === values.length - 1 ? 'end' : 'middle'
      const size = label.length * 7
      const start =
        x(index) - (anchor === 'start' ? 0 : anchor === 'end' ? size : size / 2)
      const span = { start, end: start + size }
      const lane = lanes.findIndex((spans) =>
        spans.every(
          (other) => span.end + 6 < other.start || span.start > other.end + 6,
        ),
      )
      if (lane < 0) continue
      lanes[lane].push(span)
      axisLabels.set(index, { label, anchor, lane })
    }
    for (const point of values) {
      const current = point.entry.key === target.key,
        isBase = point.entry.key === base?.key
      if (axisLabels.has(point.index)) {
        const { label, anchor, lane } = axisLabels.get(point.index)
        svgNode(
          svg,
          'text',
          {
            x: x(point.index),
            y: bottom + 21 + lane * 16,
            'text-anchor': anchor,
          },
          label,
        )
      }
      if (!point.stat) continue
      const next = values[point.index + 1]
      if (next?.stat)
        svgNode(svg, 'path', {
          class: `line ${point.entry.source.status !== 'released' || next.entry.source.status !== 'released' ? 'candidate' : ''}`,
          d: `M${x(point.index)},${y(point.stat.median)}L${x(next.index)},${y(next.stat.median)}`,
        })
      const xx = x(point.index),
        yy = y(point.stat.median),
        stat = point.stat
      if (stat.min !== stat.max)
        svgNode(svg, 'path', {
          class: 'whisker',
          d: `M${xx},${y(stat.min)}V${y(stat.max)}M${xx - 4},${y(stat.min)}h8M${xx - 4},${y(stat.max)}h8`,
        })
      const interactive = svgNode(svg, 'g', {
        class: 'release-point',
        'data-key': point.entry.key,
        tabindex: current || (!targetStat && point === valid[0]) ? '0' : '-1',
        role: 'button',
        'aria-label': `Inspect ${entryLabel(point.entry)}: ${stat.median.toFixed(1)} ${definition.unit}`,
        'aria-pressed': String(current),
      })
      svgNode(interactive, 'circle', {
        cx: xx,
        cy: yy,
        r: 12,
        fill: 'transparent',
      })
      interactive.addEventListener('click', (event) => {
        event.stopPropagation()
        selectEntry(point.entry.key)
      })
      interactive.addEventListener('focus', () => {
        for (const node of svg.querySelectorAll('.release-point'))
          node.setAttribute('tabindex', node === interactive ? '0' : '-1')
        previewPoint(plot, point.entry.key, 'keyboard')
      })
      interactive.addEventListener('blur', () => {
        if (preview?.mode === 'keyboard') clearPreview()
      })
      interactive.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          selectEntry(point.entry.key)
        } else if (
          ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
        ) {
          event.preventDefault()
          const nodes = [...svg.querySelectorAll('.release-point')]
          const index = nodes.indexOf(interactive)
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? nodes.length - 1
                : Math.max(
                    0,
                    Math.min(
                      nodes.length - 1,
                      index + (event.key === 'ArrowRight' ? 1 : -1),
                    ),
                  )
          nodes[next].focus({ preventScroll: true })
        } else if (event.key === 'Escape') {
          clearPreview()
        }
      })
      const marker =
        point.entry.source.status === 'released'
          ? svgNode(interactive, 'circle', {
              cx: xx,
              cy: yy,
              r: current ? 5 : 4,
            })
          : svgNode(interactive, 'path', {
              d: `M${xx},${yy - 7}l5,7l-5,7l-5,-7Z`,
            })
      marker.setAttribute(
        'class',
        `point ${current ? 'selected-target' : ''} ${isBase ? 'selected-baseline' : ''}`,
      )
      svgNode(
        marker,
        'title',
        {},
        `${entryLabel(point.entry)}: ${stat.median.toFixed(1)} ${definition.unit}; ${stat.count} observations, min ${stat.min.toFixed(1)}, max ${stat.max.toFixed(1)}`,
      )
      if (current)
        svgNode(
          svg,
          'text',
          {
            class: 'value',
            x: xx,
            y: y(stat.max) - 10,
            'text-anchor':
              point.index === 0
                ? 'start'
                : point.index === values.length - 1
                  ? 'end'
                  : 'middle',
          },
          stat.median.toFixed(1),
        )
    }
    svgNode(
      svg,
      'text',
      { x: (left + right) / 2, y: 211, 'text-anchor': 'middle' },
      entries.some((entry) => entry.source.status !== 'released')
        ? 'Version · * candidate'
        : 'Version',
    )
    svgNode(svg, 'rect', {
      class: 'chart-hit',
      'aria-hidden': 'true',
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    })
  }
  function clearPreview() {
    preview = null
    tooltip.hidden = true
    for (const plot of plots) {
      for (const node of plot.svg.querySelectorAll(
        '.hover-guide, .hover-marker',
      ))
        node.remove()
      for (const node of plot.svg.querySelectorAll('[aria-describedby]'))
        node.removeAttribute('aria-describedby')
    }
  }
  function packageOrigin(entry) {
    const record = bundleFor(entry)
    const bundle = record?.bundles.find(
      (item) => item.browser === controls.browser.value,
    )
    return !bundle
      ? 'Not measured'
      : bundle.origin === 'published-release'
        ? 'Published ZIP'
        : record.provenance.kind === 'local-reviewed-release-bundles'
          ? 'Verified release ZIP'
          : record.provenance.kind === 'packaged-bundles'
            ? 'Release build'
            : 'Source rebuild'
  }
  function previewPoint(plot, key, mode) {
    const point = plot.points.find((item) => item.entry.key === key)
    if (!point) return
    clearPreview()
    preview = {
      plot,
      key,
      mode,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    }
    for (const other of plots) {
      const matching = other.points.find((item) => item.entry.key === key)
      if (!matching) continue
      svgNode(other.svg, 'line', {
        class: 'hover-guide',
        x1: matching.x,
        x2: matching.x,
        y1: other.bounds.top,
        y2: other.bounds.bottom,
        'pointer-events': 'none',
      })
      if (matching.stat)
        svgNode(other.svg, 'circle', {
          class: 'hover-marker',
          cx: matching.x,
          cy: matching.y,
          r: 6,
        })
    }
    tooltip.replaceChildren()
    const heading = document.createElement('strong')
    heading.textContent = `${entryLabel(point.entry)} · ${plot.definition.title}`
    tooltip.append(heading)
    const addLine = (text, context = false) => {
      const line = document.createElement('p')
      line.textContent = text
      if (context) line.className = 'tooltip-context'
      tooltip.append(line)
    }
    const number = (value) =>
      value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    const stat = point.stat
    if (stat) {
      addLine(
        `${plot.isBundle ? 'Size' : 'Median'}: ${number(stat.median)} ${plot.definition.unit}`,
      )
      if (plot.isBundle) addLine(packageOrigin(point.entry), true)
      else {
        addLine(
          `Observed range: ${number(stat.min)}–${number(stat.max)} ${plot.definition.unit}`,
          true,
        )
        addLine(`${stat.count} observation${stat.count === 1 ? '' : 's'}`, true)
        addLine(plot.definition.subtitle(point.entry), true)
      }
      const base = map.get(controls.baseline.value)
      const baseStat = plot.definition.get(base)
      if (key === base?.key) addLine('Comparison baseline', true)
      else if (baseStat?.median > 0)
        addLine(
          `${percentChange(stat.median, baseStat.median)} vs ${entryLabel(base)}`,
          true,
        )
    } else addLine('Not measured in this series.', true)
    tooltip.hidden = false
    const rootRect = reportRoot.getBoundingClientRect()
    const chartRect = plot.svg.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    const left = Math.max(
      12,
      Math.min(
        chartRect.left - rootRect.left + point.x + 14,
        rootRect.width - tooltipRect.width - 12,
      ),
    )
    const minimumTop = Math.max(8, 8 - rootRect.top)
    let top = chartRect.top - rootRect.top + point.y - tooltipRect.height - 16
    if (top < minimumTop) top = chartRect.top - rootRect.top + point.y + 18
    top = Math.max(
      minimumTop,
      Math.min(
        top,
        window.innerHeight - rootRect.top - tooltipRect.height - 12,
      ),
    )
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
    if (mode === 'keyboard') {
      plot.svg
        .querySelector(`[data-key="${key}"]`)
        ?.setAttribute('aria-describedby', 'chart-tooltip')
    }
  }
  function redrawPlots(keepPreview = false) {
    const focused = document.activeElement
    const focusedPlot = plots.find((plot) => plot.svg.contains(focused))
    const focusedKey = focused?.getAttribute('data-key')
    const retained = keepPreview ? preview : null
    clearPreview()
    for (const plot of plots) draw(plot)
    if (focusedKey && focusedPlot) {
      focusedPlot.svg
        .querySelector(`[data-key="${focusedKey}"]`)
        ?.focus({ preventScroll: true })
    } else if (retained)
      previewPoint(retained.plot, retained.key, retained.mode)
  }
  for (const plot of plots) {
    const pointAt = (event) => {
      if (!plot.points.length) return null
      const rect = plot.svg.getBoundingClientRect()
      const xx = event.clientX - rect.left,
        yy = event.clientY - rect.top
      const { left, right, top, bottom } = plot.bounds
      if (xx < left || xx > right || yy < top || yy > bottom) return null
      return plot.points.reduce((nearest, point) =>
        Math.abs(point.x - xx) < Math.abs(nearest.x - xx) ? point : nearest,
      )
    }
    plot.svg.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch' || preview?.mode === 'touch') return
      const point = pointAt(event)
      if (point) previewPoint(plot, point.entry.key, 'pointer')
      else if (preview?.mode === 'pointer') clearPreview()
    })
    plot.svg.addEventListener('pointerleave', () => {
      if (preview?.mode !== 'pointer') return
      const focusedKey = document.activeElement?.getAttribute('data-key')
      if (focusedKey && plot.svg.contains(document.activeElement))
        previewPoint(plot, focusedKey, 'keyboard')
      else clearPreview()
    })
    plot.svg.addEventListener('pointercancel', clearPreview)
    plot.svg.addEventListener('click', (event) => {
      const point = pointAt(event)
      if (!point) return
      selectEntry(point.entry.key)
      previewPoint(
        plot,
        point.entry.key,
        event.pointerType === 'touch' ? 'touch' : 'pointer',
      )
    })
  }
  document.addEventListener('click', (event) => {
    // Selecting a release redraws the hit layer before this event bubbles.
    // Its original path still identifies the chart even after the node detaches.
    if (!plots.some((plot) => event.composedPath().includes(plot.figure)))
      clearPreview()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clearPreview()
  })
  window.addEventListener(
    'scroll',
    () => {
      const focused = document.activeElement
      const focusedPlot = plots.find((plot) => plot.svg.contains(focused))
      if (focusedPlot) {
        // Tab navigation can scroll a newly focused point into view after focus.
        // Keep its keyboard detail anchored as that native scrolling completes.
        const point = focusedPlot.points.find(
          (item) => item.entry.key === focused.dataset.key,
        )
        const screenY =
          point && focusedPlot.svg.getBoundingClientRect().top + point.y
        if (point && screenY >= 0 && screenY <= window.innerHeight)
          previewPoint(focusedPlot, point.entry.key, 'keyboard')
        else clearPreview()
        return
      }
      if (
        preview &&
        (preview.scrollX !== window.scrollX ||
          preview.scrollY !== window.scrollY)
      )
        clearPreview()
    },
    { passive: true },
  )
  function details() {
    const target = map.get(controls.target.value),
      base = map.get(controls.baseline.value)
    const bundle = bundleFor(target),
      runtime = runtimeFor(target),
      environment = groups.get(controls.series.value)
    const workload = workloadFor(target)
    byId('notice').hidden = Boolean(workload)
    byId('notice').textContent = !groups.size
      ? 'Interface timings are not available for these versions. Package measurements remain shown.'
      : 'This version or workload is unavailable in the selected measurement set. Choose another set to inspect its archived timings.'
    byId('measurement-summary').textContent = runtime
      ? `Selected timings were collected ${readableDate(runtime.recordedAt)} on ${environment.hardware?.cpuModels?.join(' / ') || machineName(environment)} using Chromium ${environment.browser}. ${workload?.startup.count || environment.samplesPerCase || 'Repeated'} observations per startup/search workload. Drag workload: ${dragWorkload(target)}; its JavaScript heap measurement excludes total browser memory.`
      : 'No interface measurement is selected for this version.'
    byId('package-context').textContent =
      `Package source: ${packageOrigin(target)}${base ? `. Baseline: ${packageOrigin(base)}` : ''}.`
    const link = document.createElement('a')
    link.href = `https://github.com/xcv58/Tab-Manager-v2/commit/${encodeURIComponent(target.source.commit)}`
    link.textContent = `View v${entryLabel(target)} source`
    byId('source').replaceChildren(link)
    byId('records').replaceChildren()
    const selected = [
      ...new Set(
        [bundle, runtime, bundleFor(base), runtimeFor(base)].filter(Boolean),
      ),
    ]
    for (const record of selected) {
      const row = document.createElement('li'),
        link = document.createElement('a')
      link.href = `records/${encodeURIComponent(record.id)}.json`
      const kinds = [
        record === bundle || record === bundleFor(base) ? 'Package' : '',
        record === runtime || record === runtimeFor(base) ? 'interface' : '',
      ]
        .filter(Boolean)
        .join(' and ')
      link.textContent = `${record.source.version} · ${kinds} data · ${readableDate(record.recordedAt)}`
      row.append(link)
      byId('records').append(row)
    }
    const report = reportFor(target)
    const verification = byId('verification-link')
    const href = evidenceURL(report?.url)
    verification.hidden = !href
    if (href) verification.href = href
    else verification.removeAttribute('href')
    byId('evidence-note').hidden =
      !reportSelections.has(target.key) || Boolean(report)
  }
  // Internal candidate previews still expose the original check outcomes for
  // release review. The public page keeps only its verification download link.
  const candidateChecks = catalog.preview
    ? document.createElement('details')
    : null
  if (candidateChecks) {
    candidateChecks.open = true
    byId('release-history').before(candidateChecks)
  }
  function renderCandidateChecks(target) {
    if (!candidateChecks) return
    const summary = document.createElement('summary')
    summary.textContent = 'Candidate checks'
    const list = document.createElement('ul')
    const checks = reportFor(target)?.checks || []
    for (const check of checks) {
      const row = document.createElement('li'),
        link = document.createElement('a')
      link.textContent = `${check.name}: ${check.conclusion} · ${check.environment}${check.counts ? ` · ${check.counts.passed} passed, ${check.counts.failed} failed, ${check.counts.skipped} skipped, ${check.counts.flaky} flaky` : ''}`
      const href = evidenceURL(check.url)
      if (href) link.href = href
      row.append(link)
      list.append(row)
    }
    if (!checks.length) {
      const row = document.createElement('li')
      row.textContent = 'Candidate check results are unavailable.'
      list.append(row)
    }
    candidateChecks.replaceChildren(summary, list)
  }
  function render() {
    syncCaptures()
    const focusedTableKey = byId('release-rows').contains(
      document.activeElement,
    )
      ? document.activeElement.dataset.key
      : null
    const target = map.get(controls.target.value)
    const base = map.get(controls.baseline.value)
    renderCandidateChecks(target)
    byId('history-summary').textContent =
      `${entries.length} of ${eligibleEntries.length} archived versions · ${entryLabel(entries[0])} — ${entryLabel(entries.at(-1))}`
    byId('selected-release').textContent = `v${entryLabel(target)}`
    byId('comparison-summary').textContent = base
      ? `Compared with v${entryLabel(base)}`
      : 'No comparison baseline'
    const comparable = entries.filter((entry) => workloadFor(entry))
    byId('runtime-context').textContent = comparable.length
      ? `Comparable interface measurements: ${entryLabel(comparable[0])}${comparable.length > 1 ? `–${entryLabel(comparable.at(-1))}` : ''} · ${comparable.length} version${comparable.length === 1 ? '' : 's'} in this set.${groups.size > 1 ? ' Other measurement sets remain available in the selector.' : ''}`
      : 'No comparable interface measurements for this workload and history range.'
    redrawPlots()
    details()
    releaseTable()
    if (focusedTableKey) {
      ;[...byId('release-rows').querySelectorAll('button')]
        .find((button) => button.dataset.key === focusedTableKey)
        ?.focus({ preventScroll: true })
    }
  }
  function selectEntry(key) {
    const currentSeries = controls.series.value
    controls.target.value = key
    chooseBaseline()
    chooseSeries(
      map
        .get(key)
        .records.some(
          (record) => record.runtime?.compatibilityKey === currentSeries,
        )
        ? currentSeries
        : undefined,
    )
    setWorkloads(controls.workload.value)
    render()
    remember()
    byId('chart-announcement').textContent =
      `Inspecting ${entryLabel(map.get(key))}. ${byId('comparison-summary').textContent}.`
  }
  function releaseTable() {
    byId('release-rows').replaceChildren()
    for (const entry of entries) {
      const row = document.createElement('tr')
      row.classList.toggle(
        'inspected-release',
        entry.key === controls.target.value,
      )
      const name = document.createElement('th')
      name.scope = 'row'
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.key = entry.key
      button.textContent = entryLabel(entry)
      button.setAttribute(
        'aria-pressed',
        String(entry.key === controls.target.value),
      )
      button.addEventListener('click', () => selectEntry(entry.key))
      const date = document.createElement('small')
      const published =
        entry.source.publishedAt ||
        entry.records
          .map(
            (record) =>
              record.source.publishedAt || record.provenance.publishedAt,
          )
          .filter(Boolean)
          .at(-1)
      date.textContent = `${published ? 'Released' : 'Source'} ${String(published || entry.source.committedAt).slice(0, 10)}`
      name.append(button, date)
      row.append(name)
      const previous = eligibleEntries
        .slice(0, eligibleEntries.indexOf(entry))
        .filter((item) => item.source.status === 'released')
        .at(-1)
      for (const definition of definitions) {
        const cell = document.createElement('td')
        const stat = definition.get(entry),
          baseline = definition.get(previous)
        cell.textContent = stat
          ? stat.median.toLocaleString(undefined, { maximumFractionDigits: 1 })
          : '—'
        if (!stat) cell.title = 'Unavailable in the selected measurement set'
        if (stat && baseline && baseline.median > 0) {
          const change = document.createElement('small')
          change.textContent = percentChange(stat.median, baseline.median)
          change.title = `Compared with ${entryLabel(previous)}`
          cell.append(change)
        }
        row.append(cell)
      }
      const origin = document.createElement('td')
      origin.textContent = packageOrigin(entry)
      row.append(origin)
      byId('release-rows').append(row)
    }
  }
  function remember() {
    const url = new URL(window.location.href)
    for (const [key, value] of Object.entries({
      target: controls.target.value,
      baseline: controls.baseline.value,
      browser: controls.browser.value,
      series: controls.series.value,
      tabs: controls.workload.value,
      candidates: controls.candidates.checked ? '1' : '0',
      range: controls.range.value,
      from: controls.from.value,
      to: controls.to.value,
      setup: byId('measurement-settings').open ? '1' : '0',
      ...Object.fromEntries(
        captureInputs.map(([id, side, kind]) => [
          id,
          captureSelections.get(
            captureKey(map.get(controls[side].value), kind),
          ) || '',
        ]),
      ),
      report:
        reportSelections.get(controls.target.value) ||
        reportFor(map.get(controls.target.value))?.id ||
        '',
    }))
      url.searchParams.set(key, value)
    url.searchParams.delete('compare')
    try {
      history.replaceState(null, '', url)
    } catch {
      /* Local file viewers may not permit history changes. */
    }
  }
  controls.target.addEventListener('change', () =>
    selectEntry(controls.target.value),
  )
  controls.baseline.addEventListener('change', () => {
    chooseSeries()
    setWorkloads(controls.workload.value)
    render()
    remember()
  })
  controls.candidates.addEventListener('change', () => {
    updateVersions(
      controls.target.value,
      controls.baseline.value,
      controls.series.value,
      controls.workload.value,
    )
    render()
    remember()
  })
  for (const key of ['range', 'from', 'to'])
    controls[key].addEventListener('change', () => {
      updateVersions(
        controls.target.value,
        controls.baseline.value,
        controls.series.value,
        controls.workload.value,
        controls.from.value,
        controls.to.value,
        { changedEndpoint: key },
      )
      render()
      remember()
    })
  byId('measurement-settings').addEventListener('toggle', remember)
  byId('controls').addEventListener('submit', (event) => event.preventDefault())
  controls.series.addEventListener('change', () => {
    setWorkloads(controls.workload.value)
    render()
    remember()
  })
  for (const key of ['browser', 'workload'])
    controls[key].addEventListener('change', () => {
      if (key === 'browser')
        for (const side of ['target', 'baseline'])
          captureSelections.delete(`${controls[side].value}:bundle`)
      render()
      remember()
    })
  byId('reset-captures').addEventListener('click', () => {
    captureSelections.clear()
    render()
    remember()
  })
  new ResizeObserver(() => {
    redrawPlots(true)
  }).observe(byId('charts'))
  render()
  remember()
})()
