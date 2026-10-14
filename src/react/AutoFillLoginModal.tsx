import { proxy, useSnapshot } from 'valtio'
import { useCallback, useEffect, useRef, useState } from 'react'
import { hideCurrentModal, showModal } from '../globalState'
import { useAppScale } from '../scaleInterface'
import { buildAuthCommand, monitorLoginAttempt } from '../core/authModal'
import Screen from './Screen'
import { useIsModalActive } from './utilsApp'
import { isSafari } from './utils'
import Button from './Button'
import { reconnectReload } from './AppStatusProvider'

type Mode = 'login' | 'register' | 'changepassword' | 'unregister'
type IframeAuthMode = 'register' | 'changepassword'

/** When false, register/changepassword use native host inputs (no iframe overlay). */
const USE_IFRAME = false

export type AutoFillLoginResult = {
  password: string
  newPassword?: string
  commandSent?: boolean
}

const state = proxy({
  mode: 'login' as Mode,
  serverIp: '',
  username: '',
  prefilledPassword: '' as string | undefined,
})

let resolve: ((value: AutoFillLoginResult | undefined) => void) | undefined

export const showAutoFillLoginModal = async (params: {
  mode: Mode
  serverIp: string
  username: string
  prefilledPassword?: string
}): Promise<AutoFillLoginResult | undefined> => {
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

const IDENTIFIER_HINT = 'Used as identifier in your password manager'

const infoStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#A0A0A0',
  textAlign: 'center',
  maxWidth: 220,
}

const decorativeCaptionStyle: React.CSSProperties = {
  ...captionStyle,
  color: 'transparent',
  pointerEvents: 'none',
}

const errorStyle: React.CSSProperties = {
  fontSize: 9,
  color: '#FF5555',
  textAlign: 'center',
  maxWidth: 220,
}

const overlayIframeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  border: 'none',
  background: 'transparent',
  zIndex: 1,
}

const decorativeInputStyle: React.CSSProperties = {
  ...inputStyle,
  pointerEvents: 'none',
  color: 'transparent',
  background: 'transparent',
  border: '1px solid transparent',
}

const INPUT_BORDER = '1px solid #A0A0A0'
const INPUT_INNER_BG = 'rgba(0, 0, 0, 0.5)'

const escapeHtmlAttr = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
}

const INPUT_FONT_SIZE = 10
const INPUT_PAD_V = 4
const INPUT_PAD_H = 6
const BUTTON_PAD_V = 1
const BUTTON_PAD_H = 6

interface OverlayBox {
  top: number
  left: number
  width: number
  height: number
}

interface IframeFormLayout {
  iframeWidth: number
  iframeHeight: number
  fields: OverlayBox[]
  caption: OverlayBox
  button: OverlayBox
}

interface IframeFieldSpec {
  name: string
  type: 'text' | 'password'
  autoComplete: string
  value?: string
  placeholder?: string
}

const IFRAME_SUBMIT_MSG: Record<IframeAuthMode, string> = {
  register: 'auto-fill-register-submit',
  changepassword: 'auto-fill-changepassword-submit',
}

const ERROR_SLOT_HEIGHT = 16

const measureIframeFormLayout = (
  root: HTMLElement,
  fieldEls: HTMLElement[],
  captionEl: HTMLElement,
  buttonEl: HTMLElement,
  scale = 1,
): IframeFormLayout => {
  const rootRect = root.getBoundingClientRect()
  const buttonRect = buttonEl.getBoundingClientRect()

  const rel = (rect: DOMRect): OverlayBox => ({
    top: (rect.top - rootRect.top) / scale,
    left: (rect.left - rootRect.left) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  })

  return {
    iframeWidth: rootRect.width / scale,
    iframeHeight: (buttonRect.bottom - rootRect.top) / scale + ERROR_SLOT_HEIGHT,
    fields: fieldEls.map(el => rel(el.getBoundingClientRect())),
    caption: rel(captionEl.getBoundingClientRect()),
    button: rel(buttonRect),
  }
}

const iframeFieldSpecs = (
  mode: IframeAuthMode,
  identifier: string,
  prefilledPassword: string,
): IframeFieldSpec[] => {
  if (mode === 'register') {
    return [
      { name: 'username', type: 'text', autoComplete: 'username', value: identifier },
      { name: 'password', type: 'password', autoComplete: 'new-password', value: prefilledPassword, placeholder: 'Password' },
      { name: 'password-confirm', type: 'password', autoComplete: 'new-password', placeholder: 'Confirm password' },
    ]
  }
  return [
    { name: 'username', type: 'text', autoComplete: 'username', value: identifier },
    { name: 'old-password', type: 'password', autoComplete: 'current-password', value: prefilledPassword, placeholder: 'Old password' },
    { name: 'new-password', type: 'password', autoComplete: 'new-password', placeholder: 'New password' },
    { name: 'confirm-new-password', type: 'password', autoComplete: 'new-password', placeholder: 'Confirm new password' },
  ]
}

