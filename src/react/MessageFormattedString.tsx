import { useMemo } from 'react'
import { fromFormattedString } from '@xmcl/text-component'
import { ErrorBoundary } from '@zardoy/react-util'
import { formatMessage, MessageFormatOptions } from '../chatUtils'
import MessageFormatted from './MessageFormatted'

/** like MessageFormatted, but receives raw string or json instead, uses window.loadedData */
export default ({
  message,
  fallbackColor,
  className,
  formatOptions
}: {
  message: string | Record<string, any> | null
  fallbackColor?: string
  className?: string
  formatOptions?: MessageFormatOptions
}) => {
  const messageJson = useMemo(() => {
    if (!message) return null
    try {
      const texts = formatMessage(typeof message === 'string' ? fromFormattedString(message) : message)
      return texts.map(text => {
        return {
          ...text,
          color: text.color ?? fallbackColor
        }
      })
    } catch (err) {
      console.error(err) // todo ensure its being logged
      return null
    }
  }, [message])

  return messageJson ? (
    <ErrorBoundary
      renderError={error => {
        console.error(error)
        return <div>[text component crashed]</div>
      }}
    >
      <MessageFormatted parts={messageJson} className={className} formatOptions={formatOptions} />
    </ErrorBoundary>
  ) : null
}
