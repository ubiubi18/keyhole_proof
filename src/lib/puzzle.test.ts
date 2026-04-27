import { describe, expect, it } from 'vitest'
import { generateDistractors, isSilhouetteConnected, silhouetteIoU } from './distractors'
import type { Silhouette } from './geometry'
import { areFaceConnected, normalizeCells, serializeCells } from './geometry'
import { generatePuzzle, OPTION_LABELS, type Difficulty } from './puzzle'
import { allLegalSilhouettes } from './projection'
import { createRng } from './prng'
import { ROTATIONS_24, rotateCube } from './rotations'
import { isSha256Hex, sha256Hex } from './sha256'

const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

describe('3D Keyhole Snap Judgment generation', () => {
  it('returns identical Puzzle JSON for the same seed and difficulty', () => {
    const first = generatePuzzle('keyhole-demo-001', 'medium')
    const second = generatePuzzle('keyhole-demo-001', 'medium')

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(first.seed).toBe(sha256Hex('keyhole-demo-001'))
    expect(isSha256Hex(first.seed)).toBe(true)
  })

  it('usually produces different puzzles for different seeds', () => {
    const first = generatePuzzle('keyhole-demo-001', 'medium')
    const second = generatePuzzle('keyhole-demo-002', 'medium')

    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second))
  })

  it('generates exactly 24 unique axis-aligned cube rotations', () => {
    const probe = { x: 1, y: 2, z: 3 }
    const rotated = ROTATIONS_24.map((rotation) => {
      const cube = rotateCube(probe, rotation)
      return `${cube.x},${cube.y},${cube.z}`
    })

    expect(ROTATIONS_24).toHaveLength(24)
    expect(new Set(rotated).size).toBe(24)
  })

  it('deduplicates legal projections correctly', () => {
    const stack = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ]
    const silhouettes = allLegalSilhouettes(stack)

    expect(silhouettes.map(serializeCells).sort()).toEqual([
      '0,0',
      '0,0|0,1',
      '0,0|1,0',
    ])
  })

  it('includes the correct answer exactly once', () => {
    const puzzle = generatePuzzle('correct-answer-check', 'hard')

    expect(puzzle.choices.filter((choice) => choice.isCorrect)).toHaveLength(1)
    expect(puzzle.choices[puzzle.correctIndex].isCorrect).toBe(true)
  })

  it('never includes a legal silhouette as a distractor', () => {
    for (const difficulty of difficulties) {
      const puzzle = generatePuzzle(`legal-distractor-check-${difficulty}`, difficulty)
      const legal = new Set(puzzle.legalSilhouettes.map(serializeCells))

      for (const choice of puzzle.choices) {
        if (!choice.isCorrect) {
          expect(legal.has(serializeCells(choice.silhouette))).toBe(false)
        }
      }
    }
  })

  it('keeps every answer silhouette connected', () => {
    for (const difficulty of difficulties) {
      const puzzle = generatePuzzle(`connected-silhouette-${difficulty}`, difficulty)

      expect(puzzle.choices.every((choice) => isSilhouetteConnected(choice.silhouette))).toBe(true)
    }
  })

  it('creates unique answer choices', () => {
    const puzzle = generatePuzzle('unique-choice-check', 'hard')
    const keys = puzzle.choices.map((choice) => serializeCells(choice.silhouette))

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('generates the expected cube count per difficulty', () => {
    expect(generatePuzzle('count-easy', 'easy').cubes).toHaveLength(7)
    expect(generatePuzzle('count-medium', 'medium').cubes).toHaveLength(10)
    expect(generatePuzzle('count-hard', 'hard').cubes).toHaveLength(13)
  })

  it('generates face-connected polycubes', () => {
    for (const difficulty of difficulties) {
      const puzzle = generatePuzzle(`connected-${difficulty}`, difficulty)

      expect(areFaceConnected(puzzle.cubes)).toBe(true)
    }
  })

  it('keeps keyboard labels matched to the answer count', () => {
    for (const difficulty of difficulties) {
      const puzzle = generatePuzzle(`labels-${difficulty}`, difficulty)
      const expected = OPTION_LABELS.slice(0, puzzle.choices.length)

      expect(puzzle.choices.map((choice) => choice.label)).toEqual(expected)
      expect(puzzle.choices.length).toBeLessThanOrEqual(6)
    }
  })

  it('returns silhouette IoU of 1 for identical silhouettes and 0 for non-overlapping ones', () => {
    const a: Silhouette = normalizeCells([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ])
    const b: Silhouette = [
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ]

    expect(silhouetteIoU(a, a)).toBe(1)
    expect(silhouetteIoU(a, b)).toBe(0)
  })

  it('can generate 100 puzzles per difficulty without throwing', () => {
    for (const difficulty of difficulties) {
      for (let index = 0; index < 100; index += 1) {
        expect(() => generatePuzzle(`stress-${difficulty}-${index}`, difficulty)).not.toThrow()
      }
    }
  }, 60_000)

  it('direct distractor generation rejects every legal silhouette', () => {
    const puzzle = generatePuzzle('direct-distractor-check', 'medium')
    const distractors = generateDistractors({
      rng: createRng('direct-distractor-check'),
      cubes: puzzle.cubes,
      correct: puzzle.correctProjection,
      legalSilhouettes: puzzle.legalSilhouettes,
      count: 8,
      difficulty: puzzle.difficulty,
    })
    const legal = new Set(puzzle.legalSilhouettes.map(serializeCells))

    expect(distractors.every((distractor) => !legal.has(serializeCells(distractor)))).toBe(true)
  })
})
