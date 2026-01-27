import './deathScreen.css'
import type { MessageFormatPart } from '../chatUtils'
import MessageFormatted from './MessageFormatted'
import Button from './Button'
import { withInjectableUi } from './extendableSystem'

type Props = {
  dieReasonMessage: MessageFormatPart[]
  respawnCallback: () => void
  disconnectCallback: () => void
}

const DeathScreenBase = ({ dieReasonMessage, respawnCallback, disconnectCallback }: Props) => {
  return (
    <div className='deathScreen-container'>
      <div className="deathScreen">
        <h1 className='deathScreen-title'>You Died!</h1>
        <h5 className='deathScreen-reason'>
          <MessageFormatted parts={dieReasonMessage} />
        </h5>
        <div className='deathScreen-buttons-grouped'>
          <Button
            label="Respawn" onClick={() => {
              respawnCallback()
            }}
          />
          <Button
            label="Disconnect" onClick={() => {
              disconnectCallback()
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default withInjectableUi(DeathScreenBase, 'deathScreen')
