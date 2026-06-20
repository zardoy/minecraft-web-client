import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button, Slider, ArmorBar, BreathBar, Chat, HealthBar, PlayerListOverlay, Scoreboard, MessageFormattedString, XPBar, FoodBar } from '../dist-npm'

const ExampleDemo = () => {
  const [sliderValue, setSliderValue] = useState(0)

  return (
    <div style={{ scale: '2', transformOrigin: 'top left', width: '50%', height: '50dvh', fontFamily: 'mojangles, sans-serif', background: 'gray' }}>
      <Button>Button</Button>
      <Slider label="Slider" value={sliderValue} updateValue={value => setSliderValue(value)} />
      <ArmorBar armorValue={10} />
      <Chat
        messages={[
          { id: 0, parts: [{ text: 'A formmated message in the chat', color: 'blue' }] },
          { id: 1, parts: [{ text: 'An other message in the chat', color: 'red' }] }
        ]}
        usingTouch={false}
        opened
        sendMessage={message => {
          console.log('typed', message)
          // close
        }}
      />
      <BreathBar oxygen={10} />
      <HealthBar isHardcore={false} healthValue={10} damaged={false} />
      <FoodBar food={10} />
      <PlayerListOverlay
        style={{
          position: 'static'
        }}
        clientId="" // needed for current player highlight
        serverIP="Server IP"
        tablistHeader="Tab §aHeader"
        tablistFooter="Tab §bFooter"
        playersLists={[
          [
            { username: 'Player 1', ping: 10, uuid: undefined },
            { username: 'Player 2', ping: 20, uuid: undefined },
            { username: 'Player 3', ping: 30, uuid: undefined }
          ]
        ]}
      />
      "§bRed" displays as <MessageFormattedString message="§bRed" />
      <Scoreboard
        open
        title="Scoreboard"
        items={[
          { name: 'Player 1', value: 10 },
          { name: 'Player 2', value: 20 },
          { name: 'Player 3', value: 30 }
        ]}
      />
      <XPBar gamemode="survival" level={10} progress={0.5} />
    </div>
  )
}

createRoot(document.body as Element).render(<ExampleDemo />)
