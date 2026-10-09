/* eslint jest/expect-expect: "off" */
const assert = require('node:assert/strict')
const { generateKeyPairSync } = require('node:crypto')
const { createRequire } = require('node:module')
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
