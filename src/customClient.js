//@ts-check
import * as nbt from 'prismarine-nbt'
import { options } from './optionsStorage'

const { EventEmitter } = require('events')
const debug = require('debug')('minecraft-protocol')
const states = require('minecraft-protocol/src/states')

window.serverDataChannel ??= {}
export const customCommunication = {
  sendData(data) {
    setTimeout(() => {
      window.serverDataChannel[this.isServer ? 'emitClient' : 'emitServer'](data)
    })
  },
  receiverSetup(processData) {
    window.serverDataChannel[this.isServer ? 'emitServer' : 'emitClient'] = (data) => {
      processData(data)
    }
  }
}

class CustomChannelClient extends EventEmitter {
  constructor(isServer, version) {
    super()
    this.version = version
    this.isServer = !!isServer
    this.state = states.HANDSHAKING
  }

  get state() {
    return this.protocolState
  }

  setSerializer(state) {
    customCommunication.receiverSetup.call(this, (/** @type {{name, params, state?}} */parsed) => {
      if (!options.excludeCommunicationDebugEvents.includes(parsed.name)) {
        debug(`receive in ${this.isServer ? 'server' : 'client'}: ${parsed.name}`)
      }
      this.emit(parsed.name, parsed.params, parsed)
      this.emit('packet_name', parsed.name, parsed.params, parsed)
    })
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures, grouped-accessor-pairs
  set state(newProperty) {
    const oldProperty = this.protocolState
    this.protocolState = newProperty

    this.setSerializer(this.protocolState)

    this.emit('state', newProperty, oldProperty)
  }

  end(endReason, fullReason) {
    // eslint-disable-next-line unicorn/no-this-assignment
    const client = this
    if (client.state === states.PLAY) {
      fullReason ||= loadedData.supportFeature('chatPacketsUseNbtComponents')
        ? nbt.comp({ text: nbt.string(endReason) })
        : JSON.stringify({ text: endReason })
      client.write('kick_disconnect', { reason: fullReason })
    } else if (client.state === states.LOGIN) {
      fullReason ||= JSON.stringify({ text: endReason })
      client.write('disconnect', { reason: fullReason })
    }

    this._endReason = endReason
    this.emit('end', this._endReason) // still emits on server side only, doesn't send anything to our client
  }

  write(name, params) {
    if (!options.excludeCommunicationDebugEvents.includes(name)) {
      debug(`[${this.state}] from ${this.isServer ? 'server' : 'client'}: ` + name)
      debug(params)
    }

    this.emit('writePacket', name, params)
    customCommunication.sendData.call(this, { name, params, state: this.state })
  }

  writeBundle(packets) {
    // no-op
  }

  writeRaw(buffer) {
    // no-op
  }
}

export default CustomChannelClient
