import { proxy, useSnapshot } from 'valtio'
import { useEffect, useMemo, useState } from 'react'
import PixelartIcon, { pixelartIcons } from '../react/PixelartIcon'
import { useIsModalActive } from '../react/utilsApp'
import { hideModal, showModal } from '../globalState'
import { iframeState } from '../core/iframeChannels'
import { lastConnectOptions } from '../appStatus'
import { useAppScale } from '../scaleInterface'
import { appStorage } from './appStorageProvider'
import Button from './Button'
import './IframeModal.css'

const getDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    // If URL parsing fails, try to extract domain manually
    const match = /^(?:https?:\/\/)?([^/]+)/.exec(url)
    return match ? match[1] : url
  }
}

const getConsentKey = (serverIp: string, domain: string): string => {
  return `${serverIp}:${domain}`
}

const checkConsent = (serverIp: string, domain: string): boolean => {
  const consentKey = getConsentKey(serverIp, domain)
  return appStorage.iframeConsents?.includes(consentKey) ?? false
}

const addConsent = (serverIp: string, domain: string) => {
  const consentKey = getConsentKey(serverIp, domain)
  if (!appStorage.iframeConsents) {
    appStorage.iframeConsents = []
  }
  if (!appStorage.iframeConsents.includes(consentKey)) {
    appStorage.iframeConsents.push(consentKey)
  }
}

export default () => {
  const { url, title, id, metadata } = useSnapshot(iframeState)
  const isModalActive = useIsModalActive('iframe-modal')
  const serverIp = lastConnectOptions.value?.server ?? ''
  const domain = useMemo(() => (url ? getDomainFromUrl(url) : ''), [url])
  const [showConsentScreen, setShowConsentScreen] = useState(true)
  const scale = useAppScale()

  useEffect(() => {
    if (id && url && !isModalActive) {
      showModal({ reactType: 'iframe-modal' })
      const consent = checkConsent(serverIp, domain)
      setShowConsentScreen(!consent)
    }
    if (!id && isModalActive) {
      hideModal()
    }
  }, [id, url])


  const handleConsent = () => {
    if (!domain) return
    addConsent(serverIp ?? '', domain)
    setShowConsentScreen(false)
  }

  if (!isModalActive) return null

  return <div className="iframe-modal-container">
    <div className="iframe-modal-close">
      <PixelartIcon
        iconName={pixelartIcons.close}
        width={26}
        onClick={() => {
          hideModal()
        }}
      />
    </div>
    {title && (
      <div className="iframe-modal-title">
        {title}
      </div>
    )}
    <div className="iframe-modal-wrapper">
      {showConsentScreen ? (
        <div className="iframe-consent-screen">
          <div className="iframe-consent-content" style={{ transform: `scale(${scale})` }}>
            <div className="iframe-consent-message">
              Allow <strong>{serverIp}</strong> to open for you <strong>{domain}</strong>?
            </div>
            <Button
              label="Open Page"
              onClick={handleConsent}
              className="iframe-consent-button"
            />
          </div>
        </div>
      ) : (
        <iframe
          src={url}
          className="iframe-modal-iframe"
          allow="*"
          allowFullScreen
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads allow-modals allow-orientation-lock allow-pointer-lock allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
        />
      )}
    </div>
  </div>
}
