import { motion, AnimatePresence } from 'framer-motion'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import { useUsingTouch } from './utilsApp'

const duration = 0.2

// save pass: login

const toastHeight = 34

interface NotificationProps {
  open: boolean
  message: string
  type?: 'message' | 'error' | 'progress'
  subMessage?: string
  icon?: string
  action?: () => void
  topPosition?: number

  currentProgress?: number
  totalProgress?: number
}

export default ({
  type = 'message',
  message,
  subMessage = '',
  open,
  icon = '',
  action = undefined as (() => void) | undefined,
  topPosition = 0,
  currentProgress,
  totalProgress,
}: NotificationProps) => {
  const isUsingTouch = useUsingTouch()
  const isError = type === 'error'
  icon ||= isError ? 'alert' : 'message'

  const isLoader = type === 'progress'

  const top = (topPosition * toastHeight) + (isUsingTouch ? 18 : 0) // add space for mobile top buttons
  return <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '-100%' }}
        transition={{ duration }}
        className={`app-notification ${isError ? 'error-notification' : ''}`}
        onClick={action}
        style={{
          position: 'fixed',
          top,
          right: 0,
          width: type === 'progress' ? '180px' : undefined,
          scale: type === 'progress' ? undefined : 0.9,
          transformOrigin: type === 'progress' ? undefined : 'right',
          whiteSpace: 'nowrap',
          fontSize: '9px',
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          padding: '4px 5px',
          background: isError ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.7)',
          borderRadius: top === 0 ? '0 0 0 5px' : '5px',
          pointerEvents: action ? 'auto' : 'none',
          zIndex: isLoader ? 10 : 1200,
        }}
      >
        <PixelartIcon
          iconName={icon}
          styles={{
            fontSize: isLoader ? 15 : 12,
            animation: isLoader ? 'rotation 6s linear infinite' : 'none',
          }}
        />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}>
          <div style={{
            whiteSpace: 'normal',
          }}>
            {translate(message)}
          </div>
          <div style={{
            fontSize: '7px',
            whiteSpace: 'nowrap',
            color: 'lightgray',
            marginTop: 3,
          }}>
            {translate(subMessage)}
          </div>
          {currentProgress !== undefined && totalProgress !== undefined && (
            <div style={{
              width: '100%',
              height: '2px',
              background: 'rgba(128, 128, 128, 0.5)',
              marginTop: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(100, (totalProgress ? currentProgress / totalProgress : 0) * 100)}%`,
                height: '100%',
                background: 'white',
                transition: 'width 0.2s ease-out',
              }} />
            </div>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
}
