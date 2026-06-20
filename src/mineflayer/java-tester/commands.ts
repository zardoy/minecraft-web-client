import { versionToNumber } from 'flying-squid/dist/utils'

const customStickNbt = (tags: Record<string, any>) => {
  let cmd = '/give @p stick'
  const wrapIntoQuotes = versionToNumber(bot.version) < versionToNumber('1.21.5')
  cmd += `[${Object.entries(tags)
    .map(([key, value]) => {
      if (typeof value === 'object') {
        value = JSON.stringify(value)
      }
      return `${key}=${wrapIntoQuotes ? `'${value}'` : value}`
    })
    .join(',')}]`
  return cmd
}

const writeCmd = (cmd: string) => {
  if (!cmd.startsWith('/')) cmd = `/${cmd}`
  console.log('Executing', cmd)
  bot.chat(cmd)
}

let msg = 0
const LIMIT_MSG = 100
export const javaServerTester = {
  itemCustomLore() {
    const cmd = customStickNbt({
      lore: [{ text: 'This Stick is very sticky.' }]
    })
    writeCmd(cmd)
  },

  itemCustomModel() {
    const cmd = customStickNbt({
      item_model: 'minecraft:diamond'
    })
    writeCmd(cmd)
  },
  itemCustomModel2() {
    const cmd = customStickNbt({
      item_model: 'diamond'
    })
    writeCmd(cmd)
  },

  itemCustomName() {
    const cmd = customStickNbt({
      custom_name: [{ text: 'diamond' }]
    })
    writeCmd(cmd)
  },
  itemCustomName2() {
    const cmd = customStickNbt({
      custom_name: [{ translate: 'item.diamond.name' }]
    })
    writeCmd(cmd)
  },

  spamChat() {
    for (let i = msg; i < msg + LIMIT_MSG; i++) {
      bot.chat('Hello, world, ' + i)
    }
    msg += LIMIT_MSG
  },
  spamChatComplexMessage() {
    for (let i = msg; i < msg + LIMIT_MSG; i++) {
      bot.chat('/tell @a ' + i)
    }
  }
}
