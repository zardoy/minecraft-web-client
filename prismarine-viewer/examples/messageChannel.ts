export class MessageChannelReplacement {
  port1Listeners = [] as Array<(e: MessageEvent) => void>
  port2Listeners = [] as Array<(e: MessageEvent) => void>
  port1 = {
    addEventListener: (type, listener) => {
      if (type !== 'message') throw new Error('unsupported type')
      this.port1Listeners.push(listener)
    },
    postMessage: (data) => {
      for (const listener of this.port1Listeners) {
        listener(new MessageEvent('message', { data }))
      }
    },
    start() {}
  } as any
  port2 = {
    addEventListener: (type, listener) => {
      if (type !== 'message') throw new Error('unsupported type')
      this.port2Listeners.push(listener)
    },
    postMessage: (data) => {
      for (const listener of this.port2Listeners) {
        listener(new MessageEvent('message', { data }))
      }
    },
    start() {}
  } as any
}
