import SharedHudVars from './SharedHudVars'
import styles from './XPBar.module.css'

export default ({ progress, level, gamemode }: { progress: number; level: number; gamemode: string }) => (
  <SharedHudVars>
    <div id="xp-bar-bg" className={styles['xp-bar-bg']} style={{ display: gamemode === 'creative' || gamemode === 'spectator' ? 'none' : 'block' }}>
      <div className={styles['xp-bar']} style={{ width: `${182 * progress}px` }} />
      <span className={styles['xp-label']} style={{ display: level > 0 ? 'block' : 'none' }}>
        {level}
      </span>
    </div>
  </SharedHudVars>
)
