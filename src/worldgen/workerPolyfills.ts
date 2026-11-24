// Must be the first import of worker.ts (ES imports run in order): adm-zip reads process.versions.node while it loads.
// (same workaround as importsWorkaround.js on the main thread)
(globalThis as any).window ??= globalThis
process.versions.node ??= '18.0.0'
