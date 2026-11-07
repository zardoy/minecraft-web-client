import { proxy } from 'valtio'
import { showModal } from '../globalState'

/** Parameter of a built-in recipe (sent by the server, see space-squid `RECIPE_INFO`) */
export interface RecipeParam { key: string, label: string, type: 'number' | 'boolean' | 'string', default: number | boolean | string, min?: number, max?: number, step?: number }
export interface RecipeInfo { title: string, description: string, params: RecipeParam[] }

export const recipeState = proxy({
  /** world the editor edits */
  world: '',
  /** current spec: { builtin, options, patch? } or a full recipe object */
  spec: null as any,
  builtins: {} as Record<string, RecipeInfo>,
  /** last message from the server (chat line about the result) */
  status: '',
  busy: false,
})
;(globalThis as any).recipeState = recipeState

const STATE_CHANNEL = 'minecraft-web-client:recipe-state'
const APPLY_CHANNEL = 'minecraft-web-client:recipe-apply'
const jsonPacket = ['container', [{ name: 'data', type: ['pstring', { countType: 'i16' }] }]]

/** Channels of the server side `/recipe` command (space-squid `modules/recipes.ts`): state (+ schema) from the server, apply to the server. */
export const registerRecipeChannels = () => {
  bot._client.registerChannel(STATE_CHANNEL, jsonPacket, true)
  bot._client.registerChannel(APPLY_CHANNEL, jsonPacket, true)
  bot._client.on(STATE_CHANNEL as any, ({ data }: { data: string }) => {
    try {
      const s = JSON.parse(data)
      recipeState.world = s.world
      recipeState.spec = s.spec
      recipeState.builtins = s.builtins ?? {}
      recipeState.busy = false
      if (s.open) showModal({ reactType: 'recipe-editor' })
    } catch (e) {
      console.warn('bad recipe-state packet', e)
    }
  })
  bot.on('message', (msg) => {
    const text = msg.toString()
    if (/^(World '.*' generated|Recipe:)/.test(text)) { recipeState.status = text; recipeState.busy = false }
  })
}

export const applyRecipe = (world: string, spec: unknown) => {
  recipeState.busy = true
  recipeState.status = 'Generating…'
  bot._client.writeChannel(APPLY_CHANNEL, { data: JSON.stringify({ world, spec }) })
}

export const openRecipeEditor = () => {
  // ask the server for the schema + current state of the world the player is in (also works before any recipe world exists)
  bot.chat(`/recipe editor ${recipeState.world || ''}`.trim())
}
;(globalThis as any).openRecipeEditor = openRecipeEditor
