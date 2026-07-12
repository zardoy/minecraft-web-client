import { initDevConsoleLoader } from './loadDevConsole'

initDevConsoleLoader()

console.log('JS Loaded in', Date.now() - window.startLoad)
