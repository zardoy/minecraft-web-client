import { useSnapshot } from 'valtio'
import { useState, useMemo, useEffect, useRef } from 'react'
import { titleCase } from 'title-case'
import { noCase } from 'change-case'
import { isMobile } from 'renderer/viewer/lib/simpleUtils'
import { options, disabledSettings, getChangedSettings } from '../optionsStorage'
import { hideCurrentModal, showModal } from '../globalState'
import { defaultOptions, optionsMeta } from '../defaultOptions'
import Screen from './Screen'
import Button from './Button'
import Input from './Input'
import { useIsModalActive } from './utilsApp'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import { showInputsModal, showOptionsModal } from './SelectOption'

export const showAllSettingsEditor = () => {
  showModal({ reactType: 'all-settings-editor' })
}

export default () => {
  const isModalActive = useIsModalActive('all-settings-editor')
  const optionsSnapshot = useSnapshot(options)
  const disabledSettingsSnapshot = useSnapshot(disabledSettings)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredOptions = useMemo(() => {
    if (!isModalActive) return []
    const search = searchTerm.toLowerCase()
    return Object.entries(optionsSnapshot)
      .filter(([key]) => {
        const keyLower = key.toLowerCase()
        const titleKey = titleCase(noCase(key)).toLowerCase()
        return keyLower.includes(search) || titleKey.includes(search)
      })
      .sort(([a], [b]) => a.localeCompare(b))
  }, [optionsSnapshot, searchTerm, isModalActive])

  useEffect(() => {
    if (isModalActive && searchInputRef.current && !isMobile()) {
      // Focus search input on open (but not on mobile to avoid keyboard popup)
      searchInputRef.current.focus()
    }
  }, [isModalActive])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEditingKey(null)
      }
    }
    if (editingKey) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingKey])

  const handleCopySettingsUrl = async () => {
    const changedSettings = getChangedSettings()
    const changedKeys = Object.keys(changedSettings)

    if (changedKeys.length === 0) {
      alert('No changed settings found.')
      return
    }

    // Create checkboxes for each changed setting (all checked by default)
    const checkboxInputs = Object.fromEntries(
      changedKeys.map(key => [key, {
        type: 'checkbox' as const,
        label: titleCase(noCase(key)),
        defaultValue: true,
      }])
    )

    const selectedSettings = await showInputsModal(
      'Select Changed Settings to Include in URL',
      checkboxInputs,
      { cancel: true, showConfirm: true }
    )

    if (!selectedSettings) return

    // Build URL with selected settings
    const selectedKeys = changedKeys.filter(key => selectedSettings[key])
    if (selectedKeys.length === 0) {
      alert('No settings selected.')
      return
    }

    const urlParams = selectedKeys.map(key => {
      const value = changedSettings[key]
      // JSON encode the value as mentioned in the requirement
      const jsonValue = JSON.stringify(value)
      return `setting=${encodeURIComponent(key)}:${encodeURIComponent(jsonValue)}`
    }).join('&')

    const url = `${window.location.origin}${window.location.pathname}?${urlParams}`

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      alert(`URL copied to clipboard!\n\n${url}`)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        alert(`URL copied to clipboard!\n\n${url}`)
      } catch (fallbackErr) {
        alert(`Failed to copy. URL:\n\n${url}`)
      }
      textArea.remove()
    }
  }

  if (!isModalActive) return null

  const handleValueClick = async (key: string, value: any, event: React.MouseEvent) => {
    if (disabledSettingsSnapshot.value.has(key)) return
    event.stopPropagation()

    const meta = optionsMeta[key as keyof typeof optionsMeta]

    // Handle enum values with showOptionsModal
    if (meta?.possibleValues && meta.possibleValues.length > 0) {
      const getOptionValue = (arrItem: string | [string, string]) => {
        if (typeof arrItem === 'string') {
          return arrItem
        } else {
          return arrItem[0]
        }
      }
      const getOptionLabel = (arrItem: string | [string, string]) => {
        if (typeof arrItem === 'string') {
          return titleCase(noCase(arrItem))
        } else {
          return arrItem[1]
        }
      }
      const optionLabels = meta.possibleValues.map(getOptionLabel)
      const result = await showOptionsModal(
        `Select ${titleCase(noCase(key))}`,
        optionLabels
      )
      if (result) {
        const selectedIndex = optionLabels.indexOf(result)
        if (selectedIndex !== -1) {
          handleValueChange(key, getOptionValue(meta.possibleValues[selectedIndex]))
        }
      }
      return
    }

    // Handle custom string input
    if (meta?.isCustomInput || typeof value === 'string') {
      const hadOptionChanged = value !== defaultOptions[key as keyof typeof defaultOptions]
      const result = await showInputsModal(
        `Edit ${titleCase(noCase(key))}`,
        {
          value: {
            type: 'text',
            label: titleCase(noCase(key)),
            defaultValue: value,
            placeholder: `Enter ${titleCase(noCase(key))}`
          },
          ...hadOptionChanged ? {
            reset: {
              type: 'button',
            }
          } : {}
        },
        { cancel: true, showConfirm: true }
      )
      if (result.reset) {
        handleValueChange(key, defaultOptions[key])
      } else if (result.value) {
        handleValueChange(key, result.value)
      }
      return
    }

    // Handle boolean - toggle directly
    if (typeof value === 'boolean') {
      handleValueChange(key, !value)
      return
    }

    // Otherwise, show edit mode
    setEditingKey(key)
    setEditingValue(String(value))
  }

  const handleValueChange = (key: string, newValue: any) => {
    try {
      if (typeof optionsSnapshot[key] === 'boolean') {
        options[key] = newValue === 'true' || newValue === true
      } else if (typeof optionsSnapshot[key] === 'number') {
        const num = parseFloat(String(newValue))
        if (!isNaN(num)) {
          options[key] = num
        }
      } else {
        options[key] = newValue
      }
      setEditingKey(null)
    } catch (err) {
      console.error('Failed to update option:', err)
    }
  }

  const OptionRow = ({ optionKey, value }: { optionKey: string, value: any }) => {
    const valueButtonRef = useRef<HTMLDivElement>(null)
    const isDisabled = disabledSettingsSnapshot.value.has(optionKey)
    const isEditing = editingKey === optionKey
    const isBoolean = typeof value === 'boolean'
    const isNumber = typeof value === 'number'
    const isString = typeof value === 'string'
    const meta = optionsMeta[optionKey as keyof typeof optionsMeta]
    const possibleValues = meta?.possibleValues
    const isCustomInput = meta?.isCustomInput && isString

    const renderValueEditor = () => {
      if (!isEditing) return null

      const dropdownStyle: React.CSSProperties = {
        position: 'fixed',
        backgroundColor: '#2a2a2a',
        border: '1px solid #555',
        borderRadius: '4px',
        padding: '4px',
        zIndex: 10_000,
        minWidth: '120px',
        maxHeight: '300px',
        overflowY: 'auto',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
      }

      if (valueButtonRef.current) {
        const rect = valueButtonRef.current.getBoundingClientRect()
        dropdownStyle.left = `${rect.left}px`
        dropdownStyle.top = `${rect.bottom + 4}px`
      }

      return (
        <div ref={dropdownRef} style={dropdownStyle}>
          {isBoolean ? (
            <>
              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  backgroundColor: '#333',
                  borderRadius: '2px',
                  marginBottom: '4px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#444' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#333' }}
                onClick={() => handleValueChange(optionKey, 'true')}
              >
                true
              </div>
              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  backgroundColor: '#333',
                  borderRadius: '2px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#444' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#333' }}
                onClick={() => handleValueChange(optionKey, 'false')}
              >
                false
              </div>
            </>
          ) : isString ? (
            <div style={{ padding: '4px' }}>
              <Input
                defaultValue={String(value)}
                autoFocus
                rootStyles={{ width: '100%' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleValueChange(optionKey, e.currentTarget.value)
                  } else if (e.key === 'Escape') {
                    setEditingKey(null)
                  }
                }}
                onBlur={() => {
                  // Small delay to allow dropdown clicks to register
                  setTimeout(() => {
                    if (editingKey === optionKey) {
                      handleValueChange(optionKey, editingValue)
                    }
                  }, 200)
                }}
                onChange={(e) => setEditingValue(e.target.value)}
              />
            </div>
          ) : isNumber ? (
            <div style={{ padding: '4px' }}>
              <Input
                type="number"
                defaultValue={String(value)}
                autoFocus
                rootStyles={{ width: '100%' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleValueChange(optionKey, e.currentTarget.value)
                  } else if (e.key === 'Escape') {
                    setEditingKey(null)
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    if (editingKey === optionKey) {
                      handleValueChange(optionKey, editingValue)
                    }
                  }, 200)
                }}
                onChange={(e) => setEditingValue(e.target.value)}
              />
            </div>
          ) : (
            <div style={{ padding: '8px', color: '#999', fontSize: '12px' }}>
              Complex type (object/array)
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: isEditing ? '#333' : isDisabled ? '#1f1f1f' : '#2a2a2a',
          borderRadius: '4px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          // Mobile-friendly touch targets
          minHeight: '44px',
        }}
        onMouseEnter={(e) => {
          if (!isDisabled && !isEditing) {
            e.currentTarget.style.backgroundColor = '#333'
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled && !isEditing) {
            e.currentTarget.style.backgroundColor = '#2a2a2a'
          }
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0, // Allow text to truncate on mobile
            fontSize: '13px',
            color: isDisabled ? '#666' : '#fff',
            fontWeight: 500,
            wordBreak: 'break-word',
          }}
        >
          {titleCase(noCase(optionKey))}
        </div>
        <div
          ref={valueButtonRef}
          style={{
            fontSize: '12px',
            color: typeof value === 'boolean' ? (value ? '#4caf50' : '#f44336') : '#aaa',
            padding: '4px 8px',
            backgroundColor: isEditing ? '#444' : '#1a1a1a',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            border: isEditing ? '1px solid #555' : '1px solid transparent',
            userSelect: 'none',
            // Mobile-friendly touch target
            minWidth: '60px',
            textAlign: 'center',
          }}
          onClick={(e) => { void handleValueClick(optionKey, value, e) }}
          onTouchStart={(e) => {
            // Prevent double-tap zoom on mobile
            if (e.touches.length > 1) {
              e.preventDefault()
            }
          }}
        >
          {(() => {
            if (typeof value === 'boolean') {
              return String(value)
            }
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value).slice(0, 30) + (JSON.stringify(value).length > 30 ? '...' : '')
            }
            // Try to find label for enum value
            if (possibleValues) {
              const found = possibleValues.find(opt => {
                const optValue = Array.isArray(opt) ? opt[0] : opt
                return String(optValue) === String(value)
              })
              if (found) {
                return Array.isArray(found) ? found[1] : found
              }
            }
            return String(value)
          })()}
        </div>
        {renderValueEditor()}
      </div>
    )
  }

  return (
    <Screen title="All Settings" backdrop titleMarginTop={5}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        maxHeight: 'calc(100vh - 100px)',
        gap: '8px',
      }}>
        {/* Search input */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#1a1a1a',
          padding: '8px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              icon={pixelartIcons['link']}
              onClick={handleCopySettingsUrl}
              style={{ flexShrink: 0 }}
              title="Copy URL with changed settings"
            />
            <PixelartIcon iconName={pixelartIcons['search']} styles={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <Input
              ref={searchInputRef}
              placeholder="Search options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              rootStyles={{
                flex: 1,
                minWidth: 0, // Allow flexbox to shrink properly on mobile
              }}
            />
            {searchTerm && (
              <Button
                icon={pixelartIcons['close']}
                onClick={() => setSearchTerm('')}
                style={{ width: '20px', flexShrink: 0 }}
              />
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
            {filteredOptions.length} option{(filteredOptions.length === 1) ? '' : 's'} found
          </div>
        </div>

        {/* Options list */}
        <div style={{
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          paddingRight: '4px',
          // Mobile-friendly scrolling
          WebkitOverflowScrolling: 'touch',
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#888',
              fontSize: '14px',
            }}>
              No options found matching "{searchTerm}"
            </div>
          ) : (
            filteredOptions.map(([key, value]) => (
              <OptionRow key={key} optionKey={key} value={value} />
            ))
          )}
        </div>

        {/* Close button */}
        <div style={{
          position: 'sticky',
          bottom: 0,
          paddingTop: '8px',
          backgroundColor: '#1a1a1a',
        }}>
          <Button onClick={hideCurrentModal} style={{ width: '100%' }}>
            Close
          </Button>
        </div>
      </div>
    </Screen>
  )
}
