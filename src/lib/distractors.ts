import type { Rng } from './prng'
import type { Cell2D, Polycube, Silhouette } from './geometry'
import {
  areFaceConnected,
  neighbors2D,
  neighbors3D,
  normalizeCells,
  normalizeCubes,
  serializeCells,
  uniqueCells,
  uniqueCubes,
} from './geometry'
import { allLegalSilhouettes } from './projection'

type Difficulty = 'easy' | 'medium' | 'hard'

export type GenerateDistractorsParams = {
  rng: Rng
  cubes: Polycube
  correct: Silhouette
  legalSilhouettes: Silhouette[]
  count: number
  difficulty: Difficulty
}

type Candidate = {
  silhouette: Silhouette
  iou: number
}

const IOU_RANGES: Record<Difficulty, readonly [number, number]> = {
  easy: [0.25, 0.85],
  medium: [0.4, 0.88],
  hard: [0.55, 0.92],
}

function cellKey(cell: Cell2D): string {
  return `${cell.x},${cell.y}`
}

export function silhouetteIoU(a: readonly Cell2D[], b: readonly Cell2D[]): number {
  const aSet = new Set(uniqueCells(a).map(cellKey))
  const bSet = new Set(uniqueCells(b).map(cellKey))

  if (aSet.size === 0 && bSet.size === 0) {
    return 1
  }

  let intersection = 0
  for (const key of aSet) {
    if (bSet.has(key)) {
      intersection += 1
    }
  }

  const union = new Set([...aSet, ...bSet]).size
  return union === 0 ? 0 : intersection / union
}

function degree2D(cell: Cell2D, occupied: Set<string>): number {
  return neighbors2D(cell).filter((neighbor) => occupied.has(cellKey(neighbor))).length
}

export function isSilhouetteConnected(cells: Silhouette): boolean {
  if (cells.length <= 1) {
    return true
  }

  const occupied = new Set(cells.map(cellKey))
  const queue: Cell2D[] = [cells[0]]
  const visited = new Set<string>([cellKey(cells[0])])

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of neighbors2D(current)) {
      const key = cellKey(neighbor)
      if (occupied.has(key) && !visited.has(key)) {
        visited.add(key)
        queue.push(neighbor)
      }
    }
  }

  return visited.size === cells.length
}

function removeOneCellVariants(correct: Silhouette): Silhouette[] {
  const variants: Silhouette[] = []

  for (let index = 0; index < correct.length; index += 1) {
    const variant = normalizeCells(correct.filter((_, cellIndex) => cellIndex !== index))
    if (variant.length > 0 && isSilhouetteConnected(variant)) {
      variants.push(variant)
    }
  }

  return variants
}

function addNeighborVariants(correct: Silhouette): Silhouette[] {
  const occupied = new Set(correct.map(cellKey))
  const variants: Silhouette[] = []

  for (const cell of correct) {
    for (const neighbor of neighbors2D(cell)) {
      if (!occupied.has(cellKey(neighbor))) {
        variants.push(normalizeCells([...correct, neighbor]))
      }
    }
  }

  return variants
}

function mirrorVariants(correct: Silhouette): Silhouette[] {
  return [
    normalizeCells(correct.map((cell) => ({ x: -cell.x, y: cell.y }))),
    normalizeCells(correct.map((cell) => ({ x: cell.x, y: -cell.y }))),
  ]
}

function shiftProtrusionVariants(correct: Silhouette): Silhouette[] {
  const occupied = new Set(correct.map(cellKey))
  const variants: Silhouette[] = []

  for (const cell of correct) {
    if (degree2D(cell, occupied) > 1) {
      continue
    }

    const remaining = correct.filter((candidate) => cellKey(candidate) !== cellKey(cell))
    if (!isSilhouetteConnected(remaining)) {
      continue
    }

    const remainingSet = new Set(remaining.map(cellKey))
    for (const anchor of remaining) {
      for (const neighbor of neighbors2D(anchor)) {
        const key = cellKey(neighbor)
        if (!remainingSet.has(key) && key !== cellKey(cell)) {
          variants.push(normalizeCells([...remaining, neighbor]))
        }
      }
    }
  }

  return variants
}

