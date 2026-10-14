import { getRenamedData } from 'flying-squid/dist/blockRenames'
import { versionToNumber } from 'minecraft-renderer/src/lib/utils'
import collisionShapesInit from '../generated/latestBlockCollisionsShapes.json'

// defining globally to be used in loaded data, not sure of better workaround
window.globalGetCollisionShapes = (version) => {
  // todo use the same in resourcepack
  const versionFrom = collisionShapesInit.version
  const renamedBlocks = getRenamedData('blocks', Object.keys(collisionShapesInit.blocks), versionFrom, version)
  const blocks = Object.fromEntries(Object.entries(collisionShapesInit.blocks).map(([, shape], i) => [renamedBlocks[i], shape]))

  // Compatibility fallbacks for renames that `getRenamedData` does not
  // (yet) cover. Without these, `prismarine-block` spams
  // `No shape found for block <name>` and falls back to a default shape,
  // which is also visually/functionally wrong (e.g. an invisible cube
  // hitbox where a thin pillar should be).
  //
  // chain -> iron_chain in 1.21.9. Shapes are identical across all 6
  // axis states.
  if (versionToNumber(version) < versionToNumber('1.21.9') && blocks.iron_chain && !blocks.chain) {
    blocks.chain = blocks.iron_chain
  }

  const collisionShapes = {
    ...collisionShapesInit,
    blocks
  }
  return collisionShapes
}
