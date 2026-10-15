#!/usr/bin/env node
/* global console, document, URL */
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { SAMPLE_SITES } from './capture-sites.mjs'

const root = fileURLToPath(new URL('../../..', import.meta.url))
const output = resolve(
  process.env.STORE_SCREENSHOT_OUTPUT ||
    join(root, '.tmp/store-listing-refresh'),
)
const copy = JSON.parse(
  readFileSync(join(root, 'promotional_tiles/store-listings/en.json')),
)
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  )
const pre = (value) => `<pre>${escape(value)}</pre>`
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim()
const mergedCommit = execFileSync('git', ['rev-parse', 'origin/master'], {
  cwd: root,
  encoding: 'utf8',
}).trim()
const hash = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex')
const runtimeDiff = execFileSync(
  'git',
  ['diff', '--', 'packages/extension/src'],
  { cwd: root, encoding: 'utf8' },
)
const proof = {
  preparedAt: new Date().toISOString(),
  sourceCommit,
  mergedCommit,
  runtimeDiffSha256: createHash('sha256').update(runtimeDiff).digest('hex'),
  status: copy.status,
  candidateManifestVersion: '3.0.0',
  captureSites: {
    mode: 'local-fictional-sites',
    catalogueSha256: createHash('sha256')
      .update(JSON.stringify(SAMPLE_SITES))
      .digest('hex'),
  },
  captures: {},
  artworkReferences: [],
  validation: {},
}
mkdirSync(join(output, 'artwork'), { recursive: true })
mkdirSync(join(output, 'video'), { recursive: true })
mkdirSync(join(output, 'source'), { recursive: true })
writeFileSync(join(output, 'source/extension-ui-fix.patch'), runtimeDiff)
cpSync(
  join(root, 'docs/assets/videos/tab-manager-v2-feature-promo.mp4'),
  join(output, 'video/product-tour.mp4'),
)
cpSync(
  join(root, 'docs/assets/images/tab-manager-v2-feature-promo-poster.png'),
  join(output, 'video/poster.png'),
)

const descriptionFor = (store) => {
  if (store !== 'firefox') return copy.description
  return copy.description.replace(
    '\n\nFree and open source.',
    `${copy.firefoxAddition}\n\nFree and open source.`,
  )
}
const captureSets = Object.fromEntries(
  Object.keys(copy.stores).map((store) => {
    const captures = JSON.parse(
      readFileSync(join(output, 'captures', store, 'captures.json')),
    )
    if (captures.length !== 12)
      throw new Error(`Expected twelve captures for ${store}`)
    for (const capture of captures) {
      if (
        capture.fixtures?.catalogueSha256 !== proof.captureSites.catalogueSha256
      )
        throw new Error(`Stale or non-local capture: ${store}/${capture.file}`)
      const path = join(output, 'captures', store, capture.file)
      if (hash(path) !== capture.sha256)
        throw new Error(`Capture checksum mismatch: ${path}`)
      const format = execFileSync(
        'magick',
        ['identify', '-format', '%wx%h %[channels] %[depth]', path],
        { encoding: 'utf8' },
      ).trim()
      if (!/^1280x800 srgb(?:\s+3\.0)?\s+8$/.test(format))
        throw new Error(`Invalid image format: ${path}: ${format}`)
      if (capture.extensionVersion !== '3.0.0')
        throw new Error(`Expected candidate 3.0.0 capture: ${path}`)
    }
    proof.captures[store] = captures
    return [store, captures]
  }),
)

const summaryCount = [...copy.summary].length
for (const theme of ['light', 'dark']) {
  const reference = JSON.parse(
    readFileSync(join(output, 'captures/chrome', `overview-${theme}.json`)),
  )
  if (
    hash(join(output, 'captures/chrome', reference.file)) !== reference.sha256
  )
    throw new Error('Artwork reference checksum mismatch')
  proof.artworkReferences.push(reference)
}
if (summaryCount > 132)
  throw new Error('Summary exceeds Chrome package description limit')
