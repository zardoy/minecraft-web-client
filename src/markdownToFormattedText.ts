import { remark } from 'remark'

export default (markdown: string) => {
  const arr = markdown.split('\n\n')
  const lines = ['', '', '', ''] as any[]
  for (const [i, ast] of arr.map(md => remark().parse(md)).entries()) {
    lines[i] = transformToMinecraftJSON(ast as Element)
  }
  return lines
}

function transformToMinecraftJSON(element: Element): any {
  switch (element.type) {
    case 'root': {
      if (!element.children) return
      return element.children.map(child => transformToMinecraftJSON(child)).filter(Boolean)
    }
    case 'paragraph': {
      if (!element.children) return
      const transformedChildren = element.children.map(child => transformToMinecraftJSON(child)).filter(Boolean)
      return transformedChildren.flat()
    }
    case 'strong': {
      if (!element.children) return
      return [{ bold: true, text: element.children[0].value }]
    }
    case 'text': {
      return { text: element.value }
    }
    case 'emphasis': {
      if (!element.children) return
      return [{ italic: true, text: element.children[0].value }]
    }
    default:
      // todo leave untouched eg links
      return element.value
  }
}

interface Position {
  start: {
    line: number
    column: number
    offset: number
  }
  end: {
    line: number
    column: number
    offset: number
  }
}

interface Element {
  type: string
  children?: Element[]
  value?: string
  position: Position
}
