import classNames from 'classnames'
import { createContext, FC, Ref, useContext, useEffect, useRef } from 'react'
import buttonCss from './button.module.css'
import SharedHudVars from './SharedHudVars'
import PixelartIcon from './PixelartIcon'
import { withInjectableUi } from './extendableSystem'

// testing in storybook from deathscreen

interface Props extends React.ComponentProps<'button'> {
  label?: string
  postLabel?: React.ReactNode
  icon?: string
  children?: React.ReactNode
  inScreen?: boolean
  rootRef?: Ref<HTMLButtonElement>
  overlayColor?: string
  noTranslate?: boolean
}

const ButtonContext = createContext({
  onClick () { },
})

export const ButtonProvider: FC<{ children, onClick }> = ({ children, onClick }) => {
  return <ButtonContext.Provider value={{ onClick }}>{children}</ButtonContext.Provider>
}

const ButtonBase = (({ label, icon, children, inScreen, rootRef, type = 'button', postLabel, overlayColor, noTranslate, ...args }) => {
  const style = {
    ...args.style,
  } as React.CSSProperties

  const buttonRef = useRef<any>(null)

  useEffect(() => {
    // replace all text childs with translated text
    // traverse dom
    const traverse = (node: HTMLElement) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          if (child.textContent) {
            child.textContent = translate(child.textContent)
          }
        } else {
          traverse(child as HTMLElement)
        }
      }
    }
    traverse(buttonRef.current)
  }, [label, children, postLabel])

  args.title = translate(args.title)

  const ctx = useContext(ButtonContext)

  const onClick = (e) => {
    ctx.onClick()
    args.onClick?.(e)
  }
  const labelText = `${translate(label) ?? ''} ${typeof children === 'string' ? translate(children) : ''}`
  if (inScreen) {
    style.width = 150
    args.className = `${args.className ?? ''} settings-text-container`
  }
  if (typeof style.width === 'number' && ((style.width <= 150 && labelText.length > 17) || (style.width >= 90 && labelText.length >= 11))) {
    args.className = `${args.className ?? ''} settings-text-container-long`
  }

  if (icon) {
    style.width = 20
  }

  const tryToTranslate = (maybeText: any) => {
    if (noTranslate) return maybeText
    if (typeof maybeText === 'string') {
      return window.translateText?.(maybeText) ?? maybeText
    }
    if (Array.isArray(maybeText)) {
      return maybeText.map(tryToTranslate)
    }
    return maybeText
  }

  return <SharedHudVars>
    <button
      ref={(button) => {
        buttonRef.current = button
        if (typeof rootRef === 'function') {
          rootRef(button)
        } else if (rootRef) {
        //@ts-expect-error
          rootRef.current = button
        }
      }}
      {...args}
      style={style}
      className={classNames(buttonCss.button, args.className)}
      onClick={onClick}
      type={type}
    >
      {icon && <PixelartIcon className={buttonCss.icon} iconName={icon} />}
      {label}
      {postLabel}
      {children}
      {overlayColor && <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: overlayColor,
        opacity: 0.5,
        pointerEvents: 'none'
      }} />}
    </button>
  </SharedHudVars>
}) satisfies FC<Props>

export default withInjectableUi(ButtonBase, 'button')