const terms = copy.stores.edge.searchTerms
if (
  terms.length > 7 ||
  terms.join(' ').split(/\s+/).length > 21 ||
  terms.some((term) => term.length > 30)
)
  throw new Error('Edge search terms exceed field limits')
proof.validation = {
  galleryPngs: 36,
  artworkReferencePngs: 2,
  size: '1280×800',
  color: '8-bit RGB, no alpha',
  summaryCharacters: summaryCount,
  edgeTerms: terms.length,
  edgeTermWords: terms.join(' ').split(/\s+/).length,
  extensionRuntimeChanged: runtimeDiff.length > 0,
  screenshotChecks:
    'Viewport, clipping, unexpected tooltips, broken images, checksums, dimensions, color depth, and candidate version checked.',
}

for (const [store, fields] of Object.entries(copy.stores)) {
  const directory = join(output, store)
  mkdirSync(join(directory, 'screenshots'), { recursive: true })
  mkdirSync(join(directory, 'alternates'), { recursive: true })
  mkdirSync(join(directory, 'icons'), { recursive: true })
  const description = descriptionFor(store)
  const selected = []
  for (const [index, shot] of copy.screenshots.entries()) {
    const theme = shot.recommendedTheme
    const file = `${shot.id}-${theme}.png`
    const chosen = index < fields.screenshotCount
    cpSync(
      join(output, 'captures', store, file),
      join(directory, chosen ? 'screenshots' : 'alternates', file),
    )
    selected.push({
      order: index + 1,
      chosen,
      file: `${chosen ? 'screenshots' : 'alternates'}/${file}`,
      headline: shot.headline,
      caption: shot.caption,
    })
  }
  writeFileSync(join(directory, 'summary.txt'), copy.summary + '\n')
  writeFileSync(join(directory, 'description.txt'), description + '\n')
  writeFileSync(join(directory, 'whats-new.txt'), copy.whatsNew + '\n')
  writeFileSync(
    join(directory, 'reviewer-notes.txt'),
    copy.reviewerNotes + '\n',
  )
  writeFileSync(
    join(directory, 'captions.json'),
    JSON.stringify(selected, null, 2),
  )
  const permissions = Object.fromEntries(
    Object.entries(copy.permissionExplanations).filter(
      ([key]) =>
        store === 'firefox' ||
        !['cookies', 'contextualIdentities'].includes(key),
    ),
  )
  writeFileSync(
    join(directory, 'listing.json'),
    JSON.stringify(
      {
        status: copy.status,
        name: copy.name,
        language: copy.language,
        headline: copy.headline,
        summary: copy.summary,
        description,
        whatsNew: copy.whatsNew,
        ...fields,
        links: copy.links,
        singlePurpose: copy.singlePurpose,
        permissionExplanations: permissions,
        privacyReview: copy.privacyReview,
        publisher: copy.publisher,
        license: copy.license,
        pricing: copy.pricing,
        unchangedFields: copy.unchangedFields,
        video: copy.video,
        screenshots: selected,
      },
      null,
      2,
    ),
  )
  cpSync(
    join(root, 'packages/extension/src/img/icon-128.png'),
    join(directory, 'icons/icon-128.png'),
  )
  if (store === 'firefox')
    for (const size of [32, 64])
      execFileSync('magick', [
        join(directory, 'icons/icon-128.png'),
        '-resize',
        `${size}x${size}`,
        join(directory, `icons/icon-${size}.png`),
      ])
  const markdown = `# ${fields.label}: review draft\n\n${copy.status}\n\n## Name\n\n${copy.name}\n\n## Headline\n\n${copy.headline}\n\n## Short description (${summaryCount} characters)\n\n${copy.summary}\n\n## Description\n\n${description}\n\n## What's new\n\n${copy.whatsNew}\n\n## Fields\n\n- Category: ${fields.category}\n- Language: ${copy.language}\n- Publisher: ${copy.publisher}\n- Pricing: ${copy.pricing}\n- License: ${copy.license}\n- Homepage: ${copy.links.homepage}\n- Support: ${copy.links.support}\n- Privacy: ${copy.links.privacy}\n- Support email: ${fields.supportEmail}\n${fields.searchTerms ? '- Search terms: ' + fields.searchTerms.join('; ') + '\n' : ''}${fields.tagsProposed ? '- Proposed tags (confirm available AMO choices): ' + fields.tagsProposed.join(', ') + '\n' : ''}\n## Screenshot order and captions\n\n${selected.map((shot) => `${shot.order}. **${shot.headline}**${shot.chosen ? '' : ' (alternate)'}\n   ${shot.caption}\n   File: ${shot.file}`).join('\n\n')}\n\n## Store-specific preparation notes\n\n${fields.notes.map((note) => '- ' + note).join('\n')}\n\n## Single purpose\n\n${copy.singlePurpose}\n\n## Permission explanations\n\n${Object.entries(
    permissions,
  )
    .map(([key, value]) => `- ${key}: ${value}`)
    .join(
      '\n',
    )}\n\n## Privacy and data-use review\n\n${Object.values(copy.privacyReview).join('\n\n')}\n\n## Certification / reviewer notes\n\n${copy.reviewerNotes}\n\n## Preserve existing fields\n\n${copy.unchangedFields}\n\n## Video\n\n${copy.video.status}\n`
  writeFileSync(join(directory, 'listing-review.md'), markdown)
}

