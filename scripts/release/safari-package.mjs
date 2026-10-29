// Runs only in a protected, serialized, default-branch candidate job. This file
// signs/exports locally; it has no Apple upload or submission operation.
import { execFileSync } from 'node:child_process'
import { X509Certificate, randomBytes } from 'node:crypto'
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import {
  assert,
  gh,
  optionalRelease,
  pages,
  readJsonAsset,
  repository,
  uploadImmutable,
} from './github.mjs'
import { git, json, sha256 } from '../performance/records.mjs'
import { assertReleaseVersion, readReleaseVersion } from '../release-policy.mjs'
import {
  appleClient,
  appleBuilds,
  appleUploads,
  nextBuildNumber,
} from './safari-api.mjs'
import {
  safari,
  safariNotesPath,
  validateSafari,
  validateSafariNotes,
} from './safari-model.mjs'

const run = (command, args, options = {}) => {
  try {
    return (
      execFileSync(command, args, {
        encoding: 'utf8',
        maxBuffer: 128 * 1024 * 1024,
        ...options,
      })?.trim() || ''
    )
  } catch (error) {
    // security's argv may contain the P12/keychain password. Never propagate
    // child_process's command dump or credential-bearing error object.
    if (command === 'security')
      throw new Error(
        `Signing keychain operation failed: ${args[0]}. Check the P12 password, private keys, certificate validity and profile pairing.`,
      )
    throw error
  }
}
const plist = (path) =>
  JSON.parse(run('plutil', ['-convert', 'json', '-o', '-', path]))
const publicCertificate = (certificate) => ({
  fingerprint: certificate.fingerprint.replaceAll(':', ''),
  sha256: certificate.fingerprint256.replaceAll(':', ''),
  expiresAt: certificate.validTo,
  subject: certificate.subject,
})

async function allocate(apple) {
  let ledger = await optionalRelease(safari.ledgerTag)
  if (!ledger)
    ledger = JSON.parse(
      gh([
        'api',
        '--method',
        'POST',
        `repos/${repository}/releases`,
        '-f',
        `tag_name=${safari.ledgerTag}`,
        '-f',
        `target_commitish=${process.env.GITHUB_SHA}`,
        '-F',
        'draft=true',
        '-F',
        'prerelease=true',
        '-f',
        'name=Safari native build reservations (do not publish/delete)',
      ]),
    )
  assert(
    ledger.draft && ledger.prerelease,
    'Safari build ledger must remain a private draft release',
  )
  const allocations = []
  for (const asset of await pages(`releases/${ledger.id}/assets`)) {
    assert(
      /^allocation-\d+-\d+\.json$/.test(asset.name),
      'unexpected Safari ledger asset',
    )
    const saved = await readJsonAsset(asset, 'Safari build allocation')
    assert(
      saved,
      'incomplete Safari allocation; reconcile ledger before continuing',
    )
    const value = saved.value
    assert(
      value.appId === safari.appId &&
        /^[a-f0-9]{40}$/.test(value.commit) &&
        asset.name === `allocation-${value.runId}-${value.attempt}.json`,
      'invalid Safari allocation',
    )
    allocations.push(value)
  }
  const runId = process.env.GITHUB_RUN_ID,
    attempt = Number(process.env.GITHUB_RUN_ATTEMPT)
  const previous = allocations.find(
    (a) => String(a.runId) === runId && a.attempt === attempt,
  )
  assert(
    !previous,
    'This candidate attempt already reserved a native build. Re-run all jobs for a fresh candidate and digest; do not rebuild an approved package.',
  )
  const buildNumber = nextBuildNumber(
    await appleBuilds(apple),
    await appleUploads(apple),
    allocations,
  )
  const value = {
    schemaVersion: 1,
    appId: safari.appId,
    buildNumber,
    runId,
    attempt,
    commit: git(['rev-parse', 'HEAD']),
    recordedAt: new Date().toISOString(),
  }
  const file = resolve('.tmp', `allocation-${runId}-${attempt}.json`)
  await mkdir(resolve('.tmp'), { recursive: true })
  await writeFile(file, json(value))
  await uploadImmutable(ledger, file)
  return value
}

