import React, { useEffect } from 'react'
import { LeftTouchArea, RightTouchArea, useInterfaceState } from '@dimaka/interface'
import { css } from '@emotion/css'
import { renderToDom } from '@zardoy/react-util'
import { Vec3 } from 'vec3'
import * as THREE from 'three'
import { Viewer } from '../viewer/lib/viewer'

declare const viewer: Viewer
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

export const renderPlayground = () => {
  renderToDom(<Controls />, {
    // selector: 'body',
  })
}
