import { useRef, useState } from 'react'
import { processPacketDataForLogging } from 'mcraft-fun-mineflayer/build/packetsLogger'
import { PacketData } from '../../ReplayPanel'
import { useScrollBehavior } from '../../hooks/useScrollBehavior'
import { ClientOnMap } from '../../../generatedServerPackets'
import { DARK_COLORS } from './constants'

const formatters: Record<string, (data: any) => string> = {
  position: data => `x:${data.x.toFixed(2)} y:${data.y.toFixed(2)} z:${data.z.toFixed(2)}`,
  // chat: (data) => data,
  map_chunk(data: ClientOnMap['map_chunk'] | any) {
    const sizeOfChunk = data.chunkData?.length
    const blockEntitiesCount = data.blockEntities?.length
    return `x:${data.x} z:${data.z} C:${sizeOfChunk} E:${blockEntitiesCount}`
  },
  default: data => processPacketDataForLogging(data)
}

const getPacketIcon = (packet: PacketData): string => {
  if (packet.isCustomChannel) return '🔗'
  if (packet.name.includes('position')) return '📍'
  if (packet.name.includes('chat')) return '💬'
  if (packet.name.includes('block') || packet.name.includes('chunk') || packet.name.includes('light')) return '📦'
  if (packet.name.includes('entity') || packet.name.includes('player') || packet.name.includes('passenger')) return '🎯'
  return '📄'
}

interface Props {
  packets: PacketData[]
  filter: string
  maxHeight?: number
}

const ROW_HEIGHT = 24
const EXPANDED_HEIGHT = 120

function formatTimeDiff(current: number, prev: number | null): string {
  if (prev === null) return ''
  const diff = current - prev
  return `+${Math.floor(diff / 1000)}`
}

const styles = {
  packetRow: {
    height: ROW_HEIGHT,
    padding: '0 8px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'background-color 0.1s'
  } as const,
  expandedPacket: {
    height: EXPANDED_HEIGHT,
    padding: '8px',
    background: DARK_COLORS.input,
    fontSize: '12px',
    overflow: 'auto',
    borderBottom: `1px solid ${DARK_COLORS.border}`
  } as const
}

export default function PacketList({ packets, filter, maxHeight = 300 }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const [expandedPacket, setExpandedPacket] = useState<number | null>(null)
  const { scrollToBottom } = useScrollBehavior(listRef, { messages: packets, opened: true })

  let prevTimestamp: number | null = null

  return (
    <>
      <style>
        {`
          .packet-row:hover {
            background: ${DARK_COLORS.hover} !important;
          }
        `}
      </style>
      <div
        ref={listRef}
        style={{
          overflowY: 'auto',
          height: maxHeight,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ minHeight: '100%' }}>
          {packets.map((packet, index) => {
            const timeDiff = formatTimeDiff(packet.timestamp, prevTimestamp)
            prevTimestamp = packet.timestamp
            return (
              <div key={`${packet.timestamp}-${packet.position}`}>
                <div
                  className="packet-row"
                  onClick={() => setExpandedPacket(expandedPacket === packet.position ? null : packet.position)}
                  style={{
                    ...styles.packetRow,
                    background: packet.isFromClient ? DARK_COLORS.client : DARK_COLORS.server,
                    opacity: packet.isUpcoming ? 0.5 : 1
                  }}
                >
                  <span>{getPacketIcon(packet)}</span>
                  <span style={{ color: DARK_COLORS.textDim }}>
                    #{packet.position}
                    {timeDiff && <span style={{ marginLeft: '4px' }}>{timeDiff}</span>}
                  </span>
                  {filter && <span style={{ color: DARK_COLORS.textDim }}>#{index + 1}</span>}
                  <span
                    style={{
                      color: packet.actualVersion ? DARK_COLORS.modified : DARK_COLORS.text,
                      fontWeight: 'bold'
                    }}
                  >
                    {packet.name}
                  </span>
                  <span style={{ color: DARK_COLORS.textDim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatters[packet.name]?.(packet.data) ?? formatters.default(packet.data)}
                  </span>
                </div>
                {expandedPacket === packet.position && (
                  <div style={styles.expandedPacket}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Data:</strong>
                      <pre style={{ margin: '4px 0', color: DARK_COLORS.textDim }}>{JSON.stringify(JSON.parse(formatters.default(packet.data)), null, 2)}</pre>
                    </div>
                    {packet.actualVersion && (
                      <div>
                        <strong>Actual Version:</strong>
                        <pre style={{ margin: '4px 0', color: DARK_COLORS.textDim }}>
                          {JSON.stringify(JSON.parse(formatters.default(packet.actualVersion)), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
