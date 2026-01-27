import * as React from 'react'
import { ErrorBoundary } from '@zardoy/react-util'
import { showNotification } from '../react/NotificationProvider'
import { ClientModUiApi } from '../clientMods'

const injectUiPlaces = [
  'root',
  'button',
  'mainMenu',
  'mainMenuProvider',
  'chat',
  'chatProvider',
  'addServerOrConnect',
  'armorBar',
  'bossBarOverlay',
  'createWorld',
  'singleplayer',
  'deathScreen',
  'debugOverlay',
  'fullmap',
  'input',
  'notification',
  'optionsItems',
  'title',
  'slider',
  'serversList',
  'scoreboard',
  'select',
  'screen',
  'screenDirtBg',
  'appStatus',
  'appStatusProvider',
  'diveTransition',
] as const

export type InjectUiPlace = (typeof injectUiPlaces)[number]

const wrapWithErrorBoundary = (
  Component: React.FC<any>,
  props: any,
  index: number,
  place: InjectUiPlace
): React.ReactElement => {
  return (
    <ErrorBoundary
      key={index}
      renderError={(error) => {
        const componentName = Component.name || Component.displayName || 'Unknown'
        showNotification(
          `Registered component ${place} crashed: ${componentName}`,
          `Use console for more. ${error.message}`,
          true,
          undefined
        )
        return null
      }}
    >
      <Component {...props} />
    </ErrorBoundary>
  )
}

export const withInjectableUi = <P extends object>(
  Component: React.ComponentType<P>,
  place: InjectUiPlace
) => {
  const placeUppercaseFirst = place.charAt(0).toUpperCase() + place.slice(1)
  window.builtinOriginalComponents ??= {}
  window.builtinOriginalComponents[placeUppercaseFirst] = Component
  const WrappedComponent = (props: P) => {
    const components = Object.values((window.mcraft?.ui as ClientModUiApi)?.registeredReactWrappers?.[place] || {})

    // Start with the original component as the innermost
    let wrapped: React.ReactNode = <Component {...props} />

    // Wrap with registered components in reverse order
    // First registered component wraps last registered component, which wraps the original
    // e.g., if [A, B] are registered: A wraps B, B wraps Component
    for (let i = components.length - 1; i >= 0; i--) {
      const WrapperComponent = components[i]
      wrapped = wrapWithErrorBoundary(WrapperComponent, { ...props, children: wrapped }, i, place)
    }

    return <>{wrapped}</>
  }

  WrappedComponent.displayName = `withInjectableUi(${Component.displayName || Component.name || 'Component'}, ${place})`

  window.builtinComponents ??= {}
  window.builtinComponents[placeUppercaseFirst] = WrappedComponent

  return WrappedComponent
}
