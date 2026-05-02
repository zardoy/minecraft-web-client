import { proxy, useSnapshot } from 'valtio'
import { useEffect, useRef, useState } from 'react'
import { hideCurrentModal, showModal } from '../globalState'
import Screen from './Screen'
import { useIsModalActive } from './utilsApp'
import Button from './Button'

type Mode = 'login' | 'register'

const state = proxy({
  mode: 'login' as Mode,
  serverIp: '',
  username: '',
  prefilledPassword: '' as string | undefined,
})

let resolve: ((value: { password: string } | undefined) => void) | undefined

export const showAutoFillLoginModal = async (params: {
  mode: Mode
  serverIp: string
  username: string
  prefilledPassword?: string
}): Promise<{ password: string } | undefined> => {
  showModal({ reactType: 'auto-fill-login' })
  return new Promise((_resolve) => {
    resolve = _resolve
    Object.assign(state, {
      mode: params.mode,
      serverIp: params.serverIp,
      username: params.username,
      prefilledPassword: params.prefilledPassword ?? '',
    })
  })
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'minecraft, mojangles, monospace',
  fontSize: 10,
  color: 'white',
  background: 'rgba(0, 0, 0, 0.5)',
  border: '1px solid #A0A0A0',
  outline: 'none',
  padding: '4px 6px',
  width: 200,
  boxSizing: 'border-box',
}

const captionStyle: React.CSSProperties = {
  fontSize: 8,
  color: '#A0A0A0',
  marginTop: 2,
  textAlign: 'center',
  maxWidth: 200,
}

const errorStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#FF5555',
  textAlign: 'center',
  maxWidth: 220,
}

export default () => {
  const { mode, serverIp, username, prefilledPassword } = useSnapshot(state)
  const isModalActive = useIsModalActive('auto-fill-login')
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isModalActive) {
      setError('')
      if (passwordRef.current) {
        passwordRef.current.value = prefilledPassword ?? ''
      }
      if (confirmRef.current) {
        confirmRef.current.value = ''
      }
    }
  }, [isModalActive, prefilledPassword])

  if (!isModalActive) return null

  const identifier = `${serverIp}-${username}`
  const title = mode === 'login' ? 'Auto-fill server access' : 'Auto-fill server registration'

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const password = (passwordRef.current?.value ?? '').trim()
    if (!password) {
      setError('Password is required')
      return
    }
    if (mode === 'register') {
      const confirm = (confirmRef.current?.value ?? '').trim()
      if (password !== confirm) {
        setError('Passwords do not match')
        return
      }
    }
    setError('')
    resolve?.({ password })
    resolve = undefined
    hideCurrentModal()
  }

  const handleCancel = () => {
    setError('')
    resolve?.(undefined)
    resolve = undefined
    hideCurrentModal()
  }

  return <Screen title={title} backdrop>
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'center' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <input
          type="text"
          name="username"
          autoComplete="username"
          readOnly
          value={identifier}
          style={inputStyle}
        />
        <div style={captionStyle}>Used as identifier in your password manager</div>
      </div>

      <input
        ref={passwordRef}
        type="password"
        name="password"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        autoFocus
        defaultValue={prefilledPassword}
        placeholder="Password"
        style={inputStyle}
      />

      {mode === 'register' && (
        <input
          ref={confirmRef}
          type="password"
          name="password-confirm"
          autoComplete="new-password"
          placeholder="Confirm password"
          style={inputStyle}
        />
      )}

      {error && <div style={errorStyle}>{error}</div>}

      <div style={{ display: 'flex', gap: 5 }}>
        <Button type="submit">{mode === 'login' ? 'Login' : 'Register'}</Button>
        <Button type="button" onClick={handleCancel}>Cancel</Button>
      </div>
    </form>
  </Screen>
}
