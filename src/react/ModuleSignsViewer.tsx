import { useEffect, useRef, useState } from 'react'
import { WorldRendererThree } from 'minecraft-renderer/src/three/worldRendererThree'
import FullScreenWidget from './FullScreenWidget'

export const name = 'loaded world signs'

export default () => {
  const [selected, setSelected] = useState([] as string[])
  const allSignsPos = [] as string[]
  const signs = []
  // const signs = viewer.world instanceof WorldRendererThree ? [...viewer.world.chunkTextures.values()].flatMap(textures => {
  //   return Object.entries(textures).map(([signPosKey, texture]) => {
  //     allSignsPos.push(signPosKey)
  //     const pos = signPosKey.split(',').map(Number)
  //     const isSelected = selected.includes(signPosKey)
  //     return <div key={signPosKey}>
  //       <div style={{ color: 'white', userSelect: 'text', fontSize: 8, }}>{pos.join(', ')}</div>
  //       <div
  //         style={{ background: isSelected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)', padding: 5, borderRadius: 5, cursor: 'pointer' }}
  //         onClick={() => setSelected(selected.includes(signPosKey) ? selected.filter(x => x !== signPosKey) : [...selected, signPosKey])}>
  //         <AddElem elem={texture.image} />
  //       </div>
  //     </div>
  //   })
  // }) : []

  return <FullScreenWidget name={name} title='Loaded Signs'>
    <div>
      {signs.length} signs currently in the scene:
    </div>
    <div
      style={{ cursor: 'pointer', }} onClick={() => {
        // toggle all
        if (selected.length === allSignsPos.length) {
          setSelected([])
          return
        }
        setSelected([...allSignsPos])
      }}>Select All</div>
    {selected.length && <div
      style={{ cursor: 'pointer', }} onClick={() => {
        void navigator.clipboard.writeText(selected.join('\n'))
      }}>Copy Selected Signs</div>}
    {signs}
  </FullScreenWidget>
}

const AddElem = ({ elem }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    elem.style.width = '100%'
    elem.style.height = '100%'
    ref.current!.appendChild(elem)
    return () => {
      elem.remove()
    }
  }, [])

  return <div
    ref={ref} style={{
      height: '35px',
    }} />
}

// for (const key of Object.keys(viewer.world.sectionObjects)) {
//   const section = viewer.world.sectionObjects[key]
//   for (const child of section.children) {
//     if (child.name === 'mesh') child.visible = false
//   }
// }
