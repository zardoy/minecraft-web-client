import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { options } from '../optionsStorage'
import { activeModalStack } from '../globalState'
import { videoCursorInteraction } from '../customChannels'
// import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import styles from './TouchInteractionHint.module.css'
import { useUsingTouch } from './utilsApp'
import Button from './Button'

export default () => {
  const usingTouch = useUsingTouch()
  const modalStack = useSnapshot(activeModalStack)
  const { touchInteractionType } = useSnapshot(options)
  const [hintText, setHintText] = useState<string | null>(null)
  const [entityName, setEntityName] = useState<string | null>(null)

  useEffect(() => {
    const update = () => {
      const videoInteraction = videoCursorInteraction()
      if (videoInteraction) {
        setHintText(`Interact with video`)
        setEntityName(null)
      } else {
        const cursorState = bot.mouse.getCursorState()
        if (cursorState.entity) {
          const name = cursorState.entity.displayName ?? cursorState.entity.name ?? 'Entity'
          setHintText(`Attack ${name}`)
          setEntityName(name)
        } else {
          setHintText(null)
          setEntityName(null)
        }
      }
    }

    // Initial update
    update()

    // Subscribe to physics ticks
    bot.on('physicsTick', update)

    return () => {
      bot?.removeListener('physicsTick', update)
    }
  }, [])

  const handleUseButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    document.dispatchEvent(new MouseEvent('mousedown', { button: 2 }))
    bot.mouse.update()
    document.dispatchEvent(new MouseEvent('mouseup', { button: 2 }))
  }

  if (!usingTouch || touchInteractionType !== 'classic' || modalStack.length > 0) return null
  if (!hintText && !entityName) return null

  // need to hide "Use" button if there isn't an entity name, but there is a hint text
  if (!entityName) return null

  return (
    <div className={`${styles.hint_container} interaction-hint`}>
      {/* temporary hide hint indicator and text */}
      {/* <PixelartIcon iconName={pixelartIcons['sun-alt']} width={14} />
      <span className={styles.hint_text}>{hintText || 'Attack entity'}</span> */}
      <Button onClick={handleUseButtonClick}>{`Use ${entityName}`}</Button>
    </div>
  )
}
