import React, { useState, useRef, useEffect, useCallback } from 'react'
import insideIcon from './book_icons/book.webp'
import insideHalfIcon from './book_icons/book-half.webp'
import singlePageInsideIcon from './book_icons/notebook.webp'
import titleIcon from './book_icons/title.webp'
import styles from './Book.module.css'
import Button from './Button'
import MessageFormattedString from './MessageFormattedString'

export interface BookProps {
  textPages: string[]
  editable: boolean
  onSign: (textPages: string[], title: string) => void
  onEdit: (textPages: string[]) => void
  onClose: () => void
  author: string
}

const Book: React.FC<BookProps> = ({ textPages, editable, onSign, onEdit, onClose, author }) => {
  const [pages, setPages] = useState<string[]>(textPages)
  const [currentPage, setCurrentPage] = useState(0)
  const [isSinglePage, setIsSinglePage] = useState(window.innerWidth < 972)
  const [insideImage, setInsideImage] = useState(window.innerWidth < 972 ? singlePageInsideIcon : insideIcon)
  const [animateInsideIcon, setAnimateInsideIcon] = useState(0)
  const [animatePageIcon, setAnimatePageIcon] = useState(0)
  const [animateTitleIcon, setAnimateTitleIcon] = useState(0)
  const [signClickedOnce, setSignClickedOnce] = useState(false)
  const textAreaRefs = useRef<HTMLTextAreaElement[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleResize = useCallback(() => {
    const isSingle = window.innerWidth < 972
    setIsSinglePage(isSingle)
    setInsideImage(isSingle ? singlePageInsideIcon : insideIcon)
  }, [])

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  useEffect(() => {
    const index = currentPage * (isSinglePage ? 1 : 2)
    if (textAreaRefs.current[index]) textAreaRefs.current[index].focus()
  }, [currentPage, isSinglePage])

  useEffect(() => {
    if (signClickedOnce) {
      setTimeout(() => {
        inputRef.current!.focus()
      }, 300) // wait for animation
    }
  }, [signClickedOnce])

  const handlePageChange = (direction: number) => {
    setCurrentPage(prevPage => Math.min(Math.max(prevPage + direction, 0), Math.ceil(pages.length / (isSinglePage ? 1 : 2)) - 1))
  }

  const updatePage = (index, text) => {
    setPages(prevPages => {
      const updatedPages = [...prevPages]
      updatedPages[index] = text
      return updatedPages
    })
  }

  const handleTextChange = (e, pageIndex) => {
    const text = e.target.value
    updatePage(pageIndex, text)

    const nextPageIndex = pageIndex + 1
    const isMaxLengthReached = text.length >= e.target.maxLength

    if (isMaxLengthReached) {
      if (nextPageIndex < pages.length) {
        setCurrentPage(Math.floor(nextPageIndex / (isSinglePage ? 1 : 2)))
      } else {
        setPages(prevPages => [...prevPages, ''])
        setCurrentPage(Math.floor(nextPageIndex / (isSinglePage ? 1 : 2)))
      }
      textAreaRefs.current[nextPageIndex]?.focus()
    } else if (text === '' && pageIndex > 0 && e.nativeEvent.inputType === 'deleteContentBackward') {
      setCurrentPage(Math.floor((pageIndex - 1) / (isSinglePage ? 1 : 2)))
      textAreaRefs.current[pageIndex - 1]?.focus()
    }
  }

  useEffect(() => {
    const index = currentPage * (isSinglePage ? 1 : 2)
    textAreaRefs.current[index]?.focus()
  }, [currentPage, isSinglePage])

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, pageIndex: number) => {
    const pasteText = e.clipboardData.getData('text')
    const updatedPages = [...pages]
    const currentText = updatedPages[pageIndex]
    const selectionStart = e.currentTarget.selectionStart || 0
    const selectionEnd = e.currentTarget.selectionEnd || 0

    const newText = currentText.slice(0, selectionStart) + pasteText + currentText.slice(selectionEnd)
    updatedPages[pageIndex] = newText
    setPages(updatedPages)

    if (newText.length > e.currentTarget.maxLength) {
      const remainingText = newText.slice(e.currentTarget.maxLength)
      updatedPages[pageIndex] = newText.slice(0, e.currentTarget.maxLength)
      setPages(updatedPages)

      const nextPageIndex = pageIndex + 1

      if (nextPageIndex < pages.length) {
        handlePasteRemainingText(remainingText, nextPageIndex)
      } else {
        setPages(prevPages => [...prevPages, remainingText])
        setCurrentPage(Math.floor(nextPageIndex / (isSinglePage ? 1 : 2)))
        focusOnTextArea(nextPageIndex)
      }
    }
  }

  const handlePasteRemainingText = (remainingText: string, nextPageIndex: number) => {
    const updatedPages = [...pages]
    updatedPages[nextPageIndex] = remainingText
    setPages(updatedPages)
    focusOnTextArea(nextPageIndex)
  }

  const focusOnTextArea = (index: number) => {
    setTimeout(() => {
      textAreaRefs.current[index]?.focus()
    }, 0)
  }

  const handleSign = useCallback(() => {
    if (editable && signClickedOnce) {
      const title = inputRef.current?.value || ''
      onSign(pages, title)
    }
    setSignClickedOnce(true)
    setAnimatePageIcon(1)
    setAnimateInsideIcon(1)
    setTimeout(() => {
      setAnimateTitleIcon(1)
    }, 150)
  }, [pages, onSign, editable, signClickedOnce])

  const handleEdit = useCallback(() => {
    setSignClickedOnce(false)
    onEdit(pages)
  }, [pages, onEdit])

  const handleCancel = useCallback(() => {
    if (signClickedOnce) {
      setSignClickedOnce(false)
      setAnimateTitleIcon(2)
      setTimeout(() => {
        setAnimateInsideIcon(2)
        setTimeout(() => {
          setAnimatePageIcon(2)
        }, 150)
      }, 150)
    } else {
      onClose()
    }
  }, [signClickedOnce, onClose])

  const setRef = (index: number) => (el: HTMLTextAreaElement | null) => {
    textAreaRefs.current[index] = el!
  }

  const getAnimationClass = (animationState, baseClass) => {
    switch (animationState) {
      case 1:
        return `${baseClass} ${styles.pageAnimation}`
      case 2:
        return `${baseClass} ${styles.pageAnimationReverse}`
      default:
        return baseClass
    }
  }

  const renderPage = index => (
    <div className={styles.page} key={index}>
      {editable ? (
        <textarea
          onContextMenu={e => {
            e.stopPropagation() // allow to open system context menu on text area for better UX
          }}
          ref={setRef(index)}
          value={pages[index]}
          onChange={e => handleTextChange(e, index)}
          onPaste={e => handlePaste(e, index)}
          className={getAnimationClass(animatePageIcon, styles.textArea)}
          maxLength={500}
        />
      ) : (
        <div className={getAnimationClass(animatePageIcon, '')}>
          <MessageFormattedString message={pages[index]} fallbackColor="black" className={styles.messageFormattedString} />
        </div>
      )}
    </div>
  )

  return (
    <div className={styles.bookWrapper}>
      <div className={styles.bookContainer}>
        <img
          src={insideImage}
          className={`${styles.insideIcon} ${animateInsideIcon === 1 ? styles.insideAnimation : animateTitleIcon === 2 ? styles.insideAnimationReverse : ''}`}
          alt="inside Icon"
        />
        <img
          src={insideHalfIcon}
          className={`${styles.insideHalfIcon} ${animatePageIcon === 1 ? styles.pageAnimation : animatePageIcon === 2 ? styles.pageAnimationReverse : ''}`}
          alt="inside Page Icon"
        />
        <img
          src={titleIcon}
          className={`${styles.titleIcon} ${animateTitleIcon === 1 ? styles.titleAnimation : animateTitleIcon === 2 ? styles.titleAnimationReverse : ''}`}
          alt="Title Icon"
        />
        <div className={`${styles.inside}`}>
          {renderPage(currentPage * (isSinglePage ? 1 : 2))}
          {!isSinglePage && currentPage * 2 + 1 < pages.length && renderPage(currentPage * 2 + 1)}
          <Button
            className={`${styles.controlPrev} ${animateInsideIcon === 1 ? styles.hidden : animateInsideIcon === 2 ? styles.pageButtonAnimationReverse : ''}`}
            onClick={() => handlePageChange(-1)}
            disabled={currentPage === 0}
          >
            {' '}
          </Button>
          <Button
            className={`${styles.controlNext} ${animateInsideIcon === 1 ? styles.hidden : animateInsideIcon === 2 ? styles.pageButtonAnimationReverse : ''}`}
            onClick={() => handlePageChange(1)}
            disabled={(currentPage + 1) * (isSinglePage ? 1 : 2) >= pages.length}
          >
            {' '}
          </Button>
        </div>
        <div
          className={`${styles.outSide} ${
            animateTitleIcon === 1 ? styles.titleContentAnimation : animateTitleIcon === 2 ? styles.titleContentAnimationReverse : ''
          }`}
        >
          {editable ? (
            <div className={`${styles.titleContent}`}>
              <MessageFormattedString message="Enter Book Title: " />
              <form
                onSubmit={e => {
                  e.preventDefault()
                  handleSign()
                }}
              >
                <input ref={inputRef} className="" />
                {/* for some reason this is needed to make Enter work on android chrome */}
                <button type="submit" style={{ visibility: 'hidden', height: 0, width: 0 }} />
              </form>
              <MessageFormattedString message={`by ${author}`} />
              <br />
              <MessageFormattedString message="Note! When you sign the book, it will no longer be editable." />
            </div>
          ) : (
            <div className={`${styles.titleContent}`}>
              <MessageFormattedString message="Book Name Here" />
              <br />
              <MessageFormattedString message="by: Author" />
            </div>
          )}
        </div>
      </div>
      <div className={styles.actions}>
        {editable && <Button onClick={handleSign}>{signClickedOnce ? 'Sign and Save' : 'Sign'}</Button>}

        {editable && !signClickedOnce && <Button onClick={handleSign}>Sign</Button>}
        {editable && !signClickedOnce && <Button onClick={handleEdit}>Edit</Button>}
        <Button onClick={handleCancel}>{signClickedOnce ? 'Cancel' : 'Close'}</Button>
      </div>
    </div>
  )
}

export default Book
