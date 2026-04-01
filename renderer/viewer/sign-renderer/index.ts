import type { ChatMessage } from 'prismarine-chat'
import { createCanvas } from '../lib/utils'

type SignBlockEntity = {
  Color?: string
  GlowingText?: 0 | 1
  Text1?: string
  Text2?: string
  Text3?: string
  Text4?: string
} | {
  // todo
  is_waxed?: 0 | 1
  front_text: {
    color: string
    messages: string[]
    // todo
    has_glowing_text?: 0 | 1
  }
  // todo
  // back_text: {}
}

type JsonEncodedType = string | null | Record<string, any>

const parseSafe = (text: string, task: string) => {
  try {
    return JSON.parse(text)
  } catch (e) {
    console.warn(`Failed to parse ${task}`, e)
    return null
  }
}

const LEGACY_COLORS = {
  black: '#000000',
  dark_blue: '#0000AA',
  dark_green: '#00AA00',
  dark_aqua: '#00AAAA',
  dark_red: '#AA0000',
  dark_purple: '#AA00AA',
  gold: '#FFAA00',
  gray: '#AAAAAA',
  dark_gray: '#555555',
  blue: '#5555FF',
  green: '#55FF55',
  aqua: '#55FFFF',
  red: '#FF5555',
  light_purple: '#FF55FF',
  yellow: '#FFFF55',
  white: '#FFFFFF',
}

export const renderSign = (
  blockEntity: SignBlockEntity,
  isHanging: boolean,
  PrismarineChat: typeof ChatMessage,
  ctxHook = (ctx) => { },
  canvasCreator = (width, height): OffscreenCanvas => { return createCanvas(width, height) }
) => {
  // todo don't use texture rendering, investigate the font rendering when possible
  // or increase factor when needed
  const factor = 40
  const fontSize = 1.6 * factor
  const signboardY = [16, 9]
  const heightOffset = signboardY[0] - signboardY[1]
  const heightScalar = heightOffset / 16
  // todo the text should be clipped based on it's render width (needs investigate)

  const texts = 'front_text' in blockEntity ? /* > 1.20 */ blockEntity.front_text.messages : [
    blockEntity.Text1,
    blockEntity.Text2,
    blockEntity.Text3,
    blockEntity.Text4
  ]

  if (!texts.some((text) => text !== 'null')) {
    return undefined
  }

  const canvas = canvasCreator(16 * factor, heightOffset * factor)

  const _ctx = canvas.getContext('2d')!

  ctxHook(_ctx)
  const defaultColor = ('front_text' in blockEntity ? blockEntity.front_text.color : blockEntity.Color) || 'black'
  for (const [lineNum, text] of texts.slice(0, 4).entries()) {
    if (text === 'null') continue
    renderComponent(text, PrismarineChat, canvas, fontSize, defaultColor, fontSize * (lineNum + 1) + (isHanging ? 0 : -8))
  }
  return canvas
}

export const renderComponent = (
  text: JsonEncodedType | string | undefined,
  PrismarineChat: typeof ChatMessage,
  canvas: OffscreenCanvas,
  fontSize: number,
  defaultColor: string,
  offset = 0
) => {
  // todo: in pre flatenning it seems the format was not json
  const parsed = typeof text === 'string' && (text?.startsWith('{') || text?.startsWith('"')) ? parseSafe(text ?? '""', 'sign text') : text
  if (!parsed || (typeof parsed !== 'object' && typeof parsed !== 'string')) return
  // todo fix type

  const ctx = canvas.getContext('2d')!
  if (!ctx) throw new Error('Could not get 2d context')
  ctx.imageSmoothingEnabled = false
  ctx.font = `${fontSize}px mojangles`

  type Formatting = {
    color: string | undefined
    underlined: boolean | undefined
    strikethrough: boolean | undefined
    bold: boolean | undefined
    italic: boolean | undefined
  }

  type Message = ChatMessage & Formatting & { text: string }

  const message = new PrismarineChat(parsed) as Message

  const toRenderCanvas: Array<{
    fontStyle: string
    fillStyle: string
    underlineStyle: boolean
    strikeStyle: boolean
    offset: number
    text: string
  }> = []
  let visibleFormatting = false
  let plainText = ''
  let textOffset = offset
  const textWidths: number[] = []

  const renderText = (component: Message, parentFormatting?: Formatting | undefined) => {
    if (component.text !== null && component.text !== undefined && typeof component.text !== 'string') {
      console.warn('renderText received non-string text value:', typeof component.text, component.text)
    }
    const text = component.text === null || component.text === undefined ? undefined : String(component.text)
    const formatting = {
      color: component.color ?? parentFormatting?.color,
      underlined: component.underlined ?? parentFormatting?.underlined,
      strikethrough: component.strikethrough ?? parentFormatting?.strikethrough,
      bold: component.bold ?? parentFormatting?.bold,
      italic: component.italic ?? parentFormatting?.italic
    }
    visibleFormatting = visibleFormatting || formatting.underlined || formatting.strikethrough || false
    if (text?.includes('\n')) {
      for (const line of text.split('\n')) {
        addTextPart(line, formatting)
        textOffset += fontSize
        plainText = ''
      }
    } else if (text) {
      addTextPart(text, formatting)
    }
    if (component.extra) {
      for (const child of component.extra) {
        renderText(child as Message, formatting)
      }
    }
  }

  const addTextPart = (text: string, formatting: Formatting) => {
    plainText += text
    textWidths[textOffset] = ctx.measureText(plainText).width
    let color = formatting.color ?? defaultColor
    if (!color.startsWith('#')) {
      color = LEGACY_COLORS[color.toLowerCase()] || color
    }
    toRenderCanvas.push({
      fontStyle: `${formatting.bold ? 'bold' : ''} ${formatting.italic ? 'italic' : ''}`,
      fillStyle: color,
      underlineStyle: formatting.underlined ?? false,
      strikeStyle: formatting.strikethrough ?? false,
      offset: textOffset,
      text
    })
  }

  renderText(message)

  // skip rendering empty lines
  if (!visibleFormatting && !message.toString().trim()) return

  let renderedWidth = 0
  let previousOffsetY = 0
  for (const { fillStyle, fontStyle, underlineStyle, strikeStyle, offset: offsetY, text } of toRenderCanvas) {
    if (previousOffsetY !== offsetY) {
      renderedWidth = 0
    }
    previousOffsetY = offsetY
    ctx.fillStyle = fillStyle
    ctx.textRendering = 'optimizeLegibility'
    ctx.font = `${fontStyle} ${fontSize}px mojangles`
    const textWidth = textWidths[offsetY] ?? ctx.measureText(text).width
    const offsetX = (canvas.width - textWidth) / 2 + renderedWidth
    ctx.fillText(text, offsetX, offsetY)
    if (strikeStyle) {
      ctx.lineWidth = fontSize / 8
      ctx.strokeStyle = fillStyle
      ctx.beginPath()
      ctx.moveTo(offsetX, offsetY - ctx.lineWidth * 2.5)
      ctx.lineTo(offsetX + ctx.measureText(text).width, offsetY - ctx.lineWidth * 2.5)
      ctx.stroke()
    }
    if (underlineStyle) {
      ctx.lineWidth = fontSize / 8
      ctx.strokeStyle = fillStyle
      ctx.beginPath()
      ctx.moveTo(offsetX, offsetY + ctx.lineWidth)
      ctx.lineTo(offsetX + ctx.measureText(text).width, offsetY + ctx.lineWidth)
      ctx.stroke()
    }
    renderedWidth += ctx.measureText(text).width
  }
}
