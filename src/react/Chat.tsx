import { proxy, subscribe, useSnapshot } from 'valtio'
import { useEffect, useMemo, useRef, useState } from 'react'
import { isStringAllowed, MessageFormatPart } from '../chatUtils'
import { gameAdditionalState } from '../globalState'
import { MessagePart } from './MessageFormatted'
import './Chat.css'
import { isIos, reactKeyForMessage } from './utils'
import Button from './Button'
import { pixelartIcons } from './PixelartIcon'
import { useScrollBehavior } from './hooks/useScrollBehavior'
import { withInjectableUi } from './extendableSystem'

export type Message = {
  parts: MessageFormatPart[],
  id: number
  timestamp?: number
}

const MessageLine = ({ message, currentPlayerName, chatOpened }: { message: Message, currentPlayerName?: string, chatOpened?: boolean }) => {
  const [fadeState, setFadeState] = useState<'visible' | 'fading' | 'faded'>('visible')

  useEffect(() => {
    if (window.debugStopChatFade) return
    // Start fading after 5 seconds
    const fadeTimeout = setTimeout(() => {
      setFadeState('fading')
    }, 5000)

    // Remove after fade animation (3s) completes
    const removeTimeout = setTimeout(() => {
      setFadeState('faded')
    }, 8000)

    // Cleanup timeouts if component unmounts
    return () => {
      clearTimeout(fadeTimeout)
      clearTimeout(removeTimeout)
    }
  }, []) // Empty deps array since we only want this to run once when message is added

  const classes = {
    'chat-message': true,
    'chat-message-fading': !chatOpened && fadeState === 'fading',
    'chat-message-faded': !chatOpened && fadeState === 'faded'
  }

  return <li className={Object.entries(classes).filter(([, val]) => val).map(([name]) => name).join(' ')} data-time={message.timestamp ? new Date(message.timestamp).toLocaleString('en-US', { hour12: false }) : undefined}>
    {message.parts.map((msg, i) => {
      // Check if this is a text part that might contain a mention
      if (typeof msg.text === 'string' && currentPlayerName) {
        const parts = msg.text.split(new RegExp(`(@${currentPlayerName})`, 'i'))
        if (parts.length > 1) {
          return parts.map((txtPart, j) => {
            const part = {
              ...msg,
              text: txtPart
            }
            if (txtPart.toLowerCase() === `@${currentPlayerName}`.toLowerCase()) {
              part.color = '#ffa500'
              part.bold = true
              return <MessagePart key={j} part={part} />
            }
            return <MessagePart key={j} part={part} />
          })
        }
      }
      return <MessagePart key={i} part={msg} />
    })}
  </li>
}

type Props = {
  messages: Message[]
  usingTouch: boolean
  opacity?: number
  opened?: boolean
  onClose?: () => void
  sendMessage?: (message: string) => Promise<void> | void
  fetchCompletionItems?: (triggerKind: 'implicit' | 'explicit', completeValue: string, fullValue: string, abortController?: AbortController) => Promise<string[] | void>
  // width?: number
  allowSelection?: boolean
  inputDisabled?: string
  placeholder?: string
  chatVanillaRestrictions?: boolean
  debugChatScroll?: boolean
  getPingComplete?: (value: string) => Promise<string[]>
  currentPlayerName?: string
  spellCheckEnabled?: boolean
  onSpellCheckEnabledChange?: (enabled: boolean) => void
}

export const chatInputValueGlobal = proxy({
  value: ''
})

