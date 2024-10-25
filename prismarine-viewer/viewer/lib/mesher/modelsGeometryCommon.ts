import { BlockModelPartsResolved } from './world'

export type BlockElement = NonNullable<BlockModelPartsResolved[0][0]['elements']>[0]


export function buildRotationMatrix (axis, degree) {
  const radians = degree / 180 * Math.PI
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const axis0 = { x: 0, y: 1, z: 2 }[axis]
  const axis1 = (axis0 + 1) % 3
  const axis2 = (axis0 + 2) % 3

  const matrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]

  matrix[axis0][axis0] = 1
  matrix[axis1][axis1] = cos
  matrix[axis1][axis2] = -sin
  matrix[axis2][axis1] = +sin
  matrix[axis2][axis2] = cos

  return matrix
}

export function vecadd3 (a, b) {
  if (!b) return a
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function vecsub3 (a, b) {
  if (!b) return a
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function matmul3 (matrix, vector): [number, number, number] {
  if (!matrix) return vector
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
  ]
}

export function matmulmat3 (a, b) {
  const te = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]

  const a11 = a[0][0]; const a12 = a[1][0]; const a13 = a[2][0]
  const a21 = a[0][1]; const a22 = a[1][1]; const a23 = a[2][1]
  const a31 = a[0][2]; const a32 = a[1][2]; const a33 = a[2][2]

  const b11 = b[0][0]; const b12 = b[1][0]; const b13 = b[2][0]
  const b21 = b[0][1]; const b22 = b[1][1]; const b23 = b[2][1]
  const b31 = b[0][2]; const b32 = b[1][2]; const b33 = b[2][2]

  te[0][0] = a11 * b11 + a12 * b21 + a13 * b31
  te[1][0] = a11 * b12 + a12 * b22 + a13 * b32
  te[2][0] = a11 * b13 + a12 * b23 + a13 * b33

  te[0][1] = a21 * b11 + a22 * b21 + a23 * b31
  te[1][1] = a21 * b12 + a22 * b22 + a23 * b32
  te[2][1] = a21 * b13 + a22 * b23 + a23 * b33

  te[0][2] = a31 * b11 + a32 * b21 + a33 * b31
  te[1][2] = a31 * b12 + a32 * b22 + a33 * b32
  te[2][2] = a31 * b13 + a32 * b23 + a33 * b33

  return te
}

export const elemFaces = {
  up: {
    side: 0,
    dir: [0, 1, 0],
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [0, 1, 1, 0, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 0, 0, 0],
      [1, 1, 0, 1, 0]
    ]
  },
  down: {
    side: 1,
    dir: [0, -1, 0],
    mask1: [1, 1, 0],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 1, 0, 1],
      [0, 0, 1, 1, 1],
      [1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0]
    ]
  },
  east: {
    side: 2,
    dir: [1, 0, 0],
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1]
    ]
  },
  west: {
    side: 3,
    dir: [-1, 0, 0],
    mask1: [1, 1, 0],
    mask2: [1, 0, 1],
    corners: [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 1, 1]
    ]
  },
  north: {
    side: 4,
    dir: [0, 0, -1],
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [1, 0, 0, 0, 1],
      [0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0],
      [0, 1, 0, 1, 0]
    ]
  },
  south: {
    side: 5,
    dir: [0, 0, 1],
    mask1: [1, 0, 1],
    mask2: [0, 1, 1],
    corners: [
      [0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 0]
    ]
  }
}
