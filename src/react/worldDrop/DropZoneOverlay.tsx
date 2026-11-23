import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { miscUiState } from '../../globalState'
import styles from './dropZoneOverlay.module.css'

const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')

/**
 * Full screen hint while files are dragged over the page: drop a world (folder or .zip) to open it on the world screen.
 * Only shows; the drop itself is handled in dragndrop.ts (the overlay lets pointer events through).
 */
export default () => {
  const [visible, setVisible] = useState(false)
  const { gameLoaded } = useSnapshot(miscUiState)

  useEffect(() => {
    // dragenter / dragleave fire for every child element: count them to know when the drag really left the window
    let depth = 0
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setVisible(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setVisible(false)
    }
    const reset = () => {
      depth = 0
      setVisible(false)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', reset)
    window.addEventListener('dragend', reset)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', reset)
      window.removeEventListener('dragend', reset)
    }
  }, [])

  if (!visible) return null
  return (
    <div className={styles.overlay}>
      <div className={styles.frame}>
        <div className={styles.title}>Drop a Minecraft world</div>
        <div className={styles.subtitle}>{gameLoaded ? 'Leave this world first to open another one' : 'World folder or .zip'}</div>
        <div className={styles.hint}>Also: skin or skybox images, .dat and .mca files to inspect</div>
      </div>
    </div>
  )
}
