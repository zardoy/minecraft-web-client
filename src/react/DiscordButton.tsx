import { useFloating, arrow, FloatingArrow, offset as offsetMiddleware, Placement, autoPlacement } from '@floating-ui/react'
import { openURL } from 'renderer/viewer/lib/simpleUtils'
import { CSSProperties, useState } from 'react'
import Button from './Button'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'

export const DiscordButton = ({ text, style }: { text?: string, style?: Record<string, any> }) => {
  const links: DropdownButtonItem[] = [
    {
      text: 'Pro Enthusiasts Server (ask for invite)',
      clickHandler: () => openURL('https://discord.mcraft.fun')
    },
    {
      text: 'Community Server (PrismarineJS)',
      clickHandler: () => openURL('https://discord.gg/prismarinejs-413438066984747026')
    }
  ]

  return <DropdownButton text={text ?? 'Discord'} style={style} links={links} />
}

export type DropdownButtonItem = {
  text: string,
  clickHandler: () => void
}

export const DropdownButton = ({ text, style, links }: { text: string, style?: Record<string, any>, links: DropdownButtonItem[] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      autoPlacement()
    ],
  })

  const styles: CSSProperties = {
    ...floatingStyles,
    background: 'rgba(0, 0, 0, 0.3)',
    fontSize: 8,
    userSelect: 'text',
    padding: '2px 4px',
    opacity: 1,
    transition: 'opacity 0.3s ease-in-out',
    textShadow: '1px 1px 2px BLACK',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 11
  }

  return <>
    <Button
      style={style ?? { position: 'relative', width: '98px' }}
      rootRef={refs.setReference}
      onClick={() => {
        setIsOpen(!isOpen)
      }}
    >{text}<PixelartIcon
        styles={{ position: 'absolute', top: '5px', right: '5px' }}
        iconName={isOpen ? pixelartIcons['chevron-up'] : pixelartIcons['chevron-down']}
      />
    </Button>
    {
      isOpen && <div ref={refs.setFloating} style={styles}>
        {links.map(el => {
          return <Button
            key={el.text}
            style={{ width: '98px', fontSize: '7px' }}
            onClick={el.clickHandler}
          >{el.text}
          </Button>
        })}
      </div>
    }
  </>
}
