import { proxy } from 'valtio'

export const ideState = proxy({
  id: '',
  contents: '',
  line: 0,
  column: 0,
  language: 'typescript',
  title: '',
})
globalThis.ideState = ideState

export const registerIdeChannels = () => {
  registerIdeOpenChannel()
  registerIdeSaveChannel()
}

const registerIdeOpenChannel = () => {
  const CHANNEL_NAME = 'minecraft-web-client:ide-open'

  const packetStructure = [
    'container',
    [
      {
        name: 'id',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'language',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'contents',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'line',
        type: 'i32'
      },
      {
        name: 'column',
        type: 'i32'
      },
      {
        name: 'title',
        type: ['pstring', { countType: 'i16' }]
      }
    ]
  ]

  bot._client.registerChannel(CHANNEL_NAME, packetStructure, true)

  bot._client.on(CHANNEL_NAME as any, (data) => {
    const { id, language, contents, line, column, title } = data

    ideState.contents = contents
    ideState.line = line
    ideState.column = column
    ideState.id = id
    ideState.language = language || 'typescript'
    ideState.title = title
  })

  console.debug(`registered custom channel ${CHANNEL_NAME} channel`)
}
const IDE_SAVE_CHANNEL_NAME = 'minecraft-web-client:ide-save'
const registerIdeSaveChannel = () => {

  const packetStructure = [
    'container',
    [
      {
        name: 'id',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'contents',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'language',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'line',
        type: 'i32'
      },
      {
        name: 'column',
        type: 'i32'
      },
    ]
  ]
  bot._client.registerChannel(IDE_SAVE_CHANNEL_NAME, packetStructure, true)
}

export const saveIde = () => {
  bot._client.writeChannel(IDE_SAVE_CHANNEL_NAME, {
    id: ideState.id,
    contents: ideState.contents,
    language: ideState.language,
    // todo: reflect updated
    line: ideState.line,
    column: ideState.column,
  })
}
