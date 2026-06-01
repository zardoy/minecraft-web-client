import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { handleMobileButtonActionCommand, handleMobileButtonLongPress } from '../controls'
import { watchValue } from '../optionsStorage'
import { type MobileButtonConfig, type ActionHoldConfig, type ActionType, type CustomAction } from '../appConfig'
import { miscUiState } from '../globalState'
import PixelartIcon from './PixelartIcon'
import styles from './MobileTopButtons.module.css'

const isHeightGreaterThanWidth = () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth

export default () => {
  const elRef = useRef<HTMLDivElement | null>(null)
  const { appConfig } = useSnapshot(miscUiState)
  const mobileButtonsConfig = appConfig?.mobileButtons
  const [portraitTallAspect, setPortraitTallAspect] = useState(isHeightGreaterThanWidth)

  const longPressTimerIdRef = useRef<number | null>(null)
  const actionToShortPressRef = useRef<ActionType | null>(null)

  const showMobileControls = (visible: boolean) => {
    if (elRef.current) {
      elRef.current.style.display = visible ? 'flex' : 'none'
    }
  }

  useEffect(() => {
    watchValue(miscUiState, o => {
      showMobileControls(Boolean(o.currentTouch))
    })
  }, [])

  useEffect(() => {
    const sync = () => setPortraitTallAspect(isHeightGreaterThanWidth())
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  const getButtonClassName = (button: MobileButtonConfig): string => {
    const actionForStyle = button.action || (button.actionHold && typeof button.actionHold === 'object' && 'command' in button.actionHold ? button.actionHold.command : undefined)

    if (typeof actionForStyle === 'string') {
      switch (actionForStyle) {
        case 'general.chat':
          return styles['chat-btn']
        case 'ui.pauseMenu':
          return styles['pause-btn']
        case 'general.playersList':
          return styles['tab-btn']
        default:
          return styles['debug-btn']
      }
    }
    return styles['debug-btn']
  }

  const renderConfigButtons = () => {
    return mobileButtonsConfig?.map((button, index) => {
      const className = getButtonClassName(button)
      let label: string | JSX.Element = button.icon || button.label || ''

      if (typeof label === 'string' && label.startsWith('pixelarticons:')) {
        const iconName = label.replace('pixelarticons:', '')
        label = <PixelartIcon iconName={iconName} />
      }

      const onPointerDown = (e: React.PointerEvent) => {
        const elem = e.currentTarget as HTMLElement
        elem.setPointerCapture(e.pointerId)

        if (longPressTimerIdRef.current) {
          clearTimeout(longPressTimerIdRef.current)
          longPressTimerIdRef.current = null
        }
        actionToShortPressRef.current = null

        const { actionHold, action } = button

        if (actionHold) {
          if (typeof actionHold === 'object' && 'command' in actionHold) {
            const config = actionHold
            if (config.longPressAction) {
              actionToShortPressRef.current = config.command
              longPressTimerIdRef.current = window.setTimeout(() => {
                handleMobileButtonLongPress(config)
                actionToShortPressRef.current = null
                longPressTimerIdRef.current = null
              }, config.duration || 500)
            } else {
              handleMobileButtonActionCommand(config.command, true)
            }
          } else if (action) {
            actionToShortPressRef.current = action
            longPressTimerIdRef.current = window.setTimeout(() => {
              handleMobileButtonActionCommand(actionHold, true)
              actionToShortPressRef.current = null
              longPressTimerIdRef.current = null
            }, 500)
          } else {
            handleMobileButtonActionCommand(actionHold, true)
          }
        } else if (action) {
          handleMobileButtonActionCommand(action, true)
        }
      }

      const onPointerUp = (e: React.PointerEvent) => {
        const elem = e.currentTarget as HTMLElement
        elem.releasePointerCapture(e.pointerId)

        const { actionHold, action } = button
        let wasShortPressHandled = false

        if (longPressTimerIdRef.current) {
          clearTimeout(longPressTimerIdRef.current)
          longPressTimerIdRef.current = null
          if (actionToShortPressRef.current) {
            handleMobileButtonActionCommand(actionToShortPressRef.current, true)
            handleMobileButtonActionCommand(actionToShortPressRef.current, false)
            wasShortPressHandled = true
          }
        }

        if (!wasShortPressHandled) {
          if (actionHold) {
            if (typeof actionHold === 'object' && 'command' in actionHold) {
              const config = actionHold
              if (config.longPressAction) {
                if (actionToShortPressRef.current === null) {
                  if (typeof config.longPressAction === 'string') {
                    handleMobileButtonActionCommand(config.longPressAction, false)
                  }
                }
              } else {
                handleMobileButtonActionCommand(config.command, false)
              }
            } else if (action) {
              if (actionToShortPressRef.current === null) {
                handleMobileButtonActionCommand(actionHold, false)
              }
            } else {
              handleMobileButtonActionCommand(actionHold, false)
            }
          } else if (action) {
            handleMobileButtonActionCommand(action, false)
          }
        }
        actionToShortPressRef.current = null
      }

      return (
        <div
          key={index}
          className={className}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onLostPointerCapture={onPointerUp}
        >
          {label}
        </div>
      )
    })
  }

  // ios note: just don't use <button>
  return (
    <div
      ref={elRef}
      className={
        `${styles['mobile-top-btns']}${portraitTallAspect ? ` ${styles['mobile-top-btns--portrait-tall']}` : ''}`
      }
      id="mobile-top"
    >
      {mobileButtonsConfig && mobileButtonsConfig.length > 0 ? renderConfigButtons() : null}
    </div>
  )
}
