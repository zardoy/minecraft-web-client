// The only place that creates the worldgen Web Worker: a second `new Worker(new URL('./worker.ts'))` site makes the dev bundle of the worker
// come out with a broken HMR runtime (SyntaxError at worker start).
export const createWorldgenWorker = () => new Worker(new URL(/* webpackChunkName: "worldgen-worker" */ 'worker.ts', import.meta.url), { name: 'worldgen-worker' })
