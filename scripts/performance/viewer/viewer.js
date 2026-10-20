/* global document, window, ResizeObserver, URL, history */
;(() => {
  const data = JSON.parse(
    document.getElementById('performance-records').textContent,
  )
  const byId = (id) => document.getElementById(id)
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
  byId('comparison').open = query.get('compare') === '1'
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
  const chooseSeries = (preferred) => {
    groups.clear()
    for (const record of entries
      .flatMap((entry) => entry.records)
      .filter((record) => record.runtime))
      groups.set(record.runtime.compatibilityKey, record.runtime.environment)
    const current = controls.series.value
    controls.series.replaceChildren()
    for (const [key, env] of groups) {
      const observations = entries
        .flatMap((entry) => entry.records)
        .filter((record) => record.runtime?.compatibilityKey === key)
      const coverage = entries.filter((entry) =>
        entry.records.some(
          (record) => record.runtime?.compatibilityKey === key,
        ),
      ).length
      option(
        controls.series,
        key,
        `${coverage}/${entries.length} versions · ${observations.at(-1).recordedAt.slice(0, 10)} · ${env.runner || `${env.platform}/${env.arch}`} · Chrome ${env.browser} · ${key.slice(0, 8)}`,
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
    const values = [
      ...new Set(
        entries
          .flatMap((entry) => entry.records)
          .filter(
            (record) =>
              record.runtime?.compatibilityKey === controls.series.value,
          )
          .flatMap((record) =>
            record.runtimeSummary.workloads.map(
              (workload) => workload.sourceTabs,
            ),
          ),
      ),
    ].sort((a, b) => a - b)
    controls.workload.replaceChildren()
    for (const value of values)
      option(
        controls.workload,
        String(value),
        `${(value + 12).toLocaleString()} tabs`,
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
    changedEndpoint,
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
  )
  const bundleFor = (entry) =>
    entry?.records
      .filter((record) =>
        record.bundles.some(
          (bundle) => bundle.browser === controls.browser.value,
        ),
      )
      .at(-1)
  const runtimeFor = (entry) =>
    entry?.records
      .filter(
        (record) => record.runtime?.compatibilityKey === controls.series.value,
      )
      .at(-1)
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
      title: 'Startup ready',
      unit: 'ms',
      subtitle: () =>
        `${controls.workload.selectedOptions[0]?.textContent || 'No workload'} · Chrome profiling`,
      get: (entry) => workloadFor(entry)?.startup,
    },
    {
      title: 'Search results update',
      unit: 'ms',
      subtitle: () =>
        `${controls.workload.selectedOptions[0]?.textContent || 'No workload'} · Needle · includes debounce`,
      get: (entry) => workloadFor(entry)?.narrowSearch,
    },
    {
      title: 'Group-drag rendering',
      unit: 'ms',
      subtitle: () => `1,012 tabs · React render time`,
      get: (entry) => runtimeFor(entry)?.runtimeSummary.drag?.render,
    },
    {
      title: 'JS heap after group drag',
      unit: 'MB',
      subtitle: () => `1,012 tabs · after garbage collection`,
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
  const plots = definitions.map((definition) => {
    const figure = document.createElement('figure')
    figure.className = 'plot'
    const header = document.createElement('div')
    header.className = 'plot-header'
    const title = document.createElement('h2')
    title.textContent = definition.title
    const delta = document.createElement('span')
    delta.className = 'delta'
    const caption = document.createElement('figcaption')
    const value = document.createElement('p')
    value.className = 'comparison-value'
    const selectedValue = document.createElement('strong')
    const baselineValue = document.createElement('small')
    value.append(selectedValue, baselineValue)
    const svg = document.createElementNS(namespace, 'svg')
    svg.classList.add('chart')
    svg.setAttribute('role', 'group')
    header.append(title, delta)
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
    }
  })
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
      height = 232
    const values = entries.map((entry, index) => ({
      entry,
      index,
      stat: definition.get(entry),
    }))
    const targetStat = definition.get(target),
      baseStat = definition.get(base)
    const format = (stat) =>
      stat
        ? `${stat.median.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${definition.unit}`
        : 'Not measured'
    selectedValue.textContent = format(targetStat)
    baselineValue.textContent = `${base ? entryLabel(base) : 'Baseline'}: ${format(baseStat)}`
    delta.textContent =
      targetStat && baseStat && baseStat.median > 0
        ? `${percentChange(targetStat.median, baseStat.median)} vs baseline`
        : 'Comparison unavailable'
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
    const left = 60,
      right = width - 18,
      top = 12,
      bottom = 164
    svgNode(svg, 'rect', {
      class: 'frame',
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    })
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
        x: 14,
        y: (top + bottom) / 2,
        transform: `rotate(-90 14 ${(top + bottom) / 2})`,
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
        tabindex: '0',
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
      interactive.addEventListener('click', () => selectEntry(point.entry.key))
      interactive.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          selectEntry(point.entry.key)
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
      marker.setAttribute('class', `point ${isBase ? 'selected-baseline' : ''}`)
      svgNode(
        marker,
        'title',
        {},
        `${entryLabel(point.entry)}: ${stat.median.toFixed(1)} ${definition.unit}; ${stat.count} observations, min ${stat.min.toFixed(1)}, max ${stat.max.toFixed(1)}`,
      )
      if (values.length <= 4 || current)
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
      { x: (left + right) / 2, y: 225, 'text-anchor': 'middle' },
      entries.some((entry) => entry.source.status !== 'released')
        ? 'Version · * candidate'
        : 'Version',
    )
  }
  function details() {
    const target = map.get(controls.target.value),
      base = map.get(controls.baseline.value)
    const bundle = bundleFor(target),
      runtime = runtimeFor(target),
      environment = groups.get(controls.series.value)
    byId('notice').textContent = runtime
      ? `Runtime series covers ${entries.filter((entry) => runtimeFor(entry)).length}/${entries.length} shown versions: ${environment.runner || environment.platform} · Chrome ${environment.browser} · viewport ${environment.viewport.width}×${environment.viewport.height}${environment.referenceCommit ? ` · fixed reference ${map.get(environment.referenceCommit)?.source.version || environment.referenceCommit.slice(0, 8)}` : ''}. Measurement differences are advisory.`
      : 'Runtime has not been measured for this version in the selected series. Missing points are not zero.'
    byId('baseline-name').textContent = base ? entryLabel(base) : 'No baseline'
    byId('target-name').textContent = entryLabel(target)
    byId('more').replaceChildren()
    const fields = [
      [
        'Package unpacked bytes',
        (entry) =>
          bundleFor(entry)?.bundles.find(
            (item) => item.browser === controls.browser.value,
          ).summary.unpackedBytes,
      ],
      [
        'Settings preview bytes',
        (entry) =>
          bundleFor(entry)?.bundles.find(
            (item) => item.browser === controls.browser.value,
          ).summary.settingsPreviewBytes,
      ],
      [
        'Broad search median ms',
        (entry) => workloadFor(entry)?.broadSearch.median,
      ],
      [
        'Search input paint median ms',
        (entry) => workloadFor(entry)?.searchPaint.median,
      ],
      [
        'Startup JS heap MB',
        (entry) => {
          const value = workloadFor(entry)?.startupHeap.median
          return value === undefined ? undefined : value / 1e6
        },
      ],
      [
        'Post-scroll JS heap MB',
        (entry) => {
          const value =
            runtimeFor(entry)?.runtimeSummary.drag?.postScrollHeap.median
          return value === undefined ? undefined : value / 1e6
        },
      ],
      [
        'Peak mounted rows during drag',
        (entry) => runtimeFor(entry)?.runtimeSummary.drag?.peakRows.median,
      ],
      [
        'Detached DOM refs after scroll',
        (entry) =>
          runtimeFor(entry)?.runtimeSummary.drag?.detachedReferences.median,
      ],
    ]
    for (const [label, get] of fields) {
      const row = document.createElement('tr')
      const name = document.createElement('td')
      name.textContent = label
      row.append(name)
      for (const entry of [base, target]) {
        const cell = document.createElement('td'),
          value = get(entry)
        cell.textContent = Number.isFinite(value)
          ? value.toLocaleString(undefined, { maximumFractionDigits: 3 })
          : 'Unavailable'
        row.append(cell)
      }
      byId('more').append(row)
    }
    const link = document.createElement('a')
    link.href = `https://github.com/xcv58/Tab-Manager-v2/commit/${target.source.commit}`
    link.textContent = target.source.commit
    byId('source').replaceChildren(
      document.createTextNode(
        `${entryLabel(target)} · ${target.source.status}${target.source.dirty ? ' · includes uncommitted source changes' : ''} · `,
      ),
      link,
    )
    const notes = [
      ...new Set(
        [bundle, runtime]
          .filter(Boolean)
          .map((record) => record.provenance.note)
          .filter(Boolean),
      ),
    ]
    byId('provenance-note').textContent = notes.join(' ')
    byId('records').replaceChildren()
    const selected = [...new Set([bundle, runtime].filter(Boolean))]
    for (const record of selected) {
      const row = document.createElement('li'),
        link = document.createElement('a')
      link.href = `records/${encodeURIComponent(record.id)}.json`
      link.textContent = `${record.runtime ? 'Runtime' : 'Bundle'} record: ${record.id}`
      row.append(
        link,
        document.createTextNode(
          ` · ${record.recordedAt} · ${record.provenance.runner}`,
        ),
      )
      if (record.runtime && record.bundles.length)
        row.append(
          document.createTextNode(' · includes packaged bundle evidence'),
        )
      byId('records').append(row)
    }
  }
  function render() {
    byId('history-summary').textContent =
      `${entries.length} of ${eligibleEntries.length} archived versions · ${entryLabel(entries[0])} through ${entryLabel(entries.at(-1))}. Charts show the full selected range; highlighted values show ${entryLabel(map.get(controls.target.value))}.`
    for (const plot of plots) draw(plot)
    details()
    releaseTable()
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
    byId('comparison').open = true
    render()
    remember()
    controls.target.focus({ preventScroll: true })
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
      button.textContent = entryLabel(entry)
      button.setAttribute(
        'aria-pressed',
        String(entry.key === controls.target.value),
      )
      button.addEventListener('click', () => selectEntry(entry.key))
      const date = document.createElement('small')
      const published = entry.records
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
          : 'Not measured'
        if (stat && baseline && baseline.median > 0) {
          const change = document.createElement('small')
          change.textContent = percentChange(stat.median, baseline.median)
          change.title = `Compared with ${entryLabel(previous)}`
          cell.append(change)
        }
        row.append(cell)
      }
      const origin = document.createElement('td')
      const record = bundleFor(entry)
      const bundle = record?.bundles.find(
        (item) => item.browser === controls.browser.value,
      )
      origin.textContent = bundle
        ? bundle.origin === 'published-release'
          ? 'Published ZIP'
          : record.provenance.kind === 'packaged-bundles'
            ? 'Release build'
            : 'Source rebuild'
        : 'Not measured'
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
      compare: byId('comparison').open ? '1' : '0',
    }))
      url.searchParams.set(key, value)
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
        key,
      )
      render()
      remember()
    })
  byId('comparison').addEventListener('toggle', remember)
  controls.series.addEventListener('change', () => {
    setWorkloads(controls.workload.value)
    render()
    remember()
  })
  for (const key of ['browser', 'workload'])
    controls[key].addEventListener('change', () => {
      render()
      remember()
    })
  new ResizeObserver(() => {
    for (const plot of plots) draw(plot)
  }).observe(byId('charts'))
  render()
  remember()
})()
