/* eslint jest/expect-expect: "off" */
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { generateKeyPairSync } = require('node:crypto')
const { createRequire } = require('node:module')
const { mkdtempSync, mkdirSync, rmSync, writeFileSync } = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

// Exercise the patched Node entry point that web-ext actually resolves.
const webExtRequire = createRequire(require.resolve('web-ext'))
const adbkitRequire = createRequire(
  webExtRequire.resolve('@devicefarmer/adbkit'),
)
const forge = adbkitRequire('node-forge')

const keyPair = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicExponent: 3,
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
})
const privateKey = forge.pki.privateKeyFromPem(keyPair.privateKey)
const publicKey = forge.pki.publicKeyFromPem(keyPair.publicKey)

function digest(message = 'dependency security regression') {
  const md = forge.md.sha256.create()
  md.update(message)
  return md
}

function signDigestInfo({ parameters, garbage }) {
  const { asn1 } = forge
  const algorithm = [
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.OID,
      false,
      asn1.oidToDer(forge.oids.sha256).getBytes(),
    ),
  ]
  if (parameters) {
    algorithm.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ''))
  }
  if (garbage) {
    algorithm.push(
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OCTETSTRING,
        false,
        'garbage',
      ),
    )
  }
  const info = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, algorithm),
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.OCTETSTRING,
      false,
      digest().digest().getBytes(),
    ),
  ])
  return privateKey.sign(asn1.toDer(info).getBytes(), 'NONE')
}

test('RSA verification accepts a normal signature and rejects a different digest', () => {
  const signature = privateKey.sign(digest())
  assert.equal(publicKey.verify(digest().digest().getBytes(), signature), true)
  assert.equal(
    publicKey.verify(
      digest('different message').digest().getBytes(),
      signature,
    ),
    false,
  )
})

for (const parameters of [true, false]) {
  const label = parameters ? 'with NULL parameters' : 'without NULL parameters'
  test(`RSA verification accepts SHA-256 DigestInfo ${label}`, () => {
    const signature = signDigestInfo({ parameters, garbage: false })
    assert.equal(
      publicKey.verify(digest().digest().getBytes(), signature),
      true,
    )
  })

  test(`RSA verification rejects extra DigestAlgorithm children ${label}`, () => {
    const signature = signDigestInfo({ parameters, garbage: true })
    assert.throws(
      () => publicKey.verify(digest().digest().getBytes(), signature),
      /ASN\.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value/,
    )
  })
}

// Follow Jest's real coverage-tooling path instead of importing a different
// installed sprintf-js copy. js-yaml 3's CLI still uses argparse 1's API.
let coverageRequire = createRequire(
  path.join(__dirname, '../packages/extension/package.json'),
)
for (const name of [
  'jest',
  '@jest/core',
  '@jest/transform',
  'babel-plugin-istanbul',
  '@istanbuljs/load-nyc-config',
]) {
  coverageRequire = createRequire(coverageRequire.resolve(name))
}
const yamlRequire = createRequire(coverageRequire.resolve('js-yaml'))
const argparseRequire = createRequire(yamlRequire.resolve('argparse'))
const { sprintf, vsprintf } = argparseRequire('sprintf-js')
const yamlCLI = yamlRequire.resolve('./bin/js-yaml.js')

for (const [specifier, minimum, format] of [
  ['e', 0, (value, precision) => value.toExponential(precision)],
  ['f', 0, (value, precision) => value.toFixed(precision)],
  ['g', 1, (value, precision) => value.toPrecision(precision)],
]) {
  for (const precision of new Set([minimum, 1, 20, 100])) {
    test(`sprintf %${specifier} preserves supported precision ${precision}`, () => {
      assert.equal(
        sprintf(`%.${precision}${specifier}`, 1.25),
        format(1.25, precision),
      )
    })
  }

  for (const precision of ['101', '1000000', '9'.repeat(400)]) {
    test(`sprintf %${specifier} bounds ${precision.length}-digit oversized precision`, () => {
      const output = sprintf(`%.${precision}${specifier}`, 1.25)
      assert.equal(output, format(1.25, 100))
      assert.ok(output.length < 110)
    })
  }
}

test('sprintf treats zero significant digits as one instead of throwing', () => {
  assert.equal(sprintf('%.0g', 1.25), (1.25).toPrecision(1))
})

test('sprintf preserves ordinary templates, default precision and string precision', () => {
  const cases = [
    ['Hello %s', ['world'], 'Hello world'],
    ['%2$s %1$s', ['first', 'second'], 'second first'],
    ['%(person.name)s', [{ person: { name: 'Jenny' } }], 'Jenny'],
    ['%(items[0])s', [{ items: ['first'] }], 'first'],
    ['%+08.2f', [3.5], '+0003.50'],
    ["%'_-5s", ['x'], 'x____'],
    ['%x / %X', [255, 255], 'ff / FF'],
    ['%j', [{ count: 3 }], '{"count":3}'],
    ['%% %s', ['literal %.1000000f'], '% literal %.1000000f'],
    ['%e', [1.25], (1.25).toExponential()],
    ['%f', [1.25], '1.25'],
    ['%g', [1.25], '1.25'],
    ['%.150s', ['a'.repeat(200)], 'a'.repeat(150)],
  ]
  for (const [format, values, expected] of cases) {
    assert.equal(sprintf(format, ...values), expected)
    assert.equal(vsprintf(format, values), expected)
  }
  assert.throws(() => sprintf('%.-1f', 1.25), SyntaxError)
})

