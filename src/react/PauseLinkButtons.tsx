import { useSnapshot } from 'valtio'
import { openURL } from 'minecraft-renderer/src/lib/simpleUtils'
import { ErrorBoundary } from '@zardoy/react-util'
import { miscUiState } from '../globalState'
import { openGithub } from '../utils'
import Button from './Button'
import { DiscordButton } from './DiscordButton'
import styles from './PauseScreen.module.css'

function PauseLinkButtonsInner () {
  const { appConfig } = useSnapshot(miscUiState)
  const pauseLinksConfig = appConfig?.pauseLinks

  if (!pauseLinksConfig) return null

  const renderButton = (button: Record<string, any>, style: React.CSSProperties, key: number) => {
    if (button.type === 'discord') {
      return <DiscordButton key={key} style={style} text={button.text}/>
    }
    if (button.type === 'github') {
      return <Button key={key} className="button" style={style} onClick={() => openGithub()}>{button.text ?? 'GitHub'}</Button>
    }
    if (button.type === 'url' && button.text) {
      return <Button key={key} className="button" style={style} onClick={() => openURL(button.url)}>{button.text}</Button>
    }
    return null
  }

  return (
    <>
      {pauseLinksConfig.map((row, i) => {
        const style = { width: (204 / row.length - (row.length > 1 ? 4 : 0)) + 'px' }
        return (
          <div key={i} className={styles.row}>
            {row.map((button, k) => renderButton(button, style, k))}
          </div>
        )
      })}
    </>
  )
}

export default () => {
  return <ErrorBoundary renderError={(error) => {
    console.error(error)
    return null
  }}>
    <PauseLinkButtonsInner />
  </ErrorBoundary>
}
