import { useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { formatMessage, isStringAllowed } from '../chatUtils'
import { getBuiltinCommandsList, tryHandleBuiltinCommand } from '../builtinCommands'
import { gameAdditionalState, hideCurrentModal, miscUiState } from '../globalState'
import { options } from '../optionsStorage'
import { viewerVersionState } from '../viewerConnector'
import { lastConnectOptions } from '../appStatus'
import Chat, { Message } from './Chat'
import { useIsModalActive } from './utilsApp'
import { hideNotification, notificationProxy, showNotification } from './NotificationProvider'
import { getServerIndex, updateLoadedServerData } from './serversStorage'
import { showOptionsModal } from './SelectOption'
import { withInjectableUi } from './extendableSystem'

const ChatProviderBase = () => {
  const [messages, setMessages] = useState([] as Message[])
  const isChatActive = useIsModalActive('chat')
  const lastMessageId = useRef(0)
  const lastPingTime = useRef(0)
  const {
    currentTouch: usingTouch,
    disconnectedCleanup
  } = useSnapshot(miscUiState)
  const {
    chatSelect,
    messagesLimit,
    chatOpacity,
    chatOpacityOpened,
    chatVanillaRestrictions,
    debugChatScroll,
    chatPingExtension,
    chatSpellCheckEnabled
  } = useSnapshot(options)
  const isUsingMicrosoftAuth = useMemo(() => !!lastConnectOptions.value?.authenticatedAccount, [])
  const { forwardChat } = useSnapshot(viewerVersionState)
  const { viewerConnection } = useSnapshot(gameAdditionalState)

  useEffect(() => {
    bot.addListener('message', (jsonMsg, position) => {
      if (position === 'game_info') return // ignore action bar messages, they are handled by the TitleProvider
      if (jsonMsg['unsigned']) {
        jsonMsg = jsonMsg['unsigned']
      }
      const parts = formatMessage(jsonMsg)
      const messageText = parts.map(part => part.text).join('')

      // Handle ping response
      if (messageText === 'Pong!' && lastPingTime.current > 0) {
        const latency = Date.now() - lastPingTime.current
        parts.push({ text: ` Latency: ${latency}ms`, color: '#00ff00' })
        lastPingTime.current = 0
      }

      setMessages(m => {
        lastMessageId.current++
        const newMessage: Message = {
          parts,
          id: lastMessageId.current,
          timestamp: Date.now()
        }

        return [...m, newMessage].slice(-messagesLimit)
      })
    })
  }, [])

  const disabledReason = disconnectedCleanup ? 'You have been disconnected from the server on ' + new Date(disconnectedCleanup.date).toLocaleString() : undefined

  return <Chat
    chatVanillaRestrictions={chatVanillaRestrictions}
    debugChatScroll={debugChatScroll}
    allowSelection={chatSelect}
    usingTouch={!!usingTouch}
    opacity={(isChatActive ? chatOpacityOpened : chatOpacity) / 100}
    messages={messages}
    opened={isChatActive}
    placeholder={forwardChat || !viewerConnection ? undefined : 'Chat forwarding is not enabled in the plugin settings'}
    inputDisabled={disabledReason}
    currentPlayerName={chatPingExtension ? bot.username : undefined}
    spellCheckEnabled={chatSpellCheckEnabled}
    onSpellCheckEnabledChange={(enabled) => {
      options.chatSpellCheckEnabled = enabled
    }}
    getPingComplete={async (value) => {
      const players = Object.keys(bot.players)
      return players.filter(name => (!value || name.toLowerCase().includes(value.toLowerCase())) && name !== bot.username).map(name => `@${name}`)
    }}
    sendMessage={async (message) => {
      // Record ping command time
      if (message === '/ping') {
        lastPingTime.current = Date.now()
      }

      const builtinHandled = tryHandleBuiltinCommand(message)
      if (getServerIndex() !== undefined && (message.startsWith('/login') || message.startsWith('/register')) && options.saveLoginPassword !== 'never') {
        const savePassword = () => {
          let hadPassword = false
          updateLoadedServerData((server) => {
            server.autoLogin ??= {}
            const password = message.split(' ')[1]
            hadPassword = !!server.autoLogin[bot.username]
            server.autoLogin[bot.username] = password
            return { ...server }
          })
          if (options.saveLoginPassword === 'always') {
            const message = hadPassword ? 'Password updated in browser for auto-login' : 'Password saved in browser for auto-login'
            showNotification(message, undefined, false, undefined)
          } else {
            hideNotification()
          }
        }
        if (options.saveLoginPassword === 'prompt') {
          showNotification('Click here to save your password in browser for auto-login', undefined, false, undefined, savePassword)
        } else {
          savePassword()
        }
        notificationProxy.id = 'auto-login'
        const listener = () => {
          hideNotification()
        }
        bot.on('kicked', listener)
        setTimeout(() => {
          bot.removeListener('kicked', listener)
        }, 2000)
      }
      if (!builtinHandled) {
        if (chatVanillaRestrictions && !miscUiState.flyingSquid) {
          const validation = isStringAllowed(message)
          if (!validation.valid) {
            const choice = await showOptionsModal(`Can't send invalid characters to vanilla server (${validation.invalid?.join(', ')}). You can use them only in command blocks.`, [
              'Remove Them & Send'
            ])
            if (!choice) return
            message = validation.clean!
          }
        }

        if (message) {
          bot.chat(message)
        }
      }
    }}
    onClose={() => {
      hideCurrentModal()
    }}
    fetchCompletionItems={async (triggerKind, completeValue) => {
      if ((triggerKind === 'explicit' || options.autoRequestCompletions)) {
        let items = [] as string[]
        try {
          items = await bot.tabComplete(completeValue, true, true)
        } catch (err) { }
        if (typeof items[0] === 'object') {
          // @ts-expect-error
          if (items[0].match) items = items.map(i => i.match)
        }
        if (completeValue === '/') {
          if (!items[0]?.startsWith('/')) {
            // normalize
            items = items.map(item => `/${item}`)
          }
          if (items.length) {
            items = [...items, ...getBuiltinCommandsList()]
          }
        }
        return items
      }
    }}
  />
}

export default withInjectableUi(ChatProviderBase, 'chatProvider')