function siblingProjectionVariants(cubes: Polycube, rng: Rng): Silhouette[] {
  const variants: Silhouette[] = []
  const normalized = normalizeCubes(cubes)
  const indices = rng.shuffle(normalized.map((_, index) => index))

  for (const index of indices) {
    const remaining = normalized.filter((_, cubeIndex) => cubeIndex !== index)
    if (!areFaceConnected(remaining)) {
      continue
    }

    const occupied = new Set(remaining.map((cube) => `${cube.x},${cube.y},${cube.z}`))
    const frontier = uniqueCubes(
      remaining
        .flatMap((cube) => neighbors3D(cube))
        .filter((cube) => !occupied.has(`${cube.x},${cube.y},${cube.z}`)),
    )

    for (const movedCube of rng.shuffle(frontier).slice(0, 8)) {
      const sibling = normalizeCubes([...remaining, movedCube])
      for (const projection of rng.shuffle(allLegalSilhouettes(sibling)).slice(0, 4)) {
        variants.push(projection)
      }
    }

    if (variants.length > 80) {
      break
    }
  }

  return variants
}

function fallbackVariants(correct: Silhouette): Silhouette[] {
  const variants: Silhouette[] = []
  const normalized = normalizeCells(correct)
  const occupied = new Set(normalized.map(cellKey))
  const boundary = uniqueCells(
    normalized.flatMap((cell) =>
      neighbors2D(cell).filter((neighbor) => !occupied.has(cellKey(neighbor))),
    ),
  )

  for (const added of boundary) {
    const expanded = normalizeCells([...normalized, added])
    variants.push(expanded)

    // Add-adjacent-then-remove keeps the silhouette one connected component
    // while still producing a shape that is not merely a translated copy.
    for (const removed of expanded) {
      const shifted = normalizeCells(
        expanded.filter((cell) => cellKey(cell) !== cellKey(removed)),
      )
      if (shifted.length > 0 && isSilhouetteConnected(shifted)) {
        variants.push(shifted)
      }
    }

    const expandedOccupied = new Set(expanded.map(cellKey))
    for (const second of uniqueCells(
      expanded.flatMap((cell) =>
        neighbors2D(cell).filter((neighbor) => !expandedOccupied.has(cellKey(neighbor))),
      ),
    )) {
      variants.push(normalizeCells([...expanded, second]))
    }
  }

  for (const removedA of normalized) {
    const onceRemoved = normalizeCells(
      normalized.filter((cell) => cellKey(cell) !== cellKey(removedA)),
    )
    if (!isSilhouetteConnected(onceRemoved)) {
      continue
    }

    for (const removedB of onceRemoved) {
      const twiceRemoved = normalizeCells(
        onceRemoved.filter((cell) => cellKey(cell) !== cellKey(removedB)),
      )
      if (twiceRemoved.length > 0 && isSilhouetteConnected(twiceRemoved)) {
        variants.push(twiceRemoved)
      }
    }
  }

  return variants
}

export function generateDistractors(params: GenerateDistractorsParams): Silhouette[] {
  const { rng, cubes, correct, legalSilhouettes, count, difficulty } = params
  const legal = new Set(legalSilhouettes.map(serializeCells))
  const candidates = new Map<string, Candidate>()

  function addCandidate(cells: Silhouette): void {
    const normalized = normalizeCells(cells)
    if (!isSilhouetteConnected(normalized)) {
      return
    }

    const key = serializeCells(normalized)
    if (legal.has(key) || candidates.has(key)) {
      return
    }

    candidates.set(key, {
      silhouette: normalized,
      iou: silhouetteIoU(normalizeCells(correct), normalized),
    })
  }

  for (const variant of [
    ...removeOneCellVariants(correct),
    ...addNeighborVariants(correct),
    ...mirrorVariants(correct),
    ...shiftProtrusionVariants(correct),
    ...siblingProjectionVariants(cubes, rng),
    ...fallbackVariants(correct),
  ]) {
    addCandidate(variant)
  }

  const [minIoU, maxIoU] = IOU_RANGES[difficulty]
  const relaxations = [0, 0.06, 0.12, 0.2, 0.35, 0.6]
  const selected = new Map<string, Silhouette>()
  const shuffledCandidates = rng.shuffle([...candidates.entries()])

  for (const relaxation of relaxations) {
    const relaxedMin = Math.max(0, minIoU - relaxation)
    const relaxedMax = Math.min(0.98, maxIoU + relaxation)

    for (const [key, candidate] of shuffledCandidates) {
      if (selected.has(key)) {
        continue
      }

      if (candidate.iou >= relaxedMin && candidate.iou <= relaxedMax) {
        selected.set(key, candidate.silhouette)
      }

      if (selected.size >= count) {
        return [...selected.values()]
      }
    }
  }

  for (const [key, candidate] of shuffledCandidates) {
    if (!selected.has(key)) {
      selected.set(key, candidate.silhouette)
    }

    if (selected.size >= count) {
      break
    }
  }

  if (selected.size < count) {
    throw new Error('Unable to generate enough connected non-legal distractors')
  }

  return [...selected.values()]
}