test('argparse keeps parsing options and rendering help through its patched formatter', () => {
  const { ArgumentParser } = yamlRequire('argparse')
  const parser = new ArgumentParser({
    prog: 'precision-%.1000000f',
    addHelp: true,
  })
  parser.addArgument(['--count'], {
    type: 'int',
    defaultValue: 1,
    help: 'Count for %(prog)s (default: %(defaultValue)s)',
  })
  assert.equal(parser.parseArgs(['--count', '3']).count, 3)
  const help = parser.formatHelp()
  assert.match(help, /precision-%\.1000000f/)
  assert.match(help, /--count COUNT/)
  assert.match(help, /default: 1/)
})

test('js-yaml 3 CLI preserves help, parsing and invalid-input handling', () => {
  const help = spawnSync(process.execPath, [yamlCLI, '--help'], {
    encoding: 'utf8',
  })
  assert.equal(help.status, 0, help.stderr)
  assert.match(help.stdout, /usage: js-yaml/)
  assert.match(help.stdout, /--compact/)

  const parsed = spawnSync(process.execPath, [yamlCLI], {
    input: 'name: Jenny\ncount: 3\n',
    encoding: 'utf8',
  })
  assert.equal(parsed.status, 0, parsed.stderr)
  assert.deepEqual(JSON.parse(parsed.stdout), { name: 'Jenny', count: 3 })

  const invalid = spawnSync(process.execPath, [yamlCLI], {
    input: 'name: [unterminated\n',
    encoding: 'utf8',
  })
  assert.equal(invalid.status, 1)
  assert.match(invalid.stderr, /YAMLException/)
  assert.doesNotMatch(invalid.stderr, /RangeError/)
})

// Resolve the same braces instance used by a configured developer-tool consumer.
const lintStagedRequire = createRequire(require.resolve('lint-staged'))
const micromatchRequire = createRequire(lintStagedRequire.resolve('micromatch'))
const braces = micromatchRequire('braces')
const micromatch = lintStagedRequire('micromatch')
const extensionRequire = createRequire(
  path.join(__dirname, '../packages/extension/package.json'),
)
const tailwindRequire = createRequire(extensionRequire.resolve('tailwindcss'))
const fastGlob = tailwindRequire('fast-glob')

const nestingError = {
  name: 'SyntaxError',
  message: 'Pattern nesting depth exceeds maximum (128)',
}

for (const method of ['compile', 'expand', 'stringify']) {
  for (const astInput of [false, true]) {
    test(`braces ${method} rejects advisory nesting in ${astInput ? 'AST' : 'string'} inputs`, () => {
      const pattern = '{'.repeat(4000) + 'a,b' + '}'.repeat(4000)
      const input = astInput ? braces.parse(pattern) : pattern
      assert.throws(() => braces[method](input), nestingError)
      // A caught failure must not leave a counter that corrupts later calls.
      assert.deepEqual(braces.expand('{a,b}'), ['a', 'b'])
    })
  }

  test(`braces ${method} accepts the AST depth limit and rejects its next level`, () => {
    const supported = '('.repeat(127) + 'x' + ')'.repeat(127)
    assert.deepEqual(
      braces[method](supported),
      method === 'expand' ? [supported] : supported,
    )
    const excessive = '('.repeat(128) + 'x' + ')'.repeat(128)
    assert.throws(() => braces[method](excessive), nestingError)
  })
}

test('main braces APIs and actual glob consumers reject excessive nesting', () => {
  const pattern = '{'.repeat(4000) + 'a,b' + '}'.repeat(4000)
  for (const operation of [
    () => braces(pattern),
    () => braces(pattern, { expand: true }),
    () => micromatch.braceExpand(pattern),
    () => fastGlob.generateTasks([pattern]),
  ]) {
    assert.throws(operation, nestingError)
  }
})

test('braces preserves ordinary alternatives, nesting, ranges and escaped literals', () => {
  const cases = [
    ['file-{a,b}.js', ['file-a.js', 'file-b.js']],
    ['{a,{b,c}}', ['a', 'b', 'c']],
    ['{01..03}', ['01', '02', '03']],
    ['{1..5..2}', ['1', '3', '5']],
    ['{a..c}', ['a', 'b', 'c']],
    ['\\{a,b\\}', ['{a,b}']],
    ['{a,b', ['{a,b']],
    ['[{}]', ['[{}]']],
  ]
  for (const [pattern, expected] of cases) {
    assert.deepEqual(braces.expand(pattern), expected)
    assert.equal(
      braces.stringify(braces.parse(pattern)),
      pattern.replaceAll('\\', ''),
    )
  }
  assert.deepEqual(braces('{a,b}'), ['(a|b)'])
})

test('actual micromatch and Tailwind fast-glob consumers preserve configured file patterns', () => {
  assert.deepEqual(micromatch.braceExpand('file-{a,b}.{js,ts}'), [
    'file-a.js',
    'file-a.ts',
    'file-b.js',
    'file-b.ts',
  ])
  assert.deepEqual(
    micromatch(['src/a.js', 'src/b.ts', 'src/c.css'], 'src/*.{js,ts}'),
    ['src/a.js', 'src/b.ts'],
  )
  const directory = mkdtempSync(path.join(os.tmpdir(), 'tab-security-glob-'))
  try {
    mkdirSync(path.join(directory, 'src'))
    for (const file of ['a.js', 'b.ts', 'c.css', '{literal}.js']) {
      writeFileSync(path.join(directory, 'src', file), '')
    }
    assert.deepEqual(
      fastGlob
        .sync(['src/{a,b}.{js,ts}', 'src/\\{literal\\}.js'], {
          cwd: directory,
          onlyFiles: true,
        })
        .sort(),
      ['src/a.js', 'src/b.ts', 'src/{literal}.js'],
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
