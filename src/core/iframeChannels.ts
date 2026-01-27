import { proxy } from 'valtio'

export const iframeState = proxy({
  id: '',
  url: '',
  title: '',
  metadata: null as Record<string, any> | null,
})
globalThis.iframeState = iframeState

export const registerIframeChannels = () => {
  registerIframeOpenChannel()
}

const registerIframeOpenChannel = () => {
  const CHANNEL_NAME = 'minecraft-web-client:iframe-open'

  const packetStructure = [
    'container',
    [
      {
        name: 'id',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'url',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'title',
        type: ['pstring', { countType: 'i16' }]
      },
      {
        name: 'metadataJson',
        type: ['pstring', { countType: 'i16' }]
      }
    ]
  ]

  bot._client.registerChannel(CHANNEL_NAME, packetStructure, true)

  bot._client.on(CHANNEL_NAME as any, (data) => {
    const { id, url, title, metadataJson } = data

    let metadata: Record<string, any> | null = null
    if (metadataJson && metadataJson.trim() !== '') {
      try {
        metadata = JSON.parse(metadataJson)
      } catch (error) {
        console.warn('Failed to parse iframe metadataJson:', error)
      }
    }

    iframeState.id = id
    iframeState.url = url
    iframeState.title = title || ''
    iframeState.metadata = metadata
  })

  console.debug(`registered custom channel ${CHANNEL_NAME} channel`)
}
