import { useEffect, useRef } from 'react'
import { focusable } from 'tabbable'
import markdownToFormattedText from '../markdownToFormattedText'
import type { ProseMirrorView } from './prosemirror-markdown'
import Button from './Button'
import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-menu/style/menu.css'
import './SignEditor.css'

const imageSource =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAMCAYAAAB4MH11AAABbElEQVR4AY3BQY6cMBBA0Q+yQZZVi+ndcJVcKGfMgegdvShKVtuokzGSWwwiUd7rfv388Vst0UgMXCobmgsSA5VaQmKgUks0EgNHji8SA9W8GJCQwVNpLhzJ4KFs4B1HEgPVvBiQkMFTaS44tYTEQDXdIkfiHbuyobmguaDPFzIWGrWExEA13SJH4h1uzS/WbPyvroM1v6jWbFRrNv7GfX5EdmXjzTvUEjJ4zjQXjiQGdmXjzTvUEjJ4HF/UEt/kQqW5UEkMzIshY08jg6dRS3yTC5XmgpsXY7pFztQSEgPNJCNv3lGpJVSfTLfImVpCYsB1HdwfxpU1G9eeNF0H94dxZc2G+/yI7MoG3vEv82LI2NNIDLyVDbzjzFE2mnkxZOy5IoNnkpFGc2FXNpp5MWTsOXJ4h1qikrGnkhjYlY1m1icy9lQSA+TCzjvUEpWMPZXEwK5suPvDOFuzcdZ1sOYX1ZqNas3GlTUbzR+jQbEAcs8ZQAAAAABJRU5ErkJggg=='

type Props = {
  handleInput: (target: HTMLInputElement) => void
  ProseMirrorView: typeof ProseMirrorView
  handleClick?: (view: ResultType) => void
}

export type ResultType = {
  plainText: string[]
  dataText?: string[]
}

export default ({ handleInput, ProseMirrorView, handleClick }: Props) => {
  const isWysiwyg = !!ProseMirrorView
  const prosemirrorContainer = useRef(null)
  const editorView = useRef<ProseMirrorView | null>(null)

  useEffect(() => {
    if (isWysiwyg) {
      editorView.current = new ProseMirrorView(prosemirrorContainer.current, '')
    }
  }, [isWysiwyg])

  return (
    <div
      className="signs-editor-container"
      onKeyDown={e => {
        // arrow down/up, Enter to navigate between lines
        if (isWysiwyg) return // todo
        let { code } = e
        if ((e.target as HTMLElement).matches('input') && e.key === 'Enter') code = 'ArrowDown'
        if (code === 'ArrowDown' || code === 'ArrowUp') {
          e.preventDefault()
          const dir = code === 'ArrowDown' ? 1 : -1
          const elements = focusable(e.currentTarget)
          const focusedElemIndex = elements.indexOf(document.activeElement as HTMLElement)
          if (focusedElemIndex === -1) return
          const nextElem = elements[focusedElemIndex + dir]
          nextElem?.focus()
        }
      }}
    >
      <div className="signs-editor-inner-container">
        <img className="signs-editor-bg-image" src={imageSource} alt="" />
        {isWysiwyg ? (
          <p ref={prosemirrorContainer} className="wysiwyg-editor" />
        ) : (
          [1, 2, 3, 4].map((value, index) => {
            return (
              <input
                className="sign-editor"
                key={index}
                data-key={index}
                maxLength={15} // overriden by handleInput
                onChange={e => {
                  handleInput(e.currentTarget)
                }}
              />
            )
          })
        )}
        <Button
          onClick={async () => {
            if (handleClick) {
              if (isWysiwyg) {
                const formattedText = markdownToFormattedText(editorView.current!.content)
                const plainText = formattedText
                  .map(t => (Array.isArray(t) && Array.isArray(t[0]) ? t.map(t => t[0]) : t))
                  .map(t => (Array.isArray(t) ? t.map(t => t.text).join('') : t))
                handleClick({ dataText: formattedText, plainText })
              } else {
                const text = [] as string[]
                for (const input of document.getElementsByClassName('sign-editor')) {
                  text.push((input as HTMLInputElement).value)
                }
                handleClick({ plainText: text })
              }
            }
          }}
          className="sign-editor-button"
          label="Done"
        />
      </div>
    </div>
  )
}
