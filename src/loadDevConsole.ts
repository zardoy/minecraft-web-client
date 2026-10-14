type NextConsoleClass = typeof import('@royalscome/nextconsole').default

declare global {
  interface Window {
    __nextConsole?: InstanceType<NextConsoleClass>
    __nextConsoleInitPromise?: Promise<InstanceType<NextConsoleClass> | undefined>
  }
}

export const DEV_CONSOLE_ROOT_ID = 'next-console-root'
/** NextConsole shadow host (`attachShadow({ mode: 'closed' })`). */
export const NEXTCONSOLE_HOST_ID = 'nextconsole-host'

/**
 * Closed shadow: focus and key targets retarget to the host, so contro-max does not see input/textarea.
 */
export const isNextConsoleKeyboardTarget = (e?: Event): boolean => {
  const active = document.activeElement
  if (active instanceof HTMLElement && active.id === NEXTCONSOLE_HOST_ID) return true
  if (!e) return false
  for (const node of e.composedPath()) {
    if (node instanceof HTMLElement && node.id === NEXTCONSOLE_HOST_ID) return true
  }
  return false
}

/** Outside `body.rotated` so NextConsole's fixed float button/panel stay on-screen in portrait. */
export const getDevConsoleMountTarget = (): HTMLElement => {
  const existing = document.getElementById(DEV_CONSOLE_ROOT_ID)
  if (existing?.parentElement === document.documentElement) return existing

  const root = document.createElement('div')
  root.id = DEV_CONSOLE_ROOT_ID
  document.documentElement.appendChild(root)
  return root
}

export const shouldLoadDevConsole = () => {
  return window.location.hash === '#dev' || process.env.NODE_ENV === 'development'
}

export const loadDevConsole = async () => {
  if (!shouldLoadDevConsole()) return window.__nextConsoleInitPromise
  if (window.__nextConsole) return window.__nextConsole
  if (window.__nextConsoleInitPromise) return window.__nextConsoleInitPromise

  window.__nextConsoleInitPromise = import('@royalscome/nextconsole').then(({ default: NextConsole }) => {
    if (window.__nextConsole) return window.__nextConsole
    window.__nextConsole = new NextConsole({
      theme: 'dark',
      target: getDevConsoleMountTarget(),
    })
    window.__nextConsole['panel'].floatButton.el.style.opacity = 0.6
    return window.__nextConsole
  })

  return window.__nextConsoleInitPromise
}

export const initDevConsoleLoader = () => {
  void loadDevConsole()
  window.addEventListener('hashchange', () => {
    void loadDevConsole()
  })
}
