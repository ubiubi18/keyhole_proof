export type Cube = { x: number; y: number; z: number }
export type Cell2D = { x: number; y: number }
export type Polycube = Cube[]
export type Silhouette = Cell2D[]

export type Bounds3D = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
  width: number
  height: number
  depth: number
}

export type Bounds2D = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

function cubeKey(cube: Cube): string {
  return `${cube.x},${cube.y},${cube.z}`
}

function cellKey(cell: Cell2D): string {
  return `${cell.x},${cell.y}`
}

function sortCubes(a: Cube, b: Cube): number {
  return a.x - b.x || a.y - b.y || a.z - b.z
}

function sortCells(a: Cell2D, b: Cell2D): number {
  return a.x - b.x || a.y - b.y
}

export function uniqueCubes(cubes: readonly Cube[]): Polycube {
  const seen = new Set<string>()
  const unique: Polycube = []

  for (const cube of cubes) {
    const key = cubeKey(cube)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push({ ...cube })
    }
  }

  return unique.sort(sortCubes)
}

export function uniqueCells(cells: readonly Cell2D[]): Silhouette {
  const seen = new Set<string>()
  const unique: Silhouette = []

  for (const cell of cells) {
    const key = cellKey(cell)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push({ ...cell })
    }
  }

  return unique.sort(sortCells)
}

export function getBounds3D(cubes: readonly Cube[]): Bounds3D {
  if (cubes.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
      width: 0,
      height: 0,
      depth: 0,
    }
  }

  let minX = cubes[0].x
  let maxX = cubes[0].x
  let minY = cubes[0].y
  let maxY = cubes[0].y
  let minZ = cubes[0].z
  let maxZ = cubes[0].z

  for (const cube of cubes) {
    minX = Math.min(minX, cube.x)
    maxX = Math.max(maxX, cube.x)
    minY = Math.min(minY, cube.y)
    maxY = Math.max(maxY, cube.y)
    minZ = Math.min(minZ, cube.z)
    maxZ = Math.max(maxZ, cube.z)
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    depth: maxZ - minZ + 1,
  }
}

export function getBounds2D(cells: readonly Cell2D[]): Bounds2D {
  if (cells.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 }
  }

  let minX = cells[0].x
  let maxX = cells[0].x
  let minY = cells[0].y
  let maxY = cells[0].y

  for (const cell of cells) {
    minX = Math.min(minX, cell.x)
    maxX = Math.max(maxX, cell.x)
    minY = Math.min(minY, cell.y)
    maxY = Math.max(maxY, cell.y)
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

export function normalizeCubes(cubes: readonly Cube[]): Polycube {
  const unique = uniqueCubes(cubes)
  const bounds = getBounds3D(unique)

  return uniqueCubes(
    unique.map((cube) => ({
      x: cube.x - bounds.minX,
      y: cube.y - bounds.minY,
      z: cube.z - bounds.minZ,
    })),
  )
}

export function normalizeCells(cells: readonly Cell2D[]): Silhouette {
  const unique = uniqueCells(cells)
  const bounds = getBounds2D(unique)

  return uniqueCells(
    unique.map((cell) => ({
      x: cell.x - bounds.minX,
      y: cell.y - bounds.minY,
    })),
  )
}

export function serializeCubes(cubes: readonly Cube[]): string {
  return normalizeCubes(cubes)
    .map((cube) => cubeKey(cube))
    .join('|')
}

export function serializeCells(cells: readonly Cell2D[]): string {
  return normalizeCells(cells)
    .map((cell) => cellKey(cell))
    .join('|')
}

export function neighbors3D(cube: Cube): Cube[] {
  return [
    { x: cube.x + 1, y: cube.y, z: cube.z },
    { x: cube.x - 1, y: cube.y, z: cube.z },
    { x: cube.x, y: cube.y + 1, z: cube.z },
    { x: cube.x, y: cube.y - 1, z: cube.z },
    { x: cube.x, y: cube.y, z: cube.z + 1 },
    { x: cube.x, y: cube.y, z: cube.z - 1 },
  ]
}

export function neighbors2D(cell: Cell2D): Cell2D[] {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ]
}

export function areFaceConnected(cubes: readonly Cube[]): boolean {
  const unique = uniqueCubes(cubes)
  if (unique.length === 0) {
    return true
  }

  const occupied = new Set(unique.map(cubeKey))
  const visited = new Set<string>()
  const queue: Cube[] = [unique[0]]
  visited.add(cubeKey(unique[0]))

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of neighbors3D(current)) {
      const key = cubeKey(neighbor)
      if (occupied.has(key) && !visited.has(key)) {
        visited.add(key)
        queue.push(neighbor)
      }
    }
  }

  return visited.size === unique.length
}
