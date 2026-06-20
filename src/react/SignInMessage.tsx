import { useState } from 'react'
import { useUtilsEffect } from '@zardoy/react-util'
import { QRCodeSVG } from 'qrcode.react'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import Screen from './Screen'
import Button from './Button'

export default ({
  code = 'ABCD-EFGH-IJKL-MNOP',
  loginLink = 'https://aka.ms/devicelogin',
  connectingServer = 'mc.example.comsdlfjsklfjsfjdskfjsj',
  expiresEnd = Date.now() + 1000 * 60 * 5,
  setSaveToken = (() => {}) as ((state: boolean) => void) | undefined,
  defaultSaveToken = true,
  onCancel = () => {},
  directLink = 'https://aka.ms/devicelogin'
}) => {
  if (connectingServer.length > 30) connectingServer = connectingServer.slice(0, 30) + '...'
  const [timeLeft, setTimeLeft] = useState(``)

  useUtilsEffect(({ interval }) => {
    interval(1000, () => {
      const timeLeft = Math.max(0, Math.ceil((expiresEnd - Date.now()) / 1000))
      const minutes = Math.floor(timeLeft / 60)
      const seconds = timeLeft % 60
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      if (timeLeft <= 0) setTimeLeft('Code expired!')
    })
  }, [])

  return (
    <Screen title="Microsoft Account Authentication" titleMarginTop={5}>
      <div
        style={{
          background: 'white',
          padding: '20px 18px',
          width: 300,
          maxHeight: 240,
          color: 'black'
          // borderRadius: 8,
        }}
      >
        <div
          style={{
            // fontFamily: 'monospace',
            fontSize: 18,
            padding: '5px 10px',
            paddingBottom: 1,
            backgroundColor: 'lightgray',
            textAlign: 'center',
            marginTop: -5,
            userSelect: 'all'
          }}
        >
          {code}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: 12
          }}
        >
          Waiting... <PixelartIcon iconName="clock" /> {timeLeft}
        </div>
        <div
          style={{
            fontSize: 12,
            marginTop: 10
          }}
        >
          To join a Minecraft server {connectingServer} using your Microsoft account, you need to visit{' '}
          <a
            href={directLink}
            style={{
              color: 'black',
              textDecoration: 'underline',
              fontWeight: 600
            }}
            target="_blank"
          >
            Direct Link
          </a>{' '}
          or{' '}
          <a
            href={loginLink}
            style={{
              color: 'black',
              textDecoration: 'underline',
              fontWeight: 600
            }}
            target="_blank"
          >
            {loginLink.replace(/(https?:\/\/)?(www\.)?/, '')}
          </a>{' '}
          and enter the code above.
        </div>
        <div
          style={{
            fontSize: 11,
            marginTop: 5,
            color: 'gray',
            display: 'flex',
            gap: 2
          }}
        >
          <div>
            <PixelartIcon iconName={pixelartIcons.alert} styles={{ display: 'inline-block' }} />
            Join only <b>vanilla servers</b>! This client is detectable and may result in a ban by anti-cheat plugins.
          </div>
          <QRCodeSVG size={40} value={directLink} style={{ display: 'block', flexShrink: 0 }} color="gray" />
        </div>
        {setSaveToken && (
          <label
            style={{
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 4
            }}
          >
            <input type="checkbox" defaultChecked={defaultSaveToken} onChange={e => setSaveToken(e.target.checked)} /> Save account token in this browser
          </label>
        )}
      </div>
      <Button
        style={{
          marginTop: -5
        }}
        onClick={onCancel}
      >
        Cancel
      </Button>
    </Screen>
  )
}
