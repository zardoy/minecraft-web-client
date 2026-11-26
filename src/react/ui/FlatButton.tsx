import PixelartIcon from '../PixelartIcon'
import styles from './flatButton.module.css'

interface Props extends React.ComponentProps<'button'> {
  icon?: string
  label?: React.ReactNode
  variant?: 'default' | 'primary' | 'danger'
  /** 14px tall instead of 20px (inline actions) */
  small?: boolean
}

/** Flat button of the settings and multiplayer screens: same height and border as their switches and fields (the textured game button splits in two halves at fractional GUI scales) */
export default ({ icon, label, variant = 'default', small, className, children, type = 'button', ...props }: Props) => {
  const text = label ?? children
  return <button
    type={type}
    {...props}
    className={`${styles.button} ${styles[variant]} ${small ? styles.small : ''} ${text ? '' : styles.iconOnly} flat-button ${className ?? ''}`}
  >
    {icon && <PixelartIcon iconName={icon.replace('pixelarticons:', '')} className={styles.icon} />}
    {text !== undefined && text !== null && <span className={styles.text}>{typeof text === 'string' ? translate(text) : text}</span>}
  </button>
}
