// Slider.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useFloating, arrow, FloatingArrow, offset as offsetMiddleware } from '@floating-ui/react'
import styles from './slider.module.css'
import SharedHudVars from './SharedHudVars'

interface Props extends React.ComponentProps<'div'> {
  label: string;
  value: number;
  unit?: string;
  width?: number;
  valueDisplay?: string | number;
  min?: number;
  max?: number;
  disabledReason?: string;
  throttle?: number | false; // milliseconds, default 100, false to disable

  updateValue?: (value: number) => void;
  updateOnDragEnd?: boolean;
}

const ARROW_HEIGHT = 7
const GAP = 0

const Slider: React.FC<Props> = ({
  label,
  unit = '%',
  width,
  value: valueProp,
  valueDisplay,
  min = 0,
  max = 100,
  disabledReason,
  throttle = 0,

  updateOnDragEnd = false,
  updateValue,
  ...divProps
}) => {
  label = translate(label)
  disabledReason = translate(disabledReason)
  valueDisplay = typeof valueDisplay === 'string' ? translate(valueDisplay) : valueDisplay

  const [value, setValue] = useState(valueProp)
  const getRatio = (v = value) => Math.max(Math.min((v - min) / (max - min), 1), 0)
  const [ratio, setRatio] = useState(getRatio())

  // Throttling refs
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastValueRef = useRef<number>(valueProp)

  // Gamepad support
  const [showGamepadTooltip, setShowGamepadTooltip] = useState(false)
  const lastChangeTime = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    setValue(valueProp)
  }, [valueProp])
  useEffect(() => {
    setRatio(getRatio())
  }, [value, min, max])

  const throttledUpdateValue = useCallback((newValue: number, dragEnd: boolean) => {
    if (updateOnDragEnd !== dragEnd) return
    if (!updateValue) return

    lastValueRef.current = newValue

    if (!throttle) {
      // No throttling
      updateValue(newValue)
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      updateValue(lastValueRef.current)
      timeoutRef.current = null
    }, throttle)
  }, [updateValue, updateOnDragEnd, throttle])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        // Fire the last value immediately on cleanup
        if (updateValue && lastValueRef.current !== undefined) {
          updateValue(lastValueRef.current)
        }
      }
    }
  }, [updateValue])

  // Handle gamepad hover and input changes
  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const handleMouseOver = (e: MouseEvent & { isGamepadCursor?: boolean }) => {
      if (e.isGamepadCursor && !disabledReason) {
        setShowGamepadTooltip(true)
      }
    }

    const handleMouseOut = (e: MouseEvent & { isGamepadCursor?: boolean }) => {
      if (e.isGamepadCursor) {
        setShowGamepadTooltip(false)
      }
    }

    const handleGamepadInputChange = (e: CustomEvent<{ direction: number, value: number, isStickMovement: boolean }>) => {
      if (disabledReason) return

      const now = Date.now()
      // Throttle changes to prevent too rapid updates
      if (now - lastChangeTime.current < 200 && e.detail.isStickMovement) return
      lastChangeTime.current = now

      const step = 1
      const newValue = value + (e.detail.direction * step)

      // Apply min/max constraints
      const constrainedValue = Math.max(min, Math.min(max, newValue))

      setValue(constrainedValue)
      fireValueUpdate(false, constrainedValue)
    }

    element.addEventListener('mouseover', handleMouseOver as EventListener)
    element.addEventListener('mouseout', handleMouseOut as EventListener)
    element.addEventListener('gamepadInputChange', handleGamepadInputChange as EventListener)

    return () => {
      element.removeEventListener('mouseover', handleMouseOver as EventListener)
      element.removeEventListener('mouseout', handleMouseOut as EventListener)
      element.removeEventListener('gamepadInputChange', handleGamepadInputChange as EventListener)
    }
  }, [disabledReason, value, min, max])

  const fireValueUpdate = (dragEnd: boolean, v = value) => {
    throttledUpdateValue(v, dragEnd)
  }

  const labelText = `${label}: ${valueDisplay ?? value} ${unit}`

  const arrowRef = useRef<any>(null)
  const { refs, floatingStyles, context } = useFloating({
    middleware: [
      arrow({
        element: arrowRef
      }),
      offsetMiddleware(ARROW_HEIGHT + GAP),
    ],
    placement: 'top',
  })

  return (
    <SharedHudVars>
      <div
        ref={(node) => {
          containerRef.current = node!
          refs.setReference(node)
        }}
        className={`${styles['slider-container']} settings-text-container ${labelText.length > 17 ? 'settings-text-container-long' : ''}`}
        style={{ width }}
        {...divProps}
      >
        <input
          type="range"
          className={styles.slider}
          min={min}
          max={max}
          value={value}
          disabled={!!disabledReason}
          onChange={(e) => {
            const newValue = Number(e.target.value)
            setValue(newValue)
            fireValueUpdate(false, newValue)
          }}
          // todo improve correct handling of drag end
          onLostPointerCapture={() => {
            fireValueUpdate(true)
          }}
          onPointerUp={() => {
            fireValueUpdate(true)
          }}
          onKeyUp={() => {
            fireValueUpdate(true)
          }}
        />
        <div className={styles.disabled} title={disabledReason} />
        <div className={styles['slider-thumb']} style={{ left: `calc((100% * ${ratio}) - (8px * ${ratio}))` }} />
        <label className={styles.label}>
          {labelText}
        </label>
      </div>
      {showGamepadTooltip && (
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            background: 'rgba(0, 0, 0, 0.8)',
            fontSize: 10,
            pointerEvents: 'none',
            userSelect: 'none',
            padding: '4px 8px',
            borderRadius: 4,
            textShadow: '1px 1px 2px BLACK',
            zIndex: 1000,
            whiteSpace: 'nowrap'
          }}
        >
          Use right stick left/right to change value
          <FloatingArrow ref={arrowRef} context={context} style={{ fill: 'rgba(0, 0, 0, 0.8)' }} />
        </div>
      )}
    </SharedHudVars>
  )
}

export default Slider
