import { versionToNumber } from 'minecraft-renderer/src/lib/utils'
import nbt from 'prismarine-nbt'
import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import mojangson from 'mojangson'
import { activeModalStack, hideCurrentModal, showModal } from '../globalState'
import Book from './Book'
import { useIsModalActive } from './utilsApp'

interface OpenedBook {
  pages: string[]
  title: string
  author: string
  isEditable: boolean
}

export default () => {
  const modalActive = useIsModalActive('book')
  // const modalStack = useSnapshot(activeModalStack)
  const [openedBook, setOpenedBook] = useState<OpenedBook | null>(null)

  const signEditBook = (pages: string[], title: string | undefined) => {
    if (versionToNumber(bot.version) < versionToNumber('1.17.2')) {
      if (title === undefined) {
        void bot.writeBook(bot.inventory.hotbarStart + bot.quickBarSlot, pages)
      } else {
        //@ts-expect-error
        // slot, pages, author, title
        bot.signBook(bot.inventory.hotbarStart + bot.quickBarSlot, pages, title, bot.username)
      }
      hideCurrentModal()
      return
    }
    const currentSlot = bot.quickBarSlot
    // mineflayer has wrong implementation of this action after 1.17.2
    if (title === undefined) {
      bot._client.write('edit_book', {
        hand: currentSlot,
        pages
      })
    } else {
      bot._client.write('edit_book', {
        hand: currentSlot,
        pages,
        title
      })
    }
    hideCurrentModal()
  }

  // test: /give @p minecraft:written_book{pages:['{"text":"§4This is red text. §lThis is bold text."}'],title:"Book",author:"Author"}
  useEffect(() => {
    const openBookWithNbt = () => {
      if (activeModalStack.at(-1)?.reactType === 'book') {
        hideCurrentModal()
      }
      const book = bot.inventory.slots[bot.inventory.hotbarStart + bot.quickBarSlot]
      if (!book?.nbt) return
      // {"type":"compound","name":"","value":{"title":{"type":"string","value":"yes"},"author":{"type":"string","value":"bot"},"pages":{"type":"list","value":{"type":"string","value":["{\"text\":\"1\"}","{\"text\":\"4\"}","{\"text\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}"]}
      const parsedData = nbt.simplify(book.nbt as any)
      if (!parsedData.pages) return
      const pages = parsedData.pages.map((page) => {
        if (book.name !== 'written_book') return page
        const parsedPage = mojangson.simplify(mojangson.parse(page))
        return parsedPage.text ?? page
      })
      // const {title, author} = parsedData
      setOpenedBook({
        pages,
        title: parsedData.title ?? '',
        author: parsedData.author ?? '',
        isEditable: book.name === 'writable_book',
      })
      showModal({ reactType: 'book' })
    }
    customEvents.on('activateItem', (item) => {
      if (item.name === 'writable_book') {
        if (item.nbt?.value.pages) {
          openBookWithNbt()
        } else {
          setOpenedBook({
            pages: [],
            title: '',
            author: '',
            isEditable: true,
          })
          showModal({ reactType: 'book' })
        }
      }
    })
    bot._client.on('open_book', openBookWithNbt)
  }, [])

  useEffect(() => {
    if (modalActive) return
    setOpenedBook(null)
  }, [modalActive])

  if (!openedBook) return null
  return <Book
    textPages={openedBook.pages}
    editable={openedBook.isEditable}
    onSign={(pages, title) => signEditBook(pages, title)}
    onEdit={(pages) => signEditBook(pages, undefined)}
    onClose={() => {
      hideCurrentModal()
    }}
    author={bot.username}
  />
}
