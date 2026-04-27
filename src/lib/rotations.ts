import type { Cube, Polycube } from './geometry'

type AxisName = 'x' | 'y' | 'z'
type Sign = -1 | 1

export type RotationAxis = {
  axis: AxisName
  sign: Sign
}

export type Rotation = readonly [RotationAxis, RotationAxis, RotationAxis]

const AXIS_PERMUTATIONS: readonly (readonly AxisName[])[] = [
  ['x', 'y', 'z'],
  ['x', 'z', 'y'],
  ['y', 'x', 'z'],
  ['y', 'z', 'x'],
  ['z', 'x', 'y'],
  ['z', 'y', 'x'],
]

const SIGNS: readonly Sign[] = [-1, 1]

function permutationParity(axes: readonly AxisName[]): Sign {
  const order = axes.map((axis) => ({ x: 0, y: 1, z: 2 })[axis])
  let inversions = 0

  for (let i = 0; i < order.length; i += 1) {
    for (let j = i + 1; j < order.length; j += 1) {
      if (order[i] > order[j]) {
        inversions += 1
      }
    }
  }

  return inversions % 2 === 0 ? 1 : -1
}

function serializeRotation(rotation: Rotation): string {
  return rotation.map((axis) => `${axis.sign}${axis.axis}`).join(',')
}

function generateRotations(): Rotation[] {
  const rotations: Rotation[] = []

  for (const axes of AXIS_PERMUTATIONS) {
    const parity = permutationParity(axes)
    for (const sx of SIGNS) {
      for (const sy of SIGNS) {
        for (const sz of SIGNS) {
          // A cube rotation is an orientation-preserving signed permutation
          // matrix, so its determinant must be +1.
          if (parity * sx * sy * sz !== 1) {
            continue
          }

          rotations.push([
            { axis: axes[0], sign: sx },
            { axis: axes[1], sign: sy },
            { axis: axes[2], sign: sz },
          ])
        }
      }
    }
  }

  const unique = new Set(rotations.map(serializeRotation))
  if (rotations.length !== 24 || unique.size !== 24) {
    throw new Error(`Expected 24 unique cube rotations, got ${unique.size}`)
  }

  return rotations
}

export const ROTATIONS_24: readonly Rotation[] = generateRotations()

function signedAxisValue(cube: Cube, axis: RotationAxis): number {
  return cube[axis.axis] * axis.sign
}

export function rotateCube(cube: Cube, rotation: Rotation): Cube {
  return {
    x: signedAxisValue(cube, rotation[0]),
    y: signedAxisValue(cube, rotation[1]),
    z: signedAxisValue(cube, rotation[2]),
  }
}

export function rotatePolycube(cubes: readonly Cube[], rotation: Rotation): Polycube {
  return cubes.map((cube) => rotateCube(cube, rotation))
}