function profileInfo(path, bundleId, certificate) {
  // Provisioning plists contain Data and Date values, which plutil's JSON
  // conversion cannot represent on all supported Xcode hosts.
  const value = JSON.parse(
    run(
      'python3',
      [
        '-c',
        'import sys,plistlib,json,base64,datetime; print(json.dumps(plistlib.loads(sys.stdin.buffer.read()),default=lambda v: base64.b64encode(v).decode() if isinstance(v,bytes) else v.replace(tzinfo=datetime.timezone.utc).isoformat()))',
      ],
      { input: run('security', ['cms', '-D', '-i', path]) },
    ),
  )
  const e = value.Entitlements
  assert(
    value.TeamIdentifier?.includes(safari.teamId) &&
      (e['com.apple.application-identifier'] || e['application-identifier']) ===
        `${safari.teamId}.${bundleId}`,
    `Wrong production profile for ${bundleId}`,
  )
  assert(
    !value.ProvisionedDevices &&
      !value.ProvisionsAllDevices &&
      !e['get-task-allow'] &&
      !e['com.apple.security.get-task-allow'],
    `Profile for ${bundleId} is not App Store distribution`,
  )
  assert(
    e['com.apple.security.application-groups']?.includes(safari.appGroup),
    `Missing production App Group in ${bundleId} profile`,
  )
  assert(
    Date.parse(value.ExpirationDate) > Date.now() + 86400000,
    `Profile for ${bundleId} expires within 24h; renew it before preparing a new candidate`,
  )
  assert(
    value.DeveloperCertificates.some(
      (c) =>
        new X509Certificate(Buffer.from(c, 'base64')).fingerprint.replaceAll(
          ':',
          '',
        ) === certificate,
    ),
    `Profile for ${bundleId} does not contain the Apple Distribution certificate`,
  )
  return { bundleId, uuid: value.UUID, expiresAt: value.ExpirationDate }
}

async function verifyApp(app, version, buildNumber, profiles, certificate) {
  const extension = join(app, 'Contents/PlugIns/SafariBridge.appex')
  run('codesign', ['--verify', '--deep', '--strict', app])
  run('node', ['packages/safari-native/Tools/verify-build.mjs'], {
    env: {
      ...process.env,
      SAFARI_BUILD_CONFIGURATION: 'Release',
      SAFARI_VERIFY_APP: app,
    },
    stdio: 'inherit',
  })
  for (const [bundle, id, executable] of [
    [app, safari.bundleId, 'TabManagerSafariPrototype'],
    [extension, safari.extensionId, 'SafariBridge'],
  ]) {
    const info = plist(join(bundle, 'Contents/Info.plist'))
    assert(
      info.CFBundleIdentifier === id &&
        info.CFBundleShortVersionString === version &&
        info.CFBundleVersion === buildNumber,
      'Native bundle identity/version differs',
    )
    assert(
      run('lipo', ['-archs', join(bundle, `Contents/MacOS/${executable}`)])
        .split(/\s+/)
        .sort()
        .join(',') === 'arm64,x86_64',
      'Safari must be universal arm64/x86_64',
    )
    const entitlements = JSON.parse(
      run('plutil', ['-convert', 'json', '-o', '-', '-'], {
        input: run('codesign', ['-d', '--entitlements', ':-', bundle]),
      }),
    )
    assert(
      entitlements['com.apple.security.app-sandbox'] === true &&
        entitlements['com.apple.security.application-groups']?.join(',') ===
          safari.appGroup &&
        !entitlements['get-task-allow'] &&
        !entitlements['com.apple.security.get-task-allow'],
      'Unsafe or incorrect distribution entitlements',
    )
    assert(
      entitlements['com.apple.developer.team-identifier'] === safari.teamId &&
        (entitlements['com.apple.application-identifier'] ||
          entitlements['application-identifier']) === `${safari.teamId}.${id}`,
      'Signed team/application identifier differs',
    )
    const embedded = profileInfo(
      join(bundle, 'Contents/embedded.provisionprofile'),
      id,
      certificate,
    )
    assert(
      embedded.uuid === profiles.find((p) => p.bundleId === id).uuid,
      'Embedded provisioning profile differs',
    )
    // Verify the actual leaf signer, not just the keychain inventory.
    const prefix = join(resolve('.tmp'), `safari-leaf-${executable}`)
    run('codesign', ['-d', '--extract-certificates', prefix, bundle])
    assert(
      new X509Certificate(await readFile(`${prefix}0`)).fingerprint.replaceAll(
        ':',
        '',
      ) === certificate,
      'Bundle signed by an unexpected certificate',
    )
  }
}

