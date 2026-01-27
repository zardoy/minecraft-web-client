import { hideCurrentModal } from '../globalState'
import { useIsModalActive } from './utilsApp'
import Screen from './Screen'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import styles from './CreditsAboutModal.module.css'

export default () => {
  const isModalActive = useIsModalActive('credits-about')

  if (!isModalActive) return null

  return (
    <Screen
      title=""
      backdrop
      className={styles.modalScreen}>
      <div className={styles.container}>
        <h2 className={styles.title}>Minecraft Open Source JS Edition</h2>

        <div className={styles.contentWrapper}>
          <small className={styles.subtitle}><i>What if Minecraft was an online game?</i></small>
          <p className={styles.paragraph}>
            Hey! You are on the safest modern Minecraft clone rewritten in JavaScript. A huge amount of work has gone into this project to make it fast and complete, and many features would not be possible without these awesome people and projects:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>- Everyone who provided awesome mods for the game</li>
            <li className={styles.listItem}>- <span><a className={styles.link} href="https://discord.com/users/gen6442" target="_blank" rel="noopener noreferrer">[Gen]</a></span> for rewriting the physics engine to be Grim-compliant</li>
            <li className={styles.listItem}>- <span><a className={styles.link} href="https://viaversion.com/" target="_blank" rel="noopener noreferrer">[ViaVersion]</a></span> for providing reliable sound id mappings</li>
            <li className={styles.listItem}>- <span><a className={styles.link} href="https://github.com/BlueMap-Minecraft/BlueMap" target="_blank" rel="noopener noreferrer">[Bluemap]</a></span> for providing block entity models like chest</li>
            <li className={styles.listItem}>- <span><a className={styles.link} href="https://github.com/misode/deepslate" target="_blank" rel="noopener noreferrer">[Deepslate]</a></span> for rendering 3d blocks in GUI (inventory)</li>
            <li className={styles.listItem}>- <span><a className={styles.link} href="https://www.npmjs.com/package/skinview3d" target="_blank" rel="noopener noreferrer">[skinview3d]</a></span> for rendering skins & player geometry</li>
            <li className={styles.listItem}>- <span><a className={styles.link} href="https://github.com/atxi/Polymer" target="_blank" rel="noopener noreferrer">[Polymer]</a></span> (c++ project) for providing fast & accurate server light implementation</li>
          </ul>

          <h3 className={styles.sectionTitle}>Current contributors:</h3>
          <ul className={styles.list}>
            <li className={styles.listItem}>- <span className={styles.link}><a className={styles.link} href="http://github.com/Valery-a" target="_blank" rel="noopener noreferrer">Valery-a</a></span> - 3D Renderer Engine Developer & Maintainer</li>
            <li className={styles.listItem}>- And many more community contributors!</li>
          </ul>

          <button
            className={styles.closeButton}
            onClick={() => hideCurrentModal()}
            aria-label="Close"
            type="button"
          >
            <PixelartIcon
              iconName={pixelartIcons.close}
              width={12}
              className={styles.closeIcon}
            />
          </button>
        </div>
      </div>
    </Screen>
  )
}
