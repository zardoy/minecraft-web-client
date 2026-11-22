import MessageFormattedString from './MessageFormattedString'
import './PlayerListOverlay.css'


type PlayersLists = Array<Array<Pick<import('mineflayer').Player, 'uuid' | 'displayName' | 'username' | 'ping'>>>

type PlayerListOverlayProps = {
  playersLists: PlayersLists,
  clientId: string,
  tablistHeader: string | Record<string, any> | null,
  tablistFooter: string | Record<string, any> | null,
  style?: React.CSSProperties
}

/** colour of the ping, at vanilla's signal bar steps (150 / 300 / 600 / 1000 ms) */
const pingClass = (ping: number) => (ping < 150 ? 'good' : ping < 300 ? 'ok' : ping < 600 ? 'slow' : 'bad')

const hasText = (message: PlayerListOverlayProps['tablistHeader']) => message !== null && message !== undefined && message !== '' && JSON.stringify(message) !== '{"text":""}'

/** Like vanilla: header, players and footer, no server address (it was shown as "Server IP:", empty in singleplayer). */
export default ({ playersLists, clientId, tablistHeader, tablistFooter, style }: PlayerListOverlayProps) => {

  return <div className="playerlist-container" id="playerlist-container" style={style}>
    {hasText(tablistHeader) && <div className='playerlist-header'>
      <MessageFormattedString message={tablistHeader} />
    </div>}
    <div className="player-lists">
      {playersLists.map((list, index) => (
        <div key={index} className="player-list">
          {list.map(player => (
            <div key={player.uuid ?? player.username} className={`playerlist-entry${clientId === player.uuid ? ' active-player' : ''}`} id={`plist-player-${player.uuid}`}>
              <MessageFormattedString message={player.displayName ?? player.username} />
              {/* unknown (singleplayer, servers that do not send it) or not measured yet: nothing instead of " ms" */}
              {typeof player.ping === 'number' && player.ping > 0 && <div className="playerlist-ping">
                <p className={`playerlist-ping-value ping-${pingClass(player.ping)}`}>{player.ping}</p>
                <p className="playerlist-ping-label">ms</p>
              </div>}
            </div>
          ))}
        </div>
      ))}
    </div>
    {hasText(tablistFooter) && <div className='playerlist-footer'>
      <MessageFormattedString message={tablistFooter} />
    </div>}
  </div>
}
