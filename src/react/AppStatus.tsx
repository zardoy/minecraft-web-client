import { useEffect, useState } from 'react'
import { appQueryParams } from '../appParams'
import { lastConnectOptions } from '../appStatus'
import styles from './appStatus.module.css'
import Button from './Button'
import Screen from './Screen'
import LoadingChunks from './LoadingChunks'
import LoadingTimer from './LoadingTimer'
import { withInjectableUi } from './extendableSystem'

const AppStatusBase = ({
  status,
  isError,
  hideDots = false,
  lastStatus = '',
  backAction = undefined as undefined | (() => void),
  description = '' as string | JSX.Element,
  actionsSlot = null as React.ReactNode | null,
  showReconnect = false,
  onReconnect = undefined as undefined | (() => void),
  /** overall progress of a long load: 0..1 with what is being done now; `step` = the sub-step running right now (which file, which module) */
  progress = undefined as undefined | { value: number, label: string, detail?: string, step?: string },
  /** seconds without any change on the loading screen (shown with a Reload button), undefined while it moves */
  stalledSeconds = undefined as undefined | number,
  children
}) => {
  const [loadingDotIndex, setLoadingDotIndex] = useState(0)
  const { hadWorldLoaded } = lastConnectOptions

  useEffect(() => {
    const statusRunner = async () => {
      const timer = async (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

      const load = async () => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          setLoadingDotIndex(i => (i + 1) % 4)
          await timer(500) // eslint-disable-line no-await-in-loop
        }
      }

      void load()
    }

    void statusRunner()
  }, [])

  const lockConnect = appQueryParams.lockConnect === 'true'
  const connectOptions = lastConnectOptions.value
  const connectionProxy =
    connectOptions?.server && !connectOptions.server.startsWith('ws://') && !connectOptions.server.startsWith('wss://')
      ? connectOptions.proxy : undefined

  return (
    <div className=''>
      <Screen
        className={`small-content ${isError ? '' : 'loading-centered'}`}
        titleSelectable={isError}
        title={
          <>
            <span
              className='app-status-title'
              style={{
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {progress ? progress.label || status : status}
            </span>
            <div style={{ display: 'inline-flex', gap: '1px', }} hidden={hideDots || isError || !!progress}>
              {
                [...'...'].map((dot, i) => {
                  return <span
                    key={i} style={{
                      visibility: loadingDotIndex <= i ? 'hidden' : 'visible',
                    }}>{dot}</span>
                })
              }
            </div>
            {/* the space of the bar is always reserved on loading screens, so the title does not jump when the bar appears */}
            {!isError && <div className={`${styles.progress} ${progress ? '' : styles.hidden}`} aria-hidden={!progress}>
              <div
                className={styles.bar}
                role='progressbar'
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((progress?.value ?? 0) * 100)}
              >
                <div className={styles.track}>
                  <div className={styles.fill} style={{ width: `${Math.round((progress?.value ?? 0) * 100)}%` }} />
                </div>
              </div>
              <div className={styles.progressInfo}>
                <span>{progress?.detail ?? ''}</span>
                <span>{Math.round((progress?.value ?? 0) * 100)}%</span>
              </div>
              {/* positioned under the bar, out of the layout: the loading screen stays centred as before */}
              {progress && (progress.step || stalledSeconds !== undefined) && <div className={styles.progressExtra}>
                {progress.step && <div className={styles.progressStep}>{progress.step}</div>}
                {stalledSeconds !== undefined && <div className={styles.progressStall}>
                  <span>No progress for {stalledSeconds} s</span>
                  <Button style={{ width: 60 }} onClick={() => window.location.reload()}>Reload</Button>
                </div>}
              </div>}
            </div>}
            <p className={styles.description}>{description}</p>
            <p className={styles['last-status']}>{lastStatus ? `Last status: ${lastStatus}` : lastStatus}</p>
            {isError && <p className={`app-status-title-context-info ${styles.appStatusTitleContextInfo}`}>
              S: {connectOptions?.server ?? 'N/A'} {' '}
              P: {connectionProxy ?? 'N/A'} {' '}
              V: {connectOptions?.botVersion ?? 'auto'} {' '}
              U: {connectOptions?.username ?? 'N/A'}{' '}
              cV: {process.env.RELEASE_TAG ?? 'N/A'}
            </p>}
          </>
        }
        backdrop='dirt'
      >
        {isError && (
          <>
            {showReconnect && onReconnect && <Button onClick={onReconnect}>
              <b>Reconnect</b>
            </Button>}
            {actionsSlot}
            {!lockConnect && <Button
              onClick={() => {
                if (location.search) {
                  location.search = ''
                } else {
                  window.location.reload()
                }
              }}
            >
              <b>Reset App (recommended)</b>
            </Button>}
            {backAction && <Button label="Back" onClick={backAction} />}
          </>
        )}
        {children}
        <LoadingTimer />
      </Screen>
    </div>
  )
}

export default withInjectableUi(AppStatusBase, 'appStatus')
