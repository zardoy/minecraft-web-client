import Button from './Button'

interface Props {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void

  disabledTabs?: string[]
  labels?: Record<string, string>
  fullSize?: boolean
  style?: React.CSSProperties
}

export default ({ tabs, activeTab, labels, onTabChange, fullSize, style, disabledTabs }: Props) => {
  return (
    <div
      style={{
        width: fullSize ? '100%' : undefined,
        display: fullSize ? 'flex' : undefined,
        ...style
      }}
    >
      {tabs.map(tab => {
        const active = tab === activeTab
        return (
          <div
            key={tab}
            style={{
              position: 'relative',
              width: fullSize ? '100%' : 150
            }}
          >
            <Button
              disabled={active || disabledTabs?.includes(tab)}
              style={{
                width: '100%',
                height: '100%',
                // background: active ? 'rgb(77, 77, 77)' : 'rgb(114, 114, 114)',
                color: 'white',
                cursor: 'pointer',
                fontSize: 9,
                padding: '2px 0px'
              }}
              onClick={() => {
                onTabChange(tab)
              }}
            >
              {labels?.[tab] ?? tab}
            </Button>
            {active && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: 'white',
                  width: '50%',
                  margin: 'auto'
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
