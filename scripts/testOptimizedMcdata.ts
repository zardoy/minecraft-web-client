import assert from 'assert'
import JsonOptimizer, { restoreMinecraftData } from '../src/optimizeJson'
import fs from 'fs'
import minecraftData from 'minecraft-data'

const json = JSON.parse(fs.readFileSync('./generated/minecraft-data-optimized.json', 'utf8'))

const dataPaths = require('minecraft-data/minecraft-data/data/dataPaths.json')

const validateData = (ver, type) => {
  const target = restoreMinecraftData(structuredClone(json), type, ver)
  const arrKey = json[type].arrKey
  const originalPath = dataPaths.pc[ver][type]
  const original = require(`minecraft-data/minecraft-data/data/${originalPath}/${type}.json`)
  if (arrKey) {
    const originalKeys = original.map(a => JsonOptimizer.getByArrKey(a, arrKey)) as string[]
    for (const [i, item] of originalKeys.entries()) {
      if (originalKeys.indexOf(item) !== i) {
        console.warn(`${type} ${ver} Incorrect source, duplicated arrKey (${arrKey}) ${item}. Ignoring!`) // todo should span instead
        const index = originalKeys.indexOf(item)
        original.splice(index, 1)
        originalKeys.splice(index, 1)
      }
    }
    // if (target.length !== originalKeys.length) {
    //   throw new Error(`wrong arr length: ${target.length} !== ${original.length}`)
    // }
    checkKeys(
      originalKeys,
      target.map(a => JsonOptimizer.getByArrKey(a, arrKey))
    )
    for (const item of target as any[]) {
      const keys = Object.entries(item).map(a => a[0])
      const origItem = original.find(a => JsonOptimizer.getByArrKey(a, arrKey) === JsonOptimizer.getByArrKey(item, arrKey))
      const keysSource = Object.entries(origItem).map(a => a[0])
      checkKeys(keysSource, keys, true, 'prop keys', true)
      checkObj(origItem, item)
    }
  } else {
    const keysOriginal = Object.keys(original)
    const keysTarget = Object.keys(target)
    checkKeys(keysOriginal, keysTarget)
    for (const key of keysTarget) {
      checkObj(original[key], target[key])
    }
  }
}

const sortObj = obj => {
  const sorted = {}
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key]
  }
  return sorted
}

const checkObj = (source, diffing) => {
  if (!Array.isArray(source)) {
    source = sortObj(source)
  }
  if (!Array.isArray(diffing)) {
    diffing = sortObj(diffing)
  }
  if (JSON.stringify(source) !== JSON.stringify(diffing)) {
    throw new Error(`different value: ${JSON.stringify(source)} ${JSON.stringify(diffing)}`)
  }
  // checkKeys(Object.keys(source), Object.keys(diffing))
  // for (const [key, val] of Object.entries(source)) {
  //   if (JSON.stringify(val) !== JSON.stringify(diffing[key])) {
  //     throw new Error(`different value of ${key}: ${val} ${diffing[key]}`)
  //   }
  // }
}

const checkKeys = (source, diffing, isUniq = true, msg = '', redundantIsOk = false) => {
  if (isUniq) {
    for (const [i, item] of diffing.entries()) {
      if (diffing.indexOf(item) !== i) {
        throw new Error(`Duplicate: ${item}: ${i} ${diffing.indexOf(item)} ${msg}`)
      }
    }
  }
  for (const key of source) {
    if (!diffing.includes(key)) {
      throw new Error(`Diffing does not include "${key}" (${msg})`)
    }
  }
  if (!redundantIsOk) {
    for (const key of diffing) {
      if (!source.includes(key)) {
        throw new Error(`Source does not include "${key}" (${msg})`)
      }
    }
  }
}

// const data = minecraftData('1.20.4')
const oldId = JsonOptimizer.restoreData(json['blocks'], '1.20', undefined).find(x => x.name === 'brown_stained_glass').id
const newId = JsonOptimizer.restoreData(json['blocks'], '1.20.4', undefined).find(x => x.name === 'brown_stained_glass').id
assert(oldId !== newId)
// test all types + all versions

for (const type of Object.keys(json)) {
  if (!json[type].__IS_OPTIMIZED__) continue
  if (type === 'language') continue // we have loose data for language for size reasons
  console.log('validating', type)
  const source = json[type]
  let checkedVer = 0
  for (const ver of Object.keys(source.diffs)) {
    try {
      validateData(ver, type)
    } catch (err) {
      err.message = `Failed to validate ${type} for ${ver}: ${err.message}`
      throw err
    }
    checkedVer++
  }
  console.log('Checked versions:', checkedVer)
}
