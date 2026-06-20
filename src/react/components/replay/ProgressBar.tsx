import { DARK_COLORS } from './constants'

interface Props {
  current: number
  total: number
}

function padNumber(num: number): string {
  return String(num).padStart(3, '0')
}

export default function ProgressBar({ current, total }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
      <div style={{ color: DARK_COLORS.textDim, fontSize: '12px', minWidth: '70px' }}>
        {padNumber(current)}/{padNumber(total)}
      </div>
      <div
        style={{
          flex: 1,
          height: '4px',
          background: DARK_COLORS.border,
          borderRadius: '2px'
        }}
      >
        <div
          style={{
            width: `${(current / total) * 100}%`,
            height: '100%',
            background: DARK_COLORS.text,
            borderRadius: '2px',
            transition: 'width 0.2s'
          }}
        />
      </div>
    </div>
  )
}
