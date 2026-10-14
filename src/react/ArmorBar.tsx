import { useRef, useState, useEffect, CSSProperties } from 'react'
import SharedHudVars from './SharedHudVars'
import './ArmorBar.css'
import { withInjectableUi } from './extendableSystem'


export type ArmorBarProps = {
  armorValue: number,
  style?: CSSProperties
}

const ArmorBarBase = ({
  armorValue,
  style
}: ArmorBarProps) => {
  const armorRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    const armorElement = armorRef.current
    const armors = armorElement.children

    for (const armor of armors) {
      armor.classList.remove('full')
      armor.classList.remove('half')
    }

    for (let i = 0; i < Math.ceil(armorValue / 2); i++) {
      if (i >= armors.length) break

      if (armorValue % 2 !== 0 && Math.ceil(armorValue / 2) === i + 1) {
        armors[i].classList.add('half')
      } else {
        armors[i].classList.add('full')
      }
    }
  }, [armorValue])

  return <SharedHudVars>
    <div style={style ?? {}} ref={armorRef} className='armor_container' >
      {
        Array.from({ length: 10 }, () => 0)
          .map((num, index) => <div
            key={`armor-${index}`}
            className='armor'
          />)
      }
    </div>
  </SharedHudVars>
}

export default withInjectableUi(ArmorBarBase, 'armorBar')
