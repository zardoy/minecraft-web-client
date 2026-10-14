// this should actually be moved to mineflayer / renderer

import { fromFormattedString, TextComponent } from '@xmcl/text-component'
import type { IndexedData } from 'minecraft-data'
import { versionToNumber } from 'minecraft-renderer/src/lib/utils'

export interface MessageFormatOptions {
  doShadow?: boolean
}

export type MessageFormatPart = Pick<TextComponent, 'hoverEvent' | 'clickEvent'> & {
  text: string
  color?: string
  bold?: boolean
  italic?: boolean
  underlined?: boolean
  strikethrough?: boolean
  obfuscated?: boolean
}

type MessageInput = {
  text?: string
  translate?: string
  with?: Array<MessageInput | string>
  color?: string
  bold?: boolean
  italic?: boolean
  underlined?: boolean
  strikethrough?: boolean
  obfuscated?: boolean
  extra?: MessageInput[]
  json?: any
}

const global = globalThis as any

// todo move to sign-renderer, replace with prismarine-chat, fix mcData issue!
export const formatMessage = (message: MessageInput, mcData: IndexedData = global.loadedData) => {
  let msglist: MessageFormatPart[] = []

  const readMsg = (msg: MessageInput) => {
    const styles = {
      color: msg.color,
      bold: !!msg.bold,
      italic: !!msg.italic,
      underlined: !!msg.underlined,
      strikethrough: !!msg.strikethrough,
      obfuscated: !!msg.obfuscated
    }

    if (!msg.text && typeof msg.json?.[''] === 'string') msg.text = msg.json['']
    if (msg.text) {
      msglist.push({
        ...msg,
        text: msg.text,
        ...styles
      })
    } else if (msg.translate) {
      const tText = mcData?.language[msg.translate] ?? msg.translate

      if (msg.with) {
        const splitted = tText.split(/%s|%\d+\$s/g)

        let i = 0
        for (const [j, part] of splitted.entries()) {
          msglist.push({ text: part, ...styles })

          if (j + 1 < splitted.length) {
            if (msg.with[i]) {
              const msgWith = msg.with[i]
              if (typeof msgWith === 'string') {
                readMsg({
                  ...styles,
                  text: msgWith
                })
              } else {
                readMsg({
                  ...styles,
                  ...msgWith
                })
              }
            }
            i++
          }
        }
      } else {
        msglist.push({
          ...msg,
          text: tText,
          ...styles
        })
      }
    }

    if (msg.extra) {
      for (let ex of msg.extra) {
        if (typeof ex === 'string') {
          ex = { text: ex }
        }
        readMsg({ ...styles, ...ex })
      }
    }
  }

  readMsg(message)

  const flat = (msg) => {
    return [msg, msg.extra?.flatMap(flat) ?? []]
  }

  msglist = msglist.map(msg => {
    // normalize §
    if (!msg.text.includes?.('§')) return msg
    const newMsg = fromFormattedString(msg.text)
    return flat(newMsg)
  }).flat(Infinity)

  return msglist
}

export const messageToString = (message: MessageInput | string) => {
  if (typeof message === 'string') {
    return message
  }
  const msglist = formatMessage(message)
  return msglist.map(msg => msg.text).join('')
}

const blockToItemRemaps = {
  water: 'water_bucket',
  lava: 'lava_bucket',
  redstone_wire: 'redstone',
  tripwire: 'tripwire_hook'
}

export const getItemFromBlock = (block: import('prismarine-block').Block) => {
  const item = global.loadedData.itemsByName[blockToItemRemaps[block.name] ?? block.name]
  return item
}

export function isAllowedChatCharacter (char: string): boolean {
  // if (char.length !== 1) {
  //   throw new Error('Input must be a single character')
  // }

  const charCode = char.codePointAt(0)!
  return charCode !== 167 && charCode >= 32 && charCode !== 127
}

export const isStringAllowed = (str: string) => {
  const invalidChars = new Set<string>()
  for (const [i, char] of [...str].entries()) {
    const isSurrogatePair = str.codePointAt(i) !== str['charCodeAt'](i)
    if (isSurrogatePair) continue

    if (!isAllowedChatCharacter(char)) {
      invalidChars.add(char)
    }
  }

  const valid = invalidChars.size === 0
  if (valid) {
    return {
      valid: true
    }
  }

  return {
    valid,
    clean: [...str].filter(c => !invalidChars.has(c)).join(''),
    invalid: [...invalidChars]
  }
}
