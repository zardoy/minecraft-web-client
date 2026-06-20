import { useEffect, useState } from 'react'

export default () => {
  const [dataUrl, setDataUrl] = useState<string | null | true>(null) // true means loading

  useEffect(() => {
    // TODO delete maps!
    const updateHeldMap = () => {
      setDataUrl(null)
      const item = bot.heldItem
      if (!item || !['filled_map', 'map'].includes(item.name)) return
      // setDataUrl(true)
      const mapNumber = (item?.nbt?.value as any)?.map?.value ?? item['components']?.find(x => x.type === 'map_id')?.data
      // if (!mapNumber) return
      setDataUrl(bot.mapDownloader.maps?.[mapNumber] as unknown as string)
    }

    bot.on('heldItemChanged' as any, () => {
      updateHeldMap()
    })

    bot.on('new_map', ({ id }) => {
      // total maps: Object.keys(bot.mapDownloader.maps).length
      updateHeldMap()
    })

    updateHeldMap()
  }, [])

  return dataUrl && dataUrl !== true ? (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 8,
        pointerEvents: 'none'
      }}
    >
      <img
        src={dataUrl}
        style={{
          width: 92,
          height: 92,
          imageRendering: 'pixelated'
        }}
      />
    </div>
  ) : null
}
