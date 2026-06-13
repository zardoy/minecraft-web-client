import { WorldRendererCommon } from 'minecraft-renderer/src/lib/worldrendererCommon'
import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { options } from '../optionsStorage'
import Screen from './Screen'
import Button from './Button'
import Slider from './Slider'
import styles from './rendererDebugMenu.module.css'

export default () => {
  const worldRenderer = window.world as WorldRendererCommon | undefined
  return worldRenderer ? <RendererDebugMenu worldRenderer={worldRenderer} /> : null
}

const RendererDebugMenu = ({ worldRenderer }: { worldRenderer: WorldRendererCommon }) => {
  const { reactiveDebugParams } = worldRenderer
  const { chunksRenderAboveEnabled, chunksRenderBelowEnabled, chunksRenderDistanceEnabled, chunksRenderAboveOverride, chunksRenderBelowOverride, chunksRenderDistanceOverride, stopRendering, disableEntities } = useSnapshot(reactiveDebugParams)

  const { rendererPerfDebugOverlay } = useSnapshot(options)

  // Helper to round values to nearest step
  const roundToStep = (value: number, step: number) => Math.round(value / step) * step

  if (!rendererPerfDebugOverlay) return null

  return <div className={styles.container}>
    <div className={styles.column}>
      <h3>Rendering Controls</h3>
      <Button
        label={stopRendering ? 'Start Rendering' : 'Stop Rendering'}
        onClick={() => { reactiveDebugParams.stopRendering = !reactiveDebugParams.stopRendering }}
        overlayColor={stopRendering ? 'red' : undefined}
      />
      <Button
        label={disableEntities ? 'Enable Entities' : 'Disable Entities'}
        onClick={() => { reactiveDebugParams.disableEntities = !reactiveDebugParams.disableEntities }}
        overlayColor={disableEntities ? 'red' : undefined}
      />
    </div>

    <div className={styles.column}>
      <h3>Chunks Render Settings</h3>
      <div className={styles.sliderGroup}>
        <Button
          label={chunksRenderAboveEnabled ? 'Disable Above Override' : 'Enable Above Override'}
          onClick={() => {
            const newState = !chunksRenderAboveEnabled
            reactiveDebugParams.chunksRenderAboveEnabled = newState
            if (newState) { reactiveDebugParams.chunksRenderAboveOverride = 0 } else { reactiveDebugParams.chunksRenderAboveOverride = undefined }
          }}
        />
        <Slider
          label="Chunks Above"
          min={0}
          max={256}
          value={chunksRenderAboveOverride ?? 0}
          style={{ width: '100%', }}
          updateValue={(value) => {
            const roundedValue = roundToStep(value, 16)
            reactiveDebugParams.chunksRenderAboveOverride = roundedValue
          }}
          disabledReason={chunksRenderAboveEnabled ? undefined : 'Override not enabled'}
          unit=""
          valueDisplay={roundToStep(reactiveDebugParams.chunksRenderAboveOverride ?? 0, 16)}
        />
      </div>

      <div className={styles.sliderGroup}>
        <Button
          label={chunksRenderBelowEnabled ? 'Disable Below Override' : 'Enable Below Override'}
          onClick={() => {
            const newState = !chunksRenderBelowEnabled
            reactiveDebugParams.chunksRenderBelowEnabled = newState
            if (newState) { reactiveDebugParams.chunksRenderBelowOverride = 0 } else { reactiveDebugParams.chunksRenderBelowOverride = undefined }
          }}
        />
        <Slider
          label="Chunks Below"
          min={0}
          max={256}
          style={{ width: '100%', }}
          value={chunksRenderBelowOverride ?? 0}
          updateValue={(value) => {
            const roundedValue = roundToStep(value, 16)
            reactiveDebugParams.chunksRenderBelowOverride = roundedValue
          }}
          disabledReason={chunksRenderBelowEnabled ? undefined : 'Override not enabled'}
          unit=""
          valueDisplay={roundToStep(reactiveDebugParams.chunksRenderBelowOverride ?? 0, 16)}
        />
      </div>

      {/* <div className={styles.sliderGroup}>
        <Button
          label={chunksRenderDistanceEnabled ? 'Disable Distance Override' : 'Enable Distance Override'}
          onClick={() => {
            const newState = !chunksRenderDistanceEnabled
            reactiveDebugParams.chunksRenderDistanceEnabled = newState
            if (newState) { reactiveDebugParams.chunksRenderDistanceOverride = 8 } else { reactiveDebugParams.chunksRenderDistanceOverride = undefined }
          }}
        />
        <Slider
          label="Render Distance"
          min={1}
          max={32}
          style={{ width: '100%', }}
          value={chunksRenderDistanceOverride ?? 8}
          updateValue={(value) => {
            const roundedValue = Math.round(value)
            reactiveDebugParams.chunksRenderDistanceOverride = roundedValue
          }}
          disabledReason={chunksRenderDistanceEnabled ? undefined : 'Override not enabled'}
          unit=""
          valueDisplay={Math.round(reactiveDebugParams.chunksRenderDistanceOverride ?? 8)}
        />
      </div> */}
    </div>
  </div>
}
