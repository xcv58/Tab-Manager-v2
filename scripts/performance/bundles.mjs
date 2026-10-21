import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { gzipSync, inflateRawSync } from 'node:zlib'
import { sha256 } from './records.mjs'

const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})
const crc32 = (data) => {
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// Inspect the exact packaged ZIP rather than estimating its size from gzip.
// Extension packages are small, ordinary ZIPs; reject ZIP64/encrypted archives.
export function zipFiles(data) {
  let end = data.length - 22
  while (
    end >= Math.max(0, data.length - 65557) &&
    data.readUInt32LE(end) !== 0x06054b50
  )
    end--
  if (end < Math.max(0, data.length - 65557))
    throw new Error('ZIP end record missing')
  const count = data.readUInt16LE(end + 10)
  let offset = data.readUInt32LE(end + 16)
  if (count === 65535 || offset === 0xffffffff)
    throw new Error('ZIP64 is unsupported')
  const files = new Map()
  let unpacked = 0
  for (let index = 0; index < count; index++) {
    if (data.readUInt32LE(offset) !== 0x02014b50)
      throw new Error('Invalid ZIP central directory')
    const flags = data.readUInt16LE(offset + 8)
    const method = data.readUInt16LE(offset + 10)
    const checksum = data.readUInt32LE(offset + 16)
    const compressed = data.readUInt32LE(offset + 20)
    const bytes = data.readUInt32LE(offset + 24)
    const nameLength = data.readUInt16LE(offset + 28)
    const extraLength = data.readUInt16LE(offset + 30)
    const commentLength = data.readUInt16LE(offset + 32)
    const localOffset = data.readUInt32LE(offset + 42)
    const name = data
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString('utf8')
    offset += 46 + nameLength + extraLength + commentLength
    if (name.endsWith('/')) continue
    unpacked += bytes
    if (flags & 1 || unpacked > 64 * 1024 * 1024 || ![0, 8].includes(method))
      throw new Error('Unsupported or oversized extension ZIP')
    if (
      files.has(name) ||
      name.startsWith('/') ||
      name.split(/[\\/]/).includes('..')
    )
      throw new Error('Unsafe or duplicate ZIP filename')
    if (data.readUInt32LE(localOffset) !== 0x04034b50)
      throw new Error('Invalid ZIP local header')
    const start =
      localOffset +
      30 +
      data.readUInt16LE(localOffset + 26) +
      data.readUInt16LE(localOffset + 28)
    const packed = data.subarray(start, start + compressed)
    const content =
      method === 8
        ? inflateRawSync(packed, { maxOutputLength: Math.max(1, bytes) })
        : packed
    if (content.length !== bytes || crc32(content) !== checksum)
      throw new Error('ZIP file length/checksum mismatch')
    files.set(name, content)
  }
  return files
}

export function measurePackage(zip, browser, expectedVersion) {
  const disk = zipFiles(zip)
  const files = [...disk]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([path, content]) => ({
      path,
      bytes: content.length,
      gzipBytes: gzipSync(content, { level: 9 }).length,
      sha256: sha256(content),
    }))
  const manifest = JSON.parse(disk.get('manifest.json').toString())
  if (manifest.version !== expectedVersion)
    throw new Error(`${browser}: package version differs from source`)
  const sum = (match) =>
    files.filter(match).reduce((total, file) => total + file.bytes, 0)
  const startupFiles = [
    ...disk
      .get('popup.html')
      .toString()
      .matchAll(/(?:src|href)=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g),
  ]
    .map((match) =>
      (match[1] || match[2] || match[3]).split(/[?#]/)[0].replace(/^\.\//, ''),
    )
    .filter((path) => /\.(js|css)$/.test(path))
  if (
    !startupFiles.some((path) => path.endsWith('.js')) ||
    startupFiles.some((path) => !disk.has(path))
  )
    throw new Error('Initial popup assets must exist in the package')
  return {
    browser,
    zip: { bytes: zip.length, sha256: sha256(zip) },
    contentSha256: sha256(
      files
        .map((file) => `${file.path}\0${file.bytes}\0${file.sha256}\n`)
        .join(''),
    ),
    files,
    startupFiles: [...new Set(startupFiles)],
    summary: {
      unpackedBytes: sum(() => true),
      popupJsBytes: sum((file) => file.path === 'popup.js'),
      popupCssBytes: sum((file) => file.path === 'popup.css'),
      backgroundJsBytes: sum((file) => file.path === 'background.js'),
      settingsPreviewBytes: sum((file) =>
        file.path.startsWith('settings-preview'),
      ),
    },
  }
}

export async function collectBundle(extensionRoot, browser, expectedVersion) {
  const directory = join(extensionRoot, 'build', `build_${browser}`)
  const zip = await readFile(`${directory}.zip`)
  const packaged = zipFiles(zip)
  const disk = new Map()
  const walk = async (path) => {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isDirectory()) await walk(join(path, entry.name))
      else if (entry.isFile())
        disk.set(
          relative(directory, join(path, entry.name)).replaceAll('\\', '/'),
          await readFile(join(path, entry.name)),
        )
      else throw new Error('Package contains a symlink or unsupported file')
    }
  }
  await walk(directory)
  if (packaged.size !== disk.size)
    throw new Error(`${browser}: ZIP and build have different file counts`)
  for (const [path, content] of disk) {
    if (!packaged.get(path)?.equals(content))
      throw new Error(`${browser}: stale ZIP differs at ${path}`)
  }
  return measurePackage(zip, browser, expectedVersion)
}
