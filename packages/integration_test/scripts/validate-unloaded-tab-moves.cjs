/* eslint-disable @typescript-eslint/no-require-imports */
/* global console, fetch, setTimeout, URL */
// Uses the built popup, not a copied move algorithm. Run after pnpm build.
// Chrome: TM_CHROME_BINARY=/path/to/chrome node this-file
// Firefox: TM_BROWSER=firefox TM_FIREFOX_BINARY=/path/to/firefox
//          TM_GECKODRIVER=/path/to/geckodriver node this-file
// On macOS, TM_FIREFOX_APP=/path/to/Firefox.app launches via LaunchServices.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const cp = require('node:child_process')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '../../..')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const kind = process.env.TM_BROWSER || 'chrome'
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-unloaded-'))
const hits = []
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/probe/')) hits.push(req.url)
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-store',
  })
  res.end(
    '<title>Unloaded tab fixture</title><p>Unloaded tab integration fixture</p>',
  )
})
let browserProcess, driverProcess, firefoxPid
let closeSession = async () => {}
async function firefox() {
  const portServer = http.createServer()
  await new Promise((resolve) => portServer.listen(0, '127.0.0.1', resolve))
  const port = portServer.address().port
  await new Promise((resolve) => portServer.close(resolve))
  const marionettePort = port + 1
  const uuid = '8ac5f9eb-0647-420d-ad26-fabe93273531'
  const prefs = {
    'marionette.port': marionettePort,
    'extensions.webextensions.uuids': JSON.stringify({
      '{dd627932-80c4-43bf-8432-db8f47e918ae}': uuid,
    }),
    'browser.shell.checkDefaultBrowser': false,
    'browser.sessionstore.resume_from_crash': false,
  }
  fs.writeFileSync(
    path.join(profile, 'user.js'),
    Object.entries(prefs)
      .map(
        ([key, value]) =>
          `user_pref(${JSON.stringify(key)},${JSON.stringify(value)});`,
      )
      .join('\n'),
  )
  const binary = process.env.TM_FIREFOX_BINARY || 'firefox'
  const args = [
    '-headless',
    '-no-remote',
    '-marionette',
    '-profile',
    profile,
    '--remote-allow-system-access',
    'about:blank',
  ]
  if (process.env.TM_FIREFOX_APP)
    cp.execFileSync('open', [
      '-n',
      process.env.TM_FIREFOX_APP,
      '--args',
      ...args,
    ])
  else browserProcess = cp.spawn(binary, args, { stdio: 'ignore' })
  driverProcess = cp.spawn(
    process.env.TM_GECKODRIVER || 'geckodriver',
    [
      '--port',
      String(port),
      '--connect-existing',
      '--marionette-port',
      String(marionettePort),
    ],
    { stdio: 'ignore' },
  )
  const request = async (route, data, method = 'POST') => {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      ...(data === undefined
        ? {}
        : {
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          }),
    })
    const result = (await response.json()).value
    if (!response.ok) throw new Error(JSON.stringify(result))
    return result
  }
  for (let i = 0; i < 100; i++) {
    try {
      await request('/status', undefined, 'GET')
      break
    } catch {
      await sleep(100)
    }
  }
  const session = await request('/session', {
    capabilities: {
      alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { binary } },
    },
  })
  firefoxPid = session.capabilities['moz:processID']
  const route = `/session/${session.sessionId}`
  closeSession = () => request(route, undefined, 'DELETE')
  await request(route + '/timeouts', { script: 240000 })
  const addon = path.join(profile, 'current-build.zip')
  cp.execFileSync('zip', ['-q', '-r', addon, '.'], {
    cwd: root + '/packages/extension/build/build_firefox',
  })
  await request(route + '/moz/addon/install', { path: addon, temporary: true })
  await request(route + '/window/rect', { width: 1600, height: 1200 })
  await request(route + '/url', {
    url: `moz-extension://${uuid}/popup.html?not_popup=1`,
  })
  return {
    version: session.capabilities.browserVersion,
    run: async (body, ...args) => {
      const result = await request(route + '/execute/async', {
        script: `const args=Array.from(arguments),done=args.pop();(async()=>{${body}})().then(value=>done({value}),e=>done({error:String(e),stack:e.stack}));`,
        args,
      })
      if (result.error) throw new Error(result.error + '\n' + result.stack)
      return result.value
    },
  }
}
async function chrome() {
  const binary =
    process.env.TM_CHROME_BINARY ||
    require('playwright').chromium.executablePath()
  const extension = root + '/packages/extension/build/build_chrome'
  browserProcess = cp.spawn(
    binary,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-pipe',
      '--enable-unsafe-extension-debugging',
      '--window-size=1600,1200',
      `--user-data-dir=${profile}`,
      ...(process.env.TM_CHROME_FLAGS_EXTENSION
        ? [
            `--disable-extensions-except=${extension}`,
            `--load-extension=${extension}`,
          ]
        : []),
    ],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
  )
  const pending = new Map()
  let sequence = 0,
    buffer = ''
  browserProcess.stdio[4].on('data', (chunk) => {
    buffer += chunk.toString()
    let boundary
    while ((boundary = buffer.indexOf('\0')) !== -1) {
      const message = JSON.parse(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 1)
      const task = pending.get(message.id)
      if (task) {
        pending.delete(message.id)
        if (message.error) task.reject(new Error(JSON.stringify(message.error)))
        else task.resolve(message.result)
      }
    }
  })
  browserProcess.on('error', (error) => {
    for (const task of pending.values()) task.reject(error)
    pending.clear()
  })
  browserProcess.on('exit', () => {
    for (const task of pending.values()) task.reject(new Error('Chrome exited'))
    pending.clear()
  })
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++sequence
      pending.set(id, { resolve, reject })
      browserProcess.stdio[3].write(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }) + '\0',
      )
    })
  const version = await send('Browser.getVersion')
  let id
  if (process.env.TM_CHROME_FLAGS_EXTENSION) {
    const expected = JSON.parse(
      fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'),
    )
    // Component extensions may also start workers. Identify our build instead
    // of assuming the first extension worker belongs to Tab Manager.
    for (let i = 0; i < 100 && !id; i++) {
      const targets = await send('Target.getTargets')
      const workers = targets.targetInfos.filter(
        (target) =>
          target.type === 'service_worker' &&
          target.url.startsWith('chrome-extension://') &&
          new URL(target.url).pathname ===
            '/' + expected.background.service_worker,
      )
      for (const worker of workers) {
        const attached = await send('Target.attachToTarget', {
          targetId: worker.targetId,
          flatten: true,
        })
        try {
          await send('Runtime.enable', {}, attached.sessionId)
          const manifest = await send(
            'Runtime.evaluate',
            { expression: 'chrome.runtime.getManifest()', returnByValue: true },
            attached.sessionId,
          )
          if (
            manifest.result?.value?.name === expected.name &&
            manifest.result.value.version === expected.version
          ) {
            id = new URL(worker.url).host
            break
          }
        } finally {
          await send('Target.detachFromTarget', {
            sessionId: attached.sessionId,
          })
        }
      }
      if (!id) await sleep(100)
    }
    assert.ok(id, 'Built Tab Manager extension worker missing')
  } else ({ id } = await send('Extensions.loadUnpacked', { path: extension }))
  const { targetId } = await send('Target.createTarget', {
    url: `chrome-extension://${id}/popup.html?not_popup=1`,
  })
  const { sessionId } = await send('Target.attachToTarget', {
    targetId,
    flatten: true,
  })
  await send('Runtime.enable', {}, sessionId)
  console.log('Browser', version.product, 'extension', id)
  const waitForPopup = async () => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const state = await send(
        'Runtime.evaluate',
        {
          expression:
            "location.protocol === 'chrome-extension:' && document.readyState === 'complete' && typeof chrome.windows?.create === 'function'",
          returnByValue: true,
        },
        sessionId,
      )
      if (state.result?.value === true) return
      await sleep(50)
    }
    const diagnostic = await send(
      'Runtime.evaluate',
      {
        expression:
          '({url:location.href,title:document.title,readyState:document.readyState,windowsApi:typeof globalThis.chrome?.windows,body:document.body?.innerText.slice(0,500)})',
        returnByValue: true,
      },
      sessionId,
    )
    throw new Error(
      'Built extension popup did not become ready: ' +
        JSON.stringify(diagnostic.result?.value),
    )
  }
  await waitForPopup()
  return {
    version: version.product,
    run: async (body, ...args) => {
      // A reload replaces the execution context. Resolve the current global
      // only after navigation has completed and extension APIs are available.
      await waitForPopup()
      const global = await send(
        'Runtime.evaluate',
        {
          expression: 'globalThis',
        },
        sessionId,
      )
      const result = await send(
        'Runtime.callFunctionOn',
        {
          objectId: global.result.objectId,
          functionDeclaration: `async function(...args) { const browser = chrome; ${body} }`,
          arguments: args.map((value) => ({ value })),
          awaitPromise: true,
          returnByValue: true,
        },
        sessionId,
      )
      if (result.exceptionDetails)
        throw new Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    },
  }
}
const scenarios = [
  ...[false, true].flatMap((append) =>
    [0, 1].map((active) => ({
      name: `whole-groups-active-${active}-${append ? 'end' : 'beginning'}`,
      count: 1,
      active,
      append,
      groups: true,
      destinationPins: 1,
    })),
  ),
  { name: 'active-first-200', count: 200, active: 0 },
  { name: 'active-middle', count: 20, active: 10 },
  { name: 'active-last-append', count: 20, active: 20, append: true },
  { name: 'multiple-source-windows', count: 10, active: 0, windows: 3 },
  { name: 'mixed-pins-active-pinned', count: 20, active: 0, pins: 5 },
  { name: 'mixed-pins-active-unpinned', count: 20, active: 10, pins: 5 },
  {
    name: 'mixed-pins-across-source-windows',
    count: 10,
    active: 0,
    pins: 5,
    pinsByWindow: [0, 5],
    windows: 2,
    append: true,
  },
]
;(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const report = {
    browser: kind,
    popupSha256: crypto
      .createHash('sha256')
      .update(
        fs.readFileSync(
          root +
            '/packages/extension/build/build_' +
            (kind === 'firefox' ? 'firefox' : 'chrome') +
            '/popup.js',
        ),
      )
      .digest('hex'),
    commit: cp
      .execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      })
      .trim(),
    cases: [],
  }
  const output =
    root +
    '/.tmp/issue-2651/production-' +
    (process.env.TM_REPORT_NAME || kind) +
    '-results.json'
  fs.mkdirSync(path.dirname(output), { recursive: true })
  try {
    const runtime = await (kind === 'firefox' ? firefox() : chrome())
    report.version = runtime.version
    for (const config of scenarios.filter(
      (c) =>
        (kind === 'chrome' || !c.groups) &&
        (!process.env.TM_CASES ||
          process.env.TM_CASES.split(',').includes(c.name)),
    )) {
      console.log('START', kind, config.name)
      const fixture = await runtime.run(
        `
        const [base,c]=args,windows=[],selected=[],groups=[];
        
        const dest=await browser.windows.create({url:base+'/destination',focused:false});
        if(c.pins||c.destinationPins) await browser.tabs.update(dest.tabs[0].id,{pinned:true});
        if(c.destinationPins) await browser.tabs.create({windowId:dest.id,url:base+'/destination-tail',active:false});
        for(let w=0;w<(c.windows||1);w++){
          const source=await browser.windows.create({url:base+'/probe/'+c.name+'/'+w+'/0',focused:false}); windows.push(source.id);
          const sourcePins=c.pinsByWindow?.[w]??c.pins??0;
          const tabs=[source.tabs[0]];
          for(let i=1;i<=c.count;i++) { tabs.push(await browser.tabs.create({windowId:source.id,url:base+'/probe/'+c.name+'/'+w+'/'+i,active:false,pinned:i<sourcePins})); }
          if(sourcePins) await browser.tabs.update(tabs[0].id,{pinned:true});
          await browser.tabs.update(tabs[c.active].id,{active:true});
          let ready=false;
          for(let i=0;i<300;i++){if((await browser.tabs.query({windowId:source.id})).every(t=>t.status==='complete')){ready=true;break;}await new Promise(r=>setTimeout(r,100));}
          if(!ready)throw new Error('Initial loads incomplete');
          if(c.groups)for(const [i,tab] of tabs.entries()){const id=await browser.tabs.group({tabIds:[tab.id],createProperties:{windowId:source.id}});groups.push({...await browser.tabGroups.update(id,{title:'Group-'+i,color:i===0?'blue':'green'}),tabIds:[tab.id]});}
          // Creating a native group can activate its tab. Set the source's
          // intended active tab after grouping before discarding the others.
          if(c.groups)await browser.tabs.update(tabs[c.active].id,{active:true});
          for(const tab of tabs)if(tab.id!==tabs[c.active].id)await browser.tabs.discard(tab.id);
          selected.push(...(await browser.tabs.query({windowId:source.id})).sort((a,b)=>a.index-b.index));
        }
        const destination=await browser.tabs.query({windowId:dest.id});
        
        for(const group of groups)group.tabIds=selected.filter(tab=>tab.groupId===group.id).map(tab=>tab.id);
        return {windows,selected,dest:dest.id,destination,groups};
      `,
        base,
        config,
        kind,
      )
      assert.equal(
        fixture.selected.filter((tab) => tab.discarded).length,
        config.count * (config.windows || 1),
      )
      // Hydrate the popup from finalized browser state before selecting.
      await runtime.run(`location.reload();return true;`)
      await sleep(500)
      await runtime.run(
        `
        const [s,c]=args;
        window.unloadEvents=[];window.unloadListener=(id,change)=>{if(s.selected.some(t=>t.id===id)&&change.status==='loading')window.unloadEvents.push(id)};
        browser.tabs.onUpdated.addListener(window.unloadListener);
        for(let attempt=0;attempt<200;attempt++){
          if(s.windows.every(id=>document.querySelector('[data-testid="window-card-'+id+'"] input[aria-label="Select all tabs"]'))&&document.querySelector('[data-testid="window-drop-zone-'+(c.append?'bottom':'top')+'-'+s.dest+'"]'))break;
          await new Promise(r=>setTimeout(r,100));
        }
        for(const id of s.windows){const control=document.querySelector('[data-testid="window-card-'+id+'"] input[aria-label="Select all tabs"]');if(!control)throw new Error('Selection control missing');control.click();}
        await new Promise(r=>setTimeout(r,300));
      `,
        fixture,
        config,
      )
      hits.length = 0
      await runtime.run(
        `
        const [s,c]=args;
        if(c.groups){
          const actions=document.querySelector('[data-testid="window-title-'+s.dest+'"] button[aria-label="Window actions"]');
          if(!actions)throw new Error('Window actions missing');
          actions.click();
          const label='Move selected to '+(c.append?'end':'beginning');
          let item;
          for(let i=0;i<200;i++){item=Array.from(document.querySelectorAll('[role="menuitem"]')).find(node=>node.textContent.startsWith(label));if(item)break;await new Promise(r=>setTimeout(r,50));}
          if(!item)throw new Error('Window edge action missing');
          item.click();return true;
        }
        const card=document.querySelector('[data-testid="window-card-'+s.windows[0]+'"]');card?.scrollIntoView({block:'start'});
        for(let ancestor=card?.parentElement;ancestor;ancestor=ancestor.parentElement){if(ancestor.scrollHeight>ancestor.clientHeight)ancestor.scrollTop+=card.getBoundingClientRect().top-ancestor.getBoundingClientRect().top;}
        let row;for(let i=0;i<100;i++){row=document.querySelector('[data-testid="window-card-'+s.windows[0]+'"] [data-testid^="tab-row-"]');if(row)break;await new Promise(r=>setTimeout(r,100));}
        const source=row?.closest('[draggable="true"]')||row;
        const target=document.querySelector('[data-testid="window-drop-zone-'+(c.append?'bottom':'top')+'-'+s.dest+'"]');
        if(!source||!target)throw new Error('Drop controls missing');
        const a=source.getBoundingClientRect(),b=target.getBoundingClientRect(),dataTransfer=new DataTransfer();
        for(const [type,node,rect] of [['dragstart',source,a],['dragenter',target,b],['dragover',target,b],['drop',target,b],['dragend',source,b]])node.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,clientX:rect.left+(type==='dragstart'?rect.width/2:Math.min(16,rect.width/2)),clientY:rect.top+rect.height/2,dataTransfer}));
      `,
        fixture,
        config,
      )
      const result = await runtime.run(
        `
        const s=args[0];let after;
        for(let attempt=0;attempt<600;attempt++){after=await Promise.all(s.selected.map(t=>browser.tabs.get(t.id)));if(after.every(t=>t.windowId===s.dest))break;await new Promise(r=>setTimeout(r,100));}
        await new Promise(r=>setTimeout(r,1500));
        after=await Promise.all(s.selected.map(t=>browser.tabs.get(t.id)));
        const destination=(await browser.tabs.query({windowId:s.dest})).sort((a,b)=>a.index-b.index);
        browser.tabs.onUpdated.removeListener(window.unloadListener);
        const groups=s.groups.length?await browser.tabGroups.query({windowId:s.dest}):[];
        return {after,destination,groups,loadingEvents:window.unloadEvents};
      `,
        fixture,
      )
      // Popup top/bottom zones respect the destination pinned boundary.
      const orderedSources = fixture.windows
        .slice()
        .sort((a, b) => a - b)
        .flatMap((id) => fixture.selected.filter((t) => t.windowId === id))
      const pinned = orderedSources.filter((t) => t.pinned)
      const unpinned = orderedSources.filter((t) => !t.pinned)
      const destinationPins = fixture.destination.filter((t) => t.pinned)
      const destinationLoose = fixture.destination.filter((t) => !t.pinned)
      const expected = config.append
        ? [...destinationPins, ...pinned, ...destinationLoose, ...unpinned]
        : [...pinned, ...destinationPins, ...unpinned, ...destinationLoose]
      const entry = {
        name: config.name,
        discardedBefore: fixture.selected.filter((t) => t.discarded).length,
        discardedAfter: result.after.filter((t) => t.discarded).length,
        reloadRequests: hits.length,
        loadingEvents: result.loadingEvents,
        allMoved: result.after.every((t) => t.windowId === fixture.dest),
        orderCorrect:
          JSON.stringify(result.destination.map((t) => t.id)) ===
          JSON.stringify(expected.map((t) => t.id)),
        ...(config.groups
          ? {
              // Verify each group's membership, title, and color.
              groupsPreserved:
                result.groups.length === fixture.groups.length &&
                fixture.groups.every((before) =>
                  result.groups.some(
                    (after) =>
                      after.title === before.title &&
                      after.color === before.color &&
                      JSON.stringify(
                        result.after
                          .filter((tab) => tab.groupId === after.id)
                          .map((tab) => tab.id),
                      ) === JSON.stringify(before.tabIds),
                  ),
                ),
            }
          : {}),
        pinningPreserved: result.after.every(
          (t) =>
            t.pinned ===
            fixture.selected.find((before) => before.id === t.id).pinned,
        ),
        expected: expected.map((t) => ({ id: t.id, pinned: t.pinned })),
        actual: result.destination.map((t) => ({ id: t.id, pinned: t.pinned })),
        destinationActivePreserved:
          result.destination.find((t) => t.active)?.id ===
          fixture.destination.find((t) => t.active)?.id,
      }
      report.cases.push(entry)
      fs.writeFileSync(output, JSON.stringify(report, null, 2))
      console.log(
        JSON.stringify(
          Object.fromEntries(
            Object.entries(entry).filter(
              ([key]) => !['expected', 'actual'].includes(key),
            ),
          ),
        ),
      )
      assert.equal(entry.allMoved, true)
      assert.equal(entry.discardedAfter, entry.discardedBefore)
      assert.equal(entry.reloadRequests, 0)
      assert.deepEqual(entry.loadingEvents, [])
      assert.equal(entry.orderCorrect, true)
      assert.equal(entry.pinningPreserved, true)
      if (config.groups) assert.equal(entry.groupsPreserved, true)
      // Native group moves let Chrome choose the destination's active tab.
      // Loose-tab moves must retain the previously active destination tab.
      if (!config.groups) assert.equal(entry.destinationActivePreserved, true)
      await runtime.run(
        `for(const id of args[0]){try{await browser.windows.remove(id)}catch{}}`,
        [...fixture.windows, fixture.dest],
      )
    }
  } finally {
    await closeSession().catch(() => {})
    if (browserProcess) browserProcess.kill('SIGTERM')
    if (driverProcess) driverProcess.kill('SIGTERM')
    if (firefoxPid) {
      try {
        process.kill(firefoxPid, 'SIGTERM')
      } catch {
        /* The isolated Firefox process may already have exited. */
      }
    }
    await sleep(500)
    fs.rmSync(profile, { recursive: true, force: true })
    server.close()
  }
})().catch((error) => {
  console.error(error)
  server.close()
  process.exitCode = 1
})