const ChatBase = ({
  messages,
  opacity = 1,
  fetchCompletionItems,
  opened,
  sendMessage,
  onClose,
  usingTouch,
  allowSelection,
  inputDisabled,
  placeholder,
  chatVanillaRestrictions,
  debugChatScroll,
  getPingComplete,
  currentPlayerName,
  spellCheckEnabled = false,
  onSpellCheckEnabledChange
}: Props) => {
  const playerNameValidated = useMemo(() => {
    if (!/^[\w\d_]+$/i.test(currentPlayerName ?? '')) return ''
    return currentPlayerName
  }, [currentPlayerName])

  const sendHistoryRef = useRef(JSON.parse(window.sessionStorage.chatHistory || '[]'))
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [preservedInputValue, setPreservedInputValue] = useState('')
  const [inputKey, setInputKey] = useState(0)
  const pingHistoryRef = useRef(JSON.parse(window.localStorage.pingHistory || '[]'))

  const [completePadText, setCompletePadText] = useState('')
  const completeRequestValue = useRef('')
  const [completionItemsSource, setCompletionItemsSource] = useState([] as string[])
  const [completionItems, setCompletionItems] = useState([] as string[])

  const chatInput = useRef<HTMLInputElement>(null!)
  const chatMessages = useRef<HTMLDivElement>(null)
  const chatHistoryPos = useRef(sendHistoryRef.current.length)
  const commandHistoryPos = useRef(0)
  const inputCurrentlyEnteredValue = useRef('')
  const commandHistoryRef = useRef(sendHistoryRef.current.filter((msg: string) => msg.startsWith('/')))

  const { scrollToBottom, isAtBottom, wasAtBottom, currentlyAtBottom } = useScrollBehavior(chatMessages, { messages, opened })
  const [rightNowAtBottom, setRightNowAtBottom] = useState(false)

  // Typing indicator state
  const { typingUsers } = useSnapshot(gameAdditionalState)
  const typingIndicatorText = useMemo(() => {
    const activeTypingUsers = typingUsers.filter(user => !user.timestamp || Date.now() - user.timestamp < 2000)
    if (activeTypingUsers.length === 0) return ''
    if (activeTypingUsers.length === 1) return `${activeTypingUsers[0]?.username || 'Someone'} is typing...`
    if (activeTypingUsers.length === 2) return `${activeTypingUsers[0]?.username || 'Someone'} and ${activeTypingUsers[1]?.username || 'Someone'} are typing...`
    const usernames = activeTypingUsers.slice(0, -1).map(user => user?.username || 'Someone').join(', ')
    const lastUser = activeTypingUsers.at(-1)?.username || 'Someone'
    return `${usernames} and ${lastUser} are typing...`
  }, [typingUsers])

  const typingIndicator = typingIndicatorText ? (
    <div style={{
      position: 'relative',
    }}>
      <div style={{
        fontSize: '9px',
        color: 'white',
        textShadow: '1px 1px 0px #3f3f3f',
        fontFamily: 'mojangles, minecraft, monospace',
        padding: '2px 4px',
        borderRadius: '2px',
        width: '100%',
        boxSizing: 'border-box',
        position: 'absolute',
        left: 0,
        height: 0,
        overflow: 'visible',
        ...(usingTouch ? {
          top: '100%',
          marginTop: 2,
        } : {
          bottom: '100%',
          marginBottom: 11,
        })
      }}>
        {typingIndicatorText}
      </div>
    </div>
  ) : null

  // Clean up old typing users every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      gameAdditionalState.typingUsers = gameAdditionalState.typingUsers.filter(user => !user.timestamp || now - user.timestamp < 2000)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!debugChatScroll) return
    const interval = setInterval(() => {
      setRightNowAtBottom(isAtBottom())
    }, 50)
    return () => clearInterval(interval)
  }, [debugChatScroll])

  const setSendHistory = (newHistory: string[]) => {
    sendHistoryRef.current = newHistory
    window.sessionStorage.chatHistory = JSON.stringify(newHistory)
    chatHistoryPos.current = newHistory.length
    // Update command history (only messages starting with /)
    commandHistoryRef.current = newHistory.filter((msg: string) => msg.startsWith('/'))
    commandHistoryPos.current = commandHistoryRef.current.length
  }

  const acceptComplete = (item: string) => {
    const base = completeRequestValue.current === '/' ? '' : getCompleteValue()
    updateInputValue(base + item)
    // Record ping completion in history
    if (item.startsWith('@')) {
      const newHistory = [item, ...pingHistoryRef.current.filter((x: string) => x !== item)].slice(0, 10)
      pingHistoryRef.current = newHistory
      // todo use appStorage
      window.localStorage.pingHistory = JSON.stringify(newHistory)
    }
    chatInput.current.focus()
  }

  const updateInputValue = (newValue: string) => {
    chatInput.current.value = newValue
    onMainInputChange()
    setTimeout(() => {
      chatInput.current.setSelectionRange(newValue.length, newValue.length)
    }, 0)
  }

  const handleArrowUp = () => {
    if (chatHistoryPos.current === 0) return
    if (chatHistoryPos.current === sendHistoryRef.current.length) { // started navigating history
      inputCurrentlyEnteredValue.current = chatInput.current.value
    }
    chatHistoryPos.current--
    updateInputValue(sendHistoryRef.current[chatHistoryPos.current] || '')
  }

  const handleArrowDown = () => {
    if (chatHistoryPos.current === sendHistoryRef.current.length) return
    chatHistoryPos.current++
    updateInputValue(sendHistoryRef.current[chatHistoryPos.current] || inputCurrentlyEnteredValue.current || '')
  }

  const handleCommandArrowUp = () => {
    if (commandHistoryPos.current === 0 || commandHistoryRef.current.length === 0) return
    if (commandHistoryPos.current === commandHistoryRef.current.length) { // started navigating command history
      inputCurrentlyEnteredValue.current = chatInput.current.value
    }
    commandHistoryPos.current--
    updateInputValue(commandHistoryRef.current[commandHistoryPos.current] || '')
  }

  const handleCommandArrowDown = () => {
    if (commandHistoryPos.current === commandHistoryRef.current.length) return
    commandHistoryPos.current++
    updateInputValue(commandHistoryRef.current[commandHistoryPos.current] || inputCurrentlyEnteredValue.current || '')
  }

  const auxInputFocus = (direction: 'up' | 'down') => {
    chatInput.current.focus()
    if (direction === 'up') {
      handleArrowUp()
    } else {
      handleArrowDown()
    }
  }

  useEffect(() => {
    // todo focus input on any keypress except tab
  }, [])

  const resetCompletionItems = () => {
    setCompletionItemsSource([])
    setCompletionItems([])
  }

  useEffect(() => {
    if (opened) {
      updateInputValue(chatInputValueGlobal.value)
      chatInputValueGlobal.value = ''
      chatHistoryPos.current = sendHistoryRef.current.length
      commandHistoryPos.current = commandHistoryRef.current.length
      if (!usingTouch) {
        chatInput.current.focus()
      }

      // Add keyboard event listener for letter keys and paste
      const handleKeyDown = (e: KeyboardEvent) => {
        if (['input', 'textarea', 'select'].includes(document.activeElement?.tagName.toLowerCase() ?? '')) return
        // Check if it's a single character key (works with any layout) without modifiers except shift
        const isSingleChar = e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey
        // Check if it's paste command
        const isPaste = e.code === 'KeyV' && (e.ctrlKey || e.metaKey)

        if ((isSingleChar || isPaste) && document.activeElement !== chatInput.current) {
          chatInput.current.focus()
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      const unsubscribeValtio = subscribe(chatInputValueGlobal, () => {
        if (!chatInputValueGlobal.value) return
        updateInputValue(chatInputValueGlobal.value)
        chatInputValueGlobal.value = ''
        chatInput.current.focus()
      })

      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        unsubscribeValtio()
      }
    }
  }, [opened])

  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useMemo(() => {
    if (opened) {
      completeRequestValue.current = ''
      resetCompletionItems()
    } else {
      setPreservedInputValue('')
      // Send stopped typing when chat closes
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (bot?._client && bot._client.writeChannel) {
        try {
          bot._client.writeChannel('minecraft-web-client:typing-indicator', {
            username: bot.username,
            isTyping: false
          })
        } catch (error) {
          // Channel might not be registered, ignore error
        }
      }
    }
  }, [opened])

  const onMainInputChange = () => {
    const lastWord = chatInput.current.value.slice(0, chatInput.current.selectionEnd ?? chatInput.current.value.length).split(' ').at(-1)!
    const isCommand = chatInput.current.value.startsWith('/')

    if (lastWord.startsWith('@') && getPingComplete && !isCommand) {
      setCompletePadText(lastWord)
      void fetchPingCompletions(true, lastWord.slice(1))
      return
    }

    const completeValue = getCompleteValue()
    setCompletePadText(completeValue === '/' ? '' : completeValue)
    // not sure if enabling would be useful at all (maybe make as a setting in the future?)
    // setSpellCheckEnabled(!chatInput.current.value.startsWith('/'))
    if (completeRequestValue.current === completeValue) {
      updateFilteredCompleteItems(completionItemsSource)
      return
    }

    if (completeValue.startsWith('/')) {
      void fetchCompletions(true)
    } else {
      resetCompletionItems()
    }
    completeRequestValue.current = completeValue
  }

  const fetchCompletions = async (implicit: boolean, inputValue = chatInput.current.value, showList = true) => {
    const completeValue = getCompleteValue(inputValue)
    completeRequestValue.current = completeValue
    resetCompletionItems()
    const newItems = await fetchCompletionItems?.(implicit ? 'implicit' : 'explicit', completeValue, inputValue) ?? []
    // if (completeValue !== completeRequestValue.current) return
    if (!showList) return
    setCompletionItemsSource(newItems)
    updateFilteredCompleteItems(newItems)
  }

  const fetchPingCompletions = async (implicit: boolean, inputValue: string) => {
    completeRequestValue.current = inputValue
    resetCompletionItems()
    const newItems = await getPingComplete?.(inputValue) ?? []
    if (inputValue !== completeRequestValue.current) return
    // Sort items by ping history
    const sortedItems = [...newItems].sort((a, b) => {
      const aIndex = pingHistoryRef.current.indexOf(a)
      const bIndex = pingHistoryRef.current.indexOf(b)
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
    setCompletionItemsSource(sortedItems)
    updateFilteredCompleteItems(sortedItems)
  }

  const updateFilteredCompleteItems = (sourceItems: string[] | Array<{ match: string, toolip: string }>) => {
    const newCompleteItems = sourceItems
      .map((item): string => (typeof item === 'string' ? item : item.match))
      .filter(item => {
        // this regex is imporatnt is it controls the word matching
        // const compareableParts = item.split(/[[\]{},_:]/)
        const lastWord = chatInput.current.value.slice(0, chatInput.current.selectionEnd ?? chatInput.current.value.length).split(' ').at(-1)!
        if (lastWord.startsWith('@')) {
          return item.toLowerCase().includes(lastWord.slice(1).toLowerCase())
        }
        return item.includes(lastWord)
        // return [item, ...compareableParts].some(compareablePart => compareablePart.startsWith(lastWord))
      })
    setCompletionItems(newCompleteItems)
  }

  const getDefaultCompleteValue = () => {
    const raw = chatInput.current.value
    return raw.slice(0, chatInput.current.selectionEnd ?? raw.length)
  }

  const getCompleteValue = (value = getDefaultCompleteValue()) => {
    const valueParts = value.split(' ')
    const lastLength = valueParts.at(-1)!.length
    const completeValue = lastLength ? value.slice(0, -lastLength) : value
    if (valueParts.length === 1 && value.startsWith('/')) return '/'
    return completeValue
  }

  const handleSlashCommand = () => {
    remountInput('/')
  }

  const handleAcceptFirstCompletion = () => {
    if (completionItems.length > 0) {
      acceptComplete(completionItems[0])
    }
  }

  const remountInput = (newValue?: string) => {
    if (newValue !== undefined) {
      setPreservedInputValue(newValue)
    }
    setInputKey(k => k + 1)
  }

  useEffect(() => {
    if (preservedInputValue && chatInput.current) {
      chatInput.current.focus()
    }
  }, [inputKey]) // Changed from spellCheckEnabled to inputKey

  return (
    <>
      <div
        className={`chat-wrapper chat-messages-wrapper ${usingTouch ? 'display-mobile' : ''} ${opened ? 'chat-opened' : ''}`} style={{
          userSelect: opened && allowSelection ? 'text' : undefined,
        }}
      >
        {/* Close button for desktop when chat is opened */}
        {!usingTouch && opened && (
          <div style={{
            position: 'absolute',
            top: '-19px',
            left: '5px',
            pointerEvents: 'auto',
          }}>
            <Button
              icon={pixelartIcons['close']}
              onClick={() => onClose?.()}
              style={{ color: '#ff5d5d' }}
            />
          </div>
        )}
        {opacity && <div ref={chatMessages} className={`chat ${opened ? 'opened' : ''}`} id="chat-messages" style={{ opacity }}>
          {debugChatScroll && (
            <div
              style={{
                position: 'absolute',
                top: 5,
                left: 5,
                display: 'flex',
                gap: 4,
                zIndex: 100,
              }}
            >
              <div
                title="Right now is at bottom (updated every 50ms)"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: rightNowAtBottom ? '#00ff00' : '#ff0000',
                  border: '1px solid #fff',
                }}
              />
              <div
                title="Currently at bottom"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: currentlyAtBottom ? '#00ff00' : '#ff0000',
                  border: '1px solid #fff',
                }}
              />
              <div
                title="Was at bottom"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: wasAtBottom() ? '#00ff00' : '#ff0000',
                  border: '1px solid #fff',
                }}
              />
              <div
                title="Chat opened"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: opened ? '#00ff00' : '#ff0000',
                  border: '1px solid #fff',
                }}
              />
            </div>
          )}
          {messages.map((m) => (
            <MessageLine key={reactKeyForMessage(m)} message={m} currentPlayerName={playerNameValidated} chatOpened={opened} />
          ))}
        </div> || undefined}
      </div>

      <div className={`chat-wrapper chat-input-wrapper ${usingTouch ? 'input-mobile' : ''}`} hidden={!opened}>
        {usingTouch && (
          <>
            <Button
              icon={pixelartIcons.close}
              onClick={() => onClose?.()}
              style={{
                width: 20,
                flexShrink: 0,
              }}
            />

            {(chatInput.current?.value && !chatInput.current.value.startsWith('/')) ? (
              // TOGGLE SPELL CHECK
              <Button
                style={{
                  width: 20,
                  flexShrink: 0,
                }}
                overlayColor={spellCheckEnabled ? '#00ff00' : '#ff0000'}
                icon={pixelartIcons['text-wrap']}
                onClick={() => {
                  setPreservedInputValue(chatInput.current?.value || '')
                  onSpellCheckEnabledChange?.(!spellCheckEnabled)
                  remountInput()
                }}
              />
            ) : (
              // SLASH COMMAND
              <Button
                style={{
                  width: 20,
                  flexShrink: 0,
                }}
                label={chatInput.current?.value ? undefined : '/'}
                icon={chatInput.current?.value ? pixelartIcons['arrow-right'] : undefined}
                onClick={() => {
                  const inputValue = chatInput.current.value
                  if (!inputValue) {
                    handleSlashCommand()
                  } else if (completionItems.length > 0) {
                    handleAcceptFirstCompletion()
                  }
                }}
              />
            )}
          </>
        )}
        <div className="chat-input">
          {isInputFocused && completionItems?.length ? (
            <div className="chat-completions">
              <div className="chat-completions-pad-text">{completePadText}</div>
              <div className="chat-completions-items">
                {completionItems.map((item) => (
                  <div
                    key={item}
                    onMouseDown={(e) => {
                      e.preventDefault() // Prevent blur before click
                      acceptComplete(item)
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {/* Typing indicator - above input on desktop */}
          {!usingTouch && typingIndicator}
          <form onSubmit={async (e) => {
            e.preventDefault()
            const message = chatInput.current.value
            if (message) {
              setSendHistory([...sendHistoryRef.current, message])
              onClose?.()
              await sendMessage?.(message)
              // Always scroll to bottom after sending a message
              scrollToBottom()
            }
          }}
          >
            {isIos && <input
              value=''
              type="text"
              className="chat-mobile-input-hidden chat-mobile-input-hidden-up"
              id="chatinput-next-command"
              spellCheck={false}
              autoComplete="off"
              onFocus={() => auxInputFocus('up')}
              onChange={() => { }}
            />}
            <input
              maxLength={chatVanillaRestrictions ? 256 : undefined}
              defaultValue={preservedInputValue}
              // ios doesn't support toggling autoCorrect on the fly so we need to re-create the input
              key={`${inputKey}`}
              autoCapitalize={preservedInputValue ? 'off' : 'on'}
              ref={chatInput}
              type="text"
              className="chat-input"
              id="chatinput"
              spellCheck={spellCheckEnabled}
              autoCorrect={spellCheckEnabled ? 'on' : 'off'}
              autoComplete="off"
              aria-autocomplete="both"
              onChange={onMainInputChange}
              disabled={!!inputDisabled}
              placeholder={inputDisabled || placeholder}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onKeyDown={(e) => {
                if (e.code === 'ArrowUp') {
                  if (e.altKey) {
                    handleCommandArrowUp()
                    e.preventDefault()
                  } else {
                    handleArrowUp()
                  }
                } else if (e.code === 'ArrowDown') {
                  if (e.altKey) {
                    handleCommandArrowDown()
                    e.preventDefault()
                  } else {
                    handleArrowDown()
                  }
                }
                if (e.code === 'Tab') {
                  if (completionItemsSource.length) {
                    if (completionItems.length) {
                      acceptComplete(completionItems[0])
                    }
                  } else {
                    void fetchCompletions(false)
                  }
                  e.preventDefault()
                }
                if (e.code === 'Space') {
                  resetCompletionItems()
                  const showList = chatInput.current.value.startsWith('/')
                  // alternative we could just simply use keyup, but only with keydown we can display suggestions popup as soon as possible
                  void fetchCompletions(true, getCompleteValue(getDefaultCompleteValue() + ' '), showList)

                }
              }}
            />
            {isIos && <input
              value=''
              type="text"
              className="chat-mobile-input-hidden chat-mobile-input-hidden-down"
              id="chatinput-prev-command"
              spellCheck={false}
              autoComplete="off"
              onFocus={() => auxInputFocus('down')}
              onChange={() => { }}
            />}
            {/* for some reason this is needed to make Enter work on android chrome */}
            <button type='submit' className="chat-submit-button" />
          </form>
          {/* Typing indicator - below input on mobile */}
          {usingTouch && typingIndicator}
        </div>
      </div>
    </>
  )
}

export default withInjectableUi(ChatBase, 'chat')
