import { sha256Hex } from './sha256'

export interface Rng {
  float(): number
  int(minInclusive: number, maxInclusive: number): number
  choice<T>(items: readonly T[]): T
  shuffle<T>(items: readonly T[]): T[]
}

function hexWordToNumber(hex: string): number {
  return Number.parseInt(hex, 16) >>> 0
}

export function createRng(seed: string): Rng {
  let counter = 0
  let buffer: number[] = []

  const nextWord = () => {
    if (buffer.length === 0) {
      // Counter-mode SHA-256 keeps puzzle generation deterministic while
      // preserving the practical search space of a high-entropy SHA-256 seed.
      const digest = sha256Hex(`3d-keyhole-prng:v1:${seed}:${counter}`)
      counter += 1
      buffer = Array.from({ length: 8 }, (_, index) =>
        hexWordToNumber(digest.slice(index * 8, index * 8 + 8)),
      )
    }

    return buffer.shift()!
  }

  const nextFloat = () => nextWord() / 4294967296

  return {
    float() {
      return nextFloat()
    },
    int(minInclusive: number, maxInclusive: number) {
      if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
        throw new Error('rng.int bounds must be integers')
      }
      if (maxInclusive < minInclusive) {
        throw new Error('rng.int max must be greater than or equal to min')
      }

      const span = maxInclusive - minInclusive + 1
      return minInclusive + Math.floor(nextFloat() * span)
    },
    choice<T>(items: readonly T[]) {
      if (items.length === 0) {
        throw new Error('rng.choice cannot choose from an empty array')
      }
      return items[this.int(0, items.length - 1)]
    },
    shuffle<T>(items: readonly T[]) {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = this.int(0, i)
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
  }
}
