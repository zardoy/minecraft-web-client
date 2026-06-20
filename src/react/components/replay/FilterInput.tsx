import { useEffect, useRef, useState } from 'react'
import { DARK_COLORS } from './constants'

interface Props {
  value: string
  onChange: (value: string) => void
  hiddenCount: number
  shownCount: number
  onClearFilter: () => void
  clientPacketsAutocomplete: string[]
  serverPacketsAutocomplete: string[]
}

export default function FilterInput({ value, onChange, hiddenCount, shownCount, onClearFilter, clientPacketsAutocomplete, serverPacketsAutocomplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const allSuggestions = [
    ...clientPacketsAutocomplete.map(name => ({ name, isClient: true })),
    ...serverPacketsAutocomplete.map(name => ({ name, isClient: false }))
  ].sort((a, b) => a.name.localeCompare(b.name))

  const currentWord = value.split(/,\s*/).pop() || ''
  const filteredSuggestions = allSuggestions.filter(({ name }) => name.toLowerCase().includes(currentWord.toLowerCase().replace(/^\$/, '')))

  useEffect(() => {
    setSelectedIndex(0)
  }, [currentWord])

  const acceptSuggestion = (suggestion: string) => {
    const parts = value.split(/,\s*/)
    parts[parts.length - 1] = suggestion
    onChange(parts.join(', '))
    setShowAutocomplete(false)
    inputRef.current?.focus()
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setShowAutocomplete(true)}
          onBlur={() => {
            setTimeout(() => setShowAutocomplete(false), 200)
          }}
          onKeyDown={e => {
            if (!showAutocomplete) {
              if (e.key === 'Tab') {
                e.preventDefault()
                setShowAutocomplete(true)
              }
              return
            }

            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSelectedIndex(i => (i + 1) % filteredSuggestions.length)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSelectedIndex(i => (i - 1 + filteredSuggestions.length) % filteredSuggestions.length)
            } else if (e.key === 'Enter' && filteredSuggestions.length > 0) {
              e.preventDefault()
              acceptSuggestion(filteredSuggestions[selectedIndex].name)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setShowAutocomplete(false)
            }
          }}
          placeholder="Filter packets (e.g. entity, $block_display, !position)"
          style={{
            width: '100%',
            padding: '8px',
            border: `1px solid ${DARK_COLORS.border}`,
            borderRadius: '4px',
            background: DARK_COLORS.input,
            color: DARK_COLORS.text
          }}
        />
        {showAutocomplete && filteredSuggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: DARK_COLORS.bg,
              border: `1px solid ${DARK_COLORS.border}`,
              borderRadius: '4px',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1
            }}
          >
            {filteredSuggestions.map(({ name, isClient }, index) => (
              <div
                key={name}
                onClick={() => acceptSuggestion(name)}
                style={{
                  padding: '4px 8px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? DARK_COLORS.hover : DARK_COLORS.bg,
                  color: isClient ? DARK_COLORS.client : DARK_COLORS.server
                }}
              >
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: '4px',
          fontSize: '12px',
          color: DARK_COLORS.textDim,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span>Showing: {shownCount}</span>
        <span>•</span>
        <span>Hidden: {hiddenCount}</span>

        <div
          style={{
            opacity: value ? 1 : 0,
            gap: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <span>•</span>
          <button
            onClick={onClearFilter}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: DARK_COLORS.text,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            clear all
          </button>
        </div>
      </div>
    </div>
  )
}
