import { proxy, useSnapshot } from 'valtio'
import { useEffect, useRef, useState } from 'react'
import { hideCurrentModal, showModal } from '../globalState'
import Screen from './Screen'
import { useIsModalActive } from './utilsApp'
import Button from './Button'

type Mode = 'login' | 'register' | 'changepassword' | 'unregister'

const state = proxy({
  mode: 'login' as Mode,
  serverIp: '',
  username: '',
  prefilledPassword: '' as string | undefined,
})

let resolve: ((value: { password: string, newPassword?: string } | undefined) => void) | undefined

export const showAutoFillLoginModal = async (params: {
  mode: Mode
  serverIp: string
  username: string
  prefilledPassword?: string
}): Promise<{ password: string, newPassword?: string } | undefined> => {
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
  const newPasswordRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)

  useEffect(() => {
    if (isModalActive) {
      setError('')
      setConfirmChecked(false)
      if (passwordRef.current) {
        passwordRef.current.value = prefilledPassword ?? ''
      }
      if (confirmRef.current) {
        confirmRef.current.value = ''
      }
      if (newPasswordRef.current) {
        newPasswordRef.current.value = ''
      }
      if (usernameRef.current) {
        usernameRef.current.value = `${serverIp}-${username}`
      }
    }
  }, [isModalActive, prefilledPassword, serverIp, username])

  if (!isModalActive) return null

  const identifier = `${serverIp}-${username}`
  const title = mode === 'login'
    ? 'Auto-fill server access'
    : mode === 'register'
      ? 'Auto-fill server registration'
      : mode === 'changepassword'
        ? 'Auto-fill password change'
        : 'Auto-fill account deletion'

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const password = (passwordRef.current?.value ?? '').trim()

    if (mode === 'changepassword') {
      const oldPassword = password
      const newPassword = (newPasswordRef.current?.value ?? '').trim()
      const confirmNew = (confirmRef.current?.value ?? '').trim()
      if (!oldPassword) {
        setError('Old password is required')
        return
      }
      if (!newPassword) {
        setError('New password is required')
        return
      }
      if (newPassword !== confirmNew) {
        setError('New passwords do not match')
        return
      }
      if (oldPassword === newPassword) {
        setError('New password must differ from old password')
        return
      }
      setError('')
      resolve?.({ password: oldPassword, newPassword })
      resolve = undefined
      hideCurrentModal()
      return
    }

    if (mode === 'unregister') {
      if (!password) {
        setError('Password is required')
        return
      }
      if (!confirmChecked) {
        setError('You must confirm account deletion')
        return
      }
      setError('')
      resolve?.({ password })
      resolve = undefined
      hideCurrentModal()
      return
    }

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
          ref={usernameRef}
          type="text"
          name="username"
          autoComplete="username"
          defaultValue={identifier}
          style={inputStyle}
        />
        <div style={captionStyle}>Used as identifier in your password manager</div>
      </div>

      {mode === 'changepassword' && (
        <input
          ref={passwordRef}
          type="password"
          name="old-password"
          autoComplete="current-password"
          autoFocus
          defaultValue={prefilledPassword}
          placeholder="Old password"
          style={inputStyle}
        />
      )}

      {mode === 'unregister' && (
        <input
          ref={passwordRef}
          type="password"
          name="password"
          autoComplete="current-password"
          autoFocus
          defaultValue={prefilledPassword}
          placeholder="Password"
          style={inputStyle}
        />
      )}

      {(mode === 'login' || mode === 'register') && (
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
      )}

      {mode === 'changepassword' && (
        <>
          <input
            ref={newPasswordRef}
            type="password"
            name="new-password"
            autoComplete="new-password"
            placeholder="New password"
            style={inputStyle}
          />
          <input
            ref={confirmRef}
            type="password"
            name="confirm-new-password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            style={inputStyle}
          />
        </>
      )}

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

      {mode === 'unregister' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#FF5555', maxWidth: 220, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          {' '}I understand this will delete my account on this server permanently
        </label>
      )}

      {error && <div style={errorStyle}>{error}</div>}

      <div style={{ display: 'flex', gap: 5 }}>
        <Button
          type="submit"
          style={mode === 'unregister' ? { backgroundColor: '#AA0000' } : undefined}
        >
          {mode === 'login' ? 'Login' : mode === 'register' ? 'Register' : mode === 'changepassword' ? 'Change' : 'Unregister'}
        </Button>
        <Button type="button" onClick={handleCancel}>Cancel</Button>
      </div>
    </form>
  </Screen>
}
