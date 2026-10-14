import { ComponentProps } from 'react'
import { render } from '@xmcl/text-component'
import { noCase } from 'change-case'
import mojangson from 'mojangson'
import { openURL } from 'minecraft-renderer/src/lib/simpleUtils'
import { MessageFormatOptions, MessageFormatPart } from '../chatUtils'
import { lastConnectOptions } from '../appStatus'
import { runAuthFlow } from '../core/authModal'
import { chatInputValueGlobal } from './Chat'
import './MessageFormatted.css'
import { showOptionsModal } from './SelectOption'
import { showAutoFillLoginModal } from './AutoFillLoginModal'
import { findServerPassword } from './serversStorage'

const hoverItemToText = (hoverEvent: MessageFormatPart['hoverEvent']) => {
  try {
    if (!hoverEvent) return undefined
    const contents = hoverEvent['contents'] ?? hoverEvent.value
    if (typeof contents.text === 'string' && contents.text.startsWith('{')) {
      Object.assign(contents, mojangson.simplify(mojangson.parse(contents.text)))
    }
    if (typeof contents === 'string') return contents
    // if (hoverEvent.action === 'show_text') {
    //   return contents
    // }
    if (hoverEvent.action === 'show_item') {
      return contents.id
    }
    if (hoverEvent.action === 'show_entity') {
      let str = noCase(contents.type.replace('minecraft:', ''))
      if (contents.name) str += `: ${contents.name.text}`
      return str
    }
  } catch (err) {
    // todo report critical error
    reportError?.('Failed to parse message hover' + err.message)
    return undefined
  }
}

const clickEventToProps = (clickEvent: MessageFormatPart['clickEvent']) => {
  if (!clickEvent) return
  if (clickEvent.action === 'run_command' || clickEvent.action === 'suggest_command') {
    return {
      onClick () {
        chatInputValueGlobal.value = clickEvent.value
      }
    }
  }
  if (clickEvent.action === 'open_url' || clickEvent.action === 'open_file') {
    return {
      async onClick () {
        const promptMessageText = `Open "${clickEvent.value}"?`
        const confirm = await showOptionsModal(promptMessageText, ['Open', 'Copy'], {
          cancel: true
        })
        if (confirm === 'Open') {
          openURL(clickEvent.value)
        } else if (confirm === 'Copy') {
          void navigator.clipboard.writeText(clickEvent.value)
        }
      }
    }
  }
  if (clickEvent.action === 'copy_to_clipboard') {
    return {
      onClick () {
        void navigator.clipboard.writeText(clickEvent.value)
      }
    }
  }
  const customAction = (clickEvent as { action: string }).action
  if (customAction === 'open_auto_fill_login' || customAction === 'open_auto_fill_register' || customAction === 'open_change_password' || customAction === 'open_unregister') {
    return {
      onClick () {
        const mode: 'login' | 'register' | 'changepassword' | 'unregister' =
          customAction === 'open_auto_fill_register' ? 'register' :
            customAction === 'open_change_password' ? 'changepassword' :
              customAction === 'open_unregister' ? 'unregister' : 'login'
        void openAutoFillLogin(mode)
      }
    }
  }
}

const openAutoFillLogin = async (mode: 'login' | 'register' | 'changepassword' | 'unregister') => {
  const serverIp = lastConnectOptions.value?.server
  const username = (globalThis as any).bot?.username as string | undefined
  if (!serverIp || !username) {
    console.warn('[openAutoFillLogin] missing serverIp or username', { serverIp, username })
    return
  }
  const prefilledPassword = findServerPassword()
  const result = await showAutoFillLoginModal({ mode, serverIp, username, prefilledPassword })
  if (!result?.password) return
  const { bot } = (globalThis as any)
  runAuthFlow(bot, mode, result, { serverIp, username, source: 'modal' })
}

