import { supportedVersions, postNettyVersionsByProtocolVersion } from 'minecraft-data'

export const ignoredVersionsRegex = /(^0\.30c$)|w|-pre|-rc/

/** @type {string[]} */
const versionsFromProtocol = Object.values(postNettyVersionsByProtocolVersion.pc).flat().filter(x => !ignoredVersionsRegex.test(x.minecraftVersion)).map(x => x.minecraftVersion)

export const notTestedVersions = '1.19.3 1.20 1.19.1 1.19 1.18.1 1.15.1 1.14.1'.split(' ')

export const FORBIDDEN_VERSION_THRESHOLD = '1.21.1000'
export const FORBIDDEN_VERSION_THRESHOLD_SINGLEPLAYER = '1.21.7'
export const versionToNumber = (ver) => {
  const [x, y = '0', z = '0'] = ver.split('.')
  return +`${x.padStart(2, '0')}${y.padStart(2, '0')}${z.padStart(2, '0')}`
}

const forbiddenVersionThresholdNum = versionToNumber(FORBIDDEN_VERSION_THRESHOLD)

export default versionsFromProtocol.filter(x => {
  if (x === '1.7' || x.startsWith('1.7.')) return false
  // Filter out versions >= 1.21.7
  const versionNum = versionToNumber(x)
  return versionNum < forbiddenVersionThresholdNum
})
