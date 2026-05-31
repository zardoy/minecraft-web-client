import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { formatMessage, isStringAllowed } from '../chatUtils'
import { getBuiltinCommandsList, tryHandleBuiltinCommand } from '../builtinCommands'
import { gameAdditionalState, hideCurrentModal, miscUiState } from '../globalState'
import { options } from '../optionsStorage'
import { viewerVersionState } from '../viewerConnector'
import { lastConnectOptions } from '../appStatus'
import { createLoginPromptDebouncer, detectLoginPrompt, isLoginMonitorActive, monitorLoginAttempt, runAuthFlow } from '../core/authModal'
import { displayClientChat } from '../botUtils'
import Chat, { Message } from './Chat'
import { useIsModalActive } from './utilsApp'
import { findServerPassword, getServerIndex, saveServerPassword } from './serversStorage'
import { showAutoFillLoginModal } from './AutoFillLoginModal'
import { showOptionsModal } from './SelectOption'
import { withInjectableUi } from './extendableSystem'
import { useTypingIndicatorText } from './useTypingIndicatorText'

const TypingIndicatorOverlay = () => {
  const typingIndicatorText = useTypingIndicatorText()
  if (!typingIndicatorText) return null

  return <div style={{
    position: 'fixed',
    /* Above hotbar (~50px). Same vertical zone as chat messages (bottom: 40px) */
    bottom: 'calc(27px + env(safe-area-inset-bottom, 0px))',
    left: 2,
    fontSize: '9px',
    color: 'white',
    textShadow: '1px 1px 0px #3f3f3f',
    fontFamily: 'mojangles, minecraft, monospace',
    padding: '2px 4px',
    /* Portal to body so we're above hotbar (z-index 8). Below modals (12). When modals open, --has-modals-z becomes -1 */
    zIndex: 'var(--has-modals-z, 11)',
  }}>
    {typingIndicatorText}
  </div>
}

const ChatProviderBase = () => {
  const [messages, setMessages] = useState([] as Message[])
  const isChatActive = useIsModalActive('chat')
  const lastMessageId = useRef(0)
  const lastPingTime = useRef(0)
  const loginPromptDebouncer = useRef(createLoginPromptDebouncer())
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
    chatSpellCheckEnabled,
    chatAlwaysDisplayTypingIndicator
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

      // Auto-fill login/register prompt detection (issue #527)
      const promptKind = detectLoginPrompt(messageText)
      const serverKey = lastConnectOptions.value?.server
      // If we already have a saved password and the server is asking for /login,
      // try a silent retry: the spawn-time auto-login may have raced with the
      // server (sent /login before the server was ready). If the password is wrong,
      // the monitor will clear it and the next prompt will show the modal.
      const savedPassword = findServerPassword()
      if (promptKind && serverKey && savedPassword && (promptKind === 'login' || promptKind === 'either') && !isLoginMonitorActive()) {
        if (loginPromptDebouncer.current.shouldTrigger(serverKey)) {
          try { bot.chat(`/login ${savedPassword}`) } catch {}
          monitorLoginAttempt({
            password: savedPassword,
            mode: 'login',
            source: 'manual',
            serverIp: serverKey,
            username: bot.username,
            preSaved: true,
          })
        }
      } else if (promptKind && serverKey && (promptKind === 'changepassword' || promptKind === 'unregister') && loginPromptDebouncer.current.shouldTrigger(serverKey)) {
        if (options.autoOpenAuthModal) {
          void showAutoFillLoginModal({ mode: promptKind, serverIp: serverKey, username: bot.username, prefilledPassword: findServerPassword() })
            .then(result => {
              if (!result?.password) return
              if (promptKind === 'changepassword' && !result.newPassword) return
              runAuthFlow(bot, promptKind, result, { serverIp: serverKey, username: bot.username, source: 'modal' })
            })
        } else {
          const makeExtra = (kind: 'changepassword' | 'unregister') => ({
            text: `Click here to auto-fill ${kind}`,
            color: 'aqua',
            underlined: true,
            clickEvent: { action: kind === 'changepassword' ? 'open_change_password' : 'open_unregister', value: '' },
            hoverEvent: { action: 'show_text', value: 'Open password-manager-friendly modal' }
          })
          const emoji = promptKind === 'changepassword' ? '🗝️ ' : '⚠️ '
          displayClientChat({ text: emoji, extra: [makeExtra(promptKind)] })
        }
      } else if (promptKind && serverKey && !savedPassword && (promptKind === 'login' || promptKind === 'register' || promptKind === 'either') && loginPromptDebouncer.current.shouldTrigger(serverKey)) {
        if (options.autoOpenAuthModal) {
          const mode = promptKind === 'either' ? 'login' : promptKind
          void showAutoFillLoginModal({ mode, serverIp: serverKey, username: bot.username })
            .then(result => {
              if (!result?.password) return
              runAuthFlow(bot, mode, result, { serverIp: serverKey, username: bot.username, source: 'modal' })
            })
        } else {
          const makeExtra = (kind: 'login' | 'register') => ({
            text: `Click here to auto-fill ${kind}`,
            color: 'aqua',
            underlined: true,
            clickEvent: { action: `open_auto_fill_${kind}`, value: '' },
            hoverEvent: { action: 'show_text', value: 'Open password-manager-friendly login modal' }
          })
          const extra = promptKind === 'either'
            ? [makeExtra('login'), { text: ' / ' }, makeExtra('register')]
            : [makeExtra(promptKind)]
          displayClientChat({ text: '🔐 ', extra })
        }
      }

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

  return <>
    <Chat
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
        if (getServerIndex() !== undefined && (message.startsWith('/login') || message.startsWith('/register'))) {
          const password = message.split(' ')[1]
          if (password) {
            saveServerPassword(password)
            const mode = message.startsWith('/register') ? 'register' : 'login'
            monitorLoginAttempt({
              password,
              mode,
              source: 'manual',
              preSaved: true
            })
          }
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
    {chatAlwaysDisplayTypingIndicator && !isChatActive && <TypingIndicatorOverlay />}
  </>
}

export default withInjectableUi(ChatProviderBase, 'chatProvider')
