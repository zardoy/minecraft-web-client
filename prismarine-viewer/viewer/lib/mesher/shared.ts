import { BlockType } from '../../../examples/shared'

export const defaultMesherConfig = {
  version: '',
  enableLighting: true,
  skyLight: 15,
  smoothLighting: true,
  outputFormat: 'threeJs' as 'threeJs' | 'webgpu',
  textureSize: 1024, // for testing
  debugModelVariant: undefined as undefined | number[]
}

export type MesherConfig = typeof defaultMesherConfig

export type MesherGeometryOutput = {
  sx: number,
  sy: number,
  sz: number,
  // resulting: float32array
  positions: any,
  normals: any,
  colors: any,
  uvs: any,
  t_positions?: number[],
  t_normals?: number[],
  t_colors?: number[],
  t_uvs?: number[],

  indices: number[],
  tiles: Record<string, BlockType>,
  signs: Record<string, any>,
  // isFull: boolean
  highestBlocks: Map<string, HighestBlockInfo>
  hadErrors: boolean
  blocksCount: number
}

export type HighestBlockInfo = { y: number, stateId: number | undefined, biomeId: number | undefined }
