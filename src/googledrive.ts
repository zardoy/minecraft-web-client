import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { proxy, ref, subscribe } from 'valtio'
import React from 'react'
import { loadScript } from 'minecraft-renderer/src/lib/utils'
import { loadGoogleDriveApi, loadInMemorySave } from './react/SingleplayerProvider'
import { setLoadingScreenStatus } from './appStatus'
import { showOptionsModal } from './react/SelectOption'
import { appQueryParams } from './appParams'

const CLIENT_ID = '137156026346-igv2gkjsj2hlid92rs3q7cjjnc77s132.apps.googleusercontent.com'
// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.install'
export const APP_ID = CLIENT_ID.split('-')[0]

export const GoogleDriveProvider = ({ children }) => {
  return React.createElement(GoogleOAuthProvider, { clientId: CLIENT_ID } as any, children)
  // return <GoogleOAuthProvider clientId={CLIENT_ID}><Root /></GoogleOAuthProvider>
}

export const isGoogleDriveAvailable = () => {
  return !!CLIENT_ID
}

export const useGoogleLogIn = () => {
  const login = useGoogleLogin({
    onSuccess (tokenResponse) {
      localStorage.hasEverLoggedIn = true
      googleProviderState.accessToken = tokenResponse.access_token
      googleProviderState.expiresIn = ref(new Date(Date.now() + tokenResponse.expires_in * 1000))
      googleProviderState.hasEverLoggedIn = true
    },
    // prompt: hasEverLoggedIn ? 'none' : 'consent',
    scope: SCOPES,
    flow: 'implicit',
    onError (error) {
      const accessDenied = error.error === 'access_denied' || error.error === 'invalid_scope' || (error as any).error_subtype === 'access_denied'
      if (accessDenied) {
        googleProviderState.hasEverLoggedIn = false
      }
    }
  })
  return () => login({
    prompt: googleProviderState.hasEverLoggedIn ? 'none' : 'consent'
  })
}

export const possiblyHandleStateVariable = async () => {
  const stateParam = appQueryParams.state
  if (!stateParam) return
  setLoadingScreenStatus('Opening world in read only mode, waiting for login...')
  await loadGoogleDriveApi()
  await loadScript('https://accounts.google.com/gsi/client')
  const parsed = JSON.parse(stateParam) as {
    ids: [string]
    action: 'open'
    userId: string
  }
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    async callback (response) {
      if (response.error) {
        setLoadingScreenStatus('Error: ' + response.error, true)
        googleProviderState.hasEverLoggedIn = false
        return
      }
      setLoadingScreenStatus('Opening world in read only mode...')
      googleProviderState.accessToken = response.access_token
      // await mountGoogleDriveFolder(true, parsed.ids[0])
      await loadInMemorySave('/google')
    }
  })
  const choice = await showOptionsModal('Select an action...', ['Login'])
  if (choice === 'Login') {
    tokenClient.requestAccessToken({
      prompt: googleProviderState.hasEverLoggedIn ? '' : 'consent',
    })
  } else {
    window.close()
  }
}

export const googleProviderState = proxy({
  accessToken: (localStorage.saveAccessToken ? localStorage.accessToken : null) as string | null,
  hasEverLoggedIn: !!(localStorage.hasEverLoggedIn),
  isReady: false,
  expiresIn: localStorage.saveAccessToken ? ref(new Date(Date.now() + 1000 * 60 * 60)) : null,
  readonlyMode: localStorage.googleReadonlyMode ? localStorage.googleReadonlyMode === 'true' : true,
  lastSelectedFolder: (localStorage.lastSelectedFolder ? JSON.parse(localStorage.lastSelectedFolder) : null) as {
    id: string
    name: string
  } | null
})

subscribe(googleProviderState, () => {
  localStorage.googleReadonlyMode = googleProviderState.readonlyMode
  localStorage.lastSelectedFolder = googleProviderState.lastSelectedFolder ? JSON.stringify(googleProviderState.lastSelectedFolder) : null
  if (googleProviderState.hasEverLoggedIn) {
    localStorage.hasEverLoggedIn = true
  } else {
    delete localStorage.hasEverLoggedIn
  }

  if (localStorage.saveAccessToken && googleProviderState) {
    // For testing only
    localStorage.accessToken = googleProviderState.accessToken || null
  } else {
    delete localStorage.accessToken
  }
})
