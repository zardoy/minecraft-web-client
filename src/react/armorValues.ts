interface Armor {
  helmet: number
  chestplate: number | null
  leggings: number | null
  boots: number | null
}

export const armor: { [material: string]: Armor } = {
  turtle: {
    helmet: 2,
    chestplate: null,
    leggings: null,
    boots: null
  },
  leather: {
    helmet: 1,
    chestplate: 3,
    leggings: 2,
    boots: 1
  },
  golden: {
    helmet: 2,
    chestplate: 5,
    leggings: 3,
    boots: 1
  },
  chainmail: {
    helmet: 2,
    chestplate: 5,
    leggings: 4,
    boots: 1
  },
  iron: {
    helmet: 2,
    chestplate: 6,
    leggings: 5,
    boots: 2
  },
  diamond: {
    helmet: 3,
    chestplate: 8,
    leggings: 6,
    boots: 3
  },
  netherite: {
    helmet: 3,
    chestplate: 8,
    leggings: 6,
    boots: 3
  }
}