async function findApps(directory) {
  const results = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = join(directory, entry.name)
    if (entry.name.endsWith('.app')) results.push(path)
    else results.push(...(await findApps(path)))
  }
  return results
}

async function main() {
  assert(
    process.env.GITHUB_REPOSITORY === repository &&
      process.env.GITHUB_REF_NAME === 'master' &&
      git(['rev-parse', 'HEAD']) === process.env.GITHUB_SHA,
    'Safari packaging requires trusted frozen master',
  )
  assert(
    run('xcodebuild', ['-version']) ===
      `Xcode ${safari.xcode}\nBuild version ${safari.xcodeBuild}` &&
      run('xcodegen', ['--version']) === `Version: ${safari.xcodegen}`,
    'Selected Xcode/XcodeGen differs from pinned toolchain',
  )
  assert(
    !git(['status', '--porcelain', '--untracked-files=no']),
    'Safari candidate source is dirty',
  )
  const version = assertReleaseVersion(readReleaseVersion())
  const whatsNew = validateSafariNotes(
    JSON.parse(await readFile(safariNotesPath(version), 'utf8')),
  )
  for (const name of [
    'SAFARI_CERTIFICATES_P12',
    'SAFARI_CERTIFICATES_PASSWORD',
    'SAFARI_APP_PROFILE',
    'SAFARI_EXTENSION_PROFILE',
  ])
    assert(
      process.env[name],
      `Missing ${name} in safari-app-store; see packages/safari-native/RELEASE.md`,
    )
  const apple = appleClient()
  await apple.checkApp()
  const temporary = await mkdtemp(join(tmpdir(), 'tm-safari-signing-'))
  await chmod(temporary, 0o700)
  const keychain = join(temporary, 'signing.keychain-db')
  const password = randomBytes(32).toString('hex')
  const priorKeychains =
    run('security', ['list-keychains', '-d', 'user'])
      .match(/"([^"]+)"/g)
      ?.map((s) => s.slice(1, -1)) || []
  const installed = []
  const project = 'packages/safari-native/project.yml'
  const original = await readFile(project, 'utf8')
  try {
    const p12 = join(temporary, 'certificates.p12')
    await writeFile(
      p12,
      Buffer.from(process.env.SAFARI_CERTIFICATES_P12, 'base64'),
      { mode: 0o600 },
    )
    run('security', ['create-keychain', '-p', password, keychain])
    run('security', ['set-keychain-settings', '-lut', '21600', keychain])
    run('security', ['unlock-keychain', '-p', password, keychain])
    run('security', [
      'import',
      p12,
      '-k',
      keychain,
      '-P',
      process.env.SAFARI_CERTIFICATES_PASSWORD,
      '-T',
      '/usr/bin/codesign',
      '-T',
      '/usr/bin/productsign',
      '-T',
      '/usr/bin/productbuild',
    ])
    run('security', [
      'set-key-partition-list',
      '-S',
      'apple-tool:,apple:,codesign:',
      '-s',
      '-k',
      password,
      keychain,
    ])
    run('security', [
      'list-keychains',
      '-d',
      'user',
      '-s',
      keychain,
      ...priorKeychains,
    ])
    const certificates = (
      run('security', ['find-certificate', '-a', '-p', keychain]).match(
        /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
      ) || []
    )
      .map((pem) => new X509Certificate(pem))
      .map(publicCertificate)
    const select = (name) => {
      const matches = certificates.filter(
        (c) =>
          c.subject.includes(`CN=${name}:`) &&
          c.subject.includes(`OU=${safari.teamId}`),
      )
      assert(
        matches.length === 1,
        `P12 must contain exactly one ${name} identity for ${safari.teamId}`,
      )
      assert(
        Date.parse(matches[0].expiresAt) > Date.now() + 86400000,
        `${name} certificate expires within 24h; renew it`,
      )
      return matches[0].fingerprint
    }
    const applicationCertificate = select('Apple Distribution'),
      installerCertificate = select('3rd Party Mac Developer Installer')
    const profiles = []
    for (const [name, id] of [
      ['SAFARI_APP_PROFILE', safari.bundleId],
      ['SAFARI_EXTENSION_PROFILE', safari.extensionId],
    ]) {
      const file = join(temporary, `${name}.provisionprofile`)
      await writeFile(file, Buffer.from(process.env[name], 'base64'), {
        mode: 0o600,
      })
      const profile = profileInfo(file, id, applicationCertificate)
      profiles.push(profile)
      const path = join(
        homedir(),
        'Library/MobileDevice/Provisioning Profiles',
        `${profile.uuid}.provisionprofile`,
      )
      await mkdir(
        join(homedir(), 'Library/MobileDevice/Provisioning Profiles'),
        { recursive: true },
      )
      await writeFile(path, await readFile(file), { flag: 'wx', mode: 0o600 })
      installed.push(path)
    }
    const allocation = await allocate(apple)
    const buildNumber = allocation.buildNumber
    let configured = original
    for (const [variable, id] of [
      ['TM_SAFARI_APP_BUNDLE_IDENTIFIER', safari.bundleId],
      ['TM_SAFARI_EXTENSION_BUNDLE_IDENTIFIER', safari.extensionId],
    ]) {
      const line = `        PRODUCT_BUNDLE_IDENTIFIER: $(${variable})`
      assert(
        configured.includes(line),
        'Native project signing insertion point changed',
      )
      configured = configured.replace(
        line,
        `${line}\n        PROVISIONING_PROFILE_SPECIFIER: ${profiles.find((p) => p.bundleId === id).uuid}`,
      )
    }
    await writeFile(project, configured)
    run('xcodegen', ['generate', '--spec', project], { stdio: 'inherit' })
    await writeFile(project, original)
    const output = resolve('.tmp/safari-candidate'),
      archive = join(output, 'TabManager.xcarchive'),
      exported = join(output, 'export')
    await mkdir(output, { recursive: true })
    run(
      'xcodebuild',
      [
        '-project',
        'packages/safari-native/TabManagerSafariPrototype.xcodeproj',
        '-scheme',
        'TabManagerSafariPrototype',
        '-configuration',
        'Release',
        '-destination',
        'generic/platform=macOS',
        '-archivePath',
        archive,
        `CURRENT_PROJECT_VERSION=${buildNumber}`,
        'CODE_SIGN_STYLE=Manual',
        `CODE_SIGN_IDENTITY=${applicationCertificate}`,
        'ARCHS=arm64 x86_64',
        'ONLY_ACTIVE_ARCH=NO',
        'DEBUG_INFORMATION_FORMAT=dwarf-with-dsym',
        'archive',
      ],
      { stdio: 'inherit' },
    )
    const archiveApp = join(
      archive,
      'Products/Applications/TabManagerSafariPrototype.app',
    )
    await verifyApp(
      archiveApp,
      version,
      buildNumber,
      profiles,
      applicationCertificate,
    )
    const options = {
      destination: 'export',
      method: 'app-store-connect',
      signingStyle: 'manual',
      teamID: safari.teamId,
      signingCertificate: applicationCertificate,
      installerSigningCertificate: installerCertificate,
      manageAppVersionAndBuildNumber: false,
      uploadSymbols: false,
      provisioningProfiles: Object.fromEntries(
        profiles.map((p) => [p.bundleId, p.uuid]),
      ),
    }
    const optionsPath = join(temporary, 'ExportOptions.plist')
    await writeFile(optionsPath, JSON.stringify(options), { mode: 0o600 })
    run('plutil', ['-convert', 'xml1', optionsPath])
    run(
      'xcodebuild',
      [
        '-exportArchive',
        '-archivePath',
        archive,
        '-exportOptionsPlist',
        optionsPath,
        '-exportPath',
        exported,
      ],
      { stdio: 'inherit' },
    )
    const packages = (await readdir(exported)).filter((n) => n.endsWith('.pkg'))
    assert(
      packages.length === 1,
      'Export did not produce exactly one macOS package',
    )
    const pkg = join(output, safari.packageName)
    await cp(join(exported, packages[0]), pkg)
    const signature = run('pkgutil', ['--check-signature', pkg])
    assert(
      signature.includes(`3rd Party Mac Developer Installer:`) &&
        signature.includes(safari.teamId) &&
        signature
          .replace(/[\s:]/g, '')
          .toUpperCase()
          .includes(
            certificates.find((c) => c.fingerprint === installerCertificate)
              .sha256,
          ),
      'Exported installer signature differs from the approved identity',
    )
    const expanded = join(temporary, 'expanded')
    run('pkgutil', ['--expand-full', pkg, expanded])
    const apps = await findApps(expanded)
    assert(apps.length === 1, 'Exported package has unexpected app inventory')
    await verifyApp(
      apps[0],
      version,
      buildNumber,
      profiles,
      applicationCertificate,
    )
    assert(
      (await readdir(join(archive, 'dSYMs'))).filter((n) => n.endsWith('.dSYM'))
        .length >= 2,
      'Archive is missing app/extension dSYMs',
    )
    run('ditto', [
      '-c',
      '-k',
      '--keepParent',
      archive,
      join(output, safari.archiveName),
    ])
    const resources = resolve('packages/extension/build/build_safari')
    const hashes = []
    for (const name of (await readdir(resources)).sort())
      hashes.push({
        name,
        sha256: sha256(await readFile(join(resources, name))),
      })
    const evidence = {
      ...safari,
      commit: allocation.commit,
      version,
      buildNumber,
      runId: allocation.runId,
      attempt: allocation.attempt,
      architectures: ['arm64', 'x86_64'],
      toolchain: {
        xcode: safari.xcode,
        xcodeBuild: safari.xcodeBuild,
        xcodegen: safari.xcodegen,
        runner: 'macos-15',
      },
      signing: {
        applicationCertificate,
        installerCertificate,
        certificates: certificates.filter((c) =>
          [applicationCertificate, installerCertificate].includes(
            c.fingerprint,
          ),
        ),
        profiles,
      },
      webResourcesSha256: sha256(json(hashes)),
      whatsNew,
    }
    validateSafari(
      evidence,
      { commit: allocation.commit, version },
      { runId: allocation.runId, attempt: allocation.attempt },
    )
    await writeFile(join(output, 'safari.json'), json(evidence))
    assert(
      !git(['status', '--porcelain', '--untracked-files=no']),
      'Safari source changed during packaging',
    )
  } finally {
    await writeFile(project, original)
    for (const path of installed) await rm(path, { force: true })
    run('security', ['list-keychains', '-d', 'user', '-s', ...priorKeychains])
    try {
      run('security', ['delete-keychain', keychain])
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  }
}
if (process.argv[1] === import.meta.filename) await main()
