import { renderToDom } from '@zardoy/react-util'
import { useEffect, useState } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { LeftTouchArea, RightTouchArea, useInterfaceState } from '@dimaka/interface'
import { css } from '@emotion/css'
import { Vec3 } from 'vec3'
import useLongPress from '../../src/react/useLongPress'
import { isMobile } from '../viewer/lib/simpleUtils'

export const playgroundGlobalUiState = proxy({
  scenes: [] as string[],
  selected: '',
  selectorOpened: false,
  actions: {} as Record<string, () => void>,
})

renderToDom(<Playground />, {
  strictMode: false,
  selector: '#react-root',
})

function Playground () {
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = /* css */ `
      .lil-gui {
        top: 60px !important;
        right: 0 !important;
      }
    `
    document.body.appendChild(style)
    return () => {
      style.remove()
    }
  }, [])

  return <div style={{
    fontFamily: 'monospace',
    color: 'white',
  }}>
    <Controls />
    <SceneSelector />
    <ActionsSelector />
  </div>
}

function SceneSelector () {
  const mobile = isMobile()
  const { scenes, selected } = useSnapshot(playgroundGlobalUiState)
  const [hidden, setHidden] = useState(false)
  const longPressEvents = useLongPress(() => {
    playgroundGlobalUiState.selectorOpened = true
  }, () => { })

  if (hidden) return null

  return <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'flex',
      alignItems: 'flex-start',
    }} {...longPressEvents}>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {scenes.map(scene => <div
        key={scene}
        style={{
          padding: mobile ? '5px' : '2px 5px',
          cursor: 'pointer',
          userSelect: 'none',
          background: scene === selected ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.6)',
          fontWeight: scene === selected ? 'bold' : 'normal',
        }}
        onClick={() => {
          const qs = new URLSearchParams(window.location.search)
          qs.set('scene', scene)
          location.search = qs.toString()
        }}
      >{scene}</div>)}
    </div>
    <div
      style={{
        padding: mobile ? '5px' : '2px 5px',
        cursor: 'pointer',
        userSelect: 'none',
        background: 'rgba(0, 0, 0, 0.6)',
        fontSize: '14px',
        lineHeight: '1',
      }}
      onClick={() => setHidden(true)}
    >×</div>
  </div>
}

const ActionsSelector = () => {
  const { actions, selectorOpened } = useSnapshot(playgroundGlobalUiState)

  if (!selectorOpened) return null
  return <div style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    fontSize: 24,
  }}>{Object.entries({
      ...actions,
      'Close' () {
        playgroundGlobalUiState.selectorOpened = false
      }
    }).map(([name, action]) => <div
      key={name}
      style={{
        padding: '2px 5px',
        cursor: 'pointer',
        userSelect: 'none',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={() => {
        action()
        playgroundGlobalUiState.selectorOpened = false
      }}
    >{name}</div>)}</div>
}

const Controls = () => {
  // todo setting
  const usingTouch = navigator.maxTouchPoints > 0

  useEffect(() => {
    window.addEventListener('touchstart', (e) => {
      e.preventDefault()
    })

    const pressedKeys = new Set<string>()
    useInterfaceState.setState({
      isFlying: false,
      uiCustomization: {
        touchButtonSize: 40,
      },
      updateCoord ([coord, state]) {
        const vec3 = new Vec3(0, 0, 0)
        vec3[coord] = state
        let key: string | undefined
        if (vec3.z < 0) key = 'KeyW'
        if (vec3.z > 0) key = 'KeyS'
        if (vec3.y > 0) key = 'Space'
        if (vec3.y < 0) key = 'ShiftLeft'
        if (vec3.x < 0) key = 'KeyA'
        if (vec3.x > 0) key = 'KeyD'
        if (key) {
          if (!pressedKeys.has(key)) {
            pressedKeys.add(key)
            window.dispatchEvent(new KeyboardEvent('keydown', { code: key }))
          }
        }
        for (const k of pressedKeys) {
          if (k !== key) {
            window.dispatchEvent(new KeyboardEvent('keyup', { code: k }))
            pressedKeys.delete(k)
          }
        }
      }
    })
  }, [])

  if (!usingTouch) return null
  return (
    <div
      style={{ zIndex: 8 }}
      className={css`
        position: fixed;
        inset: 0;
        height: 100%;
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: flex-end;
        pointer-events: none;
        touch-action: none;
        & > div {
            pointer-events: auto;
        }
    `}
    >
      <LeftTouchArea />
      <div />
      <RightTouchArea />
    </div>
  )
}
