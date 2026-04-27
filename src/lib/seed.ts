import { sha256Hex } from './sha256'

export function createLargeUiSeed(now = Date.now()): string {
  const bytes = new Uint8Array(48)

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return sha256Hex(bytes)
  }

  // This fallback keeps unsupported runtimes usable; modern browsers use the
  // crypto path above so generated seeds have 256 bits of SHA-256 digest space.
  return sha256Hex(`keyhole-v1:${now}:${now.toString(36)}:${now.toString(16)}`)
}
