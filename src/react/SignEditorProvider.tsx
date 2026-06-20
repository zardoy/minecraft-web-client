import { useMemo, useEffect, useState, useRef } from 'react'
import { showModal, hideModal } from '../globalState'
import { options } from '../optionsStorage'
import { useIsModalActive } from './utilsApp'
import SignEditor, { ResultType } from './SignEditor'

const isWysiwyg = async () => {
  const items = await bot.tabComplete('/data ', true, true)
  const commands = new Set<string>(['merge'])
  for (const item of items) {
    if (commands.has((item.match ?? item) as unknown as string)) {
      return true
    }
  }
  return false
}

export default () => {
  const [location, setLocation] = useState<{ x: number; y: number; z: number } | null>(null)
  const [isFrontText, setIsFrontText] = useState(true)
  const text = useRef<string[]>(['', '', '', ''])
  const [enableWysiwyg, setEnableWysiwyg] = useState(false)
  const isModalActive = useIsModalActive('signs-editor-screen')
  const [proseMirrorView, setProseMirrorView] = useState(null as any)

  const handleClick = (result: ResultType) => {
    hideModal({ reactType: 'signs-editor-screen' })
    bot._client.write('update_sign', {
      location,
      isFrontText,
      text1: result.plainText[0],
      text2: result.plainText[1],
      text3: result.plainText[2],
      text4: result.plainText[3]
    })

    if (result.dataText) {
      if (!location) return
      const command =
        `/data merge block ${location.x} ${location.y} ${location.z} {Text1:'` +
        JSON.stringify(result.dataText[0]) +
        "',Text2: '" +
        JSON.stringify(result.dataText[1]) +
        "',Text3:'" +
        JSON.stringify(result.dataText[2]) +
        "',Text4:'" +
        JSON.stringify(result.dataText[3]) +
        "'}" // mojangson
      bot.chat(command)
    }
  }

  const handleInput = (target: HTMLInputElement) => {
    const smallSymbols = /[()[\]{} ]/
    const largeSymbols = /[;|',.]/
    let addLength = 0
    for (const letter of target.value) {
      if (smallSymbols.test(letter)) {
        addLength += 1 - 1 / 1.46
      } else if (largeSymbols.test(letter)) {
        addLength += 1 - 1 / 3
      }
    }
    text.current[Number(target.dataset.key)] = target.value
    target.setAttribute('maxlength', `${15 + Math.ceil(addLength)}`)
  }

  useMemo(() => {
    bot._client.on('open_sign_entity', packet => {
      if (!options.autoSignEditor) return
      setIsFrontText((packet as any).isFrontText ?? true)
      setLocation(prev => packet.location)
      showModal({ reactType: 'signs-editor-screen' })
      if (options.wysiwygSignEditor === 'auto') {
        void isWysiwyg().then(value => {
          setEnableWysiwyg(value)
        })
      } else if (options.wysiwygSignEditor === 'always') {
        setEnableWysiwyg(true)
      } else {
        setEnableWysiwyg(false)
      }
    })

    if (!process.env.SINGLE_FILE_BUILD) {
      void import('./prosemirror-markdown').then(({ ProseMirrorView }) => {
        setProseMirrorView(() => ProseMirrorView)
      })
    }
  }, [])

  if (!isModalActive) return null
  return <SignEditor ProseMirrorView={enableWysiwyg ? proseMirrorView : undefined} handleInput={handleInput} handleClick={handleClick} />
}