export const MessagePart = ({ part, formatOptions, ...props }: { part: MessageFormatPart, formatOptions?: MessageFormatOptions } & ComponentProps<'span'>) => {

  const { color: _color, italic, bold, underlined, strikethrough, text, clickEvent, hoverEvent, obfuscated } = part
  const color = _color ?? 'white'

  const clickProps = clickEventToProps(clickEvent)
  const hoverMessageRaw = hoverItemToText(hoverEvent)
  const hoverItemText = hoverMessageRaw && typeof hoverMessageRaw !== 'string' ? render(hoverMessageRaw).children.map(child => child.component.text).join('') : hoverMessageRaw

  const applyStyles = [
    clickProps && messageFormatStylesMap.clickEvent,
    colorF(color.toLowerCase()) + ((formatOptions?.doShadow ?? true) ? `; text-shadow: 1px 1px 0px ${getColorShadow(colorF(color.toLowerCase()).replace('color:', ''))}` : ''),
    italic && messageFormatStylesMap.italic,
    bold && messageFormatStylesMap.bold,
    italic && messageFormatStylesMap.italic,
    underlined && messageFormatStylesMap.underlined,
    strikethrough && messageFormatStylesMap.strikethrough,
    obfuscated && messageFormatStylesMap.obfuscated
  ].filter(a => a !== false && a !== undefined).filter(Boolean)

  return <span title={hoverItemText} style={parseInlineStyle(applyStyles.join(';'))} {...clickProps} {...props}>{text}</span>
}

export default ({ parts, className, formatOptions }: { parts: readonly MessageFormatPart[], className?: string, formatOptions?: MessageFormatOptions }) => {
  return (
    <span className={`formatted-message ${className ?? ''}`}>
      {parts.map((part, i) => <MessagePart key={i} part={part} formatOptions={formatOptions} />)}
    </span>
  )
}

const colorF = (color) => {
  return color.trim().startsWith('#') ? `color:${color}` : messageFormatStylesMap[color] ?? undefined
}

export function getColorShadow (hex, dim = 0.25) {
  const color = parseInt(hex.replace('#', ''), 16)

  const r = Math.trunc((color >> 16 & 0xFF) * dim)
  const g = Math.trunc((color >> 8 & 0xFF) * dim)
  const b = Math.trunc((color & 0xFF) * dim)

  const f = (c) => ('00' + c.toString(16)).slice(-2)
  return `#${f(r)}${f(g)}${f(b)}`
}

export function parseInlineStyle (style: string): Record<string, any> {
  const obj: Record<string, any> = {}
  for (const rule of style.split(';')) {
    const [prop, value] = rule.split(':')
    const cssInJsProp = prop.trim().replaceAll(/-./g, (x) => x.toUpperCase()[1])
    obj[cssInJsProp] = value.trim()
  }
  return obj
}

export const messageFormatStylesMap = {
  black: 'color:color(display-p3 0 0 0)',
  dark_blue: 'color:color(display-p3 0 0 0.6667)',
  dark_green: 'color:color(display-p3 0 0.6667 0)',
  dark_aqua: 'color:color(display-p3 0 0.6667 0.6667)',
  dark_red: 'color:color(display-p3 0.6667 0 0)',
  dark_purple: 'color:color(display-p3 0.6667 0 0.6667)',
  gold: 'color:color(display-p3 1 0.6667 0)',
  gray: 'color:color(display-p3 0.6667 0.6667 0.6667)',
  dark_gray: 'color:color(display-p3 0.3333 0.3333 0.3333)',
  blue: 'color:color(display-p3 0.3333 0.3333 1)',
  green: 'color:color(display-p3 0.3333 1 0.3333)',
  aqua: 'color:color(display-p3 0.3333 1 1)',
  red: 'color:color(display-p3 1 0.3333 0.3333)',
  light_purple: 'color:color(display-p3 1 0.3333 1)',
  yellow: 'color:color(display-p3 1 1 0.3333)',
  white: 'color:color(display-p3 1 1 1)',
  bold: 'font-weight:900',
  strikethrough: 'text-decoration:line-through',
  underlined: 'text-decoration:underline',
  italic: 'font-style:italic',
  obfuscated: 'filter:blur(2px)',
  clickEvent: 'cursor:pointer',
}
