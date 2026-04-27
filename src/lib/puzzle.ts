import type { Polycube, Silhouette } from './geometry'
import { serializeCells } from './geometry'
import { generateDistractors } from './distractors'
import { generatePolycube } from './polycube'
import { allLegalSilhouettes } from './projection'
import { createRng } from './prng'
import { ROTATIONS_24 } from './rotations'
import { normalizeSha256Seed } from './sha256'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type Choice = {
  label: string
  silhouette: Silhouette
  isCorrect: boolean
}

export type Puzzle = {
  seed: string
  difficulty: Difficulty
  cubeCount: number
  cubes: Polycube
  displayRotationIndex: number
  correctProjection: Silhouette
  legalSilhouettes: Silhouette[]
  choices: Choice[]
  correctIndex: number
}

export const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

export const DIFFICULTY_SETTINGS: Record<
  Difficulty,
  { cubeCount: number; choices: number }
> = {
  easy: { cubeCount: 7, choices: 4 },
  medium: { cubeCount: 10, choices: 5 },
  hard: { cubeCount: 13, choices: 6 },
}

export function generatePuzzle(seed: string, difficulty: Difficulty): Puzzle {
  const canonicalSeed = normalizeSha256Seed(seed)
  const settings = DIFFICULTY_SETTINGS[difficulty]
  const rng = createRng(`${canonicalSeed}:puzzle:${difficulty}`)
  const cubes = generatePolycube(canonicalSeed, settings.cubeCount)
  const legalSilhouettes = allLegalSilhouettes(cubes)
  const correctProjection = rng.choice(legalSilhouettes)
  const displayRotationIndex = rng.int(0, ROTATIONS_24.length - 1)
  const distractors = generateDistractors({
    rng,
    cubes,
    correct: correctProjection,
    legalSilhouettes,
    count: settings.choices - 1,
    difficulty,
  })

  const rawChoices = [
    { silhouette: correctProjection, isCorrect: true },
    ...distractors.map((silhouette) => ({ silhouette, isCorrect: false })),
  ]
  const uniqueChoiceKeys = new Set(rawChoices.map((choice) => serializeCells(choice.silhouette)))

  if (uniqueChoiceKeys.size !== settings.choices) {
    throw new Error('Puzzle generated duplicate answer choices')
  }

  const shuffled = rng.shuffle(rawChoices)
  const choices = shuffled.map((choice, index) => ({
    label: OPTION_LABELS[index],
    ...choice,
  }))
  const correctIndex = choices.findIndex((choice) => choice.isCorrect)

  if (correctIndex < 0 || choices.filter((choice) => choice.isCorrect).length !== 1) {
    throw new Error('Puzzle must contain exactly one correct answer')
  }

  return {
    seed: canonicalSeed,
    difficulty,
    cubeCount: settings.cubeCount,
    cubes,
    displayRotationIndex,
    correctProjection,
    legalSilhouettes,
    choices,
    correctIndex,
  }
}
