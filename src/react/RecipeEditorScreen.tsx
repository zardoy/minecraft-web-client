import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { hideModal } from '../globalState'
import { applyRecipe, recipeState, RecipeParam } from '../core/recipeChannels'
import Screen from './Screen'
import Button from './Button'
import Input from './Input'
import Slider from './Slider'
import { pixelartIcons } from './PixelartIcon'
import { useIsModalActive } from './utilsApp'

const defaults = (params: readonly RecipeParam[]) => Object.fromEntries(params.map(p => [p.key, p.default]))
const snapStep = (v: number, p: RecipeParam) => {
  const step = p.step ?? 1
  const snapped = Math.round(v / step) * step
  return Number(snapped.toFixed(4))
}

const Inner = () => {
  const snap = useSnapshot(recipeState)
  const names = Object.keys(snap.builtins)
  const initial = snap.spec && 'builtin' in snap.spec ? snap.spec : { builtin: names[0] ?? 'mining', options: {} }
  const [recipe, setRecipe] = useState<string>(initial.builtin)
  const [options, setOptions] = useState<Record<string, any>>({ ...(snap.builtins[initial.builtin] ? defaults(snap.builtins[initial.builtin].params as readonly RecipeParam[]) : {}), ...initial.options })
  const [world, setWorld] = useState(snap.world || 'lab')
  const info = snap.builtins[recipe] as { title: string, description: string, params: readonly RecipeParam[] } | undefined
  const spec = { builtin: recipe, options, ...(snap.spec?.patch ? { patch: snap.spec.patch } : {}) }

  const pick = (name: string) => { setRecipe(name); setOptions(defaults(snap.builtins[name].params as readonly RecipeParam[])) }
  const nextRecipe = () => pick(names[(names.indexOf(recipe) + 1) % names.length])

  return <Screen title={`Dimension recipe: ${info?.title ?? recipe}`} contentStyle={{ overflow: 'auto', maxHeight: '90vh' }}>
    <Button
      icon={pixelartIcons.close}
      onClick={() => hideModal({ reactType: 'recipe-editor' })}
      style={{ color: '#ff5d5d', position: 'fixed', top: 10, left: 20 }}
      title='Close'
    />
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
      <Input width={110} value={world} placeholder='world name' onChange={e => setWorld(e.target.value.replaceAll(/[^\w-]/g, ''))} />
      <Button onClick={nextRecipe} style={{ width: 150 }}>{`Recipe: ${recipe}`}</Button>
    </div>
    <div style={{ opacity: 0.75, fontSize: 8, margin: '4px 0' }}>{info?.description}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', maxWidth: 460 }}>
      {info?.params.map(p => {
        const value = options[p.key] ?? p.default
        if (p.type === 'boolean') {
          return <Button key={p.key} style={{ width: 200 }} onClick={() => setOptions(o => ({ ...o, [p.key]: !value }))}>{`${p.label}: ${value ? 'on' : 'off'}`}</Button>
        }
        if (p.type === 'string') {
          return <Input key={p.key} width={200} value={String(value)} placeholder={p.label} onChange={e => setOptions(o => ({ ...o, [p.key]: e.target.value }))} />
        }
        return <Slider
          key={p.key}
          label={p.label.length > 24 ? p.key : p.label}
          title={p.label}
          unit=''
          width={200}
          min={p.min}
          max={p.max}
          value={value as number}
          valueDisplay={value as number}
          updateValue={v => setOptions(o => ({ ...o, [p.key]: snapStep(v, p) }))}
        />
      })}
    </div>
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
      <Button disabled={snap.busy || !world} onClick={() => applyRecipe(world, spec)} style={{ width: 200 }}>{snap.busy ? 'Generating…' : `Apply to '${world}'`}</Button>
      <Button onClick={() => info && setOptions(defaults(info.params))} style={{ width: 100 }}>Defaults</Button>
      <Button onClick={() => bot.chat(`/recipe edit ${world}`)} style={{ width: 130 }}>JSON in IDE</Button>
    </div>
    <div style={{ marginTop: 6, minHeight: 10, fontSize: 8, opacity: 0.85 }}>{snap.status}</div>
  </Screen>
}

export default () => {
  const isActive = useIsModalActive('recipe-editor')
  if (!isActive) return null
  return <Inner />
}