const browser = await chromium.launch({
  executablePath: process.env.STORE_SCREENSHOT_BROWSER_PATH || undefined,
  headless: true,
})
try {
  const icon = `data:image/png;base64,${readFileSync(join(root, 'packages/extension/src/img/icon-128.png')).toString('base64')}`
  const screenshot = `data:image/png;base64,${readFileSync(join(output, 'captures/chrome/00-workspace-overview-light.png')).toString('base64')}`
  for (const [source, name, width, height] of [
    ['store-small-tile.svg', 'small-tile-440x280', 440, 280],
    ['store-marquee.svg', 'marquee-1400x560', 1400, 560],
  ]) {
    const svg = readFileSync(
      join(root, 'promotional_tiles/src', source),
      'utf8',
    )
      .replaceAll('{{ICON_IMAGE}}', icon)
      .replaceAll('{{SCREENSHOT_IMAGE}}', screenshot)
    writeFileSync(join(output, 'artwork', name + '.svg'), svg)
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    })
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`)
    await page.evaluate(() => document.fonts.ready)
    const raw = join(output, 'artwork', name + '-raw.png')
    await page.screenshot({ path: raw })
    execFileSync('magick', [
      raw,
      '-alpha',
      'remove',
      '-alpha',
      'off',
      '-strip',
      '-define',
      'png:color-type=2',
      join(output, 'artwork', name + '.png'),
    ])
    await page.close()
  }
} finally {
  await browser.close()
}
for (const store of ['chrome', 'edge']) {
  cpSync(
    join(output, 'artwork/small-tile-440x280.png'),
    join(output, store, 'small-tile-440x280.png'),
  )
  cpSync(
    join(output, 'artwork/marquee-1400x560.png'),
    join(output, store, 'marquee-1400x560.png'),
  )
}
cpSync(
  join(root, 'packages/integration_test/assets/capture-sites'),
  join(output, 'source/capture-sites'),
  { recursive: true },
)
cpSync(
  join(root, 'packages/integration_test/scripts/capture-sites.mjs'),
  join(output, 'source/capture-sites.mjs'),
)
cpSync(
  join(root, 'promotional_tiles/store-listings/en.json'),
  join(output, 'copy-source.json'),
)
cpSync(
  join(root, 'scripts/preview-release-media.mjs'),
  join(output, 'source/preview-release-media.mjs'),
)
writeFileSync(join(output, 'provenance.json'), JSON.stringify(proof, null, 2))

const fieldsTable = (store, data) => {
  const fields = {
    Name: copy.name,
    'Short description': copy.summary,
    Category: data.category,
    Language: copy.language,
    Publisher: copy.publisher,
    'Price / license': `${copy.pricing} / ${copy.license}`,
    Homepage: copy.links.homepage,
    'Support page': copy.links.support,
    'Support email': data.supportEmail,
    'Privacy policy': copy.links.privacy,
  }
  if (data.searchTerms) fields['Search terms'] = data.searchTerms.join('; ')
  if (data.tagsProposed)
    fields['Proposed tags'] =
      data.tagsProposed.join(', ') + ' — confirm available AMO choices'
  return `<table>${Object.entries(fields)
    .map(
      ([key, value]) =>
        `<tr><th>${escape(key)}</th><td>${/^https:/.test(value) ? `<a href="${escape(value)}" target="_blank" rel="noopener">${escape(value)}</a>` : escape(value)}</td></tr>`,
    )
    .join(
      '',
    )}</table><p><a download href="${store}/listing-review.md">Download all ${escape(data.label)} fields</a> · <a download href="${store}/listing.json">JSON</a></p>`
}
const storeHtml = Object.entries(copy.stores)
  .map(
    (
      [store, data],
      index,
    ) => `<section class="store" id="${store}" ${index ? 'hidden' : ''}>
  <div class="section-top"><div><p class="eyebrow">${escape(data.label)}</p><h2>${escape(copy.headline)}</h2><p class="lead">${escape(copy.summary)}</p></div><span class="pill">${data.screenshotCount} selected screenshots</span></div>
  <h3>Listing fields</h3>${fieldsTable(store, data)}
  <div class="copy-grid"><article><div class="copy-top"><h3>Description</h3><button data-copy="${store}-description">Copy text</button></div><div id="${store}-description">${pre(descriptionFor(store))}</div></article><article><div class="copy-top"><h3>What’s new</h3><button data-copy="${store}-changes">Copy text</button></div><div id="${store}-changes">${pre(copy.whatsNew)}</div><h3>Preparation notes</h3><ul>${data.notes.map((note) => `<li>${escape(note)}</li>`).join('')}</ul></article></div>
  <div class="gallery-heading"><div><h3>Screenshots in gallery order</h3><p>Click a screenshot to inspect it at full size. These are actual ${store === 'chrome' ? 'Chrome for Testing' : data.label.split(' ')[0]} captures.</p></div><label>Appearance <select class="theme-select" data-store="${store}"><option value="recommended">Recommended mix</option><option value="light">All light</option><option value="dark">All dark</option></select></label></div>
  <div class="gallery">${copy.screenshots.map((shot, number) => `<figure class="shot ${number >= data.screenshotCount ? 'alternate' : ''}"><figcaption><div class="copy-top"><h4>${number + 1}. ${escape(shot.headline)}</h4><span class="pill">${number >= data.screenshotCount ? 'Alternate' : 'Selected'}</span></div><p>${escape(shot.caption)}</p></figcaption><button class="image-button" data-store="${store}" data-scene="${shot.id}" data-default="${shot.recommendedTheme}" aria-label="View ${escape(shot.headline)}"><img loading="lazy" width="1280" height="800" src="captures/${store}/${shot.id}-${shot.recommendedTheme}.png" alt="${escape(shot.caption)}"></button><p class="file"><a download href="captures/${store}/${shot.id}-${shot.recommendedTheme}.png">Download PNG</a> · 1280×800 · RGB</p></figure>`).join('')}</div>
  <details><summary>Privacy, permissions, and certification notes</summary><h3>Single purpose</h3><p>${escape(copy.singlePurpose)}</p>${Object.entries(
    copy.permissionExplanations,
  )
    .filter(
      ([permission]) =>
        store === 'firefox' ||
        !['cookies', 'contextualIdentities'].includes(permission),
    )
    .map(
      ([permission, value]) =>
        `<h4>${escape(permission)}</h4><p>${escape(value)}</p>`,
    )
    .join('')}<h3>Privacy and data use</h3>${Object.values(copy.privacyReview)
    .map((value) => `<p>${escape(value)}</p>`)
    .join(
      '',
    )}<h3>Reviewer notes</h3><p>${escape(copy.reviewerNotes)}</p><h3>Unchanged fields</h3><p>${escape(copy.unchangedFields)}</p></details>
