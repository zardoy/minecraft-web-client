import React, { useEffect, useState } from 'react'
import { appQueryParams } from '../appParams'
import { fetchServerStatus, isServerValid } from '../api/mcStatusApi'
import { parseServerAddress } from '../parseServerAddress'
import FlatButton from './ui/FlatButton'
import PixelartIcon from './PixelartIcon'
import { withInjectableUi } from './extendableSystem'
import styles from './serversList.module.css'

export interface BaseServerInfo {
  ip: string
  name?: string
  versionOverride?: string
  proxyOverride?: string
  usernameOverride?: string
  /** Username or always use new if true */
  authenticatedAccountOverride?: string | true
}

interface Props {
  onBack: () => void
  onConfirm: (info: BaseServerInfo) => void
  title?: string
  initialData?: BaseServerInfo
  parseQs?: boolean
  onQsConnect?: (server: BaseServerInfo) => void
  placeholders?: Pick<BaseServerInfo, 'proxyOverride' | 'usernameOverride'>
  accounts?: string[]
  authenticatedAccounts?: number
  versions?: string[]
}

type ServerCheck = { state: 'idle' } | { state: 'checking' } | { state: 'online', version?: string, players: string[], playersText: string } | { state: 'offline' }

const Field = ({ label, hint, children }: { label: string, hint?: React.ReactNode, children: React.ReactNode }) => {
  return <label className={styles.formField}>
    <span className={styles.formLabel}>{translate(label)}</span>
    <span className={styles.formControl}>
      {children}
      {hint && <span className={styles.formHint}>{hint}</span>}
    </span>
  </label>
}

const TextInput = ({ invalid, ...props }: React.ComponentProps<'input'> & { invalid?: boolean }) => {
  return <input
    autoComplete='off'
    autoCorrect='off'
    autoCapitalize='off'
    spellCheck={false}
    {...props}
    className={`${styles.formInput} ${invalid ? styles.formInputInvalid : ''}`}
  />
}

