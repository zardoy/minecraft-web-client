import { useState } from 'react'
import checkboxSprite from 'mc-assets/dist/other-textures/latest/gui/sprites/widget/checkbox.png'
import checkboxHighlightedSprite from 'mc-assets/dist/other-textures/latest/gui/sprites/widget/checkbox_highlighted.png'
import checkboxSelectedSprite from 'mc-assets/dist/other-textures/latest/gui/sprites/widget/checkbox_selected.png'
import checkboxSelectedHighlightedSprite from 'mc-assets/dist/other-textures/latest/gui/sprites/widget/checkbox_selected_highlighted.png'
import styles from './mcCheckbox.module.css'

/** Minecraft checkbox widget (the game's own sprites) with a label */
const McCheckbox = ({ checked, disabled, label, hint, onChange }: { checked: boolean, disabled?: boolean, label: string, hint?: string, onChange: (checked: boolean) => void }) => {
  const [hover, setHover] = useState(false)
  const sprite = checked
    ? (hover && !disabled ? checkboxSelectedHighlightedSprite : checkboxSelectedSprite)
    : (hover && !disabled ? checkboxHighlightedSprite : checkboxSprite)
  return (
    <label
      className={`${styles.checkbox} ${disabled ? styles.disabled : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={hint}
    >
      <input type='checkbox' checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className={styles.checkboxBox} style={{ backgroundImage: `url(${sprite})` }} />
      <span className={styles.checkboxLabel}>{label}</span>
    </label>
  )
}

export default McCheckbox
