import { createRng } from './prng'
import type { Cube, Polycube } from './geometry'
import {
  areFaceConnected,
  getBounds3D,
  neighbors3D,
  normalizeCubes,
  serializeCubes,
  uniqueCubes,
} from './geometry'
import { allLegalSilhouettes } from './projection'

const MAX_ATTEMPTS = 450

function isMediumOrHard(cubeCount: number): boolean {
  return cubeCount > 7
}

function isSinglePlane(cubes: Polycube): boolean {
  const bounds = getBounds3D(cubes)
  return bounds.width === 1 || bounds.height === 1 || bounds.depth === 1
}

function isTooLongAndSkinny(cubes: Polycube, cubeCount: number): boolean {
  const bounds = getBounds3D(cubes)
  const dimensions = [bounds.width, bounds.height, bounds.depth].sort((a, b) => a - b)
  const [shortest, , longest] = dimensions

  return longest / Math.max(1, shortest) >= 3.5 || longest >= Math.ceil(cubeCount * 0.72)
}

function frontierFor(cubes: Polycube): Cube[] {
  const occupied = new Set(cubes.map((cube) => `${cube.x},${cube.y},${cube.z}`))
  const frontier: Cube[] = []

  for (const cube of cubes) {
    for (const neighbor of neighbors3D(cube)) {
      const key = `${neighbor.x},${neighbor.y},${neighbor.z}`
      if (!occupied.has(key)) {
        frontier.push(neighbor)
      }
    }
  }

  return uniqueCubes(frontier)
}

function buildCandidate(seed: string, cubeCount: number, attempt: number): Polycube {
  const rng = createRng(`${seed}:polycube:${cubeCount}:attempt:${attempt}`)
  let cubes: Polycube = [{ x: 0, y: 0, z: 0 }]

  while (cubes.length < cubeCount) {
    const frontier = frontierFor(cubes)
    const nextCube = rng.choice(frontier)
    cubes = normalizeCubes([...cubes, nextCube])
  }

  return normalizeCubes(cubes)
}

function candidateScore(cubes: Polycube): number {
  const legalSilhouetteCount = allLegalSilhouettes(cubes).length
  const bounds = getBounds3D(cubes)
  const dimensionsUsed = [bounds.width, bounds.height, bounds.depth].filter((size) => size > 1).length

  return legalSilhouetteCount * 10 + dimensionsUsed * 3 - Math.max(bounds.width, bounds.height, bounds.depth)
}

function isAcceptable(cubes: Polycube, cubeCount: number): boolean {
  if (!areFaceConnected(cubes)) {
    return false
  }

  if (allLegalSilhouettes(cubes).length < 4) {
    return false
  }

  if (isMediumOrHard(cubeCount) && isSinglePlane(cubes)) {
    return false
  }

  if (isMediumOrHard(cubeCount) && isTooLongAndSkinny(cubes, cubeCount)) {
    return false
  }

  return true
}

export function generatePolycube(seed: string, cubeCount: number): Polycube {
  let bestCandidate: Polycube | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = buildCandidate(seed, cubeCount, attempt)
    const score = candidateScore(candidate)

    if (score > bestScore) {
      bestScore = score
      bestCandidate = candidate
    }

    if (isAcceptable(candidate, cubeCount)) {
      return candidate
    }
  }

  if (bestCandidate) {
    return bestCandidate
  }

  return normalizeCubes(
    Array.from({ length: cubeCount }, (_, index) => ({ x: index, y: 0, z: 0 })),
  )
}

export function canonicalPolycubeKey(cubes: readonly Cube[]): string {
  return serializeCubes(cubes)
}
