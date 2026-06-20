import { proxy, useSnapshot } from 'valtio'
import { useEffect, useRef, Fragment } from 'react'
import type { UIDefinition } from 'mcraft-fun-mineflayer/build/customChannel'
import MessageFormattedString from './MessageFormattedString'
import { useUiMotion } from './uiMotion'
import PixelartIcon from './PixelartIcon'

export const mineflayerPluginHudState = proxy({
  ui: [] as Array<UIDefinition & { id: string }>
})

type TextPart = { type: 'text'; content: string } | { type: 'icon'; iconName: string }

const parseTextWithIcons = (text: string): TextPart[] => {
  const parts: TextPart[] = []
  let currentText = ''
  let i = 0

  while (i < text.length) {
    if (text[i] === '{' && text.slice(i, i + 6) === '{icon:') {
      // If we have accumulated text before the icon, add it
      if (currentText) {
        parts.push({ type: 'text', content: currentText })
        currentText = ''
      }

      // Find the end of the icon placeholder
      const endBrace = text.indexOf('}', i)
      if (endBrace !== -1) {
        const iconName = text.slice(i + 6, endBrace)
        parts.push({ type: 'icon', iconName })
        i = endBrace + 1
        continue
      }
    }
    currentText += text[i]
    i++
  }

  // Add any remaining text
  if (currentText) {
    parts.push({ type: 'text', content: currentText })
  }

  return parts
}

const TextElement = ({ text, x, y, motion = true, formatted = true, css = '', onTab = false }: UIDefinition & { type: 'text' }) => {
  const motionRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useUiMotion(motionRef, motion)

  useEffect(() => {
    if (!css) return
    innerRef.current!.style.cssText = css
  }, [css])

  if (onTab && !document.hidden) return null

  const parts = parseTextWithIcons(text)

  return (
    <div
      ref={motionRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transition: motion ? 'transform 0.1s ease-out' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '2px'
      }}
    >
      <div ref={innerRef}>
        {parts.map((part, index) => (
          <Fragment key={index}>
            {part.type === 'text' ? (
              formatted ? (
                <MessageFormattedString message={part.content} />
              ) : (
                part.content
              )
            ) : (
              <PixelartIcon iconName={part.iconName} width={12} styles={{ display: 'inline-block' }} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

const ImageElement = ({ url, x, y, width, height }: UIDefinition & { type: 'image' }) => {
  return (
    <img
      src={url}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height
      }}
      alt=""
    />
  )
}

export default () => {
  const { ui } = useSnapshot(mineflayerPluginHudState)

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} className="mineflayer-plugin-hud">
      {ui.map((element, index) => {
        if (element.type === 'lil') return null // Handled elsewhere
        if (element.type === 'text') return <TextElement key={index} {...element} />
        if (element.type === 'image') return <ImageElement key={index} {...element} />
        return null
      })}
    </div>
  )
}
