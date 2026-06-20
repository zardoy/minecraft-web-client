import { useEffect, useState, useContext } from 'react'
import { customCommandsConfig } from '../customCommands'
import { ButtonWithMatchesAlert, Context } from './KeybindingsScreen'
import Button from './Button'
import styles from './KeybindingsScreen.module.css'
import Input from './Input'

export type CustomCommand = {
  keys: undefined | string[]
  gamepad: undefined | string[]
  type: string
  inputs: any[]
}

export type CustomCommandsMap = Record<string, CustomCommand>

export default ({
  customCommands,
  updateCurrBind,
  resetBinding
}: {
  customCommands: CustomCommandsMap
  updateCurrBind: (group: string, action: string) => void
  resetBinding: (group: string, action: string, inputType: string) => void
}) => {
  const { userConfig, setUserConfig } = useContext(Context)
  const [customConfig, setCustomConfig] = useState<any>({ ...customCommands })

  useEffect(() => {
    setUserConfig({ ...userConfig, custom: { ...customConfig } })
  }, [customConfig])

  const addNewCommand = (type: string) => {
    // max key + 1
    const newKey = String(
      Math.max(
        ...Object.keys(customConfig)
          .map(Number)
          .filter(key => !isNaN(key)),
        0
      ) + 1
    )
    setCustomConfig(prev => {
      const newCustomConf = { ...prev }
      newCustomConf[newKey] = {
        keys: undefined as string[] | undefined,
        gamepad: undefined as string[] | undefined,
        type,
        inputs: [] as any[]
      }
      return newCustomConf
    })
  }

  return (
    <>
      <div className={styles.group}>
        {Object.entries(customCommandsConfig).map(([group, { input }]) => (
          <div key={`group-container-${group}`} className={styles.group}>
            <div key={`category-${group}`} className={styles['group-category']}>
              {group}
            </div>
            {Object.entries(customConfig)
              .filter(([key, data]) => data.type === group)
              .map((commandData, indexOption) => {
                return (
                  <CustomCommandContainer
                    key={indexOption}
                    indexOption={indexOption}
                    commandData={commandData}
                    updateCurrBind={updateCurrBind}
                    groupData={[group, { input }]}
                    setCustomConfig={setCustomConfig}
                    resetBinding={resetBinding}
                  />
                )
              })}
            <Button
              onClick={() => addNewCommand(group)}
              icon="pixelarticons:add-box"
              style={{
                alignSelf: 'center'
              }}
            />
          </div>
        ))}
      </div>
    </>
  )
}

const CustomCommandContainer = ({ indexOption, commandData, updateCurrBind, setCustomConfig, resetBinding, groupData }) => {
  const { userConfig } = useContext(Context)

  const [commandKey, { keys, gamepad, inputs }] = commandData
  const [group, { input }] = groupData

  const setInputValue = (optionKey, indexInput, value) => {
    setCustomConfig(prev => {
      const newConfig = { ...prev }
      newConfig[optionKey].inputs = [...prev[optionKey].inputs]
      newConfig[optionKey].inputs[indexInput] = value
      return newConfig
    })
  }

  return (
    <div style={{ padding: '10px' }}>
      {input.map((obj, indexInput) => {
        const config = typeof obj === 'function' ? obj(inputs) : obj
        if (!config) return null

        return config.type === 'select' ? (
          <select
            key={indexInput}
            onChange={e => {
              setInputValue(commandKey, indexInput, e.target.value)
            }}
          >
            {config.options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <Input
            key={indexInput}
            rootStyles={{ width: '99%' }}
            placeholder={config.placeholder}
            value={inputs[indexInput] ?? ''}
            onChange={e => setInputValue(commandKey, indexInput, e.target.value)}
          />
        )
      })}
      <div className={styles.actionBinds}>
        {userConfig?.['custom']?.[commandKey]?.keys ? (
          <Button
            onClick={() => {
              updateCurrBind(group, commandKey)
              resetBinding('custom', commandKey, 'keyboard')
            }}
            className={styles['undo-keyboard']}
            icon="pixelarticons:undo"
          />
        ) : null}

        {[0, 1].map((key, index) => (
          <ButtonWithMatchesAlert
            key={`custom-keyboard-${group}-${commandKey}-${index}`}
            group="custom"
            action={commandKey}
            index={index}
            inputType="keyboard"
            keys={keys}
            gamepad={gamepad}
          />
        ))}

        <div style={{ marginRight: 'auto' }} />

        {userConfig?.['custom']?.[commandKey]?.gamepad ? (
          <Button
            onClick={() => {
              updateCurrBind(group, commandKey)
              resetBinding('custom', commandKey, 'gamepad')
            }}
            className={styles['undo-keyboard']}
            icon="pixelarticons:undo"
          />
        ) : null}
        <ButtonWithMatchesAlert group="custom" action={commandKey} index={0} inputType="gamepad" keys={keys} gamepad={gamepad} />
        <Button
          onClick={() => {
            setCustomConfig(prev => {
              const { [commandKey]: commandToRemove, ...newConfig } = prev
              return newConfig
            })
          }}
          style={{ color: 'red' }}
          icon="pixelarticons:delete"
        />
      </div>
    </div>
  )
}