const buildIframeValidationScript = (mode: IframeAuthMode, postMessageType: string): string => {
  if (mode === 'register') {
    return `
      function handleSubmit(e) {
        var err = document.getElementById('iframe-error');
        var pw = document.querySelector('[name=password]').value.trim();
        var cf = document.querySelector('[name=password-confirm]').value.trim();
        err.textContent = '';
        if (!pw) { err.textContent = 'Password is required'; e.preventDefault(); return; }
        if (pw !== cf) { err.textContent = 'Passwords do not match'; e.preventDefault(); return; }
        window.parent.postMessage({ type: '${postMessageType}', password: pw }, '*');
      }
    `
  }
  return `
    function handleSubmit(e) {
      var err = document.getElementById('iframe-error');
      var oldPw = document.querySelector('[name=old-password]').value.trim();
      var newPw = document.querySelector('[name=new-password]').value.trim();
      var cf = document.querySelector('[name=confirm-new-password]').value.trim();
      err.textContent = '';
      if (!oldPw) { err.textContent = 'Old password is required'; e.preventDefault(); return; }
      if (!newPw) { err.textContent = 'New password is required'; e.preventDefault(); return; }
      if (newPw !== cf) { err.textContent = 'New passwords do not match'; e.preventDefault(); return; }
      if (oldPw === newPw) { err.textContent = 'New password must differ from old password'; e.preventDefault(); return; }
      window.parent.postMessage({ type: '${postMessageType}', password: oldPw, newPassword: newPw }, '*');
    }
  `
}

const mountIframeAuthForm = (
  iframe: HTMLIFrameElement,
  layout: IframeFormLayout,
  mode: IframeAuthMode,
  identifier: string,
  prefilledPassword: string,
  submitLabel: string,
) => {
  iframe.src = 'about:blank'
  iframe.style.width = `${layout.iframeWidth}px`
  iframe.style.height = `${layout.iframeHeight}px`

  const fieldStyle = (box: OverlayBox) => {
    return `position:absolute;top:${box.top}px;left:${box.left}px;width:${box.width}px;height:${box.height}px`
  }

  const specs = iframeFieldSpecs(mode, identifier, prefilledPassword)
  const inputsHtml = specs.map((spec, i) => {
    const valueAttr = spec.value === undefined ? '' : `value="${escapeHtmlAttr(spec.value)}"`
    const placeholderAttr = spec.placeholder ? `placeholder="${escapeHtmlAttr(spec.placeholder)}"` : ''
    return `<input type="${spec.type}" name="${spec.name}" autocomplete="${spec.autoComplete}" ${valueAttr} ${placeholderAttr} style="${fieldStyle(layout.fields[i])}" />`
  }).join('\n        ')

  const { button: btn, caption } = layout
  const captionStyleInline = `position:absolute;top:${caption.top}px;left:${caption.left}px;width:${caption.width}px;height:${caption.height}px;box-sizing:border-box;margin:0;font-family:minecraft,mojangles,monospace;font-size:7px;color:#A0A0A0;text-align:center;display:flex;align-items:center;justify-content:center;line-height:1.2;padding-top:7px;`
  const rootBg = isSafari ? '#000' : 'transparent'
  const rootBgImportant = isSafari ? '#000' : 'none'
  const postMessageType = IFRAME_SUBMIT_MSG[mode]
  const validationScript = buildIframeValidationScript(mode, postMessageType)

  const html = /* html */ `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="color-scheme" content="light dark">
      <style>
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: ${rootBg} !important;
          background: ${rootBgImportant} !important;
        }
        form {
          position: relative;
          margin: 0;
          width: ${layout.iframeWidth}px;
          height: ${layout.iframeHeight}px;
        }
        input {
          box-sizing: border-box;
          margin: 0;
          outline: none;
          color: white;
          font-family: minecraft, mojangles, monospace;
          font-size: ${INPUT_FONT_SIZE}px;
          padding: ${INPUT_PAD_V}px ${INPUT_PAD_H}px;
          border: ${INPUT_BORDER};
          background: ${INPUT_INNER_BG};
          background-clip: padding-box;
        }
        button {
          position: absolute;
          top: ${btn.top}px;
          left: ${btn.left}px;
          width: ${btn.width}px;
          height: ${btn.height}px;
          box-sizing: border-box;
          margin: 0;
          cursor: pointer;
          font-family: minecraft, mojangles, monospace;
          font-size: ${INPUT_FONT_SIZE}px;
          color: white;
          background: rgba(0, 0, 0, 0.82);
          border: 1px solid #A0A0A0;
          padding: ${BUTTON_PAD_V}px ${BUTTON_PAD_H}px;
          text-transform: uppercase;
        }
        #identifier-hint {
          pointer-events: none;
        }
        #iframe-error {
          position: absolute;
          top: ${btn.top + btn.height + 4}px;
          left: 0;
          width: ${layout.iframeWidth}px;
          margin: 0;
          font-family: minecraft, mojangles, monospace;
          font-size: 9px;
          color: #FF5555;
          text-align: center;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <form onsubmit="handleSubmit(event)">
        ${inputsHtml}
        <div id="identifier-hint" style="${captionStyleInline}">${IDENTIFIER_HINT}</div>
        <button type="submit">${submitLabel}</button>
        <div id="iframe-error"></div>
      </form>
    </body>
    </html>
  `.trimStart()

  const doc = iframe.contentDocument
  if (!doc) return
  doc.open()
  doc.write(html)
  const script = doc.createElement('script')
  script.textContent = validationScript
  doc.head.appendChild(script)
  doc.close()
}

const verticalButtonsStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  width: inputStyle.width,
}

const isIframeAuthMode = (mode: Mode): mode is IframeAuthMode => {
  return mode === 'register' || mode === 'changepassword'
}

globalThis.debugAutoFillLogin = () => {
  void showAutoFillLoginModal({
    mode: 'register',
    serverIp: 'localhost',
    username: 'test',
    prefilledPassword: '',
  })
}

const FORM_ACTION = 'https://mcraft-download-hack.vercel.app'

export default () => {
  const appScale = useAppScale()
  const { mode, serverIp, username, prefilledPassword } = useSnapshot(state)
  const isModalActive = useIsModalActive('auto-fill-login')
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const newPasswordRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const submitButtonRef = useRef<HTMLDivElement>(null)
  const overlayRootRef = useRef<HTMLDivElement>(null)
  const overlayIframeRef = useRef<HTMLIFrameElement>(null)
  const [error, setError] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [awaitingBrowserSave, setAwaitingBrowserSave] = useState(false)
  const pendingResultRef = useRef<AutoFillLoginResult | undefined>(undefined)

  const identifier = `${serverIp}-${username}`
  // eslint-disable-next-line sonarjs/no-redundant-boolean
  const usesSafariSaveStep = isSafari && (mode === 'register' || mode === 'changepassword') && false

  const finishSubmit = (result: AutoFillLoginResult) => {
    setError('')
    resolve?.(result)
    resolve = undefined
    hideCurrentModal()
  }

  const sendCommandFromModal = (result: AutoFillLoginResult): boolean => {
    const bot = window.bot as { chat: (message: string) => void } | undefined
    const cmd = buildAuthCommand(mode, result.password, result.newPassword)
    if (!bot || !cmd) return false
    try { bot.chat(cmd) } catch {}
    monitorLoginAttempt({
      password: result.password,
      newPassword: result.newPassword,
      mode,
      source: 'modal',
      serverIp,
      username,
      preSaved: false,
    })
    return true
  }

  const beginSafariSaveStep = (result: AutoFillLoginResult) => {
    if (!sendCommandFromModal(result)) {
      setError('Could not send command')
      return
    }
    pendingResultRef.current = result
    setError('')
    setAwaitingBrowserSave(true)
  }

  const handleSkipSave = () => {
    const pending = pendingResultRef.current
    if (!pending) {
      handleCancel()
      return
    }
    finishSubmit({ ...pending, commandSent: true })
  }

  const mountIframeForm = useCallback((iframeMode: IframeAuthMode) => {
    const root = overlayRootRef.current
    const iframe = overlayIframeRef.current
    const buttonSlot = submitButtonRef.current
    const captionEl = captionRef.current
    if (!root || !iframe || !buttonSlot || !captionEl) return

    const fieldEls = iframeMode === 'register'
      ? [usernameRef.current, passwordRef.current, confirmRef.current]
      : [usernameRef.current, passwordRef.current, newPasswordRef.current, confirmRef.current]

    if (fieldEls.some(el => !el)) return

    const layout = measureIframeFormLayout(root, fieldEls as HTMLElement[], captionEl, buttonSlot, appScale)
    const submitLabel = iframeMode === 'register' ? 'Register' : 'Change'
    mountIframeAuthForm(iframe, layout, iframeMode, identifier, prefilledPassword ?? '', submitLabel)
  }, [identifier, prefilledPassword, appScale])

  useEffect(() => {
    if (!isModalActive || !USE_IFRAME || !isIframeAuthMode(mode)) return

    setError('')
    setConfirmChecked(false)
    setAwaitingBrowserSave(false)
    pendingResultRef.current = undefined
    const frame = requestAnimationFrame(() => mountIframeForm(mode))

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === IFRAME_SUBMIT_MSG.register) {
        finishSubmit({ password: event.data.password })
        return
      }
      if (event.data?.type === IFRAME_SUBMIT_MSG.changepassword) {
        finishSubmit({ password: event.data.password, newPassword: event.data.newPassword })
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('message', onMessage)
    }
  }, [isModalActive, mode, mountIframeForm])

  useEffect(() => {
    if (!isModalActive || (USE_IFRAME && isIframeAuthMode(mode))) return

    setError('')
    setConfirmChecked(false)
    setAwaitingBrowserSave(false)
    pendingResultRef.current = undefined
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
      usernameRef.current.value = identifier
    }
  }, [isModalActive, prefilledPassword, serverIp, username, mode, identifier])

  if (!isModalActive) return null

  const title = mode === 'login'
    ? 'Auto-fill server access'
    : mode === 'register'
      ? 'Auto-fill server registration'
      : mode === 'changepassword'
        ? 'Auto-fill password change'
        : 'Auto-fill account deletion'

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (awaitingBrowserSave && usesSafariSaveStep) {
      event.preventDefault()
      bot.end()
      reconnectReload()
      return
    }
    event.preventDefault()

    if (mode === 'unregister') {
      const password = (passwordRef.current?.value ?? '').trim()
      if (!password) {
        setError('Password is required')
        return
      }
      if (!confirmChecked) {
        setError('You must confirm account deletion')
        return
      }
      finishSubmit({ password })
      return
    }

    if (mode === 'register') {
      const password = (passwordRef.current?.value ?? '').trim()
      const confirm = (confirmRef.current?.value ?? '').trim()
      if (!password) {
        setError('Password is required')
        return
      }
      if (password !== confirm) {
        setError('Passwords do not match')
        return
      }
      if (usesSafariSaveStep) {
        beginSafariSaveStep({ password })
        return
      }
      finishSubmit({ password })
      return
    }

    if (mode === 'changepassword') {
      const oldPassword = (passwordRef.current?.value ?? '').trim()
      const newPassword = (newPasswordRef.current?.value ?? '').trim()
      const confirm = (confirmRef.current?.value ?? '').trim()
      if (!oldPassword) {
        setError('Old password is required')
        return
      }
      if (!newPassword) {
        setError('New password is required')
        return
      }
      if (newPassword !== confirm) {
        setError('New passwords do not match')
        return
      }
      if (oldPassword === newPassword) {
        setError('New password must differ from old password')
        return
      }
      if (usesSafariSaveStep) {
        beginSafariSaveStep({ password: oldPassword, newPassword })
        return
      }
      finishSubmit({ password: oldPassword, newPassword })
      return
    }

    const password = (passwordRef.current?.value ?? '').trim()
    if (!password) {
      setError('Password is required')
      return
    }
    finishSubmit({ password })
  }

  const handleCancel = () => {
    if (awaitingBrowserSave) {
      handleSkipSave()
      return
    }
    setError('')
    resolve?.(undefined)
    resolve = undefined
    hideCurrentModal()
  }

  const renderIframeAuthShell = (iframeMode: IframeAuthMode) => (
    <Screen title={title} backdrop>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'center' }}>
        <div
          ref={overlayRootRef}
          style={{ position: 'relative', width: inputStyle.width }}
        >
          <input
            ref={usernameRef}
            type="text"
            name="username"
            tabIndex={-1}
            readOnly
            defaultValue=""
            style={decorativeInputStyle}
          />
          <div ref={captionRef} style={decorativeCaptionStyle}>{IDENTIFIER_HINT}</div>
          {iframeMode === 'register' ? (
            <>
              <input
                ref={passwordRef}
                type="password"
                name="password"
                tabIndex={-1}
                readOnly
                defaultValue=""
                style={{ ...decorativeInputStyle, marginTop: 9 }}
              />
              <input
                ref={confirmRef}
                type="password"
                name="password-confirm"
                tabIndex={-1}
                readOnly
                defaultValue=""
                style={{ ...decorativeInputStyle, marginTop: 9 }}
              />
            </>
          ) : (
            <>
              <input
                ref={passwordRef}
                type="password"
                name="old-password"
                tabIndex={-1}
                readOnly
                defaultValue=""
                style={{ ...decorativeInputStyle, marginTop: 9 }}
              />
              <input
                ref={newPasswordRef}
                type="password"
                name="new-password"
                tabIndex={-1}
                readOnly
                defaultValue=""
                style={{ ...decorativeInputStyle, marginTop: 9 }}
              />
              <input
                ref={confirmRef}
                type="password"
                name="confirm-new-password"
                tabIndex={-1}
                readOnly
                defaultValue=""
                style={{ ...decorativeInputStyle, marginTop: 9 }}
              />
            </>
          )}
          <div
            ref={submitButtonRef}
            aria-hidden
            style={{ width: '100%', height: 24, marginTop: 9 }}
          />
          <iframe
            src="about:blank"
            ref={overlayIframeRef}
            title={iframeMode === 'register' ? 'Register form' : 'Change password form'}
            style={overlayIframeStyle}
          />
        </div>

        <div style={{ ...verticalButtonsStyle, marginTop: ERROR_SLOT_HEIGHT - 4 }}>
          <Button type="button" onClick={handleCancel}>Cancel</Button>
        </div>
      </div>
    </Screen>
  )

  if (mode === 'login') {
    return <Screen title={title} backdrop>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'center' }}
        action={FORM_ACTION}
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
          <div style={captionStyle}>{IDENTIFIER_HINT}</div>
        </div>
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
        {error && <div style={errorStyle}>{error}</div>}
        <div style={verticalButtonsStyle}>
          <Button type="submit">Login</Button>
          <Button type="button" onClick={handleCancel}>Cancel</Button>
        </div>
      </form>
    </Screen>
  }

  if ((mode === 'register' || mode === 'changepassword') && USE_IFRAME) {
    return renderIframeAuthShell(mode)
  }

  if (mode === 'register' || mode === 'changepassword') {
    const firstSubmitLabel = mode === 'register' ? 'Register' : 'Change'
    const submitLabel = awaitingBrowserSave ? 'Save to browser' : firstSubmitLabel
    const secondaryLabel = awaitingBrowserSave ? 'Skip save' : 'Cancel'
    return <Screen title={title} backdrop>
      <form
        action={FORM_ACTION}
        method="post"
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
          <div style={captionStyle}>{IDENTIFIER_HINT}</div>
        </div>
        {mode === 'register' ? (
          <>
            <input
              ref={passwordRef}
              type="password"
              name="password"
              autoComplete="new-password"
              autoFocus={!awaitingBrowserSave}
              defaultValue={prefilledPassword}
              placeholder="Password"
              style={inputStyle}
            />
            {!awaitingBrowserSave && (
              <input
                ref={confirmRef}
                type="password"
                name="password-confirm"
                autoComplete="new-password"
                placeholder="Confirm password"
                style={inputStyle}
              />
            )}
          </>
        ) : (
          <>
            {!awaitingBrowserSave && (
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
            <input
              ref={awaitingBrowserSave ? passwordRef : newPasswordRef}
              type="password"
              name={awaitingBrowserSave ? 'password' : 'new-password'}
              autoComplete="new-password"
              autoFocus={awaitingBrowserSave}
              defaultValue={awaitingBrowserSave ? pendingResultRef.current?.newPassword : undefined}
              placeholder={awaitingBrowserSave ? 'Password' : 'New password'}
              style={inputStyle}
            />
            {!awaitingBrowserSave && (
              <input
                ref={confirmRef}
                type="password"
                name="confirm-new-password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                style={inputStyle}
              />
            )}
          </>
        )}
        {awaitingBrowserSave && (
          <div style={infoStyle}>Command sent — save password in browser?</div>
        )}
        {error && <div style={errorStyle}>{error}</div>}
        <div style={verticalButtonsStyle}>
          <Button type="submit">{submitLabel}</Button>
          <Button type="button" onClick={awaitingBrowserSave ? handleSkipSave : handleCancel}>{secondaryLabel}</Button>
        </div>
      </form>
    </Screen>
  }

  return <Screen title={title} backdrop>
    <form
      action={FORM_ACTION}
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
        <div style={captionStyle}>{IDENTIFIER_HINT}</div>
      </div>

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

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#FF5555', maxWidth: 220, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={confirmChecked}
          onChange={(e) => setConfirmChecked(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        {' '}I understand this will delete my account on this server permanently
      </label>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={{ display: 'flex', gap: 5 }}>
        <Button type="submit" style={{ backgroundColor: '#AA0000' }}>Unregister</Button>
        <Button type="button" onClick={handleCancel}>Cancel</Button>
      </div>
    </form>
  </Screen>
}
