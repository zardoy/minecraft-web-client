import './Scoreboard.css'
import MessageFormattedString from './MessageFormattedString'
import { reactKeyForMessage } from './utils'
import { withInjectableUi } from './extendableSystem'


export type ScoreboardItems = Array<{ name: string, value: number, displayName?: any }>

type ScoreboardProps = {
  title: string,
  items: ScoreboardItems,
  open: boolean
  style?: React.CSSProperties
}

const ScoreboardBase = ({ title, items, open, style }: ScoreboardProps) => {
  if (!open) return null

  return (
    <div className='scoreboard-container' style={style}>
      <div className='scoreboard-title'>
        <MessageFormattedString message={title} />
      </div>
      {
        items.map((item) => {
          const message = item.displayName ?? item.name
          return <div key={reactKeyForMessage(message) + '_' + item.value} className='item-container'>
            <div className='item-name'>
              <MessageFormattedString message={message} />
            </div>
            <div className='item-value'>
              {item.value}
            </div>
          </div>
        })
      }
    </div>
  )
}

export default withInjectableUi(ScoreboardBase, 'scoreboard')
