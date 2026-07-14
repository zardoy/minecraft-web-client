import { useEffect } from 'react'

// appReplacableResources
import { appReplacableResources } from '../generated/resources'
import { BASE_HOTBAR_HEIGHT } from './HotbarRenderApp'

export default ({ children }): React.ReactElement => {
  useEffect(() => {
    if (document.getElementById('hud-vars-style')) return
    // 1. Don't inline long data URLs for better DX in elements tab
    // 2. Easier application to globally override icons with custom image (eg from resourcepacks)
    const css = /* css */`
      html {
        ${Object.values(appReplacableResources).filter(r => r.cssVar).map(r => {
      const repeat = r.cssVarRepeat ?? 1
      return `${r.cssVar}: ${repeatArr(`url('${r.content}')`, repeat).join(', ')};`
    }).join('\n')}

        --hud-bottom-max: 0px;
        --hud-bottom-raw: max(env(safe-area-inset-bottom), var(--hud-bottom-max));
        --safe-area-inset-bottom: calc(var(--hud-bottom-raw) / var(--guiScale) + ${BASE_HOTBAR_HEIGHT + 3}px);
      }
    `
    const style = document.createElement('style')
    style.id = 'hud-vars-style'
    style.textContent = css
    document.head.appendChild(style)
  }, [])

  return children
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const repeatArr = <T extends any> (item: T, times: number): T[] => {
  return Array.from({ length: times }, () => item)
}
