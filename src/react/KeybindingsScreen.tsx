import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { UserOverridesConfig } from 'contro-max/build/types/store'
import { AllKeyCodes } from 'contro-max/build/types/keyCodes'
import { contro as controEx } from '../controls'
import { hideModal } from '../globalState'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import KeybindingsCustom, { CustomCommandsMap } from './KeybindingsCustom'
import { BindingActionsContext } from './KeybindingsScreenProvider'
import Button from './Button'
import Screen from './Screen'
import Keybinding from './Keybinding'
import styles from './KeybindingsScreen.module.css'

type HandleClick = (group: string, action: string, index: number, type: string | null) => void

type setBinding = (data: any, group: string, command: string, buttonIndex: number) => void

export const Context = createContext({
  isPS: false as boolean | undefined,
  userConfig: controEx?.userConfig ?? ({} as UserOverridesConfig | undefined),
  setUserConfig(config) {},
  handleClick: (() => {}) as HandleClick,
  bindsMap: { keyboard: {} as any, gamepad: {} as any }
})

export default ({ contro, isPS }: { contro: typeof controEx; isPS?: boolean }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const bindsMap = useRef({ keyboard: {} as any, gamepad: {} as any })
  const { commands } = contro.inputSchema
  const [userConfig, setUserConfig] = useState(contro.userConfig ?? {})
  const [awaitingInputType, setAwaitingInputType] = useState(null as null | 'keyboard' | 'gamepad')
  const [groupName, setGroupName] = useState('')
  const [actionName, setActionName] = useState('')
  const [buttonNum, setButtonNum] = useState(0)
  const { updateBinds } = useContext(BindingActionsContext)
  const [customCommands, setCustomCommands] = useState<CustomCommandsMap>((userConfig.custom as CustomCommandsMap) ?? {})

  const updateCurrBind = (group: string, action: string) => {
    setGroupName(prev => group)
    setActionName(prev => action)
  }

  const handleClick: HandleClick = (group, action, index, type) => {
    ;(document.activeElement as HTMLElement)?.blur()
    setAwaitingInputType(type as any)
    updateCurrBind(group, action)
    setButtonNum(prev => index)
  }

  const setBinding: setBinding = (data, group, command, buttonIndex) => {
    setUserConfig(prev => {
      const newConfig = { ...prev }
      newConfig[group] ??= {}
      newConfig[group][command] ??= {}

      // keys and buttons should always exist in commands
      const type = 'code' in data ? 'keys' : 'button' in data ? 'gamepad' : null
      if (type) {
        newConfig[group][command][type] ??= group === 'custom' ? [] : [...contro.inputSchema.commands[group][command][type]]
        newConfig[group][command][type]![buttonIndex] = data.code ?? data.button
      }

      return newConfig
    })
  }

  const resetBinding = (group: string, command: string, inputType: string) => {
    if (!userConfig?.[group]?.[command]) return

    setUserConfig(prev => {
      const newConfig = { ...prev }
      const prop = inputType === 'keyboard' ? 'keys' : 'gamepad'
      newConfig[group][command][prop] = undefined
      return newConfig
    })
  }

  useEffect(() => {
    updateBinds(userConfig)
    setCustomCommands({ ...(userConfig.custom as CustomCommandsMap) })

    updateBindMap()
  }, [userConfig])

  const updateBinding = (data: any) => {
    if ((!data.state && awaitingInputType) || !awaitingInputType) {
      setAwaitingInputType(null)
      return
    }

    if ('code' in data) {
      if (data.state && [...contro.pressedKeys].includes(data.code)) return

      if (data.code === 'Escape' || ['Mouse0', 'Mouse1', 'Mouse2'].includes(data.code)) {
        setAwaitingInputType(null)
        return
      }
      const pressedModifiers = [...contro.pressedKeys].filter(key => /^(Meta|Control|Alt|Shift)?$/.test(key))
      setBinding({ code: pressedModifiers.length ? `${pressedModifiers[0]}+${data.code}` : data.code, state: true }, groupName, actionName, buttonNum)
    }
    if ('button' in data) {
      contro.enabled = false
      void Promise.resolve().then(() => {
        contro.enabled = true
      })
      setBinding(data, groupName, actionName, buttonNum)
    }
  }

  const updateBindMap = () => {
    bindsMap.current = { keyboard: {} as any, gamepad: {} as any }
    if (commands) {
      for (const [group, actions] of Object.entries(commands)) {
        for (const [action, { keys, gamepad }] of Object.entries(actions)) {
          if (keys) {
            let currKeys
            if (userConfig?.[group]?.[action]?.keys) {
              currKeys = userConfig[group][action].keys
            } else {
              currKeys = keys
            }
            for (const [index, key] of currKeys.entries()) {
              bindsMap.current.keyboard[key] ??= []
              if (!bindsMap.current.keyboard[key].some(obj => obj.group === group && obj.action === action && obj.index === index)) {
                bindsMap.current.keyboard[key].push({ group, action, index })
              }
            }
          }
          if (gamepad) {
            let currButtons
            if (userConfig?.[group]?.[action]?.gamepad) {
              currButtons = userConfig[group][action].gamepad
            } else {
              currButtons = gamepad
            }
            if (currButtons.length > 0) {
              bindsMap.current.gamepad[currButtons[0]] ??= []
              bindsMap.current.gamepad[currButtons[0]].push({ group, action, index: 0 })
            }
          }
        }
      }
    }
  }

  // fill binds map
  useEffect(() => {
    updateBindMap()
  }, [])

  useEffect(() => {
    if (!awaitingInputType) return
    contro.on('pressedKeyOrButtonChanged', updateBinding)
    const preventDefault = e => e.preventDefault()
    document.addEventListener('keydown', preventDefault, { passive: false })

    return () => {
      contro.off('pressedKeyOrButtonChanged', updateBinding)
      document.removeEventListener('keydown', preventDefault)
    }
  }, [groupName, actionName, awaitingInputType])

  return (
    <Context.Provider
      value={{
        isPS,
        userConfig,
        setUserConfig,
        handleClick,
        bindsMap: bindsMap.current
      }}
    >
      <Screen title="Keybindings" backdrop>
        {awaitingInputType && <AwaitingInputOverlay isGamepad={awaitingInputType === 'gamepad'} />}
        <div className={styles.container} ref={containerRef}>
          <Button
            onClick={() => {
              hideModal()
            }}
            style={{ alignSelf: 'center' }}
          >
            Back
          </Button>

          {Object.entries(commands).map(([group, actions], index) => {
            if (group === 'custom') return null
            return (
              <div key={`group-container-${group}-${index}`} className={styles.group}>
                <div className={styles['group-category']}>{group}</div>
                {group === 'general' ? (
                  <div
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '6px',
                      textAlign: 'center'
                    }}
                  >
                    Note: Left, right and middle click keybindings are hardcoded and cannot be changed currently.
                  </div>
                ) : null}
                {Object.entries(actions).map(([action, { keys, gamepad }]) => {
                  return (
                    <div key={`action-container-${action}`} className={styles.actionBinds}>
                      <div className={styles.actionName}>{parseActionName(action)}</div>

                      <Button
                        onClick={() => {
                          updateCurrBind(group, action)
                          resetBinding(group, action, 'keyboard')
                        }}
                        style={{ opacity: userConfig?.[group]?.[action]?.keys?.length ? 1 : 0 }}
                        className={styles['undo-keyboard']}
                        icon={pixelartIcons.undo}
                      />

                      {[0, 1].map((key, index) => (
                        <ButtonWithMatchesAlert
                          key={`keyboard-${group}-${action}-${index}`}
                          group={group}
                          action={action}
                          index={index}
                          inputType="keyboard"
                          keys={keys}
                          gamepad={gamepad}
                        />
                      ))}

                      <Button
                        key={`keyboard-${group}-${action}`}
                        onClick={() => {
                          updateCurrBind(group, action)
                          resetBinding(group, action, 'gamepad')
                        }}
                        style={{
                          opacity: userConfig?.[group]?.[action]?.gamepad?.length ? 1 : 0,
                          width: '0px'
                        }}
                        className={`${styles['undo-gamepad']} ${styles['margin-left']}`}
                        icon={pixelartIcons.undo}
                      />
                      <ButtonWithMatchesAlert
                        key={`gamepad-${group}-${action}`}
                        group={group}
                        action={action}
                        index={0}
                        inputType="gamepad"
                        keys={keys}
                        gamepad={gamepad}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}

          <KeybindingsCustom customCommands={customCommands} updateCurrBind={updateCurrBind} resetBinding={resetBinding} />
        </div>
      </Screen>
    </Context.Provider>
  )
}

export const ButtonWithMatchesAlert = ({ group, action, index, inputType, keys, gamepad }) => {
  const { isPS, userConfig, handleClick, bindsMap } = useContext(Context)
  const [buttonSign, setButtonSign] = useState('')

  useEffect(() => {
    const type = inputType === 'keyboard' ? 'keys' : 'gamepad'

    const customValue = userConfig?.[group]?.[action]?.[type]?.[index]
    if (customValue) {
      setButtonSign(customValue)
    } else if (type === 'keys') {
      setButtonSign(keys?.length ? keys[index] : '')
    } else {
      setButtonSign(gamepad?.[0] ?? '')
    }
  }, [userConfig, isPS])

  return (
    <div key={`warning-container-${inputType}-${action}`} className={`${styles['warning-container']}`}>
      <Button key={`${inputType}-${group}-${action}-${index}`} onClick={() => handleClick(group, action, index, inputType)} className={`${styles.button}`}>
        <Keybinding type={inputType} val={buttonSign as AllKeyCodes} />
      </Button>
      {userConfig?.[group]?.[action]?.[inputType === 'keyboard' ? 'keys' : 'gamepad']?.some(
        key =>
          Object.keys(bindsMap[inputType]).includes(key) &&
          bindsMap[inputType][key].length > 1 &&
          bindsMap[inputType][key].some(prop => prop.index === index && prop.group === group && prop.action === action)
      ) ? (
        //@ts-format-ignore-region
        <div id={`bind-warning-${group}-${action}-${inputType}-${index}`} className={styles['matched-bind-warning']}>
          <PixelartIcon
            iconName="alert"
            width={5}
            styles={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: '2px'
            }}
          />
          <div>
            This bind is already in use. <span />
          </div>
        </div>
      ) : //@ts-format-ignore-endregion
      null}
    </div>
  )
}

export const AwaitingInputOverlay = ({ isGamepad }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        fontSize: 20,
        zIndex: 10,
        textAlign: 'center'
      }}
      onContextMenu={e => e.preventDefault()}
    >
      <div>
        {isGamepad ? 'Press the button on the gamepad ' : 'Press the key, side mouse button '}
        or ESC to cancel.
      </div>
      <Button
        onClick={() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        }}
      >
        Cancel
      </Button>
    </div>
  )
}

const parseActionName = (action: string) => {
  const parts = action.split(/(?=[A-Z])/)
  parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  return parts.join(' ')
}
