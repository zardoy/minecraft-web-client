import type { Meta, StoryObj } from '@storybook/react'

import { useEffect, useState } from 'react'
import { formatMessage } from '../chatUtils'
import Chat, { chatInputValueGlobal } from './Chat'
import Button from './Button'

window.spamMessage = window.spamMessage ?? ''
window.loadedData = {
  language: {}
}
const meta: Meta<typeof Chat> = {
  component: Chat,
  render(args) {
    const [messages, setMessages] = useState(args.messages)
    const [autoSpam, setAutoSpam] = useState(false)
    const [open, setOpen] = useState(args.opened)

    useEffect(() => {
      const abortController = new AbortController()
      addEventListener(
        'keyup',
        e => {
          if (e.code === 'KeyY') {
            chatInputValueGlobal.value = '/'
            setOpen(true)
            e.stopImmediatePropagation()
          }
          if (e.code === 'Escape') {
            setOpen(false)
            e.stopImmediatePropagation()
          }
        },
        {
          signal: abortController.signal
        }
      )
      return () => abortController.abort()
    })

    useEffect(() => {
      setMessages(args.messages)
    }, [args.messages])

    useEffect(() => {
      if (!autoSpam) return
      const action = () => {
        const newMessageParts = window.spamMessage
          ? formatMessage(window.spamMessage)
          : [
              {
                text: 'tes'
              },
              {
                text: 't'
              }
            ]

        setMessages(m => [
          ...m,
          ...Array.from({ length: 10 }).map(
            (_, i) =>
              ({
                id: (m.at(-1)?.id ?? 0) + i + 1,
                parts: newMessageParts
              }) satisfies (typeof args.messages)[number]
          )
        ])
      }
      const interval = setInterval(() => action(), 5000)
      action()
      return () => clearInterval(interval)
    }, [autoSpam])

    return (
      <div
        style={{
          marginTop: args.usingTouch ? 100 : 0
        }}
      >
        <div style={{ fontSize: 6, userSelect: 'auto', color: 'gray' }}>
          Hint: you can capture needed message with <code>bot.on('message', console.log)</code>, copy object, and assign it here to{' '}
          <code>window.spamMessage</code> variable (but ensure the correct frame window is selected in devtools)
        </div>
        <Chat
          {...args}
          opened={open}
          messages={messages}
          onClose={() => setOpen(false)}
          fetchCompletionItems={async (triggerType, value) => {
            console.log('fetchCompletionItems')
            await new Promise(resolve => {
              setTimeout(resolve, 0)
            })
            let items = ['test', ...Array.from({ length: 50 }).map((_, i) => `minecraft:hello${i}`)]
            if (value === '/') items = items.map(item => `/${item}`)
            return items
          }}
        />
        <Button onClick={() => setOpen(s => !s)}>Open: {open ? 'on' : 'off'}</Button>
        <Button onClick={() => setAutoSpam(s => !s)}>Auto Spam: {autoSpam ? 'on' : 'off'}</Button>
        <Button onClick={() => setMessages(args.messages)}>Reset</Button>
      </div>
    )
  }
}

export default meta
type Story = StoryObj<typeof Chat>

export const Primary: Story = {
  args: {
    usingTouch: false,
    allowSelection: false,
    messages: [
      {
        parts: [
          {
            bold: false,
            italic: false,
            underlined: false,
            strikethrough: false,
            obfuscated: false,
            json: {
              insertion: 'pviewer672',
              clickEvent: {
                action: 'suggest_command',
                value: '/tell pviewer672 '
              },
              hoverEvent: {
                action: 'show_entity',
                contents: {
                  type: 'minecraft:player',
                  id: 'ecd0eeb1-625e-3fea-b16e-cb449dcfa434',
                  name: {
                    text: 'pviewer672'
                  }
                }
              },
              text: 'pviewer672'
            },
            text: 'pviewer672',
            clickEvent: {
              action: 'suggest_command',
              value: '/tell pviewer672 '
            },
            hoverEvent: {
              action: 'show_entity',
              //@ts-expect-error
              contents: {
                type: 'minecraft:player',
                id: 'ecd0eeb1-625e-3fea-b16e-cb449dcfa434',
                name: {
                  text: 'pviewer672'
                }
              }
            }
          },
          {
            text: ' joined the game',
            color: 'yellow',
            bold: false,
            italic: false,
            underlined: false,
            strikethrough: false,
            obfuscated: false
          }
        ],
        id: 0
      }
    ]
    // opened: false,
  }
}
