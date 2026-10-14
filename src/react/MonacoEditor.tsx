import { proxy, useSnapshot } from 'valtio'
import { useEffect } from 'react'
import { Editor } from '@monaco-editor/react'
import PixelartIcon, { pixelartIcons } from '../react/PixelartIcon'
import { useIsModalActive } from '../react/utilsApp'
import { showNotification } from '../react/NotificationProvider'
import { hideModal, showModal } from '../globalState'
import { ideState, saveIde } from '../core/ideChannels'
import './MonacoEditor.css'

export default () => {
  const { contents, line, column, id, language, title } = useSnapshot(ideState)
  const isModalActive = useIsModalActive('monaco-editor')
  const bodyFont = getComputedStyle(document.body).fontFamily

  useEffect(() => {
    if (id && !isModalActive) {
      showModal({ reactType: 'monaco-editor' })
    }
    if (!id && isModalActive) {
      hideModal()
    }
  }, [id])

  useEffect(() => {
    if (!isModalActive && id) {
      try {
        saveIde()
      } catch (err) {
        reportError(err)
        showNotification('Failed to save the editor', 'Please try again', true)
      }
      ideState.id = ''
      ideState.contents = ''
    }
  }, [isModalActive])

  if (!isModalActive) return null

  return <div className="monaco-editor-container">
    <div className="monaco-editor-close">
      <PixelartIcon
        iconName={pixelartIcons.close}
        width={26}
        onClick={() => {
          hideModal()
        }}
      />
    </div>
    <div className="monaco-editor-title">
      {title}
    </div>
    <div className="monaco-editor-wrapper">
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme='vs-dark'
        line={line}
        onChange={(value) => {
          ideState.contents = value ?? ''
        }}
        value={contents}
        options={{
          fontFamily: bodyFont,
          minimap: {
            enabled: true,
          },
        }}
      />
    </div>
  </div>
}
