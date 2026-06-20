import { useEffect, useMemo, useState } from 'react'
import mojangson from 'mojangson'
import nbt from 'prismarine-nbt'
import type { ClientOnMap } from '../generatedServerPackets'
import Title from './Title'
import type { AnimationTimes } from './Title'

const defaultText: Record<string, any> = { text: '' }
const defaultTimings: AnimationTimes = { fadeIn: 500, stay: 3500, fadeOut: 1000 }

const ticksToMs = (ticks: AnimationTimes) => {
  ticks.fadeIn *= 50
  ticks.stay *= 50
  ticks.fadeOut *= 50
  return ticks
}

const getComponent = (input: string | any) => {
  if (typeof input === 'string') {
    // raw json is sent
    return mojangson.simplify(mojangson.parse(input))
  } else if (input.type === 'string') {
    // this is used for simple chat components without any special properties
    return { text: input.value }
  } else if (input.type === 'compound') {
    // this is used for complex chat components with special properties
    return nbt.simplify(input)
  }
  return input
}

export default () => {
  const [title, setTitle] = useState<string | Record<string, any>>(defaultText)
  const [subtitle, setSubtitle] = useState<string | Record<string, any>>(defaultText)
  const [actionBar, setActionBar] = useState<string | Record<string, any>>(defaultText)
  const [animTimes, setAnimTimes] = useState<AnimationTimes>(defaultTimings)
  const [openTitle, setOpenTitle] = useState(false)
  const [openActionBar, setOpenActionBar] = useState(false)

  useMemo(() => {
    // todo move to mineflayer
    bot._client.on('set_title_text', packet => {
      setTitle(getComponent(packet.text))
      setOpenTitle(true)
    })
    bot._client.on('set_title_subtitle', packet => {
      setSubtitle(getComponent(packet.text))
    })
    bot._client.on('action_bar', packet => {
      setActionBar(getComponent(packet.text))
      setOpenActionBar(true)
    })
    bot._client.on('set_title_time', packet => {
      setAnimTimes(ticksToMs(packet))
    })
    bot._client.on('clear_titles', mes => {
      setOpenTitle(false)
      setOpenActionBar(false)
      if (mes.reset) {
        setTitle(defaultText)
        setSubtitle(defaultText)
        setActionBar(defaultText)
        setAnimTimes(defaultTimings)
      }
    })

    bot.on('actionBar', packet => {
      setAnimTimes({ fadeIn: 0, stay: 2000, fadeOut: 1000 })
      setActionBar(packet)
      setOpenActionBar(true)
    })

    // before 1.17
    bot._client.on('title', (packet: ClientOnMap['title'] | string) => {
      let mes: ClientOnMap['title']
      if (typeof packet === 'string') {
        mes = JSON.parse(packet)
      } else {
        mes = packet
      }
      switch (mes.action) {
        case 0:
          setTitle(JSON.parse(mes.text))
          setOpenTitle(true)
          break
        case 1:
          setSubtitle(JSON.parse(mes.text))
          break
        case 2:
          setActionBar(JSON.parse(mes.text))
          setOpenActionBar(true)
          break
        case 3:
          setAnimTimes(ticksToMs({ fadeIn: mes.fadeIn, stay: mes.stay, fadeOut: mes.fadeOut }))
          break
        case 4:
          setOpenTitle(false)
          setOpenActionBar(false)
          break
        case 5:
          setOpenTitle(false)
          setOpenActionBar(false)
          setTitle(defaultText)
          setSubtitle(defaultText)
          setActionBar(defaultText)
          setAnimTimes(defaultTimings)
          break
      }
    })
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      setOpenTitle(false)
    }, animTimes.stay) // only initial stay time is used for title

    return () => {
      clearTimeout(id)
    }
  }, [title, subtitle])

  useEffect(() => {
    let id: any = null
    if (!openTitle) {
      id = setTimeout(() => {
        setSubtitle(defaultText)
      }, animTimes.fadeOut)
    }

    return () => {
      if (id) {
        clearTimeout(id)
      }
    }
  }, [openTitle])

  useEffect(() => {
    const id = setTimeout(() => {
      setOpenActionBar(false)
    }, animTimes.stay)

    return () => {
      clearTimeout(id)
    }
  }, [actionBar])

  return <Title title={title} subtitle={subtitle} actionBar={actionBar} transitionTimes={animTimes} openTitle={openTitle} openActionBar={openActionBar} />
}
