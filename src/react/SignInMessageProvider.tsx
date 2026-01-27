import { proxy, ref, useSnapshot } from 'valtio'
import { lastConnectOptions } from '../appStatus'
import SignInMessage from './SignInMessage'
import { useIsModalActive } from './utilsApp'

export const signInMessageState = proxy({
  code: '',
  link: '',
  expiresOn: 0,
  shouldSaveToken: true,
  abortController: ref(new AbortController()),
})

export default () => {
  const { code, expiresOn, link, shouldSaveToken } = useSnapshot(signInMessageState)
  const signInTestModal = useIsModalActive('sign-in-test')

  if (!code && !signInTestModal) return null

  return <SignInMessage
    code={code}
    expiresEnd={expiresOn}
    loginLink={link}
    defaultSaveToken={shouldSaveToken}
    setSaveToken={(state) => {
      signInMessageState.shouldSaveToken = state
    }}
    connectingServer={lastConnectOptions.value?.server ?? ''}
    onCancel={() => {
      signInMessageState.abortController.abort()
    }}
    directLink={`http://microsoft.com/link?otc=${code}`}
  />
}