</section>`,
  )
  .join('')
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tab Manager v2 — store listing review</title><style>
:root{font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f3f5fa}*{box-sizing:border-box}body{margin:0}header{background:#111827;color:#f7f9ff;padding:42px max(24px,calc((100vw - 1240px)/2))}header p{max-width:830px;color:#c4cce0}h1{font-size:36px;line-height:1.2;letter-spacing:-1px;margin:10px 0}h2{font-size:32px;line-height:1.25;letter-spacing:-.8px;margin:8px 0}h3{font-size:21px;margin:28px 0 12px}h4{margin:0;font-size:17px}a{color:#3d46bd}button,select{font:inherit;border:1px solid #ccd3e2;background:#fff;color:#26334e;border-radius:8px;padding:7px 14px;cursor:pointer}button:hover{background:#edf0ff}button:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #7489e8;outline-offset:3px}nav{background:rgba(255,255,255,.97);border-bottom:1px solid #dce1eb;position:sticky;top:0;z-index:3;padding:12px max(24px,calc((100vw - 1240px)/2));display:flex;gap:8px;flex-wrap:wrap}nav button[aria-pressed=true]{background:#343cb0;border-color:#343cb0;color:white}main{max-width:1288px;margin:auto;padding:32px 24px 64px}.section-top,.gallery-heading,.copy-top{display:flex;justify-content:space-between;gap:20px;align-items:center}.eyebrow{text-transform:uppercase;font-size:12px;letter-spacing:1.4px;font-weight:700;color:#5b6592;margin:0}.lead{font-size:18px;color:#536078}.pill{display:inline-block;background:#e9edf8;color:#465277;border-radius:99px;white-space:nowrap;padding:3px 11px;font-size:12px;font-weight:600}.notice{padding:16px 20px;border:1px solid #ccd4eb;background:#eaf0ff;border-radius:10px;margin-bottom:24px}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dce1eb}th,td{text-align:left;vertical-align:top;padding:12px 16px;border-bottom:1px solid #e8ecf4}th{width:180px;font-size:14px}td{overflow-wrap:anywhere}pre{font:15px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:pre-wrap;margin:0;overflow-wrap:anywhere}.copy-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:24px}.copy-grid article{background:white;padding:24px;border:1px solid #dce1eb;border-radius:12px}.copy-top{margin-bottom:12px}.copy-top h3{margin:0}.copy-grid ul{padding-left:20px;color:#536078}.copy-grid li{margin-bottom:12px}.gallery-heading{margin:30px 0 20px}.gallery-heading h3{margin:0}.gallery-heading p{margin:4px 0;color:#536078;font-size:14px}.gallery-heading label{font-size:14px;white-space:nowrap}.gallery{display:grid;grid-template-columns:1fr 1fr;gap:24px}.shot{margin:0;background:white;border:1px solid #dce1eb;border-radius:12px;overflow:hidden;box-shadow:0 6px 22px #1f2e4b08}.shot figcaption{padding:18px 20px 6px}.shot figcaption p{font-size:14px;color:#536078;margin:6px 0 12px;min-height:45px}.shot .copy-top{gap:10px;margin:0}.image-button{border:0;border-radius:0;padding:0;display:block;width:100%;line-height:0}.image-button img{display:block;width:100%;height:auto}.file{font-size:12px;padding:0 20px;margin:12px 0}.alternate{border-style:dashed}.artwork{display:grid;grid-template-columns:440px 1fr;gap:24px;align-items:start}.artwork img{max-width:100%;height:auto;box-shadow:0 6px 22px #1f2e4b16}.artwork figure{margin:0}.artwork figcaption{font-size:14px;color:#536078}video{width:100%;max-width:960px;border-radius:12px;display:block;background:#111827}details{background:#fff;border:1px solid #dce1eb;border-radius:10px;padding:20px;margin-top:24px}summary{cursor:pointer;font-weight:600}.muted{color:#59677f;font-size:14px}.sources{display:flex;gap:20px;flex-wrap:wrap}dialog{padding:12px;border:0;border-radius:12px;max-width:96vw;width:1310px;background:#f8faff}dialog::backdrop{background:#080d1bd9}dialog img{display:block;width:100%;height:auto;max-height:calc(94vh - 90px);object-fit:contain}dialog .copy-top{margin:0 0 10px}dialog p{margin:0;font-size:14px}@media(max-width:900px){.copy-grid,.gallery,.artwork{grid-template-columns:1fr}.section-top,.gallery-heading{align-items:start;flex-direction:column}.artwork img{max-width:100%}h1{font-size:28px}main{padding:20px 16px}header{padding:28px 20px}nav{padding:10px 16px}th{width:125px}}
</style><header><p class="eyebrow" style="color:#b4b8ff">Local review · Nothing uploaded or published</p><h1>Too many tabs, handled.</h1><p>Refreshed store screenshots, simple listing copy, and promotional artwork for Chrome, Firefox, and Edge.</p></header><nav aria-label="Review sections">${Object.entries(
  copy.stores,
)
  .map(
    ([key, value], index) =>
      `<button data-view="${key}" aria-pressed="${!index}">${escape(value.label)}</button>`,
  )
  .join(
    '',
  )}<button data-view="shared" aria-pressed="false">Artwork, video & capture details</button></nav><main><div class="notice">All screenshots show the real built extension in isolated Chrome, Firefox, and Edge profiles. The temporary capture manifests use <strong>3.0.0</strong>, matching the separate release PR. All screenshots and the product tour use the final merged UI with fictional websites served locally. No external website loads are needed during capture. The tracked package version is unchanged. Store dashboards have not been edited.</div>${storeHtml}<section class="store" id="shared" hidden><h2>Promotional artwork</h2><p>One clear headline, the existing T identity, and a real product image in the marquee. No version number or “coming soon” wording.</p><div class="artwork"><figure><a href="artwork/small-tile-440x280.png" target="_blank"><img width="440" height="280" src="artwork/small-tile-440x280.png" alt="Small tile: Too many tabs, handled."></a><figcaption>Chrome / Edge small tile · 440×280 · <a download href="artwork/small-tile-440x280.png">PNG</a> · <a download href="artwork/small-tile-440x280.svg">SVG source</a></figcaption></figure><figure><a href="artwork/marquee-1400x560.png" target="_blank"><img width="1400" height="560" src="artwork/marquee-1400x560.png" alt="Marquee: Too many tabs, handled, alongside the actual Tab Manager workspace"></a><figcaption>Chrome marquee / Edge large tile · 1400×560 · <a download href="artwork/marquee-1400x560.png">PNG</a> · <a download href="artwork/marquee-1400x560.svg">SVG source</a></figcaption></figure></div><h3>Existing icon</h3><p>The recognizable T icon is retained. Each store folder includes its icon exports; Firefox also has 32×32 and 64×64 versions.</p><img src="chrome/icons/icon-128.png" alt="Tab Manager T icon" width="96" height="96" style="background:white;border-radius:12px;padding:12px"><h3>Proposed store video</h3><p>${escape(copy.video.status)}</p><video controls preload="none" poster="video/poster.png"><source src="video/product-tour.mp4" type="video/mp4"></video><p><a download href="video/product-tour.mp4">Download the product tour</a></p><h3>Capture and asset checks</h3>${pre(JSON.stringify(proof.validation, null, 2))}<p class="muted">Source commit: ${sourceCommit}<br>Merged master: ${mergedCommit}<br>Capture browsers: ${Object.entries(
  captureSets,
)
  .map(([key, captures]) => `${key} ${captures[0].browserVersion}`)
  .join(
    ' · ',
  )}<br>These are native macOS marketing captures. Linux verification is tracked separately from the store review package.</p><p>Fictional sample websites supply titles and icons through real browser tabs. The capture-only local proxy blocks external requests. Settings previews use the extension’s built-in examples. Firefox captions remain separate from its PNGs.</p><p>Private dashboard-only fields, legal identity, and tag picker availability need checking during a separately approved upload. The new short description is prepared for review; it has not been applied to package.json.</p><p><a href="provenance.json" download>Download provenance and all image checksums</a> · <a href="copy-source.json" download>Download shared copy source</a></p><h3>Store guidance checked</h3><div class="sources">${copy.guidance.map((source) => `<a href="${escape(source.url)}" target="_blank" rel="noopener">${escape(source.title)}</a>`).join('')}</div></section></main><dialog id="lightbox"><div class="copy-top"><p id="lightbox-title"></p><button id="close-lightbox">Close</button></div><img id="lightbox-image" alt=""></dialog><script>
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.store').forEach(section=>section.hidden=section.id!==button.dataset.view);document.querySelectorAll('[data-view]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));history.replaceState(null,'','#'+button.dataset.view);window.scrollTo({top:0,behavior:'instant'})}));
const initial=document.querySelector('[data-view="'+location.hash.slice(1)+'"]');if(initial)initial.click();
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const value=document.getElementById(button.dataset.copy).innerText;try{await navigator.clipboard.writeText(value);button.textContent='Copied';setTimeout(()=>button.textContent='Copy text',1600)}catch{button.textContent='Select text to copy'}}));
const dialog=document.getElementById('lightbox');document.querySelectorAll('.image-button').forEach(button=>button.addEventListener('click',()=>{const img=button.querySelector('img');document.getElementById('lightbox-image').src=img.src;document.getElementById('lightbox-image').alt=img.alt;document.getElementById('lightbox-title').textContent=button.closest('figure').querySelector('h4').textContent;dialog.showModal()}));document.getElementById('close-lightbox').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
document.querySelectorAll('.theme-select').forEach(select=>select.addEventListener('change',()=>{document.querySelectorAll('#'+select.dataset.store+' .image-button').forEach(button=>{const theme=select.value==='recommended'?button.dataset.default:select.value;const path='captures/'+button.dataset.store+'/'+button.dataset.scene+'-'+theme+'.png';button.querySelector('img').src=path;button.closest('figure').querySelector('.file a').href=path})}));
</script></html>`
writeFileSync(
  join(output, 'index.html'),
  html.replace(
    '<h3>Existing icon</h3>',
    '<h3>Workspace references</h3><p>The marquee uses this clean overview, without a menu covering the workspace: <a href="captures/chrome/00-workspace-overview-light.png" target="_blank">Light overview</a> · <a href="captures/chrome/00-workspace-overview-dark.png" target="_blank">Dark overview</a>.</p><h3>Existing icon</h3>',
  ),
)
writeFileSync(
  join(output, 'README.md'),
  `# Store listing review\n\nNothing uploaded or published. Open index.html, or serve this folder locally. For video seeking, run \`node source/preview-release-media.mjs . 8778\` from this folder and open http://127.0.0.1:8778/.\n\n- chrome/: five recommended screenshots, Settings alternate, complete fields, icons and promotional tiles\n- firefox/: six recommended screenshots, separate captions, Firefox-specific copy and icons\n- edge/: six recommended screenshots, complete fields, icons and promotional tiles\n- captures/: all thirty-six light/dark PNGs, sample browser tab metadata, capture checksums\n- artwork/: PNG exports and self-contained SVG sources\n- video/: refreshed product tour for review\n- provenance.json: source commits, candidate-manifest disclosure and validation results\n\nThe temporary capture manifest uses 3.0.0 to match the existing release PR. All screenshots and the tour were refreshed using the merged UI and shared local fictional websites. Tracked manifests/package versions were not changed; provenance records the fixture catalogue hash.\n\nStore field suggestions are drafts. Publisher/legal fields remain unchanged. A separately approved upload must check private dashboard fields, available tags, release/package state, and live store results.\n`,
)
console.log(
  `Prepared ${output}/index.html: 36 verified captures; ${summaryCount}-character summary; all three store drafts.`,
)
