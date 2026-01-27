import { optionsMeta } from './defaultOptions'
import { options } from './optionsStorage'

export const customCommandsConfig = {
  chat: {
    input: [
      {
        type: 'text',
        placeholder: 'Command to send e.g. gamemode creative'
      }
    ],
    handler ([command]) {
      bot.chat(`/${command.replace(/^\//, '')}`)
    }
  },
  setOrToggleSetting: {
    input: [
      {
        type: 'select',
        // maybe title case?
        options: Object.keys(options)
      },
      {
        type: 'select',
        options: ['toggle', 'set']
      },
      ([setting = '', action = ''] = []) => {
        const value = options[setting]
        if (!action || value === undefined || action === 'toggle') return null
        if (action === 'set') {
          const getBase = () => {
            const config = optionsMeta[setting as keyof typeof optionsMeta]
            if (config?.possibleValues && config.possibleValues.length > 0) {
              // Handle both string[] and Array<[string, string]> formats
              const { possibleValues } = config
              const options = Array.isArray(possibleValues[0]) && typeof possibleValues[0][0] === 'string'
                ? (possibleValues as Array<[string, string]>).map(([val]) => val)
                : possibleValues as string[]
              return {
                type: 'select',
                options
              }
            }
            if (typeof value === 'boolean') {
              return {
                type: 'select',
                options: ['true', 'false']
              }
            }
            if (typeof value === 'number') {
              return {
                type: 'number',
                min: config?.min,
                max: config?.max,
              }
            }
            return {
              type: 'text'
            }
          }
          return {
            ...getBase(),
            placeholder: String(value)
          }
        }
      }
    ],
    handler ([setting, action, value]) {
      if (action === 'toggle' || action === undefined) {
        const currentValue = options[setting]
        const config = optionsMeta[setting as keyof typeof optionsMeta]
        if (config?.possibleValues && config.possibleValues.length > 0) {
          // Handle both string[] and Array<[string, string]> formats
          const { possibleValues } = config
          const values = Array.isArray(possibleValues[0]) && typeof possibleValues[0][0] === 'string'
            ? (possibleValues as Array<[string, string]>).map(([val]) => val)
            : possibleValues as string[]
          const currentIndex = values.indexOf(String(currentValue))
          const nextIndex = (currentIndex + 1) % values.length
          options[setting] = values[nextIndex] as any
        } else {
          options[setting] = typeof currentValue === 'boolean' ? !currentValue : typeof currentValue === 'number' ? currentValue + 1 : currentValue
        }
      } else {
        // Convert string values to appropriate types
        const config = optionsMeta[setting as keyof typeof optionsMeta]
        let convertedValue: any = value
        if (typeof options[setting] === 'boolean') {
          convertedValue = value === 'true' || value === true
        } else if (typeof options[setting] === 'number') {
          convertedValue = Number(value)
        }
        options[setting] = convertedValue
      }
    }
  },
  jsScripts: {
    input: [
      {
        type: 'text',
        placeholder: 'JavaScript code to run in main thread (sensitive!)'
      }
    ],
    handler ([code]) {
      // eslint-disable-next-line no-new-func -- this is a feature, not a bug
      new Function(code)()
    }
  },
  // openCommandsScreen: {}
}
