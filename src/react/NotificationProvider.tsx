import React, { useEffect } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppScale } from '../scaleInterface'
import Notification from './Notification'
import { pixelartIcons } from './PixelartIcon'

type NotificationType = React.ComponentProps<typeof Notification> & {
  autoHide: boolean
  id: string
}

// todo stacking
export const notificationProxy = proxy({
  message: '',
  open: false,
  type: 'message',
  subMessage: '',
  icon: '',
  autoHide: true,
  id: '',
} satisfies NotificationType as NotificationType)

export const progressNotificationsProxy = proxy({
  loaders: [] as Array<{
    id: string
    message: string
    subMessage?: string
    current?: number
    total?: number
    priority?: number
  }>,
})

export const setNotificationProgress = (id: string, newProps: {
  current?: number
  total?: number
  message?: string
  subMessage?: string
  delete?: boolean
  priority?: number
}) => {
  const loaderExisting = progressNotificationsProxy.loaders.find((loader) => loader.id === id)
  let loader = loaderExisting
  if (!loader) {
    loader = {
      id,
      message: '',
      priority: newProps.priority,
    }
  }
  if (newProps.current !== undefined) loader.current = newProps.current
  if (newProps.total !== undefined) loader.total = newProps.total
  if (newProps.message !== undefined) loader.message = newProps.message
  if (newProps.subMessage !== undefined) loader.subMessage = newProps.subMessage
  if (!loaderExisting) {
    progressNotificationsProxy.loaders.push(loader)
  }
  if (newProps.delete) {
    progressNotificationsProxy.loaders = progressNotificationsProxy.loaders.filter((loader) => loader.id !== id)
  }
}

export const showNotification = (
  message: string,
  subMessage = '',
  isError = false,
  icon = '',
  action = undefined as (() => void) | undefined,
  autoHide = true,
  id = ''
) => {
  notificationProxy.message = message
  notificationProxy.subMessage = subMessage
  notificationProxy.type = isError ? 'error' : 'message'
  notificationProxy.icon = icon
  notificationProxy.open = true
  notificationProxy.autoHide = autoHide
  notificationProxy.action = action
  notificationProxy.id = id
}
globalThis.showNotification = showNotification
export const hideNotification = (id?: string) => {
  if (id === undefined || notificationProxy.id === id) {
    // openNotification('') // reset
    notificationProxy.open = false
  }
}

export default () => {
  const { autoHide, message, open, icon, type, subMessage, action } = useSnapshot(notificationProxy)
  const { loaders } = useSnapshot(progressNotificationsProxy)

  useEffect(() => {
    if (autoHide && open) {
      setTimeout(() => {
        hideNotification(notificationProxy.id)
      }, 7000)
    }
  }, [autoHide, open])

  // test
  useEffect(() => {
    setTimeout(() => {
      // showNotification('test', 'test', false, pixelartIcons.loader)
      // setNotificationProgress('test', {
      //   current: 10,
      //   total: 100,
      //   message: 'Rendering world chunks',
      // })
      // setNotificationProgress('test2', {
      //   current: 10,
      //   total: 100,
      //   message: 'progress',
      // })
    }, 1000)
  }, [])
  const scale = useAppScale()

  return <div
    className='notification-container'
    style={{
      // transform: `scale(${scale})`,
      // transformOrigin: 'top right',
    }}
  >
    <Notification
      action={action}
      type={type}
      message={message}
      subMessage={subMessage}
      open={open}
      icon={icon}
    />
    <AnimatePresence>
      {loaders.toSorted((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).map((loader, i) => (
        <motion.div
          key={loader.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Notification
            type='progress'
            open={true}
            topPosition={i + 1}
            icon={pixelartIcons.loader}
            subMessage={loader.subMessage ?? (loader.current !== undefined && loader.total !== undefined ? formatProgress(loader.current, loader.total) : undefined)}
            message={loader.message}
            currentProgress={loader.current}
            totalProgress={loader.total}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
}

const formatProgress = (current: number, total: number) => {
  const formatter = new Intl.NumberFormat()
  return `${Math.floor((current / total) * 100)}% (${formatter.format(current)} / ${formatter.format(total)})`
}