const AddServerOrConnectBase = ({ onBack, onConfirm, title = 'Add a Server', initialData, parseQs, onQsConnect, placeholders, accounts, versions }: Props) => {
  const qsParamName = parseQs ? appQueryParams.name : undefined
  const qsParamIp = parseQs ? appQueryParams.ip : undefined
  const qsParamVersion = parseQs ? appQueryParams.version : undefined
  const qsParamProxy = parseQs ? appQueryParams.proxy : undefined
  const qsParamUsername = parseQs ? appQueryParams.username : undefined
  const qsParamLockConnect = parseQs ? appQueryParams.lockConnect : undefined

  const parsedQsIp = parseServerAddress(qsParamIp)
  const parsedInitialIp = parseServerAddress(initialData?.ip)

  const [serverName, setServerName] = useState(initialData?.name ?? qsParamName ?? '')
  const [serverIp, setServerIp] = useState(parsedQsIp.serverIpFull || parsedInitialIp.serverIpFull || '')
  const [versionOverride, setVersionOverride] = useState(initialData?.versionOverride ?? /* legacy */ initialData?.['version'] ?? qsParamVersion ?? '')
  const [proxyOverride, setProxyOverride] = useState(initialData?.proxyOverride ?? qsParamProxy ?? '')
  const [usernameOverride, setUsernameOverride] = useState(initialData?.usernameOverride ?? qsParamUsername ?? '')
  const lockConnect = qsParamLockConnect === 'true'

  const initialAccount = initialData?.authenticatedAccountOverride
  const [accountIndex, setAccountIndex] = useState(initialAccount === true ? -2 : initialAccount ? (accounts?.includes(initialAccount) ? accounts.indexOf(initialAccount) : -2) : -1)
  const [showAdvanced, setShowAdvanced] = useState(!!(versionOverride || proxyOverride || initialAccount))

  const freshAccount = accountIndex === -2
  const noAccountSelected = accountIndex === -1
  const authenticatedAccountOverride = noAccountSelected ? undefined : freshAccount ? true : accounts?.[accountIndex]

  const ipFinal = serverIp.replace(/:$/, '')
  const commonUseOptions: BaseServerInfo = {
    name: serverName,
    ip: ipFinal,
    versionOverride: versionOverride || undefined,
    proxyOverride: proxyOverride || undefined,
    usernameOverride: usernameOverride || undefined,
    authenticatedAccountOverride,
  }

  // live check of the typed address (Java servers through the status API; websocket servers are pinged when the list opens)
  const [check, setCheck] = useState<ServerCheck>({ state: 'idle' })
  const isWebsocket = /^wss?:\/\//.test(serverIp)
  useEffect(() => {
    const address = parseServerAddress(serverIp)
    const host = address.serverIpFull.replace(/:$/, '')
    if (!host || isWebsocket || !isServerValid(host)) {
      setCheck({ state: 'idle' })
      return
    }
    setCheck({ state: 'checking' })
    let cancelled = false
    // only the page link is checked right away, a typed address waits for the typing to stop
    const timeout = setTimeout(async () => {
      try {
        const status = await fetchServerStatus(host)
        if (cancelled || !status) return
        const { raw } = status
        setCheck(raw.online
          ? { state: 'online', version: raw.version?.name_raw, players: raw.players?.list.map(p => p.name_raw) ?? [], playersText: `${raw.players?.online ?? '?'}/${raw.players?.max ?? '?'}` }
          : { state: 'offline' })
      } catch (err) {
        console.error('Failed to fetch server status:', err)
        if (!cancelled) setCheck({ state: 'idle' })
      }
    }, serverIp === parsedQsIp.serverIpFull ? 0 : 700)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [serverIp])

  const usernameProblem = (() => {
    if (!usernameOverride) return undefined
    if (!/^\w{3,16}$/.test(usernameOverride)) return '3-16 letters, digits or _'
    if (check.state === 'online' && check.players.includes(usernameOverride)) return 'Someone with this name is online'
    return undefined
  })()

  const addressHint = isWebsocket
    ? <span className={styles.muted}>{translate('Websocket server: connects directly, no proxy needed')}</span>
    : check.state === 'checking' ? <span className={styles.muted}>{translate('Checking...')}</span>
      : check.state === 'online' ? <span className={styles.onlineText}>● {translate('Online')} · {check.version} · {check.playersText}</span>
        : check.state === 'offline' ? <span className={styles.offlineText}>● {translate('Offline or not found')}</span>
          : <span className={styles.muted}>{translate('Java server address. Add :port if it is not 25565')}</span>

  const displayConnectButton = !!qsParamIp
  const [example] = useState(() => {
    const serverExamples = ['play.example.net', 'mc.example.com:25565', 'wss://play.mcraft.fun']
    return serverExamples[Math.floor(Math.random() * serverExamples.length)]
  })

  return <div className={`fullscreen ${styles.root} add-server-screen`}>
    <div className='backdrop' />
    <form
      className={`${styles.panel} ${styles.formPanel}`}
      onSubmit={(e) => {
        e.preventDefault()
        onConfirm(commonUseOptions)
      }}
    >
      <div className={styles.header}>
        {!lockConnect && <FlatButton icon='chevron-left' title={translate('Cancel')} onClick={onBack} />}
        <span className={styles.title}>{translate(qsParamIp ? 'Connect to Server' : title)}</span>
      </div>

      <div className={styles.formBody}>
        <Field label='Address' hint={addressHint}>
          <TextInput
            required
            autoFocus={!lockConnect}
            value={serverIp}
            disabled={lockConnect && parsedQsIp.host !== null}
            placeholder={example}
            onChange={({ target: { value } }) => setServerIp(value)}
            invalid={check.state === 'offline'}
          />
        </Field>
        {!lockConnect && <Field label='Server Name'>
          <TextInput value={serverName} placeholder={translate('Defaults to the address')} onChange={({ target: { value } }) => setServerName(value)} />
        </Field>}

        {/* the username is generated on first start: visible here so it is clear which name the server sees */}
        <Field
          label='Username'
          hint={noAccountSelected
            ? usernameProblem && <span className={styles.offlineText}>{translate(usernameProblem)}</span>
            : <span className={styles.muted}>{translate('The Microsoft account name is used')}</span>}
        >
          <TextInput
            value={noAccountSelected ? usernameOverride : ''}
            disabled={!noAccountSelected || (lockConnect && qsParamUsername !== null)}
            placeholder={placeholders?.usernameOverride ? `${translate('Default')}: ${placeholders.usernameOverride}` : ''}
            onChange={({ target: { value } }) => setUsernameOverride(value)}
            invalid={!!usernameProblem}
          />
        </Field>

        <button type='button' className={styles.advancedToggle} aria-expanded={showAdvanced} onClick={() => setShowAdvanced(!showAdvanced)}>
          <PixelartIcon iconName={showAdvanced ? 'chevron-down' : 'chevron-right'} />
          {translate('Advanced')}
          {!showAdvanced && <span className={styles.muted}>{translate('version, proxy, account')}</span>}
        </button>

        {showAdvanced && <>
          <Field
            label='Version'
            hint={versionOverride && versions && !versions.includes(versionOverride)
              ? <span className={styles.warnText}>{translate('Not a supported version, the closest one is used')}</span>
              : <span className={styles.muted}>{translate('Empty: detected from the server')}</span>}
          >
            <TextInput
              value={versionOverride}
              list='server-versions'
              placeholder={translate('Auto-detect')}
              disabled={lockConnect}
              onChange={({ target: { value } }) => setVersionOverride(value.trim())}
            />
            <datalist id='server-versions'>
              {[...versions ?? []].reverse().map(v => <option key={v} value={v} />)}
            </datalist>
          </Field>
          <Field label='Proxy' hint={isWebsocket ? <span className={styles.muted}>{translate('Not needed for websocket servers')}</span> : undefined}>
            <TextInput
              value={proxyOverride}
              disabled={lockConnect && (qsParamProxy !== null || !!placeholders?.proxyOverride) || isWebsocket}
              placeholder={placeholders?.proxyOverride ? `${translate('Default')}: ${placeholders.proxyOverride.replace(/^https?:\/\//, '')}` : ''}
              onChange={({ target: { value } }) => setProxyOverride(value)}
            />
          </Field>
          <Field label='Account'>
            <span className={styles.selectWrap}>
              <select
                className={`${styles.formInput} ${styles.formSelect}`}
                value={accountIndex}
                onChange={({ target: { value } }) => setAccountIndex(Number(value))}
                disabled={lockConnect && qsParamUsername !== null}
              >
                <option value={-1}>{translate('Offline (username only)')}</option>
                {accounts?.map((account, i) => <option key={i} value={i}>{account} ({translate('Microsoft')})</option>)}
                <option value={-2}>{translate('Sign in with Microsoft...')}</option>
              </select>
              <PixelartIcon iconName='chevron-down' className={styles.selectChevron} />
            </span>
          </Field>

        </>}
      </div>

      <div className={`${styles.footer} ${styles.formFooter}`}>
        {!lockConnect && <>
          <FlatButton label='Cancel' className={styles.formButton} onClick={onBack} />
          <FlatButton type='submit' variant={displayConnectButton ? 'default' : 'primary'} label='Save' className={styles.formButton} />
        </>}
        {displayConnectButton && <FlatButton
          data-test-id='connect-qs'
          variant='primary'
          label='Connect'
          className={styles.formButton}
          onClick={() => {
            onQsConnect?.(commonUseOptions)
          }}
        />}
      </div>
    </form>
  </div>
}

export default withInjectableUi(AddServerOrConnectBase, 'addServerOrConnect')
