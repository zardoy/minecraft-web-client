import { useSnapshot } from 'valtio'
import './Crosshair.css'
import SharedHudVars from './SharedHudVars'
import { useUseIndicatorVisual } from './useItemIndicator'

export default () => {
  // In VR the HUD is a floating panel and aiming doesn't follow it, a crosshair there points at nothing
  const { inVrSession } = useSnapshot(appViewer.rendererState)
  const { itemUseSession } = useSnapshot(appViewer.playerState.reactive)
  const session = itemUseSession
  const action = session?.itemSnapshot.action
  const { display: displayIndicator, progress: indicatorProgress, pending } = useUseIndicatorVisual(session)
  const alternativeIndicator = displayIndicator && action === 'SHIELD'
  const indicatorSize = 20
  const indicatorColor = pending ? '#ffd54f' : 'white'

  return <SharedHudVars>
    {!inVrSession && <div className='crosshair' />}
    {displayIndicator && <div
      className={pending ? 'crosshair-indicator crosshair-indicator-pending' : 'crosshair-indicator'} style={{
      //@ts-expect-error
        '--crosshair-indicator-size': `${indicatorSize}px`,
        borderLeft: `solid ${indicatorSize * indicatorProgress}px ${indicatorColor}`,
        backgroundColor: alternativeIndicator ? 'dodgerblue' : undefined,
      }}
    />}
  </SharedHudVars>
}
