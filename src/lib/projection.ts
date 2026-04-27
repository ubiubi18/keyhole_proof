import type { Polycube, Silhouette } from './geometry'
import { normalizeCells, serializeCells } from './geometry'
import { ROTATIONS_24, rotatePolycube } from './rotations'

export function projectToXY(cubes: readonly Polycube[number][]): Silhouette {
  return normalizeCells(cubes.map((cube) => ({ x: cube.x, y: cube.y })))
}

export function allLegalSilhouettes(cubes: readonly Polycube[number][]): Silhouette[] {
  const silhouettes = new Map<string, Silhouette>()

  for (const rotation of ROTATIONS_24) {
    const rotated = rotatePolycube(cubes, rotation)
    const silhouette = projectToXY(rotated)
    silhouettes.set(serializeCells(silhouette), silhouette)
  }

  return [...silhouettes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, silhouette]) => silhouette)
}
