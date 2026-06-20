type StringKeys<T extends object> = Extract<keyof T, string>

interface ObjectConstructor {
  keys<T extends object>(obj: T): Array<StringKeys<T>>
  entries<T extends object>(obj: T): Array<[StringKeys<T>, T[keyof T]]>
  // todo review https://stackoverflow.com/questions/57390305/trying-to-get-fromentries-type-right
  fromEntries<T extends Array<[string, any]>>(obj: T): Record<T[number][0], T[number][1]>
  assign<T extends Record<string, any>, K extends Record<string, any>>(target: T, source: K): asserts target is T & K
}

declare module '*.module.css' {
  const css: Record<string, string>
  export default css
}
declare module '*.css' {
  const css: string
  export default css
}
declare module '*.json' {
  const json: any
  export = json
}
declare module '*.png' {
  const png: string
  export default png
}
declare module '*.svg' {
  const svg: string
  export default svg
}
declare module '*.webp' {
  const svg: string
  export default svg
}
declare module '*.mp3' {
  const mp3: any
  export default mp3
}

interface PromiseConstructor {
  withResolvers<T>(): {
    resolve: (value: T) => void
    reject: (reason: any) => void
    promise: Promise<T>
  }
}

declare namespace JSX {
  interface IntrinsicElements {}
}

// keyboard api
// https://gist.github.com/contigen/8da28f8bca4f05c9b50c5638521c8784

interface Navigator {
  readonly keyboard?: Keyboard
}

declare type KeyboardLayoutMap = readonly Map<string, string>

declare interface Keyboard extends EventTarget {
  getLayoutMap(): Promise<KeyboardLayoutMap>
  lock(keyCode?: KeyCode): Promise<undefined>
  unlock(): void
}
