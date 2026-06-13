import { isMobile } from 'minecraft-renderer/src/lib/simpleUtils'

if (process.env.NODE_ENV === 'development') {
  // mobile devtools
  if (isMobile()) {
    // can be changed to require('eruda')
    //@ts-expect-error
    void import('https://cdn.skypack.dev/eruda').then(({ default: eruda }) => eruda.init())
  }
}
console.log('JS Loaded in', Date.now() - window.startLoad)
