export async function parseBindingName(binding: string) {
  if (!binding) return ''

  const { keyboard } = (typeof navigator === 'undefined' ? undefined : navigator) ?? {}
  const layoutMap = (await keyboard?.getLayoutMap?.()) ?? new Map<string, string>()

  const mapKey = (key: string) => layoutMap.get(key) || key

  const cut = binding.replaceAll(/(Digit|Key)/g, '')
  const parts = cut.includes('+') ? cut.split('+') : [cut]

  for (let i = 0; i < parts.length; i++) {
    parts[i] = mapKey(parts[i])
      .split(/(?<=[a-z])(?=\d)/)
      .join(' ')
      .split(/(?=[A-Z])/)
      .reverse()
      .join(' ')
  }

  return parts.join(' + ')
}
