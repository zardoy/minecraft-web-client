const getEffectClass = effect => {
  switch (effect.id) {
    case 19:
      return 'poisoned'
    case 20:
      return 'withered'
    case 22:
      return 'absorption'
    default:
      return ''
  }
}

export const barEffectAdded = (htmlElement, effect) => {
  const effectClass = getEffectClass(effect)
  if (effectClass) {
    htmlElement.classList.add(effectClass)
  }
}

export const barEffectEnded = (htmlElement, effect) => {
  const effectClass = getEffectClass(effect)
  if (effectClass) {
    htmlElement.classList.remove(effectClass)
  }
}
